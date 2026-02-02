# API Specification - Planloo

## Overview

RESTful API built with Hono framework, deployed on Cloudflare Workers for edge performance.

**Framework:** Hono v4.x
**Runtime:** Cloudflare Workers
**Authentication:** Better Auth
**Rate Limiting:** Cloudflare Workers rate limiting

---

## API Design Principles

1. **RESTful conventions** - Use standard HTTP methods and status codes
2. **JSON API responses** - All responses in JSON format
3. **Consistent error handling** - Standard error response structure
4. **Versioning** - API versioned via URL path (`/api/v1/`)
5. **Pagination** - Cursor-based pagination for large datasets
6. **Rate limiting** - Protect against abuse
7. **CORS** - Configure for frontend domain

---

## Base URL

- **Production:** `https://planloo.com/api/v1`
- **Development:** `http://localhost:8787/api/v1`

---

## Authentication

### Better Auth Session Flow

Better Auth handles all authentication via the `/api/auth/*` endpoints. Sessions are managed automatically with secure HTTP-only cookies.

1. User signs up or logs in via Better Auth endpoints
2. Server creates session and sets secure cookie
3. Client sends cookie automatically with subsequent requests
4. Server validates session on protected routes

### Supported Auth Methods

- **Email/Password**: Traditional email and password authentication
- **OAuth Providers**: Google, GitHub (configurable)
- **Magic Links**: Passwordless email authentication (optional)

### Headers

```
Cookie: better-auth.session_token=<session-token>
```

---

## Standard Response Format

### Success Response

```json
{
  "success": true,
  "data": { /* response data */ },
  "meta": {
    "timestamp": "2026-02-02T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-02-02T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `204` - No Content (successful delete)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (authenticated but not authorized)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `422` - Unprocessable Entity
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

---

## API Endpoints

### 1. Authentication Endpoints (Better Auth)

Better Auth provides a complete authentication system. All auth endpoints are prefixed with `/api/auth/`.

#### POST `/api/auth/sign-up/email`

Register a new user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response: 200 OK**
```json
{
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": false,
    "createdAt": "2026-02-02T10:30:00Z"
  },
  "session": {
    "id": "session_xyz",
    "expiresAt": "2026-02-09T10:30:00Z"
  }
}
```

---

#### POST `/api/auth/sign-in/email`

Authenticate user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response: 200 OK**
```json
{
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": true
  },
  "session": {
    "id": "session_xyz",
    "expiresAt": "2026-02-09T10:30:00Z"
  }
}
```

---

#### POST `/api/auth/sign-in/social`

Initiate OAuth sign-in with a social provider.

**Request Body:**
```json
{
  "provider": "google",
  "callbackURL": "https://planloo.com/auth/callback"
}
```

**Response: 200 OK**
```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

---

#### POST `/api/auth/sign-out`

End user session.

**Request:** No body required (uses session cookie)

**Response: 200 OK**
```json
{
  "success": true
}
```

---

#### GET `/api/auth/session`

Get current session and user info.

**Response: 200 OK**
```json
{
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": true,
    "role": "user"
  },
  "session": {
    "id": "session_xyz",
    "expiresAt": "2026-02-09T10:30:00Z"
  }
}
```

**Response: 401 Unauthorized** (if not authenticated)
```json
{
  "user": null,
  "session": null
}
```

---

#### POST `/api/auth/forget-password`

Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response: 200 OK**
```json
{
  "status": true
}
```

---

#### POST `/api/auth/reset-password`

Reset password with token.

**Request Body:**
```json
{
  "token": "reset_token_abc123",
  "newPassword": "NewSecurePassword123!"
}
```

**Response: 200 OK**
```json
{
  "status": true
}
```

---

#### POST `/api/auth/verify-email`

Verify email with token (from email link).

**Request Body:**
```json
{
  "token": "verify_token_abc123"
}
```

**Response: 200 OK**
```json
{
  "user": {
    "id": "usr_abc123",
    "emailVerified": true
  }
}
```

---

### 2. User Endpoints

#### GET `/api/v1/users/me`

Get current authenticated user profile.

**Authentication:** Required

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "user": {
      "uuid": "usr_abc123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "avatarUrl": "https://cdn.planloo.com/avatars/usr_abc123.jpg",
      "role": "user",
      "emailVerified": true,
      "createdAt": "2026-01-15T10:30:00Z",
      "lastLoginAt": "2026-02-02T10:30:00Z"
    }
  }
}
```

---

#### PATCH `/api/v1/users/me`

Update current user profile.

**Authentication:** Required

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+1234567890",
  "avatarUrl": "https://cdn.planloo.com/avatars/new.jpg"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "user": { /* updated user object */ }
  }
}
```

