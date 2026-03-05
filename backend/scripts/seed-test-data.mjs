import { writeFileSync } from 'fs';
import { randomUUID, pbkdf2Sync, randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Name pools ───────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function escapeSql(str) {
  if (str == null) return '';
  return String(str).replace(/'/g, "''");
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

const TEST_PASSWORD = 'password123';
const now = unixNow();

// ── Data generators ───────────────────────────────────────────────────────────

function generateGuests(eventUuid, eventIdx, count) {
  const lines = [];
  const usedNames = new Set();
  for (let g = 0; g < count; g++) {
    let firstName, lastName, fullKey;
    do {
      firstName = pick(FIRST_NAMES);
      lastName = pick(LAST_NAMES);
      fullKey = `${firstName}-${lastName}-${eventIdx}`;
    } while (usedNames.has(fullKey));
    usedNames.add(fullKey);

    const guestUuid = randomUUID();
    const rsvpStatus = pick(RSVP_STATUSES);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${g}@example.com`;

    lines.push(
      `INSERT INTO guests (uuid, event_id, first_name, last_name, email, rsvp_status, plus_ones_allowed, plus_ones_count, plus_ones_count_adults, plus_ones_count_children, checked_in, created_at, updated_at) ` +
      `VALUES ('${guestUuid}', (SELECT id FROM events WHERE uuid = '${eventUuid}'), '${escapeSql(firstName)}', '${escapeSql(lastName)}', '${email}', '${rsvpStatus}', ${Math.floor(Math.random() * 3)}, 0, 0, 0, 0, ${now}, ${now});`
    );
  }
  return lines;
}

function generateTasks(eventUuid, startDate, taskDefs) {
  return taskDefs.map((task, sortOrder) => {
    const taskUuid = randomUUID();
    const dueDays = task.dueDaysBeforeEvent ?? 7;
    const dueDate = Math.floor(startDate - dueDays * 86400);
    return (
      `INSERT INTO tasks (uuid, event_id, title, description, category, priority, status, due_date, sort_order, created_at, updated_at) ` +
      `VALUES ('${taskUuid}', (SELECT id FROM events WHERE uuid = '${eventUuid}'), '${escapeSql(task.title)}', '${escapeSql(task.description ?? '')}', '${escapeSql(task.category)}', '${task.priority}', '${task.status}', ${dueDate}, ${sortOrder + 1}, ${now}, ${now});`
    );
  });
}

function generateBudgetItems(eventUuid, itemDefs) {
  return itemDefs.map((item) => {
    const itemUuid = randomUUID();
    const actualCostSql = item.actualCost != null ? item.actualCost : 'NULL';
    return (
      `INSERT INTO budget_items (uuid, event_id, category, item_name, description, estimated_cost, actual_cost, currency, payment_status, created_at, updated_at) ` +
      `VALUES ('${itemUuid}', (SELECT id FROM events WHERE uuid = '${eventUuid}'), '${item.category}', '${escapeSql(item.itemName)}', '${escapeSql(item.description ?? '')}', ${item.estimatedCost}, ${actualCostSql}, 'USD', '${item.paymentStatus}', ${now}, ${now});`
    );
  });
}

// ── Task templates by event type (up to 10 tasks; each user tier slices N) ──

const TASK_TEMPLATES = {
  wedding: [
    { title: 'Book venue', category: 'Venue', priority: 'high', status: 'completed', dueDaysBeforeEvent: 180 },
    { title: 'Send invitations', category: 'Logistics', priority: 'high', status: 'completed', dueDaysBeforeEvent: 60 },
    { title: 'Confirm catering menu', category: 'Catering', priority: 'high', status: 'in_progress', dueDaysBeforeEvent: 30 },
    { title: 'Hire florist', category: 'Decor', priority: 'medium', status: 'in_progress', dueDaysBeforeEvent: 45 },
    { title: 'Book photographer', category: 'Logistics', priority: 'high', status: 'completed', dueDaysBeforeEvent: 90 },
    { title: 'Book bartenders', category: 'Catering', priority: 'medium', status: 'pending', dueDaysBeforeEvent: 21 },
    { title: 'Order wedding cake', category: 'Catering', priority: 'medium', status: 'pending', dueDaysBeforeEvent: 14 },
    { title: 'Confirm seating layout', category: 'Venue', priority: 'medium', status: 'pending', dueDaysBeforeEvent: 7 },
    { title: 'Arrange transportation', category: 'Logistics', priority: 'medium', status: 'pending', dueDaysBeforeEvent: 14 },
    { title: 'Create run of show', category: 'Admin', priority: 'high', status: 'pending', dueDaysBeforeEvent: 7 },
  ],
  conference: [
    { title: 'Book venue', category: 'Venue', priority: 'high', status: 'completed', dueDaysBeforeEvent: 120 },
    { title: 'Confirm speaker lineup', category: 'Admin', priority: 'high', status: 'in_progress', dueDaysBeforeEvent: 60 },
    { title: 'Send invitations', category: 'Logistics', priority: 'high', status: 'completed', dueDaysBeforeEvent: 45 },
    { title: 'Set up AV equipment', category: 'Logistics', priority: 'high', status: 'pending', dueDaysBeforeEvent: 3 },
    { title: 'Arrange catering', category: 'Catering', priority: 'medium', status: 'in_progress', dueDaysBeforeEvent: 14 },
    { title: 'Create event agenda', category: 'Admin', priority: 'medium', status: 'in_progress', dueDaysBeforeEvent: 21 },
    { title: 'Set up registration system', category: 'Logistics', priority: 'high', status: 'completed', dueDaysBeforeEvent: 30 },
    { title: 'Order signage and banners', category: 'Decor', priority: 'low', status: 'pending', dueDaysBeforeEvent: 14 },
    { title: 'Arrange parking', category: 'Venue', priority: 'low', status: 'pending', dueDaysBeforeEvent: 7 },
    { title: 'Plan networking session', category: 'Admin', priority: 'medium', status: 'pending', dueDaysBeforeEvent: 10 },
  ],
  corporate: [
    { title: 'Book venue', category: 'Venue', priority: 'high', status: 'completed', dueDaysBeforeEvent: 90 },
    { title: 'Confirm catering', category: 'Catering', priority: 'high', status: 'in_progress', dueDaysBeforeEvent: 21 },
    { title: 'Send invitations', category: 'Logistics', priority: 'high', status: 'completed', dueDaysBeforeEvent: 30 },
    { title: 'Book entertainment', category: 'Logistics', priority: 'medium', status: 'pending', dueDaysBeforeEvent: 30 },
    { title: 'Hire florist', category: 'Decor', priority: 'medium', status: 'pending', dueDaysBeforeEvent: 21 },
    { title: 'Create run of show', category: 'Admin', priority: 'medium', status: 'pending', dueDaysBeforeEvent: 7 },
    { title: 'Set up AV equipment', category: 'Logistics', priority: 'medium', status: 'pending', dueDaysBeforeEvent: 2 },
    { title: 'Order decorations', category: 'Decor', priority: 'low', status: 'pending', dueDaysBeforeEvent: 14 },
    { title: 'Arrange transportation', category: 'Logistics', priority: 'low', status: 'pending', dueDaysBeforeEvent: 7 },
    { title: 'Finalize guest list', category: 'Admin', priority: 'high', status: 'in_progress', dueDaysBeforeEvent: 14 },
  ],
  birthday: [
    { title: 'Book venue', category: 'Venue', priority: 'high', status: 'completed', dueDaysBeforeEvent: 45 },
    { title: 'Order cake', category: 'Catering', priority: 'high', status: 'in_progress', dueDaysBeforeEvent: 14 },
    { title: 'Send invitations', category: 'Logistics', priority: 'high', status: 'completed', dueDaysBeforeEvent: 21 },
    { title: 'Book DJ', category: 'Logistics', priority: 'medium', status: 'pending', dueDaysBeforeEvent: 21 },
    { title: 'Order decorations', category: 'Decor', priority: 'medium', status: 'pending', dueDaysBeforeEvent: 7 },
    { title: 'Arrange catering', category: 'Catering', priority: 'medium', status: 'pending', dueDaysBeforeEvent: 14 },
    { title: 'Set up photo booth', category: 'Decor', priority: 'low', status: 'pending', dueDaysBeforeEvent: 2 },
    { title: 'Collect RSVPs', category: 'Admin', priority: 'medium', status: 'in_progress', dueDaysBeforeEvent: 14 },
    { title: 'Plan party activities', category: 'Admin', priority: 'low', status: 'pending', dueDaysBeforeEvent: 7 },
    { title: 'Order party favors', category: 'Decor', priority: 'low', status: 'pending', dueDaysBeforeEvent: 10 },
  ],
  fundraiser: [
    { title: 'Book venue', category: 'Venue', priority: 'high', status: 'completed', dueDaysBeforeEvent: 90 },
    { title: 'Set up donation system', category: 'Admin', priority: 'high', status: 'in_progress', dueDaysBeforeEvent: 30 },
    { title: 'Send invitations', category: 'Logistics', priority: 'high', status: 'completed', dueDaysBeforeEvent: 30 },
    { title: 'Book entertainment', category: 'Logistics', priority: 'medium', status: 'pending', dueDaysBeforeEvent: 30 },
    { title: 'Arrange catering', category: 'Catering', priority: 'medium', status: 'in_progress', dueDaysBeforeEvent: 21 },
    { title: 'Create event program', category: 'Admin', priority: 'medium', status: 'pending', dueDaysBeforeEvent: 14 },
    { title: 'Set up auction items', category: 'Admin', priority: 'high', status: 'in_progress', dueDaysBeforeEvent: 21 },
    { title: 'Book photographer', category: 'Logistics', priority: 'low', status: 'pending', dueDaysBeforeEvent: 30 },
    { title: 'Order decorations', category: 'Decor', priority: 'low', status: 'pending', dueDaysBeforeEvent: 10 },
    { title: 'Finalize guest list', category: 'Admin', priority: 'medium', status: 'in_progress', dueDaysBeforeEvent: 14 },
  ],
  baby_shower: [
    { title: 'Book venue', category: 'Venue', priority: 'high', status: 'completed', dueDaysBeforeEvent: 45 },
    { title: 'Send invitations', category: 'Logistics', priority: 'high', status: 'completed', dueDaysBeforeEvent: 21 },
    { title: 'Order catering', category: 'Catering', priority: 'high', status: 'in_progress', dueDaysBeforeEvent: 14 },
    { title: 'Order cake', category: 'Catering', priority: 'medium', status: 'pending', dueDaysBeforeEvent: 10 },
    { title: 'Order decorations', category: 'Decor', priority: 'medium', status: 'pending', dueDaysBeforeEvent: 7 },
    { title: 'Plan games and activities', category: 'Admin', priority: 'medium', status: 'pending', dueDaysBeforeEvent: 7 },
    { title: 'Collect RSVPs', category: 'Admin', priority: 'medium', status: 'in_progress', dueDaysBeforeEvent: 14 },
    { title: 'Arrange gift station', category: 'Decor', priority: 'low', status: 'pending', dueDaysBeforeEvent: 3 },
    { title: 'Book photographer', category: 'Logistics', priority: 'low', status: 'pending', dueDaysBeforeEvent: 21 },
    { title: 'Order party favors', category: 'Decor', priority: 'low', status: 'pending', dueDaysBeforeEvent: 10 },
  ],
  other: [
    { title: 'Book venue', category: 'Venue', priority: 'high', status: 'completed', dueDaysBeforeEvent: 30 },
    { title: 'Send invitations', category: 'Logistics', priority: 'high', status: 'completed', dueDaysBeforeEvent: 21 },
    { title: 'Arrange catering', category: 'Catering', priority: 'medium', status: 'pending', dueDaysBeforeEvent: 14 },
    { title: 'Order decorations', category: 'Decor', priority: 'medium', status: 'pending', dueDaysBeforeEvent: 7 },
    { title: 'Collect RSVPs', category: 'Admin', priority: 'medium', status: 'in_progress', dueDaysBeforeEvent: 14 },
    { title: 'Plan activities', category: 'Admin', priority: 'medium', status: 'pending', dueDaysBeforeEvent: 10 },
    { title: 'Set up AV equipment', category: 'Logistics', priority: 'low', status: 'pending', dueDaysBeforeEvent: 2 },
    { title: 'Arrange parking', category: 'Venue', priority: 'low', status: 'pending', dueDaysBeforeEvent: 3 },
    { title: 'Create event schedule', category: 'Admin', priority: 'medium', status: 'pending', dueDaysBeforeEvent: 7 },
    { title: 'Hire photographer', category: 'Logistics', priority: 'low', status: 'pending', dueDaysBeforeEvent: 21 },
  ],
};

// ── Budget item templates by event type ──────────────────────────────────────

const BUDGET_TEMPLATES = {
  wedding: [
    { category: 'venue', itemName: 'Venue rental', description: 'Full-day venue hire', estimatedCost: 8000, actualCost: 7800, paymentStatus: 'paid' },
    { category: 'catering', itemName: 'Wedding catering', description: 'Full dinner service for all guests', estimatedCost: 12000, actualCost: null, paymentStatus: 'partial' },
    { category: 'photography', itemName: 'Wedding photographer', description: '8-hour photo and video coverage', estimatedCost: 3500, actualCost: 3500, paymentStatus: 'paid' },
    { category: 'decorations', itemName: 'Floral arrangements', description: 'Ceremony and reception florals', estimatedCost: 2500, actualCost: null, paymentStatus: 'pending' },
    { category: 'entertainment', itemName: 'Wedding band', description: '4-hour live music performance', estimatedCost: 4000, actualCost: null, paymentStatus: 'pending' },
    { category: 'other', itemName: 'Wedding favors', description: 'Personalized guest gifts', estimatedCost: 800, actualCost: null, paymentStatus: 'pending' },
  ],
  conference: [
    { category: 'venue', itemName: 'Convention center rental', description: 'Main hall and breakout rooms', estimatedCost: 15000, actualCost: 15000, paymentStatus: 'paid' },
    { category: 'catering', itemName: 'Conference catering', description: 'Lunch and refreshments for 2 days', estimatedCost: 8000, actualCost: null, paymentStatus: 'pending' },
    { category: 'entertainment', itemName: 'Keynote speaker', description: 'Opening keynote honorarium', estimatedCost: 5000, actualCost: 5000, paymentStatus: 'paid' },
    { category: 'decorations', itemName: 'Signage and banners', description: 'Event branding and directional signs', estimatedCost: 1200, actualCost: null, paymentStatus: 'pending' },
    { category: 'other', itemName: 'AV equipment rental', description: 'Microphones, projectors, screens', estimatedCost: 3000, actualCost: null, paymentStatus: 'partial' },
    { category: 'photography', itemName: 'Event photography', description: 'Full conference coverage', estimatedCost: 1500, actualCost: null, paymentStatus: 'pending' },
  ],
  corporate: [
    { category: 'venue', itemName: 'Ballroom rental', description: 'Evening venue hire', estimatedCost: 6000, actualCost: 5800, paymentStatus: 'paid' },
    { category: 'catering', itemName: 'Gala dinner catering', description: '3-course dinner service', estimatedCost: 9000, actualCost: null, paymentStatus: 'partial' },
    { category: 'entertainment', itemName: 'Live entertainment', description: 'Band or DJ for evening', estimatedCost: 2500, actualCost: null, paymentStatus: 'pending' },
    { category: 'decorations', itemName: 'Event decor', description: 'Centerpieces and table settings', estimatedCost: 1800, actualCost: null, paymentStatus: 'pending' },
    { category: 'photography', itemName: 'Event photographer', description: '4-hour event coverage', estimatedCost: 1200, actualCost: null, paymentStatus: 'pending' },
    { category: 'other', itemName: 'AV and lighting', description: 'Sound system and lighting rental', estimatedCost: 2000, actualCost: null, paymentStatus: 'pending' },
  ],
  birthday: [
    { category: 'venue', itemName: 'Party venue rental', description: 'Evening venue hire', estimatedCost: 1500, actualCost: 1500, paymentStatus: 'paid' },
    { category: 'catering', itemName: 'Party catering', description: 'Food and beverages for guests', estimatedCost: 1200, actualCost: null, paymentStatus: 'pending' },
    { category: 'decorations', itemName: 'Birthday decorations', description: 'Balloons, banners, and centerpieces', estimatedCost: 400, actualCost: null, paymentStatus: 'pending' },
    { category: 'entertainment', itemName: 'DJ services', description: '4-hour DJ set', estimatedCost: 800, actualCost: null, paymentStatus: 'pending' },
    { category: 'catering', itemName: 'Birthday cake', description: 'Custom 3-tier cake', estimatedCost: 350, actualCost: 350, paymentStatus: 'paid' },
    { category: 'photography', itemName: 'Photo booth rental', description: '3-hour photo booth with prints', estimatedCost: 600, actualCost: null, paymentStatus: 'pending' },
  ],
  fundraiser: [
    { category: 'venue', itemName: 'Event venue rental', description: 'Evening gala venue', estimatedCost: 5000, actualCost: 5000, paymentStatus: 'paid' },
    { category: 'catering', itemName: 'Gala dinner catering', description: 'Dinner service for guests', estimatedCost: 8000, actualCost: null, paymentStatus: 'partial' },
    { category: 'entertainment', itemName: 'Live entertainment', description: 'Musical performance', estimatedCost: 3000, actualCost: null, paymentStatus: 'pending' },
    { category: 'decorations', itemName: 'Event decor', description: 'Themed decorations', estimatedCost: 1500, actualCost: null, paymentStatus: 'pending' },
    { category: 'photography', itemName: 'Event photography', description: 'Full event coverage', estimatedCost: 1000, actualCost: null, paymentStatus: 'pending' },
    { category: 'other', itemName: 'Auction platform fee', description: 'Online bidding platform', estimatedCost: 500, actualCost: 500, paymentStatus: 'paid' },
  ],
  baby_shower: [
    { category: 'venue', itemName: 'Venue rental', description: 'Private room rental', estimatedCost: 600, actualCost: 600, paymentStatus: 'paid' },
    { category: 'catering', itemName: 'Baby shower catering', description: 'Finger foods and beverages', estimatedCost: 800, actualCost: null, paymentStatus: 'pending' },
    { category: 'decorations', itemName: 'Baby shower decorations', description: 'Themed decor and balloons', estimatedCost: 350, actualCost: null, paymentStatus: 'pending' },
    { category: 'catering', itemName: 'Custom cake', description: 'Baby shower themed cake', estimatedCost: 250, actualCost: null, paymentStatus: 'pending' },
    { category: 'other', itemName: 'Party favors', description: 'Guest thank-you gifts', estimatedCost: 200, actualCost: null, paymentStatus: 'pending' },
    { category: 'photography', itemName: 'Event photographer', description: '2-hour photo session', estimatedCost: 500, actualCost: null, paymentStatus: 'pending' },
  ],
  other: [
    { category: 'venue', itemName: 'Venue rental', description: 'Event space hire', estimatedCost: 1000, actualCost: null, paymentStatus: 'pending' },
    { category: 'catering', itemName: 'Catering', description: 'Food and beverages', estimatedCost: 1500, actualCost: null, paymentStatus: 'pending' },
    { category: 'decorations', itemName: 'Decorations', description: 'Event decorations', estimatedCost: 500, actualCost: null, paymentStatus: 'pending' },
    { category: 'entertainment', itemName: 'Entertainment', description: 'Entertainment for guests', estimatedCost: 800, actualCost: null, paymentStatus: 'pending' },
    { category: 'photography', itemName: 'Photography', description: 'Event photographer', estimatedCost: 600, actualCost: null, paymentStatus: 'pending' },
    { category: 'other', itemName: 'Miscellaneous', description: 'Other event expenses', estimatedCost: 300, actualCost: null, paymentStatus: 'pending' },
  ],
};

// ── User profiles ─────────────────────────────────────────────────────────────

const USERS = [
  // ── Free Fiona ─────────────────────────────────────────────────────────────
  {
    email: 'free@planloo.dev',
    name: 'Free Fiona',
    plan: 'free',
    subscriptionStatus: 'free',
    events: [
      {
        title: 'My Birthday Party',
        description: 'A fun birthday celebration with close friends and family.',
        eventType: 'birthday',
        status: 'planning',
        daysFromNow: 14,
        location: { name: 'My Home', city: 'Chicago', state: 'IL', country: 'US' },
        guestCountExpected: 25,
        budgetTotal: 1500,
        guestCount: 25,
        taskCount: 4,
        budgetItemCount: 2,
      },
    ],
  },

  // ── Personal Pete ──────────────────────────────────────────────────────────
  {
    email: 'personal@planloo.dev',
    name: 'Personal Pete',
    plan: 'personal',
    subscriptionStatus: 'active',
    events: [
      {
        title: 'Summer BBQ Bash',
        description: 'A casual outdoor BBQ with games, music, and great food.',
        eventType: 'other',
        status: 'confirmed',
        daysFromNow: 21,
        location: { name: 'Riverside Park Pavilion', city: 'Denver', state: 'CO', country: 'US' },
        guestCountExpected: 70,
        budgetTotal: 3000,
        guestCount: 70,
        taskCount: 6,
        budgetItemCount: 4,
      },
      {
        title: 'Office Team Retreat',
        description: 'A two-day team building retreat focused on collaboration and strategy.',
        eventType: 'corporate',
        status: 'planning',
        daysFromNow: 60,
        location: { name: 'Mountain View Lodge', city: 'Aspen', state: 'CO', country: 'US' },
        guestCountExpected: 40,
        budgetTotal: 8000,
        guestCount: 40,
        taskCount: 6,
        budgetItemCount: 4,
      },
      {
        title: "Mom's 60th Birthday",
        description: "A special milestone birthday celebration for Mom with family and lifelong friends.",
        eventType: 'birthday',
        status: 'draft',
        daysFromNow: 90,
        location: { name: 'The Garden Room, Hilton', city: 'Seattle', state: 'WA', country: 'US' },
        guestCountExpected: 30,
        budgetTotal: 4500,
        guestCount: 30,
        taskCount: 6,
        budgetItemCount: 4,
      },
    ],
  },

  // ── Agency Alice ───────────────────────────────────────────────────────────
  {
    email: 'agency@planloo.dev',
    name: 'Agency Alice',
    plan: 'agency',
    subscriptionStatus: 'active',
    events: [
      {
        title: 'Riverside Wedding — Chen & Park',
        description: 'An elegant riverside wedding ceremony and reception for the Chen and Park families.',
        eventType: 'wedding',
        status: 'confirmed',
        daysFromNow: 45,
        location: { name: 'Riverside Estate', city: 'Savannah', state: 'GA', country: 'US' },
        guestCountExpected: 120,
        budgetTotal: 55000,
        guestCount: 120,
        taskCount: 8,
        budgetItemCount: 5,
      },
      {
        title: 'TechConf 2026',
        description: 'Annual technology conference featuring leaders in AI, cloud, and developer tools.',
        eventType: 'conference',
        status: 'planning',
        daysFromNow: 75,
        location: { name: 'Innovation Center', city: 'San Francisco', state: 'CA', country: 'US' },
        guestCountExpected: 100,
        budgetTotal: 35000,
        guestCount: 100,
        taskCount: 8,
        budgetItemCount: 5,
      },
      {
        title: 'Martinez Quinceañera',
        description: "A beautiful quinceañera celebration marking Sofia Martinez's 15th birthday.",
        eventType: 'birthday',
        status: 'confirmed',
        daysFromNow: 30,
        location: { name: 'Crystal Ballroom', city: 'Miami', state: 'FL', country: 'US' },
        guestCountExpected: 90,
        budgetTotal: 18000,
        guestCount: 90,
        taskCount: 8,
        budgetItemCount: 5,
      },
      {
        title: 'Spring Corporate Gala',
        description: 'An upscale spring gala celebrating company milestones and employee achievements.',
        eventType: 'corporate',
        status: 'planning',
        daysFromNow: 90,
        location: { name: 'Grand Pavilion, The Ritz', city: 'New York', state: 'NY', country: 'US' },
        guestCountExpected: 110,
        budgetTotal: 28000,
        guestCount: 110,
        taskCount: 8,
        budgetItemCount: 5,
      },
      {
        title: 'Startup Networking Night',
        description: 'An evening mixer for startup founders, investors, and tech professionals.',
        eventType: 'other',
        status: 'draft',
        daysFromNow: 20,
        location: { name: 'The Garage Co-Working Space', city: 'Austin', state: 'TX', country: 'US' },
        guestCountExpected: 60,
        budgetTotal: 5000,
        guestCount: 60,
        taskCount: 8,
        budgetItemCount: 5,
      },
      {
        title: 'Charity Fundraiser Gala',
        description: "Black-tie charity gala raising funds for children's education initiatives.",
        eventType: 'fundraiser',
        status: 'confirmed',
        daysFromNow: 120,
        location: { name: 'Four Seasons Grand Ballroom', city: 'Chicago', state: 'IL', country: 'US' },
        guestCountExpected: 80,
        budgetTotal: 22000,
        guestCount: 80,
        taskCount: 8,
        budgetItemCount: 5,
      },
      {
        title: 'Johnson Baby Shower',
        description: 'A joyful baby shower celebrating the upcoming arrival of baby Johnson.',
        eventType: 'baby_shower',
        status: 'planning',
        daysFromNow: 25,
        location: { name: 'The Loft Event Space', city: 'Portland', state: 'OR', country: 'US' },
        guestCountExpected: 35,
        budgetTotal: 2500,
        guestCount: 35,
        taskCount: 8,
        budgetItemCount: 5,
      },
      {
        title: 'Product Launch Party',
        description: 'An exclusive launch event unveiling our next-generation platform to clients and press.',
        eventType: 'corporate',
        status: 'planning',
        daysFromNow: 55,
        location: { name: 'Rooftop at 1 Market', city: 'San Francisco', state: 'CA', country: 'US' },
        guestCountExpected: 70,
        budgetTotal: 15000,
        guestCount: 70,
        taskCount: 8,
        budgetItemCount: 5,
      },
    ],
  },

  // ── Enterprise Eve ─────────────────────────────────────────────────────────
  {
    email: 'enterprise@planloo.dev',
    name: 'Enterprise Eve',
    plan: 'enterprise',
    subscriptionStatus: 'active',
    events: [
      {
        title: 'Grand Estate Wedding — Williams & Chen',
        description: 'A luxury destination wedding at a private estate for the Williams and Chen families.',
        eventType: 'wedding',
        status: 'confirmed',
        daysFromNow: 30,
        location: { name: 'Vineyard Estate at Sonoma', city: 'Sonoma', state: 'CA', country: 'US' },
        guestCountExpected: 150,
        budgetTotal: 120000,
        guestCount: 150,
        taskCount: 10,
        budgetItemCount: 6,
      },
      {
        title: 'National Leadership Summit 2026',
        description: 'A premier gathering of C-suite executives and thought leaders from across the country.',
        eventType: 'conference',
        status: 'planning',
        daysFromNow: 45,
        location: { name: 'Washington Convention Center', city: 'Washington', state: 'DC', country: 'US' },
        guestCountExpected: 130,
        budgetTotal: 85000,
        guestCount: 130,
        taskCount: 10,
        budgetItemCount: 6,
      },
      {
        title: 'Thompson Corporate Anniversary Gala',
        description: '50th anniversary celebration for Thompson Industries with clients, partners, and staff.',
        eventType: 'corporate',
        status: 'confirmed',
        daysFromNow: 60,
        location: { name: 'The Metropolitan Club', city: 'New York', state: 'NY', country: 'US' },
        guestCountExpected: 120,
        budgetTotal: 65000,
        guestCount: 120,
        taskCount: 10,
        budgetItemCount: 6,
      },
      {
        title: 'Rodriguez Quinceañera Extravaganza',
        description: 'A grand quinceañera celebration with full band, choreography, and formal dinner.',
        eventType: 'birthday',
        status: 'planning',
        daysFromNow: 25,
        location: { name: 'Casa Grande Events', city: 'Los Angeles', state: 'CA', country: 'US' },
        guestCountExpected: 140,
        budgetTotal: 35000,
        guestCount: 140,
        taskCount: 10,
        budgetItemCount: 6,
      },
      {
        title: "Children's Hospital Charity Gala",
        description: 'Annual black-tie fundraiser raising funds for pediatric care and research.',
        eventType: 'fundraiser',
        status: 'confirmed',
        daysFromNow: 75,
        location: { name: 'Peninsula Hotel Grand Ballroom', city: 'Chicago', state: 'IL', country: 'US' },
        guestCountExpected: 110,
        budgetTotal: 45000,
        guestCount: 110,
        taskCount: 10,
        budgetItemCount: 6,
      },
      {
        title: 'Davis & Miller Wedding Celebration',
        description: 'An intimate yet lavish garden wedding with custom floral installations.',
        eventType: 'wedding',
        status: 'planning',
        daysFromNow: 90,
        location: { name: 'The Botanical Gardens', city: 'Atlanta', state: 'GA', country: 'US' },
        guestCountExpected: 125,
        budgetTotal: 95000,
        guestCount: 125,
        taskCount: 10,
        budgetItemCount: 6,
      },
      {
        title: 'Annual Tech Awards Ceremony',
        description: 'Industry awards gala recognizing innovation and excellence in technology.',
        eventType: 'corporate',
        status: 'confirmed',
        daysFromNow: 35,
        location: { name: 'Moscone Center West', city: 'San Francisco', state: 'CA', country: 'US' },
        guestCountExpected: 130,
        budgetTotal: 55000,
        guestCount: 130,
        taskCount: 10,
        budgetItemCount: 6,
      },
      {
        title: 'Grand Masquerade Ball',
        description: 'A spectacular masked ball fundraiser with live orchestra and silent auction.',
        eventType: 'fundraiser',
        status: 'planning',
        daysFromNow: 50,
        location: { name: 'Historic City Hall', city: 'Philadelphia', state: 'PA', country: 'US' },
        guestCountExpected: 100,
        budgetTotal: 40000,
        guestCount: 100,
        taskCount: 10,
        budgetItemCount: 6,
      },
      {
        title: 'Executive Leadership Retreat',
        description: 'A 3-day strategic retreat for senior leadership with facilitated workshops.',
        eventType: 'corporate',
        status: 'planning',
        daysFromNow: 40,
        location: { name: 'Broadmoor Resort', city: 'Colorado Springs', state: 'CO', country: 'US' },
        guestCountExpected: 100,
        budgetTotal: 30000,
        guestCount: 100,
        taskCount: 10,
        budgetItemCount: 6,
      },
      {
        title: 'Healthcare Industry Conference',
        description: 'Multi-day conference for healthcare leaders, clinicians, and technology innovators.',
        eventType: 'conference',
        status: 'draft',
        daysFromNow: 85,
        location: { name: 'Mayo Clinic Conference Center', city: 'Rochester', state: 'MN', country: 'US' },
        guestCountExpected: 120,
        budgetTotal: 70000,
        guestCount: 120,
        taskCount: 10,
        budgetItemCount: 6,
      },
      {
        title: 'Anderson Family Reunion',
        description: 'Multi-generational family reunion bringing together the extended Anderson family.',
        eventType: 'other',
        status: 'planning',
        daysFromNow: 65,
        location: { name: 'Lakeside Resort & Conference Center', city: 'Lake Tahoe', state: 'CA', country: 'US' },
        guestCountExpected: 110,
        budgetTotal: 25000,
        guestCount: 110,
        taskCount: 10,
        budgetItemCount: 6,
      },
      {
        title: 'Celebrity Birthday Bash',
        description: 'An exclusive high-profile birthday celebration with entertainment and luxury experiences.',
        eventType: 'birthday',
        status: 'confirmed',
        daysFromNow: 15,
        location: { name: 'Skybar at Mondrian Hotel', city: 'Los Angeles', state: 'CA', country: 'US' },
        guestCountExpected: 150,
        budgetTotal: 80000,
        guestCount: 150,
        taskCount: 10,
        budgetItemCount: 6,
      },
      {
        title: 'Innovation Expo 2026',
        description: 'A showcase of emerging technologies and startup innovations with investor meet-and-greets.',
        eventType: 'conference',
        status: 'planning',
        daysFromNow: 95,
        location: { name: 'Las Vegas Convention Center', city: 'Las Vegas', state: 'NV', country: 'US' },
        guestCountExpected: 130,
        budgetTotal: 90000,
        guestCount: 130,
        taskCount: 10,
        budgetItemCount: 6,
      },
      {
        title: "New Year's Eve Grand Gala",
        description: "A spectacular end-of-year celebration with champagne toast, dancing, and fireworks.",
        eventType: 'corporate',
        status: 'confirmed',
        daysFromNow: 302,
        location: { name: 'The Skyloft at One57', city: 'New York', state: 'NY', country: 'US' },
        guestCountExpected: 120,
        budgetTotal: 75000,
        guestCount: 120,
        taskCount: 10,
        budgetItemCount: 6,
      },
      {
        title: 'Summer Music Festival Kickoff',
        description: 'Opening night gala for a week-long music festival featuring world-class performers.',
        eventType: 'other',
        status: 'planning',
        daysFromNow: 120,
        location: { name: 'Amphitheater at Red Rocks', city: 'Morrison', state: 'CO', country: 'US' },
        guestCountExpected: 140,
        budgetTotal: 55000,
        guestCount: 140,
        taskCount: 10,
        budgetItemCount: 6,
      },
    ],
  },
];

// ── Generate SQL ──────────────────────────────────────────────────────────────

const lines = [];
const stats = [];

let globalEventIdx = 0;

for (const user of USERS) {
  const userId = randomUUID();
  const accountId = randomUUID();
  const hashedPassword = hashPasswordSync(TEST_PASSWORD);

  // User row
  lines.push(
    `INSERT INTO user (id, email, name, email_verified, created_at, updated_at, platform_role, is_active) ` +
    `VALUES ('${userId}', '${user.email}', '${escapeSql(user.name)}', 1, ${now}, ${now}, 'user', 1);`
  );

  // Account row (credential provider with hashed password)
  lines.push(
    `INSERT INTO account (id, user_id, account_id, provider_id, password, created_at, updated_at) ` +
    `VALUES ('${accountId}', '${userId}', '${userId}', 'credential', '${hashedPassword}', ${now}, ${now});`
  );

  // Subscription row
  const isFree = user.plan === 'free';
  const periodStart = isFree ? 'NULL' : now;
  const periodEnd = isFree ? 'NULL' : now + 30 * 86400;
  const customLimits = user.plan === 'enterprise' ? "'{}'" : 'NULL';

  lines.push(
    `INSERT INTO subscriptions (user_id, plan, status, current_period_start, current_period_end, emails_sent_this_period, sms_sent_this_period, custom_limits, created_at, updated_at) ` +
    `VALUES ('${userId}', '${user.plan}', '${user.subscriptionStatus}', ${periodStart}, ${periodEnd}, 0, 0, ${customLimits}, ${now}, ${now});`
  );

  let totalGuests = 0;

  for (const event of user.events) {
    const eventUuid = randomUUID();
    const startDate = now + event.daysFromNow * 86400;
    const endDate = startDate + 6 * 3600;
    // Unique slug: kebab-case title + short uuid fragment
    const slugBase = event.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const slugSuffix = eventUuid.split('-')[0];
    const slug = `${slugBase}-${slugSuffix}`;

    // Event row
    lines.push(
      `INSERT INTO events (uuid, user_id, title, description, event_type, status, start_date, end_date, timezone, location_name, location_city, location_state, location_country, guest_count_expected, budget_total, budget_currency, is_public, slug, created_at, updated_at) ` +
      `VALUES ('${eventUuid}', '${userId}', '${escapeSql(event.title)}', '${escapeSql(event.description)}', '${event.eventType}', '${event.status}', ${startDate}, ${endDate}, 'America/New_York', '${escapeSql(event.location.name)}', '${escapeSql(event.location.city)}', '${escapeSql(event.location.state)}', '${event.location.country}', ${event.guestCountExpected}, ${event.budgetTotal}, 'USD', 0, '${slug}', ${now}, ${now});`
    );

    // Guests
    lines.push(...generateGuests(eventUuid, globalEventIdx, event.guestCount));
    totalGuests += event.guestCount;

    // Tasks (slice from template based on taskCount)
    const taskTemplate = TASK_TEMPLATES[event.eventType] ?? TASK_TEMPLATES.other;
    const selectedTasks = taskTemplate.slice(0, event.taskCount);
    lines.push(...generateTasks(eventUuid, startDate, selectedTasks));

    // Budget items (slice from template based on budgetItemCount)
    const budgetTemplate = BUDGET_TEMPLATES[event.eventType] ?? BUDGET_TEMPLATES.other;
    const selectedItems = budgetTemplate.slice(0, event.budgetItemCount);
    lines.push(...generateBudgetItems(eventUuid, selectedItems));

    globalEventIdx++;
  }

  stats.push({ plan: user.plan, email: user.email, events: user.events.length, guests: totalGuests });
}

// ── Write output ──────────────────────────────────────────────────────────────

const sql = lines.join('\n');
const outPath = join(__dirname, '..', 'seed-data.sql');
writeFileSync(outPath, sql, 'utf-8');

// ── Console summary ───────────────────────────────────────────────────────────

console.log('\n--- Seed Test Data ---\n');
for (const s of stats) {
  const planPad = `[${s.plan}]`.padEnd(14);
  const emailPad = s.email.padEnd(28);
  console.log(`${planPad} ${emailPad} / ${TEST_PASSWORD}  (${s.events} event${s.events !== 1 ? 's' : ''}, ${s.guests} guests)`);
}
console.log(`\nSQL written to: ${outPath}`);
console.log('\nApply with:');
console.log('  npx wrangler d1 execute planloo-db-dev --local --env development --file=seed-data.sql');
console.log('');
