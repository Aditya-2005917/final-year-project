"""
Top Properties – uses cleaned_properties.csv
+ locality uplift + aggressive outlier filtering
"""
from flask import Blueprint, request, jsonify
from flask_cors import CORS
import os
import pandas as pd

from app.utils.market_calibration import (
    apply_uplift,
    format_price,
    filter_outliers,
)

properties_bp = Blueprint("properties", __name__, url_prefix="/api/properties")
CORS(properties_bp, supports_credentials=True)


def _get_csv_path():
    paths = [
        os.path.join(os.getcwd(), "cleaned_properties.csv"),
        os.path.join(os.getcwd(), "..", "cleaned_properties.csv"),
        os.path.join(os.getcwd(), "ml", "data", "processed", "cleaned_properties.csv"),
        os.path.join(os.getcwd(), "..", "ml", "data", "processed", "cleaned_properties.csv"),
        os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "..", "..", "ml", "data", "processed", "cleaned_properties.csv"
        ),
        os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "..", "..", "cleaned_properties.csv"
        ),
        "cleaned_properties.csv",
    ]
    for p in paths:
        if os.path.exists(p):
            return p
    raise FileNotFoundError("cleaned_properties.csv not found")


def _load_df(apply_market_uplift=True):
    df = pd.read_csv(_get_csv_path())
    df.columns = df.columns.str.strip()

    rename = {
        "Locality": "locality",
        "Property_Type": "property_type",
        "Furnishing_Status": "furnishing_status",
        "Area_SqFt": "area_sqft",
        "BHK_Size": "bhk_size",
        "Bathroom_Count": "bathrooms",
        "Balcony_Count": "balconies",
        "Property_Age": "property_age",
        "Price_Lakhs": "price",
    }
    df = df.rename(columns={k: v for k, v in rename.items() if k in df.columns})

    for col in ["area_sqft", "bhk_size", "bathrooms", "balconies", "property_age", "price"]:
        if col not in df.columns:
            df[col] = 0
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    df = df[(df["price"] > 0) & (df["area_sqft"] > 0)].copy()

    if apply_market_uplift:
        df["price"] = df.apply(
            lambda r: apply_uplift(r["price"], r.get("locality", "")), axis=1
        )

    # Global outlier removal
    df = filter_outliers(
        df,
        price_col="price",
        area_col="area_sqft",
        max_ratio=2.3,
        min_ratio=0.40,
        hard_min_ppsf=2800,
        hard_max_ppsf=95000,
    )
    return df


@properties_bp.route("/top", methods=["GET", "OPTIONS"])
def get_top_properties():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    try:
        bhk = request.args.get("bhk", type=int)
        furnishing = request.args.get("furnishing", "").strip()
        property_type = request.args.get("property_type", "").strip()
        min_age = request.args.get("min_age", type=int)
        max_age = request.args.get("max_age", type=int)
        locality = request.args.get("locality", "").strip()
        sort_by = request.args.get("sort", "price").lower()
        order = request.args.get("order", "desc").lower()
        limit = min(int(request.args.get("limit", 24)), 60)
        offset = max(int(request.args.get("offset", 0)), 0)

        df = _load_df(apply_market_uplift=True)

        if bhk is not None:
            df = df[df["bhk_size"] == int(bhk)]
        if furnishing:
            df = df[df["furnishing_status"].str.lower().str.contains(furnishing.lower(), na=False)]
        if property_type:
            df = df[df["property_type"].str.lower().str.contains(property_type.lower(), na=False)]
        if min_age is not None:
            df = df[df["property_age"] >= int(min_age)]
        if max_age is not None:
            df = df[df["property_age"] <= int(max_age)]
        if locality:
            df = df[df["locality"].str.lower().str.contains(locality.lower(), na=False)]

        # Second, tighter pass after user filters (kills most remaining outliers)
        df = filter_outliers(
            df,
            price_col="price",
            area_col="area_sqft",
            max_ratio=2.0,
            min_ratio=0.45,
            hard_min_ppsf=3000,
            hard_max_ppsf=85000,
        )

        total = len(df)

        if sort_by == "price_per_sqft":
            df = df.copy()
            df["_pps"] = (df["price"] * 100000) / df["area_sqft"]
            df = df.sort_values("_pps", ascending=(order == "asc"))
        else:
            sort_col = {"price": "price", "area": "area_sqft", "age": "property_age"}.get(sort_by, "price")
            df = df.sort_values(sort_col, ascending=(order == "asc"))

        page = df.iloc[offset: offset + limit]

        properties = []
        for idx, r in page.iterrows():
            price_lakhs = float(r["price"])
            area = float(r["area_sqft"])
            properties.append({
                "id": int(idx) if pd.notna(idx) else 0,
                "locality": str(r.get("locality", "Unknown")),
                "property_type": str(r.get("property_type", "Apartment")),
                "furnishing": str(r.get("furnishing_status", "Unfurnished")),
                "age": int(r.get("property_age", 0)),
                "area_sqft": round(area),
                "bhk": int(r.get("bhk_size", 1)),
                "bathrooms": int(r.get("bathrooms", 1)),
                "balconies": int(r.get("balconies", 0)),
                "price_lakhs": round(price_lakhs, 2),
                "price_display": format_price(price_lakhs),
                "price_per_sqft": int(round((price_lakhs * 100000) / area)) if area > 0 else 0,
            })

        stats = {
            "total_matching": total,
            "avg_price_lakhs": round(float(df["price"].mean()), 1) if total else 0,
            "median_price_lakhs": round(float(df["price"].median()), 1) if total else 0,
            "avg_area": int(df["area_sqft"].mean()) if total else 0,
            "avg_price_per_sqft": int(((df["price"] * 100000) / df["area_sqft"]).mean()) if total else 0,
            "note": "Prices adjusted toward mid-2026 secondary market levels (existing dataset)",
        }

        return jsonify({
            "success": True,
            "data": properties,
            "stats": stats,
            "pagination": {
                "limit": limit,
                "offset": offset,
                "total": total,
                "has_more": (offset + limit) < total,
            },
        }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@properties_bp.route("/suggestions", methods=["GET", "OPTIONS"])
def get_suggestions():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    try:
        df = _load_df(apply_market_uplift=False)
        bhk_suggestions = [{"bhk": int(k), "count": int(v)} for k, v in df["bhk_size"].value_counts().head(6).items()]
        furnishing_suggestions = [{"furnishing": str(k), "count": int(v)} for k, v in
                                  df["furnishing_status"].astype(str).str.title().value_counts().head(5).items()]
        type_suggestions = [{"type": str(k), "count": int(v)} for k, v in
                            df["property_type"].astype(str).str.title().value_counts().head(5).items()]
        locality_suggestions = [{"locality": str(k), "count": int(v)} for k, v in
                                df["locality"].astype(str).str.title().value_counts().head(10).items()]
        return jsonify({
            "success": True,
            "suggestions": {
                "bhk": bhk_suggestions,
                "furnishing": furnishing_suggestions,
                "property_type": type_suggestions,
                "localities": locality_suggestions,
            }
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500