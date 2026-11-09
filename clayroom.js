// CLAY TEST ROOM's set (the user, 2026-11-09: "can you do one screen where you make all the appropriate changes but also build the background and floor and world
// to match the mockup since they'll be more rounded to work on the aesthetic? make it a clay test room in the main menu so we can go right to it").
// The clay mockup's set (mockups/clay; .claude/berry-tools/wip/clay_mockup.js), built for the game: rounded, lumpy pieces in the game's own toon() materials, so
// CLAY LOOK's shader lights them, merged by colour into a few dozen meshes. The ground's top at y 0, the characters walking at z 0 (units: 40 px each).
// build(THREE, { toon, mergeVertices, mergeGeometries, x0, x1, cx, layer }) → a Group. x0..x1: how far it reaches (past the room's ends, for the camera);
// cx: the middle, where the mockup's own picture sits; layer: the meshes that cast clay shadows and creases have it too (the ground, its bricks, the plants)
window.BerryClayRoom = (function () {
  "use strict";
  const hsh = (i, j, k, s) => { let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1440662683) ^ Math.imul(s, 2246822519); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967295; };
  const L = (a, b, t) => a + (b - a) * t;
  function vn(x, y, z, s = 0) { const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), fx = x - i, fy = y - j, fz = z - k, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
    return L(L(L(hsh(i, j, k, s), hsh(i + 1, j, k, s), u), L(hsh(i, j + 1, k, s), hsh(i + 1, j + 1, k, s), u), v), L(L(hsh(i, j, k + 1, s), hsh(i + 1, j, k + 1, s), u), L(hsh(i, j + 1, k + 1, s), hsh(i + 1, j + 1, k + 1, s), u), v), w) * 2 - 1; }
  const fbm = (x, y, z, s = 0, o = 3) => { let a = .5, t = 0, f = 1; for (let n = 0; n < o; n++) { t += a * vn(x * f, y * f, z * f, s + n * 17); f *= 2.1; a *= .5; } return t; };
  const P = { grass: "#3fb43f", grass2: "#55c94a", earth: ["#b8472a", "#c65b2c", "#d4733a", "#c2512b", "#dd8a45", "#a83f27"], red: "#e2262a", yel: "#ffd43a", leaf: "#3aa648", leafD: "#2b8c3d",
    trunk: "#8a4624", bamboo: "#bfe08c", bambooD: "#97c56b", berryR: "#d81f4f", berryB: "#3b4fd6", berryP: "#7b2fbf", cream: "#fff6e2" };

  function build(T, o) {
    const { toon, mergeVertices, mergeGeometries } = o, x0 = o.x0, x1 = o.x1, cx = o.cx, CAST = o.layer ?? 7, Wd = x1 - x0;
    const W = new T.Group();                         // (put together here, then baked into one mesh a colour)
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

    function grassSlab(xa, xb, y, za, zb, th = .55, seed = 3, o_far = false) {   // the grass top: a rounded slab, its front lip dripping in scallops
      const w = xb - xa, d = zb - za; let geo = rbox(w, th, d, .24, step(w, o_far ? .26 : .16), 7, o_far ? 12 : 18, true);
      geo = lumpify(geo, .05, 1.6, seed);
      const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const X = p.getX(i) + (xa + xb) / 2, Y = p.getY(i), Z = p.getZ(i);
        if (Y < 0 && Z > d / 2 - .5) { const f = Math.min(1, (Z - (d / 2 - .5)) / .3), sc = Math.pow(.5 + .5 * Math.sin(X * 2.3 + vn(X * .6, 0, 0, seed) * 3), 2) * (.32 + .14 * vn(X * 1.1, 3, 0, seed)); p.setY(i, Y - sc * f * (Y < -th * .45 ? 1 : .5)); } }
      geo.computeVertexNormals();
      return mesh(geo, P.grass, (xa + xb) / 2, y - th / 2, (za + zb) / 2);
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
    function tree(x, y, z, h = 6, s = 1, seed = 31, shelf = true) {
      const grp = new T.Group(); grp.position.set(x, y, z); grp.scale.setScalar(s); W.add(grp);
      let tg = new T.CylinderGeometry(.42, .62, h, 32, 30, true); const p = tg.attributes.position;
      for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i), a = Math.atan2(Z, X), t = (Y + h / 2) / h, flare = 1 + Math.pow(1 - t, 6) * .55, gr = 1 + .07 * Math.sin(a * 7 + Y * .5); p.setXYZ(i, X * flare * gr, Y, Z * flare * gr); }
      tg = lumpify(tg, .04, 2, seed); mesh(tg, P.trunk, 0, h / 2 - .2, 0, grp);
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

    // ── the sky and the back layers (wide: the camera pans the room, and they're far off)
    const bx0 = x0 - 34, bx1 = x1 + 34;
    mesh(new T.PlaneGeometry(bx1 - bx0 + 30, 70, 2, 2), "#74c0e4", (bx0 + bx1) / 2, 10, -34, null, false);
    for (let x = bx0 + 4, i = 0; x < bx1; x += 15 + hsh(i, 1, 1, 8) * 6, i++) cloud(x, 17.5 + hsh(i, 2, 2, 8) * 5, -30, 1.8 + hsh(i, 3, 3, 8) * .9);
    cutout(blobLine(bx0, bx1, -6, 4.2, Math.round((bx1 - bx0) * .098), 3), .5, "#8fd0a8", -26);
    for (let x = bx0 + 2, i = 0; x < bx1; x += 10, i++) cutout(treeSil(x + (i % 2) * 3, -6, 6 + (i % 3) * 1.8, 2.6 + (i % 2) * .6, i), .45, i % 2 ? "#79c08f" : "#6db885", -22 + (i % 2) * .4);
    cutout(blobLine(bx0 + 6, bx1 - 6, -6, 2.4, Math.round((bx1 - bx0 - 12) * .1375), 7), .55, "#5daf73", -18);
    for (let x = bx0 + 10, i = 0; x < bx1 - 8; x += 9.5, i++) cutout(treeSil(x + (i % 3), -6, 4.5 + (i % 3) * 1.4, 2.1 + (i % 2) * .5, i + 20), .5, i % 2 ? "#4ea865" : "#459f5d", -15 + (i % 2) * .5);
    cutout(blobLine(bx0 + 12, bx1 - 12, -6, .9, Math.round((bx1 - bx0 - 24) * .19), 11), .6, "#3f9a52", -11.5);

    // ── the middle: bamboo, a back bank with bushes, the vine arches
    const rel = [-9.6, -1.8, 4.4, 11.6];
    for (let k = -2; k <= 2; k++) rel.forEach((r, i) => { const x = cx + k * 26 + r + (k ? (hsh(k + 9, i, 1, 1) - .5) * 2.5 : 0); if (x < x0 - 4 || x > x1 + 4) return;
      bamboo(x, -2, -7 - hsh(k + 9, i, 2, 2) * 1.2, 15 + (i === 2 ? 1 : 0), .4 + hsh(k + 9, i, 3, 3) * .07, 41 + i + (k + 2) * 5, (i % 2 ? .035 : -.03)); });
    grassSlab(x0, x1, .55, -9.5, -3.2, .5, 9, true);
    const bcols = [[P.leaf, "#4cbf4c", P.leafD], ["#3fb14a", P.leafD, "#55c450"], [P.leaf, P.grass2, P.leafD], [P.leaf, P.leafD]], bber = [[P.berryB, P.berryP], P.berryR, [P.berryR, P.berryB], P.berryR];
    for (let x = x0 + 2, i = 0; x < x1 - 1; x += 6.2 + hsh(i, 5, 5, 5) * 2.6, i++) bush(x, .5, -4.3 - hsh(i, 6, 6, 6) * .3, 1.05 + hsh(i, 7, 7, 7) * .3, bcols[i % 4], bber[i % 4], 21 + i * 6);
    rope([[-12.5, -.4, -2.9], [-10.2, 3.6, -3.1], [-6, 6.3, -3.5], [-.5, 7.0, -3.8], [5, 6.4, -3.6], [8.9, 3.6, -3.3], [10.6, -.4, -3.0]].map(([a, b, c]) => [cx + a, b, c]), .5, ["#78d65a", "#3a9f3f"], 15, 51, .07);
    rope([[-16, 3.2, -1.5], [-12.5, 5.6, -1.9], [-9.4, 5.2, -2.3]].map(([a, b, c]) => [cx + a, b, c]), .26, ["#b4e36a", "#5cb84a"], 6, 61, .2);
    rope([[cx + 34, -.4, -3.0], [cx + 31.5, 3.0, -3.2], [cx + 27.5, 4.9, -3.5], [cx + 23.5, 3.2, -3.3], [cx + 21.8, -.4, -3.1]], .42, ["#78d65a", "#3a9f3f"], 9, 57, .1);
    rope([[cx - 30, 2.6, -1.6], [cx - 27, 4.8, -2.0], [cx - 23.5, 4.3, -2.4]], .26, ["#b4e36a", "#5cb84a"], 6, 63, .2);

    // ── the ground they stand on: grass over stacked earth, a tree or two, flowers
    grassSlab(x0, x1, 0, -3.2, 2.7, .6, 3); earthRows(x0, x1, -.45, -4.65, 1.45, 2.45, 5);
    tree(cx + 13.2, 0, -1.6, 5.4, 1, 31); tree(cx - 19.5, 0, -2.2, 6.2, 1.05, 37, false); tree(cx + 30.5, 0, -2.4, 5.0, .95, 45);
    for (let x = x0 + 1, i = 0; x < x1; x += 2.9 + hsh(i, 1, 4, 4) * 1.4, i++) flower(x, (hsh(i, 2, 4, 4) - .3) * .1 - .05, 2.62, .9 + (i % 3) * .15, i % 4 === 3 ? "#ff7bb0" : P.red, new T.Euler(-.2, 0, i));   // (on the lip)
    for (let x = x0 + 2, i = 0; x < x1; x += 4.4 + hsh(i, 1, 5, 5) * 2.4, i++) { const y = -1.2 - hsh(i, 2, 5, 5) * 3.5;   // (on the bricks: flowers and clovers)
      if (i % 2) flower(x, y, 2.67, 1.1, P.red, new T.Euler(0, 0, i * .7)); else clover(x, y, 2.71, 1.1 + (i % 4 ? .25 : 0), i * .5); }
    for (let i = 0, n = Math.round(Wd * .55); i < n; i++) { const x = x0 + hsh(i, 2, 2, 2) * Wd, z = -2.8 + hsh(i, 3, 3, 3) * 5; if (Math.abs(z) < .9) continue;   // (lying in the grass: not on the path)
      flower(x, .02, z, .55 + hsh(i, 4, 4, 4) * .25, ["#ff4d4d", "#ffd23a", "#ff8fc1", "#ffffff"][i % 4], new T.Euler(-Math.PI / 2 + .35, 0, i)); }
    for (let x = x0 + 4, i = 0; x < x1 - 2; x += 8 + hsh(i, 8, 8, 8) * 4, i++) bush(x, 0, -2.1 - hsh(i, 9, 9, 9) * .5, .55, ["#4fc24a", P.leafD], [P.berryR, P.berryB][i % 2], 70 + i);

    // ── baked: one mesh a colour (and whether it casts)
    W.updateMatrixWorld(true); const bins = new Map();
    W.traverse(m => { if (!m.isMesh) return; let g = m.geometry.clone(); for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k);
      if (!g.attributes.normal) g.computeVertexNormals(); if (!g.index) { const n = g.attributes.position.count, ix = new Uint32Array(n); for (let i = 0; i < n; i++) ix[i] = i; g.setIndex(new T.BufferAttribute(ix, 1)); }
      g.clearGroups(); g.applyMatrix4(m.matrixWorld); const key = m.userData.col + (m.userData.cast ? "c" : "n"); (bins.get(key) || bins.set(key, []).get(key)).push(g); });
    W.traverse(m => { if (m.isMesh) m.geometry.dispose(); });
    const out = new T.Group(); out.name = "clayRoom";
    bins.forEach((list, key) => { const geo = mergeGeometries(list, false); list.forEach(g => g.dispose()); if (!geo) return; geo.computeBoundingSphere();
      const m = new T.Mesh(geo, toon(key.slice(0, 7))); if (key.endsWith("c")) m.layers.enable(CAST); out.add(m); });
    return out;
  }
  return { build };
})();
