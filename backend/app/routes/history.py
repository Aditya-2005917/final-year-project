import datetime
from flask import Blueprint, jsonify, request
from flask_cors import CORS
from app.database_setup import get_db_connection
from app.utils.auth_middleware import token_required

history_bp = Blueprint('history', __name__)
CORS(history_bp, supports_credentials=True)


@history_bp.route('/', methods=['GET', 'OPTIONS'])
@token_required
def get_history(current_user_id, current_user_role):
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    if current_user_id == 0 or str(current_user_role).lower() == "guest":
        return jsonify({
            "success": False,
            "error": "Please log in to view your valuation history."
        }), 401

    # Extra safety (middleware already blocks banned users)
    if str(current_user_role).lower() == "banned":
        return jsonify({
            "success": False,
            "error": "Your account has been suspended. Please contact support."
        }), 403

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, locality, bhk_size, area_sqft, normal_min, normal_max, 
                   timestamp, bathrooms, balconies, property_age, furnishing_status,
                   property_type
            FROM valuation_logs 
            WHERE user_id = %s
            ORDER BY id DESC 
            LIMIT 20;
        """, [current_user_id])

        rows = cursor.fetchall()
        history_list = []

        ist_offset = datetime.timezone(datetime.timedelta(hours=5, minutes=30))

        def clean_numeric_value(val):
            if val is None:
                return 0.0
            if isinstance(val, (int, float)):
                return float(val)
            try:
                cleaned = str(val).replace('₹', '').replace('Crores', '').replace('Crore', '') \
                                  .replace('Cr', '').replace('Lakhs', '').replace('Lakh', '') \
                                  .replace(' ', '').strip()
                if 'Cr' in str(val) or 'Crore' in str(val):
                    return float(cleaned) * 100.0
                return float(cleaned)
            except (ValueError, TypeError):
                return 0.0

        for r in rows:
            raw_timestamp = r[6]
            if isinstance(raw_timestamp, datetime.datetime):
                if raw_timestamp.tzinfo is None:
                    raw_timestamp = raw_timestamp.replace(tzinfo=datetime.timezone.utc)
                local_time = raw_timestamp.astimezone(ist_offset)
                formatted_time = local_time.strftime("%Y-%m-%d %H:%M")
            else:
                formatted_time = "Just Now"

            history_list.append({
                "id": int(r[0]),
                "locality": str(r[1]) if r[1] else "",
                "bhk": int(r[2]) if r[2] is not None else 1,
                "area": float(r[3]) if r[3] else 0.0,
                "price_min": clean_numeric_value(r[4]),
                "price_max": clean_numeric_value(r[5]),
                "timestamp": formatted_time,
                "bathrooms": int(r[7]) if r[7] is not None else 2,
                "balconies": int(r[8]) if r[8] is not None else 1,
                "property_age": int(r[9]) if r[9] is not None else 0,
                "furnishing_status": str(r[10]) if r[10] else "Unfurnished",
                "property_type": str(r[11]) if r[11] else "Apartment"
            })

        return jsonify({"success": True, "data": history_list}), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({
            "success": False,
            "error": f"Failed to fetch history: {str(e)}"
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@history_bp.route('/<int:record_id>', methods=['DELETE', 'OPTIONS'])
@token_required
def delete_history_record(current_user_id, current_user_role, record_id):
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    if current_user_id == 0 or str(current_user_role).lower() == "guest":
        return jsonify({"success": False, "error": "Login required."}), 401

    if str(current_user_role).lower() == "banned":
        return jsonify({
            "success": False,
            "error": "Your account has been suspended. Please contact support."
        }), 403

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            DELETE FROM valuation_logs 
            WHERE id = %s AND user_id = %s 
            RETURNING id;
        """, [record_id, current_user_id])

        deleted = cursor.fetchone()
        conn.commit()

        if not deleted:
            return jsonify({
                "success": False,
                "error": "Record not found or you are not authorized to delete it."
            }), 404

        return jsonify({
            "success": True,
            "message": "Record deleted successfully."
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()