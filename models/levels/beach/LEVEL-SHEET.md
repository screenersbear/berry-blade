# The Beach: level sheet

Written 2026-11-18 by Claude Code, from the game's code (`buildBeach` in `index.html`, `clayroom.js`, `level-editor.js`)
and a test copy of the game at 16:9. Nothing in the game was changed. For the level modeling chat: read it before modelling
any Beach piece. The game's own code stays the source of truth: if this sheet and the game disagree, the game wins.

**Units.** 1 unit = 40 px in the game's own numbers. A hero (Camila) is 2.72 units tall. At 16:9 the screen shows about
17.8 × 10 units where the heroes walk; the palm row behind them shows about 24 units across. "In front" is toward the
camera (+z), "behind" is away from it (−z). The heroes walk on z = 0.

## The rooms

The Beach is world 9: 13 beach rooms in two rows (row C the beach, row B up on the bluff), plus the inside of the house
and two Woods rooms.

| Room | Name | What is in it |
|---|---|---|
| C1 | Home Beach | The house, hammock, table, beach chair; 5 platforms (2 driftwood, 2 rock arches, the boat); the 7 palms that fall in the opening. |
| C2 | Palm Shore | Two T-planks, a 10-unit step up, the cracked rock (a Berry Console game inside). |
| B2 | The Bluff | Up on the bluff; open over the sea, you drop to the room below. |
| B3 | Coconut Cove | A rock arch, a boardwalk, the sand rising up to the bluff. |
| C5 | The Boardwalk | An 11-unit cliff with a rope ladder up, a 45-unit boardwalk. |
| C8 | Driftwood Point | A boardwalk and a T-plank. |
| B4 | The Chair Rock | A rock shelf out of the high ground, the buddy's white chair, a charm (sunglasses). |
| C10 | The Old Winch | The crane, the bridge hung over a gap in the sand, the winch and its button. |
| C11 | The Forest's Edge | Two rock arches and a boardwalk; the rainforest starts, grass, far hills. |
| B5 | The Cliff Top | A rope ladder down. |
| C6 | The Water Tower | The water tower, its ladder, the top of the zip line, a gap you dive into. |
| C7 | The Landing | The bottom of the zip line, gaps. |
| C9 | The Lookouts | Two lookouts with ladders and buttons, a fence gate. |
| HOME | (inside the house) | Not the beach: left off this sheet. |
| C-1, C0 | The Back Woods, The Thicket | Built by the Woods' own builder already: they get Berry Woods' models, not these. |

## How the level editor treats the Beach

The editor (`level-editor.html`) changes only these parts of a room: **platforms** (left edge, height, width, and kind
from a list), the **ground line** (its points and steps), **gaps**, **gifts and items**, **set pieces** (moved along the
room, on the Background tab) and the room's **light**. Its saved changes go to `level-edits.js` (empty for the Beach today).

- C1 Home Beach and the inside of the house can't be edited ("not editable here").
- Every other Beach room is a tutorial room, so the editor shows a warning ("scripted parts") but still edits it.
- **Not in the editor at all:** palms, bushes, rocks, shells, starfish, sea, sky, clouds, the house, the beach chair,
  ladders, the zip line and the crane. The code puts them down. Scenery is placed from a seed tied to its place in the
  world, so a palm on the edge of one screen is the same palm on the next screen.

**So models can replace pieces without breaking the editor, keep these rules:**

1. **Platforms stretch.** The editor can make any platform any width and any height, and can turn one kind into another.
   So a platform can't be one fixed model. Make each kind as pieces: a top that repeats (or stretches) along its length,
   two ends, and supports (legs, posts, rocks) that the code stretches down to the sand at any height.
2. **The top of the model is the top of the platform.** The game stands you on the platform's top line, not on the
   model. The walking surface must sit exactly there, flat across its whole width.
3. **Keep the depth.** Platform tops reach about 1.2 units in front of the heroes and 1.2 behind (2.4 deep). Nothing
   gameplay-sized should come further forward, or it covers the heroes.
4. **The ground stays code-built.** Sand, slopes and cliffs follow the ground line the editor moves. Models can dress
   them (rock layers, boulders, a sand edge) as pieces the code lays along the line, not as one big shape.
