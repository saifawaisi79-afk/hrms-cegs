# CEGS OS — UI/UX & Component Architecture Inventory
**Prepared for:** Career Experts Global Solutions (CEGS)
**Document Version:** 1.0
**Audit Date:** November 2026

---

## 1. Design System & Visual Language

CEGS OS utilizes an in-house design system styled with custom modern CSS tokens and a glassmorphic/flat hybrid visual aesthetic.

### 1.1 Color Palette & Semantic Tokens
* **Brand Primary:** `#1E3A8A` (Deep Sapphire Navy) — Header banners, primary buttons, invoice headers.
* **Accent Action:** `#0284C7` / `#0EA5E9` (Vibrant Ocean Sky) — Interactive links, tab highlights, active indicators.
* **Neutral Backgrounds:**
  * Application Canvas: `#F8FAFC` (Slate 50)
  * Elevated Cards: `#FFFFFF` (White) with subtle border `#E2E8F0` and shadow `0 4px 6px -1px rgba(0, 0, 0, 0.05)`
  * Dark Surface: `#0F172A` / `#111827` (Night Slate) used in super admin terminal and print headers.
* **Semantic Feedback Tokens:**
  * Success / Active / Paid: `#10B981` (Emerald Green)
  * Pending / Warning: `#F59E0B` (Warm Amber)
  * Error / Danger / Late: `#EF4444` (Crimson Rose)
  * Information / Notice: `#3B82F6` (Electric Blue)

### 1.2 Typography
* **Font Family:** `Inter`, sans-serif (managed via Next.js Google Fonts integration in `src/app/layout.js`).
* **Scale:**
  * Page Titles: `20px` – `24px` (Weight 700/800)
  * Section Headers: `15px` – `17px` (Weight 600/700)
  * Table Headers & Labels: `11px` – `13px` (Weight 600, Uppercase tracking)
  * Body & Table Rows: `13px` – `14px` (Weight 400/500)
  * Microcopy & Badges: `10px` – `12px` (Weight 600)

---

## 2. Shell & Layout Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│  APP HEADER (Sticky Top Bar, 64px)                                     │
│  [CEGS OS Logo] [NavDropdown: Main ▾] [Campaign ▾] [Billing ▾] [IT ▾]  │
│  [Live Punch Clock] [Office Visit Pill] [Notifications] [Profile/Exit] │
├────────────────────────────────────────────────────────────────────────┤
│  ROUTE WAYFINDING (Breadcrumbs, Current Section Meta, Title)           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  PAGE VIEW CONTAINER                                                   │
│  (Data Cards, Filter Ribbons, Search Bars, Responsive Action Tables)   │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│  GLOBAL FLOATING WIDGETS                                               │
│  • Floating Chat Bubble & Messenger Modal (`GlobalMessengerModal.jsx`) │
│  • Notification Alert Toast (`MessengerNotificationToast.jsx`)         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Reusable Component Inventory

### 3.1 Layout & Navigation Components

| Component | File Path | Reused In / Purpose | Key Props & Features |
| :--- | :--- | :--- | :--- |
| **`AppHeader`** | `src/components/layout/AppHeader.jsx` | Mounted globally on all authenticated routes via `layout.jsx` | Renders brand logo, role navigation dropdowns, live punch timer, visit indicator, notification bell, user avatar, and logout prompt. |
| **`AppShell`** | `src/components/layout/AppShell.jsx` | Root application layout wrapper | Coordinates top header, breadcrumb banner, and page body. |
| **`NavDropdown`** | `src/components/layout/NavDropdown.jsx` | Rendered 3x in `AppHeader` (Main, Campaign, Billing) | Role-filtered accessible route selector with icons and active path highlighting. |
| **`RouteWayfinding`** | `src/components/layout/RouteWayfinding.jsx` | Top of every view container | Dynamically extracts page title and purpose copy from `page-meta.js`. |
| **`PageHeader`** | `src/components/layout/PageHeader.jsx` | Top of section dashboards | Title, subtitle badge, and action button slots. |

---

### 3.2 Attendance & Visit Monitoring Components

