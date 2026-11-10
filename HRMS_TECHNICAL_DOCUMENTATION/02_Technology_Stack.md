# CEGS OS — Complete Technology Stack Audit
**Prepared for:** Career Experts Global Solutions (CEGS)
**Document Version:** 1.0 (Verified from Codebase)
**Audit Date:** November 2026

---

## 1. Stack Summary Overview

CEGS OS is an enterprise web application built on the **Next.js 14 (App Router)** framework with a hybrid TypeScript/JavaScript codebase. It connects to **MongoDB Atlas** via **Mongoose** and is hosted on **Vercel** with a serverless architecture.

```
┌────────────────────────────────────────────────────────┐
│                   FRONTEND LAYER                       │
│  Next.js 14.2.35 (App Router) · React 18 · Lucide-React │
│  Vanilla Modular CSS · Canvas-Confetti · SheetJS (XLSX)│
└───────────────────────────┬────────────────────────────┘
                            │ REST / JSON (HTTP)
┌───────────────────────────▼────────────────────────────┐
│                    BACKEND LAYER                       │
│  Next.js Route Handlers (Node.js Runtime) · JWT Auth    │
│  Zod Schema Validation · PDFKit In-Memory PDF Engine   │
│  Nodemailer (SMTP) · Vercel Cron Engine (IST Schedules)│
└───────────────────────────┬────────────────────────────┘
                            │ Mongoose ODM (v9.9.1)
┌───────────────────────────▼────────────────────────────┐
│                   PERSISTENCE LAYER                    │
│     MongoDB Atlas (Cloud Cluster) · 27 Mongoose Models │
│     Browser LocalStorage (Legacy Fast-Cache Store)     │
└────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Technologies

### 2.1 Core Framework & Language
* **Framework:** Next.js `14.2.35` (App Router)
  * *Where Used:* Entire application lifecycle (`src/app/`, layouts, pages, routing).
  * *Why Used:* Unified React framework providing file-system routing, hybrid static/server rendering, automated code splitting, and zero-config deployment.
* **UI Library:** React `^18.0.0` & React-DOM `^18.0.0`
  * *Where Used:* Component tree rendering across all views.
  * *Pattern:* Almost all interactive view components explicitly use `'use client'` directive to enable rich client-side interactivity, local state management, timers, and modals.
* **Languages:** TypeScript `^6.0.3` and ECMAScript Modern (ES6+ / ES2022).
  * *Where Used:* Hybrid codebase — core auth, database connection, and candidate models use TypeScript (`.ts`); views and layout components use JavaScript/JSX (`.jsx`, `.js`).

### 2.2 Styling & Design System
* **CSS Framework:** Custom Vanilla CSS + Design Tokens (No Tailwind, No Bootstrap, No Sass).
  * *Where Used:* `src/app/globals.css` (1,200+ lines of custom CSS variables, utility classes, and glassmorphic card stylings) and inline CSS style objects in React components.
  * *Color Tokens Defined:*
    * Primary: `#0284c7` (Sky Blue) / `#1E3A8A` (Deep Navy)
    * Dark Backgrounds / Text: `#0F172A`, `#111827`, `#1E293B`
    * Accents: `#10B981` (Emerald Green for Active/Paid), `#F59E0B` (Amber for Pending/Warning), `#EF4444` (Rose/Red for Danger/Late)
    * Surfaces: `#FFFFFF`, `#F8FAFC`, `#F1F5F9`
* **Typography:** Inter (`next/font/google`).

### 2.3 UI Component & Utility Libraries
* **Icons:** `lucide-react` `^1.28.0`
  * *Where Used:* Header, sidebar menus, action tables, modal controls, statuses. Over 40+ distinct icons imported (`Download`, `Plus`, `Search`, `Trash2`, `Edit3`, `Clock`, `Shield`, `Building`, etc.).
  * *Legacy Icon Helper:* `HrmsLegacy.jsx` also contains a lightweight embedded SVG icon helper component `<IC n="..." />` with 50+ SVG paths for legacy screens.
* **Celebration Effects:** `canvas-confetti` `^1.9.4`
  * *Where Used:* Triggered upon employee bonus milestones, recruitment goal achievements, and campaign award wins.
* **Spreadsheet Processing:** `xlsx` (SheetJS) `^0.18.5`
  * *Where Used:* Client-side CSV/XLSX imports and exports across Recruitment Datasheets (`JoinerSheetSection.jsx`, `WalkinsSelectionsSection.jsx`) and Finance Invoice Registers (`FinanceInvoicesView.jsx`).

---

## 3. State Management & Client Storage

* **Global React State:** React Context API (`src/contexts/AppContext.jsx`).
  * *State variables managed:* Current authenticated user (`user`), cached system database snapshot (`db`), quick-view user modal state (`quickViewUser`), targeted direct/group chat states (`chatTargetUser`, `chatTargetGroup`), messenger inbox visibility (`showMessengerInbox`), logout confirmation modal (`showLogoutModal`).
* **Local Component State:** Standard React `useState`, `useReducer`, `useMemo`, `useCallback`, `useRef`.
* **Fast-Cache Store (`Store` in `HrmsLegacy.jsx`):**
  * Custom abstraction wrapping `window.localStorage`.
  * Persists local offline-first copies of `users`, `departments`, `attendance`, `leaves`, `payroll`, `timesheets`, `assets`, `expenses`, `documents`, `notifications`, `settings`, and recruitment batches.
  * Synchronized with MongoDB Atlas on login and during API mutations.

