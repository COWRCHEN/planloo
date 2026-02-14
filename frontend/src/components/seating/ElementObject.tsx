import type { FloorPlanObjectResponse } from '@/hooks/use-floor-plans';

interface Props {
  object: FloorPlanObjectResponse;
  isSelected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.PointerEvent) => void;
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

export function ElementObject({ object, isSelected, onSelect, onDragStart }: Props) {
  const { posX, posY, widthFt, heightFt, rotation, label, elementType } = object;
  const colors = (ELEMENT_COLORS[elementType ?? 'custom'] ?? ELEMENT_COLORS.custom) as { fill: string; stroke: string };

  return (
    <g
      transform={`translate(${posX}, ${posY}) rotate(${rotation}, ${widthFt / 2}, ${heightFt / 2})`}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
        if (!object.isLocked) onDragStart(e);
      }}
      style={{ cursor: object.isLocked ? 'default' : 'move' }}
    >
      <rect
        x={0}
        y={0}
        width={widthFt}
        height={heightFt}
        rx={0.5}
        fill={isSelected ? colors.stroke + '20' : colors.fill}
        stroke={isSelected ? colors.stroke : colors.stroke + '80'}
        strokeWidth={isSelected ? 0.3 : 0.15}
        strokeDasharray={elementType === 'dance_floor' ? '1 0.5' : undefined}
      />
      <text
        x={widthFt / 2}
        y={heightFt / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={Math.min(1.2, widthFt / 8, heightFt / 3)}
        fill={colors.stroke}
        fontWeight="600"
      >
        {label}
      </text>
    </g>
  );
}