---

### 3. Event Endpoints

#### GET `/api/v1/events`

List all events for authenticated user.

**Authentication:** Required

**Query Parameters:**
- `status` - Filter by status (draft, planning, confirmed, completed, cancelled)
- `limit` - Results per page (default: 20, max: 100)
- `cursor` - Pagination cursor
- `sort` - Sort order (newest, oldest, start_date_asc, start_date_desc)

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "uuid": "evt_abc123",
        "title": "Summer Wedding",
        "description": "Outdoor wedding celebration",
        "eventType": "wedding",
        "status": "planning",
        "startDate": "2026-08-15T14:00:00Z",
        "endDate": "2026-08-15T22:00:00Z",
        "locationName": "Sunset Gardens",
        "locationCity": "San Francisco",
        "locationState": "CA",
        "guestCountExpected": 150,
        "guestCountConfirmed": 85,
        "budgetTotal": 25000,
        "budgetCurrency": "USD",
        "coverImageUrl": "https://cdn.planloo.com/events/evt_abc123.jpg",
        "createdAt": "2026-01-20T10:00:00Z",
        "updatedAt": "2026-02-01T15:30:00Z"
      }
    ],
    "pagination": {
      "nextCursor": "cursor_xyz789",
      "hasMore": true
    }
  }
}
```

---

#### POST `/api/v1/events`

Create a new event.

**Authentication:** Required

**Request Body:**
```json
{
  "title": "Summer Wedding",
  "description": "Outdoor wedding celebration",
  "eventType": "wedding",
  "startDate": "2026-08-15T14:00:00Z",
  "endDate": "2026-08-15T22:00:00Z",
  "timezone": "America/Los_Angeles",
  "locationName": "Sunset Gardens",
  "locationAddress": "123 Garden Lane",
  "locationCity": "San Francisco",
  "locationState": "CA",
  "locationCountry": "USA",
  "locationPostalCode": "94102",
  "guestCountExpected": 150,
  "budgetTotal": 25000,
  "budgetCurrency": "USD"
}
```

**Response: 201 Created**
```json
{
  "success": true,
  "data": {
    "event": { /* full event object */ }
  }
}
```

---

#### GET `/api/v1/events/:uuid`

Get single event details.

**Authentication:** Required (must own event or be collaborator)

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "event": { /* full event object with all fields */ }
  }
}
```

---

#### PATCH `/api/v1/events/:uuid`

Update event details.

**Authentication:** Required (must own event or have editor role)

**Request Body:** (partial update)
```json
{
  "title": "Updated Summer Wedding",
  "status": "confirmed",
  "guestCountExpected": 160
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "event": { /* updated event object */ }
  }
}
```

---

#### DELETE `/api/v1/events/:uuid`

Delete event (soft delete).

**Authentication:** Required (must own event)

**Response: 204 No Content**

---

### 4. Guest Endpoints

#### GET `/api/v1/events/:eventUuid/guests`

List all guests for an event.

**Authentication:** Required

**Query Parameters:**
- `category` - Filter by category (vip, family, friend, colleague, other)
- `rsvpStatus` - Filter by RSVP status
- `search` - Search by name or email
- `limit` - Results per page (default: 50, max: 200)

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "guests": [
      {
        "uuid": "gst_abc123",
        "eventId": "evt_abc123",
        "firstName": "Alice",
        "lastName": "Johnson",
        "email": "alice@example.com",
        "phone": "+1234567890",
        "category": "family",
        "rsvpStatus": "confirmed",
        "rsvpRespondedAt": "2026-02-01T10:00:00Z",
        "plusOnesAllowed": 1,
        "plusOnesCount": 1,
        "dietaryRestrictions": "Vegetarian",
        "notes": "Arrives early to help setup",
        "checkedIn": false,
        "createdAt": "2026-01-21T09:00:00Z"
      }
    ],
    "stats": {
      "total": 150,
      "confirmed": 85,
      "declined": 10,
      "pending": 55
    }
  }
}
```

---

#### POST `/api/v1/events/:eventUuid/guests`

Add guest to event.

**Authentication:** Required

**Request Body:**
```json
{
  "firstName": "Bob",
  "lastName": "Smith",
  "email": "bob@example.com",
  "phone": "+1234567890",
  "category": "friend",
  "plusOnesAllowed": 1,
  "dietaryRestrictions": "None",
  "notes": "College friend"
}
```

**Response: 201 Created**
```json
{
  "success": true,
  "data": {
    "guest": { /* full guest object */ },
    "rsvpLink": "https://planloo.com/rsvp/gst_abc123?token=rsvp_token_xyz"
  }
}
```

---

#### POST `/api/v1/events/:eventUuid/guests/import`

Bulk import guests from CSV.

**Authentication:** Required

**Request:** Multipart form data with CSV file

**CSV Format:**
```
firstName,lastName,email,phone,category,plusOnesAllowed,dietaryRestrictions
Alice,Johnson,alice@example.com,+1234567890,family,1,Vegetarian
Bob,Smith,bob@example.com,+1987654321,friend,0,None
```

**Response: 201 Created**
```json
{
  "success": true,
  "data": {
    "imported": 45,
    "failed": 2,
    "errors": [
      {
        "row": 3,
        "error": "Invalid email format"
      }
    ]
  }
}
```

---

#### PATCH `/api/v1/guests/:uuid`

Update guest details.

**Authentication:** Required

**Request Body:**
```json
{
  "category": "vip",
  "rsvpStatus": "confirmed",
  "dietaryRestrictions": "Gluten-free"
}
```

**Response: 200 OK**

---

#### DELETE `/api/v1/guests/:uuid`

Remove guest from event.

**Authentication:** Required

**Response: 204 No Content**

---

#### POST `/api/v1/guests/:uuid/check-in`

Check in guest at event.

**Authentication:** Required

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "guest": {
      "checkedIn": true,
      "checkedInAt": "2026-08-15T14:05:00Z"
    }
  }
}
```

