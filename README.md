# Happy Emotes 🕷️

**English** · [Español](README.es.md)

A typography lab for looking inside text. It started with a Unicode spider whose thread spilled over earlier messages in a chat.

[Open the Unicode Lab](https://happy-emotes-borja.entropyweaver.chatgpt.site)

## Run locally

The app uses static files and needs no build step, JavaScript dependencies, API, or keys. With Python 3.12 installed, run this from the repository root:

```bash
python -m http.server 8000 --directory dist
```

On Windows, you can also use `py -3.12 -m http.server 8000 --directory dist`. Open <http://localhost:8000> in a recent version of Firefox, Chrome, Edge, or Safari. Use HTTP so the browser can load the modules and the Unicode catalog.

## Experiment

Use **Language** in the header to switch between **English** and **Español** while you work. English is the default, and the browser remembers your choice. **Appearance** offers Light, Dark, and System. System follows the operating system's appearance while the page is open. The lab starts in Light mode.

1. Choose **The spider**. Both views render the same text with the bundled Noto Sans font.
2. Move **Thread length**. It adds combining marks, so the number of code points can rise while the number of graphemes stays the same.
3. Compare `overflow: visible` in A with `overflow: clip` in B. The browser draws both views in the DOM.
4. Switch one view to Arial, Times, Courier, or the system font to see whether the marks still stack.
5. Turn on **Layout boxes** and **Ink guide** to compare the space reserved for a message with the estimated bounds of its ink.
6. Try **Accents** and apply NFC or NFD. The accent can look the same as the number of code points changes.
7. Try **Family**. The sequence `👨‍👩‍👧‍👦` has seven code points, eleven UTF-16 code units, and twenty-five UTF-8 bytes. Current grapheme segmentation groups them into one grapheme.
8. Select a grapheme chip or a character in either rendering view. Both views highlight the grapheme and the inspector shows its Unicode names, categories, and UTF-16 ranges. Use the previous and next buttons, or move through the chips with the arrow, Home, and End keys.
9. Choose **Code points** to see the full text. Selecting a character in the table highlights every row belonging to its grapheme.

The editor accepts up to 512 code points. The spider generator supports up to 60 repetitions and four thread characters. The lab inserts the specimen with `textContent`.

### Spider growth

With **The spider** selected, **Play** adds one code point at a time. **From zero** rewinds and pauses, **+1 mark** pauses and advances one step, and **Replay** starts from zero after the final step. Choose one, two, or four additions per second. U+FC5E uses the label **ligature**.

The text, counts, inspector, views, and guides update together. The selected grapheme stays selected as long as it still exists. Editing the specimen, changing its generator, normalizing, inspecting a grapheme, or leaving the tab pauses playback. You can change fonts, line height, and clipping while the spider grows.

### Local fonts

Choose **View A** or **View B** under **Apply on load**, then drop a font into **Local fonts** or choose a file. Each loaded font becomes available from either **Font** menu. The lab accepts up to eight WOFF2, WOFF, TTF, or OTF files of up to 10 MiB each.

Font files stay in the tab. **Remove local fonts** unloads them and switches any affected view back to Noto Sans. Notebooks, links, and browser records save a file reference. Load the same file before restoring the experiment to use its font again. In HTTPS and on localhost, the reference comes from the file contents.

### Challenges

Choose a challenge, work with the actual lab controls, and click **Check**. Each challenge has an optional hint and explains the result when solved.

- **One grapheme, seven pieces** checks that the entire specimen is one grapheme containing seven code points.
- **The same accent** starts with a decomposed “a” and acute accent. **Set up accent** loads it into the editor so you can try NFC.
- **Ink outside the box** checks estimated vertical ink overflow in A. Check once with **Message** set to `visible`, then again with `clip` or `hidden` while keeping the other settings fixed.

You can retry any challenge. Progress lasts until the tab reloads.

### Clipping controls

**Message** controls clipping at the specimen's box. **Panel** controls clipping at the chat boundary. Use Noto Sans and a long thread to compare the following settings.

| Message | Panel | What you can observe |
| --- | --- | --- |
| clip or hidden | Either | The message box clips the ink. |
| visible | Clip | The ink can cover neighboring messages up to the chat boundary. |
| visible | Visible | The ink can cross the chat boundary into the observation margin. |

Links and notebooks keep both settings. Older experiments open with **Panel** set to **Clip**.

### Moving chat

Click **Send specimen** to put the editor text at the end of both views. **Start chat** sends the same stream of test messages to A and B. Pause, change the interval, or use **+1 message** to advance once. Watch the blue box move up and resend the specimen if it scrolls out of view.

The chat specimen stays linked to the editor. The chat's speed and incoming messages belong to the current test session. Restoring an experiment opens the chat paused with its initial messages.

## Browser records

Click **Export record as JSON**. Open Happy Emotes in another browser, then use **Open JSON record**. The lab restores the text and both sets of settings in a paused state and compares the grapheme count, DOM box dimensions, and Canvas ink estimates. Viewport width and device pixel ratio provide context for differences in layout. **Measure again** reapplies the imported settings and refreshes the local column.

The comparison shows the requested font, the applied CSS stack, and the availability of bundled or local font files. It flags a missing local file so you can load it and measure again. Per-glyph font substitutions remain unidentified. The JSON contains the date and browser label alongside the text, settings, and measurements. Font files stay separate. Records use the `happy-emotes-browser-card` format, version 1, and have a 64 KiB import limit.

## Discovery notebook

Use **Save this experiment to the notebook** below the views or open **Notebook** in the header. Name the experiment and click **Save experiment**. Each entry keeps:

- The exact Unicode text, specimen type, and spider generator settings.
- Fonts and clipping rules for A/B, font size, line height, and enabled guides.
- The selected grapheme, inspector mode, escape display, and playback speed.

**Open** restores an experiment in a paused state. **Rename** changes its name. **Delete** offers **Undo deletion** for the last entry removed in the tab. Resetting the lab preserves the notebook.

The notebook is stored in the browser for this site. **Export JSON** downloads it and **Import JSON** adds entries. Exact duplicates are skipped. Distinct entries with the same ID receive new IDs. Imports are validated as a whole. The limits are 100 entries, names up to 80 characters, 512 code points per specimen, and JSON files up to 1 MiB. The format is `happy-emotes-notebook`, version 1.

If the browser blocks storage, the notebook indicates temporary storage and can still export the collection. If saved data is damaged, the notebook keeps the original data and offers a recovery download.

## Share an experiment

Click **Share experiment**, then **Copy link**. You can also copy the field manually or use **Test link** to open it in another tab. The link includes the text and experiment settings and opens paused. Visitors can edit the restored experiment or add it to their own notebook. Rendering can vary by browser and available fonts.

Each link is a snapshot. Generate a new one after changing the experiment. The versioned format is `#experiment=v1.<JSON encoded as UTF-8 and base64url>`. The URL fragment stays in the browser and holds up to 512 code points of specimen text plus the settings. The lab validates the payload before changing the current experiment. The viewer's language and appearance are browser preferences.

## Unicode creature builder

Open **Creature builder**, choose a base, and click **Start with this base**. Palette pieces and **Append base** go at the end of the specimen. **Remove last code point** removes one code point, including both UTF-16 units of a supplementary character.

The palette includes above, below, overlay, and enclosing marks, joiners, presentation selectors, and emoji skin tones. Hover, focus, or select a piece to see its Unicode name and category. Try starting with 👩, adding ZWJ, and appending 💻. The font and browser determine the rendered form. Creatures can be saved and shared like any other specimen.

## What each measurement means

| Measurement | Source | What it measures |
| --- | --- | --- |
| Code points | Unicode iteration over the string | The values that make up the text |
| Graphemes | `Intl.Segmenter` with `grapheme` granularity | Text clusters under the browser's Unicode rules |
| UTF-16 code units | `string.length` | Two units for each supplementary code point |
| UTF-8 bytes | `TextEncoder` | Size of the encoded text |
| Blue box | The message block's `getBoundingClientRect()` | The block box reserved in layout |
| Baseline | A zero-size inline element | The first line's baseline |
| Green selection | `Range.getClientRects()` using each grapheme's UTF-16 offsets | The grapheme's typographic position, subject to each view's clipping |
| Orange ink guide | `CanvasRenderingContext2D.measureText()` and `actualBoundingBox*` | Estimated Canvas ink bounds before clipping |

The lab keeps the rendered text in a single node so selection preserves shaping. The CSS Custom Highlight API adds native range coloring where available. The layout guides also work independently of it. Ligatures can share geometry, so inspector chips let you select one grapheme at a time. Without `Intl.Segmenter`, code point inspection remains available.

Canvas estimates can differ from DOM rendering because of shaping, font fallback, and writing direction. The lab omits the guide for empty text, multiple lines, tabs, and unsupported control characters. Fonts and browser engines can change which marks stack and how far they extend.

The partial catalog contains 1,592 Unicode names generated with Python 3.12's `unicodedata` (Unicode 15.0.0). Characters outside the catalog still get a code point, rendering, and a general category inferred by the browser. Unicode character names are shown in their standard form in both interface languages.

`U+034B` is `COMBINING HOMOTHETIC ABOVE` (Mn, combining class 230). `U+FC5E` is `ARABIC LIGATURE SHADDA WITH DAMMATAN ISOLATED FORM` (Lo) and is available to compare with the original spider. Neither category alone predicts a glyph's advance or height. Repeated marks can remain after NFC.

## Development

With Node 20 or newer, run:

```bash
npm test
npm run check
```

The tests cover Unicode analysis, the playback clock, notebook validation and storage, share links, and browser record validation. Regenerate the Unicode catalog with:

```bash
python scripts/generate-unicode-catalog.py
```

The script records the Python runtime's Unicode data version. A different Python version may produce different metadata.

- `dist/index.html` contains the English interface and measurement explanations.
- `dist/i18n.js` and `dist/static-es.js` manage language switching and Spanish translations of the static interface. Dynamic UI messages define both translations alongside their rendering logic.
- `dist/core.js` handles Unicode analysis. `dist/app.js` ties controls, selection, and DOM/Canvas measurements together.
- `dist/selection.js`, `dist/playback.js`, and `dist/chat.js` handle linked selection and the two animations.
- `dist/notebook.js`, `dist/share.js`, and `dist/browser-card.js` validate portable experiment data. Their corresponding UI modules handle the controls.
- `dist/unicode-names.json` holds the partial catalog and `dist/fonts/` contains the bundled Noto Sans font and its license.

Serve `dist/` from a root or a subdirectory. Assets use relative paths. `.openai/hosting.json` identifies the hosted copy. The lab processes text locally and stores language, appearance, and saved notebooks in the browser.

## References

- [CSS Overflow and ink overflow](https://www.w3.org/TR/css-overflow-3/#ink-overflow)
- [Unicode UAX #29 and text segmentation](https://www.unicode.org/reports/tr29/)
- [MDN · Intl.Segmenter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter)
- [MDN · TextMetrics](https://developer.mozilla.org/en-US/docs/Web/API/TextMetrics)
- [MDN · CSS Custom Highlight API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API)
- [MDN · Range.getClientRects](https://developer.mozilla.org/en-US/docs/Web/API/Range/getClientRects)
- [Noto Sans and its license](https://github.com/notofonts/latin-greek-cyrillic)

## License

The project code and documentation are released under the [MIT License](LICENSE).

The bundled Noto Sans font uses the SIL Open Font License 1.1. It was converted from TTF to WOFF with glyphs and shaping tables preserved. See [the included license](dist/fonts/OFL.txt).
