# CEGS OS — HRMS: Project Overview
**Prepared for:** Career Experts Global Solutions (CEGS)
**Document Version:** 1.0 (Read-Only Audit)
**Audit Date:** November 2026
**Auditor:** Technical Documentation Specialist

---

## 1. Executive Summary

**CEGS OS** is a full-stack, cloud-deployed Human Resource Management System (HRMS) built specifically for **Career Experts Global Solutions**, a Bengaluru-based recruitment and staffing company. It is a custom-built, proprietary system designed to handle end-to-end HR workflows, recruitment pipeline tracking, attendance management, payroll, internal communication, billing, and financial invoicing for client companies.

The system is production-deployed on **Vercel** at `https://hrms-cegs.vercel.app` and uses **MongoDB Atlas** as its cloud database. It was built primarily using **Next.js 14.2.35** with the App Router architecture, React 18, and TypeScript/JavaScript.

### Key Facts:
- **Type:** Internal HR Operating System for a recruitment/staffing firm
- **Users:** Approximately 15–30 staff members (employees, HR admins, recruiters, finance team, IT team)
- **Database:** MongoDB Atlas (cloud-hosted)
- **Hosting:** Vercel (serverless edge + Node.js functions)
- **Frontend:** Next.js 14 App Router + React 18 (Client Components)
- **Backend:** Next.js API Routes (Node.js runtime)
- **Authentication:** JWT-based (24-hour tokens)
- **Communication:** HTTP polling (3-second interval) — no WebSockets

---

## 2. What Problem Does This System Solve?

Before CEGS OS, a recruitment and staffing firm like CEGS would struggle with:
1. **Manual attendance tracking** — paper registers or Excel sheets
2. **No live visibility** into team activity and office presence
3. **Spreadsheet-based recruitment pipelines** — no central source of truth
4. **Manual payroll computation** — time-consuming and error-prone
5. **No centralized document management** — offer letters, payslips scattered
6. **No internal communication tool** — WhatsApp groups for official messages
7. **No client invoice generation** — invoices created manually in Word/Excel
8. **No leave balance tracking** — no policy enforcement

CEGS OS centralizes all of these into one authenticated web portal.

---

## 3. Project Root Structure