5. **Names stay.** Platform kinds (`drift`, `rock`, `boat`, `plank`, `tee`, `shelf`, `tower`, `lookout`) and set pieces
   (`crack`, `gate`) keep their names: the editor's lists and saved rooms use them.
6. **Scenery is free.** Palms, bushes, rocks and the rest only change their look; the code keeps choosing where they go.

## Gameplay pieces

Gameplay = you stand on it, it blocks you, or you grab or use it. Height = the top above the sand, unless it says otherwise.

### Sand (the floor of row C)
- **Gameplay:** you stand on it.
- **Size:** the whole room (64 units long) and 14 units deep (from 5 in front of the heroes to 9 behind); a wet-sand
  slope runs from its back edge down into the sea.
- **On screen:** always.
- **Moves:** no (the foam line at its edge does; see Scenery).
- **Editor:** its shape is the ground line (points, steps) and the gaps. Keep it code-built; a model can only give it a
  surface look and edge pieces.

### High ground and cliffs (the bluff)
- **Gameplay:** you stand on top; the face blocks you.
- **Size:** B3 and B4 rise 6.75 units; C5's cliff is 11 units; C2's step is 10 units. B2 and B5 sit on top of the bluff,
  open over the sea.
- **On screen:** one cliff face at a time.
- **Moves:** no.
- **Editor:** the ground line. The face is built in layers of rock with boulders at its foot, kept clear of ladders.
  Models: a few rock-layer pieces and boulders the code stacks to any height.

### Gaps (open sea through the sand)
- **Gameplay:** you fall in (C6, C7, C10) or drop to the room below (B2, B5). C6's gap is the dive.
- **Size:** C10's is 17.5 units across. **Editor:** the Ground tab moves their ends. Nothing grows over a gap.

### Platforms (8 kinds)

All are placed by the editor (Pieces tab: kind, left edge, height, width). **On screen:** 1 to 3 at once.

| Kind | Look | Where | Width | Height | What the code builds |
|---|---|---|---|---|---|
| `drift` | driftwood log on two rocks | C1 ×2 | 4 to 4.25 | 2 to 2.25 | a log 0.6 thick; a rock under each end, sized to reach the sand; a broken branch |
| `rock` | rock arch on legs, open underneath | C1 ×2, B3, C11 ×2 | 5 to 8.5 | 2.6 to 4 | a rock slab 2.4 deep with a flat top; four rock legs (front and back at each end) down to the sand |
| `boat` | fishing boat (yola) on wooden posts, you go underneath | C1 | 4.75 | 2.45 | blue hull 1.15 tall and 1.9 deep, red stripe, white rim, wooden floor, pointed bow; four posts down to the sand |
| `plank` | boardwalk | B3, C5, C8, C11 | 8.5 to 45 | 3.1 to 5.5 | a plank 0.22 thick, 2.4 deep, board lines every 0.55; a pair of posts at least every 9 units |
| `tee` | plank on one stout post | C2 ×2, C8 | 6.25 to 7.5 | 4.5 to 7.5 | the plank, one post 0.6 thick down to the sand, two braces under it |
| `shelf` | rock shelf out of the high ground | B4 | 16 | about 7 above the low floor | a slab with sand blown on top, thick at the rock, rough underneath |
| `tower` | water tower | C6 | 9 (deck) | 7.5 | deck 4.2 deep on four legs, crossed braces at the back, a rail; the tank (3.1 across, 2.3 tall, three bands) and a red cone roof |
| `lookout` | lookout station | C9 ×2 | 5.25 | 10.75 | deck 3.1 deep on four legs, braces, a rail round the back; a roof on four posts 3.3 tall, red pyramid top |

- **Moves:** none of them.
- **Gameplay notes:** the boat, the rock arch, the tower and the lookouts are open underneath: you walk under them, so
  keep the space under the top clear. The tower and lookouts are reached by ladders (below).

### Ladders
- **Gameplay:** you climb them.
- **Size:** 0.7 wide (two rails 0.1 thick, rungs every 0.36), with hooks over the top. Any height: C5's rope ladder
  up and B5's down are about 9 units and run off the screen; C6's to the tower deck 7.5; C9's two to the lookouts 10.75.
