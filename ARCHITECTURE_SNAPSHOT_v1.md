# OG Gainz Web Application — Architecture Snapshot (v1)

**Document intent**

- This file is a *single source of truth* snapshot of the current codebase.
- It is intentionally conservative: if something is not verified in code, it is marked **PARTIAL** or **FUTURE**.
- API paths below are shown as they are mounted in the server: everything is under `/api/*`.

**Status legend**

- **IMPLEMENTED**: End-to-end present in code (routes + controllers + UI where applicable).
- **PARTIAL**: Some pieces exist, but the full intended workflow is not complete.
- **FUTURE**: Stubbed/TODO or not wired.

---

## 1) High-level Architecture

OG Gainz is a split frontend + backend application:

- **Client**: React + TypeScript + Vite, Tailwind + shadcn/ui.
- **Server**: Node.js + Express API.
- **Database**: MongoDB (Mongoose).
- **Payments**: Razorpay checkout + webhook verification.

At runtime:

1. The client authenticates via `/api/auth/*` and stores the OG Gainz JWT.
2. The client calls the API using a small service layer (`Client/src/services/*`).
3. The backend is the pricing + business-logic authority (cart quoting, checkout totals, delivery fee/serviceability).

---

## 2) Repository Layout

- `Client/` — frontend application
  - `Client/src/pages/*` — routes/screens (user + admin)
  - `Client/src/services/*` — API calls + small client-side orchestration
  - `Client/src/context/*` — auth/user/wallet/cart state
- `Server/` — Express API
  - `Server/src/routes/*` — route modules mounted under `/api`
  - `Server/src/controllers/*` — request handlers (business logic)
  - `Server/src/models/*` — Mongoose schemas
  - `Server/src/middlewares/*` — auth/admin/blocked/error handling

---

## 3) Environment Configuration

### 3.1 Server env (`Server/src/config/env.config.js`)

**Required (fail-fast):**

- `SERVER_PORT` (legacy: `PORT`)
- `CLIENT_ORIGIN` (legacy: `CLIENT_URL`)
- `MONGO_URI` (legacy: `MONGODB_URI`)
- `JWT_SECRET`
- `JWT_EXPIRES_IN` (defaults to `7d`)

**Optional (feature-gated):**

- Google auth (ID-token flow): `GOOGLE_CLIENT_ID`
- Cloudinary uploads: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Razorpay checkout: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- Razorpay webhook verification: `RAZORPAY_WEBHOOK_SECRET`
- Delivery rules: `MAX_DELIVERY_DISTANCE_KM`, `BASE_DELIVERY_FEE`, `DELIVERY_FEE_PER_KM`
- Pause/skip rules: `SKIP_REQUEST_CUTOFF_HHMM`, `PAUSE_REQUEST_CUTOFF_HOURS`

**Present but not active in current code paths:**

- Redis config keys exist, but Redis connection/config is **FUTURE**.
- Stripe keys exist in env config, but Stripe integration is **FUTURE**.

### 3.2 Client env

Verified client env usage includes:

- `VITE_API_BASE_URL` (API base, e.g. `http://localhost:5000/api`)
- `VITE_USE_MOCKS` (kept for fallback; many screens now use real APIs)
- `VITE_GOOGLE_CLIENT_ID` (Google sign-in UI)
- `VITE_SUPPORT_WHATSAPP_NUMBER` (WhatsApp support CTA)

---

## 4) Authentication, Roles, and Access Control

### 4.1 Auth model (IMPLEMENTED)

- JWT-based auth.
- User identity is email-based, with optional Google sign-in.

API:

- `POST /api/auth/login` — creates/loads user by email, issues JWT
- `POST /api/auth/signup` — alias of login behavior
- `POST /api/auth/google` — verifies Google `idToken`, upserts user, issues JWT
- `GET /api/auth/verify` — verifies JWT and returns current user

### 4.2 Roles (IMPLEMENTED)

- `User.role` is server-controlled: `'user' | 'admin'`.
- Admin endpoints are gated by `auth.middleware.js` + `admin.middleware.js`.

### 4.3 Blocked users (IMPLEMENTED)

