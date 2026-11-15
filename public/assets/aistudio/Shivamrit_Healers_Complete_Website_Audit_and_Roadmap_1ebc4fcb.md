# Shivamrit Healers — Complete Website Feature Audit & Development Roadmap

**Project:** Shivamrit Healers — E-commerce, Healing & Wellness Platform  
**Audit date:** 14 November 2026  
**Document type:** Consolidated feature audit, gap analysis, security review, implementation priorities, cloud-deployment roadmap, and Claude Code prompt  
**Status:** Preliminary static GitHub code audit; live end-to-end tests and deployment configuration verification are still pending.

## 1. Project Overview & Non-Negotiable Rules

The objective is to enhance the **existing Shivamrit Healers** website into a modern, secure, operational **e-commerce + consultation booking + workshop registration** platform. Use the MantraShakti site **only as a reference for functional features and user flows**.

**Preserve:** Shivamrit Healers name, logo, colors/identity, existing products, product categories, product images, approved service descriptions, and working UI unless a change is explicitly approved.

**Do not copy:** Reference website's name, branding, proprietary code, images, product catalog, categories, marketing text, pricing or any business-specific content.

**Workflow:** Audit first -> approve scope -> implement in a new Git branch, module by module -> test -> deploy to staging -> verify -> production rollout. Do not overwrite the existing live store without a backup and rollback plan.

### Project links

- **Reference website:** https://mantrashaktiorganic.com/
- **Current Shivamrit store:** https://store.shivamrithealers.com/
- **Current source repository (user confirmed):** https://github.com/Vinayak3102/stiore-2
- **Related consultation website (seen among browser tabs; integration must be verified):** https://www.shivamrithealers.com/
- **Other store domain seen among tabs; ownership/relationship must be verified:** https://shop.shivamrithealers.com/
- **Hostinger:** https://hpanel.hostinger.com/
- **Requirements reference archive provided:** `E COMMERCE WEBSITE PROMPT SRSHT.rar` (previously noted as primarily feature screenshots; this document is based on the audit discussion and repository inspection, not on a fresh exhaustive archive extraction).

## 2. What Was Actually Inspected, and Limits

The GitHub repository `Vinayak3102/stiore-2`, branch `main`, was inspected using source listings and selected source files:

- `package.json`, `HOSTINGER_DEPLOY_GUIDE.md`, `.env.example`, `index.html`, `.htaccess`
- `server.ts`, `server.js`, `public/api/create-order.php`, `public/api/verify-payment.php`, `public/api/payment-config.php`
- `src/App.tsx`
- `src/components/AuthModal.tsx`, `CartDrawer.tsx`, `CheckoutModal.tsx`, `SearchModal.tsx`, `ProductDetailModal.tsx`, `ChakraQuizModal.tsx`
- `src/utils/authStorage.ts`, `src/utils/storeLogic.ts`, `src/utils/razorpay.test.ts`
- `src/data/storeProducts.ts` and repository file tree

**Verification caveat:** Presence of UI/code does not establish that the feature works in production. The public store was not reliably accessible to the audit environment for comprehensive interaction testing. Hostinger production behavior, payment status, shipment notifications, security, performance and APIs must be confirmed with staging tests. Features marked “Missing” mean their complete operational implementation was not found in the reviewed repository, not that no other external system exists.

## 3. Existing Technology Stack & Architecture

| Area | Found in repository | Notes |
| --- | --- | --- |
| Frontend | React 19 + TypeScript + Vite 8 | Shopping UI mainly in `src/App.tsx` |
| Styling/UI | Tailwind CSS, icon library, motion | Responsive design present |
| Backend | Express (`server.ts` / `server.js`) | Razorpay endpoints plus SPA delivery |
| Alternative backend | PHP under `public/api/` | Duplicates some payment functionality |
| Payment | Razorpay integration | Requires immediate security hardening |
| Data | Local product arrays in `src/data/` | Not a server-managed product catalog |
| Authentication | `localStorage` account/password handling | **Unsafe for real accounts** |
| Hosting | Hostinger deployment guide, `.htaccess` | Shared/cloud hosting and Node strategies both documented; actual deployment needs verification |
| Testing | A few logic/payment algorithm tests | No evidence of full integration or end-to-end testing |

