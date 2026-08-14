"""
database_setup.py
-----------------
Creates database + tables and loads cleaned_properties.csv into mumbai_properties.
Safe to re-run. Only mumbai_properties is truncated on reload.
"""

import os
import pg8000
import pandas as pd
from sqlalchemy import create_engine
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", 5433))
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "mumbai_real_estate")


def _find_csv_path():
    """Locate cleaned_properties.csv robustly from different working directories."""
    candidates = [
        # Standard project layout
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "ml", "data", "processed", "cleaned_properties.csv"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "ml", "data", "processed", "cleaned_properties.csv"),
        os.path.join(os.getcwd(), "ml", "data", "processed", "cleaned_properties.csv"),
        os.path.join(os.getcwd(), "..", "ml", "data", "processed", "cleaned_properties.csv"),
        os.path.join(os.getcwd(), "cleaned_properties.csv"),
        os.path.join(os.getcwd(), "..", "cleaned_properties.csv"),
        # Absolute fallback (Windows project path style)
        r"E:\Aditya Final Year Project\house-price-prediction-TY-5-SEM-PROJECT\ml\data\processed\cleaned_properties.csv",
    ]
    for p in candidates:
        p = os.path.abspath(p)
        if os.path.exists(p):
            return p
    return None


def get_db_connection():
    """Reusable connection for routes and scripts."""
    return pg8000.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
    )


