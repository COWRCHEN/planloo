import { writeFileSync } from 'fs';
import { randomUUID, pbkdf2Sync, randomBytes } from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FIRST_NAMES = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason',
  'Isabella', 'William', 'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia',
  'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander', 'Abigail', 'Daniel',
  'Emily', 'Michael', 'Elizabeth', 'Sebastian', 'Sofia', 'Jack', 'Avery',
  'Aiden', 'Ella', 'Owen', 'Scarlett', 'Samuel', 'Grace', 'Ryan', 'Chloe',
  'Nathan', 'Victoria', 'Leo', 'Riley', 'Caleb', 'Aria', 'Isaac', 'Lily',
  'Luke', 'Aurora', 'Gabriel', 'Zoey', 'Julian', 'Nora', 'Matthew', 'Hannah',
  'David', 'Lillian', 'Jayden', 'Addison', 'Carter', 'Eleanor', 'Dylan',
  'Natalie', 'Lincoln', 'Luna', 'Christopher', 'Savannah', 'Josiah', 'Brooklyn',
  'Andrew', 'Leah', 'Thomas', 'Zoe', 'Joshua', 'Stella', 'Ezra', 'Hazel',
  'Hudson', 'Ellie', 'Charles', 'Paisley', 'Connor', 'Audrey', 'Nicholas',
  'Skylar', 'Greyson', 'Violet', 'Cameron', 'Claire', 'Adrian', 'Bella',
  'Eli', 'Lucy', 'Landon', 'Anna', 'Aaron', 'Samantha', 'Miles', 'Caroline',
  'Asher', 'Genesis', 'Dominic', 'Aaliyah', 'Colton', 'Kennedy',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
  'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
  'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
  'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
  'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz',
  'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris',
  'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan',
  'Cooper', 'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos',
  'Kim', 'Cox', 'Ward', 'Richardson', 'Watson', 'Brooks', 'Chavez',
  'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes',
  'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long',
  'Ross', 'Foster', 'Jimenez', 'Powell',
];

