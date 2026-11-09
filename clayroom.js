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
    return { W, L, sg, hex, weld, lumpify, rbox, step, mesh, grassSlab, soilFace, pebble, root, earthRows, flower, clover, berry, bush, trunk, tree, leafGeo, leaf, bamboo, rope, cutout, blobLine, treeSil, cloud };
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
        if (Hw(k, r, salt) < (far ? .6 : .52)) continue; const x = (k + .1 + Hw(k, r, salt + 1) * .8) * cw - WXo; if (x < a + .35 || x > b - .35) continue;
        const t = topAt(x), y = opts.up ? bot + .55 + (r + Hw(k, r, salt + 2) * .8) * ch : t - .6 - (r + Hw(k, r, salt + 2) * .8) * ch; if (y > t - .45 || y < bot + .35) continue;
        const sz = (far ? .26 : .15) + Hw(k, r, salt + 3) * (far ? .3 : .22);
        stamp(near, pebbleP((k + r) & 3), at(x, y, zf + .02, 0, 0, Hw(k, r, salt + 4) * 6.28, sz), STONES[Math.floor(Hw(k, r, salt + 5) * STONES.length)], nc); }
      if (opts.roots !== false) for (let k = Math.floor((a + WXo) / 3.6), k1 = Math.ceil((b + WXo) / 3.6); k <= k1; k++) { if (Hw(k, salt + 6) < .45) continue;
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
    if (o.bgY > 1) { const bt = o.bgY;   // (the ravine: its wall of earth, the woods' floor up on top with its bushes and bamboo)
      soil(xL - 26, xR + 26, () => bt - .3, -1, -9.6, 3, 500, { far: true, deep: 7 }); K.grassSlab(xL - 26, xR + 26, bt, -17, -9.55, .5, 19, true);
      along(xL - 14, xR + 14, 6.6, 3, 31, (x, i) => bigBush(x, bt - .05, -10.7 - Hw(i, 32) * .4, i + 40, 1.1 + Hw(i, 33) * .3, true));
      along(xL - 16, xR + 16, 5.6, 3, 11, (x, i) => { if (Hw(i, 12) > .18) bambooAt(x, bt - 2.5, -13 - Hw(i, 13) * 2, i); });
    } else if (o.row !== "A") along(xL - 8, xR + 8, 5.6, 3, 11, (x, i) => { const y = bankAt(x); if (Hw(i, 12) > .18) bambooAt(x, (y ?? o.bgY + .55) - 2.5, -7 - Hw(i, 13) * 1.2, i); });
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
    const hills = proto(T, o, "hills" + ks, Q => {
      Q.cutout(Q.blobLine(bx0, bx1, -8, 4.2, Math.round((bx1 - bx0) * .098), 3), .5, "#8fd0a8", -26);
      for (let x = bx0 + 2, i = 0; x < bx1; x += 10, i++) Q.cutout(Q.treeSil(x + (i % 2) * 3, -8, 8 + (i % 3) * 1.8, 2.6 + (i % 2) * .6, i), .45, i % 2 ? "#79c08f" : "#6db885", -22 + (i % 2) * .4);
      Q.cutout(Q.blobLine(bx0 + 6, bx1 - 6, -8, 2.4, Math.round((bx1 - bx0 - 12) * .1375), 7), .55, "#5daf73", -18);
      for (let x = bx0 + 10, i = 0; x < bx1 - 8; x += 9.5, i++) Q.cutout(Q.treeSil(x + (i % 3), -8, 6.5 + (i % 3) * 1.4, 2.1 + (i % 2) * .5, i + 20), .5, i % 2 ? "#4ea865" : "#459f5d", -15 + (i % 2) * .5);
      Q.cutout(Q.blobLine(bx0 + 12, bx1 - 12, -8, .9, Math.round((bx1 - bx0 - 24) * .19), 11), .6, "#3f9a52", -11.5); });
    const hillG = new T.Group(); hillG.name = "clayHills"; hillG.position.y = o.row === "A" ? -5 : o.bgY; kept(hills, hillG); farG.add(hillG);
    if (o.row === "A") { const cg = proto(T, o, "canopy" + ks, Q => { Q.cutout(Q.blobLine(bx0, bx1, -14, -3.2, Math.round((bx1 - bx0) * .16), 17), .7, "#4fae5a", -9);
      Q.cutout(Q.blobLine(bx0 + 4, bx1 - 4, -14, -4.6, Math.round((bx1 - bx0) * .2), 19), .7, "#3a9a4c", -6); });   // (the treetops' crowns, below)
      kept(cg, farG); }
    return [meshes(T, o, near, "clayNear"), farG];
  }
  return { build, dress, SKY };
})();
