# Beach sheet addition: Computer target (Nov 20)

The Beach level sheet (`models/levels/beach/LEVEL-SHEET.md`, written on the Mac on Nov 18) is not in this repo, so this section is kept as
its own file. **Paste it onto the end of the Beach sheet** as its last section; nothing else in the Beach sheet changes.

---

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
