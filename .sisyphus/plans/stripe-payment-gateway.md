# Stripe Checkout (Sandbox) for POS

## TL;DR
> **Summary**: Add Stripe-hosted Checkout as a separate POS payment flow with webhook-driven payment state, stock decrement after confirmation, and manual QA. No refunds/saved cards. Pending auto-expires after 1 hour, and REQUIRES_REVIEW can be retried by admin from Reports.
> **Deliverables**: Stripe Checkout session API + webhook, schema updates (PaymentStatus + Stripe fields), POS Stripe flow + return polling, reports admin retry action, env var config, manual QA evidence.
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: Schema update → API routes (checkout + webhook + status) → POS Stripe flow → Reports admin retry → QA

## Context
### Original Request
Add a payment gateway feature using Stripe sandbox; integrate using Stripe keys docs; ask for planning questions.

### Interview Summary
- One-time payments only.
- Stripe-hosted Checkout page.
- Keep existing methods; Stripe as separate flow.
- Webhook updates order state; stock decrement after confirmation.
- Out-of-scope: refunds, saved cards.
- Keys in .env.
- Currency: IDR.
- Create Transaction as PENDING at session creation.
- Payment status modeled separately from TransactionStatus.
- If stock insufficient at webhook: do not decrement; set REQUIRES_REVIEW.
- Pending auto-expire after 1 hour.
- Admin can retry stock decrement from Reports page.
- Webhook idempotency via stored Stripe event.id.
- Return UX: show “processing” toast + poll status until terminal.
- Manual QA only (no automated tests).

### Metis Review (gaps addressed)
- Defined pending cleanup (1h auto-expire).
- Defined webhook idempotency (store event.id).
- Defined REQUIRES_REVIEW remediation (admin retry action).
- Clarified return UX (processing toast + polling).
- Guardrails: no refunds, no stock reservation, no automated tests.

## Work Objectives
### Core Objective
Implement Stripe Checkout sandbox flow for POS: create pending transaction, redirect to Stripe, process webhook to update payment status, decrement stock on success if available, and expose admin retry for REQUIRES_REVIEW.

### Deliverables
- Prisma schema updates for Stripe fields + PaymentStatus enum.
- New API routes: create Stripe checkout session, Stripe webhook handler, payment status polling endpoint, admin retry endpoint.
- POS UI updates: add Stripe checkout button/flow, return handling with polling + toast.
- Reports page/admin data includes paymentStatus + retry action.
- Env var setup guidance for Stripe keys and webhook secret.
- Manual QA evidence files.

### Definition of Done (verifiable conditions with commands)
- Stripe Checkout session can be created from POS, redirects to Stripe, and returns to /pos.
- Webhook updates PaymentStatus to PAID on successful payment; stock decrements only on PAID.
- If stock insufficient at webhook, PaymentStatus becomes REQUIRES_REVIEW and stock remains unchanged.
- Admin can retry stock decrement from Reports and move REQUIRES_REVIEW → PAID when stock available.
- PENDING payments auto-expire after 1 hour (PaymentStatus = EXPIRED).
- Webhook duplicate deliveries do not create duplicate updates (event.id idempotency).
- Manual QA evidence captured per tasks.

### Must Have
- Use Stripe sandbox keys from .env (sk_test_/pk_test_) and webhook secret.
- Keep existing CASH/TRANSFER/QRIS flows untouched.
- Webhook signature verification.
- PaymentStatus separate from TransactionStatus.

### Environment Variables Setup
Add the following entries to your local `.env` file (do not commit):

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Key Details:**
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Publishable key (safe for client-side). Starts with `pk_test_` in sandbox.
- `STRIPE_SECRET_KEY`: Secret key (server-side only). Starts with `sk_test_` in sandbox. Never expose to client.
- `STRIPE_WEBHOOK_SECRET`: Webhook signing secret. Starts with `whsec_`. Used to verify webhook signatures.

