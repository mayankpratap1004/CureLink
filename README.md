# CureLink

> A multi-tenant hospital management SaaS: appointments, live patient queue, billing, and prescriptions in one role-based dashboard.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth%20%2B%20Realtime-3ECF8E?logo=supabase&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)

<!-- Add a screenshot or GIF here: ![CureLink dashboard](./docs/dashboard.png) -->
<!-- Live demo: https://your-deployment.vercel.app -->

## Problem

Small and mid-sized clinics often run on paper registers and disconnected tools. Patients wait without knowing their turn, double-bookings happen, and billing and prescriptions live in separate places. CureLink brings the whole outpatient flow, from registration to consultation to invoice, into a single system that any hospital can sign up for and use in isolation from others.

## Key Features

- **Multi-tenant onboarding**: a hospital registers once; the system provisions its tenant, admin account, default roles (admin, doctor, receptionist, patient) and starter departments (General Medicine, Cardiology, Paediatrics, Orthopaedics).
- **Role-based access**: sidebar navigation and routes are filtered per role. Admins manage everything, receptionists handle front desk and billing, doctors see patients, appointments and prescriptions.
- **Smart appointment booking**: slots are generated from each doctor's weekly schedule and slot duration, skipping leave days and already-booked slots. A server-side conflict check returns `409` on double-booking, and each booking gets a per-doctor, per-day token number.
- **Appointment lifecycle automation**: moving an appointment through `scheduled → confirmed → checked_in → in_consultation → completed` (or `cancelled` / `no_show`) automatically creates and updates queue entries and records actual wait time.
- **Real-time patient queue**: powered by Supabase Realtime (Postgres changes). Emergency appointments get top priority, and the queue shows an estimated wait based on tokens ahead and the doctor's average consultation time.
- **Waiting-room display screen**: a dedicated full-screen view (`/queue/display`) showing the token currently being served and the next five in line, with a live clock.
- **Billing and invoicing**: itemised invoices with discount and tax, auto-generated invoice numbers (Postgres RPC), payment methods (cash, UPI, card, net banking, insurance) and status tracking (draft, sent, paid, partially paid, overdue, cancelled). Amounts are stored in paise to avoid floating-point errors.
- **Digital prescriptions**: diagnosis, multiple medicines (dosage, frequency, duration, instructions) and follow-up date, linked to the appointment, patient and doctor.
- **Patient and doctor management**: auto-generated patient codes, searchable patient list (name, phone, code), patient profiles with blood group, allergies and emergency contact, plus doctor onboarding with licence, specialization, fee and department.
- **Dashboard**: today's appointment counts, queue stats, and recently registered patients at a glance.

## Tech Stack

| Layer | Technologies |
|---|---|
| Framework | Next.js 16 (App Router, route handlers, `proxy.ts` middleware), React 19 |
| Language | TypeScript |
| Database / Auth / Realtime | Supabase (PostgreSQL, Supabase Auth, Realtime) via `@supabase/ssr` |
| Validation | Zod, React Hook Form |
| UI | Tailwind CSS 4, shadcn/ui, Radix UI, Lucide icons |
| Utilities | date-fns |

## Architecture

```
Browser (React 19 client components)
   │   ├── Supabase Realtime subscription  ──►  live queue updates
   │   └── fetch() to API routes
   ▼
Next.js App Router
   ├── proxy.ts            → session check on every page; redirects unauthenticated users to /login
   ├── app/(auth)          → login, register (hospital onboarding)
   ├── app/(dashboard)     → role-aware pages (patients, doctors, appointments, queue, billing, ...)
   ├── app/api/*           → Zod-validated route handlers (appointments, billing, prescriptions, doctors, auth)
   └── services/*          → server-only data-access layer (queries, joins, pagination)
   ▼
Supabase (Postgres + Auth + Realtime)
```

**Design decisions**

- **Tenant isolation by `tenant_id`**: every table carries a `tenant_id` and every query is scoped by it.
- **Service layer**: all database reads live in `src/services/*` (marked `server-only`), keeping pages thin.
- **Privileged operations on the server**: creating auth users (hospital registration, doctor onboarding) uses the Supabase service-role key inside route handlers only, never in the browser.
- **Soft deletes**: core tables use `deleted_at`, so records can be archived without losing history.
- **Schema covers more than the UI**: the typed schema also includes `doctor_leaves`, `medical_records`, `notifications` and `audit_logs`, laying the groundwork for upcoming modules.

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project

### Installation

```bash
git clone https://github.com/mayankpratap1004/CureLink.git
cd CureLink
npm install
```

### Environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key   # server-only, never expose
```

### Database setup

Create the tables defined in `src/types/database.ts` (`tenants`, `users`, `roles`, `user_roles`, `departments`, `doctors`, `doctor_schedules`, `doctor_leaves`, `patients`, `appointments`, `queue_entries`, `billing_invoices`, `prescriptions`, `medical_records`, `notifications`, `audit_logs`), the Postgres functions `generate_patient_code` and `generate_invoice_number`, and enable Realtime on `queue_entries`.

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), register a hospital, and you'll land in the admin dashboard.

## Project Structure

```
src/
├── app/
│   ├── (auth)/            # login, register
│   ├── (dashboard)/       # dashboard, patients, doctors, departments,
│   │                      # appointments, queue (+ display), billing, prescriptions
│   └── api/               # appointments, billing, prescriptions, doctors, auth
├── components/            # layout (sidebar, topbar), shared, ui (shadcn)
├── hooks/                 # use-current-user, use-realtime-queue
├── services/              # server-only data-access layer
├── lib/
│   ├── supabase/          # browser, server and admin clients
│   └── validations/       # Zod schemas
├── types/                 # app + generated database types
└── proxy.ts               # auth gate for all routes
```

## Roadmap

- [ ] Medical records, notifications and settings modules (navigation and schema are in place)
- [ ] Row Level Security policies for database-enforced tenant isolation
- [ ] Patient portal (the `patient` role is already seeded)
- [ ] SMS / WhatsApp appointment reminders
- [ ] PDF invoices and prescriptions
- [ ] Audit log viewer and analytics dashboard
- [ ] Automated tests and CI

## Author

**Mayank Pratap**
[GitHub](https://github.com/mayankpratap1004)
