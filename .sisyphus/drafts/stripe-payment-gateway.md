# Draft: Stripe Payment Gateway (Sandbox)

## Requirements (confirmed)
- "add a payment gateway feature using stripe sandbox"
- "use this docs from stripe to integrate later https://docs.stripe.com/keys using context7 mcp"
- One-time payments only
- Stripe-hosted Checkout page
- Success criteria: user can pay for order & webhook updates order state
- Keys stored in environment variables (.env)
- Out-of-scope: refunds, saved cards
- Stock decrement after payment confirmation via webhook
- Testing: manual QA only for this iteration
- If stock becomes insufficient before webhook: block decrement and mark payment as REQUIRES_REVIEW
- Auto-expire PENDING after 1 hour
- Admin can retry stock decrement from Reports (action button)
- Webhook idempotency via stored Stripe event.id
- When user returns before webhook: show processing toast + poll status

## Technical Decisions
- Checkout model: Stripe-hosted Checkout page
- Payment types: one-time only
- Webhook handling: REQUIRED (updates order/transaction state)
- Key storage: .env
- Out-of-scope: refunds, saved cards
- Payment status flow + stock timing: decrement stock only after webhook confirmation
- Test strategy: manual QA only (no automated tests)
- Insufficient stock handling: do NOT decrement; set payment status to REQUIRES_REVIEW
- Pending cleanup: auto-expire after 1 hour
- Admin remediation: add action to retry stock decrement (mark PAID or keep REQUIRES_REVIEW)
- Idempotency: store Stripe event.id and ignore duplicates
- Return UX: processing toast + poll payment status until terminal state

## Research Findings
- prisma/schema.prisma: Transaction + TransactionItem models; PaymentMethod enum (CASH, TRANSFER, QRIS); TransactionStatus enum (COMPLETED, CANCELLED)
- app/api/transactions/route.ts: checkout creates Transaction/TransactionItem + decrements stock in Prisma $transaction
- app/pos/page.tsx: POS UI posts to /api/transactions; payment method selector hardcoded
- stores/cartStore.ts: Zustand cart with localStorage persistence
- app/api/admin/dashboard + app/api/reports/sales: reporting uses Transaction data
- next-auth configured (Credentials provider + role claims)
- No Stripe SDK installed; no testing framework/configs/CI present

## Open Questions
(none)

## Scope Boundaries
- INCLUDE: Stripe sandbox integration for POS checkout; webhook-driven payment status updates
- EXCLUDE: refunds, saved cards