- `User.isBlocked` is a soft-block.
- Middleware `blocked.middleware.js` prevents blocked users from initiating:
  - `/api/checkout/*`
  - subscription/purchase creation flows under `/api/commerce/*` and `/api/commerce/build-your-own/*`

---

## 5) Backend API Modules

### 5.1 Public catalog (IMPLEMENTED)

- `GET /api/meals` and `GET /api/meals/:slug`
- `GET /api/addons`

### 5.2 Admin catalog CRUD + images (IMPLEMENTED)

Mounted under `/api/admin/*` (auth + admin required):

- Meals: CRUD + single image + multi-image management
- Add-ons: CRUD + single image + multi-image management
- Build-your-own: item types, items, config
- Meal types, included items, add-on categories

Image upload uses `multer` memory storage and Cloudinary config (feature-gated by Cloudinary env vars).

### 5.3 Cart quoting (IMPLEMENTED)

- `POST /api/cart/quote`

Behavior (server-authoritative):

- Accepts a mixed cart (`meal`, `addon`, `byo`) with a `plan` (`single`, `trial`, `weekly`, `monthly`).
- Validates items and calculates totals on the server.
- Computes delivery distance + fee (if coordinates provided).
- Enforces some plan rules (e.g., trial checks are performed only when the user is authenticated).

### 5.4 Checkout (Razorpay) (IMPLEMENTED)

- `POST /api/checkout/initiate` (auth + not-blocked)
- `POST /api/checkout/retry` (auth + not-blocked)

Checkout creates an `Order` in `pending_payment`, then creates a Razorpay order.

### 5.5 Payments webhook (Razorpay) (IMPLEMENTED)

- `POST /api/webhooks/razorpay`

Key properties:

- Raw body is captured in `Server/src/app.js` specifically for webhook signature verification.
- Webhook verifies signature using `RAZORPAY_WEBHOOK_SECRET` (fallback to Razorpay key secret exists but is not recommended).
- On payment success:
  - sets `paymentStatus: 'PAID'`
  - sets `status: 'PAID'`
  - sets `currentStatus: 'PAID'`
  - sets `acceptanceStatus: 'PENDING_REVIEW'`
- On payment failure:
  - sets `paymentStatus: 'FAILED'` and records failure reason

### 5.6 Orders (user) (IMPLEMENTED)

- `GET /api/orders` (auth)
- `GET /api/orders/:orderId` (auth)

### 5.7 Admin orders lifecycle (IMPLEMENTED)

Mounted under `/api/admin/orders`:

- list orders
- view order details (also sets `adminSeenAt`)
- update acceptance: `PENDING_REVIEW | CONFIRMED | DECLINED` (admins can set only CONFIRMED/DECLINED)
- move-to-kitchen (creates daily deliveries; idempotent via unique indexes)
- update lifecycle status: `PAID → CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED` (forward-only)
- update admin notes

### 5.8 Deliveries (IMPLEMENTED)

User delivery timeline:

- `GET /api/deliveries/my?from=YYYY-MM-DD&to=YYYY-MM-DD` (auth; max range < 31 days)

Delivery quoting:

- `POST /api/deliveries/quote`
- `GET /api/deliveries/fee?distanceKm=...`

Admin delivery APIs:

- `GET /api/admin/deliveries`
- `GET /api/admin/deliveries/:deliveryId`
- `PATCH /api/admin/deliveries/:deliveryId/status`

Kitchen execution:

- `GET /api/admin/kitchen/deliveries` (filters by date/status/user)
- `PATCH /api/admin/kitchen/deliveries/:deliveryId/status`

### 5.9 Commerce (subscriptions + BYO) (IMPLEMENTED)

Mounted under `/api/commerce`.

Custom meal components (canonical list):

- `GET /api/commerce/custom-meal-components` (public)

Custom meal subscriptions:

- `GET /api/commerce/custom-meal-subscriptions` (auth)
- `POST /api/commerce/custom-meal-subscriptions` (auth + not-blocked)
- `PATCH /api/commerce/custom-meal-subscriptions/:id/status` (auth)

Add-on subscriptions:

