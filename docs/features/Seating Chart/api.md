# Seating Chart API Endpoints

All endpoints require authentication. Access is resolved via `resolveEventAccess()`.

**Base path:** `/api/v1/events/:eventUuid/floor-plans`

**File:** `backend/src/routes/floor-plans.ts`

---

## Floor Plan CRUD

### GET `/`

List floor plans for an event.

**Access:** Any event access (read-only)

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "abc-123",
      "eventId": 5,
      "name": "Reception Hall",
      "widthFt": 100,
      "heightFt": 80,
      "gridSnap": 1,
      "isDefault": true,
      "sortOrder": 0,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

### POST `/`

Create a new floor plan. First plan auto-sets `isDefault: true`.

**Access:** `canEdit`

**Body:**

```json
{
  "name": "Reception Hall",
  "widthFt": 100,
  "heightFt": 80,
  "gridSnap": 1,
  "isDefault": false
}
```

All fields except `name` are optional.

**Response (201):** Created floor plan object.

---

### GET `/:planUuid`

Get floor plan with all objects, seat assignments, and guest info.

**Access:** Any event access

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "abc-123",
    "name": "Reception Hall",
    "widthFt": 100,
    "heightFt": 80,
    "gridSnap": 1,
    "isDefault": true,
    "objects": [
      {
        "id": 10,
        "uuid": "obj-456",
        "objectType": "table",
        "tableShape": "round",
        "label": "Table 1",
        "posX": 15,
        "posY": 20,
        "widthFt": 6,
        "heightFt": 6,
        "rotation": 0,
        "seatCount": 8,
        "tableNumber": 1,
        "isLocked": false,
        "assignments": [
          {
            "id": 100,
            "seatNumber": 1,
            "guestId": 42,
            "guestUuid": "guest-789",
            "guestFirstName": "Jane",
            "guestLastName": "Doe",
            "guestRsvpStatus": "confirmed",
            "guestDietaryRestrictions": "vegetarian"
          }
        ]
      }
    ]
  }
}
```

---

### PATCH `/:planUuid`

Update floor plan metadata.

**Access:** `canEdit`

**Body (all optional):**

```json
{
  "name": "Updated Name",
  "widthFt": 120,
  "heightFt": 90,
  "gridSnap": 2,
  "isDefault": true,
  "sortOrder": 1
}
```

Setting `isDefault: true` automatically unsets the previous default.

---

### DELETE `/:planUuid`

Soft-delete a floor plan.

**Access:** `canEdit`

**Response (200):** `{ "success": true, "data": { "deleted": true } }`

---

## Floor Plan Objects

### POST `/:planUuid/objects`

Create a table or venue element.

**Access:** `canEdit`

**Body:**

```json
{
  "objectType": "table",
  "tableShape": "round",
  "label": "Table 1",
  "posX": 15,
  "posY": 20,
  "widthFt": 6,
  "heightFt": 6,
  "rotation": 0,
  "seatCount": 8
}
```

**Validation:**
- `objectType: "table"` requires `tableShape`
- `objectType: "element"` requires `elementType`
- `tableNumber` is auto-assigned for tables

**Default dimensions:** Round tables 6×6, rectangular 10×4, dance floor 20×20, stage 16×8.

**Response (201):** Created object with empty `assignments: []`.

---

### PATCH `/:planUuid/objects/:objectUuid`

Update a single object.

**Access:** `canEdit`

**Body (all optional):**

```json
{
  "label": "VIP Table",
  "posX": 25,
  "posY": 30,
  "widthFt": 8,
  "heightFt": 8,
  "rotation": 45,
  "seatCount": 10,
  "isLocked": true
}
```

---

### DELETE `/:planUuid/objects/:objectUuid`

Delete an object. Cascade-deletes seat assignments.

**Access:** `canEdit`

---

### PUT `/:planUuid/objects/bulk-positions`

Bulk update positions after drag. Designed for debounced auto-save (1s after last drag).

**Access:** `canEdit`

**Body:**

```json
{
  "updates": [
    { "uuid": "obj-1", "posX": 25, "posY": 30, "rotation": 0 },
    { "uuid": "obj-2", "posX": 50, "posY": 40 }
  ]
}
```

Uses `db.batch()` for atomicity.

---

## Seat Assignments

### POST `/:planUuid/objects/:objectUuid/assign`

Assign guest(s) to specific seats at a table.

**Access:** `canManageGuests`

**Body:**

```json
{
  "assignments": [
    { "guestUuid": "guest-1", "seatNumber": 1 },
    { "guestUuid": "guest-2", "seatNumber": 3 }
  ]
}
```

**Side effects:**
- Removes existing assignments for these guests at this table before re-inserting
- Updates `guests.tableAssignment` to the table's label

**Response (201):** `{ "success": true, "data": { "assigned": 2 } }`

---

### DELETE `/:planUuid/objects/:objectUuid/assign/:guestUuid`

Unassign a guest from a table.

**Access:** `canManageGuests`

**Side effects:**
- If the guest has no remaining assignments in this plan, clears `guests.tableAssignment` to `null`

---

### GET `/:planUuid/unassigned-guests`

List guests not assigned to any table in this plan.

**Access:** Any event access

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "uuid": "guest-5",
      "firstName": "John",
      "lastName": "Smith",
      "rsvpStatus": "confirmed",
      "dietaryRestrictions": null,
      "category": "family"
    }
  ]
}
```

---

### POST `/:planUuid/auto-assign`

Randomly assign selected guests to available seats across all tables.

**Access:** `canManageGuests`

**Body:**

```json
{
  "guestUuids": ["guest-1", "guest-2", "guest-3", "guest-4", "guest-5"]
}
```

**Algorithm:**
1. Collect all available seats across all tables (seat not yet occupied)
2. Fisher-Yates shuffle the available seats
3. Assign guests in order to shuffled seats
4. Update `guests.tableAssignment` for each assigned guest

**Response (200):**

```json
{
  "success": true,
  "data": {
    "assigned": 5,
    "totalRequested": 5,
    "availableSeatsRemaining": 15
  }
}
```

---

### GET `/:planUuid/conflicts`

Check for over-capacity tables and avoid-pair violations.

**Access:** Any event access

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "type": "over_capacity",
      "message": "Table 1 has 10 guests but only 8 seats",
      "objectUuid": "obj-1"
    },
    {
      "type": "avoid_pair",
      "message": "Avoid-pair seated at same table: Table 2",
      "objectUuid": "obj-2",
      "guestUuids": ["guest-3", "guest-7"]
    }
  ]
}
```

---

## Guest Relationships

### GET `/relationships`

List all prefer/avoid pairs for the event. Includes guest names.

**Access:** Any event access

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "relationshipType": "avoid",
      "notes": "Had a falling out",
      "guest1": { "uuid": "g-1", "firstName": "Alice", "lastName": "Smith" },
      "guest2": { "uuid": "g-2", "firstName": "Bob", "lastName": "Jones" }
    }
  ]
}
```

---

### POST `/relationships`

Create a guest relationship. Guest IDs are stored in consistent order (lower ID first).

**Access:** `canManageGuests`

**Body:**

```json
{
  "guestUuid1": "guest-1",
  "guestUuid2": "guest-2",
  "relationshipType": "avoid",
  "notes": "Optional reason"
}
```

**Validation:**
- Cannot create relationship with same guest
- Duplicate pairs return 409

---

### DELETE `/relationships/:id`

Remove a guest relationship.

**Access:** `canManageGuests`
