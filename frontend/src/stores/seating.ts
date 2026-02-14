/**
 * Seating Chart Canvas State (Nanostores)
 *
 * Client-side UI state for the floor plan canvas.
 */

import { atom } from 'nanostores';

/** Current zoom level (1 = 100%) */
export const $zoom = atom<number>(1);

/** Pan offset in pixels */
export const $panOffset = atom<{ x: number; y: number }>({ x: 0, y: 0 });

/** Currently selected object UUIDs */
export const $selectedObjectUuids = atom<string[]>([]);

/** Whether the user is currently dragging an object on the canvas */
export const $isDragging = atom<boolean>(false);

/** Whether to show the grid overlay */
export const $gridVisible = atom<boolean>(true);

/** Which panel is open: 'palette' | 'properties' | 'guests' | null */
export const $activePanel = atom<'palette' | 'properties' | 'guests' | null>('palette');
