import { useRef, useCallback, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $zoom, $panOffset, $selectedObjectUuids, $isDragging, $gridVisible } from '@/stores/seating';
import type { FloorPlanDetailResponse, FloorPlanObjectResponse } from '@/hooks/use-floor-plans';
import type { BulkPositionUpdate } from '@/hooks/use-floor-plan-objects';
import { TableObject } from './TableObject';
import { ElementObject } from './ElementObject';

interface Props {
  plan: FloorPlanDetailResponse;
  onObjectDragged: (update: BulkPositionUpdate) => void;
  onSelectObject: (uuid: string | null) => void;
}

export function FloorPlanCanvas({ plan, onObjectDragged, onSelectObject }: Props) {
  const zoom = useStore($zoom);
  const panOffset = useStore($panOffset);
  const selectedUuids = useStore($selectedObjectUuids);
  const gridVisible = useStore($gridVisible);

  const svgRef = useRef<SVGSVGElement>(null);
  const [dragState, setDragState] = useState<{
    objectUuid: string;
    startX: number;
    startY: number;
    origPosX: number;
    origPosY: number;
  } | null>(null);

  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const { widthFt, heightFt, gridSnap } = plan;

  // Convert screen coords to SVG coords
  const screenToSvg = useCallback(
    (clientX: number, clientY: number) => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const rect = svgRef.current.getBoundingClientRect();
      const x = (clientX - rect.left - panOffset.x) / zoom;
      const y = (clientY - rect.top - panOffset.y) / zoom;
      return { x, y };
    },
    [zoom, panOffset]
  );

  const snapToGrid = useCallback(
    (value: number) => {
      if (gridSnap <= 0) return value;
      return Math.round(value / gridSnap) * gridSnap;
    },
    [gridSnap]
  );

  const handleObjectDragStart = useCallback(
    (objectUuid: string, object: FloorPlanObjectResponse) => (e: React.PointerEvent) => {
      e.preventDefault();
      const pos = screenToSvg(e.clientX, e.clientY);
      setDragState({
        objectUuid,
        startX: pos.x,
        startY: pos.y,
        origPosX: object.posX,
        origPosY: object.posY,
      });
      $isDragging.set(true);
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [screenToSvg]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragState) {
        const pos = screenToSvg(e.clientX, e.clientY);
        const dx = pos.x - dragState.startX;
        const dy = pos.y - dragState.startY;
        const newX = snapToGrid(Math.max(0, dragState.origPosX + dx));
        const newY = snapToGrid(Math.max(0, dragState.origPosY + dy));

        onObjectDragged({
          uuid: dragState.objectUuid,
          posX: newX,
          posY: newY,
        });
      } else if (isPanning && panStartRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        $panOffset.set({
          x: panStartRef.current.panX + dx,
          y: panStartRef.current.panY + dy,
        });
      }
    },
    [dragState, isPanning, screenToSvg, snapToGrid, onObjectDragged]
  );

  const handlePointerUp = useCallback(() => {
    if (dragState) {
      setDragState(null);
      $isDragging.set(false);
    }
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
    }
  }, [dragState, isPanning]);

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only handle direct clicks on the canvas (not bubbled from objects)
      if (e.target === svgRef.current || (e.target as Element).classList.contains('canvas-bg')) {
        onSelectObject(null);

        // Start panning with middle button or if holding space
        setIsPanning(true);
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          panX: panOffset.x,
          panY: panOffset.y,
        };
      }
    },
    [onSelectObject, panOffset]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      $zoom.set(Math.max(0.25, Math.min(3, zoom + delta)));
    },
    [zoom]
  );

  // Render grid lines
  const gridLines = [];
  if (gridVisible && gridSnap > 0) {
    for (let x = 0; x <= widthFt; x += gridSnap) {
      gridLines.push(
        <line
          key={`v${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={heightFt}
          stroke="#e5e7eb"
          strokeWidth={0.1}
        />
      );
    }
    for (let y = 0; y <= heightFt; y += gridSnap) {
      gridLines.push(
        <line
          key={`h${y}`}
          x1={0}
          y1={y}
          x2={widthFt}
          y2={y}
          stroke="#e5e7eb"
          strokeWidth={0.1}
        />
      );
    }
  }

  return (
    <div
      className="flex-1 overflow-hidden bg-gray-100 relative"
      style={{ cursor: isPanning ? 'grabbing' : 'default' }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${widthFt} ${heightFt}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
          transformOrigin: '0 0',
        }}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      >
        {/* Background */}
        <rect
          className="canvas-bg"
          x={0}
          y={0}
          width={widthFt}
          height={heightFt}
          fill="#ffffff"
          stroke="#d1d5db"
          strokeWidth={0.2}
        />

        {/* Grid */}
        {gridLines}

        {/* Dimensions label */}
        <text x={widthFt / 2} y={heightFt + 2} textAnchor="middle" fontSize={1} fill="#9ca3af">
          {widthFt} × {heightFt} ft
        </text>

        {/* Objects */}
        {plan.objects.map((obj) => {
          const isSelected = selectedUuids.includes(obj.uuid);
          if (obj.objectType === 'table') {
            return (
              <TableObject
                key={obj.uuid}
                object={obj}
                isSelected={isSelected}
                onSelect={() => onSelectObject(obj.uuid)}
                onDragStart={handleObjectDragStart(obj.uuid, obj)}
              />
            );
          }
          return (
            <ElementObject
              key={obj.uuid}
              object={obj}
              isSelected={isSelected}
              onSelect={() => onSelectObject(obj.uuid)}
              onDragStart={handleObjectDragStart(obj.uuid, obj)}
            />
          );
        })}
      </svg>
    </div>
  );
}
