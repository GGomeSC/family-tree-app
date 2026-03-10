import { LayoutPerson } from "../types";

export const LAYOUT = {
  NODE_WIDTH: 220,
  NODE_HEIGHT: 96,
  PAD_X: 64,
  PAD_Y: 44,
  MIN_TREE_WIDTH: 860,
  MIN_TREE_HEIGHT: 260,
  MOBILE_BREAKPOINT: 900,
  UNION_LINE_OFFSET_Y: 12,
  CHILD_BRIDGE_OFFSET_Y: 18,
  MIN_SCALE: 0.5,
  MAX_SCALE: 2,
  AUTO_SCALE_MIN: 0.55,
  AUTO_SCALE_MAX: 1.8,
};

interface PreviewPoint {
  x: number;
  y: number;
}

type PreviewPosition = Pick<LayoutPerson, "x" | "y">;

export function clampScale(value: number, min = LAYOUT.MIN_SCALE, max = LAYOUT.MAX_SCALE) {
  return Math.min(max, Math.max(min, value));
}

export function getPreviewCanvasSize(persons: PreviewPosition[]) {
  const maxX = persons.reduce((acc, person) => Math.max(acc, person.x), 0);
  const maxY = persons.reduce((acc, person) => Math.max(acc, person.y), 0);

  return {
    width: Math.max(maxX + LAYOUT.NODE_WIDTH + LAYOUT.PAD_X * 2, LAYOUT.MIN_TREE_WIDTH),
    height: Math.max(maxY + LAYOUT.NODE_HEIGHT + LAYOUT.PAD_Y * 2, LAYOUT.MIN_TREE_HEIGHT),
  };
}

export function getNodeTopCenter(node: LayoutPerson): PreviewPoint {
  return {
    x: node.x + LAYOUT.NODE_WIDTH / 2 + LAYOUT.PAD_X,
    y: node.y + LAYOUT.PAD_Y,
  };
}

export function getNodeBottomCenter(node: LayoutPerson): PreviewPoint {
  return {
    x: node.x + LAYOUT.NODE_WIDTH / 2 + LAYOUT.PAD_X,
    y: node.y + LAYOUT.NODE_HEIGHT + LAYOUT.PAD_Y,
  };
}

export function getUnionConnectionY(node: LayoutPerson) {
  return getNodeTopCenter(node).y + LAYOUT.UNION_LINE_OFFSET_Y;
}

export function getUnionToChildPath(firstParent: LayoutPerson, secondParent: LayoutPerson, child: LayoutPerson) {
  const firstCenter = getNodeTopCenter(firstParent);
  const secondCenter = getNodeTopCenter(secondParent);
  const childTopCenter = getNodeTopCenter(child);
  const midpointX = (firstCenter.x + secondCenter.x) / 2;
  const midpointY = getUnionConnectionY(firstParent);
  const bridgeY = childTopCenter.y - LAYOUT.CHILD_BRIDGE_OFFSET_Y;

  return `M ${midpointX} ${midpointY} V ${bridgeY} H ${childTopCenter.x} V ${childTopCenter.y}`;
}

export function getResponsivePreviewScale(persons: PreviewPosition[], availableWidth: number, zoomFactor = 1) {
  const { width } = getPreviewCanvasSize(persons);
  const fittedScale = availableWidth ? Math.min(1, availableWidth / width) : 1;
  return clampScale(fittedScale * zoomFactor, LAYOUT.AUTO_SCALE_MIN, LAYOUT.AUTO_SCALE_MAX);
}
