import { describe, it, expect } from 'vitest';
import { parseGuestsCsv, generateGuestsCsv } from './csv';

// ==================== parseGuestsCsv ====================

describe('parseGuestsCsv - error cases', () => {
  it('returns error for empty input', () => {
    const result = parseGuestsCsv('');
    expect(result.success).toBe(false);
    expect(result.guests).toHaveLength(0);
    expect(result.errors[0]?.message).toMatch(/empty/i);
  });

  it('returns error when firstName header is missing', () => {
    const csv = 'lastName,email\nDoe,test@test.com';
    const result = parseGuestsCsv(csv);
    expect(result.success).toBe(false);
    expect(result.errors[0]?.message).toMatch(/firstname/i);
  });

  it('skips rows with missing firstName value and records error', () => {
    const csv = 'firstName,lastName\n,Doe';
    const result = parseGuestsCsv(csv);
    expect(result.success).toBe(false);
    expect(result.guests).toHaveLength(0);
    expect(result.errors[0]?.row).toBe(2);
  });

  it('records error when firstName exceeds 100 characters', () => {
    const longName = 'A'.repeat(101);
    const csv = `firstName\n${longName}`;
    const result = parseGuestsCsv(csv);
    expect(result.success).toBe(false);
    expect(result.errors[0]?.message).toContain('100');
  });

  it('records error for invalid email format', () => {
    const csv = 'firstName,email\nJohn,not-an-email';
    const result = parseGuestsCsv(csv);
    expect(result.success).toBe(false);
    expect(result.errors[0]?.message).toContain('Invalid email');
  });

  it('records error when category exceeds 50 characters', () => {
    const longCategory = 'A'.repeat(51);
    const csv = `firstName,category\nJohn,${longCategory}`;
    const result = parseGuestsCsv(csv);
    expect(result.success).toBe(false);
    expect(result.errors[0]?.message).toContain('category');
  });

  it('records error for invalid plusOnesAllowed (non-numeric)', () => {
    const csv = 'firstName,plusOnesAllowed\nJohn,abc';
    const result = parseGuestsCsv(csv);
    expect(result.success).toBe(false);
    expect(result.errors[0]?.message).toContain('plusOnesAllowed');
  });

  it('records error for plusOnesAllowed greater than 10', () => {
    const csv = 'firstName,plusOnesAllowed\nJohn,11';
    const result = parseGuestsCsv(csv);
    expect(result.success).toBe(false);
    expect(result.errors[0]?.message).toContain('plusOnesAllowed');
  });

  it('records error for negative plusOnesAllowed', () => {
    const csv = 'firstName,plusOnesAllowed\nJohn,-1';
    const result = parseGuestsCsv(csv);
    expect(result.success).toBe(false);
  });

  it('records error when plusOnesCount exceeds plusOnesAllowed', () => {
    const csv = 'firstName,plusOnesAllowed,plusOnesCountAdults,plusOnesCountChildren\nJohn,1,1,1';
    const result = parseGuestsCsv(csv);
    expect(result.success).toBe(false);
    expect(result.errors[0]?.message).toContain('plusOnesCountAdults');
  });
});