- `GET /api/commerce/addon-subscriptions` (auth)
- `POST /api/commerce/addon-subscriptions` (auth + not-blocked)
- `PATCH /api/commerce/addon-subscriptions/:id/status` (auth)

Add-on purchases:

- `GET /api/commerce/addon-purchases` (auth)
- `POST /api/commerce/addon-purchases` (auth + not-blocked)

Build-your-own (backend-driven catalog + quote):

- `GET /api/commerce/build-your-own/item-types`
- `GET /api/commerce/build-your-own/items`
- `GET /api/commerce/build-your-own/config`
- `POST /api/commerce/build-your-own/quote`
- `POST /api/commerce/build-your-own/subscriptions` (auth + not-blocked)
- `POST /api/commerce/build-your-own/purchases` (auth + not-blocked)

### 5.10 Pause / Skip requests (IMPLEMENTED)

User requests under `/api/subscriptions`:

- `GET /api/subscriptions/requests`
- `POST /api/subscriptions/pause-requests`
- `POST /api/subscriptions/skip-requests`
- `POST /api/subscriptions/requests/:requestId/withdraw`

Admin approvals under `/api/admin/pause-skip`:

- `GET /api/admin/pause-skip/requests`
- `PATCH /api/admin/pause-skip/requests/:requestId`

Behavior:

- Skip requests are allowed only for *today’s* delivery, only while `status === 'PENDING'`, and only before a cutoff time (`SKIP_REQUEST_CUTOFF_HHMM`, default `06:00`).
- Approved skip sets `DailyDelivery.status = 'SKIPPED'` and appends `statusHistory`.
- Approved pause updates the relevant subscription pause window and may set `status: 'paused'` if the pause window includes today.

### 5.11 Consultations (IMPLEMENTED)

User:

- `POST /api/consultations` (auth) — submit consultation request

Admin:

- `GET /api/admin/consultations` (filters: status/unread/read/archived)
- `GET /api/admin/consultations/unread-count`
- `GET /api/admin/consultations/:id`
- `PATCH /api/admin/consultations/:id/read`
- `PATCH /api/admin/consultations/:id/archive`
- `PATCH /api/admin/consultations/:id/unarchive`

### 5.12 Admin dashboard aggregation (IMPLEMENTED)

- `GET /api/admin/dashboard`

Returns aggregate stats (orders/users/subscriptions, revenue windows, pending consultations) plus a small “recent consultations” list.

### 5.13 Admin user management (IMPLEMENTED)

Mounted under `/api/admin/users`:

- list users (filters include blocked/active)
- get user details
- list user subscriptions
- pause/resume all subscriptions for a user
- list user orders
- get user wallet snapshot
- get user deliveries summary
- block/unblock user

### 5.14 Modules mounted but not implemented

- Wallet routes (`/api/wallet`) — **FUTURE** (file contains TODO)
- Notifications routes (`/api/notifications`) — **FUTURE** (file contains TODO)
- Locations routes (`/api/locations`) — **FUTURE** (file contains TODO)
- Reports (`/api/reports`) — **FUTURE** (admin-protected stub)

---

## 6) Data Model Snapshot (MongoDB / Mongoose)

This is a practical “what matters for the running app” view.

### 6.1 User (IMPLEMENTED)

- `email`, `name`, `provider`, `role`
- `addresses[]` (with recipient/contact fields)
- `walletBalance` (number; used in `/users/me` and admin wallet snapshot)
- `isBlocked`, `blockedAt`, `blockedBy`

### 6.2 Order (IMPLEMENTED)

- `items[]` (type: meal/addon/byo; plan: single/trial/weekly/monthly)
- `subtotal`, `deliveryFee`, `creditsApplied`, `total`
- `paymentStatus` (`PAID`/`FAILED`), `paymentAttempts[]` (retry)
- `acceptanceStatus` (`PENDING_REVIEW`/`CONFIRMED`/`DECLINED`)
- `currentStatus` lifecycle: `PAID → CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED`
- `movedToKitchenAt` gate (prevents changing acceptance after kitchen move)

### 6.3 DailyDelivery (IMPLEMENTED)