```
hrms/
├── public/                         # Static assets served directly
│   ├── images/                     # Profile photos (3 executive photos)
│   ├── signatures/                 # Digital signature stamps for invoices
│   └── .gitkeep
│
├── recovery-sep9/                  # Data recovery scripts (September 2026 incident)
│
├── scripts/                        # Maintenance & admin one-time scripts
│   ├── seed_ts.ts                  # Database seeding script
│   ├── clear-demo-users.js         # Clears demo accounts
│   ├── export-localstorage-candidates.js
│   ├── fix-candidate-*.js          # Data repair scripts
│   ├── inspect-*.js                # Database inspection tools
│   └── test-*.js                   # Test scripts
│
├── src/                            # Main application source code
│   ├── app/                        # Next.js App Router pages & API routes
│   │   ├── (app)/                  # Authenticated application routes
│   │   │   ├── layout.jsx          # App shell layout (header + nav + content)
│   │   │   ├── admin/              # Admin-only pages (8 sub-pages)
│   │   │   ├── billing/            # Super admin billing/HR pages (14 sub-pages)
│   │   │   ├── campaign/           # Recruitment & campaign pages (12 sub-pages)
│   │   │   ├── finance/            # Finance portal (invoices)
│   │   │   ├── it/                 # IT team portal
│   │   │   ├── dashboard/          # Main dashboard
│   │   │   ├── employees/          # Employee management
│   │   │   ├── directory/          # Employee directory
│   │   │   ├── profile/            # User profile
│   │   │   ├── settings/           # System settings
│   │   │   ├── announcements/      # Announcements
│   │   │   ├── notifications/      # Notification center
│   │   │   ├── reports/            # HR reports
│   │   │   ├── helpdesk/           # IT helpdesk
│   │   │   ├── exit/               # Employee offboarding
│   │   │   └── users/              # User management (SA only)
│   │   │
│   │   ├── (auth)/                 # Unauthenticated routes
│   │   │   └── login/              # Login page
│   │   │
│   │   ├── api/                    # Backend API routes (40+ endpoints)
│   │   │   ├── auth/               # Login, session, password reset, IP/location check
│   │   │   ├── admin/              # Employee management, roles, permissions
│   │   │   ├── attendance/         # Check-in, check-out, mark-absent (cron)
│   │   │   ├── attendance-warnings/# Warning records
│   │   │   ├── leaves/             # Leave applications & approvals
│   │   │   ├── payroll/            # Payroll calculation & processing
│   │   │   ├── messages/           # Internal direct & group messaging
│   │   │   ├── chat-groups/        # Group chat management
│   │   │   ├── notifications/      # Notification CRUD & broadcasts
│   │   │   ├── candidates/         # Recruitment candidate tracking
│   │   │   ├── walkin-selections/  # Walk-in candidate selections
│   │   │   ├── campaigns/          # Recruitment campaign tracking
│   │   │   ├── client-invoices/    # Invoice CRUD, PDF download, email send
│   │   │   ├── clients/            # Client company directory
│   │   │   ├── departments/        # Department management
│   │   │   ├── users/              # User CRUD
│   │   │   ├── documents/          # Document management
│   │   │   ├── assets/             # IT asset tracking
│   │   │   ├── timesheets/         # Timesheet management
│   │   │   ├── onboarding/         # Onboarding tasks
│   │   │   ├── settings/           # System settings API
│   │   │   ├── analytics/          # Overview analytics
│   │   │   └── health/             # Health check endpoint
│   │   │
│   │   ├── layout.js               # Root HTML layout
│   │   ├── page.js                 # Root redirect to /dashboard
│   │   └── globals.css             # Global CSS styles
│   │
│   ├── components/                 # React UI components
│   │   ├── HRMSApp.jsx             # Main application orchestrator
│   │   ├── attendance/             # Attendance UI components (2 files)
│   │   ├── auth/                   # Auth components (login form etc.)
│   │   ├── campaign/               # Campaign & recruitment components
│   │   ├── chat/                   # Messenger & chat components (5+ files)
│   │   ├── finance/                # Finance & billing components (5+ files)
│   │   ├── hrms/                   # Legacy HRMS component (HrmsLegacy.jsx ~740KB)
│   │   ├── it/                     # IT team components (3 files)
│   │   ├── layout/                 # App shell components (header, nav, shell)
│   │   ├── permissions/            # Role/permission management component
│   │   ├── recruitment/            # Recruitment portal components (3 files)
│   │   ├── targets/                # Recruitment targets components
│   │   ├── ui/                     # Shared UI primitives (index.jsx)
│   │   └── views/                  # Page view exports (index.jsx)
│   │
│   ├── contexts/
│   │   └── AppContext.jsx          # Global React context + state management
│   │
│   └── lib/                        # Business logic, utilities, models
│       ├── models/                 # 20 Mongoose MongoDB models
│       ├── auth.ts                 # JWT helpers, IP whitelist, role checks
│       ├── auth-client.js          # Client-side auth utilities
│       ├── db.ts                   # MongoDB connection singleton
│       ├── geo.ts                  # GPS geofencing (Haversine formula)
│       ├── ist-time.js             # IST timezone utilities
│       ├── nav.js                  # Navigation config, role permissions
│       ├── page-meta.js            # Page metadata for breadcrumbs
│       ├── attendance-policy.js    # Attendance rules & late calculation
│       ├── attendance-deductions.js # Payroll deduction logic
│       ├── attendance-warnings-ui.js # Warning display helpers
│       ├── auto-absent.js          # Automated absentee detection
│       ├── leave-policy.js         # Leave accrual & balance calculation
│       ├── finance-data.js         # Finance helper functions
│       ├── finance-seed-data.json  # Seed data for finance module
│       ├── generateInvoicePdf.js   # PDFKit invoice generation
│       ├── client-invoice-rules.js # Invoice eligibility rules
│       ├── candidate-dates.js      # Candidate date normalization
│       ├── campaign-evaluate.js    # Campaign score evaluation
│       ├── campaign-joiners.js     # Joiner tracking logic
│       ├── campaign-weeks.js       # 8-week follow-up tracking
│       ├── recruiter-names.js      # Recruiter name normalization
│       ├── messenger-auth.js       # Chat auth helpers
│       ├── it-tasks-constants.js   # IT task type definitions
│       ├── seed-auth.ts            # Seed/bootstrap auth
│       └── leave-policy.js         # Leave policy calculations
│
├── CEGS_HRMS_Documentation.md      # Legacy documentation file
├── vercel.json                     # Vercel deployment + cron config
├── next.config.mjs                 # Next.js configuration
├── package.json                    # Dependencies
├── tsconfig.json                   # TypeScript configuration
├── .env.example                    # Environment variable template (no secrets)
├── .env / .env.local               # Actual environment variables (gitignored)
└── .gitignore                      # Gitignore rules
```

