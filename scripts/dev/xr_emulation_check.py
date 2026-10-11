# Dev-only check of the WebXR path with the IWER emulator.
#   npm i --no-save iwer && npm run dev -- -p 3100   (other terminal)
#   pip install playwright && python3 scripts/dev/xr_emulation_check.py
# Prints: session started, frames advancing, controllers, teleport, exit. This is NOT a substitute for a real headset.
import time
from playwright.sync_api import sync_playwright
OUT="/tmp"
IWER=open("node_modules/iwer/build/iwer.min.js").read()
INIT=IWER+"""
;(()=>{const d=new IWER.XRDevice(IWER.metaQuest3); d.installRuntime({forceInstall:true}); window.__xrdev=d;})();
"""
with sync_playwright() as p:
    b=p.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
    pg=b.new_page(viewport={"width":1280,"height":900})
    pg.add_init_script(INIT)
    logs=[]
    pg.on("console", lambda m: logs.append(f"{m.type}: {m.text}") if m.type in("error","warning") else None)
    pg.on("pageerror", lambda e: logs.append("PAGEERROR: "+str(e)))
    pg.goto("http://localhost:3100/missions/vr/?debug=1", wait_until="networkidle")
    pg.wait_for_function("window.__vr!==undefined", timeout=30000); time.sleep(4)
    print("supported:", pg.evaluate("navigator.xr.isSessionSupported('immersive-vr')"))
    btn=pg.get_by_role("button", name="Enter VR")
    print("enter button visible:", btn.count())
    pg.screenshot(path=f"{OUT}/xr0.png")
    btn.first.click(); time.sleep(4)
    print("in session:", pg.evaluate("!!window.__vr.xrSession"), "presenting:", pg.evaluate("window.__vr.stage.renderer.xr.isPresenting"))
    f0=pg.evaluate("window.__vr.stage.frames"); time.sleep(3); f1=pg.evaluate("window.__vr.stage.frames")
    print("frames advancing in XR:", f0, "->", f1)
    print("controllers wired:", pg.evaluate("window.__vr.controllers.length"))
    # point right controller at the ground ahead and press trigger -> teleport
    pg.evaluate("""()=>{const d=window.__xrdev; const c=d.controllers.right; c.position.set(0.2,1.2,-0.3); c.quaternion.set(-0.38,0,0,0.925);}""")
    time.sleep(1.5)
    r0=pg.evaluate("[window.__vr.rig.position.x,window.__vr.rig.position.z]")
    pg.evaluate("""()=>{const c=window.__xrdev.controllers.right; c.updateButtonValue('trigger',1);}"""); time.sleep(0.4)
    pg.evaluate("""()=>{const c=window.__xrdev.controllers.right; c.updateButtonValue('trigger',0);}"""); time.sleep(1.5)
    r1=pg.evaluate("[window.__vr.rig.position.x,window.__vr.rig.position.z]")
    print("rig before/after trigger:", r0, r1)
    pg.screenshot(path=f"{OUT}/xr1.png")
    pg.evaluate("window.__vr.exitXR()"); time.sleep(2)
    print("after exit: session", pg.evaluate("!!window.__vr.xrSession"), "presenting", pg.evaluate("window.__vr.stage.renderer.xr.isPresenting"))
    f0=pg.evaluate("window.__vr.stage.frames"); time.sleep(2); f1=pg.evaluate("window.__vr.stage.frames")
    print("desktop loop resumed:", f0, "->", f1)
    print("\n".join(logs[:15]))
    b.close()