- `date` (YYYY-MM-DD), `time` (string)
- `deliveryDate`/`deliveryTime` (canonical fields)
- `items[]` (links back to the source order + cart item)
- `status` + `statusHistory[]` (changedBy: SYSTEM/ADMIN/KITCHEN)
- De-dupe keys: `(sourceOrderId, date, sourceCartItemId)` unique

### 6.4 Commerce subscriptions (IMPLEMENTED)

- `CustomMealSubscription` (selections + totals, pause window)
- `AddonSubscription` (addonId + servings + price, pause window)

### 6.5 Pause/Skip workflow log (IMPLEMENTED)

- `PauseSkipLog` stores PAUSE/SKIP requests with status + admin decision metadata.

### 6.6 Consultations (IMPLEMENTED)

- `Consultation` stores lead data and admin read/archive states.

### 6.7 Wallet models/routes (PARTIAL/FUTURE)

- Wallet-related models exist in `Server/src/models`, but `/api/wallet` routes are currently TODO.
- `walletBalance` is currently surfaced via `GET /api/users/me` and admin user wallet snapshot.

---

## 7) Key Workflows (Text Diagrams)

### 7.1 Login

1. Client calls `/api/auth/login` or `/api/auth/google`.
2. Server issues JWT `{ userId, role }`.
3. Client stores token and calls `/api/auth/verify` as a “source of truth” refresh.

### 7.2 Checkout → Payment → Fulfillment

1. Client calls `/api/cart/quote` (optional) for live totals.
2. Client calls `/api/checkout/initiate` with items + schedule + address.
3. Server creates `Order(status='pending_payment')` and a Razorpay order.
4. Razorpay webhook `/api/webhooks/razorpay` marks the app order paid/failed.
5. Admin reviews order (`acceptanceStatus`) and confirms.
6. Admin clicks “Move to kitchen” → server creates `DailyDelivery` documents.
7. Kitchen updates delivery status as it progresses.
8. User sees deliveries in `/api/deliveries/my` and orders in `/api/orders`.

### 7.3 Pause/Skip

1. User submits pause/skip request under `/api/subscriptions/*`.
2. Admin reviews/approves under `/api/admin/pause-skip/*`.
3. Approved pause updates subscription pause window/status.
4. Approved skip marks the day’s `DailyDelivery` as `SKIPPED`.

---

## 8) Client Architecture Notes

### 8.1 Routing

- User pages are under normal routes (`/dashboard`, `/checkout`, etc.).
- Admin pages are under `/admin/*` and are wrapped by a client-side `RequireAdmin` guard.

### 8.2 API client and services

- API access is centralized in `Client/src/services/apiClient.ts`.
- Services are small modules per domain (`adminUsersService`, `consultationService`, etc.).
- Some dashboards use “best-effort” parallel fetching with partial-failure warnings.

### 8.3 Dashboard refresh pattern (IMPLEMENTED)

- After key mutations, the client dispatches a browser event `og:dashboard-refresh`.
- The dashboard listens and refetches without a full reload.
- No websockets are used (polling/refresh is event-driven + manual).

---

## 9) Delivery Phases (Current Reality)

This is a lightweight mapping of the repository’s “phase” terminology to what exists today.

- Phase 1 (Foundation/env/app boot): **IMPLEMENTED**
- Phase 2 (JWT auth + admin protection): **IMPLEMENTED**
- Phase 2B (Google ID-token auth): **IMPLEMENTED**
- Phase 3 (Meals/Add-ons admin + public catalog): **IMPLEMENTED**
- Phase 4 (Commerce + BYO): **IMPLEMENTED**
- Phase 5 (Checkout + Razorpay webhook + orders): **IMPLEMENTED**
- Phase 6 (Admin order lifecycle + deliveries + kitchen ops): **IMPLEMENTED**
- Phase 7 (Pause/Skip approvals): **IMPLEMENTED**

Notable gaps still exist (see below).

---

## 10) Known Gaps / Roadmap Flags

**FUTURE**

