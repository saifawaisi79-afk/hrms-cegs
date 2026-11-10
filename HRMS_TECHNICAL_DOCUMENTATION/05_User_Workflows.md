# CEGS OS — End-to-End User Workflows
**Prepared for:** Career Experts Global Solutions (CEGS)
**Document Version:** 1.0
**Audit Date:** November 2026

---

## 1. Authentication & Location-Verified Login Workflow

CEGS OS enforces a strict multi-layer authentication protocol featuring **GPS Geofence Validation for Work-From-Office (WFO)** and **Role-Portal Segregation**.

```mermaid
sequenceDiagram
    autonumber
    actor Employee as Staff Member
    participant Client as Web Browser
    participant API as /api/auth/login
    participant Geo as /api/auth/verify-location
    participant DB as MongoDB Atlas (User)

    Employee->>Client: Open Login Screen (/login)
    Employee->>Client: Select Mode: WFO (Office) or WFH (Remote)
    alt Mode == WFO (Office)
        Client->>Client: Prompt navigator.geolocation.getCurrentPosition()
        Client->>Geo: POST { lat, lng }
        Geo->>Geo: Calculate distance via Haversine Formula (<= 100m)
        alt Inside Geofence (<= 100m)
            Geo-->>Client: Returns signed 5m LocationToken
        else Outside Geofence (> 100m)
            Geo-->>Client: HTTP 403 Forbidden ("Outside office geofence")
            Client-->>Employee: Show geofence error alert (blocks login)
        end
    end
    Employee->>Client: Enter Email & Password + Submit
    Client->>API: POST { email, password, locationToken, workMode }
    API->>DB: Query User by email (case-insensitive)
    alt User Not Found or Inactive
        API-->>Client: HTTP 401 ("Invalid email or password")
    else User Exists & Active
        API->>API: bcrypt.compare(password, user.password_hash)
        alt Password Mismatch
            API-->>Client: HTTP 401 ("Invalid email or password")
        else Password Valid
            API->>API: Generate 24h Session JWT { id, role, email, name, employee_id }
            API-->>Client: Returns { token, user }
            Client->>Client: Store token in localStorage (cegs_auth_token)
            Client->>Client: Initialize AppContext state
            Client-->>Employee: Redirect to Role Home (e.g., /dashboard, /employees, /finance/invoices)
        end
    end
```

### Numbered Explanation:
1. **Portal Selection:** User selects their operating mode (Work From Office vs Work From Home).
2. **GPS Geofence Enforcement (WFO):** If WFO is selected, the browser queries the HTML5 Geolocation API. Coordinates are dispatched to `/api/auth/verify-location`. The server computes the distance against the configured office coordinates (`OFFICE_LAT: 13.029861`, `OFFICE_LNG: 77.589167`, `RADIUS: 100m`).
3. **Location Token Minting:** If within 100 meters, a cryptographically signed 5-minute JWT (`locationToken`) is returned.
4. **Credential Verification:** The user submits their email, password, and the location token.
5. **Database Authentication:** The backend checks the `User` collection, validates that the account is `active`, and verifies the password hash using `bcryptjs`.
6. **Session Minting:** Upon success, a 24-hour JWT token is returned, stored in `localStorage`, and used in subsequent HTTP requests via the `Authorization: Bearer <token>` header.

---

## 2. Attendance Tracking & Automated Penalty Workflow

```mermaid
flowchart TD
    Start([Employee Clicks Clock In]) --> CheckType{Mode Selected?}
    CheckType -- "WFO" --> CheckGPS[Browser Verifies Geofence <= 100m]
    CheckType -- "WFH" --> ProceedPunch[Record Remote Punch]
    CheckGPS --> ProceedPunch
    
    ProceedPunch --> CheckTime{Current Time vs Employee Login Start}
    CheckTime -- "Within Login Start + 15m Grace" --> MarkOnTime["Mark Status: Present / On-Time"]
    CheckTime -- "After 10:15 AM (or 11:15 AM)" --> MarkLate["Mark Status: Late Clock-In"]
    
    MarkLate --> LogWarning["Insert AttendanceWarning (late_clock_in)"]
    LogWarning --> CountMonthWarnings{"Total Warnings this Month > 2?"}
    CountMonthWarnings -- "1st or 2nd Occurrence" --> FreeWarning["Zero Penalty (Free Warning)"]
    CountMonthWarnings -- "3rd+ Occurrence" --> HalfDayCut["Trigger 0.5 Day Salary Deduction on Payroll"]
    
    MarkOnTime --> SavePunch[Save to Attendance Collection]
    FreeWarning --> SavePunch
    HalfDayCut --> SavePunch
    
    subgraph "Evening Automated Absentee Cron (7:00 PM IST)"
        CronJob[Vercel Cron Trigger] --> FetchActive[Query all Active Employees]
        FetchActive --> CheckPunch{Has Clock-In Today OR Approved Leave?}
        CheckPunch -- "Yes" --> NoAction[Skip]
        CheckPunch -- "No" --> CreateAbsent["Create Attendance Record: Status = Absent"]
        CreateAbsent --> FullDayCut["Apply 1.0 Day Salary Deduction on Payroll"]
    end
```