- **On screen:** 0 to 2.
- **Moves:** no.
- **Editor:** not editable (the code places them from the room's ladder list). One builder makes the ladders for every
  world (`buildLadders`). Models: a rail piece and a rung piece the code repeats to any height.

### Zip line (C6 down to C7)
- **Gameplay:** you grab it and ride down.
- **Size:** a cable about 47 units long, dropping about 6.5 units, from the water tower's deck in C6 to the sand in C7;
  a post 0.26 thick with a pulley at each end. Drawn in both rooms.
- **Moves:** the hero rides it; the line itself doesn't move.
- **Editor:** not editable. Models: the two posts and pulleys. The cable stays code (any length, any angle).

### The crane bridge (C10 The Old Winch)
- **Gameplay:** press the button, the winch lets the bridge down over the gap, you walk across.
- **Size:** the gap is 17.5 units; the crane's mast is 0.55 thick and about 14.6 tall (up out of the picture), its boom
  over the gap, the bridge on four chains, a winch with a drum and gear, a big button.
- **Moves:** yes, all by the game's clock (`tbAnim`): the bridge sways a little while it hangs, then comes down; the
  chains shorten with it; the drum and gear turn; the button cap goes down.
- **Editor:** not editable. A model needs separate parts for the bridge, each chain, the drum, the gear and the button cap.

### Lookout buttons (C9)
- **Gameplay:** a big red button on a post at the far end of each lookout deck, chest high (1.8-unit post). Held down,
  it turns green.
- **Moves:** the cap changes colour (and is a separate part). **Editor:** not editable.

### Cracked rock (C2, set piece `crack`)
- **Gameplay:** a patch of cracked rock at the foot of the 10-unit step; only Camila's charged combo breaks it, and a
  Berry Console game rolls out.
- **Editor:** a set piece (Background tab), moved along the room. A model must have a whole state and a broken state.

### Fence gate (C9, set piece `gate`)
- **Gameplay:** blocks the way on until it opens.
- **Size:** 7.5 units tall, 3.75 wide. **Moves:** it opens. **Editor:** a set piece; its look is `fence`, and its
  height and width are numbers in the room, so a model should fit any size near that.

### The house door (C1)
- The way into the house (to the HOME room). The door is a gameplay spot; the rest of the house is scenery (below).

### The buddy's white chair (B4)
- The first buddy sits in it waiting. The game scales it to the buddy's size. It's a shared builder (`buildChair`).
  Not in the editor.

## Scenery

### Sea
- **Size:** a sheet 230 × 92 units far behind the beach; on the bluff rooms a second, far sea (700 × 182) out to the haze.
- **Moves:** yes. The swell is worked out on the graphics card from the game's clock (the sea's shader); the hour of
  day sets its colours. In clay it uses flat clay colours.
- **Model it?** No. It's a shader, not a shape.

