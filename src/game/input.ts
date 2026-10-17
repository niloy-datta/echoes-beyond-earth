/**
 * Unified input: keyboard, mouse (drag or pointer-lock look), wheel zoom,
 * touch virtual joystick / look pad, and on-screen buttons all write into one
 * state object that the session consumes once per frame.
 */
import type { SessionInput } from "./core/session.ts";

export type UiAction = "inventory" | "map" | "journal" | "pause" | "advance" | "view" | "evidence-board" | "hint";

const MOVE_KEYS: Record<string, [number, number]> = {
  KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};

export class InputController {
  private keys = new Set<string>();
  private lookX = 0;
  private lookY = 0;
  private zoom = 0;
  private interactQueued = false;
  private jumpQueued = false;
  private drag: { id: number; x: number; y: number } | null = null;
  /** Virtual joystick axis (touch), -1..1. */
  stick = { x: 0, y: 0 };
  sprintToggle = false;
  enabled = true;
  private onAction: (a: UiAction) => void;
  private target: HTMLElement | null = null;
  private cleanup: (() => void)[] = [];

  constructor(onAction: (a: UiAction) => void) {
    this.onAction = onAction;
  }

  attach(target: HTMLElement) {
    this.detach();
    this.target = target;
    const on = <K extends keyof WindowEventMap>(el: Window | HTMLElement | Document, type: K | string, fn: (e: never) => void, opts?: AddEventListenerOptions) => {
      el.addEventListener(type, fn as EventListener, opts);
      this.cleanup.push(() => el.removeEventListener(type, fn as EventListener, opts));
    };
    on(window, "keydown", (e: KeyboardEvent) => this.keyDown(e));
    on(window, "keyup", (e: KeyboardEvent) => { this.keys.delete(e.code); });
    on(window, "blur", () => { this.keys.clear(); this.drag = null; });
    on(target, "pointerdown", (e: PointerEvent) => this.pointerDown(e));
    on(window, "pointermove", (e: PointerEvent) => this.pointerMove(e));
    on(window, "pointerup", (e: PointerEvent) => { if (this.drag?.id === e.pointerId) this.drag = null; });
    on(window, "pointercancel", () => { this.drag = null; });
    on(document, "mousemove", (e: MouseEvent) => {
      if (document.pointerLockElement === this.target && this.enabled) { this.lookX += e.movementX; this.lookY += e.movementY; }
    });
    on(target, "wheel", (e: WheelEvent) => { if (this.enabled) { e.preventDefault(); this.zoom += Math.sign(e.deltaY) * 0.6; } }, { passive: false });
    on(target, "contextmenu", (e: Event) => e.preventDefault());
  }

  detach() {
    for (const fn of this.cleanup) fn();
    this.cleanup = [];
    this.keys.clear();
  }

  private keyDown(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    // Menu keys work whenever the game route is open.
    if (e.code === "Escape") { this.onAction("pause"); return; }
    if (typing) return;
    if (e.code === "Tab") { e.preventDefault(); this.onAction("inventory"); return; }
    if (!this.enabled) return;
    if (e.code === "KeyM") { this.onAction("map"); return; }
    if (e.code === "KeyJ") { this.onAction("journal"); return; }
    if (e.code === "KeyB") { this.onAction("evidence-board"); return; }
    if (e.code === "KeyH") { this.onAction("hint"); return; }
    if (e.code === "KeyV") { this.onAction("view"); return; }
    if (e.code === "Enter") { this.onAction("advance"); return; }
    // Buttons own Space/Enter while focused; game keys need the scene focused.
    if (tag === "BUTTON" || tag === "A") return;
    if (MOVE_KEYS[e.code] || e.code === "Space" || e.code === "KeyE") e.preventDefault();
    if (e.code === "KeyE" && !e.repeat) this.interactQueued = true;
    if (e.code === "Space" && !e.repeat) this.jumpQueued = true;
    this.keys.add(e.code);
  }

  private pointerDown(e: PointerEvent) {
    if (!this.enabled) return;
    if (e.pointerType === "mouse" && e.button !== 0 && e.button !== 2) return;
    this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
  }

  private pointerMove(e: PointerEvent) {
    if (!this.drag || this.drag.id !== e.pointerId || !this.enabled) return;
    if (document.pointerLockElement === this.target) return;
    const scale = e.pointerType === "touch" ? 1.6 : 1;
    this.lookX += (e.clientX - this.drag.x) * scale;
    this.lookY += (e.clientY - this.drag.y) * scale;
    this.drag.x = e.clientX; this.drag.y = e.clientY;
  }

  /** Touch look pad (right side of the screen). */
  addLook(dx: number, dy: number) { if (this.enabled) { this.lookX += dx; this.lookY += dy; } }
  pressInteract() { if (this.enabled) this.interactQueued = true; }
  pressJump() { if (this.enabled) this.jumpQueued = true; }
  /** Simulate a held key (used by automated tests and accessible buttons). */
  setKey(code: string, down: boolean) { if (down) this.keys.add(code); else this.keys.delete(code); }

  /** Read and reset per-frame deltas. */
  consume(): SessionInput {
    let x = this.stick.x, y = this.stick.y;
    if (this.enabled) {
      for (const code of this.keys) {
        const v = MOVE_KEYS[code];
        if (v) { x += v[0]; y += v[1]; }
      }
    }
    const out: SessionInput = {
      x: Math.max(-1, Math.min(1, x)),
      y: Math.max(-1, Math.min(1, y)),
      sprint: this.enabled && (this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") || this.sprintToggle),
      jump: this.enabled && this.jumpQueued,
      interact: this.enabled && this.interactQueued,
      lookX: this.lookX, lookY: this.lookY, zoom: this.zoom,
    };
    this.lookX = 0; this.lookY = 0; this.zoom = 0; this.interactQueued = false; this.jumpQueued = false;
    return out;
  }

  /** Drop held keys and queued presses (when a menu opens). */
  reset() {
    this.keys.clear(); this.stick = { x: 0, y: 0 }; this.drag = null;
    this.lookX = this.lookY = this.zoom = 0; this.interactQueued = this.jumpQueued = false;
  }
}
