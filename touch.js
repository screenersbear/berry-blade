// Berry Blade on a phone (the user, 2026-10-17: "touch screen … a low opacity, clear d-pad and two buttons … over the game").
// A see-through d-pad on the left and four buttons on the right, laid out like a console pad (the user, 2026-10-17: "make the buttons
// 4 of them like a regular console. it's easier to have jump as a button and the fourth button should what on computer is attack and
// block held together"): A jump (C), B attack (X), X block (Z), Y tackle (X and Z at once; hold it to charge; the keys since 2026-10-20) (the user swapped B and X
// round: "B is attack, X is block"). They press the same keys the keyboard does, so the game needs no changes. The d-pad: ← → move,
// ↑ climbs ladders (and jumps, like the keyboard's ↑, but only pushed clearly up), ↓ is down (twice quickly drops through a ledge).
// The buttons sit close ("slightly closer to each other but not enough to make you press the wrong one"): a touch only ever presses
// the one button nearest it, so a thumb between two can't set off the wrong one.
// A small button in the top-left corner pauses (Esc), or goes back on the menu screens. The pad and buttons show on the menus too (the user,
// 2026-10-20: "make the player able to scroll through menues with virtual control arrows or actual control, not just touch screen"):
// the d-pad moves through a menu and ✕ (or ○) picks; the menus can still be tapped directly.
// Sitting down in the beps' hideout, they all fade away, and a tap anywhere gets you up again (the user, 2026-10-19).
// Full screen: any tap asks for it where a page can have it (Android, iPad); on an iPhone, a card asks you to swipe the bars away (see below).
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
  #tBtns { right: calc(14px + env(safe-area-inset-right)); bottom: calc(12px + env(safe-area-inset-bottom)); width: 186px; height: 186px; opacity: .34; }
  #tBtns .b { position: absolute; width: 70px; height: 70px; border-radius: 50%; border: 2.5px solid #fff; background: rgba(255, 255, 255, .16);
    color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: background .06s; box-sizing: border-box; }
  #tBtns .b.on { background: rgba(255, 255, 255, .62); color: #2f3b43; }
  #tBtns .b svg { width: 25px; height: 25px; display: block; overflow: visible; }   /* (the PlayStation shapes, like the Backbone's buttons) */
  #tBtns .b svg * { fill: none; stroke: currentColor; stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }
  #touch.gp #tPad, #touch.gp #tBtns { display: none; }   /* (a controller in use: no on-screen pad) */
  #tBtns .b i { font: 600 8px/1 "Jost", sans-serif; letter-spacing: .14em; font-style: normal; margin-top: 3px; }
  #tBtns .bY { left: 58px; top: 0; } #tBtns .bX { left: 0; top: 58px; } #tBtns .bB { left: 116px; top: 58px; } #tBtns .bA { left: 58px; top: 116px; }
  #tCorner { left: calc(12px + env(safe-area-inset-left)); top: calc(10px + env(safe-area-inset-top)); width: 44px; height: 44px; border-radius: 50%;
    border: 2px solid #fff; background: rgba(255, 255, 255, .16); color: #fff; opacity: .34; display: flex; align-items: center; justify-content: center;
    font: 16px/1 "Bungee", sans-serif; box-sizing: border-box; }
  #tCorner.hide { display: none; }
  #tPad, #tBtns, #tCorner { transition: opacity .7s; }
  #touch.sit #tPad, #touch.sit #tBtns, #touch.sit #tCorner { opacity: 0; pointer-events: none; }   /* (sitting in the beps' hideout: the controls fade away) */
  #tSit { position: absolute; inset: 0; pointer-events: auto; touch-action: none; display: none; } #touch.sit #tSit { display: block; }
  #tCorner.on { background: rgba(255, 255, 255, .62); color: #2f3b43; }
  #tTurn { position: fixed; inset: 0; z-index: 90; display: none; background: #2f3b43; color: #ffde00; align-items: center; justify-content: center;
    flex-direction: column; gap: 14px; font: 18px "Bungee", sans-serif; text-align: center; padding: 24px; }
  #tTurn span { font: 500 13px "Jost", sans-serif; letter-spacing: .2em; color: #fff; }
  @media (orientation: portrait) and (pointer: coarse) { #tTurn { display: flex; } }
  canvas { touch-action: none; }
  html { touch-action: manipulation; }
  body { overscroll-behavior: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }`;
  const st = document.createElement("style"); st.textContent = css + "\n  .mnu small { display: none; }   /* (the story menus: no keyboard hints on a phone, you tap) */"; document.head.appendChild(st);
  window.BERRY_TOUCH = true;                        // (the game words its prompts for a touch screen: "TAP" not "PRESS ANY BUTTON")

  const T = document.createElement("div"); T.id = "touch"; T.className = "off";
  const arm = (d, rot) => `<g transform="rotate(${rot} 78 78)"><path class="arm" data-d="${d}" d="M58 6 Q58 2 62 2 L94 2 Q98 2 98 6 L98 58 L78 78 L58 58 Z"/><path class="tri" d="M78 16 L88 30 L68 30 Z"/></g>`;
  T.innerHTML = `<div id="tSit"></div><div id="tPad"><svg viewBox="0 0 156 156">${arm("u", 0)}${arm("r", 90)}${arm("d", 180)}${arm("l", 270)}<circle cx="78" cy="78" r="9" fill="rgba(255,255,255,.3)"/></svg></div>
    <div id="tBtns"><div class="b bY" data-b="y"><svg viewBox="0 0 24 24"><path d="M12 3.5 L21.5 19.5 L2.5 19.5 Z"/></svg><i>TACKLE</i></div><div class="b bX" data-b="x"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="1"/></svg><i>BLOCK</i></div><div class="b bB" data-b="b"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/></svg><i>ATTACK</i></div><div class="b bA" data-b="a"><svg viewBox="0 0 24 24"><path d="M5 5 L19 19 M19 5 L5 19"/></svg><i>JUMP</i></div></div>
    <div id="tCorner" class="hide">❚❚</div>`;
  const turn = document.createElement("div"); turn.id = "tTurn"; turn.innerHTML = "TURN YOUR PHONE SIDEWAYS<span>BERRY BLADE PLAYS IN LANDSCAPE</span>";
  const mount = () => { document.body.appendChild(T); document.body.appendChild(turn); };
  if (document.body) mount(); else addEventListener("DOMContentLoaded", mount);

  // ── keys: pressed and let go the way a keyboard would
  const down = {};
  const key = (code, on) => { if (!!down[code] === on) return; down[code] = on; dispatchEvent(new KeyboardEvent(on ? "keydown" : "keyup", { code, bubbles: true, cancelable: true })); };
  const tap = code => { key(code, true); setTimeout(() => key(code, false), 60); };
  const KEY = { u: "ArrowUp", d: "ArrowDown", l: "ArrowLeft", r: "ArrowRight" }, BTN = { a: ["KeyC"], b: ["KeyX"], x: ["KeyZ"], y: ["KeyX", "KeyZ"] };   // (the keyboard's keys since 2026-10-20: C jump, X attack, Z block)

  // ── which way the d-pad is pushed: 8 ways, up only when it's pushed clearly up (jumping has its own button), so running doesn't jump by accident
  const padPtr = new Map(), btnPtr = new Map();
  const padDirs = (x, y) => {
    const R = document.getElementById("tPad").getBoundingClientRect(), dx = x - (R.left + R.width / 2), dy = (R.top + R.height / 2) - y;
    if (Math.hypot(dx, dy) < R.width * .11) return "";
    const a = Math.atan2(dy, dx) * 180 / Math.PI;
    return (Math.abs(a) < 62 ? "r" : "") + (Math.abs(a) > 118 ? "l" : "") + (a > 52 && a < 128 ? "u" : "") + (a < -40 && a > -140 ? "d" : "");
  };
  const btnsAt = (x, y) => {                     // the one button nearest the thumb (and only if the thumb's on or right by it)
    const c = [...document.querySelectorAll("#tBtns .b")].map(e => { const r = e.getBoundingClientRect(); return { k: e.dataset.b, d: Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)), r: r.width / 2 }; });
    const b = c.reduce((m, q) => q.d < m.d ? q : m, c[0]); return b && b.d < b.r * 1.3 ? b.k : "";
  };
  const sync = () => {
    const pd = [...padPtr.values()].join(""), bd = [...btnPtr.values()].join("");
    "udlr".split("").forEach(d => { key(KEY[d], pd.includes(d)); document.querySelector(`#tPad .arm[data-d="${d}"]`).classList.toggle("on", pd.includes(d)); });
    const held = new Set([...bd].flatMap(b => BTN[b] || []));
    ["KeyZ", "KeyX", "KeyC"].forEach(k => key(k, held.has(k)));
    "axby".split("").forEach(b => document.querySelector(`#tBtns [data-b="${b}"]`).classList.toggle("on", bd.includes(b)));
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
    document.getElementById("tSit").addEventListener("pointerdown", e => { e.preventDefault(); tap("KeyX"); });   // sitting: a tap anywhere gets you up
    ["pointerup", "pointercancel", "pointerleave"].forEach(t => C.addEventListener(t, () => C.classList.remove("on")));
    ["contextmenu", "touchstart"].forEach(t => T.addEventListener(t, e => { if (e.target.closest("#tPad, #tBtns, #tCorner")) e.preventDefault(); }, { passive: false }));
  };
  if (document.body) ready(); else addEventListener("DOMContentLoaded", ready);

  // ── a controller (the Backbone): press any of its buttons and the on-screen pad and buttons hide, till it's unplugged. (A phone only
  // tells a page about a controller once one of its buttons is pressed.) The game reads the controller itself: ✕ jump, ○ attack, □ block, △ tackle
  const pads = () => [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean);
  const gpOn = () => { if (T.classList.contains("gp")) return; T.classList.add("gp"); padPtr.clear(); btnPtr.clear(); sync();
    const t = document.getElementById("toast"); if (t) { t.textContent = "CONTROLLER ON · THE TOUCH BUTTONS ARE HIDDEN"; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2600); } };
  addEventListener("gamepadconnected", gpOn);
  addEventListener("gamepaddisconnected", () => { if (!pads().length) T.classList.remove("gp"); });
  setInterval(() => { const P = pads(); if (!P.length) T.classList.remove("gp"); else if (P.some(g => g.buttons.some(b => b.pressed))) gpOn(); }, 250);

  // ── full screen, so the browser's bars don't cover the game (the user, 2026-10-20: "make sure that touching the screen hides safari or
  // chrome's toolbars so the player can see the game"). Where a page can go full screen (Android; an iPad), any tap while it isn't asks
  // for it, and turns it sideways. It asks as the finger lifts: a touch only counts as you doing something then (asking on touch-down was
  // refused, and it only ever asked the once). An iPhone won't let a web page go full screen at all, in Safari or Chrome; there, swiping
  // up tucks the bars away. So the page gets a little room to scroll, and while the bars are showing a card asks for that swipe (or
  // mentions the home screen: added there, the game opens with no bars at all).
  const root = document.documentElement, coarse = matchMedia("(pointer: coarse)").matches, iPhone = /iPhone|iPod/.test(navigator.userAgent);
  const standalone = () => navigator.standalone === true || matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches;
  const fsOn = () => document.fullscreenElement || document.webkitFullscreenElement;
  const fsAsk = root.requestFullscreen ? () => root.requestFullscreen({ navigationUI: "hide" }) : root.webkitRequestFullscreen ? () => root.webkitRequestFullscreen() : null;
  let asking = false;
  const goFull = e => {
    if (!coarse || iPhone || !fsAsk || asking || fsOn() || standalone() || (e && e.pointerType === "mouse")) return;
    asking = true;
    try { Promise.resolve(fsAsk()).then(() => { if (screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(() => { }); }).catch(() => { }).finally(() => { asking = false; }); }
    catch { asking = false; }
  };
  addEventListener("pointerup", goFull, true); addEventListener("touchend", goFull, true);
  if (iPhone && !standalone()) {
    root.classList.add("tSwipe");
    const st2 = document.createElement("style"); st2.textContent = `
  html.tSwipe, html.tSwipe body { height: auto; overflow: visible; }
  html.tSwipe body { min-height: calc(100vh + 240px); }   /* (room to swipe: that's what tucks Safari's bars away) */
  html.tSwipe body > canvas { position: fixed; left: 0; top: 0; }
  #tUp { position: fixed; inset: 0; z-index: 88; display: none; background: rgba(47, 59, 67, .95); color: #ffde00; align-items: center; justify-content: center;
    flex-direction: column; gap: 10px; font: 18px "Bungee", sans-serif; text-align: center; padding: 24px; touch-action: pan-y; }
  #tUp.on { display: flex; }
  #tUp i { font-style: normal; font-size: 34px; line-height: 1; animation: tUpBob 1.1s ease-in-out infinite; }
  #tUp span { font: 500 13px "Jost", sans-serif; letter-spacing: .2em; color: #fff; }
  #tUp small { font: 500 10px "Jost", sans-serif; letter-spacing: .18em; color: #fff; opacity: .7; margin-top: 6px; }
  @keyframes tUpBob { 0%, 100% { transform: translateY(6px); } 50% { transform: translateY(-8px); } }`; document.head.appendChild(st2);
    const up = document.createElement("div"); up.id = "tUp";
    up.innerHTML = "<i>↑</i>SWIPE UP FOR FULL SCREEN<span>OR TAP TO PLAY AS IT IS</span><small>NO BARS AT ALL: SHARE → ADD TO HOME SCREEN</small>";
    const mountUp = () => document.body.appendChild(up); if (document.body) mountUp(); else addEventListener("DOMContentLoaded", mountUp);
    let skip = false, moved = false, y0 = 0;
    const bars = () => innerWidth > innerHeight && innerHeight < Math.min(screen.width, screen.height) - 40;   // (sideways, and clearly less tall than the screen: the bars are showing)
    const check = () => { if (!bars()) skip = false; up.classList.toggle("on", bars() && !skip); };
    addEventListener("resize", check); addEventListener("scroll", check, { passive: true }); if (window.visualViewport) visualViewport.addEventListener("resize", check);
    up.addEventListener("touchstart", e => { moved = false; y0 = e.touches[0].clientY; }, { passive: true });
    up.addEventListener("touchmove", e => { if (Math.abs(e.touches[0].clientY - y0) > 12) moved = true; }, { passive: true });
    up.addEventListener("touchend", () => { if (!moved) { skip = true; up.classList.remove("on"); } else setTimeout(check, 450); });   // (a tap: leave the bars, till they next go and come back)
    setInterval(check, 700); check();                 // (Safari doesn't always say when its bars slide away)
  }

  // ── show the pad while playing; the corner button pauses, or goes back on the menu screens
  let was = "";
  setInterval(() => {
    const U = window.BERRY_UI; if (!U) return;
    const s = U.state;                            // "play" | "sit" | "back" | "menu" | "none"
    if (s === was) return; was = s;
    T.classList.toggle("off", s !== "play" && s !== "sit" && s !== "menu" && s !== "back"); T.classList.toggle("sit", s === "sit");
    if (s !== "play") { padPtr.clear(); btnPtr.clear(); sync(); }
    const C = document.getElementById("tCorner"); C.classList.toggle("hide", s !== "play" && s !== "back" && s !== "sit" && s !== "menu"); C.textContent = s === "play" || s === "sit" ? "❚❚" : "‹";
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
      if (t) { t.textContent = "UPDATE DOWNLOADED · IT LOADS AT THE MAIN MENU"; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 4000); }
    });
    setInterval(() => { if (waiting && window.BERRY_UI && window.BERRY_UI.idle) location.reload(); }, 500);
    addEventListener("pointerdown", () => { try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch { } }, { once: true });   // (asks the phone not to clear it out)
  }
})();
