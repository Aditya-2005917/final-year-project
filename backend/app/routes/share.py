import secrets
from flask import Blueprint, request, jsonify
from flask_cors import CORS
from app.database_setup import get_db_connection
from app.utils.auth_middleware import token_required

share_bp = Blueprint("share", __name__, url_prefix="/api/reports")
CORS(share_bp, supports_credentials=True)


@share_bp.route("/share/<int:log_id>", methods=["POST", "OPTIONS"])
@token_required
def create_share_link(current_user_id, current_user_role, log_id):
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    if current_user_id == 0 or str(current_user_role).lower() in ("guest", "banned"):
        return jsonify({"success": False, "error": "Login required"}), 401

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT id FROM valuation_logs WHERE id = %s AND user_id = %s;",
            [log_id, current_user_id]
        )
        if not cursor.fetchone():
            return jsonify({"success": False, "error": "Record not found"}), 404

        token = secrets.token_urlsafe(24)
        cursor.execute(
            "UPDATE valuation_logs SET share_token = %s WHERE id = %s AND user_id = %s RETURNING share_token;",
            [token, log_id, current_user_id]
        )
        row = cursor.fetchone()
        conn.commit()

        frontend_origin = request.headers.get("Origin") or "http://localhost:5173"
        return jsonify({
            "success": True,
            "shareToken": token,
            "shareUrl": f"{frontend_origin}/share/{token}"
        }), 200

    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@share_bp.route("/public/<token>", methods=["GET", "OPTIONS"])
def get_public_report(token):
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    if not token or len(token) < 10:
        return jsonify({"success": False, "error": "Invalid token"}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, locality, property_type, furnishing_status, property_age,
                   area_sqft, bhk_size, bathrooms, balconies,
                   normal_min, normal_max, premium_min, premium_max,
                   brand_min, brand_max, timestamp
            FROM valuation_logs WHERE share_token = %s;
        """, [token])
        row = cursor.fetchone()

        if not row:
            return jsonify({"success": False, "error": "Report not found"}), 404

        return jsonify({
            "success": True,
            "data": {
                "id": row[0],
                "locality": row[1],
                "property_type": row[2],
                "furnishing_status": row[3],
                "property_age": row[4],
                "area_sqft": float(row[5]) if row[5] else 0,
                "bhk_size": row[6],
                "bathrooms": row[7],
                "balconies": row[8],
                "predictions": {
                    "Normal": (row[9], row[10]),
                    "Premium": (row[11], row[12]),
                    "Premium_Brand": (row[13], row[14]),
                },
                "timestamp": str(row[15]) if row[15] else None,
                "configuration": f"{row[6]} BHK | {row[5]} Sq.Ft. | {row[2]}"
            }
        }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()