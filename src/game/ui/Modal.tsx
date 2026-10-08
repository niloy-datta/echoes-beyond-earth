"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Accessible game dialog: focus moves in on open, Tab is trapped, Escape
 * closes (unless `onClose` is omitted) and focus returns on close.
 */
export function Modal({ label, onClose, children, wide = false, className = "" }: {
  label: string;
  onClose?: () => void;
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = ref.current;
    const first = node?.querySelector<HTMLElement>("[data-autofocus]") ?? node?.querySelector<HTMLElement>("button, a[href], input, select");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (!node) return;
      if (e.key === "Escape" && onClose) { e.preventDefault(); e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab") return;
      const items = Array.from(node.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled]), select, [tabindex='0']"));
      if (!items.length) return;
      const a = items[0], b = items[items.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
      else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
      e.stopPropagation();
    };
    node?.addEventListener("keydown", onKey);
    return () => { node?.removeEventListener("keydown", onKey); previous?.focus?.(); };
  }, [onClose]);

  return (
    <div className="ll-backdrop" role="presentation">
      <div ref={ref} role="dialog" aria-modal="true" aria-label={label} className={`ll-panel ${wide ? "ll-panel--wide" : ""} ${className}`}>
        {children}
      </div>
    </div>
  );
}