---

### 5. RSVP Endpoints (Public)

#### GET `/api/v1/rsvp/:guestUuid`

Get RSVP form data (public endpoint).

**Query Parameters:**
- `token` - RSVP token (required)

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "guest": {
      "firstName": "Alice",
      "lastName": "Johnson",
      "plusOnesAllowed": 1,
      "currentRsvpStatus": "pending"
    },
    "event": {
      "title": "Summer Wedding",
      "startDate": "2026-08-15T14:00:00Z",
      "locationName": "Sunset Gardens",
      "locationAddress": "123 Garden Lane, San Francisco, CA"
    }
  }
}
```

---

#### POST `/api/v1/rsvp/:guestUuid`

Submit RSVP response (public endpoint).

**Query Parameters:**
- `token` - RSVP token (required)

**Request Body:**
```json
{
  "rsvpStatus": "confirmed",
  "plusOnesCount": 1,
  "dietaryRestrictions": "Vegetarian",
  "notes": "Looking forward to it!"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "message": "RSVP submitted successfully"
  }
}
```

---

### 6. Service Provider Endpoints

#### GET `/api/v1/service-providers`

Search and list service providers (public).

**Query Parameters:**
- `category` - Filter by category (catering, photography, dj, florist, etc.)
- `city` - Filter by city
- `state` - Filter by state
- `priceRange` - Filter by price range ($$, $$$, $$$$)
- `minRating` - Minimum rating (1-5)
- `search` - Search by business name or keywords
- `limit` - Results per page (default: 20)
- `cursor` - Pagination cursor

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "uuid": "prv_abc123",
        "businessName": "Delicious Catering Co.",
        "category": "catering",
        "description": "Full-service catering for events of all sizes",
        "priceRange": "$$$",
        "locationCity": "San Francisco",
        "locationState": "CA",
        "ratingAverage": 4.8,
        "ratingCount": 127,
        "logoUrl": "https://cdn.planloo.com/providers/prv_abc123.jpg",
        "isVerified": true
      }
    ],
    "pagination": {
      "nextCursor": "cursor_xyz",
      "hasMore": true
    }
  }
}
```

---

#### GET `/api/v1/service-providers/:uuid`

