from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

BASE = Path(__file__).resolve().parents[1]  # ml/
RAW = BASE / "data" / "raw" / "secondary_sales.csv"
OUT = BASE / "data" / "processed" / "cleaned_properties.csv"
BACKUP = BASE / "data" / "processed" / "cleaned_properties_backup.csv"

# Keep recent market only (change to 2023 for more history)
MIN_YEAR = 2024

ALIASES = {
    "Dombivali": "Dombivli",
    "Ville Parle": "Vile Parle",
    "Nallasopara": "Nala Sopara",
    "Nalasopara": "Nala Sopara",
    "Koparkhairane": "Koper Khairane",
    "Bhayander": "Bhayandar",
    "Goregoan": "Goregaon",
    "Santacruz": "Santacruz",
    "Vileparle": "Vile Parle",
}


def norm_locality(x) -> str:
    if not isinstance(x, str) or not x.strip():
        return ""
    s = x.strip().title()
    return ALIASES.get(s, s)


def map_furnishing(x) -> str:
    s = str(x or "").strip().lower().replace("-", "_").replace(" ", "_")
    if "full" in s:
        return "Fully Furnished"
    if "semi" in s:
        return "Semi-Furnished"
    return "Unfurnished"


def main():
    if not RAW.exists():
        raise FileNotFoundError(
            f"Place Kaggle secondary_sales.csv at:\n  {RAW}\n"
            "Download from:\n"
            "  https://www.kaggle.com/datasets/sergionefedov/"
            "mumbai-real-estate-sales-and-rentals-2020-2026"
        )

    df = pd.read_csv(RAW)
    print("Raw columns:", list(df.columns))
    print("Raw rows:", len(df))

    def col(*names):
        lower = {c.lower(): c for c in df.columns}
        for n in names:
            if n.lower() in lower:
                return lower[n.lower()]
        return None

    c_loc = col("locality", "location", "area_name")
    c_price = col(
        "price_inr", "price", "asking_price_inr", "price_inr_lakh", "price_lakhs"
    )
    c_carpet = col("carpet_area_sqft", "carpet_sqft", "area_sqft", "area")
    c_built = col("built_up_area_sqft", "builtup_sqft", "super_area")
    c_bhk = col("bedrooms", "bhk", "bhk_size", "bedroom")
    c_furn = col("furnishing", "furnishing_status", "furnished")
    c_balc = col("balconies", "balcony", "balcony_count")
    c_year = col("year_built", "construction_year", "built_year")
    c_date = col("date_listed", "listed_on", "date")
    c_region = col("region", "zone")
    c_bath = col("bathrooms", "bathroom", "bathroom_count")
    c_ptype = col("property_type", "type")

    if not c_loc or not c_price:
        raise ValueError("Need locality + price columns in the CSV")

    out = pd.DataFrame()
    out["Locality"] = df[c_loc].map(norm_locality)

    if c_carpet:
        out["Area_SqFt"] = pd.to_numeric(df[c_carpet], errors="coerce")
    elif c_built:
        out["Area_SqFt"] = pd.to_numeric(df[c_built], errors="coerce") * 0.78
    else:
        raise ValueError("No area column found")

    if c_bhk:
        out["BHK_Size"] = pd.to_numeric(df[c_bhk], errors="coerce")
    elif c_ptype:
        out["BHK_Size"] = (
            df[c_ptype].astype(str).str.extract(r"(\d+)").astype(float)
        )
    else:
        out["BHK_Size"] = 2

    price = pd.to_numeric(df[c_price], errors="coerce")
    med = price.median()
    if pd.notna(med) and med > 10000:
        out["Price_Lakhs"] = price / 100000.0
    else:
        out["Price_Lakhs"] = price

    if c_furn:
        out["Furnishing_Status"] = df[c_furn].map(map_furnishing)
    else:
        out["Furnishing_Status"] = "Unfurnished"

    if c_bath:
        out["Bathroom_Count"] = pd.to_numeric(df[c_bath], errors="coerce")
    else:
        out["Bathroom_Count"] = out["BHK_Size"].clip(lower=1)

    if c_balc:
        out["Balcony_Count"] = pd.to_numeric(df[c_balc], errors="coerce").fillna(1)
    else:
        out["Balcony_Count"] = 1

    if c_year:
        yb = pd.to_numeric(df[c_year], errors="coerce")
        out["Property_Age"] = (2026 - yb).clip(0, 40)
    else:
        out["Property_Age"] = 5

    out["Property_Type"] = "Apartment"

    # Keep recent listings only
    if c_date is not None:
        dates = pd.to_datetime(df[c_date], errors="coerce")
        mask = dates.dt.year >= MIN_YEAR
        out = out.loc[mask].copy()
        print(f"Kept listings with year >= {MIN_YEAR}: {len(out)} rows")

    try:
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        from locality_config import region_for_locality

        out["Region"] = out["Locality"].map(region_for_locality)
    except Exception:
        if c_region is not None:
            out["Region"] = df.loc[out.index, c_region].astype(str)
        else:
            out["Region"] = "MMR"

    out = out.dropna(subset=["Locality", "Area_SqFt", "BHK_Size", "Price_Lakhs"])
    out = out[out["Locality"].str.len() > 0]
    out = out[(out["Area_SqFt"] >= 250) & (out["Area_SqFt"] <= 8000)]
    out = out[(out["BHK_Size"] >= 1) & (out["BHK_Size"] <= 6)]
    out = out[(out["Price_Lakhs"] >= 20) & (out["Price_Lakhs"] <= 4000)]

    out["ppsf"] = out["Price_Lakhs"] * 100000.0 / out["Area_SqFt"]
    out = out[(out["ppsf"] >= 3000) & (out["ppsf"] <= 100000)]
    out = out.drop(columns=["ppsf"])

    for c in ["Bathroom_Count", "Balcony_Count", "Property_Age", "BHK_Size"]:
        out[c] = out[c].fillna(1).astype(int)

    out["Area_SqFt"] = out["Area_SqFt"].round(0).astype(int)
    out["Price_Lakhs"] = out["Price_Lakhs"].round(2)

    cols = [
        "Locality",
        "Property_Type",
        "Furnishing_Status",
        "Area_SqFt",
        "BHK_Size",
        "Bathroom_Count",
        "Balcony_Count",
        "Property_Age",
        "Region",
        "Price_Lakhs",
    ]
    out = out[cols].drop_duplicates(
        subset=["Locality", "Area_SqFt", "BHK_Size", "Price_Lakhs"]
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    if OUT.exists():
        OUT.rename(BACKUP)
        print(f"Backup: {BACKUP}")

    out.to_csv(OUT, index=False)
    print(f"Wrote {OUT}")
    print(f"Rows: {len(out)} | Localities: {out['Locality'].nunique()}")
    print(
        out.groupby("Locality")["Price_Lakhs"]
        .median()
        .sort_values(ascending=False)
        .head(10)
    )
    print("\nNext: python train.py  (XGBoost-only + market_feature_builder)")


if __name__ == "__main__":
    main()