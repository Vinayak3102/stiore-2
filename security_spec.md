# ShivAmrit Healers — Firestore Security Specification (Isolated AI Studio DB)

## 1. Data Invariants
1. **Identity Isolation**: Users may only read/write their own `/users/{userId}`, `/users/{userId}/private/{docId}`, `/users/{userId}/cart/{itemId}`, and `/users/{userId}/wishlist/{productId}` records when authenticated with a verified email (`request.auth.token.email_verified == true`).
2. **PII Separation**: Mobile number, email, and saved courier addresses reside exclusively in `/users/{userId}/private/info` and are readable/writable only by the owner (`userId == request.auth.uid`) or verified admin.
3. **Privilege Escalation Guard**: No customer can self-assign admin roles in `/admins/{userId}` or inject `role`/`isAdmin` fields into `/users/{userId}`.
4. **Server-Authoritative Commerce**: Orders (`/orders/{orderId}`), order line items (`/orders/{orderId}/items/{itemId}`), coupons (`/coupons/{couponCode}`), products (`/products/{productId}`), and workshops (`/workshops/{workshopId}`) cannot have prices, discounts, totals, or payment statuses forged or tampered with from client SDKs.
5. **Booking & Registration Ownership**: Customers can only list and read their own `/bookings/{bookingId}` and `/workshopRegistrations/{registrationId}` (enforced via `resource.data.userId == request.auth.uid` on `allow list` and `allow get`), never another customer's records.
6. **Admin Audit Integrity**: `/adminAuditLogs/{logId}` is readable only by verified admins and immutable after creation.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Cross-user PII Read**: User B attempts `get(/users/userA/private/info)`.
2. **Blanket User List Scraping**: User B attempts `list(/users)` or `list(/orders)` without matching `userId`.
3. **Self-Admin Escalation**: Authenticated non-admin attempts `setDoc(/admins/myUid, { role: 'super_admin' })`.
4. **Shadow Field Injection on Profile**: User A creates `/users/userA/private/info` with extra key `isAdmin: true`.
5. **Unverified Email Write**: Authenticated user with `email_verified: false` attempts write to `/reviews/{id}` or `/users/{uid}/private/info`.
6. **Spoofed Admin Email without Verification**: User with `email: 'vinayakacdemy@gmail.com'` and `email_verified: false` attempts `write(/products/aries-bracelet)`.
7. **ID Poisoning**: Client writes document with 500-character ID or slashes/dots in path parameter.
8. **Client Price Tampering**: Customer attempts `updateDoc(/orders/ord_1, { grandTotal: 1, paymentStatus: 'paid' })`.
9. **Client Product Price Manipulation**: Non-admin attempts `updateDoc(/products/amethyst-bracelet, { price: 1 })`.
10. **Fake Verified Review**: Customer attempts `createDoc(/reviews/rev_1, { verifiedPurchase: true, approved: true })`.
11. **Terminal Order Mutation**: User attempts to alter an existing `/orders/{orderId}` after creation.
12. **Unbounded String / Payload DoS**: Client submits 50KB string in `customerName` or `comment`.
