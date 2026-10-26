// Berry Blade's character editor. Opens over the character select screen (E, or EDIT CHARACTERS), edits the game's
// real cast and saves straight into the game's character store. Built from the old Starky Character Hub page.
// A plain script (not a module) so it also loads when the game is opened straight from its folder; three.js comes from the game.
(() => {
"use strict";
let booted = null;
window.BerryEditor = { open(id, onClose) { if (!booted) booted = boot(); booted.open(id, onClose); } };

function boot() {
const G = window.BerryGame, THREE = G.THREE;
const styleEl = document.createElement("style"); styleEl.textContent = ED_CSS; document.head.append(styleEl);
const root = document.createElement("div"); root.id = "ed"; root.hidden = true; root.innerHTML = ED_MARKUP; document.body.append(root);

const $ = id => document.getElementById(id);
const clone = o => JSON.parse(JSON.stringify(o));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, k) => a + (b - a) * k;
const approach = (v, t, d) => v < t ? Math.min(v + d, t) : Math.max(v - d, t);
const easeOut = u => 1 - Math.pow(1 - u, 3);
const easeInOut = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const TAU = Math.PI * 2, GROUND = 470;
function toast(msg, ms = 2600) { const t = $("edToast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove("show"), ms); }

// ───────────────────────────── studio: same renderer, cel shading and colour grade as the game ─────────────────────────────
const canvas = $("view"), stageEl = $("stage");
// if the browser can't give us 3D (or drops it), the editor keeps working and the stage says so
let renderer = null;
function glNote(on, title, text) { $("gl").hidden = !on; if (on) { $("glT").textContent = title; $("glP").textContent = text; } }
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
catch { glNote(true, "NO 3D", "This browser couldn't start the 3D preview. The sliders, import and export still work. Try reloading, or another browser."); }
if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.autoClear = false;
  canvas.addEventListener("webglcontextlost", e => { e.preventDefault(); glNote(true, "PREVIEW PAUSED", "The graphics card dropped the 3D preview. It usually comes back by itself; if not, reload the page. Your character is safe."); });
  canvas.addEventListener("webglcontextrestored", () => glNote(false));
}
const scene = new THREE.Scene();
scene.background = new THREE.Color("#d7dfdb");
const camera = new THREE.PerspectiveCamera(32, 1, .1, 200);
const frameRT = new THREE.WebGLRenderTarget(1, 1, { samples: 4 });
frameRT.texture.colorSpace = THREE.SRGBColorSpace;
const gradeScene = new THREE.Scene(), gradeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
gradeScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: { tex: { value: frameRT.texture } },
  vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
  fragmentShader: `
    uniform sampler2D tex; varying vec2 vUv;
    vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - .055, step(.0031308, c)); }
    void main() {
      vec3 c = toSRGB(max(texture2D(tex, vUv).rgb, 0.0));
      float l = dot(c, vec3(.299, .587, .114));
      c = mix(vec3(l), c, 1.06);
      c = mix(c, vec3(1.0, .975, .94), .07);
      c = pow(c, vec3(.95));
      c = (c - .5) * 1.07 + .5;
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
  depthTest: false, depthWrite: false,
})));
const sun = new THREE.DirectionalLight("#fff3d6", 2.6); sun.position.set(-7, 14, 11); scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight("#f3f1d6", "#3f6544", 1.25));
const KIT = StarkyCharKit(THREE, { parent: scene, shadowParent: scene });
if (G.KIT) for (const k in G.KIT.STRIKES) if (!KIT.STRIKES[k]) KIT.STRIKES[k] = G.KIT.STRIKES[k];   // (the game's own moves too: Camila's and Rose's combos live in the game, not the kit)
const { toonT } = KIT.util;
const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 72), toonT("#e5eae4")); floor.rotation.x = -Math.PI / 2; scene.add(floor);
const sweep = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 24, 72, 1, true, Math.PI * .5, Math.PI), toonT("#d3dcd8", { side: THREE.BackSide }));
sweep.position.set(0, 12, 0); scene.add(sweep);
const ring = new THREE.Mesh(new THREE.RingGeometry(.55, .78, 48), new THREE.MeshBasicMaterial({ color: "#ffe23a", transparent: true, opacity: .85, depthWrite: false }));
ring.rotation.x = -Math.PI / 2; ring.position.y = .012; scene.add(ring);
const cards = KIT.buildCards(scene);
function resize() {
  if (!renderer) return;
  const w = Math.max(1, stageEl.clientWidth), h = Math.max(1, stageEl.clientHeight);
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  const d = renderer.getPixelRatio(); frameRT.setSize(Math.floor(w * d), Math.floor(h * d));
}
new ResizeObserver(resize).observe(stageEl); resize();

// ───────────────────────────── the cast ─────────────────────────────
const PRESETS = (G.gameSpecs || G.shippedSpecs)();   // (the cast as the game plays it: its own keyed moves and jumps on, so what you see here is what plays, 2026-10-26)
const presetOf = id => PRESETS.find(p => p.id === id);
// villains: inside Berry Blade the bosses are in the cast too. Evil June is a character like any other (her spec says villain);
// the others are the game's own models: the editor shows them and recolours / resizes them part by part (a LOOK tab), nothing more
const VIL = (window.BerryGame && window.BerryGame.villains) || null;
let vprev = null;                                                // the villain on stage (the game builds it)
const villainEntries = () => VIL ? VIL.list().map((v, i) => { const look = clone(VIL.look(v.id) || {}); delete look.updated; delete look.id;
  return { id: "villain:" + v.id, villain: v, builtIn: true, created: 1000 + i, ref: null, spec: { name: v.name, base: "villain" }, look, base: clone(look), undo: [], redo: [] }; }) : [];
const isVillainSpec = s => !!(s && s.villain && s.villain.on);
// the berry buddies: their moves (the plain hit, the special every couple of hits), on the game's own models (the user, 2026-10-25: "every move we do and
// create should go in there for their respective characters"). Their look stays the game's; origin: as they ship
const BUD = (window.BerryGame && window.BerryGame.buddies) || null;
const buddyEntries = () => BUD ? BUD.list().map((b, i) => { const e = entry(BUD.spec(b.id), { id: "buddy:" + b.id, buddy: b.id, builtIn: false, created: 900 + i, ref: null, origin: BUD.plain(b.id) }); e.spec.name = e.origin.name = b.name; return e; }) : [];   // (a pet's name: EVERY CAT / EVERY DOG, as it stands for all of them)
const B_TABS = { ANIMATE: "animate" };
const entry = (spec, extra = {}) => ({ id: spec.id, spec: KIT.normalize(spec), origin: KIT.normalize(extra.origin || spec), builtIn: false, created: Date.now(), ref: undefined, undo: [], redo: [], ...extra, spec: KIT.normalize(spec), origin: KIT.normalize(extra.origin || spec) });
let cast = PRESETS.map((p, i) => entry(p, { builtIn: true, created: i, ref: null }));
let cur = cast[0];
const uid = () => Math.random().toString(36).slice(2, 6);
const freshId = name => KIT.normalize({ name }).id.slice(0, 26) + "-" + uid();
const edited = e => e.villain ? !!((e.look.size && Math.abs(e.look.size - 1) > .001) || Object.keys(e.look.colors || {}).length) : e.builtIn ? !same(e.spec, presetOf(e.id)) : !same(e.spec, e.origin);

// storage: edits are kept as an emergency draft while you work (in this browser); closing asks whether
// to apply them to the game's characters or save them as a separate file
const store = G.store, DRAFT_KEY = "berry.drafts.v1";
const drafts = {
  all() { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}") || {}; } catch { return {}; } },
  write(o) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(o)); return true; } catch { return false; } },
  put(doc) { const o = this.all(); o[doc.id] = doc; return this.write(o); },
  drop(id) { const o = this.all(); delete o[id]; this.write(o); },
  clear() { try { localStorage.removeItem(DRAFT_KEY); } catch { } },
};
function setSaveState(t) { $("saveState").textContent = t; }
const docOf = e => ({ id: e.id, spec: e.spec, origin: e.origin, builtIn: e.builtIn, created: e.created, updated: Date.now() });
const changed = e => e.villain ? !same(e.look, e.base) : (e.isNew || !e.base || !same(e.spec, e.base));   // different from what the game has now
function doSave(e) {
  clearTimeout(e.saveT); e.saveT = null; e.dirty = false;
  if (e.villain) { setSaveState(cast.some(changed) ? "CHANGES KEPT · CHOOSE WHEN YOU CLOSE" : ""); return Promise.resolve(); }   // a villain's look waits for APPLY
  if (changed(e)) { const ok = drafts.put(docOf(e)); setSaveState(ok ? "DRAFT KEPT · CHOOSE WHEN YOU CLOSE" : "COULDN'T KEEP A DRAFT · EXPORT TO BE SAFE"); }
  else { drafts.drop(e.id); setSaveState(cast.some(changed) ? "DRAFT KEPT · CHOOSE WHEN YOU CLOSE" : ""); }
  return Promise.resolve();
}
function scheduleSave(e) { clearTimeout(e.saveT); setSaveState("KEEPING A DRAFT…"); e.dirty = true; e.saveT = setTimeout(() => doSave(e), 400); }
async function flushSaves() { cast.forEach(e => { if (e.saveT) doSave(e); }); }
function loadStored() {                       // the cast = what ships with the game + what's been saved (+ any unfinished draft)
  cast = PRESETS.map((p, i) => entry(p, { builtIn: true, created: i, ref: null }));
  for (const d of store.list()) {
    if (!d || !d.spec) continue;
    let spec; try { spec = KIT.normalize(d.spec); } catch { continue; }
    let e = cast.find(x => x.id === d.id);
    if (e) e.spec = spec;
    else { e = entry(spec, { id: d.id, builtIn: false, created: d.created || Date.now(), origin: d.origin || spec }); cast.push(e); }
  }
  cast.push(...buddyEntries());                                // the berry buddies (their moves)
  cast.forEach(e => { e.base = clone(e.spec); });
  cast.push(...villainEntries());                              // the bosses (their looks)
  let restored = 0;
  for (const d of Object.values(drafts.all())) {         // edits never applied or saved: the page closed, or the browser crashed
    if (!d || !d.spec) continue;
    let spec; try { spec = KIT.normalize(d.spec); } catch { continue; }
    let e = cast.find(x => x.id === d.id);
    if (!e) { e = entry(spec, { id: d.id, builtIn: false, created: d.created || Date.now(), origin: d.origin || spec }); e.isNew = true; e.base = null; cast.push(e); }
    else e.spec = spec;
    if (changed(e)) restored++; else drafts.drop(e.id);
  }
  cast.sort((a, b) => (b.builtIn - a.builtIn) || a.created - b.created);
  return restored;
}
async function saveFile(name, json) {         // the downloads capability on claude.ai, an ordinary download elsewhere
  if (downloads) { try { await downloads.save({ filename: name, data: json }); return true; } catch (err) { if (err && err.code === "declined") return false; } }
  try {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" })), a = Object.assign(document.createElement("a"), { href: url, download: name });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000); return true;
  } catch { return false; }
}

// ───────────────────────────── the character on stage ─────────────────────────────
let rig = KIT.build(cur.spec), st = newState(rig), anim = "idle", animT = 0, pending = null, applyCost = 0, lastApply = 0, cardKey = "";
function newState(r) { const s = KIT.makeState(0, r, 0, GROUND); s.yaw = -.85; return s; }
function applySpec(spec) {
  const was = rig;
  if (cur.buddy) { rig.spec = spec; st.rig = rig; return; }     // (a buddy: only its moves change, the game's model stays as it is)
  rig = KIT.update(rig, spec);
  if (rig !== was) { const s = newState(rig); Object.assign(s, { pose: st.pose, out: st.out, pv: st.pv, yaw: st.yaw }); st = s; }
  else st.rig = rig;
  if (rig.kind === "cat") {
    const k = JSON.stringify([spec.colors.cards, spec.colors.cardEdge]);
    if (k !== cardKey) { KIT.paintCards(cards, spec); cardKey = k; }
  }
}
function switchRig(spec) { KIT.dispose(rig); rig = KIT.build(spec); if (cur.buddy) BUD.dress(rig, cur.buddy); st = newState(rig); cardKey = ""; if (rig.kind === "cat") { KIT.paintCards(cards, spec); cardKey = JSON.stringify([spec.colors.cards, spec.colors.cardEdge]); } animT = 0; }

// preview moves: a small copy of the game's player physics, running in place
function spring(b, dt) { b.sqv += (-190 * b.sq - 11 * b.sqv) * dt; b.sq += b.sqv * dt; }
const tl = { speed: 1, paused: false, t: 0 };                    // timeline clock for a picked move
const isMove = () => anim.startsWith("move:"), moveKind = () => anim.slice(5);
const moveDef = (kind, sp = cur.spec) => (sp.base === "cat" ? KIT.CAT_MOVES : KIT.STRIKES)[kind];
const MOVE_NAMES = { slash: "slash", rise: "rising slash", spin: "spin", chop: "chop", onetwo: "one-two", haymaker: "haymaker", hammer: "hammer", dive2: "dive",
  palm: "palm strike", spinkick: "spin kick", flykick: "flying kick", flipaxe: "flip axe kick", chop2: "double chop", sweep: "sweep", tornado: "tornado kick",
  sw_c1: "thrust", sw_c2: "whirlwind", sw_c3: "crash", bx_c1: "rush", bx_c2: "backfist", bx_c3: "rocket uppercut", nj_c1: "dash palm", nj_c2: "hurricane kick", nj_c3: "rising knee",
  kn_c1: "dash chop", kn_c2: "split kick", kn_c3: "cartwheel", cardswim: "card swim", cardswirl: "card swirl", carddash: "card dash", cardspin: "card spin", carddive: "card dive", cardslash: "card slash", cardcyclone: "card cyclone", cardstorm: "card storm",
  clunge: "lunge hook + one-two", chayhook: "classic one-two", chay: "haymaker", cjab: "jab", chook: "hook", rslash: "slash", rrise: "rising slash", rcleave: "cleave",
  cpunch: "punch", ccross: "cross", csmash: "smash", upperhook: "uppercut + hook", gu_fist: "rising swipe", up_fist: "rising uppercut", gu_sword: "rising swipe", up_sword: "rising cut",
  tk_left: "tackle, left", tk_right: "tackle, right", tk_hammer: "tackle, hammer", tk_sword: "tackle, sword", slide: "slide", flykick: "flying kick",
  punch: "straight punch", kick: "kick", hooks: "hooks", jab: "jab", khooks: "hooks", kjab: "jab", up_kick: "rising kick", dn_fist: "down punch", dn_sword: "down stab", dn_kick: "down kick",
  tkc_left: "tackle, left", tkc_right: "tackle, right", tk_cards: "tackle, cards", up_cards: "card rise", dn_cards: "card drop",
  tackle: "tackle", tkdig: "dig in (held)", backstep: "back-step",
  burr_flurry: "rapier flurry", stilt_stomp: "knee + stomp", coil_spin: "spinning top", elpico_drop: "dropkick", oldvic_hay: "old-time haymaker", boxcars_roll: "hook + double uppercut",
  pipe_slam: "pipe slam", vinnie_swoop: "swoop", rink_roll: "rolling tackle", doir_rise: "rising flip", noro_rush: "palm rush", bin_toss: "Bon toss", tusker_charge: "flag charge", rotor_shot: "propeller shot", rotor_gust: "burst + gust", chispa_hop: "spinning hop", brisa_twirl: "twirl + gust", flora_flop: "belly flop", pet_pinwheel: "pinwheel of claws", pet_bark: "tackle + bark", run_lunge: "running lunge punch", run_drop: "running drop slash" };   // (the berry buddies' specials, 2026-10-26)   // (2026-10-25, the user: "every move we do and create should go in there for their respective characters")   // (the heroes' own: Camila's from the Move Maker; and every other move a hero plays: the user, 2026-10-25 "I didn't see the tackle move in the animations, or the slides")   // (the heroes' own: Camila's from the Move Maker)
const setFor = sp => (G.setOf && G.setOf(sp)) || KIT.MOVESETS[sp.move.set] || KIT.MOVESETS.brawler;   // the moves as the game plays them: a hero's own combo (Camila's, Rose's) over her set's (the user, 2026-10-24: "it shows the old animations for camilas two ground attacks")
function movesFor(sp) {                                          // every move this character plays, by what you press, in play order: [move, label, group]
  const out = [], add = (g, k, lab, T) => { if (k && T[k] && T[k].keys) out.push([k, lab, g]); }, list = (g, L, T) => (L || []).forEach((k, i) => add(g, k, `${i + 1}`, T));
  if (cur && cur.buddy && cur.spec === sp && cur.buddy.startsWith("pet-")) { add("Special (every couple of pounces)", (KIT.PET_SP || {})[cur.buddy.slice(4)], "", KIT.CAT_MOVES); return out; }   // (the pets: their pounce is the game's own, their special keyed)
  const TK = KIT.TK_CHARGE || {};                                // (a move used in more than one place shows in each: it's the one move, edited once)
  if (sp.base === "cat") { const C = KIT.CAT_MOVES;
    list("Attack", KIT.CAT_GROUND, C); list("Attack in the air", KIT.CAT_AIR, C); add("Up + attack", KIT.CAT_UP, "", C); add("Down + attack in the air", KIT.CAT_DOWN, "", C);
    add("Down + attack", "cardslash", "", C); list("Charge (hold attack)", KIT.CAT_CHARGE, C); add("Tackle (attack + block)", "tackle", "", C);
    add("Charged tackle (hold attack + block)", "tkdig", "", C); list("Charged tackle (hold attack + block)", TK.cat, C); add("Back-step (block + back)", "backstep", "", C);
    add("Attack while running at full speed", "carddash", "", C);
    return out; }
  const S = setFor(sp), T = KIT.STRIKES, B = KIT.MOVESETS;       // (as the game picks them: work.html updatePlayer / startCombo / startTackleCombo)
  const bsp = (KIT.BUDDY_SP || {})[sp.id];                       // (a berry buddy's special, every couple of plain hits: work.html updateAllyOne)
  if (cur && cur.buddy && cur.spec === sp) { list("Attack", (KIT.BUDDY_PLAIN || {})[sp.id] || ((B[sp.move.set] || B.brawler).ground), T); add("Special (every couple of hits)", bsp, "", T); return out; }   // (its own plain hits: Rotor's shot)
  list("Attack", S.ground, T); list("Forward + attack", S.groundB || S.ground, T);
  list("Attack in the air", S.air1 || S.air, T); list("Forward + attack in the air", S.air2 || S.air, T);
  list("Up + attack", S.upChain || [S.up], T); add("Up + attack in the air", S.up, "", T); add("Down + attack in the air", S.down, "", T);
  add("Down + attack", "slide", "", T); list("Charge (hold attack)", (B[sp.move.set] || {}).charge || B.brawler.charge, T);
  add("Tackle (attack + block)", "tackle", "", T); add("Charged tackle (hold attack + block)", "tkdig", "", T);
  list("Charged tackle (hold attack + block)", (((sp.outfit || {}).prop || {}).kind === "sword" ? TK.sword : TK.other), T); add("Back-step (block + back)", "backstep", "", T);
  add("Attack while running at full speed", G.runAttackOf ? G.runAttackOf(sp) : null, "", T);   // (the running attack, 2026-10-26)
  add("As a berry buddy: special", bsp, "", T);
  return out;
}
function driveMove(p, dt) {
  KIT.time += dt;
  const kind = moveKind(), S = moveDef(kind); if (!S) return;
  tl.t += dt; if (tl.t > S.dur + .45) tl.t = 0;                 // a short rest between loops
  const u = tl.t <= S.dur ? tl.t : -1;
  Object.assign(p, { keysFull: true, atkIdx: 0, y: GROUND, vy: 0, hp: 3, hurtT: 0, sq: 0, sqv: 0, rot: 0, spinY: 0, bounceT: -1, block: false, sprint: false }, moveAt(kind, S, u));
  p.blink -= dt; if (p.blink < -.12) p.blink = 2 + Math.random() * 2.5;
  p.prof = approach(p.prof || 0, 1, dt * 10); p.bodyYaw = lerp(.85, .3, p.prof); p.yaw = lerp(p.yaw, -p.bodyYaw, 1 - Math.exp(-dt * 16));
  KIT.updatePose(p, dt); p.x = 0;
}
// drag handles: grab a hand, an elbow, a foot, a knee, the hips, the middle of the back, the head or the sword tip and move it; the arms bend (and reach out
// sideways) to follow. The dot you grabbed last gets a ring: turn it to bend the forearm or the shin or tilt the head, slide it to twist the hips or the upper body
// (the user, 2026-10-23: "add points on characters elbows and knees to better pose them. and arrows around the points that allow rotation not just movement")
const HANDLE_NAMES = { handN: "hand · camera side", handF: "hand · far side", elbowN: "elbow · camera side", elbowF: "elbow · far side", footN: "foot · camera side", footF: "foot · far side",
  kneeN: "knee · camera side", kneeF: "knee · far side", hips: "hips · up and down", spine: "middle of the back · bend", head: "head · lean", tip: "sword tip" };
const RING_SAYS = { elbowN: "ring: bend the forearm", elbowF: "ring: bend the forearm", kneeN: "ring: bend the shin", kneeF: "ring: bend the shin", head: "ring: tilt", hips: "ring: hip twist", spine: "ring: upper body twist" };
const ringFor = id => { const k = KIT.RING_OF[id]; return k && !(k === "twist" && rig.kind === "cat") ? k : null; };
let hdSel = null;                                                // the dot grabbed last: its ring and its thread through the move show
const handleEls = {}, _ray = new THREE.Raycaster(), _inv = new THREE.Matrix4(), _pl = new THREE.Plane(), _hit = new THREE.Vector3(), _ndc = new THREE.Vector2(), _cd = new THREE.Vector3();
let hdrag = null, hdTip = null;
let poseMode = false;                                            // camera mode: dragging turns the camera. pose mode: dragging moves the character
function setPoseMode(v) {
  poseMode = v; [...$("modeSeg").children].forEach(b => b.classList.toggle("on", (b.dataset.m === "pose") === v));
  canvas.style.cursor = v ? "default" : "";
  if (v) setPaused(true);                                         // you pose a still moment
}
$("modeSeg").onclick = e => { const b = e.target.closest("[data-m]"); if (b) setPoseMode(b.dataset.m === "pose"); };
function editTarget() {                                        // what dragging a dot changes right now
  const keyed = k => { const S = k && moveDef(k); return S && S.keys ? S : null; };
  if (isMove()) { const S = moveDef(moveKind()); return S ? { type: "keys", kind: moveKind(), t: clamp(tl.t, 0, S.dur), S, name: (MOVE_NAMES[moveKind()] || moveKind()) } : null; }
  if ((anim === "attack" || anim === "air") && st.atkT >= 0 && keyed(st.atkKind)) { const S = keyed(st.atkKind); return { type: "keys", kind: st.atkKind, t: clamp(st.atkT, 0, S.dur), S, name: MOVE_NAMES[st.atkKind] || st.atkKind }; }
  if (anim === "run" || anim === "dash") return { type: "cycle", u: ((st.gaitPh / TAU) % 1 + 1) % 1, name: "run" };
  if (anim === "hurt" && st.hurtT > 0) return { type: "pose", key: "hurt", name: "hurt pose" };
  if ((anim === "jump" || anim === "air") && !st.onGround && st.atkT < 0 && st.bounceT < 0) { const k = st.vy < -160 ? "rise" : st.vy < 160 ? "top" : "fall"; return { type: "pose", key: k, name: { rise: "jump: going up", top: "jump: top", fall: "jump: coming down" }[k] }; }
  if (anim === "block") return { type: "pose", key: "guard", name: "block pose" };
  if (anim === "idle") return { type: "pose", key: "stance", name: "standing pose" };
  return null;
}
const posing = () => poseMode && !!editTarget();
$("tlPrev").title = "Back a frame (←, shift ← for six)"; $("tlNext").title = "Forward a frame (→, shift → for six)"; $("tlPlay").title = "Play / pause (space)";
function syncHandles() {
  const box = $("handles"), show = posing() && renderer && $("gl").hidden && $("busy").hidden;
  box.hidden = !show; if (!show) return;
  const hs = KIT.poseHandles(st, rig), w = stageEl.clientWidth, h = stageEl.clientHeight, v = new THREE.Vector3(), at = {};
  rig.root.updateMatrixWorld(true);
  const scr = (p, world) => { v.copy(p); if (!world) rig.body.localToWorld(v); v.project(camera); return [(v.x + 1) / 2 * w, (1 - v.y) / 2 * h, v.z]; };
  hs.forEach(H => {
    let d = handleEls[H.id];
    if (!d) { d = handleEls[H.id] = el("div", "hd"); d.dataset.id = H.id; d.classList.toggle("joint", /^(elbow|knee)/.test(H.id)); d.setAttribute("aria-label", "Drag the " + HANDLE_NAMES[H.id]); box.append(d);
      d.onpointerenter = () => { if (!hdTip) { hdTip = el("div", "hdtip"); box.append(hdTip); } hdTip.textContent = HANDLE_NAMES[H.id] + (ringFor(H.id) ? " · " + RING_SAYS[H.id] : ""); hdTip.hidden = false; hdTip.style.left = d.style.left; hdTip.style.top = d.style.top; };
      d.onpointerleave = () => { if (hdTip && !hdrag) hdTip.hidden = true; }; }
    const [x, y, z] = scr(H.pos); at[H.id] = [x, y];
    d.style.left = x + "px"; d.style.top = y + "px"; d.hidden = z > 1; d.classList.toggle("sel", H.id === hdSel);
    if (hdTip && hdrag && hdrag.id === H.id) { hdTip.style.left = d.style.left; hdTip.style.top = d.style.top; }
  });
  for (const id in handleEls) if (!hs.some(H => H.id === id)) { handleEls[id].remove(); delete handleEls[id]; }
  drawOverlay(scr, at);
}
// the faded dots (2026-10-23: "show faded points that show where the next and the last point in the animation were positioned so you can kind of move them
// along the same thread"): hollow = where each dot was at your last key (or the move's start), solid = where it gets to at your next key (or the end);
// the dotted line = the picked dot's whole path through the move
let onion = null, onionOn = true;
function moveAt(kind, S, u) {                                    // the state that plays a move at u (-1: between loops). The tackle, the dig-in and the back-step are
  const pm = S.pose && u >= 0 ? kind : null;                     // driven by the game, not played as attacks, so they're set up the way it does (work.html tackleStep, tkCharge, startDodge)
  const tkV = pm === "tackle" ? (u < .14 ? 0 : u < .54 ? 560 * (1 - ((u - .14) / .4) ** 2 * .55) : 560 * .45 * (1 - (u - .54) / .18)) : 0;   // (braced, the lunge on the running legs, pulling up)
  return { atkKind: S.pose ? null : kind, atkT: S.pose ? -1 : u, onGround: pm !== "backstep", vx: tkV, tackle: pm === "tackle" ? { t: u } : null, tackleK: pm === "tackle" ? 1 : 0,
    tkCharge: pm === "tkdig" ? { t: u, lv: 0 } : null, tkDig: pm === "tkdig" ? 1 : 0, dodge: pm === "backstep" ? { t: u } : null };
}
function handlesAt(times) {                                      // every dot's place (in the world) at other moments of the picked move; the pose is put back after
  const kind = isMove() ? moveKind() : st.atkKind, S = kind && moveDef(kind), M = rig.body.matrixWorld;
  const keep = { atkT: st.atkT, atkKind: st.atkKind, onGround: st.onGround, vx: st.vx, tackle: st.tackle, tackleK: st.tackleK, tkCharge: st.tkCharge, tkDig: st.tkDig, dodge: st.dodge, pose: { ...st.pose }, pv: { ...st.pv }, out: { ...st.out } };
  const res = times.map(t => { if (S && S.pose) Object.assign(st, moveAt(kind, S, t)); else st.atkT = t; KIT.updatePose(st, 0); rig.sync(st, rig, 0); rig.root.updateMatrixWorld(true); const o = {}; KIT.poseHandles(st, rig).forEach(H => { o[H.id] = H.pos.clone().applyMatrix4(M); }); return o; });
  Object.assign(st, keep);
  return res;
}
function updateOnion() {                                         // (paused on a move, in POSE mode: the path is made again only when the move changes; the two ghosts when the keys either side do)
  if (!onionOn || !posing() || !isMove()) { onion = null; return; }
  const kind = moveKind(), S = moveDef(kind), t = clamp(tl.t, 0, S.dur), ks = [...new Set(ownKeys(kind).map(k => +k.t.toFixed(3)))].sort((a, b) => a - b);
  const pt = [...ks].reverse().find(k => k < t - .009) ?? (t > .009 ? 0 : null), nt = ks.find(k => k > t + .009) ?? (t < S.dur - .009 ? S.dur : null);
  const busy = hdrag && onion && performance.now() - onion.at < 220;   // (while dragging: a few times a second)
  if (!onion || onion.kind !== kind) onion = { kind, at: 0 };
  if (onion.spec !== rig.spec && !busy) { const N = 30; onion.path = handlesAt(Array.from({ length: N + 1 }, (_, i) => S.dur * i / N)); onion.spec = rig.spec; onion.at = performance.now(); onion.gk = null; }
  const gk = onion.spec + "|" + pt + "|" + nt;
  if (onion.gk !== gk && onion.path) { const g = handlesAt([pt ?? 0, nt ?? 0]); onion.prev = pt != null ? g[0] : null; onion.next = nt != null ? g[1] : null; onion.gk = gk; onion.gspec = onion.spec; }
}
const SVGNS = "http://www.w3.org/2000/svg";
function drawOverlay(scr, at) {
  const g = $("ghosts"), O = onionOn && onion && isMove() && onion.kind === moveKind() && onion.path ? onion : null, id = (hdrag && hdrag.id) || hdSel, f = n => n.toFixed(1);
  let s = "";
  if (O) {
    const ok = q => isFinite(q[0]) && isFinite(q[1]) && q[2] <= 1, P = id ? O.path.map(q => q[id]).filter(Boolean).map(p => scr(p, true)).filter(ok) : [];
    if (P.length > 1) s += `<polyline class="thread" points="${P.map(q => f(q[0]) + "," + f(q[1])).join(" ")}"/>`;
    [["gp", O.prev], ["gn", O.next]].forEach(([c, G]) => { if (G) for (const k in G) { if (!handleEls[k] || handleEls[k].hidden) continue; const q = scr(G[k], true), [x, y] = q; if (ok(q)) s += `<circle class="${c}${k === id ? " me" : ""}" cx="${f(x)}" cy="${f(y)}" r="${k === id ? 7 : 5}"/>`; } });
  }
  g.innerHTML = s;
  const R = $("ring"), rg = hdSel && at[hdSel] && !handleEls[hdSel].hidden && (!hdrag || hdrag.ring) ? ringFor(hdSel) : null;
  R.setAttribute("display", rg ? "inline" : "none"); if (!rg) return;
  const [x, y] = at[hdSel], tw = rg === "twist", rx = tw ? 31 : 26, ry = tw ? 11 : 26, pt = a => [x + rx * Math.cos(a), y - ry * Math.sin(a)], D = Math.PI / 180;
  const arc = (a0, a1) => { const [x0, y0] = pt(a0), [x1, y1] = pt(a1); return `M${f(x0)} ${f(y0)}A${rx} ${ry} 0 0 0 ${f(x1)} ${f(y1)}`; };
  const head = a => { const [px, py] = pt(a), tx = -rx * Math.sin(a), ty = -ry * Math.cos(a), l = Math.hypot(tx, ty) || 1, ux = tx / l, uy = ty / l, nx = -uy, ny = ux;
    return [[px + ux * 7, py + uy * 7], [px - ux * 3 + nx * 6, py - uy * 3 + ny * 6], [px - ux * 3 - nx * 6, py - uy * 3 - ny * 6]].map(q => f(q[0]) + "," + f(q[1])).join(" "); };
  const A = tw ? [[200 * D, 340 * D], [20 * D, 160 * D]] : [[25 * D, 155 * D], [205 * D, 335 * D]];   // two arcs, an arrow on the end of each: turn it either way
  R.querySelectorAll(".ro").forEach((e, i) => e.setAttribute("d", arc(...A[i]))); R.querySelectorAll(".ri").forEach((e, i) => e.setAttribute("d", arc(...A[i])));
  R.querySelectorAll(".rh").forEach((e, i) => e.setAttribute("points", head(A[i][1])));
  const hit = R.querySelector(".ringhit"); hit.setAttribute("cx", f(x)); hit.setAttribute("cy", f(y)); hit.setAttribute("rx", rx); hit.setAttribute("ry", ry); hit.classList.toggle("tw", tw);
}
function pointerToBody(e) {                                     // the point under the pointer, in the character's body space, at the part's depth
  const rc = canvas.getBoundingClientRect(); _ndc.set((e.clientX - rc.left) / rc.width * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
  _ray.setFromCamera(_ndc, camera); rig.root.updateMatrixWorld(true); _inv.copy(rig.body.matrixWorld).invert();
  const ray = _ray.ray.clone().applyMatrix4(_inv); camera.getWorldDirection(_cd); _cd.transformDirection(_inv);
  _pl.setFromNormalAndCoplanarPoint(_cd, hdrag.anchor);            // a plane facing you through the part: drag across the screen in any direction
  return ray.intersectPlane(_pl, _hit) ? _hit.clone() : null;
}
function softSetCycle(track, u, x, r, R) {                     // move the loop at u to x, nearby points following with a smooth falloff (0..1 is one stride; the ends meet)
  const at = tm => KIT.keyvS(track, ((tm % 1) + 1) % 1), out = track.map(k => [k[0], k[1]]), delta = x - at(u);
  const near = tm => out.some(k => Math.abs(k[0] - tm) < .01);
  (r > 0 ? [u - r, u - r / 2, u, u + r / 2, u + r] : [u]).forEach(tm => { tm = ((tm % 1) + 1) % 1; if (!near(tm)) out.push([+tm.toFixed(3), at(tm)]); });
  const w = d => d >= 1 ? 0 : .5 + .5 * Math.cos(Math.PI * d), cyc = a => { const d = Math.abs(a - u) % 1; return Math.min(d, 1 - d); };
  out.forEach(k => { const d = r > 0 ? cyc(k[0]) / r : (cyc(k[0]) < .01 ? 0 : 1); k[1] = clamp(k[1] + delta * w(d), R[0], R[1]); });
  out.sort((p, q) => p[0] - q[0]);
  if (out[0][0] > 0) out.unshift([0, at(0)]); if (out[out.length - 1][0] < 1) out.push([1, out[0][1]]);
  out[out.length - 1][1] = out[0][1] = (out[0][1] + out[out.length - 1][1]) / 2;   // keep the loop seamless
  return out;
}
// your keys (the user, 2026-10-23: "if I move one back, it goes back to the original position as the animation moves forward but then I move the further
// position and it gets choppy"): a part's track is the move as it ships (or what that part rested at) plus the change you made at each of your keys.
// Between two of your keys the change carries on, eased from one to the next; before your first and after your last it eases back out over the blend.
// Your keys are marked [t, value, 1] (the game reads only [t, value]); move.rests keeps what a part the move doesn't key itself rested at.
const mine = k => k[2] === 1;
const restOf = (kind, sc) => { const R = (cur.spec.move.rests || {})[kind]; return R && typeof R[sc] === "number" ? R[sc] : null; };
// cleared (the user, 2026-10-23: "we need the ability to reset a pose entirely ... I cant delete the original animation ... it always reset to whatever
// the aniamtion was set to"): a part whose original animation you've cleared holds one pose the whole move (move.clear[kind][channel]), so your keys
// are all that moves it; deleting every key of yours leaves it holding still there, not back to the original
const clearOf = (kind, sc) => { const C = (cur.spec.move.clear || {})[kind]; return C && typeof C[sc] === "number" ? C[sc] : null; };
function baseFn(kind, sc, rest) { const c = clearOf(kind, sc); if (c !== null) return () => c; const b = (moveDef(kind).keys || {})[sc]; return b ? t => KIT.keyv(b, t) : () => rest ?? 0; }
function keysOn(tr, base) {                                      // your keys on a track as [t, change]; a track made before keys were marked: its peaks
  if (!tr) return [];
  const ks = tr.filter(mine);
  if (ks.length) return ks.map(([t, v]) => [t, v - base(t)]);
  const d = tr.map(([t, v]) => [t, v - base(t)]);
  return d.filter(([, x], i) => { const a = Math.abs(x), l = i ? Math.abs(d[i - 1][1]) : 0, r = i < d.length - 1 ? Math.abs(d[i + 1][1]) : 0; return a > .01 && a >= l && a > r; });
}
function buildTrack(kind, sc, keys, base, R) {                   // [[t, change]] → the track (null when none are left: back to the move as it ships)
  const S = moveDef(kind), dur = S.dur, cl = clearOf(kind, sc);
  if (!keys.length) return cl !== null ? [[0, cl], [+dur.toFixed(4), cl]] : null;   // (a cleared part: held still)
  const b = cl !== null ? null : (S.keys || {})[sc], w = d => d >= 1 ? 0 : .5 + .5 * Math.cos(Math.PI * d);
  keys = keys.slice().sort((p, q) => p[0] - q[0]);
  const t0 = keys[0][0], tn = keys[keys.length - 1][0], kt = keys.map(k => k[0]), e = spread > 0 ? spread : 1 / 60, at = [0, dur, t0 - e, t0 - e / 2, tn + e / 2, tn + e];
  if (b) densify(b).forEach(k => at.push(k[0]));                  // the shipped curve's own shape
  keys.forEach(([t], i) => { if (i < keys.length - 1) { const t1 = keys[i + 1][0]; [.25, .5, .75].forEach(f => at.push(t + (t1 - t) * f)); } });
  const off = t => t < t0 ? keys[0][1] * w((t0 - t) / e) : t > tn ? keys[keys.length - 1][1] * w((t - tn) / e) : keys.length > 1 ? KIT.keyvS(keys, t) : keys[0][1];
  const ts = at.filter(t => t >= 0 && t <= dur && kt.every(k => Math.abs(k - t) > .006)).sort((p, q) => p - q).filter((t, i, A) => !i || t - A[i - 1] > .004);
  let out = [...ts.map(t => [t, 0]), ...kt.map(t => [t, 1])].sort((p, q) => p[0] - q[0])
    .map(([t, m]) => { const v = clamp(base(t) + off(t), R[0], R[1]), tt = +t.toFixed(4); return m ? [tt, v, 1] : [tt, v]; });
  while (out.length > 160) { let n = 0; out = out.filter((k, i) => mine(k) || i === 0 || i === out.length - 1 || ++n % 2); if (!n) break; }   // (thinned: every other in-between point)
  return out;
}
function putKey(A, kind, sc, t, v, start, rest) {                // your key for one part at t (start: its track when the drag began, so a drag never compounds)
  const base = baseFn(kind, sc, rest), ks = keysOn(start, base).filter(k => Math.abs(k[0] - t) > .009);
  ks.push([+t.toFixed(4), v - base(t)]);
  const tr = buildTrack(kind, sc, ks, base, KIT.ANIM_CH[sc]); if (tr) A[sc] = tr; else delete A[sc];
}
// ── where a move connects (the user, 2026-10-24: "can the editor in the game show a highlight like the artifact on where an animation connects? and also,
// is it possible to change where it connects?"): each hit window pink on the timeline (drag it along, or by an end to make it longer or shorter), the
// box it hits on the stage (bright while it's live), and sliders for when it starts and ends, how far it reaches and how high. Your changes are this
// character's own (spec.move.hits[kind]: one entry per window, its t0 / t1 / reach / y0 / y1); the game plays them (work.html hitsNow)
const hitsFor = (kind, sp = cur.spec) => { const S = moveDef(kind, sp); if (!S || !S.hits) return []; const o = ((sp.move.hits || {})[kind]) || []; return S.hits.map((h, i) => o[i] ? { ...h, ...o[i] } : { ...h }); };
const limbHits = sp => sp.base !== "cat" && ["none", "gauntlet"].includes(sp.outfit.prop.kind);   // (fists and feet: the blow lands where the limb is, as in the game)
function hitPatch(kind, i, patch, commit) { const n = clone(cur.spec), H = n.move.hits = n.move.hits || {}, L = H[kind] = (H[kind] || []).slice(); while (L.length <= i) L.push({}); L[i] = { ...(L[i] || {}), ...patch }; stageSpec(n, commit); }
function renderHits() {
  const box = $("tlHits"); box.innerHTML = ""; if (!isMove()) return;
  const kind = moveKind(), S = moveDef(kind); if (!S) return; const dur = S.dur, t = clamp(tl.t, 0, dur);
  hitsFor(kind).forEach((h, i) => {
    const d = el("div", "hit" + (t >= h.t0 && t <= h.t1 ? " on" : "")); d.style.left = (h.t0 / dur * 100) + "%"; d.style.width = Math.max(.6, (h.t1 - h.t0) / dur * 100) + "%";
    d.title = `Hit ${i + 1}: ${h.t0.toFixed(2)}s to ${h.t1.toFixed(2)}s, when this blow can connect. Drag it along, or by an end`; d.append(el("i", "a"), el("i", "b"));
    d.addEventListener("pointerdown", e => { e.stopPropagation(); e.preventDefault(); setPaused(true, false); beginDrag(); const end = e.target.classList.contains("a") ? "a" : e.target.classList.contains("b") ? "b" : "m";
      const u0 = barU(e), x0 = e.clientX, h0 = { ...h }; let moved = end !== "m"; d.setPointerCapture(e.pointerId);   // (the middle: a click still scrubs; only a drag moves the window)
      const mv = ev => { if (!moved && Math.abs(ev.clientX - x0) < 5) return; moved = true; const dt2 = (barU(ev) - u0) * dur; let a = h0.t0, b = h0.t1;
        if (end === "a") a = clamp(h0.t0 + dt2, 0, h0.t1 - .02); else if (end === "b") b = clamp(h0.t1 + dt2, h0.t0 + .02, dur); else { const w = h0.t1 - h0.t0; a = clamp(h0.t0 + dt2, 0, dur - w); b = a + w; }
        hitPatch(kind, i, { t0: +a.toFixed(3), t1: +b.toFixed(3) }, false); scrubTo((end === "b" ? b : a) / dur); renderHits(); };
      const up = ev => { d.removeEventListener("pointermove", mv); d.removeEventListener("pointerup", up); d.removeEventListener("pointercancel", up); if (!moved && ev.type === "pointerup") scrubTo(barU(ev)); endDrag(); renderHits(); if (tab === "ANIMATE") renderControls(); };
      d.addEventListener("pointermove", mv); d.addEventListener("pointerup", up); d.addEventListener("pointercancel", up); });
    box.append(d);
  });
}
const hitBox = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: "#ff5fa8", transparent: true, opacity: .3, depthWrite: false }));
hitBox.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: "#ff5fa8" }))); hitBox.visible = false; hitBox.renderOrder = 5; scene.add(hitBox);
const _lw = new THREE.Vector3();
function syncHitBox() {                                          // the box the blow lands in right now (the game's own sum: combat()'s), faint between its windows
  hitBox.visible = false; if (cur.villain || !rig || rig.kind === "cat") return;
  const kind = isMove() ? moveKind() : st.atkT >= 0 ? st.atkKind : null, S = kind && moveDef(kind); if (!S || !S.hits) return;
  const t = isMove() ? clamp(tl.t, 0, S.dur) : st.atkT, L = hitsFor(kind); if (!L.length) return;
  let h = L.find(q => t >= q.t0 && t <= q.t1), live = !!h; if (!h) h = L.find(q => q.t0 > t) || L[L.length - 1];
  const sp = rig.spec, f = st.face || 1, tall = (rig.heightPx || 92) / 92, rk = 1 + ((sp.move.reach ?? 1) - 1) * .6, limb = limbHits(sp) && !h.wide;
  rig.root.updateMatrixWorld(true); const rx = rig.root.position.x, ry = rig.root.position.y;   // (where she stands on the stage: the box is placed from there, in the game's pixels)
  let fw = 0, bw = 0; if (limb) [...rig.hands, ...rig.feet].forEach(m => { m.getWorldPosition(_lw); const d = (_lw.x - rx) * 40 * f; fw = Math.max(fw, d); bw = Math.max(bw, -d); });
  const xa = st.x - f * (limb && h.back > 20 ? bw + 16 : h.back * tall), xb = st.x + f * Math.max(limb ? Math.max(fw + (sp.outfit.prop.kind === "gauntlet" ? 44 : 16), 26) : h.reach * tall * rk, 0);
  const ya = st.y - h.y0 * tall, yb = st.y - h.y1 * tall, x1 = rx + (Math.min(xa, xb) - st.x) / 40, x2 = rx + (Math.max(xa, xb) - st.x) / 40, y1 = ry + (st.y - Math.max(ya, yb)) / 40, y2 = ry + (st.y - Math.min(ya, yb)) / 40;
  hitBox.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0); hitBox.scale.set(Math.max(.02, x2 - x1), Math.max(.02, y2 - y1), .9);
  hitBox.material.opacity = live ? .34 : .08; hitBox.children[0].material.opacity = live ? 1 : .35; hitBox.children[0].material.transparent = true; hitBox.visible = true;
}
function ownKeys(kind = moveKind()) {                            // [{ t, sc }]: every key of yours on a move
  const own = (cur.spec.move.anims || {})[kind] || {}, out = [];
  for (const sc in own) { const base = baseFn(kind, sc, restOf(kind, sc) ?? own[sc][0][1]); keysOn(own[sc], base).forEach(([t]) => out.push({ t, sc })); }
  return out;
}
function dropKeys(kind, gone, say) {                             // gone(sc, t) → true: that key goes, and each part is laid again round the keys it has left
  const n = clone(cur.spec), A = n.move.anims[kind]; if (!A) return;
  let k0 = 0;
  for (const sc of Object.keys(A)) {
    const base = baseFn(kind, sc, restOf(kind, sc) ?? A[sc][0][1]), ks = keysOn(A[sc], base), keep = ks.filter(([t]) => !gone(sc, t));
    if (keep.length === ks.length) continue; k0 += ks.length - keep.length;
    const tr = buildTrack(kind, sc, keep, base, KIT.ANIM_CH[sc]);
    if (tr) A[sc] = tr; else { delete A[sc]; if (n.move.rests[kind]) delete n.move.rests[kind][sc]; }
  }
  if (!k0) return;
  if (!Object.keys(A).length) { delete n.move.anims[kind]; delete n.move.rests[kind]; }
  stageSpec(n); renderKeys(); if (tab === "ANIMATE") renderControls(); tl.nudge = true; onion = null; toast(say + " · UNDO BRINGS IT BACK");
}
// the channels a move animates: what it ships keyed, what you've keyed, and what you've cleared (the parts it doesn't key follow her stance)
function animChans(kind) {
  const S = moveDef(kind), own = (cur.spec.move.anims || {})[kind] || {}, cl = (cur.spec.move.clear || {})[kind] || {};
  return [...new Set([...Object.keys(S.keys || {}), ...Object.keys(own), ...Object.keys(cl)])].filter(c => KIT.ANIM_CH[c]);
}
function clearOriginal(kind, chans, say) {                       // these parts: their original animation (and your keys on them) gone; each holds the pose it starts the move in
  const S = moveDef(kind), n = clone(cur.spec), m = n.move, A = m.anims[kind] = m.anims[kind] || {}, C = (m.clear = m.clear || {})[kind] = (m.clear[kind] || {}), dur = +S.dur.toFixed(4);
  let k = 0;
  for (const sc of chans) {
    const R = KIT.ANIM_CH[sc], b = (S.keys || {})[sc], own = A[sc]; if (!R || (!b && !own)) continue;
    const v = clamp(clearOf(kind, sc) ?? (b ? KIT.keyv(b, 0) : own[0][1]), R[0], R[1]);
    C[sc] = v; A[sc] = [[0, v], [dur, v]]; if (m.rests[kind]) delete m.rests[kind][sc]; k++;
  }
  if (!k) { toast("NOTHING TO CLEAR THERE: THE MOVE DOESN'T ANIMATE IT"); return; }
  stageSpec(n); renderKeys(); if (tab === "ANIMATE") renderControls(); tl.nudge = true; onion = null; toast(say + " · UNDO BRINGS IT BACK", 3600);
}
function partMenu(kind, anchor) {                                // CLEAR ONE PART…: which part's original goes
  closeKeyMenu();
  const chans = animChans(kind), parts = [...new Set(chans.map(partOf))].filter(p => p !== "other");
  const m = keyMenuEl = el("div", "keymenu"); m.setAttribute("role", "menu");
  const hd = el("header"), x = el("button", "x", "✕"); x.type = "button"; x.setAttribute("aria-label", "Close"); x.onclick = closeKeyMenu;
  hd.append(el("b", null, "CLEAR ONE PART'S ORIGINAL"), x); m.append(hd, el("small", null, "it holds its starting pose; only your keys move it"));
  parts.forEach(p => { const b = el("button", null, p.toUpperCase()); b.type = "button"; b.setAttribute("role", "menuitem");
    b.onclick = () => { closeKeyMenu(); clearOriginal(kind, chans.filter(c => partOf(c) === p), p.toUpperCase() + "'S ORIGINAL CLEARED"); }; m.append(b); });
  root.append(m);
  const r = anchor.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
  m.style.left = clamp(r.left + r.width / 2 - w / 2, 8, innerWidth - w - 8) + "px"; m.style.top = clamp(r.top - h - 10, 8, innerHeight - h - 8) + "px";
  m.querySelector("button:not(.x)").focus();
}
function applyVals(vals) {                                       // a dot or a ring has moved: { channel (as in st.out): value }
  const tgt = hdrag.target, n = clone(cur.spec), m = n.move;
  if (tgt.type === "pose") {                                     // standing / block / jump / hurt: the character's own pose
    for (const ch in vals) { const sc = KIT.chanFor(st, ch), R = KIT.POSE_CH[sc]; if (!R) continue; m[tgt.key][sc] = clamp(vals[ch] - (ch === "lean" && tgt.key !== "hurt" ? cur.spec.move.lean : 0), R[0], R[1]); }
  } else if (tgt.type === "keys") {                             // a keyframed move, at this moment: your key there
    const { kind, S, t } = tgt, base = S.keys || {}, A = m.anims[kind] = m.anims[kind] || {}, sw = !S.screen && KIT.leadFar(st);   // (screen: a move keyed by the sides as seen, far / near)
    for (const ch in vals) {
      const sc = S.screen ? ch : KIT.chanFor(st, ch), R = KIT.ANIM_CH[sc]; if (!R) continue;
      const sg = sw && KIT.TWISTS.has(sc) ? -1 : 1;              // (with the lead hand on the far side a move's twists turn the other way)
      if (!(sc in hdrag.starts)) { const own0 = (cur.spec.move.anims[kind] || {})[sc]; hdrag.starts[sc] = own0 ? clone(own0) : null; hdrag.rest[sc] = base[sc] ? null : restOf(kind, sc) ?? (own0 ? own0[0][1] : (st.out[ch] ?? 0) * sg); }
      if (!base[sc]) (m.rests[kind] = m.rests[kind] || {})[sc] = hdrag.rest[sc];
      putKey(A, kind, sc, t, vals[ch] * sg, hdrag.starts[sc], hdrag.rest[sc]);
    }
    if (!Object.keys(A).length) delete m.anims[kind];
  } else {                                                       // the run: an offset at this point in the stride
    const A = m.anims.run = m.anims.run || {}, rC = Math.min(.45, spread * 2);
    for (const ch in vals) {
      const sc = KIT.chanFor(st, ch), R0 = KIT.ANIM_CH[sc]; if (!R0 || sc === "blade") continue;
      if (!hdrag.starts[sc]) { const own0 = (cur.spec.move.anims.run || {})[sc]; hdrag.starts[sc] = own0 ? clone(own0) : [[0, 0], [1, 0]];
        hdrag.base[sc] = (st.out[ch] ?? 0) - KIT.keyvS(hdrag.starts[sc], tgt.u); }      // the run as it is, before any offset here
      const off = vals[ch] - hdrag.base[sc], span = R0[1] - R0[0];
      A[sc] = softSetCycle(hdrag.starts[sc], tgt.u, off, rC, [-span, span]).slice(0, 160);
    }
  }
  stageSpec(n, false); tl.nudge = true;
}
$("handles").addEventListener("pointerdown", e => {
  const rh = e.target.closest(".ringhit"), d = !rh && e.target.closest(".hd"); if (!rh && !d) return;
  e.preventDefault(); e.stopPropagation(); try { (rh || d).setPointerCapture(e.pointerId); } catch { }
  setPaused(true, false);
  const target = editTarget(); if (!target) return;
  if (d) hdSel = d.dataset.id;
  const id = hdSel, H = KIT.poseHandles(st, rig).find(x => x.id === id); if (!H) return;
  beginDrag(); if (d) d.classList.add("on");
  hdrag = { id, el: rh || d, anchor: H.pos.clone(), starts: {}, rest: {}, base: {}, target, px: e.clientX, py: e.clientY, moved: false };
  if (rh) {                                                      // the ring: which way round counts as which (it depends where the camera is)
    rig.root.updateMatrixWorld(true);
    const M = rig.body.matrixWorld, Pw = H.pos.clone().applyMatrix4(M), bx = $("handles").getBoundingClientRect(), [cx, cy] = [parseFloat(handleEls[id].style.left) + bx.left, parseFloat(handleEls[id].style.top) + bx.top];
    let sgn;
    if (ringFor(id) === "twist") {                               // sliding: the ring's front (the side toward you) follows the pointer
      const fr = rig.body.worldToLocal(camera.position.clone()).sub(H.pos); fr.y = 0; fr.setLength(.3); const a = H.pos.clone().add(fr), b = a.clone().add(new THREE.Vector3(fr.z, 0, -fr.x).multiplyScalar(.1));
      sgn = b.applyMatrix4(M).project(camera).x >= a.applyMatrix4(M).project(camera).x ? 1 : -1;
    } else sgn = new THREE.Vector3(0, 0, 1).transformDirection(M).dot(camera.position.clone().sub(Pw)) >= 0 ? 1 : -1;   // turning: anticlockwise on screen is a turn about the body's +z when that side faces you
    const leg = /^knee/.test(id) ? rig.legs[(id === "kneeN") === (st.face > 0) ? 1 : 0] : null;
    Object.assign(hdrag, { ring: ringFor(id), o0: { ...st.out }, L0: leg ? { K: leg.pts[2].clone(), A: leg.pts[3].clone() } : null, cx, cy, last: Math.atan2(-(e.clientY - cy), e.clientX - cx), acc: 0, x0: e.clientX, sgn });
  }
});
$("handles").addEventListener("pointermove", e => {
  if (!hdrag) return;
  if (!hdrag.moved) { if (Math.hypot(e.clientX - hdrag.px, e.clientY - hdrag.py) < 3) return; hdrag.moved = true; }   // (a click just picks the dot: no key)
  if (hdrag.ring) {
    let th;
    if (hdrag.ring === "twist") th = (e.clientX - hdrag.x0) / 70 * hdrag.sgn;
    else { const a = Math.atan2(-(e.clientY - hdrag.cy), e.clientX - hdrag.cx); let dA = a - hdrag.last; dA -= TAU * Math.round(dA / TAU); hdrag.acc += dA; hdrag.last = a; th = hdrag.acc * hdrag.sgn; }
    applyVals(KIT.turnSolve(st, rig, hdrag.id, th, hdrag.o0, hdrag.L0)); return;
  }
  const T = pointerToBody(e); if (T) applyVals(KIT.dragSolve(st, rig, hdrag.id, T));
});
const endHandle = () => { if (!hdrag) return; hdrag.el.classList.remove("on"); hdrag = null; onion = null; if (hdTip) hdTip.hidden = true; endDrag(); renderKeys(); if (tab === "POSE" || tab === "ANIMATE") renderControls(); };
$("handles").addEventListener("pointerup", endHandle); $("handles").addEventListener("pointercancel", endHandle);
function settle(p) {                                             // paused: let the pose settle on this moment without moving time on
  const g0 = p.gaitPh, t0 = KIT.time; p.keysFull = true; KIT.updatePose(p, 1 / 60); p.gaitPh = g0; KIT.time = t0;
}
function drive(p, dt) {
  if (isMove()) { driveMove(p, dt); return; }
  p.keysFull = false;
  KIT.time += dt; animT += dt;
  const cat = p.rig.kind === "cat", mv = p.rig.spec.move;
  p.blink -= dt; if (p.blink < -.12) p.blink = 2 + Math.random() * 2.5;
  let target = 0;
  if (anim === "run") target = 300 * mv.speed;
  if (anim === "dash") target = 450 * mv.speed;
  p.sprint = anim === "dash"; p.block = anim === "block";
  if (anim === "jump" && p.onGround && animT > .55) {
    animT = 0; p.vy = -830 * Math.sqrt(mv.jump); p.onGround = false; p.sq = .3; p.sqv = 0; p.bounceT = -1; p.airJumps = Math.random() < .5 ? 1 : 0;
  }
  if (anim === "jump" && !p.onGround && p.airJumps > 0 && p.vy > -60) { p.airJumps = 0; p.vy = -780 * Math.sqrt(mv.jump); p.sq = .28; p.sqv = 0; p.bounceT = 0; }
  if (anim === "hurt") {                              // take a hit every so often: watch the health display drain and refill
    if (animT > 1.3) { animT = 0; p.hp = p.hp > 0 ? p.hp - 1 : 3; if (p.hp < 3) { p.hurtT = .45; p.vx = -160; p.vy = -320; p.onGround = false; } }
  } else p.hp = 3;
  p.hurtT = Math.max(0, p.hurtT - dt);
  if (anim === "attack" || anim === "air") {        // the character's own moves: first strike, then the follow-up (Tocsin: card swim, then card swirl)
    const SET = cat ? { ground: KIT.CAT_GROUND, air: KIT.CAT_AIR } : setFor(cur.spec), air = anim === "air";
    const go = (kind, idx) => { const S = moveDef(kind); p.atkKind = kind; p.atkIdx = idx; p.atkT = 0; p.sq = S.sq ?? -.1; p.sqv = 0;
      if (p.onGround) { p.vx = S.step || 0; if (S.hop) { p.vy = S.hop; p.onGround = false; } } };
    if (air && p.onGround && p.atkT < 0 && animT > .9) { animT = 0; p.vy = -830 * Math.sqrt(mv.jump); p.onGround = false; p.sq = .3; p.sqv = 0; p.airDone = false; }
    if (!air && p.atkT < 0 && animT > 1.4) { animT = 0; go(SET.ground[0], 0); }
    if (air && !p.onGround && !p.airDone && p.atkT < 0 && p.vy > -520) { p.airDone = true; go(SET.air[0], 0); }
    if (p.atkT >= 0) {
      const S = moveDef(p.atkKind), pa = p.atkT; p.atkT += dt;
      if (S.dive && pa < S.dive[0] && p.atkT >= S.dive[0] && !p.onGround) p.vy = Math.max(p.vy, S.dive[1]);
      if (S.landEnd && p.onGround && p.atkT > .12) p.atkT = -1;
      else if (p.atkIdx === 0 && p.atkT >= (S.chain ?? S.dur)) go((p.onGround ? SET.ground : SET.air)[1], 1);
      else if (p.atkT >= S.dur) p.atkT = -1;
    }
  } else p.atkT = -1;
  const attacking = p.atkT >= 0, MV = attacking ? moveDef(p.atkKind) : null;
  if (attacking && p.onGround && !(MV && MV.slide && p.atkT < MV.slide)) p.vx = approach(p.vx, 0, 2600 * dt);
  else if (!(attacking && Math.abs(p.vx) > 140)) p.vx = approach(p.vx, target, (p.onGround ? 2600 : 1700) * dt * (attacking ? .5 : 1));
  if (!p.onGround) {
    let g = 2200; if (p.vy > 0) g *= 1.15;
    if (attacking) g *= MV && MV.grav != null ? MV.grav : .55;
    p.vy = Math.min(p.vy + g * dt, 980); p.y += p.vy * dt;
    if (p.y >= GROUND) { p.y = GROUND; p.sq = -clamp(p.vy / 2600, .08, .38); p.sqv = 0; p.vy = 0; p.onGround = true; p.bounceT = -1; }
  }
  if (p.bounceT >= 0) { p.bounceT += dt; if (p.bounceT > .5) p.bounceT = -1; }
  spring(p, dt);
  p.rot = p.bounceT >= 0 ? easeOut(clamp(p.bounceT / .42, 0, 1)) * TAU : 0;
  p.spinY = 0;
  const diving = attacking;
  p.prof = approach(p.prof || 0, Math.max(p.onGround ? p.gaitAmt : 0, diving ? 1 : 0), dt * (diving ? 10 : 4));
  p.bodyYaw = lerp(.85, .3, p.prof);
  p.yaw = lerp(p.yaw, -p.bodyYaw, 1 - Math.exp(-dt * 16));
  const accel = dt > 0 ? (p.vx - p.prevVx) / dt : 0; p.prevVx = p.vx;
  p.accLeanV += ((clamp(accel * .00011, -.32, .28) * (p.onGround ? 1 : .3) - p.accLean) * 140 - p.accLeanV * 14) * dt;
  p.accLean += p.accLeanV * dt;
  KIT.updatePose(p, dt);
  p.x = 0;                                  // running in place
}

// camera: drag to turn, wheel / pinch to zoom; the zoom buttons and a part to look at (the user, 2026-10-26: "add a zoom function for the animator because it's hard to see the")
let camYaw = 0, camPitch = .1, camDist = 8.4, turn = false, camLift = 0, camFocus = "all", camFocusK = 0;
const ZOOM_MIN = 1.2, ZOOM_MAX = 12;
const FOCUS = { all: [0, 8.4], head: [.85, 3.4], arms: [.35, 4.4], legs: [-.45, 4.6], feet: [-.8, 3.6] };   // [where it looks, up or down from the middle (a fraction of the body), how close]
const zoomBy = f => { camDist = clamp(camDist * f, ZOOM_MIN, ZOOM_MAX); };
function setFocus(k) { camFocus = k; camDist = FOCUS[k][1]; [...$("zoomSeg").querySelectorAll("[data-f]")].forEach(b => b.classList.toggle("on", b.dataset.f === k)); }
const ptrs = new Map(); let pinch0 = 0;
canvas.addEventListener("pointerdown", e => { if (poseMode) { hdSel = null; return; } canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); });
canvas.addEventListener("pointermove", e => {
  const q = ptrs.get(e.pointerId); if (!q) return;
  if (ptrs.size === 1) { camYaw -= (e.clientX - q.x) * .01; camPitch = clamp(camPitch + (e.clientY - q.y) * .005, -.12, .7); }
  q.x = e.clientX; q.y = e.clientY;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) zoomBy(pinch0 / d); pinch0 = d; }
});
const endPtr = e => { ptrs.delete(e.pointerId); pinch0 = 0; };
canvas.addEventListener("pointerup", endPtr); canvas.addEventListener("pointercancel", endPtr);
canvas.addEventListener("wheel", e => { e.preventDefault(); zoomBy(Math.exp(e.deltaY * .001)); }, { passive: false });
$("zoomSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.z) zoomBy(b.dataset.z === "in" ? 1 / 1.3 : 1.3); else if (b.dataset.f) setFocus(b.dataset.f); });
$("bTurn").onclick = () => { turn = !turn; $("bTurn").classList.toggle("on", turn); $("bTurn").setAttribute("aria-pressed", turn); };
function setAnim(a) {
  anim = a; animT = 9; st.atkT = -1; tl.t = 0; Object.assign(st, { tackle: null, tackleK: 0, tkCharge: null, tkDig: 0, dodge: null });   // (out of a game-driven move)
  [...$("anim").querySelectorAll("[data-a]")].forEach(x => x.classList.toggle("on", x.dataset.a === a));
  $("tlMove").value = isMove() ? moveKind() : ""; renderKeys();
  if (tab === "ANIMATE") renderControls();
}
$("anim").addEventListener("click", e => { const b = e.target.closest("[data-a]"); if (b) setAnim(b.dataset.a); });
// ── timeline controls
function fillMoves() {
  const ms = movesFor(cur.spec), sel = $("tlMove"), n = {}, groups = [];
  ms.forEach(([k, , g]) => { n[k] = (n[k] || 0) + 1; if (!groups.includes(g)) groups.push(g); });
  const opt = ([k, lab]) => `<option value="${k}">${lab ? lab + " · " : ""}${MOVE_NAMES[k] || k}${n[k] > 1 ? " (shared)" : ""}</option>`;   // (shared: the same move plays in another combo too)
  sel.innerHTML = `<option value="">Pick a move to edit…</option>` + groups.map(g => `<optgroup label="${g}">${ms.filter(m => m[2] === g).map(opt).join("")}</optgroup>`).join("");
  if (isMove() && !ms.some(([k]) => k === moveKind())) setAnim("idle"); else sel.value = isMove() ? moveKind() : "";
}
$("tlMove").onchange = () => setAnim($("tlMove").value ? "move:" + $("tlMove").value : "idle");
function setPaused(v, redraw = true) { const was = tl.paused; tl.paused = v; $("tlPlay").textContent = v ? "▶" : "❚❚"; $("tlPlay").setAttribute("aria-label", v ? "Play (space)" : "Pause (space)"); if (redraw && was !== v && tab === "ANIMATE") renderControls(); }
$("tlPlay").onclick = () => setPaused(!tl.paused);
let spaceDown = false;
const isEdOpen = () => { const r = $("stage"); return !!r && !!r.offsetParent; };   // the stage is on screen
addEventListener("keydown", e => {                               // space: play / pause (not while typing)
  if (e.code !== "Space" || !isEdOpen() || (e.target.matches && e.target.matches("textarea, input[type=text], input:not([type]), select, #name"))) return;
  e.preventDefault(); if (!e.repeat) { spaceDown = true; setPaused(!tl.paused); }
});
addEventListener("keyup", e => { if (e.code === "Space" && spaceDown) { e.preventDefault(); spaceDown = false; } });
addEventListener("keydown", e => {
  if (!isEdOpen() || e.metaKey || e.ctrlKey || e.altKey || (e.target.matches && e.target.matches("textarea, input[type=text], input:not([type]), select, #name"))) return;
  if (!document.querySelector("#ed .modal:not([hidden])") && e.code === "KeyF" && !e.repeat) { e.preventDefault(); setPoseMode(!poseMode); }
  else if (e.code === "ArrowLeft" || e.code === "ArrowRight") {   // walk the timeline a frame at a time (shift: six frames)
    e.preventDefault();
    stepBy((e.code === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 6 : 1) / 60);
  }
});
const stepBy = d => {
  setPaused(true);
  if (isMove()) { const S = moveDef(moveKind()); tl.t = clamp(tl.t + d, 0, S.dur); }
  else if (anim === "run" || anim === "dash") st.gaitPh += Math.sign(d) * TAU / 40 * Math.max(1, Math.round(Math.abs(d) * 60));
  else if (anim === "idle" || anim === "block") KIT.time += d;
  else if (d > 0) drive(st, d);                               // jumps, attacks, hurt: forward only
  tl.nudge = true; if (tab === "ANIMATE") renderControls();
};
let lastTarget = "";
setInterval(() => { if (tab !== "ANIMATE" || isMove() || !isEdOpen()) return; const tg = editTarget(), k = tg ? tg.name + (tg.type === "cycle" ? Math.round(tg.u * 100) : "") : "-"; if (k !== lastTarget) { lastTarget = k; renderControls(); } }, 300);
$("tlPrev").onclick = () => stepBy(-1 / 60); $("tlNext").onclick = () => stepBy(1 / 60);
$("tlSpd").onclick = e => { const b = e.target.closest("[data-s]"); if (!b) return; tl.speed = +b.dataset.s; [...$("tlSpd").children].forEach(x => x.classList.toggle("on", x === b)); };
const loopLen = () => anim === "run" || anim === "dash" ? null : anim === "idle" || anim === "block" ? TAU / 2.6 : anim === "attack" ? 1.4 : anim === "air" ? 1.6 : anim === "jump" ? 1.1 : 1.3;
function scrubTo(u) {                                           // u = 0..1 along the bar
  setPaused(true);
  if (isMove()) tl.t = u * moveDef(moveKind()).dur;
  else if (anim === "run" || anim === "dash") st.gaitPh = u * TAU;
  else if (anim === "idle" || anim === "block") KIT.time = u * TAU / 2.6;
  tl.nudge = true;
}
let scrubbing = false, lastCtl = 0;
const barU = e => { const r = $("tlBar").getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width, 0, 1); };
$("tlBar").addEventListener("pointerdown", e => { scrubbing = true; $("tlBar").setPointerCapture(e.pointerId); scrubTo(barU(e)); });
$("tlBar").addEventListener("pointermove", e => { if (!scrubbing) return; scrubTo(barU(e)); if (tab === "ANIMATE" && performance.now() - lastCtl > 120) { lastCtl = performance.now(); renderControls(); } });
$("tlBar").addEventListener("pointerup", () => { scrubbing = false; if (tab === "ANIMATE") renderControls(); });
function updateTL() {
  let u = 0, txt = "LOOP";
  if (isMove()) { const S = moveDef(moveKind()); if (S) { u = clamp(tl.t / S.dur, 0, 1); txt = `${Math.min(tl.t, S.dur).toFixed(2)} / ${S.dur.toFixed(2)}s`; } }
  else if (anim === "run" || anim === "dash") { u = ((st.gaitPh / TAU) % 1 + 1) % 1; txt = "STRIDE " + Math.round(u * 100) + "%"; }
  else if (anim === "idle" || anim === "block") { const L = TAU / 2.6; u = ((KIT.time % L) + L) % L / L; txt = "BREATH " + Math.round(u * 100) + "%"; }
  else { const L = loopLen(); u = clamp(animT % L / L, 0, 1); txt = "LOOP " + Math.round(u * 100) + "%"; }
  $("tlHead").style.left = (u * 100) + "%"; $("tlFill").style.width = (u * 100) + "%"; $("tlTime").textContent = txt;
  const band = $("tlBand"), showBand = tab === "ANIMATE" && isMove() && spread > 0;   // the stretch of frames a change will blend into
  band.hidden = !showBand;
  if (showBand) { const S = moveDef(moveKind()), a = clamp(tl.t - spread, 0, S.dur) / S.dur, b = clamp(tl.t + spread, 0, S.dur) / S.dur; band.style.left = (a * 100) + "%"; band.style.width = ((b - a) * 100) + "%"; }
  $("tlPrev").disabled = !(isMove() || ["run", "dash", "idle", "block"].includes(anim));
}
// the timeline's diamonds = your keys on the picked move. Click one for what to do with it (the user, 2026-10-23: "add a way to delete the dots you've made
// by clicking on them on the timeline and having the options pop up")
const PARTS = [["lead arm", ["armF", "spF", "elbF", "aS", "gF", "wF"]], ["rear arm", ["armB", "spB", "elbB", "bS", "gB", "wB"]], ["front leg", ["fNx", "fNy", "fNz", "hN"]], ["back leg", ["fFx", "fFy", "fFz", "hF"]],
  ["body", ["lean", "arch", "bodyY", "twist", "spin", "flip"]], ["upper body twist", ["twistU"]], ["hip twist", ["twistH"]], ["head", ["headRot"]], ["toes", ["fP"]], ["sword", ["blade", "grip"]],
  ["tail", ["tailBase", "tailCurl"]], ["hat", ["hatTilt", "hatLift"]]];
const partOf = sc => { const p = (PARTS.find(([, cs]) => cs.includes(sc)) || ["other"])[0]; return cur.spec.base === "cat" ? p.replace(" arm", " paw") : p; };
let keyMenuEl = null;
function closeKeyMenu() { if (keyMenuEl) { keyMenuEl.remove(); keyMenuEl = null; } }
function renderKeys() {
  renderHits();
  const box = $("tlKeys"); box.innerHTML = ""; closeKeyMenu(); if (!isMove()) return;
  const S = moveDef(moveKind()), groups = [];
  ownKeys().sort((a, b) => a.t - b.t).forEach(k => { const g = groups.find(q => Math.abs(q.t - k.t) < .009); if (g) g.ks.push(k); else groups.push({ t: k.t, ks: [k] }); });
  groups.forEach(g => {
    const d = el("button", "key"), parts = [...new Set(g.ks.map(k => partOf(k.sc)))];
    d.type = "button"; d.style.left = (g.t / S.dur * 100) + "%"; d.title = `Your key at ${g.t.toFixed(2)}s (${parts.join(", ")}): click for options`;
    d.setAttribute("aria-label", d.title);
    d.addEventListener("pointerdown", e => e.stopPropagation());   // (not a scrub)
    d.onclick = e => { e.stopPropagation(); keyMenu(g, d); };
    box.append(d);
  });
}
function keyMenu(g, d) {
  closeKeyMenu();
  const kind = moveKind(), S = moveDef(kind), t = g.t, near = q => Math.abs(q - t) < .009, parts = [...new Set(g.ks.map(k => partOf(k.sc)))], later = new Set(ownKeys(kind).filter(k => k.t > t + .009).map(k => k.t.toFixed(2))).size;
  const m = keyMenuEl = el("div", "keymenu"); m.setAttribute("role", "menu");
  const hd = el("header"), x = el("button", "x", "✕"); x.type = "button"; x.setAttribute("aria-label", "Close"); x.onclick = closeKeyMenu;
  hd.append(el("b", null, `KEY AT ${t.toFixed(2)}s`), x); m.append(hd, el("small", null, parts.join(" · ")));
  const item = (label, fn, warn) => { const b = el("button", warn ? "warn" : null, label); b.type = "button"; b.setAttribute("role", "menuitem"); b.onclick = () => { closeKeyMenu(); fn(); }; m.append(b); };
  item("GO TO THIS KEY", () => { scrubTo(t / S.dur); if (tab === "ANIMATE") renderControls(); });
  item(parts.length > 1 ? "DELETE THIS KEY · EVERY PART" : "DELETE THIS KEY", () => dropKeys(kind, (sc, k) => near(k), "KEY DELETED"), true);
  if (parts.length > 1) parts.forEach(p => item(`DELETE JUST THE ${p.toUpperCase()} HERE`, () => dropKeys(kind, (sc, k) => near(k) && partOf(sc) === p, p.toUpperCase() + " KEY DELETED"), true));
  if (later) item(`DELETE EVERY KEY AFTER THIS (${later})`, () => dropKeys(kind, (sc, k) => k > t + .009, "LATER KEYS DELETED"), true);
  parts.forEach(p => item(`DELETE EVERY ${p.toUpperCase()} KEY`, () => dropKeys(kind, sc => partOf(sc) === p, "EVERY " + p.toUpperCase() + " KEY DELETED"), true));
  root.append(m);
  const r = d.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
  m.style.left = clamp(r.left + r.width / 2 - w / 2, 8, innerWidth - w - 8) + "px"; m.style.top = Math.max(8, r.top - h - 10) + "px";
  m.querySelector("button:not(.x)").focus();
}
addEventListener("pointerdown", e => { if (keyMenuEl && !keyMenuEl.contains(e.target) && !e.target.closest("#tlKeys .key")) closeKeyMenu(); }, true);
addEventListener("keydown", e => { if (keyMenuEl && e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); closeKeyMenu(); } }, true);

let last = performance.now();
const STEP = 1 / 120;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (cur.villain && vprev) { villainFrame(dt); if (typeof isOpen === "undefined" || isOpen) requestAnimationFrame(frame); return; }
  if (pending && now - lastApply > applyCost * 1.6) {            // rebuilds pace themselves while a slider is dragged
    const s = pending; pending = null; const t0 = performance.now();
    applySpec(s); applyCost = performance.now() - t0; lastApply = performance.now();
    if (tl.paused && isMove() && !hdrag) { driveMove(st, 0); for (let i = 0; i < 12; i++) settle(st); }   // (paused: a change shows at once, not eased in over the next frames; a deleted key's pose goes straight away)
  }
  const sdt = tl.paused ? 0 : dt * tl.speed;                  // slow motion / pause
  if (sdt > 0) { const n = Math.ceil(sdt / STEP - 1e-6); for (let i = 0; i < n; i++) drive(st, sdt / n); }
  else if (isMove()) driveMove(st, 0);                           // paused on a move: hold it at the timeline's moment
  st.restNow = tl.paused;                                         // (paused: the neck and the hair settle straight onto the pose instead of trailing the last frame)
  if (tl.paused && isMove()) updateOnion();
  if (tl.paused || tl.nudge) { settle(st); tl.nudge = false; }
  rig.sync(st, rig, sdt);
  updateTL(); syncHandles(); syncHitBox();
  if (isMove()) { const on = [...$("tlHits").children], S0 = moveDef(moveKind()); if (S0 && on.length) { const tt = clamp(tl.t, 0, S0.dur); hitsFor(moveKind()).forEach((h, i) => on[i] && on[i].classList.toggle("on", tt >= h.t0 && tt <= h.t1)); } }
  KIT.syncCards(cards, st, true);
  const gy = 0, hgt = Math.max(0, (GROUND - st.y) / 40), sc = rig.spec.body.scale;
  rig.shadow.position.set(0, .02, 0); rig.shadow.scale.setScalar(clamp(1 - hgt / 7, .3, 1) * sc);
  ring.scale.setScalar(sc * (1 + .04 * Math.sin(KIT.time * 4)));
  if (turn) camYaw += dt * .5;
  camLift = lerp(camLift, hgt * .55, 1 - Math.exp(-dt * 4));
  camFocusK = lerp(camFocusK, FOCUS[camFocus][0], 1 - Math.exp(-dt * 6));
  const h = (rig.kind === "cat" ? 1.2 : 1.05) * sc * (1 + camFocusK) + camLift, d = camDist * (.7 + .3 * sc);   // (the part looked at: up or down from the middle)
  camera.position.set(Math.sin(camYaw) * Math.cos(camPitch) * d, h + Math.sin(camPitch) * d, Math.cos(camYaw) * Math.cos(camPitch) * d);
  camera.lookAt(0, h, 0);
  sun.position.set(-7, 14, 11);
  if (renderer && $("gl").hidden) {
    renderer.setRenderTarget(frameRT); renderer.clear(); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.render(gradeScene, gradeCam);
  }
  const deg = ((Math.round(-camYaw * 180 / Math.PI) % 360) + 360) % 360;
  $("readout").textContent = `${isMove() ? MOVE_NAMES[moveKind()] || moveKind() : anim} · ${deg}° · ${Math.round(sc * 100)}% size${tl.speed < 1 ? ` · ${tl.speed}× speed` : ""}${tl.paused ? " · paused (space plays)" : ""}${poseMode ? " · pose mode: drag the yellow dots (F for view)" : " · F for pose mode"}`;
  if (isOpen) requestAnimationFrame(frame);
}

// ───────────────────────────── editing: every change is a new spec; undo keeps the old ones ─────────────────────────────
function getPath(o, p) { return p.split(".").reduce((a, k) => a == null ? a : a[k], o); }
function setPath(o, p, v) { const ks = p.split("."), last = ks.pop(); const t = ks.reduce((a, k) => a[k], o); t[last] = v; }
function edit(path, value, commit = true) { const s = clone(cur.spec); setPath(s, path, value); stageSpec(s, commit); }
function stageSpec(s, commit = true) {
  if (commit) { cur.undo.push(cur.committed || JSON.stringify(cur.spec)); if (cur.undo.length > 80) cur.undo.shift(); cur.redo = []; }
  cur.spec = KIT.normalize(s); pending = cur.spec;
  if (commit) cur.committed = JSON.stringify(cur.spec);
  scheduleSave(cur); renderCastItem(cur); updateFoot();
}
function beginDrag() { if (!cur.committed) cur.committed = JSON.stringify(cur.spec); }
function endDrag() {                         // a finished slider drag / colour pick is one undo step
  const now = JSON.stringify(cur.spec);
  if (cur.committed && cur.committed !== now) { cur.undo.push(cur.committed); cur.redo = []; }
  cur.committed = now; updateFoot();
}
function undo() { if (!cur.undo.length) return; cur.redo.push(JSON.stringify(cur.spec)); restore(cur.undo.pop()); }
function redo() { if (!cur.redo.length) return; cur.undo.push(JSON.stringify(cur.spec)); restore(cur.redo.pop()); }
function restore(json) { cur.spec = KIT.normalize(JSON.parse(json)); cur.committed = json; pending = cur.spec; scheduleSave(cur); renderAll(); }
addEventListener("keydown", e => {
  if (!isOpen || !(e.metaKey || e.ctrlKey) || e.code !== "KeyZ" || e.target.matches("textarea, input[type=text], #name")) return;
  e.preventDefault(); e.shiftKey ? redo() : undo();
});

// ───────────────────────────── controls ─────────────────────────────
const RG = KIT.RANGE;
const pct = v => Math.round(v * 100) + "%", sgn = v => (v > 0 ? "+" : "") + (Math.abs(v) < .005 ? "0" : v.toFixed(2)), px = v => (v > 0 ? "+" : "") + Math.round(v);
const spct = v => Math.abs(v) < .005 ? "0" : (v > 0 ? "+" : "−") + Math.round(Math.abs(v) * 100) + "%", deg = v => Math.round(v * 57.3) + "°";
const look = (a, b) => v => Math.abs(v) < .02 ? "CENTER" : (v > 0 ? b : a) + " " + Math.round(Math.abs(v) * 100) + "%";
const smile = v => v < -.05 ? "FROWN" : v < .3 ? "FLAT" : v > 1.4 ? "BIG SMILE" : "SMILE";
const up = { invert: true, step: 1, fmt: v => px(-v) };
const HEAD_SHAPE = [["h", "Head shape"], ["r", "head.width", "Width"], ["r", "head.height", "Height"], ["r", "head.depth", "Depth"],
  ["r", "head.top", "Top of head"], ["r", "head.jaw", "Jaw"], ["r", "head.cheeks", "Cheeks"], ["r", "head.chinLen", "Chin length", { fmt: spct }]];
const HEAD_BACK = [["r", "head.forehead", "Forehead", { fmt: spct }], ["r", "head.back", "Back of head", { fmt: spct }]];
const EYES = [["r", "face.eyeSize", "Size"], ["r", "face.eyeW", "Width"], ["r", "face.eyeH", "Height"], ["r", "face.eyeGap", "Spacing"],
  ["r", "face.eyeY", "Position", up], ["r", "face.eyeTilt", "Tilt", { fmt: deg }]];
const LOOK = [["r", "face.lookX", "Look left / right", { fmt: look("LEFT", "RIGHT") }], ["r", "face.lookY", "Look up / down", { invert: true, fmt: look("UP", "DOWN") }],
  ["r", "face.lids", "Heavy lids", { fmt: pct }]];
const maskFace = s => s.face.style === "noro" || s.face.style === "doir";
const drawn = s => s.face.style !== "chibi" && !maskFace(s), sculpt = s => s.hair.mode === "sculpt", capHair = s => s.hair.mode !== "sculpt";
function tuftEditor(box) {                          // sculpted-hair tufts: lobes, flips, spikes
  const s = cur.spec;
  box.append(el("p", "note", "Tufts push the hair out into lobes, flips and spikes. Around: 0° is the front, 90° the viewer's right, 180° the back."));
  s.hair.tufts.forEach((t, i) => {
    const c = itemCard("Tuft " + (i + 1), () => { const n = clone(s); n.hair.tufts.splice(i, 1); stageSpec(n); renderControls(); });
    c.append(nRow(`hair.tufts.${i}.yaw`, "Around", [-180, 180], 1, v => Math.round(v) + "°"), nRow(`hair.tufts.${i}.pitch`, "Height", [-90, 90], 1, v => Math.round(v) + "°"),
      nRow(`hair.tufts.${i}.len`, "Length", [0, .8], .01, pct), nRow(`hair.tufts.${i}.width`, "Width", [.1, 1.2], .01, pct), nRow(`hair.tufts.${i}.sharp`, "Pointiness", [.5, 4], .05, v => v.toFixed(1)));
    box.append(c);
  });
  if (s.hair.tufts.length < 12) { const a = el("div", "addrow"), b = el("button", "chip", "+ TUFT"); a.append(b);
    b.onclick = () => { const n = clone(s); n.hair.tufts.push({ yaw: 90, pitch: 20, len: .15, width: .5, sharp: 1.5 }); stageSpec(n); renderControls(); }; box.append(a); }
}
const H_TABS = {
  BODY: [["h", "Build"], ["s", "body.build", "Proportions", Object.keys(KIT.BUILDS), { names: { chibi: "chibi", tall: "tall (sheet)" } }],
    ["h", "Proportions"], ["r", "body.scale", "Overall size"], ["r", "body.head", "Head"], ["r", "body.torso", "Torso length"], ["r", "body.girth", "Body width"],
    ["r", "body.shoulders", "Shoulders"], ["r", "body.arms", "Arm length"], ["r", "body.legs", "Leg length"], ["r", "body.limbs", "Arm & leg thickness"],
    ["r", "body.hands", "Hands"], ["r", "body.feet", "Feet"]],
  FACE: [["h", "Face style"], ["s", "face.style", "Painted face", KIT.FACE_STYLES, { names: { chibi: "chibi", june: "drawn · june", chase: "drawn · chase", noro: "drawn · noro (mask)", doir: "drawn · dorys (mask)" } }],
    ...HEAD_SHAPE, ["r", "face.chin", "Chin point", { step: .005, fmt: v => Math.round(v * 100) }], ...HEAD_BACK, ["r", "face.ears", "Ears"],
    ["r", "face.earY", "Ear height", { invert: true, fmt: v => Math.round(-v * 100) }],
    ["h", "Skin"], ["c", "colors.skin", "Skin"], ["r", "face.blush", "Blush", { fmt: pct }], ["c", "colors.blush", "Blush color", { if: s => s.face.blush > .01 }],
    ["h", "Eyes"], ["c", "colors.eyes", "Eye color"], ...EYES, ["r", "face.iris", "Iris"], ["r", "face.pupil", "Pupils"], ...LOOK,
    ["t", "face.lashes", "Lashes", { if: s => !drawn(s) }], ["t", "face.shine", "Shine"], ["c", "colors.lash", "Lash color", { if: drawn }], ["c", "colors.ring", "Iris ring", { if: drawn }],
    ["h", "Brows", null, { if: drawn }], ["c", "colors.brows", "Brow color", { if: drawn }], ["r", "face.browY", "Brow height", { invert: true, step: 1, fmt: v => px(-v), if: drawn }],
    ["r", "face.browSize", "Brow size", { if: drawn }],
    ["h", "Nose & mouth"], ["r", "face.noseY", "Nose position", up], ["r", "face.mouth", "Mouth size"], ["r", "face.mouthY", "Mouth position", up],
    ["r", "face.mouthCurve", "Smile", { fmt: smile }], ["c", "colors.lips", "Mouth color"],
    ["h", "Whole face"], ["r", "face.faceY", "Slide face up / down", up],
    ["h", "Drawn mask", null, { if: maskFace }], ["c", "colors.mask", "Mask", { if: maskFace }], ["c", "colors.maskIn", "Mask inside", { if: s => s.face.style === "noro" }],
    ["c", "colors.maskLower", "Chin guard", { if: s => s.face.style === "doir" }], ["c", "colors.crest", "Crest", { if: s => s.face.style === "doir" }], ["c", "colors.gem", "Forehead gem", { if: maskFace }],
    ["h", "Mask", null, { if: s => !maskFace(s) }], ["s", "face.mask", "Mask", KIT.MASKS, { if: s => !maskFace(s) }], ["c", "colors.mask", "Mask color", { if: s => !maskFace(s) && s.face.mask !== "none" }], ["c", "colors.maskLower", "Lower face guard", { if: s => !maskFace(s) && s.face.mask === "visor" }]],
  HAIR: [["h", "Hair"], ["c", "colors.hair", "Hair color"], ["s", "hair.mode", "Hair build", KIT.HAIR_MODES, { names: { cap: "simple cap", sculpt: "sculpted" } }],
    ["h", "Sculpted shape", null, { if: sculpt }], ["r", "hair.shell", "Volume", { if: sculpt }], ["r", "hair.taper", "Taper (− flares out)", { fmt: spct, if: sculpt }],
    ["s", "hair.fringe", "Face opening", KIT.FRINGES, { if: sculpt, names: { june: "june's bangs", chase: "chase's bangs", noro: "noro's bangs", doir: "dorys' bangs", oval: "open", bangs: "straight bangs" } }],
    ["r", "hair.fringeDrop", "Bangs lower / higher", { fmt: spct, if: sculpt }], ["r", "hair.sides", "Side hair length", { if: sculpt }], ["r", "hair.back", "Back length", { if: sculpt }], ["r", "hair.curl", "Curls", { fmt: pct, if: sculpt }], ["r", "hair.curlFront", "Curls over the forehead", { fmt: pct, if: sculpt }],
    ["h", "Tufts", null, { if: sculpt }], ["x", tuftEditor, null, { if: sculpt }],
    ["s", "hair.bangs", "Fringe", Object.keys(KIT.BANGS), { if: capHair }], ["r", "hair.bangLen", "Fringe length", { if: capHair }],
    ["t", "hair.forelock", "Streak", { if: capHair }], ["c", "colors.forelock", "Streak color", { if: s => capHair(s) && s.hair.forelock }],
    ["h", "Shape", null, { if: capHair }], ["r", "hair.cover", "Coverage", { if: capHair }], ["r", "hair.width", "Width", { if: capHair }], ["r", "hair.height", "Height", { if: capHair }],
    ["r", "hair.depth", "Depth", { if: capHair }], ["r", "hair.tilt", "Swept back", { if: capHair }],
    ["r", "hair.spike", "Top spike"],
    ["h", "Locks"], ["s", "hair.style", "Style", KIT.HAIR_STYLES], ["r", "hair.length", "Length", { if: s => s.hair.style !== "none" }],
    ["r", "hair.flow", "Floppiness", { if: s => s.hair.style !== "none" }], ["r", "hair.thick", "Thickness", { if: s => s.hair.style !== "none" }], ["r", "hair.wave", "Waves", { if: s => s.hair.style !== "none" }],
    ["t", "hair.tie", "Hair tie", { if: s => s.hair.style !== "none" }], ["c", "colors.tie", "Tie color", { if: s => s.hair.tie && s.hair.style !== "none" }]],
  OUTFIT: "humanOutfit",
  MOVES: "moves",
  POSE: "pose",
  ANIMATE: "animate",
  COLORS: "palette",
};
const C_TABS = {
  BODY: [["h", "Proportions"], ["r", "body.scale", "Overall size"], ["r", "body.head", "Head"], ["r", "body.torso", "Torso length"], ["r", "body.girth", "Body width"],
    ["r", "body.arms", "Arm length"], ["r", "body.legs", "Leg length"], ["r", "body.limbs", "Arm & leg thickness"], ["r", "body.gloves", "Paws"], ["r", "body.feet", "Feet"],
    ["h", "Tail"], ["r", "body.tail", "Length"], ["r", "body.tailThick", "Thickness"], ["t", "parts.tailBands", "Stripes"]],
  FACE: [...HEAD_SHAPE, ...HEAD_BACK,
    ["h", "Fur & ears"], ["c", "colors.fur", "Fur"], ["r", "face.spikes", "Mane fluff"], ["r", "face.ears", "Ears"], ["c", "colors.ears", "Inner ears", { if: s => s.face.ears > .15 }],
    ["h", "Eyes"], ...EYES, ["r", "face.pupil", "Pupils"], ...LOOK, ["c", "colors.eyeRing", "Rims"], ["c", "colors.pupil", "Pupil color"],
    ["h", "Grin"], ["r", "face.mouth", "Size"], ["r", "face.mouthY", "Position", up], ["c", "colors.mouth", "Mouth color"],
    ["r", "face.noseY", "Nose position", up], ["c", "colors.nose", "Nose"],
    ["h", "Whole face"], ["r", "face.faceY", "Slide face up / down", up],
    ["h", "Markings"], ["c", "colors.marks", "Marking color"], ["t", "parts.cheeks", "Cheeks"], ["t", "parts.forehead", "Forehead stripes"], ["t", "parts.brow", "Brow band"]],
  OUTFIT: [["h", "Suit"], ["c", "colors.outfit", "Suit"], ["r", "body.pants", "Shorts length", { fmt: pct }], ["t", "parts.trim", "Front trim"], ["c", "colors.trim", "Trim color", { if: s => s.parts.trim }],
    ["t", "parts.bow", "Bow tie"], ["c", "colors.bow", "Bow color", { if: s => s.parts.bow }], ["t", "parts.button", "Button"],
    ["h", "Paws"], ["c", "colors.gloves", "Gloves"], ["t", "parts.emblem", "Moon & star"], ["c", "colors.crescent", "Moon", { if: s => s.parts.emblem }],
    ["c", "colors.star", "Stars & button", { if: s => s.parts.emblem || s.parts.button }], ["t", "parts.claws", "Claws"],
    ["h", "Hat"], ["r", "body.hat", "Hat size", { fmt: v => v < .03 ? "OFF" : pct(v) }], ["c", "colors.hat", "Hat", { if: s => s.body.hat > .03 }], ["c", "colors.hatBand", "Hat band", { if: s => s.body.hat > .03 }],
    ["h", "Shoes"], ["c", "colors.shoes", "Shoes"], ["c", "colors.soles", "Soles"],
    ["h", "Attack cards"], ["c", "colors.cards.0", "Card 1"], ["c", "colors.cards.1", "Card 2"], ["c", "colors.cards.2", "Card 3"], ["c", "colors.cardEdge", "Card edge"]],
  MOVES: "moves",
  POSE: "pose",
  ANIMATE: "animate",
  COLORS: "palette",
};
const MOVES = [["h", "Attacks"], ["s", "move.set", "Move set", KIT.MOVE_SETS, { names: { brawler: "punch + kick", sword: "sword swings", boxer: "boxer combos", ninja: "ninja · palm + spin kick", kunoichi: "kunoichi · chops + sweep" } }],
  ["h", "Movement"], ["s", "move.run", "Run style", KIT.RUN_STYLES, { names: { auto: "auto (boxers pump)", dash: "arms back (dash)", pump: "arms pumping" } }], ["r", "move.stride", "Stride"], ["r", "move.swing", "Arm swing"], ["r", "move.lean", "Posture", { fmt: v => Math.abs(v) < .01 ? "UPRIGHT" : v > 0 ? "HUNCHED " + sgn(v) : "LEANS BACK " + sgn(v) }],
  ["r", "move.bounce", "Bounce"], ["r", "move.reach", "Attack reach"], ["h", "In the game"], ["r", "move.speed", "Run speed"], ["r", "move.jump", "Jump height"],
  ["p", "Pick RUN, JUMP or ATTACK under the stage to watch these."]];
let tab = "BODY";
const V_TABS = { LOOK: "villainLook" };
function tabsFor(s) { return cur && cur.buddy ? B_TABS : s.base === "villain" ? V_TABS : s.base === "cat" ? C_TABS : H_TABS; }
function renderTabs() {
  const T = tabsFor(cur.spec); if (!T[tab]) tab = Object.keys(T)[0];
  $("tabs").innerHTML = Object.keys(T).map(k => `<button class="tab${k === tab ? " on" : ""}" data-t="${k}">${k}</button>`).join("");
}
$("tabs").addEventListener("click", e => { const b = e.target.closest("[data-t]"); if (!b) return; tab = b.dataset.t; renderTabs();
  if (tab === "POSE") { setPaused(false, false); setAnim(poseWhich === "guard" ? "block" : "idle"); setPoseMode(true); }
  if (tab === "ANIMATE") { if (!isMove()) { const ms = movesFor(cur.spec); if (ms.length) setAnim("move:" + ms[0][0]); tl.t = .35 * (moveDef(moveKind()) || { dur: 0 }).dur; } setPaused(true, false); setPoseMode(true); }
  renderControls(); });
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
let ctlN = 0;
function rangeRow(path, label, o = {}) {
  const R = o.range || RG[path] || [0, 2], v = getPath(cur.spec, path), id = "c" + (ctlN++);
  const row = el("div", "row"), lab = el("label", null, label), out = el("output");
  lab.htmlFor = id; out.htmlFor = id;
  const inp = Object.assign(document.createElement("input"), { type: "range", id, min: R[0], max: R[1], step: o.step || .01 });
  const toUI = x => o.invert ? -x : x, fromUI = x => o.invert ? -x : x;
  if (o.invert) { inp.min = -R[1]; inp.max = -R[0]; }
  const fmt = o.fmt || (R[0] >= 0 && R[1] <= 3 ? pct : sgn);
  const paint = x => { out.textContent = fmt(x); inp.style.setProperty("--fill", ((toUI(x) - inp.min) / (inp.max - inp.min) * 100) + "%"); };
  inp.value = toUI(v); paint(v);
  const orig = getPath(cur.builtIn ? presetOf(cur.id) : cur.origin, path);
  row.classList.toggle("changed", orig !== undefined && Math.abs(orig - v) > 1e-6);
  inp.addEventListener("pointerdown", beginDrag); inp.addEventListener("focus", beginDrag);
  inp.addEventListener("input", () => { const x = fromUI(+inp.value); paint(x); edit(path, x, false); });
  inp.addEventListener("change", () => { endDrag(); row.classList.toggle("changed", orig !== undefined && Math.abs(orig - getPath(cur.spec, path)) > 1e-6); });
  lab.title = "Double-click to reset";
  lab.addEventListener("dblclick", () => { if (orig === undefined) return; edit(path, orig); inp.value = toUI(orig); paint(orig); row.classList.remove("changed"); });
  row.append(lab, out, inp); return row;
}
function colorRow(path, label) {
  const row = el("div", "row col"), id = "c" + (ctlN++), lab = el("label", null, label);
  const raw = getPath(cur.spec, path), v = raw === "skin" ? cur.spec.colors.skin : raw === "hair" ? cur.spec.colors.hair : raw;
  const inp = Object.assign(document.createElement("input"), { type: "color", id, value: v }); lab.htmlFor = id;
  inp.addEventListener("focus", beginDrag); inp.addEventListener("click", beginDrag);
  inp.addEventListener("input", () => edit(path, inp.value, false));
  inp.addEventListener("change", () => { endDrag(); if (tab === "COLORS") renderControls(); });
  row.append(lab, inp); return row;
}
function toggleRow(path, label) {
  const row = el("div", "row col"), id = "c" + (ctlN++), lab = el("label", null, label);
  const inp = Object.assign(document.createElement("input"), { type: "checkbox", id, className: "tog", checked: !!getPath(cur.spec, path) }); lab.htmlFor = id;
  inp.addEventListener("change", () => { edit(path, inp.checked); renderControls(); });
  row.append(lab, inp); return row;
}
function chipsRow(path, label, opts, names = {}) {
  const row = el("div", "row"), v = getPath(cur.spec, path);
  row.append(el("label", null, label)); row.append(el("output", null, ""));
  const box = el("div", "opts");
  opts.forEach(o => { const b = el("button", "chip" + (o === v ? " on" : ""), names[o] || o); b.type = "button"; b.setAttribute("aria-pressed", o === v);
    b.onclick = () => { edit(path, o); renderControls(); }; box.append(b); });
  row.append(box); return row;
}
function renderList(defs, box) {
  for (const d of defs) {
    const [k, a, b, c] = d, o = (k === "s" ? d[4] : k === "h" ? d[3] : c) || {};
    if (o.if && !o.if(cur.spec)) continue;
    if (k === "x") { a(box); continue; }
    if (k === "h") box.append(el("h3", null, a));
    else if (k === "p") box.append(el("p", "note", a));
    else if (k === "r") box.append(rangeRow(a, b, o));
    else if (k === "c") box.append(colorRow(a, b));
    else if (k === "t") box.append(toggleRow(a, b));
    else if (k === "s") box.append(chipsRow(a, b, c, o.names));
  }
}
function renderControls() {
  const box = $("ctl"), keep = box.scrollTop; box.innerHTML = ""; ctlN = 0;
  const T = tabsFor(cur.spec)[tab];
  if (T === "moves") renderList(MOVES, box);
  else if (T === "palette") renderPalette(box);
  else if (T === "humanOutfit") renderOutfit(box);
  else if (T === "pose") renderPose(box);
  else if (T === "animate") renderAnimate(box);
  else if (T === "villainLook") renderVillainLook(box);
  else renderList(T, box);
  box.scrollTop = keep;
}

function renderVillainLook(box) {                              // a boss: its size, and the colour of each of its parts
  const e = cur, L = e.look, upd = () => { vprev.paint(L); scheduleSave(e); renderCastItem(e); updateFoot(); };
  box.append(el("p", "note", "This is the game's own model of this villain. Change its size and the colour of any part; the game uses your look once you apply it. Point at a colour to see which part it is."));
  box.append(el("h3", null, "Size"));
  const row = el("div", "row"), lab = el("label", null, "Size"), out = el("output"), inp = Object.assign(document.createElement("input"), { type: "range", min: .6, max: 1.6, step: .01 });
  const paint = v => { out.textContent = Math.round(v * 100) + "%"; inp.style.setProperty("--fill", ((v - .6) / 1 * 100) + "%"); };
  inp.value = L.size || 1; paint(L.size || 1);
  inp.addEventListener("input", () => { L.size = +inp.value; paint(L.size); upd(); });
  lab.title = "Double-click to reset"; lab.addEventListener("dblclick", () => { delete L.size; inp.value = 1; paint(1); upd(); });
  row.classList.toggle("changed", !!L.size && Math.abs(L.size - 1) > .001); row.append(lab, out, inp); box.append(row);
  box.append(el("h3", null, "Colours"));
  vprev.parts.forEach(pt => {
    const r2 = el("div", "row col"), id = "c" + (ctlN++), lb = el("label", null, `Part ${pt.i + 1}`);
    const ci = Object.assign(document.createElement("input"), { type: "color", id, value: (L.colors || {})[pt.i] || pt.orig }); lb.htmlFor = id;
    r2.classList.toggle("changed", !!(L.colors || {})[pt.i]);
    ci.addEventListener("input", () => { (L.colors = L.colors || {})[pt.i] = ci.value; r2.classList.add("changed"); upd(); });
    lb.title = "Double-click to put this part back"; lb.addEventListener("dblclick", () => { if (L.colors) delete L.colors[pt.i]; ci.value = pt.orig; r2.classList.remove("changed"); upd(); });
    [r2].forEach(n => { n.addEventListener("pointerenter", () => vprev.highlight(pt.i)); n.addEventListener("pointerleave", () => vprev.highlight(-1)); });
    ci.addEventListener("focus", () => vprev.highlight(pt.i)); ci.addEventListener("blur", () => vprev.highlight(-1));
    r2.append(lb, ci); box.append(r2);
  });
}
function villainFrame(dt) {                                    // the stage with a boss on it
  vprev.update(tl.paused ? 0 : dt * tl.speed);
  rig.root.visible = rig.shadow.visible = false; cards.forEach(c => { c.visible = false; });
  if (turn) camYaw += dt * .5;
  camFocusK = lerp(camFocusK, FOCUS[camFocus][0], 1 - Math.exp(-dt * 6));
  const sc = vprev.rig.size || 1, h = vprev.h * .5 * sc * (1 + camFocusK), d = camDist * Math.max(1, vprev.h * sc / 2.2);
  camera.position.set(Math.sin(camYaw) * Math.cos(camPitch) * d, h + Math.sin(camPitch) * d, Math.cos(camYaw) * Math.cos(camPitch) * d);
  camera.lookAt(0, h, 0); sun.position.set(-7, 14, 11);
  ring.scale.setScalar(sc * vprev.h / 2.2 * (1 + .04 * Math.sin(performance.now() / 250)));
  if (renderer && $("gl").hidden) { renderer.setRenderTarget(frameRT); renderer.clear(); renderer.render(scene, camera); renderer.setRenderTarget(null); renderer.render(gradeScene, gradeCam); }
  const deg = ((Math.round(-camYaw * 180 / Math.PI) % 360) + 360) % 360;
  $("readout").textContent = `${cur.spec.name} · ${deg}° · ${Math.round(sc * 100)}% size`;
}
// pose mode: the standing pose (and the block pose) are this character's own; sliders start from the move set's
let poseWhich = "stance";
const H_POSE = [["lean", "Lean forward"], ["bodyY", "Crouch (− lower)"], ["armF", "Lead arm raise"], ["spF", "Lead arm out to the side"], ["elbF", "Lead elbow"], ["wF", "Lead fist bend"], ["armB", "Rear arm raise"], ["spB", "Rear arm out to the side"], ["elbB", "Rear elbow"], ["wB", "Rear fist bend"],
  ["fNx", "Front foot"], ["fNz", "Front foot out to the side"], ["fFx", "Back foot"], ["fFz", "Back foot out to the side"], ["twistU", "Upper body twist"], ["twistH", "Hip twist"], ["twist", "Whole body turn"], ["headRot", "Head tilt"]];
const C_POSE = [["lean", "Lean forward"], ["arch", "Arch the back"], ["bodyY", "Crouch (− lower)"], ["armF", "Front paw raise"], ["spF", "Front paw out to the side"], ["elbF", "Front elbow"], ["armB", "Back paw raise"], ["spB", "Back paw out to the side"], ["elbB", "Back elbow"],
  ["fNx", "Front foot"], ["fNz", "Front foot out to the side"], ["fFx", "Back foot"], ["fFz", "Back foot out to the side"], ["tailBase", "Tail up"], ["tailCurl", "Tail curl"], ["hatTilt", "Hat tilt"], ["headRot", "Head tilt"]];
function poseBase(sp, which) {                                  // the pose before this character's own changes
  const cat = sp.base === "cat", S = setFor(sp);
  if (cat) return which === "guard" ? { ...KIT.POSE0, arch: .25, ...KIT.CAT_BLOCK } : { ...KIT.POSE0, arch: .25, armF: .22, armB: .05 };
  return { ...KIT.POSE_H0, ...(which === "guard" ? S.block || KIT.BLOCK_DEF : S.stance || {}) };
}
function renderPose(box) {
  const sp = cur.spec, cat = sp.base === "cat", key = poseWhich === "guard" ? "guard" : "stance", own = sp.move[key] || {}, base = poseBase(sp, poseWhich);
  box.append(el("h3", null, "Pose"));
  animTools(box);
  const seg = el("div", "opts"); [["stance", "Standing"], ["guard", "Block"]].forEach(([k, lab]) => { const b = el("button", "chip" + (k === poseWhich ? " on" : ""), lab); b.type = "button";
    b.onclick = () => { poseWhich = k; setAnim(k === "guard" ? "block" : "idle"); renderControls(); }; seg.append(b); });
  const r0 = el("div", "row"); r0.append(seg); box.append(r0);
  box.append(el("p", "note", (poseWhich === "guard" ? "How they hold their guard when blocking (C in the game). " : "How they stand when nothing's happening (they keep breathing on top of it). ")
    + "Drag the yellow dots on the character: hands, feet, hips, the middle of the back (bends the spine there), head" + (sp.outfit.prop.kind === "sword" ? ", sword tip" : "") + ". To reach an arm or a leg out to the side, turn the camera to face them (VIEW mode) and drag the hand or foot sideways in POSE mode. Drag anywhere else on the stage to turn the camera. The sliders fine-tune; double-click a label to put it back."));
  const chans = [...(cat ? C_POSE : H_POSE), ...(!cat && sp.outfit.prop.kind === "sword" ? [["blade", "Sword angle"]] : [])];
  chans.forEach(([ch, lab]) => {
    const R = KIT.POSE_CH[ch], path = `move.${key}.${ch}`, v = own[ch] ?? base[ch] ?? 0;
    const row = rangeRow(path, lab, { range: R, step: .01, fmt: v => (v * 57.3).toFixed(0) + (/^(fNx|fFx|bodyY)$/.test(ch) ? "" : "°") });
    const inp = row.querySelector("input"); inp.value = v; inp.style.setProperty("--fill", ((v - R[0]) / (R[1] - R[0]) * 100) + "%"); row.querySelector("output").textContent = (v * 57.3).toFixed(0) + (/^(fNx|fFx|bodyY)$/.test(ch) ? "" : "°");
    row.classList.toggle("changed", own[ch] !== undefined);
    row.querySelector("label").ondblclick = () => { const t = clone(cur.spec); delete t.move[key][ch]; stageSpec(t); renderControls(); };
    box.append(row);
  });
  const a = el("div", "addrow"), b = el("button", "chip", poseWhich === "guard" ? "RESET BLOCK POSE" : "RESET STANDING POSE"); a.append(b);
  b.onclick = () => { const t = clone(cur.spec); t.move[key] = {}; stageSpec(t); renderControls(); }; box.append(a);
}
// undo / redo / reset, for whatever animation is on stage
function resetInfo() {
  const S = setFor(cur.spec), cat = cur.spec.base === "cat";
  const moves = list => n => list.forEach(k => { delete n.move.anims[k]; delete n.move.rests[k]; });
  if (isMove()) return { label: (MOVE_NAMES[moveKind()] || moveKind()).toUpperCase(), apply: moves([moveKind()]) };
  if (anim === "run" || anim === "dash") return { label: "RUN", apply: n => { delete n.move.anims.run; } };
  if (anim === "jump") return { label: "JUMP", apply: n => { n.move.rise = {}; n.move.top = {}; n.move.fall = {}; } };
  if (anim === "attack") return { label: "ATTACKS", apply: moves(cat ? KIT.CAT_GROUND : S.ground) };
  if (anim === "air") return { label: "AIR ATTACKS", apply: moves(cat ? KIT.CAT_AIR : S.air) };
  if (anim === "hurt") return { label: "HURT POSE", apply: n => { n.move.hurt = {}; } };
  if (anim === "block") return { label: "BLOCK POSE", apply: n => { n.move.guard = {}; } };
  return { label: "STANDING POSE", apply: n => { n.move.stance = {}; } };
}
function animTools(box) {
  const bar = el("div", "tools"), u = el("button", "chip", "↶ UNDO"), r = el("button", "chip", "↷ REDO"), info = resetInfo(), z = el("button", "chip", "RESET " + info.label);
  [u, r, z].forEach(b => b.type = "button");
  u.disabled = !cur.undo.length; r.disabled = !cur.redo.length;
  u.title = "Undo (⌘Z)"; r.title = "Redo (⇧⌘Z)"; z.title = "Put just this animation back the way it ships (undo brings your changes back)";
  u.onclick = () => undo(); r.onclick = () => redo();
  z.onclick = () => { const n = clone(cur.spec); info.apply(n); stageSpec(n); renderKeys(); renderControls(); tl.nudge = true; toast(`RESET ${info.label} · UNDO BRINGS IT BACK`); };
  bar.append(u, r, z); box.append(bar);
}
// animate mode: pause a move at a moment, then each slider sets a key there (for this character only)
let spread = .12;                                               // seconds either side that a change blends into (0 = this frame only)
function densify(tr) {                                       // copy a move's own curve finely, so the smooth playback matches it exactly where you don't edit
  const out = [];
  for (let i = 0; i < tr.length - 1; i++) { const [a, va] = tr[i], b = tr[i + 1][0]; out.push([a, va]); [.25, .5, .75].forEach(f => { const t = a + (b - a) * f; out.push([+t.toFixed(4), KIT.keyv(tr, t)]); }); }
  out.push([...tr[tr.length - 1]]); return out;
}
const H_ANIM = [["armF", "Lead arm"], ["spF", "Lead arm out to the side"], ["elbF", "Lead elbow"], ["aS", "Lead arm stretch"], ["gF", "Lead fist size"], ["wF", "Lead fist bend"], ["armB", "Rear arm"], ["spB", "Rear arm out to the side"], ["elbB", "Rear elbow"], ["bS", "Rear arm stretch"], ["gB", "Rear fist size"], ["wB", "Rear fist bend"],
  ["lean", "Lean"], ["arch", "Arch"], ["twistU", "Upper body twist"], ["twistH", "Hip twist"], ["twist", "Whole body turn"], ["bodyY", "Crouch / rise"], ["fNx", "Front foot forward"], ["fNy", "Front foot lift"], ["fNz", "Front foot out to the side"], ["fFx", "Back foot forward"], ["fFy", "Back foot lift"], ["fFz", "Back foot out to the side"],
  ["headRot", "Head tilt"], ["spin", "Spin"], ["flip", "Flip"]];
const C_ANIM = [["armF", "Front paw"], ["spF", "Front paw out to the side"], ["elbF", "Front elbow"], ["armB", "Back paw"], ["spB", "Back paw out to the side"], ["elbB", "Back elbow"], ["lean", "Lean"], ["arch", "Arch"], ["bodyY", "Crouch / rise"],
  ["fNx", "Front foot forward"], ["fNy", "Front foot lift"], ["fNz", "Front foot out to the side"], ["fFx", "Back foot forward"], ["fFy", "Back foot lift"], ["fFz", "Back foot out to the side"], ["fP", "Toe point"], ["tailBase", "Tail up"], ["tailCurl", "Tail curl"],
  ["hatTilt", "Hat tilt"], ["hatLift", "Hat lift"], ["spin", "Spin"], ["flip", "Flip"]];
function renderAnimate(box) {
  box.append(el("h3", null, "Animate"));
  animTools(box);
  if (!isMove()) {
    const tg = editTarget();
    box.append(el("p", "note", "Pause any animation (space), drag the timeline or tap ← → to a moment, then drag the yellow dots in POSE mode (F switches)."
      + (tg ? ` Right now that changes: ${tg.name}${tg.type === "cycle" ? ` at ${Math.round(tg.u * 100)}% of the stride (sprint uses the same run)` : ""}.` : " This moment can't be posed: pause where they're mid-move."
      ) + " To keyframe a single move with sliders, pick it in the list under the stage."));
    if (anim === "run" || anim === "dash") {
      const sr = el("div", "row"), sl = el("label", null, "Blend into nearby frames"), so = el("output", null, spread > 0 ? `±${Math.round(Math.min(.45, spread * 2) * 100)}% of the stride` : "THIS MOMENT ONLY");
      const si = Object.assign(document.createElement("input"), { type: "range", min: 0, max: .3, step: .01, value: spread }); si.style.setProperty("--fill", (spread / .3 * 100) + "%");
      si.addEventListener("input", () => { spread = +si.value; so.textContent = spread > 0 ? `±${Math.round(Math.min(.45, spread * 2) * 100)}% of the stride` : "THIS MOMENT ONLY"; si.style.setProperty("--fill", (spread / .3 * 100) + "%"); });
      sr.append(sl, so, si); box.append(sr);
    }
    return;
  }
  const sp = cur.spec, cat = sp.base === "cat", kind = moveKind(), S = moveDef(kind), base = S.keys || {}, own = (sp.move.anims || {})[kind] || {}, t = clamp(tl.t, 0, S.dur);
  box.append(el("p", "note", `${(MOVE_NAMES[kind] || kind).toUpperCase()} · ${S.dur.toFixed(2)}s long · at ${t.toFixed(2)}s${tl.paused ? "" : " (pause to edit)"}. Drag the timeline to a moment, then drag the yellow dots on the character (or the sliders): that sets a key there (a diamond on the timeline; click one to delete it). Between two of your keys a change holds; past your last one it eases back over the blend. A dot you grab gets a ring: turn it to bend an elbow or a knee or tilt the head, slide it to twist the hips or the upper body. Press ▶ to watch.`));
  const sr = el("div", "row"), sl = el("label", null, "Blend into nearby frames"), so = el("output", null, spread > 0 ? `±${spread.toFixed(2)}s` : "THIS FRAME ONLY");
  const si = Object.assign(document.createElement("input"), { type: "range", min: 0, max: .3, step: .01, value: spread }); si.style.setProperty("--fill", (spread / .3 * 100) + "%");
  si.addEventListener("input", () => { spread = +si.value; so.textContent = spread > 0 ? `±${spread.toFixed(2)}s` : "THIS FRAME ONLY"; si.style.setProperty("--fill", (spread / .3 * 100) + "%"); });
  sr.append(sl, so, si); box.append(sr);
  const chans = [...(cat ? C_ANIM : H_ANIM), ...(!cat && sp.outfit.prop.kind === "sword" ? [["blade", "Sword angle"]] : [])];
  chans.forEach(([ch, lab]) => {
    const R = KIT.ANIM_CH[ch], tr = own[ch] || base[ch], v = own[ch] ? KIT.keyvS(own[ch], t) : tr ? KIT.keyv(tr, t) : (st.out[ch] ?? 0), id = "c" + (ctlN++);
    let start = null;                                           // the curve as it was when this drag began (so a drag never compounds)
    const row = el("div", "row"), l = el("label", null, lab), out = el("output", null, (v * 57.3).toFixed(0));
    const inp = Object.assign(document.createElement("input"), { type: "range", id, min: R[0], max: R[1], step: .01, value: v }); l.htmlFor = id;
    inp.style.setProperty("--fill", ((v - R[0]) / (R[1] - R[0]) * 100) + "%");
    const keyHere = !!own[ch] && keysOn(own[ch], baseFn(kind, ch, restOf(kind, ch) ?? own[ch][0][1])).some(([k]) => Math.abs(k - t) < .009);
    row.classList.toggle("changed", !!own[ch]); row.classList.toggle("keyed", keyHere);
    let rest0 = null;
    const grab = () => { if (!start) { const cur0 = (cur.spec.move.anims[kind] || {})[ch]; start = { tr: cur0 ? clone(cur0) : null }; rest0 = base[ch] ? null : restOf(kind, ch) ?? (cur0 ? cur0[0][1] : v); } };
    inp.addEventListener("pointerdown", () => { setPaused(true, false); beginDrag(); grab(); }); inp.addEventListener("focus", () => { beginDrag(); grab(); });
    inp.addEventListener("input", () => {
      grab();
      const x = +inp.value, T2 = clamp(tl.t, 0, S.dur), n = clone(cur.spec), A = n.move.anims[kind] = n.move.anims[kind] || {};
      if (!base[ch]) (n.move.rests[kind] = n.move.rests[kind] || {})[ch] = rest0;
      putKey(A, kind, ch, T2, x, start.tr, rest0); if (!Object.keys(A).length) delete n.move.anims[kind]; stageSpec(n, false);
      out.textContent = (x * 57.3).toFixed(0); inp.style.setProperty("--fill", ((x - R[0]) / (R[1] - R[0]) * 100) + "%"); tl.nudge = true;
    });
    inp.addEventListener("change", () => { start = null; endDrag(); renderKeys(); renderControls(); });
    row.append(l, out, inp); box.append(row);
  });
  if (!cat && (S.hits || []).length) {                         // where it connects (the pink on the timeline and the stage)
    box.append(el("h4", "hitbox-h", "WHERE IT CONNECTS"));
    box.append(el("p", "note", limbHits(sp) ? "The pink: when each blow can land, and the box it lands in. Drag a window on the timeline, or use these. A fist or foot lands where it really is: to reach further, move the arm or leg." : "The pink: when each blow can land, and the box it lands in. Drag a window on the timeline, or use these."));
    hitsFor(kind).forEach((h, i) => {
      const L = [["t0", `Hit ${i + 1} starts`, 0, S.dur, .01, v => v.toFixed(2) + "s"], ["t1", `Hit ${i + 1} ends`, 0, S.dur, .01, v => v.toFixed(2) + "s"]];
      if (!limbHits(sp) || h.wide) L.push(["reach", `Hit ${i + 1} reach`, 20, 280, 1, v => Math.round(v) + " px"]);
      L.push(["y0", `Hit ${i + 1} top`, -40, 280, 1, v => Math.round(v) + " px up"], ["y1", `Hit ${i + 1} bottom`, -100, 240, 1, v => Math.round(v) + " px up"]);
      L.forEach(([k, lab, lo, hi, stp, fmt]) => {
        const id = "c" + (ctlN++), row = el("div", "row"), l = el("label", null, lab), v0 = +h[k] || 0, out = el("output", null, fmt(v0));
        const inp = Object.assign(document.createElement("input"), { type: "range", id, min: lo, max: hi, step: stp, value: v0 }); l.htmlFor = id;
        const fill = v => inp.style.setProperty("--fill", ((v - lo) / (hi - lo) * 100) + "%"); fill(v0);
        row.classList.toggle("changed", !!(((sp.move.hits || {})[kind] || [])[i] || {})[k] !== undefined);
        inp.addEventListener("pointerdown", () => { setPaused(true, false); beginDrag(); }); inp.addEventListener("focus", beginDrag);
        inp.addEventListener("input", () => { let v = +inp.value; const cH = hitsFor(kind)[i];
          if (k === "t0") v = Math.min(v, cH.t1 - .02); if (k === "t1") v = Math.max(v, cH.t0 + .02); if (k === "y1") v = Math.min(v, cH.y0 - 10); if (k === "y0") v = Math.max(v, cH.y1 + 10);
          hitPatch(kind, i, { [k]: +v.toFixed(3) }, false); out.textContent = fmt(v); fill(v); if (k === "t0" || k === "t1") scrubTo(v / S.dur); renderHits(); });
        inp.addEventListener("change", () => { endDrag(); renderControls(); });
        row.append(l, out, inp); box.append(row);
      });
    });
    const hr = el("div", "addrow"), hb = el("button", "chip", "HITS BACK TO THE ORIGINAL"); hb.type = "button"; hb.disabled = !((sp.move.hits || {})[kind]);
    hb.onclick = () => { const n = clone(cur.spec); if (n.move.hits) delete n.move.hits[kind]; stageSpec(n); renderHits(); renderControls(); toast("HITS BACK TO THE ORIGINAL"); };
    hr.append(hb); box.append(hr);
  }
  const nClear = Object.keys((sp.move.clear || {})[kind] || {}).length;
  if (nClear) box.append(el("p", "note", `${nClear === animChans(kind).length ? "The whole move's original animation is cleared" : "Cleared: " + [...new Set(Object.keys(sp.move.clear[kind]).map(partOf))].join(", ")}: those parts hold still except where you key them. BACK TO THE ORIGINAL undoes it.`));
  const a = el("div", "addrow"), d = el("button", "chip", "DELETE KEYS HERE"), c = el("button", "chip", "CLEAR THE ORIGINAL"), cp = el("button", "chip", "CLEAR ONE PART…"), r = el("button", "chip", "BACK TO THE ORIGINAL"); a.append(d, c, cp, r); box.append(a);
  c.title = "Wipe this move's original animation (and your keys): she holds her starting pose the whole move, and only the keys you set move her";
  cp.title = "Wipe the original animation of one part only (an arm, a leg, the body...): it holds its starting pose, and only your keys move it";
  r.title = "Your keys and anything you cleared go: the move as it ships";
  d.onclick = () => { const T2 = clamp(tl.t, 0, S.dur); dropKeys(kind, (sc, k) => Math.abs(k - T2) < .009, "KEYS HERE DELETED"); };
  c.onclick = () => clearOriginal(kind, animChans(kind), "ORIGINAL CLEARED · SHE HOLDS HER STARTING POSE · KEY IT FROM HERE");
  cp.onclick = e => { e.stopPropagation(); partMenu(kind, cp); };
  r.onclick = () => { const n = clone(cur.spec); delete n.move.anims[kind]; delete n.move.rests[kind]; if (n.move.clear) delete n.move.clear[kind]; stageSpec(n); renderKeys(); renderControls(); tl.nudge = true; onion = null; toast("BACK TO THE ORIGINAL · UNDO BRINGS YOUR KEYS BACK"); };
  const gh = el("button", "chip" + (onionOn ? " on" : ""), onionOn ? "GHOSTS ON" : "GHOSTS OFF"); gh.type = "button"; gh.setAttribute("aria-pressed", onionOn);
  gh.title = "In POSE mode: faded dots where each dot was at your last key (hollow) and gets to at your next one (solid), and the picked dot's path";
  gh.onclick = () => { onionOn = !onionOn; onion = null; renderControls(); }; a.append(gh);
}

// outfit editor (heroes): shirt print layers, sleeve and leg bands, hands, boots, skirts, accessories
const LAYER_UI = {
  band: [["y0", "Top edge", [0, 512], 1], ["y1", "Bottom edge", [0, 512], 1]],
  panel: [["w", "Width", [8, 300], 1], ["y0", "Top", [0, 512], 1], ["y1", "Bottom", [0, 512], 1]],
  buttons: [["dx", "Spread", [0, 140], 1], ["y", "First row", [0, 512], 1], ["gap", "Row spacing", [8, 160], 1], ["rows", "Rows", [1, 6], 1], ["r", "Size", [3, 34], 1]],
  stripes: [["y0", "First stripe", [0, 512], 1], ["h", "Thickness", [2, 90], 1], ["gap", "Spacing", [8, 200], 1], ["n", "Count", [1, 8], 1]],
  gem: [["y", "Height", [0, 512], 1], ["r", "Size", [4, 60], 1]],
  poly: [],
};
const LAYER_NAME = { band: "Band", panel: "Front panel", buttons: "Buttons", stripes: "Stripes", gem: "Brooch", poly: "Shape" };
function itemCard(title, onDel, onUp) {
  const c = el("div", "card"), h = el("header");
  h.append(el("b", null, title));
  if (onUp) { const u = el("button", null, "↑"); u.title = "Move up (draws earlier)"; u.onclick = onUp; h.append(u); }
  const x = el("button", null, "✕"); x.title = "Remove"; x.onclick = onDel; h.append(x);
  c.append(h); return c;
}
const nRow = (path, label, R, step = 1, fmt = v => Math.round(v)) => rangeRow(path, label, { range: R, step, fmt });
const PROP_LABELS = { sword: { main: "Blade", fill: "Health fill", orb: "Orb", trim: "Flame guard", c1: "Notch 1", c2: "Notch 2", c3: "Notch 3" },
  gauntlet: { main: "Cuff", trim: "Cuff stripes", c1: "Health ring 1", c2: "Health ring 2", c3: "Health ring 3", orb: "Orb", fill: "Fingers" } };
function renderOutfit(box) {
  const s = cur.spec, O = s.outfit;
  box.append(el("h3", null, "Held item"));
  box.append(chipsRow("outfit.prop.kind", "Item", KIT.PROPS));
  if (O.prop.kind !== "none") {
    box.append(el("p", "note", "Its three colored sections are the character's health in the game: one empties with each hit."));
    box.append(chipsRow("outfit.prop.side", "Hand", KIT.PROP_SIDES, { right: "right hand", left: "left hand", near: "camera side" }), rangeRow("outfit.prop.size", "Size"));
    Object.entries(PROP_LABELS[O.prop.kind]).forEach(([k, lab]) => box.append(colorRow(`outfit.prop.${k}`, lab)));
  }
  box.append(el("h3", null, "Top"));
  box.append(colorRow("outfit.top", "Shirt / dress"));
  box.append(el("p", "note", "The print is painted in layers over the top color. Heights run from the collar (0) to the waist (512)."));
  O.torso.forEach((L, i) => {
    const c = itemCard(LAYER_NAME[L.kind], () => { const t = clone(s); t.outfit.torso.splice(i, 1); stageSpec(t); renderControls(); },
      i ? () => { const t = clone(s); const a = t.outfit.torso; [a[i - 1], a[i]] = [a[i], a[i - 1]]; stageSpec(t); renderControls(); } : null);
    c.append(colorRow(`outfit.torso.${i}.col`, "Color"));
    LAYER_UI[L.kind].forEach(([k, lab, R, st]) => c.append(nRow(`outfit.torso.${i}.${k}`, lab, R, st)));
    if (L.kind === "poly") {
      c.append(toggleRow(`outfit.torso.${i}.mirror`, "Mirror to both sides"));
      const ys = L.pts.filter((_, j) => j % 2), cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const row = rangeRow(`outfit.torso.${i}.pts`, "Height", { range: [0, 512], step: 1, fmt: () => Math.round(cy) });
      const inp = row.querySelector("input"); inp.value = cy; inp.style.setProperty("--fill", cy / 512 * 100 + "%");
      inp.addEventListener("input", e => {
        e.stopImmediatePropagation();
        const cur0 = cur.spec.outfit.torso[i].pts, y0 = cur0.filter((_, j) => j % 2), c0 = (Math.min(...y0) + Math.max(...y0)) / 2, dy = +inp.value - c0;
        edit(`outfit.torso.${i}.pts`, cur0.map((v, j) => j % 2 ? v + dy : v), false); row.querySelector("output").textContent = inp.value;
        inp.style.setProperty("--fill", inp.value / 512 * 100 + "%");
      }, { capture: true });
      c.append(row);
    }
    box.append(c);
  });
  const add = el("div", "addrow"); add.append(el("span", null, "ADD"));
  Object.keys(LAYER_NAME).forEach(k => { const b = el("button", "chip", LAYER_NAME[k]); b.onclick = () => {
    const t = clone(s); t.outfit.torso.push({ kind: k, ...clone(KIT.LAYER_DEF[k]), col: "#ffffff" }); stageSpec(t); renderControls(); }; add.append(b); });
  box.append(add);

  const bands = (key, title, base, note) => {
    box.append(el("h3", null, title));
    box.append(colorRow(base, title === "Sleeves" ? "Arm color" : "Leg color"));
    box.append(el("p", "note", note));
    O[key].forEach((b, i) => {
      const c = itemCard("Band " + (i + 1), () => { const t = clone(s); t.outfit[key].splice(i, 1); stageSpec(t); renderControls(); });
      c.append(colorRow(`outfit.${key}.${i}.col`, "Color"), nRow(`outfit.${key}.${i}.v0`, "From", [0, 1], .01, pct), nRow(`outfit.${key}.${i}.v1`, "To", [0, 1], .01, pct));
      box.append(c);
    });
    const a = el("div", "addrow"), b = el("button", "chip", "+ BAND"); a.append(b);
    b.onclick = () => { const t = clone(s); t.outfit[key].push({ v0: .8, v1: 1, col: "#ffffff" }); stageSpec(t); renderControls(); }; box.append(a);
  };
  bands("armBands", "Sleeves", "outfit.arm", "Bands run from the shoulder (0%) to the wrist (100%). Use skin as the arm color for bare arms.");
  bands("legBands", "Legs", "outfit.leg", "Bands run from the hip (0%) to the ankle (100%): shorts, socks, boot tops.");

  box.append(el("h3", null, "Hands"));
  box.append(chipsRow("outfit.hand.style", "Style", KIT.HANDS, { bare: "bare", ball: "mitten", sleeve: "bell cuff", cuffball: "mitten + cuff", glove: "boxing glove", fingerless: "fingerless glove", claw: "claws" }));
  if (O.hand.style !== "bare") box.append(colorRow("outfit.hand.col", O.hand.style === "sleeve" ? "Cuff" : "Glove"));
  if (O.hand.style === "cuffball") box.append(colorRow("outfit.hand.cuff", "Ring"));
  if (O.hand.style === "sleeve") box.append(colorRow("outfit.hand.dot", "Button"));
  if (O.hand.style === "fingerless") box.append(colorRow("outfit.hand.band", "Band"));

  box.append(el("h3", null, "Boots"));
  box.append(colorRow("outfit.boot.col", "Boot"));
  box.append(rangeRow("outfit.boot.r", "Chunkiness", { fmt: v => Math.round(v * 1000) }), rangeRow("outfit.boot.len", "Length", { fmt: v => Math.round(v * 1000) }), rangeRow("outfit.boot.wide", "Width"));
  [["cuff", "cuffCol", "Fluffy cuff"], ["studs", "studsCol", "Studs"], ["toe", "toeCol", "Toe cap"], ["shaft", "rimCol", "Tall shaft + rim"]].forEach(([t, c, lab]) => {
    box.append(toggleRow(`outfit.boot.${t}`, lab)); if (O.boot[t]) box.append(colorRow(`outfit.boot.${c}`, lab + " color"));
  });
  if (O.boot.studs) box.append(toggleRow("outfit.boot.studsHigh", "Studs up high"));
  if (O.boot.shaft) box.append(rangeRow("outfit.boot.shaftH", "Shaft height", { fmt: v => Math.round(v * 1000) }), rangeRow("outfit.boot.shaftR", "Shaft width", { fmt: v => Math.round(v * 1000) }));
  box.append(toggleRow("outfit.boot.sole", "Sole stripe")); if (O.boot.sole) box.append(colorRow("outfit.boot.soleCol", "Sole color"));
  box.append(toggleRow("outfit.boot.point", "Pointed toe"));

  box.append(el("h3", null, "Skirts"));
  O.skirts.forEach((k, i) => {
    const c = itemCard("Skirt " + (i + 1), () => { const t = clone(s); t.outfit.skirts.splice(i, 1); stageSpec(t); renderControls(); });
    c.append(colorRow(`outfit.skirts.${i}.col`, "Color"), nRow(`outfit.skirts.${i}.top`, "Waist", [.1, .3], .005, v => Math.round(v * 1000)),
      nRow(`outfit.skirts.${i}.bottom`, "Flare", [.15, .6], .005, v => Math.round(v * 1000)), nRow(`outfit.skirts.${i}.len`, "Length", [.1, .6], .005, v => Math.round(v * 1000)),
      nRow(`outfit.skirts.${i}.y`, "Height", [-.3, .3], .005, v => Math.round(v * 1000)),
      nRow(`outfit.skirts.${i}.bell`, "Shape (− puffy, + flares late)", [-.6, 2], .01, v => v.toFixed(2)),
      nRow(`outfit.skirts.${i}.arc`, "Wraps around (apron below 360°)", [.5, 6.283], .01, v => Math.round(v * 57.3) + "°"),
      nRow(`outfit.skirts.${i}.open`, "Open at the front", [0, 4], .01, v => Math.round(v * 57.3) + "°"));
    box.append(c);
  });
  if (O.skirts.length < 3) { const a = el("div", "addrow"), b = el("button", "chip", "+ SKIRT"); a.append(b);
    b.onclick = () => { const t = clone(s); t.outfit.skirts.push({ top: .17, bottom: .32, len: .34, y: -.1, col: O.top }); stageSpec(t); renderControls(); }; box.append(a); }

  box.append(el("h3", null, "Extras"));
  const extra = (k, lab, more) => { box.append(toggleRow(`outfit.${k}.on`, lab)); if (O[k].on) more(); };
  extra("collar", "High collar", () => {
    box.append(colorRow("outfit.collar.col", "Collar color"), rangeRow("outfit.collar.h", "Collar height", { fmt: v => Math.round(v * 1000) }),
      rangeRow("outfit.collar.bottom", "Collar width", { fmt: v => Math.round(v * 1000) }), rangeRow("outfit.collar.top", "Flare", { fmt: v => Math.round(v * 1000) }),
      rangeRow("outfit.collar.y", "Position", { fmt: v => Math.round(v * 1000) }), rangeRow("outfit.collar.open", "Front opening", { fmt: v => Math.round(v * 57.3) + "°" }),
      toggleRow("outfit.collar.lined", "Lined"));
    if (O.collar.lined) box.append(colorRow("outfit.collar.inner", "Lining color"));
  });
  extra("neck", "Turtleneck", () => box.append(colorRow("outfit.neck.col", "Turtleneck color"), rangeRow("outfit.neck.h", "Height", { fmt: v => Math.round(v * 1000) }), rangeRow("outfit.neck.r", "Width", { fmt: v => Math.round(v * 1000) })));
  extra("pads", "Shoulder pads", () => { box.append(colorRow("outfit.pads.col", "Pad color"), rangeRow("outfit.pads.size", "Pad size"),
    chipsRow("outfit.pads.side", "Which shoulder", KIT.PAD_SIDES), chipsRow("outfit.pads.shape", "Shape", KIT.PAD_SHAPES, { round: "round", block: "plate", scallop: "puffs" }), toggleRow("outfit.pads.gem", "Gem"));
    if (O.pads.gem) box.append(colorRow("outfit.pads.gemCol", "Pad gem")); });
  extra("scarf", "Scarf", () => box.append(colorRow("outfit.scarf.col", "Scarf color"), rangeRow("outfit.scarf.len", "Scarf length"), rangeRow("outfit.scarf.flow", "Scarf floppiness"),
    rangeRow("outfit.scarf.flap", "Flaps when moving"), toggleRow("outfit.scarf.ring", "Wrapped round the neck")));
  extra("tabard", "Tabard", () => { box.append(colorRow("outfit.tabard.col", "Tabard color"), rangeRow("outfit.tabard.len", "Length"), rangeRow("outfit.tabard.width", "Width"),
    rangeRow("outfit.tabard.y", "Hangs from", { range: [-.1, .4], step: .005, fmt: v => Math.round(v * 1000) }), toggleRow("outfit.tabard.gem", "Gem"));
    if (O.tabard.gem) box.append(colorRow("outfit.tabard.gemCol", "Tabard gem")); });
  extra("headband", "Headband", () => { box.append(colorRow("outfit.headband.col", "Headband color"));
    if (s.hair.mode === "sculpt") box.append(rangeRow("outfit.headband.tilt", "Tilt forward", { fmt: v => Math.round(v * 57.3) + "°" }), rangeRow("outfit.headband.width", "Band width")); });
  extra("clip", "Hair bow", () => box.append(colorRow("outfit.clip.col", "Bow color"), colorRow("outfit.clip.ring", "Bow ring")));
  extra("earStuds", "Earrings", () => box.append(colorRow("outfit.earStuds.col", "Earring color")));
  extra("beanie", "Beanie", () => box.append(colorRow("outfit.beanie.col", "Beanie color"), colorRow("outfit.beanie.band", "Beanie band")));
  extra("gem", "Chest jewel", () => box.append(colorRow("outfit.gem.col", "Jewel color")));
}

// palette: every colour in the character, grouped, so one pick recolours every part that shares it
const NAMES = { "outfit.top": "Shirt", "outfit.arm": "Arms", "outfit.leg": "Legs", "colors.skin": "Skin", "colors.hair": "Hair", "colors.eyes": "Eyes", "colors.lips": "Mouth", "colors.blush": "Blush",
  "colors.forelock": "Streak", "colors.mask": "Mask", "colors.maskLower": "Face guard", "outfit.hand.col": "Gloves", "outfit.hand.cuff": "Glove ring", "outfit.hand.dot": "Cuff button",
  "outfit.boot.col": "Boots", "outfit.boot.cuffCol": "Boot cuff", "outfit.boot.studsCol": "Boot studs", "outfit.boot.toeCol": "Toe caps", "outfit.boot.rimCol": "Boot rim",
  "outfit.collar.col": "Collar", "outfit.pads.col": "Shoulder pads", "outfit.scarf.col": "Scarf", "outfit.headband.col": "Headband", "outfit.clip.col": "Hair bow",
  "outfit.clip.ring": "Bow ring", "outfit.earStuds.col": "Earrings", "outfit.gem.col": "Jewel",
  "colors.fur": "Fur", "colors.marks": "Markings", "colors.ears": "Inner ears", "colors.mouth": "Mouth", "colors.eyeRing": "Eye rims", "colors.pupil": "Pupils", "colors.nose": "Nose",
  "colors.outfit": "Suit", "colors.trim": "Trim", "colors.bow": "Bow tie", "colors.star": "Stars", "colors.gloves": "Gloves", "colors.crescent": "Moons", "colors.hat": "Hat",
  "colors.hatBand": "Hat band", "colors.shoes": "Shoes", "colors.soles": "Soles", "colors.cardEdge": "Card edges",
  "colors.lash": "Lashes", "colors.brows": "Brows", "colors.ring": "Iris ring", "colors.tie": "Hair tie", "outfit.neck.col": "Turtleneck",
  "outfit.collar.inner": "Collar lining", "outfit.boot.soleCol": "Soles", "colors.maskIn": "Mask inside", "colors.crest": "Crest", "colors.gem": "Forehead gem",
  "outfit.hand.band": "Glove band", "outfit.pads.gemCol": "Pad gem", "outfit.tabard.col": "Tabard", "outfit.tabard.gemCol": "Tabard gem" };
function nameOf(p, s) {
  if (NAMES[p]) return NAMES[p];
  let m;
  if ((m = p.match(/^outfit\.torso\.(\d+)\.col$/))) return "Print · " + LAYER_NAME[s.outfit.torso[+m[1]].kind].toLowerCase();
  if ((m = p.match(/^outfit\.(arm|leg)Bands\.(\d+)\.col$/))) return (m[1] === "arm" ? "Sleeve" : "Leg") + " band";
  if ((m = p.match(/^outfit\.skirts\.(\d+)\.col$/))) return "Skirt " + (+m[1] + 1);
  if ((m = p.match(/^colors\.cards\.(\d+)$/))) return "Card " + (+m[1] + 1);
  if ((m = p.match(/^outfit\.prop\.(\w+)$/))) return (PROP_LABELS[s.outfit.prop.kind] || {})[m[1]] || "Item";
  return p;
}
function activeColor(p, s) {
  if (s.base === "cat") {
    const P = s.parts;
    return !({ "colors.trim": !P.trim, "colors.bow": !P.bow, "colors.crescent": !P.emblem, "colors.star": !P.emblem && !P.button, "colors.ears": s.face.ears <= .15,
      "colors.marks": !(P.cheeks || P.forehead || P.brow || P.tailBands), "colors.hat": s.body.hat <= .03, "colors.hatBand": s.body.hat <= .03 })[p];
  }
  const O = s.outfit, mk = s.face.style === "noro" || s.face.style === "doir";
  if (p === "outfit.pads.gemCol") return O.pads.on && O.pads.gem;
  if (p === "outfit.tabard.gemCol") return O.tabard.on && O.tabard.gem;
  const m = p.match(/^outfit\.(collar|pads|scarf|headband|clip|earStuds|gem|tabard|beanie)\./);
  if (m) return O[m[1]].on;
  if (p === "colors.mask") return mk || s.face.mask !== "none";
  if (p === "colors.maskLower") return s.face.style === "doir" || (!mk && s.face.mask === "visor");
  if (p === "colors.maskIn") return s.face.style === "noro";
  if (p === "colors.crest") return s.face.style === "doir";
  if (p === "colors.gem") return mk;
  if (p === "outfit.hand.band") return O.hand.style === "fingerless";
  if (p === "colors.forelock") return s.hair.forelock;
  if (p === "colors.blush") return s.face.blush > .01;
  if (/^colors\.(lash|brows|ring)$/.test(p)) return s.face.style !== "chibi" && !mk;
  if (p === "colors.tie") return s.hair.tie && s.hair.style !== "none";
  const pp = p.match(/^outfit\.prop\.(\w+)$/); if (pp) return O.prop.kind !== "none";
  if (p === "outfit.neck.col") return O.neck.on;
  if (p === "outfit.collar.inner") return O.collar.on && O.collar.lined;
  if (p === "outfit.boot.soleCol") return O.boot.sole;
  if (p === "outfit.hand.col") return O.hand.style !== "bare";
  if (p === "outfit.hand.cuff") return O.hand.style === "cuffball";
  if (p === "outfit.hand.dot") return O.hand.style === "sleeve";
  const b = p.match(/^outfit\.boot\.(cuff|studs|toe|rim)Col$/);
  if (b) return O.boot[b[1] === "rim" ? "shaft" : b[1]];
  return true;
}
function colorPaths(s) {
  const out = [];
  const walk = (o, p) => {
    if (typeof o === "string") { if (o[0] === "#" && /col|colors|outfit\.(top|arm|leg)$|outfit\.prop\.|inner$/i.test(p)) out.push(p); return; }
    if (o && typeof o === "object") for (const k in o) walk(o[k], p ? p + "." + k : k);
  };
  walk({ colors: s.colors, outfit: s.outfit }, "");
  return out.filter(p => activeColor(p, s));
}
function renderPalette(box) {
  const s = cur.spec, groups = new Map();
  colorPaths(s).forEach(p => { const v = getPath(s, p); if (!groups.has(v)) groups.set(v, []); groups.get(v).push(p); });
  box.append(el("h3", null, "Palette"));
  box.append(el("p", "note", "Every color in this character. Changing a swatch recolors every part that shares it. To split one part off, use its own tab."));
  const grid = el("div", "swatches");
  [...groups].sort((a, b) => b[1].length - a[1].length).forEach(([v, paths]) => {
    const sw = el("div", "sw"), id = "c" + (ctlN++);
    const inp = Object.assign(document.createElement("input"), { type: "color", id, value: v });
    const names = [...new Set(paths.map(p => nameOf(p, s)))];
    const lab = el("label", null, ""); lab.htmlFor = id;
    lab.innerHTML = `<span>${names.slice(0, 3).join(", ")}${names.length > 3 ? ` +${names.length - 3}` : ""}<em>${v.toUpperCase()}</em></span>`;
    inp.addEventListener("focus", beginDrag); inp.addEventListener("click", beginDrag);
    inp.addEventListener("input", () => { const t = clone(cur.spec); paths.forEach(p => setPath(t, p, inp.value)); stageSpec(t, false); lab.querySelector("em").textContent = inp.value.toUpperCase(); });
    inp.addEventListener("change", () => { endDrag(); renderControls(); });
    sw.append(inp, lab); grid.append(sw);
  });
  box.append(grid);
}

// ───────────────────────────── cast list ─────────────────────────────
function chipsOf(s) {
  if (s.base === "cat") return [s.colors.fur, s.colors.outfit, s.colors.gloves, s.colors.hat];
  const k = v => v === "skin" ? s.colors.skin : v === "hair" ? s.colors.hair : v;
  return [s.colors.hair, k(s.outfit.top), k(s.outfit.arm), k(s.outfit.boot.col)];
}
function castItemHTML(e) {
  const s = e.spec;
  if (e.villain) return `<b>${s.name}</b><span class="chips">${e.villain.cols.slice(0, 4).map((c, i) => `<i style="background:${(e.look.colors || {})[i] || c}"></i>`).join("")}</span><small>VILLAIN${edited(e) ? " · EDITED" : ""}</small>`;
  if (e.buddy) return `<b>${s.name}</b><span class="chips">${chipsOf(s).map(c => `<i style="background:${c}"></i>`).join("")}</span><small>${e.buddy.startsWith("pet-") ? "PET" : "BERRY BUDDY"}${edited(e) ? " · EDITED" : ""}</small>`;
  if (isVillainSpec(s)) return `<b>${s.name}</b><span class="chips">${chipsOf(s).map(c => `<i style="background:${c}"></i>`).join("")}</span><small>VILLAIN${edited(e) ? " · EDITED" : ""}</small>`;
  return `<b>${s.name}</b><span class="chips">${chipsOf(s).map(c => `<i style="background:${c}"></i>`).join("")}</span><small>${e.builtIn ? (edited(e) ? "EDITED" : "ORIGINAL") : "NEW"}</small>`;
}
function renderCast() {
  $("cast").innerHTML = "";
  cast.forEach(e => {
    const li = el("li"), b = el("button", "who" + (e === cur ? " on" : ""), castItemHTML(e));
    b.title = (e.spec.base === "cat" ? "Creature" : "Hero"); b.onclick = () => select(e); b.dataset.id = e.id;
    li.append(b); $("cast").append(li);
  });
}
function renderCastItem(e) { const b = $("cast").querySelector(`[data-id="${CSS.escape(e.id)}"]`); if (b) b.innerHTML = castItemHTML(e); }
function updateFoot() {
  $("bUndo").disabled = !cur.undo.length; $("bRedo").disabled = !cur.redo.length;
  $("bDel").disabled = cur.builtIn || !!cur.buddy; $("bReset").disabled = !edited(cur);
}
function renderAll() {
  renderCast(); renderTabs(); renderControls(); updateFoot();
  $("stage").classList.toggle("villain", !!cur.villain); $("name").readOnly = !!(cur.villain || cur.buddy);
  if (cur.villain) { $("name").value = cur.spec.name; $("kindBar").textContent = "VILLAIN"; $("ref").hidden = true; $("bDup").disabled = $("bDup2").disabled = true; return; }
  $("bDup").disabled = $("bDup2").disabled = !!cur.buddy;
  $("name").value = cur.spec.name;
  $("kindBar").textContent = cur.spec.base === "cat" ? "CREATURE" : cur.spec.body.build === "tall" ? "HERO" : "HERO · CHIBI";
  if (isVillainSpec(cur.spec)) $("kindBar").textContent = "VILLAIN";
  if (cur.buddy) $("kindBar").textContent = cur.buddy.startsWith("pet-") ? "PET · MOVES" : "BERRY BUDDY · MOVES";
  fillMoves(); renderKeys();
  showRef();
}
async function showRef() {
  const f = $("ref"), e = cur;
  if (e.ref === undefined) { e.ref = null; try { e.ref = await store.getRef(e.id); } catch { } }
  if (e !== cur) return;
  f.hidden = !e.ref; f.classList.remove("big"); if (e.ref) f.querySelector("img").src = e.ref;
}
$("ref").onclick = () => $("ref").classList.toggle("big");
function select(e, force) {
  if (e === cur && !force) return;
  if (vprev) { vprev.dispose(); vprev = null; }
  if (e.villain) {                                             // a boss: the game's own model on stage, and the LOOK tab
    cur = e; pending = null; if (poseMode) setPoseMode(false);
    rig.root.visible = rig.shadow.visible = false; cards.forEach(c => { c.visible = false; });
    vprev = VIL.preview(e.villain.id); scene.add(vprev.rig.root, vprev.rig.shadow); vprev.paint(e.look); tab = "LOOK";
    renderAll(); return;
  }
  cur = e; pending = null; switchRig(cur.spec); cur.committed = JSON.stringify(cur.spec);
  if (isMove() && !movesFor(cur.spec).some(([k]) => k === moveKind())) {   // the picked move isn't one this character has (a card move, then June): swap it before drawing
    const ms = movesFor(cur.spec); anim = tab === "ANIMATE" && ms.length ? "move:" + ms[0][0] : "idle"; tl.t = 0;
  }
  renderAll();
}
$("name").addEventListener("input", () => {
  if (cur.buddy) return;
  const v = $("name").value.toUpperCase().replace(/[^A-Z0-9 .!?'&-]/g, "");
  if (v.trim()) { const t = clone(cur.spec); t.name = v; cur.spec = KIT.normalize(t); pending = cur.spec; scheduleSave(cur); renderCastItem(cur); }
});
$("name").addEventListener("focus", beginDrag);
$("name").addEventListener("change", () => { endDrag(); $("name").value = cur.spec.name; });

// ───────────────────────────── cast actions ─────────────────────────────
function addEntry(spec, extra = {}) {
  const s = KIT.normalize(spec); s.id = extra.keepId ? s.id : freshId(s.name);
  const e = entry(s, { builtIn: false, created: Date.now(), origin: extra.origin ? { ...extra.origin, id: s.id } : s, ref: extra.ref ?? null });
  cast.push(e); scheduleSave(e); if (extra.ref) store.putRef(e.id, extra.ref).catch(() => {});
  renderCast(); select(e); return e;
}
function duplicate() {
  if (cur.villain || cur.buddy) return;
  const s = clone(cur.spec); s.name = (s.name.slice(0, 11) + " 2").trim();
  addEntry(s, { ref: cur.ref || null }); toast(`COPIED TO ${cur.spec.name}`);
}
$("bDup").onclick = duplicate; $("bDup2").onclick = duplicate;
$("bUndo").onclick = undo; $("bRedo").onclick = redo;
function confirmBox(title, bar, text, yes) {
  $("mConT").textContent = title; $("mConB").textContent = bar; $("mConP").textContent = text; open("mConfirm");
  $("bConYes").onclick = () => { close("mConfirm"); yes(); };
}
$("bReset").onclick = () => confirmBox("RESET?", cur.spec.name, cur.villain ? "Put this villain back the way it looks in the game." : cur.builtIn ? "Put this character back the way it ships in the game. You can undo this." : "Go back to how this character was first made. You can undo this.", () => {
  if (cur.villain) { cur.look = {}; vprev.paint(cur.look); scheduleSave(cur); renderAll(); return; }
  cur.undo.push(JSON.stringify(cur.spec)); cur.redo = [];
  cur.spec = KIT.normalize(cur.builtIn ? presetOf(cur.id) : cur.origin); cur.committed = JSON.stringify(cur.spec); pending = cur.spec; scheduleSave(cur); renderAll();
});
$("bDel").onclick = () => { if (cur.builtIn || cur.buddy) return; confirmBox("DELETE?", cur.spec.name, "This removes the character from the game for good. Export it first if you might want it back.", async () => {
  const e = cur; cast = cast.filter(x => x !== e); clearTimeout(e.saveT);
  try { drafts.drop(e.id); await store.del(e.id); } catch { }
  select(cast[0]); renderCast(); toast(`DELETED ${e.spec.name}`);
}); };

// modals
function open(id) { $(id).hidden = false; const f = $(id).querySelector("button.cta:not([disabled]), textarea, button"); f && f.focus(); }
function close(id) { $(id).hidden = true; }
root.querySelectorAll(".modal").forEach(m => {
  m.addEventListener("click", e => { if (e.target === m || e.target.closest("[data-close]")) close(m.id); });
});
addEventListener("keydown", e => {                // Esc closes a dialog, or the editor itself
  if (!isOpen || e.key !== "Escape") return;
  const open = root.querySelectorAll(".modal:not([hidden])");
  if (open.length) open.forEach(m => close(m.id)); else if (!$("busy").hidden) return; else closeEd();
});

// export
let expMode = "one";
function exportData() {
  if (expMode === "one") return { name: `${cur.spec.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.character.json`, json: JSON.stringify(cur.spec, null, 2) };
  const list = cast.filter(e => !e.villain && !e.buddy && (!e.builtIn || edited(e))).map(e => e.spec);
  return { name: "starky-cast.json", json: JSON.stringify({ format: "starky.cast", version: 1, characters: list }, null, 2), n: list.length };
}
function refreshExport() {
  const d = exportData(); $("expText").value = d.json;
  $("mExpB").textContent = expMode === "one" ? cur.spec.name : `${d.n} CHARACTER${d.n === 1 ? "" : "S"} · NEW + EDITED`;
  [...$("expSeg").children].forEach(b => b.classList.toggle("on", b.dataset.x === expMode));
}
$("bExport").onclick = () => { refreshExport(); open("mExport"); };
$("expSeg").onclick = e => { const b = e.target.closest("[data-x]"); if (!b) return; expMode = b.dataset.x; refreshExport(); };
$("bCopy").onclick = async () => {
  try { await navigator.clipboard.writeText($("expText").value); toast("COPIED"); }
  catch { $("expText").focus(); $("expText").select(); toast("SELECTED · PRESS ⌘C TO COPY"); }
};
let downloads = null;
$("bSave").onclick = async () => {
  const d = exportData();
  if (!downloads) { $("expText").focus(); $("expText").select(); toast("SAVING FILES ISN'T AVAILABLE HERE · COPY THE TEXT INSTEAD", 4000); return; }
  try { await downloads.save({ filename: d.name, data: d.json }); toast("SAVED " + d.name); }
  catch (err) { if (err && err.code !== "declined") toast("COULDN'T SAVE · USE COPY INSTEAD", 4000); }
};

// import
function importText(text) {
  let j; try { j = JSON.parse(text); } catch { throw new Error("That isn't valid JSON. Check that you copied the whole file."); }
  const list = Array.isArray(j) ? j : j && Array.isArray(j.characters) ? j.characters : [j];
  const ok = list.filter(c => c && typeof c === "object" && (c.base || c.body || c.outfit || c.colors));
  if (!ok.length) throw new Error("No characters found in that file.");
  let lastE = null;
  ok.forEach(c => {
    const s = KIT.normalize(c), have = cast.find(e => !e.buddy && (e.id === s.id || (!e.builtIn && e.spec.name === s.name) || (e.builtIn && e.id === s.id)));
    if (have) { have.undo.push(JSON.stringify(have.spec)); have.redo = []; have.spec = KIT.normalize({ ...s, id: have.id }); scheduleSave(have); lastE = have; }
    else { const e = entry({ ...s, id: freshId(s.name) }, { builtIn: false, created: Date.now() }); cast.push(e); scheduleSave(e); lastE = e; }
  });
  renderCast(); select(lastE, true);
  return ok.length;
}
$("bImport").onclick = () => { $("impErr").hidden = true; $("impText").value = ""; open("mImport"); };
$("bPickJson").onclick = () => $("fileJson").click();
$("fileJson").onchange = async () => {
  let n = 0; const errs = [];
  for (const f of $("fileJson").files) { try { n += importText(await f.text()); } catch (err) { errs.push(f.name + ": " + err.message); } }
  $("fileJson").value = "";
  if (errs.length) { $("impErr").textContent = errs.join(" "); $("impErr").hidden = false; }
  if (n) { close("mImport"); toast(`IMPORTED ${n} CHARACTER${n === 1 ? "" : "S"}`); }
};
$("bImpGo").onclick = () => {
  try { const n = importText($("impText").value); close("mImport"); toast(`IMPORTED ${n} CHARACTER${n === 1 ? "" : "S"}`); }
  catch (err) { $("impErr").textContent = err.message; $("impErr").hidden = false; }
};

// ───────────────────────────── Claude: picture → character, and plain-language edits ─────────────────────────────
const GUIDE = `FORMAT: one JSON object, "format": "starky.character", "version": 1, "name" (max 14 letters, caps), "base": "human" or "cat".
Every number must stay in its range; colors are 6-digit hex. The game renders with soft cel shading, no outlines, and adds its own pastel grade, so pick the colors as drawn (clean and saturated).

BASE "human" = a hero. The cast's house style is body.build "tall" with hair.mode "sculpt" (see JUNE below); use "chibi" only for a clearly chibi drawing. Fields:
body: scale .6-1.5, head .6-1.6, torso .6-1.7 (length), girth .6-1.7 (width), shoulders .7-1.4, arms .6-1.6, legs .6-1.5, limbs .5-1.8 (thickness), hands .5-1.8, feet .6-1.6. 1 = the build's default.
head (shape of the head; defaults 1 or 0): width .75-1.35, height .8-1.35, depth .8-1.3, top .7-1.35 (width of the top of the head), jaw .7-1.3 (width of the lower face), cheeks 0-1 (full cheeks), chinLen 0-.5 (longer chin), forehead -.3 to .5, back -.4 to .5 (flatter or rounder back of the head).
body.build: "chibi" (big head, short body) or "tall" (about four heads tall, like the character sheet). face.style: "chibi" (painted generic eyes: the right choice for a new character), "june" / "chase" (those characters' own drawn faces: round blue eyes with a white ring inside the iris, heavy lashes, brows; colors.lash, colors.brows, colors.ring; face.browY px, face.browSize), or "noro" / "doir" (their masked faces: colors.mask, maskIn (noro's mask inside), maskLower (doir's chin guard), crest (doir), gem (the jewel on the forehead)). face.earY -.25..1 (ear height).
face: eyeSize .6-1.5, eyeGap .7-1.3, eyeY -60..60 (px, + is lower), eyeW .7-1.4 and eyeH .6-1.4 (eye shape), eyeTilt -.4 to .4 (radians, + lifts the outer corners), iris .6-1.3, pupil .4-1.8, lookX and lookY -1..1 (where the eyes look; + is the viewer's right / down), lids 0-.7 (heavy upper lids), shine true/false (eye highlights), noseY -30..40 and mouthY -40..60 (px, + is lower), mouth 0-1.6 (size), mouthCurve -1..2 (frown to big smile, 1 default), faceY -50..50 (slides the whole painted face, + is lower), blush 0-1, chin 0-.3 (point, .07 default), ears 0-1.8, lashes true/false, mask "none" | "visor" (mask band round the eyes plus a colored lower-face guard) | "domino" (mask with white eyes).
hair.mode: "cap" (a simple cap of hair, bangs painted on) or "sculpt" (hair modeled like the drawing: shell .03-.4 = volume, taper -1..1 (negative flares the bottom out, for straight-sided bobs), fringe "oval" | "bangs" (or a cast member's: "june" | "chase" | "noro" | "doir") = the face opening, fringeDrop -.3..3, sides .1-1.2 and back .2-1.3 = how far down the hair comes, tufts: up to 12 [{"yaw" -180..180 (0 front, 90 viewer's right), "pitch" -90..90, "len" 0-.8, "width" .1-1.2, "sharp" .5-4}] for lobes, flips and spikes). Style "lowtail" = low ponytail, "sidetail" = long ponytail from one side; hair.tie + colors.tie.
hair: bangs "spiky" | "wavy" | "bowl" | "choppy" | "blunt" | "parted" | "swept" | "none"; bangLen 0-1.6; forelock true/false (one colored streak down the middle); cover .4-.85 (how far the hair cap reaches down the head); width/height/depth .8-1.5 (puffiness of the hair cap); tilt 0-1 (swept back); style "none" | "flip" (flicked-out sides and back) | "long" (long hair down the back) | "bob" | "ponytail" | "pigtails"; length .4-2; flow .4-2.5 (floppiness); thick .5-1.8; spike 0-2 (one big spike on top).
colors: skin, hair, eyes, lips, blush, forelock, mask, maskLower.
outfit:
 top: shirt/dress color. torsoProf: [[t, radius]...] from the hips (t 0) to the neck (t 1), radius .08-.22 (wider = chunkier).
 torso: print layers painted in order over "top" on a 512x512 sheet wrapped round the torso. y 0 = collar, y 512 = waist. x offsets are measured from the FRONT CENTER (the sheet repeats front shapes on both seams for you).
   {"kind":"band","y0","y1","col"} band all the way round (collar trim, belt, a vest's upper half, pants top)
   {"kind":"panel","w","y0","y1","col"} rectangle on the front (bib, shirt front, apron)
   {"kind":"buttons","dx","y","gap","rows","r","col"} buttons dx px left and right of center (dx 0 = one column), first row at y, rows (1-6) gap apart, radius r
   {"kind":"stripes","y0","h","gap","n","col"} n horizontal stripes
   {"kind":"gem","y","r","col"} round brooch on the front
   {"kind":"poly","pts":[x,y,...],"mirror":bool,"col"} any front shape (tie, V-neck, emblem, zip); mirror also draws it flipped
 arm: arm color ("skin" for bare arms). armBands: [{"v0","v1","col"}] from shoulder (0) to wrist (1): sleeves, cuffs, gloves.
 leg: leg color ("skin" for bare legs). legBands: [{"v0","v1","col"}] from hip (0) to ankle (1): shorts, socks.
 armProf / legProf: [[t, radius]] thickness along the limb (.04-.14).
 hand: {"style": "bare" | "ball" (mitten) | "sleeve" (flared bell cuff + bare hand + button "dot") | "cuffball" (mitten + ring "cuff") | "glove" (big boxing glove) | "fingerless" (glove with a "band", bare fingers) | "claw", "col", "cuff", "dot", "band"}
 boot: {"col", "r" .07-.14 chunkiness, "len" .12-.3, "wide" .9-1.5, "cuff" + "cuffCol" (fluffy ring), "studs" + "studsCol" + "studsHigh", "toe" + "toeCol", "shaft" + "rimCol" (tall boot), "point" (curled pointed toe)}
 skirts: up to 3 [{"top" .1-.3, "bottom" .15-.6 (flare), "len" .1-.6, "y" -.3..3 (-.1 typical), "col", "bell" -.6..2 (negative = puffy dome, positive = flares late), "arc" .5-6.28 (less than a full turn = a front apron), "open" 0-4 (a coat open at the front)}], petticoat first.
 collar {"on","top","bottom","h","y","col"} high collar; pads {"on","col","size","gem","gemCol"} shoulder pads; scarf {"on","col","len","flow","flap" 0-1.5 (flutters when running),"ring" (wrapped round the neck)} scarf with two flowing tails; tabard {"on","col","len","width","y","gem","gemCol"} a long pointed panel hanging in front from the waist; headband {"on","col"}; clip {"on","col","ring"} hair bow; earStuds {"on","col"}; gem {"on","col"} small chest jewel.
 prop {"kind": "none" | "sword" | "gauntlet", "side": "right" | "left" | "near", "size", "main", "fill", "orb", "trim", "c1", "c2", "c3"}: a held item whose three colored sections show health. pads also take "side" ("both" | "right" | "left") and "shape" ("round" | "block" | "scallop"); collar takes "open" (front gap, 0-3), "lined" + "inner"; neck {"on","col","h","r"} is a turtleneck; boot takes "shaftH", "shaftR", "sole" + "soleCol".
 Any color value may be "skin" or "hair" to reuse those colors.

BASE "cat" = animal mascot like Tocsin (spiky furry head with pointed ears, painted face, long springy tail, boxing-glove paws, sneakers, optional top hat; attacks by throwing 3 cards). Fields:
body: scale, head, torso, girth, arms, legs, limbs, gloves (paw size .5-1.6), feet, tail .3-1.8, tailThick .4-1.8, hat 0-1.6 (0 = no hat), pants 0-1 (how far the suit color runs down the legs).
head: the same head-shape fields as the human.
face: eyeSize, eyeGap, eyeY, eyeW, eyeH, eyeTilt, pupil, lookX, lookY, lids, noseY, mouthY, faceY (as for the human), mouth 0-1.6 (fanged grin size, 0 = none), spikes 0-1.6 (mane fluff, 0 = smooth round head), ears 0-1.8.
parts (true/false): cheeks, forehead, brow (face markings), emblem (moon and star on the paws), bow (bow tie), button, trim (suit trim), tailBands, claws.
colors: fur, marks (face markings + tail stripes), ears (inner ear), mouth, eyeRing, pupil, nose, outfit (suit), trim, bow, star, gloves, crescent, hat, hatBand, shoes, soles, cards [3 colors], cardEdge.

move (both): set "brawler" (punch, kick) | "sword" (two swings, two air swings) | "boxer" (one-two, haymaker + hook, air hammer) | "ninja" (palm strike, spinning back kick; air: flying kick, flip axe kick) | "kunoichi" (double knife-hand chop, sweep into a crescent kick; air: tornado kick, flip axe kick); stride .6-1.6, swing 0-2 (arm swing), lean -.3 to .6 (posture: + hunched forward, - leaning back), bounce 0-2.5, reach .5-1.8 (attack reach), speed .6-1.5, jump .7-1.4.`;
const example = id => JSON.stringify(presetOf(id));
function createPrompt(note, base) {
  return `You are turning a character drawing into a parametric 3D character for Berry Blade, a cute cel-shaded 2.5D platformer (three.js). The attached image is the drawing.
Reply with ONLY the JSON object, no other text.

${GUIDE}

Two characters already in the game, as examples of the format:
JUNE (human): ${example("june")}
TOCSIN (cat): ${example("tocsin")}

Now read the drawing carefully: ${base ? `use base "${base}".` : `choose the base (a person or humanoid → "human"; an animal mascot → "cat").`}
Match proportions (head vs body, limb length and thickness), hair shape and color, every outfit color and print (build the shirt from layers), gloves, boots and accessories. If a detail has no exact field, pick the closest one.
Name: use the name written on the drawing or in the notes, otherwise invent a short fitting one.${note ? `\nNotes from the artist: ${note}` : ""}`;
}
function editPrompt(text) {
  return `Here is a character for Berry Blade, a cute cel-shaded 2.5D platformer, as JSON in the format below. Apply this change from the artist: "${text}".
Change only what the request needs and keep everything else exactly the same. Reply with ONLY the complete updated JSON object.${cur.ref ? "\nThe attached image is the original drawing, for reference." : ""}

${GUIDE}

CURRENT CHARACTER:
${JSON.stringify(cur.spec)}`;
}
let sample = null, sampleImages = false, ctl = null;
function busy(on, title, sub, img) {
  $("busy").hidden = !on; if (!on) return;
  $("busyT").textContent = title; $("busyB").textContent = sub;
  const sc = $("busyScan"); sc.hidden = !img; if (img) sc.querySelector("img").src = img;
}
function sampleError(err) {
  const c = err && err.code;
  if (c === "cancelled") return null;
  if (["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed", "images_unavailable"].includes(c)) return "Claude isn't available on this page right now. You can still copy the prompt and use it in a Claude chat.";
  if (c === "rate_limited") return "Claude is busy or you've hit a usage limit. Try again in a few minutes.";
  if (c === "image_rejected") return "That image couldn't be read. Try a PNG or JPEG under 20 MB.";
  if (c === "refused") return "Claude couldn't make a character from that. Try a different picture or note.";
  if (c === "invalid_json") return "The answer came back incomplete. Try again.";
  if (c === "session_expired") return "Your claude.ai session expired. Reload the page and sign in.";
  return "The connection dropped. Try again.";
}
let elapsedT = null;
function startClock(prefix) {
  const t0 = performance.now(); clearInterval(elapsedT);
  const tick = () => { $("busyP").textContent = `${prefix} · ${Math.round((performance.now() - t0) / 1000)}s`; };
  tick(); elapsedT = setInterval(tick, 500);
}
$("bStop").onclick = () => ctl && ctl.abort();

// new from picture
let pickFile = null, pickURL = null, newBase = "";
function setPick(file) {
  if (!file || !/^image\//.test(file.type)) { toast("PICK A PNG, JPEG, WEBP OR GIF"); return; }
  pickFile = file; if (pickURL) URL.revokeObjectURL(pickURL); pickURL = URL.createObjectURL(file);
  $("dropImg").src = pickURL; $("dropImg").hidden = false; $("dropB").textContent = file.name.slice(0, 40).toUpperCase(); $("dropS").textContent = "click to choose a different one";
  $("bMake").disabled = !sampleImages;
}
function openNew() {
  $("newErr").hidden = true; $("newOffline").hidden = sampleImages; $("bMake").disabled = !(pickFile && sampleImages);
  open("mNew");
}
$("bNew").onclick = openNew; $("bNew2").onclick = openNew;
$("drop").onclick = () => $("fileImg").click();
$("drop").onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("fileImg").click(); } };
$("fileImg").onchange = () => { setPick($("fileImg").files[0]); $("fileImg").value = ""; };
["dragenter", "dragover"].forEach(t => $("drop").addEventListener(t, e => { e.preventDefault(); $("drop").classList.add("over"); }));
["dragleave", "drop"].forEach(t => $("drop").addEventListener(t, e => { e.preventDefault(); $("drop").classList.remove("over"); }));
$("drop").addEventListener("drop", e => setPick(e.dataTransfer.files[0]));
addEventListener("paste", e => {
  if ($("mNew").hidden) return;
  const f = [...(e.clipboardData?.files || [])].find(f => /^image\//.test(f.type)); if (f) { e.preventDefault(); setPick(f); }
});
$("baseSeg").onclick = e => { const b = e.target.closest("[data-b]"); if (!b) return; newBase = b.dataset.b; [...$("baseSeg").children].forEach(x => x.classList.toggle("on", x === b)); };
$("bCopyPrompt").onclick = async () => {
  const p = createPrompt($("newNote").value.trim(), newBase);
  try { await navigator.clipboard.writeText(p); toast("PROMPT COPIED · PASTE IT IN A CLAUDE CHAT WITH YOUR DRAWING", 4500); }
  catch { $("newErr").textContent = "Couldn't copy here. Open the export box and copy from there instead."; $("newErr").hidden = false; }
};
async function shrink(file, max, type = "image/jpeg", q = .82) {     // downsize for sending + for the stored reference thumbnail
  const img = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas");
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  const g = c.getContext("2d"); g.fillStyle = "#ffffff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
  return { blob: await new Promise(r => c.toBlob(r, type, q)), url: c.toDataURL(type, .7) };
}
$("bMake").onclick = async () => {
  if (!pickFile || !sample) return;
  const note = $("newNote").value.trim(); close("mNew");
  let big, thumb;
  try { big = await shrink(pickFile, 1400); thumb = (await shrink(pickFile, 420)).url; } catch { toast("THAT IMAGE COULDN'T BE OPENED"); return; }
  busy(true, "READING", "YOUR DRAWING", thumb); startClock("Claude is studying the shapes and colors");
  ctl = new AbortController();
  try {
    const spec = await sample.json(createPrompt(note, newBase), { images: [big.blob], modelTier: "complex", signal: ctl.signal, cache: false,
      onText: ({ text }) => { $("busyT").textContent = "DRAWING"; $("busyB").textContent = "THE 3D MODEL"; startClock.n = text.length; } });
    if (!spec || typeof spec !== "object" || Array.isArray(spec)) throw { code: "invalid_json" };
    const e = addEntry(spec, { ref: thumb });
    tab = "BODY"; renderAll();
    toast(`MADE ${e.spec.name} · TWEAK AWAY`, 3500);
    pickFile = null; $("dropImg").hidden = true; $("dropB").textContent = "DROP A DRAWING HERE"; $("dropS").textContent = "or click to choose · paste works too"; $("newNote").value = "";
  } catch (err) {
    const m = sampleError(err);
    if (m) { open("mNew"); $("newErr").textContent = m; $("newErr").hidden = false; }
  } finally { clearInterval(elapsedT); busy(false); ctl = null; }
};

// ask Claude for an edit
async function refBlob() {
  if (!cur.ref || !sampleImages) return null;
  try {                                       // decode the stored data: URL by hand (the page's network is locked down)
    const [head, b64] = cur.ref.split(","), bin = atob(b64), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new Blob([u8], { type: (head.match(/data:([^;]+)/) || [])[1] || "image/jpeg" });
  } catch { return null; }
}
$("bAsk").onclick = async () => {
  const text = $("askText").value.trim(); if (!text || !sample) return;
  const e = cur, img = await refBlob();
  busy(true, "EDITING", e.spec.name, null); startClock(`“${text.slice(0, 60)}”`);
  ctl = new AbortController();
  try {
    const spec = await sample.json(editPrompt(text), { modelTier: "default", signal: ctl.signal, cache: false, ...(img ? { images: [img] } : {}) });
    if (!spec || typeof spec !== "object" || Array.isArray(spec)) throw { code: "invalid_json" };
    if (e !== cur) select(e);
    const s = KIT.normalize({ ...spec, id: e.id, base: spec.base || e.spec.base });
    if (s.base !== e.spec.base) s.base = e.spec.base;
    stageSpec(s); switchRig(cur.spec); renderAll(); $("askText").value = "";
    toast("DONE · UNDO IF YOU DON'T LIKE IT", 3500);
  } catch (err) { const m = sampleError(err); if (m) toast(m.toUpperCase(), 5000); }
  finally { clearInterval(elapsedT); busy(false); ctl = null; }
};
$("askText").addEventListener("keydown", e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) $("bAsk").click(); });

// ───────────────────────────── open / close ─────────────────────────────
let isOpen = false, onClosed = null;
function openEd(id, cb) {
  onClosed = cb; isOpen = true; root.hidden = false;
  const restored = loadStored(); cur = cast.find(e => e.id === id) || cast[0]; select(cur, true);
  setSaveState(restored ? "DRAFT KEPT · CHOOSE WHEN YOU CLOSE" : "");
  if (restored) toast(`BROUGHT BACK ${restored} UNSAVED EDIT${restored === 1 ? "" : "S"} FROM LAST TIME`, 4500);
  resize(); last = performance.now(); requestAnimationFrame(frame);
}
async function closeEd() {                     // nothing changed: just close. Otherwise ask what to do with the edits
  if (!isOpen) return;
  if (ctl) ctl.abort();
  await flushSaves();
  const ch = cast.filter(changed);
  if (!ch.length) { finishClose(); return; }
  root.querySelectorAll(".modal:not([hidden])").forEach(m => close(m.id));
  $("mCloseB").textContent = ch.map(e => e.spec.name).join(" · ");
  $("mCloseP").textContent = `You changed ${ch.length === 1 ? "1 character" : ch.length + " characters"}. Apply the changes to the game's characters, or leave the game as it is and save your edits as a separate character file you can load later.`;
  open("mClose");
}
function finishClose() {
  root.querySelectorAll(".modal:not([hidden])").forEach(m => close(m.id));
  if (vprev) { vprev.dispose(); vprev = null; }
  isOpen = false; root.hidden = true;
  const cb = onClosed; onClosed = null; if (cb) cb(cur && cur.id);
}
$("bApply").onclick = async () => {
  const ch = cast.filter(changed); let bad = 0;
  for (const e of ch) { try {
    if (e.villain) { await VIL.save(e.villain.id, edited(e) ? e.look : null); e.base = clone(e.look); continue; }
    if (e.buddy) { if (!BUD.save(e.buddy, edited(e) ? e.spec.move.anims : null)) throw 0; e.base = clone(e.spec); continue; }   // (a buddy: its moves into the game)
    if (e.builtIn && !edited(e)) await store.del(e.id); else await store.put(docOf(e)); e.base = clone(e.spec); e.isNew = false; } catch { bad++; } }
  if (bad) { toast("COULDN'T SAVE EVERYTHING · TRY SAVE AS A FILE", 4500); return; }
  drafts.clear(); toast(`APPLIED ${ch.length} CHARACTER${ch.length === 1 ? "" : "S"} TO THE GAME`); finishClose();
};
$("bSaveFile").onclick = async () => {
  const ch = cast.filter(e => changed(e) && !e.villain && !e.buddy); if (!ch.length) { toast("VILLAIN LOOKS AND BUDDY MOVES GO STRAIGHT INTO THE GAME · USE APPLY", 4000); return; }
  const json = JSON.stringify({ format: "starky.cast", version: 1, characters: ch.map(e => e.spec) }, null, 2);
  const name = `berry-blade-edits-${new Date().toISOString().slice(0, 10)}.json`;
  if (!(await saveFile(name, json))) { toast("THE FILE WASN'T SAVED · NOTHING CHANGED", 4000); return; }
  drafts.clear(); toast(`SAVED ${name} · THE GAME'S CHARACTERS ARE UNCHANGED`, 5000); finishClose();
};
$("bDiscard").onclick = () => { drafts.clear(); finishClose(); };
$("edBack").onclick = closeEd;   // (its own id: the game's select screen has a #bBack of its own, which this one used to get, so BACK TO GAME did nothing: the user, 2026-10-25)
(async () => {
  const use = window.claude && window.claude.use ? n => window.claude.use(n).catch(() => null) : async () => null;
  const [smp, dl] = await Promise.all([use("sample"), use("downloads")]);
  downloads = dl;
  if (smp) { sample = smp; const lim = await smp.limits().catch(() => null); sampleImages = !!(lim && lim.images); $("ask").hidden = false; }
  $("newOffline").hidden = sampleImages; if (pickFile) $("bMake").disabled = !sampleImages;
})();
window.__ed = { cam(y, p = camPitch, d = camDist) { camYaw = y; camPitch = p; camDist = d; }, get cur() { return cur; }, get rig() { return rig; }, get st() { return st; }, KIT, edit, select, get cast() { return cast; }, importText, renderAll, close: closeEd };
return { open: openEd, close: closeEd };

}

const ED_CSS = `#ed { position: fixed; inset: 0; z-index: 70; overflow: auto; text-align: left; user-select: text; -webkit-user-select: text; }
#ed[hidden] { display: none !important; }
#ed {--mango: #ffd203; --slate: #2f3b43; --slate-2: #37454e; --slate-3: #4b5962; --mist: #93a0a8; --paper: #fff6cf; --sweep: #dbe2de;
  --display: "Bungee", "Arial Black", Impact, sans-serif;
  --body: "Jost", "Avenir Next", "Futura", "Century Gothic", sans-serif;
  color-scheme: light; }
#ed {height: 100%; }
#ed [hidden] {display: none !important; }
#ed {margin: 0; background: var(--slate); color: var(--slate); font: 15px/1.4 var(--body); -webkit-font-smoothing: antialiased; }
#ed button, #ed input, #ed select, #ed textarea {font: inherit; color: inherit; }
#ed button {cursor: pointer; }
#ed :focus-visible {outline: 3px solid var(--mango); outline-offset: 2px; }
#ed .app {height: 100%; display: grid; grid-template-rows: auto minmax(0, 1fr); }
#ed .top {background: var(--mango); display: flex; align-items: center; justify-content: space-between; gap: 12px 20px; flex-wrap: wrap;
  padding: 12px 18px 12px; border-bottom: 3px solid var(--slate); }
#ed .lockup {display: inline-flex; flex-direction: column; align-items: flex-start; }
#ed .blk {font-family: var(--display); line-height: .95; color: var(--slate); font-size: 34px; letter-spacing: .01em; }
#ed .bar {background: var(--slate); color: var(--mango); font: 500 12px/1 var(--body); letter-spacing: .42em; text-transform: uppercase;
  padding: 7px 10px 7px 14px; margin: 3px 0 0 30px; white-space: nowrap; }
#ed .top .acts {display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
#ed .saveState {font: 600 11px var(--body); letter-spacing: .22em; text-transform: uppercase; color: var(--slate); opacity: .7; margin-right: 6px; }
#ed .btn {font: 14px/1 var(--display); background: var(--mango); color: var(--slate); border: 3px solid var(--slate); border-radius: 0;
  padding: 9px 13px 6px; transition: background .12s, color .12s, transform .12s; white-space: nowrap; }
#ed .btn:hover {background: var(--slate); color: var(--mango); }
#ed .btn.cta {background: var(--slate); color: var(--mango); }
#ed .btn.cta:hover {background: var(--mango); color: var(--slate); }
#ed .btn:disabled {opacity: .4; cursor: default; }
#ed .btn:disabled:hover {background: var(--mango); color: var(--slate); }
#ed .btn.small {font-size: 12px; padding: 7px 10px 5px; border-width: 2px; }
#ed .panel .btn {border-color: var(--mango); background: var(--slate); color: var(--mango); }
#ed .panel .btn:hover {background: var(--mango); color: var(--slate); }
#ed .panel .btn.cta {background: var(--mango); color: var(--slate); }
#ed main {display: grid; grid-template-columns: 212px minmax(0, 1fr) 372px; min-height: 0; }
#ed .cast {background: var(--mango); border-right: 3px solid var(--slate); overflow-y: auto; padding: 14px 12px 16px; display: flex; flex-direction: column; gap: 8px; min-height: 0; }
#ed .cast h2 {margin: 0 0 2px; font: 600 11px var(--body); letter-spacing: .34em; }
#ed .cast ol {list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
#ed .who {width: 100%; text-align: left; background: var(--mango); border: 3px solid var(--slate); border-radius: 0; padding: 8px 10px 7px;
  display: grid; grid-template-columns: auto 1fr; gap: 5px 8px; align-items: center; transition: transform .12s, background .12s; }
#ed .who:hover {transform: translateY(-2px); }
#ed .who b {grid-column: 1 / -1; font: 16px/1 var(--display); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#ed .who small {font: 600 9px var(--body); letter-spacing: .24em; text-transform: uppercase; opacity: .75; }
#ed .who .chips {display: flex; gap: 3px; }
#ed .who .chips i {width: 16px; height: 9px; display: block; border: 1.5px solid var(--slate); }
#ed .who.on {background: var(--slate); color: var(--mango); }
#ed .who.on .chips i {border-color: var(--mango); }
#ed .who .dot {font: 600 9px var(--body); letter-spacing: .2em; }
#ed .cast .adds {display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
#ed .stage {position: relative; min-width: 0; min-height: 0; background: var(--sweep); overflow: hidden; }
#ed .stage canvas {position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; cursor: grab; }
#ed .stage canvas:active {cursor: grabbing; }
#ed .vf {position: absolute; inset: 16px; pointer-events: none; }
#ed .vf i {position: absolute; width: 26px; height: 26px; border: 0 solid var(--slate); opacity: .55; }
#ed .vf i:nth-child(1) {left: 0; top: 0; border-width: 3px 0 0 3px; }
#ed .vf i:nth-child(2) {right: 0; top: 0; border-width: 3px 3px 0 0; }
#ed .vf i:nth-child(3) {left: 0; bottom: 0; border-width: 0 0 3px 3px; }
#ed .vf i:nth-child(4) {right: 0; bottom: 0; border-width: 0 3px 3px 0; }
#ed .plate {position: absolute; left: 30px; top: 28px; display: flex; flex-direction: column; align-items: flex-start; max-width: calc(100% - 60px); }
#ed .plate input {font: 30px/1 var(--display); color: var(--slate); background: var(--mango); border: 0; padding: 8px 12px 3px; width: 12ch; max-width: 100%; text-transform: uppercase; }
#ed .plate .bar {margin-left: 26px; }
#ed .readout {position: absolute; left: 30px; bottom: 120px; font: 600 10px var(--body); letter-spacing: .3em; color: var(--slate); opacity: .6; text-transform: uppercase; font-variant-numeric: tabular-nums; }
#ed .anim {position: absolute; left: 50%; bottom: 62px; transform: translateX(-50%); display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; width: max-content; max-width: calc(100% - 32px); }
#ed .anim .btn.on {background: var(--slate); color: var(--mango); }
#ed .dock {position: absolute; left: 16px; right: 16px; bottom: 12px; display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none; }
#ed .dock > * {pointer-events: auto; }
#ed .dock .readout, #ed .dock .anim {position: static; transform: none; }
#ed .dock .readout {align-self: flex-start; margin-left: 14px; }
#ed .tl {width: 100%; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; justify-content: center; }
#ed .tl select {font: 600 11px var(--body); letter-spacing: .08em; text-transform: uppercase; color: var(--slate); background: var(--mango); border: 2px solid var(--slate); border-radius: 0; padding: 6px 4px; max-width: 190px; }
#ed .tl .btn {min-width: 32px; text-align: center; }
#ed .tl .btn.on {background: var(--slate); color: var(--mango); }
#ed .tlbar {position: relative; flex: 1 1 100%; order: 9; height: 26px; background: var(--slate); cursor: ew-resize; touch-action: none; }
#ed .tlbar .fill {position: absolute; left: 0; top: 0; bottom: 0; background: rgba(255, 210, 3, .3); pointer-events: none; }
#ed .tlbar .head {position: absolute; top: -4px; bottom: -4px; width: 3px; margin-left: -1px; background: var(--mango); pointer-events: none; }
#ed .tlbar .key {position: absolute; top: 5px; width: 16px; height: 16px; margin-left: -8px; padding: 0; border: 3px solid var(--slate); background: var(--paper); transform: rotate(45deg) scale(.75); cursor: pointer; z-index: 2; }
#ed .tlbar .key:hover, #ed .tlbar .key:focus-visible {background: var(--mango); transform: rotate(45deg) scale(.95); outline: none; }
#ed .keymenu {position: fixed; z-index: 30; display: flex; flex-direction: column; gap: 4px; min-width: 220px; max-width: 320px; padding: 10px; background: var(--paper); border: 3px solid var(--slate); box-shadow: 6px 6px 0 var(--slate); }
#ed .keymenu header {display: flex; justify-content: space-between; align-items: center; gap: 8px; }
#ed .keymenu b {font: 600 12px var(--body); letter-spacing: .18em; color: var(--slate); }
#ed .keymenu small {font: 600 10px var(--body); letter-spacing: .12em; text-transform: uppercase; color: var(--slate); opacity: .7; margin-bottom: 4px; }
#ed .keymenu button {font: 600 11px var(--body); letter-spacing: .1em; text-align: left; padding: 7px 9px; background: var(--mango); color: var(--slate); border: 2px solid var(--slate); cursor: pointer; }
#ed .keymenu button:hover, #ed .keymenu button:focus-visible {background: var(--slate); color: var(--mango); outline: none; }
#ed .keymenu button.warn {background: var(--paper); }
#ed .keymenu button.warn:hover, #ed .keymenu button.warn:focus-visible {background: var(--slate); color: var(--paper); }
#ed .keymenu .x {padding: 2px 7px; background: none; border: 0; font-size: 14px; }
#ed .tl output {font: 600 11px var(--body); letter-spacing: .08em; min-width: 92px; text-align: right; color: var(--slate); font-variant-numeric: tabular-nums; }
#ed .tl .spd {display: flex; gap: 3px; }
#ed .docktop {width: 100%; display: flex; justify-content: space-between; align-items: flex-end; gap: 10px; }
#ed .dock .docktop .readout {margin-left: 14px; }
#ed .mode {display: flex; gap: 0; box-shadow: 5px 5px 0 var(--slate); flex: none; }
#ed .stage .zoom {position: absolute; right: 12px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; box-shadow: 5px 5px 0 var(--slate); z-index: 3; }   /* the zoom: a column down the stage's right */
#ed .stage .zoom .btn {font-size: 13px; padding: 8px 9px 5px; border-width: 3px; }
#ed .stage .zoom .btn + .btn {border-top-width: 0; }
#ed .stage .zoom .btn.on {background: var(--slate); color: var(--mango); }
#ed .mode .btn {display: inline-flex; align-items: center; gap: 8px; font-size: 16px; padding: 11px 16px 8px; border-width: 3px; }
#ed .mode .btn + .btn {border-left-width: 0; }
#ed .mode .btn.on {background: var(--slate); color: var(--mango); }
#ed .mode svg {width: 24px; height: 24px; flex: none; margin-top: -3px; }
#ed .row.keyed label::after {content: " ◆"; color: var(--mango); }
#ed .handles {position: absolute; inset: 0; pointer-events: none; }
#ed .hd {position: absolute; width: 18px; height: 18px; margin: -9px 0 0 -9px; border-radius: 50%; background: var(--mango); border: 3px solid var(--slate); box-sizing: border-box;
  pointer-events: auto; cursor: grab; touch-action: none; transition: transform .1s; box-shadow: 0 0 0 2px rgba(255, 246, 207, .7); }
#ed .hd:hover {transform: scale(1.3); }
#ed .hd.on {transform: scale(1.4); background: #fff; cursor: grabbing; }
#ed .hd.joint {width: 14px; height: 14px; margin: -7px 0 0 -7px; border-width: 2px; }
#ed .hd.sel {box-shadow: 0 0 0 2px rgba(255, 246, 207, .7), 0 0 0 5px var(--slate); }
#ed .onion {position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
#ed .onion .thread {fill: none; stroke: var(--slate); stroke-width: 2; stroke-dasharray: 2 5; stroke-linecap: round; opacity: .55; }
#ed .onion .gp, #ed .onion .gn {stroke: var(--slate); stroke-width: 2; opacity: .45; }
#ed .onion .gp {fill: none; }
#ed .onion .gn {fill: var(--mango); }
#ed .onion .me {opacity: .8; stroke-width: 2.5; }
#ed .onion .ro {fill: none; stroke: var(--slate); stroke-width: 6; stroke-linecap: round; }
#ed .onion .ri {fill: none; stroke: var(--mango); stroke-width: 3; stroke-linecap: round; }
#ed .onion .rh {fill: var(--mango); stroke: var(--slate); stroke-width: 1.5; stroke-linejoin: round; }
#ed .onion .ringhit {fill: none; stroke: transparent; stroke-width: 18; pointer-events: stroke; cursor: grab; touch-action: none; }
#ed .onion .ringhit.tw {cursor: ew-resize; }
#ed .hdtip {position: absolute; transform: translate(14px, -28px); background: var(--slate); color: var(--mango); font: 600 10px var(--body); letter-spacing: .18em; text-transform: uppercase; padding: 4px 8px; pointer-events: none; white-space: nowrap; }
#ed .tlbar .hit {position: absolute; top: 3px; bottom: 3px; background: rgba(255, 95, 168, .78); cursor: grab; z-index: 1; }   /* a hit window: when the blow can connect (the Move Maker's pink) */
#ed .tlbar .hit.on {background: #ff5fa8; box-shadow: 0 0 0 2px var(--paper); }
#ed .tlbar .hit i {position: absolute; top: 0; bottom: 0; width: 8px; cursor: ew-resize; }
#ed .tlbar .hit i.a {left: -4px; } #ed .tlbar .hit i.b {right: -4px; }
#ed .tlbar .hit i::after {content: ""; position: absolute; left: 3px; top: 3px; bottom: 3px; width: 2px; background: var(--paper); opacity: .8; }
#ed .hitbox-h {margin: 12px 0 2px; font: 600 11px var(--body); letter-spacing: .2em; color: var(--mango); }
#ed .tlbar .band {position: absolute; top: 0; bottom: 0; background: rgba(255, 246, 207, .2); border-left: 1px solid rgba(255, 246, 207, .4); border-right: 1px solid rgba(255, 246, 207, .4); pointer-events: none; }
#ed #ref {position: absolute; right: 28px; top: 28px; margin: 0; background: var(--paper); padding: 6px 6px 0; box-shadow: 6px 6px 0 var(--slate); cursor: zoom-in; max-width: 34%; }
#ed #ref img {display: block; max-width: 100%; max-height: 220px; }
#ed #ref figcaption {font: 600 9px/1 var(--body); letter-spacing: .3em; padding: 6px 2px 6px; }
#ed #ref.big {cursor: zoom-out; max-width: 60%; }
#ed #ref.big img {max-height: 70vh; }
#ed #busy {position: absolute; inset: 0; background: rgba(47, 59, 67, .78); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; text-align: center; padding: 16px; }
#ed #busy .blk {background: var(--mango); padding: 10px 16px 4px; font-size: 40px; }
#ed #busy .scan {position: relative; width: min(260px, 60%); background: var(--paper); padding: 6px; }
#ed #busy .scan img {display: block; width: 100%; max-height: 32vh; object-fit: contain; }
#ed #busy .scan::after {content: ""; position: absolute; left: 6px; right: 6px; height: 4px; background: var(--mango); box-shadow: 0 0 12px var(--mango); top: 6px; animation: edscan 1.6s ease-in-out infinite alternate; }
@keyframes edscan { to { top: calc(100% - 10px); } }
#ed .glnote {position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 16px; text-align: center; background: var(--sweep); }
#ed .glnote .blk {background: var(--mango); padding: 10px 16px 4px; font-size: 32px; }
#ed .glnote p {margin: 0; max-width: 44ch; color: var(--slate); font: 500 14px/1.5 var(--body); }
#ed #busy p {margin: 0; color: var(--paper); font: 500 12px var(--body); letter-spacing: .28em; text-transform: uppercase; max-width: 44ch; }
#ed .panel {background: var(--slate); color: var(--paper); display: flex; flex-direction: column; min-height: 0; border-left: 3px solid var(--slate); }
#ed .tabs {display: flex; flex-wrap: wrap; gap: 5px; padding: 14px 16px 10px; border-bottom: 1px solid var(--slate-3); }
#ed .tab {font: 12px/1 var(--display); background: none; color: var(--mango); border: 2px solid var(--mango); border-radius: 0; padding: 7px 9px 5px; }
#ed .tab.on, #ed .tab:hover {background: var(--mango); color: var(--slate); }
#ed .ctl {overflow-y: auto; padding: 6px 16px 20px; flex: 1; min-height: 0; }
#ed .ctl h3 {margin: 18px 0 8px; font: 600 11px var(--body); letter-spacing: .32em; text-transform: uppercase; color: var(--mango); display: flex; align-items: center; gap: 10px; }
#ed .ctl h3::after {content: ""; flex: 1; height: 1px; background: var(--slate-3); }
#ed .row {display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 0 10px; padding: 4px 0; }
#ed .row label {font: 600 11px var(--body); letter-spacing: .16em; text-transform: uppercase; color: var(--paper); user-select: none; }
#ed .row output {font: 500 12px var(--body); color: var(--mist); font-variant-numeric: tabular-nums; }
#ed .row input[type=range] {grid-column: 1 / -1; }
#ed .row.col {grid-template-columns: 1fr auto; }
#ed .row .opts {grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }
#ed .chip {font: 600 10px/1 var(--body); letter-spacing: .14em; text-transform: uppercase; background: none; color: var(--paper); border: 1.5px solid var(--slate-3); padding: 6px 8px; border-radius: 0; }
#ed .chip:hover {border-color: var(--mango); }
#ed .chip.on {background: var(--mango); color: var(--slate); border-color: var(--mango); }
#ed .chip:disabled {opacity: .35; cursor: default; border-color: var(--slate-3); }
#ed .tools {display: flex; flex-wrap: wrap; gap: 5px; margin: 10px 0 4px; }
#ed .row.changed label::before {content: "• "; color: var(--mango); }
#ed input[type=range] {-webkit-appearance: none; appearance: none; width: 100%; height: 22px; background: transparent; margin: 2px 0 0; --fill: 50%; }
#ed input[type=range]::-webkit-slider-runnable-track {height: 4px; background: linear-gradient(var(--mango), var(--mango)) 0 / var(--fill) 100% no-repeat, var(--slate-3); }
#ed input[type=range]::-webkit-slider-thumb {-webkit-appearance: none; width: 14px; height: 18px; background: var(--mango); border: 2px solid var(--slate); margin-top: -7px; border-radius: 0; }
#ed input[type=range]::-moz-range-track {height: 4px; background: var(--slate-3); border: 0; }
#ed input[type=range]::-moz-range-progress {height: 4px; background: var(--mango); }
#ed input[type=range]::-moz-range-thumb {width: 11px; height: 15px; background: var(--mango); border: 2px solid var(--slate); border-radius: 0; }
#ed input[type=color] {-webkit-appearance: none; appearance: none; width: 44px; height: 26px; padding: 0; border: 2px solid var(--paper); background: none; cursor: pointer; }
#ed input[type=color]::-webkit-color-swatch-wrapper {padding: 0; }
#ed input[type=color]::-webkit-color-swatch {border: 0; }
#ed input[type=color]::-moz-color-swatch {border: 0; }
#ed .tog {position: relative; width: 38px; height: 20px; -webkit-appearance: none; appearance: none; background: var(--slate-3); border: 0; cursor: pointer; margin: 0; }
#ed .tog::after {content: ""; position: absolute; left: 3px; top: 3px; width: 14px; height: 14px; background: var(--paper); transition: transform .12s; }
#ed .tog:checked {background: var(--mango); }
#ed .tog:checked::after {transform: translateX(18px); background: var(--slate); }
#ed .card {border: 1.5px solid var(--slate-3); padding: 6px 10px 8px; margin: 8px 0; }
#ed .card header {display: flex; align-items: center; gap: 8px; }
#ed .card header b {font: 12px/1 var(--display); color: var(--mango); flex: 1; }
#ed .card header button {background: none; border: 0; color: var(--mist); font: 600 13px var(--body); padding: 2px 4px; }
#ed .card header button:hover {color: var(--mango); }
#ed .addrow {display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0 2px; align-items: center; }
#ed .addrow span {font: 600 10px var(--body); letter-spacing: .2em; color: var(--mist); margin-right: 4px; }
#ed .swatches {display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
#ed .sw {display: grid; grid-template-columns: auto 1fr; gap: 8px; align-items: center; border: 1.5px solid var(--slate-3); padding: 6px; }
#ed .sw span {font: 500 11px/1.25 var(--body); color: var(--paper); min-width: 0; }
#ed .sw span em {display: block; font-style: normal; color: var(--mist); font-size: 10px; letter-spacing: .06em; }
#ed .note {color: var(--mist); font: 400 13px/1.45 var(--body); margin: 8px 0; max-width: 60ch; }
#ed .ask {border-top: 1px solid var(--slate-3); padding: 12px 16px; display: grid; gap: 8px; }
#ed .ask textarea {background: var(--slate-2); border: 1.5px solid var(--slate-3); color: var(--paper); padding: 8px 10px; resize: vertical; min-height: 38px; font-size: 14px; }
#ed .ask textarea::placeholder {color: var(--mist); }
#ed .ask .line {display: flex; gap: 8px; align-items: center; justify-content: space-between; }
#ed .ask small {color: var(--mist); font-size: 11px; }
#ed .foot {display: flex; gap: 6px; flex-wrap: wrap; padding: 10px 16px 14px; border-top: 1px solid var(--slate-3); }
#ed .modal {position: fixed; inset: 0; background: rgba(47, 59, 67, .62); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 20; }
#ed .sheet {background: var(--mango); box-shadow: 10px 10px 0 var(--slate); width: min(620px, 100%); max-height: calc(100% - 32px); overflow-y: auto; padding: 24px 24px 20px; }
#ed .sheet .blk {font-size: 40px; }
#ed .sheet .bar {margin-bottom: 18px; }
#ed .sheet p {margin: 0 0 12px; max-width: 60ch; }
#ed .sheet .btns {display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
#ed .drop {border: 3px dashed var(--slate); padding: 22px 16px; text-align: center; background: var(--paper); cursor: pointer; display: grid; gap: 8px; justify-items: center; }
#ed .drop.over {background: #fff; }
#ed .drop img {max-height: 220px; max-width: 100%; display: block; }
#ed .drop b {font: 18px var(--display); }
#ed .drop small {font: 600 11px var(--body); letter-spacing: .2em; text-transform: uppercase; }
#ed .sheet label.lbl {display: block; font: 600 11px var(--body); letter-spacing: .24em; text-transform: uppercase; margin: 14px 0 6px; }
#ed .sheet textarea, #ed .sheet input[type=text] {width: 100%; box-sizing: border-box; background: var(--paper); border: 3px solid var(--slate); padding: 8px 10px; font-size: 14px; color: var(--slate); }
#ed .sheet textarea.code {font: 12px/1.45 ui-monospace, "SF Mono", Menlo, monospace; min-height: 220px; }
#ed .seg {display: flex; flex-wrap: wrap; gap: 6px; }
#ed .seg .chip {color: var(--slate); border-color: var(--slate); font-size: 11px; padding: 8px 10px; }
#ed .seg .chip.on {background: var(--slate); color: var(--mango); }
#ed .err {background: var(--slate); color: var(--mango); padding: 8px 12px; font: 600 12px var(--body); letter-spacing: .08em; margin-top: 10px; }
#ed #edToast {position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); background: var(--slate); color: var(--mango); font: 600 12px var(--body);
  letter-spacing: .22em; text-transform: uppercase; padding: 10px 18px; opacity: 0; transition: opacity .3s; pointer-events: none; z-index: 30; max-width: calc(100% - 32px); text-align: center; }
#ed #edToast.show {opacity: 1; }
@media (max-width: 960px) {
#ed .app {height: auto; min-height: 100%; }
#ed main {grid-template-columns: minmax(0, 1fr); }
#ed .stage {order: 1; height: 62vh; min-height: 360px; }
#ed .cast {order: 2; border-right: 0; border-block: 3px solid var(--slate); overflow-x: auto; overflow-y: visible; }
#ed .cast ol {flex-direction: row; }
#ed .who {width: 150px; }
#ed .cast .adds {flex-direction: row; flex-wrap: wrap; }
#ed .panel {order: 3; border-left: 0; }
#ed .ctl {overflow: visible; }
#ed .blk {font-size: 28px; }
#ed .plate input {font-size: 22px; }
#ed #ref {max-width: 30%; }
#ed #ref img {max-height: 140px; }
#ed .readout {bottom: 116px; }
#ed .tl {flex-wrap: wrap; }
#ed .tl select {max-width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
#ed #busy .scan::after {animation: none; top: 50%; }
#ed .who, #ed .btn {transition: none; }
}
#ed .stage.villain .anim, #ed .stage.villain .tl, #ed .stage.villain #modeSeg {display: none; }
`;
const ED_MARKUP = `<div class="app">
  <header class="top">
    <div class="lockup"><div class="blk">BERRY BLADE</div><div class="bar">Character Editor</div></div>
    <div class="acts">
      <span class="saveState" id="saveState"></span>
      <button class="btn cta" id="bNew">NEW FROM PICTURE</button>
      <button class="btn" id="bImport">IMPORT</button>
      <button class="btn" id="bExport">EXPORT</button>
      <button class="btn" id="edBack">BACK TO GAME</button>
    </div>
  </header>
  <main>
    <aside class="cast" aria-label="Cast">
      <h2>THE CAST</h2>
      <ol id="cast"></ol>
      <div class="adds">
        <button class="btn small" id="bNew2">+ FROM PICTURE</button>
        <button class="btn small" id="bDup2">+ COPY OF THIS ONE</button>
      </div>
    </aside>
    <section class="stage" id="stage">
      <canvas id="view" aria-label="3D preview. Drag to turn, scroll to zoom."></canvas>
      <div class="zoom" id="zoomSeg" role="group" aria-label="Zoom, and the part to look at">
        <button class="btn small" data-z="in" title="Zoom in (scroll or pinch too)" aria-label="Zoom in">+</button><button class="btn small" data-z="out" title="Zoom out (scroll or pinch too)" aria-label="Zoom out">−</button>
        <button class="btn small on" data-f="all">ALL</button><button class="btn small" data-f="head">HEAD</button><button class="btn small" data-f="arms">ARMS</button><button class="btn small" data-f="legs">LEGS</button><button class="btn small" data-f="feet">FEET</button>
      </div>
      <div class="vf"><i></i><i></i><i></i><i></i></div>
      <div class="handles" id="handles" hidden><svg class="onion" aria-hidden="true"><g id="ghosts"></g><g id="ring" display="none"><path class="ro"/><path class="ro"/><path class="ri"/><path class="ri"/><polygon class="rh"/><polygon class="rh"/><ellipse class="ringhit"/></g></svg></div>
      <div class="plate"><input id="name" maxlength="14" aria-label="Character name" spellcheck="false"><div class="bar" id="kindBar">HERO</div></div>
      <figure id="ref" hidden><img alt="Reference drawing"><figcaption>REFERENCE</figcaption></figure>
      <div class="dock">
      <div class="docktop"><div class="readout" id="readout"></div>
        <div class="mode" id="modeSeg" role="group" aria-label="What dragging on the stage does (F switches)">
          <button class="btn small on" data-m="cam" title="View mode (F): drag to turn the camera"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12a7 7 0 1 1-2.1-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M17.6 2.8v4.6h-4.6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="2.3" fill="currentColor"/></svg>VIEW</button><button class="btn small" data-m="pose" title="Pose mode (F): drag the yellow dots to move hands, feet, hips, the middle of the back and head"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M3 12h18M12 3 9.2 5.8M12 3l2.8 2.8M12 21l-2.8-2.8M12 21l2.8-2.8M3 12l2.8-2.8M3 12l2.8 2.8M21 12l-2.8-2.8M21 12l-2.8 2.8" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>POSE</button>
        </div>
      </div>
      <div class="anim" id="anim">
        <button class="btn small on" data-a="idle">IDLE</button><button class="btn small" data-a="run">RUN</button><button class="btn small" data-a="dash">SPRINT</button>
        <button class="btn small" data-a="jump">JUMP</button><button class="btn small" data-a="attack">ATTACK</button>
        <button class="btn small" data-a="air">AIR ATTACK</button><button class="btn small" data-a="hurt">HURT</button><button class="btn small" data-a="block">BLOCK</button>
        <button class="btn small" id="bTurn" aria-pressed="false">TURNTABLE</button>
      </div>
      <div class="tl" id="tl">
        <select id="tlMove" aria-label="Move to play on the timeline"></select>
        <button class="btn small" id="tlPlay" aria-label="Pause">❚❚</button>
        <button class="btn small" id="tlPrev" aria-label="Back one frame">◀</button><button class="btn small" id="tlNext" aria-label="Forward one frame">▶</button>
        <div class="tlbar" id="tlBar" aria-label="Timeline: drag to scrub"><div class="fill" id="tlFill"></div><div class="band" id="tlBand" hidden></div><div id="tlHits"></div><div id="tlKeys"></div><div class="head" id="tlHead"></div></div>
        <output id="tlTime">LOOP</output>
        <div class="spd" id="tlSpd"><button class="btn small on" data-s="1">1×</button><button class="btn small" data-s=".5">½×</button><button class="btn small" data-s=".25">¼×</button><button class="btn small" data-s=".1">⅒×</button></div>
      </div>
      </div>
      <div id="gl" class="glnote" hidden><div class="lockup"><div class="blk" id="glT">PREVIEW PAUSED</div><div class="bar">3D STAGE</div></div><p id="glP"></p></div>
      <div id="busy" hidden>
        <div class="lockup"><div class="blk" id="busyT">READING</div><div class="bar" id="busyB">YOUR DRAWING</div></div>
        <div class="scan" id="busyScan"><img alt=""></div>
        <p id="busyP">Claude is studying the shapes and colors</p>
        <button class="btn" id="bStop">STOP</button>
      </div>
    </section>
    <aside class="panel" aria-label="Controls">
      <nav class="tabs" id="tabs"></nav>
      <div class="ctl" id="ctl"></div>
      <div class="ask" id="ask" hidden>
        <textarea id="askText" rows="2" placeholder="Ask Claude for a change, e.g. longer pigtails, darker boots, a star on the shirt"></textarea>
        <div class="line"><small>Sliders stay exact. Claude edits the same values.</small><button class="btn small cta" id="bAsk">ASK CLAUDE</button></div>
      </div>
      <div class="foot">
        <button class="btn small" id="bUndo">UNDO</button><button class="btn small" id="bRedo">REDO</button>
        <button class="btn small" id="bReset">RESET</button><button class="btn small" id="bDup">DUPLICATE</button>
        <button class="btn small" id="bDel">DELETE</button>
      </div>
    </aside>
  </main>
</div>

<div class="modal" id="mNew" hidden><div class="sheet" role="dialog" aria-labelledby="mNewT">
  <div class="lockup"><div class="blk" id="mNewT">NEW HERO</div><div class="bar">FROM A PICTURE</div></div>
  <div class="drop" id="drop" tabindex="0"><img id="dropImg" alt="" hidden><b id="dropB">DROP A DRAWING HERE</b><small id="dropS">or click to choose · paste works too</small></div>
  <input type="file" id="fileImg" accept="image/png,image/jpeg,image/webp,image/gif" hidden>
  <label class="lbl">Body type</label>
  <div class="seg" id="baseSeg"><button class="chip on" data-b="">LET CLAUDE DECIDE</button><button class="chip" data-b="human">HERO · HUMAN</button><button class="chip" data-b="cat">CREATURE · LIKE TOCSIN</button></div>
  <label class="lbl" for="newNote">Notes for Claude (optional)</label>
  <textarea id="newNote" rows="2" placeholder="Name, personality, how they move: e.g. Pip, a nervous rabbit thief, quick and bouncy"></textarea>
  <div id="newErr" class="err" hidden></div>
  <div id="newOffline" hidden>
    <p class="note" style="color:var(--slate)">Reading pictures needs the game running on claude.ai. In this offline copy, copy the prompt, paste it into a Claude chat with your drawing, then import the JSON it gives back.</p>
  </div>
  <div class="btns"><button class="btn cta" id="bMake" disabled>MAKE CHARACTER</button><button class="btn" id="bCopyPrompt">COPY PROMPT</button><button class="btn" data-close>CANCEL</button></div>
</div></div>

<div class="modal" id="mExport" hidden><div class="sheet" role="dialog" aria-labelledby="mExpT">
  <div class="lockup"><div class="blk" id="mExpT">EXPORT</div><div class="bar" id="mExpB">CHARACTER FILE</div></div>
  <div class="seg" id="expSeg"><button class="chip on" data-x="one">THIS CHARACTER</button><button class="chip" data-x="all">WHOLE CAST</button></div>
  <label class="lbl" for="expText">Character data</label>
  <textarea id="expText" class="code" readonly></textarea>
  <p class="note" style="color:var(--slate);margin-top:10px">Your edits already save into Berry Blade, so export is for backups and sharing: on the character select screen, <b>I</b> loads a file back in. To use a character in another game, include <b>charkit.js</b> and load the file.</p>
  <div class="btns"><button class="btn cta" id="bSave">SAVE .JSON</button><button class="btn" id="bCopy">COPY</button><button class="btn" data-close>DONE</button></div>
</div></div>

<div class="modal" id="mImport" hidden><div class="sheet" role="dialog" aria-labelledby="mImpT">
  <div class="lockup"><div class="blk" id="mImpT">IMPORT</div><div class="bar">CHARACTER FILES</div></div>
  <p>Load a <b>.json</b> exported from this editor, or one Claude wrote for you. A character with the same name as one in the cast replaces it.</p>
  <input type="file" id="fileJson" accept=".json,application/json" multiple hidden>
  <div class="btns" style="margin-top:0"><button class="btn cta" id="bPickJson">CHOOSE FILE</button></div>
  <label class="lbl" for="impText">Or paste JSON</label>
  <textarea id="impText" class="code" style="min-height:140px" placeholder='{ "format": "starky.character", ... }'></textarea>
  <div id="impErr" class="err" hidden></div>
  <div class="btns"><button class="btn" id="bImpGo">IMPORT PASTED</button><button class="btn" data-close>CANCEL</button></div>
</div></div>

<div class="modal" id="mConfirm" hidden><div class="sheet" role="dialog" aria-labelledby="mConT">
  <div class="lockup"><div class="blk" id="mConT">SURE?</div><div class="bar" id="mConB"></div></div>
  <p id="mConP"></p>
  <div class="btns"><button class="btn cta" id="bConYes">YES</button><button class="btn" data-close>CANCEL</button></div>
</div></div>
<div class="modal" id="mClose" hidden><div class="sheet" role="dialog" aria-labelledby="mCloseT">
  <div class="lockup"><div class="blk" id="mCloseT">SAVE CHANGES?</div><div class="bar" id="mCloseB"></div></div>
  <p id="mCloseP"></p>
  <div class="btns"><button class="btn cta" id="bApply">APPLY TO THE GAME</button><button class="btn" id="bSaveFile">SAVE AS A FILE</button><button class="btn" id="bDiscard">DISCARD</button><button class="btn" data-close>KEEP EDITING</button></div>
  <p class="note" style="color:var(--slate);margin-top:12px">Until you choose, your edits are kept as a draft in this browser, so nothing is lost if the page closes.</p>
</div></div>
<div id="edToast" role="status"></div>`;
})();