**Architectural decision needed:** Choose one production backend path—Node/Express or PHP—based on the actual Hostinger plan, and avoid parallel payment implementations. A managed relational database (e.g. Supabase PostgreSQL) is a possible fit; validate requirements and hosting before committing to a vendor.

## 4. Existing Website Features Found in Code

These features have implementation or visible UI code, but many need backend integration:

1. Premium branded homepage and banners.
2. Product catalogue with Shivamrit products, zodiac bracelets, crystals, botanicals and sacred accessories.
3. Zodiac and category navigation, with some filters.
4. Product search modal (`SearchModal.tsx`).
5. Product quick view / detail presentation.
6. Product detail descriptions, prices, stock indicators, ratings/review counts in static product data.
7. Shopping cart drawer and quantity updates.
8. Cart and wishlist browser-local persistence (`localStorage`).
9. Wishlist UI.
10. Checkout interface with contact and shipping fields.
11. Razorpay checkout initiation, backend order creation and signature verification endpoints.
12. Cash-on-delivery selection and confirmation UI.
13. Fixed coupon handling, shipping calculation and free-shipping progress UI.
14. Login, register, profile and saved courier-address UI.
15. FAQ accordion.
16. Chakra / energy-oriented guided product quiz UI.
17. Newsletter subscription UI (not yet a real subscription service).
18. Contact, about and social-media links.
19. Responsive/mobile navigation.
20. Basic index-page metadata and Hostinger deployment configuration.

**Important:** Certain content is currently placeholder-like: cart defaults to an item on first visit; wishlist may start pre-filled; homepage reviews are identified as illustrative samples; the newsletter currently displays success without persisting subscription data.

## 5. Reference Website Features & Shivamrit Adaptation

The reference website was examined for feature ideas, not content replication. Features noted in the earlier audit include:

| Reference functional pattern | Shivamrit-specific application |
| --- | --- |
| Product search | Search Shivamrit's own products with suggestions |
| Category browsing | Zodiac, stones, crystals, bracelets and current Shivamrit categories |
| Product listing and sorting | Price, relevance, availability and category sorting |
| Discounted pricing | Controlled sales, coupons and bundles |
| Account registration/login | Secure customer identity and saved preferences |
| Social sign-in option | Google login if supported and approved |
| Wishlist and saved addresses | Cloud-synced account wishlist and shipping addresses |
| Order tracking form | Order ID + contact verification to view shipment status |
| Choose-your-own bundle flow | Personalized combinations of existing Shivamrit products |
| Secure payment | Proper Razorpay server-side order/payment lifecycle |
| Blog / informational content | Original articles about Reiki, crystals, meditation and spiritual well-being |
| Newsletter subscription | Real email consent, signup and unsubscribe flows |
| Customer ratings/reviews | Verified purchase review collection and moderation |
| Policies and contact | Clear shipping, returns, refunds, privacy, terms, support details |
| Mobile-friendly app-like experience | Fast responsive web checkout; PWA optional later |

Reference-site behavior can change; exact third-party features require a fresh live check before implementation.

## 6. Feature-by-Feature Gap Analysis

**Legend:** Present = code/UI found; Partial = functional part exists but needs reliable backend or improved UX; Missing/Not found = full implementation not found in reviewed code; Critical = must fix before accepting real production data/money.

