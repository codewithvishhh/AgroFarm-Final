# AgroFarm

**Smart Agricultural Supply Chain Platform** — real-time tracking and logistics
optimization for farm produce, built for Hack2Ignite problem **G-05**.

## Overview

AgroFarm follows a load of produce from the farm gate to the retail shelf. A
farmer raises a request, the collection team accepts it and assigns a pickup,
the warehouse stores it and records every quantity movement, transport moves it
with live GPS and cold chain readings, and the retailer sees it arrive against a
demand forecast. Emergencies on the road pull up the nearest warehouse,
transport hub, and retailer with a distance and an ETA.

Every number on screen comes from the backend and the database. Nothing is
hard-coded in the frontend.

## Problem statement

| Challenge | AgroFarm response |
| --- | --- |
| GPS and data availability | GPS fields on every shipment, fed by a simulated vehicle stream |
| Poor internet connectivity | Dashboard payloads cached in the browser with an offline indicator |
| Inaccurate predictions | Forecasts built from recorded daily demand plus live state |
| High sensor cost | Temperature and humidity simulated behind a service seam |
| Route changes | Route service isolated so a routing engine can drop in |
| Poor supply chain visibility | Supply chain control dashboard across the network |
| Warehouse inefficiency | Smart warehouse allocation with explainable scoring |
| Emergency vehicle problems | Emergency records, nearby facility lookup, assistance requests |
| Demand uncertainty | Seven day demand forecast per produce type |
| Inventory tracking | Stock plus an immutable inventory track record |

## Features

- Name and role sign-in with five roles and a dashboard per role
- Farmer produce requests with the full farm to retail lifecycle shown visually
- Collection desk: accept, assign pickup, record collected quantity, send onward
- Warehouse capacity, current inventory, and a filterable inventory history
- Smart warehouse allocation with per-candidate scores and reasons
- Transport fleet dashboard, live map with rotated truck icons, emergencies
- Simulated GPS movement with interpolation, speed, bearing, and ETA
- Simulated temperature and humidity per produce, with configurable bands
- Emergency response with nearby warehouse, transport hub, and retailer
- Alert centre with severity and type filters, mark read, and resolve
- Demand forecasting chart with expected demand, recommended stock, shortage,
  and surplus
- Retailer view of incoming loads, shelf stock, and what to order
- AI operations assistant powered by Gemini; the API key stays on the backend
- Offline caching, offline indicator, toasts, loading and empty states

## Architecture

```
React + Vite + TypeScript          FastAPI + SQLAlchemy + Pydantic
┌───────────────────────┐  REST    ┌────────────────────────────────┐
│ role-based dashboards │ ───────▶ │ api/      routers per resource │
│ Leaflet truck map     │          │ services/ business rules       │
│ Recharts charts       │ ◀─────── │ simulator/ vehicle + telemetry │
│ offline cache         │  WS      │ websocket/ manager + events    │
└───────────────────────┘          └────────────────────────────────┘
                                             │
                                   PostgreSQL or SQLite
```

## Tech stack

Frontend: React 18, Vite, TypeScript, Tailwind CSS, React Router, Axios,
Recharts, Leaflet with OpenStreetMap tiles, Lucide icons, Framer Motion.

Backend: Python 3.11, FastAPI, SQLAlchemy 2, Pydantic v2, WebSockets, Uvicorn.

Database: PostgreSQL through docker-compose, SQLite as the local fallback. The
models are plain SQLAlchemy, so both work unchanged.

## Role-based system

| Role | Lands on | Can do |
| --- | --- | --- |
| Farmer | Farmer dashboard | Raise produce requests, track them, see value delivered |
| Collection | Collection dashboard | Accept requests, assign pickup, record collection, send to warehouse |
| Warehouse | Warehouse dashboard | Capacity, inventory, history, allocation, forecast |
| Transport | Transport dashboard | Fleet, live map, dispatch, emergencies, control tower |
| Retailer | Retailer dashboard | Incoming loads, stock, demand forecast, live tracking |

Sign-in takes a name and a role. There is no password: this is a prototype.

## Database structure

| Table | Holds |
| --- | --- |
| `shipments` | Produce load, route, GPS, status, stage, collection status, sensors |
| `vehicles` | Truck, driver, capacity, status, last known position |
| `warehouses` | Capacity, free space, utilization, storage type, coordinates |
| `collection_points`, `retailers`, `farmers` | Network nodes with coordinates |
| `inventory_items` | Current stock per warehouse and produce type |
| `inventory_transactions` | One row per movement, with the balance after it |
| `demand_records` | Daily demand history used by the forecasting service |
| `emergencies` | Type, GPS, severity, status, nearest facilities, responder |
| `alerts`, `notifications`, `telemetry` | Alert centre, feed, sensor history |

## API endpoints