describe('parseGuestsCsv - success cases', () => {
  it('parses a minimal valid CSV with only firstName', () => {
    const csv = 'firstName\nJohn';
    const result = parseGuestsCsv(csv);
    expect(result.success).toBe(true);
    expect(result.guests).toHaveLength(1);
    expect(result.guests[0]?.firstName).toBe('John');
  });

  it('parses all core fields correctly', () => {
    const csv = [
      'firstName,lastName,email,phone,category,plusOnesAllowed,dietaryRestrictions,notes',
      'Jane,Doe,jane@example.com,+1234567890,family,2,vegan,seat near stage',
    ].join('\n');

    const result = parseGuestsCsv(csv);
    expect(result.success).toBe(true);
    const guest = result.guests[0]!;
    expect(guest.firstName).toBe('Jane');
    expect(guest.lastName).toBe('Doe');
    expect(guest.email).toBe('jane@example.com');
    expect(guest.phone).toBe('+1234567890');
    expect(guest.category).toBe('family');
    expect(guest.plusOnesAllowed).toBe(2);
    expect(guest.dietaryRestrictions).toBe('vegan');
    expect(guest.notes).toBe('seat near stage');
  });

  it('handles CRLF line endings', () => {
    const csv = 'firstName,lastName\r\nJohn,Doe\r\nJane,Smith';
    const result = parseGuestsCsv(csv);
    expect(result.success).toBe(true);
    expect(result.guests).toHaveLength(2);
  });

  it('handles quoted values with commas', () => {
    const csv = 'firstName,notes\nJohn,"seat near stage, front row"';
    const result = parseGuestsCsv(csv);
    expect(result.success).toBe(true);
    expect(result.guests[0]?.notes).toBe('seat near stage, front row');
  });

  it('handles quoted values with escaped double quotes', () => {
    const csv = 'firstName,notes\nJohn,"He said ""hello"""';
    const result = parseGuestsCsv(csv);
    expect(result.success).toBe(true);
    expect(result.guests[0]?.notes).toBe('He said "hello"');
  });

  it('skips blank lines between data rows', () => {
    const csv = 'firstName\nJohn\n\nJane';
    const result = parseGuestsCsv(csv);
    expect(result.success).toBe(true);
    expect(result.guests).toHaveLength(2);
  });

  it('normalises header names (removes spaces and underscores, lowercases)', () => {
    const csv = 'First Name,Last_Name\nJohn,Doe';
    const result = parseGuestsCsv(csv);
    expect(result.success).toBe(true);
    expect(result.guests[0]?.lastName).toBe('Doe');
  });

  it('parses needsAccommodation boolean values', () => {
    const csv = 'firstName,needsAccommodation\nJohn,yes\nJane,no\nBob,true\nAlice,false';
    const result = parseGuestsCsv(csv);
    expect(result.success).toBe(true);
    expect(result.guests[0]?.needsAccommodation).toBe(true);
    expect(result.guests[1]?.needsAccommodation).toBe(false);
    expect(result.guests[2]?.needsAccommodation).toBe(true);
    expect(result.guests[3]?.needsAccommodation).toBe(false);
  });

  it('returns null for unrecognised boolean values', () => {
    const csv = 'firstName,needsAccommodation\nJohn,maybe';
    const result = parseGuestsCsv(csv);
    expect(result.success).toBe(true);
    expect(result.guests[0]?.needsAccommodation).toBeNull();
  });

  it('parses multiple guests and collects partial errors without aborting', () => {
    const csv = [
      'firstName,email',
      'John,john@example.com',
      ',missing-first-name',
      'Jane,jane@example.com',
    ].join('\n');
    const result = parseGuestsCsv(csv);
    expect(result.success).toBe(false);
    expect(result.guests).toHaveLength(2); // John and Jane succeed
    expect(result.errors).toHaveLength(1); // middle row fails
  });

  it('sets plusOnesAllowed to 0 when column is absent', () => {
    const csv = 'firstName\nJohn';
    const result = parseGuestsCsv(csv);
    expect(result.guests[0]?.plusOnesAllowed).toBe(0);
  });

  it('parses optional phase-2 fields', () => {
    const csv = [
      'firstName,addressStreet,addressCity,mealChoice,tableAssignment',
      'John,123 Main St,Springfield,chicken,Table 5',
    ].join('\n');
    const result = parseGuestsCsv(csv);
    expect(result.success).toBe(true);
    const guest = result.guests[0]!;
    expect(guest.addressStreet).toBe('123 Main St');
    expect(guest.addressCity).toBe('Springfield');
    expect(guest.mealChoice).toBe('chicken');
    expect(guest.tableAssignment).toBe('Table 5');
  });
});

// ==================== generateGuestsCsv ====================

describe('generateGuestsCsv', () => {
  const baseGuest = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    category: 'family',
    rsvpStatus: 'confirmed',
    plusOnesAllowed: 2,
    plusOnesCount: 1,
    plusOnesCountAdults: 1,
    plusOnesCountChildren: 0,
    dietaryRestrictions: null,
    notes: null,
    checkedIn: false,
  } as const;

  it('returns only the header row for an empty guest list', () => {
    const output = generateGuestsCsv([]);
    const lines = output.split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('firstName');
  });

  it('includes correct column headers', () => {
    const output = generateGuestsCsv([]);
    expect(output).toContain('firstName');
    expect(output).toContain('lastName');
    expect(output).toContain('email');
    expect(output).toContain('rsvpStatus');
    expect(output).toContain('plusOnesAllowed');
    expect(output).toContain('checkedIn');
  });

  it('outputs a row for each guest', () => {
    const guests = [baseGuest, { ...baseGuest, firstName: 'Jane' }];
    const output = generateGuestsCsv(guests);
    const lines = output.split('\n');
    expect(lines).toHaveLength(3); // header + 2 data rows
  });

  it('outputs checkedIn as yes/no', () => {
    const output = generateGuestsCsv([
      { ...baseGuest, checkedIn: true },
      { ...baseGuest, checkedIn: false },
    ]);
    const rows = output.split('\n');
    expect(rows[1]).toContain('yes');
    expect(rows[2]).toContain('no');
  });

  it('escapes values containing commas with double quotes', () => {
    const guest = { ...baseGuest, notes: 'seat near stage, front row' };
    const output = generateGuestsCsv([guest]);
    expect(output).toContain('"seat near stage, front row"');
  });

  it('escapes double quotes within values', () => {
    const guest = { ...baseGuest, notes: 'He said "hello"' };
    const output = generateGuestsCsv([guest]);
    expect(output).toContain('"He said ""hello"""');
  });

  it('outputs needsAccommodation as yes/no/empty', () => {
    const guests = [
      { ...baseGuest, needsAccommodation: true as boolean | null },
      { ...baseGuest, needsAccommodation: false as boolean | null },
      { ...baseGuest, needsAccommodation: null as boolean | null },
    ];
    const rows = generateGuestsCsv(guests).split('\n');
    expect(rows[1]).toMatch(/,yes,/);
    expect(rows[2]).toMatch(/,no,/);
    // null → empty string between commas
    expect(rows[3]).toMatch(/,,/);
  });

  it('round-trips data through generate then parse', () => {
    const guest = {
      ...baseGuest,
      notes: 'special, note',
      dietaryRestrictions: 'vegan',
    };
    const csv = generateGuestsCsv([guest]);
    const parsed = parseGuestsCsv(csv);
    expect(parsed.success).toBe(true);
    expect(parsed.guests[0]?.firstName).toBe('John');
    expect(parsed.guests[0]?.notes).toBe('special, note');
    expect(parsed.guests[0]?.dietaryRestrictions).toBe('vegan');
  });
});
