import type { EdgeAppearance, FlowEdge, FlowNode, FlowNodeStyle, NodeAppearance } from '../types';
import type { FlowTheme } from '../theme/flowTheme';

/** Drops undefined fields so they don't overwrite lower-priority values when spread. */
export function pickDefined<T extends object>(value: T | undefined): Partial<T> {
  if (!value) {
    return {};
  }
  return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as Partial<T>;
}

/** Theme shape style, then the lane's node style, then the node's own style. */
export function resolveNodeAppearance(node: FlowNode, theme: FlowTheme, laneNodeStyle?: FlowNodeStyle): NodeAppearance {
  const shapeStyle = theme.shapes[node.shape];
  const base: NodeAppearance = {
    fill: shapeStyle.fill,
    stroke: shapeStyle.stroke,
    textColor: shapeStyle.text,
    lineWidth: theme.node.lineWidth,
    activeLineWidth: theme.node.activeLineWidth,
    lineDash: theme.node.lineDash,
    fontSize: theme.text.fontSize,
    fontWeight: theme.text.fontWeight,
    lineHeight: theme.text.lineHeight,
    textOverflow: theme.text.overflow,
    radius: theme.node.radius,
    shadowColor: theme.node.shadowColor,
    shadowBlur: theme.node.shadowBlur,
    shadowOffsetY: theme.node.shadowOffsetY,
    opacity: 1,
  };
  const merged = { ...base, ...pickDefined(laneNodeStyle), ...pickDefined(node.style) };
  // A larger font needs taller lines unless the theme spacing already covers it.
  const minLineHeight = Math.ceil(merged.fontSize * 1.3);
  return { ...merged, lineHeight: Math.max(merged.lineHeight, minLineHeight) };
}

export function resolveEdgeAppearance(edge: FlowEdge, theme: FlowTheme): EdgeAppearance {
  const { labelRadius: _labelRadius, ...themeEdge } = theme.edge;
  return { ...themeEdge, ...pickDefined(edge.style) };
}
