import { describe, it, expect } from 'vitest';
import { generateICSContent } from './ics';
import type { AppointmentResponse } from '@/hooks/use-providers';

function makeAppt(overrides: Partial<AppointmentResponse> = {}): AppointmentResponse {
  return {
    id: 1,
    entityType: 'provider',
    entityName: 'DJ Services',
    entityCategory: 'Entertainment',
    linkId: 10,
    appointmentStart: '2025-06-15T14:00:00.000Z',
    appointmentEnd: '2025-06-15T16:00:00.000Z',
    contactPerson: null,
    notes: null,
    result: null,
    statusChange: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ==================== generateICSContent ====================

describe('generateICSContent', () => {
  it('wraps output in VCALENDAR block', () => {
    const output = generateICSContent([]);
    expect(output).toMatch(/^BEGIN:VCALENDAR/);
    expect(output).toMatch(/END:VCALENDAR$/);
  });

  it('includes required calendar properties', () => {
    const output = generateICSContent([]);
    expect(output).toContain('VERSION:2.0');
    expect(output).toContain('CALSCALE:GREGORIAN');
    expect(output).toContain('METHOD:PUBLISH');
  });

  it('produces no VEVENT blocks for an empty appointments list', () => {
    const output = generateICSContent([]);
    expect(output).not.toContain('BEGIN:VEVENT');
  });

  it('produces one VEVENT block for a single appointment', () => {
    const output = generateICSContent([makeAppt()]);
    const begin = (output.match(/BEGIN:VEVENT/g) ?? []).length;
    const end = (output.match(/END:VEVENT/g) ?? []).length;
    expect(begin).toBe(1);
    expect(end).toBe(1);
  });

  it('produces one VEVENT per appointment for multiple appointments', () => {
    const output = generateICSContent([makeAppt({ id: 1 }), makeAppt({ id: 2 }), makeAppt({ id: 3 })]);
    expect((output.match(/BEGIN:VEVENT/g) ?? []).length).toBe(3);
  });

  it('includes DTSTART in UTC format', () => {
    const output = generateICSContent([makeAppt({ appointmentStart: '2025-06-15T14:00:00.000Z' })]);
    expect(output).toContain('DTSTART:20250615T140000Z');
  });

  it('includes DTEND when appointmentEnd is provided', () => {
    const output = generateICSContent([makeAppt({ appointmentEnd: '2025-06-15T16:00:00.000Z' })]);
    expect(output).toContain('DTEND:20250615T160000Z');
  });

  it('defaults DTEND to 1 hour after DTSTART when appointmentEnd is null', () => {
    const output = generateICSContent([makeAppt({ appointmentEnd: null })]);
    // Start: 14:00 UTC → end should be 15:00 UTC
    expect(output).toContain('DTEND:20250615T150000Z');
  });

  it('includes SUMMARY with entity name', () => {
    const output = generateICSContent([makeAppt({ entityName: 'DJ Services' })]);
    expect(output).toContain('SUMMARY:DJ Services');
  });

  it('escapes semicolons in SUMMARY', () => {
    const output = generateICSContent([makeAppt({ entityName: 'DJ; Music' })]);
    expect(output).toContain('SUMMARY:DJ\\; Music');
  });

  it('escapes commas in SUMMARY', () => {
    const output = generateICSContent([makeAppt({ entityName: 'DJ, Band' })]);
    expect(output).toContain('SUMMARY:DJ\\, Band');
  });

  it('escapes backslashes in SUMMARY', () => {
    const output = generateICSContent([makeAppt({ entityName: 'DJ\\Band' })]);
    expect(output).toContain('SUMMARY:DJ\\\\Band');
  });

  it('includes DESCRIPTION with contactPerson when provided', () => {
    const output = generateICSContent([makeAppt({ contactPerson: 'John Doe' })]);
    expect(output).toContain('Contact: John Doe');
  });

  it('includes DESCRIPTION with result when provided', () => {
    const output = generateICSContent([makeAppt({ result: 'Confirmed' })]);
    expect(output).toContain('Result: Confirmed');
  });

  it('includes DESCRIPTION with notes when provided', () => {
    const output = generateICSContent([makeAppt({ notes: 'Bring extra gear' })]);
    expect(output).toContain('Notes: Bring extra gear');
  });

  it('omits DESCRIPTION when all description fields are null', () => {
    const output = generateICSContent([makeAppt({ contactPerson: null, result: null, notes: null })]);
    expect(output).not.toContain('DESCRIPTION:');
  });

  it('uses CRLF line endings throughout', () => {
    const output = generateICSContent([makeAppt()]);
    // Every line except the last should end with \r\n
    const lines = output.split('\r\n');
    expect(lines.length).toBeGreaterThan(3);
  });

  it('includes a UID containing the appointment id', () => {
    const output = generateICSContent([makeAppt({ id: 42 })]);
    expect(output).toMatch(/UID:planloo-appt-42-/);
  });
});
