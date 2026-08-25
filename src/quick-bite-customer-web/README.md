# 🛍️ QuickBite Customer Web Application

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.3-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/Zustand-5.0-orange?style=for-the-badge" alt="Zustand" />
  <img src="https://img.shields.io/badge/Leaflet-GPS_Maps-199900?style=for-the-badge&logo=leaflet&logoColor=white" alt="Leaflet" />
</p>

---

## 📌 Overview

**QuickBite Customer Web** is the modern, consumer-facing e-commerce storefront of the QuickBite platform. Built with **Next.js 16 (App Router)** and **React 19**, the application combines **Server-Side Rendering (SSR)** and **React Server Components (RSC)** for lightning-fast initial load times and optimal SEO discovery for restaurants and menus.

The application delivers a fluid consumer experience with **Tailwind CSS v4**, interactive cart customization (variants & multi-toppings) powered by **Zustand**, interactive **Leaflet GPS delivery mapping**, and live order tracking with a 5-stage status stepper.

All API communications are strictly routed through the **API Gateway BFF (Port 3001)**.

---

## 🌟 Key Features

1. **SEO-Optimized Storefront (SSR & RSC):** Restaurant profiles, categories, and menus are rendered on the server, ensuring instant page display and complete search engine indexability.
2. **Interactive Food Customizer & Cart:** Client state managed via **Zustand** (`cart.store.ts`), calculating dynamic pricing for item variants (sizes) and optional topping combinations.
3. **Leaflet GPS Checkout Map Picker (`<CheckoutMapPicker />`):** Interactive map component loaded dynamically to avoid SSR window conflicts, allowing customers to pin their exact delivery coordinates.
4. **Live Order Tracking Stepper (`<OrderStatusStepper />`):** Real-time order progression across 5 visual milestones (`Pending` ➔ `Confirmed` ➔ `Preparing` ➔ `Delivering` ➔ `Completed`), with cancellation and review submission triggers.
5. **Cold-Start Boot Manager (`<ClientBootManager />` + `<BootScreen />`):** Built with **Anime.js 4.5**, visualizes network topology connectivity and polls `GET /api/system/health/wake-up` to seamlessly handle backend container cold-starts on cloud hosting.
6. **Partner Registration Portal:** Seamless onboarding form for restaurants to submit registration requests to the Catalog Request Center.

---

## 🛠️ Technology Stack & Dependencies

| Component | Technology | Description |
|---|---|---|
| **Framework & Runtime** | `Next.js 16.3.0` (App Router) + `React 19.2.8` | Server Components, SEO optimization, and streaming SSR |
| **Language** | `TypeScript 5.x` | End-to-end type safety |
| **Styling** | `Tailwind CSS v4.0` (`@tailwindcss/postcss`) | Utility-first, zero-runtime CSS |
| **Client State Management** | `Zustand 5.0.15` | Fast, lightweight state stores (`cart.store.ts`, `ui.store.ts`) |
| **Interactive Maps** | `Leaflet 1.9.4` & `React Leaflet 5.0.0` | Geospatial GPS coordinate selection |
| **Animations** | `Anime.js 4.5.0` + `Lucide React` | Micro-interactions and cold-start network visualizer |
| **Form Handling** | `React Hook Form 7.85` + `Zod 4.4` | Schema-driven form validation |
| **HTTP Client** | `Axios 1.19.0` / Native `fetch` | API communication with Gateway BFF |

---

## 📂 Project Structure

```
quick-bite-customer-web/
├── app/                                 # Next.js App Router (Pages & Layouts)
│   ├── layout.tsx                       # Root layout with BootScreen & Cart Drawer
│   ├── page.tsx                         # Home Page (Hero, Categories, Featured Restaurants)
│   ├── restaurant/[id]/page.tsx         # Restaurant menu & reviews (SSR)
│   ├── food/[id]/page.tsx               # Food detail & variant/topping customizer
│   ├── checkout/page.tsx                # Checkout form with Leaflet GPS Map Picker
│   ├── order/[orderId]/page.tsx         # Live order tracking stepper
│   ├── order/[orderId]/review/page.tsx  # Review submission page
│   └── partner-registration/page.tsx    # Merchant registration application
├── components/                          # Reusable UI components
│   ├── map/                             # Leaflet CheckoutMapPicker (dynamic import)
│   ├── order/                           # OrderStatusStepper & summary cards
│   ├── common/                          # BootScreen, Header, Footer, Navbar
│   └── ui/                              # Buttons, Inputs, Modals, Badges
├── stores/                              # Zustand state stores (cart.store.ts, ui.store.ts)
├── lib/                                 # API clients, axios config, utilities
└── public/                              # Static assets, icons, illustrations
```

---

## ⚙️ Environment Variables (.env.local)

```env
# Port Configuration
PORT=3002

# API Gateway Base URL (All backend traffic routes through Gateway BFF)
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:3001

# Public Maps / Leaflet Tiles Configuration
NEXT_PUBLIC_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

---

## 🗺️ Page Routes & User Flows

| Route | Render Mode | Description |
|---|---|---|
| `/` | SSR / RSC | Home page: Hero banner, food category filters, top-rated restaurants |
| `/restaurant/[id]` | SSR / RSC | Restaurant detail: Opening status, categorized food menu, ratings & reviews |
| `/food/[id]` | Client Interactive | Item customization modal: Select sizing variants and multiple toppings |
| `/checkout` | Client Interactive | GPS delivery address pinning, order summary, payment selection (COD / Mock) |
| `/order/[orderId]` | Client Live | 5-stage order status stepper with live progression and cancellation options |
| `/order/[orderId]/review` | Client Interactive | Submit ratings (1-5 stars) and review comments for purchased items |
| `/partner-registration` | Client Form | Submit restaurant onboarding application to Admin Review Center |

---

## 🚀 Getting Started

### Prerequisites
* [Node.js 20.11+ LTS](https://nodejs.org/)
* Running **API Gateway (Port 3001)**

### 1. Installation
```bash
npm install
```

### 2. Running in Development
```bash
# Runs on Port 3002
npm run dev -- -p 3002
```
Open `http://localhost:3002` in your browser.

### 3. Production Build
```bash
npm run build
npm run start -- -p 3002
```
