import type { Bounds } from '../geometry/viewport';
import type { AlignGuide } from '../render/flowPayload';

export interface AlignmentResult {
  /** Offset that snaps the moving box onto the nearest line, or null when none is close enough. */
  dx: number | null;
  dy: number | null;
  guides: AlignGuide[];
}

type Axis = AlignGuide['axis'];

/** Edges and center of a box along one axis: left, center, right or top, middle, bottom. */
function getLines(bounds: Bounds, axis: Axis): number[] {
  const [min, max] = axis === 'x' ? [bounds.minX, bounds.maxX] : [bounds.minY, bounds.maxY];
  return [min, (min + max) / 2, max];
}

/** Extent across the other axis, which is how far a guide line reaches. */
function getSpan(bounds: Bounds, axis: Axis): [number, number] {
  return axis === 'x' ? [bounds.minY, bounds.maxY] : [bounds.minX, bounds.maxX];
}

function findSnap(moving: Bounds, others: Bounds[], axis: Axis, threshold: number): number | null {
  let best: number | null = null;
  const movingLines = getLines(moving, axis);
  others.forEach((other) => {
    getLines(other, axis).forEach((target) => {
      movingLines.forEach((line) => {
        const offset = target - line;
        if (Math.abs(offset) <= threshold && (best === null || Math.abs(offset) < Math.abs(best))) {
          best = offset;
        }
      });
    });
  });
  return best;
}

function shiftBounds(bounds: Bounds, dx: number, dy: number): Bounds {
  return { minX: bounds.minX + dx, maxX: bounds.maxX + dx, minY: bounds.minY + dy, maxY: bounds.maxY + dy };
}

/** One guide per aligned line, stretched over the moving box and every node on that line. */
function collectGuides(moving: Bounds, others: Bounds[], axis: Axis): AlignGuide[] {
  const EPSILON = 0.5;
  const guides = new Map<number, AlignGuide>();
  const movingLines = getLines(moving, axis);
  others.forEach((other) => {
    getLines(other, axis).forEach((position) => {
      if (!movingLines.some((line) => Math.abs(line - position) < EPSILON)) {
        return;
      }
      const [movingStart, movingEnd] = getSpan(moving, axis);
      const [otherStart, otherEnd] = getSpan(other, axis);
      const key = Math.round(position);
      const existing = guides.get(key);
      guides.set(key, {
        axis,
        position,
        start: Math.min(movingStart, otherStart, existing?.start ?? Infinity),
        end: Math.max(movingEnd, otherEnd, existing?.end ?? -Infinity),
      });
    });
  });
  return Array.from(guides.values());
}

/**
 * Snaps the moving box so one of its edges or its center lines up with the
 * edges or center of another node, when within `threshold` world units, and
 * returns the guide lines to draw.
 */
export function calcAlignment(moving: Bounds, others: Bounds[], threshold: number): AlignmentResult {
  const dx = findSnap(moving, others, 'x', threshold);
  const dy = findSnap(moving, others, 'y', threshold);
  const snapped = shiftBounds(moving, dx ?? 0, dy ?? 0);
  const guides = [
    ...(dx === null ? [] : collectGuides(snapped, others, 'x')),
    ...(dy === null ? [] : collectGuides(snapped, others, 'y')),
  ];
  return { dx, dy, guides };
}
