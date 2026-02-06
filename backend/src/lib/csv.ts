/**
 * CSV Utilities for Guest Import/Export
 *
 * Provides functions to parse guest CSV files and generate CSV exports.
 * Supports core guest fields and user-configurable optional fields.
 */

const GUEST_CATEGORIES = ['vip', 'family', 'friend', 'colleague', 'other'] as const;
type GuestCategory = (typeof GUEST_CATEGORIES)[number];

interface ParsedGuest {
  // Core fields
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  category?: GuestCategory | null;
  plusOnesAllowed?: number;
  dietaryRestrictions?: string | null;
  notes?: string | null;
  // Optional fields (Phase 2)
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZipCode?: string | null;
  addressCountry?: string | null;
  mealChoice?: string | null;
  needsAccommodation?: boolean | null;
  hotelName?: string | null;
  plusOneName?: string | null;
  tableAssignment?: string | null;
  transportationNeeded?: boolean | null;
  accessibilityNeeds?: string | null;
}

interface ParseResult {
  success: boolean;
  guests: ParsedGuest[];
  errors: Array<{ row: number; message: string }>;
}

interface GuestRow {
  // Core fields
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
  // Optional fields (Phase 2)
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZipCode?: string | null;
  addressCountry?: string | null;
  mealChoice?: string | null;
  needsAccommodation?: boolean | null;
  hotelName?: string | null;
  checkInDate?: Date | null;
  checkOutDate?: Date | null;
  plusOneName?: string | null;
  tableAssignment?: string | null;
  transportationNeeded?: boolean | null;
  accessibilityNeeds?: string | null;
}

/**
 * Parse a CSV string and extract guest data
 * Supports core fields and optional fields (Phase 2)
 *
 * Core headers: firstName, lastName, email, phone, category, plusOnesAllowed, dietaryRestrictions, notes
 * Optional headers: addressStreet, addressCity, addressState, addressZipCode, addressCountry,
 *                   mealChoice, needsAccommodation, hotelName, plusOneName, tableAssignment,
 *                   transportationNeeded, accessibilityNeeds
 */
export function parseGuestsCsv(content: string): ParseResult {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length === 0) {
    return { success: false, guests: [], errors: [{ row: 0, message: 'Empty CSV file' }] };
  }

  // Parse header row
  const headerLine = lines[0]!;
  const headers = parseCSVLine(headerLine).map((h) => h.toLowerCase().trim().replace(/[_\s]/g, ''));

  // Find column indices - core fields
  const firstNameIdx = headers.indexOf('firstname');
  const lastNameIdx = headers.indexOf('lastname');
  const emailIdx = headers.indexOf('email');
  const phoneIdx = headers.indexOf('phone');
  const categoryIdx = headers.indexOf('category');
  const plusOnesAllowedIdx = headers.indexOf('plusonesallowed');
  const dietaryIdx = headers.indexOf('dietaryrestrictions');
  const notesIdx = headers.indexOf('notes');

  // Find column indices - optional fields (Phase 2)
  const addressStreetIdx = headers.indexOf('addressstreet');
  const addressCityIdx = headers.indexOf('addresscity');
  const addressStateIdx = headers.indexOf('addressstate');
  const addressZipCodeIdx = headers.indexOf('addresszipcode');
  const addressCountryIdx = headers.indexOf('addresscountry');
  const mealChoiceIdx = headers.indexOf('mealchoice');
  const needsAccommodationIdx = headers.indexOf('needsaccommodation');
  const hotelNameIdx = headers.indexOf('hotelname');
  const plusOneNameIdx = headers.indexOf('plusonename');
  const tableAssignmentIdx = headers.indexOf('tableassignment');
  const transportationNeededIdx = headers.indexOf('transportationneeded');
  const accessibilityNeedsIdx = headers.indexOf('accessibilityneeds');

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

    // Helper to get string value at index
    const getStr = (idx: number): string | null => (idx !== -1 ? values[idx]?.trim() || null : null);

    // Helper to get boolean value at index
    const getBool = (idx: number): boolean | null => {
      const val = getStr(idx)?.toLowerCase();
      if (!val) return null;
      if (['true', 'yes', '1'].includes(val)) return true;
      if (['false', 'no', '0'].includes(val)) return false;
      return null;
    };

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

    // Get core optional fields
    const lastName = getStr(lastNameIdx);
    const email = getStr(emailIdx);
    const phone = getStr(phoneIdx);
    const categoryRaw = getStr(categoryIdx)?.toLowerCase();
    const plusOnesRaw = getStr(plusOnesAllowedIdx);
    const dietary = getStr(dietaryIdx);
    const notes = getStr(notesIdx);

    // Get Phase 2 optional fields
    const addressStreet = getStr(addressStreetIdx);
    const addressCity = getStr(addressCityIdx);
    const addressState = getStr(addressStateIdx);
    const addressZipCode = getStr(addressZipCodeIdx);
    const addressCountry = getStr(addressCountryIdx);
    const mealChoice = getStr(mealChoiceIdx);
    const needsAccommodation = getBool(needsAccommodationIdx);
    const hotelName = getStr(hotelNameIdx);
    const plusOneName = getStr(plusOneNameIdx);
    const tableAssignment = getStr(tableAssignmentIdx);
    const transportationNeeded = getBool(transportationNeededIdx);
    const accessibilityNeeds = getStr(accessibilityNeedsIdx);

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
      // Core fields
      firstName,
      lastName,
      email,
      phone,
      category,
      plusOnesAllowed,
      dietaryRestrictions: dietary,
      notes,
      // Optional fields
      addressStreet,
      addressCity,
      addressState,
      addressZipCode,
      addressCountry,
      mealChoice,
      needsAccommodation,
      hotelName,
      plusOneName,
      tableAssignment,
      transportationNeeded,
      accessibilityNeeds,
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
 * Includes core fields and optional fields (Phase 2)
 */
export function generateGuestsCsv(guests: GuestRow[]): string {
  const headers = [
    // Core fields
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
    // Optional fields (Phase 2)
    'addressStreet',
    'addressCity',
    'addressState',
    'addressZipCode',
    'addressCountry',
    'mealChoice',
    'needsAccommodation',
    'hotelName',
    'checkInDate',
    'checkOutDate',
    'plusOneName',
    'tableAssignment',
    'transportationNeeded',
    'accessibilityNeeds',
  ];

  const rows = [headers.join(',')];

  for (const guest of guests) {
    const row = [
      // Core fields
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
      // Optional fields (Phase 2)
      escapeCSVValue(guest.addressStreet ?? ''),
      escapeCSVValue(guest.addressCity ?? ''),
      escapeCSVValue(guest.addressState ?? ''),
      escapeCSVValue(guest.addressZipCode ?? ''),
      escapeCSVValue(guest.addressCountry ?? ''),
      escapeCSVValue(guest.mealChoice ?? ''),
      guest.needsAccommodation === true ? 'yes' : guest.needsAccommodation === false ? 'no' : '',
      escapeCSVValue(guest.hotelName ?? ''),
      guest.checkInDate ? formatDate(guest.checkInDate) : '',
      guest.checkOutDate ? formatDate(guest.checkOutDate) : '',
      escapeCSVValue(guest.plusOneName ?? ''),
      escapeCSVValue(guest.tableAssignment ?? ''),
      guest.transportationNeeded === true ? 'yes' : guest.transportationNeeded === false ? 'no' : '',
      escapeCSVValue(guest.accessibilityNeeds ?? ''),
    ];
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

/**
 * Format a date for CSV output (ISO date string)
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
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