const RSVP_STATUSES = ['pending', 'invited', 'confirmed', 'declined', 'maybe'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function escapeSql(str) {
  return str.replace(/'/g, "''");
}

function unixNow() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Hash password in the same format as password-pbkdf2.ts:
 * "pbkdf2:iterations:saltBase64:keyBase64"
 */
function hashPasswordSync(password) {
  const iterations = 100_000;
  const salt = randomBytes(16);
  const key = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  return `pbkdf2:${iterations}:${salt.toString('base64')}:${key.toString('base64')}`;
}

// --- Generate data ---

const TEST_PASSWORD = 'password123';
const userId = randomUUID();
const now = unixNow();

const events = [
  {
    title: 'Annual Company Gala 2026',
    description: 'A formal evening celebrating company achievements and milestones.',
    eventType: 'corporate',
    status: 'confirmed',
    daysFromNow: 30,
    location: { name: 'Grand Ballroom, The Ritz', city: 'New York', state: 'NY', country: 'US' },
    guestCountExpected: 100,
    budgetTotal: 25000,
  },
  {
    title: 'Sarah & Tom Wedding',
    description: 'An intimate garden wedding ceremony and reception.',
    eventType: 'wedding',
    status: 'planning',
    daysFromNow: 90,
    location: { name: 'Rosewood Gardens', city: 'Austin', state: 'TX', country: 'US' },
    guestCountExpected: 100,
    budgetTotal: 45000,
  },
  {
    title: 'Tech Innovation Conference',
    description: 'Two-day conference featuring talks on AI, cloud, and web technologies.',
    eventType: 'conference',
    status: 'draft',
    daysFromNow: 60,
    location: { name: 'Convention Center Hall A', city: 'San Francisco', state: 'CA', country: 'US' },
    guestCountExpected: 100,
    budgetTotal: 15000,
  },
  {
    title: "Maya's 30th Birthday Bash",
    description: 'Rooftop party with live DJ, cocktails, and a photo booth.',
    eventType: 'birthday',
    status: 'confirmed',
    daysFromNow: 14,
    location: { name: 'Skyline Rooftop Lounge', city: 'Los Angeles', state: 'CA', country: 'US' },
    guestCountExpected: 100,
    budgetTotal: 5000,
  },
  {
    title: 'Community Volunteer Day',
    description: 'A day of service projects followed by a potluck dinner.',
    eventType: 'other',
    status: 'planning',
    daysFromNow: 45,
    location: { name: 'Riverside Community Center', city: 'Portland', state: 'OR', country: 'US' },
    guestCountExpected: 100,
    budgetTotal: 2000,
  },
];

const lines = [];

// Insert user
lines.push(`INSERT INTO user (id, email, name, email_verified, created_at, updated_at, platform_role, is_active)
VALUES ('${userId}', 'testuser@planloo.dev', 'Test User', 1, ${now}, ${now}, 'user', 1);`);

// Insert account (credential provider with hashed password)
const accountId = randomUUID();
const hashedPassword = hashPasswordSync(TEST_PASSWORD);
lines.push(`INSERT INTO account (id, user_id, account_id, provider_id, password, created_at, updated_at)
VALUES ('${accountId}', '${userId}', '${userId}', 'credential', '${hashedPassword}', ${now}, ${now});`);

// Insert events and guests
for (let i = 0; i < events.length; i++) {
  const e = events[i];
  const eventUuid = randomUUID();
  const startDate = now + e.daysFromNow * 86400;
  const endDate = startDate + 6 * 3600; // 6 hours later
  const slug = e.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  lines.push(`INSERT INTO events (uuid, user_id, title, description, event_type, status, start_date, end_date, timezone, location_name, location_city, location_state, location_country, guest_count_expected, budget_total, budget_currency, is_public, slug, created_at, updated_at)
VALUES ('${eventUuid}', '${userId}', '${escapeSql(e.title)}', '${escapeSql(e.description)}', '${e.eventType}', '${e.status}', ${startDate}, ${endDate}, 'America/New_York', '${escapeSql(e.location.name)}', '${e.location.city}', '${e.location.state}', '${e.location.country}', ${e.guestCountExpected}, ${e.budgetTotal}, 'USD', 0, '${slug}', ${now}, ${now});`);

  // We need the event id — since auto-increment, the first event is id=1, etc.
  // But there may be existing data. Use a subquery instead.
  // Actually for a seed script on clean DB, we can assume sequential IDs.
  // Let's use a safer approach: reference by uuid.

  const usedNames = new Set();
  for (let g = 0; g < 100; g++) {
    let firstName, lastName, fullKey;
    do {
      firstName = pick(FIRST_NAMES);
      lastName = pick(LAST_NAMES);
      fullKey = `${firstName}-${lastName}-${i}`;
    } while (usedNames.has(fullKey));
    usedNames.add(fullKey);

    const guestUuid = randomUUID();
    const rsvpStatus = pick(RSVP_STATUSES);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${g}@example.com`;

    lines.push(`INSERT INTO guests (uuid, event_id, first_name, last_name, email, rsvp_status, plus_ones_allowed, plus_ones_count, plus_ones_count_adults, plus_ones_count_children, checked_in, created_at, updated_at)
VALUES ('${guestUuid}', (SELECT id FROM events WHERE uuid = '${eventUuid}'), '${escapeSql(firstName)}', '${escapeSql(lastName)}', '${email}', '${rsvpStatus}', ${Math.floor(Math.random() * 3)}, 0, 0, 0, 0, ${now}, ${now});`);
  }
}

const sql = lines.join('\n');
const outPath = join(__dirname, '..', 'seed-data.sql');
writeFileSync(outPath, sql, 'utf-8');

console.log(`User ID:  ${userId}`);
console.log(`Email:    testuser@planloo.dev`);
console.log(`Password: ${TEST_PASSWORD}`);
console.log(`Generated ${events.length} events with 100 guests each.`);
console.log(`SQL written to: ${outPath}`);
console.log('');
console.log('Run this to apply to local D1:');
console.log('  npx wrangler d1 execute planloo-db-dev --local --env development --file=seed-data.sql');
