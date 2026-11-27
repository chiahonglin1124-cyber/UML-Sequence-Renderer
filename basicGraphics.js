/* Member C: SVG primitives for a static sequence diagram.
   Coordinates are supplied externally; no automatic layout is performed. */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  function svgElement(tag, attrs = {}, content) {
    const element = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
    if (content !== undefined) element.textContent = content;
    return element;
  }
  function createLayer(parent, name) {
    const layer = svgElement('g', { 'data-layer': name });
    parent.append(layer);
    return layer;
  }
  function drawParticipant(layer, { label, x, y, width, height }) {
    layer.append(svgElement('rect', { x: x - width / 2, y, width, height, fill: 'white', stroke: 'black', 'stroke-width': 1.2 }));
    layer.append(svgElement('text', { x, y: y + height / 2, 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: 'black' }, label));
  }
  function drawLifeline(layer, { x, startY, endY }) {
    layer.append(svgElement('line', { x1: x, y1: startY, x2: x, y2: endY, stroke: 'black', 'stroke-width': 1, 'stroke-dasharray': '6 5' }));
  }
  function drawActivation(layer, { x, startY, endY, width = 12 }) {
    layer.append(svgElement('rect', { x: x - width / 2, y: startY, width, height: endY - startY, fill: 'white', stroke: 'black', 'stroke-width': 1.2 }));
  }
  // Provisional public API; agree on the final contract with Member A.
  window.BasicGraphics = { svgElement, createLayer, drawParticipant, drawLifeline, drawActivation };
  const sample = {
    participants: [
      { label: 'Client', x: 130, y: 30, width: 140, height: 42 },
      { label: 'Server', x: 380, y: 30, width: 140, height: 42 },
      { label: 'Database', x: 630, y: 30, width: 140, height: 42 }
    ],
    activations: [{ x: 380, startY: 115, endY: 265 }, { x: 630, startY: 155, endY: 220 }],
    bottom: 330
  };
  function renderSample() {
    const svg = document.getElementById('diagram');
    svg.replaceChildren();
    const lifelines = createLayer(svg, 'lifelines');
    const participants = createLayer(svg, 'participants');
    const activations = createLayer(svg, 'activations');
    for (const p of sample.participants) {
      drawLifeline(lifelines, { x: p.x, startY: p.y + p.height, endY: sample.bottom });
      drawParticipant(participants, p);
    }
    for (const a of sample.activations) drawActivation(activations, a);
    document.getElementById('status').textContent = 'Sample rendered: 3 participants, 3 lifelines, 2 activation bars. Messages and fragments are not implemented in this module.';
  }
  document.getElementById('render').addEventListener('click', renderSample);
  renderSample();
})();
