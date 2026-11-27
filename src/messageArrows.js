
/**
 * Member B: UML Sequence Diagram Message Rendering
 * HTML + JavaScript + SVG
 *
 * Supported message types:
 * synchronous, asynchronous, reply, self,
 * found, lost, create, destroy
 *
 * Lifelines and layout are handled by other team members.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const STROKE = '#111';
const LINE_WIDTH = 1.6;

const SUPPORTED_TYPES = new Set([
  'synchronous',
  'asynchronous',
  'reply',
  'self',
  'found',
  'lost',
  'create',
  'destroy'
]);

function svgNode(tag, attributes = {}) {
  const node = document.createElementNS(SVG_NS, tag);

  for (const [name, value] of Object.entries(attributes)) {
    node.setAttribute(name, String(value));
  }

  return node;
}

function drawArrowhead(group, tipX, y, direction, filled = false) {
  const backX = tipX - direction * 11;

  if (filled) {
    group.appendChild(svgNode('polygon', {
      points: `${tipX},${y} ${backX},${y - 5} ${backX},${y + 5}`,
      fill: STROKE
    }));
  } else {
    group.appendChild(svgNode('polyline', {
      points: `${backX},${y - 5} ${tipX},${y} ${backX},${y + 5}`,
      fill: 'none',
      stroke: STROKE,
      'stroke-width': LINE_WIDTH
    }));
  }
}

function drawLabel(group, label, x, y) {
  if (!label) return;

  const text = svgNode('text', {
    x,
    y,
    'text-anchor': 'middle',
    'font-family': 'Arial, Helvetica, sans-serif',
    'font-size': 13,
    fill: STROKE
  });

  text.textContent = String(label);
  group.appendChild(text);
}

/**
 * Draw a UML message.
 *
 * Coordinates are provided by the layout module.
 *
 * targetHeaderWidth is required for creation messages.
 * labelX can be provided to control label placement.
 */
export function drawMessage(svg, {
  type = 'synchronous',
  fromX,
  toX,
  y,
  label = '',
  labelX,
  side = 'right',
  targetHeaderWidth
} = {}) {

  if (!svg || svg.namespaceURI !== SVG_NS ||
      svg.localName !== 'svg') {
    throw new TypeError('Expected an SVG element');
  }

  if (![fromX, toX, y].every(Number.isFinite)) {
    throw new TypeError('Coordinates must be finite numbers');
  }

  if (!SUPPORTED_TYPES.has(type)) {
    throw new Error(`Unsupported message type: ${type}`);
  }

  if (labelX !== undefined && !Number.isFinite(labelX)) {
    throw new TypeError('labelX must be a finite number');
  }

  if (type === 'create' &&
      (!Number.isFinite(targetHeaderWidth) ||
       targetHeaderWidth <= 0)) {
    throw new TypeError(
      'Creation messages require a positive targetHeaderWidth'
    );
  }

  if (type === 'self' && !['left', 'right'].includes(side)) {
    throw new Error('Self-message side must be left or right');
  }

  const group = svgNode('g', {
    'data-message-type': type,
    'aria-label': `${type} message: ${label}`
  });

  // SELF MESSAGE
  if (type === 'self') {
    if (fromX !== toX) {
      throw new Error('Self-message must use the same lifeline');
    }

    const sign = side === 'left' ? -1 : 1;
    const bendX = fromX + sign * 54;
    const returnY = y + 35;

    group.appendChild(svgNode('path', {
      d: `M ${fromX} ${y} H ${bendX} V ${returnY} H ${fromX}`,
      fill: 'none',
      stroke: STROKE,
      'stroke-width': LINE_WIDTH
    }));

    drawArrowhead(group, fromX, returnY, -sign, true);

    drawLabel(
      group,
      label,
      labelX ?? fromX + sign * 27,
      y - 9
    );

  } else {

    if (fromX === toX) {
      throw new Error('Use type "self" for the same lifeline');
    }

    const direction = toX > fromX ? 1 : -1;

    // Creation arrows end at the participant header border.
    const endX = type === 'create'
      ? toX - direction * targetHeaderWidth / 2
      : toX;

    if ((endX - fromX) * direction <= 0) {
      throw new Error('Creation header overlaps the sender');
    }

    // MESSAGE LINE
    group.appendChild(svgNode('line', {
      x1: fromX,
      y1: y,
      x2: endX,
      y2: y,
      stroke: STROKE,
      'stroke-width': LINE_WIDTH,
      ...(['reply', 'create'].includes(type)
        ? { 'stroke-dasharray': '6 4' }
        : {})
    }));

    // FOUND MESSAGE
    if (type === 'found') {
      group.appendChild(svgNode('circle', {
        cx: fromX,
        cy: y,
        r: 5,
        fill: STROKE
      }));
    }

    // LOST MESSAGE
    if (type === 'lost') {
      group.appendChild(svgNode('circle', {
        cx: toX,
        cy: y,
        r: 5,
        fill: STROKE
      }));

    // DESTRUCTION MESSAGE
    } else if (type === 'destroy') {
      group.appendChild(svgNode('path', {
        d:
          `M ${toX - 9} ${y - 9} L ${toX + 9} ${y + 9}` +
          ` M ${toX - 9} ${y + 9} L ${toX + 9} ${y - 9}`,
        fill: 'none',
        stroke: STROKE,
        'stroke-width': 2
      }));

    } else {
      // NORMAL AND CREATION ARROWHEADS
      drawArrowhead(
        group,
        endX,
        y,
        direction,
        type === 'synchronous'
      );
    }

    drawLabel(
      group,
      label,
      labelX ?? (fromX + endX) / 2,
      y - 9
    );
  }

  svg.appendChild(group);
  return group;
}
