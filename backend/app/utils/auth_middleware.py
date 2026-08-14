import os
import jwt
from functools import wraps
from flask import request, jsonify
from app.database_setup import get_db_connection

JWT_SECRET = os.getenv("JWT_SECRET")

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == 'OPTIONS':
            return jsonify({"status": "ok"}), 200

        auth_header = request.headers.get('Authorization')
        
        # Default to guest if no token
        if not auth_header or auth_header.split(" ")[-1] in ["null", "undefined", ""]:
            return f(0, "guest", *args, **kwargs)

        try:
            parts = auth_header.split(" ")
            token = parts[1] if len(parts) > 1 else parts[0]
        except Exception:
            token = auth_header

        # Explicit guest token bypass
        if token in ["guest-session-token", "Bearer guest-session-token"]:
            return f(0, "guest", *args, **kwargs)

        try:
            if not JWT_SECRET:
                raise Exception("JWT_SECRET not configured")

            data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            current_user_id = data.get("userId") or data.get("id") or data.get("user_id") or data.get("sub")
            
            if not current_user_id:
                return f(0, "guest", *args, **kwargs)

            current_user_id = int(current_user_id)

            # ---------- NEW: Always check the latest role from DB ----------
            conn = None
            cursor = None
            try:
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute("SELECT role FROM users WHERE id = %s;", [current_user_id])
                row = cursor.fetchone()

                if not row:
                    return jsonify({"error": "User not found."}), 401

                latest_role = str(row[0] or "user").lower()

                if latest_role == "banned":
                    return jsonify({
                        "success": False,
                        "error": "Your account has been suspended. Please contact support."
                    }), 403

                current_user_role = latest_role

            except Exception as db_err:
                print(f"Role check error: {db_err}")
                # Fallback to token role if DB fails
                current_user_role = str(data.get("role", "user")).lower()
            finally:
                if cursor:
                    cursor.close()
                if conn:
                    conn.close()
            # ---------------------------------------------------------------

            return f(current_user_id, current_user_role, *args, **kwargs)

        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Session expired. Please log in again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid authentication token."}), 401
        except Exception:
            return f(0, "guest", *args, **kwargs)

    return decorated


def admin_required(f):
    @wraps(f)
    @token_required
    def decorated(current_user_id, current_user_role, *args, **kwargs):
        if request.method == 'OPTIONS':
            return jsonify({"status": "ok"}), 200

        if str(current_user_role).strip().lower() != 'admin':
            return jsonify({
                "success": False,
                "error": "Access denied: Admin privileges required."
            }), 403

        return f(current_user_id, current_user_role, *args, **kwargs)
    return decorated