---

## 4. User Roles and Portals

The system defines **6 user roles** with distinct navigation menus and permissions:

| Role | Portal Label | Home Path | Description |
|------|-------------|-----------|-------------|
| `super_admin` | Super Admin | `/dashboard` | Full system access; oversees all employees, payroll, settings, billing |
| `admin` | HR Admin Panel | `/employees` | HR operations; employee management, attendance, leaves, recruitment |
| `finance` | Finance & Invoices | `/finance/invoices` | Billing & invoicing, recruitment tracking, payslips |
| `it_team` | IT Team Portal | `/dashboard` | IT task management, asset tracking, helpdesk |
| `employee` | Employee Portal | `/dashboard` | Self-service: attendance, leave, payslip, profile, chat |
| `manager` | (Sub-role of admin) | `/dashboard` | Leave approval, attendance view, reports |

---

## 5. Key Differentiating Features

Based on actual implementation evidence:

1. **GPS Geofencing + Location Token System** — WFO attendance uses a 5-minute signed location JWT, preventing location spoofing
2. **IST-Aware Clock System** — All attendance times computed in India Standard Time (UTC+5:30) explicitly, preventing server UTC skew
3. **Automated Absentee Marking** — Vercel Cron at 7:00 PM IST daily marks missing employees absent
4. **8-Week Recruitment Follow-Up Pipeline** — Tracks candidates through 8 weeks with status (active/inactive)
5. **4-Stage Billing Pipeline** — Weekly Update → Bill Raised → Payments & Invoices → Bill Cleared
6. **In-Memory PDF Generation** — PDFKit generates GST-compliant invoices as byte streams (no disk writes)
7. **Dual-Store Architecture** — MongoDB for persistent data + localStorage for fast UI state (HrmsLegacy Store)
8. **Role-Aware Navigation** — Completely different menu structures per role, enforced server-side

---

## 6. Application Entry Points

| Entry | File | Description |
|-------|------|-------------|
| Root URL `/` | `src/app/page.js` | Redirects to `/dashboard` |
| Root HTML wrapper | `src/app/layout.js` | Sets font, metadata, `<AppProvider>` |
| App layout (authenticated) | `src/app/(app)/layout.jsx` | Contains `<AppShell>` (header + nav + content) |
| Login page | `src/app/(auth)/login/page.jsx` | Login form |
| Main state store | `src/contexts/AppContext.jsx` | Global state provider |
| Legacy HRMS engine | `src/components/hrms/HrmsLegacy.jsx` | 14,637-line legacy component |
| Main orchestrator | `src/components/HRMSApp.jsx` | Routes between new + legacy components |

---

## 7. External Dependencies Count

| Category | Count | Key Libraries |
|----------|-------|---------------|
| Production dependencies | 12 | next, react, mongoose, jsonwebtoken, bcryptjs, pdfkit, nodemailer, multer, xlsx, lucide-react, canvas-confetti, zod |
| Dev dependencies | 6 | typescript, eslint, dotenv, @types/node, @types/react, @types/dotenv |
| **Total** | **18** | Minimal footprint — no bloat |

