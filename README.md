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
