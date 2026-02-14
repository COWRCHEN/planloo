import type { FloorPlanObjectResponse, SeatAssignmentResponse } from '@/hooks/use-floor-plans';

interface Props {
  object: FloorPlanObjectResponse;
  isSelected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.PointerEvent) => void;
}

const RSVP_COLORS: Record<string, string> = {
  confirmed: '#22c55e',
  pending: '#f59e0b',
  invited: '#f59e0b',
  declined: '#ef4444',
  maybe: '#a855f7',
};

export function TableObject({ object, isSelected, onSelect, onDragStart }: Props) {
  const { posX, posY, widthFt, heightFt, rotation, seatCount, tableShape, label, assignments } = object;
  const seats = seatCount ?? 8;

  // Calculate seat positions around the perimeter
  const seatPositions = getSeatPositions(tableShape, widthFt, heightFt, seats);

  // Map assignments by seat number
  const assignmentMap = new Map<number, SeatAssignmentResponse>();
  for (const a of assignments) {
    assignmentMap.set(a.seatNumber, a);
  }

  const isRound = tableShape === 'round' || tableShape === 'oval';
  const seatRadius = 0.6;

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
      {/* Table shape */}
      {isRound ? (
        <ellipse
          cx={widthFt / 2}
          cy={heightFt / 2}
          rx={widthFt / 2}
          ry={heightFt / 2}
          fill={isSelected ? '#ede9fe' : '#f5f3ff'}
          stroke={isSelected ? '#7c3aed' : '#c4b5fd'}
          strokeWidth={isSelected ? 0.3 : 0.15}
        />
      ) : (
        <rect
          x={0}
          y={0}
          width={widthFt}
          height={heightFt}
          rx={0.4}
          fill={isSelected ? '#ede9fe' : '#f5f3ff'}
          stroke={isSelected ? '#7c3aed' : '#c4b5fd'}
          strokeWidth={isSelected ? 0.3 : 0.15}
        />
      )}

      {/* Table label */}
      <text
        x={widthFt / 2}
        y={heightFt / 2 - 0.3}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={Math.min(1.2, widthFt / 6)}
        fill="#4c1d95"
        fontWeight="600"
      >
        {label}
      </text>

      {/* Seat count text */}
      <text
        x={widthFt / 2}
        y={heightFt / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={0.8}
        fill="#7c3aed"
        opacity={0.6}
      >
        {assignments.length}/{seats}
      </text>

      {/* Seats */}
      {seatPositions.map((pos, i) => {
        const seatNum = i + 1;
        const assignment = assignmentMap.get(seatNum);
        const fillColor = assignment
          ? RSVP_COLORS[assignment.guestRsvpStatus ?? 'pending'] ?? '#9ca3af'
          : '#d1d5db';

        return (
          <g key={seatNum}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={seatRadius}
              fill={fillColor}
              stroke="#fff"
              strokeWidth={0.1}
            />
            {assignment && assignment.guestDietaryRestrictions && (
              <DietaryIcon
                x={pos.x + seatRadius * 0.5}
                y={pos.y - seatRadius * 0.5}
                dietary={assignment.guestDietaryRestrictions}
              />
            )}
            {/* Seat number (tiny) */}
            <text
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={0.5}
              fill="#fff"
              fontWeight="bold"
            >
              {seatNum}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function getSeatPositions(
  shape: string | null,
  width: number,
  height: number,
  count: number
): Array<{ x: number; y: number }> {
  const isRound = shape === 'round' || shape === 'oval';
  const margin = 1.2;
  const positions: Array<{ x: number; y: number }> = [];

  if (isRound) {
    const cx = width / 2;
    const cy = height / 2;
    const rx = width / 2 + margin;
    const ry = height / 2 + margin;
    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      positions.push({
        x: cx + rx * Math.cos(angle),
        y: cy + ry * Math.sin(angle),
      });
    }
  } else {
    // Distribute seats around rectangle perimeter
    const perimeter = 2 * (width + height);
    const spacing = perimeter / count;

    for (let i = 0; i < count; i++) {
      const dist = i * spacing;
      let x: number, y: number;

      if (dist < width) {
        // Top edge
        x = dist;
        y = -margin;
      } else if (dist < width + height) {
        // Right edge
        x = width + margin;
        y = dist - width;
      } else if (dist < 2 * width + height) {
        // Bottom edge
        x = width - (dist - width - height);
        y = height + margin;
      } else {
        // Left edge
        x = -margin;
        y = height - (dist - 2 * width - height);
      }
      positions.push({ x, y });
    }
  }

  return positions;
}

function DietaryIcon({ x, y, dietary }: { x: number; y: number; dietary: string }) {
  const lower = dietary.toLowerCase();
  let symbol = '';
  let color = '#059669';

  if (lower.includes('vegan') || lower.includes('vegetarian')) {
    symbol = 'V';
    color = '#059669';
  } else if (lower.includes('gluten')) {
    symbol = 'G';
    color = '#d97706';
  } else if (lower.includes('kosher') || lower.includes('halal')) {
    symbol = 'K';
    color = '#7c3aed';
  } else if (lower.includes('allerg')) {
    symbol = '!';
    color = '#dc2626';
  } else {
    symbol = 'D';
  }

  return (
    <g>
      <circle cx={x} cy={y} r={0.35} fill={color} />
      <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={0.35} fill="#fff" fontWeight="bold">
        {symbol}
      </text>
    </g>
  );
}