```
GET    /api/health

POST   /api/auth/login              GET  /api/auth/roles
GET    /api/shipments               POST /api/shipments
GET    /api/shipments/{id}          PATCH /api/shipments/{id}
POST   /api/shipments/{id}/assign-vehicle
POST   /api/shipments/{id}/dispatch
POST   /api/shipments/{id}/collection
GET    /api/shipments/{id}/telemetry | /route | /spoilage-risk

GET    /api/vehicles                GET  /api/vehicles/fleet-status
PATCH  /api/vehicles/{id}/status

GET    /api/warehouses              POST /api/warehouses/allocate
GET    /api/retailers | /api/collection-points | /api/farmers

GET    /api/inventory               GET  /api/inventory/history
POST   /api/inventory/movements     GET  /api/inventory/low-stock

GET    /api/alerts                  PATCH /api/alerts/{id}/read | /resolve
GET    /api/emergencies             POST /api/emergencies
POST   /api/emergencies/{id}/assistance
PATCH  /api/emergencies/{id}/status
GET    /api/emergencies/nearby/facilities

GET    /api/forecast                GET  /api/forecast/produce | /summary
GET    /api/telemetry               POST /api/telemetry/simulator/start | /stop
GET    /api/notifications           POST /api/notifications/read-all
GET    /api/dashboard/stats | /analytics | /role/{role}
```

Interactive docs: `http://localhost:8000/docs`.

## WebSocket architecture

One channel at `ws://localhost:8000/ws/live`. `websocket/manager.py` keeps the
client set and broadcasts; `websocket/events.py` names the events:

```
VEHICLE_LOCATION_UPDATED   SHIPMENT_CREATED     SHIPMENT_UPDATED
TELEMETRY_UPDATED          ALERT_CREATED        EMERGENCY_CREATED
EMERGENCY_UPDATED          INVENTORY_UPDATED    NOTIFICATION_CREATED
```

The frontend keeps one socket with backoff reconnect and fans events out to the
pages that need them.

## Running locally

### Docker (PostgreSQL included)

```bash
docker compose up --build
```

Frontend on `http://localhost:5173`, API on `http://localhost:8000`.

### Backend by hand

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

### Frontend by hand

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The database is created and seeded on first start. Delete `backend/agrofarm.db`
to reseed.

## Environment variables

`backend/.env`

| Name | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///./agrofarm.db` | SQLAlchemy URL, Postgres also works |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma separated allowed origins |
| `SIMULATOR_ENABLED` | `true` | Start the movement simulator at boot |
| `SIMULATOR_TICK_SECONDS` | `3` | Seconds between GPS updates |
| `SIMULATOR_SPEED_FACTOR` | `180` | Simulated seconds per real second |
| `SEED_DEMO_DATA` | `true` | Seed demo rows when the database is empty |

`frontend/.env`

| Name | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:8000` | REST base URL |
| `VITE_WS_URL` | `ws://localhost:8000/ws/live` | Live channel |

The assistant uses Google's hosted Gemini API so it also works when the app is
deployed. Create an API key in Google AI Studio, then set `GEMINI_API_KEY` in
`backend/.env` for local development and in the backend service's environment
settings for production (Render: **Dashboard → agrofarm-api → Environment**).
Never put the key in the frontend or commit it. `GEMINI_MODEL` defaults to
`gemini-2.5-flash`. The assistant does not read live dashboard records.

## Demo roles

No passwords. Enter any name and pick a role.

| Name | Role | Opens |
| --- | --- | --- |
| Rahul | Farmer | Farmer dashboard |
| Sunita | Collection | Collection desk |
| Anil | Warehouse | Warehouse and inventory |
| Imran | Transport | Fleet, live map, emergencies |
| Priya | Retailer | Store view and demand forecast |

## Demo script

1. Sign in as a Farmer and raise a produce request.
2. Sign in as Collection, accept it, assign a pickup, record the quantity, send
   it to a warehouse.
3. Sign in as Transport, dispatch it, and watch the truck move on the live map
   with its bearing, speed, ETA, and sensor readings.
4. Report an emergency and contact the nearest facility.
5. Sign in as Warehouse to see the inventory and its track record, and run the
   allocation recommendation.
6. Sign in as Retailer to see the incoming load and the demand forecast.

## Project structure

```
agrofarm/
├── backend/
│   ├── app/
│   │   ├── analytics/     aggregates for the dashboards
│   │   ├── api/           one router per resource
│   │   ├── database/      session, init, seed
│   │   ├── ml/            reserved for future models
│   │   ├── models/        SQLAlchemy models
│   │   ├── notifications/ notification creation and push
│   │   ├── schemas/       Pydantic request and response models
│   │   ├── services/      business rules and scoring
│   │   ├── simulator/     vehicle_simulator, telemetry_simulator
│   │   └── websocket/     manager, events, routes
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   └── src/
│       ├── components/    map, tables, dialogs, shared UI
│       ├── hooks/         auth, live feed, fetch with cache, offline
│       ├── layouts/       app shell
│       ├── pages/         one file per route, dashboards per role
│       ├── services/      api client, socket, cache
│       ├── types/         shared TypeScript types
│       └── utils/         formatting and navigation config
├── docker-compose.yml
├── README.md
└── .gitignore
```

