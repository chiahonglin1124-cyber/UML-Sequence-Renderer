# Member C · Basic graphics and web development

Open `index.html` in a browser and choose a sample. The first sample shows three participants and two activation bars. The second shows three explicitly positioned, nested activations. The preview uses black graphics on white and supports horizontal scrolling on narrow screens.

Run the dependency-free tests with `node --test`. They exercise the SVG output and sample controls using a DOM test double.

## Provisional public API

Load `basicGraphics.js` before your integration code. Its functions are exposed as `window.BasicGraphics`. All names and contracts below are provisional pending team agreement.

| Function | Contract |
| --- | --- |
| `svgElement(tag, attrs?, content?)` | Creates an SVG element. Sets attributes and uses plain text for optional content. |
| `createLayer(parent, name)` | Appends and returns a group with a `data-layer` attribute. |
| `drawParticipant(layer, { label, x, y, width, height })` | Appends a white header with a black outline and centered label. |
| `drawLifeline(layer, { x, startY, endY })` | Appends a dashed vertical black line. |
| `drawActivation(layer, { x, startY, endY, width? })` | Appends a white activation rectangle with a black outline. The default width is 12. |
| `renderDiagram(svg, data)` | Validates the data, sets SVG dimensions, replaces the SVG contents, and returns the five layer elements. Invalid input throws a `TypeError` before the previous render is changed. |

Drawing primitives append directly and expect valid coordinates. The diagram entry point validates the model.

## Diagram data

```js
const layers = window.BasicGraphics.renderDiagram(document.querySelector('#diagram'), {
  width: 600,
  height: 320,
  viewBox: [0, 0, 600, 320],
  participants: [{ label: 'Service', x: 300, y: 20, width: 140, height: 40 }],
  lifelines: [{ x: 300, startY: 60, endY: 300 }],
  activations: [
    { x: 300, startY: 90, endY: 260 },
    { x: 306, startY: 130, endY: 210, width: 12 }
  ]
});
```

- The default SVG dimensions are 760 by 360. The default `viewBox` is `[0, 0, width, height]`. Supply width and height as positive finite numbers. An explicit `viewBox` takes two finite origin coordinates and two positive finite dimensions. The preview CSS scales the SVG for display.
- The three collections default to empty arrays. All coordinates are finite numbers in SVG user units. Participant and activation `x` values are horizontal centers, participant `y` is the header top, and vertical spans require `endY > startY`. Supply positive widths and header heights and string labels.
- For nesting, supply each bar's horizontal offset and vertical span explicitly. List enclosing bars before nested bars so inner bars paint on top. Provide long labels with sufficient header width and keep all graphics inside the chosen viewBox.

## Team integration

1. The parser owner supplies the semantic diagram model. The layout owner resolves participant IDs, event order, activation bounds, and fragment bounds into coordinates. Agree on who owns that translation and how parse errors reach the page.
2. Call `renderDiagram` once per render with the resolved coordinates. It returns `lifelines`, `activations`, `messages`, `participants`, and `fragments` in back-to-front SVG order. Agree on layer order and a shared page entry point before wiring in the other modules.
3. The message and fragment owners can append to `layers.messages` and `layers.fragments`. Agree on message endpoints, supported arrow kinds, marker IDs and definition ownership, and fragment frame geometry. Each render replaces the groups and any SVG definitions, so use the returned groups and recreate necessary definitions on every render.

The sample controls own the preview on the current page. An integrated page should coordinate its render controls and status updates with the parser and layout modules.
