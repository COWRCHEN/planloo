/**
 * CSV Utilities for Guest Import/Export
 *
 * Provides functions to parse guest CSV files and generate CSV exports.
 */

const GUEST_CATEGORIES = ['vip', 'family', 'friend', 'colleague', 'other'] as const;
type GuestCategory = (typeof GUEST_CATEGORIES)[number];

interface ParsedGuest {
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  category?: GuestCategory | null;
  plusOnesAllowed?: number;
  dietaryRestrictions?: string | null;
  notes?: string | null;
}

interface ParseResult {
  success: boolean;
  guests: ParsedGuest[];
  errors: Array<{ row: number; message: string }>;
}

interface GuestRow {
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  category: string | null;
  rsvpStatus: string | null;
  plusOnesAllowed: number;
  plusOnesCount: number;
  dietaryRestrictions: string | null;
  notes: string | null;
  checkedIn: boolean;
}

/**
 * Parse a CSV string and extract guest data
 * Expected headers: firstName, lastName, email, phone, category, plusOnesAllowed, dietaryRestrictions, notes
 */
export function parseGuestsCsv(content: string): ParseResult {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length === 0) {
    return { success: false, guests: [], errors: [{ row: 0, message: 'Empty CSV file' }] };
  }

  // Parse header row
  const headerLine = lines[0]!;
  const headers = parseCSVLine(headerLine).map((h) => h.toLowerCase().trim());

  // Find column indices
  const firstNameIdx = headers.indexOf('firstname');
  const lastNameIdx = headers.indexOf('lastname');
  const emailIdx = headers.indexOf('email');
  const phoneIdx = headers.indexOf('phone');
  const categoryIdx = headers.indexOf('category');
  const plusOnesAllowedIdx = headers.indexOf('plusonesallowed');
  const dietaryIdx = headers.indexOf('dietaryrestrictions');
  const notesIdx = headers.indexOf('notes');

  if (firstNameIdx === -1) {
    return {
      success: false,
      guests: [],
      errors: [{ row: 1, message: 'Missing required header: firstName' }],
    };
  }

  const guests: ParsedGuest[] = [];
  const errors: Array<{ row: number; message: string }> = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const rowNum = i + 1;

    // Get firstName (required)
    const firstName = values[firstNameIdx]?.trim();
    if (!firstName) {
      errors.push({ row: rowNum, message: 'Missing required field: firstName' });
      continue;
    }

    if (firstName.length > 100) {
      errors.push({ row: rowNum, message: 'firstName exceeds 100 characters' });
      continue;
    }

    // Get optional fields
    const lastName = lastNameIdx !== -1 ? values[lastNameIdx]?.trim() || null : null;
    const email = emailIdx !== -1 ? values[emailIdx]?.trim() || null : null;
    const phone = phoneIdx !== -1 ? values[phoneIdx]?.trim() || null : null;
    const categoryRaw = categoryIdx !== -1 ? values[categoryIdx]?.trim().toLowerCase() || null : null;
    const plusOnesRaw = plusOnesAllowedIdx !== -1 ? values[plusOnesAllowedIdx]?.trim() : null;
    const dietary = dietaryIdx !== -1 ? values[dietaryIdx]?.trim() || null : null;
    const notes = notesIdx !== -1 ? values[notesIdx]?.trim() || null : null;

    // Validate email format if provided
    if (email && !isValidEmail(email)) {
      errors.push({ row: rowNum, message: `Invalid email format: ${email}` });
      continue;
    }

    // Validate category if provided
    let category: GuestCategory | null = null;
    if (categoryRaw) {
      if (GUEST_CATEGORIES.includes(categoryRaw as GuestCategory)) {
        category = categoryRaw as GuestCategory;
      } else {
        errors.push({
          row: rowNum,
          message: `Invalid category: ${categoryRaw}. Must be one of: ${GUEST_CATEGORIES.join(', ')}`,
        });
        continue;
      }
    }

    // Parse plusOnesAllowed
    let plusOnesAllowed = 0;
    if (plusOnesRaw) {
      const parsed = parseInt(plusOnesRaw, 10);
      if (isNaN(parsed) || parsed < 0 || parsed > 10) {
        errors.push({ row: rowNum, message: `Invalid plusOnesAllowed: ${plusOnesRaw}` });
        continue;
      }
      plusOnesAllowed = parsed;
    }

    guests.push({
      firstName,
      lastName,
      email,
      phone,
      category,
      plusOnesAllowed,
      dietaryRestrictions: dietary,
      notes,
    });
  }

  return {
    success: errors.length === 0,
    guests,
    errors,
  };
}

/**
 * Generate a CSV string from guest data
 */
export function generateGuestsCsv(guests: GuestRow[]): string {
  const headers = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'category',
    'rsvpStatus',
    'plusOnesAllowed',
    'plusOnesCount',
    'dietaryRestrictions',
    'notes',
    'checkedIn',
  ];

  const rows = [headers.join(',')];

  for (const guest of guests) {
    const row = [
      escapeCSVValue(guest.firstName),
      escapeCSVValue(guest.lastName ?? ''),
      escapeCSVValue(guest.email ?? ''),
      escapeCSVValue(guest.phone ?? ''),
      escapeCSVValue(guest.category ?? ''),
      escapeCSVValue(guest.rsvpStatus ?? 'pending'),
      String(guest.plusOnesAllowed),
      String(guest.plusOnesCount),
      escapeCSVValue(guest.dietaryRestrictions ?? ''),
      escapeCSVValue(guest.notes ?? ''),
      guest.checkedIn ? 'yes' : 'no',
    ];
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        // End of quoted value
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        // Start of quoted value
        inQuotes = true;
      } else if (char === ',') {
        // End of field
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }

  // Add last field
  values.push(current);

  return values;
}

/**
 * Escape a value for CSV output
 */
function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Simple email validation
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
