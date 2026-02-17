import { useRef, useCallback, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Line, Text } from 'react-konva';
import type Konva from 'konva';
import { useStore } from '@nanostores/react';
import { $zoom, $panOffset, $selectedObjectUuids, $gridVisible } from '@/stores/seating';
import type { FloorPlanDetailResponse } from '@/hooks/use-floor-plans';
import type { BulkPositionUpdate } from '@/hooks/use-floor-plan-objects';
import { TableObject } from './TableObject';
import { ElementObject } from './ElementObject';

interface Props {
  plan: FloorPlanDetailResponse;
  onObjectDragged: (update: BulkPositionUpdate) => void;
  onSelectObject: (uuid: string | null) => void;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_SPEED = 1.1;

export function FloorPlanCanvas({ plan, onObjectDragged, onSelectObject }: Props) {
  const zoom = useStore($zoom);
  const panOffset = useStore($panOffset);
  const selectedUuids = useStore($selectedObjectUuids);
  const gridVisible = useStore($gridVisible);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  const { widthFt, heightFt, gridSnap } = plan;

  // Measure container
  const measureContainer = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    if (width > 0 && height > 0) {
      setContainerSize({ width, height });
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(el);

    // Force remeasure on fullscreen exit — ResizeObserver may not fire reliably
    const onFullscreenChange = () => {
      // Small delay to let the layout settle after fullscreen transition
      requestAnimationFrame(() => measureContainer());
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      observer.disconnect();
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [measureContainer]);

  // Calculate pixels per foot based on container width so objects maintain
  // consistent visual size across normal and fullscreen modes.  The plan may
  // extend below the visible area; zoom/pan handles navigation.
  const ppf = containerSize.width / widthFt;
  const stageWidth = widthFt * ppf;   // equals containerSize.width
  const stageHeight = heightFt * ppf;

  // Zoom-to-cursor on wheel
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = e.target.getStage();
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const oldZoom = zoom;
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * (direction > 0 ? ZOOM_SPEED : 1 / ZOOM_SPEED)));

      // Adjust pan so the point under the cursor stays fixed
      const mousePointTo = {
        x: (pointer.x - panOffset.x) / oldZoom,
        y: (pointer.y - panOffset.y) / oldZoom,
      };

      const newPan = {
        x: pointer.x - mousePointTo.x * newZoom,
        y: pointer.y - mousePointTo.y * newZoom,
      };

      $zoom.set(newZoom);
      $panOffset.set(newPan);
    },
    [zoom, panOffset]
  );

  // Click on empty area to deselect
  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target === e.target.getStage()) {
        onSelectObject(null);
      }
    },
    [onSelectObject]
  );

  // Pan by dragging the stage background
  const handleStageDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      // Only handle stage drag (not child drags)
      if (e.target !== e.target.getStage()) return;
      const stage = e.target.getStage();
      if (!stage) return;
      $panOffset.set({ x: stage.x(), y: stage.y() });
    },
    []
  );

  // Object drag callbacks
  const handleObjectDragMove = useCallback(
    (uuid: string, posXFt: number, posYFt: number) => {
      onObjectDragged({ uuid, posX: posXFt, posY: posYFt });
    },
    [onObjectDragged]
  );

  const handleObjectDragEnd = useCallback(
    (uuid: string, posXFt: number, posYFt: number) => {
      onObjectDragged({ uuid, posX: posXFt, posY: posYFt });
    },
    [onObjectDragged]
  );

  // Grid lines
  const gridLines: React.ReactNode[] = [];
  if (gridVisible && gridSnap > 0) {
    for (let x = 0; x <= widthFt; x += gridSnap) {
      gridLines.push(
        <Line
          key={`v${x}`}
          points={[x * ppf, 0, x * ppf, heightFt * ppf]}
          stroke="#e5e7eb"
          strokeWidth={1}
          listening={false}
        />
      );
    }
    for (let y = 0; y <= heightFt; y += gridSnap) {
      gridLines.push(
        <Line
          key={`h${y}`}
          points={[0, y * ppf, widthFt * ppf, y * ppf]}
          stroke="#e5e7eb"
          strokeWidth={1}
          listening={false}
        />
      );
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden bg-gray-100 relative"
    >
      <div className="absolute inset-0">
      <Stage
        width={containerSize.width}
        height={containerSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={panOffset.x}
        y={panOffset.y}
        draggable
        onWheel={handleWheel}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onDragEnd={handleStageDragEnd}
      >
        {/* Background + grid layer */}
        <Layer>
          {/* White floor plan background */}
          <Rect
            x={0}
            y={0}
            width={stageWidth}
            height={stageHeight}
            fill="#ffffff"
            stroke="#d1d5db"
            strokeWidth={2 / zoom}
            listening={false}
          />

          {/* Grid */}
          {gridLines}

          {/* Dimensions label */}
          <Text
            x={0}
            y={stageHeight + 4}
            width={stageWidth}
            text={`${widthFt} × ${heightFt} ft`}
            fontSize={12}
            fill="#9ca3af"
            align="center"
            listening={false}
          />
        </Layer>

        {/* Objects layer */}
        <Layer>
          {plan.objects.map((obj) => {
            const isSelected = selectedUuids.includes(obj.uuid);
            if (obj.objectType === 'table') {
              return (
                <TableObject
                  key={obj.uuid}
                  object={obj}
                  isSelected={isSelected}
                  onSelect={() => onSelectObject(obj.uuid)}
                  onDragMove={(x, y) => handleObjectDragMove(obj.uuid, x, y)}
                  onDragEnd={(x, y) => handleObjectDragEnd(obj.uuid, x, y)}
                  pixelsPerFoot={ppf}
                  gridSnap={gridSnap}
                  planWidthFt={widthFt}
                  planHeightFt={heightFt}
                />
              );
            }
            return (
              <ElementObject
                key={obj.uuid}
                object={obj}
                isSelected={isSelected}
                onSelect={() => onSelectObject(obj.uuid)}
                onDragMove={(x, y) => handleObjectDragMove(obj.uuid, x, y)}
                onDragEnd={(x, y) => handleObjectDragEnd(obj.uuid, x, y)}
                pixelsPerFoot={ppf}
                gridSnap={gridSnap}
                planWidthFt={widthFt}
                planHeightFt={heightFt}
              />
            );
          })}
        </Layer>
      </Stage>
      </div>
    </div>
  );
}