- `/api/wallet` user-facing wallet routes (currently TODO)
- `/api/notifications` routes (currently TODO)
- `/api/locations` routes (currently TODO)
- `/api/reports` (currently a protected stub)
- Redis connection/caching (config files exist, but not wired)
- Stripe integration (env keys exist, but not wired)
1️⃣ CLIENT ARCHITECTURE

## Phase 1 (Foundation)

### Environment Strategy

- Backend config is env-driven via `Server/src/config/env.config.js`.
- Required backend env vars (fail fast if missing):
	- `NODE_ENV` (defaults to `development`)
	- `SERVER_PORT`
	- `CLIENT_ORIGIN` (example: `http://localhost:8080`)
	- `MONGO_URI`
	- `JWT_SECRET`
- Legacy compatibility supported (temporary):
	- `PORT` -> `SERVER_PORT`
	- `CLIENT_URL` -> `CLIENT_ORIGIN`
	- `MONGODB_URI` -> `MONGO_URI`

Frontend env (Phase 1 preparation):

- `VITE_API_BASE_URL` (expected: `http://localhost:5000/api`)
- `VITE_USE_MOCKS` (expected: `true`)

### Role Model Decision

- Server-authoritative user role model: `role: 'user' | 'admin'`.
- Default role is `user`.
- Client user type includes `role?: 'user' | 'admin'` (optional until real auth is live).

### Auth/Admin Skeleton Scope

- `/api/auth/login` and `/api/auth/verify` exist as controller stubs returning `501 Not Implemented` (Phase 2 will implement real auth).
- `auth.middleware.js` reads placeholder identity from request headers in development only (Phase 1 convenience; Phase 2 will replace with JWT verification).
- `admin.middleware.js` enforces `req.user.role === 'admin'` when used (not applied across routes in Phase 1).

### What Phase 1 Does NOT Include

- No real authentication (no Google OAuth/JWT issuance/verification).
- No business features: meals, cart, checkout, subscriptions, payments, delivery rules.
- No removal of mock-mode behavior in the frontend.

## Phase 2 (Authentication + Admin Security)

### Auth Strategy

- JWT-based authentication.
- No Google OAuth yet; Phase 2 uses email-based identity (`{ email }` or `{ email, name }`).
- JWT secret is provided via backend env (`JWT_SECRET`).
- Token expiry is required (`JWT_EXPIRES_IN`).

### Backend JWT Flow

- `POST /api/auth/login`
	- Accepts `{ email, name? }`.
	- Creates user if not exists (default role `user`).
	- Issues JWT payload `{ userId, role }`.
	- Returns `{ token, user }`.
- `GET /api/auth/verify`
	- Requires `Authorization: Bearer <token>`.
	- Validates JWT and returns authenticated user.

### Role Enforcement

- `auth.middleware.js`
	- Validates JWT from `Authorization` header.
	- Loads user from DB and attaches `req.user = { id, role }`.
- `admin.middleware.js`
	- Enforces `req.user.role === 'admin'`.

### Admin Security

- Admin middleware is applied to:
	- `/api/admin/*`
	- `/api/reports/*`

Frontend (Phase 2):

- Stores JWT in localStorage (acceptable for now).
- Attaches JWT automatically from `apiClient.ts`.
- Hides admin navigation when role is not `admin` (UX only; routes not blocked yet).

### What Phase 2 Does NOT Include

- No meals/cart/checkout/subscriptions/payments logic.
- No pricing/delivery/wallet logic.
- No removal of non-auth mock services.
- No Google OAuth.

## Phase 2B (Google OAuth)

### Goal

- Integrate Google Sign-In as an identity provider.
- Backend still issues OG GAINZ JWT; Google tokens are never used to call APIs.

### Required Environment

Backend (fail-fast required):

- `GOOGLE_CLIENT_ID`

Note:

- Phase 2B uses Google **ID-token flow** (as provided by `@react-oauth/google`).
- OAuth redirect/code flow is intentionally not implemented in Phase 2B.
- `GOOGLE_CLIENT_SECRET` and `GOOGLE_OAUTH_REDIRECT_URI` are not required for Phase 2B.

Frontend:

- `VITE_GOOGLE_CLIENT_ID`

### Flow (Text Diagram)

