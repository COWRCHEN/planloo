import { Group, Ellipse, Rect, Circle, Text, Shape } from 'react-konva';
import type Konva from 'konva';
import type { FloorPlanObjectResponse, SeatAssignmentResponse } from '@/hooks/use-floor-plans';

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

const RSVP_COLORS: Record<string, string> = {
  confirmed: '#22c55e',
  pending: '#f59e0b',
  invited: '#f59e0b',
  declined: '#ef4444',
  maybe: '#a855f7',
};

export function TableObject({
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
  const { posX, posY, widthFt, heightFt, rotation, seatCount, seatTop, seatBottom, seatLeft, seatRight, tableShape, label, assignments } = object;
  const seats = seatCount ?? 8;

  const seatPositions = getSeatPositions(tableShape, widthFt, heightFt, seats, {
    top: seatTop ?? null,
    bottom: seatBottom ?? null,
    left: seatLeft ?? null,
    right: seatRight ?? null,
  });

  const assignmentMap = new Map<number, SeatAssignmentResponse>();
  for (const a of assignments) {
    assignmentMap.set(a.seatNumber, a);
  }

  const isRound = tableShape === 'round' || tableShape === 'oval';
  const isSemicircle = tableShape === 'semicircle';
  const seatRadius = 6;

  const snapToGrid = (value: number) => {
    if (gridSnap <= 0) return value;
    return Math.round(value / gridSnap) * gridSnap;
  };

  const handleDragBound = (pos: { x: number; y: number }) => {
    // Convert from stage pixels back to feet, snap, then back to pixels
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
        {/* Table shape */}
        {isRound ? (
          <Ellipse
            x={centerX}
            y={centerY}
            radiusX={(widthFt / 2) * ppf}
            radiusY={(heightFt / 2) * ppf}
            fill={isSelected ? '#ede9fe' : '#f5f3ff'}
            stroke={isSelected ? '#7c3aed' : '#c4b5fd'}
            strokeWidth={isSelected ? 3 : 1.5}
          />
        ) : isSemicircle ? (
          <Shape
            sceneFunc={(ctx, shape) => {
              const w = widthFt * ppf;
              const h = heightFt * ppf;
              const k = 0.5522847498;
              ctx.beginPath();
              ctx.moveTo(0, h);
              ctx.lineTo(w, h);
              ctx.bezierCurveTo(w, h * (1 - k), w * (1 + k) / 2, 0, w / 2, 0);
              ctx.bezierCurveTo(w * (1 - k) / 2, 0, 0, h * (1 - k), 0, h);
              ctx.closePath();
              ctx.fillStrokeShape(shape);
            }}
            fill={isSelected ? '#ede9fe' : '#f5f3ff'}
            stroke={isSelected ? '#7c3aed' : '#c4b5fd'}
            strokeWidth={isSelected ? 3 : 1.5}
          />
        ) : (
          <Rect
            x={0}
            y={0}
            width={widthFt * ppf}
            height={heightFt * ppf}
            cornerRadius={4 * ppf}
            fill={isSelected ? '#ede9fe' : '#f5f3ff'}
            stroke={isSelected ? '#7c3aed' : '#c4b5fd'}
            strokeWidth={isSelected ? 3 : 1.5}
          />
        )}

        {/* Table label */}
        <Text
          x={0}
          y={centerY - 3 * ppf - Math.min(12, widthFt / 6) * ppf * 0.5}
          width={widthFt * ppf}
          height={Math.min(12, widthFt / 6) * ppf}
          text={label}
          fontSize={Math.min(12, widthFt / 6) * ppf}
          fill="#4c1d95"
          fontStyle="600"
          align="center"
          verticalAlign="middle"
          listening={false}
        />

        {/* Seat count text */}
        <Text
          x={0}
          y={centerY + 4 * ppf}
          width={widthFt * ppf}
          height={8 * ppf}
          text={`${assignments.length}/${seats}`}
          fontSize={8 * ppf}
          fill="#7c3aed"
          opacity={0.6}
          align="center"
          verticalAlign="middle"
          listening={false}
        />

        {/* Seats */}
        {seatPositions.map((pos, i) => {
          const seatNum = i + 1;
          const assignment = assignmentMap.get(seatNum);
          const fillColor = assignment
            ? RSVP_COLORS[assignment.guestRsvpStatus ?? 'pending'] ?? '#9ca3af'
            : '#d1d5db';

          return (
            <Group key={seatNum}>
              <Circle
                x={pos.x * ppf}
                y={pos.y * ppf}
                radius={seatRadius * ppf}
                fill={fillColor}
                stroke="#fff"
                strokeWidth={1}
              />
              {assignment && assignment.guestDietaryRestrictions && (
                <DietaryIcon
                  x={(pos.x + seatRadius * 0.5) * ppf}
                  y={(pos.y - seatRadius * 0.5) * ppf}
                  dietary={assignment.guestDietaryRestrictions}
                  ppf={ppf}
                />
              )}
              {/* Seat number */}
              <Text
                x={(pos.x - seatRadius) * ppf}
                y={(pos.y - seatRadius) * ppf}
                width={seatRadius * 2 * ppf}
                height={seatRadius * 2 * ppf}
                text={String(seatNum)}
                fontSize={5 * ppf}
                fill="#fff"
                fontStyle="bold"
                align="center"
                verticalAlign="middle"
                listening={false}
              />
            </Group>
          );
        })}
      </Group>
    </Group>
  );
}

interface SidesConfig {
  top: number | null;
  bottom: number | null;
  left: number | null;
  right: number | null;
}

function distributeSeatsEvenly(width: number, height: number, count: number, margin: number): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const perimeter = 2 * (width + height);
  const spacing = perimeter / count;

  for (let i = 0; i < count; i++) {
    const dist = i * spacing;
    let x: number, y: number;

    if (dist < width) {
      x = dist;
      y = -margin;
    } else if (dist < width + height) {
      x = width + margin;
      y = dist - width;
    } else if (dist < 2 * width + height) {
      x = width - (dist - width - height);
      y = height + margin;
    } else {
      x = -margin;
      y = height - (dist - 2 * width - height);
    }
    positions.push({ x, y });
  }

  return positions;
}