Get service provider details (public).

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "provider": {
      "uuid": "prv_abc123",
      "businessName": "Delicious Catering Co.",
      "contactName": "Jane Doe",
      "email": "info@deliciouscatering.com",
      "phone": "+1234567890",
      "website": "https://deliciouscatering.com",
      "category": "catering",
      "description": "Full-service catering...",
      "servicesOffered": ["buffet", "plated_dinner", "cocktail_hour", "desserts"],
      "priceRange": "$$$",
      "locationCity": "San Francisco",
      "locationState": "CA",
      "serviceAreaRadius": 50,
      "ratingAverage": 4.8,
      "ratingCount": 127,
      "isVerified": true,
      "images": [
        {
          "url": "https://cdn.planloo.com/providers/prv_abc123_1.jpg",
          "caption": "Elegant plated dinner"
        }
      ],
      "reviews": [ /* recent reviews */ ]
    }
  }
}
```

---

#### POST `/api/v1/events/:eventUuid/service-providers`

Add service provider to event.

**Authentication:** Required

**Request Body:**
```json
{
  "serviceProviderId": "prv_abc123",
  "status": "inquiry",
  "notes": "Interested in buffet option for 150 guests"
}
```

**Response: 201 Created**

---

### 7. Venue Endpoints

#### GET `/api/v1/venues`

Search and list venues (public).

**Query Parameters:**
- `city` - Filter by city
- `state` - Filter by state
- `type` - Filter by venue type
- `minCapacity` - Minimum capacity
- `maxCapacity` - Maximum capacity
- `priceMax` - Maximum price per day
- `amenities` - Filter by amenities (comma-separated)
- `search` - Search by venue name
- `lat` & `lng` & `radius` - Geo search (radius in miles)
- `limit` - Results per page
- `cursor` - Pagination cursor

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "venues": [
      {
        "uuid": "ven_abc123",
        "name": "Sunset Gardens",
        "venueType": "outdoor",
        "capacityMin": 50,
        "capacityMax": 200,
        "city": "San Francisco",
        "state": "CA",
        "pricePerDay": 3500,
        "currency": "USD",
        "ratingAverage": 4.9,
        "ratingCount": 89,
        "amenities": ["parking", "wifi", "catering", "av_equipment"],
        "images": [
          {
            "url": "https://cdn.planloo.com/venues/ven_abc123_1.jpg",
            "isCover": true
          }
        ]
      }
    ],
    "pagination": {
      "nextCursor": "cursor_xyz",
      "hasMore": true
    }
  }
}
```

---

#### GET `/api/v1/venues/:uuid`

Get venue details (public).

**Response: 200 OK** - Similar structure to provider details

---

### 8. Budget Endpoints

#### GET `/api/v1/events/:eventUuid/budget`

Get budget overview for event.

**Authentication:** Required

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "budget": {
      "totalBudget": 25000,
      "totalEstimated": 23500,
      "totalActual": 18750,
      "remaining": 6250,
      "currency": "USD",
      "categories": {
        "venue": {
          "estimated": 5000,
          "actual": 5000,
          "paid": 5000,
          "pending": 0
        },
        "catering": {
          "estimated": 8000,
          "actual": 7500,
          "paid": 3750,
          "pending": 3750
        }
      },
      "items": [ /* budget items */ ]
    }
  }
}
```

---

#### POST `/api/v1/events/:eventUuid/budget/items`

Add budget line item.

**Authentication:** Required

**Request Body:**
```json
{
  "category": "catering",
  "itemName": "Wedding Dinner",
  "description": "Plated dinner for 150 guests",
  "estimatedCost": 7500,
  "currency": "USD",
  "paymentDueDate": "2026-08-01T00:00:00Z"
}
```

**Response: 201 Created**

---

#### PATCH `/api/v1/budget/items/:uuid`

Update budget item.

**Authentication:** Required

**Request Body:**
```json
{
  "actualCost": 7200,
  "paymentStatus": "paid"
}
```

**Response: 200 OK**

---

#### POST `/api/v1/budget/items/:uuid/payments`

Record payment for budget item.

**Authentication:** Required

**Request Body:**
```json
{
  "amount": 3600,
  "currency": "USD",
  "paymentMethod": "credit_card",
  "paymentDate": "2026-07-15T10:00:00Z",
  "referenceNumber": "TXN123456",
  "notes": "50% deposit"
}
```

**Response: 201 Created**

---

### 9. Review Endpoints

#### POST `/api/v1/service-providers/:uuid/reviews`

Submit review for service provider.

**Authentication:** Required

**Request Body:**
```json
{
  "eventId": "evt_abc123",
  "rating": 5,
  "title": "Exceptional service!",
  "reviewText": "The catering was outstanding. Highly recommend!",
  "wouldRecommend": true
}
```

**Response: 201 Created**

---

#### GET `/api/v1/service-providers/:uuid/reviews`

Get reviews for service provider (public).

**Query Parameters:**
- `limit` - Results per page
- `cursor` - Pagination cursor
- `sort` - Sort order (newest, oldest, rating_high, rating_low)

**Response: 200 OK**

---

## Rate Limiting

**Limits:**
- **Anonymous:** 100 requests per 15 minutes
- **Authenticated:** 1000 requests per 15 minutes
- **Provider/Venue listing:** 10 requests per minute

**Rate Limit Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 998
X-RateLimit-Reset: 1643811600
```

**429 Response:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 60
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input validation failed |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `CONFLICT` | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_ERROR` | Server error |
| `DATABASE_ERROR` | Database operation failed |
| `INVALID_TOKEN` | Invalid or expired token |

---

## Webhooks (Future)

Placeholder for future webhook support:
- Event RSVP received
- Payment completed
- Vendor booking confirmed

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-02 | Product Manager | Initial API specification |