### Key Business Rules:
* **Standard Login Time:** 10:00 AM IST (with 15-minute grace period until 10:15 AM).
* **Special Staff Login Overrides:** Certain employees (e.g., Raheel) have configured start times (11:00 AM with grace until 11:15 AM).
* **Lunch Break Duration:** 30 minutes for Employees (3:00 PM – 3:30 PM); 60 minutes for HR Managers (3:00 PM – 4:00 PM). Returning late logs a `late_lunch_return` warning.
* **Warning Penalty Threshold:** The first 2 warnings in any category per month are free. The 3rd occurrence onward deducts **0.5 days of salary per infraction**.
* **Evening Absentee Sweep:** At 7:00 PM IST Monday–Saturday, any active employee who did not punch in and has no approved leave is automatically flagged as `Absent` (1.0 day salary deduction).

---

## 3. Leave Application & Approval Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Employee
    participant UI as Leave Screen (/billing/leaves)
    participant API as /api/leaves
    participant DB as MongoDB (Leave & User)
    actor Admin as HR Admin / Super Admin

    Staff->>UI: Open Leave Management & Select Leave Type (Sick / Casual)
    UI->>UI: Calculate Leave Balance (24 annual days accrued at 2/month)
    Staff->>UI: Enter Start Date, End Date, Reason & Submit
    UI->>API: POST /api/leaves { type, start, end, reason }
    API->>DB: Save Leave document (status: "pending", payType: "paid" or "unpaid")
    API-->>UI: Confirmation Toast ("Leave application submitted")
    
    Admin->>UI: View Leave Approval Queue
    Admin->>API: POST /api/leaves/[id]/status { action: "approve" or "reject", note }
    API->>DB: Update Leave status to "approved" or "rejected"
    API->>DB: Create Notification for Employee
    API-->>UI: Refreshed Leave Register
```

---

## 4. End-to-End Client Billing & Invoicing Pipeline (4 Stages)

The core commercial pipeline of CEGS connects placed candidates to cash receipts through a **4-Stage Pipeline**:

```mermaid
flowchart LR
    Stage1["Stage 1: Weekly Update (Section 1A)
    • 8-Week Candidate Follow-up
    • 60-Day Billing Threshold Passed
    • Candidates marked 'Ready to Invoice'"] --> |Action: 'Raise Bill'| Stage2["Stage 2: Bill Raised (Section 2B)
    • Invoices Issued Register
    • Outstanding Tax Register
    • Status: 'Raised' or 'Pending'"]
    
    Stage2 --> |Action: 'Generate Direct Invoice'| Stage3["Stage 3: Payments & Invoices (Section 3C)
    • Official Form GST INV-1 Rendered
    • GST 18% & TDS 10% Computed
    • In-Memory PDF & Email Sent to Client"]
    
    Stage3 --> |Action: 'Mark Paid'| Stage4["Stage 4: Bill Cleared (Section 4D)
    • Bank Remittance Verified
    • Outstanding Balance = ₹0
    • Revenue Confirmed in P&L"]
```

### Stage Details:
1. **Weekly Update (A):** Sourcing specialists and recruiters track placed candidates over 8 weeks. Once a candidate completes 60 days of retention and remains active, their status updates to `Ready to Invoice`.
2. **Bill Raised (B):** Grouped candidate batches are converted into raised bills with candidate count, basic placement fee (`bi`), and net revenue margin (`ai`).
3. **Payments & Invoices (C):** Formal client tax invoice is issued with SGST (9%), CGST (9%), client GSTIN, client address, and bank remittance instructions.
4. **Bill Cleared (D):** Once wire transfer/NEFT credit is confirmed in HDFC Bank, invoice is marked `Paid` and archived in the cleared register.

---

## 5. Employee Onboarding Workflow

```mermaid
sequenceDiagram
    autonumber
    actor HR as HR Admin
    participant UI as Employees View (/employees)
    participant API as /api/admin/employees/onboard
    participant DB as MongoDB (User)

    HR->>UI: Click "+ Add Employee" button
    HR->>UI: Fill mandatory details: Name, Email, Password, Role, Designation, Department
    HR->>UI: Fill compensation details: Basic Salary, Allowances, Scheduled Login Time (e.g., 10:00)
    HR->>UI: Fill emergency contacts & bank details (IFSC, Account Number)
    HR->>UI: Submit Form
    UI->>API: POST /api/admin/employees/onboard
    API->>DB: Check if email or employee_id already exists
    API->>API: Hash temporary password via bcryptjs (10 rounds)
    API->>DB: Create new User document with status="active"
    API-->>UI: HTTP 201 Created { user }
    UI-->>HR: Show Success Toast & Append new employee to live directory
```

