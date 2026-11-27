/* Member C: coordinate-driven SVG primitives and sample preview. */
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
    layer.append(svgElement('rect', {
      x: x - width / 2, y, width, height, fill: 'white', stroke: 'black', 'stroke-width': 1.2
    }));
    layer.append(svgElement('text', {
      x, y: y + height / 2, 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: 'black'
    }, label));
  }

  function drawLifeline(layer, { x, startY, endY }) {
    layer.append(svgElement('line', {
      x1: x, y1: startY, x2: x, y2: endY, stroke: 'black', 'stroke-width': 1, 'stroke-dasharray': '6 5'
    }));
  }

  function drawActivation(layer, { x, startY, endY, width = 12 }) {
    layer.append(svgElement('rect', {
      x: x - width / 2, y: startY, width, height: endY - startY,
      fill: 'white', stroke: 'black', 'stroke-width': 1.2
    }));
  }

  function validateItems(name, items, validate) {
    if (!Array.isArray(items)) throw new TypeError(name + ' must be an array.');
    for (const [index, item] of items.entries()) {
      if (!item || !validate(item)) {
        throw new TypeError(name + '[' + index + '] has invalid drawing data.');
      }
    }
  }

  function positive(value) {
    return Number.isFinite(value) && value > 0;
  }

  function verticalSpan({ x, startY, endY }) {
    return [x, startY, endY].every(Number.isFinite) && endY > startY;
  }

  function renderDiagram(svg, data) {
    if (svg?.namespaceURI !== NS || svg.localName !== 'svg') {
      throw new TypeError('renderDiagram requires an SVG element.');
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new TypeError('Diagram data must be an object.');
    }

    const {
      width = 760, height = 360, viewBox = [0, 0, width, height],
      participants = [], lifelines = [], activations = []
    } = data;
    if (!positive(width) || !positive(height)) {
      throw new TypeError('SVG width and height must be positive finite numbers.');
    }
    if (!Array.isArray(viewBox) || viewBox.length !== 4 ||
        ![viewBox[0], viewBox[1]].every(Number.isFinite) ||
        !positive(viewBox[2]) || !positive(viewBox[3])) {
      throw new TypeError('viewBox must contain two finite coordinates and two positive dimensions.');
    }

    validateItems('participants', participants, ({ label, x, y, width, height }) =>
      typeof label === 'string' && [x, y].every(Number.isFinite) && positive(width) && positive(height));
    validateItems('lifelines', lifelines, verticalSpan);
    validateItems('activations', activations, activation =>
      verticalSpan(activation) && (activation.width === undefined || positive(activation.width)));

    const contents = document.createDocumentFragment();
    const layers = {};
    for (const name of ['lifelines', 'activations', 'messages', 'participants', 'fragments']) {
      layers[name] = createLayer(contents, name);
    }
    for (const lifeline of lifelines) drawLifeline(layers.lifelines, lifeline);
    for (const activation of activations) drawActivation(layers.activations, activation);
    for (const participant of participants) drawParticipant(layers.participants, participant);

    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', viewBox.join(' '));
    svg.replaceChildren(contents);
    return layers;
  }

  // Provisional public API pending team agreement.
  window.BasicGraphics = { svgElement, createLayer, drawParticipant, drawLifeline, drawActivation, renderDiagram };

  const samples = {
    basic: {
      participants: [
        { label: 'Client', x: 130, y: 30, width: 140, height: 42 },
        { label: 'Server', x: 380, y: 30, width: 140, height: 42 },
        { label: 'Database', x: 630, y: 30, width: 140, height: 42 }
      ],
      lifelines: [
        { x: 130, startY: 72, endY: 330 },
        { x: 380, startY: 72, endY: 330 },
        { x: 630, startY: 72, endY: 330 }
      ],
      activations: [{ x: 380, startY: 115, endY: 265 }, { x: 630, startY: 155, endY: 220 }]
    },
    nested: {
      width: 620, height: 400, viewBox: [-20, 0, 620, 400],
      participants: [
        { label: 'Requester', x: 135, y: 30, width: 144, height: 42 },
        { label: 'Service', x: 420, y: 30, width: 144, height: 42 }
      ],
      lifelines: [{ x: 135, startY: 72, endY: 365 }, { x: 420, startY: 72, endY: 365 }],
      activations: [
        { x: 420, startY: 100, endY: 332 },
        { x: 426, startY: 145, endY: 284 },
        { x: 432, startY: 191, endY: 237 }
      ]
    }
  };

  const preview = document.getElementById('diagram');
  const sampleSelect = document.getElementById('sample');
  const renderButton = document.getElementById('render');
  const status = document.getElementById('status');
  if (!preview || !sampleSelect || !renderButton || !status) return;

  function renderSample() {
    const sample = samples[sampleSelect.value];
    try {
      renderDiagram(preview, sample);
      status.textContent = [
        sample.participants.length + ' participants',
        sample.lifelines.length + ' lifelines',
        sample.activations.length + ' activation bars'
      ].join(' · ') + '.';
      status.removeAttribute('data-error');
    } catch (error) {
      status.textContent = 'Unable to render sample. ' + error.message;
      status.setAttribute('data-error', '');
    }
  }

  renderButton.addEventListener('click', renderSample);
  sampleSelect.addEventListener('change', renderSample);
  renderSample();
})();
