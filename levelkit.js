// LEVEL KITS (only with ?heromodel, 2026-11-20): the level modelling chat's pieces (models/levels/: platforms, ladders and the rope bridge, plants, big trees;
// models/levels/HANDOFF-level-kits.md) laid where the game's own pieces stand. A part is [{ col, geo, mat }] (index.html kitParts: the phone's lighter shape on the phone).
// A layout is a list of { parts, m4, op } (op as clayroom.js kitLay), made into a vertex-coloured mesh or two, marked done so the clay pass leaves it be.
window.BerryLevelKit = (function () {
  "use strict";
  const at = (T, x, y, z, o = {}) => new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(o.rx || 0, o.ry || 0, o.rz || 0)), new T.Vector3(o.sx ?? o.s ?? 1, o.sy ?? o.s ?? 1, o.sz ?? o.s ?? 1));
  function group(T, o, items, name) {                 // items → one group, done (the clay pass skips it)
    const B = new Map(); items.forEach(it => it && it.parts && window.BerryClayRoom.kitLay(T, B, it.parts, it.m4, it.op || {}));
    const g = window.BerryClayRoom.meshes(T, o, B, name); g.userData.clayDone = true; g.traverse(m => { m.userData.clayDone = true; }); return g; }
  function run(T, out, xa, xb, y, z, l, mid, r, el, er, ml, o = {}) {   // a left end, middles stretched to fit, a right end; mid: parts, or i → parts (o: sz, op)
    const w = xb - xa; let k = 1, inner = w - el - er; if (inner < ml * .5) { k = w / (el + er + ml * .5); inner = ml * .5 * k; }   // (too short for a middle: all of it squeezed)
    const n = Math.max(1, Math.round(inner / (ml * k))), sm = inner / (n * ml), sz = o.sz ?? 1, op = o.op;
    if (l) out.push({ parts: l, m4: at(T, xa + el * k, y, z, { sx: k, sz }), op });
    for (let i = 0; i < n; i++) { const p = typeof mid === "function" ? mid(i) : mid; out.push({ parts: p, m4: at(T, xa + el * k + (i + .5) * ml * sm, y, z, { sx: sm, sz }), op }); }
    if (r) out.push({ parts: r, m4: at(T, xb - er * k, y, z, { sx: k, sz }), op });
    return out; }
  const tile = (T, out, xa, xb, y, z, parts, len, o = {}) => run(T, out, xa, xb, y, z, null, parts, null, 0, 0, len, o);   // (a run of one repeating piece)

  // ── platforms (clayroom.js dress for the woods' plain ones; buildBeach for the Beach's): the top flat at the room's own line
  function slab(T, K, out, xa, xb, top, z = 0) { return run(T, out, xa, xb, top, z, K.slab.l, K.slab.m, K.slab.r, .6, .6, 3); }
  function shroom(T, K, out, xa, xb, top, foot) {     // a great leaf on its stalk, curving down to the ground (foot: the ground's y, or null over a pit)
    const w = xb - xa, cx = (xa + xb) / 2, sx = (w + .6) / 5.8, sz = Math.min(1.25, Math.max(.8, sx));
    out.push({ parts: K.shroom.leaf, m4: at(T, cx - .4 * sx, top, 0, { sx, sz }) });
    out.push({ parts: K.shroom.stalk, m4: at(T, cx - .13, top - .05, -.1, { sx: Math.min(1, sx), sy: Math.max(.4, (top - (foot ?? top - 7)) / 3.74) }) }); return out; }
  function log(T, K, out, xa, xb, top) { run(T, out, xa, xb, top, 0, K.log.l, K.log.m, K.log.r, .43, .43, 2); out.push({ parts: K.log.br, m4: at(T, xa + (xb - xa) * .62, top - .2, 0) }); return out; }
  function jut(T, K, out, xa, xb, top, endRight) {    // the land of the row above jutting out over the path: tiles of 10, the ragged end at its free end
    tile(T, out, endRight ? xa - 4 : xa + .9, endRight ? xb - .9 : xb + 4, top, 0, K.jut.m, 10);
    out.push({ parts: K.jut.e, m4: at(T, endRight ? xb - .9 : xa + .9, top, 0, { sx: endRight ? 1 : -1 }) }); return out; }

  // ── ladders: a foot, sections of three rungs stacked to the climb, the top hooked over the lip (rope: the rope ladder's sections)
  function ladder(T, K, out, x, y0, y1, z, rope, sx = .9) {
    const L = K.ladder, len = y1 - y0 - .72, n = Math.max(1, Math.round(len / 1.08)), sy = Math.max(.3, len / (n * 1.08));
    out.push({ parts: L.foot, m4: at(T, x, y0, z, { sx }) });
    for (let i = 0; i < n; i++) out.push({ parts: rope ? L.rope : L.section, m4: at(T, x, y0 + .36 + i * 1.08 * sy, z, { sx, sy }) });
    out.push({ parts: L.top, m4: at(T, x, y1, z, { sx }) }); return out; }
  function bridge(T, K, out, x0, x1, top, postL, postR) {   // the rope bridge: segments along it, posts where an end's in the room
    const B = K.bridge, len = x1 - x0, n = Math.max(1, Math.round(len / 1.1)), sx = len / (n * 1.1);
    for (let i = 0; i < n; i++) out.push({ parts: B.seg, m4: at(T, x0 + (i + .5) * 1.1 * sx, top, 0, { sx }) });   // (flat, no sag: the game's bridge is a straight line you walk on)
    if (postL) out.push({ parts: B.l, m4: at(T, x0, top, 0) }); if (postR) out.push({ parts: B.r, m4: at(T, x1, top, 0) }); return out; }

  // ── the woods' set pieces (index.html buildSet: its own built first, then put away for these). c: { X, Y, gy (the room's ground under it), base }
  function giant(T, K, out, P, x, gy, z) {
    const G = K.giant, part = P.part || "trunk";
    if (part === "roots") { out.push({ parts: G.roots, m4: at(T, x, gy, z) }); out.push({ parts: G.trunk, m4: at(T, x, gy + 11, z) }); }
    else if (part === "top") { out.push({ parts: G.trunk, m4: at(T, x, gy - 11, z) }); out.push({ parts: G.top, m4: at(T, x, gy, z) }); }
    else for (let y = gy - 11; y < gy + 22; y += 11) out.push({ parts: G.trunk, m4: at(T, x, y, z) });
    return out; }
  function ceiba(T, K, out, P, x, base, z, gy) {     // its foot on the ground, its trunk stacked up to the crown (made at 1: the rooms' ceibas at 1.3, as the game's 1.6)
    const C = K.ceiba, k = 1.3 * (P.scale ?? 1.6) / 1.6, top = base + (P.h ?? 14) * (P.scale ?? 1.6), foot = base > gy - 1;   // (foot: its foot's in this room)
    let y = base; if (foot) { out.push({ parts: C.foot, m4: at(T, x, base, z, { s: k }) }); y += 11 * k; }
    const len = Math.max(0, top - y), n = Math.max(1, Math.ceil(len / (11 * k) - .25)), sy = len / (n * 11);
    for (let i = 0; i < n && len > .5; i++) out.push({ parts: C.trunk, m4: at(T, x, y + i * 11 * sy, z, { sx: k, sy, sz: k }) });
    if (P.crown !== false) { const ck = k * Math.min(1.4, P.crownK ?? 1); out.push({ parts: C.crown, m4: at(T, x, top, z, { s: ck }), op: P.bloom ? { recol: { BloomP: P.bloom, BloomO: P.bloom } } : null }); }
    return out; }
  function leaner(T, K, out, P, x, gy, z) {          // the leaning tree: each row's part 2.6 further east every 11 up
    const L = K.leaner, part = P.part, sec = y => ({ parts: L.section, m4: at(T, x + (y - gy) * 2.6 / 11, y, z) });
    if (part === "foot") { out.push({ parts: L.foot, m4: at(T, x, gy, z) }); out.push(sec(gy + 11)); }
    else if (part === "mid" || part === "lean") { out.push(sec(gy - 4)); out.push(sec(gy + 7)); }
    else if (part === "top") { out.push(sec(gy - 11)); out.push({ parts: L.top, m4: at(T, x, gy, z) }); }
    else if (part === "peek") out.push({ parts: L.peek, m4: at(T, x - 1.2, gy - .2, -3.2) });
    else return null;                                  // (its boughs in front and its far roots: the top has its boughs; the far roots stay the game's)
    return out; }
  function tall(T, K, out, P, x, gy, z, crownY) {     // the tall tree: two trunk sections to its 24, its crown of great leaves on top
    const L = K.tall, b0 = P.part === "crown" ? crownY - 22 : gy - .5, b1 = P.part === "crown" ? crownY : gy + 24, sy = (b1 - b0) / 22;
    out.push({ parts: L.trunk, m4: at(T, x, b0, z, { sy }) }); out.push({ parts: L.trunk, m4: at(T, x, b0 + 11 * sy, z, { sy }) });
    if (P.part === "crown") out.push({ parts: L.crown, m4: at(T, x, b1 - .2, z) }); return out; }
  function willow(T, K, out, P, x, gy, z) { const sx = (P.spread ?? 7.5) / 12.5, sy = (P.h ?? 9) / 7.4;
    out.push({ parts: K.willow.tree, m4: at(T, x, gy, z, { sx, sy, sz: sx }) }); out.push({ parts: K.willow.shade, m4: at(T, x, gy + .03, .2, { sx, sz: Math.min(1, sx) }), op: { nc: true } }); return out; }
  function maga(T, K, out, P, x, gy, z) { out.push({ parts: K.maga.tree, m4: at(T, x, gy, z, { s: (P.h ?? 4.2) / 4.2 }) }); return out; }
  function stand(T, K, out, x0, x1, top, gy) {        // B8's stand: bays of posts and braces under the bridge, stretched down to the ground
    const n = Math.max(1, Math.round((x1 - x0) / 4.25)), sx = (x1 - x0) / (n * 4.25), sy = Math.max(.3, (top - gy) / 3.5);
    for (let i = 0; i < n; i++) out.push({ parts: K.stand.bay, m4: at(T, x0 + (i + .5) * 4.25 * sx, top - .2, 0, { sx, sy }) }); return out; }
  function shelf(T, K, out, cx, top, w) { out.push({ parts: K.giant.shelf, m4: at(T, cx, top, -.7, { sx: (w + .4) / 3.47, sz: 1.9 / 1.78 }) }); return out; }

  // ── the Beach's platforms (buildBeach: the same room numbers; g(x): the sand's top there). Wood from the wood set, rock from the rock arch's
  const ext = parts => { if (parts.ext) return parts.ext; let b = null; parts.forEach(({ geo }) => { geo.computeBoundingBox(); b = b ? b.union(geo.boundingBox) : geo.boundingBox.clone(); }); return (parts.ext = b); };   // (a part's extent, once)
  function posts(T, W, out, xs, zs, top, g, stout) { xs.forEach(px => zs.forEach(z => { const h = top - .38 - g(px); if (h > .1) out.push({ parts: stout ? W.stout : W.post, m4: at(T, px, top - .38, z, { sy: h / 4 }) }); })); }
  function planks(T, W, out, xa, xb, top, z = 0, sz = 1) { return run(T, out, xa, xb, top, z, W.l, W.m, W.r, .61, .61, 2.2, { sz }); }
  function beachPlat(T, K, out, p, g) {               // p: { kind, xa, xb, top }; false: a kind the kits haven't
    const { kind, xa, xb, top } = p, w = xb - xa, cx = (xa + xb) / 2, W = K.wood;
    if (kind === "rock" && K.rock) { run(T, out, xa, xb, top, 0, K.rock.l, K.rock.m, K.rock.r, .6, .6, 2);
      [-1, 1].forEach(sd => [-.85, .85].forEach(z => { const lx = cx + sd * (w / 2 - .45), h = top - .4 - g(lx); if (h > .1) out.push({ parts: K.rock.leg, m4: at(T, lx, top - .4, z, { sy: h / 3 }) }); })); }
    else if (kind === "drift" && K.log && K.boulder) { run(T, out, xa, xb, top, 0, K.log.l, K.log.m, K.log.r, .43, .43, 2); out.push({ parts: K.log.br, m4: at(T, cx + w * .3, top - .2, .3) });
      [-1, 1].forEach((sd, i) => { const bx = cx + sd * (w / 2 - .5), h = top - .55 - g(bx), B = K.boulder[i + 1], e = ext(B); if (h > .05) out.push({ parts: B, m4: at(T, bx, g(bx) - .05, 0, { sy: (h + .1) / Math.max(.2, e.max.y) }) }); }); }
    else if (kind === "boat" && K.boat && W) { const sx = w * .9 / 4.9; out.push({ parts: K.boat.boat, m4: at(T, cx, top, 0, { sx }) }); posts(T, W, out, [cx - w * .32, cx + w * .32], [-.75, .75], top - 1.1, g); }
    else if (kind === "plank" && W) { planks(T, W, out, xa, xb, top); const n = Math.max(1, Math.ceil((w - .6) / 9)), xs = [];
      for (let j = 0; j <= n; j++) xs.push(xa + .3 + (w - .6) * j / n); posts(T, W, out, xs, [-.9, .9], top, g); xs.forEach(px => out.push({ parts: W.beam, m4: at(T, px, top - .38, 0) })); }
    else if (kind === "tee" && W) { planks(T, W, out, xa, xb, top); posts(T, W, out, [cx], [0], top, g, true);
      [-1, 1].forEach(sd => out.push({ parts: W.brace, m4: at(T, cx + sd * .3, top - 1.15, .25, { rz: sd > 0 ? .62 : Math.PI - .62, sx: .8 }) })); }
    else if (kind === "shelf" && K.shelf) { out.push({ parts: K.shelf.root, m4: at(T, xa, top, 0) }); tile(T, out, xa + 2, xb - 1.2, top, 0, K.shelf.m, 2); out.push({ parts: K.shelf.e, m4: at(T, xb - 1.2, top, 0) }); }
    else if (kind === "tower" && K.tower && W) { const Tw = K.tower, gy = g(cx), hh = top - gy, x0 = xa, x1 = xb;
      out.push({ parts: Tw.deck, m4: at(T, cx, top, -.9, { sx: (w + .4) / 9 }) });
      [x0 + .5, x1 - .5].forEach(lx => [-2.6, .8].forEach(z => out.push({ parts: Tw.leg, m4: at(T, lx, top - .2, z, { sy: (top - .2 - g(lx)) / 7.5 }) })));
      for (let j = 0; j < 2; j++) out.push({ parts: Tw.brace, m4: at(T, cx, gy + j * hh / 2, -2.45, { sx: x1 - x0 - 1, sy: hh / 2 - .2 }) });
      out.push({ parts: Tw.tank, m4: at(T, x0 + 2.1, top, -2.05) }); out.push({ parts: Tw.roof, m4: at(T, x0 + 2.1, top + 2.3, -2.05) }); tile(T, out, x0 - .1, x1 + .1, top, -1.8, W.rail, 2.2); }
    else if (kind === "lookout" && K.lookout && W) { const Lk = K.lookout, gy = g(cx), hh = top - gy, sx = (w + .3) / 5.25;
      out.push({ parts: Lk.deck, m4: at(T, cx, top, -.3, { sx }) }); out.push({ parts: Lk.roof, m4: at(T, cx, top, -.28, { sx }) });
      [xa + .35, xb - .35].forEach(lx => [-1.6, 1].forEach(z => out.push({ parts: Lk.leg, m4: at(T, lx, top - .2, z, { sy: (top - .2 - g(lx)) / 10.75 }) })));
      if (K.tower) for (let j = 0; j < 3; j++) out.push({ parts: K.tower.brace, m4: at(T, cx, gy + j * hh / 3, -1.45, { sx: w - .7, sy: hh / 3 - .15 }) });
      tile(T, out, xa - .15, xb + .15, top, -.65, W.rail, 2.2); }
    else return false;
    return out; }

  return { at, ext, group, run, tile, slab, shroom, log, jut, ladder, bridge, giant, ceiba, leaner, tall, willow, maga, stand, shelf, beachPlat };
})();
