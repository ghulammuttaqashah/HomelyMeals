# HomelyMeals 🍱

A full-stack, multi-role home-food delivery platform connecting home cooks with local customers. Built with **Node.js / Express / MongoDB** on the back end and **React + Vite + Tailwind CSS** on the front end.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Running Locally](#running-locally)
- [API Reference](#api-reference)
- [ABSA – Aspect-Based Sentiment Analysis](#absa--aspect-based-sentiment-analysis)
- [Order Lifecycle](#order-lifecycle)
- [Known Issues & Roadmap](#known-issues--roadmap)

---

## Overview

HomelyMeals has three user roles, each served by a dedicated React app:

| Role | Port | Description |
|------|------|-------------|
| **Customer** | 5173 | Browse cooks, place orders, chat, leave reviews |
| **Cook** | 5174 | Manage menu, process orders, view reviews & ABSA insights |
| **Admin** | 5175 | Manage users, handle complaints, configure delivery charges |

The back-end REST API + WebSocket server runs on **port 5000**.

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Backend | Node.js, Express 5, MongoDB (Mongoose), Socket.IO, node-cron, nodemailer, JWT, bcryptjs |
| Frontend | React 19, React Router 7, Vite 7, Tailwind CSS 3, Socket.IO Client, Recharts, Leaflet |
| Auth | JWT stored in HTTP-only cookies (separate tokens per role) |
| Real-time | Socket.IO – chat messages, order status notifications |

---

## Project Structure

```
HomelyMeals/
├── server/                    # Express backend (port 5000)
│   ├── modules/
│   │   ├── admin/             # Admin controllers, models, routes
│   │   ├── cook/              # Cook controllers, models, routes
│   │   └── customer/          # Customer controllers, models, routes
│   ├── shared/
│   │   ├── config/            # DB connection, environment variables
│   │   ├── jobs/              # Cron jobs (auto-cancel stale orders, etc.)
│   │   ├── middleware/        # JWT auth middleware
│   │   ├── models/            # Shared Mongoose schemas (Order, Review, Chat, …)
│   │   └── utils/             # Email, Socket.IO, distance calc, ABSA
│   └── server.js
├── customer/                  # React app – customer UI (port 5173)
├── cook/                      # React app – cook UI (port 5174)
├── admin-ui/                  # React app – admin UI (port 5175)
├── orderlifecyle.ini          # ASCII state diagram for order & payment flows
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **MongoDB** (local instance or MongoDB Atlas connection string)
- **npm** ≥ 9

### Environment Variables

Copy the example files and fill in your values:

```bash
cp server/.env.example        server/.env
cp customer/.env.example      customer/.env
cp cook/.env.example          cook/.env
cp admin-ui/.env.example      admin-ui/.env
```

See each `.env.example` file for the required variables.

### Running Locally

Open four terminal windows (or use a tool like `concurrently`):

```bash
# Terminal 1 – backend
cd server && npm install && npm run dev

# Terminal 2 – customer app
cd customer && npm install && npm run dev

# Terminal 3 – cook app
cd cook && npm install && npm run dev

# Terminal 4 – admin app
cd admin-ui && npm install && npm run dev
```

---

## API Reference

Base URL: `http://localhost:5000/api`

### Customer (`/api/customer`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/signup/request` | — | Request OTP for signup |
| POST | `/auth/signup/verify` | — | Verify OTP & create account |
| POST | `/auth/signin` | — | Login |
| GET | `/auth/me` | ✅ | Get current customer |
| POST | `/auth/signout` | ✅ | Logout |
| PUT | `/auth/profile` | ✅ | Update profile |
| POST | `/auth/addresses` | ✅ | Add delivery address |
| GET | `/meals/cooks` | — | List active cooks |
| GET | `/meals/cook/:cookId` | — | Get a cook's menu |
| POST | `/orders` | ✅ | Place order |
| GET | `/orders` | ✅ | My orders |
| GET | `/orders/:id` | ✅ | Order detail |
| POST | `/orders/:id/payment-proof` | ✅ | Upload payment proof |
| POST | `/orders/:id/request-cancellation` | ✅ | Request cancellation |
| GET | `/chats` | ✅ | My conversations |
| GET | `/chats/cook/:cookId` | ✅ | Get/create chat thread |
| POST | `/chats/cook/:cookId/message` | ✅ | Send message |
| POST | `/reviews` | ✅ | Submit review (ABSA runs automatically) |
| GET | `/reviews/cook/:cookId` | — | Reviews for a cook |
| GET | `/reviews/cook/:cookId/absa` | — | ABSA summary for a cook |
| GET | `/reviews/meal/:mealId` | — | Reviews for a meal |
| GET | `/reviews/my-reviews` | ✅ | My reviews |
| PUT | `/reviews/:reviewId` | ✅ | Update review (ABSA re-runs) |
| DELETE | `/reviews/:reviewId` | ✅ | Delete review |
| POST | `/complaints` | ✅ | File complaint |
| GET | `/complaints` | ✅ | My complaints |

### Cook (`/api/cook`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/signup/request` | — | Request OTP |
| POST | `/auth/signin` | — | Login |
| PUT | `/auth/profile` | ✅ | Update profile & location |
| POST | `/documents` | ✅ | Upload verification docs |
| POST | `/meals/add` | ✅ | Add meal |
| PUT | `/meals/update/:mealId` | ✅ | Update meal |
| GET | `/orders` | ✅ | Incoming orders |
| POST | `/orders/:id/accept` | ✅ | Accept order |
| POST | `/orders/:id/reject` | ✅ | Reject order |
| POST | `/orders/:id/mark-preparing` | ✅ | Mark preparing |
| POST | `/orders/:id/out-for-delivery` | ✅ | Mark out-for-delivery |
| GET | `/reviews` | ✅ | My reviews (includes ABSA summary) |
| GET | `/reviews/stats` | ✅ | Review stats widget |
| GET | `/reviews/absa-summary` | ✅ | ABSA insights |
| GET | `/chats` | ✅ | Customer conversations |
| POST | `/chats/customer/:customerId/message` | ✅ | Reply to customer |
| GET | `/sales` | ✅ | Sales data |
| GET | `/dashboard` | ✅ | Dashboard stats |
| POST | `/complaints` | ✅ | File complaint |

### Admin (`/api/admin`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | — | Login + OTP |
| GET | `/customers` | ✅ | List customers |
| GET | `/cooks` | ✅ | List cooks |
| POST | `/cooks/:id/verify` | ✅ | Approve/reject cook |
| GET | `/cook-documents/:cookId` | ✅ | Cook documents |
| GET | `/orders` | ✅ | All orders |
| GET | `/complaints` | ✅ | All complaints |
| PUT | `/delivery-charges` | ✅ | Update delivery config |

---

## ABSA – Aspect-Based Sentiment Analysis

HomelyMeals automatically analyses every written review using a **keyword-based Aspect-Based Sentiment Analysis** engine (`server/shared/utils/absa.js`).

### Detected Aspects

| Aspect key | Label | Example keywords |
|-----------|-------|-----------------|
| `food_quality` | Food Quality | taste, delicious, fresh, bland, burnt |
| `delivery` | Delivery | fast, slow, late, on time, delayed |
| `packaging` | Packaging | packed, spilled, sealed, container |
| `quantity` | Quantity | portion, generous, small, serving |
| `value` | Value for Money | price, expensive, affordable, worth |
| `service` | Service | friendly, rude, helpful, professional |

### Sentiment Classification

For each detected aspect the engine scans the relevant sentences and classifies sentiment as:
- 😊 **positive** – more positive signal words than negative
- 😟 **negative** – more negative signal words than positive
- 😐 **neutral** – balanced or no strong signal

### Where it shows up

- **Cook → My Reviews** – an *Aspect Insights* panel aggregates all review mentions into per-aspect positive/negative/neutral bars, plus individual aspect chips on each review card.
- **Customer → Cook Reviews modal** – each review card shows colour-coded aspect chips (e.g. *😊 Food Quality*, *😟 Delivery*).
- **API** – `GET /api/customer/reviews/cook/:cookId/absa` and `GET /api/cook/reviews/absa-summary` return raw `aspectSummary` arrays for custom dashboards.

---

## Order Lifecycle

See `orderlifecyle.ini` for the full ASCII state diagram. Summary:

```
confirmed → preparing → out_for_delivery → delivered
         ↘ rejected
         ↘ cancelled
```

Payment methods: **Cash on Delivery (COD)** or **Online** (payment proof upload required).

---

## Known Issues & Roadmap

- [ ] No image upload integration (Cloudinary/S3 placeholder)
- [ ] No push notifications (planned: Web Push API)
- [ ] No TypeScript – migration would improve type safety
- [ ] No automated tests – Jest + React Testing Library recommended
- [ ] No Docker / CI-CD pipeline
- [ ] No API rate limiting or input sanitisation middleware
- [ ] ABSA currently keyword-based – upgrade path: fine-tuned BERT model via Python microservice
