"""
Comparable listings endpoint – applies 2026 market uplift to DB prices.
"""
from flask import Blueprint, request, jsonify
from flask_cors import CORS
from app.database_setup import get_db_connection

try:
    from app.utils.market_calibration import apply_market_uplift
except ImportError:
    try:
        from market_calibration import apply_market_uplift
    except ImportError:
        def apply_market_uplift(p, loc):
            return float(p or 0) * 1.10

comps_bp = Blueprint("comps", __name__, url_prefix="/api/predict")
CORS(comps_bp, supports_credentials=True)


@comps_bp.route("/comps", methods=["POST", "OPTIONS"])
def get_comps():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    data = request.json or {}
    locality = str(data.get("locality", "")).strip()
    bhk = int(data.get("bhk_size") or data.get("bhk") or 1)
    area = float(data.get("area_sqft") or data.get("area") or 0)
    limit = min(int(data.get("limit", 6)), 12)

    if not locality or area <= 0:
        return jsonify({"success": False, "error": "locality and area_sqft are required"}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT locality, property_type, furnishing_status, property_age,
                   area_sqft, bhk_size, bathrooms, balconies, price
            FROM mumbai_properties
            WHERE LOWER(TRIM(locality)) LIKE %s
              AND bhk_size BETWEEN %s AND %s
              AND area_sqft BETWEEN %s AND %s
              AND price IS NOT NULL AND price > 0
            ORDER BY ABS(area_sqft - %s) ASC
            LIMIT %s;
        """, [
            f"%{locality.lower()}%",
            max(1, bhk - 1), bhk + 1,
            area * 0.75, area * 1.25,
            area, limit
        ])

        rows = cursor.fetchall()

        if len(rows) < 3:
            cursor.execute("""
                SELECT locality, property_type, furnishing_status, property_age,
                       area_sqft, bhk_size, bathrooms, balconies, price
                FROM mumbai_properties
                WHERE bhk_size BETWEEN %s AND %s
                  AND area_sqft BETWEEN %s AND %s
                  AND price IS NOT NULL AND price > 0
                ORDER BY ABS(area_sqft - %s) ASC
                LIMIT %s;
            """, [
                max(1, bhk - 1), bhk + 1,
                area * 0.70, area * 1.30,
                area, limit
            ])
            rows = cursor.fetchall()

        comps = []
        for r in rows:
            raw_price = float(r[8]) if r[8] is not None else 0.0
            price = apply_market_uplift(raw_price, r[0] or locality)
            area_val = float(r[4]) if r[4] is not None else 1.0
            comps.append({
                "locality": r[0],
                "property_type": r[1] or "Apartment",
                "furnishing": r[2] or "Unfurnished",
                "age": r[3],
                "area_sqft": round(area_val, 0),
                "bhk": int(r[5]) if r[5] is not None else bhk,
                "bathrooms": int(r[6]) if r[6] is not None else 1,
                "balconies": int(r[7]) if r[7] is not None else 0,
                "price_lakhs": round(price, 2),
                "price_per_sqft": round((price * 100000) / area_val) if area_val > 0 else 0
            })

        return jsonify({"success": True, "comps": comps, "count": len(comps)}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()