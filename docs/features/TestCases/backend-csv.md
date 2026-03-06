# Test Cases: csv

**Source:** `backend/src/lib/csv.ts`
**Test file:** `backend/src/lib/csv.test.ts`
**Total tests:** 30

---

## `parseGuestsCsv(content)`

Parses a CSV string into guest objects. Returns `{ success, guests, errors }`.
Rows with fatal field errors are skipped; errors are collected per-row.

### Error Cases

| # | Test | Input | Expected |
|---|------|-------|----------|
| 1 | empty input | `''` | `success=false`, `errors[0].message` matches /empty/i |
| 2 | missing firstName header | `'lastName,email\nDoe,test@test.com'` | `success=false`, `errors[0].message` matches /firstname/i |
| 3 | missing firstName value | `'firstName,lastName\n,Doe'` | `success=false`, `guests=[]`, `errors[0].row=2` |
| 4 | firstName exceeds 100 chars | 101-char name | `success=false`, `errors[0].message` contains `'100'` |
| 5 | invalid email format | `'firstName,email\nJohn,not-an-email'` | `success=false`, `errors[0].message` contains `'Invalid email'` |
| 6 | category exceeds 50 chars | 51-char category | `success=false`, `errors[0].message` contains `'category'` |
| 7 | plusOnesAllowed non-numeric | `'abc'` | `success=false`, `errors[0].message` contains `'plusOnesAllowed'` |
| 8 | plusOnesAllowed > 10 | `'11'` | `success=false` |
| 9 | plusOnesAllowed negative | `'-1'` | `success=false` |
| 10 | plusOnesCount exceeds plusOnesAllowed | allowed=1, adults=1, children=1 | `success=false`, `errors[0].message` contains `'plusOnesCountAdults'` |

### Success Cases

| # | Test | Input | Expected |
|---|------|-------|----------|
| 11 | minimal CSV (firstName only) | `'firstName\nJohn'` | `success=true`, `guests[0].firstName='John'` |
| 12 | all core fields | firstName, lastName, email, phone, category, plusOnesAllowed, dietaryRestrictions, notes | all fields correctly mapped |
| 13 | CRLF line endings | `\r\n` separators | `success=true`, `guests.length=2` |
| 14 | quoted values with commas | `"seat near stage, front row"` | notes parsed without splitting on comma |
| 15 | escaped double quotes in quoted value | `"He said ""hello"""` | parsed as `He said "hello"` |
| 16 | blank lines between data rows | | blank rows skipped, guests counted correctly |
| 17 | header normalisation | `'First Name'`, `'Last_Name'` | spaces and underscores stripped, lowercased, matched |
| 18 | needsAccommodation boolean — yes/no/true/false | `yes`, `no`, `true`, `false` | mapped to `true`, `false`, `true`, `false` |
| 19 | needsAccommodation unrecognised value | `'maybe'` | mapped to `null` |
| 20 | partial errors: valid rows still parsed | valid + invalid rows mixed | valid guests returned, errors recorded for bad rows |
| 21 | plusOnesAllowed defaults to 0 when column absent | header without plusOnesAllowed | `plusOnesAllowed=0` |
| 22 | phase-2 optional fields | addressStreet, addressCity, mealChoice, tableAssignment | fields correctly mapped |

---

## `generateGuestsCsv(guests)`

Generates a RFC-style CSV string from guest data.

| # | Test | Input | Expected |
|---|------|-------|----------|
| 23 | empty guest list returns header row only | `[]` | 1 line, contains `'firstName'` |
| 24 | correct column headers included | `[]` | contains firstName, lastName, email, rsvpStatus, plusOnesAllowed, checkedIn |
| 25 | one row per guest | 2 guests | 3 lines (header + 2 data) |
| 26 | checkedIn serialised as yes/no | `checkedIn=true` / `false` | row contains `'yes'` / `'no'` |
| 27 | commas in value are quoted | `notes='seat near stage, front row'` | output contains `"seat near stage, front row"` |
| 28 | double quotes in value are escaped | `notes='He said "hello"'` | output contains `"He said ""hello"""` |
| 29 | needsAccommodation serialised as yes/no/empty | `true` / `false` / `null` | `,yes,` / `,no,` / `,,` |
| 30 | round-trip: generate → parse produces same data | guest with comma in notes | parsed firstName and notes match original |
