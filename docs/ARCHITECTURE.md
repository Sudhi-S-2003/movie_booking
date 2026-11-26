# Platform architecture & refactor report

A multi-service SaaS platform with a reseller hierarchy. Every capability (authentication, chat, chatbots, code share, link share, support desk, image generation, URL preview, messaging integrations, movie booking, social) is a **service** in one catalog. Accounts enable services, pay for usage from a wallet (prepaid) or on invoice (postpaid), and can resell services to their own customers.

## 1. Stack (unchanged, by design)

| Layer | Technology |
|---|---|
| API | Node 24, Express 5, TypeScript (strict, `exactOptionalPropertyTypes`), Zod |
| Data | MongoDB 7 **replica set** (transactions required), Mongoose 9 |
| Realtime / jobs | Socket.io, BullMQ + Redis (worker process) |
| Client | React 19, Vite 8, React Router 7, TanStack Query, Zustand, Tailwind 4 |

No new runtime dependencies were added. Tests use Node's built-in `node:test` via the existing `tsx`.

## 2. Roles, hierarchy and protection

| Role | Scope |
|---|---|
| `super_admin` | The platform owner. **Protected**, **unlimited wallet**, wildcard permission (includes permissions added later). Created only by the startup bootstrap from `SUPER_ADMIN_EMAIL`. |
| `admin` | Platform staff. Platform-wide, but never over other staff or protected accounts. |
| `reseller` | Manages only its own subtree (customers and, if granted `resellers.create_sub`, sub-resellers). |
| `user` | End customer. |

* Every account has `parentId` and a materialized `ancestors` path (root first). Subtree checks are one indexed query.
* Platform-direct customers (`parentId: null`) are the super admin's customers.
* Permissions: role defaults (`modules/access/access.constants.ts`) plus per-account grants. Reserved permissions (`wallet.mint`, `wallet.adjust`, `pricing.manage`, `services.manage`, `billing.manage`, `staff.manage`, `platform.settings`) can't be granted, so a compromised admin can't escalate.
* **Protection is enforced in two layers.**
  1. Service layer: `canManageUser` refuses protected targets, self-management and out-of-scope targets.
  2. Data layer: hooks on the User model reject changes to protected accounts' role, status, hierarchy, permissions or email, and reject deleting them or creating a super admin, unless the code runs inside `runAsSystem()`. Only the bootstrap calls it. The same applies to `BillingAccount.isUnlimited`.
  3. The bootstrap re-asserts protection on every start, so a manual DB edit is undone on restart.
  4. MongoDB has no row-level triggers; a DB user with direct write access can still bypass hooks. Restrict DB credentials accordingly.

## 3. Service catalog and entitlements (`modules/catalog`)

* `catalog.registry.ts` is the code-level list of services. It is synced into the `services` collection at startup (insert-only, so admin edits are never overwritten).
* Each entitlement row stores two flags:
  * `allowed`: granted by the account's reseller or by staff.
  * `enabled`: the account owner's own switch.
* Access rule (`resolveAccess`):
  * The service must be active.
  * The account must be active.
  * **Every reseller above the account** must be allowed the service, so revoking it from a reseller cuts off its whole subtree.
  * The account itself must be allowed and enabled.
  * Platform-direct accounts get self-serve services implicitly.
* Routes are gated by `requireService(key, { writesOnly, allowAnonymous })` at mount time in `app.ts`. Movie and social browsing stay public; their actions are gated.
* Adding a service:
  1. Add a registry entry.
  2. Mount its routes behind `requireService`.
  3. Call `chargeUsage`/`meterOrReject` where usage is billable.

## 4. Billing engine (`modules/billing`)

Money is stored as **integer micros** (₹1 = 1,000,000), so the ledger never has float drift. All writes run in MongoDB transactions.

**Pricing hierarchy** (per unit, `pricing.service.ts`):

```
Base price B                         (staff, services.manage + pricing.manage)
Reseller price  = B + staff markup   (staff, pricing.reseller_markup)
Sub-reseller    = parent price + parent's customer markup
Customer price  = reseller price + reseller's customer markup (pricing.customer_markup)
```

* Markups can be a percent (basis points) or a fixed amount per unit.
* They can apply to one service or all services (`*`), and to one customer or as the reseller's default.
* The most specific rule wins.

**Charging** (`charge.service.ts`):

| Mode | Behaviour |
|---|---|
| Prepaid | The customer price is debited **before** the request is processed, guarded by an atomic `$gte` on the balance (no overdraft under concurrency). Each reseller's markup is credited to its wallet in the same transaction. |
| Postpaid | Nothing is debited. The charge accrues to `unbilled` against an atomic credit-limit guard. Reseller markups are tracked as `pendingEarnings`. |
| Unlimited (super admin) | Recorded at base price; never blocked or debited. |

