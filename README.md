# TransitOps

**Smart Transport Operations Platform** — fleet, drivers, dispatch, maintenance, fuel, safety, and financial insights in one workspace.

<p align="center">
  <img src="public/icon/dark.png" alt="TransitOps" width="72" />
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-4-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img alt="Clerk" src="https://img.shields.io/badge/Auth-Clerk-6C47FF?style=flat-square&logo=clerk&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Data-Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white" />
  <img alt="shadcn/ui" src="https://img.shields.io/badge/UI-shadcn%2Fui-000000?style=flat-square" />
  <img alt="Leaflet" src="https://img.shields.io/badge/Maps-Leaflet-199900?style=flat-square&logo=leaflet&logoColor=white" />
</p>

<p align="center">
  <img alt="RBAC" src="https://img.shields.io/badge/RBAC-6%20roles-0ea5e9?style=flat-square" />
  <img alt="Live map" src="https://img.shields.io/badge/Live%20map-GPS%20dispatch-10b981?style=flat-square" />
  <img alt="Theme" src="https://img.shields.io/badge/Theme-light%20%2F%20dark-a855f7?style=flat-square" />
  <img alt="Hackathon" src="https://img.shields.io/badge/Odoo%20Hackathon-2026-f59e0b?style=flat-square" />
</p>

---

## Dashboard preview

GitHub shows the screenshot that matches your system theme (light or dark).

<!-- Light mode (GitHub) -->
![TransitOps dashboard — light mode](docs/screenshots/dashboard-light.jpg#gh-light-mode-only)

<!-- Dark mode (GitHub) -->
![TransitOps dashboard — dark mode](docs/screenshots/dashboard-dark.jpg#gh-dark-mode-only)

> **Map-first ops console** — live fleet markers, routes for dispatched trips, fuel index, live units, and role-aware activity feeds.

---

## What is TransitOps?

TransitOps is a full-stack **fleet operations** app for:

| Area | Capabilities |
|------|----------------|
| **Live fleet** | Leaflet map, vehicle icons by type/status, polylines for en-route units |
| **Dispatch** | Trip board (Draft → Dispatched → Completed), capacity & license checks |
| **Drivers & vehicles** | Registry, OCR-assisted intake, **pending approval** until fleet manager accepts |
| **Maintenance** | Work orders, shop status on map, live board refresh |
| **Fuel & finance** | Expenses, ROI reports, scenario economics, PDF/CSV export |
| **Safety** | License watchlists, safety scores, Safety Command |
| **Auth & roles** | Clerk sign-in/up, onboarding, six RBAC profiles |

Sandbox mode works offline with `localStorage` when Supabase is empty or unavailable.

---

## Features

### Live fleet & dispatch
- Dispatched trips register **GPS routes** and animate on the dashboard map
- Complete / cancel removes tracking and frees vehicle & driver
- Live units list, route colors, light/dark basemaps
- Ops events + polling so sandbox updates feel real-time

### Approvals
- New **drivers** start **Inactive / Pending** until license image is reviewed
- New **vehicles** stay **Pending** until registration is reviewed
- Notification drawer → **Review** dialog (uploaded image + OCR fields → Accept / Reject)

### Insights & reporting
- ROI reports with what-if sliders
- Professional light A4 PDF export
- AI predictive maintenance and economics scenario lab

### Product UX
- shadcn/ui + Geist, light/dark via `next-themes`
- Branded auth shell (no Account Portal purple default when paths are set)
- Role chip loading skeletons (no false “Fleet Manager” flash)

---

## Roles (RBAC)

Self-serve onboarding **does not** include Fleet Manager (admin-provisioned).

| Role | Focus |
|------|--------|
| **Fleet Manager** | Full operations, service, insights, approvals |
| **Dispatcher** | Dispatch board, driver/vehicle availability |
| **Driver** | My trips, vehicle, log expense, report issue |
| **Safety Officer** | Safety Command, drivers, vehicles, maintenance (read) |
| **Financial Analyst** | Fuel & expenses, reports, war room, economics |
| **Maintenance Technician** | Work orders, fleet units, predictions |

---

## Tech stack

| Layer | Stack |
|-------|--------|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, shadcn/ui, Lucide |
| Auth | Clerk (`@clerk/nextjs`, `@clerk/themes`) |
| Data | Supabase + local sandbox fallback |
| Maps | Leaflet / react-leaflet (CARTO light & dark tiles) |
| Charts | Recharts |
| Export | jsPDF, html2canvas, Papa Parse |

---

## Project structure

```text
src/
  app/                 # Routes: dashboard, trips, vehicles, drivers, reports, auth…
  components/
    auth/              # AuthShell branding
    layout/            # Shell, marquee, notification drawer
    maps/              # LiveFleetMap
    ocr/               # License / plate scanners
    ui/                # shadcn primitives
  lib/
    db.ts              # Supabase + sandbox CRUD, approvals, notifications
    mockServices.ts    # GPS, OCR, AI, economics
    roleContext.tsx    # RBAC, sidebars, currency
    clerkAppearance.ts # Clerk theme tokens
docs/
  screenshots/         # README light/dark previews
public/icon/           # Brand logos
```

---

## Getting started

### Prerequisites
- Node.js 20+
- npm
- Clerk application
- (Optional) Supabase project

### Install

```bash
git clone https://github.com/AmanMahadik/Odoo_Hackthon_2K26.git
cd Odoo_Hackthon_2K26
npm install
```

### Environment

Create `.env.local`:

```bash
# App URL (production: https://your-domain.com)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Clerk — paths must point at the app, not Account Portal
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Supabase (optional — empty tables fall back to sandbox)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

In **Clerk Dashboard → Paths**, set Sign-in / Sign-up to your app URLs  
(e.g. `https://odoo.knokvik.app/sign-in`), not `*.accounts.dev`.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
npm start
```

---

## Key workflows

### 1. Dispatch → map
1. **Operations → Trips** → create or open a **Draft** trip  
2. **Dispatch** (vehicle & driver Available, license valid, cargo ≤ capacity)  
3. Vehicle moves to **On Trip**; a route appears on the **live map**  
4. **Complete** / **Cancel** frees assets and stops GPS tracking  

### 2. Driver / vehicle approval
1. Register driver or vehicle with **document upload**  
2. Status stays **Pending / Inactive**  
3. Fleet Manager opens **Notifications → Review**  
4. Compare **image + OCR fields** → **Accept** (Available) or **Reject**  

### 3. Maintenance
1. Open a work order → vehicle **In Shop** (map shows workshop)  
2. Close order → vehicle **Available** again  
3. Boards refresh via live ops events  

---

## Auth notes

- Branded `/sign-in` and `/sign-up` with TransitOps logo and theme-matched Clerk UI  
- Middleware redirects unauthenticated users to **same-origin** `/sign-in` (avoids purple Account Portal)  
- Set `NEXT_PUBLIC_APP_URL` on Vercel to your production domain  

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm run lint` | ESLint |

---

## Screenshots assets

| File | Use |
|------|-----|
| `docs/screenshots/dashboard-light.jpg` | README hero (light GitHub theme) |
| `docs/screenshots/dashboard-dark.jpg` | README hero (dark GitHub theme) |
| `public/icon/light.png` / `dark.png` | In-app brand marks |

---

## License

Private / hackathon project — all rights reserved unless otherwise noted.

---

<p align="center">
  <strong>TransitOps</strong> · Odoo Hackathon 2026 · Built with Next.js, Clerk & shadcn/ui
</p>