## Future AI/ML integration

Today's implementations are statistical or rule based, and each sits behind its
own service so a model can replace it without touching the API or the UI.

| Service | Today | Later |
| --- | --- | --- |
| `eta_prediction_service.py` | Distance over current speed | Learned ETA from historical trips |
| `demand_forecasting_service.py` | Weighted moving average with trend | Time series or gradient boosted model |
| `warehouse_allocation_service.py` | Weighted scoring | Learned ranker over the same features |
| `route_optimization_service.py` | Straight-line sampling | OSRM or Valhalla with dynamic re-routing |
| `spoilage_prediction_service.py` | Band rule per produce | Shelf-life model on sensor history |

Also possible on the same structure: predictive maintenance from vehicle
telemetry and supply-demand optimization across warehouses.

## Known limitations

- Sign-in has no password and issues no token. Do not deploy as is.
- GPS movement, temperature, and humidity are simulated, not real devices.
- Routes are straight-line interpolations, not road geometry.
- The WebSocket hub is in-process, so it holds for one API instance.
- Tables are created with `create_all`; there are no migrations yet.
- Forecasting is statistical. It is never described as AI in the product.

## Nearby Big Markets and Retailer Price Comparison

**Nearby Big Markets.** Every map (Control Tower, Tracking, Shipment detail, and the Transport, Collection, and Retailer dashboards) has a **📍 Nearby Big Markets** toggle in its top-right corner. Switching it on adds market markers (square stall pins) for major agricultural markets within about 100 km of the farm pickup points shown on that map. Existing trucks, routes, and pickup/drop markers stay as they are. Each market popup lists name, location, approximate distance, market type, main commodities, and trading days. The market list is **sample data** in `frontend/src/data/nearbyMarkets.ts`; replace `loadMarkets()` with an API call to go live. Distance maths lives in `frontend/src/utils/geo.ts`.

**Retailer Price Comparison.** The Farmer Dashboard has a section that compares buying prices from retailers for a chosen product. It works out the highest offer, total value (price per kg × quantity), price difference, and potential extra revenue for the farmer's own quantity, and lets the farmer compare any two retailers. Offers are **sample data** in `frontend/src/data/retailerOffers.ts` (18 records, 5 retailers); replace `loadRetailerOffers()` with an API call to go live.

## Farmer Dashboard: Listen, Language, and Local & Foreign Demand

**🌐 Language.** A language selector at the top of the Farmer Dashboard switches between English, हिन्दी, and मराठी. The shared language state lives in `frontend/src/i18n/LanguageProvider.tsx` (mounted in `main.tsx`), and the choice is remembered in the browser. Translations are keyed by the English text in `frontend/src/i18n/translations.ts`, so any string without a translation falls back to English. English copy is unchanged.

**🔊 Listen.** The Listen button reads a plain-language summary of the dashboard aloud in the selected language: stats, demand for the selected product, and the best retailer offer. It uses the browser's built-in Web Speech API (`frontend/src/i18n/speech.ts`), with no network calls and no extra dependency. If a device has no Marathi voice, it falls back to a Hindi voice. Press the button again to stop.

**🇮🇳 Local and 🌍 Foreign Demand.** This section shows estimated demand, available supply, main local markets, and top export countries for the selected product. The demand level (High, Medium, or Low) is calculated from the demand-to-supply ratio. The product selection is shared with Retailer Price Comparison and the spoken summary. The data is **sample data** in `frontend/src/data/productDemand.ts`; replace `loadProductDemand()` with an API call to go live.

**Pie Chart view.** Every existing chart can now switch between its original view (the default) and a Pie Chart of the same data, via `frontend/src/components/ChartViewToggle.tsx`. This covers Control Tower shipment status, Warehouse inventory, Forecast demand, shipment telemetry (readings grouped by temperature range), and Retailer price per kg.

## Farming Improvement and Crop Problem Solver

Farmers see two new sidebar items right after **Alerts**.

**Farming Improvement** (`/farming-improvement`). The farmer enters field area in sq. ft. and picks a crop. The page works out, for that area:
- farmyard manure;
- Urea, SSP, and MOP amounts, derived from the crop's per-acre N:P₂O₅:K₂O rate;
- when to apply nitrogen;
- litres per watering and how often;
- plant count or seed amount;
- crop-care tips.

Area is also shown in acres, guntha, and m². Rates are in `frontend/src/data/farmingGuide.ts`.

**Crop Problem Solver** (`/crop-problem-solver`). The farmer picks a problem, such as yellow tomatoes, brown leaves, wilting, yellow leaves, pest attack, water-related problems, black fruit bottom, leaf curl, white powder, or fruit cracking. An optional crop filter narrows the list. The page shows likely causes, how to check each one, step-by-step remedies, and prevention. Content is in `frontend/src/data/cropProblems.ts`.

Both pages give general guidance only. They point farmers to a soil test and the local KVK for exact doses.
