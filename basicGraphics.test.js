const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');

const source = readFileSync(join(__dirname, 'basicGraphics.js'), 'utf8');
const ns = 'http://www.w3.org/2000/svg';

function element(localName, namespaceURI) {
  const attributes = new Map();
  const events = new Map();
  return {
    localName, namespaceURI, children: [], textContent: '',
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    removeAttribute(name) { attributes.delete(name); },
    append(child) { this.children.push(child); },
    replaceChildren(fragment) { this.children = [...fragment.children]; },
    addEventListener(name, handler) { events.set(name, handler); },
    dispatch(name) { events.get(name)(); }
  };
}

function setup(withPreview = false) {
  const svg = element('svg', ns);
  const controls = {
    diagram: svg, sample: element('select'), render: element('button'), status: element('p')
  };
  controls.sample.value = 'basic';
  const window = {};
  const document = {
    createElementNS: (namespace, name) => element(name, namespace),
    createDocumentFragment: () => element('#document-fragment'),
    getElementById: id => withPreview ? controls[id] : null
  };
  runInNewContext(source, { window, document });
  return { api: window.BasicGraphics, svg, controls };
}

test('creates namespaced SVG elements and appends named layers', () => {
  const { api, svg } = setup();
  const layer = api.createLayer(svg, 'custom');
  assert.equal(svg.children[0], layer);
  assert.equal(layer.namespaceURI, ns);
  assert.equal(layer.getAttribute('data-layer'), 'custom');
  const text = api.svgElement('text', { x: 15 }, '<example>');
  assert.equal(text.getAttribute('x'), '15');
  assert.equal(text.textContent, '<example>');
});

test('draws a black outlined header with a centered label', () => {
  const { api, svg } = setup();
  api.drawParticipant(svg, { label: 'Client', x: 100, y: 20, width: 80, height: 30 });
  const [box, label] = svg.children;
  assert.equal(box.getAttribute('x'), '60');
  assert.equal(box.getAttribute('stroke'), 'black');
  assert.equal(box.getAttribute('fill'), 'white');
  assert.equal(label.getAttribute('x'), '100');
  assert.equal(label.getAttribute('y'), '35');
  assert.equal(label.getAttribute('text-anchor'), 'middle');
  assert.equal(label.getAttribute('dominant-baseline'), 'middle');
  assert.equal(label.textContent, 'Client');
});

test('draws a vertical dashed black lifeline', () => {
  const { api, svg } = setup();
  api.drawLifeline(svg, { x: 100, startY: 50, endY: 200 });
  const [line] = svg.children;
  assert.deepEqual(['x1', 'x2', 'y1', 'y2'].map(name => line.getAttribute(name)),
    ['100', '100', '50', '200']);
  assert.equal(line.getAttribute('stroke-dasharray'), '6 5');
  assert.equal(line.getAttribute('stroke'), 'black');
});

test('renders offset nested activations in input order with default and custom widths', () => {
  const { api, svg } = setup();
  const { activations } = api.renderDiagram(svg, { activations: [
    { x: 100, startY: 80, endY: 200 },
    { x: 107, startY: 110, endY: 170, width: 10 }
  ] });
  const [outer, inner] = activations.children;
  assert.deepEqual(['x', 'y', 'width', 'height'].map(name => outer.getAttribute(name)),
    ['94', '80', '12', '120']);
  assert.deepEqual(['x', 'y', 'width', 'height'].map(name => inner.getAttribute(name)),
    ['102', '110', '10', '60']);
  assert.equal(inner.getAttribute('fill'), 'white');
  assert.equal(inner.getAttribute('stroke'), 'black');
});

test('configures dimensions, creates five ordered layers, and replaces previous content', () => {
  const { api, svg } = setup();
  const oldLayers = api.renderDiagram(svg, {});
  assert.equal(svg.getAttribute('viewBox'), '0 0 760 360');
  const layers = api.renderDiagram(svg, { width: 480, height: 240, viewBox: [-10, 0, 900, 450] });
  assert.equal(svg.getAttribute('width'), '480');
  assert.equal(svg.getAttribute('height'), '240');
  assert.equal(svg.getAttribute('viewBox'), '-10 0 900 450');
  assert.deepEqual(svg.children.map(layer => layer.getAttribute('data-layer')),
    ['lifelines', 'activations', 'messages', 'participants', 'fragments']);
  assert.equal(svg.children[2], layers.messages);
  assert.equal(svg.children[4], layers.fragments);
  assert.equal(layers.messages.children.length, 0);
  assert.equal(layers.fragments.children.length, 0);
  assert.notEqual(oldLayers.lifelines, layers.lifelines);
  api.renderDiagram(svg, { width: 640, height: 480 });
  assert.equal(svg.getAttribute('viewBox'), '0 0 640 480');
});

test('rejects invalid data and leaves the previous render intact', () => {
  const { api, svg } = setup();
  api.renderDiagram(svg, {});
  const previous = svg.children;
  for (const [data, expected] of [
    [null, /data must be an object/],
    [{ width: Infinity }, /width and height/],
    [{ viewBox: [0, 0, 10, 0] }, /viewBox/],
    [{ participants: {} }, /must be an array/],
    [{ participants: [{ x: 10 }] }, /participants\[0\]/],
    [{ lifelines: [{ x: 0, startY: 30, endY: 20 }] }, /lifelines\[0\]/],
    [{ activations: [{ x: 0, startY: 10, endY: 20, width: -1 }] }, /activations\[0\]/]
  ]) {
    assert.throws(() => api.renderDiagram(svg, data), expected);
  }
  assert.throws(() => api.renderDiagram(element('g', ns), {}), /requires an SVG element/);
  assert.equal(svg.children, previous);
  assert.equal(svg.getAttribute('viewBox'), '0 0 760 360');
});

test('renders both samples and reports errors and recovery in the status region', () => {
  const { svg, controls } = setup(true);
  assert.match(controls.status.textContent, /3 participants.*3 lifelines.*2 activation bars/);
  assert.equal(svg.children[3].children.length, 6);
  controls.sample.value = 'nested';
  controls.sample.dispatch('change');
  assert.match(controls.status.textContent, /2 participants.*2 lifelines.*3 activation bars/);
  assert.equal(svg.children[1].children.length, 3);
  controls.sample.value = 'missing';
  controls.sample.dispatch('change');
  assert.match(controls.status.textContent, /Unable to render sample/);
  assert.equal(controls.status.getAttribute('data-error'), '');
  controls.sample.value = 'basic';
  controls.render.dispatch('click');
  assert.equal(controls.status.getAttribute('data-error'), null);
  assert.match(controls.status.textContent, /3 participants/);
});
