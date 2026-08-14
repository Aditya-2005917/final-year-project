import os
import jwt
from flask import Blueprint, request, jsonify
from flask_cors import CORS

from app.database_setup import get_db_connection
from app.services.model_service import model_service

predict_bp = Blueprint("predict", __name__)
CORS(predict_bp, supports_credentials=True)

JWT_SECRET = os.getenv("JWT_SECRET", "your_fallback_secret_key_if_env_fails")


LOCALITY_COORDINATES = {
    "Andheri": [19.1136, 72.8697],
    "Andheri East": [19.1136, 72.8697],
    "Andheri West": [19.1367, 72.8267],
    "Bandra": [19.0553, 72.8340],
    "Bandra East": [19.0596, 72.8553],
    "Bandra West": [19.0607, 72.8362],
    "Thane": [19.2005, 72.9751],
    "Thane East": [19.2005, 72.9851],
    "Thane West": [19.2005, 72.9651],
    "Kalyan": [19.2403, 73.1305],
    "Dombivli": [19.2184, 73.0867],
    "Bhiwandi": [19.2967, 73.0631],
    "Mira Road": [19.2816, 72.8560],
    "Bhayandar": [19.2931, 72.8562],
    "Vasai": [19.3919, 72.8397],
    "Virar": [19.4564, 72.8003],
    "Airoli": [19.1579, 72.9935],
    "Vashi": [19.0330, 72.0297],
    "Nerul": [19.0330, 73.0177],
    "Kharghar": [19.0256, 73.0752],
    "Panvel": [18.9894, 73.1175],
    "Taloja": [19.0544, 73.1026],
    "Ulwe": [18.9751, 73.0232],
    "Badlapur": [19.1495, 73.2432],
    "Ambernath": [19.2012, 73.1856],
    "Palghar": [19.6967, 72.7699],
}


def _token():
    header = request.headers.get("Authorization")
    if not header:
        return None
    return header.split(" ", 1)[1] if header.startswith("Bearer ") else header


@predict_bp.route("/", methods=["POST", "OPTIONS"])
def predict_property_value():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    try:
        data = request.get_json(silent=True) or {}
        if not data:
            return jsonify({"error": "Missing input payload"}), 400

        is_guest = bool(data.get("is_guest", False))
        current_user_id = None
        token = _token()

        if token in {"guest-session-token", "Bearer guest-session-token"}:
            is_guest = True

        if not is_guest:
            if not token:
                return jsonify({
                    "error": "Authentication required. Please log in or continue as Guest."
                }), 401

            try:
                decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
                raw_id = (
                    decoded.get("userId")
                    or decoded.get("id")
                    or decoded.get("user_id")
                )
                current_user_id = int(raw_id) if raw_id is not None else None

                if not current_user_id:
                    return jsonify({"error": "Invalid authentication token."}), 401

                conn = None
                cursor = None
                try:
                    conn = get_db_connection()
                    cursor = conn.cursor()
                    cursor.execute(
                        "SELECT role FROM users WHERE id = %s;",
                        [current_user_id],
                    )
                    row = cursor.fetchone()
                    if not row:
                        return jsonify({"error": "User not found."}), 401
                    if str(row[0] or "user").lower() == "banned":
                        return jsonify({
                            "success": False,
                            "error": "Your account has been suspended. Please contact support.",
                        }), 403
                finally:
                    if cursor:
                        cursor.close()
                    if conn:
                        conn.close()

            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Session expired. Please log in again."}), 401
            except jwt.InvalidTokenError:
                return jsonify({"error": "Invalid authentication token."}), 401
        else:
            current_user_id = 0

        required = [
            "locality",
            "property_type",
            "furnishing_status",
            "property_age",
            "area_sqft",
            "bhk_size",
            "bathrooms",
            "balconies",
        ]

        missing = [
            key for key in required
            if data.get(key) is None or data.get(key) == ""
        ]
        if missing:
            return jsonify({
                "error": f"Missing required fields: {', '.join(missing)}"
            }), 400

        try:
            payload = {
                "locality": str(data["locality"]).strip(),
                "property_type": str(data["property_type"]).strip(),
                "furnishing": str(data["furnishing_status"]).strip(),
                "age": int(data["property_age"]),
                "area": float(data["area_sqft"]),
                "bhk": int(data["bhk_size"]),
                "bathrooms": int(data["bathrooms"]),
                "balconies": int(data["balconies"]),
            }
        except (TypeError, ValueError) as exc:
            return jsonify({"error": f"Invalid input: {exc}"}), 400

        valuations, error = model_service.predict(payload)
        if error:
            return jsonify({"error": f"Valuation Error: {error}"}), 500

        meta = valuations.pop("_meta", {})
        public_predictions = valuations

        # Correct: 15 columns and 15 values/placeholders.
        if not is_guest and current_user_id:
            conn = None
            cursor = None
            try:
                conn = get_db_connection()
                cursor = conn.cursor()

                norm = public_predictions.get("Normal", ("₹0 Lakhs", "₹0 Lakhs"))
                prem = public_predictions.get("Premium", ("₹0 Lakhs", "₹0 Lakhs"))
                brand = public_predictions.get("Premium_Brand", ("₹0 Lakhs", "₹0 Lakhs"))

                cursor.execute(
                    """
                    INSERT INTO valuation_logs (
                        user_id,
                        locality,
                        property_type,
                        furnishing_status,
                        property_age,
                        area_sqft,
                        bhk_size,
                        bathrooms,
                        balconies,
                        normal_min,
                        normal_max,
                        premium_min,
                        premium_max,
                        brand_min,
                        brand_max
                    )
                    VALUES (
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s
                    );
                    """,
                    [
                        current_user_id,
                        payload["locality"],
                        payload["property_type"],
                        payload["furnishing"],
                        str(payload["age"]),
                        payload["area"],
                        payload["bhk"],
                        payload["bathrooms"],
                        payload["balconies"],
                        str(norm[0]),
                        str(norm[1]),
                        str(prem[0]),
                        str(prem[1]),
                        str(brand[0]),
                        str(brand[1]),
                    ],
                )
                conn.commit()
            except Exception as db_err:
                if conn:
                    conn.rollback()
                print(f"Database insertion error in predict: {db_err}")
            finally:
                if cursor:
                    cursor.close()
                if conn:
                    conn.close()

        normalized = model_service.normalize_locality(payload["locality"])
        coords = LOCALITY_COORDINATES.get(
            normalized, [19.0760, 72.8777]
        )

        return jsonify({
            "success": True,
            "location": normalized,
            "coords": coords,
            "configuration": (
                f'{payload["bhk"]} BHK | {payload["area"]:g} Sq.Ft. | '
                f'{payload["property_type"]}'
            ),
            "predictions": public_predictions,
            "predicted_price_lakhs": meta.get("predicted_price_lakhs"),
            "price_per_sqft": meta.get("price_per_sqft", {}),
            "metrics": meta.get("metrics", {}),
            "comparable_count": meta.get("comparable_count", 0),
            "comparables_match_level": meta.get("comparables_match_level", "none"),
            "comparables": meta.get("comparables", []),
            "infrastructure": meta.get("infrastructure", []),
            "model_name": meta.get("model_name", "XGBoost"),
            "region": meta.get("region", "MMR"),
        }), 200

    except Exception as exc:
        print(f"Prediction route error: {exc}")
        return jsonify({
            "error": f"Internal Server Error: {str(exc)}"
        }), 500
