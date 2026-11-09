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
    mkSpecOn: { value: 0 }, mkSpecI: { value: 0 }, mkSat: { value: 1 }, mkCon: { value: 1 }, mkGround: { value: 0 }, mkTexOn: { value: 0 }, mkTexStr: { value: 0 }, mkTexObj: { value: 0 }, mkSpecSz: { value: .94 }, mkTexLate: { value: 0 },
    mkClay: { value: 0 }, mkClayF: { value: 3 }, mkClayB: { value: 1 }, mkClayD: { value: 0 },
    mkClayK: { value: 1 }, mkClayFl: { value: 1 }, mkClayW: { value: .3 }, mkClayS: { value: 0 }, mkClayG: { value: 1 }, mkClayFog: { value: 1 }, mkClayBo: { value: 0 },   // (clay's light: the key (the sun), the fill (the sky), how far the key wraps round, the sheen, the grain, how much of the fog)
    mkShOn: { value: 0 }, mkShT: { value: null }, mkShM: { value: null }, mkShR: { value: .001 }, mkShB: { value: .0005 },   // (clay's shadows: the characters' depth seen from the sun, set each frame by the game (clayPre))
    mkAoOn: { value: 0 }, mkAoT: { value: null }, mkAoPx: { value: null }, mkAoN: { value: .1 }, mkAoF: { value: 300 }, mkAoFoc: { value: 1000 }, mkAoR: { value: .14 }, mkAoI: { value: 1.2 } });   // (and its creases: the characters' depth from the camera)
  // CLAY (pause > DEBUG > CLAY LOOK, the user 2026-11-08: "yes let's do the clay debug shader to see", after the clay mockup in mockups/clay): everything pressed out of
  // modelling clay. The surface: dents, smears, grain and pokes bent into the normal (a bump with no texture: the height's change across the pixel); the light soft, with
  // no toon steps, the dents a touch darker, a soft sheen; and the shapes a little lumpy. The lumps move space itself (the same point, the same push), not along each
  // face's normal, so the scenery's faceted meshes don't split at their edges. A character's clay is its own (object space: it goes along with her), the scenery's the world's
  const VERT_CLAY = `
 if (mkClay > .5 && mkClayD > 0.0) { vec3 cs = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz)), cw = (mkTexObj > .5 ? transformed * cs : (modelMatrix * vec4(transformed, 1.0)).xyz) * mkClayF * .45;
   vec3 co = (vec3(mkVN(cw), mkVN(cw + 17.3), mkVN(cw + 41.7)) * 2.0 - 1.0) * mkClayD; transformed += mkTexObj > .5 ? co / max(cs, vec3(1e-4)) : inverse(mat3(modelMatrix)) * co; }
`;
  const VERT = `varying vec3 vMkW; varying vec3 vMkN; varying vec3 vMkO; uniform float mkClay, mkClayF, mkClayD, mkTexObj;
float mkVH(vec3 p) { p = fract(p * .3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float mkVN(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(mkVH(i), mkVH(i + vec3(1.0, 0.0, 0.0)), f.x), mix(mkVH(i + vec3(0.0, 1.0, 0.0)), mkVH(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(mkVH(i + vec3(0.0, 0.0, 1.0)), mkVH(i + vec3(1.0, 0.0, 1.0)), f.x), mix(mkVH(i + vec3(0.0, 1.0, 1.0)), mkVH(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z); }
`, VERT_MAIN = `\n vMkW = (modelMatrix * vec4(transformed, 1.0)).xyz; vMkN = normalize(mat3(modelMatrix) * objectNormal); vMkO = transformed * vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));\n`;   // (vMkO: where on the part itself, at its size in the world: a texture on a character that goes along with it, not one it walks through)
  const FRAG = `uniform float mkOn, mkInfl, mkRampOn, mkSteps, mkSoft, mkTintOn, mkTintStr, mkRimOn, mkRimW, mkRimI, mkAOOn, mkAOStr, mkTopOn, mkTopStr, mkSpecOn, mkSpecI, mkSat, mkCon, mkGround, mkTexOn, mkTexStr, mkTexObj, mkSpecSz, mkTexLate;
uniform vec3 mkTint, mkRimC; varying vec3 vMkW; varying vec3 vMkN; varying vec3 vMkO;
float mkHash(vec3 p) { p = fract(p * .3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float mkNoise(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(mkHash(i), mkHash(i + vec3(1.0, 0.0, 0.0)), f.x), mix(mkHash(i + vec3(0.0, 1.0, 0.0)), mkHash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(mkHash(i + vec3(0.0, 0.0, 1.0)), mkHash(i + vec3(1.0, 0.0, 1.0)), f.x), mix(mkHash(i + vec3(0.0, 1.0, 1.0)), mkHash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z); }
float mkRamp(float x) { float s = max(mkSteps, 1.0), y = x * s, f = floor(y), w = max(mkSoft, .001) * .5; return clamp((f + smoothstep(.5 - w, .5 + w, y - f)) / s, 0.0, 1.0); }
uniform float mkClayBo; uniform float mkClay, mkClayF, mkClayB, mkClayK, mkClayFl, mkClayW, mkClayS, mkClayG, mkClayFog, mkShOn, mkShR, mkShB, mkAoOn, mkAoN, mkAoF, mkAoFoc, mkAoR, mkAoI;
uniform sampler2D mkShT, mkAoT; uniform mat4 mkShM; uniform vec2 mkAoPx;
float mkShadow(vec3 w) { vec3 q = (mkShM * vec4(w, 1.0)).xyz * .5 + .5; if (q.x <= 0.0 || q.x >= 1.0 || q.y <= 0.0 || q.y >= 1.0 || q.z >= 1.0) return 1.0;   // CLAY's shadows: 16 looks round a soft disc in the sun's depth of the characters
  float e = 0.0; for (int i = 0; i < 4; i++) { float a = float(i) * 1.5708 + .785; e += step(q.z - mkShB, texture2D(mkShT, q.xy + vec2(cos(a), sin(a)) * mkShR).r); }   // (four round the edge first: all lit or all dark, done; most of the screen is)
  if (e < .5 || e > 3.5) return e * .25;
  float s = 0.0; for (int i = 0; i < 16; i++) { float r = sqrt((float(i) + .5) / 16.0), a = float(i) * 2.39996; s += step(q.z - mkShB, texture2D(mkShT, q.xy + vec2(cos(a), sin(a)) * r * mkShR).r); }
  return s / 16.0; }
float mkLinZ(float d) { return mkAoN * mkAoF / (mkAoF - d * (mkAoF - mkAoN)); }
float mkCrease(float z) { vec2 uv = gl_FragCoord.xy * mkAoPx, dz = clamp(vec2(dFdx(z), dFdy(z)), -.04, .04); float rp = clamp(mkAoR * mkAoFoc / z, 2.0, 48.0), o = 0.0;   // CLAY's creases: round this pixel, how much of the characters stands nearer than its own surface would (the slope taken out)
  for (int i = 0; i < 8; i++) { float a = float(i) * .785398 + .39; vec2 d = vec2(cos(a), sin(a)) * rp * (mod(float(i), 2.0) < .5 ? 1.0 : .5); float e = z + dot(dz, d) - mkLinZ(texture2D(mkAoT, uv + d * mkAoPx).r);
    o += smoothstep(.012, .07, e) * (1.0 - smoothstep(mkAoR * 2.5, mkAoR * 5.0, e)); }
  return 1.0 - mkAoI * o / 8.0; }
float mkClayH(vec3 q) { float h = (mkNoise(q * 1.1) - .5) * 1.1 + (mkNoise(q * 2.3 + 5.0) - .5) * .55;   // (broad dents and thumb smears)
  h += (mkNoise(vec3(q.x * .9, q.y * 5.0, q.z * .9) + 20.0) - .5) * .25 * mkClayG;   // (drag streaks)
  h += ((mkNoise(q * 7.0) - .5) * .14 + (mkNoise(q * 17.0) - .5) * .06) * mkClayG;   // (grain)
  return h - smoothstep(.72, .92, mkNoise(q * 3.6 + 40.0)) * .3; }   // (little pokes)
vec3 mkClayBend(vec3 sp, vec3 sn, vec2 dH, float fd) { vec3 sx = dFdx(sp), sy = dFdy(sp), r1 = cross(sy, sn), r2 = cross(sn, sx); float det = dot(sx, r1) * fd; return normalize(abs(det) * sn - sign(det) * (dH.x * r1 + dH.y * r2)); }
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
    if (mkClay > .5) { float ch = mkClayH((mkTexObj > .5 ? vMkO : vMkW) * mkClayF);   // CLAY: the bent normal; one warm key light (the sun) that wraps a little round, its shadows; the sky's fill; the creases and dents darker; a soft sheen
      mkN = mkClayBend(-vViewPosition, mkN, vec2(dFdx(ch), dFdy(ch)) * mkClayB * .02, faceDirection);
      float sh = mkShOn > .5 ? mkShadow(vMkW + mkNW * .04) : 1.0, ao = mkAoOn > .5 && mkTexObj > .5 ? mkCrease(vViewPosition.z) : 1.0;
      if (mkTexObj > .5) sh = mix(.45, 1.0, sh);   // (a character's own shadows, half: her hair kept the whole of her face dark)
      float cl = clamp((dot(mkN, mkL) + mkClayW) / (1.0 + mkClayW), 0.0, 1.0); cl = cl * cl * (3.0 - 2.0 * cl) * sh; vec3 chm = mkHemi;
      #if NUM_HEMI_LIGHTS > 0
        { float hk = dot(mkN, hemisphereLights[0].direction) * .5 + .5; chm = mix(mix(hemisphereLights[0].groundColor, hemisphereLights[0].skyColor * vec3(1.0, .93, .8), mkClayBo), hemisphereLights[0].skyColor, hk); }   // (the ground's light warm and bright, a sunny floor's bounce, not the game's dark green: the mockup's undersides glow)
      #endif
      float cf = mkTexObj > .5 ? max(dot(mkN, vec3(.33, .19, .92)), 0.0) * .22 : 0.0;   // (and on the characters a soft front light from beside the camera, as the mockup's, so faces read)
      mkR = cl; mkLit = mkAlb * (mkSun * (cl * mkClayK * mix(1.0, ao, .6) + cf * ao) + chm * mkClayFl * ao) * RECIPROCAL_PI * (1.0 - clamp(-ch * .5, 0.0, .3)) + totalEmissiveRadiance;
      mkLit += mkSun * pow(max(dot(mkN, normalize(mkL + mkV)), 0.0), 10.0) * mkClayS * sh * (.4 + .6 * mkAlb) + chm * mkAlb * pow(1.0 - max(dot(mkN, mkV), 0.0), 3.0) * .06 * ao; }
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
  const FOG_CLAY = `#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
  #else
    float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
  #endif
  if (mkClay > .5) fogFactor *= mkClayFog;   // (clay: less haze, as the mockup's clear air)
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
#endif`;
  function patchShader(sh, U) {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = VERT + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>" + VERT_CLAY).replace("#include <project_vertex>", "#include <project_vertex>" + VERT_MAIN);
    const tail = sh.fragmentShader.includes("#include <opaque_fragment>") ? "#include <opaque_fragment>" : "#include <output_fragment>";
    sh.fragmentShader = FRAG + sh.fragmentShader.replace(tail, FRAG_MAIN + tail).replace("#include <fog_fragment>", FOG_CLAY);
  }
  function setChar(a, C) {                               // a look's character settings into a uniform set
    a.mkOn.value = 1; a.mkInfl.value = C.lightingInfluence; a.mkRampOn.value = C.toonRamp.enabled ? 1 : 0; a.mkSteps.value = C.toonRamp.steps; a.mkSoft.value = C.toonRamp.softness;
    a.mkTintOn.value = C.shadowTint.enabled ? 1 : 0; a.mkTint.value.set(C.shadowTint.color); a.mkTintStr.value = C.shadowTint.strength;
    a.mkRimOn.value = C.rimLight.enabled ? 1 : 0; a.mkRimC.value.set(C.rimLight.color); a.mkRimW.value = C.rimLight.width; a.mkRimI.value = C.rimLight.intensity;
    a.mkAOOn.value = C.fakeAO.enabled ? 1 : 0; a.mkAOStr.value = C.fakeAO.strength; a.mkTopOn.value = C.topLight.enabled ? 1 : 0; a.mkTopStr.value = C.topLight.strength;
    a.mkSpecOn.value = C.specular.enabled ? 1 : 0; a.mkSpecI.value = C.specular.intensity; a.mkSpecSz.value = C.specular.size || .94; a.mkSat.value = C.saturation; a.mkCon.value = 1;
    a.mkTexOn.value = C.texture && C.texture.enabled ? 1 : 0; a.mkTexStr.value = C.texture ? C.texture.strength || 0 : 0; a.mkTexObj.value = 1; a.mkTexLate.value = C.texture && C.texture.late ? 1 : 0;   // (texture: only a look that has it, the game's own and the 90s anime one; on a character, it moves with it)
    clayOver(a, CLAY.char);
  }
  // CLAY's settings, over a look's (off: the look as it is). The painted coat and the glossy spot go (the clay is the texture); the characters, nearly flat in the
  // game's look (lighting .04), take the light, or the clay wouldn't show on them
  // (2026-11-08, later: the light part too, the user "Yes, build it": the game's characters looked like felt, flat colour with bumps in an even light. Now one warm key
  // light with shadows (the characters' own, onto everything), the creases between their parts darker, a broad soft sheen, bigger gentler dents, less fog and colour)
  const CLAY = { char: { f: 1.6, b: 3.2, d: .022, g: .45, sat: 1.12, k: 1, fl: 1.15, w: .25, s: .12, bo: .6 }, env: { f: 1.0, b: 5, d: .07, g: .8, sat: 1.08, k: 1, fl: 1.3, w: .3, s: .05, bo: .45 }, fog: .45 };   // (f: dents a unit (a girl is 2.75 units); b: how deep (1-2 barely showed in the game: its light is mostly sky fill); d: the lumps, in units; sat: at least this much colour)
  let clayOn = false;
  function clayOver(a, K) { a.mkClay.value = clayOn ? 1 : 0; if (!clayOn) return;
    a.mkClayF.value = K.f; a.mkClayB.value = K.b; a.mkClayD.value = K.d; a.mkClayG.value = K.g; a.mkClayK.value = K.k; a.mkClayFl.value = K.fl; a.mkClayW.value = K.w; a.mkClayS.value = K.s; a.mkClayBo.value = K.bo || 0; a.mkClayFog.value = CLAY.fog;
    a.mkInfl.value = 1; a.mkSat.value = K.sat; a.mkCon.value = 1; a.mkTexOn.value = 0; a.mkSpecOn.value = 0; a.mkRampOn.value = 0; a.mkRimOn.value = 0; a.mkTintOn.value = 0; a.mkTopOn.value = 0; }
  const setClay = on => { clayOn = !!on; };
  function setEnv(b, E) {                                // and its environment settings (no rim, AO, top light or specular on the scenery)
    b.mkOn.value = 1; b.mkInfl.value = E.lightingInfluence; b.mkRampOn.value = E.toonRamp.enabled ? 1 : 0; b.mkSteps.value = E.toonRamp.steps; b.mkSoft.value = E.toonRamp.softness;
    b.mkTintOn.value = E.shadowTint.enabled ? 1 : 0; b.mkTint.value.set(E.shadowTint.color); b.mkTintStr.value = E.shadowTint.strength; b.mkSat.value = E.saturation; b.mkCon.value = E.contrast;
    b.mkRimOn.value = 0; b.mkAOOn.value = 0; b.mkTopOn.value = 0; b.mkSpecOn.value = 0;
    b.mkTexOn.value = E.texture && E.texture.enabled ? 1 : 0; b.mkTexStr.value = E.texture ? E.texture.strength || 0 : 0; b.mkTexObj.value = 0; b.mkTexLate.value = 0;
    clayOver(b, CLAY.env);
  }
  function newUnifs(THREE) { const U = unifs(); U.mkTint.value = new THREE.Color(); U.mkRimC.value = new THREE.Color(); U.mkShM.value = new THREE.Matrix4(); U.mkAoPx.value = new THREE.Vector2(1, 1); return U; }
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
  return { KEY, SHIPPED, useShipped, DEF, PRESETS, PRESET_UI, clone, newUnifs, patchShader, setChar, setEnv, hullMat, setHull, normalize, active, apply, useOwn, exportJSON, importJSON, setClay, CLAY };
})();
