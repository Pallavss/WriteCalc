import { Point, Stroke } from '../types';

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

/**
 * Calculates the bounding box for a set of points.
 */
export function getBounds(points: Point[]): Bounds {
  if (!points || points.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

/**
 * Calculates the bounding box for a group of strokes.
 */
export function getGroupBounds(strokes: Stroke[]): Bounds {
  return getBounds(strokes.flat());
}

/**
 * Checks if two bounding boxes intersect.
 * Padding allows for proximity matching.
 */
export function isIntersecting(b1: Bounds, b2: Bounds, padding = 0): boolean {
  return !(
    b2.minX > b1.maxX + padding ||
    b2.maxX < b1.minX - padding ||
    b2.minY > b1.maxY + padding ||
    b2.maxY < b1.minY - padding
  );
}

/**
 * Groups raw strokes into discrete clusters representing separate numbers (lines).
 * Strokes are grouped if they are close to each other.
 */
export function clusterStrokes(strokes: Stroke[]): Stroke[][] {
  if (strokes.length === 0) return [];
  
  const groups: Stroke[][] = [];
  const used = new Set<Stroke>();

  for (let i = 0; i < strokes.length; i++) {
    if (used.has(strokes[i])) continue;
    
    const currentGroup: Stroke[] = [strokes[i]];
    used.add(strokes[i]);
    let groupBounds = getGroupBounds(currentGroup);

    let added: boolean;
    do {
      added = false;
      for (let j = 0; j < strokes.length; j++) {
        if (!used.has(strokes[j])) {
          const strokeBounds = getBounds(strokes[j]);
          // Use 40px padding to group separated digits of the same number horizontally/vertically
          if (isIntersecting(groupBounds, strokeBounds, 40)) {
            currentGroup.push(strokes[j]);
            used.add(strokes[j]);
            groupBounds = getGroupBounds(currentGroup);
            added = true;
          }
        }
      }
    } while (added);

    groups.push(currentGroup);
  }

  // Sort groups top to bottom (based on Y position)
  return groups.sort((a, b) => getGroupBounds(a).minY - getGroupBounds(b).minY);
}

/**
 * Groups a cluster of strokes into separate horizontally-spaced digits.
 */
export function groupStrokesHorizontally(strokes: Stroke[]): Stroke[][] {
  if (strokes.length === 0) return [];

  const groups: Stroke[][] = [];
  const used = new Set<Stroke>();

  for (let i = 0; i < strokes.length; i++) {
    if (used.has(strokes[i])) continue;
    
    const currentGroup: Stroke[] = [strokes[i]];
    used.add(strokes[i]);
    let groupBounds = getGroupBounds(currentGroup);

    let added: boolean;
    do {
      added = false;
      for (let j = 0; j < strokes.length; j++) {
        if (!used.has(strokes[j])) {
          const strokeBounds = getBounds(strokes[j]);
          // Check horizontal intersection/proximity (e.g., 5px padding)
          // We also require vertical overlap so we don't accidentally group things that are just above/below
          const xIntersect = !(strokeBounds.minX > groupBounds.maxX + 5 || strokeBounds.maxX < groupBounds.minX - 5);
          const yIntersect = !(strokeBounds.minY > groupBounds.maxY || strokeBounds.maxY < groupBounds.minY);
          
          if (xIntersect && yIntersect) {
            currentGroup.push(strokes[j]);
            used.add(strokes[j]);
            groupBounds = getGroupBounds(currentGroup);
            added = true;
          }
        }
      }
    } while (added);

    groups.push(currentGroup);
  }

  // Sort groups left to right
  return groups.sort((a, b) => getGroupBounds(a).minX - getGroupBounds(b).minX);
}