### Foam line and wet sand
- A strip of foam 0.7 deep where the water meets the sand. **Moves:** it runs up the slope and back, about every
  7 seconds (the game's clock). Code.

### Sky and clouds
- Clay sky: one flat colour. Clay clouds: about one every 15 to 21 units along the world, high up and far back.
  **Moves:** no. They come from the shared clay kit (`clayroom.js`), the same look as Cuss' Waves.

### Palms
- **Gameplay:** none.
- **Size:** 6.5 to 11 units tall (2.4 to 4 heroes), leaning up to ±0.3 and tipped back a little, with coconuts.
  They stand 3 to 8.5 units behind the heroes.
- **How many:** about 20 per room (16 in C10, 29 in C11), about **6 on screen at once**. Plus two lying knocked flat in
  most rooms (7 to 9 units long, 2.6 to 4.5 behind). C1 also has the two hammock palms (8 and 8.6) by the house.
- **Moves:** no sway today. Only C1's seven fall: in the game's opening each one shudders (0.14 s), falls over away
  from the blow (0.85 s), thuds and throws dust; after the opening they lie flat. The code turns the whole palm about
  its foot, so a palm model needs its pivot at the foot of the trunk.
- **Editor:** not in it.
- **Today in clay:** each different height and lean is built as its own shape when a room loads, then reused.

### Sea-grape bushes
- **Size:** round clumps 1 to 2.4 units across, 2.4 to 8.6 units behind. **How many:** about 10 on screen.
- **Moves:** no. **Editor:** not in it.

### Rocks
- **Size:** 0.8 to 2.2 units across. 6 in 10 sit at the water's edge, the rest on the beach.
- **How many:** about 7 on screen. **Moves:** no. **Editor:** not in it.

### Shells and starfish
- **Shells:** tiny cones, 0.18 across, 120 per room, about 35 on screen. **Starfish:** small and flat on the sand,
  16 per room, about 4 on screen. Both are drawn as one batch each (one draw for all of them).
- **Moves:** no. **Editor:** not in it.

### Spray glints
- 50 white glints over the water, twinkling (the game's clock). Code, not a model.

### The house and its yard (C1 only)
- **House:** turquoise walls 4.4 wide, 2.4 tall and 2.6 deep on a deck (4.8 × 3) up on posts, a red tin roof 5.2 wide,
  a yellow door, windows, porch steps. It stands about 5 units behind the heroes. The door is the way in.
- **Yard:** an orange hammock between the two palms, a small table with a bowl of mangoes and a pineapple, a 4.2-unit
  log, and a red and white beach chair further along.
- **Moves:** no. **Editor:** not in it (C1 isn't editable).

### The forest edge (C11)
- Malanga and heliconia plants (about 30 along the edge), palms and yagrumo trees, a strip of grass where the sand
  ends, two far green hills. **Moves:** no. **Editor:** not in it. These come from the same plant builders the Woods use.

## What could be shared with Berry Woods

The Woods' builder already uses some of the Beach's own pieces, so one model can serve both worlds:

- **Palms.** The Woods put palms down in clusters of 2 or 3 (6.5 to 10.5 units tall), from the same palm builder.
- **The forest plants:** malanga, heliconia, ferns, yagrumo. The Woods are full of them; C11 uses the same builders.
- **Ladders.** One builder makes the ladders for every world.
- **Rocks and boulders.** Beach rocks, cliff boulders and the rock-arch legs match the Woods' rocks: one family of rock
  shapes in two colourings (sandy grey here, mossy in the Woods).
- **Rock platforms.** The Beach's `rock` arch is the same idea as the Woods' `slab` (a slab on legs, open underneath),
  and `shelf` matches the Woods' `wshelf` and `jut`.
- **Wood kit.** Driftwood (`drift`) is close to the Woods' `log`; planks, posts, braces and rails (`plank`, `tee`, the
  tower and lookout decks) match the Woods' `bridge`, `deck` and `span`.

**Beach only:** the sea, the house and yard, the boat, the water tower, the lookouts, the crane, the beach chair,
sea grape, shells and starfish.

## What most affects speed on the phone

Measured in a test copy in C2 Palm Shore, at 16:9, with the phone's lighter clay (the phone build turns it on):

| What | Triangles (phone) | Triangles (computer) |
|---|---|---|
| The room's own pieces, all together | about 98,000 | about 252,000 |
| The sea (one sheet) | 42,320 | 42,320 |
| Palms (23 in the room, about 6 on screen) | 1,652 each, 38,000 together | 6,280 each, 144,000 together |
| Sand, bushes, rocks, platforms (merged) | about 15,000 | about 57,000 |
| Clouds | 2,560 | 11,520 |

A whole frame on the phone (with the heroes, baddies and the clay look's extra passes) came to about 240,000
triangles and 175 draws. The clay look draws much of the scene more than once.

In order of how much they matter:

1. **The sea.** On the phone it's the biggest single thing: 42,000 triangles moved every frame, and a shader running on
   every sea pixel (a third to half of the screen). It's code, not a model, so it isn't the modeling chat's job; a
   lighter sea is a separate change in the game.
2. **Palms.** The biggest thing a model can fix: 20 to 29 per room, about 6 on screen. A Blender palm should come in at
   or under today's phone palm (about 1,600 triangles), with a few shapes (3 or 4) that the game resizes, instead of the
   many slightly different shapes built today. Then they can be drawn as one batch.
3. **Draws.** Every separate part with its own colour costs a draw. Things that repeat (palms, bushes, rocks, posts,
   rungs, shells) must be drawn as a batch, and each model should use few colours. The game already merges still
   scenery by colour, and in clay it turns colours into one shared material.
4. **Room loading.** Today the clay look rounds and smooths every piece on the phone each time a room is built (the
   phone's limit is 65,000 triangles of the room's own pieces; the computer's 130,000). Models made already clay-shaped
   skip that work, so rooms load faster, including the rooms next door that are built while you walk.
5. **Clay shadows.** Palms cast clay shadows, which draws them again. Keep shadow-casting pieces few.

Suggested sizes for the phone (my suggestions, not rules from the game): a palm about 1,500 triangles or less, a bush
about 300, a rock about 200, a shell or starfish under 50, a platform kind 2,000 to 3,000 with its supports, the tower or a
lookout up to 5,000, the house up to 6,000, the crane up to 5,000. A room's pieces together should stay under today's
limits (65,000 on the phone).

## What I'd model first

1. **Palms.** They're everywhere, they cost the most, nothing in the game stands on them, the editor doesn't touch them,
   and the Woods use them too. Three or four standing shapes and one lying flat, pivot at the foot.
2. **Rocks and sea-grape bushes.** Many on screen, simple shapes, scenery only. The rocks serve the Woods as well.
3. **The wood kit** (plank, post, brace, rail, ladder rung). It makes four of the Beach's platform kinds and the Woods'
   bridges and decks. It has to repeat along any length, so the editor keeps working.
4. **The one-offs people remember:** the house and yard, the boat, the water tower, the lookouts, the crane. Each
   appears once, so they're safe for speed, but the crane and the tower have moving or gameplay parts to keep separate.
5. **Leave in code:** the sand and cliff shapes, the sea, the sky, the zip line's cable and the ladders' lengths.

## Computer target (Nov 20)

Starky, Nov 20: Berry Blade is a computer experience first, but phones must still be able to play it. So the Beach's phone-based budgets
become the **phone version**, and each piece gets a fuller **computer model** next to it.

**How the budgets loosen on a computer.**

| | Computer | Phone version (the Beach sheet's budgets) |
|---|---|---|
| One whole room (sand, sea set, rocks, palms, props, far backdrop; not heroes or baddies) | about 600,000 triangles | about 150,000 |
| Each piece | **about four times** its phone budget | as the sheet already gives it |
| Big one-offs (the house, the fishing boat, the bluff) | up to 60,000 each | 10,000–15,000 |
| Small repeated pieces (shells, pebbles, grass tufts, flowers) | 300–2,500 each, **instanced** | 80–600, and some dropped |

The same reasons as the Berry Woods sheet (`models/levels/berry-woods/LEVEL-SHEET.md`, sections 5 and 6): a room is drawn whole, the room
above or below can be drawn with it, and the clay look draws shadow-casting pieces twice. So the room total matters more than any one piece.

**How the phone version works.** Each model is exported with two meshes in one file, the full one and a `_phone` one (about a quarter of
the triangles, same outline and colours). The game picks by its lighter-clay switch (`CLAY_LITE`), which the phone build already turns on.
Everything you stand on, climb, swim in or break (platforms, ladders, planks, posts, rails, the boat on its blocks) stays **the same size and
in the same place** on phones; only its detail drops.

**On phones, can be dropped:** shells, pebbles, small grass tufts, flowers lying on the sand, far palms beyond the second row, the beach seen
small in the distance (a flat picture instead).

**Shared with Berry Woods, model once:** palms (one palm with a coconut variant), the forest plants (the Beach's two back-woods rooms use the
woods' own builder), ladders, the rock kit (two colourings), the rock-platform stretch method (ends plus a repeating middle), and the
plank, post and rail kit. The woods' hidden cove is built entirely from Beach pieces.

Estimated: every number in this section. The Beach's own phone budgets stand as the sheet gives them.