| # | Feature | Audit status | Required action | Priority |
| --- | --- | --- | --- | --- |
| 1 | Premium homepage | Present | Retain branding; optimize UX/performance | P2 |
| 2 | Product catalogue and category navigation | Present | Connect to managed database | P1 |
| 3 | Product search | Present | Add scalable search, suggestions, relevance | P2 |
| 4 | Filters and sorting | Partial | Price, category, stone, availability, sort controls | P2 |
| 5 | Quick view/product detail | Present | Unique shareable product URLs and schema | P2 |
| 6 | Cart | Partial | Server-validated products, stock, price, totals | P0 |
| 7 | Wishlist | Partial | Customer-account sync | P2 |
| 8 | Customer authentication | **Critical** | Replace browser-local password storage with managed auth | **P0** |
| 9 | Google login / OTP login | Missing | Optional verified sign-in methods | P2 |
| 10 | Customer dashboard | Partial | Orders, addresses, profile, favorites | P1 |
| 11 | Saved addresses | Partial | Persist securely per authenticated user | P1 |
| 12 | Razorpay integration | **Critical** | Rotate exposed keys, secure backend, order verification/webhooks | **P0** |
| 13 | Cash on delivery | **Critical** | Create real persisted COD order and admin workflow | **P0** |
| 14 | Order database | Missing | Durable orders and order-item records | **P0** |
| 15 | Inventory | Partial | Database stock, atomic reserve/deduct, admin updates | P1 |
| 16 | Coupon engine | Partial | Admin-controlled rules validated server-side | P1 |
| 17 | Shipping calculation | Partial | Address/pincode/rate rules validated server-side | P1 |
| 18 | Order tracking | Missing | Secure tracking page and courier status sync | P1 |
| 19 | Courier integration | Missing | Shipment creation, tracking identifiers and updates | P1 |
| 20 | Order invoices | Missing | Receipt/invoice generation + download/email | P1 |
| 21 | Returns/refunds | Missing | Policy, request and refund processing | P1 |
| 22 | Admin dashboard | Missing | Roles, products, orders, customers, inventory | P1 |
| 23 | Product CRUD | Missing | Add/edit/archive products without code deployment | P1 |
| 24 | Verified customer reviews | Partial | Replace illustrative examples with real moderated reviews | P2 |
| 25 | Newsletter | Partial | Store subscriptions and capture consent | P2 |
| 26 | Blog/SEO articles | Missing | CMS and original educational content | P2 |
| 27 | SEO product pages | Partial | Distinct URLs, metadata, canonical, sitemap, structured data | P2 |
| 28 | WhatsApp notifications | Missing | Opt-in order/booking messages via approved integration | P2 |
| 29 | Email notifications | Missing | Order, account and booking email templates/queue | P1 |
| 30 | Abandoned cart recovery | Missing | Consent-aware reminders and suppression logic | P3 |
| 31 | Analytics and conversions | Missing | Analytics, funnels and reporting | P2 |
| 32 | Consultation booking in store | Not found | Integrate existing consultation site if desired | P2 |
| 33 | Workshop registration | Missing in store | Availability, registrations, fees and attendance | P2 |
| 34 | Custom bundle builder | Partial | Dynamic product selection, price and stock rules | P2 |
| 35 | Backup/restore | Unverified | Backups, recovery tests, staging rollback | **P0** |
| 36 | Automated QA/security checks | Partial | E2E, integration, payment and access tests | **P0** |

## 7. Confirmed High-Risk Issues From Code

### 7.1 Passwords and accounts are stored in the browser

**Source:** `src/utils/authStorage.ts`

- Registration and login use `localStorage`-backed account records.
- Passwords are stored directly in the stored account object and compared directly at login.
- Password checks allow a very short minimum length.
- This is not suitable for live customer identity or account security.

**Required:** Replace with a secure authentication service or server-side auth with appropriately protected credentials, email/phone verification and secure session handling. Migrate responsibly; do **not** collect or transmit existing plaintext stored passwords for a migration.

### 7.2 Hardcoded Razorpay credentials and inconsistent selection logic

**Sources:** `server.ts`, `server.js`, `public/api/create-order.php`, `public/api/verify-payment.php`, `public/api/payment-config.php`

- Razorpay **test** credentials are embedded directly in source files that are part of a public repository.
- The credential-selection logic can fall back to, or force, test credentials even with live configuration.
- Multiple backend implementations complicate consistent security and deployment.

**Required:** Immediately rotate any exposed keys/secrets in Razorpay, remove hardcoded credentials from code and tests, put secrets only in secure server-side environment settings, and ensure production never silently falls back to test credentials. Validate changes in test mode first, then live mode.

**Security note:** This report intentionally does **not** reproduce exposed credential values.

### 7.3 Client-provided amount used by payment backend

**Sources:** `src/components/CheckoutModal.tsx`, `server.ts`, PHP order-creation endpoint

- Checkout calculates totals in the browser and posts an amount to `/api/create-order`.
- Server endpoints check basic validity/minimum but do not independently calculate the price from trusted product data, quantities, allowed coupon and shipping rules.

**Required:** Create a pending order server-side from trusted product IDs and quantities, compute final price on server, save it, and initiate Razorpay using that amount. Make payment status updates idempotent and verify provider webhooks.

