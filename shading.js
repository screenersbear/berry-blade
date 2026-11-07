// Berry Blade — the shading step shared by the SHADING MOCKUP (shading-mockup.js) and the game itself (index.html), so a look tuned in the mockup is the
// look the game draws (the user, 2026-10-31: "can you make it where the mockup settings can be exported so they can actually be applied to the real game?").
// Nothing here changes anything unless a look is applied: the mockup's APPLY TO GAME (kept in this browser, berry.shading.v1), or SHIPPED below (a look
// picked to ship with the game: an exported settings file's "cfg", pasted in). The game patches its own MeshToonMaterials with it at load; null: its own look
window.BerryShading = (() => {
  const KEY = "berry.shading.v1";
  // the game's look, shipped (the user, 2026-10-31, "okay first let's do this lighting for the game" + their exported CUSTOM): the characters flatter (lighting
  // .31), a soft 3-step ramp, a light rim, a touch of top light, richer colour; the scenery a little calmer, its shadows toward blue-grey. SHIPPED_ID: a choice
  // made in a browser before this look shipped (an APPLY, NO SHADING) doesn't hide it; one made after it does
  const SHIPPED_ID = "20261106a", SHIPPED = {   // (a, 2026-11-06: the characters' texture finer and lighter, below. 20261105a: the painted texture added. c, 2026-10-31: the user's second CUSTOM, lighting influence .04 (was .31). Every browser takes it, as a new id)
    character: { lightingInfluence: .04, toonRamp: { enabled: true, steps: 3, softness: .15 }, shadowTint: { enabled: false, color: "#6A4C8C", strength: .5 },
      rimLight: { enabled: true, color: "#FFFFFF", width: 0, intensity: 0 },   // (as the user's file has it: on, at width 0 and intensity 0, so nothing: the shader skips a rim that has no width)
      edgeHighlight: { enabled: false, color: "#FFFFFF", thickness: .017, intensity: .5 },
      fakeAO: { enabled: false, strength: .4 }, topLight: { enabled: true, strength: .08 }, specular: { enabled: false, intensity: .19 }, saturation: 1.4,   // (1.31 until 2026-11-05: a bit more colour, below)
      texture: { enabled: true, strength: .15, late: true } },   // (.15 from .3, 2026-11-06, with the coat made fine: a fine grain at .3 speckled their skin like dirt. the 90s anime look's painted coat, without its filters and lines, a little lighter on them (.3; late shows it more): the user, 2026-11-05 "is it possibly to give similar texture to the main aesthetic of the game now, but not the tv-ish filters and lines of the anime style?")
    environment: { lightingInfluence: 1, toonRamp: { enabled: false, steps: 2, softness: .3 }, saturation: 1.05, contrast: .93, shadowTint: { enabled: true, color: "#3E5A6E", strength: .4 },
      texture: { enabled: true, strength: .55 } }   // (saturation .9 and contrast .87 until 2026-11-05: the user, asked if the game look should get a bit more of the 90s anime look's saturation: "Yes, try it". Its full amount (1.5 / 1.18 / 1.0 here) made the woods neon)
  };
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
      texture: { enabled: false, strength: .45, late: false },   // (here so a look can carry it through normalize; off unless the look turns it on)
      saturation: 1.0
    },
    environment: {
      lightingInfluence: 1.0,
      toonRamp: { enabled: false, steps: 2, softness: .3 },
      saturation: .9,
      contrast: .9,
      texture: { enabled: false, strength: .55 },
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
  if (SHIPPED) PRESETS.shipped = () => normalize(SHIPPED);   // (the look the game ships with, to compare and build on)
  const PRESET_UI = [["current", "ORIGINAL"], ...(SHIPPED ? [["shipped", "IN THE GAME"]] : []), ["softToon", "SOFT TOON"], ["kh", "KINGDOM HEARTS-ISH"], ["flat", "FLAT GRAPHIC"], ["custom", "CUSTOM"]];   // (current: the game unshaded, as it was before any look)
  const unifs = () => ({ mkOn: { value: 1 }, mkInfl: { value: 1 }, mkRampOn: { value: 0 }, mkSteps: { value: 3 }, mkSoft: { value: .15 }, mkTintOn: { value: 0 }, mkTint: { value: null }, mkTintStr: { value: .5 },
    mkRimOn: { value: 0 }, mkRimC: { value: null }, mkRimW: { value: .3 }, mkRimI: { value: .6 }, mkAOOn: { value: 0 }, mkAOStr: { value: .4 }, mkTopOn: { value: 0 }, mkTopStr: { value: .15 },
    mkSpecOn: { value: 0 }, mkSpecI: { value: 0 }, mkSat: { value: 1 }, mkCon: { value: 1 }, mkGround: { value: 0 }, mkTexOn: { value: 0 }, mkTexStr: { value: 0 }, mkTexObj: { value: 0 }, mkSpecSz: { value: .94 }, mkTexLate: { value: 0 } });
  const VERT = `varying vec3 vMkW; varying vec3 vMkN; varying vec3 vMkO;\n`, VERT_MAIN = `\n vMkW = (modelMatrix * vec4(transformed, 1.0)).xyz; vMkN = normalize(mat3(modelMatrix) * objectNormal); vMkO = transformed * vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));\n`;   // (vMkO: where on the part itself, at its size in the world: a texture on a character that goes along with it, not one it walks through)
  const FRAG = `uniform float mkOn, mkInfl, mkRampOn, mkSteps, mkSoft, mkTintOn, mkTintStr, mkRimOn, mkRimW, mkRimI, mkAOOn, mkAOStr, mkTopOn, mkTopStr, mkSpecOn, mkSpecI, mkSat, mkCon, mkGround, mkTexOn, mkTexStr, mkTexObj, mkSpecSz, mkTexLate;
uniform vec3 mkTint, mkRimC; varying vec3 vMkW; varying vec3 vMkN; varying vec3 vMkO;
float mkHash(vec3 p) { p = fract(p * .3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float mkNoise(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(mkHash(i), mkHash(i + vec3(1.0, 0.0, 0.0)), f.x), mix(mkHash(i + vec3(0.0, 1.0, 0.0)), mkHash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(mkHash(i + vec3(0.0, 0.0, 1.0)), mkHash(i + vec3(1.0, 0.0, 1.0)), f.x), mix(mkHash(i + vec3(0.0, 1.0, 1.0)), mkHash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z); }
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
    vec3 c = mix(mkFlat, mkLit, mkInfl); float mkTm = 1.0; vec3 mkTs = vec3(0.0);
    if (mkTexOn > .5) { vec3 q = mkTexObj > .5 ? vMkO : vMkW, d = vec3(dot(q.xy, vec2(.8, .6)), dot(q.xy, vec2(-.6, .8)), q.z);   // (a painted surface, not a plastic one: blotches of a thicker and thinner coat, brush strokes on a slant, a fine grain; a little more in the shade. Only with a look that asks for it, DEBUG > SHADER's 90S ANIME)
      if (mkTexLate > .5) { float m = mkNoise(q * 16.0) * .5 + mkNoise(q * 34.0 + 7.0) * .5, b = mkNoise(vec3(d.x * 8.0, d.y * 40.0, d.z * 40.0) + 3.0), g = mkNoise(q * 30.0 + 11.0);   // (the characters' coat, fine: a mottle a few pixels across, not blotches (they were 1.3 and 3.1 a unit, two or three across a girl, and grew with her: the user, 2026-11-06 "the texture effect on a bigger screen looks more like dirt on the characters and kind of dark"), strokes half the size, and no more of it in the shade
        float t = (m - .5) * .6 + (b - .5) * .6 + (g - .5) * .5; mkTm = 1.0 + t * mkTexStr; mkTs = (m - .5) * mkTexStr * vec3(.04, .012, -.03); }
      else { float m = mkNoise(q * 1.3) * .6 + mkNoise(q * 3.1 + 7.0) * .4, b = mkNoise(vec3(d.x * 2.4, d.y * 11.0, d.z * 11.0) + 3.0), g = mkNoise(q * 24.0 + 11.0);   // (the scenery's, as it was)
        float t = (m - .5) * .9 + (b - .5) * .55 + (g - .5) * .4; mkTm = 1.0 + t * mkTexStr * mix(1.0, 1.35, 1.0 - mkR); mkTs = (m - .5) * mkTexStr * vec3(.05, .015, -.04);
        c = c * mkTm + mkTs; mkTm = 1.0; mkTs = vec3(0.0); } }
    if (mkAOOn > .5) { float ao = clamp(-mkNW.y, 0.0, 1.0) * .65 + (1.0 - smoothstep(0.0, .7, vMkW.y - mkGround)) * .45; c *= 1.0 - mkAOStr * clamp(ao, 0.0, 1.0); }   // (creases face down; low down near the ground)
    if (mkTopOn > .5) c += mkAlb * mkTopStr * max(mkNW.y, 0.0);
    if (mkRimOn > .5 && mkRimW > .001 && mkRimI > .001) { float f = 1.0 - max(dot(mkN, mkV), 0.0); c += mkRimC * smoothstep(1.0 - mkRimW, 1.0, f) * mkRimI; }   // (no width: no rim; smoothstep(1, 1, f) is undefined)
    if (mkSpecOn > .5) { vec3 h = normalize(mkL + mkV); c += mkSun * smoothstep(mkSpecSz, mkSpecSz + (1.0 - mkSpecSz) * .42, dot(mkN, h)) * mkSpecI * .35; }   // (mkSpecSz: how near the light's mirror angle it shows, .94 as it always was; nearer 1, a smaller spot)
    float lu = dot(c, vec3(.299, .587, .114)); c = mix(vec3(lu), c, mkSat); c = (c - .22) * mkCon + .22;
    if (mkTexLate > .5) { vec3 cs = pow(min(max(c, 0.0), vec3(1.0)), vec3(1.0 / 2.2)); float v = max(cs.r, max(cs.g, cs.b)); c = pow(min(max(cs + (mkTm - 1.0) * v, 0.0), vec3(1.0)), vec3(2.2)) + mkTs; }   // (2026-11-06: the coat as a step of lightness to the eye, the same on every channel (scaled by the brightest): the old multiply clipped the light spots off a colour at full (Camila's red), so only the dark ones showed and the girls came out darker. A grey takes it as before. (late: on the colour as it shows, after the saturation; the game's characters are saturated past full (red .84 at 1.31), which flattened the coat on Camila's reds. 2.2: an even step to the eye, not in light)
    outgoingLight = mkOn > .5 ? max(c, 0.0) : mkBase; }
`;
  function patchShader(sh, U) {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = VERT + sh.vertexShader.replace("#include <project_vertex>", "#include <project_vertex>" + VERT_MAIN);
    const tail = sh.fragmentShader.includes("#include <opaque_fragment>") ? "#include <opaque_fragment>" : "#include <output_fragment>";
    sh.fragmentShader = FRAG + sh.fragmentShader.replace(tail, FRAG_MAIN + tail);
  }
  function setChar(a, C) {                               // a look's character settings into a uniform set
    a.mkOn.value = 1; a.mkInfl.value = C.lightingInfluence; a.mkRampOn.value = C.toonRamp.enabled ? 1 : 0; a.mkSteps.value = C.toonRamp.steps; a.mkSoft.value = C.toonRamp.softness;
    a.mkTintOn.value = C.shadowTint.enabled ? 1 : 0; a.mkTint.value.set(C.shadowTint.color); a.mkTintStr.value = C.shadowTint.strength;
    a.mkRimOn.value = C.rimLight.enabled ? 1 : 0; a.mkRimC.value.set(C.rimLight.color); a.mkRimW.value = C.rimLight.width; a.mkRimI.value = C.rimLight.intensity;
    a.mkAOOn.value = C.fakeAO.enabled ? 1 : 0; a.mkAOStr.value = C.fakeAO.strength; a.mkTopOn.value = C.topLight.enabled ? 1 : 0; a.mkTopStr.value = C.topLight.strength;
    a.mkSpecOn.value = C.specular.enabled ? 1 : 0; a.mkSpecI.value = C.specular.intensity; a.mkSpecSz.value = C.specular.size || .94; a.mkSat.value = C.saturation; a.mkCon.value = 1;
    a.mkTexOn.value = C.texture && C.texture.enabled ? 1 : 0; a.mkTexStr.value = C.texture ? C.texture.strength || 0 : 0; a.mkTexObj.value = 1; a.mkTexLate.value = C.texture && C.texture.late ? 1 : 0;   // (texture: only a look that has it, the game's own and the 90s anime one; on a character, it moves with it)
  }
  function setEnv(b, E) {                                // and its environment settings (no rim, AO, top light or specular on the scenery)
    b.mkOn.value = 1; b.mkInfl.value = E.lightingInfluence; b.mkRampOn.value = E.toonRamp.enabled ? 1 : 0; b.mkSteps.value = E.toonRamp.steps; b.mkSoft.value = E.toonRamp.softness;
    b.mkTintOn.value = E.shadowTint.enabled ? 1 : 0; b.mkTint.value.set(E.shadowTint.color); b.mkTintStr.value = E.shadowTint.strength; b.mkSat.value = E.saturation; b.mkCon.value = E.contrast;
    b.mkRimOn.value = 0; b.mkAOOn.value = 0; b.mkTopOn.value = 0; b.mkSpecOn.value = 0;
    b.mkTexOn.value = E.texture && E.texture.enabled ? 1 : 0; b.mkTexStr.value = E.texture ? E.texture.strength || 0 : 0; b.mkTexObj.value = 0; b.mkTexLate.value = 0;
  }
  function newUnifs(THREE) { const U = unifs(); U.mkTint.value = new THREE.Color(); U.mkRimC.value = new THREE.Color(); return U; }
  function hullMat(THREE) {                              // the light edge (inverted hull): the mesh pushed out along its normals, its back faces in the highlight colour.
    const th = { value: .01 }, m = new THREE.MeshBasicMaterial({ color: "#ffffff", side: THREE.BackSide, fog: false });   // (a MeshBasic, not a shader of its own: the
    m.onBeforeCompile = sh => { sh.uniforms.mkTh = th; sh.vertexShader = "uniform float mkTh;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n transformed += normal * mkTh;"); };   // game's walks
    m.customProgramCacheKey = () => "mkHull"; m.userData.mkHull = true; return { mat: m, th };   // over meshes setting colours and the like)
  }
  function setHull(H, C) { const E = C.edgeHighlight; H.mat.color.set(E.color).multiplyScalar(E.intensity); H.th.value = E.thickness; return !!E.enabled; }
  function normalize(cfg) {                               // any settings (an imported file, an older save) laid over the defaults: every key there, nothing extra
    const out = clone(DEF), lay = (a, b) => { for (const k in a) { if (!b || !(k in b)) continue; if (a[k] && typeof a[k] === "object") lay(a[k], b[k]); else if (typeof b[k] === typeof a[k]) a[k] = b[k]; } };
    lay(out, cfg); return out;
  }
  function active() {                                    // the look the game draws now: applied in this browser, or shipped, or null (the game's own)
    try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && (!SHIPPED || s.ship === SHIPPED_ID)) return s.on && s.cfg ? { name: s.name || "custom", at: s.at, cfg: normalize(s.cfg) } : null; } catch (e) { }
    return SHIPPED ? { name: "shipped", cfg: normalize(SHIPPED) } : null;
  }
  function apply(name, cfg) { try { localStorage.setItem(KEY, JSON.stringify({ on: true, ship: SHIPPED_ID, name, at: new Date().toISOString(), cfg })); return true; } catch (e) { return false; } }
  function useOwn() { try { localStorage.setItem(KEY, JSON.stringify({ on: false, ship: SHIPPED_ID })); return true; } catch (e) { return false; } }   // (no shading at all, even over a shipped look)
  function useShipped() { try { localStorage.removeItem(KEY); return true; } catch (e) { return false; } }   // (this browser's choice let go of: the game's shipped look, or none)
  const exportJSON = (name, cfg) => JSON.stringify({ berryShading: 1, name, cfg }, null, 2);
  function importJSON(text) { const j = JSON.parse(text); const cfg = j && (j.cfg || (j.character && j.environment ? j : null)); if (!cfg) throw new Error("not a Berry Blade shading file"); return { name: j.name || "imported", cfg: normalize(cfg) }; }
  return { KEY, SHIPPED, useShipped, DEF, PRESETS, PRESET_UI, clone, newUnifs, patchShader, setChar, setEnv, hullMat, setHull, normalize, active, apply, useOwn, exportJSON, importJSON };
})();
