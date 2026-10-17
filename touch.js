// Berry Blade on a phone (the user, 2026-10-17: "touch screen … a low opacity, clear d-pad and two buttons … over the game").
// A see-through d-pad on the left and two buttons on the right. They press the same keys the keyboard does, so the game needs no
// changes: ← → move, ↑ jumps (and climbs ladders), ↓ is down (twice quickly drops through a ledge), A attacks (X), B blocks (C),
// A and B together tackle (the thumb can press both at once in the gap between them). A small button in the top-left corner pauses (Esc), or goes
// back on the menu screens. The pad and buttons only show while you're playing; the menus are tapped directly.
// The game tells this file what's on screen through window.BERRY_UI (added to the phone build's index.html by build_phone.py).
// It also keeps the game working offline and updating itself (sw.js; see the bottom of this file).
(() => {
  const css = `
  #touch { position: fixed; inset: 0; z-index: 60; pointer-events: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
  #touch.off .pad, #touch.off #tPad, #touch.off #tBtns { display: none; }
  #tPad, #tBtns, #tCorner { position: absolute; pointer-events: auto; touch-action: none; -webkit-tap-highlight-color: transparent; }
  #tPad { left: calc(18px + env(safe-area-inset-left)); bottom: calc(18px + env(safe-area-inset-bottom)); width: 156px; height: 156px; opacity: .34; }
  #tPad svg { width: 100%; height: 100%; display: block; overflow: visible; }
  #tPad .arm { fill: rgba(255, 255, 255, .16); stroke: #fff; stroke-width: 2.5; transition: fill .06s; }
  #tPad .arm.on { fill: rgba(255, 255, 255, .62); }
  #tPad .tri { fill: #fff; }
  #tBtns { right: calc(14px + env(safe-area-inset-right)); bottom: calc(14px + env(safe-area-inset-bottom)); width: 190px; height: 150px; opacity: .34; }
  #tBtns .b { position: absolute; width: 80px; height: 80px; border-radius: 50%; border: 2.5px solid #fff; background: rgba(255, 255, 255, .16);
    color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: background .06s; box-sizing: border-box; }
  #tBtns .b.on { background: rgba(255, 255, 255, .62); color: #2f3b43; }
  #tBtns .b b { font: 30px/1 "Bungee", sans-serif; }
  #tBtns .b i { font: 600 9px/1 "Jost", sans-serif; letter-spacing: .16em; font-style: normal; margin-top: 3px; }
  #tBtns .bA { right: 4px; top: 6px; }
  #tBtns .bB { left: 8px; bottom: 4px; }
  #tCorner { left: calc(12px + env(safe-area-inset-left)); top: calc(10px + env(safe-area-inset-top)); width: 44px; height: 44px; border-radius: 50%;
    border: 2px solid #fff; background: rgba(255, 255, 255, .16); color: #fff; opacity: .34; display: flex; align-items: center; justify-content: center;
    font: 16px/1 "Bungee", sans-serif; box-sizing: border-box; }
  #tCorner.hide { display: none; }
  #tCorner.on { background: rgba(255, 255, 255, .62); color: #2f3b43; }
  #tTurn { position: fixed; inset: 0; z-index: 90; display: none; background: #2f3b43; color: #ffde00; align-items: center; justify-content: center;
    flex-direction: column; gap: 14px; font: 18px "Bungee", sans-serif; text-align: center; padding: 24px; }
  #tTurn span { font: 500 13px "Jost", sans-serif; letter-spacing: .2em; color: #fff; }
  @media (orientation: portrait) and (pointer: coarse) { #tTurn { display: flex; } }
  canvas { touch-action: none; }
  html { touch-action: manipulation; }
  body { overscroll-behavior: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const T = document.createElement("div"); T.id = "touch"; T.className = "off";
  const arm = (d, rot) => `<g transform="rotate(${rot} 78 78)"><path class="arm" data-d="${d}" d="M58 6 Q58 2 62 2 L94 2 Q98 2 98 6 L98 58 L78 78 L58 58 Z"/><path class="tri" d="M78 16 L88 30 L68 30 Z"/></g>`;
  T.innerHTML = `<div id="tPad"><svg viewBox="0 0 156 156">${arm("u", 0)}${arm("r", 90)}${arm("d", 180)}${arm("l", 270)}<circle cx="78" cy="78" r="9" fill="rgba(255,255,255,.3)"/></svg></div>
    <div id="tBtns"><div class="b bA" data-b="a"><b>A</b><i>ATTACK</i></div><div class="b bB" data-b="b"><b>B</b><i>BLOCK</i></div></div>
    <div id="tCorner" class="hide">❚❚</div>`;
  const turn = document.createElement("div"); turn.id = "tTurn"; turn.innerHTML = "TURN YOUR PHONE SIDEWAYS<span>BERRY BLADE PLAYS IN LANDSCAPE</span>";
  const mount = () => { document.body.appendChild(T); document.body.appendChild(turn); };
  if (document.body) mount(); else addEventListener("DOMContentLoaded", mount);

  // ── keys: pressed and let go the way a keyboard would
  const down = {};
  const key = (code, on) => { if (!!down[code] === on) return; down[code] = on; dispatchEvent(new KeyboardEvent(on ? "keydown" : "keyup", { code, bubbles: true, cancelable: true })); };
  const tap = code => { key(code, true); setTimeout(() => key(code, false), 60); };
  const KEY = { u: "ArrowUp", d: "ArrowDown", l: "ArrowLeft", r: "ArrowRight", a: "KeyX", b: "KeyC" };

  // ── which way the d-pad is pushed: 8 ways, the diagonals a little narrower so running right doesn't jump by accident
  const padPtr = new Map(), btnPtr = new Map();
  const padDirs = (x, y) => {
    const R = document.getElementById("tPad").getBoundingClientRect(), dx = x - (R.left + R.width / 2), dy = (R.top + R.height / 2) - y;
    if (Math.hypot(dx, dy) < R.width * .11) return "";
    const a = Math.atan2(dy, dx) * 180 / Math.PI;
    return (Math.abs(a) < 60 ? "r" : "") + (Math.abs(a) > 120 ? "l" : "") + (a > 30 && a < 150 ? "u" : "") + (a < -30 && a > -150 ? "d" : "");
  };
  const btnsAt = (x, y) => {                     // a button under the thumb, or both when it's on the gap between them
    const c = [...document.querySelectorAll("#tBtns .b")].map(e => { const r = e.getBoundingClientRect(); return { k: e.dataset.b, x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 }; });
    const [A, B] = c, mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
    if (Math.hypot(x - mx, y - my) < A.r * .42) return "ab";
    return c.filter(b => Math.hypot(x - b.x, y - b.y) < b.r * 1.18).map(b => b.k).join("");
  };
  const sync = () => {
    const pd = [...padPtr.values()].join(""), bd = [...btnPtr.values()].join("");
    "udlr".split("").forEach(d => { key(KEY[d], pd.includes(d)); document.querySelector(`#tPad .arm[data-d="${d}"]`).classList.toggle("on", pd.includes(d)); });
    "ab".split("").forEach(b => { key(KEY[b], bd.includes(b)); document.querySelector(`#tBtns [data-b="${b}"]`).classList.toggle("on", bd.includes(b)); });
  };
  const hook = (el, map, read) => {
    const move = e => { if (!map.has(e.pointerId)) return; map.set(e.pointerId, read(e.clientX, e.clientY)); sync(); e.preventDefault(); };
    const up = e => { if (!map.delete(e.pointerId)) return; sync(); };
    el.addEventListener("pointerdown", e => { map.set(e.pointerId, read(e.clientX, e.clientY)); try { el.setPointerCapture(e.pointerId); } catch { } sync(); e.preventDefault(); });
    el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up); el.addEventListener("lostpointercapture", up);
  };
  const ready = () => {
    hook(document.getElementById("tPad"), padPtr, padDirs); hook(document.getElementById("tBtns"), btnPtr, btnsAt);
    const C = document.getElementById("tCorner");
    C.addEventListener("pointerdown", e => { e.preventDefault(); C.classList.add("on"); tap("Escape"); });
    ["pointerup", "pointercancel", "pointerleave"].forEach(t => C.addEventListener(t, () => C.classList.remove("on")));
    ["contextmenu", "touchstart"].forEach(t => T.addEventListener(t, e => { if (e.target.closest("#tPad, #tBtns, #tCorner")) e.preventDefault(); }, { passive: false }));
  };
  if (document.body) ready(); else addEventListener("DOMContentLoaded", ready);

  // ── first touch: full screen and sideways where the phone allows it (Android; on an iPhone, Add to Home Screen does it)
  addEventListener("pointerdown", () => {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen && matchMedia("(pointer: coarse)").matches)
      el.requestFullscreen({ navigationUI: "hide" }).then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock("landscape").catch(() => { })).catch(() => { });
  }, { once: true });

  // ── show the pad while playing; the corner button pauses, or goes back on the menu screens
  let was = "";
  setInterval(() => {
    const U = window.BERRY_UI; if (!U) return;
    const s = U.state;                            // "play" | "menu" | "back" | "none"
    if (s === was) return; was = s;
    T.classList.toggle("off", s !== "play");
    if (s !== "play") { padPtr.clear(); btnPtr.clear(); sync(); }
    const C = document.getElementById("tCorner"); C.classList.toggle("hide", s !== "play" && s !== "back"); C.textContent = s === "back" ? "‹" : "❚❚";
  }, 120);

  // ── offline, and updating itself (sw.js keeps every file on the phone). Whenever it's online it looks for a new version: on opening,
  // on coming back to the app, and on getting a connection back. A new version downloads in the background, then the game reloads
  // into it at the title or character screen (never in the middle of a run: until then it waits, and says so once)
  if ("serviceWorker" in navigator && window.isSecureContext) {
    let had = !!navigator.serviceWorker.controller, waiting = false;
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(reg => {
      const check = () => { if (navigator.onLine !== false) reg.update().catch(() => { }); };
      addEventListener("online", check);
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });
    }).catch(() => { });
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!had) { had = true; return; }               // (the very first visit: it's just been saved for offline, nothing to swap)
      waiting = true;
      const U = window.BERRY_UI; if (U && U.idle) return location.reload();
      const t = document.getElementById("toast");
      if (t) { t.textContent = "UPDATE DOWNLOADED · IT LOADS AT THE CHARACTER SCREEN"; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 4000); }
    });
    setInterval(() => { if (waiting && window.BERRY_UI && window.BERRY_UI.idle) location.reload(); }, 500);
    addEventListener("pointerdown", () => { try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch { } }, { once: true });   // (asks the phone not to clear it out)
  }
})();
