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
    trunk: "#8a4624", bamboo: "#bfe08c", bambooD: "#97c56b", berryR: "#d81f4f", berryB: "#3b4fd6", berryP: "#7b2fbf", cream: "#fff6e2", dirt: "#a5492a" };
  const BCOLS = [[P.leaf, "#4cbf4c", P.leafD], ["#3fb14a", P.leafD, "#55c450"], [P.leaf, P.grass2, P.leafD], [P.leaf, P.leafD]], BBER = [[P.berryB, P.berryP], P.berryR, [P.berryR, P.berryB], P.berryR];

  // ── the kit: clay pieces put together in a group (W), each mesh tagged with its colour and whether it casts
  function Kit(T, o) {
    const { mergeVertices } = o, W = new T.Group();
    const hex = c => "#" + (c && c.isColor ? c : new T.Color(c)).getHexString();
    function weld(geo) { geo = geo.index ? geo.toNonIndexed() : geo; for (const k of Object.keys(geo.attributes)) if (k !== "position") geo.deleteAttribute(k); geo = mergeVertices(geo, 1e-4); geo.computeVertexNormals(); return geo; }
    function lumpify(geo, amp, freq, seed = 1, fn) {
      geo = weld(geo); const p = geo.attributes.position, n = geo.attributes.normal;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); let d = fbm(x * freq, y * freq, z * freq, seed) * amp; if (fn) d += fn(x, y, z); p.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d); }
      geo.computeVertexNormals(); return geo; }
    // a rounded box, divided so it can be dented: sx, sy, sz cuts a side; dense: the cuts crowd to the edges (a long flat top needs few in the middle)
    function rbox(w, h, d, r, sx, sy, sz, dense) {
      r = Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001);
      const geo = new T.BoxGeometry(w, h, d, Math.max(2, sx), Math.max(2, sy), Math.max(2, sz)), p = geo.attributes.position;
      const ix = w / 2 - r, iy = h / 2 - r, iz = d / 2 - r, cl = (v, m) => Math.max(-m, Math.min(m, v)), crowd = (v, half) => { const u = Math.min(1, Math.abs(v) / half); return Math.sign(v) * half * (1 - Math.pow(1 - u, 2.2)); };
      for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (dense) { z = crowd(z, d / 2); y = crowd(y, h / 2); }
        const cx_ = cl(x, ix), cy = cl(y, iy), cz = cl(z, iz), dx = x - cx_, dy = y - cy, dz = z - cz, l = Math.hypot(dx, dy, dz) || 1; p.setXYZ(i, cx_ + dx / l * r, cy + dy / l * r, cz + dz / l * r); }
      return geo; }
    const step = (len, s) => Math.max(2, Math.round(len / s));
    function mesh(geo, col, x = 0, y = 0, z = 0, parent, cast = true) { const m = new T.Mesh(geo); m.userData.col = hex(col); m.userData.cast = cast; m.position.set(x, y, z); (parent || W).add(m); return m; }

    // the grass top: a rounded slab, its front lip dripping in scallops. topAt(x): its top follows a floor that slopes (else flat at y); col: another clay (an overhang's dirt)
    function grassSlab(xa, xb, y, za, zb, th = .55, seed = 3, far = false, topAt = null, col = P.grass) {
      const w = xb - xa, d = zb - za, cx = (xa + xb) / 2; let geo = rbox(w, th, d, .24, step(w, far ? .26 : .16), 7, far ? 12 : 18, true);
      geo = lumpify(geo, .05, 1.6, seed);
      const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const X = p.getX(i) + cx, Y = p.getY(i), Z = p.getZ(i);
        let ny = Y; if (Y < 0 && Z > d / 2 - .5) { const f = Math.min(1, (Z - (d / 2 - .5)) / .3), sc = Math.pow(.5 + .5 * Math.sin(X * 2.3 + vn(X * .6, 0, 0, seed) * 3), 2) * (.32 + .14 * vn(X * 1.1, 3, 0, seed)); ny = Y - sc * f * (Y < -th * .45 ? 1 : .5); }
        p.setY(i, ny - th / 2 + (topAt ? topAt(X) : y)); }
      geo.computeVertexNormals();
      return mesh(geo, col, cx, 0, (za + zb) / 2);
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
      const pg = lumpify(new T.SphereGeometry(.16, 10, 8).scale(1, 1.25, .55), .012, 6, 4);
      for (let i = 0; i < petals; i++) { const a = i / petals * Math.PI * 2 + .3, m = mesh(pg, col, Math.cos(a) * .17, Math.sin(a) * .17, 0, grp); m.rotation.z = a - Math.PI / 2; }
      mesh(lumpify(new T.SphereGeometry(.1, 10, 8).scale(1, 1, .7), .01, 8, 2), P.yel, 0, 0, .05, grp); return grp;
    }
    function clover(x, y, z, sc = 1, rz = 0) {
      const grp = new T.Group(); grp.position.set(x, y, z); grp.rotation.z = rz; grp.scale.setScalar(sc); W.add(grp);
      const lg = lumpify(new T.SphereGeometry(.22, 16, 12).scale(.85, 1.15, .4), .015, 5, 9);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, m = mesh(lg, "#43b649", Math.cos(a) * .2, Math.sin(a) * .2, 0, grp); m.rotation.z = a - Math.PI / 2; }
      mesh(new T.SphereGeometry(.06, 10, 8), "#2e9a38", 0, 0, .05, grp); return grp;
    }
    function berry(x, y, z, r, col, parent) {
      const m = mesh(lumpify(new T.SphereGeometry(r, 12, 9), r * .06, 3 / r, Math.floor(x * 10)), col, x, y, z, parent);
      if (col === P.berryR) for (let i = 0; i < 5; i++) { const a = i * 1.3, b = .4 + (i % 3) * .5; mesh(new T.SphereGeometry(r * .12, 6, 5), "#ffe9b0", Math.cos(a) * Math.sin(b) * r * .97, Math.cos(b) * r * .97 * (i % 2 ? 1 : -.3), Math.sin(a) * Math.sin(b) * r * .97 + r * .05, m); }
      return m;
    }
    function bush(x, y, z, s = 1, cols = [P.leaf, P.grass2, P.leafD], berries = P.berryB, seed = 21) {
      const grp = new T.Group(); grp.position.set(x, y, z); grp.scale.setScalar(s); W.add(grp);
      for (let i = 0; i < 5; i++) { const a = (i / 4 - .5) * 2.2, r = .55 + hsh(seed, i, 1, 1) * .3, bx = a * .75, by = .35 + Math.cos(a) * .35 + hsh(seed, i, 2, 2) * .2;
        mesh(lumpify(new T.SphereGeometry(r, 22, 16), .06, 2.2, seed + i), cols[i % cols.length], bx, by, -.1 + hsh(seed, i, 3, 3) * .25, grp); }
      if (berries) for (let i = 0; i < 8; i++) { const bx = (hsh(seed, i, 7, 1) - .5) * 2.4, by = .3 + hsh(seed, i, 8, 1) * .75; berry(bx, by, .55 + hsh(seed, i, 9, 1) * .15, .11 + hsh(seed, i, 5, 5) * .05, Array.isArray(berries) ? berries[i % berries.length] : berries, grp); }
      return grp;
    }
    function trunk(h, r0, r1, seed, grp, y0 = 0) {   // a clay trunk, flared at its foot
      let tg = new T.CylinderGeometry(r0, r1, h, 32, Math.max(8, Math.round(h * 5)), true); const p = tg.attributes.position;
      for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i), a = Math.atan2(Z, X), t = (Y + h / 2) / h, flare = 1 + Math.pow(1 - t, 6) * .55, gr = 1 + .07 * Math.sin(a * 7 + Y * .5); p.setXYZ(i, X * flare * gr, Y, Z * flare * gr); }
      tg = lumpify(tg, .04, 2, seed); return mesh(tg, P.trunk, 0, y0 + h / 2 - .2, 0, grp);
    }
    function tree(x, y, z, h = 6, s = 1, seed = 31, shelf = true) {
      const grp = new T.Group(); grp.position.set(x, y, z); grp.scale.setScalar(s); W.add(grp);
      trunk(h, .42, .62, seed, grp);
      const cs = [[0, h + .9, 0, 1.9], [-1.25, h + .2, .3, 1.35], [1.3, h + .35, .2, 1.4], [.2, h + 1.9, -.1, 1.35], [-.6, h - .5, .9, 1.0], [.9, h - .4, .8, 1.05]];
      cs.forEach(([a, b, c, r], i) => mesh(lumpify(new T.SphereGeometry(r, 28, 20), .09, 1.6, seed + i, (X, Y, Z) => .05 * Math.sin(X * 9) * Math.sin(Y * 9) * Math.sin(Z * 9)), i % 2 ? "#34ad46" : "#2c9c3f", a, b, c, grp));
      if (shelf) { const sh = mesh(lumpify(new T.SphereGeometry(1, 30, 16, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.05, .32, .75), .03, 2, 77), "#e5402f", -.1, 2.6, .75, grp); sh.rotation.z = -.05;
        for (let i = 0; i < 6; i++) mesh(new T.SphereGeometry(.09, 10, 6).scale(1, .5, 1), P.cream, -.1 + Math.cos(i * 1.7) * .6, 2.9, .75 + Math.sin(i * 1.7) * .45, grp); }
      return grp;
    }
    function leafGeo(len = 1, wid = .38, th = .05) {   // a pointed clay leaf, pressed flat
      const sh = new T.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(wid, len * .45, 0, len); sh.quadraticCurveTo(-wid, len * .45, 0, 0);
      const g2 = new T.ExtrudeGeometry(sh, { depth: th, bevelEnabled: true, bevelThickness: th * .9, bevelSize: wid * .16, bevelSegments: 3, curveSegments: 12 }); g2.translate(0, 0, -th / 2); return g2; }
    function leaf(x, y, z, len, rz, col, parent, wid) { const m = mesh(leafGeo(len, wid ?? len * .36), col, x, y, z, parent); m.rotation.z = rz;
      mesh(new T.CylinderGeometry(.018, .03, len * .8, 6).translate(0, len * .42, 0), "#2c8a36", 0, 0, .06, m); return m; }
    function bamboo(x, y0, z, h, r = .22, seed = 41, tilt = 0) {
      const grp = new T.Group(); grp.position.set(x, y0, z); grp.rotation.z = tilt; W.add(grp);
      const seg = 1.15 + hsh(seed, 1, 1, 1) * .4, n = Math.ceil(h / seg);
      for (let i = 0; i < n; i++) { mesh(lumpify(new T.CapsuleGeometry(r * (.94 + hsh(seed, i, 5, 5) * .12), seg - r * 1.4, 4, 14), r * .05, 1.6 / r, seed + i), P.bamboo, 0, i * seg + seg / 2, 0, grp);
        mesh(new T.TorusGeometry(r * 1.03, r * .15, 6, 16).rotateX(Math.PI / 2), P.bambooD, 0, i * seg + seg, 0, grp);
        if (i > 2 && hsh(seed, i, 1, 9) > .55) { const sd = hsh(seed, i, 2, 9) > .5 ? 1 : -1; leaf(sd * r * .8, i * seg + seg * .95, .15, 1.5, sd * -1.05, i % 2 ? "#7ccc5a" : "#5fbb4f", grp); leaf(sd * r * .8, i * seg + seg * .95, .2, 1.1, sd * -.55, "#4fb04a", grp); } }
      return grp;
    }
    function rope(pts, r, cols, twists = 10, seed = 51, leafEvery = 0) {   // two strands wound round each other, the mockup's twisted vine
      const curve = new T.CatmullRomCurve3(pts.map(q => new T.Vector3(...q))), N = 120, frames = curve.computeFrenetFrames(N, false);
      cols.forEach((col, k) => {
        const sp = []; for (let i = 0; i <= N; i++) { const t = i / N, P0 = curve.getPointAt(t), a = t * twists * Math.PI * 2 + k * Math.PI, n = frames.normals[i], b = frames.binormals[i];
          sp.push(P0.clone().addScaledVector(n, Math.cos(a) * r * .55).addScaledVector(b, Math.sin(a) * r * .55)); }
        mesh(lumpify(new T.TubeGeometry(new T.CatmullRomCurve3(sp), N * 2, r * .62, 12, false), r * .05, 3 / r, seed + k), col);
        [0, 1].forEach(e => mesh(new T.SphereGeometry(r * .62, 12, 9), col, ...sp[e ? sp.length - 1 : 0].toArray()));
      });
      if (leafEvery) for (let t = .08; t < .95; t += leafEvery) { const P0 = curve.getPointAt(t), tn = curve.getTangentAt(t), side = (Math.round(t / leafEvery) % 2) ? 1 : -1;
        leaf(P0.x, P0.y, P0.z + .15, 1.15, Math.atan2(tn.y, tn.x) - Math.PI / 2 + side * 1.0, side > 0 ? "#5fcf4f" : "#3fae45"); }
    }
    function cutout(pts, depth, col, z) {   // a flat pressed clay layer for the back
      const sh = new T.Shape(); pts.forEach(([a, b], i) => i ? sh.lineTo(a, b) : sh.moveTo(a, b));
      return mesh(new T.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: depth * .6, bevelSize: Math.min(.35, depth * .9), bevelSegments: 4, curveSegments: 16 }), col, 0, 0, z, null, false);
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
      [[0, 0, 1], [-1.1, -.25, .75], [1.1, -.2, .8], [.5, .45, .7], [-.5, .35, .65]].forEach(([a, b, r], i) => mesh(lumpify(new T.SphereGeometry(r, 16, 10), .05, 1.5, i + (x | 0)), "#ffffff", a, b, 0, grp, false)); }
    return { W, hex, weld, lumpify, rbox, step, mesh, grassSlab, earthRows, flower, clover, berry, bush, trunk, tree, leafGeo, leaf, bamboo, rope, cutout, blobLine, treeSil, cloud };
  }

  // ── baking: plain shapes (position + normal, indexed), gathered by colour and whether they cast; then one mesh each, its material shared and kept
  const MATS = new Map(), add = (B, k, g) => (B.get(k) || B.set(k, []).get(k)).push(g);
  const matOf = (toon, col) => MATS.get(col) || MATS.set(col, toon(col)).get(col);
  function plain(T, g) { for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k); g.morphAttributes = {}; if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.index) { const n = g.attributes.position.count, ix = new Uint32Array(n); for (let i = 0; i < n; i++) ix[i] = i; g.setIndex(new T.BufferAttribute(ix, 1)); } g.clearGroups(); return g; }
  function gather(T, W, B = new Map()) {   // a kit's group into bins (and its pieces' own shapes freed)
    W.updateMatrixWorld(true); W.traverse(m => { if (!m.isMesh) return; const g = plain(T, m.geometry.clone()); g.applyMatrix4(m.matrixWorld); add(B, m.userData.col + (m.userData.cast ? "c" : "n"), g); });
    W.traverse(m => { if (m.isMesh) m.geometry.dispose(); }); return B; }
  function meshes(T, o, B, name, keepGeo) {   // bins → a group, one mesh a colour
    const out = new T.Group(); out.name = name;
    B.forEach((list, key) => { const geo = list.length === 1 ? list[0] : o.mergeGeometries(list, false); if (list.length > 1) list.forEach(g => g.dispose()); if (!geo) return; geo.computeBoundingSphere();
      const m = new T.Mesh(geo, matOf(o.toon, key.slice(0, 7))); m.userData.keepMat = true; if (keepGeo) m.userData.keepGeo = true; if (key.endsWith("c")) m.layers.enable(o.layer ?? 7); out.add(m); });
    return out; }
  // ── made once, stamped wherever they go: [{ k (colour + casts), geo }]
  const PROTO = new Map();
  function proto(T, o, key, fn) { let p = PROTO.get(key); if (!p) { const K = Kit(T, o); fn(K); p = []; gather(T, K.W).forEach((list, k) => p.push({ k, geo: list.length === 1 ? list[0] : o.mergeGeometries(list, false) })); PROTO.set(key, p); } return p; }
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
  const SKY = ["#74c0e4", "#7cc2e0", "#86c4dc", "#e3b27f", "#ee946e", "#6d7ec2", "#2b3e72"], BW = [1.8, 2.3, 2.8, 3.3, 3.8, 4.2];
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

    // rounded bricks, a few sizes made once: rows of them from under topAt(x) down to bot, their fronts at zf
    const brick = (w, far) => proto(T, o, (far ? "brickF" : "brick") + w, Q => Q.mesh(Q.lumpify(Q.rbox(w - .04, 1.1, 1.0, .3, Q.step(w, far ? .3 : .16), far ? 5 : 7, far ? 3 : 4), .07, 1.3, Math.round(w * 10)), P.earth[0]));   // (far: fewer cuts)
    const shade = (c, r) => "#" + new T.Color(c).offsetHSL(0, 0, Math.min(2, r) * .03).getHexString();
    function wall(a, b, topAt, bot, zf, seed, rowsMax = 14, far = zf < -5, nc = false, B = near) {
      for (let r = 0; r < rowsMax; r++) { let x = a - (r % 2) * .9, s = seed * 97 + r * 13, any = false;
        while (x < b - .3) { s++; let w = BW[Math.floor(hsh(s, 1, 2, 3) * BW.length)]; const xa = Math.max(x, a), xb = Math.min(x + w, b), ww = xb - xa; x += w; if (ww < .5) continue;
          const t = Math.min(topAt(xa + .05), topAt((xa + xb) / 2), topAt(xb - .05)) - .45 - r * 1.05, h = Math.min(1.05, t - bot); if (h < .3) continue; any = true;   // (the last row cut to fit)
          const bw = BW.reduce((m, c) => Math.abs(c - ww) < Math.abs(m - ww) ? c : m, BW[0]), out = (hsh(s, 4, 5, 6) - .5) * .2;
          stamp(B, brick(bw, far), at((xa + xb) / 2, t - h / 2, zf - .5 + out, 0, 0, 0, ww / bw, (h + .05) / 1.1, 1), shade(P.earth[Math.floor(hsh(s, 9, 9, 9) * P.earth.length)], r), nc); }
        if (!any && r > 1) break; }
    }
    function wallZ(x, side, za, zb, topY, bot, seed) {   // bricks up a wall's side, facing into the room (side -1: the wall's off to the left, its face at x)
      for (let r = 0; r * 1.05 < topY - bot; r++) { let z = zb + (r % 2) * .9, s = seed * 89 + r * 17; const t = topY - r * 1.05, h = Math.min(1.05, t - bot); if (h < .3) break;
        while (z > za + .3) { s++; const w = BW[Math.floor(hsh(s, 1, 2, 3) * BW.length)], z1 = Math.min(z, zb), z0 = Math.max(z - w, za), ww = z1 - z0; z -= w; if (ww < .5) continue;
          const bw = BW.reduce((m, c) => Math.abs(c - ww) < Math.abs(m - ww) ? c : m, BW[0]), out = (hsh(s, 4, 5, 6) - .5) * .16;
          stamp(near, brick(bw), at(x + side * (.5 - out), t - h / 2, (z0 + z1) / 2, 0, Math.PI / 2, 0, ww / bw, (h + .05) / 1.1, 1), shade(P.earth[Math.floor(hsh(s, 9, 9, 9) * P.earth.length)], r % 3), true); } }
    }
    // the ends of the woods: earth walls, in bricks (their faces toward you and into the room; tall: no clay shadow from them, or it'd lie over the whole room)
    (o.ends || []).forEach((e, i) => { const ex = e.side < 0 ? 0 : WX, a = e.side < 0 ? ex - 9 : ex, b = e.side < 0 ? ex : ex + 9;
      wall(a, b, () => 24, o.FB, 3.4, sd + 700 + i, 30, false, true); wallZ(ex, e.side, -11.4, 2.4, 24, o.FB, sd + 720 + i); });
    // the floor: grass over bricks, down to the floor's underside
    runs.forEach(([a, b], i) => { K.grassSlab(a, b, 0, -3.2, 2.7, .6, 3 + i + sd, false, x => topIn(x, a, b)); wall(a, b, x => topIn(x, a, b), o.FB, 2.45, sd + i * 7); });
    // the land overhead: bricks up from its underside, a dirt lip dripping under it (no clay shadow from it: up out of sight, it'd darken the woods' back for nothing you can see)
    o.ceils.forEach((c, i) => { if (c.xb - c.xa < .5) return; K.grassSlab(c.xa, c.xb, c.y + .45, -3.2, 2.7, .55, 50 + i, false, null, P.dirt).userData.cast = false; wall(c.xa, c.xb, () => c.y + 7.5, c.y + .2, 2.45, sd + 300 + i, 7, false, true); });
    // the back: a bank of grass behind the path, bushes along it (the mockup's); in the ravine (rows C, D) its wall of bricks further back, the woods' floor up on top;
    // up in the treetops (row A) the ground just runs back to the drop. Bamboo behind
    const bigBush = (x, y, z, i, s, B = near) => { const k = (i + sd) % 4; stamp(B, proto(T, o, "bush" + k, Q => Q.bush(0, 0, 0, 1, BCOLS[k], BBER[k], 21 + k * 6)), at(x, y, z, 0, (R(i, 9) - .5) * .5, 0, s)); };
    const bambooAt = (x, y, z, i, B = near) => { const k = (i + sd) % 3, w = .95 + R(i, 16) * .15; stamp(B, proto(T, o, "bamboo" + k, Q => Q.bamboo(0, 0, 0, 16, .42, 41 + k * 3, 0)), at(x, y, z, 0, R(i, 14) * 6, (R(i, 15) - .5) * .07, w, 1, w)); };
    const up = o.row === "A" ? .05 : .55, bank = runs.map(([a, b], i) => [i ? a : xL - 14, i < runs.length - 1 ? b : xR + 14]);
    bank.forEach(([a, b], i) => { const [ra, rb] = runs[i]; K.grassSlab(a, b, 0, -9.5, -3.25, .5, 9 + sd + i, true, x => topIn(x, ra, rb) + up); });
    const bankAt = x => { for (let i = 0; i < bank.length; i++) if (x >= bank[i][0] && x <= bank[i][1]) return topIn(x, runs[i][0], runs[i][1]) + up; return null; };
    for (let x = xL - 6, i = 0; x < xR + 6; x += (o.row === "A" ? 11 : 6.2) + R(i, 5) * 2.6, i++) { const y = bankAt(x); if (y !== null) bigBush(x, y - .05, -4.3 - R(i, 6) * .3, i, (o.row === "A" ? .8 : 1.05) + R(i, 7) * .3); }
    let ravine = null;
    if (o.bgY > 1) {   // (the ravine: its wall, the floor of the woods up on top; made once for its height and kept, the same behind every room down there)
      const key = "ravine" + Math.round(WX) + "_" + o.bgY.toFixed(2); ravine = PROTO.get(key);
      if (!ravine) { const bt = o.bgY, B = new Map(), Q = Kit(T, o); wall(xL - 26, xR + 26, () => bt, -1, -9.6, sd + 500, 14, true, false, B); Q.grassSlab(xL - 26, xR + 26, bt, -17, -9.55, .5, 19 + sd, true);
        for (let x = xL - 14, i = 0; x < xR + 14; x += 6.6 + R(i, 31) * 3, i++) bigBush(x, bt - .05, -10.7 - R(i, 32) * .4, i + 40, 1.1 + R(i, 33) * .3, B);
        for (let x = xL - 16, i = 0; x < xR + 16; x += 5.6 + R(i, 11) * 3, i++) if (R(i, 12) > .18) bambooAt(x, bt - 2.5, -13 - R(i, 13) * 2, i, B);
        gather(T, Q.W, B); ravine = []; B.forEach((list, k) => ravine.push({ k, geo: list.length === 1 ? list[0] : o.mergeGeometries(list, false) })); PROTO.set(key, ravine); }
    } else if (o.row !== "A") for (let x = xL - 8, i = 0; x < xR + 8; x += 5.6 + R(i, 11) * 3, i++) { const y = bankAt(x); if (R(i, 12) > .18) bambooAt(x, (y ?? o.bgY + .55) - 2.5, -7 - R(i, 13) * 1.2, i); }
    // on the floor: flowers along its lip, small bushes behind the path, flowers lying in the grass, a tree
    const flowerP = k => proto(T, o, "flower" + k, Q => Q.flower(0, 0, 0, 1, ["#e2262a", "#ff7bb0", "#ffd23a", "#ffffff"][k]));
    for (let x = xL + 1, i = 0; x < xR; x += 2.9 + R(i, 20) * 1.4, i++) { const y = solidAt(x); if (y === null) continue; stamp(near, flowerP(i % 4 === 3 ? 1 : 0), at(x, y + (R(i, 21) - .3) * .1 - .05, 2.62, -.2, 0, i, .9 + (i % 3) * .15)); }
    for (let x = xL + 4, i = 0; x < xR - 2; x += 8 + R(i, 22) * 4, i++) { const y = solidAt(x); if (y === null) continue; const k = i % 2;
      stamp(near, proto(T, o, "sbush" + k, Q => Q.bush(0, 0, 0, 1, ["#4fc24a", P.leafD], [P.berryR, P.berryB][k], 70 + k)), at(x, y, -2.1 - R(i, 23) * .5, 0, 0, 0, .55)); }
    for (let i = 0, n = Math.round((xR - xL) * .5); i < n; i++) { const x = xL + R(i, 24) * (xR - xL), z = -2.8 + R(i, 25) * 5, y = solidAt(x); if (y === null || Math.abs(z) < .9) continue;
      stamp(near, flowerP(i % 4), at(x, y + .02, z, -Math.PI / 2 + .35, 0, i, .55 + R(i, 26) * .25)); }
    if (o.FB < -1.2) for (let x = xL + 3, i = 0; x < xR; x += 5 + R(i, 27) * 3, i++) { const y = solidAt(x); if (y === null || y - o.FB < 1.6) continue;   // (a clover or a flower pressed on the bricks)
      const yy = y - .9 - R(i, 28) * Math.min(2.5, y - o.FB - 1.4); if (i % 2) stamp(near, flowerP(0), at(x, yy, 2.62, 0, 0, i * .7, 1.05)); else stamp(near, proto(T, o, "clover", Q => Q.clover(0, 0, 0, 1)), at(x, yy, 2.66, 0, 0, i * .5, 1.15)); }
    if (o.trees) { const tx = 8 + R(1, 30) * (WX - 16), y = solidAt(tx); if (y !== null) stamp(near, proto(T, o, "tree" + (sd % 2), Q => Q.tree(0, 0, 0, sd % 2 ? 6 : 5.4, 1, 31 + (sd % 2) * 6, !(sd % 2))), at(tx, y, -2.3, 0, 0, 0, 1)); }
    // the platforms: a mushroom shelf on a trunk, a great leaf on its stalk, a log; the rest floating slabs of grass on an earth block
    o.plats.forEach((p, i) => { const w = p.xb - p.xa, cx = (p.xa + p.xb) / 2, gy = solidAt(cx);
      if (p.kind === "fungus" || p.kind === "fungus2") {
        const sh = K.mesh(K.lumpify(new T.SphereGeometry(1, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2).scale(w / 2 + .2, .42, 1.25), .03, 2, 80 + i), p.kind === "fungus2" ? "#f08a3a" : "#e5402f", cx, p.top - .42, 0);
        for (let k = 0; k < Math.round(w * 2.2); k++) K.mesh(new T.SphereGeometry(.1, 10, 6).scale(1, .45, 1), P.cream, cx + (R(i * 40 + k, 31) - .5) * w * .9, p.top - .02, (R(i * 40 + k, 32) - .5) * 1.6);
        const base = gy ?? p.top - 9, g = new T.Group(); g.position.set(cx, base, -1.9); K.W.add(g); K.trunk(p.top + 5 - base, .55, .7, 90 + i, g);
      } else if (p.kind === "shroom") {   // a great clay leaf lying flat, its stalk curving down to the ground
        const lg = K.leafGeo(w + .8, 1.3, .1).rotateZ(-Math.PI / 2).rotateX(-Math.PI / 2).translate(-(w + .8) / 2, 0, 0); K.mesh(lg, "#4fbf4a", cx, p.top - .08, 0);
        K.mesh(new T.CapsuleGeometry(.05, w * .8, 4, 8).rotateZ(Math.PI / 2), "#2c8a36", cx, p.top + .02, 0);
        const by = gy ?? p.top - 7, pts = [new T.Vector3(cx, p.top - .1, 0), new T.Vector3(cx - .4, (p.top + by) / 2, -.5), new T.Vector3(cx - .2, by, -.9)];
        K.mesh(K.lumpify(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, .14, 10, false), .01, 6, 85 + i), "#3f9a3f");
      } else if (p.kind === "log") {
        K.mesh(K.lumpify(new T.CapsuleGeometry(.36, Math.max(.1, w - .72), 6, 20).rotateZ(Math.PI / 2), .02, 3, 70 + i), "#9a5a2e", cx, p.top - .36, 0);
        for (let x = p.xa + .6; x < p.xb - .5; x += .7) K.mesh(new T.TorusGeometry(.37, .04, 6, 20).rotateY(Math.PI / 2), "#7a4220", x, p.top - .36, 0);
      } else { K.grassSlab(p.xa, p.xb, p.top, -1.3, 1.3, .45, 30 + i + sd);
        K.mesh(K.lumpify(K.rbox(Math.max(.6, w - .3), 1.05, 2.2, .35, K.step(w, .18), 7, 9), .06, 1.3, 40 + i), P.earth[i % P.earth.length], cx, p.top - .95, 0); } });
    gather(T, K.W, near);
    // far off (made once a room's width and row, kept): the clouds, the pressed hills (round the woods' own ground, bgY; under the treetops, lower)
    const ks = Math.round(WX), bx0 = -34, bx1 = WX + 34, farG = new T.Group(); farG.name = "clayFar";
    const kept = (parts, grp) => parts.forEach(({ k, geo }) => { const m = new T.Mesh(geo, matOf(o.toon, k.slice(0, 7))); m.userData.keepMat = m.userData.keepGeo = true; if (k.endsWith("c")) m.layers.enable(o.layer ?? 7); grp.add(m); });
    if (ravine) kept(ravine, farG);
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
