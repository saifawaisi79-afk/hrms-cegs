# HRMS Phase 2 Fix Report — Alignment Stabilization & Login Portal Validation

**Branch:** `fix/hrms-alignment-login`  
**Baseline Backup Commit:** `8ed307d` (`backup: pre-phase-2 baseline before alignment and login fixes`)  
**Phase 1 Reference:** [AUDIT-REPORT.md](file:///c:/Users/dell/Desktop/hrms/AUDIT-REPORT.md)

---

## 1. Executive Summary

All approved CSS/layout stabilization fixes and Option A strict Login Portal validation changes were implemented on branch `fix/hrms-alignment-login` with **zero database, JSON, mock data, `localStorage` schema, `.env`, or business calculation modifications**.

- **Alignment & Layout Fixes:** Consolidated shared responsive primitives (`.table-responsive`, `.filter-control`, `.th-num`/`.td-num`, `.r-grid-*`, `.r-split-*`, `.r-modal-grid-*`, `.r-kpi-*`, `.modal-backdrop-safe`, `.modal-scroll-card`, semantic button variants, and `@media print`) in `src/app/globals.css`, and applied layout-only updates across 25 UI components/pages to eliminate horizontal page overflow, header/button height mismatches, sticky positioning failures, modal viewport clipping, and tablet/mobile grid squishing across `1440px`, `1024px`, `768px`, and `390px`.
- **Login Portal Validation (Option A — Strict 1:1 Enforcement):** Implemented server-side and client-side portal validation after credential verification using shared helpers in `src/lib/nav.js`, stopped silent email-prefix auto-switching in `LoginPage`, eliminated login-time MongoDB `user.role` mutations in `/api/auth/login`, fixed root `/` landing routing, and added `?portal=` and safe `?next=` deep-link preservation across session expiry and unauthenticated redirects.

---

## 2. What Changed (Before vs. After)

### A. Shared Layout & CSS Foundations (`src/app/globals.css`)
- **Login Card & Portal Pills:**
  - *Before:* `.login-pro-card` lacked vertical viewport overflow guards on shorter screens and `.login-pro-portal-pills` could crowd when holding all 5 portals.
  - *After:* `.login-pro-card` uses `max-width: 420px; max-height: calc(100dvh - 24px); overflow-y: auto; overflow-x: hidden`; `.login-pro-portal-pills` uses `flex-wrap: wrap; border-radius: 16px` and `.login-pro-pill` uses `white-space: nowrap`.
- **Sticky Headers & Viewport Horizontal Scroll:**
  - *Before:* `html, body` used `overflow-x: hidden !important`, breaking `position: sticky` inside scroll descendants.
  - *After:* Changed to `overflow-x: clip !important` cleanly; added `.revenue-sticky-sidebar` (`top: 88px`).
- **Header, Action Buttons & Filter Bar Heights:**
  - *Before:* `.btn` height overrides enlarged `.btn-sm` / `.btn-xs` / `.btn-icon` / `.btn-icon-sm`, mobile header hid `.header-right .hdr-icon-btn:nth-child(1)` at `< 768px`, and custom colored `.btn-primary`/`.btn-secondary` buttons collided with `!important` rules; inputs/selects varied between `36px`, `38px`, `42px`, and `44px`.
  - *After:* Restored `.btn-sm` (`min-height: 34px`), `.btn-xs` (`28px`), `.btn-icon` (`36px x 36px`), `.btn-icon-sm` (`30px x 30px`); moved mobile header breakpoint to `@media (max-width: 768px)` without hiding header icon buttons; added compact desktop header sizing for `@media (min-width: 1024px) and (max-width: 1180px)`; added semantic button classes (`.btn-outline`, `.btn-warning-soft`, `.btn-danger-soft`, `.btn-info-soft`, `.btn-neutral-soft`, `.btn-success-solid`, `.btn-sky-solid`, `.btn-purple-solid`, `.btn-rose-solid`) and unified `.filter-control` / `.form-input-readonly` heights and `.feature-page-inner` container spacing; fixed `align-items: end` -> `align-items: flex-end` in `.finance-toolbar, .finance-raise-grid`.
- **Tables, KPI Grids, Modals & Print:**
  - *Before:* Multi-column modals/grids used inline fixed `repeat(2/3/4, ...)` or rigid sidebars that overflowed or squished below `1024px`/`768px`, financial numeric columns lacked uniform `.th-num`/`.td-num` right-alignment + `tabular-nums`, and modals risked header/footer clipping on short viewports.
  - *After:* Added `.r-grid-2`, `.r-grid-3`, `.r-grid-4`, `.r-split-aside`, `.r-split-5-3`, `.r-split-side-left`, `.r-modal-grid-2`, `.r-modal-grid-3`, `.r-kpi-4`, `.r-kpi-5`, `.modal-backdrop-safe`, `.modal-scroll-card`, `.th-num`/`.td-num`, `.glass-card-flush`/`.card-flush`, `.messenger-grid-layout`, `.emoji-picker-popover`, `.datasheet-table-compact`/`.datasheet-cell-wrap`, `@media (max-width: 640px)` header capsule compaction, breakpoint collapses at `1099/1023/900/768/639/479px`, and `@media print` page break rules.

### B. Page & Component Alignment Fixes
- **Finance, Billing & Approvals (`src/components/finance/*`):**
  - *Before:* Varying outer padding across sub-tabs, unbounded `<select>` widths, non-wrapping modal headers/footers, overflowing 5-col `AnalysisModal` table, unpadded/unwrapped `BillCleared` duplicate comparison table, mismatched `BillRaised` column padding, and inconsistent numeric alignment.
  - *After:* Applied `.feature-page-inner`, `.modal-backdrop-safe` + `.modal-scroll-card`, `.r-modal-grid-2`/`.r-modal-grid-3`, `.th-num`/`.td-num`, `overflowX: 'auto'` wrappers around `AnalysisModal` and `BillClearedSection` tables, `whiteSpace: 'nowrap'` table headers, bounded select inputs (`maxWidth: '100%'`), wrapped modal/footer action rows, and unified `'10px 14px'` cell padding in `BillRaisedSection`.
- **Recruitment, Targets, Campaign Hub, Revenue Sheets & Visits:**
  - *Before:* Duplicate `24px` horizontal padding inside `.page-content` on `RecruitmentPortalView` and `TargetsViews`; non-wrapping toolbar/checkbox rows and variable input heights on `CampaignHubView`, `WalkinsSelectionsSection`, and `JoinerSheetSection`; misaligned SL No padding & Week 1–8 headers in `JoinerSheetSection`; floating toast overflowing narrow mobile screens; unreadable `activeCount === 0` capsule colors and z-index modal overlap in `TeamVisitsMonitor`; rigid print/grid widths in `RevenueSheetsView` and `TeamWorkReportModal`; non-wrapping modal inputs/rows in `CompanyManagerModal`.
  - *After:* Removed duplicate horizontal outer padding; standardized `.filter-control` and `44px` control heights; centered Week headers and aligned SL No `.td-num`; wrapped preview/upload/company/report rows and modals with `.modal-backdrop-safe`/`.modal-scroll-card`; switched KPI/daily grids to `.r-kpi-4`/`.glass-card-flush` and `minmax(min(100%, ...), 1fr)`; moved `TeamVisitsMonitor` modal backdrop to `zIndex: 99999` and improved contrast when `activeCount === 0`.
- **IT, Permissions, Meet, Chat & Core Legacy Module (`src/components/it/*`, `PermissionsSection.jsx`, `CegsMeetDashboard.jsx`, `meet/[id]/page.jsx`, `chat/*`, `HrmsLegacy.jsx`):**
  - *Before:* Horizontal `24px` padding inside `ItDashboardSection`/`ItMyTasksSection`/`HrItTaskManagementSection`; hard-coded multi-column modal/card grids in `HrmsLegacy.jsx`, `CegsMeetDashboard.jsx`, and IT modules; unwrapped Quick Join / Meet URLs and unscrollable 5-col Meet Attendance & Payslip breach tables on mobile; `HrmsLegacy.jsx:5127` duplicate `className` on Attendance employee filter.
  - *After:* Unified `.feature-page-inner`, `.r-grid-*`, `.r-split-*`, `.r-modal-grid-*`, `.modal-backdrop-safe`/`.modal-scroll-card`, wrapped Meet/Messenger/Permissions controls, added `overflowX: 'auto'` around Meet Attendance and Payslip deduction breakdown tables, fixed CSS class collisions on IT buttons (`.btn-sky-solid`/`.btn-success-solid`/`.btn-purple-solid`/`.btn-rose-solid`), fixed `tracking` -> `letterSpacing` in Recruitment tab of `HrmsLegacy.jsx`, and removed duplicate `className` at `HrmsLegacy.jsx:5127`.

### C. Login Portal Validation — Option A (Strict 1:1 Enforcement)
- **Shared Portal Helpers (`src/lib/nav.js`):**
  - Added `normalizePortal(portal)` (handles `'IT_TEAM'` and `'it_team'` case variants consistently), case-normalized `portalMatchesRole(portal, role)`, updated `homePathForPortal(portal)` and `portalLabel(portal)`, added `portalMismatchMessage(portal)` returning `"This account isn't registered for the <Selected> portal. Please sign in through the correct portal."` (generic non-enumerating wording — never discloses the user's true assigned portal), and added `safeInternalNextPath(rawPath)` blocking open redirects (`//...`, `http...`, `\`) and `/login` redirect loops.
- **Server-Side Enforcement (`src/app/api/auth/login/route.ts`):**
  - *Before:* `portal` was `.optional()`; only partial portal checks existed (`admin` was allowed into `employee`, `super_admin` was allowed into `admin`/`finance`, employees with IT-like titles signing into `IT_TEAM` triggered `User.findByIdAndUpdate` mutating `user.role = 'IT_TEAM'`); returned `user.role`'s `PORTAL_HOME` path ignoring selected portal.
  - *After:* `portal` is required in `loginSchema` (`z.enum(['employee', 'admin', 'super_admin', 'finance', 'it_team', 'IT_TEAM'])`), rejecting omitted/unknown portal with HTTP `400`. Password verification (`bcrypt.compare`) executes **before** portal matching so wrong credentials always return `401`. Strict `portalMatchesRole(portal, user.role)` rejects any cross-portal attempt with HTTP `403` (`code: 'PORTAL_MISMATCH'`), zero JWT/cookie issued, and zero DB `role` mutation.
- **Client Flow, Auto-Switch Removal, Root & Deep Links (`AppContext.jsx`, `LoginView.jsx`, `HrmsLegacy.jsx`, `(app)/layout.jsx`, `src/app/page.js`):**
  - *Before:* `LoginPage.handleEmailChange` silently changed `selectedPortal` based on email prefixes (`hussain@`, `heena@`, `saifawaisi`, etc.); `AppContext.login` passed `portal: selectedPortal || undefined` without checking role match on client; `(app)/layout.jsx` dropped intended path on `/login` redirect; `/` sent any authenticated user to `/dashboard` even for `admin` (`/employees`) or `finance` (`/finance/invoices`).
  - *After:* Removed `handleEmailChange` auto-switching so the user's clicked portal stays fixed; `AppContext.login` validates `selectedPortal` and enforces `portalMatchesRole(selectedPortal, accountRole)` before calling `setAuthToken` / setting user state; `(app)/layout.jsx` passes `intended` path as `?next=...` when redirecting unauthenticated/expired sessions to `/login`; `LoginView.jsx` reads `?portal=` (`initialPortal`) and safe `?next=` (`nextPath`) without breaking Next 14 static prerendering; `src/app/page.js` redirects `/` to `homePathForPortal(user?.role)`.

---

## 3. Files Touched & `git diff main --stat` Proof (No Data Touched)

`git diff main --stat` output after final edit:

```text
 src/app/(app)/layout.jsx                           |  12 +-
 src/app/(app)/meet/[id]/page.jsx                   |   2 +-
 src/app/api/auth/login/route.ts                    |  54 +--
 src/app/globals.css                                | 422 ++++++++++++++++++++-
 src/app/page.js                                    |   3 +-
 src/components/admin/RevenueSheetsView.jsx         |  44 ++-
 src/components/attendance/TeamVisitsMonitor.jsx    |  68 ++--
 src/components/auth/LoginView.jsx                  |  20 +-
 src/components/campaign/CampaignHubView.jsx        |  46 +--
 src/components/chat/GlobalMessengerModal.jsx       |   8 +-
 src/components/chat/ModernWhatsAppEmojiPicker.jsx  |   3 +-
 src/components/finance/BillClearedSection.jsx      |  56 +--
 src/components/finance/BillRaisedSection.jsx       |  44 ++-
 src/components/finance/FinanceInvoicesView.jsx     |  25 +-
 src/components/finance/InvoiceApprovalsView.jsx    |  14 +-
 .../finance/TotalConsolidatedSection.jsx           |  32 +-
 src/components/finance/WeeklyUpdateSection.jsx     |  26 +-
 src/components/hrms/HrmsLegacy.jsx                 | 119 +++---
 src/components/it/HrItTaskManagementSection.jsx    |  62 ++-
 src/components/it/ItDashboardSection.jsx           |  24 +-
 src/components/it/ItMyTasksSection.jsx             |  32 +-
 src/components/meet/CegsMeetDashboard.jsx          |  23 +-
 src/components/permissions/PermissionsSection.jsx  |   8 +-
 src/components/recruitment/CompanyManagerModal.jsx |  23 +-
 src/components/recruitment/JoinerSheetSection.jsx  |  85 +++--
 .../recruitment/RecruitmentPortalView.jsx          |  10 +-
 src/components/recruitment/TeamWorkReportModal.jsx |  35 +-
 .../recruitment/WalkinsSelectionsSection.jsx       |  32 +-
 src/components/targets/TargetsViews.jsx            |   4 +-
 src/contexts/AppContext.jsx                        |  13 +-
 src/lib/nav.js                                     |  42 +-
 31 files changed, 957 insertions(+), 434 deletions(-)
```

- **Data Integrity Check:** Zero database models, seed scripts, JSON files, `.env` configs, calculation helpers, or `localStorage` keys were modified. Pre-existing line-ending status on `src/lib/recruiter-names.js` had zero diff against `main`.

---

## 4. Verification & Tests Run

| Check | Command / Harness | Scope & Conditions | Result |
| --- | --- | --- | --- |
| **TypeScript Type Check** | `npx tsc --noEmit` | Full repo across all TS/JS/JSX files after all edits | **PASS** (exit `0`, 0 errors) |
| **Production Next Build** | `npm run build` (`next build`) | Full production bundle & static/dynamic route generation (`97/97` routes) after final edit | **PASS** (exit `0`, 0 errors, 0 CSS warnings) |
| **Portal Helpers (`src/lib/nav.js`)** | `npx --yes tsx .../verify-login-logic.mjs` | `normalizePortal`, `homePathForPortal`, `safeInternalNextPath` (`//evil.com`, `/login`, `/finance/invoices?tab=raised`), `portalMismatchMessage`, and 6×6 `portalMatchesRole` matrix (`employee`, `admin`, `super_admin`, `finance`, `IT_TEAM`, `it_team`) | **PASS** (all assertions passed) |
| **Server Login Handler (`POST /api/auth/login`)** | `npx --yes tsx .../verify-login-logic.mjs` | Calls real exported `POST` handler in `src/app/api/auth/login/route.ts` with isolated in-memory Mongoose model doubles (`User.findOne`, `SystemSetting.findOne`) and real `bcryptjs` hashes across **36/36 role×portal pairs** + 3 boundary checks (`400` missing portal, `400` invalid portal, `401` wrong password before portal check, `403 PORTAL_MISMATCH` without token/cookie or DB `role` update) | **PASS** (36/36 matrix + 3 boundary checks) |
| **Live Production Server API Boundary** | `node .../verify-browser-live.mjs` (`next start -H 127.0.0.1 -p 3099`) | Real HTTP `POST /api/auth/login` against running production Next bundle without DB mutations | **PASS** (`400` missing portal, `400` invalid portal, `401` nonexistent creds) |
| **Headless Chromium Responsive & Auth UI** | Isolated Chromium CDP (`chrome.exe --headless=new`) | Live `/login` checks at **`1440×900`**, **`1024×768`**, **`768×1024`**, **`390×844`** (`scrollW === vw`, all 5 portal pills visible, `pillClipped: false`); email typing (`heena@cegs.com`) preserves clicked `IT Team` portal pill; `/login?portal=finance` pre-selects Finance pill; unauthenticated `/finance/invoices?tab=raised` redirects to `/login?next=%2Ffinance%2Finvoices%3Ftab%3Draised`; expired JWT on `/reports` clears `cegs_token` and redirects to `/login?next=%2Freports` | **PASS** (all browser assertions passed) |

---

## 5. Coverage Scope & Items Intentionally Left for Later

1. **Authenticated Page Visual Regression in Live Browser:** Because real onboarded production user passwords in MongoDB are hashed and not stored in plaintext in the workspace (and altering user records or forging auth tokens was explicitly prohibited), live Chromium viewport measurements in Phase 2 covered `/login` and unauthenticated/expired redirect routes directly; all authenticated module layouts were verified by JSX/TS type-checking (`tsc --noEmit`), full `next build` (`97/97` routes), and static CSS rule checks. A final manual visual walkthrough across each signed-in portal at `1440/1024/768/390` is recommended once deployed or tested with valid credentials per portal.
2. **Deferred Non-CSS / Functionality Items (unchanged per Hard Constraints; detailed in `AUDIT-REPORT.md` Section 7):**
   - Server-side JWT/RBAC route guards across non-login API routes (`API-SEC-*`).
   - `.card` / `.ui-card` visual unification where card styling differs intentionally (`HrmsLegacy.jsx` vs new Tailwind/inline cards).
   - `LoginPage` promotional hero counter `'6' Active Portals` vs 5 login portal buttons (`HrmsLegacy.jsx` left untouched to avoid altering UI copy/marketing text unless requested).
   - Client-side CSV / PDF export file schema or column content formatting (`FinanceInvoicesView`, `TeamWorkReportModal`, `RevenueSheetsView`).
   - `HrmsLegacy.jsx` modular refactoring into subcomponents.
