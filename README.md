<div align="center">

# Punched — Digital Loyalty Rewards Platform

**Turn every purchase into a relationship.**

A full-stack loyalty card platform that replaces paper punch cards with real-time digital stamping, instant rewards, and actionable business analytics — all wrapped in a mobile-first PWA.

[![.NET 8](https://img.shields.io/badge/.NET-8.0-512BD4?logo=dotnet)](https://dotnet.microsoft.com/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://docker.com/)
[![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?logo=pwa)](https://web.dev/progressive-web-apps/)

</div>

---

## The Problem

Small and medium businesses lose customers they never hear from again. Paper punch cards get lost, there's zero data on customer behavior, and loyalty programs feel like an afterthought. Meanwhile, customers juggle dozens of physical cards they forget to carry.

## The Solution

**Punched** digitizes the entire loyalty experience. A customer walks in, shows a QR code, gets stamped — and sees it happen **live on their phone** in under a second. Business owners get a real-time dashboard showing exactly who their loyal customers are, which staff members are driving engagement, and when redemption patterns peak.

---

## How It Works

```
Customer shows QR  →  Staff scans it  →  Stamp appears live on customer's phone
        ↑                                           ↓
    QR auto-refreshes                     Reward unlocks automatically
     every 40 seconds                     with countdown timer
```

1. **Customer** opens the app, picks a business, and enrolls in their loyalty program (one tap).
2. At the point of sale, the customer shows their **auto-refreshing QR code**.
3. **Staff** scans it with the built-in camera scanner — stamp is awarded instantly.
4. The customer's phone shows a **live celebration animation** via Server-Sent Events.
5. When all stamps are collected, a **reward unlocks automatically** with a visible countdown.
6. The customer taps **Claim Reward** — done.

---

## Key Features

### For Customers
| Feature | Description |
|---------|-------------|
| **Digital Loyalty Cards** | All cards in one place — no paper, no forgetting |
| **Live Stamp Animations** | See stamps appear in real-time with celebratory overlays |
| **Auto-Refreshing QR Codes** | Cryptographic tokens that rotate every 40 seconds |
| **Reward Countdown Timer** | Know exactly how long you have to claim your reward |
| **Referral System** | Share a link, earn bonus stamps when friends join |
| **Explore & Discover** | Browse local businesses, search by category and name |
| **PWA Install** | Add to home screen — works offline, feels native |

### For Business Owners
| Feature | Description |
|---------|-------------|
| **Real-Time Dashboard** | Today's stamps, active customers, and redemption metrics at a glance |
| **Period Analytics** | Revenue insights across today, 7 days, 30 days, or all time |
| **Customer Management** | Searchable customer list with filtering, sorting, and CSV export |
| **Staff Management** | Link staff accounts, track individual stamp attribution |
| **Loyalty Program Builder** | Set stamp count, reward value, and expiration rules |
| **Referral Program Builder** | Configure referral thresholds, reward types (stamps, discounts, free items) |

### For Staff
| Feature | Description |
|---------|-------------|
| **QR Scanner** | Camera-based scanner to award stamps instantly |
| **Personal Analytics** | See your own stamp count and contribution metrics |
| **Attribution Tracking** | Every stamp is linked to the staff member who awarded it |

### For Platform Admins
| Feature | Description |
|---------|-------------|
| **Global Dashboard** | Platform-wide user, business, and activity metrics |
| **Growth Analytics** | New signups, engagement trends, and churn insights |
| **User & Business Management** | View, edit, suspend, or delete any account |

---

## Tech Stack

### Backend — .NET 8 Web API
| Layer | Technology |
|-------|-----------|
| **Runtime** | .NET 8, C# 12, ASP.NET Core Minimal + Controllers |
| **Database** | PostgreSQL 16 via Entity Framework Core 8 |
| **Auth** | JWT Bearer (access + refresh tokens), BCrypt password hashing |
| **Real-Time** | Server-Sent Events (SSE) via `System.Threading.Channels` |
| **Validation** | FluentValidation |
| **Mapping** | AutoMapper |
| **Email** | MailKit (SMTP in prod, console sink in dev) |
| **Rate Limiting** | ASP.NET Core built-in (OTP: 3/15min, Login: 5/30min) |
| **Performance** | Output caching, response compression (Brotli + Gzip), split queries |
| **API Docs** | Swagger / OpenAPI (dev environment) |
| **Logging** | Serilog (structured, console sink) |

### Frontend — Next.js 14 PWA
| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router, standalone output) |
| **Language** | TypeScript 5.5 |
| **State** | Zustand (auth store, theme store) |
| **Data Fetching** | Axios + custom request deduplication cache |
| **Forms** | React Hook Form + Zod validation |
| **Charts** | Recharts |
| **QR** | `@zxing/browser` (scanning), `qrcode.react` (generation) |
| **Real-Time** | Native EventSource API with exponential backoff reconnection |
| **Styling** | Tailwind CSS, CSS custom properties (theming) |
| **PWA** | Service Worker (network-first + stale-while-revalidate), Web App Manifest |
| **Icons** | Lucide React |

### Infrastructure
| Component | Technology |
|-----------|-----------|
| **Containers** | Docker (multi-stage Alpine builds) |
| **Orchestration** | Docker Compose |
| **Database** | PostgreSQL 16 (auto-migrated on startup) |
| **CI/CD** | Docker-ready with health checks |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Client (PWA)                          │
│  Next.js 14 · TypeScript · Tailwind · Zustand · Recharts   │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐   │
│  │ Customer │ │ Business │ │  Staff   │ │    Admin      │   │
│  │Dashboard │ │Dashboard │ │Dashboard │ │  Dashboard    │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬────────┘   │
│       │             │            │               │           │
│       └─────────────┴────────────┴───────────────┘           │
│                          │  HTTPS / SSE                      │
└──────────────────────────┼──────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                    API Gateway                               │
│  .NET 8 · JWT · Rate Limiting · CORS · Compression           │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  11 Controllers · 50+ Endpoints · 4 Role Policies    │    │
│  │  Auth · Users · Businesses · Programs · Cards         │    │
│  │  QR · Stamps · Redemptions · Referrals · SSE · Admin  │    │
│  └──────────────────────────────────────────────────────┘    │
│                          │                                   │
│  ┌──────────┐  ┌─────────┐  ┌────────────┐  ┌───────────┐   │
│  │ Services │  │ Repos   │  │ Validators │  │ Mappings  │   │
│  └────┬─────┘  └────┬────┘  └────────────┘  └───────────┘   │
│       └──────────────┘                                       │
│                │                                             │
└────────────────┼─────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │  PostgreSQL 16  │
        │   12 Tables     │
        │   Auto-Migrate  │
        └─────────────────┘
```

---

## Real-Time Stamping (SSE)

The signature feature of Punched is **instant visual feedback** when a stamp is awarded.

```
Staff scans QR
      │
      ▼
POST /v1/stamps/award
      │
      ├── Validate QR token (SHA-256 hash, 45s TTL, single-use)
      ├── Increment stamp count on card
      ├── Create immutable Stamp audit record
      ├── Check reward threshold → auto-unlock if met
      ├── Trigger referral qualification (if first stamp)
      │
      ▼
SseService.PublishAsync(cardId, event)
      │
      ▼
System.Threading.Channels → EventSource stream
      │
      ▼
Customer's phone:
  ├── Stamp grid pulses with ripple animation
  ├── Full-screen celebration overlay (3-phase: slam → detail → reward)
  ├── Progress dots update live
  └── QR code auto-regenerates for next scan
```

**Security**: QR tokens are cryptographically random, SHA-256 hashed in the database, scoped to a single business, and expire after 45 seconds. Each token can only be used once (enforced by a unique database constraint).

---

## Referral Engine

Punched includes a built-in viral growth engine:

1. **Business** configures a referral program (e.g., "Refer 3 friends → get a free coffee")
2. **Customer** generates a unique 8-character referral link
3. **Friend** clicks the link → auto-enrolls in the business's loyalty program
4. When the friend earns their **first stamp**, the referral qualifies
5. When the referrer hits the threshold → rewards are auto-distributed

Reward types: **Bonus Stamps**, **Discount**, or **Free Item**.

---

## Dashboards

### Customer Dashboard
- **Explore**: Browse local businesses with search, category filters, and sorting
- **My Cards**: Visual stamp grids, progress bars, reward-ready alerts
- **Card Detail**: Live QR code, SSE-connected stamp counter, reward claim button
- **Notifications**: In-app updates

### Business Owner Dashboard
- **Overview**: Today's stamps, period analytics with Recharts graphs, revenue tracking
- **Customers**: Searchable/filterable list with CSV export, per-customer period stats
- **Staff**: Search, sort, link/manage staff, individual attribution analytics
- **Programs**: Create and manage loyalty programs with reward rules

### Staff Dashboard
- **QR Scanner**: Camera-based scanner with real-time stamp success overlay
- **My Stats**: Personal stamp count and attribution metrics
- **Business Info**: View linked business details

### Admin Dashboard
- **Platform Metrics**: Total users, businesses, stamps, redemptions
- **Growth Charts**: Signup trends, engagement analytics
- **User Management**: Search, view, edit, suspend, or delete accounts
- **Business Management**: Review and manage all businesses

---

## Database Schema

12 entities with full referential integrity:

| Entity | Purpose |
|--------|---------|
| `UserAuth` | Authentication (email, password hash, verification, lockout) |
| `User` | Profile (name, avatar, role, staff linkage) |
| `Business` | Business profile (name, category, location, M-Pesa number) |
| `LoyaltyProgram` | Stamp rules (required count, reward value, expiration) |
| `LoyaltyCard` | Customer enrollment (stamp count, lifetime stats) |
| `Stamp` | Immutable audit log (who, when, which staff, QR token) |
| `QrToken` | Cryptographic scan tokens (SHA-256, 45s TTL, single-use) |
| `Redemption` | Reward claims (status lifecycle, M-Pesa ref) |
| `RefreshToken` | JWT refresh token rotation |
| `ReferralProgram` | Per-business referral rules |
| `ReferralLink` | Per-referrer shareable codes |
| `Referral` | Referral lifecycle tracking (pending → rewarded) |

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- Or for local dev: .NET 8 SDK, Node.js 20+, PostgreSQL 16

### Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/your-org/punched.git
cd punched

# Configure environment
cp .env.example .env
# Edit .env — set DB_PASSWORD and JWT_SECRET at minimum

# Build and run all services
docker compose up --build

# ✅ API:       http://localhost:8080
# ✅ Frontend:  http://localhost:3000
# ✅ Database:  localhost:5432
# ✅ Health:    http://localhost:8080/health
```

The API **auto-migrates** the database and **seeds a default admin account** on first run:
- Email: `admin@gmail.com`
- Password: `@Admin1234`

> Change these credentials immediately in production.

### Local Development (without Docker)

```bash
# API
cd PunchedApi
dotnet restore
dotnet run   # → http://localhost:5091

# Frontend (in a second terminal)
cd punched-pwd
npm install
npm run dev  # → http://localhost:3000
```

### Environment Variables

| Variable | Service | Required | Default |
|----------|---------|----------|---------|
| `DB_PASSWORD` | API | Yes | `changeme` |
| `JWT_SECRET` | API | Yes | — |
| `SMTP_HOST` | API | Prod | `smtp.gmail.com` |
| `SMTP_PORT` | API | Prod | `587` |
| `SMTP_USER` | API | Prod | — |
| `SMTP_PASS` | API | Prod | — |
| `SMTP_FROM` | API | Prod | `noreply@punched.app` |
| `NEXT_PUBLIC_API_URL` | Web | Yes | `http://localhost:8080/v1` |

---

## Docker Architecture

Both images use **multi-stage Alpine builds** for minimal footprint:

| Image | Base | Size (approx.) | Health Check |
|-------|------|-----------------|-------------|
| `api` | `dotnet/aspnet:8.0-alpine` | ~90 MB | `GET /health` |
| `web` | `node:20-alpine` (standalone) | ~120 MB | `GET /` |
| `db` | `postgres:16-alpine` | ~80 MB | `pg_isready` |

All containers run as **non-root users** with dedicated `punched` user/group.

```
docker-compose.yml
├── db   (PostgreSQL 16 Alpine, persistent volume)
├── api  (.NET 8 Alpine, depends on db health)
└── web  (Next.js standalone, depends on api health)
```

---

## API Endpoints Overview

**50+ RESTful endpoints** across 11 controllers, all versioned under `/v1`:

| Controller | Endpoints | Auth | Key Features |
|------------|-----------|------|-------------|
| **Auth** | 8 | Public/Bearer | Register, verify, login, refresh, password reset |
| **Users** | 2 | Bearer | Profile get/update |
| **Businesses** | 15 | Mixed | CRUD, customers, staff, dashboard, analytics |
| **Programs** | 5 | Business | Loyalty program CRUD |
| **Cards** | 4 | Customer | Enroll, list, detail |
| **QR** | 1 | Customer | Generate cryptographic tokens |
| **Stamps** | 1 | Business/Staff | Award with full audit trail |
| **Redemptions** | 2 | Customer | Claim reward, list history |
| **Referrals** | 9 | Mixed | Programs, links, resolve, stats |
| **SSE** | 1 | Customer | Real-time stamp event stream |
| **Admin** | 14 | Admin | Platform-wide management |

**Security**: JWT Bearer auth with role-based access (Customer, Business, Staff, Admin), rate limiting on sensitive endpoints, BCrypt password hashing, and cryptographic QR token validation.

---

## Project Structure

```
punched/
├── docker-compose.yml          # Orchestration
├── .env.example                # Environment template
│
├── PunchedApi/                 # .NET 8 Web API
│   ├── API/Controllers/        # 11 REST controllers
│   ├── Application/
│   │   ├── DTOs/               # Request/response models
│   │   ├── Services/           # Business logic
│   │   ├── Validators/         # FluentValidation rules
│   │   └── Mappings/           # AutoMapper profiles
│   ├── Domain/
│   │   ├── Entities/           # 12 EF Core entities
│   │   └── Interfaces/         # Service contracts
│   ├── Infrastructure/
│   │   ├── Data/               # DbContext, configurations
│   │   ├── Repositories/       # Generic + unit of work
│   │   └── Services/           # Email, SSE, cleanup
│   ├── Migrations/             # EF Core migrations
│   └── Dockerfile
│
├── punched-pwd/                # Next.js 14 PWA
│   ├── app/
│   │   ├── (auth)/             # Login, register, verify, reset
│   │   ├── dashboard/          # Role-based dashboards
│   │   └── refer/              # Referral deep link handler
│   ├── components/
│   │   ├── loyalty/            # QR scanner, stamp overlays
│   │   └── ui/                 # FilterSheet, PWA prompt
│   ├── hooks/                  # useSSE, useAuth, useRoleGuard
│   ├── lib/api/                # Typed API clients
│   ├── store/                  # Zustand stores
│   ├── types/                  # TypeScript interfaces
│   └── Dockerfile
│
└── overview/                   # Design docs & UI specs
```

---

## Security Highlights

- **QR tokens**: SHA-256 hashed, 45-second TTL, single-use, business-scoped
- **JWT**: Short-lived access tokens (60 min) + rotating refresh tokens (30 days)
- **Password**: BCrypt with automatic rehashing
- **Rate limiting**: IP-based throttling on OTP, login, and general endpoints
- **CORS**: Configurable allowed origins (env-driven for Docker)
- **Non-root containers**: Both API and web run as unprivileged users
- **Input validation**: FluentValidation (backend) + Zod (frontend)
- **SSE auth**: Token passed via query parameter (EventSource limitation), validated server-side

---

## License

This project is proprietary. All rights reserved.
# Punched-Customer-Loyalty-Reward-SaaS
