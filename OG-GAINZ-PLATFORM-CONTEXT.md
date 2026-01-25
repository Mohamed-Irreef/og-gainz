📘 OG GAINZ – COMPLETE PLATFORM CONTEXT
1. PLATFORM OVERVIEW

OG Gainz is a high-protein meal subscription platform focused on fitness, fat loss, and muscle gain.

The platform allows users to:

Subscribe to protein-focused meal plans

Customize meals and add-ons

Build their own meals

Manage subscriptions daily (pause, skip)

Receive daily deliveries

Use wallet credits instead of cash refunds

The system is designed for:

5,000+ concurrent users

High reliability

Clear business rules

Transparent subscriptions

2. USER TYPES
A. End Users (Customers)

Sign in using Google OAuth only

Purchase subscriptions

Manage daily meal delivery

Use wallet credits

Request pause/skip

B. Admin Users

Manage meals, users, subscriptions

Control deliveries

Approve pause/skip

Issue wallet credits

View analytics and reports

3. HIGH-LEVEL USER FLOW
Landing Page
→ Google Login
→ Meal Pack Selection
→ Add-ons / Customization / Build Meal
→ Location Validation
→ Consultation (if required)
→ Cart
→ Payment
→ Subscriptions Created
→ User Dashboard
→ Daily Meal Delivery Tracking

4. CORE BUSINESS CONCEPTS (VERY IMPORTANT)
4.1 Subscription-Centric System

Every meal pack = a separate subscription

Cart is only a payment convenience

One payment can create multiple subscriptions

4.2 Meal Packs

Types:

Signature (~35g protein)

Elite (~40g protein)

Royal (~50g protein)

Trial Packs (limited duration)

Each pack has:

Weekly & Monthly pricing

Trial availability

Customization rules

Add-on eligibility

4.3 Add-Ons

Two types:

One-time purchase

Add-on subscription (weekly/monthly/trial)

Rules:

Add-ons may attach to main subscriptions

Add-on subscriptions are tracked independently

4.4 Build Your Own Meal

Users select:

Protein

Carbs

Sides

Rules:

Price calculated dynamically

Protein count displayed

Minimum order enforced:

₹1,000/week

₹3,000/month

5. LOCATION & DELIVERY RULES

Auto-detect user location

Distance calculated from kitchen

Rules:

≤ 5 km → Free delivery

5 km → ₹10/km

Max radius → 10 km

Beyond 10 km:

User must go through consultation

Ordering blocked

6. WALLET & CREDIT SYSTEM (STRICT RULES)

1 INR = 1 Credit

No cash refunds

Refunds issued as wallet credits only

Credits usable for:

Meal packs

Add-ons

Subscriptions

Credits:

Signup bonus

Refund credits

Admin-issued credits

7. CART RULES (CRITICAL)

Multiple items allowed:

Meal packs

Add-ons

Build-your-own meals

Add-on subscriptions

Rules:

Each item becomes its own subscription

Delivery fee charged once

Credits optionally applied

Backend validates everything

8. PAYMENT SYSTEM

UPI-based payments

Payment confirmation handled by backend

Idempotency enforced

Frontend never assumes success

On success:

Subscriptions created

Wallet credits deducted

Confirmation email sent

9. SUBSCRIPTION LIFECYCLE

Each subscription tracks:

Start date

End date

Total servings

Served count

Remaining servings

Statuses:

Active

Paused

Skipped (daily)

Completed

Cancelled

10. DAILY DELIVERY SYSTEM

Daily delivery statuses:

Cooking

Sent from kitchen

Delivered successfully

Skipped (User/Admin)

Rules:

Serving count decremented only when delivered

Skipped or paused days do NOT consume servings

11. PAUSE & SKIP LOGIC
Skip Meal

Available until cutoff time

Can be user-initiated or admin-initiated

Serving not deducted

Pause Subscription

User submits pause request

Admin approves

Pause start/end date with time

Subscription end date auto-extended

Audit logs required for all actions.

12. USER DASHBOARD FEATURES

User can see:

Active subscriptions

Daily delivery status

Subscription calendar (delivered / skipped / paused)

Payment history

Wallet balance & transactions

User actions:

Skip today’s meal

Request pause

Contact support

13. ADMIN PANEL – CORE CAPABILITIES

Admin can manage:

Users (ban/unban)

Meal packs (CRUD)

Add-ons & components

Subscriptions

Deliveries

Payments & refunds

Wallet credits

Consultation leads

Email templates

Reports & exports

Admin dashboard shows:

User growth

Active subscriptions

Revenue

Deliveries

14. REPORTING & EXPORTS

Every major module supports:

Excel export (data)

PDF/DOC export (reports)

Exports are:

Async

Job-based

Non-blocking

15. EMAIL & NOTIFICATION SYSTEM

Automated emails:

Signup confirmation

Order confirmation

Subscription activation

Delivery updates

Subscription completion

Refund credit notification

Admin can:

Edit templates

Enable/disable emails

16. SECURITY & RELIABILITY PRINCIPLES

Google OAuth only (no passwords)

JWT-based authentication

Admin-protected routes

Rate limiting

Audit logging

Soft deletes

Redis caching

MongoDB indexing

17. NON-FUNCTIONAL REQUIREMENTS

Scalable to 5,000+ users

Mobile-first UI

Fast page load

No blocking operations

Graceful error handling

Clear user feedback

18. FRONTEND DESIGN PRINCIPLES

Clean

Professional

Trustworthy

No clutter

Subtle animations only

Fitness & nutrition focused

Color theme (strict):

#004030 (40%)

#4A9782 (30%)

#DCD0A8 (20%)

#E9762B (10%)

19. DEVELOPMENT GUIDELINES FOR AI

When generating code:

Follow feature-based folder structure

Use TypeScript strictly

Reusable components only

No hardcoded business rules

Respect API contracts

Avoid overengineering

Prefer clarity over cleverness

20. FINAL INSTRUCTION FOR GITHUB COPILOT

Treat this document as the single source of truth.
All UI, backend, and logic must strictly follow these rules.