1. User clicks “Continue with Google” on Login page.
2. Frontend receives Google `idToken` (credential) from Google Identity Services.
3. Frontend calls `POST /api/auth/google` with `{ idToken }`.
4. Backend verifies `idToken` via Google SDK (audience = `GOOGLE_CLIENT_ID`).
5. Backend finds/creates user by email (default role = `user`, provider = `google`).
6. Backend issues OG GAINZ JWT `{ userId, role }` and returns `{ token, user }`.
7. Frontend stores OG GAINZ JWT (existing token storage), then uses `/api/auth/verify` as the source of truth.

### Security Rules

- Backend is authoritative for `role` (never trust role from Google or client).
- Frontend never stores or reuses Google token beyond the `/auth/google` exchange.
- `/api/auth/verify` always reloads the user from DB.
- Invalid/expired Google tokens are rejected.

### Explicit Non-Goals

- No business logic changes (meals/cart/subscriptions/checkout/payments).
- No Google access token usage.
- No role assignment UI.


## Phase 3 (Meals & Add-Ons) — Completed

### Scope

- Backend is the single source of truth for Meals & Add-ons when `VITE_USE_MOCKS=false`.
- Admin CRUD + image upload are implemented and protected by existing `auth.middleware.js` + `admin.middleware.js` (no auth/role changes).
- User-facing pages consume real APIs (mock fallback remains behind `VITE_USE_MOCKS=true`).

### Backend APIs (public)

Meals:

- `GET /api/meals` (active only, pagination-ready)
- `GET /api/meals/:slug` (active only)

Add-ons:

- `GET /api/addons` (active only, pagination-ready)
- `GET /api/addons?category=` (active only)

Rules:

- Public catalog endpoints only return `isActive=true` items.
- Uses `.lean()` + projection to avoid over-fetching.
- Pagination meta returned as `{ page, limit, total, hasNextPage }`.

### Backend APIs (admin)

Meals:

- `GET /api/admin/meals`
- `POST /api/admin/meals`
- `PUT /api/admin/meals/:id`
- `DELETE /api/admin/meals/:id` (soft delete → `isActive=false`, `deletedAt`)
- `POST /api/admin/meals/:id/image` (multipart upload)

Add-ons:

- `GET /api/admin/addons`
- `POST /api/admin/addons`
- `PUT /api/admin/addons/:id`
- `DELETE /api/admin/addons/:id` (soft delete)
- `POST /api/admin/addons/:id/image`

### Media (Cloudinary) flow

- Server-only Cloudinary configuration: `Server/src/config/cloudinary.config.js`
- Upload endpoints accept `multipart/form-data` (`image` field) using memory storage.
- Upload replaces existing image safely:
	- Upload new image to Cloudinary
	- Save `{ url, publicId }` on the document
	- Best-effort delete previous `publicId`

Required backend env vars (fail-fast):

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### Frontend responsibilities (Phase 3)

User:

- Meals list + details are backend-driven via `Client/src/services/mealsCatalogService.ts`.
- Add-ons page is backend-driven via `Client/src/services/addonsCatalogService.ts`.
- Category grouping is done in the frontend (not the backend).
- No cart/checkout/subscription logic on Meals/Add-ons pages.

Admin:

- Admin Meals + Add-ons screens integrate with:
	- `Client/src/services/adminMealsService.ts`
	- `Client/src/services/adminAddonsService.ts`
- Image upload UX:
	- Drag & drop + browse
	- Client-side validation (type + size)
	- Preview + progress bar
	- Multipart upload to server only (no Cloudinary secrets in client)

### Performance strategies

Backend:

- `.lean()` queries for list endpoints
- Field projection to avoid over-fetching
- Indexed lookups on key fields (slug/category/isActive/isFeatured)

Frontend:

- Axios-based API layer with timeout + GET retry + in-memory caching + AbortController support (`Client/src/services/apiClient.ts`)
- Skeleton loaders (no spinners) + lazy-loaded images
- Memoized meal cards (`React.memo`) and derived lists (`useMemo`)
- Debounced search on admin catalog pages

### Explicit Non-Goals (Phase 3)

- No cart, checkout, subscriptions, wallet, delivery, or payments implementation.
- No auth/role changes.