### 7.4 Payment success and COD confirmation lack durable order handling

**Source:** `src/components/CheckoutModal.tsx` and reviewed backend files

- UI moves to confirmation after signature verification; a persistent store order ledger was not found.
- COD confirmation generates a local identifier rather than clearly creating a persistent backend order.
- Confirmation text claims a notification was dispatched, but no corresponding reliable delivery integration was found.

**Required:** Save every order, payment attempt, status transition, COD selection, shipment and cancellation. Send notifications only after durable and verified status changes.

### 7.5 Demo data and customer trust

**Sources:** `src/App.tsx`, `src/data/storeProducts.ts`

- New visitor's cart can start pre-populated and wishlist can default to items.
- Reviews on the homepage contain illustrative/sample statements.
- Product ratings, review counts and inventory quantities are local static values.
- Newsletter shows success messaging without a real subscription backend.

**Required:** Start real users with an empty cart, show wishlist items only when actually saved, use genuine and appropriately labeled reviews, synchronize actual stock, and implement real newsletter signups. Avoid representing a sample as independently verified customer feedback.

### 7.6 Other code quality and consistency findings

- Coupons are handled in more than one way (fixed `SHIVAMRIT10` in checkout and other codes in `src/utils/storeLogic.ts`), risking inconsistent totals.
- Two product models/catalogue files (`src/data/products.ts` and `src/data/storeProducts.ts`) should be reconciled or intentionally separated.
- Large `src/App.tsx` and checkout components can be modularized for testing and maintenance.
- A hardcoded INR-to-USD conversion factor is inappropriate for live international settlement. Use a trusted exchange-rate service or stay INR-only until properly supported.
- Marketing claims about specific healing effects should be reviewed so they do not promise proven medical outcomes.
- **Live verification needed:** current deployment environment, real Razorpay mode, CORS, HTTPS configuration, operational endpoint behavior, email delivery, SEO status, performance and accessibility.

## 8. Recommended Shivamrit Modules

### A. E-commerce

- Products, categories, variants, price, stock, item gallery and care instructions.
- Search with autocomplete; filters and sorting.
- Cart, wishlist, coupons, secure checkout, saved addresses.
- Track Order, invoices, shipping updates, cancellation and returns.
- Personalized healing bundles using **only Shivamrit products**.

### B. Services and consultation booking

- Reiki Healing, Crystal Healing, Astrology Solutions, Akashic Record Reading and Tarot Card Reading.
- Service detail pages, practitioner information, booking calendar, slots, online payment and confirmations.
- Cancel/reschedule rules, timezone handling, reminders and booking history.
- Integrate with the existing Shivamrit consultation website where appropriate instead of duplicating flows.

### C. Workshops and masterclasses

- Upcoming events, description, date/time, fee, seat limit and registration.
- Payment confirmation, session joining details, automated reminders and attendance status.
- Admin event management and participant lists.

### D. Admin dashboard

- Role-based access control: admin/staff/support as required.
- Product catalogue and inventory management.
- Customer and order management; payment reconciliation.
- Shipping, refunds, coupon campaigns, reviews, content management.
- Reports: sales, orders, abandoned checkout, booking conversion and product trends.

### E. Marketing/community

- Genuine reviews, FAQ, original educational articles.
- Email and WhatsApp with opt-in/consent, unsubscribe and delivery monitoring.
- Lead forms, booking enquiry capture, analytics, SEO and conversion tracking.
- Abandoned cart recovery **after** stable orders/identity and consent mechanisms exist.

## 9. Prioritized Development Plan

**P0 — Must finish before production commerce is trusted**

1. Create protected backup and rollback plan; use development/staging branch.
2. Remove/rotate exposed payment credentials and disable unsafe fallback behavior.
3. Replace plaintext browser-local authentication.
4. Establish trusted persistent database and server-side order creation.
5. Validate prices, discounts, shipping and stock on server.
6. Harden Razorpay verification and webhook processing with idempotency.
7. Persist COD orders properly.
8. Establish core tests, access permissions, logs, and failure handling.

**P1 — Core operational store**

1. Admin dashboard and product/category CRUD.
2. Live inventory and order status management.
3. Customer profiles, addresses and order history.
4. Invoice generation, shipping integration, order tracking.
5. Refund/return/cancel workflows.
6. Standardized coupons and reliable order/transaction emails.

