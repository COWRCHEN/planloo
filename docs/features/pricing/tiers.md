# Pricing Tiers & Limits

**Source of truth:** `backend/src/lib/plan-limits.ts` (`PLAN_LIMITS` constant)

All limits are compile-time constants — no database table. Changing limits requires a deploy.

---

## Tier Comparison

| | Free | Personal | Planner | Agency | Enterprise |
|---|---|---|---|---|---|
| **Price/mo (monthly)** | $0 | $19.99 | $39.99 | $199.99 | Contact us |
| **Price/mo (annual)** | — | $205.00 | $408.0 | $2040.0 | Contact us |
| **Active events** | 1 | 3 | 25 | 100 | Custom |
| **Guests (total)** | 50 | 200 | 600 | 2,000 | Custom |
| **Email pool/mo** | — | 1,000 | 3,000 | 20,000 | Custom |
| **Collaborators/event** | 0 | 2 | 10 | 10 | Custom |
| **Custom guest fields** | 0 | 3 | 10 | 10 | Custom |
| **Organizations** | 0 | 0 | 1 (5 members) | 3 (10 members) | Custom |
| **CSV import/export** | ✗ | ✓ | ✓ | ✓ | ✓ |
| **Floor plans** | ✗ | ✗ | ✓ | ✓ | ✓ |
| **Budget tracking** | ✗ | ✓ | ✓ | ✓ | ✓ |
| **Task templates** | ✗ | ✓ | ✓ | ✓ | ✓ |
| **Vendor management** | ✗ | ✓ | ✓ | ✓ | ✓ |
| **SSO / SAML** | ✗ | ✗ | ✗ | ✗ | ✓ |
| **Dedicated support** | ✗ | ✗ | ✗ | ✗ | ✓ |
| **Custom contract / SLA** | ✗ | ✗ | ✗ | ✗ | ✓ |

> `null` in code = Unlimited. `0` = not allowed.

---

## Unit Pricing

### Email (Resend)

| | Rate |
|---|---|
| **Cost per email** | ~$0.0004 |
| **Sell price per email** | $0.002 (via $2.00/1,000 overage) |
| **Markup** | 5× |

### SMS (Twilio — future, not yet implemented)

| | Rate |
|---|---|
| **Cost per SMS** | ~$0.008 |
| **Sell price per SMS** | $0.05 (overage) |
| **Markup** | 6× |

---

## Overage Pricing

Overages are not yet automatically billed — these rates are constants for future implementation.

| Resource | Sell rate | Cost basis | Markup |
|---|---|---|---|
| Extra 1,000 emails | $2.00 | ~$0.40 | 5× |
| Extra SMS | $0.05 each | ~$0.008 | 6× |
| Extra guests | $0.05 each | ~$0.002 | 25× |

---

## Unit Economics (Worst Case — 100% Pool Utilization)

Email cost basis: $0.0004/email · SMS cost basis: $0.008/SMS (Twilio, planned) · Stripe: 3.4% + $0.30

| | Personal | Planner | Agency |
|---|---|---|---|
| Email cost (1,000 / 3,000 / 20,000) | $0.40 | $1.20 | $8.00 |
| SMS cost — Twilio *(planned)* (200 / 600 / 2,000) | $1.60 | $4.80 | $16.00 |
| Stripe fee (3.4% + $0.30) | $0.98 | $1.66 | $7.10 |
| Cloudflare Workers | $0.01 | $0.01 | $0.01 |
| **Total COGS** | **$2.99** | **$7.67** | **$31.11** |
| **Gross margin** | **85%** | **81%** | **84%** |

> SMS row reflects the planned Twilio integration (Phase 4). Until SMS is live, actual COGS is lower and margins are higher.

### Annual Billing (Worst Case — 100% Pool Utilization)

Annual totals: $205 / $408 / $2,040 · Stripe charged once on full amount · email/SMS/CF × 12

| | Personal | Planner | Agency |
|---|---|---|---|
| Email cost (1,000 / 3,000 / 20,000 × 12) | $4.80 | $14.40 | $96.00 |
| SMS cost — Twilio *(planned)* (200 / 600 / 2,000 × 12) | $19.20 | $57.60 | $192.00 |
| Stripe fee on annual charge (3.4% + $0.30) | $7.27 | $14.17 | $69.66 |
| Cloudflare Workers (× 12) | $0.12 | $0.12 | $0.12 |
| **Total annual COGS** | **$31.39** | **$86.29** | **$357.78** |
| **Gross margin** | **85%** | **79%** | **82%** |

> Annual Stripe fee benefit: one transaction vs. 12 monthly charges saves ~$3.26 / $5.79 / $15.54 per year in Stripe fees.

---

## Subscription Statuses

| Status | Meaning | Access Granted? |
|---|---|---|
| `free` | No paid subscription (default) | Yes (free limits) |
| `active` | Paid and current | Yes (plan limits) |
| `trialing` | In trial period | Yes (plan limits) |
| `past_due` | Payment failed | No → downgraded to free limits |
| `canceled` | Subscription ended | No → downgraded to free limits |
| `incomplete` | Checkout not completed | No → downgraded to free limits |

`getEffectivePlan(plan, status)` returns the effective tier for limit checks. If a paid plan's status is not `active` or `trialing`, it returns `'free'`.

---

## Upgrade Path

```
free → personal → planner → agency → enterprise
```

`getUpgradeTier(plan)` returns the next tier. Returns `null` for `enterprise` (already highest). Enterprise is sales-gated — upgrades redirect to a "contact us" flow rather than Stripe checkout.
