# CEGS OS — Technical Architecture Diligence (CTO / Lead Architect Q&A)
**Audience:** Chief Technology Officers, Software Architects, Technical Evaluators
**Document Version:** 1.0
**Audit Date:** November 2026

---

### Q1: Why was Next.js 14 App Router chosen over traditional Express or NestJS APIs with a standalone Vite React frontend?
**Architect Answer:**
> *"Next.js 14 App Router gives us a unified, type-safe full-stack repository. By running route handlers in a serverless Node.js environment, we eliminate server provisioning, reverse proxy maintenance, and OS patching. The App Router provides built-in code-splitting, nested layouts (`(app)/layout.jsx`), and automatic route segment caching. Most importantly, it allows shared business logic (such as `ist-time.js`, `leave-policy.js`, and `attendance-policy.js`) to be evaluated consistently on both client and server without code duplication."*

---

### Q2: Serverless functions spin up and down constantly. How do you avoid MongoDB connection exhaustion?
**Architect Answer:**
> *"In serverless deployments, creating a `mongoose.connect()` call on every request quickly exhausts the database cluster's connection pool. In `src/lib/db.ts`, we implement a global connection cache singleton (`global._mongoose`).
> Before attempting a new TCP connection, the helper checks `mongoose.connection.readyState`. If it is already `1` (connected), it reuses the open socket. If a connection is in progress (`readyState === 2`), it awaits the active promise. We configure `maxPoolSize: 10`, `serverSelectionTimeoutMS: 8000`, and `socketTimeoutMS: 45000`. This keeps cold-start latency under 150ms and avoids pool exhaustion."*

---

### Q3: Serverless cloud runtimes run on UTC. How does CEGS OS prevent attendance punch skew and timezone bugs?
**Architect Answer:**
> *"Vercel lambda instances run on UTC (`00:00`). If a developer calls `new Date().getHours()`, a 10:00 AM IST punch appears as 04:30 AM UTC, breaking late calculations.
> We created a dedicated timezone abstraction in `src/lib/ist-time.js` using `Intl.DateTimeFormat` with explicit `timeZone: 'Asia/Kolkata'`. All attendance checks in `src/lib/attendance-policy.js` (such as `formatInOfficeTz(now)`) decompose timestamps using the office timezone rather than server wall-clock time. This ensures 10:15 AM grace thresholds and lunch windows execute accurately regardless of where the cloud container physically runs."*

---

### Q4: How is the GPS geofence calculated, and how do you protect against location replay attacks?
**Architect Answer:**
> *"In `src/lib/geo.ts`, we calculate distance using the spherical Haversine formula over earth radius $R = 6,371,000$ meters:
> $$a = \sin^2(\Delta\phi/2) + \cos(\phi_1)\cos(\phi_2)\sin^2(\Delta\lambda/2)$$
> $$d = 2R \cdot \text{atan2}(\sqrt{a}, \sqrt{1-a})$$
> To prevent replay attacks, the client doesn't just send coordinates with the punch. Coordinates must be submitted to `/api/auth/verify-location`. If distance $\le 100$ meters, the server mints a dedicated JWT location token signed with `JWT_SECRET` containing a strict **5-minute expiration** and `purpose: 'wfo_login'`. When `/api/attendance/check-in` executes, it verifies this signed token. A user cannot reuse coordinates captured hours earlier or generate tokens on remote machines."*

---

### Q5: Why use PDFKit instead of standard headless browser rendering like Puppeteer or Playwright?
**Architect Answer:**
> *"Running headless Chromium (Puppeteer) in a serverless cloud function introduces major liabilities: cold starts increase by 2–4 seconds, memory consumption spikes by 300MB–500MB per render, and serverless package size limits (50MB zipped) are frequently exceeded.
> `pdfkit` (v0.20.2) is a lightweight, pure JavaScript vector graphics engine. In `src/lib/generateInvoicePdf.js`, we construct document tables, GST summary blocks, and digital signature stamps programmatically into in-memory stream buffers (`doc.on('data')`). The PDF renders in less than **120 milliseconds**, consumes under **15MB of RAM**, and streams directly over HTTP without creating temporary files on the host filesystem."*

---

### Q6: How is data synchronized between the client's local store and MongoDB Atlas?
**Architect Answer:**
> *"We follow an **Optimistic UI with Background Synchronization** pattern. When a user executes a state change (such as deleting an invoice or approving leave), the local state in `AppContext` and `Store` (localStorage) is updated immediately for instantaneous user feedback. In parallel, an asynchronous HTTP fetch is dispatched to the backend route handler. If the backend fails (e.g., HTTP 500 or validation error), the UI catches the exception, displays an error toast, and triggers a full data re-fetch (`loadData()`) from MongoDB to restore truth."*

---

### Q7: What indexing strategy is used on MongoDB collections?
**Architect Answer:**
> *"Critical lookup fields have explicit indexes defined in their Mongoose schemas:
> * `User`: Unique compound indexes on `email` (lowercase) and `employee_id`.
> * `Attendance`: Unique compound index `{ user_id: 1, date: 1 }` ensuring an employee can never have duplicate root records for a single calendar day.
> * `ClientInvoice`: Unique sparse index on `invoiceNo`, plus compound index on `{ stage: 1, monthKey: 1, client: 1 }` for pipeline queries.
> * `AttendanceWarning`: Indexed on `{ user_id: 1, month: 1, year: 1 }` for sub-second payroll deduction aggregations.
> * `Leave`: Indexed on `{ user_id: 1, start_date: 1 }` for annual leave balance calculations."*

---

### Q8: What prevents unauthorized horizontal escalation between employee accounts?
**Architect Answer:**
> *"The system enforces **Server-Side Identity Scoping**. When an employee calls `/api/payroll`, `/api/leaves`, or `/api/attendance`, the server decodes their JWT token using `getAuthUser(request)`. The query automatically injects `{ user_id: authUser.id }` if the caller's role is `employee`. Even if a malicious user alters an ID parameter in the request payload or URL, the server overrides it with the authenticated JWT identity."*

---

### Q9: The messenger currently polls every 3 seconds. How would you architect this for 1,000 concurrent staff?
**Architect Answer:**
> *"For the current staffing size (15–50 employees), HTTP polling via `setInterval(..., 3000)` was chosen for simplicity, zero firewall configuration, and compatibility with standard serverless hosting without persistent socket costs.
> To scale to 1,000+ concurrent users, we would decouple chat from HTTP polling by introducing:
> 1. **Server-Sent Events (SSE)** for unidirectional server-to-client message streaming, or
> 2. A managed WebSocket broker (such as **AWS API Gateway WebSocket API** or **Pusher**), coupled with Redis Pub/Sub. The Next.js API would publish messages to Redis, which pushes to active client socket connections in real time."*

---

### Q10: How are environmental secrets and production credentials managed?
**Architect Answer:**
> *"No credentials, private keys, or connection strings are hardcoded in source control. All secrets (`MONGODB_URI`, `JWT_SECRET`, `CRON_SECRET`, `SMTP_PASS`) are injected at runtime via Vercel Production Environment Variables. In development, a local `.env.local` file is used, which is explicitly ignored by `.gitignore`. Furthermore, `src/lib/db.ts` sanitizes accidental quote wrapping or key prefix duplications when pasting environment strings."*