Obtain these from your Stripe Dashboard (https://dashboard.stripe.com/apikeys). Use sandbox keys for development. See Stripe keys documentation: https://docs.stripe.com/keys

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No refunds or saved cards.
- No stock reservation on checkout creation.
- No automated test framework setup.
- No new admin dashboard beyond minimal Reports changes.
- No changes to existing offline payment flows.
- No destructive DB changes: do not drop, rename, or overwrite tables; additive-only schema updates.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: **none** (manual QA only)
- QA policy: Every task has agent-executed scenarios
- Evidence: .sisyphus/evidence/task-{N}-{slug}.{ext}

## Execution Strategy
### Parallel Execution Waves
Wave 1 (Schema + Config)
- Task 1: Schema updates for PaymentStatus + Stripe fields + event id storage
- Task 2: Env var expectations + Stripe key docs (context7 reference)

Wave 2 (Backend APIs)
- Task 3: Create checkout session API
- Task 4: Stripe webhook handler with idempotency + stock decrement + REQUIRES_REVIEW
- Task 5: Payment status polling endpoint + PENDING expiry
- Task 6: Admin retry endpoint for REQUIRES_REVIEW

Wave 3 (Frontend + Admin UX)
- Task 7: POS Stripe flow + return handling + polling
- Task 8: Reports page updates + retry action

### Dependency Matrix (full, all tasks)
- Task 1 → blocks 3–8
- Task 2 → informs 3–5
- Task 3 ↔ Task 7 (7 consumes 3)
- Task 4 → blocks 5, 6, 8
- Task 5 → blocks 7
- Task 6 → blocks 8

### Agent Dispatch Summary
- Wave 1: 2 tasks (quick + writing)
- Wave 2: 4 tasks (unspecified-high)
- Wave 3: 2 tasks (visual-engineering + unspecified-high)

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Update Prisma schema for Stripe payment status

  **What to do**: Add `PaymentStatus` enum and new fields to `Transaction` model: `paymentStatus`, `stripeSessionId`, `stripePaymentIntentId`, `stripeEventId` (for idempotency). Keep `TransactionStatus` unchanged. Set `paymentStatus` default to `PENDING`. Ensure migration is additive-only.
  **Must NOT do**: Do not remove or rename existing enums/fields; do not change TransactionStatus enum; do not drop or rename tables.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: confined schema updates
  - Skills: []
  - Omitted: [`refactor`] - not needed

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 3,4,5,6,7,8 | Blocked By: none

  **References**:
  - Schema: `prisma/schema.prisma:39-88` - Transaction model + enums

  **Acceptance Criteria**:
  - [ ] Prisma schema includes PaymentStatus enum with PENDING, PAID, FAILED, REQUIRES_REVIEW, EXPIRED
  - [ ] Transaction model includes paymentStatus default PENDING and Stripe IDs + stripeEventId fields
  - [ ] Generated migration (if any) is additive-only (no DROP/ALTER TABLE to remove/rename)

  **QA Scenarios**:
  ```
  Scenario: Validate Prisma schema compiles
    Tool: Bash
    Steps: prisma validate (or npm run prisma validate if script exists)
    Expected: No schema validation errors
    Evidence: .sisyphus/evidence/task-1-schema-validate.txt

  Scenario: Ensure existing enums unchanged
    Tool: Bash
    Steps: grep schema.prisma for TransactionStatus and PaymentMethod
    Expected: Existing enums still present with original values
    Evidence: .sisyphus/evidence/task-1-enums-check.txt

  Scenario: Migration is additive-only
    Tool: Bash
    Steps: Generate migration SQL and review for DROP/RENAME statements
    Expected: No DROP TABLE / ALTER TABLE ... DROP COLUMN / RENAME operations
    Evidence: .sisyphus/evidence/task-1-migration-review.txt
  ```

  **Commit**: YES | Message: `feat(db): add payment status + stripe fields` | Files: [prisma/schema.prisma]

- [x] 2. Document Stripe env var expectations (plan-only note)

  **What to do**: Add .env entries guidance for `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, aligning with Stripe key docs (context7). Provide a short note in plan for implementer to update local .env (do not commit secrets).
  **Must NOT do**: Do not add actual secrets; do not commit .env changes.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: documentation-style update only
  - Skills: []
  - Omitted: [`refactor`] - not needed

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 3,4,5 | Blocked By: none

  **References**:
  - Stripe keys doc: https://docs.stripe.com/keys
  - Context7: `/websites/stripe` key guidance (publishable vs secret, webhook secret)

  **Acceptance Criteria**:
  - [ ] Plan includes explicit env var names and test key prefixes

  **QA Scenarios**:
  ```
  Scenario: Verify .env guidance present
    Tool: Read
    Steps: Open plan file and confirm env var list exists
    Expected: Contains NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
    Evidence: .sisyphus/evidence/task-2-env-guidance.txt
  ```

  **Commit**: NO | Message: N/A | Files: []

- [x] 3. Create Stripe Checkout session API

  **What to do**: Add API route (e.g., `app/api/stripe/checkout/route.ts`) to create Stripe Checkout Session using server-side `STRIPE_SECRET_KEY`. Create PENDING Transaction + TransactionItems before redirect. Store `stripeSessionId` and `stripePaymentIntentId` (if available). Return session URL to client. Ensure amounts in IDR are passed in smallest unit (IDR is zero-decimal; use integer prices directly).
  **Must NOT do**: Do not decrement stock here; do not mark as PAID; do not expose secret keys to client.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: backend integration with external API
  - Skills: []
  - Omitted: [`refactor`] - not needed

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 7 | Blocked By: 1,2

  **References**:
  - Existing transaction creation: `app/api/transactions/route.ts:7-24`
  - Cart payload: `app/pos/page.tsx:105-125`
  - Prisma schema: `prisma/schema.prisma` (Transaction + TransactionItem)
  - Stripe keys: https://docs.stripe.com/keys

  **Acceptance Criteria**:
  - [ ] POST returns Stripe Checkout URL and creates PENDING transaction with items
  - [ ] PaymentMethod is set to `STRIPE` (add to enum if needed)
  - [ ] No stock change occurs on checkout session creation

  **QA Scenarios**:
  ```
  Scenario: Create Stripe session from POS payload
    Tool: Bash
    Steps: Call API with sample cart payload; verify response includes checkout URL
    Expected: 200 response with url; Transaction created in DB with paymentStatus=PENDING
    Evidence: .sisyphus/evidence/task-3-create-session.txt

  Scenario: Ensure stock unchanged after session create
    Tool: Bash
    Steps: Query product stock before/after API call
    Expected: Stock count unchanged
    Evidence: .sisyphus/evidence/task-3-stock-unchanged.txt
  ```

  **Commit**: YES | Message: `feat(api): create stripe checkout session` | Files: [app/api/stripe/checkout/route.ts, prisma/schema.prisma]

- [x] 4. Implement Stripe webhook handler (idempotent)

  **What to do**: Add webhook route (e.g., `app/api/stripe/webhook/route.ts`). Verify signature with `STRIPE_WEBHOOK_SECRET`. Process `checkout.session.completed` / `payment_intent.succeeded` (choose one and document). On success: if stock sufficient, decrement stock in Prisma $transaction and set paymentStatus=PAID; if insufficient, set REQUIRES_REVIEW and do not decrement. Persist `stripeEventId` and ignore duplicates.
  **Must NOT do**: Do not decrement stock outside DB transaction; do not process same event twice.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: webhook security + transactional logic
  - Skills: []
  - Omitted: [`refactor`]

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 5,6,7,8 | Blocked By: 1,2

  **References**:
  - Prisma transaction pattern: `app/api/transactions/route.ts:13-19`
  - Stripe keys doc: https://docs.stripe.com/keys
  - Schema: `prisma/schema.prisma`

  **Acceptance Criteria**:
  - [ ] Webhook verifies signature and rejects invalid signatures
  - [ ] Duplicate `event.id` does not reprocess (idempotent)
  - [ ] On success with sufficient stock: paymentStatus=PAID and stock decremented
  - [ ] On insufficient stock: paymentStatus=REQUIRES_REVIEW and stock unchanged

  **QA Scenarios**:
  ```
  Scenario: Webhook success with sufficient stock
    Tool: Bash
    Steps: Simulate webhook with event.id; verify transaction status and stock decrement
    Expected: paymentStatus=PAID; stock decremented once
    Evidence: .sisyphus/evidence/task-4-webhook-success.txt

  Scenario: Duplicate webhook delivery
    Tool: Bash
    Steps: Send same event.id twice
    Expected: Second call no-ops; stock unchanged from first call
    Evidence: .sisyphus/evidence/task-4-webhook-duplicate.txt
  ```

  **Commit**: YES | Message: `feat(api): stripe webhook handler` | Files: [app/api/stripe/webhook/route.ts]

- [x] 5. Add payment status polling endpoint + PENDING expiry

  **What to do**: Add GET endpoint (e.g., `/api/transactions/[id]/payment-status`) to return paymentStatus. Add logic to mark PENDING as EXPIRED when older than 1 hour (e.g., in this endpoint or background job on read). Return terminal states to client.
  **Must NOT do**: Do not expire non-pending statuses; do not change TransactionStatus.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: data consistency + time-based logic
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 7 | Blocked By: 1,4

  **References**:
  - Transaction model: `prisma/schema.prisma:39-50`
  - Reports fetch: `app/api/reports/sales/route.ts:6-10`

  **Acceptance Criteria**:
  - [ ] GET returns paymentStatus for transaction
  - [ ] PENDING older than 1h becomes EXPIRED

  **QA Scenarios**:
  ```
  Scenario: Poll payment status
    Tool: Bash
    Steps: Call status endpoint for a PENDING transaction
    Expected: Returns PENDING if <1h old
    Evidence: .sisyphus/evidence/task-5-status-pending.txt

  Scenario: Auto-expire after 1h
    Tool: Bash
    Steps: Set createdAt to >1h past, call status endpoint
    Expected: paymentStatus becomes EXPIRED
    Evidence: .sisyphus/evidence/task-5-expire.txt
  ```

  **Commit**: YES | Message: `feat(api): payment status polling + expiry` | Files: [app/api/transactions/[id]/payment-status/route.ts]

- [x] 6. Add admin retry endpoint for REQUIRES_REVIEW

  **What to do**: Add POST endpoint (e.g., `/api/transactions/[id]/retry-stock`) for ADMIN only. Re-check stock; if sufficient, decrement and mark paymentStatus=PAID. If still insufficient, keep REQUIRES_REVIEW.
  **Must NOT do**: Do not allow non-admins; do not bypass paymentStatus terminal rules.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: auth + transactional DB update
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8 | Blocked By: 1,4

  **References**:
  - Auth pattern: `app/api/transactions/route.ts:7-10`
  - Role check pattern: `app/api/reports/sales/route.ts:6-9`

  **Acceptance Criteria**:
  - [ ] ADMIN can retry; non-admin gets 403
  - [ ] If stock sufficient, paymentStatus=PAID and stock decremented
  - [ ] If stock insufficient, paymentStatus remains REQUIRES_REVIEW

  **QA Scenarios**:
  ```
  Scenario: Admin retry succeeds
    Tool: Bash
    Steps: POST retry with sufficient stock
    Expected: paymentStatus=PAID; stock decremented
    Evidence: .sisyphus/evidence/task-6-retry-success.txt

  Scenario: Admin retry fails
    Tool: Bash
    Steps: POST retry with insufficient stock
    Expected: paymentStatus remains REQUIRES_REVIEW
    Evidence: .sisyphus/evidence/task-6-retry-fail.txt
  ```

  **Commit**: YES | Message: `feat(api): admin retry for review payments` | Files: [app/api/transactions/[id]/retry-stock/route.ts]

- [x] 7. Update POS UI for Stripe checkout + return polling

  **What to do**: Add a separate Stripe button/flow in `app/pos/page.tsx`. When clicked, call checkout session API, redirect to Stripe. On return to /pos, read query param (e.g., `session_id`), show “processing” toast, and poll payment status endpoint until PAID/FAILED/REQUIRES_REVIEW/EXPIRED; then show appropriate toast and clear cart on success only.
  **Must NOT do**: Do not remove existing payment buttons; do not clear cart on failure/pending.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: UI + UX flow changes
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: none | Blocked By: 3,5

  **References**:
  - POS page: `app/pos/page.tsx:105-140` (checkout flow)
  - Cart store: `stores/cartStore.ts:21-46`

  **Acceptance Criteria**:
  - [ ] Stripe flow triggers redirect to Stripe Checkout
  - [ ] On return, POS polls payment status and shows toasts
  - [ ] Cart cleared only when paymentStatus=PAID

  **QA Scenarios**:
  ```
  Scenario: Successful Stripe payment
    Tool: Playwright
    Steps: Add items → click Stripe checkout → complete test payment → return to /pos
    Expected: Success toast; cart cleared; paymentStatus=PAID
    Evidence: .sisyphus/evidence/task-7-stripe-success.png

  Scenario: Payment pending or failed
    Tool: Playwright
    Steps: Start checkout → cancel payment → return to /pos
    Expected: Failure/pending toast; cart remains
    Evidence: .sisyphus/evidence/task-7-stripe-failed.png
  ```

  **Commit**: YES | Message: `feat(ui): stripe checkout flow in POS` | Files: [app/pos/page.tsx]

- [x] 8. Update Reports page to show paymentStatus + retry action

  **What to do**: Extend reports API to include paymentStatus. Update `app/reports/page.tsx` to display paymentStatus badge. Add “Retry Stock” action for REQUIRES_REVIEW rows (ADMIN only) calling retry endpoint and updating UI state.
  **Must NOT do**: Do not change existing report exports format unless adding new column is acceptable; if adding, keep backward compatibility.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: API + UI updates
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: none | Blocked By: 4,6

  **References**:
  - Reports API: `app/api/reports/sales/route.ts:6-10`
  - Reports UI: `app/reports/page.tsx:30-140`

  **Acceptance Criteria**:
  - [ ] Reports API returns paymentStatus
  - [ ] UI shows paymentStatus badge
  - [ ] REQUIRES_REVIEW rows show retry button and update after action

  **QA Scenarios**:
  ```
  Scenario: Retry stock from Reports
    Tool: Playwright
    Steps: Open Reports → locate REQUIRES_REVIEW row → click Retry
    Expected: Status updates to PAID when stock available
    Evidence: .sisyphus/evidence/task-8-retry-ui.png

  Scenario: Reports shows paymentStatus
    Tool: Playwright
    Steps: Open Reports page
    Expected: Payment status column visible with badges
    Evidence: .sisyphus/evidence/task-8-status-column.png
  ```

  **Commit**: YES | Message: `feat(reports): show payment status + retry action` | Files: [app/api/reports/sales/route.ts, app/reports/page.tsx]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commits per task as listed; no commits for env var guidance.
- No secrets committed. Update .env locally only.

## Success Criteria
- Stripe sandbox checkout works end-to-end with webhook updates.
- Stock only decremented after webhook confirmation.
- REQUIRES_REVIEW flow works with admin retry.
- Existing payment methods continue to work unchanged.
- Manual QA evidence captured for all tasks.
