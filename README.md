# ⚡ NearWork — On-Demand Home Services Marketplace

NearWork is a production-ready home services marketplace connecting customers with nearby verified service workers (Electricians, Plumbers, AC Techs, Deep Cleaners, Appliance Repair, and Tank Cleaning).

---

## 🏛️ System Architecture

NearWork features **three completely separated interfaces** communicating with a unified backend:

1. **Customer App** (`http://localhost:3100`): Service browsing, address management, instant time-slot booking, Razorpay payment, live worker GPS tracking with real-time ETA, start OTP PIN, extra work approval, and in-app chat.
2. **Worker Partner App** (`http://localhost:3101`): Worker onboarding with KYC upload, online/offline status toggle, 30-second job acceptance modal with distance & earnings, GPS en-route broadcasting, geofenced arrival check (within 150m), OTP service unlocking, service timer, extra work requests, and bank payout withdrawals.
3. **Admin Command Center** (`http://localhost:3102`): Business analytics & KPIs, live operations map of all on-duty workers & active jobs, worker KYC document verification (Approve/Reject), bookings dispatch & reassignment, services pricing catalog, coupons, and payout disbursements.
4. **Backend API & Real-Time Engine** (`http://localhost:5000`): Express + TypeScript + Prisma ORM + Socket.IO + Razorpay HMAC SHA256 verification + Haversine Geofencing.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js 18+ (Node 20 or 24 recommended)
- npm 9+

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Database & Seed Initial Catalog
```bash
npm run prisma:migrate
npm run prisma:seed
```

### 4. Start Full Stack Applications Concurrently
```bash
npm run dev
```

This starts:
- **Customer App**: `http://localhost:3100`
- **Worker App**: `http://localhost:3101`
- **Admin Dashboard**: `http://localhost:3102`
- **Backend API**: `http://localhost:5000`

---

## 🔑 Demo Test Credentials

| Portal | URL | Demo Account | Password | Role / Access |
| :--- | :--- | :--- | :--- | :--- |
| **Customer App** | `http://localhost:3100` | `customer@nearwork.com` | `password123` | Active customer with saved Gorakhpur Address |
| **Worker App** | `http://localhost:3101` | `worker1@nearwork.com` | `password123` | Verified Electrician & AC Specialist (Online) |
| **Worker App** | `http://localhost:3101` | `worker2@nearwork.com` | `password123` | Verified Deep Cleaning & Plumber (Online) |
| **Worker App** | `http://localhost:3101` | `worker3@nearwork.com` | `password123` | Pending KYC Document Review |
| **Admin Dashboard** | `http://localhost:3102` | `admin@nearwork.com` | `password123` | Super Admin Platform Access |

---

## 🧪 Running Automated Tests
```bash
npm run test
```
Tests cover:
- Haversine distance calculations & ETA estimations
- Geofence arrival verification (150m boundary enforcement)
- Cryptographic 4-digit Service PIN OTP generation
- JWT Access & Refresh Token rotation with strict RBAC role enforcement