* Every charge has an **idempotency key** (unique index), so retries never double-charge.
* `UsageRecord` stores the full breakdown: base price, unit price, per-hop markups, platform amount, total, amount debited, mode and status.

**Postpaid cycle** (`invoice.service.ts`):

* The worker closes due cycles hourly. Staff can also trigger a run (`POST /api/billing/cycles/run`), and managers can invoice one account early.
* An invoice moves the amount from `unbilled` to `outstanding`.
* Payment methods:
  * `wallet`: the customer pays from its own balance.
  * `provider`: the customer's reseller collected the money and pays everything except its own margin.
  * `offline`: staff record an external payment, with a reference.
* Paying settles the pending reseller earnings into their wallets.

**Wallet operations**:

* Transfer: reseller to a managed customer; both legs are in one transaction.
* Top-up: super admin, after funds are received.
* Adjustment: super admin, with a reason.
* Freeze or unfreeze an account.
* Every balance change writes exactly one immutable `LedgerEntry`, and every privileged action writes an immutable `AuditLog` entry.

## 5. Authentication (the Auth service)

* Platform login is the platform's own auth: password, TOTP 2FA with backup codes, passkeys, server-side sessions and refresh rotation.
* "Authentication" is also listed in the catalog as a sellable service.
* Changes:
  * Self-registration can never set a role.
  * An optional `resellerCode` (`/register?ref=code`) attaches the new account to a reseller.
  * Suspended or closed accounts are rejected at login, refresh, passkey login and on every authenticated request. Suspending an account revokes its sessions and sockets.
  * 2FA-pending temp tokens can't be used as access tokens.
  * Passkeys now require user verification (biometric/PIN), so a passkey counts as multi-factor.

> **Not built yet:** Auth API endpoints that resellers can call for their own end users (captcha, TOTP and passkey as an API). The catalog entry and billing hooks exist; the HTTP surface is the next step.

## 6. Folder structure

```
server/src/
  core/http/          errors (typed ApiError factories), asyncHandler, zod parse, response helpers
  db/                 systemContext (protected writes), transaction helper
  modules/
    access/           roles → permissions, canManageUser, requirePermission
    accounts/         self-service, user management, reseller applications (schemas/service/controller/routes)
    audit/            append-only audit log
    auth/             auth schemas
    billing/          models, pricing, charge, wallet, invoices, reports, meter, routes
    catalog/          service registry, entitlements, requireService
    movies/           seat pricing, theatre ownership
    platform/         super admin bootstrap
    support/          ticket access (guest tokens)
  controllers/ routes/ services/ models/   existing service modules (being migrated into modules/)
  utils/              safeFetch (SSRF-safe), safeRegex, signature (HMAC), object helpers
server/test/          integration tests (real MongoDB replica set)

client/src/
  features/           platform features: account, admin, billing, customers, pricing, services, platform (shared UI/hooks/nav)
  providers/          BillingProvider + context
  services/api/       single axios client + platform.api.ts
  types/platform.ts   shared platform types
  utils/money.ts      micros ↔ display
```

New platform code is feature-modular. The older service modules (chat, chatbot, code share, movies, social) still use the flat `controllers/ routes/ services/` layout and should move into `modules/<service>/` one at a time.

## 7. Audit findings fixed in this pass