---

## 4. Backend Technologies

### 4.1 Server Runtime & API Layer
* **Runtime:** Node.js (v18.17.0+ required by Next.js 14).
* **API Framework:** Next.js App Router Route Handlers (`route.js` / `route.ts`).
  * *Total Route Handlers:* **72 active API endpoint files** under `src/app/api/`.
  * *HTTP Standards:* Uses native Web API `Request`, `Response`, `NextRequest`, `NextResponse`.
  * *Runtime configuration:* Explicitly configured as `export const runtime = 'nodejs'` and `export const dynamic = 'force-dynamic'`.

### 4.2 Data Validation & Security Libraries
* **Schema Validation:** `zod` `^4.4.3`
  * *Where Used:* Validating payload schemas in API routes (e.g., `src/app/api/client-invoices/route.js`, candidate registration, employee onboarding).
* **Password Hashing:** `bcryptjs` `^3.0.3`
  * *Where Used:* `src/app/api/auth/login/route.ts`, employee onboarding, password changes. Pure JavaScript implementation (10 salt rounds), ensuring zero native OS compiler dependencies.
* **Authentication Tokens:** `jsonwebtoken` `^9.0.3`
  * *Where Used:*
    * Primary user session JWTs (24-hour expiration) containing user ID, email, role, employee ID.
    * Signed WFO Location Tokens (5-minute expiration) attesting that user GPS coordinates matched the office geofence prior to clock-in.

### 4.3 Document Generation & Dispatch
* **PDF Document Engine:** `pdfkit` `^0.20.2`
  * *Where Used:* `src/lib/generateInvoicePdf.js`.
  * *Architecture:* Renders official GST-compliant tax invoices (Form GST INV–1) with custom tables, borders, tax calculations, digital signature stamps, and bank remittance instructions.
  * *Execution:* Runs 100% in-memory using streaming byte buffers. Emits no temporary files to the disk.
* **Email Mailer:** `nodemailer` `^10.1.1`
  * *Where Used:* `src/app/api/client-invoices/send-email/route.js`.
  * *Capabilities:* Connects to SMTP servers (Gmail SMTP or Hostinger Business Email) over SSL/TLS (port 465 or 587) to dispatch client invoices with PDF attachments.
* **File Uploads (Multer):** Declared as dependency (`^2.2.0`), but file intake across the app uses browser HTML5 `FileReader` producing Base64 payloads directly saved in MongoDB.

---

## 5. Database & Persistence Layer

* **Database Engine:** MongoDB Atlas (Cloud Database-as-a-Service, MongoDB v6+ / v7+).
* **Object Data Modeling (ODM):** `mongoose` `^9.9.1`.
* **Connection Architecture:**
  * Singleton connection caching inside `global._mongoose` (`src/lib/db.ts`).
  * Prevents connection exhaustion in serverless environments by reusing active connections (`readyState === 1`) and buffering queries.
  * Connection settings: `maxPoolSize: 10`, `serverSelectionTimeoutMS: 8000`, `socketTimeoutMS: 45000`.

---

## 6. Infrastructure & Deployment Stack

* **Cloud Hosting:** Vercel (Production URL: `https://hrms-cegs.vercel.app`).
* **Deployment Config:** `vercel.json`.
  * *Framework:* `"nextjs"`
  * *Build Command:* `"npm run build"`
  * *Scheduled Jobs:* Vercel Cron configured for daily absentee evaluation (`30 13 * * 1-6`).
* **Build System:** Next.js Compiler (SWC - Rust-based compiler) + Webpack.
* **Next.js Config (`next.config.mjs`):**
  * `images.remotePatterns`: Whitelists `api.dicebear.com` for dynamic SVG avatar generation.
  * `eslint.ignoreDuringBuilds`: `true` (optimizes build speed for production).
  * `experimental.largePageDataBytes`: `10MB` (allows large state payloads in Next.js pages).
  * `experimental.serverComponentsExternalPackages`: `['pdfkit']` (ensures font files are properly bundled).

---

## 7. Package Dependency Matrix

| Package Name | Installed Version | Role | Justification |
| :--- | :--- | :--- | :--- |
| `next` | `14.2.35` | Framework | Modern React App Router framework |
| `react` / `react-dom` | `^18.0.0` | UI Engine | Component lifecycle, virtual DOM |
| `mongoose` | `^9.9.1` | Database ODM | MongoDB schema modeling, indexing, queries |
| `jsonwebtoken` | `^9.0.3` | Auth Tokens | Stateless 24h session & 5m location token verification |
| `bcryptjs` | `^3.0.3` | Cryptography | Secure password salting and hashing without native C++ |
| `pdfkit` | `^0.20.2` | Document Engine | In-memory official GST invoice PDF generator |
| `nodemailer` | `^10.1.1` | Communication | SMTP invoice and alert transmission |
| `xlsx` | `^0.18.5` | Data Processing | Browser-based Excel/CSV import and export |
| `lucide-react` | `^1.28.0` | Visual Icons | Scalable clean SVG icons for UI navigation |
| `canvas-confetti` | `^1.9.4` | Gamification | Visual celebration for recruiter targets & awards |
| `zod` | `^4.4.3` | Validation | Runtime type and schema validation for API inputs |
| `typescript` | `^6.0.3` | Type Safety | Static type checking for critical backend utilities |

