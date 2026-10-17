# 🎨 My Paint Studio

A colorful painting page for kids. Pick a picture, then paint it with a brush, rainbow brush,
magic fill bucket, stickers and eraser. Works with a mouse, a finger or a stylus (iPad, tablet, phone),
in English and Arabic.

## What's inside

The home screen has 4 sections:

| Section | What it is | Pictures come from |
|---|---|---|
| 📸 **My Album** | your child's own photos | `images/my-photos/` |
| 🪄 **Magic Board** | a blank white board to draw anything | — |
| 🖍️ **Coloring Book** | coloring pages (34 included) | `images/coloring/` |
| 🦸 **Level 2** | more detailed coloring pages for older kids | `images/level-2/` |

## Add your pictures

1. Copy photos into `images/my-photos/` (or coloring pages into `images/coloring/` or `images/level-2/`).
2. Double-click **`update-pictures.command`**. That's it — they appear in the right section.

Then your child just double-clicks `index.html`. Every tool works, Fill and Save included.
Photos can also be added from the device with the ➕ button in My Album (kept until the page is closed).

Optional: to give pictures nicer names (in English and Arabic), add them to `images.js`:
```js
album: [{file: 'images/my-photos/park.jpg', name: {en: 'At the Park', ar: 'في الحديقة'}}],
```
Pictures not listed there get their name from the file name.

## Tools

✏️ Pen (thin lines) · 🖌️ Brush (thick soft paint) · 🪄 Magic brush (🌈 rainbow ribbon, 🫧 bubbles, 🌸 flowers,
⭐ stars, ✨ fireflies, 🐾 tiny animals — each pops in with sparkles and music) · 🪣 Fill bucket ·
⭐ Stickers (tap, or press and drag to make them bigger) · 🧽 Eraser.
The chosen tool's icon follows the mouse or finger.

## Publish on GitHub Pages

1. Run `update-pictures.command`, then create a new repository on GitHub (e.g. `paint-studio`) and upload all files in this folder.
2. In the repository, open **Settings → Pages**.
3. Under **Source**, choose **Deploy from a branch**, select `main` and `/ (root)`, then press **Save**.
4. After about a minute, your site is at `https://<your-username>.github.io/paint-studio/`.

## Tips

- **Install it as an app (best for kids):** it then opens full screen with no browser bars and nothing to exit by accident, and works offline.
  - **iPad / iPhone:** open your GitHub Pages link in Safari → Share → **Add to Home Screen** → open **مرسمي** from the home screen.
    (The ⛶ full screen button shows these steps — Safari's own full screen closes as soon as a child swipes or writes.)
  - **Android:** press the green **📲 Install the app** button on the home screen.
- On a computer, the **⛶ full screen** button hides the browser bars; press it again to leave.
- **Lines on top** keeps the black outlines visible while painting. Turn it off to paint over everything.
- Paintings are kept while the page is open (🎨 badge on the card). Press **Save** to download a PNG.
- Keyboard: `Ctrl/⌘ + Z` = undo, `Esc` = back to pictures.
