from flask import request, jsonify
from app.database_setup import get_db_connection
from .auth import auth_bp
from app.utils.auth_middleware import token_required


@auth_bp.route('/user', methods=['GET', 'OPTIONS'])
@token_required
def get_current_user(current_user_id, current_user_role):
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    if current_user_id == 0 or str(current_user_role).lower() == "guest":
        return jsonify({
            "success": True,
            "user": {
                "id": 0,
                "email": "guest@auraestate.com",
                "role": "guest",
                "name": "Guest User",
                "picture": ""
            }
        }), 200

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, email, role, created_at, name, picture 
            FROM users 
            WHERE id = %s;
        """, [current_user_id])
        user_row = cursor.fetchone()

        if not user_row:
            return jsonify({"error": "User not found."}), 404

        user_email = user_row[1]
        user_name = user_row[4] or user_email.split('@')[0].capitalize()
        user_picture = user_row[5] or ""

        return jsonify({
            "success": True,
            "user": {
                "id": user_row[0],
                "email": user_email,
                "role": user_row[2] or "user",
                "createdAt": str(user_row[3]) if user_row[3] else None,
                "name": user_name,
                "picture": user_picture
            }
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to fetch user session: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()