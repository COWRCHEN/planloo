import { Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { FloorPlanObjectResponse } from '@/hooks/use-floor-plans';

interface Props {
  object: FloorPlanObjectResponse;
  isSelected: boolean;
  onSelect: () => void;
  onDragMove: (posXFt: number, posYFt: number) => void;
  onDragEnd: (posXFt: number, posYFt: number) => void;
  pixelsPerFoot: number;
  gridSnap: number;
  planWidthFt: number;
  planHeightFt: number;
}

const ELEMENT_COLORS: Record<string, { fill: string; stroke: string }> = {
  dance_floor: { fill: '#fef3c7', stroke: '#f59e0b' },
  bar: { fill: '#dbeafe', stroke: '#3b82f6' },
  buffet: { fill: '#dcfce7', stroke: '#22c55e' },
  stage: { fill: '#fce7f3', stroke: '#ec4899' },
  dj_booth: { fill: '#e0e7ff', stroke: '#6366f1' },
  photo_booth: { fill: '#fce7f3', stroke: '#f472b6' },
  entrance: { fill: '#d1fae5', stroke: '#10b981' },
  exit: { fill: '#fee2e2', stroke: '#ef4444' },
  restroom: { fill: '#f3e8ff', stroke: '#a855f7' },
  dessert_station: { fill: '#fff7ed', stroke: '#f97316' },
  gift_table: { fill: '#fdf4ff', stroke: '#d946ef' },
  custom: { fill: '#f1f5f9', stroke: '#64748b' },
};

export function ElementObject({
  object,
  isSelected,
  onSelect,
  onDragMove,
  onDragEnd,
  pixelsPerFoot: ppf,
  gridSnap,
  planWidthFt,
  planHeightFt,
}: Props) {
  const { posX, posY, widthFt, heightFt, rotation, label, elementType } = object;
  const colors = (ELEMENT_COLORS[elementType ?? 'custom'] ?? ELEMENT_COLORS.custom) as {
    fill: string;
    stroke: string;
  };

  const snapToGrid = (value: number) => {
    if (gridSnap <= 0) return value;
    return Math.round(value / gridSnap) * gridSnap;
  };

  const handleDragBound = (pos: { x: number; y: number }) => {
    const ftX = snapToGrid(Math.max(0, Math.min(planWidthFt - widthFt, pos.x / ppf)));
    const ftY = snapToGrid(Math.max(0, Math.min(planHeightFt - heightFt, pos.y / ppf)));
    return { x: ftX * ppf, y: ftY * ppf };
  };

  const extractFeetFromNode = (node: Konva.Node) => {
    const ftX = node.x() / ppf;
    const ftY = node.y() / ppf;
    return { ftX, ftY };
  };

  const handleDragMoveEvent = (e: Konva.KonvaEventObject<DragEvent>) => {
    const { ftX, ftY } = extractFeetFromNode(e.target);
    onDragMove(ftX, ftY);
  };

  const handleDragEndEvent = (e: Konva.KonvaEventObject<DragEvent>) => {
    const { ftX, ftY } = extractFeetFromNode(e.target);
    onDragEnd(ftX, ftY);
  };

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onSelect();
  };

  const setCursor = (cursor: string) => (e: Konva.KonvaEventObject<MouseEvent>) => {
    const c = e.target.getStage()?.container();
    if (c) c.style.cursor = cursor;
  };

  const centerX = (widthFt / 2) * ppf;
  const centerY = (heightFt / 2) * ppf;

  // Selected fill: stroke color with low alpha
  const selectedFill = colors.stroke + '20';
  const selectedStroke = colors.stroke;
  const normalStroke = colors.stroke + '80';

  return (
    <Group
      x={posX * ppf}
      y={posY * ppf}
      draggable={!object.isLocked}
      dragBoundFunc={handleDragBound}
      onDragMove={handleDragMoveEvent}
      onDragEnd={handleDragEndEvent}
      onClick={handleClick}
      onTap={handleClick}
      onMouseEnter={setCursor(object.isLocked ? 'default' : 'move')}
      onMouseLeave={setCursor('default')}
    >
      {/* Inner group handles rotation around center */}
      <Group
        x={centerX}
        y={centerY}
        offsetX={centerX}
        offsetY={centerY}
        rotation={rotation}
      >
        <Rect
          x={0}
          y={0}
          width={widthFt * ppf}
          height={heightFt * ppf}
          cornerRadius={5 * ppf}
          fill={isSelected ? selectedFill : colors.fill}
          stroke={isSelected ? selectedStroke : normalStroke}
          strokeWidth={isSelected ? 3 : 1.5}
          {...(elementType === 'dance_floor' ? { dash: [10 * ppf, 5 * ppf] } : {})}
        />

        {/* Label */}
        <Text
          x={0}
          y={0}
          width={widthFt * ppf}
          height={heightFt * ppf}
          text={label}
          fontSize={Math.min(12, widthFt / 8, heightFt / 3) * ppf}
          fill={colors.stroke}
          fontStyle="600"
          align="center"
          verticalAlign="middle"
          listening={false}
        />
      </Group>
    </Group>
  );
}
