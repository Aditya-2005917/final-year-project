# AURA Estate – AI-Powered MMR Property Price Prediction

**AURA Estate** is a full-stack intelligent real-estate platform that estimates property prices across the **Mumbai Metropolitan Region (MMR)** using an XGBoost model trained on secondary-market transaction data, combined with micro-market features, comparable listings, and infrastructure context.

---

## Features

### Core Valuation Engine
- AI-powered price prediction for apartments, villas, independent houses & penthouses
- Multi-tier valuation bands (Fair Market / Premium / Brand)
- Locality-aware market calibration (mid-2026 secondary market levels)
- Price-per-sq.ft comparison against micro-market & city averages
- Comparable property matching with similarity scoring

### User Features
- Guest mode & full authenticated access
- Valuation history / portfolio tracking
- Save reports to watchlist
- Download professional PDF valuation reports
- Email reports directly
- Shareable public report links
- What-If simulator (adjust area, BHK, age, furnishing)

### AI Advisor (Chat)
- Conversational real-estate broker persona (powered by Groq / Llama)
- Intent detection for valuations, locality recommendations & budget queries
- Injects live comparable listings + ML valuation context into responses

### Top Properties Explorer
- Filterable secondary-market listings (BHK, furnishing, age, locality, price)
- Live stats (median price, avg area, ₹/sq.ft)
- Quick “Value this” prefill into the valuation terminal

### Admin Console
- Dashboard stats (users, predictions, chats, reports)
- User management (role change, ban / unban)
- Valuation & chat history inspection
- CSV export

---

## Tech Stack

| Layer              | Technology                                      |
|--------------------|-------------------------------------------------|
| Frontend           | React + Vite, Tailwind CSS, Framer Motion, Recharts, Leaflet, React Markdown |
| Backend            | Flask (Blueprints), JWT Auth, CORS              |
| ML / Inference     | XGBoost, scikit-learn Pipeline, joblib, pandas, numpy |
| Database           | PostgreSQL (pgvector image)                     |
| Auth               | JWT + bcrypt, OTP email verification, password reset |
| Email              | SMTP (Gmail)                                    |
| Chat LLM           | Groq API (`llama-3.1-8b-instant`)               |

---

## Project Structure
final-year-project/
├── backend/
│   ├── app/
│   │   ├── routes/          # auth, predict, chat, history, admin, reports, properties...
│   │   ├── services/        # model_service, chat_services, pdf_service...
│   │   ├── utils/           # auth_middleware, market_calibration, email_services
│   │   ├── config.py
│   │   └── database_setup.py
│   ├── run.py
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/      # PredictForm, Navbar, charts, maps...
│   │   ├── pages/           # Auth, Predict, History, Chat, Admin, TopProperties...
│   │   ├── services/        # API wrappers
│   │   └── App.jsx
│   └── ...
├── ml/
│   ├── data/
│   │   ├── raw/             # secondary_sales.csv, rentals.csv...
│   │   └── processed/       # cleaned_properties.csv
│   ├── saved_models/        # house_model.joblib, model_metadata.joblib
│   ├── src/
│   │   ├── train.py
│   │   ├── preprocess.py
│   │   ├── market_feature_builder.py
│   │   └── locality_config.py
│   └── ...
└── docker-compose.yml       # PostgreSQL (pgvector)


---

## Quick Start

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- Docker (for PostgreSQL)

### 2. Database
```bash
docker compose up -d

cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate

pip install -r requirements.txt   # (create if missing – see dependencies below)

# Configure environment
cp .env.example .env              # or edit the provided .env
# Required: JWT_SECRET, GROQ_API_KEY, SMTP credentials, DB_* vars

# Initialize DB + load cleaned properties
python -m app.database_setup

# Run server
python run.py
# → http://localhost:5000


FLASK_ENV=development
JWT_SECRET=your_long_random_secret
GROQ_API_KEY=gsk_...

SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SENDER_EMAIL=your@gmail.com
SENDER_PASSWORD=your_app_password

DB_HOST=127.0.0.1
DB_PORT=5433
DB_USER=postgres
DB_PASSWORD=root
DB_NAME=mumbai_real_estate