**P2 — Better UX, Shivamrit specialization and growth**

1. Better search/filter/sort, product-specific URLs and SEO.
2. Verified reviews; newsletter and blog publishing.
3. Bundle builder and personalized gifting.
4. Consultation and workshop systems (integrate or share data with existing services).
5. Analytics, WhatsApp notifications with consent and optimization.

**P3 — Optional advanced features**

1. Abandoned-cart recovery, segmented campaigns and lifecycle marketing.
2. Loyalty, referral, rewards, PWA and advanced recommendations if supported by actual business demand.

## 10. Cloud Development & Deployment Roadmap

### Phase 1 — Audit and baseline

- Confirm repo and exact deployed commit.
- Determine hosting mode (Hostinger shared PHP vs Node application/VPS).
- Inventory domains, DNS, SSL, current routes, production integrations and database.
- Collect existing products/categories as immutable migration baseline.
- Create a staging domain, branch, automated backup and rollback plan.

### Phase 2 — Security and architecture

- Rotate exposed payment secrets.
- Choose one payment backend.
- Configure secret environment variables for staging and production.
- Implement authentication, authorization, server validation, rate limiting and audit logs.

### Phase 3 — Database

Proposed entities (to be adjusted to actual app):

`users`, `profiles`, `addresses`, `product_categories`, `products`, `product_variants`, `product_images`, `inventory_movements`, `carts`, `cart_items`, `orders`, `order_items`, `payments`, `payment_events`, `coupons`, `coupon_redemptions`, `shipments`, `order_status_history`, `refunds`, `reviews`, `newsletter_subscribers`, `services`, `practitioners`, `appointment_slots`, `bookings`, `workshops`, `workshop_registrations`, `admin_audit_logs`.

Apply row-level/record-level access rules and database constraints. Protect personally identifiable customer information and payment records.

### Phase 4 — Secure shopping and payments

- Connect catalogue, cart, inventory and checkout to backend.
- Persist pending order *before* payment.
- Create Razorpay order server-side using trusted totals.
- Verify callbacks and webhooks; handle retries and duplicate events safely.
- Commit verified payment state; reconcile failed, paid, refunded and COD orders.

### Phase 5 — Admin and fulfillment

- Products/inventory and role-based dashboard.
- Shipping, tracking, invoices, refunds and order support.
- Email templates and outbox/queue for reliable delivery.

### Phase 6 — Services and content

- Service booking and workshop registration modules.
- Content/SEO, reviews, policies and help/support pages.

### Phase 7 — Marketing automation

- Analytics, opt-in WhatsApp integration, newsletters and follow-up campaigns.
- Only use legitimate consent-based communications; honor unsubscribe requests.

### Phase 8 — QA, launch and maintenance

- Unit tests, API/integration tests, E2E checkout tests and security audit.
- Staging payment tests for success/failure/timeout/duplicate webhook/COD cases.
- Mobile/browser/accessibility/performance checks.
- Backup-restore drill, migration rehearsal and production launch plan.
- Monitor logs, payment reconciliation, delivery failures and conversion metrics.

## 11. Core Acceptance Criteria

- Account passwords are **never stored in browser localStorage as plaintext**.
- Users cannot view/change another customer's orders or addresses.
- Users cannot lower payable amount by modifying frontend requests.
- Each payment is linked to a unique persisted store order; webhook retries do not create duplicate fulfillments.
- A COD order exists in the database before showing order confirmation.
- Each stock deduction is consistent; no overselling beyond explicitly approved policy.
- Inventory, price and coupon changes are controlled from admin.
- Customers can sign in, view past orders and check real tracking updates.
- Invoices and communication are generated from confirmed data.
- No fabricated verified reviews or false “sent” notifications.
- Existing Shivamrit logo, categories, content and products remain intact.
- Test/build/audit checks pass before production deployment; backups and rollback are verified.

## 12. Claude Code Master Prompt (Ready to Copy)