2️⃣ SERVER ARCHITECTURE

Server/
├── node_modules/
├── src/
│   ├── cache/
│   │   ├── cacheGet.js
│   │   ├── cacheSet.js
│   │   └── redisKeys.js
│   ├── config/
│   │   ├── constants.config.js
│   │   ├── db.config.js
│   │   ├── env.config.js
│   │   ├── googleOAuth.config.js
│   │   └── redis.config.js
│   ├── controllers/
│   │   ├── addon.controller.js
│   │   ├── admin.controller.js
│   │   ├── auth.controller.js
│   │   ├── cart.controller.js
│   │   ├── checkout.controller.js
│   │   ├── consultation.controller.js
│   │   ├── delivery.controller.js
│   │   ├── location.controller.js
│   │   ├── meal.controller.js
│   │   ├── notification.controller.js
│   │   ├── report.controller.js
│   │   ├── subscription.controller.js
│   │   ├── user.controller.js
│   │   └── wallet.controller.js
│   ├── docs/
│   │   ├── api-contracts.md
│   │   ├── architecture.md
│   │   ├── db-schema.md
│   │   └── redis-strategy.md
│   ├── jobs/
│   │   ├── deliveryScheduler.job.js
│   │   ├── email.job.js
│   │   ├── export.job.js
│   │   └── subscriptionExpiry.job.js
│   ├── middlewares/
│   │   ├── admin.middleware.js
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   ├── rateLimit.middleware.js
│   │   └── validate.middleware.js
│   ├── models/
│   │   ├── Addon.model.js
│   │   ├── AdminActionLog.model.js
│   │   ├── AdminLog.model.js
│   │   ├── AuditLog.model.js
│   │   ├── Cart.model.js
│   │   ├── Consultation.model.js
│   │   ├── CustomMealComponent.model.js
│   │   ├── Delivery.model.js
│   │   ├── DeliveryStatusLog.model.js
│   │   ├── EmailTemplate.model.js
│   │   ├── MealPack.model.js
│   │   ├── Notification.model.js
│   │   ├── NotificationLog.model.js
│   │   ├── Order.model.js
│   │   ├── PauseSkipLog.model.js
│   │   ├── Payment.model.js
│   │   ├── Subscription.model.js
│   │   ├── SubscriptionServing.model.js
│   │   ├── User.model.js
│   │   ├── UserAddress.model.js
│   │   ├── UserProfile.model.js
│   │   ├── Wallet.model.js
│   │   └── WalletTransaction.model.js
│   ├── routes/
│   │   ├── addon.routes.js
│   │   ├── admin.routes.js
│   │   ├── auth.routes.js
│   │   ├── cart.routes.js
│   │   ├── checkout.routes.js
│   │   ├── consultation.routes.js
│   │   ├── delivery.routes.js
│   │   ├── index.routes.js
│   │   ├── location.routes.js
│   │   ├── meal.routes.js
│   │   ├── notification.routes.js
│   │   ├── report.routes.js
│   │   ├── subscription.routes.js
│   │   ├── user.routes.js
│   │   └── wallet.routes.js
│   ├── services/
│   │   ├── admin.service.js
│   │   ├── auth.service.js
│   │   ├── delivery.service.js
│   │   ├── location.service.js
│   │   ├── notification.service.js
│   │   ├── payment.service.js
│   │   ├── pricing.service.js
│   │   ├── report.service.js
│   │   ├── subscription.service.js
│   │   └── wallet.service.js
│   ├── tests/
│   │   ├── integration/
│   │   │   └── .gitkeep
│   │   ├── load/
│   │   │   └── .gitkeep
│   │   ├── unit/
│   │   │   └── .gitkeep
│   │   └── .gitkeep
│   ├── utils/
│   │   ├── apiResponse.js
│   │   ├── constants.js
│   │   ├── date.util.js
│   │   ├── distance.util.js
│   │   ├── jwt.util.js
│   │   ├── logger.util.js
│   │   ├── validation.util.js
│   │   └── validators.js
│   ├── app.js
│   └── server.js
├── .gitignore
├── package.json
└── package-lock.json



