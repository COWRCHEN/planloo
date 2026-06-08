# Modular Unit Pricing — Overview

## Why Unit Pricing?

The old tier model (Personal → Planner → Agency) forced customers into bundles. A solo planner who only needs email and events paid for floor plans, audit history, and org management they'd never use.

The new model is simple: **start free, pay only for what you actually need, stack as many units as you want.**

## How It Works

1. Every account starts with a **free base** (1 event, 50 guests, core management).
2. Need more events? Buy them one at a time — $3/mo per event.
3. Need email? Buy 1,000-email blocks — $2/mo per block.
4. Need a feature (Floor Plans, Organizations, Audit History)? Pay a flat monthly unlock fee.
5. Features like CSV, Budget Tracking, Task Templates, and Vendor Management are **free for everyone**.

No tiers. No upsell bundles. If you remove something, you stop paying for it next billing cycle.

## Documents in This Folder

| File | What it covers |
|------|---------------|
| [unit-pricing.md](./unit-pricing.md) | Complete price list — all units and feature unlocks with cost/margin data |
| [user-journeys.md](./user-journeys.md) | Real-world example configurations and cost comparisons |
| [data-model.md](./data-model.md) | Database schema changes required to implement this |
| [stripe-integration.md](./stripe-integration.md) | How Stripe subscription items map to units |
| [migration.md](./migration.md) | Transition path for existing tier subscribers |

## Key Numbers at a Glance

- Email: $2/1,000 emails per month (5× markup over Resend cost)
- SMS: $5/100 SMS per month (6.25× markup over Twilio cost)
- Events: $3/event/mo — pure margin, no direct COGS
- Annual billing: 15% discount on all paid items

## What's Always Free

- 1 active event, 50 guests
- CSV import/export
- Budget tracking
- Task templates
- Vendor management
