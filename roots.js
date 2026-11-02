// Berry Blade — Glos's roots: her arms grown all through Berry Woods (the user, 2026-11-02: "create varying thickness of roots that look like her arms all over
// berry woods"). Her arm, as buildGlos makes it: a bright green limb, a ruff of three flared cuffs at the elbow, white bands at the wrist, a dark green clawed hand; her
// flat white swirls. Here the same, grown long and rooted: big trunk-thick ones far back, medium ones climbing and arching behind you, thin ones hanging, a few low
// ones creeping along the ground's front edge. Scenery only: nothing to stand on or climb, nothing in the way. One merged mesh a room (one draw call), coloured per
// part; a room's own material from the game (its toon, so its light and shading), freed with the room's other pieces.
//   BerryRoots.build(THREE, o) → a THREE.Group (or null): o = { seed, cell, width, ground: x → y | null (px), plats, ladders, ceils, gaps, climb, mat: () → material, S, GROUND }
window.BerryRoots = (() => {
  const GRN = "#5cf01c", GRNd = "#3fb811", GRNk = "#2f8f0c", WH = "#f6fbf0", BACK = "#38a01a", FAR = "#4a9a2e";   // (her greens and white; the far ones, deeper)
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function build(THREE, o) {
    const R0 = rng(o.seed | 0), R = (a, b) => a + R0() * (b - a), S = o.S, G0 = o.GROUND, W = o.width, X = x => x * S, Y = y => (G0 - y) * S;
    const parts = [], col = h => new THREE.Color(h), V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const paint = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute("color", new THREE.BufferAttribute(a, 3)); return g; };
    const add = (g, hex) => { g = g.index ? g.toNonIndexed() : g; if (!g.attributes.normal) g.computeVertexNormals(); parts.push(paint(g, col(hex))); };
    const ground = x => { const y = o.ground(x); return y === null || y === undefined ? null : y; };
    const ladX = (o.ladders || []).map(l => l.x), climbX = [].concat(o.climb || []).map(c => typeof c === "number" ? c : c && (c.x ?? c[0])).filter(v => typeof v === "number");
    const nearClimb = x => ladX.some(l => Math.abs(l - x) < 170) || climbX.some(c => Math.abs(c - x) < 220);
    const flatGround = (x0, x1) => { let lo = 1e9, hi = -1e9; for (let x = x0; x <= x1; x += 40) { const y = ground(x); if (y === null) return null; lo = Math.min(lo, y); hi = Math.max(hi, y); } return hi - lo < 26 ? (lo + hi) / 2 : null; };
    const ceilAt = x => { let best = null; (o.ceils || []).forEach(c => { if (x >= c[0] && x <= c[1] && (best === null || c[2] > best)) best = c[2]; }); return best; };

    // an arm-root along pts: tapering r0 → r1, its cuffs (the ruff), its white bands, and at its free end her hand (or a swirl)
    function limb(pts, r0, r1, c, opt = {}) {
      const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal"), L = curve.getLength(); if (L < .2) return;
      const segs = Math.max(6, Math.ceil(L * (r0 > .3 ? 5 : 4))), rad = r0 > .32 ? 10 : r0 > .12 ? 8 : 6, fr = curve.computeFrenetFrames(segs, false);
      const rAt = u => lerp(r0, r1, Math.pow(u, .85)) * (1 + .08 * Math.sin(u * 23 + r0 * 40));   // (tapering, a little uneven, like grown wood)
      const P = [], N = [], ring = (i, u) => { const p = curve.getPointAt(u), n = fr.normals[i], b = fr.binormals[i], r = rAt(u), out = [];
        for (let k = 0; k < rad; k++) { const a = k / rad * Math.PI * 2, cx = Math.cos(a), sx = Math.sin(a), nx = n.x * cx + b.x * sx, ny = n.y * cx + b.y * sx, nz = n.z * cx + b.z * sx; out.push([p.x + nx * r, p.y + ny * r, p.z + nz * r, nx, ny, nz]); } return out; };
      let prev = ring(0, 0);
      for (let i = 1; i <= segs; i++) { const cur = ring(i, i / segs);
        for (let k = 0; k < rad; k++) { const k2 = (k + 1) % rad, q = [prev[k], cur[k], cur[k2], prev[k], cur[k2], prev[k2]]; q.forEach(v => { P.push(v[0], v[1], v[2]); N.push(v[3], v[4], v[5]); }); }
        prev = cur; }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3)); add(g, c);
      const along = (u, geo, hex, s = 1) => { const p = curve.getPointAt(u), t = curve.getTangentAt(u); geo.applyMatrix4(new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), t), V3(s, s, s))); add(geo, hex); };
      // the ruff: three flared cuffs stacked, as at her elbow (the bigger ones, every so often)
      if (r0 > .07 && !opt.noCuff) { const n = Math.max(1, Math.round(L / (r0 > .3 ? 3.2 : 2.4))); for (let j = 0; j < n; j++) { const u = clamp((j + .55) / (n + .3) + R(-.06, .06), .12, .82), r = rAt(u);
        for (let k = 0; k < 3; k++) { const cn = new THREE.ConeGeometry(r * (2.05 - k * .2), r * 1.35, rad, 1, true); cn.rotateX(Math.PI); cn.translate(0, -k * r * .7, 0); along(u, cn, c); } } }
      // the white bands at the wrist (on the free-ended ones)
      if (opt.hand && r1 > .025) [.78, .84, .9].forEach(u => along(u, new THREE.CylinderGeometry(rAt(u) * 1.12, rAt(u) * 1.12, rAt(u) * .55, rad, 1, true), WH));
      // her hand at the end: a dark green fist-bud, three claws
      if (opt.hand) { const r = Math.max(r1, .025) * 2.3, p = curve.getPointAt(1), t = curve.getTangentAt(1), q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), t);
        const h = new THREE.SphereGeometry(r, 10, 8); h.scale(.9, 1.3, .62); h.translate(0, r * .9, 0); h.applyMatrix4(new THREE.Matrix4().compose(p, q, V3(1, 1, 1))); add(h, GRNk);
        [-1, 0, 1].forEach(s => { const cl = new THREE.ConeGeometry(r * .32, r * 1.6, 6); cl.translate(0, r * .8, 0); cl.rotateZ(s * .42); cl.translate(0, r * 1.6, s * r * .25); cl.applyMatrix4(new THREE.Matrix4().compose(p, q, V3(1, 1, 1))); add(cl, GRNk); }); }
      if (opt.swirl) { const p = curve.getPointAt(opt.swirl), t = curve.getTangentAt(opt.swirl), rr = Math.max(.12, rAt(opt.swirl) * 2.2), sp = [];   // (one of her white swirls, curled off it)
        for (let i = 0; i <= 28; i++) { const u = i / 28, a = u * 1.45 * Math.PI * 2, r = rr * (1 - u * .82); sp.push(V3(Math.cos(a) * r, Math.sin(a) * r, 0)); }
        const sg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sp), 36, Math.max(.012, rAt(opt.swirl) * .18), 5); sg.applyMatrix4(new THREE.Matrix4().compose(V3(p.x + t.y * rr * .6, p.y - t.x * rr * .6, p.z + .02), new THREE.Quaternion(), V3(1, 1, 1))); add(sg, WH); }
    }
    const wob = (n, amp) => Array.from({ length: n }, () => R(-amp, amp));

    const row = String(o.cell || "")[0];
    // 1. along the ground, behind you: humps, out of the soil and back in (a hand gripping the earth now and then)
    for (let n = 0, tries = 0; n < 5 && tries < 30; tries++) { const x0 = R(120, W - 560), len = R(240, 520), gy = flatGround(x0, x0 + len); if (gy === null) continue;
      const z = R(-3.2, -1.6), h = R(.35, .95), r0 = R(.2, .34), y0 = Y(gy), k = 6, pts = [], w2 = wob(k + 1, .18);
      for (let i = 0; i <= k; i++) { const u = i / k; pts.push(V3(X(x0 + len * u), y0 - .35 + Math.sin(u * Math.PI) * (h + .35), z + w2[i])); }
      if (R0() < .45) { pts[k].y = y0 + .1; pts.push(V3(pts[k].x + .45, y0 - .15, pts[k].z)); limb(pts, r0, r0 * .45, n % 2 ? GRNd : GRN, { hand: true }); } else limb(pts, r0, r0 * .6, n % 2 ? GRNd : GRN); n++; }

    // 2. climbing the bank behind you: up out of the ground, wavy, the ruff on them, a hand or a swirl at the top
    for (let n = 0, tries = 0; n < 5 && tries < 40; tries++) { const x = R(80, W - 80), gy = ground(x); if (gy === null || nearClimb(x)) continue;
      const z = R(-4.4, -3.1), y0 = Y(gy) - .4, H = R(3.2, 6.4), dx = R(-1.6, 1.6), k = 7, pts = [], w2 = wob(k + 1, .3);
      for (let i = 0; i <= k; i++) { const u = i / k; pts.push(V3(X(x) + dx * u * u + Math.sin(u * 3.8 + n) * .55 * u + w2[i] * .25, y0 + H * u, z + w2[i] * .3)); }
      const cv = R0() < .5 ? 1 : -1; pts.push(V3(pts[k].x + cv * .6, pts[k].y + .3, pts[k].z));   // (the top curling over)
      const r0 = R(.24, .42); limb(pts, r0, r0 * .3, n % 2 ? GRNd : GRN, { hand: R0() < .7, swirl: R0() < .4 ? R(.45, .7) : 0 }); n++; }

    // 3. the great ones, trunk-thick, rising up out of sight further back (on every row: up from below where there's no ground)
    for (let n = 0, tries = 0; n < 2 && tries < 20; tries++) { const x = R(150, W - 150), gy = ground(x); if (nearClimb(x)) continue;
      const z = R(-6.6, -4.8), y0 = gy === null ? -5 : Y(gy) - .8, H = R(10, 14), dx = R(-1.1, 1.1), k = 8, pts = [], w2 = wob(k + 1, .35);   // (upright, as trunks: nothing like a ramp up)
      for (let i = 0; i <= k; i++) { const u = i / k; pts.push(V3(X(x) + dx * Math.sin(u * 1.6) + w2[i] * .3, y0 + H * u, z + w2[i] * .4)); }
      limb(pts, R(.7, 1.05), R(.3, .45), n ? BACK : GRNd, {}); n++; }

    // 4. hanging: down from the canopy (or the earth overhead, below ground), a hand at the end; kept high, nothing like a vine to climb
    for (let n = 0, tries = 0; n < 4 && tries < 30; tries++) { const x = R(100, W - 100); if (nearClimb(x)) continue;
      const cy = ceilAt(x), gy = ground(x), z = R(-4.2, -1.9), top = cy !== null ? Y(cy) + .1 : (gy === null ? 9.5 : Y(gy) + R(9.6, 11)), len = R(2, cy !== null ? 3.2 : 4.2);
      const floor = gy === null ? -99 : Y(gy); if (top - len < floor + 4.8) continue;   // (well above where you walk: not something to climb)
      const k = 6, pts = [], sw = R(-.9, .9); for (let i = 0; i <= k; i++) { const u = i / k; pts.push(V3(X(x) + sw * u * u + Math.sin(u * 4 + n) * .25, top - len * u, z)); }
      const r0 = R(.12, .22); limb(pts, r0, r0 * .5, n % 2 ? GRNd : GRN, { hand: true }); n++; }

    // 5. far back: one great arm arching over (half in the haze), on the rows with ground
    if (row !== "A" || R0() < .5) { const x0 = R(200, W * .5), x1 = x0 + R(800, 1400), z = R(-8.5, -7), g0 = ground(x0), g1 = ground(Math.min(W - 40, x1));
      const y0 = g0 === null ? -3 : Y(g0) - .6, y1 = g1 === null ? -3 : Y(g1) - .6, top = Math.max(y0, y1) + R(8, 11), pts = [];
      for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push(V3(lerp(X(x0), X(x1), u), lerp(y0, y1, u) + Math.sin(u * Math.PI) * (top - Math.max(y0, y1)) * (1 - .25 * Math.abs(u - .5)), z + Math.sin(u * 5) * .6)); }
      limb(pts, R(.75, 1.1), R(.4, .6), FAR, {}); }

    // 6. in front, along the ground's edge: low, thick, creeping over its lip (below everyone's feet as the camera sees it)
    for (let n = 0, tries = 0; n < 2 && tries < 20; tries++) { const x0 = R(260, W - 700), len = R(240, 460), gy = flatGround(x0 - 40, x0 + len + 40); if (gy === null) continue;
      const z = R(1.9, 2.4), y0 = Y(gy), k = 6, pts = [], w2 = wob(k + 1, .1);
      for (let i = 0; i <= k; i++) { const u = i / k; pts.push(V3(X(x0 + len * u), y0 + .04 + Math.sin(u * Math.PI) * R(.08, .18), z + w2[i])); }
      pts.push(V3(pts[k].x + .3, y0 - .3, pts[k].z + .4)); limb(pts, R(.18, .28), .09, GRN, { hand: R0() < .5 }); n++; }

    if (!parts.length) return null;
    // one mesh: all of it merged (non-indexed, as built), coloured per part
    let nV = 0; parts.forEach(g => { nV += g.attributes.position.count; });
    const pos = new Float32Array(nV * 3), nor = new Float32Array(nV * 3), cl = new Float32Array(nV * 3); let off = 0;
    parts.forEach(g => { pos.set(g.attributes.position.array, off); nor.set(g.attributes.normal.array, off); cl.set(g.attributes.color.array, off); off += g.attributes.position.count * 3; g.dispose(); });
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); geo.setAttribute("color", new THREE.BufferAttribute(cl, 3));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, o.mat()), grp = new THREE.Group(); grp.name = "glosRoots"; grp.add(mesh); grp.userData.verts = nV; return grp;
  }
  return { build };
})();