| Severity | Issue | Fix |
|---|---|---|
| Critical | `POST /auth/register` accepted `role` → anyone could self-register as admin | Role never read from input; zod validation; password policy |
| Critical | `JWT_SECRET` defaulted to `'secret'`; all HMACs used it | Startup fails in production without ≥32-char secret; separate `SIGNING_SECRET` for HMACs |
| Critical | Signed links could be minted for **any** resource; read links could update/delete; writes over GET | Ownership check before signing, TTL cap (7d), scope (`read`/`write`) bound into the HMAC, writes POST-only |
| Critical | Any socket could join any conversation/ticket room (live eavesdropping) | Membership / ticket ownership checked on join; typing only to joined rooms |
| Critical | Support tickets readable/listable by anyone; guest "auth" was the ticket id | Access check on every ticket endpoint; HMAC guest token returned once at creation |
| Critical | Captcha answer readable inside the token; reusable for 3 min | Server-stored, single-use challenge with keyed hash |
| Critical | Theatre owners could approve subscription requests (admin API gated by owner role) | Subscription system retired; admin APIs permission-gated |
| Critical | Seat prices and payment amounts taken from the client | Server-side seat pricing from showtime/screen; amount from reservations |
| High | Unauthenticated SSRF in URL preview (internal hosts, metadata IP) | Auth + service gate + SSRF-safe fetcher (private IPs blocked per redirect hop, size/time caps) |
| High | Cross-tenant reads via unscoped `chunkId`/`commitId` in code share | Lookups scoped to the resource |
| High | Telinfy HMAC route shadowed by prefix route → never verified | Exact POST routes, most specific first |
| High | Chatbot mass assignment (re-parent bots/records across tenants); unscoped template/menu/flow lookups | Immutable fields stripped; lookups scoped to bot |
| High | Tenant regexes evaluated on every message (ReDoS) | Guarded regex (length, nested quantifiers, backrefs, input cap) |
| High | Rate limits bypassable via `X-Forwarded-For` and query strings | `trust proxy` hop count; limiter keyed by scope + IP |
| High | Movie catalog editable/deletable by any theatre owner; operators could edit others' screens/showtimes | Catalog permission; ownership checks |
| High | Link share: unauthenticated, unmetered, open redirect (any scheme) | Auth + metering + owner + expiry; http(s) only |
| Medium | Chat read-receipts writable by non-members | Membership check |
| Medium | MessageChunk TTL index invalid → orphaned uploads never expired | Valid partial filter |
| Medium | Notification queue dedupe silently dropped later notifications | Default job ids |
| Medium | Committed API credentials (`api_key_share-1.env`) | Untracked + ignored; purge script prepared (see §9) |
| Medium | Errors leaked internals; inconsistent envelopes | Central error middleware (validation/cast/duplicate/protected → precise codes, generic 500) |
| Medium | Duplicate role→dashboard logic in 7 places; redirect broke public chat/invite/profile routes | Single `dashboardPrefix`; rewritten redirect |
| Medium | Booster tokens credited but never consumed; client-priced boosters | Subscription/booster system replaced by billing engine |

## 8. Tests

`server/test/platform.test.ts` runs 12 integration tests against a real MongoDB replica set:

* Auth: role injection, single-use captcha, password policy.
* Protected super admin: API, data layer, unlimited wallet.
* Subtree scoping and staff isolation.
* Revoking a service from a reseller cuts off its customers.
* Price hierarchy, prepaid debit, reseller earnings, idempotency, insufficient funds.
* Postpaid credit limit, invoice, wallet payment, settlement.
* Transfer scoping.
* Super admin usage is never debited.
* Read-only signed links.

```bash
# from server/, with a replica set reachable at TEST_MONGO_URL (default mongodb://127.0.0.1:27017)
DISABLE_RATE_LIMIT=1 npm test
```

## 9. Remaining work (honest list)

* **Payment gateway:** none is integrated. Wallet top-ups are recorded by the super admin after funds arrive. Movie ticket checkout is still a simulated payment (clearly marked in `payment.controller.ts`). Integrate a gateway with webhook verification before taking real money.
* **Auth-as-a-service API** for resellers' own end users: see §5.
* **Older service modules** still use flat folders, hand-written validation and `res.status(500)` error handling. Migrate them to `modules/` with zod schemas and `asyncHandler`, one at a time.
* **Duplicated frontend code:** `components/chat` and `components/support` are forked copies, and code-share v1/v2 overlap. `codeshare-web/` is an unused Next.js copy of the v1 viewer; confirm before deleting.
* **Client debt:** the client still has pre-existing lint errors in older files, no route-level code splitting, and tokens kept in `localStorage`. Moving to httpOnly cookies needs a CSRF strategy.
* **Old admin pages:** `AdminUsers` (movie-era) remains alongside the new Accounts page; remove it once the new page covers moderation needs.
* **Socket.io:** no Redis adapter yet, which is needed for more than one API instance. Guest support tickets don't get live socket updates (they re-fetch).
* **Leaked key:** rotate it. Then, to purge history, run `scripts/purge-leaked-credentials.sh` after committing, and force-push yourself.

## 10. Deployment checklist

- [ ] Set `JWT_SECRET` and `SIGNING_SECRET` (≥32 random chars each).
- [ ] Set `SUPER_ADMIN_EMAIL` and, for first boot only, `SUPER_ADMIN_PASSWORD`. Change the password after first login.
- [ ] Run MongoDB as a replica set (`docker-compose.yml` does this).
- [ ] Set `TRUST_PROXY_HOPS` to the number of proxies in front of the API.
- [ ] Set `FRONTEND_URL` and `CORS_EXTRA_ORIGINS` for any reseller domains.
- [ ] Run the worker process (it handles notifications and postpaid billing cycles).
- [ ] Rotate the leaked API key; purge history if required.
- [ ] Set base prices and statuses in Pricing → Service catalog before onboarding resellers.
