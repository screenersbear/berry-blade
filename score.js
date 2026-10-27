// Berry Blade score: every world's tune is written for this game and played live by the game through WebAudio, so each hour of the day
// is genuinely performed slower and softer instead of a recording being stretched, and at night turns darker (see DARK).
// First song (Berry Woods): ORIGINAL (2026-10-17, replacing an arrangement of a borrowed tune). A walking tune in G major, 100 bpm,
// 16 bars: a skipping little figure up to the G and back down the path, an A-major turn (C-sharp) before the dominant, then an E-minor
// B section of longer, wondering notes. At night it goes to G minor: B, E and C-sharp flatten, and the chords darken with them.
// Second song (Cuss' Waves): ORIGINAL (2026-10-17, replacing an arrangement of a borrowed tune). A sea tune in A minor on the 3+3+2 roll
// of the surf, 84 bpm, 16 bars: phrases that swell up a sixth and break back down in a spray of quick notes, a Dorian B over D minor,
// and a B section that climbs through F and G to a high D and hangs on E for the turn home. At night B and F-sharp flatten (Phrygian).
// Third song (Volt Keep, Van Van's factory): ORIGINAL, written for this game (a smug, electric villain march, D minor, 112 bpm,
// 16 bars: A · B). Every hour is played live, midday included.
window.BerryScore = (() => {
  let gloom = false;                             // (the uprising at 75%: see setGloom)
  // the woods' song (original): melody, one chord per half bar
  const MEL = [[0,3,74],[3,1,76],[4,4,79],[8,2,78],[10,2,76],[12,4,74],[16,3,72],[19,1,74],[20,4,76],[24,2,79],[26,2,76],[28,4,72],
    [32,2,71],[34,2,74],[36,2,79],[38,2,83],[40,6,81],[46,2,79],[48,4,78],[52,2,76],[54,2,74],[56,8,69],
    [64,3,76],[67,1,78],[68,4,79],[72,2,81],[74,2,79],[76,4,76],[80,4,84],[84,2,83],[86,2,81],[88,4,79],[92,4,76],
    [96,2,73],[98,2,76],[100,4,81],[104,2,79],[106,2,78],[108,4,76],[112,8,78],[120,2,76],[122,2,74],[124,4,71],
    [128,6,79],[134,2,78],[136,4,76],[140,4,71],[144,6,76],[150,2,74],[152,4,72],[156,4,67],
    [160,4,69],[164,2,72],[166,2,76],[168,6,81],[174,2,79],[176,4,78],[180,4,81],[184,8,74],
    [192,2,71],[194,2,76],[196,4,79],[200,6,83],[206,2,81],[208,4,79],[212,4,76],[216,6,84],[222,2,83],
    [224,4,81],[228,4,72],[232,4,78],[236,2,76],[238,2,78],[240,12,79],[252,2,71],[254,2,72]];
  const CH = ["G","G","C","C","G","G","D","D","Em","Em","C","C","A","A","D","D",
    "Em","Em","C","C","Am","Am","D","D","Em","Em","C","C","Am","D","G","G"];
  const BAR = 16, LEVEL = .66;
  const VOICE = { G: [50, 55, 59, 62], C: [52, 55, 60, 64], D: [50, 54, 57, 62], Em: [52, 55, 59, 64], Am: [52, 57, 60, 64], A: [52, 57, 61, 64], Gm: [50, 55, 58, 62], Cm: [51, 55, 60, 63], Eb: [51, 55, 58, 63], Am7b5: [51, 55, 57, 60] };
  const ROOT = { G: 43, C: 36, D: 38, Em: 40, Am: 45, A: 45, Gm: 43, Cm: 36, Eb: 39, Am7b5: 45 };
  // night goes darker without changing the tune: a whole step lower and into G minor (B, E and C-sharp flatten: darkLead), the chords
  // darkening with them
  const DARK = { G: "Gm", C: "Cm", Em: "Eb", Am: "Am7b5", A: "Am7b5" };
  // how the band plays each hour (index = clearing, midday → night): lead sound, which layers, drum kit, reverb, overall level
  const STYLES = [
    { lead: "bright", pad: .014, bass: "groove", drums: "full", arp: .03, verb: .12, gain: 1 },          // midday: off down the path
    { lead: "bright", pad: .014, bass: "groove", drums: "full", arp: .015, verb: .14, gain: 1 },
    { lead: "soft", pad: .015, bass: "groove", drums: "light", arp: 0, verb: .17, gain: .96 },
    { lead: "warm", pad: .016, bass: "groove", drums: "brush", arp: 0, verb: .21, gain: .9 },            // golden hour
    { lead: "keys", pad: .016, bass: "walk", drums: "rim", arp: 0, verb: .26, gain: .84 },
    { lead: "keys", pad: .018, bass: "long", drums: null, arp: 0, verb: .32, gain: .74 },
    { lead: "bell", pad: .018, bass: "long", drums: null, arp: 0, verb: .4, gain: .64, dark: true, key: -2, drone: true },   // night: Glos's hour
    { lead: "bright", pad: .014, bass: "groove", drums: "light", arp: .02, verb: .15, gain: .98 },      // (the in-between slot: no recording to ease out of any more)
    { serene: true, lead: "lull", pad: .02, softPad: true, bass: "long", drums: null, arp: .014, harp: true, verb: .5, gain: .66 },   // SERENE (8): the beps' hideout, the same tune, kinder
  ];
  const EASE = 7, SERENE = 8;
  // the waves' song (original): melody on the 3+3+2 roll, a chord per half bar, and how each hour plays it
  const MEL2 = [[0,3,69],[3,3,76],[6,2,74],[8,8,76],[16,3,72],[19,3,77],[22,2,76],[24,4,74],[28,2,72],[30,2,71],
    [32,3,71],[35,3,74],[38,2,79],[40,4,83],[44,2,81],[46,2,79],[48,8,81],[56,2,79],[58,2,76],[60,2,74],[62,2,71],
    [64,3,72],[67,3,79],[70,2,77],[72,8,76],[80,3,77],[83,3,81],[86,2,79],[88,4,77],[92,2,76],[94,2,74],
    [96,3,74],[99,3,77],[102,2,81],[104,4,84],[108,2,83],[110,2,81],[112,6,80],[118,2,81],[120,4,83],[124,2,80],[126,2,76],
    [128,8,81],[136,2,84],[138,2,81],[140,4,77],[144,8,83],[152,2,86],[154,2,83],[156,4,79],
    [160,6,79],[166,2,78],[168,4,76],[172,4,71],[176,3,72],[179,3,76],[182,2,81],[184,8,84],
    [192,3,86],[195,3,84],[198,2,81],[200,4,77],[204,4,74],[208,3,79],[211,3,83],[214,2,86],[216,4,84],[220,4,83],
    [224,8,80],[232,2,81],[234,2,80],[236,4,76],[240,8,71],[248,4,74],[252,2,72],[254,2,71]];
  const CH2 = ["Am","Am","F","F","G","G","Am","Am","Am","Am","F","F","Dm","Dm","E","E",
    "F","F","G","G","Em","Em","Am","Am","Dm","Dm","G","G","E","E","E","E"];
  const VOICE2 = { Am: [52, 57, 60, 64], F: [53, 57, 60, 65], G: [50, 55, 59, 62], Dm: [50, 53, 57, 62], E: [52, 56, 59, 64], Em: [52, 55, 59, 64], Gm: [50, 55, 58, 62], Edim: [52, 55, 58, 64], E7b5: [52, 56, 58, 62] };
  const ROOT2 = { Am: 45, F: 41, G: 43, Dm: 38, E: 40, Em: 40, Gm: 43, Edim: 40, E7b5: 40 };
  const STYLES2 = [
    { lead: "bright", pad: .012, bass: "tres", drums: "tres", arp: .025, verb: .16, gain: 1 },           // midday: the surf at full roar
    { lead: "bright", pad: .014, bass: "tres", drums: "tres", arp: .02, verb: .16, gain: .95 },
    { lead: "soft", pad: .015, bass: "tres", drums: "tres", arp: 0, verb: .2, gain: .92 },
    { lead: "warm", pad: .016, bass: "tres", drums: "tresBrush", arp: 0, verb: .24, gain: .88 },
    { lead: "keys", pad: .016, bass: "long", drums: "rim", arp: 0, verb: .28, gain: .82 },
    { lead: "keys", pad: .018, bass: "long", drums: null, arp: 0, verb: .34, gain: .74 },
    { lead: "bell", pad: .018, bass: "long", drums: null, arp: 0, verb: .42, gain: .64, dark: true, key: -2, drone: true },   // night: Cuss's hour
    { lead: "bright", pad: .014, bass: "tres", drums: "tresBrush", arp: .015, verb: .16, gain: .95 },   // (the in-between slot: no recording to ease out of any more)
    { serene: true, lead: "lull", pad: .02, softPad: true, bass: "long", drums: null, arp: .014, harp: true, verb: .5, gain: .66 },   // SERENE (8): the beps' hideout, the same tune, kinder
  ];
  // Volt Keep's song (original): a strutting little motif that sneers down a half step (E, E-flat, D), a grander B section for his
  // big entrance, buzzy robot lead, pumping octave bass, machine drums with a metal clank; at night it drops to a music box like the rest
  const MEL3 = [[0,2,74],[3,1,69],[4,2,74],[6,2,77],[8,1,76],[9,1,75],[10,4,74],[16,3,79],[19,1,77],[20,2,75],[22,2,74],[24,2,73],[26,6,74],
    [32,2,74],[35,1,69],[36,2,74],[38,2,77],[40,2,81],[42,1,79],[43,1,77],[44,4,76],[48,2,77],[50,2,74],[52,4,70],[56,2,69],[58,2,73],[60,2,76],[62,2,79],
    [64,2,81],[67,1,77],[68,2,81],[70,2,82],[72,1,81],[73,1,80],[74,2,79],[76,4,77],[80,2,79],[82,2,82],[84,1,79],[85,1,75],[86,2,79],[88,2,77],[90,1,76],[91,1,77],[92,4,74],
    [96,2,70],[98,2,74],[100,2,79],[102,2,77],[104,2,76],[106,2,73],[108,2,69],[110,2,76],[112,6,74],[120,1,69],[122,1,74],[124,1,77],[126,2,81],
    [128,6,82],[134,2,81],[136,4,79],[140,4,74],[144,6,77],[150,2,76],[152,4,74],[156,4,69],[160,2,74],[162,2,77],[164,4,82],[168,2,81],[170,2,82],[172,4,84],
    [176,8,81],[184,2,79],[186,2,76],[188,4,73],[192,6,82],[198,2,81],[200,4,79],[204,4,74],[208,4,77],[212,4,81],[216,2,82],[218,2,81],[220,4,77],
    [224,4,79],[228,2,75],[230,2,79],[232,6,82],[238,2,79],[240,4,81],[244,1,79],[245,1,77],[246,2,76],[248,2,73],[250,2,76],[252,4,69]];
  const CH3 = ["Dm","Dm","Eb","Dm","Dm","Dm","Bb","A7","Dm","Dm","Eb","Dm","Gm","A7","Dm","Dm",
    "Gm","Gm","Dm","Dm","Bb","Bb","A7","A7","Gm","Gm","Dm","Bb","Eb","Eb","A7","A7"];
  const VOICE3 = { Dm: [50, 57, 62, 65], Eb: [51, 58, 63, 67], Bb: [50, 58, 62, 65], A7: [49, 55, 61, 64], Gm: [50, 55, 58, 62], Am: [48, 52, 57, 60] };
  const ROOT3 = { Dm: 38, Eb: 39, Bb: 34, A7: 45, Gm: 43, Am: 45 };
  const STYLES3 = [
    { lead: "volt", pad: .012, bass: "pump", drums: "machine", arp: .03, verb: .12, gain: 1 },          // midday: the full machine
    { lead: "volt", pad: .014, bass: "pump", drums: "machine", arp: .02, verb: .14, gain: .98 },
    { lead: "bright", pad: .015, bass: "groove", drums: "full", arp: 0, verb: .17, gain: .95 },
    { lead: "warm", pad: .016, bass: "pump", drums: "march", arp: .012, verb: .2, gain: .9 },           // golden hour: a slower strut
    { lead: "keys", pad: .016, bass: "walk", drums: "rim", arp: 0, verb: .26, gain: .84 },
    { lead: "keys", pad: .018, bass: "long", drums: "rim", arp: .01, verb: .32, gain: .76 },             // blue hour: the factory winding down
    { lead: "bell", pad: .018, bass: "long", drums: null, arp: 0, verb: .4, gain: .64, dark: true, key: -2, drone: true },
    { lead: "volt", pad: .014, bass: "pump", drums: "machine", arp: .02, verb: .14, gain: .98 },         // (no recording to ease out of)
    { serene: true, lead: "lull", pad: .02, softPad: true, bass: "long", drums: null, arp: .014, harp: true, verb: .5, gain: .66 },   // SERENE (8): the beps' hideout, the same tune, kinder
  ];
  // Loof's sky (original): a bright, soaring sky-pirate tune in F that climbs up through its chord on every phrase (C, F, A) and swings
  // on a 3+3+2 pulse; a darker, wandering B section over D minor and G minor that lifts back home. Bright lead by day, a music box at night
  const MEL4 = [[0,2,72],[2,2,77],[4,4,81],[8,2,79],[10,2,77],[12,4,76],[16,2,74],[18,2,76],[20,4,79],[24,4,76],[28,4,72],
    [32,2,74],[34,2,77],[36,4,81],[40,2,84],[42,2,82],[44,4,81],[48,2,77],[50,2,79],[52,4,82],[56,4,79],[60,4,76],
    [64,2,72],[66,2,77],[68,4,81],[72,2,84],[74,2,81],[76,4,77],[80,2,79],[82,2,82],[84,4,86],[88,4,82],[92,4,79],
    [96,4,81],[100,2,79],[102,2,77],[104,4,76],[108,4,79],[112,12,77],[124,2,72],[126,2,74],
    [128,2,81],[130,2,79],[132,4,77],[136,2,74],[138,2,77],[140,4,81],[144,4,76],[148,2,72],[150,2,76],[152,8,81],
    [160,2,82],[162,2,81],[164,4,79],[168,2,77],[170,2,79],[172,4,82],[176,4,81],[180,4,77],[184,8,72],
    [192,2,79],[194,2,82],[196,4,86],[200,4,84],[204,4,82],[208,2,84],[210,2,82],[212,4,81],[216,4,79],[220,4,76],
    [224,4,82],[228,4,81],[232,4,79],[236,4,76],[240,8,77],[248,2,72],[250,2,74],[252,4,76]];
  const CH4 = ["F","F","C","C","Dm","Dm","Bb","C","F","F","Gm","Gm","C7","C7","F","F",
    "Dm","Dm","Am","Am","Bb","Bb","F","F","Gm","Gm","C","C","Bb","C7","F","F"];
  const VOICE4 = { F: [53, 57, 60, 65], C: [52, 55, 60, 64], Dm: [50, 57, 62, 65], Bb: [50, 53, 58, 62], Gm: [50, 55, 58, 62], C7: [52, 55, 58, 64], Am: [52, 57, 60, 64] };
  const ROOT4 = { F: 41, C: 36, Dm: 38, Bb: 34, Gm: 43, C7: 36, Am: 45 };
  const STYLES4 = [
    { lead: "bright", pad: .012, bass: "groove", drums: "tres", arp: .03, verb: .14, gain: 1 },          // midday: up in the wind
    { lead: "bright", pad: .014, bass: "groove", drums: "tres", arp: .02, verb: .16, gain: .98 },
    { lead: "warm", pad: .015, bass: "walk", drums: "full", arp: .02, verb: .18, gain: .95 },
    { lead: "warm", pad: .016, bass: "walk", drums: "tres", arp: .012, verb: .22, gain: .9 },           // golden hour
    { lead: "keys", pad: .016, bass: "walk", drums: "tresBrush", arp: 0, verb: .26, gain: .84 },
    { lead: "keys", pad: .018, bass: "long", drums: "rim", arp: .01, verb: .32, gain: .76 },             // blue hour: the docks going quiet
    { lead: "bell", pad: .018, bass: "long", drums: null, arp: 0, verb: .4, gain: .64, dark: true, key: -2, drone: true },
    { lead: "bright", pad: .014, bass: "groove", drums: "light", arp: .02, verb: .16, gain: .96 },      // (no recording to ease out of)
    { serene: true, lead: "lull", pad: .02, softPad: true, bass: "long", drums: null, arp: .014, harp: true, verb: .5, gain: .66 },   // SERENE (8): the beps' loft, the same tune, kinder
  ];
  // Sirocco's dunes (original): a caravan tune in D with a flat second and a sharp third (Phrygian dominant), climbing a hot little
  // turn (D, E-flat, D) and sinking back; a B section that rises through G minor and C minor. On the 3+3+2 pulse by day, a music box at night
  const MEL5 = [[0,3,74],[3,1,75],[4,2,74],[6,2,72],[8,4,70],[12,2,69],[14,2,70],[16,4,72],[20,2,70],[22,2,69],[24,6,67],[30,2,69],
    [32,3,70],[35,1,69],[36,2,67],[38,2,66],[40,6,62],[46,2,66],[48,2,67],[50,2,69],[52,4,70],[56,2,69],[58,2,67],[60,4,66],
    [64,3,74],[67,1,75],[68,2,74],[70,2,72],[72,4,74],[76,2,75],[78,2,74],[80,4,79],[84,2,78],[86,2,79],[88,6,74],[94,2,72],
    [96,2,70],[98,2,72],[100,4,75],[104,2,74],[106,2,72],[108,4,70],[112,12,74],[124,2,69],[126,2,70],
    [128,4,67],[132,2,70],[134,2,74],[136,6,79],[142,2,78],[144,4,78],[148,2,75],[150,2,74],[152,8,74],
    [160,4,72],[164,2,75],[166,2,79],[168,6,84],[174,2,82],[176,4,82],[180,2,79],[182,2,77],[184,8,75],
    [192,2,74],[194,2,75],[196,4,79],[200,4,78],[204,4,74],[208,2,75],[210,2,74],[212,4,72],[216,4,70],[220,4,67],
    [224,4,66],[228,4,69],[232,4,72],[236,4,75],[240,8,74],[248,2,69],[250,2,66],[252,4,62]];
  const CH5 = ["D","D","Eb","Eb","D","D","Eb","D","D","D","Gm","Gm","Cm","Eb","D","D",
    "Gm","Gm","D","D","Cm","Cm","Eb","Eb","Gm","Gm","Eb","Eb","D","D","D","D"];
  const VOICE5 = { D: [50, 54, 57, 62], Eb: [51, 55, 58, 63], Gm: [50, 55, 58, 62], Cm: [51, 55, 60, 63] };
  const ROOT5 = { D: 38, Eb: 39, Gm: 43, Cm: 36 };
  const STYLES5 = [
    { lead: "bright", pad: .012, bass: "groove", drums: "tres", arp: .03, verb: .16, gain: 1 },          // midday: the caravan on the move
    { lead: "warm", pad: .014, bass: "groove", drums: "tres", arp: .02, verb: .18, gain: .98 },
    { lead: "warm", pad: .015, bass: "walk", drums: "tresBrush", arp: .02, verb: .2, gain: .95 },
    { lead: "warm", pad: .016, bass: "walk", drums: "tres", arp: .012, verb: .24, gain: .9 },
    { lead: "keys", pad: .016, bass: "walk", drums: "tresBrush", arp: 0, verb: .28, gain: .84 },
    { lead: "keys", pad: .018, bass: "long", drums: "rim", arp: .01, verb: .34, gain: .76 },
    { lead: "bell", pad: .018, bass: "long", drums: null, arp: 0, verb: .42, gain: .64, dark: true, key: -2, drone: true },
    { lead: "bright", pad: .014, bass: "groove", drums: "light", arp: .02, verb: .16, gain: .96 },
    { serene: true, lead: "lull", pad: .02, softPad: true, bass: "long", drums: null, arp: .014, harp: true, verb: .5, gain: .66 },   // SERENE (8): the beps' tent, the same tune, kinder
  ];
  // Evil June (original): she's turned up and the way out is shut. Quiet and close: a detuned music box in E minor leaning on the flat
  // second (E, F, E) and the tritone, over a low drone and a heartbeat, the pad sinking through F and C minor before B pulls it home
  const MEL6 = [[0,4,76],[6,2,77],[8,8,76],[24,2,71],[26,2,70],[28,4,71],
    [32,4,77],[38,2,76],[40,8,72],[56,2,71],[58,2,72],[60,4,71],
    [64,4,76],[70,2,79],[72,8,78],[80,4,75],[86,2,74],[88,8,72],
    [96,6,71],[104,2,75],[106,2,74],[108,4,75],[112,12,76]];
  const CH6 = ["Em","Em","Em","Em","F","F","Em","Em","Em","Em","Cm","Cm","B","B","Em","Em"];
  const VOICE6 = { Em: [52, 55, 59, 64], F: [53, 57, 60, 65], Cm: [51, 55, 60, 63], B: [51, 54, 59, 63] };
  const ROOT6 = { Em: 40, F: 41, Cm: 36, B: 35 };
  const STYLES6 = [{ lead: "bell", pad: .014, bass: "long", drums: "heart", arp: 0, verb: .5, gain: .5, dark: true, drone: true }];
  // Kesh's garden (original): a starry tune in E minor that leans Dorian (a bright C-sharp over A), wide leaps up into the dark and slow
  // falls back; the B section climbs to a high C before settling home. Played almost still in the near-black first column, then a little
  // more each hour as the dawn comes, and at dawn (Kesh) ominous but driving: the buzzy robot lead over a full kit and a pumping bass
  const MEL7 = [[0,4,71],[4,2,74],[6,2,76],[8,6,79],[14,2,78],[16,4,76],[20,4,74],[24,8,71],
    [32,4,69],[36,2,71],[38,2,73],[40,6,74],[46,2,76],[48,8,71],[56,4,69],[60,4,67],
    [64,4,71],[68,2,74],[70,2,76],[72,6,83],[78,2,81],[80,4,79],[84,4,78],[88,8,76],
    [96,4,74],[100,4,76],[104,4,78],[108,4,79],[112,12,76],[124,2,71],[126,2,74],
    [128,6,79],[134,2,78],[136,8,76],[144,4,72],[148,4,74],[152,8,76],
    [160,6,81],[166,2,79],[168,8,78],[176,4,74],[180,4,76],[184,8,71],
    [192,6,79],[198,2,81],[200,8,83],[208,4,84],[212,4,83],[216,8,79],
    [224,4,78],[228,4,76],[232,4,74],[236,4,73],[240,14,76]];
  const CH7 = ["Em","Em","C","C","A","A","Em","D","Em","Em","C","C","D","D","Em","Em",
    "C","C","Am","Am","D","D","Bm","Bm","G","G","C","C","D","B","Em","Em"];
  const VOICE7 = { Em: [52, 55, 59, 64], C: [52, 55, 60, 64], A: [52, 57, 61, 64], D: [50, 54, 57, 62], Am: [52, 57, 60, 64], Bm: [50, 54, 59, 62], G: [50, 55, 59, 62], B: [51, 54, 59, 63] };
  const ROOT7 = { Em: 40, C: 36, A: 45, D: 38, Am: 45, Bm: 35, G: 43, B: 35 };
  const STYLES7 = [
    { lead: "bell", pad: .012, bass: "long", drums: null, arp: 0, verb: .5, gain: .5, dark: true, drone: true },          // the near-black first column: a music box in the dark
    { lead: "bell", pad: .016, bass: "long", drums: "rim", arp: 0, verb: .44, gain: .6, drone: true },                    // night
    { lead: "keys", pad: .016, bass: "long", drums: "brush", arp: .008, verb: .4, gain: .66 },                             // night, a little more awake
    { lead: "keys", pad: .016, bass: "walk", drums: "tresBrush", arp: .012, verb: .32, gain: .74 },                        // blue hour
    { lead: "warm", pad: .015, bass: "walk", drums: "light", arp: .016, verb: .26, gain: .82 },                            // first light
    { lead: "warm", pad: .014, bass: "groove", drums: "tres", arp: .02, verb: .2, gain: .9 },                              // sunrise
    { lead: "volt", pad: .014, bass: "groove", drums: "full", arp: .028, verb: .18, gain: 1 },                             // dawn: Kesh. Ominous, but day's coming
    { lead: "bell", pad: .016, bass: "long", drums: "rim", arp: 0, verb: .44, gain: .6, drone: true },                    // (the "in-between" slot: just the night again)
    { serene: true, lead: "lull", pad: .02, softPad: true, bass: "long", drums: null, arp: .014, harp: true, verb: .5, gain: .66 },   // SERENE (8): the beps' pod, the same tune, kinder
  ];
  // Vinella's candy works (original): a campy, spooky tune in D harmonic minor, up an arpeggio to a sly G-sharp turn and down a scale to
  // C-sharp; the B section brightens into F major and climbs before sinking home. A bouncy candy-factory groove by day, a music box at night
  const MEL8 = [[0,2,69],[2,2,74],[4,2,77],[6,4,81],[10,2,80],[12,4,81],[16,2,82],[18,2,81],[20,2,79],[22,2,77],[24,4,76],[28,4,73],
    [32,2,74],[34,2,77],[36,2,81],[38,4,86],[42,2,85],[44,4,86],[48,4,84],[52,4,82],[56,8,81],
    [64,2,77],[66,2,79],[68,2,81],[70,4,82],[74,2,81],[76,4,79],[80,2,77],[82,2,76],[84,4,74],[88,4,73],[92,4,76],
    [96,2,74],[98,2,76],[100,2,77],[102,2,79],[104,4,81],[108,4,82],[112,8,81],[120,4,73],[124,4,74],
    [128,4,77],[132,2,81],[134,2,84],[136,8,89],[144,4,88],[148,4,86],[152,8,84],
    [160,4,82],[164,2,86],[166,2,89],[168,8,91],[176,4,89],[180,4,88],[184,8,86],
    [192,2,85],[194,2,86],[196,2,88],[198,2,89],[200,4,88],[204,4,85],[208,4,86],[212,4,81],[216,8,77],
    [224,2,76],[226,2,77],[228,2,79],[230,2,81],[232,4,82],[236,4,73],[240,12,74],[252,4,73]];
  const CH8 = ["Dm","Dm","Gm","A","Dm","Dm","Gm","A","Bb","Bb","Gm","A","Dm","Dm","A","Dm",
    "F","F","C","C","Bb","Bb","F","F","A","A","Dm","Dm","Gm","A","Dm","Dm"];
  const VOICE8 = { Dm: [50, 53, 57, 62], Gm: [50, 55, 58, 62], A: [49, 52, 57, 61], Bb: [50, 53, 58, 62], F: [48, 53, 57, 60], C: [48, 52, 55, 60] };
  const ROOT8 = { Dm: 38, Gm: 43, A: 45, Bb: 46, F: 41, C: 36 };
  const STYLES8 = [
    { lead: "bright", pad: .012, bass: "groove", drums: "tres", arp: .03, verb: .16, gain: 1 },            // midday: the works going full tilt
    { lead: "bright", pad: .013, bass: "groove", drums: "tres", arp: .025, verb: .17, gain: .98 },
    { lead: "warm", pad: .015, bass: "walk", drums: "tresBrush", arp: .02, verb: .2, gain: .95 },
    { lead: "warm", pad: .016, bass: "walk", drums: "tres", arp: .012, verb: .24, gain: .9 },
    { lead: "keys", pad: .016, bass: "walk", drums: "tresBrush", arp: 0, verb: .28, gain: .84 },
    { lead: "keys", pad: .018, bass: "long", drums: "rim", arp: .01, verb: .34, gain: .76 },
    { lead: "bell", pad: .018, bass: "long", drums: null, arp: 0, verb: .42, gain: .64, dark: true, drone: true },   // night: Vinella's hour
    { lead: "bright", pad: .014, bass: "groove", drums: "light", arp: .02, verb: .16, gain: .96 },
    { serene: true, lead: "lull", pad: .02, softPad: true, bass: "long", drums: null, arp: .014, harp: true, verb: .5, gain: .66 },   // SERENE (8): the beps' candy stash, the same tune, kinder
  ];
  // Crux's city (original): a jaunty old-cartoon tune in C that can't keep its footing: every phrase slips a chromatic step sideways
  // (C to C-sharp, G to G-flat) and catches itself, a B section that wanders off into A-flat before finding the way home. Oom-pah by day
  const MEL9 = [[0,2,72],[2,2,76],[4,2,79],[6,2,84],[8,2,83],[10,2,82],[12,4,81],[16,2,79],[18,2,78],[20,2,79],[22,2,76],[24,4,73],[28,4,74],
    [32,2,74],[34,2,77],[36,2,81],[38,2,84],[40,2,83],[42,2,84],[44,4,86],[48,2,85],[50,2,84],[52,2,81],[54,2,77],[56,8,79],
    [64,2,72],[66,2,76],[68,2,79],[70,2,84],[72,2,85],[74,2,84],[76,4,79],[80,2,78],[82,2,77],[84,2,76],[86,2,75],[88,4,74],[92,4,71],
    [96,2,72],[98,2,74],[100,2,76],[102,2,77],[104,2,79],[106,2,81],[108,4,83],[112,8,84],[120,4,79],[124,4,76],
    [128,4,80],[132,2,84],[134,2,87],[136,8,92],[144,2,91],[146,2,89],[148,4,87],[152,8,84],
    [160,4,82],[164,2,86],[166,2,89],[168,8,94],[176,2,93],[178,2,91],[180,4,89],[184,8,86],
    [192,2,84],[194,2,83],[196,2,84],[198,2,86],[200,4,88],[204,4,91],[208,2,89],[210,2,88],[212,2,86],[214,2,83],[216,8,79],
    [224,2,77],[226,2,76],[228,2,74],[230,2,71],[232,4,72],[236,4,79],[240,12,84],[252,4,72]];
  const CH9 = ["C","C","C","A7","Dm","Dm","G7","G7","C","C","Db","G7","C","C","G7","C",
    "Ab","Ab","Ab","Ab","Bb","Bb","Bb","Bb","C","C","Fm","Fm","G7","G7","C","C"];
  const VOICE9 = { C: [48, 52, 55, 60], A7: [49, 52, 55, 57], Dm: [50, 53, 57, 62], G7: [47, 50, 53, 55], Db: [49, 53, 56, 61], Ab: [48, 51, 56, 60], Bb: [50, 53, 58, 62], Fm: [48, 53, 56, 60] };
  const ROOT9 = { C: 36, A7: 45, Dm: 38, G7: 43, Db: 37, Ab: 44, Bb: 46, Fm: 41 };
  const STYLES9 = [
    { lead: "bright", pad: .01, bass: "walk", drums: "march", arp: .025, verb: .14, gain: 1 },          // midday: the whole city bustling
    { lead: "bright", pad: .012, bass: "walk", drums: "march", arp: .02, verb: .15, gain: .98 },
    { lead: "warm", pad: .014, bass: "walk", drums: "march", arp: .02, verb: .18, gain: .95 },
    { lead: "warm", pad: .015, bass: "walk", drums: "light", arp: .015, verb: .22, gain: .9 },
    { lead: "keys", pad: .016, bass: "walk", drums: "brush", arp: 0, verb: .26, gain: .84 },
    { lead: "keys", pad: .018, bass: "long", drums: "rim", arp: .01, verb: .32, gain: .76 },
    { lead: "bell", pad: .018, bass: "long", drums: null, arp: 0, verb: .42, gain: .64, dark: true, drone: true },   // night: Crux's hour
    { lead: "bright", pad: .012, bass: "walk", drums: "march", arp: .02, verb: .15, gain: .98 },
    { serene: true, lead: "lull", pad: .02, softPad: true, bass: "long", drums: null, arp: .014, harp: true, verb: .5, gain: .66 },   // SERENE (8): the beps' attic
  ];
  // The Turtle's lakebed (original): a slow, loping blues in E minor with a flat fifth (B-flat) bending into the B, a drawl down the
  // pentatonic and back; a B section that climbs over C and D before sliding home on B7. Brushed shuffle by day, a 3+3+2 tread in the
  // evening, and at night (the Turtle's hour) a lumbering music box over a drone
  const MEL10 = [[0,6,64],[6,2,67],[8,4,69],[12,4,71],[16,2,74],[18,2,71],[20,4,69],[24,6,67],[30,2,64],
    [32,6,64],[38,2,67],[40,2,69],[42,2,70],[44,4,71],[48,8,69],[56,4,67],[60,4,62],
    [64,6,64],[70,2,67],[72,4,69],[76,4,74],[80,4,76],[84,2,74],[86,2,71],[88,8,74],
    [96,2,71],[98,2,69],[100,4,67],[104,4,69],[108,4,70],[112,8,69],[120,8,64],
    [128,4,72],[132,4,76],[136,6,79],[142,2,76],[144,4,74],[148,4,72],[152,8,71],
    [160,4,74],[164,4,78],[168,6,81],[174,2,78],[176,4,76],[180,4,74],[184,8,71],
    [192,6,76],[198,2,74],[200,4,71],[204,4,69],[208,4,67],[212,4,69],[216,8,71],
    [224,2,74],[226,2,71],[228,2,69],[230,2,67],[232,4,64],[236,4,67],[240,12,64],[252,4,59]];
  const CH10 = ["Em","Em","Em","G","C","C","D","D","Em","Em","Em","G","C","Am","B7","B7",
    "C","C","Am","Am","D","D","B7","B7","Em","Em","C","C","Am","B7","Em","Em"];
  const VOICE10 = { Em: [52, 55, 59, 64], G: [50, 55, 59, 62], C: [52, 55, 60, 64], D: [50, 54, 57, 62], Am: [52, 57, 60, 64], B7: [51, 54, 57, 59] };
  const ROOT10 = { Em: 40, G: 43, C: 36, D: 38, Am: 45, B7: 47 };
  const STYLES10 = [
    { lead: "soft", pad: .014, bass: "walk", drums: "brush", arp: .02, verb: .2, gain: .95 },              // midday: the long hot walk across the mud
    { lead: "soft", pad: .015, bass: "walk", drums: "brush", arp: .015, verb: .22, gain: .93 },
    { lead: "warm", pad: .016, bass: "tres", drums: "tresBrush", arp: .015, verb: .24, gain: .9 },
    { lead: "warm", pad: .017, bass: "tres", drums: "tresBrush", arp: 0, verb: .27, gain: .86 },
    { lead: "keys", pad: .018, bass: "long", drums: "rim", arp: 0, verb: .3, gain: .8 },
    { lead: "keys", pad: .018, bass: "long", drums: "rim", arp: .01, verb: .34, gain: .74 },
    { lead: "bell", pad: .02, bass: "tres", drums: "tres", arp: 0, verb: .42, gain: .68, dark: true, drone: true },   // night: the Turtle's hour, heavy-footed
    { lead: "soft", pad: .015, bass: "walk", drums: "brush", arp: .015, verb: .22, gain: .93 },
    { serene: true, lead: "lull", pad: .02, softPad: true, bass: "long", drums: null, arp: .014, harp: true, verb: .5, gain: .66 },   // SERENE (8): the beps' mud hut
  ];
  // Trumpeto's bazaar (original): the market in full swing, D Phrygian dominant
  const MEL11 = [[0,2,62],[2,2,63],[4,4,66],[8,2,67],[10,2,66],[12,4,63],
    [16,2,62],[18,2,63],[20,2,66],[22,2,67],[24,4,69],[28,4,67],
    [32,2,70],[34,2,69],[36,4,67],[40,2,66],[42,2,67],[44,4,66],
    [48,4,63],[52,4,62],[56,8,62],
    [64,2,69],[66,2,70],[68,4,72],[72,2,70],[74,2,69],[76,4,67],
    [80,2,66],[82,2,67],[84,2,69],[86,2,70],[88,4,72],[92,4,74],
    [96,2,75],[98,2,74],[100,4,72],[104,2,70],[106,2,69],[108,4,67],
    [112,4,66],[116,4,63],[120,8,62],
    [128,4,74],[132,2,75],[134,2,74],[136,4,72],[140,4,70],
    [144,2,69],[146,2,70],[148,2,72],[150,2,74],[152,8,75],
    [160,4,78],[164,2,79],[166,2,78],[168,4,75],[172,4,74],
    [176,2,72],[178,2,74],[180,4,75],[184,8,74],
    [192,2,62],[194,2,63],[196,4,66],[200,2,67],[202,2,66],[204,4,63],
    [208,2,62],[210,2,63],[212,2,66],[214,2,67],[216,4,69],[220,4,70],
    [224,2,72],[226,2,70],[228,2,69],[230,2,67],[232,4,66],[236,4,63],
    [240,12,62],[252,4,57]];
  const CH11 = ["D","D","Eb","Eb","Gm","Gm","D","D","Cm","Cm","D","D","Eb","Eb","D","D",
    "Gm","Gm","Eb","Eb","D","D","Cm","D","D","D","Eb","Eb","Gm","Cm","D","D"];
  const VOICE11 = { D: [50, 54, 57, 62], Eb: [51, 55, 58, 63], Gm: [50, 55, 58, 62], Cm: [51, 55, 60, 63] };
  const ROOT11 = { D: 38, Eb: 39, Gm: 43, Cm: 36 };
  const STYLES11 = [
    { lead: "bright", pad: .012, bass: "groove", drums: "march", arp: .02, verb: .18, gain: .95 },            // midday: the market in full swing
    { lead: "bright", pad: .013, bass: "groove", drums: "march", arp: .02, verb: .2, gain: .93 },
    { lead: "bright", pad: .014, bass: "groove", drums: "tres", arp: .02, verb: .2, gain: .91 },
    { lead: "warm", pad: .015, bass: "tres", drums: "tres", arp: .015, verb: .24, gain: .88 },
    { lead: "warm", pad: .016, bass: "walk", drums: "rim", arp: .012, verb: .28, gain: .82 },
    { lead: "keys", pad: .018, bass: "walk", drums: "rim", arp: .01, verb: .32, gain: .77 },
    { lead: "bell", pad: .02, bass: "pump", drums: "full", arp: 0, verb: .38, gain: .72, dark: true },          // night: Trumpeto's concert
    { lead: "bright", pad: .012, bass: "groove", drums: "march", arp: .02, verb: .18, gain: .95 },
    { serene: true, lead: "lull", pad: .02, softPad: true, bass: "long", drums: null, arp: .014, harp: true, verb: .5, gain: .66 },   // SERENE (8): the beps' tent
  ];
  // Master No's casino (original): a late-night lounge, A minor
  const MEL12 = [[0,3,76],[3,1,74],[4,4,72],[8,2,69],[10,2,72],[12,4,76],
    [16,3,78],[19,1,76],[20,4,74],[24,2,72],[26,2,74],[28,4,78],
    [32,6,79],[38,2,78],[40,4,74],[44,4,71],
    [48,4,72],[52,4,76],[56,8,74],
    [64,3,77],[67,1,76],[68,4,72],[72,2,69],[74,2,72],[76,4,77],
    [80,3,74],[83,1,72],[84,4,71],[88,2,69],[90,2,71],[92,4,74],
    [96,4,76],[100,2,74],[102,2,72],[104,4,71],[108,4,68],
    [112,8,69],[120,4,72],[124,4,76],
    [128,2,81],[130,2,79],[132,4,76],[136,2,74],[138,2,76],[140,4,72],
    [144,2,78],[146,2,76],[148,4,74],[152,2,72],[154,2,74],[156,4,78],
    [160,4,79],[164,4,83],[168,6,81],[174,2,79],
    [176,4,76],[180,4,79],[184,8,76],
    [192,3,77],[195,1,79],[196,4,81],[200,4,77],[204,4,72],
    [208,3,74],[211,1,77],[212,4,74],[216,4,71],[220,4,69],
    [224,4,68],[228,4,71],[232,4,74],[236,4,76],
    [240,12,69],[252,4,64]];
  const CH12 = ["Am7","Am7","D7","D7","Gmaj7","Gmaj7","Cmaj7","Cmaj7","Fmaj7","Fmaj7","Bm7b5","Bm7b5","E7","E7","Am","Am",
    "Am7","Am7","D7","D7","Gmaj7","Gmaj7","Cmaj7","Cmaj7","Fmaj7","Fmaj7","Bm7b5","Bm7b5","E7","E7","Am","Am"];
  const VOICE12 = { Am7: [57, 60, 64, 67], D7: [54, 57, 60, 62], Gmaj7: [55, 59, 62, 66], Cmaj7: [55, 59, 60, 64], Fmaj7: [53, 57, 60, 64], Bm7b5: [53, 57, 59, 62], E7: [52, 56, 59, 62], Am: [57, 60, 64, 69] };
  const ROOT12 = { Am7: 45, D7: 38, Gmaj7: 43, Cmaj7: 36, Fmaj7: 41, Bm7b5: 47, E7: 40, Am: 45 };
  const STYLES12 = [
    { lead: "keys", pad: .014, bass: "groove", drums: "tres", arp: .015, verb: .26, gain: .9 },                 // dusk: the doors open
    { lead: "keys", pad: .014, bass: "groove", drums: "tres", arp: .015, verb: .27, gain: .89 },
    { lead: "warm", pad: .015, bass: "groove", drums: "tres", arp: .02, verb: .28, gain: .88 },
    { lead: "bright", pad: .015, bass: "groove", drums: "full", arp: .02, verb: .26, gain: .86 },
    { lead: "keys", pad: .016, bass: "walk", drums: "tresBrush", arp: .015, verb: .3, gain: .82 },
    { lead: "warm", pad: .018, bass: "walk", drums: "brush", arp: .012, verb: .34, gain: .78 },
    { lead: "bell", pad: .02, bass: "pump", drums: "full", arp: 0, verb: .38, gain: .74, dark: true },          // the small hours: Master No's high table
    { lead: "keys", pad: .014, bass: "groove", drums: "tres", arp: .015, verb: .26, gain: .9 },
    { serene: true, lead: "lull", pad: .02, softPad: true, bass: "long", drums: null, arp: .014, harp: true, verb: .5, gain: .66 },   // SERENE (8): the beps' back room
  ];
  // King P's castle (original): a stately march, B-flat major
  const MEL13 = [[0,2,65],[2,2,70],[4,4,74],[8,2,77],[10,2,74],[12,4,70],
    [16,2,72],[18,2,74],[20,4,75],[24,2,74],[26,2,72],[28,4,70],
    [32,2,67],[34,2,70],[36,4,74],[40,2,72],[42,2,70],[44,4,69],
    [48,6,70],[54,2,69],[56,8,65],
    [64,2,77],[66,2,79],[68,4,81],[72,2,79],[74,2,77],[76,4,75],
    [80,2,74],[82,2,75],[84,4,77],[88,2,75],[90,2,74],[92,4,72],
    [96,2,70],[98,2,72],[100,4,74],[104,2,75],[106,2,77],[108,4,79],
    [112,6,77],[118,2,75],[120,8,74],
    [128,4,82],[132,2,81],[134,2,79],[136,4,77],[140,4,82],
    [144,2,84],[146,2,82],[148,2,81],[150,2,79],[152,8,81],
    [160,4,79],[164,2,77],[166,2,75],[168,4,74],[172,4,79],
    [176,2,77],[178,2,75],[180,4,74],[184,8,72],
    [192,2,65],[194,2,70],[196,4,74],[200,2,77],[202,2,74],[204,4,70],
    [208,2,72],[210,2,74],[212,4,75],[216,2,77],[218,2,79],[220,4,81],
    [224,4,82],[228,2,81],[230,2,79],[232,4,77],[236,4,72],
    [240,12,70],[252,4,65]];
  const CH13 = ["Bb","Bb","Cm","F","Gm","F","Bb","F","F","Cm","Bb","F","Gm","Eb","F","Bb",
    "Bb","Eb","F","F","Gm","Eb","F","F","Bb","Bb","Cm","F","Eb","F","Bb","Bb"];
  const VOICE13 = { Bb: [53, 58, 62, 65], Eb: [51, 55, 58, 63], F: [53, 57, 60, 65], Gm: [55, 58, 62, 67], Cm: [55, 60, 63, 67] };
  const ROOT13 = { Bb: 34, Eb: 39, F: 41, Gm: 43, Cm: 36 };
  const STYLES13 = [
    { lead: "bright", pad: .013, bass: "groove", drums: "march", arp: .018, verb: .22, gain: .93 },            // midday: up the mountain to the gate
    { lead: "bright", pad: .013, bass: "groove", drums: "march", arp: .018, verb: .23, gain: .92 },
    { lead: "warm", pad: .014, bass: "groove", drums: "march", arp: .016, verb: .24, gain: .9 },
    { lead: "warm", pad: .015, bass: "tres", drums: "tres", arp: .015, verb: .27, gain: .87 },
    { lead: "keys", pad: .016, bass: "walk", drums: "rim", arp: .012, verb: .3, gain: .82 },
    { lead: "keys", pad: .018, bass: "walk", drums: "rim", arp: .01, verb: .34, gain: .77 },
    { lead: "bell", pad: .02, bass: "pump", drums: "full", arp: 0, verb: .38, gain: .74, dark: true },          // night: King P on his throne
    { lead: "bright", pad: .013, bass: "groove", drums: "march", arp: .018, verb: .22, gain: .93 },
    { serene: true, lead: "lull", pad: .02, softPad: true, bass: "long", drums: null, arp: .014, harp: true, verb: .5, gain: .66 },   // SERENE (8): the beps' pineapple hut
  ];
  // the deep's song (world 13, ORIGINAL, 2026-10-24): a slow swimming tune in E Dorian, 73 bpm, 16 bars. Long notes that rise like bubbles
  // from B up to G and float there, the Dorian C-sharp lifting the second bar; a B section that climbs through C major and D to a high C over
  // the A-major turn, then settles back on E. Played on bells, keys and a harp under a lot of water (reverb), the beat only a soft brush
  const MEL14 = [[0,4,71],[4,2,74],[6,2,76],[8,8,79],[16,4,78],[20,4,76],[24,6,73],[30,2,71],[32,6,72],[38,2,74],[40,8,76],
    [48,4,78],[52,4,75],[56,8,71],[64,4,71],[68,2,76],[70,2,78],[72,8,83],[80,4,81],[84,4,78],[88,8,76],[96,6,78],[102,2,76],[104,4,73],[108,4,69],
    [112,4,71],[116,4,75],[120,8,71],[128,6,79],[134,2,78],[136,8,76],[144,4,74],[148,4,78],[152,8,81],[160,6,78],[166,2,76],[168,8,74],
    [176,4,71],[180,4,74],[184,8,76],[192,4,79],[196,4,83],[200,8,84],[208,4,83],[212,4,81],[216,8,76],[224,6,78],[230,2,76],[232,4,75],[236,4,71],
    [240,12,76],[252,2,71],[254,2,74]];
  const CH14 = ["Em9","Em9","A","A","Cmaj7","Cmaj7","B7sus","B7","Em9","Em9","A","A","F#m7","F#m7","B7","B7",
    "Cmaj7","Cmaj7","D","D","Bm7","Bm7","Em","Em","Cmaj7","Cmaj7","A","A","B7sus","B7","Em","Em"];
  const VOICE14 = { Em9: [52, 55, 59, 66], Em: [52, 55, 59, 64], A: [52, 57, 61, 64], Cmaj7: [48, 52, 55, 59], B7: [51, 54, 57, 59], B7sus: [52, 54, 57, 59], "F#m7": [52, 54, 57, 61], D: [50, 54, 57, 62], Bm7: [50, 54, 57, 59] };
  const ROOT14 = { Em9: 40, Em: 40, A: 45, Cmaj7: 36, B7: 35, B7sus: 35, "F#m7": 42, D: 38, Bm7: 35 };
  const STYLES14 = [
    { lead: "keys", pad: .016, bass: "long", drums: "brush", arp: .016, harp: true, verb: .42, gain: .82 },        // midday (the PC build: the recording)
    { lead: "keys", pad: .016, bass: "long", drums: "brush", arp: .016, harp: true, verb: .44, gain: .8 },
    { lead: "warm", pad: .017, bass: "walk", drums: "boomSoft", arp: .014, verb: .44, gain: .8 },
    { lead: "warm", pad: .017, bass: "walk", drums: "rim", arp: .012, verb: .46, gain: .78 },
    { lead: "bell", pad: .018, bass: "long", drums: "rim", arp: .01, harp: true, verb: .5, gain: .74 },
    { lead: "bell", pad: .019, bass: "long", drums: null, arp: .008, verb: .54, gain: .7 },
    { lead: "bell", pad: .02, bass: "long", drums: "heart", arp: 0, verb: .58, gain: .62, dark: true, drone: true },   // night: down in the dark water
    { lead: "keys", pad: .016, bass: "long", drums: "brush", arp: .016, verb: .42, gain: .82 },                          // EASE (7)
    { serene: true, lead: "lull", pad: .02, softPad: true, bass: "long", drums: null, arp: .014, harp: true, verb: .55, gain: .64 },   // SERENE (8): the beps' grotto
  ];
  // the cassettes' songs (2026-10-26: "casettes they can find to play new songs"): five of my own, ORIGINAL, for the headphones. One take each, whatever the hour
  // GUAGUA GROOVE (14): La Guagua's own, a bouncing C major on the road, 132 bpm: a skipping figure up the chord and a B section that climbs to a high D and home
  const MEL_T1 = [[0,2,72],[2,2,76],[4,2,79],[6,2,76],[8,4,79],[12,2,81],[14,2,79],[16,2,77],[18,2,81],[20,4,84],[24,2,81],[26,2,77],[28,4,76],
    [32,2,74],[34,2,79],[36,2,83],[38,2,79],[40,4,77],[44,4,74],[48,6,76],[54,2,74],[56,8,72],
    [64,2,76],[66,2,72],[68,2,69],[70,2,72],[72,4,76],[76,4,81],[80,2,81],[82,2,79],[84,2,77],[86,2,76],[88,8,77],
    [96,2,79],[98,2,77],[100,2,76],[102,2,74],[104,4,79],[108,4,83],[112,8,84],[120,4,79],[124,4,74],
    [128,4,81],[132,2,79],[134,2,77],[136,4,81],[140,4,84],[144,6,86],[150,2,84],[152,4,83],[156,4,79],
    [160,2,79],[162,2,83],[164,4,88],[168,2,86],[170,2,83],[172,4,79],[176,6,81],[182,2,79],[184,8,76],
    [192,2,77],[194,2,81],[196,4,86],[200,2,84],[202,2,81],[204,4,77],[208,4,79],[212,2,83],[214,2,86],[216,8,83],
    [224,4,84],[228,4,79],[232,4,81],[236,4,76],[240,4,77],[244,2,74],[246,2,77],[248,4,79],[252,4,74]];
  const CH_T1 = ["C","C","F","F","G","G","C","C","Am","Am","F","F","G","G","C","G","F","F","G","G","Em","Em","Am","Am","Dm","Dm","G","G","C","Am","Dm","G"];
  const VOICE_T1 = { C: [52, 55, 60, 64], F: [53, 57, 60, 65], G: [50, 55, 59, 62], Am: [52, 57, 60, 64], Em: [52, 55, 59, 64], Dm: [50, 53, 57, 62] };
  const ROOT_T1 = { C: 36, F: 41, G: 43, Am: 45, Em: 40, Dm: 38 };
  // LARIMAR LULLABY (15): slow and kind in F major, 76 bpm, long notes over a harp, no drums
  const MEL_T2 = [[0,4,72],[4,4,77],[8,8,81],[16,4,82],[20,4,81],[24,8,77],[32,4,76],[36,4,77],[40,4,79],[44,4,81],[48,12,79],[60,4,76],
    [64,4,77],[68,4,81],[72,8,86],[80,4,84],[84,4,82],[88,8,77],[96,4,79],[100,4,82],[104,4,81],[108,4,79],[112,16,77],
    [128,4,74],[132,4,77],[136,8,82],[144,4,84],[148,4,82],[152,8,79],[160,4,81],[164,4,76],[168,8,72],[176,4,74],[180,4,77],[184,8,81],
    [192,4,82],[196,4,79],[200,8,74],[208,4,76],[212,4,79],[216,8,84],[224,8,81],[232,8,77],[240,8,79],[248,8,76]];
  const CH_T2 = ["F","F","Bb","Bb","F","F","C","C","Dm","Dm","Bb","Bb","Gm","C","F","F","Bb","Bb","C","C","Am","Am","Dm","Dm","Gm","Gm","C","C","F","Dm","Gm","C"];
  const VOICE_T2 = { F: [53, 57, 60, 65], Bb: [50, 53, 58, 62], C: [52, 55, 60, 64], Dm: [50, 53, 57, 62], Gm: [50, 55, 58, 62], Am: [52, 57, 60, 64] };
  const ROOT_T2 = { F: 41, Bb: 46, C: 36, Dm: 38, Gm: 43, Am: 45 };
  // BEP BOUNCE (16): a bouncy D major, 120 bpm, short hopping notes up the chord and a B section that leaps up an octave
  const MEL_T3 = [[0,1,74],[2,1,78],[4,1,81],[6,2,86],[8,1,85],[10,1,83],[12,2,81],[14,2,78],[16,1,76],[18,1,81],[20,1,85],[22,2,88],[24,2,85],[26,2,81],[28,4,76],
    [32,1,78],[34,1,83],[36,1,86],[38,2,90],[40,2,88],[42,2,86],[44,4,83],[48,2,79],[50,2,83],[52,2,86],[54,2,83],[56,8,79],
    [64,1,81],[66,1,81],[68,2,78],[70,2,81],[72,2,86],[74,2,81],[76,4,78],[80,1,76],[82,1,76],[84,2,73],[86,2,76],[88,2,81],[90,2,76],[92,4,73],
    [96,2,74],[98,2,79],[100,2,83],[102,2,79],[104,2,76],[106,2,81],[108,4,85],[112,4,86],[116,2,81],[118,2,78],[120,8,74],
    [128,2,83],[130,2,86],[132,4,91],[136,2,90],[138,2,88],[140,4,86],[144,2,85],[146,2,88],[148,4,93],[152,2,91],[154,2,90],[156,4,88],
    [160,2,85],[162,2,81],[164,2,78],[166,2,81],[168,4,85],[172,4,90],[176,6,86],[182,2,85],[184,8,83],
    [192,2,79],[194,2,83],[196,2,88],[198,2,83],[200,4,79],[204,4,76],[208,2,81],[210,2,85],[212,2,88],[214,2,85],[216,8,81],
    [224,2,86],[226,2,90],[228,4,93],[232,4,90],[236,4,86],[240,4,88],[244,4,85],[248,4,81],[252,4,76]];
  const CH_T3 = ["D","D","A","A","Bm","Bm","G","G","D","D","A","A","G","A","D","D","G","G","A","A","F#m","F#m","Bm","Bm","Em","Em","A","A","D","Bm","Em","A"];
  const VOICE_T3 = { D: [50, 54, 57, 62], A: [49, 52, 57, 61], Bm: [50, 54, 59, 62], G: [50, 55, 59, 62], "F#m": [49, 54, 57, 61], Em: [52, 55, 59, 64] };
  const ROOT_T3 = { D: 38, A: 45, Bm: 47, G: 43, "F#m": 42, Em: 40 };
  // NIGHT BUS HOME (17): a late, easy A minor, 88 bpm, sevenths, a walking bass and brushes, the tune falling home at the end
  const MEL_T4 = [[0,3,76],[3,1,74],[4,4,72],[8,4,79],[12,4,76],[16,3,77],[19,1,76],[20,4,74],[24,8,81],[32,3,79],[35,1,77],[36,4,74],[40,4,71],[44,4,77],
    [48,8,76],[56,4,79],[60,4,83],[64,4,84],[68,4,81],[72,4,77],[76,4,76],[80,4,74],[84,4,77],[88,4,80],[92,4,83],[96,12,81],[108,4,76],
    [112,4,80],[116,4,76],[120,4,74],[124,4,71],[128,4,74],[132,4,77],[136,4,81],[140,4,84],[144,6,83],[150,2,81],[152,8,77],
    [160,4,79],[164,4,83],[168,4,84],[172,4,88],[176,8,84],[184,4,81],[188,4,79],[192,4,77],[196,4,81],[200,8,86],[208,4,83],[212,4,80],[216,8,76],
    [224,8,81],[232,4,77],[236,4,76],[240,4,74],[244,4,71],[248,8,68]];
  const CH_T4 = ["Am7","Am7","Dm7","Dm7","G7","G7","Cmaj7","Cmaj7","Fmaj7","Fmaj7","Bm7b5","E7","Am7","Am7","E7","E7","Dm7","Dm7","G7","G7","Cmaj7","Cmaj7","Am7","Am7","Dm7","Dm7","E7","E7","Am7","Fmaj7","Bm7b5","E7"];
  const VOICE_T4 = { Am7: [52, 55, 57, 60], Dm7: [53, 57, 60, 62], G7: [53, 55, 59, 62], Cmaj7: [52, 55, 59, 60], Fmaj7: [52, 57, 60, 64], Bm7b5: [50, 53, 57, 59], E7: [50, 52, 56, 59] };
  const ROOT_T4 = { Am7: 45, Dm7: 38, G7: 43, Cmaj7: 36, Fmaj7: 41, Bm7b5: 47, E7: 40 };
  // SPARKS FLY (18): a driving E minor, 140 bpm, quick runs and a B section up over the B major turn
  const MEL_T5 = [[0,2,76],[2,2,79],[4,2,83],[6,2,79],[8,2,88],[10,2,86],[12,2,83],[14,2,79],[16,2,76],[18,2,79],[20,2,84],[22,2,79],[24,4,88],[28,4,84],
    [32,2,74],[34,2,78],[36,2,81],[38,2,78],[40,2,86],[42,2,84],[44,2,81],[46,2,78],[48,6,79],[54,2,78],[56,8,76],
    [64,1,88],[65,1,86],[66,2,83],[68,1,88],[69,1,86],[70,2,83],[72,4,91],[76,4,88],[80,1,88],[81,1,84],[82,2,79],[84,1,88],[85,1,84],[86,2,79],[88,8,84],
    [96,2,86],[98,2,81],[100,2,78],[102,2,81],[104,4,86],[108,4,90],[112,8,87],[120,4,83],[124,4,78],
    [128,4,81],[132,2,84],[134,2,88],[136,8,93],[144,4,91],[148,4,88],[152,8,83],[160,2,84],[162,2,88],[164,4,91],[168,2,88],[170,2,84],[172,4,79],
    [176,4,81],[180,4,86],[184,8,90],[192,2,93],[194,2,91],[196,2,88],[198,2,84],[200,4,81],[204,4,84],[208,4,87],[212,4,90],[216,8,93],
    [224,4,91],[228,4,88],[232,4,84],[236,4,88],[240,4,86],[244,4,83],[248,8,87]];
  const CH_T5 = ["Em","Em","C","C","D","D","Em","Em","Em","Em","C","C","D","D","B","B","Am","Am","Em","Em","C","C","D","D","Am","Am","B","B","Em","C","D","B"];
  const VOICE_T5 = { Em: [52, 55, 59, 64], C: [52, 55, 60, 64], D: [50, 54, 57, 62], B: [51, 54, 59, 63], Am: [52, 57, 60, 64] };
  const ROOT_T5 = { Em: 40, C: 36, D: 38, B: 47, Am: 45 };
  const SONGS = [
    { MEL, CH, VOICE, ROOT, DARK, STYLES, bars: 16, bpm: 100, drone: 43, darkLead: { 11: -1, 4: -1, 1: -1 }, clipVar: null },
    { MEL: MEL2, CH: CH2, VOICE: VOICE2, ROOT: ROOT2, DARK: { G: "Gm", Em: "Edim", E: "E7b5" }, STYLES: STYLES2, bars: 16, bpm: 84, drone: 45, darkLead: { 11: -1, 6: -1 }, clipVar: null },
    { MEL: MEL3, CH: CH3, VOICE: VOICE3, ROOT: ROOT3, DARK: { A7: "Am" }, STYLES: STYLES3, bars: 16, bpm: 112, drone: 38, darkLead: { 1: -1 }, clipVar: null },
    { MEL: MEL4, CH: CH4, VOICE: VOICE4, ROOT: ROOT4, DARK: {}, STYLES: STYLES4, bars: 16, bpm: 116, drone: 41, darkLead: {}, clipVar: null },
    { MEL: MEL5, CH: CH5, VOICE: VOICE5, ROOT: ROOT5, DARK: {}, STYLES: STYLES5, bars: 16, bpm: 104, drone: 38, darkLead: {}, clipVar: null },
    { MEL: MEL6, CH: CH6, VOICE: VOICE6, ROOT: ROOT6, DARK: {}, STYLES: STYLES6, bars: 8, bpm: 72, drone: 40, darkLead: {}, clipVar: null },
    { MEL: MEL7, CH: CH7, VOICE: VOICE7, ROOT: ROOT7, DARK: {}, STYLES: STYLES7, bars: 16, bpm: 104, drone: 40, darkLead: {}, clipVar: null },
    { MEL: MEL8, CH: CH8, VOICE: VOICE8, ROOT: ROOT8, DARK: {}, STYLES: STYLES8, bars: 16, bpm: 112, drone: 38, darkLead: {}, clipVar: null },
    { MEL: MEL9, CH: CH9, VOICE: VOICE9, ROOT: ROOT9, DARK: {}, STYLES: STYLES9, bars: 16, bpm: 128, drone: 36, darkLead: {}, clipVar: null },
    { MEL: MEL10, CH: CH10, VOICE: VOICE10, ROOT: ROOT10, DARK: {}, STYLES: STYLES10, bars: 16, bpm: 88, drone: 40, darkLead: {}, clipVar: null },
    { MEL: MEL11, CH: CH11, VOICE: VOICE11, ROOT: ROOT11, DARK: {}, STYLES: STYLES11, bars: 16, bpm: 120, drone: 38, darkLead: {}, clipVar: null },   // 10: Trumpeto's bazaar (original)
    { MEL: MEL12, CH: CH12, VOICE: VOICE12, ROOT: ROOT12, DARK: {}, STYLES: STYLES12, bars: 16, bpm: 112, drone: 45, darkLead: {}, clipVar: null },   // 11: Master No's casino (original)
    { MEL: MEL13, CH: CH13, VOICE: VOICE13, ROOT: ROOT13, DARK: {}, STYLES: STYLES13, bars: 16, bpm: 104, drone: 34, darkLead: {}, clipVar: null },   // 12: King P's castle (original)
    { MEL: MEL14, CH: CH14, VOICE: VOICE14, ROOT: ROOT14, DARK: {}, STYLES: STYLES14, bars: 16, bpm: 73, drone: 40, darkLead: {}, clipVar: null },   // 13: the deep (original)
    { MEL: MEL_T1, CH: CH_T1, VOICE: VOICE_T1, ROOT: ROOT_T1, DARK: {}, STYLES: [{ lead: "bright", pad: .012, bass: "groove", drums: "full", arp: .02, verb: .14, gain: .92 }], bars: 16, bpm: 132, drone: 36, darkLead: {}, clipVar: null },   // 14: GUAGUA GROOVE (a cassette)
    { MEL: MEL_T2, CH: CH_T2, VOICE: VOICE_T2, ROOT: ROOT_T2, DARK: {}, STYLES: [{ lead: "lull", pad: .02, softPad: true, bass: "long", drums: null, arp: .014, harp: true, verb: .5, gain: .72 }], bars: 16, bpm: 76, drone: 41, darkLead: {}, clipVar: null },   // 15: LARIMAR LULLABY (a cassette)
    { MEL: MEL_T3, CH: CH_T3, VOICE: VOICE_T3, ROOT: ROOT_T3, DARK: {}, STYLES: [{ lead: "bright", pad: .012, bass: "pump", drums: "light", arp: .03, verb: .12, gain: .88 }], bars: 16, bpm: 120, drone: 38, darkLead: {}, clipVar: null },   // 16: BEP BOUNCE (a cassette)
    { MEL: MEL_T4, CH: CH_T4, VOICE: VOICE_T4, ROOT: ROOT_T4, DARK: {}, STYLES: [{ lead: "keys", pad: .016, bass: "walk", drums: "brush", arp: 0, verb: .3, gain: .84 }], bars: 16, bpm: 88, drone: 45, darkLead: {}, clipVar: null },   // 17: NIGHT BUS HOME (a cassette)
    { MEL: MEL_T5, CH: CH_T5, VOICE: VOICE_T5, ROOT: ROOT_T5, DARK: {}, STYLES: [{ lead: "volt", pad: .012, bass: "pump", drums: "machine", arp: .025, verb: .12, gain: .88 }], bars: 16, bpm: 140, drone: 40, darkLead: {}, clipVar: null },   // 18: SPARKS FLY (a cassette)
  ];
  const HUB = 9;                                 // HUB (9): a world's hub, its own take on the tune (2026-10-22; out here, not by EASE: the PC score swaps the woods' part above out)
  SONGS.forEach(S => { if (S.STYLES.length >= 9 && !S.STYLES[HUB]) S.STYLES[HUB] = { ...S.STYLES[3], hub: true, lead: "pluck", harp: true, arp: .022, verb: .22, gain: (S.STYLES[3].gain || .9) * .95, dark: false, drone: false, key: 0, orig: undefined, bpm: undefined }; });   // the hub's: the world's own drums and bass at golden hour, a mallet lead and the harp (the user, 2026-10-22: "another variation of the level's music for each hub")
  SONGS.forEach(S => { S.LOOP = S.bars * BAR; S.MELAT = {}; S.MEL.forEach(n => (S.MELAT[n[0]] = S.MELAT[n[0]] || []).push(n)); S.clip = { buf: null, busy: false, bar0: 0, intro: 0 }; });
  const DRUMS = {
    full: { kick: [[0, 1], [6, .8], [10, .9]], snare: [[4, 1], [12, 1]], hat: [0, 2, 4, 6, 8, 10, 12, 14].map(s => [s, s % 4 ? .9 : .5]) },
    light: { kick: [[0, .8], [10, .7]], snare: [[12, .6]], hat: [2, 6, 10, 14].map(s => [s, .55]) },
    brush: { kick: [[0, .6], [10, .5]], brush: [[4, .9], [12, .9]], shaker: [0, 2, 4, 6, 8, 10, 12, 14].map(s => [s, s % 4 ? .7 : .4]) },
    rim: { kick: [[0, .5]], rim: [[12, .6]] },
    tres: { kick: [[0, .9], [6, .65], [12, .75]], snare: [[8, .55]], hat: [0, 2, 4, 6, 8, 10, 12, 14].map(s => [s, s % 4 ? .8 : .45]) },   // the waves' 3+3+2 pulse
    tresBrush: { kick: [[0, .6], [6, .4], [12, .5]], brush: [[8, .8]], shaker: [0, 2, 4, 6, 8, 10, 12, 14].map(s => [s, s % 4 ? .65 : .4]) },
    machine: { kick: [[0, 1], [8, .9], [11, .5]], snare: [[4, 1], [12, 1]], hat: [...Array(16).keys()].map(s => [s, s % 2 ? .45 : .75]), clank: [[7, .55], [15, .4]] },   // Volt Keep: the factory floor
    heart: { kick: [[0, .5], [3, .34]] },                                                                      // Evil June: a heartbeat, lub-dub once a bar
    march: { kick: [[0, .9], [8, .75]], snare: [[4, .75], [12, .75], [14, .35], [15, .45]], hat: [0, 4, 8, 12].map(s => [s, .4]) },
  };
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  function decodeClip(ac, S) {                  // each song's recording (artiela.js, awakens.js), decoded once
    const O = S.clipVar && window[S.clipVar], clip = S.clip; if (clip.buf || clip.busy || !O || !O.b64) return; clip.busy = true;
    const bin = atob(O.b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    ac.decodeAudioData(u8.buffer).then(b => { clip.buf = b; clip.bar0 = O.bar0; clip.intro = O.intro ?? O.bar0; }, () => {}).finally(() => { clip.busy = false; });
  }

  function Band(ac, dest, S) {                 // one band playing one song on one audio context (the live game, or an offline render for testing)
    const { STYLES, CH, VOICE, ROOT, DARK, MELAT, clip } = S; let cues = 0;
    const out = ac.createGain(), comp = ac.createDynamicsCompressor(), conv = ac.createConvolver(), wet = ac.createGain();
    comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = .01; comp.release.value = .25;
    const n = Math.floor(ac.sampleRate * 2.4), ir = ac.createBuffer(2, n, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.4); }
    conv.buffer = ir; conv.connect(wet); wet.gain.value = .6; wet.connect(comp); out.connect(comp); comp.connect(dest);
    const noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const ch = {}; ["lead", "pad", "bass", "drums", "arp"].forEach(k => { const g = ac.createGain(), s = ac.createGain(); g.connect(out); g.connect(s); s.connect(conv); ch[k] = { g, s }; });
    ch.lead.g.gain.value = .34; ch.pad.g.gain.value = 1; ch.bass.g.gain.value = .3; ch.drums.g.gain.value = .3; ch.arp.g.gain.value = .7;
    let st = STYLES[0], origNow = null;
    const BASE = { lead: .34, pad: 1, bass: .3, drums: .3, arp: .7 };
    const setStyle = (k, t) => { st = STYLES[k]; let fell = false; if (st.orig && !clip.buf) { decodeClip(ac, S); st = STYLES[st.alt]; fell = true; }   // the recording isn't ready yet: play the afternoon version meanwhile
      if (gloom && !st.serene) { const N = STYLES.find(x => x.dark && !x.serene);   // the land at war (the uprising at 75%): every hour played the way this world's night is
        st = N ? { ...N } : { ...st, dark: true, key: (st.key || 0) - 2, drone: true, arp: 0, drums: null, verb: Math.max(st.verb || 0, .34) }; }
      const M = st.mix || {}; Object.entries(ch).forEach(([n, c]) => { c.s.gain.setTargetAtTime(st.verb * (c === ch.drums ? .4 : 1), t, .5); c.g.gain.setTargetAtTime(BASE[n] * (M[n] ?? 1), t, .5); });
      out.gain.setTargetAtTime(st.gain, t, .5); return fell; };
    const halt = t => { if (origNow) { origNow.g.gain.setTargetAtTime(0, t, .05); origNow.stop(t + .3); origNow = null; } };
    function origAt(s, t, bpm) {                 // EASE: the recording under the band, re-cued at the top of every loop so it can't drift off the score
      const fade = (src, t0, len) => { src.g.gain.setTargetAtTime(0, t0, len / 3); src.stop(t0 + len + .05); };
      if (!st.orig || !clip.buf) { if (origNow) { fade(origNow, t, .4); origNow = null; } return; }
      if (origNow && s !== 0) return;
      const src = ac.createBufferSource(), g = ac.createGain(), off = (st.intro && cues++ === 0 ? clip.intro : clip.bar0) + s * 60 / bpm / 4, x = .012;   // (the first time through: from the very start)
      src.buffer = clip.buf; src.g = g; src.connect(g); g.connect(dest);
      g.gain.setValueAtTime(0, t - x); g.gain.linearRampToValueAtTime(st.orig / LEVEL, t + x);   // as loud as the recording plays at midday
      src.start(t - x, Math.max(0, off - x));
      if (origNow) fade(origNow, t - x, x * 2);
      origNow = src;
    }
    const osc = (type, f, t, end, det = 0) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; o.start(t); o.stop(end + .05); return o; };
    const adsr = (t, a, peak, dec, sus, end, rel) => { const g = ac.createGain(), p = g.gain; p.setValueAtTime(0, t); p.linearRampToValueAtTime(peak, t + a); p.setTargetAtTime(peak * sus, t + a, dec); p.setTargetAtTime(0, end, rel); return g; };
    const lp = (f, q = .7) => { const b = ac.createBiquadFilter(); b.type = "lowpass"; b.frequency.value = f; b.Q.value = q; return b; };
    const noiseHit = (t, type, f, q, peak, dec, dest2) => { const s = ac.createBufferSource(), b = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noise; b.type = type; b.frequency.value = f; b.Q.value = q;
      g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(.0005, t + dec); s.connect(b); b.connect(g); g.connect(dest2); s.start(t, Math.random() * .5); s.stop(t + dec + .05); };
    function lead(m, t, dur) {
      const f = hz(m), end = t + dur * .92, kind = st.lead, d = ch.lead.g;
      if (kind === "keys") {                     // electric piano: a bell-ish FM tone that dies away
        const c = osc("sine", f, t, end + .6), mo = osc("sine", f, t, end + .6), mg = ac.createGain(); mg.gain.setValueAtTime(f * 1.5, t); mg.gain.setTargetAtTime(f * .12, t, .25);
        mo.connect(mg); mg.connect(c.frequency); const g = adsr(t, .004, .9, .7, .35, end, .25); c.connect(g); g.connect(d); return;
      }
      if (kind === "lull") {                     // the hideout: a soft ocarina-ish voice, swelling in gently, a slow kind vibrato, a faint music box an octave up
        const g = adsr(t, .07, .62, .3, .62, end + .15, .38), flt = lp(1700), vib = osc("sine", 4.4, t, end + .8), vg = ac.createGain();
        vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(dur > .4 ? 7 : 2, t + Math.min(.6, dur)); vib.connect(vg);
        [["sine", 0, .78], ["triangle", -4, .18], ["sine", 1200, .07]].forEach(([type, det, a]) => { const o = osc(type, f, t, end + .8, det), og = ac.createGain(); og.gain.value = a; vg.connect(o.detune); o.connect(og); og.connect(flt); });
        flt.connect(g); g.connect(d);
        const o2 = osc("sine", f * 2, t, t + 1.6), g2 = ac.createGain(); g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(.12, t + .004); g2.gain.setTargetAtTime(0, t + .004, .5); o2.connect(g2); g2.connect(d);
        return;
      }
      if (kind === "volt") {                     // Volt Keep: a buzzy robot voice, its filter snapping open on each note and settling
        const flt = lp(1200, 3.5), g = adsr(t, .004, .78, .12, .62, end, .06), tu = st.tune || 0;
        flt.frequency.setValueAtTime(4600, t); flt.frequency.setTargetAtTime(1250, t + .01, .08);
        const vib = osc("sine", 6.2, t, end + .2), vg = ac.createGain(); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(dur > .4 ? 12 : 0, t + Math.min(.4, dur)); vib.connect(vg);
        [["sawtooth", -9, .38], ["square", 9, .3], ["square", 1200, .07]].forEach(([type, det, a]) => { const o = osc(type, f, t, end + .2, det + tu), og = ac.createGain(); og.gain.value = a; vg.connect(o.detune); o.connect(og); og.connect(flt); });
        flt.connect(g); g.connect(d); return;
      }
      if (kind === "pluck") {                    // the hub's mallet: a marimba-ish bar, its fourth partial and a little tick, all quick to fade
        [[1, 1, .42], [3.98, .28, .09], [9.2, .08, .03]].forEach(([r, a, dec]) => { const o = osc("sine", f * r, t, t + dec * 5 + .2), g = ac.createGain();
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a * .95, t + .004); g.gain.setTargetAtTime(0, t + .004, dec); o.connect(g); g.connect(d); }); return;
      }
      if (kind === "bell") {                     // music box: a pure tone with a couple of bright, quickly fading partials
        const wob = st.dark ? (() => { const l = osc("sine", .18 + Math.random() * .16, t, t + 7), lg = ac.createGain(); lg.gain.value = 11; l.connect(lg); return lg; })() : null;
        [[1, 1, 1.6], [3, .22, .5], [4.17, .12, .22]].forEach(([r, a, dec]) => { const o = osc("sine", f * r, t, t + dec * 4 + .3), g = ac.createGain(); if (wob) wob.connect(o.detune);
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a * .9, t + .003); g.gain.setTargetAtTime(0, t + .003, dec); o.connect(g); g.connect(d); }); return;
      }
      const flt = lp(kind === "bright" ? 2600 : kind === "soft" ? 2200 : 1500), g = adsr(t, kind === "warm" ? .03 : .008, .8, .14, .72, end, .09), tu = st.tune || 0;
      const parts = kind === "bright" ? [["square", 0, .5], ["sawtooth", 7, .32]] : kind === "soft" ? [["triangle", 0, .85], ["sine", 1200, .15]] : [["triangle", -8, .5], ["triangle", 8, .5], ["sawtooth", 0, .12]];
      const vib = osc("sine", 5.4, t, end + .2), vg = ac.createGain(); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(dur > .45 ? 9 : 0, t + Math.min(.45, dur)); vib.connect(vg);
      parts.forEach(([type, det, a]) => { const o = osc(type, f, t, end + .2, det + tu), og = ac.createGain(); og.gain.value = a; vg.connect(o.detune); o.connect(og); og.connect(flt); });
      flt.connect(g); g.connect(d);
    }
    function pad(name, t, dur, K) {
      const f = lp(st.lead === "bright" ? 1100 : 850), g = adsr(t, .28, st.pad, 1, 1, t + dur, .45); f.connect(g); g.connect(ch.pad.g);
      const wob = st.dark ? (() => { const l = osc("sine", .21, t, t + dur + 1.2), lg = ac.createGain(); lg.gain.value = 7; l.connect(lg); return lg; })() : null;
      VOICE[name].forEach(m => [-6, 6].forEach(det => { const o = osc(st.softPad ? "triangle" : "sawtooth", hz(m + K), t, t + dur + 1.2, det); if (wob) wob.connect(o.detune); o.connect(f); }));
    }
    function drone(m, t, dur) {                 // night: a low, steady tonic underneath everything
      const f = lp(260), g = adsr(t, 1.2, .55, 2, 1, t + dur, 1.4); f.connect(g); g.connect(ch.bass.g);
      [[m, 1], [m + 12, .35]].forEach(([n, a]) => { const o = osc("sine", hz(n), t, t + dur + 5), og = ac.createGain(); og.gain.value = a; o.connect(og); og.connect(f); });
    }
    function bass(m, t, dur) {
      const long = st.bass === "long", f = lp(long ? 420 : 650), g = adsr(t, long ? .04 : .006, 1, long ? .8 : .18, long ? .85 : .55, t + dur * .95, long ? .25 : .06);
      osc("triangle", hz(m), t, t + dur + .4).connect(f); const s = osc("sine", hz(m), t, t + dur + .4), sg = ac.createGain(); sg.gain.value = .8; s.connect(sg); sg.connect(f); f.connect(g); g.connect(ch.bass.g);
    }
    function drum(kind, t, v) {
      const d = ch.drums.g;
      if (kind === "kick") { const o = osc("sine", 140, t, t + .4), g = ac.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(46, t + .11);
        g.gain.setValueAtTime(1.1 * v, t); g.gain.exponentialRampToValueAtTime(.001, t + .34); o.connect(g); g.connect(d); }
      else if (kind === "snare") { noiseHit(t, "bandpass", 1900, .8, .55 * v, .17, d); const o = osc("triangle", 190, t, t + .12), g = ac.createGain(); g.gain.setValueAtTime(.35 * v, t); g.gain.exponentialRampToValueAtTime(.001, t + .09); o.connect(g); g.connect(d); }
      else if (kind === "hat") noiseHit(t, "highpass", 7500, .7, .2 * v, .04, d);
      else if (kind === "brush") noiseHit(t, "lowpass", 3200, .5, .2 * v, .24, d);
      else if (kind === "shaker") noiseHit(t, "highpass", 5200, .7, .09 * v, .06, d);
      else if (kind === "rim") noiseHit(t, "bandpass", 3300, 4, .45 * v, .035, d);
      else if (kind === "clank") { noiseHit(t, "bandpass", 2600, 9, .5 * v, .09, d); const o = osc("square", 1240, t, t + .1), g = ac.createGain(); g.gain.setValueAtTime(.07 * v, t); g.gain.exponentialRampToValueAtTime(.001, t + .07); o.connect(g); g.connect(d); }   // a metal clank
    }
    function arp(m, t, dur) { const hp = st.harp, f = lp(hp ? 2400 : 3000), g = adsr(t, hp ? .004 : .002, st.arp, hp ? .35 : .06, .2, t + dur * (hp ? 2.4 : .8), hp ? .3 : .04); osc(hp ? "sine" : "square", hz(m), t, t + dur * (hp ? 3 : 1) + .2, st.tune || 0).connect(f); f.connect(g); g.connect(ch.arp.g); }
    function slotAt(s, t, bpm) {                // everything that starts on this sixteenth
      const K = st.key || 0, cn = c => st.dark ? DARK[c] || c : c;      // the night version's key and chords
      const sl = 60 / bpm / 4, inBar = s % BAR, half = Math.floor(s / 8) % CH.length, chord = cn(CH[half]);
      if ((st.mix || {}).lead !== 0) (MELAT[s] || []).forEach(([, len, m]) => lead((st.dark ? m + (S.darkLead[m % 12] || 0) : m) + K, t, len * sl));   // (midday on the waves: the recording alone)
      if (s % 8 === 0) {                       // a new chord on each change (or bar line), held to the end of the bar while it lasts
        const prev = cn(CH[(half - 1 + CH.length) % CH.length]);
        if (st.pad && (inBar === 0 || prev !== chord)) pad(chord, t, (inBar === 0 && cn(CH[(half + 1) % CH.length]) === chord ? 16 : 8) * sl, K);
      }
      if (st.drone && inBar === 0) drone(S.drone + K, t, BAR * sl);
      const r = ROOT[chord] + K, hs = s % 8;
      if (inBar === 0) origAt(s, t, bpm);
      if (!st.bass) { }
      else if (st.bass === "groove") { if (hs === 0) bass(r, t, 3 * sl); if (hs === 3) bass(r, t, 3 * sl); if (hs === 6) bass(r + 7, t, 2 * sl); }
      else if (st.bass === "walk") { if (hs === 0) bass(r, t, 4 * sl); if (hs === 4) bass(r + 7, t, 4 * sl); }
      else if (st.bass === "pump") { if (hs % 2 === 0) bass(r + (hs % 4 === 2 ? 12 : 0), t, 1.6 * sl); }   // Volt Keep: octave eighths, like a piston
      else if (st.bass === "tres") { if (inBar === 0 || inBar === 6) bass(r, t, 5 * sl); if (inBar === 12) bass(r + 7, t, 4 * sl); }   // 3 + 3 + 2 eighths
      else if (hs === 0) bass(r, t, 8 * sl);
      if (st.drums) { const P = DRUMS[st.drums]; for (const k in P) P[k].forEach(([x, v]) => { if (x === inBar) drum(k, t, v); }); }
      if (st.arp && (!st.harp || s % 2 === 0)) { const V = VOICE[chord]; arp(V[(st.harp ? s / 2 : s) % V.length] + 12 + K, t, sl); }   // (the harp plucks every other step)
    }
    return { out: comp, setStyle, slotAt, halt };
  }

  // the live player: a look-ahead scheduler on the game's audio context. Each arrangement (an hour's style at its tempo) is its own band;
  // when the clearing changes, the new one comes in while the last one fades away under it (a crossfade, not a cut). Since 2026-10-23
  // (the user: "make sure there's a fadeout cross over always for songs from times of day. now that it'll change more frequently, it can
  // seem jarring"): 3 s, equal-power (the outgoing along a cosine, the incoming along a sine: the two together hold their loudness through
  // it), and another hour's take on the same tune picks up where the tune is, not from the top
  const XF = 3;
  function fadeParam(p, from, to, t, dur) {          // an equal-power fade of p from `from` to `to` over dur (twelve straight pieces: cancellable, unlike a value curve)
    p.cancelScheduledValues(t); p.setValueAtTime(from, t);
    for (let i = 1; i <= 12; i++) { const x = i / 12, k = to > from ? Math.sin(x * Math.PI / 2) : 1 - Math.cos(x * Math.PI / 2); p.linearRampToValueAtTime(from + (to - from) * k, t + x * dur); }
  }
  let curVol = -1, ac0 = null, master = null, playing = false, timer = 0, stopAt = 0, want = 0, song = 0, wantBpm = SONGS[0].bpm, players = [];
  let xfNext = 0, xfUntil = 0;                       // (one quicker crossfade: out of a hub or a hideout, the room's own song back sooner. The user, 2026-10-25)
  function tick() {
    if (!playing) return;
    const now = ac0.currentTime;
    if (stopAt && now >= stopAt) { playing = false; stopAt = 0; clearInterval(timer); players.forEach(p => { p.band.halt(now); p.g.disconnect(); }); players = []; return; }   // faded out: stop playing
    const cur = players[players.length - 1];
    const SG = SONGS[song], waiting = SG.STYLES[want].orig && SG.clip.busy && (!cur || cur.k !== want || cur.song !== song);   // the recording is still decoding (a moment): wait for it rather than start without it
    if (!waiting && (!cur || cur.k !== want || cur.song !== song || Math.abs(cur.bpm - wantBpm) > .01 || cur.gloom !== gloom || (cur.fellBack && SG.clip.buf))) {
      const t = now + .06, g = ac0.createGain(), band = Band(ac0, g, SG), fellBack = band.setStyle(want, t), X = xfNext && now < xfUntil ? xfNext : XF; xfNext = 0;
      const keep = !!cur && cur.song === song && cur.loop === SG.LOOP && !SG.STYLES[want].orig && !(SG.STYLES[cur.k] || {}).orig;   // (the same tune: on from where it is)
      g.connect(master); if (cur) fadeParam(g.gain, 0, 1, t, X); else { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + .05); }
      if (cur) { fadeParam(cur.g.gain, cur.g.gain.value, 0, t, X); cur.end = t + X; }
      players.push({ k: want, song, loop: SG.LOOP, bpm: wantBpm, band, g, fellBack, slot: keep ? cur.slot : 0, tNext: keep ? Math.max(t, cur.tNext) : t, end: 0, gloom });
      while (players.filter(p => !p.end || p.end > now).length > 2 || players.length > 4) { const p = players.shift(); p.band.halt(now); p.g.disconnect(); }   // skimming through hours: keep it to a couple of bands
    }
    players = players.filter(p => { if (p.end && now > p.end + .35) { p.band.halt(now); p.g.disconnect(); return false; } return true; });
    for (const p of players) while (p.tNext < now + .3 && (!p.end || p.tNext < p.end)) { p.band.slotAt(p.slot, p.tNext, p.bpm); p.tNext += 60 / p.bpm / 4; p.slot = (p.slot + 1) % p.loop; }
  }
  return {
    start(ac, vol) {
      if (ac0 && ac0 !== ac) { clearInterval(timer); players.forEach(p => { try { p.g.disconnect(); } catch (e) { } }); players = []; playing = false; stopAt = 0; ac0 = null; curVol = -1; }   // (a new audio context: the game made one anew after a phone cut the last one off. Start again on it)
      if (!ac0) { ac0 = ac; master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination); }
      if (SONGS[song].STYLES[want].orig) decodeClip(ac, SONGS[song]);
      if (stopAt || !playing || Math.abs(vol - curVol) > 1e-4) fadeParam(master.gain, master.gain.value, vol * LEVEL, ac.currentTime, XF);   // fades in under the outgoing recording (equal-power, as it goes); or to a new level (the story's voice over it)
      curVol = vol;
      stopAt = 0;
      if (playing) return;
      playing = true; tick(); timer = setInterval(tick, 40);
    },
    restart(fade = .3) {                       // from the top (a reset after a knock-out): what's playing fades quickly and a fresh band starts the tune again
      if (!ac0 || !playing) return; const now = ac0.currentTime, t = now + .05, SG = SONGS[song];
      players.forEach(p => { if (!p.end || p.end > t + fade) { const g = p.g.gain; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + fade); p.end = t + fade; } });
      const g = ac0.createGain(), band = Band(ac0, g, SG), t0 = t + fade * .6, fellBack = band.setStyle(want, t0);
      g.connect(master); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t0 + .05);
      players.push({ k: want, song, loop: SG.LOOP, bpm: wantBpm, band, g, fellBack, slot: 0, tNext: t0, end: 0, gloom });
    },
    stop(fade = .12) { if (!ac0 || !playing || stopAt) return; const now = ac0.currentTime;   // (a fade of a second or more: equal-power, under the incoming recording)
      if (fade >= 1) fadeParam(master.gain, master.gain.value, 0, now, fade); else master.gain.setTargetAtTime(0, now, fade / 3); stopAt = now + fade + .05; },
    setSong(i) { song = Math.max(0, Math.min(SONGS.length - 1, i | 0)); },   // 0: the woods (original) · 1: the waves (original) · 2: Volt Keep (original) · 3: Loof's sky (original) · 4: Sirocco's dunes (original) · 5: Evil June's (original) · 6: Kesh's garden (original) · 7: Vinella's candy works (original) · 8: Crux's city (original)
    setGloom(v) { gloom = !!v; },
    quickFade(sec) { xfNext = sec; xfUntil = (ac0 ? ac0.currentTime : 0) + 2; },   // (the next change, if it comes in the next 2 s, crossfades over sec instead of 3 s)                // (the uprising at 75%: darker everywhere, a touch slower)
    setHour(k, tempo = 1) { const SG = SONGS[song]; want = Math.max(0, Math.min(SG.STYLES.length - 1, k)); wantBpm = (SG.STYLES[want].bpm || SG.bpm * tempo) * (gloom && !SG.STYLES[want].serene ? .92 : 1); if (SG.STYLES[want].orig && ac0) decodeClip(ac0, SG); },
    EASE, SERENE, EJ: 5, HUB,
    tick,
    get state() { const c = players[players.length - 1] || {}, clip = SONGS[song].clip; return { playing, song: c.song ?? song, hour: c.k ?? want, want, bpm: c.bpm ?? wantBpm, slot: c.slot ?? 0, bands: players.length, clip: clip.buf ? "ready" : clip.busy ? "decoding" : "none" }; },
    // test helper: render the score offline (seconds of audio at one hour) → AudioBuffer
    async render(sec, k = 0, tempo = 1, sr = 44100, si = 0) {
      const SG = SONGS[si], oc = new OfflineAudioContext(2, Math.ceil(sec * sr), sr);
      if (SG.STYLES[k].orig) { decodeClip(oc, SG); while (SG.clip.busy) await new Promise(r => setTimeout(r, 50)); }
      const g = oc.createGain(); g.gain.value = LEVEL; g.connect(oc.destination); const b = Band(oc, g, SG); b.setStyle(k, 0);   // as heard in the game (the master scales by LEVEL)
      const bp = SG.STYLES[k].bpm || SG.bpm * tempo; let t = .05, s = 0; while (t < sec) { b.slotAt(s, t, bp); t += 60 / bp / 4; s = (s + 1) % SG.LOOP; }
      return oc.startRendering();
    },
  };
})();