```text
Act as a senior full-stack e-commerce architect and security engineer.

PROJECT: Shivamrit Healers
REPOSITORY: https://github.com/Vinayak3102/stiore-2
LIVE STORE: https://store.shivamrithealers.com/
REFERENCE: https://mantrashaktiorganic.com/

GOAL:
Upgrade the existing Shivamrit Healers store into a secure, production-ready e-commerce and wellness-service platform.

STRICT REQUIREMENTS:
1. Preserve all existing Shivamrit Healers products, categories, brand name, original logo and visual identity.
2. Analyze the reference website ONLY for functional features and workflows. Never copy its name, branding, products, images, text or proprietary code.
3. Audit the existing repository before writing code. Mark features Available, Partial, Missing, or Critical.
4. Fix insecure localStorage authentication. Migrate to secure server-side authentication without exposing or recovering user plaintext passwords.
5. Remove hardcoded Razorpay secrets and rotate exposed credentials. Use environment variables and validated, server-calculated order amounts.
6. Use a single production payment backend appropriate to the actual Hostinger deployment.
7. Design a relational database for products, categories, variants, inventory, users, addresses, carts, orders, order items, payments, coupons, shipping, returns, bookings and workshops.
8. Add durable order creation, payment webhook processing, idempotency, reliable status transitions and server-side stock checks.
9. Make COD orders persistent and manageable.
10. Add secure admin roles and a comprehensive dashboard for products, orders, inventory, customers, coupons and reports.
11. Add searchable/filterable products, wishlist sync, order history, tracking, invoices, returns and refunds.
12. Replace illustrative reviews, hardcoded claims and demo-only confirmations with verified actual data and appropriate empty states.
13. Integrate newsletter, consent-based WhatsApp and email notifications, and abandoned-cart workflows.
14. Add blog SEO, product-specific pages, metadata, sitemap, schema markup, analytics and performance improvements.
15. Add consultation scheduling and workshops as separate modules, reusing existing Shivamrit services rather than duplicating them.
16. Keep working UI and responsive branding consistent, changing only what is necessary.
17. Add automated tests for critical backend and frontend journeys.
18. Create a staging deployment, backup strategy, rollback process and Hostinger deployment guide.

WORKING METHOD:
First produce an evidence-based feature audit, security risk register, architecture proposal, database schema, implementation phases, file-by-file changes and acceptance criteria.
Do not edit code until the plan is approved.
Then implement one phase at a time in a separate Git branch, run checks and tests, and report changes before deployment.
Never publish real secrets or claim tests passed when they have not been run.
```

## 13. Phase 1 — Suggested Claude Code Implementation Prompt

```text
Use repository https://github.com/Vinayak3102/stiore-2.

Do not deploy or change production. Work in a new branch named `audit/security-foundation` after checking repository status and getting approval to modify files.

FIRST, produce:
1. Inventory of routes, state, APIs, database and deployment assumptions.
2. Specific file/line references for high-risk issues in authentication, pricing, Razorpay, COD and demo confirmations.
3. Proposed architecture (one server backend, managed DB, auth).
4. Data migration strategy preserving all products, categories and branding.
5. Secret rotation and staging setup checklist (do not show secrets).
6. A staged implementation plan with tests and rollback criteria.

WAIT for explicit approval before applying changes.

AFTER approval: remove hardcoded payment credentials, disable unsafe fallback, add secure configuration validation, begin DB-auth foundation, and implement reliable test coverage. Never print secret values.
```

## 14. Questions to Confirm Before Development

1. Is `Vinayak3102/stiore-2` the exact repository powering the live `store.shivamrithealers.com` domain (same deployed branch/commit)?
2. Is Hostinger running a Node.js application or PHP on shared hosting? Which backend actually receives `/api/` requests?
3. Is there already a database or CRM outside the repository? If yes, which one?
4. Is the primary store India-only (INR) or international too?
5. Should `www.shivamrithealers.com` consultation booking remain separate or share login/admin with the store?
6. What are the current courier service and verified shipping/refund policies?
7. Which official product categories, descriptions, prices and images are locked and must never be changed?

## 15. Recommended Immediate Next Step

**Do not redesign the homepage yet.** First finish **Security → Database → Authentication → Trusted Checkout → Saved Orders**. Only then implement full admin, fulfillment, tracking and marketing automations. Keep the existing brand, categories, products, and the functional UI while upgrading the underlying systems.

---

*Document created from the Shivamrit Healers website comparison/audit discussion and the inspected GitHub source. No repository files, live-site configuration, payment credentials or Hostinger deployment were modified by creation of this document.*