def _create_tables(cursor):
    """Create all required tables (IF NOT EXISTS)."""

    # 1. Properties
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS mumbai_properties (
        id SERIAL PRIMARY KEY,
        locality VARCHAR(255),
        property_type VARCHAR(100),
        furnishing_status VARCHAR(100),
        property_age INT,
        area_sqft NUMERIC,
        bhk_size INT,
        bathrooms INT,
        balconies INT,
        price NUMERIC
    );
    """)

    # 2. Users
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) DEFAULT 'User',
        picture TEXT DEFAULT NULL,
        reset_token VARCHAR(100) DEFAULT NULL,
        token_expiry TIMESTAMP DEFAULT NULL,
        last_login TIMESTAMP DEFAULT NULL,
        role VARCHAR(100) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 3. Valuation Logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS valuation_logs (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        locality VARCHAR(100),
        property_type VARCHAR(50),
        furnishing_status VARCHAR(50),
        property_age VARCHAR(50),
        area_sqft NUMERIC,
        bhk_size INT,
        bathrooms INT,
        balconies INT,
        normal_min VARCHAR(100),
        normal_max VARCHAR(100),
        premium_min VARCHAR(100),
        premium_max VARCHAR(100),
        brand_min VARCHAR(100),
        brand_max VARCHAR(100)
    );
    """)

    # 4. Chat History
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_history (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        user_message TEXT,
        bot_response TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 5. Generated Reports
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS generated_reports (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        locality VARCHAR(255),
        bhk INT,
        area FLOAT,
        furnishing VARCHAR(100),
        report_type VARCHAR(50) DEFAULT 'Valuation',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 6. Pending Registrations (OTP)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pending_registrations (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        password_hash VARCHAR(255) NOT NULL,
        otp_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_mumbai_locality ON mumbai_properties(locality);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_mumbai_type ON mumbai_properties(property_type);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_mumbai_furnishing ON mumbai_properties(furnishing_status);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_mumbai_bhk ON mumbai_properties(bhk_size);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_user_id ON valuation_logs(user_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_history_user ON chat_history(user_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_generated_reports_user ON generated_reports(user_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON pending_registrations(email);")


def _load_properties_from_csv(cursor, engine):
    """Truncate mumbai_properties and load latest cleaned_properties.csv."""
    csv_path = _find_csv_path()
    if not csv_path:
        print("❌ cleaned_properties.csv not found.")
        print("   Expected at: ml/data/processed/cleaned_properties.csv")
        return False

    print(f"📂 Using CSV: {csv_path}")
    cursor.execute("TRUNCATE TABLE mumbai_properties RESTART IDENTITY;")
    print("🗑️  Old rows removed from mumbai_properties.")

    df = pd.read_csv(csv_path)
    df.columns = df.columns.str.strip().str.lower()

    def get_col(possible_names, default=None):
        for name in possible_names:
            if name in df.columns:
                return df[name]
        if default is not None:
            return default
        raise KeyError(f"None of {possible_names} found in CSV. Columns: {list(df.columns)}")

    df_to_upload = pd.DataFrame({
        "locality": get_col(["locality", "location", "city"]),
        "property_type": get_col(["property_type", "type"], "Apartment"),
        "furnishing_status": get_col(["furnishing_status", "furnishing"], "Unfurnished"),
        "property_age": pd.to_numeric(get_col(["property_age", "age"], 0), errors="coerce").fillna(0).astype(int),
        "area_sqft": pd.to_numeric(get_col(["area_sqft", "area", "total_sqft", "carpet_area_sqft"]), errors="coerce"),
        "bhk_size": pd.to_numeric(get_col(["bhk_size", "bhk", "bedrooms"]), errors="coerce").fillna(1).astype(int),
        "bathrooms": pd.to_numeric(get_col(["bathrooms", "bathroom_count", "bath"], 2), errors="coerce").fillna(2).astype(int),
        "balconies": pd.to_numeric(get_col(["balconies", "balcony_count", "balcony"], 0), errors="coerce").fillna(0).astype(int),
        "price": pd.to_numeric(get_col(["price", "price_lakhs", "amount", "price_inr"]), errors="coerce"),
    })

    # Drop invalid rows
    before = len(df_to_upload)
    df_to_upload = df_to_upload.dropna(subset=["locality", "area_sqft", "price"])
    df_to_upload = df_to_upload[(df_to_upload["area_sqft"] > 0) & (df_to_upload["price"] > 0)]
    after = len(df_to_upload)

    if after < before:
        print(f"⚠️  Dropped {before - after} invalid rows (missing locality / area / price).")

    df_to_upload.to_sql("mumbai_properties", engine, if_exists="append", index=False)
    print(f"🚀 SUCCESS! Loaded {after} rows into mumbai_properties.")
    return True


def initialize_database():
    """
    Full init:
    - Create DB if missing
    - Create all tables + indexes
    - Reload mumbai_properties from cleaned_properties.csv
    """
    try:
        # Create database if needed
        conn = pg8000.connect(
            host=DB_HOST, port=DB_PORT, user=DB_USER,
            password=DB_PASSWORD, database="postgres"
        )
        conn.autocommit = True
        cursor = conn.cursor()
        cursor.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{DB_NAME}';")
        if not cursor.fetchone():
            cursor.execute(f'CREATE DATABASE "{DB_NAME}";')
            print(f"✅ Database '{DB_NAME}' created.")
        else:
            print(f"ℹ️  Database '{DB_NAME}' already exists.")
        cursor.close()
        conn.close()

        # Connect to target DB
        conn = get_db_connection()
        conn.autocommit = True
        cursor = conn.cursor()

        _create_tables(cursor)
        print("✅ Tables & indexes ready.")

        engine = create_engine(
            f"postgresql+pg8000://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        )
        _load_properties_from_csv(cursor, engine)

        cursor.close()
        conn.close()
        print("✅ Database initialization complete.")

    except Exception as e:
        print(f"❌ Database Initialization Failed: {e}")
        raise


def reload_properties_only():
    """
    Safe reload – only truncates & reloads mumbai_properties.
    Use this after updating cleaned_properties.csv.
    """
    try:
        conn = get_db_connection()
        conn.autocommit = True
        cursor = conn.cursor()

        engine = create_engine(
            f"postgresql+pg8000://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        )
        ok = _load_properties_from_csv(cursor, engine)

        cursor.close()
        conn.close()
        if ok:
            print("✅ Properties table refreshed successfully.")
        return ok
    except Exception as e:
        print(f"❌ Reload failed: {e}")
        raise


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "reload":
        reload_properties_only()
    else:
        initialize_database()