function distributeAlongEdge(
  count: number,
  start: { x: number; y: number },
  end: { x: number; y: number }
): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  if (count <= 0) return positions;

  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    positions.push({
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
    });
  }
  return positions;
}

function getSeatPositions(
  shape: string | null,
  width: number,
  height: number,
  count: number,
  sides: SidesConfig
): Array<{ x: number; y: number }> {
  const isRound = shape === 'round' || shape === 'oval';
  const margin = 12;

  if (shape === 'semicircle') {
    const cx = width / 2;
    const cy = height;
    const rx = width / 2 + margin;
    const ry = height + margin;
    const positions: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const angle = Math.PI * (1 - t);
      positions.push({
        x: cx + rx * Math.cos(angle),
        y: cy - ry * Math.sin(angle),
      });
    }
    return positions;
  }

  if (isRound) {
    const cx = width / 2;
    const cy = height / 2;
    const rx = width / 2 + margin;
    const ry = height / 2 + margin;
    const positions: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      positions.push({
        x: cx + rx * Math.cos(angle),
        y: cy + ry * Math.sin(angle),
      });
    }
    return positions;
  }

  const hasSides = sides.top !== null || sides.bottom !== null || sides.left !== null || sides.right !== null;
  if (!hasSides) {
    return distributeSeatsEvenly(width, height, count, margin);
  }

  // Place exact number of seats per side: top → right → bottom (reversed) → left (reversed)
  const positions: Array<{ x: number; y: number }> = [];

  positions.push(...distributeAlongEdge(sides.top ?? 0, { x: 0, y: -margin }, { x: width, y: -margin }));
  positions.push(...distributeAlongEdge(sides.right ?? 0, { x: width + margin, y: 0 }, { x: width + margin, y: height }));
  positions.push(...distributeAlongEdge(sides.bottom ?? 0, { x: width, y: height + margin }, { x: 0, y: height + margin }));
  positions.push(...distributeAlongEdge(sides.left ?? 0, { x: -margin, y: height }, { x: -margin, y: 0 }));

  return positions;
}

function DietaryIcon({ x, y, dietary, ppf }: { x: number; y: number; dietary: string; ppf: number }) {
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

  const r = 3.5 * ppf;

  return (
    <Group>
      <Circle x={x} y={y} radius={r} fill={color} />
      <Text
        x={x - r}
        y={y - r}
        width={r * 2}
        height={r * 2}
        text={symbol}
        fontSize={3.5 * ppf}
        fill="#fff"
        fontStyle="bold"
        align="center"
        verticalAlign="middle"
        listening={false}
      />
    </Group>
  );
}
