# Unit Pricing — Complete Price List

All prices are monthly. Annual billing applies a **15% discount** to all paid items.

---

## Free Base (every account)

| Included | Limit |
|----------|-------|
| Active events | 1 |
| Total guests | 50 |
| CSV import/export | Unlimited |
| Budget tracking | Unlimited |
| Task templates | Unlimited |
| Vendor management | Unlimited |

---

## Resource Units

Buy as many units as you need. Units stack — want 3,000 emails, buy 3 email units.

| Resource | Unit size | Price/mo | Annual/mo | Our Cost | Gross Margin |
|----------|-----------|----------|-----------|----------|-------------|
| Events | 1 event | $3.00 | $2.55 | ~$0.00 | ~100% |
| Guests | 100 guests | $2.00 | $1.70 | ~$0.00 | ~100% |
| Emails | 1,000 emails | $2.00 | $1.70 | $0.40 | 80% |
| SMS | 100 SMS | $5.00 | $4.25 | $0.80 | 84% |
| Collaborators | 1 slot per event | $1.00 | $0.85 | ~$0.00 | ~100% |
| Custom guest fields | 1 field | $3.00 | $2.55 | ~$0.00 | ~100% |
| Org members | 1 member (beyond 2 per org) | $5.00 | $4.25 | ~$0.00 | ~100% |

### Cost Basis

**Email** — Provider: Resend
- Resend rate: $0.0004/email ($0.40/1,000)
- Sell price: $2.00/1,000
- Markup: **5×**

**SMS** — Provider: Twilio (planned, Phase 4)
- Twilio rate: ~$0.008/SMS ($0.80/100)
- Sell price: $5.00/100
- Markup: **6.25×**

**All other resources** — Provider: Cloudflare D1
- D1 cost: $0.001/million rows read/written (paid plan)
- At any realistic usage level, cost per unit is < $0.001/mo
- Infrastructure is a fixed ~$5/mo Cloudflare Workers base shared across all customers

---

## Feature Unlocks

Single flat monthly fee. The feature is either on or off — no per-use charge.

| Feature | Price/mo | Annual/mo | Our Cost | Gross Margin |
|---------|---------|-----------|----------|-------------|
| CSV Import/Export | **FREE** | FREE | ~$0.00 | — |
| Budget Tracking | **FREE** | FREE | ~$0.00 | — |
| Task Templates | **FREE** | FREE | ~$0.00 | — |
| Vendor Management | **FREE** | FREE | ~$0.00 | — |
| Floor Plans | $10.00 | $8.50 | ~$0.01 | ~99.9% |
| Organizations | $10.00 | $8.50 | ~$0.01 | ~99.9% |
| Guest Audit History | $8.00 | $6.80 | ~$0.02 | ~99.8% |
| SSO / SAML | Contact sales | — | ~$0.00 | — |

**Organizations** unlock: includes 1 organization with 2 members. Additional members are billed as org member units ($5/member/mo) on top of the unlock fee.

### Cost Basis — Feature Unlocks

- **Floor Plans, Organizations**: Schema rows in D1 + potential R2 asset storage for floor plan images. At typical usage, < $0.01/mo per customer.
- **Guest Audit History**: Additional audit log rows written to D1 on every guest mutation. At 1,000 mutations/mo, D1 cost is < $0.002. Priced at $8/mo for the compliance value, not the infrastructure cost.
- **SSO/SAML**: Requires custom Better Auth provider configuration per enterprise customer — priced via sales contract.

---

## Overage / Out-of-Pool Behavior

There is no automatic overage billing. If a customer has consumed their purchased email or SMS units, the system returns HTTP 402 (same behavior as today). The customer must purchase additional units from the billing dashboard to continue.

This prevents surprise charges and keeps billing predictable.

---

## Annual Billing

All paid units and feature unlocks are eligible for annual pricing. Annual subscribers:
- Pay 12 months upfront
- Receive 15% discount (effective rate = monthly × 0.85)
- One Stripe charge instead of 12 (saves on Stripe fees)

Annual pricing is per Stripe subscription item. Mixed billing intervals (some monthly, some annual) are not supported in v1 — customers must choose one interval for all items.
