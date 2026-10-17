# Berry Blade (phone)

The phone version of Berry Blade: the same game, with a see-through d-pad and four buttons over it.

- **← →** move (hold to speed up) · **↑** climbs ladders · **↓ ↓** drop through a ledge
- **A** jump (twice for a double jump; hold it still for a big jump) · **X** attack (tap again for combos, hold to charge) · **B** block (hold for the bubble) · **Y** tackle (hold to charge it)
- **❚❚** (top right) pauses; on the menu screens it goes back. Menus are tapped.

**Works offline.** The first time it's opened online, it saves the whole game on the phone (the 3D engine and the fonts too), so
after that it plays with no connection. Whenever it's online again it checks for a newer version, downloads it in the background
and switches to it the next time you're on the title or character screen (never in the middle of a run).

Play it sideways. On an iPhone, open it in Safari, tap Share, then **Add to Home Screen** so it opens full screen like an app.
On Android, Chrome offers **Install app** (or Add to Home screen).

## Putting it on GitHub Pages

This folder is complete on its own. Make a new repository, upload everything in this folder to it, then in the repository's
Settings → Pages choose "Deploy from a branch", the main branch, and the root folder. The game is then at
`https://<your-name>.github.io/<repository>/`.

The phone folder is rebuilt from the game every time the game changes (`.claude/berry-tools/build_phone.py`), so don't edit
the files in here by hand. Every song in it is original to Berry Blade.
