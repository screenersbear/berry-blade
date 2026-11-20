# Berry Woods — level sheet (for remaking the woods as Blender models)

Written Nov 20, 2026, from the game code in this repo (`index.html`, `clayroom.js`, `level-edits.js`). Target: **a computer first, phones still
able to play.** Every piece gets two budgets: the full computer model, and a lighter phone version that the phone build swaps in.

**Read this first: the repo was behind.** The newest commit here is Nov 18, 5:01 PM ET (Camila's big arm, behind `?heromodel`). The Beach
sheet (`models/levels/beach/LEVEL-SHEET.md`, written on the Mac the evening of Nov 18) is not in the repo, and neither is
`models/bosses/BOSS-SHEETS.md`. So this sheet could not copy the Beach sheet's headings word for word; it uses the order the brief asked for
(what's there, gameplay or scenery, size, how many, does it move, how the editor places it, then shared pieces, speed, and what to model first).
If the Mac copy of the woods changed after Nov 18, the room list below may be out of date: check the rooms marked (*) first, they were the
most recently reworked.

How things were measured: room layouts, sizes and counts are read straight from the code (`authorForest()` in `index.html` holds the whole
hand-made map). Triangle counts for today's clay rooms were measured by running the game's own `clayroom.js` (`dress()`) under three.js r160
(the game's version) for sample rooms. Set pieces (the big trees, bridges and so on), baddies and the heroes are **not** in those numbers.
Anything marked *est.* is an estimate.

---

## 1. Units, the room and the camera

| | Game px | 3D units (models) |
|---|---|---|
| Scale | 40 px | 1 unit (`S = 1/40`) |
| One room, left to right | 2,560 px | 64 units |
| One row of the map (floor to floor) | 440 px | 11 units |
| The floor | y = 470 px | y = 0 |
| Heroes walk at | | z = 0 (toward the camera is +z) |
| Path depth used by platforms | | about z −1.3 to +1.3 |
| Back bank / far woods | | z −3 to −40 (far hills to −46) |

Height of anything placed at game y: `units = (470 − y) / 40`. A platform at y 330 stands 3.5 units up.

The camera: 32° tall field of view, 19.25 units back (`CAM_Z 17.5 × 1.1`). On a 16:9 screen it shows about **11 units tall and 20 units
wide, roughly 790 px of the room's 2,560**: about a third of a room at a time.

**Important for budgets:** a room is built whole and its scenery is merged into a few big meshes, so the whole room is drawn every frame,
not just the third you can see. Near a row's floor or ceiling the room above or below is drawn too (up to three rooms, each clipped at the
seam). So the budgets below are **per room**, with headroom for a neighbour.

---

## 2. The rooms

The woods are an 8 × 4 grid (rows A to D, columns 1 to 8), plus a background row behind rows A and B (BA, BB), a hidden cove, and Glos's
home. 31 grid rooms are used (B1 is solid earth).

| Row | Rooms | What it is |
|---|---|---|
| A (ridge, the canopy) | A1 Camila's rocks and the bridge ladder · A2–A3 rope bridge over the canopy, two ceiba crowns · A4 bridge end, Glos's statue · A5 rest stop under the willow · A6 top of the giant tree (mini boss) · A7 the leaning tree's top, a gap down · A8 high ledge, the tall tree's crown | Up high: open sky, the forest's roof below |
| B (the woods) | B2–B3 the two ceiba trunks, Camila's climbs · B4 hollow in the tan earth, crumbling ledges (dark) · B5 under A5's ground, a hole down · B6 the giant tree's trunk in front of you (dark) · B7 rest stop, the leaning tree, sun shafts · B8 **Glos boss**, wooden stand, the tall tree's trunk | The woods' floor |
| C (ravine) | C1 way in from the beach, a tall post · C2 two slabs, a rock step · C3 Camila's rock up to B3 · C4 the beps' hideout, a hole, Rose's tall grass · C5 stairs (*) · C6 the giant tree, a hole down (dark) · C7 the leaning tree, the jut ledge and crawl hole · C8 Glos's hall | Down in the ravine, an earth wall behind |
| D (root caves) | D1 **Glos boss** (way out west), 3 slabs · D2 the pond, 3 malanga leaves that break, the gong · D3 mini boss, maga tree · D4 two slabs up to C4 · D5 the hub, pale pillars · D6 the giant tree's roots and ledges (dark) · D7 the leaning tree's foot, 2 long slabs · D8 **Glos boss** (way out east), hanging greenery (dark) | Under the ravine, roofed |
| BA (background, upper) | BA1–BA3 the two-tier red bridge · BA3 Glos's vines (burn them) and a ladder down · BA4 zoomed-out silhouette walk on Glos's vine loops · BA5 rest stop, a tree · BA6 the bluff and its island | Behind row A |
| BB (background, lower) | BB2 tree branches and a vine walk · BB3 treetops underfoot, a ladder up · BB4 far woods, vine loops hang in · BB5–BB6 ledges up the land's face, the walkway back to B6, a great tree closing the end | Behind row B, floors 200 px lower |
| Extras | The hidden cove (a beach room, built by the Beach's own builder) · C9 library · C10 bedroom (Glos's home, built by the home builder) | |

The boss rooms are B8, D1 and D8. Rest stops: A5, B7, BA5. Hub: D5.

---

## 3. The pieces

Columns: **Play** = you stand on it (S), it blocks you (B), you grab, climb or hit it (G), or scenery only (—). **Size** in units unless
marked px. **Per room / on screen** = how many in a room, and about how many in view at once (a third of the room). **Moves** = what
moves it. **Editor** = how the level editor (or the room's data) places it; a model must take the same numbers. Budgets are triangles.

The platforms' collision comes from the room's numbers, never from the mesh. So a model only has to **look right on those numbers**: its
standing surface flat at the given height, as wide as the given width.

### 3a. Ground, walls and the land overhead (every room)

| Piece | Play | Size | Per room / on screen | Moves | Editor | Computer | Phone |
|---|---|---|---|---|---|---|---|
| **Floor run**: grass on top, banded red soil face down to the room's underside, pebbles and roots in the face | S | Floor 2.7 deep at the front edge; soil face about 2 units tall (to the seam under it); runs the room's width, cut at holes and steps | 1–3 runs, all in view | No | `ground` (slope points `[x, dy]`), `gaps` `[a, b]`, `steps` | **6,000 per 10-unit tile** (about 40K a room) | 1,500 per tile (10K a room) |
| **Back bank**: a grass slab behind the path, bushes along it | — | z −3.25 to −9.5, the room's width + 14 each side | 1, all | No | Follows the floor | 15,000 a room | 4,000 |
| **Ravine wall** (rows C, D): soil lip, a green bank sloping up to the woods' floor, ferns and big leaves on it | — | Lip about 1.5 tall at z −9.6, slope back to z −16.5 rising 6 units | 1, all | No | Row decides it | 25,000 a room (not counting its ferns, below) | 6,000 |
| **End wall of earth** (`earth`, `earthBack`): a wall where the map has no room; a tunnel door (B5), a crawl hole (C7) | B | 9 units deep, 24 tall; door 5 tall | 0–2 | Door opens when Camila smashes it (B5) | `set: {k: "earth", side, col, col2, door, hole}` | 12,000 each | 3,000 |
| **Land overhead** (`ceils`): earth over the path with roots hanging and pale glowcaps | B (a roof) | Underside at the given y, the room's width | Rows C, D, B4–B5; all | No | `ceils: [x0, x1, y]` | 15,000 a room | 4,000 |
| **Pit edge** (a hole down): the earth cut through, rocks and hanging roots down each side | — | 2.2 down each side | 0–2 | No | `gaps` | 3,000 each | 800 |
| **Sky** | — | One flat clay colour per hour | 1 | Colour by the hour | Hour | Keep as is (2 triangles) | Same |
| **Far backdrop**: clouds, pressed hills, far woods silhouettes (two layers of trunks and crowns), the canopy below (row A) | — | z −26 to −46 | 1 set per room, made once and kept | No | — | **60,000** a room (measured today: 45K–68K at full detail) | 25,000 (measured 23K–36K) |

### 3b. Platforms (placed in the editor; `plats: [x, y, w, kind]`)

Every platform is stretched to its width. **Model them as three pieces, a left end, a middle that repeats, and a right end**, so any width
from the data looks right without stretching the texture. Their tops must sit exactly at `(470 − y) / 40`.

| Kind | What it looks like (today's clay) | Play | Size in the map | Count in the woods | Moves | Computer | Phone |
|---|---|---|---|---|---|---|---|
| `slab` (or no kind) | A floating slab of grass on an earth block, set back 0.78 so heroes walk in front of its face | S | w 220–920 px (5.5–23 units), mostly 220–500; block 1.05 tall, 1.15 deep | About 30 across the woods; 0–3 a room | B4's four **crumble** (give way 0.7 s after you land) | 2,000 per end + 1,500 per middle tile (3 units) | 500 + 400 |
| `shroom` | A great malanga leaf lying flat on a curved stalk down to the ground | S | w 180–240 px (4.5–6 units) + 0.8 overhang | A5, A6, D2 (3) | D2's three **break on your third step**, the gong rebuilds them | 3,000 | 800 |
| `fungus`, `fungus2` | A red (or orange) mushroom shelf on a tall tree trunk, cream spots | S | w 150–200 px; trunk up from the ground to 5 units over the shelf | Old rooms only; none in the hand-made woods today | No | 4,000 shelf + trunk from the trunk kit | 1,000 |
| `log` | A fallen log with rings | S | w 160–200 px, 0.72 thick | Old rooms only | No | 2,500 | 600 |
| `jut` | The row above's land jutting out over the path, ragged end, roots hanging | S | C7: from x 1640 to past the room's end, 2.3 thick, 12.4 deep | 1 (C7) | No | 15,000 | 4,000 |
| `bridge` | Rope-and-plank bridge: planks on two beams, rope rails at hip height, posts where it ends | S | 455–2,650 px long; at y 190 (7 units up) | A1–A4 (one long bridge), B8 | No | 400 per plank segment (about 25K for A2's full span) | 120 per segment |
| `deck` | The red bridge's two tiers: lower deck the floor, upper deck a jump up, posts and rails | S | 1,700–2,640 px, upper deck at y 350 | BA1–BA3 | No | 35,000 a room | 9,000 |
| `vine` | Glos's free-standing vines you walk along (tube along a path) | S | 110–1,080 px pieces | BA4, BA5, BB2, BB4 | No | 3,000 per 10 units of vine | 800 |
| `branch`, `crown` | A background tree's bough, a treetop you can stand on | S | 230–650 px | BB2, BB3 | No | 3,000 each | 800 |
| `turf`, `span` | Land's top on the bluff; a ledge across a room's edge | S | 220–960 px | BA6, BB5, BB6 | No | 2,000 + 1,000 per tile | 500 + 250 |
| `lip`, `wshelf`, `chand`, `bed`, `stand2`, `hole` | Glos's home (C8–C10) furniture you stand on | S | Various | C8–C10 | Lossst stands on the chandelier | Out of this sheet: the home rooms have their own builder | |

### 3c. Climbing and ways between rooms

| Piece | Play | Size | Where | Moves | Editor / data | Computer | Phone |
|---|---|---|---|---|---|---|---|
| **Ladder** (two rails, rungs every 0.36, hooks over the top) | G | 0.62 wide; as tall as the climb (B3 to A4, BA3 to BB3: 360 + 200 px) | B3, BA3/BB3, A1/A4 poles | No | `up`, `upX`, `down`, `downX`, `poles` | 300 per 1 unit of height (rungs repeat) + 600 for the hooks | 80 per unit |
| **Camila's rock** (her zigzag grips up a face, vines on it; also side-on on an end wall, and its top where she climbs over) | G | 15 grips, 11.4 tall; 9.5 wide at the top lip | C3 → B3, B2 → A2 (side on), B3 top | No | `climbUp {x, to}`, `set: camRock / camSide / camTop` | 12,000 | 3,000 |
| **Giant tree's shelves**: bracket fungus ledges out of the trunk, mossy | S, G | Half discs, w from the climb's ledges | D6 → C6 | No | `climbUp`, `set: {k: "shelves"}` | 2,500 each | 600 |
| **Crawl hole** in the wall | G | 62 px tall | C7 ↔ C8 | No | `crawl` | Part of the earth wall | |
| **Walkway** (`bwFoot`): stairs up off the floor, then level, off into the distance | S | A1 ↔ BA1, B6 ↔ BB6 | 2 | No | `bwalk`, `set: {k: "bwFoot"}` | 10,000 | 2,500 |
| Zip lines | | | **None in the woods** (the waves have them) | | | | |
| Water | Swim / fall back | D2's pond (fills the gap), the cove | | Surface animates (keep the game's water) | `set: {k: "pond"}` | Lily pads 300 each, reeds 200 each | Same, fewer reeds |

### 3d. The big trees (one-offs, each crosses several rooms)

These are the woods' landmarks and the best first models after the kits. Each is split into the parts the rooms ask for (`part`), so a part
only has to look right in its own room, cut at the seam.

| Tree | Rooms (part) | Play | Size | Moves | Editor / data | Computer (per part) | Phone |
|---|---|---|---|---|---|---|---|
| **The giant tree** (orange-brown bark, deep furrows, moss) | A6 `top` (fork, two great limbs), B6 `trunk` (in front of you, fades when you're behind it), C6 `trunk`, D6 `roots` | — (its shelves are S) | Trunk 5.6 wide, about 44 tall over four rows; at x 1380, z +4.4 in front or −3.4 behind | **Fades see-through** when a hero is behind it (A6, B6) | `set: {k: "giant", part, x, z, fg}` | **60,000** | 15,000 |
| **The two ceibas** (grey trunks on buttress roots, flat crowns in bloom) | B2, B3 trunk (`crown: false`, h 40); A2, A3 crown (h 18.4, crownK 1.75, pink and orange blossom) | — | ×1.3 scale; crowns about 25 wide; z −5 | No | `set: {k: "ceiba", x, base, h, z, scale, crownK, crownBack, bloom, foot, leaves}` | 50,000 | 12,000 |
| **The leaning tree** | A7 `top` and `boughs` (in front), B7 `lean`, C7 `mid`, D7 `foot`, D8 `peek` (its roots) | — | Leans east as it rises; z −3.4 | No | `set: {k: "leaner", part, x}` | 40,000 | 10,000 |
| **The tall tree** | B8 `trunk`, A8 `crown` (great leaves) | — | Trunk 1.6 wide, about 24 tall; z −3.2 | No | `set: {k: "tall", part, x, top}` | 25,000 | 6,000 |
| **The willow** (rest stop) | A5 | — | h 7.4, crown spread 12.5 (covers most of the screen), a shade disc under it | No | `set: {k: "willow", x, h, spread, trunkK, thick}` | 40,000 | 10,000 |
| **Background trees** (`bgTree`): trunk, standable boughs, a crown | BA5, BB2 (two), BB3 (two), BB6 (the great tree that ends the row) | Boughs S | r 0.7–5.4, crowns 2.8–6.5 | No | `set: {k: "bgTree", x, base, top, r, z, reach, crown, roots}` | 20,000 (40,000 for BB6's) | 5,000 |
| **The maga tree** (crimson flowers) | D3, at the back | — | h 4.2, z −6.4 | No | `set: {k: "maga", x}` | 15,000 | 4,000 |

### 3e. Forest fill (stamped many times; today's biggest cost)

Today's clay woods build these once and stamp copies all over each room, then merge them. Counts are per room (measured), on screen is about
a third. **These should be instanced** (one model, drawn many times) rather than merged copies.

| Piece | Play | Size | Row C/D room | Row B room | Row A room | Moves | Today, each (full / half detail) | Computer | Phone |
|---|---|---|---|---|---|---|---|---|---|
| Ground fern | — | about 1.1–1.9 across | **96** | 17 | 0 | No | 2,660 / 980 | **1,200** | 300 |
| Big bush (with berries, 4 colourings) | — | 1–1.4 | 38 | 16 | 9 | No | 3,600–6,000 / 1,550 | **2,500** | 600 |
| Small bush (behind the path) | — | 0.55 | 9 | 9 | 9 | No | 5,900 / 1,500 | 1,500 | 400 |
| Flower (red, pink, yellow, white; on the lip and lying in the grass) | — | 0.5–1 | 63 | 63 | 63 | No | 840 / 216 | 300 | 80 |
| Clover pressed on the earth | — | 1.15 | 7 | 7 | 7 | No | 1,550 / 350 | 300 | drop on phones |
| Tall pale trunk (near and far) | — | r 0.36–0.78, tall | 54 | 53 | 0 | No | 365 / 150 | 1,000 near, 300 far | 250 / 100 |
| Sierra palm (shared with the Beach) | — | 7–10 tall | 7 | 4 | 7 | No | 1,060–1,900 / 800 | 4,000 near, 1,500 far | 1,000 / 400 |
| Tree fern | — | 3.4–5.2 tall | 2 | 2 | 4 | No | 1,180 / 560 | 2,500 | 600 |
| Flamboyán in flower | — | wide umbrella crown | 4 | 3 | 0 | No | 640 / 590 | 4,000 | 1,000 |
| Bamboo clump | — | 16 tall | 0 | 3 | 0 | No | 4,100 / 2,700 | 2,000 | 500 or drop |
| Big leaf on the ravine wall | — | 1–1.7 | 44 | 0 | 0 | No | 380 | 200 | 60 |
| Pebble in the soil | — | 0.15–0.56 | 47 | 32 | 32 | No | 190 / 48 | 100 | drop on phones |
| Hanging root | — | 0.75–1.25 | 16 | 16 | 16 | No | 460 / 110 | 300 | 80 |
| One round tree on the floor | — | 5.4–6 tall | 1 | 1 | 1 | No | 8,300 / 2,000 | 6,000 | 1,500 |
| Undergrowth (D2): malanga, ferns, heliconia, tree ferns | — | | 70 in D2 | | | No | | Use the kit above, instanced | Half as many |
| Hanging greenery (D8's `curtain`): 260 strands | — | 0.6–6.4 long | D8 | | | No | 2 each | Swap for 6–10 leafy cards (about 3,000) | 1,000 |
| Canopy overhead (`canopy`, B4–B6): 60 dark leaf blobs, 26 dark trunks, lianas | — | blobs 2.2–4.2 | B4, B5, B6 | | | No | | 15,000 | 4,000 |
| Leaf roof (`fringe`, A7–A8) | — | blobs 1.8–2.8 | A7, A8 | | | No | | 10,000 | 3,000 |

### 3f. One-off props and things you can use

| Piece | Where | Play | Size | Moves | Editor / data | Computer | Phone |
|---|---|---|---|---|---|---|---|
| **The mountain** (rock wall, Camila's breakable rocks in a doorway, its face drawn in front of you) | A1 | B, G | 22 tall, from x 110 to 330 px + 16 back | Rocks smash open (Camila) | `set: {k: "mountain", x0, x1}`, `secret` | 25,000 | 6,000 |
| Breakable rocks, cuttable tall grass, burnable vines (the secret doors) | A1, B5 (rocks); C4/C5 (grass); BA3 (vines) | B until opened | About 5 tall | Open for good once broken, cut or burnt | `secret: {who, x, side, door, tall, key}` | 8,000 each | 2,000 |
| **Glos's statue** | A4 | — | Glos's height, confident pose | No | `statue: {x}` | 20,000 *est.* | 5,000 |
| **Glos's vines** (her arms grown free: tubes along paths, some ending in hands) | BA3 (the burnable door), BA4–BA5 (rings you walk on), BB2, BB4 | S where they're `vine` platforms | Thickness 0.14–0.55 | Burn (BA3) | `set: {k: "glos", paths, dy}` | 3,000 per 10 units | 800 |
| **Red bridge** (two tiers, posts, rails) | BA1–BA3 | S | See `deck` | No | `set: {k: "redBridge", x0, x1, brk, end0, end1, gapF}` | In `deck` above | |
| **Land** (`bgLand`: earth, turf, strata, rock; ragged ends) | BA3–BA6, BB5–BB6 | S, B | From x0 to x1, top to bot (up to the whole row) | No | `set: {k: "bgLand", x0, x1, top, bot, ragged, z0, z1}` | 6,000 per 10 units | 1,500 |
| **Treetops** you walk on (crowns packed under the floor) | BB2–BB4 | S | Floor of crowns, x0 to x1 | No | `set: {k: "treetops", x0, x1, y}` | 30,000 a room | 8,000 |
| **The background seen small** (`woodsFar`) | A1–A6, B5, B6 | — | Far off | No | `set: {k: "woodsFar"}` | 20,000 | 5,000 (or a picture) |
| **Wooden stand** under the bridge platform (posts, braces, beam) | B8 | S (its bridge) | 680 px long, 3.5 up | No | `set: {k: "stand", x}` | 6,000 | 1,500 |
| **Pale green pillars** hanging from the room above | D5 | — | r 0.55–0.75, 10 tall | No | `set: {k: "pillars", xs}` | 3,000 each | 800 |
| **Gong** (the switch that rebuilds D2's leaves) | D2 | G (hit it, or a thrown buddy) | | Hit to rebuild the leaves | `gong: {x, y}`, `set: {k: "gong"}` | 4,000 | 1,000 |
| **Sun shafts** (additive light planes) | B7, every room's light shafts | — | 3–5 wide, 16 tall | No (light planes) | `set: {k: "sun", x0, x1}` | Keep as is (planes) | Fewer |
| **Beps' hedge door** (bushes that part, a glow) | C4 | G | About 2 wide | Opens | `bep` | 4,000 | 1,000 |
| Floating motes | Every room | — | Points | Drift | — | Keep (160 points) | Keep |
| Items, gifts, fruit, cassettes, gears | Many | G | Small | Picked up | `items`, `gifts` | Not scenery; out of this sheet | |

---

## 4. What the woods share with the Beach

The Beach sheet listed palms, forest plants, ladders, rocks, rock platforms, wooden planks, posts and rails. In the woods:

| Shared piece | In the woods | In the Beach | Notes |
|---|---|---|---|
| **Palms** | Sierra palms in the fill (rows A–C), royal palms far back | Coconut palms | The game already makes both with one clay builder (`BerryClayRoom.palm`, a `coco` switch). One palm model with a coconut variant serves both. |
| **Forest plants** | Ferns, malanga, heliconia, plantains, bromeliads, bushes, tree ferns, flamboyán | The beach's two back-woods rooms (THE BACK WOODS, THE THICKET) are built by the woods' own builder | Literally the same set. Model once. |
| **Ladders** | B3 → A4, BA3 → BB3, the bridge poles | Beach ladders | One builder (`buildLadders`) for every world. |
| **Rocks** | Limestone boulders, pebbles in the soil, pit-wall rocks, the A1 mountain, Camila's breakable rocks | Beach rocks | One rock kit in two colourings (woods: mossy grey and lavender; beach: its own). |
| **Rock platforms** | `slab` (grass on an earth block; was mossy limestone on karst pillars) | `rock` | Same three-piece stretch method (ends + repeating middle). |
| **Wooden planks** | Rope-and-plank bridge (A1–A4, B8), the red bridge's decks, B8's stand | `plank` boardwalk, `tee` | One plank-and-beam kit; the red bridge is a painted variant. |
| **Posts and rails** | Bridge end posts and poles, rope rails, the red bridge's rails, the stand's posts | Beach posts and rails | Same kit. |
| **The hidden cove** | A beach room inside the woods (off A1) | Built by the Beach's builder | Entirely Beach pieces. |

---

## 5. What would most affect speed on a computer

1. **The small plants.** Ferns, bushes and flowers are 60–70% of a room's triangles today. A ravine room (rows C, D) at full detail measured
   **about 830,000 triangles of scenery, 255,000 of them ferns alone** (96 ferns at 2,660 each). Row B rooms measured about 510,000,
   row A about 340,000. Instancing them and giving each a modest budget (section 3e) is the single biggest win.
2. **Whole rooms drawn at once.** The camera sees a third of a room, but the merged scenery is drawn whole, and up to three rooms near a
   seam. Keep every room under the budget below, and let the far-back fill use its phone model even on a computer (it's tiny on screen).
3. **The clay look draws things twice.** Pieces that cast clay shadows are drawn again into the shadow map (2,048 px) and for the creases.
   Small fill and anything far back should not cast.
4. **The big trees as hundreds of small boxes.** The giant tree adds furrow boxes along every limb; one model per tree part is far cheaper.
5. **Room-change hitches.** Today each room's clay is generated when you walk in (0.2–0.8 s for the scenery on the machine I measured on).
   Loaded models stamped into place remove most of that.
6. **See-through layers.** The pond, the sun shafts, the motes and D8's 260 hanging strands overdraw. Keep them few (cards, not strands).

**Today, for comparison** (scenery only, from `dress()`; set pieces add up to 130,000 more by the game's own clay budget, `CLAY_TRIS`):

| Room | Full detail (`?lite=0`) | Half detail (the phone build's default) |
|---|---|---|
| Row C / D (ravine) | 830,000–860,000 + far backdrop 68,000 | 270,000–280,000 + 36,000 |
| Row B | 510,000–610,000 + 68,000 | 150,000–180,000 + 36,000 |
| Row A | 340,000 + 45,000 | 90,000 + 23,000 |

---

## 6. Budgets (the headline)

| | Computer | Phone version |
|---|---|---|
| **One whole room** (ground, platforms, fill, set pieces, far backdrop; not the heroes or baddies) | **about 600,000 triangles** | **about 150,000** |
| Worst moment (a room plus the room above or below, plus the shadow pass) | under about 2 million drawn a frame | under about 500,000 |
| A big tree part (giant, ceiba, leaning, willow) | 40,000–60,000 | 10,000–15,000 |
| A platform | 2,000–6,000 at the usual widths | 500–1,500 |
| A small plant | 300–2,500 | 80–600 |

A row C room built to these numbers: fill about 400,000, ground and walls about 60,000, platforms about 15,000, far backdrop 60,000, a
big tree part 60,000, so about 595,000. The same room on a phone: about 150,000.

**How the phone version works.** The game already has a switch for this: the phone build turns on the lighter clay (`CLAY_LITE`; `?lite`
and `?lite=0` try either on a computer). Each model should be exported with **two meshes in the same file**, the full one and a `_phone`
one (about a quarter of the triangles, same outline and colours), and the game picks by that switch. Gameplay pieces (every platform,
ladder, bridge, climb, door, crumble ledge, the gong) must be **the same size and in the same place** on phones; only their detail drops.

**On phones, can be dropped:** pebbles, clovers, the flowers lying in the grass, bamboo, half of the far trunks, D8's hanging strands
(cards instead), half the canopy blobs, the woods-seen-small (a flat picture instead).
**On phones, keep but simplify:** everything else, ferns and bushes included (fewer of them is fine: about half the ravine's ferns).

---

## 7. What to model first

1. **The ground kit**: floor tile (grass + soil face), back bank, end wall with door and crawl hole, land overhead, pit edge. Every room
   uses it, and the Beach's back-woods rooms too.
2. **The platform kit**: `slab` ends + middle, malanga leaf (`shroom`), with crumble and break states. Every room, and the editor places them.
3. **The forest fill kit**: fern, big bush, small bush, flower, trunk, palm (+ coconut variant for the Beach), tree fern, flamboyán. This
   is where the speed is, and it's shared with the Beach.
4. **Wood kit**: ladder, rope-and-plank bridge with posts and rails (shared with the Beach's planks, posts and rails).
5. **The giant tree** (four rooms, the woods' landmark), then the leaning tree, the two ceibas, the tall tree and the willow.
6. **The background row**: red bridge, Glos's vines, background trees, treetops, land.
7. One-offs: the mountain, Glos's statue, pillars, maga tree, stand, gong, pond, the secret doors.

Glos's home (C8–C10) and the hidden cove are built by other builders (the home's and the Beach's) and are left out here.

---

## 8. Notes

- The level editor can change a room's `plats`, `ground`, `gaps`, `steps`, `gifts`, `items`, `set`, `theme`, `lookEd` and `dark` (and its
  baddies). Its edits are saved in `level-edits.js` (empty in this repo). Models replace only what is drawn: they must be built from those
  same numbers, the way the code builds today's pieces, so the editor keeps working.
- Pieces with sizes in their data (`ceiba h / scale / crownK`, `willow spread`, `bgTree r / top / crown`, `bgLand x0 / x1 / top / bot`)
  need either a few fixed versions to pick from, or parts that stretch (trunks in repeating sections, crowns scaled).
- Estimated (not measured): every budget in the Computer and Phone columns, the set pieces' current cost, and the "worst moment" figure.
  Measured: the room sizes, positions and counts from the map data, and today's clay scenery triangles and stamp counts.
