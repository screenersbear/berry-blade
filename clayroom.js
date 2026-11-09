// CLAY: the clay mockup's set (mockups/clay; .claude/berry-tools/wip/clay_mockup.js), built for the game in rounded, lumpy pieces of the game's own toon()
// materials, so CLAY LOOK's shader lights them; merged by colour into a few dozen meshes. Units: 40 px each; a room's ground at y 0, the characters at z 0.
// · build(): the CLAY TEST ROOM (the user, 2026-11-09: "can you do one screen where you make all the appropriate changes but also build the background and floor
//   and world to match the mockup ... make it a clay test room in the main menu so we can go right to it"): the mockup's own picture, round the room's middle
// · dress(): a Berry Woods room in clay, from its own layout (the user, 2026-11-09: "this will be the direction we're going to use for the game ... can we build
//   the berry woods like this and have it be just in the menu as the clay test world?"): its floor and pits, its platforms and the land overhead, a back bank (or
//   the ravine's wall), and the woods round about. What repeats (bricks, bushes, flowers, bamboo, the far hills) is made once and stamped, so a room's quick to build
// The meshes that cast clay shadows and creases have o.layer too; materials (and the stamped far pieces' shapes) are kept between rooms: userData.keepMat / keepGeo
window.BerryClayRoom = (function () {
  "use strict";
  const hsh = (i, j, k, s) => { let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1440662683) ^ Math.imul(s, 2246822519); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967295; };
  const L = (a, b, t) => a + (b - a) * t;
  function vn(x, y, z, s = 0) { const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), fx = x - i, fy = y - j, fz = z - k, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
    return L(L(L(hsh(i, j, k, s), hsh(i + 1, j, k, s), u), L(hsh(i, j + 1, k, s), hsh(i + 1, j + 1, k, s), u), v), L(L(hsh(i, j, k + 1, s), hsh(i + 1, j, k + 1, s), u), L(hsh(i, j + 1, k + 1, s), hsh(i + 1, j + 1, k + 1, s), u), v), w) * 2 - 1; }
  const fbm = (x, y, z, s = 0, o = 3) => { let a = .5, t = 0, f = 1; for (let n = 0; n < o; n++) { t += a * vn(x * f, y * f, z * f, s + n * 17); f *= 2.1; a *= .5; } return t; };
  const P = { grass: "#3fb43f", grass2: "#55c94a", earth: ["#b8472a", "#c65b2c", "#d4733a", "#c2512b", "#dd8a45", "#a83f27"], red: "#e2262a", yel: "#ffd43a", leaf: "#3aa648", leafD: "#2b8c3d",
    trunk: "#8a4624", bamboo: "#bfe08c", bambooD: "#97c56b", berryR: "#d81f4f", berryB: "#3b4fd6", berryP: "#7b2fbf", cream: "#fff6e2", dirt: "#a5492a",
    soil: "#a84f2d", soilL: "#c66c39", soilD: "#7d3923", soilT: "#d98c4b", root: "#dba26c", rootD: "#b27a4a" };   // (the woods' earth: soil, its bands, the roots in it)
  const BCOLS = [[P.leaf, "#4cbf4c", P.leafD], ["#3fb14a", P.leafD, "#55c450"], [P.leaf, P.grass2, P.leafD], [P.leaf, P.leafD]], BBER = [[P.berryB, P.berryP], P.berryR, [P.berryR, P.berryB], P.berryR];

  // ── the kit: clay pieces put together in a group (W), each mesh tagged with its colour and whether it casts
  function Kit(T, o) {
    const W = new T.Group(), OX = o.wx ?? 0;   // (OX: where the room lies in the world, so the ground of rooms side by side meets in one piece)
    const hex = c => "#" + (c && c.isColor ? c : new T.Color(c)).getHexString();
    function weld(geo) {   // vertices at one place made one, so the dents and the light run on smooth over a shape's seams (keyed by number: three's mergeVertices keys by text, ~3x slower)
      const p = geo.attributes.position.array, n = p.length / 3, idx = geo.index ? geo.index.array : null, map = new Map(), rem = new Uint32Array(n), out = []; let u = 0;
      for (let i = 0; i < n; i++) { const x = Math.round(p[i * 3] * 1e4), y = Math.round(p[i * 3 + 1] * 1e4), z = Math.round(p[i * 3 + 2] * 1e4), k = (x * 73856093) ^ (y * 19349663) ^ (z * 83492791);
        const l = map.get(k); let hit = -1;
        if (l !== undefined) { if (typeof l === "number") { if (out[l * 3] === x && out[l * 3 + 1] === y && out[l * 3 + 2] === z) hit = l; } else for (const j of l) if (out[j * 3] === x && out[j * 3 + 1] === y && out[j * 3 + 2] === z) { hit = j; break; } }
        if (hit < 0) { hit = u++; out.push(x, y, z); if (l === undefined) map.set(k, hit); else if (typeof l === "number") map.set(k, [l, hit]); else l.push(hit); } rem[i] = hit; }
      const pos = new Float32Array(u * 3); for (let i = 0; i < u * 3; i++) pos[i] = out[i] / 1e4;
      const ix = new Uint32Array(idx ? idx.length : n); if (idx) for (let i = 0; i < idx.length; i++) ix[i] = rem[idx[i]]; else for (let i = 0; i < n; i++) ix[i] = rem[i];
      const G = new T.BufferGeometry(); G.setAttribute("position", new T.BufferAttribute(pos, 3)); G.setIndex(new T.BufferAttribute(ix, 1)); G.computeVertexNormals(); geo.dispose(); return G; }
    function lumpify(geo, amp, freq, seed = 1, fn, ox = 0) {   // (ox: the noise taken from that far along, a piece's place in the world)
      geo = weld(geo); const p = geo.attributes.position, n = geo.attributes.normal;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); let d = fbm((x + ox) * freq, y * freq, z * freq, seed) * amp; if (fn) d += fn(x, y, z); p.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d); }
      geo.computeVertexNormals(); return geo; }
    // a rounded box, divided so it can be dented: sx, sy, sz cuts a side; dense: the cuts crowd to the edges (a long flat top needs few in the middle)
    function rbox(w, h, d, r, sx, sy, sz, dense) {
      r = Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001);
      const geo = new T.BoxGeometry(w, h, d, Math.max(2, sx), Math.max(2, sy), Math.max(2, sz)), p = geo.attributes.position;
      const ix = w / 2 - r, iy = h / 2 - r, iz = d / 2 - r, cl = (v, m) => Math.max(-m, Math.min(m, v)), crowd = (v, half) => { const u = Math.min(1, Math.abs(v) / half); return Math.sign(v) * half * (1 - Math.pow(1 - u, 2.2)); };
      for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (dense) { z = crowd(z, d / 2); y = crowd(y, h / 2); }
        const cx_ = cl(x, ix), cy = cl(y, iy), cz = cl(z, iz), dx = x - cx_, dy = y - cy, dz = z - cz, l = Math.hypot(dx, dy, dz) || 1; p.setXYZ(i, cx_ + dx / l * r, cy + dy / l * r, cz + dz / l * r); }
      return geo; }
    const L = o.lod ?? 1, sg = (n, m = 3) => Math.max(m, Math.round(n * L));   // (the detail: L scales every piece's cuts; 1 the full clay, the phone's lighter)
    const step = (len, s) => Math.max(2, Math.round(len * L / s));
    function mesh(geo, col, x = 0, y = 0, z = 0, parent, cast = true) { const m = new T.Mesh(geo); m.userData.col = hex(col); m.userData.cast = cast; m.position.set(x, y, z); (parent || W).add(m); return m; }

    // the grass top: a rounded slab, its front lip dripping in scallops. topAt(x): its top follows a floor that slopes (else flat at y); col: another clay (an overhang's dirt)
    function grassSlab(xa, xb, y, za, zb, th = .55, seed = 3, far = false, topAt = null, col = P.grass) {
      const w = xb - xa, d = zb - za, cx = (xa + xb) / 2; let geo = rbox(w, th, d, .24, step(w, far ? .26 : .16), sg(7, 4), sg(far ? 12 : 18, 6), true);
      geo = lumpify(geo, .05, 1.6, seed, null, cx + OX);
      const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const X = p.getX(i) + cx, Y = p.getY(i), Z = p.getZ(i);
        let ny = Y; if (Y < 0 && Z > d / 2 - .5) { const f = Math.min(1, (Z - (d / 2 - .5)) / .3), Xw = X + OX, sc = Math.pow(.5 + .5 * Math.sin(Xw * 2.3 + vn(Xw * .6, 0, 0, seed) * 3), 2) * (.32 + .14 * vn(Xw * 1.1, 3, 0, seed)); ny = Y - sc * f * (Y < -th * .45 ? 1 : .5); }
        p.setY(i, ny - th / 2 + (topAt ? topAt(X) : y)); }
      geo.computeVertexNormals();
      return mesh(geo, col, cx, 0, (za + zb) / 2);
    }
    // the woods' earth: a cut bank of soil from bot up to topAt(x), its face at zf, d deep; bands of other clays pressed across it, wavy
    // (bands: [how far down from the top (up: up from the foot), how tall, colour, up]; one that won't fit is left out)
    function soilFace(xa, xb, topAt, bot, zf, d, seed = 7, far = false, parent, cast = true, bands = []) {
      const w = xb - xa, cx = (xa + xb) / 2; if (w < .3) return; let hs = 0; for (let k = 0; k <= 12; k++) hs += topAt(xa + w * k / 12) - bot;
      const h = Math.max(.4, hs / 13), fit = (g, f) => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, f(p.getX(i) + cx, p.getY(i))); return g; };
      const g0 = fit(rbox(w, h, d, .35, step(w, far ? .45 : .26), Math.max(3, Math.round(h * L / (far ? .75 : .5))), sg(4, 2)), (X, y) => bot + (y + h / 2) / h * (topAt(X) - bot));
      mesh(lumpify(g0, far ? .13 : .09, .85, seed, null, cx + OX), P.soil, cx, 0, zf - d / 2, parent, cast);
      bands.forEach(([dist, bh, col, up], k) => {
        const yAt = X => { const q = X + OX; return (up ? bot + dist : topAt(X) - dist) + .26 * Math.sin(q * .29 + k * 2.1 + seed) + .14 * Math.sin(q * .77 + k * 4.7); };
        for (let j = 0; j <= 12; j++) { const X = xa + w * j / 12, y = yAt(X); if (y - bh / 2 < bot + .1 || y + bh / 2 > topAt(X) - .15) return; }
        const g = fit(rbox(w, bh, .32, Math.min(.15, bh / 2 - .01), step(w, far ? .45 : .26), sg(4, 3), sg(3, 2)), (X, y) => yAt(X) + y);
        mesh(lumpify(g, .045, 1.5, seed + k + 1, null, cx + OX), col, cx, 0, zf - .03, parent, cast); });
    }
    function pebble(seed, col) { return mesh(lumpify(new T.SphereGeometry(1, sg(12, 6), sg(9, 4)).scale(1, .74, .5), .07, 1.7, seed), col); }   // (a stone pressed in the earth)
    function root(len, seed, col = P.root) {   // a root hanging from under the grass, kinked, thinning to its tip
      const pts = []; let px = 0, pz = 0; for (let k = 0; k <= 5; k++) { pts.push(new T.Vector3(px, -k / 5 * len, pz)); px += (hsh(seed, k, 1, 3) - .5) * len * .34; pz += (hsh(seed, k, 2, 3) - .35) * len * .1; }
      const curve = new T.CatmullRomCurve3(pts), ts = sg(18, 7), rs = sg(8, 4), r0 = .07 + len * .02, g = new T.TubeGeometry(curve, ts, r0, rs, false), p = g.attributes.position, c = new T.Vector3();
      for (let j = 0; j <= ts; j++) { curve.getPointAt(j / ts, c); const f = 1 - .78 * j / ts; for (let q = 0; q <= rs; q++) { const i = j * (rs + 1) + q; p.setXYZ(i, c.x + (p.getX(i) - c.x) * f, c.y + (p.getY(i) - c.y) * f, c.z + (p.getZ(i) - c.z) * f); } }
      g.computeVertexNormals(); mesh(g, col); mesh(new T.SphereGeometry(r0, sg(8, 4), sg(6, 3)), col);
      const b = hsh(seed, 9, 9, 3) * .5 + .3, q0 = curve.getPointAt(b), q1 = q0.clone().add(new T.Vector3((hsh(seed, 7, 1, 3) - .5) * len * .5, -len * .3, .05));   // (a little root off it)
      mesh(new T.TubeGeometry(new T.CatmullRomCurve3([q0, q0.clone().lerp(q1, .5).add(new T.Vector3(0, .05, 0)), q1]), sg(8, 4), r0 * .45, sg(6, 3), false), col);
    }
    function earthRows(xa, xb, yTop, yBot, za, zb, seed = 5) {   // stacked rounded bricks, the mockup's layered dirt (just their fronts: the grass hides the rest)
      const rows = Math.max(1, Math.round((yTop - yBot) / 1.05)), rh = (yTop - yBot) / rows; let s = seed;
      for (let r = 0; r < rows; r++) { let x = xa - (r % 2) * .7; const yc = yTop - rh * (r + .5);
        while (x < xb) { s++; const w = Math.min(xb - x, 1.8 + hsh(s, 1, 2, 3) * 2.4); if (w < .6) break; const out = (hsh(s, 4, 5, 6) - .5) * .22;
          const c = new T.Color(P.earth[Math.floor(hsh(s, 9, 9, 9) * P.earth.length)]).offsetHSL(0, 0, (r / rows) * .06), dd = zb - za + out;
          let geo = rbox(w - .04, rh + .05, dd, .3, step(w, .16), step(rh, .15), step(dd, .25)); geo = lumpify(geo, .07, 1.3, s);
          mesh(geo, c, x + w / 2, yc, (za + zb) / 2 + out / 2); x += w; } }
    }
    function flower(x, y, z, sc = 1, col = P.red, face = new T.Euler(0, 0, 0), petals = 5) {
      const grp = new T.Group(); grp.position.set(x, y, z); grp.rotation.copy(face); grp.scale.setScalar(sc); W.add(grp);
      const pg = lumpify(new T.SphereGeometry(.16, sg(10, 6), sg(8, 4)).scale(1, 1.25, .55), .012, 6, 4);
      for (let i = 0; i < petals; i++) { const a = i / petals * Math.PI * 2 + .3, m = mesh(pg, col, Math.cos(a) * .17, Math.sin(a) * .17, 0, grp); m.rotation.z = a - Math.PI / 2; }
      mesh(lumpify(new T.SphereGeometry(.1, sg(10, 6), sg(8, 4)).scale(1, 1, .7), .01, 8, 2), P.yel, 0, 0, .05, grp); return grp;
    }
    function clover(x, y, z, sc = 1, rz = 0) {
      const grp = new T.Group(); grp.position.set(x, y, z); grp.rotation.z = rz; grp.scale.setScalar(sc); W.add(grp);
      const lg = lumpify(new T.SphereGeometry(.22, sg(16, 7), sg(12, 5)).scale(.85, 1.15, .4), .015, 5, 9);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, m = mesh(lg, "#43b649", Math.cos(a) * .2, Math.sin(a) * .2, 0, grp); m.rotation.z = a - Math.PI / 2; }
      mesh(new T.SphereGeometry(.06, sg(10, 5), sg(8, 4)), "#2e9a38", 0, 0, .05, grp); return grp;
    }
    function berry(x, y, z, r, col, parent) {
      const m = mesh(lumpify(new T.SphereGeometry(r, sg(12, 6), sg(9, 4)), r * .06, 3 / r, Math.floor(x * 10)), col, x, y, z, parent);
      if (col === P.berryR) for (let i = 0; i < 5; i++) { const a = i * 1.3, b = .4 + (i % 3) * .5; mesh(new T.SphereGeometry(r * .12, sg(6, 4), sg(5, 3)), "#ffe9b0", Math.cos(a) * Math.sin(b) * r * .97, Math.cos(b) * r * .97 * (i % 2 ? 1 : -.3), Math.sin(a) * Math.sin(b) * r * .97 + r * .05, m); }
      return m;
    }
    function bush(x, y, z, s = 1, cols = [P.leaf, P.grass2, P.leafD], berries = P.berryB, seed = 21) {
      const grp = new T.Group(); grp.position.set(x, y, z); grp.scale.setScalar(s); W.add(grp);
      for (let i = 0; i < 5; i++) { const a = (i / 4 - .5) * 2.2, r = .55 + hsh(seed, i, 1, 1) * .3, bx = a * .75, by = .35 + Math.cos(a) * .35 + hsh(seed, i, 2, 2) * .2;
        mesh(lumpify(new T.SphereGeometry(r, sg(22, 9), sg(16, 6)), .06, 2.2, seed + i), cols[i % cols.length], bx, by, -.1 + hsh(seed, i, 3, 3) * .25, grp); }
      if (berries) for (let i = 0; i < 8; i++) { const bx = (hsh(seed, i, 7, 1) - .5) * 2.4, by = .3 + hsh(seed, i, 8, 1) * .75; berry(bx, by, .55 + hsh(seed, i, 9, 1) * .15, .11 + hsh(seed, i, 5, 5) * .05, Array.isArray(berries) ? berries[i % berries.length] : berries, grp); }
      return grp;
    }
    function trunk(h, r0, r1, seed, grp, y0 = 0) {   // a clay trunk, flared at its foot
      let tg = new T.CylinderGeometry(r0, r1, h, sg(32, 10), Math.max(sg(8, 4), Math.round(h * 5 * L)), true); const p = tg.attributes.position;
      for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i), a = Math.atan2(Z, X), t = (Y + h / 2) / h, flare = 1 + Math.pow(1 - t, 6) * .55, gr = 1 + .07 * Math.sin(a * 7 + Y * .5); p.setXYZ(i, X * flare * gr, Y, Z * flare * gr); }
      tg = lumpify(tg, .04, 2, seed); return mesh(tg, P.trunk, 0, y0 + h / 2 - .2, 0, grp);
    }
    function tree(x, y, z, h = 6, s = 1, seed = 31, shelf = true) {
      const grp = new T.Group(); grp.position.set(x, y, z); grp.scale.setScalar(s); W.add(grp);
      trunk(h, .42, .62, seed, grp);
      const cs = [[0, h + .9, 0, 1.9], [-1.25, h + .2, .3, 1.35], [1.3, h + .35, .2, 1.4], [.2, h + 1.9, -.1, 1.35], [-.6, h - .5, .9, 1.0], [.9, h - .4, .8, 1.05]];
      cs.forEach(([a, b, c, r], i) => mesh(lumpify(new T.SphereGeometry(r, sg(28, 10), sg(20, 7)), .09, 1.6, seed + i, (X, Y, Z) => .05 * Math.sin(X * 9) * Math.sin(Y * 9) * Math.sin(Z * 9)), i % 2 ? "#34ad46" : "#2c9c3f", a, b, c, grp));
      if (shelf) { const sh = mesh(lumpify(new T.SphereGeometry(1, sg(30, 10), sg(16, 5), 0, Math.PI * 2, 0, Math.PI / 2).scale(1.05, .32, .75), .03, 2, 77), "#e5402f", -.1, 2.6, .75, grp); sh.rotation.z = -.05;
        for (let i = 0; i < 6; i++) mesh(new T.SphereGeometry(.09, sg(10, 5), sg(6, 3)).scale(1, .5, 1), P.cream, -.1 + Math.cos(i * 1.7) * .6, 2.9, .75 + Math.sin(i * 1.7) * .45, grp); }
      return grp;
    }
    function leafGeo(len = 1, wid = .38, th = .05) {   // a pointed clay leaf, pressed flat
      const sh = new T.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(wid, len * .45, 0, len); sh.quadraticCurveTo(-wid, len * .45, 0, 0);
      const g2 = new T.ExtrudeGeometry(sh, { depth: th, bevelEnabled: true, bevelThickness: th * .9, bevelSize: wid * .16, bevelSegments: sg(3, 1), curveSegments: sg(12, 5) }); g2.translate(0, 0, -th / 2); return g2; }
    function leaf(x, y, z, len, rz, col, parent, wid) { const m = mesh(leafGeo(len, wid ?? len * .36), col, x, y, z, parent); m.rotation.z = rz;
      mesh(new T.CylinderGeometry(.018, .03, len * .8, sg(6, 4)).translate(0, len * .42, 0), "#2c8a36", 0, 0, .06, m); return m; }
    function bamboo(x, y0, z, h, r = .22, seed = 41, tilt = 0) {
      const grp = new T.Group(); grp.position.set(x, y0, z); grp.rotation.z = tilt; W.add(grp);
      const seg = 1.15 + hsh(seed, 1, 1, 1) * .4, n = Math.ceil(h / seg);
      for (let i = 0; i < n; i++) { mesh(lumpify(new T.CapsuleGeometry(r * (.94 + hsh(seed, i, 5, 5) * .12), seg - r * 1.4, sg(4, 2), sg(14, 6)), r * .05, 1.6 / r, seed + i), P.bamboo, 0, i * seg + seg / 2, 0, grp);
        mesh(new T.TorusGeometry(r * 1.03, r * .15, sg(6, 3), sg(16, 6)).rotateX(Math.PI / 2), P.bambooD, 0, i * seg + seg, 0, grp);
        if (i > 2 && hsh(seed, i, 1, 9) > .55) { const sd = hsh(seed, i, 2, 9) > .5 ? 1 : -1; leaf(sd * r * .8, i * seg + seg * .95, .15, 1.5, sd * -1.05, i % 2 ? "#7ccc5a" : "#5fbb4f", grp); leaf(sd * r * .8, i * seg + seg * .95, .2, 1.1, sd * -.55, "#4fb04a", grp); } }
      return grp;
    }
    function rope(pts, r, cols, twists = 10, seed = 51, leafEvery = 0) {   // two strands wound round each other, the mockup's twisted vine
      const curve = new T.CatmullRomCurve3(pts.map(q => new T.Vector3(...q))), N = 120, frames = curve.computeFrenetFrames(N, false);
      cols.forEach((col, k) => {
        const sp = []; for (let i = 0; i <= N; i++) { const t = i / N, P0 = curve.getPointAt(t), a = t * twists * Math.PI * 2 + k * Math.PI, n = frames.normals[i], b = frames.binormals[i];
          sp.push(P0.clone().addScaledVector(n, Math.cos(a) * r * .55).addScaledVector(b, Math.sin(a) * r * .55)); }
        mesh(lumpify(new T.TubeGeometry(new T.CatmullRomCurve3(sp), Math.max(4, Math.round(N * 2 * L)), r * .62, sg(12, 5), false), r * .05, 3 / r, seed + k), col);
        [0, 1].forEach(e => mesh(new T.SphereGeometry(r * .62, sg(12, 5), sg(9, 4)), col, ...sp[e ? sp.length - 1 : 0].toArray()));
      });
      if (leafEvery) for (let t = .08; t < .95; t += leafEvery) { const P0 = curve.getPointAt(t), tn = curve.getTangentAt(t), side = (Math.round(t / leafEvery) % 2) ? 1 : -1;
        leaf(P0.x, P0.y, P0.z + .15, 1.15, Math.atan2(tn.y, tn.x) - Math.PI / 2 + side * 1.0, side > 0 ? "#5fcf4f" : "#3fae45"); }
    }
    function cutout(pts, depth, col, z) {   // a flat pressed clay layer for the back
      const sh = new T.Shape(); pts.forEach(([a, b], i) => i ? sh.lineTo(a, b) : sh.moveTo(a, b));
      return mesh(new T.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: depth * .6, bevelSize: Math.min(.35, depth * .9), bevelSegments: sg(4, 1), curveSegments: sg(16, 6) }), col, 0, 0, z, null, false);
    }
    function blobLine(xa, xb, base, top, bumps, seed) {   // a bumpy-topped outline (bushes, canopies)
      const steps = Math.round((xb - xa) * 2.4), pts = [[xa, base]]; for (let i = 0; i <= steps; i++) { const t = i / steps, X = xa + (xb - xa) * t, ph = t * bumps * Math.PI;
        pts.push([X, top + Math.pow(Math.abs(Math.sin(ph + vn(t * 3, 0, 0, seed))), .55) * 1.1 + vn(t * 9, 1, 0, seed) * .25]); }
      pts.push([xb, base]); return pts; }
    function treeSil(tx, base, h, r, seed) {   // trunk and round canopy as one outline
      const pts = [[tx - r * .16, base], [tx - r * .16, base + h]];
      for (let i = 0; i <= 48; i++) { const a = Math.PI * 1.5 - .25 - i / 48 * (Math.PI * 2 - .5), rr = r * (1 + .1 * Math.sin(a * 6 + seed)); pts.push([tx + Math.cos(a) * rr, base + h + r * .8 + Math.sin(a) * rr]); }
      pts.push([tx + r * .16, base + h], [tx + r * .16, base]); return pts; }
    function cloud(x, y, z, s = 1) { const grp = new T.Group(); grp.position.set(x, y, z); grp.scale.set(s, s, s * .4); W.add(grp);
      [[0, 0, 1], [-1.1, -.25, .75], [1.1, -.2, .8], [.5, .45, .7], [-.5, .35, .65]].forEach(([a, b, r], i) => mesh(lumpify(new T.SphereGeometry(r, sg(16, 8), sg(10, 5)), .05, 1.5, i + (x | 0)), "#ffffff", a, b, 0, grp, false)); }
    // the forest (the user, 2026-11-09: "there wasn't so much brown earth like this. it was trees and space in the background"): tall trunks at every depth, big
    // leaves over the earth, ferns, vines hanging, the far woods in pressed layers
    function fTrunk(h, r, seed, far = false) {   // a tall trunk, tapered and a little bent, its foot spread into roots; it runs up out of sight
      const g = new T.Group(); W.add(g); const bend = (hsh(seed, 1, 2, 3) - .5) * r * 1.6;
      const tg = new T.CylinderGeometry(r * .7, r, h, sg(far ? 9 : 14, 6), Math.max(3, Math.round(h * (far ? .5 : 1.2) * L)), true), p = tg.attributes.position;
      for (let i = 0; i < p.count; i++) { const X0 = p.getX(i), Y0 = p.getY(i), Z0 = p.getZ(i), t = (Y0 + h / 2) / h, fl = 1 + Math.pow(1 - t, 7) * .75; p.setXYZ(i, X0 * fl + Math.sin(t * Math.PI) * bend, Y0 + h / 2, Z0 * fl); }
      mesh(lumpify(tg, r * .07, 1.4 / r, seed), P.trunk, 0, 0, 0, g);
      const nr = far ? 2 : 4; for (let k = 0; k < nr; k++) { const a = (k + hsh(seed, k, 3, 4) * .6) / nr * Math.PI * 2, m = mesh(lumpify(new T.SphereGeometry(r * .62, sg(10, 5), sg(7, 4)).scale(1.9, .55, .8), r * .06, 2 / r, seed + k), P.trunk, Math.cos(a) * r * 1.05, r * .2, Math.sin(a) * r * 1.05, g); m.rotation.set(0, -a, -.35); }
      return g; }
    function fern(seed, cols = ["#4fb04a", "#3a9a44"], n = 7, len = 1.3) {   // leaves fanned up out of the ground, leaning out
      const g = new T.Group(); W.add(g);
      for (let i = 0; i < n; i++) { const a = (i / (n - 1) - .5) * 2.3 + (hsh(seed, i, 1, 2) - .5) * .25, m = mesh(leafGeo(len * (.75 + hsh(seed, i, 2, 2) * .45), len * .26, .04), cols[i % cols.length], 0, 0, 0, g); m.rotation.set(-.35 - hsh(seed, i, 3, 2) * .3, 0, a); }
      return g; }
    function vine(len, seed, col = "#3f9a3f") {   // a vine hanging from a lip, a few leaves on it
      const pts = []; for (let i = 0; i <= 4; i++) { const t = i / 4; pts.push(new T.Vector3(Math.sin(t * 2.2 + seed) * .22 * t, -t * len, Math.sin(t * 3 + seed * 2) * .08)); }
      const cv = new T.CatmullRomCurve3(pts); mesh(new T.TubeGeometry(cv, sg(12, 5), .045, sg(6, 4), false), col, 0, 0, 0);
      for (let t = .25; t < 1; t += .3) { const q = cv.getPointAt(t), m = mesh(leafGeo(.42, .16, .03), t > .6 ? "#5fbb4f" : "#4aa84a", q.x, q.y, q.z + .04); m.rotation.z = (Math.round(t * 10) % 2 ? 1 : -1) * 2.2; } }
    function hangLine(xa, xb, yTop, yBot, bumps, seed) {   // an outline with a bumpy foot (a canopy seen from below)
      const steps = Math.round((xb - xa) * 2), pts = [[xa, yTop]]; for (let i = 0; i <= steps; i++) { const t = i / steps, X0 = xa + (xb - xa) * t, ph = t * bumps * Math.PI;
        pts.push([X0, yBot - Math.pow(Math.abs(Math.sin(ph + vn(t * 3, 0, 0, seed))), .55) * 1.3 - vn(t * 9, 1, 0, seed) * .3]); }
      pts.push([xb, yTop]); return pts.reverse(); }
    function slope(xa, xb, z0, z1, y0, y1, seed, col) {   // a grassy bank rising back from z0 (y0) to z1 (y1), rounded at its shoulder and its foot, bumpy
      const nx = Math.max(4, Math.round((xb - xa) * .9 * L)), nz = Math.max(4, Math.round(9 * L)), g = new T.PlaneGeometry(xb - xa, 1, nx, nz), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const X0 = p.getX(i) + (xa + xb) / 2, t = p.getY(i) + .5, e = t * t * (3 - 2 * t), Z = z0 + (z1 - z0) * t, Y = y0 + (y1 - y0) * e + fbm((X0 + OX) * .35, t * 2, seed, seed) * .55 * Math.sin(t * Math.PI);
        p.setXYZ(i, X0, Y, Z); }
      g.computeVertexNormals(); return mesh(g, col, 0, 0, 0, null, false); }
    // the rainforest's own (buildLevel's: sierra palms, tree ferns, flamboyanes, the mogotes far off), in clay
    function frondGeo(len, wid, droop, th = .04) {   // a long leaf arching over and down from its foot
      const g = leafGeo(len, wid, th), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const t = p.getY(i) / len, a = t * droop, Z0 = p.getZ(i); p.setXYZ(i, p.getX(i), len * Math.sin(a) / droop + Z0 * Math.sin(a), Z0 * Math.cos(a) - len * (1 - Math.cos(a)) / droop); }
      return g; }
    function crown(grp, y, n, len, wid, droop, cols, seed, tilt = .5) {   // fronds all round a point
      for (let i = 0; i < n; i++) { const a = (i + hsh(seed, i, 1, 3) * .5) / n * Math.PI * 2, m = mesh(frondGeo(len * (.85 + hsh(seed, i, 2, 3) * .3), wid, droop), cols[i % cols.length], 0, y, 0, grp);
        m.rotation.set(0, a, 0, "YXZ"); m.rotateX(-(tilt + hsh(seed, i, 3, 3) * .35)); } }
    function palm(h, seed, far = false) {   // a sierra palm: a slim ringed trunk leaning a little, a crown of arching fronds
      const g = new T.Group(); W.add(g); const lean = (hsh(seed, 4, 4, 4) - .5) * .5, pts = [0, .35, .7, 1].map(t => new T.Vector3(Math.sin(t * 1.2) * lean * h * .3, t * h, 0));
      mesh(lumpify(new T.TubeGeometry(new T.CatmullRomCurve3(pts), sg(far ? 6 : 12, 4), .17, sg(far ? 6 : 9, 5), false), .015, 5, seed), "#9b8b6e", 0, 0, 0, g);
      if (!far) for (let t = .12; t < .95; t += .11) { const q = new T.CatmullRomCurve3(pts).getPointAt(t); mesh(new T.TorusGeometry(.17, .025, sg(4, 3), sg(10, 6)).rotateX(Math.PI / 2), "#857559", q.x, q.y, q.z, g); }
      const top = pts[3]; const c = new T.Group(); c.position.copy(top); g.add(c); mesh(new T.SphereGeometry(.24, sg(10, 5), sg(8, 4)).scale(1, 1.4, 1), "#6f9a3e", 0, 0, 0, c);
      crown(c, .1, far ? 6 : 9, 2.3, .34, 1.9, ["#3fa047", "#4fb04a", "#35913f"], seed, .25); return g; }
    function palm2(h, lean, royal, coco, seed) {   // (the game's palms, tropPalm, in clay: a coconut palm leaning out to sea, a sierra palm, a royal palm)
      const g = new T.Group(); W.add(g);
      if (royal) { mesh(lumpify(new T.LatheGeometry([[.4, -.5], [.38, h * .12], [.47, h * .45], [.36, h * .82], [.3, h]].map(([r, v]) => new T.Vector2(r, v)), sg(14, 8), ), .02, 3, seed), "#b9b3a6", 0, 0, 0, g);
        mesh(lumpify(new T.CylinderGeometry(.27, .31, h * .15, sg(12, 6), 2), .02, 4, seed + 1), "#6f9f45", 0, h * 1.075, 0, g); const c = new T.Group(); c.position.set(0, h * 1.15, 0); g.add(c);
        crown(c, 0, sg(12, 7), 3.8, .42, 2.1, ["#4f9a3a", "#3e8434", "#68ae42"], seed, .2); return g; }
      const pts = [0, .25, .5, .75, 1].map(t => new T.Vector3(Math.sin(lean * t) * h * .5 * t, Math.cos(lean * t * .5) * h * t - .4, 0)), cv = new T.CatmullRomCurve3(pts), top = pts[4];
      mesh(lumpify(new T.TubeGeometry(cv, sg(16, 6), .19, sg(10, 6), false), .02, 4, seed), "#b0a185", 0, 0, 0, g); mesh(new T.SphereGeometry(.21, sg(10, 5), sg(8, 4)), "#b0a185", pts[0].x, pts[0].y, 0, g);
      for (let t = .08; t < .96; t += .085) { const q = cv.getPointAt(t), tn = cv.getTangentAt(t), m = mesh(new T.TorusGeometry(.19, .035, sg(5, 3), sg(12, 6)), "#958769", q.x, q.y, q.z, g); m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), tn); }
      if (coco) for (let j = 0; j < 4; j++) { const a = j * 1.7; mesh(lumpify(new T.SphereGeometry(.24, sg(10, 5), sg(8, 4)), .02, 5, seed + j), "#7a5532", top.x + Math.cos(a) * .24, top.y - .3, top.z + Math.sin(a) * .24, g); }
      const c = new T.Group(); c.position.copy(top); g.add(c); mesh(new T.SphereGeometry(.26, sg(10, 5), sg(8, 4)).scale(1, .8, 1), "#7d8f45", 0, 0, 0, c);
      crown(c, .05, sg(10, 7), 3.1, .46, 1.9, ["#4f9a3a", "#3e8434", "#68ae42"], seed, .35); return g; }
    function treeFern(h, seed, far = false) {   // a giant tree fern: a dark shaggy stem, a wide crown of long lacy fronds
      const g = new T.Group(); W.add(g);
      mesh(lumpify(new T.CylinderGeometry(.13, .19, h, sg(far ? 6 : 9, 5), Math.max(2, Math.round(h * L))).translate(0, h / 2, 0), .03, 4, seed), "#6b4e35", 0, 0, 0, g);
      const c = new T.Group(); c.position.y = h; g.add(c); crown(c, 0, far ? 7 : 11, 2.1, .3, 2.4, ["#5cbf50", "#4aab48", "#6cc95a"], seed + 1, .05); return g; }
    function flamboyan(seed, far = false) {   // a flamboyán: a short trunk forking, a wide flat crown, red with flowers
      const g = new T.Group(); W.add(g); mesh(lumpify(new T.CylinderGeometry(.22, .34, 3.2, sg(9, 5), 3).translate(0, 1.6, 0), .04, 2, seed), "#8a6a4e", 0, 0, 0, g);
      [-1, 1].forEach(sd => { const b = mesh(new T.CylinderGeometry(.1, .18, 2.2, sg(7, 4)).translate(0, 1.1, 0), "#8a6a4e", 0, 3, 0, g); b.rotation.z = sd * .75; });
      for (let i = 0; i < 9; i++) { const a = i / 8 * Math.PI * 2, r = i === 8 ? 0 : i % 2 ? 1.5 : 2.3; mesh(lumpify(new T.SphereGeometry(1.3, sg(12, 6), sg(8, 4)).scale(1.25, .6, 1), .08, 1.5, seed + i), ["#3f9c45", "#d8352b", "#4aa84a", "#e5512c"][i % 4], Math.cos(a) * r, 4.5 + (i === 8 ? .5 : 0) + hsh(seed, i, 5, 5) * .4, Math.sin(a) * r * .6, g); }
      for (let i = 0; i < (far ? 12 : 26); i++) { const a = hsh(seed, i, 6, 6) * Math.PI * 2, r = hsh(seed, i, 7, 6) * 3; mesh(new T.SphereGeometry(.42, sg(8, 4), sg(6, 3)).scale(1, .7, 1), i % 3 ? "#e2342a" : "#f47a30", Math.cos(a) * r, 5 + hsh(seed, i, 8, 6) * .5, Math.sin(a) * r * .6 + .4, g); }   // (red: its flowers all over it)
      return g; }
    function mogote(x, base, w, h, seed) {   // a mogote: a hill of limestone, steep sides, a round wooded top (the outline)
      const pts = [[x - w / 2, base]]; for (let i = 0; i <= 24; i++) { const t = i / 24, a = t * Math.PI, sx = -Math.cos(a), k = Math.pow(Math.sin(a), .35);
        pts.push([x + sx * w / 2 * (.9 + .1 * k), base + h * k + vn(t * 6, seed, 0, 9) * .4]); } pts.push([x + w / 2, base]); return pts; }
    function trunkSil(x, base, h, r, seed) { const w = vn(seed, 0, 0, 3) * r * .4; return [[x - r * 1.5, base], [x - r * .9, base + .6], [x - r * .7 + w, base + h], [x + r * .7 + w, base + h], [x + r * .9, base + .6], [x + r * 1.5, base]]; }
    return { W, L, sg, hex, weld, lumpify, rbox, step, mesh, grassSlab, soilFace, pebble, root, earthRows, flower, clover, berry, bush, trunk, tree, leafGeo, leaf, bamboo, rope, cutout, blobLine, treeSil, cloud, fTrunk, fern, vine, hangLine, trunkSil, slope, palm, palm2, treeFern, flamboyan, mogote };
  }

  // ── baking: plain shapes (position + normal, indexed), gathered by colour and whether they cast; then one mesh each, its material shared and kept
  const MATS = new Map(), add = (B, k, g) => (B.get(k) || B.set(k, []).get(k)).push(g);
  const matV = toon => MATS.get("vc") || MATS.set("vc", Object.assign(toon("#ffffff"), { vertexColors: true })).get("vc");   // (the one clay material: each piece's colour rides in its vertices)
  function plain(T, g) { for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k); g.morphAttributes = {}; if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.index) { const n = g.attributes.position.count, ix = new Uint32Array(n); for (let i = 0; i < n; i++) ix[i] = i; g.setIndex(new T.BufferAttribute(ix, 1)); } g.clearGroups(); return g; }
  function gather(T, W, B = new Map()) {   // a kit's group into bins (and its pieces' own shapes freed)
    W.updateMatrixWorld(true); W.traverse(m => { if (!m.isMesh) return; const g = plain(T, m.geometry.clone()); g.applyMatrix4(m.matrixWorld); add(B, m.userData.col + (m.userData.cast ? "c" : "n"), g); });
    W.traverse(m => { if (m.isMesh) m.geometry.dispose(); }); return B; }
  function vcMerge(T, o, items) {   // [{ col, cast, geo }] → [{ cast, geo }]: each piece's clay colour put in its vertices, then one shape for what casts and one for what doesn't
    const C = { c: [], n: [] }, col = new T.Color();
    for (const it of items) { col.set(it.col); const g = it.geo, n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; }
      g.setAttribute("color", new T.BufferAttribute(a, 3)); C[it.cast ? "c" : "n"].push(g); }
    const out = []; for (const k of ["c", "n"]) { const list = C[k]; if (!list.length) continue; const geo = list.length === 1 ? list[0] : o.mergeGeometries(list, false); if (list.length > 1) list.forEach(g => g.dispose()); if (!geo) continue; geo.computeBoundingSphere(); out.push({ cast: k === "c", geo }); }
    return out; }
  function meshes(T, o, B, name, keepGeo) {   // bins → a group of a mesh or two (a draw or two, not one a colour)
    const out = new T.Group(), items = []; out.name = name; B.forEach((list, key) => list.forEach(geo => items.push({ col: key.slice(0, 7), cast: key.endsWith("c"), geo })));
    vcMerge(T, o, items).forEach(({ cast, geo }) => { const m = new T.Mesh(geo, matV(o.toon)); m.userData.keepMat = true; if (keepGeo) m.userData.keepGeo = true; if (cast) m.layers.enable(o.layer ?? 7); out.add(m); });
    return out; }
  const vcOf = (T, o, parts) => parts.vc || (parts.vc = vcMerge(T, o, parts.map(({ k, geo }) => ({ col: k.slice(0, 7), cast: k.endsWith("c"), geo: geo.clone() }))));   // (a kept proto's own merged copy, made once)
  // ── made once, stamped wherever they go: [{ k (colour + casts), geo }]
  const PROTO = new Map();
  function proto(T, o, key, fn) { key += "@" + (o.lod ?? 1); let p = PROTO.get(key); if (!p) { const K = Kit(T, o); fn(K); p = []; gather(T, K.W).forEach((list, k) => p.push({ k, geo: list.length === 1 ? list[0] : o.mergeGeometries(list, false) })); PROTO.set(key, p); } return p; }
  function stamp(B, parts, m4, col, nc) { parts.forEach(({ k, geo }) => add(B, (col || k.slice(0, 7)) + (nc ? "n" : k.slice(7)), geo.clone().applyMatrix4(m4))); }   // (nc: casts no clay shadow)

  // ── the CLAY TEST ROOM: the mockup's picture round cx, x0..x1 its reach
  function build(T, o) {
    const x0 = o.x0, x1 = o.x1, cx = o.cx, Wd = x1 - x0, K = Kit(T, o);
    const { mesh, grassSlab, earthRows, flower, clover, bush, tree, bamboo, rope, cutout, blobLine, treeSil, cloud } = K;
    // the sky and the back layers (wide: the camera pans the room, and they're far off)
    const bx0 = x0 - 34, bx1 = x1 + 34;
    mesh(new T.PlaneGeometry(bx1 - bx0 + 30, 70, 2, 2), "#74c0e4", (bx0 + bx1) / 2, 10, -34, null, false);
    for (let x = bx0 + 4, i = 0; x < bx1; x += 15 + hsh(i, 1, 1, 8) * 6, i++) cloud(x, 17.5 + hsh(i, 2, 2, 8) * 5, -30, 1.8 + hsh(i, 3, 3, 8) * .9);
    cutout(blobLine(bx0, bx1, -6, 4.2, Math.round((bx1 - bx0) * .098), 3), .5, "#8fd0a8", -26);
    for (let x = bx0 + 2, i = 0; x < bx1; x += 10, i++) cutout(treeSil(x + (i % 2) * 3, -6, 6 + (i % 3) * 1.8, 2.6 + (i % 2) * .6, i), .45, i % 2 ? "#79c08f" : "#6db885", -22 + (i % 2) * .4);
    cutout(blobLine(bx0 + 6, bx1 - 6, -6, 2.4, Math.round((bx1 - bx0 - 12) * .1375), 7), .55, "#5daf73", -18);
    for (let x = bx0 + 10, i = 0; x < bx1 - 8; x += 9.5, i++) cutout(treeSil(x + (i % 3), -6, 4.5 + (i % 3) * 1.4, 2.1 + (i % 2) * .5, i + 20), .5, i % 2 ? "#4ea865" : "#459f5d", -15 + (i % 2) * .5);
    cutout(blobLine(bx0 + 12, bx1 - 12, -6, .9, Math.round((bx1 - bx0 - 24) * .19), 11), .6, "#3f9a52", -11.5);
    // the middle: bamboo, a back bank with bushes, the vine arches
    const rel = [-9.6, -1.8, 4.4, 11.6];
    for (let k = -2; k <= 2; k++) rel.forEach((r, i) => { const x = cx + k * 26 + r + (k ? (hsh(k + 9, i, 1, 1) - .5) * 2.5 : 0); if (x < x0 - 4 || x > x1 + 4) return;
      bamboo(x, -2, -7 - hsh(k + 9, i, 2, 2) * 1.2, 15 + (i === 2 ? 1 : 0), .4 + hsh(k + 9, i, 3, 3) * .07, 41 + i + (k + 2) * 5, (i % 2 ? .035 : -.03)); });
    grassSlab(x0, x1, .55, -9.5, -3.2, .5, 9, true);
    for (let x = x0 + 2, i = 0; x < x1 - 1; x += 6.2 + hsh(i, 5, 5, 5) * 2.6, i++) bush(x, .5, -4.3 - hsh(i, 6, 6, 6) * .3, 1.05 + hsh(i, 7, 7, 7) * .3, BCOLS[i % 4], BBER[i % 4], 21 + i * 6);
    rope([[-12.5, -.4, -2.9], [-10.2, 3.6, -3.1], [-6, 6.3, -3.5], [-.5, 7.0, -3.8], [5, 6.4, -3.6], [8.9, 3.6, -3.3], [10.6, -.4, -3.0]].map(([a, b, c]) => [cx + a, b, c]), .5, ["#78d65a", "#3a9f3f"], 15, 51, .07);
    rope([[-16, 3.2, -1.5], [-12.5, 5.6, -1.9], [-9.4, 5.2, -2.3]].map(([a, b, c]) => [cx + a, b, c]), .26, ["#b4e36a", "#5cb84a"], 6, 61, .2);
    rope([[cx + 34, -.4, -3.0], [cx + 31.5, 3.0, -3.2], [cx + 27.5, 4.9, -3.5], [cx + 23.5, 3.2, -3.3], [cx + 21.8, -.4, -3.1]], .42, ["#78d65a", "#3a9f3f"], 9, 57, .1);
    rope([[cx - 30, 2.6, -1.6], [cx - 27, 4.8, -2.0], [cx - 23.5, 4.3, -2.4]], .26, ["#b4e36a", "#5cb84a"], 6, 63, .2);
    // the ground they stand on: grass over stacked earth, a tree or two, flowers
    grassSlab(x0, x1, 0, -3.2, 2.7, .6, 3); earthRows(x0, x1, -.45, -4.65, 1.45, 2.45, 5);
    tree(cx + 13.2, 0, -1.6, 5.4, 1, 31); tree(cx - 19.5, 0, -2.2, 6.2, 1.05, 37, false); tree(cx + 30.5, 0, -2.4, 5.0, .95, 45);
    for (let x = x0 + 1, i = 0; x < x1; x += 2.9 + hsh(i, 1, 4, 4) * 1.4, i++) flower(x, (hsh(i, 2, 4, 4) - .3) * .1 - .05, 2.62, .9 + (i % 3) * .15, i % 4 === 3 ? "#ff7bb0" : P.red, new T.Euler(-.2, 0, i));   // (on the lip)
    for (let x = x0 + 2, i = 0; x < x1; x += 4.4 + hsh(i, 1, 5, 5) * 2.4, i++) { const y = -1.2 - hsh(i, 2, 5, 5) * 3.5;   // (on the bricks: flowers and clovers)
      if (i % 2) flower(x, y, 2.67, 1.1, P.red, new T.Euler(0, 0, i * .7)); else clover(x, y, 2.71, 1.1 + (i % 4 ? .25 : 0), i * .5); }
    for (let i = 0, n = Math.round(Wd * .55); i < n; i++) { const x = x0 + hsh(i, 2, 2, 2) * Wd, z = -2.8 + hsh(i, 3, 3, 3) * 5; if (Math.abs(z) < .9) continue;   // (lying in the grass: not on the path)
      flower(x, .02, z, .55 + hsh(i, 4, 4, 4) * .25, ["#ff4d4d", "#ffd23a", "#ff8fc1", "#ffffff"][i % 4], new T.Euler(-Math.PI / 2 + .35, 0, i)); }
    for (let x = x0 + 4, i = 0; x < x1 - 2; x += 8 + hsh(i, 8, 8, 8) * 4, i++) bush(x, 0, -2.1 - hsh(i, 9, 9, 9) * .5, .55, ["#4fc24a", P.leafD], [P.berryR, P.berryB][i % 2], 70 + i);
    return meshes(T, o, gather(T, K.W), "clayRoom");
  }

  // ── a Berry Woods room in clay. o: { W (its width, units), top(x) (the floor's top, or null over a pit), gaps [[a, b]], steps [x] (sheer ones), plats
  // [{ xa, xb, top, kind }], ceils [{ xa, xb, y }] (the land overhead: its underside), bgY (the woods round about: their ground), FB (the floor's underside),
  // row ("A".."D"), seed, trees (no tree of its own where the room has a great one) } → [near, far]: two groups for the room's objs (the sky's the game's own, flat: SKY)
  const SKY = ["#74c0e4", "#7cc2e0", "#86c4dc", "#e3b27f", "#ee946e", "#6d7ec2", "#2b3e72"];
  function dress(T, o) {
    const WX = o.W, sd = o.seed | 0, top = o.top, R = (i, j) => hsh(sd, i, j, 77), M = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), sc = new T.Vector3();
    const at = (x, y, z, rx = 0, ry = 0, rz = 0, s = 1, sy, sz) => M.compose(v.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), sc.set(s, sy ?? s, sz ?? s));
    const near = new Map(), K = Kit(T, o);
    const xL = -18, xR = WX + 18, clampX = (x, a, b) => Math.max(a + .02, Math.min(b - .02, x));
    // the floor's solid runs: cut at the pits and the sheer steps
    let runs = [[xL, xR]];
    o.gaps.forEach(([a, b]) => { runs = runs.flatMap(([u, w]) => b <= u || a >= w ? [[u, w]] : [[u, a], [b, w]].filter(([p, r]) => r - p > .25)); });
    o.steps.forEach(c => { runs = runs.flatMap(([u, w]) => c > u + .05 && c < w - .05 ? [[u, c], [c, w]] : [[u, w]]); });
    runs = runs.filter(([a, b]) => top(clampX((a + b) / 2, a, b)) !== null);
    const topIn = (x, a, b) => top(clampX(x, a, b)), solidAt = x => { for (const [a, b] of runs) if (x > a + .3 && x < b - .3) return top(x); return null; };

    // what lies at a place in the world, the same whichever room builds it (rooms side by side meet in one piece: their own seed would make each its own)
    const WXo = o.wx ?? 0, Hw = (i, j, k = 0) => hsh(i, j, k, 91), m3 = k => ((k % 3) + 3) % 3;
    const along = (x0, x1, base, rnd, salt, fn) => { for (let xw = -640, i = 0; xw < x1 + WXo; xw += base + Hw(i, salt) * rnd, i++) if (xw >= x0 + WXo) fn(xw - WXo, i); };
    const STONES = ["#b8a78e", "#a39482", "#8d8379", "#ad9474"];   // (warm greys, not much lighter than the soil: pebbles, not eggs)
    const pebbleP = v => proto(T, o, "pebble" + v, Q => Q.pebble(60 + v * 5, STONES[0])), rootP = v => proto(T, o, "root" + v, Q => Q.root([1.5, 1.1, 1.8][v], 90 + v * 7));
    // the woods' earth (no bricks: the user, 2026-11-09 "there should be no brick walls there"): a cut bank of soil, bands pressed across it, stones in it, roots hanging
    // under its grass. topAt(x): its top (under the grass); bot: its foot; zf: its face; d: how deep. opts: far (coarser, bigger stones), nc (no clay shadow), bands,
    // deep (how far the stones go), up (they go up from the foot), roots (false: none)
    function soil(a, b, topAt, bot, zf, d, salt, opts = {}) {
      const far = !!opts.far, nc = !!opts.nc;
      K.soilFace(a, b, topAt, bot, zf, d, 7 + salt, far, null, !nc, opts.bands ?? (far ? [[1.2, .65, P.soilL], [2.8, .5, P.soilD], [4.3, .45, P.soilT], [5.9, .55, P.soilL]] : [[1.05, .5, P.soilL], [2.25, .36, P.soilD], [3.35, .3, P.soilT]]));
      const cw = far ? 2.3 : 1.45, ch = far ? 1.6 : 1.2, deep = opts.deep ?? 4;
      for (let k = Math.floor((a + WXo) / cw), k1 = Math.ceil((b + WXo) / cw); k <= k1; k++) for (let r = 0; r * ch < deep; r++) {
        if (Hw(k, r, salt) < (opts.sparse ? .82 : far ? .6 : .52)) continue; const x = (k + .1 + Hw(k, r, salt + 1) * .8) * cw - WXo; if (x < a + .35 || x > b - .35) continue;
        const t = topAt(x), y = opts.up ? bot + .55 + (r + Hw(k, r, salt + 2) * .8) * ch : t - .6 - (r + Hw(k, r, salt + 2) * .8) * ch; if (y > t - .45 || y < bot + .35) continue;
        const sz = (far ? .26 : .15) + Hw(k, r, salt + 3) * (far ? .3 : .22);
        stamp(near, pebbleP((k + r) & 3), at(x, y, zf + .02, 0, 0, Hw(k, r, salt + 4) * 6.28, sz), STONES[Math.floor(Hw(k, r, salt + 5) * STONES.length)], nc); }
      if (opts.roots !== false) for (let k = Math.floor((a + WXo) / 3.6), k1 = Math.ceil((b + WXo) / 3.6); k <= k1; k++) { if (Hw(k, salt + 6) < (opts.sparse ? .75 : .45)) continue;
        const x = (k + .15 + Hw(k, salt + 7) * .7) * 3.6 - WXo; if (x < a + .4 || x > b - .4) continue; const v = m3(k);
        stamp(near, rootP(v), at(x, topAt(x) + .05, zf + .1, 0, 0, (Hw(k, salt + 8) - .5) * .4, (far ? 1.3 : .75) + Hw(k, salt + 9) * .5), v === 2 ? P.rootD : null, nc); }
    }
    // the ends of the woods: walls of earth, banded all the way up (their faces toward you and into the room; tall: no clay shadow from them, or it'd lie over the whole room)
    (o.ends || []).forEach((e, i) => { const ex = e.side < 0 ? 0 : WX, a = e.side < 0 ? ex - 9 : ex, b = e.side < 0 ? ex : ex + 9, bands = [];
      for (let y = 2.4, k = 0; y < 24 - o.FB; y += 2.6 + Hw(i, k, 710) * 1.4, k++) bands.push([y, .38 + Hw(i, k, 711) * .2, [P.soilL, P.soilD, P.soilT][k % 3], true]);
      soil(a, b, () => 24, o.FB, 3.4, 1.2, 700 + i * 13, { nc: true, up: true, deep: 24 - o.FB, roots: false, bands });
      const G = new T.Group(); G.position.x = ex; G.rotation.y = e.side < 0 ? Math.PI / 2 : -Math.PI / 2; K.W.add(G);
      K.soilFace(e.side < 0 ? -2.4 : -11.4, e.side < 0 ? 11.4 : 2.4, () => 24, o.FB, 0, 1.2, 720 + i, false, G, false, bands); });
    // the floor: grass over the woods' earth, down to the floor's underside
    runs.forEach(([a, b]) => { K.grassSlab(a, b, 0, -3.2, 2.7, .6, 3, false, x => topIn(x, a, b)); soil(a, b, x => topIn(x, a, b) - .3, o.FB, 2.45, 5.6, 100); });
    // the land overhead: earth up from its underside, a dirt lip dripping under it, roots hanging (no clay shadow from it: up out of sight, it'd darken the woods' back for nothing you can see)
    o.ceils.forEach((c, i) => { if (c.xb - c.xa < .5) return; K.grassSlab(c.xa, c.xb, c.y + .45, -3.2, 2.7, .55, 50, false, null, P.dirt).userData.cast = false;
      soil(c.xa, c.xb, () => c.y + 7.5, c.y + .2, 2.45, 5.6, 300, { nc: true, up: true, deep: 2.6, roots: false, bands: [[.95, .45, P.soilD, true], [2.1, .4, P.soilL, true]] });
      for (let k = Math.floor((c.xa + WXo) / 2.4), k1 = Math.ceil((c.xb + WXo) / 2.4); k <= k1; k++) { if (Hw(k, 340) < .4) continue; const x = (k + .1 + Hw(k, 341) * .8) * 2.4 - WXo; if (x < c.xa + .4 || x > c.xb - .4) continue; const v = m3(k);
        stamp(near, rootP(v), at(x, c.y + .12, -2.4 + Hw(k, 342) * 4.6, 0, Hw(k, 343) * 6, (Hw(k, 344) - .5) * .3, .45 + Hw(k, 345) * .4), v === 2 ? P.rootD : null, true); } });
    // the back: a bank of grass behind the path, bushes along it (the mockup's); in the ravine (rows C, D) its wall of earth further back, the woods' floor up on top;
    // up in the treetops (row A) the ground just runs back to the drop. Bamboo behind
    const oF = Object.assign({}, o, { lod: (o.lod ?? 1) * .55 });   // (far back, half the size on screen: fewer cuts)
    const bigBush = (x, y, z, i, s, far = false) => { const k = i % 4; stamp(near, proto(T, far ? oF : o, "bush" + k, Q => Q.bush(0, 0, 0, 1, BCOLS[k], BBER[k], 21 + k * 6)), at(x, y, z, 0, (Hw(i, 9) - .5) * .5, 0, s)); };
    const bambooAt = (x, y, z, i, far = true) => { const k = i % 3, w = .95 + Hw(i, 16) * .15; stamp(near, proto(T, far ? oF : o, "bamboo" + k, Q => Q.bamboo(0, 0, 0, 16, .42, 41 + k * 3, 0)), at(x, y, z, 0, Hw(i, 14) * 6, (Hw(i, 15) - .5) * .07, w, 1, w)); };
    const up = o.row === "A" ? .05 : .55, bank = runs.map(([a, b], i) => [i ? a : xL - 14, i < runs.length - 1 ? b : xR + 14]);
    bank.forEach(([a, b], i) => { const [ra, rb] = runs[i]; K.grassSlab(a, b, 0, -9.5, -3.25, .5, 9, true, x => topIn(x, ra, rb) + up); });
    const bankAt = x => { for (let i = 0; i < bank.length; i++) if (x >= bank[i][0] && x <= bank[i][1]) return topIn(x, runs[i][0], runs[i][1]) + up; return null; };
    along(xL - 6, xR + 6, o.row === "A" ? 11 : 6.2, 2.6, 5, (x, i) => { const y = bankAt(x); if (y !== null) bigBush(x, y - .05, -4.3 - Hw(i, 6) * .3, i, (o.row === "A" ? .8 : 1.05) + Hw(i, 7) * .3); });
    // the forest behind (the user, 2026-11-09: "it was trees and space in the background ... what can we do so it's not so much earth that it doesn't look like a
    // forest?"): tall pale trunks standing just behind the path, more up on the woods' floor further back, hazier, then the far woods in pressed layers; in the
    // ravine (rows C, D) its wall of earth stays, hung with big leaves and vines, ferns along its foot and its top, the stones in it few
    const BARK = ["#cbb89b", "#b9a183", "#ad9273", "#c2ab8d"], BARKM = ["#b8b398", "#aeaa90"], BARKF = "#bcc6aa";
    const trunkP = (v, far) => proto(T, far ? oF : o, "ftrunk" + v + (far ? "f" : ""), Q => Q.fTrunk(30, 1, 120 + v * 7, far));
    const trunkAt = (x, y, z, r, i, col, far = false) => stamp(near, trunkP(((i % 3) + 3) % 3, far), at(x, y, z, 0, Hw(i, 640) * 6.28, (Hw(i, 641) - .5) * .05, r, .8, r), col, far);
    const leafP = k => proto(T, o, "wleaf" + k, Q => Q.mesh(Q.leafGeo(1, .42, .05), ["#4fae4a", "#3d9a44", "#62bf55"][k]));
    const fernP = k => proto(T, o, "fern" + k, Q => Q.fern(150 + k * 3, k ? ["#4fb04a", "#3a9a44"] : ["#5cbf50", "#46a64a"]));
    const vineP = k => proto(T, o, "vine" + k, Q => Q.vine([1.8, 2.6, 3.4][k], 160 + k));
    const palmP = (v, far) => proto(T, far ? oF : o, "palm" + v + (far ? "f" : ""), Q => Q.palm(7 + v * 1.6, 170 + v * 5, far)), tfernP = v => proto(T, oF, "tfern" + v, Q => Q.treeFern(3.4 + v * .9, 180 + v * 3, true));
    const flamP = v => proto(T, oF, "flam" + v, Q => Q.flamboyan(190 + v, true));
    const treeAt = (x, y, z, i, k, far = true) => { const h = Hw(i, k, 700), ry = Hw(i, k, 701) * 6.28;   // (the rainforest's mix: tall pale trunks, sierra palms, tree ferns, a flamboyán now and then)
      if (h < .44) trunkAt(x, y - .25, z, .42 + Hw(i, k, 702) * .24, i, BARKM[i & 1], far);
      else if (h < .66) stamp(near, palmP(m3(i), far), at(x, y - .1, z, 0, ry, 0, .9 + Hw(i, k, 703) * .3), null, far);
      else if (h < .86) stamp(near, tfernP(m3(i)), at(x, y - .05, z, 0, ry, 0, .9 + Hw(i, k, 704) * .3), null, true);
      else stamp(near, flamP(i & 1), at(x, y - .1, z, 0, (Hw(i, k, 705) - .5) * .5, 0, .85 + Hw(i, k, 706) * .3), null, true); };
    const frontTrunks = (z0, zr) => along(xL - 8, xR + 8, 9, 7, 620, (x, i) => { const y = bankAt(x); if (y === null || Hw(i, 621) < .2) return; const z = z0 - Hw(i, 622) * zr;
      if (Hw(i, 624) < .72) trunkAt(x, y - .35, z, .5 + Hw(i, 623) * .28, i, BARK[i % 4]); else stamp(near, palmP(m3(i), false), at(x, y - .2, z, 0, Hw(i, 625) * 6.28, 0, 1.05)); });
    if (o.bgY > 1) { const bt = o.bgY, lip = Math.min(bt - .5, 1.5), zS = -16.5, slopeY = z => { const t = Math.max(0, Math.min(1, (-9.55 - z) / (-9.55 - zS))); return lip + (bt - lip) * t * t * (3 - 2 * t); };
      // (the ravine: a low lip of earth behind the path, hung with leaves; from it a green bank rising back to the woods' floor, ferns, bushes and trees all up it)
      soil(xL - 26, xR + 26, () => lip, -1, -9.6, 3, 500, { far: true, deep: 2, sparse: true, roots: false, bands: [[.9, .4, P.soilL]] });
      K.grassSlab(xL - 26, xR + 26, lip, -10.6, -9.5, .4, 18, true);
      K.slope(xL - 26, xR + 26, -10.5, zS, lip - .05, bt, 17, "#49aa45"); K.grassSlab(xL - 26, xR + 26, bt, -32, zS + .2, .5, 19, true);
      along(xL - 22, xR + 22, 1.5, 1.4, 600, (x, i) => { if (Hw(i, 601) < .35) return; stamp(near, leafP(i % 3), at(x, lip - .35 - Hw(i, 602) * (lip + .3) * .7, -9.42, -.3, 0, Math.PI + (Hw(i, 605) - .5) * 1.7, .9 + Hw(i, 606) * .8), null, true); });
      along(xL - 18, xR + 18, 2.4, 2.2, 609, (x, i) => stamp(near, fernP(i & 1), at(x, lip - .05, -10.1, 0, (Hw(i, 610) - .5) * .6, 0, 1.1 + Hw(i, 611) * .5), null, true));
      along(xL - 20, xR + 20, 1.6, 1.6, 612, (x, i) => { const z = -11 - Hw(i, 613) * 5; stamp(near, fernP(i & 1), at(x, slopeY(z) - .1, z, 0, (Hw(i, 614) - .5) * .8, 0, 1.2 + Hw(i, 615) * .7), null, true); });
      along(xL - 16, xR + 16, 4.2, 3.4, 31, (x, i) => { const z = -11.2 - Hw(i, 32) * 4.5; bigBush(x, slopeY(z) - .1, z, i + 40, .9 + Hw(i, 33) * .35, true); });
      along(xL - 16, xR + 16, 3.6, 3.2, 630, (x, i) => { const z = -11.6 - Hw(i, 631) * 4.4; treeAt(x, slopeY(z), z, i, 1); });
      along(xL - 24, xR + 24, 3.2, 2.8, 650, (x, i) => trunkAt(x, bt - .15, -18 - Hw(i, 651) * 4, .36 + Hw(i, 652) * .16, i + 1, BARKF, true));
      frontTrunks(-7.7, 1.1);
    } else if (o.row === "A") {   // (up in the treetops: palm crowns and tree ferns standing up out of the canopy below, behind the path)
      along(xL - 12, xR + 12, 5.5, 4, 670, (x, i) => { const z = -6.5 - Hw(i, 671) * 6, h = Hw(i, 672); if (h < .5) stamp(near, palmP(m3(i), true), at(x, -7.5 + Hw(i, 673) * 2.5, z, 0, Hw(i, 674) * 6.28, 0, 1.1), null, true); else if (h < .8) stamp(near, tfernP(m3(i)), at(x, -3.4 + Hw(i, 675) * 1.6, z, 0, Hw(i, 676) * 6.28, 0, 1.15), null, true); });
    } else { const fy = o.bgY + .3;   // (row B: the woods' floor runs on back behind the bank, trees all over it)
      K.grassSlab(xL - 26, xR + 26, fy, -30, -9.4, .5, 23, true);
      along(xL - 8, xR + 8, 7, 4, 11, (x, i) => { const y = bankAt(x); if (Hw(i, 12) > .6) bambooAt(x, (y ?? o.bgY + .55) - 2.5, -7 - Hw(i, 13) * 1.2, i); });
      along(xL - 16, xR + 16, 4.2, 3.4, 630, (x, i) => treeAt(x, fy, -11.8 - Hw(i, 631) * 2.6, i, 2));
      along(xL - 24, xR + 24, 3.4, 3, 650, (x, i) => trunkAt(x, fy - .15, -18 - Hw(i, 651) * 3.5, .36 + Hw(i, 652) * .16, i + 1, BARKF, true));
      along(xL - 14, xR + 14, 6, 3, 660, (x, i) => stamp(near, fernP(i & 1), at(x, fy - .05, -10.2 - Hw(i, 661) * 1.5, 0, (Hw(i, 662) - .5) * .6, 0, 1.3 + Hw(i, 663) * .5), null, true));
      frontTrunks(-7.3, 1.3);
    }
    // on the floor: flowers along its lip, small bushes behind the path, flowers lying in the grass, a clover or a flower pressed on the earth, a tree
    const flowerP = k => proto(T, o, "flower" + k, Q => Q.flower(0, 0, 0, 1, ["#e2262a", "#ff7bb0", "#ffd23a", "#ffffff"][k]));
    along(xL + 1, xR, 2.9, 1.4, 20, (x, i) => { const y = solidAt(x); if (y !== null) stamp(near, flowerP(i % 4 === 3 ? 1 : 0), at(x, y + (Hw(i, 21) - .3) * .1 - .05, 2.62, -.2, 0, i, .9 + (i % 3) * .15)); });
    along(xL + 4, xR - 2, 8, 4, 22, (x, i) => { const y = solidAt(x); if (y === null) return; const k = i % 2;
      stamp(near, proto(T, o, "sbush" + k, Q => Q.bush(0, 0, 0, 1, ["#4fc24a", P.leafD], [P.berryR, P.berryB][k], 70 + k)), at(x, y, -2.1 - Hw(i, 23) * .5, 0, 0, 0, .55)); });
    along(xL, xR, 1.1, 1.8, 24, (x, i) => { const z = -2.8 + Hw(i, 25) * 5, y = solidAt(x); if (y === null || Math.abs(z) < .9) return; stamp(near, flowerP(i % 4), at(x, y + .02, z, -Math.PI / 2 + .35, 0, i, .55 + Hw(i, 26) * .25)); });
    if (o.FB < -1.2) along(xL + 3, xR, 5, 3, 27, (x, i) => { const y = solidAt(x); if (y === null || y - o.FB < 1.6) return;
      const yy = y - .9 - Hw(i, 28) * Math.min(2.5, y - o.FB - 1.4); if (i % 2) stamp(near, flowerP(0), at(x, yy, 2.62, 0, 0, i * .7, 1.05)); else stamp(near, proto(T, o, "clover", Q => Q.clover(0, 0, 0, 1)), at(x, yy, 2.66, 0, 0, i * .5, 1.15)); });
    if (o.trees) { const tx = 8 + R(1, 30) * (WX - 16), y = solidAt(tx); if (y !== null) stamp(near, proto(T, o, "tree" + (sd % 2), Q => Q.tree(0, 0, 0, sd % 2 ? 6 : 5.4, 1, 31 + (sd % 2) * 6, !(sd % 2))), at(tx, y, -2.3, 0, 0, 0, 1)); }
    // the platforms: a mushroom shelf on a trunk, a great leaf on its stalk, a log; the rest floating slabs of grass on an earth block
    o.plats.forEach((p, i) => { const w = p.xb - p.xa, cx = (p.xa + p.xb) / 2, gy = solidAt(cx);
      if (p.kind === "fungus" || p.kind === "fungus2") {
        const sh = K.mesh(K.lumpify(new T.SphereGeometry(1, K.sg(32, 10), K.sg(14, 5), 0, Math.PI * 2, 0, Math.PI / 2).scale(w / 2 + .2, .42, 1.25), .03, 2, 80 + i), p.kind === "fungus2" ? "#f08a3a" : "#e5402f", cx, p.top - .42, 0);
        for (let k = 0; k < Math.round(w * 2.2); k++) K.mesh(new T.SphereGeometry(.1, K.sg(10, 5), K.sg(6, 3)).scale(1, .45, 1), P.cream, cx + (R(i * 40 + k, 31) - .5) * w * .9, p.top - .02, (R(i * 40 + k, 32) - .5) * 1.6);
        const base = gy ?? p.top - 9, g = new T.Group(); g.position.set(cx, base, -1.9); K.W.add(g); K.trunk(p.top + 5 - base, .55, .7, 90 + i, g);
      } else if (p.kind === "shroom") {   // a great clay leaf lying flat, its stalk curving down to the ground
        const lg = K.leafGeo(w + .8, 1.3, .1).rotateZ(-Math.PI / 2).rotateX(-Math.PI / 2).translate(-(w + .8) / 2, 0, 0); K.mesh(lg, "#4fbf4a", cx, p.top - .08, 0);
        K.mesh(new T.CapsuleGeometry(.05, w * .8, K.sg(4, 2), K.sg(8, 4)).rotateZ(Math.PI / 2), "#2c8a36", cx, p.top + .02, 0);
        const by = gy ?? p.top - 7, pts = [new T.Vector3(cx, p.top - .1, 0), new T.Vector3(cx - .4, (p.top + by) / 2, -.5), new T.Vector3(cx - .2, by, -.9)];
        K.mesh(K.lumpify(new T.TubeGeometry(new T.CatmullRomCurve3(pts), K.sg(24, 8), .14, K.sg(10, 5), false), .01, 6, 85 + i), "#3f9a3f");
      } else if (p.kind === "log") {
        K.mesh(K.lumpify(new T.CapsuleGeometry(.36, Math.max(.1, w - .72), K.sg(6, 3), K.sg(20, 8)).rotateZ(Math.PI / 2), .02, 3, 70 + i), "#9a5a2e", cx, p.top - .36, 0);
        for (let x = p.xa + .6; x < p.xb - .5; x += .7) K.mesh(new T.TorusGeometry(.37, .04, K.sg(6, 3), K.sg(20, 8)).rotateY(Math.PI / 2), "#7a4220", x, p.top - .36, 0);
      } else { K.grassSlab(p.xa, p.xb, p.top, -1.3, 1.3, .45, 30 + i + sd);
        K.mesh(K.lumpify(K.rbox(Math.max(.6, w - .3), 1.05, 2.2, .35, K.step(w, .18), K.sg(7, 4), K.sg(9, 4)), .06, 1.3, 40 + i), P.soil, cx, p.top - .95, 0); } });
    gather(T, K.W, near);
    // far off (made once a room's width and row, kept): the clouds, the pressed hills (round the woods' own ground, bgY; under the treetops, lower)
    const ks = Math.round(WX), bx0 = -34, bx1 = WX + 34, farG = new T.Group(); farG.name = "clayFar";
    const kept = (parts, grp) => vcOf(T, o, parts).forEach(({ cast, geo }) => { const m = new T.Mesh(geo, matV(o.toon)); m.userData.keepMat = m.userData.keepGeo = true; if (cast) m.layers.enable(o.layer ?? 7); grp.add(m); });
    const cloudG = new T.Group(); cloudG.position.y = o.row === "A" ? -8 : 0; farG.add(cloudG);   // (up in the treetops the camera's higher: the clouds down into sight)
    kept(proto(T, o, "clouds" + ks, Q => { for (let x = bx0 + 4, i = 0; x < bx1; x += 15 + hsh(i, 1, 1, 8) * 6, i++) Q.cloud(x, 17.5 + hsh(i, 2, 2, 8) * 5, -30, 1.8 + hsh(i, 3, 3, 8) * .9); }), cloudG);
    const tops = o.row !== "A" ? null : proto(T, o, "tops" + ks, Q => {   // (the treetops' far view: the mogotes standing up out of the forest, the hills' layers in front)
      for (let x = bx0 + 6, i = 0; x < bx1; x += 13 + hsh(i, 11, 11, 8) * 9, i++) Q.cutout(Q.mogote(x, -8, 9 + hsh(i, 12, 12, 8) * 6, 13 + hsh(i, 13, 13, 8) * 6, i), .5, i % 2 ? "#a3cfaa" : "#97c8a0", -40 + hsh(i, 14, 14, 8) * 2);
      Q.cutout(Q.blobLine(bx0, bx1, -8, 4.2, Math.round((bx1 - bx0) * .098), 3), .5, "#8fd0a8", -26);
      Q.cutout(Q.blobLine(bx0 + 6, bx1 - 6, -8, 2.4, Math.round((bx1 - bx0 - 12) * .1375), 7), .55, "#5daf73", -18);
      Q.cutout(Q.blobLine(bx0 + 12, bx1 - 12, -8, .9, Math.round((bx1 - bx0 - 24) * .19), 11), .6, "#3f9a52", -11.5); });
    const woods = o.row === "A" ? null : proto(T, o, "woods" + ks, Q => {   // (the far woods: pressed trunks two layers deep, hazier as they go, a canopy over them)
      Q.cutout(Q.blobLine(bx0, bx1, -8, 1.6, Math.round((bx1 - bx0) * .09), 3), .5, "#a8cdae", -36);
      for (let x = bx0 + 1, i = 0; x < bx1; x += 2.4 + hsh(i, 4, 4, 8) * 2.2, i++) Q.cutout(Q.trunkSil(x, -8, 34, .3 + hsh(i, 5, 5, 8) * .16, i), .3, "#c2d3b8", -32 + hsh(i, 6, 6, 8));
      for (let x = bx0 + 2, i = 0; x < bx1; x += 3 + hsh(i, 7, 7, 8) * 2.6, i++) Q.cutout(Q.trunkSil(x, -8, 34, .4 + hsh(i, 8, 8, 8) * .2, i + 40), .35, "#b2c3a2", -26.5 + hsh(i, 9, 9, 8));
      Q.cutout(Q.hangLine(bx0, bx1, 34, 14.5, Math.round((bx1 - bx0) * .12), 21), .6, "#8ec497", -29);
      Q.cutout(Q.hangLine(bx0, bx1, 34, 16, Math.round((bx1 - bx0) * .1), 23), .6, "#79b583", -23.5); });
    const hillG = new T.Group(); hillG.name = "clayHills"; hillG.position.y = o.row === "A" ? -5 : o.bgY; kept(woods || tops, hillG); farG.add(hillG);
    if (o.row === "A") { const cg = proto(T, o, "canopy" + ks, Q => { Q.cutout(Q.blobLine(bx0, bx1, -14, -3.2, Math.round((bx1 - bx0) * .16), 17), .7, "#4fae5a", -9);
      Q.cutout(Q.blobLine(bx0 + 4, bx1 - 4, -14, -4.6, Math.round((bx1 - bx0) * .2), 19), .7, "#3a9a4c", -6); });   // (the treetops' crowns, below)
      kept(cg, farG); }
    return [meshes(T, o, near, "clayNear"), farG];
  }

  // ── CLAYIFY (the user, 2026-11-09: "let's build the full game like this"): any piece the game builds (a world's builder, a room's set pieces, a cutscene's set)
  // made clay where it stands: its shape divided finely, its corners rounded, pressed lumpy, its painted colours (its texture too) baked into its vertices, then one
  // clay material for all of it. Each piece keeps its place in the scene (in place) so what the game moves, swaps or hides still works; or, for a group that never
  // moves (o.merge), all of it merged into a draw or two. What it leaves as it was: see-through, glowing and unlit things, sprites, points, instanced and skinned meshes
  const TEXC = new WeakMap(), SHAREC = new Map();
  const s2l = c => c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4);
  function texData(T, tex) {   // (a texture's picture, small, to read colours from)
    if (!tex || !tex.image) return null; let r = TEXC.get(tex); if (r !== undefined) return r; r = null;
    try { const im = tex.image, iw = im.width || im.videoWidth || 0, ih = im.height || im.videoHeight || 0;
      if (iw && ih) { const sc = Math.min(1, 96 / Math.max(iw, ih)), w = Math.max(1, Math.round(iw * sc)), h = Math.max(1, Math.round(ih * sc)), c = document.createElement("canvas"); c.width = w; c.height = h;
        const g = c.getContext("2d", { willReadFrequently: true });
        if (im.data && im.data.length === iw * ih * 4) { const c0 = document.createElement("canvas"); c0.width = iw; c0.height = ih; c0.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(im.data.buffer ? im.data : im.data), iw, ih), 0, 0); g.drawImage(c0, 0, 0, w, h); }
        else g.drawImage(im, 0, 0, w, h);
        const d = g.getImageData(0, 0, w, h).data, lin = new Float32Array(w * h * 3); for (let i = 0; i < w * h; i++) { lin[i * 3] = s2l(d[i * 4] / 255); lin[i * 3 + 1] = s2l(d[i * 4 + 1] / 255); lin[i * 3 + 2] = s2l(d[i * 4 + 2] / 255); }
        tex.updateMatrix && tex.matrixAutoUpdate && tex.updateMatrix(); r = { w, h, lin, m: tex.matrix.elements.slice(), ws: tex.wrapS, wt: tex.wrapT, fy: tex.flipY }; } } catch (e) { r = null; }
    TEXC.set(tex, r); return r; }
  const wrap = (u, w) => w === 1000 ? u - Math.floor(u) : w === 1002 ? (Math.floor(u) % 2 ? 1 - (u - Math.floor(u)) : u - Math.floor(u)) : Math.min(1, Math.max(0, u));   // (Repeat 1000, Mirrored 1002, else clamped)
  function texAt(D, u, v, out) { const m = D.m, uu = wrap(m[0] * u + m[3] * v + m[6], D.ws), vv = wrap(m[1] * u + m[4] * v + m[7], D.wt), x = Math.min(D.w - 1, Math.floor(uu * D.w)), y = Math.min(D.h - 1, Math.floor((D.fy ? 1 - vv : vv) * D.h)), i = (y * D.w + x) * 3;
    out[0] *= D.lin[i]; out[1] *= D.lin[i + 1]; out[2] *= D.lin[i + 2]; }
  const kq = (x, y, z) => (Math.round(x * 1e4) * 73856093) ^ (Math.round(y * 1e4) * 19349663) ^ (Math.round(z * 1e4) * 83492791);
  // a shape as plain arrays (its place, its colours) in the space m4 takes it to, triangles indexed; vertices at one spot made one
  function soup(T, geo, m4, mat, colOf, vcolOf) {
    const P = geo.attributes.position, UV = geo.attributes.uv, VC = mat.vertexColors && geo.attributes.color, idx = geo.index ? geo.index.array : null, nTri = (idx ? idx.length : P.count) / 3 | 0;
    const D = mat.map ? texData(T, mat.map) : null, base = colOf(mat), v = new T.Vector3(), c = [0, 0, 0], vf = vcolOf ? vcolOf(mat) : null, N0 = geo.attributes.normal, nm0 = new T.Matrix3().getNormalMatrix(m4), w = new T.Vector3();
    const pos = [], col = [], cnt = [], map = new Map(), rem = new Int32Array(P.count).fill(-1), tri = [];
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m4); const k = kq(v.x, v.y, v.z); let l = map.get(k), hit = -1;
      if (l !== undefined) for (const j of l) if (Math.abs(pos[j * 3] - v.x) < 2e-4 && Math.abs(pos[j * 3 + 1] - v.y) < 2e-4 && Math.abs(pos[j * 3 + 2] - v.z) < 2e-4) { hit = j; break; }
      c[0] = base.r; c[1] = base.g; c[2] = base.b; if (VC) { c[0] *= VC.getX(i); c[1] *= VC.getY(i); c[2] *= VC.getZ(i); } if (D && UV) texAt(D, UV.getX(i), UV.getY(i), c); if (vf) { if (N0) w.fromBufferAttribute(N0, i).applyMatrix3(nm0).normalize(); else w.set(0, 0, 1); vf(v.x, v.y, v.z, c, w.x, w.y, w.z); }
      if (hit < 0) { hit = pos.length / 3; pos.push(v.x, v.y, v.z); col.push(c[0], c[1], c[2]); cnt.push(1); if (l === undefined) map.set(k, [hit]); else l.push(hit); }
      else { col[hit * 3] += c[0]; col[hit * 3 + 1] += c[1]; col[hit * 3 + 2] += c[2]; cnt[hit]++; }
      rem[i] = hit; }
    for (let i = 0; i < cnt.length; i++) { col[i * 3] /= cnt[i]; col[i * 3 + 1] /= cnt[i]; col[i * 3 + 2] /= cnt[i]; }
    // (a shape whose triangles wind the wrong way round, lit by normals of its own: its triangles turned, so the light lands as it did)
    const N = geo.attributes.normal; let agree = 0; const nm = new T.Matrix3().getNormalMatrix(m4), nv = new T.Vector3();
    for (let t = 0; t < nTri; t++) { const i0 = idx ? idx[t * 3] : t * 3, i1 = idx ? idx[t * 3 + 1] : t * 3 + 1, i2 = idx ? idx[t * 3 + 2] : t * 3 + 2, a = rem[i0], b = rem[i1], d = rem[i2]; if (a === b || b === d || a === d) continue; tri.push(a, b, d);
      if (N && t % 5 === 0) { const ux = pos[b * 3] - pos[a * 3], uy = pos[b * 3 + 1] - pos[a * 3 + 1], uz = pos[b * 3 + 2] - pos[a * 3 + 2], vx = pos[d * 3] - pos[a * 3], vy = pos[d * 3 + 1] - pos[a * 3 + 1], vz = pos[d * 3 + 2] - pos[a * 3 + 2];
        nv.fromBufferAttribute(N, i0).applyMatrix3(nm); const dt = (uy * vz - uz * vy) * nv.x + (uz * vx - ux * vz) * nv.y + (ux * vy - uy * vx) * nv.z; agree += dt > 0 ? 1 : dt < 0 ? -1 : 0; } }
    if (agree < 0) for (let t = 0; t < tri.length; t += 3) { const q = tri[t + 1]; tri[t + 1] = tri[t + 2]; tri[t + 2] = q; }
    return { pos, col, tri }; }
  // long edges halved (each edge once, shared by the triangles on both sides of it) till none is longer than E, or the shape's got as many triangles as it may
  function tess(S, E, cap, win) {   // (win [x0, x1]: only where the room's camera can see is cut fine; further along, the shape stays as coarse as it was)
    // a flat four-sided face (two triangles sharing their long edge: a box's side, a board, a deck) is cut into an even grid; what's left, triangle by triangle,
    // by halving its longest edge. The grid's cuts along an edge are halvings too, so a triangle beside it is cut at the same places (forced: those edges halved
    // as deep as the grid's). Then vertices at one place made one
    const E2 = E * E; let { pos, col, tri } = S;
    const P3 = i => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]], d2 = (a, b) => { const dx = pos[a * 3] - pos[b * 3], dy = pos[a * 3 + 1] - pos[b * 3 + 1], dz = pos[a * 3 + 2] - pos[b * 3 + 2]; return dx * dx + dy * dy + dz * dz; };
    const seenX = (xa, xb, z) => !win || (xb > win[0] - (10 + Math.max(0, -z) * .65) && xa < win[1] + (10 + Math.max(0, -z) * .65));
    const seen = (a, b) => seenX(Math.min(pos[a * 3], pos[b * 3]), Math.max(pos[a * 3], pos[b * 3]), (pos[a * 3 + 2] + pos[b * 3 + 2]) / 2);
    const ek = (a, b) => a < b ? a * 4194304 + b : b * 4194304 + a, pw2 = l => l <= E ? 1 : Math.pow(2, Math.ceil(Math.log2(l / E) - 1e-9));
    const nT = tri.length / 3, edgeT = new Map(), nrm = new Float32Array(nT * 3), longE = new Int8Array(nT);
    for (let t = 0; t < nT; t++) { const a = tri[t * 3], b = tri[t * 3 + 1], c = tri[t * 3 + 2], la = d2(a, b), lb = d2(b, c), lc = d2(c, a); longE[t] = la >= lb && la >= lc ? 0 : lb >= lc ? 1 : 2;
      const A = P3(a), B = P3(b), C = P3(c), ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2]; let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nrm[t * 3] = nx / l; nrm[t * 3 + 1] = ny / l; nrm[t * 3 + 2] = nz / l;
      for (let e = 0; e < 3; e++) { const k = ek(tri[t * 3 + e], tri[t * 3 + (e + 1) % 3]); const L0 = edgeT.get(k); if (L0) L0.push(t); else edgeT.set(k, [t]); } }
    const used = new Uint8Array(nT), forced = new Map(), out = [], gp = [], gc = [];   // (gp, gc: the grids' own vertices, added after)
    const base = pos.length / 3; let any = false;
    for (let t = 0; t < nT; t++) { if (used[t]) continue; const e = longE[t], a = tri[t * 3 + e], b = tri[t * 3 + (e + 1) % 3], c = tri[t * 3 + (e + 2) % 3], L0 = edgeT.get(ek(a, b));
      if (!L0 || L0.length !== 2) continue; const u = L0[0] === t ? L0[1] : L0[0]; if (used[u]) continue; const eu = longE[u], ua = tri[u * 3 + eu], ub = tri[u * 3 + (eu + 1) % 3]; if (ek(ua, ub) !== ek(a, b)) continue;
      if (nrm[t * 3] * nrm[u * 3] + nrm[t * 3 + 1] * nrm[u * 3 + 1] + nrm[t * 3 + 2] * nrm[u * 3 + 2] < .9995) continue;
      const d = tri[u * 3 + (eu + 2) % 3], s0 = Math.sqrt(d2(a, d)), s1 = Math.sqrt(d2(d, b)), s2 = Math.sqrt(d2(c, b)), s3 = Math.sqrt(d2(a, c));
      if (Math.abs(s0 - s2) > .05 * Math.max(s0, s2) + 1e-4 || Math.abs(s1 - s3) > .05 * Math.max(s1, s3) + 1e-4) continue;   // (a parallelogram, near enough: or its cuts wouldn't meet its neighbours')
      const xs = [a, b, c, d].map(i => pos[i * 3]), zs = [a, b, c, d].map(i => pos[i * 3 + 2]); if (!seenX(Math.min(...xs), Math.max(...xs), (zs[0] + zs[1] + zs[2] + zs[3]) / 4)) continue;
      const nu = pw2(s0), nv = pw2(s1); if (nu * nv === 1) continue; used[t] = used[u] = 1; any = true;
      [[a, d, nu], [d, b, nv], [c, b, nu], [a, c, nv]].forEach(([p, q, n]) => forced.set(ek(p, q), n));
      const G = (i, j) => { const uu = i / nu, vv = j / nv, w = [(1 - uu) * (1 - vv), uu * (1 - vv), uu * vv, (1 - uu) * vv], ids = [a, d, b, c], k = base + gp.length / 3;
        for (let q = 0; q < 3; q++) { gp.push(w[0] * pos[ids[0] * 3 + q] + w[1] * pos[ids[1] * 3 + q] + w[2] * pos[ids[2] * 3 + q] + w[3] * pos[ids[3] * 3 + q]); gc.push(w[0] * col[ids[0] * 3 + q] + w[1] * col[ids[1] * 3 + q] + w[2] * col[ids[2] * 3 + q] + w[3] * col[ids[3] * 3 + q]); } return k; };
      const ix = []; for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) ix.push(G(i, j));
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const p00 = ix[j * (nu + 1) + i], p10 = ix[j * (nu + 1) + i + 1], p11 = ix[(j + 1) * (nu + 1) + i + 1], p01 = ix[(j + 1) * (nu + 1) + i]; out.push(p00, p10, p11, p00, p11, p01); } }
    let rest = []; for (let t = 0; t < nT; t++) if (!used[t]) rest.push(tri[t * 3], tri[t * 3 + 1], tri[t * 3 + 2]);
    // the rest: each triangle's longest edge halved (and any edge the grid beside it was cut along, as deep as it was), pass by pass
    let fz = new Map(); forced.forEach((n, k) => { if (n > 1) fz.set(k, n); });
    for (let pass = 0; pass < 14 && (rest.length + out.length) / 3 < cap; pass++) {
      const mid = new Map(), nxt = [], nf = new Map(), want = new Set(); let hit = false;
      const M = (a, b) => { const k = ek(a, b); let m = mid.get(k); if (m === undefined) { m = pos.length / 3; for (let q = 0; q < 3; q++) { pos.push((pos[a * 3 + q] + pos[b * 3 + q]) / 2); col.push((col[a * 3 + q] + col[b * 3 + q]) / 2); } mid.set(k, m); const n = fz.get(k); if (n > 2) { nf.set(ek(a, m), n / 2); nf.set(ek(m, b), n / 2); } } return m; };
      for (let t = 0; t < rest.length; t += 3) { const a = rest[t], b = rest[t + 1], c = rest[t + 2], la = d2(a, b), lb = d2(b, c), lc = d2(c, a);
        if (la >= lb && la >= lc) { if (la > E2 && seen(a, b)) want.add(ek(a, b)); } else if (lb >= lc) { if (lb > E2 && seen(b, c)) want.add(ek(b, c)); } else if (lc > E2 && seen(c, a)) want.add(ek(c, a)); }
      fz.forEach((n, k) => want.add(k));
      for (let t = 0; t < rest.length; t += 3) { const a = rest[t], b = rest[t + 1], c = rest[t + 2], sa = want.has(ek(a, b)), sb = want.has(ek(b, c)), sc = want.has(ek(c, a));
        if (sa || sb || sc) hit = true;
        if (sa && sb && sc) { const ab = M(a, b), bc = M(b, c), ca = M(c, a); nxt.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca); }
        else if (sa && sb) { const ab = M(a, b), bc = M(b, c); nxt.push(a, ab, c, ab, bc, c, ab, b, bc); }
        else if (sb && sc) { const bc = M(b, c), ca = M(c, a); nxt.push(a, b, ca, b, bc, ca, ca, bc, c); }
        else if (sc && sa) { const ca = M(c, a), ab = M(a, b); nxt.push(a, ab, ca, ab, b, c, ca, ab, c); }
        else if (sa) { const ab = M(a, b); nxt.push(a, ab, c, ab, b, c); }
        else if (sb) { const bc = M(b, c); nxt.push(a, b, bc, a, bc, c); }
        else if (sc) { const ca = M(c, a); nxt.push(a, b, ca, ca, b, c); }
        else nxt.push(a, b, c); }
      rest = nxt; fz = nf; if (!hit) break; any = true; }
    if (!any) { S.pos = pos; S.col = col; S.tri = tri; return S; }
    // the grids' vertices put after the rest's, then all made one where they meet (the grid's edge on its neighbours' halvings)
    const off = pos.length / 3; for (let t = 0; t < out.length; t++) out[t] = out[t] - base + off; for (let i = 0; i < gp.length; i++) { pos.push(gp[i]); col.push(gc[i]); }
    const all = rest.concat(out), n = pos.length / 3, map = new Map(), rem = new Int32Array(n), P2 = [], C2 = [];
    for (let i = 0; i < n; i++) { const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2], k = kq(x, y, z); let l = map.get(k), h = -1;
      if (l) for (const j of l) if (Math.abs(P2[j * 3] - x) < 2e-4 && Math.abs(P2[j * 3 + 1] - y) < 2e-4 && Math.abs(P2[j * 3 + 2] - z) < 2e-4) { h = j; break; }
      if (h < 0) { h = P2.length / 3; P2.push(x, y, z); C2.push(col[i * 3], col[i * 3 + 1], col[i * 3 + 2]); if (l) l.push(h); else map.set(k, [h]); } rem[i] = h; }
    const T2 = []; for (let t = 0; t < all.length; t += 3) { const a = rem[all[t]], b = rem[all[t + 1]], c = rem[all[t + 2]]; if (a !== b && b !== c && a !== c) T2.push(a, b, c); }
    S.pos = P2; S.col = C2; S.tri = T2; return S; }
  // corners rounded: each vertex drawn toward its neighbours and back (Taubin's way, so the shape doesn't shrink), no further than rM; an open edge's vertices stay put
  function round(S, rM, it = 3) {
    const { pos, tri } = S, n = pos.length / 3, nb = Array.from({ length: n }, () => []), ec = new Map();
    for (let t = 0; t < tri.length; t += 3) for (let e = 0; e < 3; e++) { const a = tri[t + e], b = tri[t + (e + 1) % 3]; if (!nb[a].includes(b)) nb[a].push(b); if (!nb[b].includes(a)) nb[b].push(a); const k = a < b ? a * 4194304 + b : b * 4194304 + a; ec.set(k, (ec.get(k) || 0) + 1); }
    const fix = new Uint8Array(n); ec.forEach((c, k) => { if (c === 1) { fix[Math.floor(k / 4194304)] = 1; fix[k % 4194304] = 1; } });
    const o0 = Float32Array.from(pos), tmp = new Float32Array(n * 3);
    for (let i = 0; i < it * 2; i++) { const f = i % 2 ? -.53 : .5;
      for (let v = 0; v < n; v++) { const L = nb[v]; if (fix[v] || !L.length) { tmp[v * 3] = pos[v * 3]; tmp[v * 3 + 1] = pos[v * 3 + 1]; tmp[v * 3 + 2] = pos[v * 3 + 2]; continue; }
        let x = 0, y = 0, z = 0; for (const j of L) { x += pos[j * 3]; y += pos[j * 3 + 1]; z += pos[j * 3 + 2]; } x /= L.length; y /= L.length; z /= L.length;
        tmp[v * 3] = pos[v * 3] + (x - pos[v * 3]) * f; tmp[v * 3 + 1] = pos[v * 3 + 1] + (y - pos[v * 3 + 1]) * f; tmp[v * 3 + 2] = pos[v * 3 + 2] + (z - pos[v * 3 + 2]) * f; }
      for (let q = 0; q < n * 3; q++) pos[q] = tmp[q]; }
    for (let v = 0; v < n; v++) { const dx = pos[v * 3] - o0[v * 3], dy = pos[v * 3 + 1] - o0[v * 3 + 1], dz = pos[v * 3 + 2] - o0[v * 3 + 2], d = Math.hypot(dx, dy, dz);
      if (d > rM) { const k = rM / d; pos[v * 3] = o0[v * 3] + dx * k; pos[v * 3 + 1] = o0[v * 3 + 1] + dy * k; pos[v * 3 + 2] = o0[v * 3 + 2] + dz * k; } }
    return S; }
  function thickOf(S) {   // (how thick a shape is, near enough: twice its volume over its skin. A bunch of vines merged into one is thin, whatever its box)
    const p = S.pos, t = S.tri; let V = 0, A = 0, cx = 0, cy = 0, cz = 0; const n = p.length / 3; for (let i = 0; i < n; i++) { cx += p[i * 3]; cy += p[i * 3 + 1]; cz += p[i * 3 + 2]; } cx /= n; cy /= n; cz /= n;   // (taken round its own middle, so an open shape's missing ends count for little)
    for (let i = 0; i < t.length; i += 3) { const a = t[i] * 3, b = t[i + 1] * 3, c = t[i + 2] * 3, ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; A += Math.hypot(nx, ny, nz) / 2; V += ((p[a] - cx) * nx + (p[a + 1] - cy) * ny + (p[a + 2] - cz) * nz) / 6; }
    return A > 0 ? 2 * Math.abs(V) / A : 0; }
  function geoOf(T, S) { const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(new Float32Array(S.pos), 3)); g.setAttribute("color", new T.BufferAttribute(new Float32Array(S.col), 3));
    g.setIndex(new T.BufferAttribute((S.pos.length / 3 > 65535 ? Uint32Array : Uint16Array).from(S.tri), 1)); g.computeVertexNormals(); return g; }
  function press(g, amp, freq, ox, seed) {   // (lumps, along the normals; the noise from where it is in the world)
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), d = fbm((x + ox) * freq, y * freq, z * freq, seed) * amp; p.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d); }
    g.computeVertexNormals(); return g; }
  const MATV = new Map();
  const matVs = (toon, side) => MATV.get(side) || MATV.set(side, Object.assign(toon("#ffffff"), { vertexColors: true, side })).get(side);
  function budget(T, roots, B, win) {   // [roots] → Map mesh → the edge it may be cut to, so the room's clay comes to about B triangles: near and big pieces get the most
    const out = new Map(), L0 = [], bx = new T.Box3(), sz = new T.Vector3(), cn = new T.Vector3(); let W = 0;
    roots.forEach(r => r && r.traverse(m => { if (!m.isMesh || m.isInstancedMesh || !m.geometry || !m.geometry.attributes.position || m.userData.clayDone) return; m.updateMatrixWorld(true);
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); bx.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); bx.getSize(sz); bx.getCenter(cn);
      const far = Math.max(0, -cn.z - 3), mg = 10 + far * .65, fx = !win || sz.x < .01 ? 1 : Math.max(.02, Math.min(1, (Math.min(bx.max.x, win[1] + mg) - Math.max(bx.min.x, win[0] - mg)) / sz.x));   // (fx: how much of it lies where it can be seen)
      const A = 2 * (sz.x * sz.y + sz.y * sz.z + sz.z * sz.x) * fx, w = A / Math.pow(1 + far / 4, 2); if (!(A > 0)) return; L0.push([m, A, w]); W += w; }));
    L0.forEach(([m, A, w]) => { const n = Math.max(60, B * w / W); out.set(m, Math.sqrt(A / (n * .433))); }); return out; }
  function clayify(T, root, o = {}) {
    const lod = o.lod ?? 1, E0 = (o.edge ?? .32) / Math.max(.35, lod), cap = Math.round((o.cap ?? 9000) * lod), stats = { n: 0, kept: 0, tris: 0, shared: 0 };
    const colOf = o.colOf || (mt => mt.color || new T.Color(1, 1, 1)), skip = o.skip || (() => false), ox = o.ox ?? 0, layer = o.layer ?? 7, rootInv = new T.Matrix4();
    root.updateMatrixWorld(true); rootInv.copy(root.matrixWorld).invert();
    const list = []; root.traverse(m => { if (m.userData.clayDone) return; list.push(m); });
    const merged = new Map(), M4 = new T.Matrix4(), box = new T.Box3(), sz = new T.Vector3(), cen = new T.Vector3(), sc = new T.Vector3();
    const olds = new Set(), OWN = new Map(), matOf = side => !o.own ? matVs(o.toon, side) : OWN.get(side) || OWN.set(side, Object.assign(o.toon("#ffffff"), { vertexColors: true, side })).get(side);   // (own: this group's own material, for what fades on its own)
    for (const m of list) {
      if (!m.isMesh || m.isInstancedMesh || m.isSkinnedMesh || m.userData.clayDone || m.userData.noClay || !m.geometry || !m.geometry.attributes.position) continue;
      const mt = m.material; if (!mt || Array.isArray(mt) || (mt.isShaderMaterial && !(o.shaderOk && o.shaderOk(mt))) || mt.isMeshBasicMaterial || mt.isLineBasicMaterial || mt.isPointsMaterial || mt.transparent || mt.opacity < 1 || mt.alphaTest > 0 || mt.depthWrite === false || (mt.blending !== undefined && mt.blending !== 1) || mt.side === 1 || mt.wireframe || m.geometry.morphAttributes.position || skip(m)) { stats.kept++; continue; }
      if (mt.emissive && mt.emissiveIntensity * Math.max(mt.emissive.r, mt.emissive.g, mt.emissive.b) > .35) { stats.kept++; continue; }   // (a lit lantern, a glowing eye: as it was)
      const live = !o.merge || m.userData.clayLive; m.updateMatrixWorld(true);
      if (!live) { let v = m.visible, q = m.parent; while (v && q && q !== root) { v = q.visible; q = q.parent; } if (!v) { stats.kept++; continue; } }   // (hidden: not merged into what's drawn)
      if (live) M4.copy(m.matrixWorld); else M4.multiplyMatrices(rootInv, m.matrixWorld);   // (in place: worked in the world, then taken back to its own space; merged: the group's)
      m.geometry.computeBoundingBox(); box.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); box.getSize(sz); box.getCenter(cen);
      const size = Math.max(sz.x, sz.y, sz.z), thin = Math.max(.02, Math.min(sz.x, sz.y, sz.z)); if (!(size > 0) || size > 4000) { stats.kept++; continue; }
      const far = Math.max(0, -cen.z - 3), E = Math.max(E0 * (1 + far / 6) * Math.max(1, size / 30), (o.eOf && o.eOf.get(m)) || 0), side = mt.side === 2 ? 2 : 0;   // (eOf: the room's share of triangles for it, its size and nearness weighed)
      m.getWorldScale(sc); const shareK = live && m.geometry.userData.clayShare !== false && !(o.vcolOf && o.vcolOf(mt)) ? m.geometry.uuid + "|" + mt.uuid + "|" + sc.x.toFixed(2) + sc.y.toFixed(2) + sc.z.toFixed(2) + "|" + lod : null;
      let g = null, thick = thin;
      if (shareK && SHAREC.has(shareK)) { g = SHAREC.get(shareK); thick = g.userData.thick ?? thin; stats.shared++; }
      else {
        const pf = o.prof, t0 = pf ? performance.now() : 0;
        const S = soup(T, m.geometry, shareK ? new T.Matrix4().makeScale(sc.x, sc.y, sc.z) : M4, mt, colOf, o.vcolOf); if (S.tri.length < 3) { stats.kept++; continue; }
        thick = thickOf(S); const t1 = pf ? performance.now() : 0;
        tess(S, E, cap, shareK ? null : o.win); const t2 = pf ? performance.now() : 0; round(S, Math.min(.16, thin * .3 + .01) * (o.round ?? 1), size < .4 ? 2 : 3); const t3 = pf ? performance.now() : 0;
        g = geoOf(T, S); press(g, Math.min(.07, .012 + size * .012) * (o.amp ?? 1), (o.freq ?? 1.5) / (1 + far / 10), shareK ? 0 : ox, o.seed ?? 3);
        if (pf) { const t4 = performance.now(); pf.soup = (pf.soup || 0) + t1 - t0; pf.tess = (pf.tess || 0) + t2 - t1; pf.round = (pf.round || 0) + t3 - t2; pf.geo = (pf.geo || 0) + t4 - t3; pf.n = (pf.n || 0) + 1; pf.tri = (pf.tri || 0) + S.tri.length / 3; }
        if (shareK) { g.scale(1 / sc.x, 1 / sc.y, 1 / sc.z); g.computeVertexNormals(); g.userData.clayShared = true; g.userData.thick = thick; SHAREC.set(shareK, g); }
        else if (live) { g.applyMatrix4(new T.Matrix4().copy(m.matrixWorld).invert()); g.computeVertexNormals(); }
      }
      const cast = o.cast ? o.cast(m, cen, size, thick) : (cen.z > -11 && size > .8 && Math.min(thin, thick) > .3);   // (thin things (a vine, a rope, a spike) cast no clay shadow: on themselves they'd only speckle)
      stats.n++; stats.tris += g.index.count / 3;
      if (live) { olds.add(m.geometry); olds.add(m.material); m.geometry = g; m.material = matOf(side); m.userData.keepMat = !o.own; if (g.userData.clayShared) m.userData.keepGeo = true;
        m.userData.clayDone = true; if (cast) m.layers.enable(layer); m.castShadow = m.receiveShadow = false; }
      else { const k = (cast ? "c" : "n") + side; (merged.get(k) || merged.set(k, []).get(k)).push(g); m.userData.clayGone = true; olds.add(m.geometry); olds.add(m.material); }
    }
    if (merged.size) { const gone = []; root.traverse(m => { if (m.userData.clayGone) gone.push(m); }); gone.forEach(m => { const p = m.parent; if (!p) return; [...m.children].forEach(c => p.attach(c)); p.remove(m); }); }   // (its own kept bits (a lamp's glow) left where they were)
    root.traverse(m => { if (m.isMesh || m.isPoints || m.isLine) { olds.delete(m.geometry); (Array.isArray(m.material) ? m.material : [m.material]).forEach(q => olds.delete(q)); } });   // (what's no longer drawn freed: three makes it again if it's ever drawn elsewhere)
    olds.forEach(q => { if (!q || q.userData && q.userData.clayShared) return; if (q.isMaterial) { if (q.map && !o.keepTex) q.map.dispose(); } q.dispose(); });
    if (merged.size) {
      merged.forEach((gs, k) => { const geo = gs.length === 1 ? gs[0] : o.mergeGeometries(gs, false); if (gs.length > 1) gs.forEach(q => q.dispose()); if (!geo) return; geo.computeBoundingSphere();
        const mm = new T.Mesh(geo, matOf(+k[1])); mm.userData.keepMat = !o.own; mm.userData.clayDone = true; if (k[0] === "c") mm.layers.enable(layer); root.add(mm); }); }
    return stats; }
  function clouds(T, o) {   // the clay sky's clouds for a room built by its own world (the beach, the waves): far off, the same along the world
    const ks = Math.round(o.W), g = new T.Group(); g.name = "clayClouds"; g.position.y = o.y ?? 0;
    vcOf(T, o, proto(T, o, "clouds" + ks, Q => { for (let x = -30, i = 0; x < o.W + 34; x += 15 + hsh(i, 1, 1, 8) * 6, i++) Q.cloud(x, 17.5 + hsh(i, 2, 2, 8) * 5, -30, 1.8 + hsh(i, 3, 3, 8) * .9); }))
      .forEach(({ geo }) => { const m = new T.Mesh(geo, matV(o.toon)); m.userData.keepMat = m.userData.keepGeo = true; g.add(m); });
    return g; }
  function palm(T, o, p) {   // a clay palm for the game's builders: made once for its shape (height, lean, kind), then a draw or two each time it's put down
    const h = Math.round((p.h ?? 9) * 4) / 4, ln = Math.round((p.lean ?? 0) * 20) / 20, key = "gpalm" + h + ":" + ln + (p.royal ? "r" : "") + (p.coco ? "c" : "") + ":" + ((p.seed ?? 0) % 3);
    const g = new T.Group(); vcOf(T, o, proto(T, o, key, Q => Q.palm2(h, ln, !!p.royal, !!p.coco, 200 + ((p.seed ?? 0) % 3) * 7))).forEach(({ cast, geo }) => {
      const m = new T.Mesh(geo, matVs(o.toon, 2)); m.userData.keepMat = m.userData.keepGeo = m.userData.clayDone = true; if (cast) m.layers.enable(o.layer ?? 7); g.add(m); });
    return g; }
  return { build, dress, SKY, clayify, budget, clouds, palm };
})();