| Component | File Path | Purpose |
| :--- | :--- | :--- |
| **`CompanyVisitHeaderStatus`** | `src/components/attendance/CompanyVisitHeaderStatus.jsx` | Displays live "In Office" or "Out on Visit" badge in top bar with click-to-open visit logger. |
| **`TeamVisitsMonitor`** | `src/components/attendance/TeamVisitsMonitor.jsx` | Modal popup showing team visit history for the entire month, filterable by date, with CSV export. |

---

### 3.3 Communication & Chat Components

| Component | File Path | Purpose |
| :--- | :--- | :--- |
| **`GlobalMessengerModal`** | `src/components/chat/GlobalMessengerModal.jsx` | Floating corporate messenger supporting direct peer-to-peer chats, group channels, image sharing, and search. |
| **`MessengerNotificationToast`** | `src/components/chat/MessengerNotificationToast.jsx` | Audio chime and desktop popup alert for incoming messages while working in other tabs. |
| **`ModernWhatsAppEmojiPicker`**| `src/components/chat/ModernWhatsAppEmojiPicker.jsx` | Categorized emoji selector for message replies. |

---

### 3.4 Finance & Invoicing Components

| Component | File Path | Purpose |
| :--- | :--- | :--- |
| **`FinanceInvoicesView`** | `src/components/finance/FinanceInvoicesView.jsx` | Master client billing view with 4 pipeline tabs, Form GST INV-1 generator, email modal, and Excel exporter. |
| **`BillRaisedSection`** | `src/components/finance/BillRaisedSection.jsx` | Register of outstanding invoices issued with GST, TDS, and expected receipt calculations. |
| **`BillClearedSection`** | `src/components/finance/BillClearedSection.jsx` | Bank-cleared invoices register with settlement dates and bank verification markers. |
| **`WeeklyUpdateSection`** | `src/components/finance/WeeklyUpdateSection.jsx` | 60-day candidate retention tracker for billing readiness. |
| **`TotalConsolidatedSection`**| `src/components/finance/TotalConsolidatedSection.jsx` | Financial analytics showing total gross billing, net earnings, receipts, and outstanding balances. |

---

### 3.5 Recruitment & Target Components

| Component | File Path | Purpose |
| :--- | :--- | :--- |
| **`RecruitmentPortalView`** | `src/components/recruitment/RecruitmentPortalView.jsx` | Candidate pipeline overview, recruiter team targets, and candidate quick search. |
| **`JoinerSheetSection`** | `src/components/recruitment/JoinerSheetSection.jsx` | 8-week candidate retention tracker with weekly active/inactive status selectors and DOJ filters. |
| **`WalkinsSelectionsSection`** | `src/components/recruitment/WalkinsSelectionsSection.jsx` | Daily intake for walk-in interviews and candidate interview outcomes. |
| **`TargetsChrome`** | `src/components/targets/TargetsChrome.jsx` | Recruiter daily KPI dashboard with progress bars and celebration confetti. |

---

### 3.6 IT Support & Administration Components

| Component | File Path | Purpose |
| :--- | :--- | :--- |
| **`ItDashboardSection`** | `src/components/it/ItDashboardSection.jsx` | IT team operational overview showing ticket SLAs, open tasks, and hardware inventories. |
| **`HrItTaskManagementSection`**| `src/components/it/HrItTaskManagementSection.jsx` | Admin assignment board to allocate tasks to IT personnel. |
| **`PermissionsSection`** | `src/components/permissions/PermissionsSection.jsx` | Visual permission matrix allowing Super Admin to toggle functional permissions per role. |

---

### 3.7 Shared UI Primitives (`src/components/ui/index.jsx`)

* **`<Modal>`**: Accessible overlay dialog with ESC key dismissal, click-outside handling, and smooth scale-in animation.
* **`<Button>`**: Multi-variant button (`primary`, `secondary`, `danger`, `outline`, `ghost`, `dark`) with loading spinners and icon slots.
* **`<Badge>`**: Rounded status pill supporting `active`, `pending`, `danger`, `neutral`, and `info` colorways.
* **`<Card>`**: Padded container with subtle borders and responsive layouts.
* **`<SearchInput>`**: Debounced text search box with clear button and Lucide search icon.
* **`<EmptyState>`**: Illustrated placeholder for empty tables or zero search results.

