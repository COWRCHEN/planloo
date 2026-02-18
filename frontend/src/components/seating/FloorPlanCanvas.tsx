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
const SCROLLBAR_SIZE = 6;
const SCROLLBAR_MIN_THUMB = 20;

export function FloorPlanCanvas({ plan, onObjectDragged, onSelectObject }: Props) {
  const zoom = useStore($zoom);
  const panOffset = useStore($panOffset);
  const selectedUuids = useStore($selectedObjectUuids);
  const gridVisible = useStore($gridVisible);

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [isDraggingStage, setIsDraggingStage] = useState(false);

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

    const onFullscreenChange = () => {
      requestAnimationFrame(() => measureContainer());
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      observer.disconnect();
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [measureContainer]);

  const ppf = containerSize.width / widthFt;
  const stageWidth = widthFt * ppf;   // equals containerSize.width
  const stageHeight = heightFt * ppf;

  // Virtual content size at current zoom
  const virtualWidth = Math.max(stageWidth * zoom, containerSize.width);
  const virtualHeight = Math.max(stageHeight * zoom, containerSize.height);

  // Clamp panOffset to valid bounds
  const maxPanX = Math.max(0, virtualWidth - containerSize.width);
  const maxPanY = Math.max(0, virtualHeight - containerSize.height);
  const effectivePanX = Math.max(-maxPanX, Math.min(0, panOffset.x));
  const effectivePanY = Math.max(-maxPanY, Math.min(0, panOffset.y));

  // Update cursor on Konva's internal container element
  useEffect(() => {
    const container = stageRef.current?.container();
    if (container) {
      container.style.cursor = isDraggingStage ? 'grabbing' : 'grab';
    }
  }, [isDraggingStage]);

  // Keep store in sync with clamped value (e.g. after toolbar zoom changes)
  useEffect(() => {
    const current = $panOffset.get();
    if (current.x !== effectivePanX || current.y !== effectivePanY) {
      $panOffset.set({ x: effectivePanX, y: effectivePanY });
    }
  }, [effectivePanX, effectivePanY]);

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
  const handleStageDragStart = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      if (e.target === e.target.getStage()) {
        setIsDraggingStage(true);
      }
    },
    []
  );

  const handleStageDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      if (e.target !== e.target.getStage()) return;
      setIsDraggingStage(false);
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

  // Grid lines — ensure minimum pixel spacing so dense grids don't become solid fill
  const gridLines: React.ReactNode[] = [];
  if (gridVisible && gridSnap > 0) {
    const MIN_GRID_PX = 20;
    const effectiveSnap = gridSnap * ppf >= MIN_GRID_PX
      ? gridSnap
      : Math.ceil(MIN_GRID_PX / ppf);

    for (let x = 0; x <= widthFt; x += effectiveSnap) {
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
    for (let y = 0; y <= heightFt; y += effectiveSnap) {
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

  // Custom scrollbar indicators
  const showHBar = virtualWidth > containerSize.width + 1;
  const showVBar = virtualHeight > containerSize.height + 1;

  const hThumbRatio = containerSize.width / virtualWidth;
  const hThumbWidth = Math.max(SCROLLBAR_MIN_THUMB, hThumbRatio * containerSize.width);
  const hTrackRange = containerSize.width - hThumbWidth - (showVBar ? SCROLLBAR_SIZE : 0);
  const hThumbLeft = maxPanX > 0 ? (-effectivePanX / maxPanX) * hTrackRange : 0;

  const vThumbRatio = containerSize.height / virtualHeight;
  const vThumbHeight = Math.max(SCROLLBAR_MIN_THUMB, vThumbRatio * containerSize.height);
  const vTrackRange = containerSize.height - vThumbHeight - (showHBar ? SCROLLBAR_SIZE : 0);
  const vThumbTop = maxPanY > 0 ? (-effectivePanY / maxPanY) * vTrackRange : 0;

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden bg-gray-100 relative"
    >
      <div className="absolute inset-0">
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={effectivePanX}
        y={effectivePanY}
        draggable
        onWheel={handleWheel}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onDragStart={handleStageDragStart}
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

      {/* Custom scrollbar indicators — thin overlays, no native scroll */}
      {showHBar && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: 0,
            bottom: 0,
            width: containerSize.width - (showVBar ? SCROLLBAR_SIZE : 0),
            height: SCROLLBAR_SIZE,
          }}
        >
          <div
            className="rounded-full bg-black/30 transition-opacity"
            style={{
              position: 'absolute',
              top: 1,
              left: hThumbLeft,
              width: hThumbWidth,
              height: SCROLLBAR_SIZE - 2,
              minWidth: SCROLLBAR_MIN_THUMB,
            }}
          />
        </div>
      )}
      {showVBar && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: 0,
            right: 0,
            height: containerSize.height - (showHBar ? SCROLLBAR_SIZE : 0),
            width: SCROLLBAR_SIZE,
          }}
        >
          <div
            className="rounded-full bg-black/30 transition-opacity"
            style={{
              position: 'absolute',
              left: 1,
              top: vThumbTop,
              height: vThumbHeight,
              width: SCROLLBAR_SIZE - 2,
              minHeight: SCROLLBAR_MIN_THUMB,
            }}
          />
        </div>
      )}
    </div>
  );
}
