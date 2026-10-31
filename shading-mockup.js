// Berry Blade — SHADING LOOK-DEV MOCKUP (the user, 2026-10-30, a spec kept word for word in .claude/berry-tools/wip/SHADING_MOCKUP_SPEC_1030.md;
// notes: SHADING_MOCKUP_NOTES.md). Opened from DEVELOPER > SHADING MOCKUP, or index.html?shading. Its own scene: the two girls built fresh (Camila in
// her axolotl suit, Rose in the red-footed tortoise), a slice of the Berry Forest built fresh from the game's own jungle builders, its own lights and
// camera. The game's materials are never changed: CURRENT draws these new builds' own materials as the game makes them; every other preset draws
// clones of them with one more shader step chained on (shadingMockup's settings, below). Drawn through the game's own pipeline (its frame target, the
// grade + paper pass), so CURRENT is the shipping look. Nothing here runs unless it's opened
window.ShadingMockup = (() => {
  const KEY = "berry.shadingMockup.v1";
  const DEF = {
    character: {
      lightingInfluence: 1.0,
      toonRamp: { enabled: true, steps: 3, softness: .15 },
      shadowTint: { enabled: true, color: "#6A4C8C", strength: .5 },
      rimLight: { enabled: true, color: "#FFFFFF", width: .3, intensity: .6 },
      edgeHighlight: { enabled: false, color: "#FFFFFF", thickness: .01, intensity: .5 },
      fakeAO: { enabled: true, strength: .4 },
      topLight: { enabled: true, strength: .15 },
      specular: { enabled: false, intensity: 0 },
      saturation: 1.0
    },
    environment: {
      lightingInfluence: 1.0,
      toonRamp: { enabled: false, steps: 2, softness: .3 },
      saturation: .9,
      contrast: .9,
      shadowTint: { enabled: true, color: "#3E5A6E", strength: .4 }
    }
  };
  const clone = o => JSON.parse(JSON.stringify(o));
  const PRESETS = {
    current: () => { const c = clone(DEF); const C = c.character, E = c.environment; C.toonRamp.enabled = C.shadowTint.enabled = C.rimLight.enabled = C.edgeHighlight.enabled = C.fakeAO.enabled = C.topLight.enabled = C.specular.enabled = false;
      C.lightingInfluence = 1; C.saturation = 1; E.lightingInfluence = 1; E.toonRamp.enabled = false; E.shadowTint.enabled = false; E.saturation = 1; E.contrast = 1; c.current = true; return c; },
    softToon: () => { const c = clone(DEF); Object.assign(c.character.toonRamp, { enabled: true, steps: 3, softness: .15 }); c.character.lightingInfluence = 1; c.character.edgeHighlight.enabled = false; return c; },
    kh: () => { const c = clone(DEF), C = c.character; C.lightingInfluence = .35; Object.assign(C.toonRamp, { enabled: true, steps: 2, softness: .45 }); Object.assign(C.topLight, { enabled: true, strength: .4 });
      Object.assign(C.fakeAO, { enabled: true, strength: .5 }); Object.assign(C.edgeHighlight, { enabled: true, thickness: .012, intensity: .6 }); Object.assign(C.rimLight, { enabled: true, intensity: .25, width: .25 }); return c; },
    flat: () => { const c = clone(DEF), C = c.character; C.lightingInfluence = .1; C.toonRamp.enabled = false; C.shadowTint.enabled = false; C.fakeAO.enabled = false; C.topLight.enabled = false; C.edgeHighlight.enabled = false;
      Object.assign(C.rimLight, { enabled: true, intensity: .7, width: .3 }); C.saturation = 1.3; return c; }
  };
  const PRESET_UI = [["current", "CURRENT"], ["softToon", "SOFT TOON"], ["kh", "KINGDOM HEARTS-ISH"], ["flat", "FLAT GRAPHIC"], ["custom", "CUSTOM"]];
  const LIGHTS_UI = [["midday", "MIDDAY"], ["warm", "WARM LATE AFTERNOON"], ["overcast", "COOL OVERCAST"], ["backlit", "BACKLIT"]];
  let X = null, st = null, THREE = null;                  // X: the game's pieces (ctx); st: the open mockup; THREE: the game's (a module's, not a global)

  // ── the one shader step, chained on after the game's own (MeshToonMaterial: its gradient, both lights, the characters' paper skin) ──
  const unifs = () => ({ mkOn: { value: 1 }, mkInfl: { value: 1 }, mkRampOn: { value: 0 }, mkSteps: { value: 3 }, mkSoft: { value: .15 }, mkTintOn: { value: 0 }, mkTint: { value: null }, mkTintStr: { value: .5 },
    mkRimOn: { value: 0 }, mkRimC: { value: null }, mkRimW: { value: .3 }, mkRimI: { value: .6 }, mkAOOn: { value: 0 }, mkAOStr: { value: .4 }, mkTopOn: { value: 0 }, mkTopStr: { value: .15 },
    mkSpecOn: { value: 0 }, mkSpecI: { value: 0 }, mkSat: { value: 1 }, mkCon: { value: 1 }, mkGround: { value: 0 } });
  const VERT = `varying vec3 vMkW; varying vec3 vMkN;\n`, VERT_MAIN = `\n vMkW = (modelMatrix * vec4(transformed, 1.0)).xyz; vMkN = normalize(mat3(modelMatrix) * objectNormal);\n`;
  const FRAG = `uniform float mkOn, mkInfl, mkRampOn, mkSteps, mkSoft, mkTintOn, mkTintStr, mkRimOn, mkRimW, mkRimI, mkAOOn, mkAOStr, mkTopOn, mkTopStr, mkSpecOn, mkSpecI, mkSat, mkCon, mkGround;
uniform vec3 mkTint, mkRimC; varying vec3 vMkW; varying vec3 vMkN;
float mkRamp(float x) { float s = max(mkSteps, 1.0), y = x * s, f = floor(y), w = max(mkSoft, .001) * .5; return clamp((f + smoothstep(.5 - w, .5 + w, y - f)) / s, 0.0, 1.0); }
`;
  const FRAG_MAIN = `
  { vec3 mkBase = outgoingLight, mkAlb = diffuseColor.rgb, mkN = normalize(normal), mkV = normalize(vViewPosition), mkNW = normalize(vMkN);
    vec3 mkL = vec3(0.0, 1.0, 0.0), mkSun = vec3(0.0); vec3 mkHemi = vec3(0.0);
    #if NUM_DIR_LIGHTS > 0
      mkL = directionalLights[0].direction; mkSun = directionalLights[0].color;
    #endif
    #if NUM_HEMI_LIGHTS > 0
      { float hk = dot(mkN, hemisphereLights[0].direction) * .5 + .5; mkHemi = mix(hemisphereLights[0].groundColor, hemisphereLights[0].skyColor, hk); }
    #endif
    float mkNL = dot(mkN, mkL), mkX = clamp(mkNL * .5 + .5, 0.0, 1.0), mkR = mkRampOn > .5 ? mkRamp(mkX) : smoothstep(.35, .65, mkX);
    vec3 mkLit = mkRampOn > .5 ? mkAlb * (mkSun * mix(.5, 1.0, mkR) + mkHemi) * RECIPROCAL_PI + totalEmissiveRadiance : mkBase;   // (stepped: the sun in bands over the sky's fill; its shadow band keeps half the sun, as the game's own ramp keeps .71)
    if (mkTintOn > .5) { float l = max(dot(mkTint, vec3(.299, .587, .114)), .05); vec3 tc = mkTint / l * .82; mkLit = mix(mkLit, mkLit * tc, (1.0 - mkR) * mkTintStr); }   // (the shadow side shifted toward the tint, not greyed)
    vec3 mkFlat = mkAlb * 1.05 + totalEmissiveRadiance;
    vec3 c = mix(mkFlat, mkLit, mkInfl);
    if (mkAOOn > .5) { float ao = clamp(-mkNW.y, 0.0, 1.0) * .65 + (1.0 - smoothstep(0.0, .7, vMkW.y - mkGround)) * .45; c *= 1.0 - mkAOStr * clamp(ao, 0.0, 1.0); }   // (creases face down; low down near the ground)
    if (mkTopOn > .5) c += mkAlb * mkTopStr * max(mkNW.y, 0.0);
    if (mkRimOn > .5) { float f = 1.0 - max(dot(mkN, mkV), 0.0); c += mkRimC * smoothstep(1.0 - mkRimW, 1.0, f) * mkRimI; }
    if (mkSpecOn > .5) { vec3 h = normalize(mkL + mkV); c += mkSun * smoothstep(.94, .965, dot(mkN, h)) * mkSpecI * .35; }
    float lu = dot(c, vec3(.299, .587, .114)); c = mix(vec3(lu), c, mkSat); c = (c - .22) * mkCon + .22;
    outgoingLight = mkOn > .5 ? max(c, 0.0) : mkBase; }
`;
  function patchShader(sh, U) {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = VERT + sh.vertexShader.replace("#include <project_vertex>", "#include <project_vertex>" + VERT_MAIN);
    const tail = sh.fragmentShader.includes("#include <opaque_fragment>") ? "#include <opaque_fragment>" : "#include <output_fragment>";
    sh.fragmentShader = FRAG + sh.fragmentShader.replace(tail, FRAG_MAIN + tail);
  }
  function mockMat(orig, U, tag) {                         // a clone with the step chained on after whatever the game's own patch does
    const m = orig.clone(); m.userData = { ...orig.userData }; const prev = orig.onBeforeCompile, base = THREE.Material.prototype.onBeforeCompile;
    const pk = orig.customProgramCacheKey ? orig.customProgramCacheKey() : "";
    m.onBeforeCompile = (sh, r) => { if (prev && prev !== base) prev.call(orig, sh, r); patchShader(sh, U); };
    m.customProgramCacheKey = () => pk + "|mock-" + tag; return m;
  }
  const hullMat = U => new THREE.ShaderMaterial({ uniforms: U, side: THREE.BackSide,   // the light edge (inverted hull): the mesh pushed out along its normals, its back faces in the highlight colour
    vertexShader: `uniform float th; void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * th, 1.0); }`,
    fragmentShader: `uniform vec3 col; uniform float k; void main() { gl_FragColor = vec4(col * k, 1.0); }` });

  // ── the lights: the woods' own MIDDAY, its golden late afternoon, and two made up for the test ──
  function lightsOf(name) {
    const S = X.screens, mid = S[0], gold = S[3];
    if (name === "warm") return { sun: [gold.sun[0], gold.sun[1]], sun2: gold.sun2, hemi: gold.hemi, hemi2: gold.hemi2, grade: gold.grade, warm: gold.warm, bg: gold.bg, fog: gold.fog, pos: [-9, 6.5, 9] };
    if (name === "overcast") return { sun: ["#dfe7ef", .75], sun2: ["#e3eaf2", .85], hemi: ["#d8e0ea", "#56626c", 1.85], hemi2: ["#dde5ee", "#58646e", 1.95], grade: [.95, 1, 1.06, .35], warm: .45, bg: "#a9b5ba", fog: [34, 110], pos: [-4, 16, 6] };
    if (name === "backlit") return { sun: ["#fff0d0", 3.0], sun2: ["#fff0d0", 3.1], hemi: [mid.hemi[0], mid.hemi[1], .95], hemi2: [mid.hemi2[0], mid.hemi2[1], 1.0], grade: mid.grade, warm: mid.warm, bg: "#c4d6c0", fog: mid.fog, pos: [4, 9, -13] };
    return { sun: [mid.sun[0], mid.sun[1]], sun2: mid.sun2, hemi: mid.hemi, hemi2: mid.hemi2, grade: mid.grade, warm: mid.warm, bg: mid.bg, fog: mid.fog, pos: [-7, mid.sun[2] || 14, 11] };
  }
  function setLights(name) {
    const L = lightsOf(name); st.light = name;
    st.sun.color.set(L.sun[0]); st.sun.intensity = L.sun[1]; st.sun2.color.set(L.sun2[0]); st.sun2.intensity = L.sun2[1];
    st.hemi.color.set(L.hemi[0]); st.hemi.groundColor.set(L.hemi[1]); st.hemi.intensity = L.hemi[2]; st.hemi2.color.set(L.hemi2[0]); st.hemi2.groundColor.set(L.hemi2[1]); st.hemi2.intensity = L.hemi2[2];
    for (const s of [st.sun, st.sun2]) { s.position.set(...L.pos); s.target.position.set(0, 1, 0); }
    st.env.background = new THREE.Color(L.bg); st.fog.color.set(L.bg); st.fog.near = L.fog[0]; st.fog.far = L.fog[1];
    const G = X.gradeMat.uniforms; G.tintC.value.set(L.grade[0], L.grade[1], L.grade[2]); G.tintAmt.value = L.grade[3]; G.warm.value = L.warm; G.ruin.value = 0; G.bloom.value = 0; G.dim.value = 0; G.bgOn.value = 0;
    uiState();
  }

  // ── the settings into the shader steps ──
  function applySettings() {
    const C = st.cfg.character, E = st.cfg.environment, a = st.UC, b = st.UE, H = st.UH;
    a.mkInfl.value = C.lightingInfluence; a.mkRampOn.value = C.toonRamp.enabled ? 1 : 0; a.mkSteps.value = C.toonRamp.steps; a.mkSoft.value = C.toonRamp.softness;
    a.mkTintOn.value = C.shadowTint.enabled ? 1 : 0; a.mkTint.value.set(C.shadowTint.color); a.mkTintStr.value = C.shadowTint.strength;
    a.mkRimOn.value = C.rimLight.enabled ? 1 : 0; a.mkRimC.value.set(C.rimLight.color); a.mkRimW.value = C.rimLight.width; a.mkRimI.value = C.rimLight.intensity;
    a.mkAOOn.value = C.fakeAO.enabled ? 1 : 0; a.mkAOStr.value = C.fakeAO.strength; a.mkTopOn.value = C.topLight.enabled ? 1 : 0; a.mkTopStr.value = C.topLight.strength;
    a.mkSpecOn.value = C.specular.enabled ? 1 : 0; a.mkSpecI.value = C.specular.intensity; a.mkSat.value = C.saturation; a.mkCon.value = 1;
    b.mkInfl.value = E.lightingInfluence; b.mkRampOn.value = E.toonRamp.enabled ? 1 : 0; b.mkSteps.value = E.toonRamp.steps; b.mkSoft.value = E.toonRamp.softness;
    b.mkTintOn.value = E.shadowTint.enabled ? 1 : 0; b.mkTint.value.set(E.shadowTint.color); b.mkTintStr.value = E.shadowTint.strength; b.mkSat.value = E.saturation; b.mkCon.value = E.contrast;
    H.col.value.set(C.edgeHighlight.color); H.th.value = C.edgeHighlight.thickness; H.k.value = C.edgeHighlight.intensity; st.edgeOn = !!C.edgeHighlight.enabled;
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ custom: st.custom, preset: st.preset, light: st.light, split: st.split, turn: st.turn })); } catch (e) { } };
  function usePreset(name) {
    st.preset = name; st.cfg = name === "custom" ? clone(st.custom) : PRESETS[name](); applySettings(); uiState(); save();
  }

  // ── the scene: a slice of the woods and the two girls ──
  function buildEnv() {
    const env = new THREE.Scene(); st.fog = new THREE.Fog("#9cbca3", 40, 125); env.fog = st.fog;
    st.sun = new THREE.DirectionalLight("#fff3d6", 2.6); env.add(st.sun, st.sun.target); st.hemi = new THREE.HemisphereLight("#f3f1d6", "#3f6544", 1.25); env.add(st.hemi);
    let seed = 20261030; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const M = X.tropMats(), turf = X.toon("#6aa548"), turfD = X.toon("#55913e"), dirt = X.toon("#a07c52");
    const ground = new THREE.Mesh(new THREE.CircleGeometry(16, 48), turf); ground.rotation.x = -Math.PI / 2; env.add(ground);
    const path = new THREE.Mesh(new THREE.CircleGeometry(3.2, 36), dirt); path.rotation.x = -Math.PI / 2; path.position.y = .01; path.scale.set(1.4, .75, 1); env.add(path);
    for (let i = 0; i < 26; i++) { const a = rng() * Math.PI * 2, r = 4 + rng() * 9, t = new THREE.Mesh(new THREE.ConeGeometry(.12 + rng() * .1, .35 + rng() * .4, 4), rng() < .5 ? turf : turfD); t.position.set(Math.cos(a) * r, .15, Math.sin(a) * r - 1); env.add(t); }
    X.tropPalm(env, M, -4.6, 0, -5.5, rng, { h: 9, lean: .1 }); X.tropTreeFern(env, M, 4.3, 0, -4.2, rng, { h: 5.5 }); X.tropPlantain(env, M, -2.6, 0, -2.6, rng, 1.1);
    X.tropPlantain(env, M, 3.0, 0, -1.8, rng, .9); [[-1.6, -1.2, .9], [1.7, -1.0, .8], [-3.4, -.6, 1.1], [3.8, .2, 1], [0, -3.4, 1.2], [-5, 1.5, 1], [5.2, 1.8, .9]].forEach(([x, z, s]) => X.tropGroundFern(env, M, x, 0, z, rng, s));
    [[-.7, -2.2], [2.4, -3.0], [-3.9, -3.6]].forEach(([x, z]) => X.tropBromeliad(env, M, x, 0, z, rng, .9));
    return env;
  }
  function buildGirls() {
    const actors = new THREE.Scene(); actors.fog = st.fog;
    st.sun2 = new THREE.DirectionalLight("#fff3d6", 2.6); actors.add(st.sun2, st.sun2.target); st.hemi2 = new THREE.HemisphereLight("#f3f1d6", "#3f6544", 1.25); actors.add(st.hemi2);
    const specs = X.rosterSpecs(), girls = [["camila", "costume_axolotl", -46, "cpunch"], ["rose", "costume_tortoise", 46, "rslash"]];
    st.girls = girls.map(([id, suit, x, atk]) => { const sp = specs.find(s => s.id === id); if (!sp) return null;
      const r = X.buildChar(X.lookOf(sp)); X.dressGear(r, { body: suit }); actors.add(r.root); if (r.shadow) st.env.add(r.shadow); if (r.segRoot) actors.add(r.segRoot);
      const s = X.makeState(x, r, 0); s.face = 1; s.yaw = -.6; s.hp = 99; s.maxHp = 99; return { id, suit, r, s, atk, x, yaw0: -.6 }; }).filter(Boolean);
    return actors;
  }
  function pairUp() {                                     // every toon mesh of the girls and the woods: its own material and its clone, the light-edge hull on the girls'
    const add = (root, U, tag, hull) => root.traverse(o => { if (!o.isMesh || o.userData.mkHull) return; const m = o.material; if (!m || !m.isMeshToonMaterial) return;
      let P = st.pairs.get(o); if (!P || P.orig !== m && P.mock !== m) { P = { orig: m, mock: mockMat(m, U, tag) }; st.pairs.set(o, P); }
      if (hull && !o.userData.mkHullMesh && o.geometry && o.geometry.attributes.normal) { const h = new THREE.Mesh(o.geometry, st.hull); h.userData.mkHull = true; h.visible = false; h.frustumCulled = false; o.add(h); o.userData.mkHullMesh = h; st.hulls.push(h); } });
    add(st.env, st.UE, "env", false); st.girls.forEach(g => add(g.r.root, st.UC, "char", true));
  }
  function setMats(mock) {                                // the same meshes, drawn with the game's own materials or the mockup's
    for (const [o, P] of st.pairs) { if (mock) { const a = P.orig, b = P.mock; b.color.copy(a.color); if (a.emissive && b.emissive) b.emissive.copy(a.emissive); b.opacity = a.opacity; b.transparent = a.transparent; b.visible = a.visible; } o.material = mock ? P.mock : P.orig; }
    for (const h of st.hulls) h.visible = mock && st.edgeOn && h.parent && h.parent.visible;
  }

  // ── each frame ──
  function step(dt) {
    X.KIT.time += dt; st.t += dt;
    for (const g of st.girls) { const s = g.s;
      if (g.atkWait > 0) g.atkWait -= dt; else if (g.atkT >= 0) { const S = X.KIT.STRIKES[g.atk]; g.atkT += dt; if (!S || g.atkT > S.dur) { g.atkT = -1; s.atkT = -1; s.atkKind = null; } else { s.atkKind = g.atk; s.atkT = g.atkT; s.atkIdx = 0; } }
      Object.assign(s, { vx: 0, vy: 0, onGround: true, y: X.GROUND, x: g.x, hurtT: 0, hp: 99 });
      X.KIT.updatePose(s, dt); s.yaw = st.turn ? g.yaw0 + st.spin : g.yaw0; s.x = g.x; g.r.sync(s, g.r, dt); }
    if (st.turn) st.spin += dt * .45;
  }
  function draw() {
    const R = X.renderer, RT = X.frameRT, cam = st.cam; cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
    pairUp(); X.pipe.pre(); R.setClearAlpha(1); R.setRenderTarget(RT); R.clear();
    const pass = (mock, x0, x1) => { setMats(mock); applyGround(); if (x1 <= x0) return; RT.scissor.set(Math.floor(x0 * RT.width), 0, Math.ceil((x1 - x0) * RT.width), RT.height); RT.scissorTest = x0 > 0 || x1 < 1;
      R.setRenderTarget(RT); R.render(st.env, cam); R.clearDepth(); R.render(st.actors, cam); };
    const cur = st.preset === "current";
    if (st.split && !cur && !st.shooting) { pass(false, 0, st.splitX); pass(true, st.splitX, 1); } else pass(!cur && !st.showA, 0, 1);
    RT.scissorTest = false; RT.scissor.set(0, 0, RT.width, RT.height); setMats(false);
    R.setRenderTarget(null); X.pipe.grade(); R.render(X.gradeScene, X.gradeCam);
  }
  const applyGround = () => { st.UC.mkGround.value = 0; st.UE.mkGround.value = -99; };
  function frameCam() {                                  // both girls in the picture, a little over half its height, the woods round them
    const B = new THREE.Box3(); st.girls.forEach(g => { g.r.root.updateMatrixWorld(true); B.expandByObject(g.r.root); }); if (B.isEmpty()) return;
    const c = B.getCenter(new THREE.Vector3()), h = B.max.y - B.min.y, cam = st.cam, d = h / .5 / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)));
    cam.position.set(c.x + d * .06, c.y + h * .22, c.z + d); cam.lookAt(c.x, c.y - h * .04, c.z); st.framed = true;
  }
  function frame(dt) { if (!st) return; step(Math.min(dt, .1)); if (!st.framed) frameCam(); draw(); }

  // ── the panel (F2), the divider, the keys ──
  const CH_UI = [["lightingInfluence", "lighting influence", 0, 1, .01], ["toonRamp.enabled", "toon ramp"], ["toonRamp.steps", "ramp steps", 1, 6, 1], ["toonRamp.softness", "ramp softness", 0, 1, .01],
    ["shadowTint.enabled", "shadow tint"], ["shadowTint.color", "tint colour"], ["shadowTint.strength", "tint strength", 0, 1, .01],
    ["rimLight.enabled", "rim light"], ["rimLight.color", "rim colour"], ["rimLight.width", "rim width", 0, 1, .01], ["rimLight.intensity", "rim intensity", 0, 2, .01],
    ["edgeHighlight.enabled", "edge highlight"], ["edgeHighlight.color", "edge colour"], ["edgeHighlight.thickness", "edge thickness", 0, .05, .001], ["edgeHighlight.intensity", "edge intensity", 0, 1.5, .01],
    ["fakeAO.enabled", "fake AO"], ["fakeAO.strength", "AO strength", 0, 1, .01], ["topLight.enabled", "top light"], ["topLight.strength", "top light strength", 0, 1, .01],
    ["specular.enabled", "specular"], ["specular.intensity", "specular intensity", 0, 2, .01], ["saturation", "saturation", 0, 2, .01]];
  const ENV_UI = [["lightingInfluence", "lighting influence", 0, 1, .01], ["toonRamp.enabled", "toon ramp"], ["toonRamp.steps", "ramp steps", 1, 6, 1], ["toonRamp.softness", "ramp softness", 0, 1, .01],
    ["saturation", "saturation", 0, 2, .01], ["contrast", "contrast", 0, 2, .01], ["shadowTint.enabled", "shadow tint"], ["shadowTint.color", "tint colour"], ["shadowTint.strength", "tint strength", 0, 1, .01]];
  const get = (o, p) => p.split(".").reduce((a, k) => a[k], o), put = (o, p, v) => { const ks = p.split("."), l = ks.pop(); ks.reduce((a, k) => a[k], o)[l] = v; };
  function row(sect, [p, n, a, b, s]) { const v = get(DEF[sect], p), path = sect + "." + p;
    if (typeof v === "boolean") return `<label class="sm-k"><span>${n}</span><input type="checkbox" data-p="${path}"><span></span></label>`;
    if (typeof v === "string") return `<label class="sm-k"><span>${n}</span><input type="color" data-p="${path}"><span></span></label>`;
    return `<label class="sm-k"><span>${n}</span><input type="range" min="${a}" max="${b}" step="${s}" data-p="${path}"><span class="sm-v"></span></label>`; }
  function buildUI() {
    const D = document.createElement("div"); D.id = "shadeUI";
    D.innerHTML = `<style>
#shadeUI { position: fixed; inset: 0; z-index: 9998; pointer-events: none; font: 600 11px/1.35 system-ui, sans-serif; color: #fff7e0; }
#shadeUI .sm-bar { position: absolute; left: 8px; top: 8px; display: flex; flex-wrap: wrap; gap: 4px; max-width: calc(100vw - 380px); pointer-events: auto; }
#shadeUI button { background: rgba(26, 31, 69, .92); color: #fff7e0; border: 1px solid #5866c4; border-radius: 6px; padding: 6px 8px; font: 700 10px system-ui, sans-serif; cursor: pointer; }
#shadeUI button.on { background: #ffd203; color: #1a1f45; border-color: #ffd203; } #shadeUI .sm-sep { width: 100%; height: 0; }
#shadeUI .sm-panel { position: absolute; top: 8px; right: 8px; bottom: 8px; width: min(340px, calc(100vw - 16px)); overflow-y: auto; background: rgba(18, 22, 48, .93); border: 2px solid #ffd203; border-radius: 10px; padding: 10px 12px; box-sizing: border-box; pointer-events: auto; }
#shadeUI .sm-panel.hide { display: none; } #shadeUI h3 { margin: 0 0 6px; font: 800 14px/1.1 system-ui, sans-serif; color: #ffd203; letter-spacing: .06em; } #shadeUI h4 { margin: 10px 0 4px; color: #ffe27a; font: 800 11px system-ui, sans-serif; }
#shadeUI label.sm-k { display: grid; grid-template-columns: 1fr 120px 34px; align-items: center; gap: 6px; margin: 2px 0; } #shadeUI input[type=range] { width: 100%; accent-color: #ffd203; } #shadeUI .sm-v { text-align: right; font-variant-numeric: tabular-nums; }
#shadeUI .sm-note { opacity: .75; margin: 4px 0; } #shadeUI .sm-div { position: absolute; top: 0; bottom: 0; width: 18px; margin-left: -9px; cursor: ew-resize; pointer-events: auto; display: none; }
#shadeUI .sm-div::before { content: ""; position: absolute; left: 8px; top: 0; bottom: 0; width: 2px; background: #ffd203; box-shadow: 0 0 0 1px rgba(26, 31, 69, .6); }
#shadeUI .sm-tag { position: absolute; bottom: 12px; padding: 3px 7px; border-radius: 5px; background: rgba(26, 31, 69, .85); font: 800 11px system-ui, sans-serif; display: none; }
#shadeUI .sm-msg { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); padding: 14px 18px; border-radius: 10px; background: rgba(18, 22, 48, .95); border: 2px solid #ffd203; font: 800 13px system-ui, sans-serif; display: none; }
<\/style>
<div class="sm-bar"><span data-k="presets"></span><span class="sm-sep"></span><span data-k="lights"></span><span class="sm-sep"></span>
<button data-a="atk">ATTACK (SPACE)</button><button data-a="turn">TURNTABLE (T)</button><button data-a="split">A/B SPLIT (B)</button><button data-a="ab">SHOW CURRENT (HOLD A)</button><button data-a="shots">CAPTURE ALL SHOTS</button><button data-a="panel">TUNING (F2)</button><button data-a="close">CLOSE (ESC)</button></div>
<div class="sm-div"></div><div class="sm-tag" data-t="l">CURRENT</div><div class="sm-tag" data-t="r"></div><div class="sm-msg"></div>
<div class="sm-panel hide"><h3>SHADING MOCKUP</h3><div class="sm-note">Changes go to CUSTOM. The game itself isn't touched: this is its own scene with copies of the materials.</div>
<h4>CHARACTER</h4>${CH_UI.map(q => row("character", q)).join("")}<h4>ENVIRONMENT</h4>${ENV_UI.map(q => row("environment", q)).join("")}
<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:10px"><button data-a="saveCustom">SAVE CUSTOM</button><button data-a="reset">RESET CUSTOM</button></div></div>`;
    const P = D.querySelector('[data-k="presets"]'), L = D.querySelector('[data-k="lights"]');
    PRESET_UI.forEach(([k, n]) => { const b = document.createElement("button"); b.dataset.preset = k; b.textContent = n; P.appendChild(b); P.appendChild(document.createTextNode(" ")); });
    LIGHTS_UI.forEach(([k, n]) => { const b = document.createElement("button"); b.dataset.light = k; b.textContent = n; L.appendChild(b); L.appendChild(document.createTextNode(" ")); });
    D.addEventListener("input", e => { const I = e.target, p = I.dataset.p; if (!p) return; if (st.preset !== "custom") { st.custom = clone(st.cfg); delete st.custom.current; st.preset = "custom"; st.cfg = clone(st.custom); }
      const v = I.type === "checkbox" ? I.checked : I.type === "color" ? I.value : +I.value; put(st.cfg, p, v); put(st.custom, p, v); applySettings(); uiState(); save(); });
    D.addEventListener("change", e => { if (e.target.type === "range") e.target.blur(); });
    D.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.preset) return usePreset(b.dataset.preset); if (b.dataset.light) return setLights(b.dataset.light), save(); act(b.dataset.a); });
    const ab = D.querySelector('[data-a="ab"]'); const hold = v => () => { st.showA = v; uiState(); }; ab.addEventListener("pointerdown", hold(true)); ab.addEventListener("pointerup", hold(false)); ab.addEventListener("pointerleave", hold(false));
    const dv = D.querySelector(".sm-div"); let drag = false; dv.addEventListener("pointerdown", e => { drag = true; dv.setPointerCapture(e.pointerId); });
    dv.addEventListener("pointermove", e => { if (!drag) return; st.splitX = Math.min(.95, Math.max(.05, e.clientX / innerWidth)); uiState(); }); dv.addEventListener("pointerup", () => { drag = false; save(); });
    document.body.appendChild(D); return D;
  }
  function uiState() {
    if (!st || !st.ui) return; const D = st.ui;
    D.querySelectorAll("[data-preset]").forEach(b => b.classList.toggle("on", b.dataset.preset === st.preset)); D.querySelectorAll("[data-light]").forEach(b => b.classList.toggle("on", b.dataset.light === st.light));
    D.querySelector('[data-a="turn"]').classList.toggle("on", st.turn); D.querySelector('[data-a="split"]').classList.toggle("on", st.split); D.querySelector('[data-a="ab"]').classList.toggle("on", st.showA);
    D.querySelector('[data-a="panel"]').classList.toggle("on", !D.querySelector(".sm-panel").classList.contains("hide"));
    const sp = st.split && st.preset !== "current", dv = D.querySelector(".sm-div"), tl = D.querySelector('[data-t="l"]'), tr = D.querySelector('[data-t="r"]');
    dv.style.display = sp ? "block" : "none"; dv.style.left = st.splitX * 100 + "vw"; tl.style.display = tr.style.display = sp ? "block" : "none";
    tl.style.left = "12px"; tr.style.left = "calc(" + st.splitX * 100 + "vw + 12px)"; tr.textContent = (PRESET_UI.find(q => q[0] === st.preset) || [, ""])[1];
    D.querySelectorAll("[data-p]").forEach(I => { const v = get(st.cfg, I.dataset.p); if (I.type === "checkbox") I.checked = !!v; else if (document.activeElement !== I) I.value = v; const o = I.nextElementSibling; if (o && o.classList.contains("sm-v")) o.textContent = +(+v).toFixed(3); });
  }
  function act(a) {
    if (a === "atk") st.girls.forEach((g, i) => { g.atkT = 0; g.atkWait = i * .12; });   // (Rose a beat after Camila)
    if (a === "turn") { st.turn = !st.turn; save(); }
    if (a === "split") { st.split = !st.split; save(); }
    if (a === "panel") st.ui.querySelector(".sm-panel").classList.toggle("hide");
    if (a === "saveCustom") { st.custom = clone(st.cfg); delete st.custom.current; save(); msg("CUSTOM SAVED", 900); }
    if (a === "reset") { st.custom = PRESETS.softToon(); if (st.preset === "custom") usePreset("custom"); save(); }
    if (a === "shots") capture();
    if (a === "close") close();
    uiState();
  }
  function msg(t, ms) { const m = st.ui.querySelector(".sm-msg"); m.textContent = t; m.style.display = t ? "block" : "none"; if (ms) setTimeout(() => { if (st) m.style.display = "none"; }, ms); }
  function onKey(e) {
    if (!st) return; const k = e.code, inField = e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== "range" && e.target.type !== "checkbox";
    if (inField) return;
    if (k === "Escape") { e.preventDefault(); close(); } else if (k === "F2") { e.preventDefault(); act("panel"); } else if (k === "Space") { e.preventDefault(); act("atk"); }
    else if (k === "KeyT") act("turn"); else if (k === "KeyB") act("split"); else if (k === "KeyA" && !e.repeat) { st.showA = true; uiState(); } else return;
    e.stopPropagation();
  }
  const onKeyUp = e => { if (st && e.code === "KeyA") { st.showA = false; uiState(); } };

  // ── the screenshot grid: every preset under every light, into shading_mockup_shots/ (a zip download; a local test receiver too, if one answers) ──
  async function capture() {
    if (st.shooting) return; st.shooting = true; const keep = { preset: st.preset, light: st.light, turn: st.turn, ui: st.ui.style.display }; st.turn = false; st.ui.style.display = "none";
    const files = [], R = X.renderer, cv = R.domElement, sheet = document.createElement("canvas"), cw = 480, chh = Math.round(cw * innerHeight / innerWidth); sheet.width = cw * LIGHTS_UI.length; sheet.height = (chh + 22) * PRESET_UI.length + 22;
    const g = sheet.getContext("2d"); g.fillStyle = "#1a1f45"; g.fillRect(0, 0, sheet.width, sheet.height); g.font = "700 14px system-ui, sans-serif"; g.fillStyle = "#ffd203";
    LIGHTS_UI.forEach(([, n], j) => g.fillText(n, j * cw + 8, 16));
    for (let i = 0; i < PRESET_UI.length; i++) { const [pk, pn] = PRESET_UI[i];
      for (let j = 0; j < LIGHTS_UI.length; j++) { const [lk] = LIGHTS_UI[j]; usePreset(pk); setLights(lk);
        for (let n = 0; n < 3; n++) { step(1 / 60); draw(); }   // (settled: the springs, the costume's bits)
        const blob = await new Promise(res => cv.toBlob(res, "image/png")); const name = `${pk.replace(/[A-Z]/g, c => "-" + c.toLowerCase())}_${lk}.png`.replace("kh_", "kingdom-hearts-ish_").replace("flat_", "flat-graphic_");
        files.push([name, new Uint8Array(await blob.arrayBuffer())]);
        const im = await createImageBitmap(blob); g.drawImage(im, j * cw, 22 + i * (chh + 22) + 20, cw, chh); g.fillStyle = "#fff7e0"; g.fillText(pn, 8, 22 + i * (chh + 22) + 16); g.fillStyle = "#ffd203"; } }
    const sb = await new Promise(res => sheet.toBlob(res, "image/png")); files.push(["contact-sheet.png", new Uint8Array(await sb.arrayBuffer())]);
    usePreset(keep.preset); setLights(keep.light); st.turn = keep.turn; st.ui.style.display = keep.ui; st.shooting = false;
    let sent = 0; try { for (const [n, d] of files) { const r = await fetch("http://127.0.0.1:8766/" + n, { method: "PUT", body: d }); if (r.ok) sent++; } } catch (e) { }
    if (!sent) { const zip = zipStore(files.map(([n, d]) => ["shading_mockup_shots/" + n, d])), a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([zip], { type: "application/zip" })); a.download = "shading_mockup_shots.zip"; document.body.appendChild(a); a.click(); a.remove(); }
    msg(`${files.length} SHOTS ${sent ? "SENT" : "SAVED (shading_mockup_shots.zip)"}`, 2200); st.lastShots = files.map(f => f[0]);
  }
  function zipStore(files) {                              // a plain zip (stored, no compression): PNGs are compressed already
    const T = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; }
    const crc = d => { let c = 0xffffffff; for (let i = 0; i < d.length; i++) c = T[(c ^ d[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
    const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
    for (const [name, d] of files) { const nb = enc.encode(name), c = crc(d), h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint32(14, c, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true); h.setUint16(26, nb.length, true);
      parts.push(new Uint8Array(h.buffer), nb, d); const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint32(16, c, true); ch.setUint32(20, d.length, true); ch.setUint32(24, d.length, true); ch.setUint16(28, nb.length, true); ch.setUint32(42, off, true);
      cen.push(new Uint8Array(ch.buffer), nb); off += 30 + nb.length + d.length; }
    const cs = cen.reduce((a, b) => a + b.length, 0), e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...cen, new Uint8Array(e.buffer)]);
  }

  // ── open / close ──
  function open(ctx) {
    X = ctx; THREE = ctx.THREE; if (st) close(true);
    let saved = {}; try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { }
    const G = X.gradeMat.uniforms; st = { t: 0, spin: 0, pairs: new Map(), hulls: [], preset: "current", light: saved.light || "midday", split: saved.split ?? true, splitX: .5, turn: !!saved.turn, showA: false,
      custom: saved.custom || PRESETS.softToon(), UC: unifs(), UE: unifs(), gradeKeep: { tint: G.tintC.value.clone(), tintAmt: G.tintAmt.value, warm: G.warm.value, dim: G.dim.value, ruin: G.ruin.value, bloom: G.bloom.value, bgOn: G.bgOn.value } };
    for (const U of [st.UC, st.UE]) { U.mkTint.value = new THREE.Color(); U.mkRimC.value = new THREE.Color(); }
    st.UH = { col: { value: new THREE.Color("#ffffff") }, th: { value: .01 }, k: { value: .5 } }; st.hull = hullMat(st.UH);
    st.env = buildEnv(); st.actors = buildGirls();
    st.cam = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, .1, 300); st.cam.position.set(.4, 2.0, 9.2); st.cam.lookAt(0, 1.15, 0);
    st.ui = buildUI(); addEventListener("keydown", onKey, true); addEventListener("keyup", onKeyUp, true);
    usePreset(saved.preset && (PRESETS[saved.preset] || saved.preset === "custom") ? saved.preset : "softToon"); setLights(st.light); uiState();
    return api;
  }
  function close(quiet) {
    if (!st) return; removeEventListener("keydown", onKey, true); removeEventListener("keyup", onKeyUp, true);
    const G = X.gradeMat.uniforms, K = st.gradeKeep; G.tintC.value.copy(K.tint); G.tintAmt.value = K.tintAmt; G.warm.value = K.warm; G.dim.value = K.dim; G.ruin.value = K.ruin; G.bloom.value = K.bloom; G.bgOn.value = K.bgOn;
    setMats(false); for (const [, P] of st.pairs) P.mock.dispose(); st.hull.dispose();
    for (const g of st.girls) { try { X.undressGear(g.r); X.KIT.dispose(g.r); } catch (e) { } }
    st.env.traverse(o => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
    if (st.ui) st.ui.remove(); st = null; if (!quiet && X.onClose) X.onClose();
  }
  const api = { open, close, frame, get state() { return st; } };
  return api;
})();
