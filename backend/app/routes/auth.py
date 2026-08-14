import os
import datetime
import bcrypt
import jwt
from flask import Blueprint, request, jsonify
from flask_cors import CORS

from app.database_setup import get_db_connection

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
CORS(auth_bp, supports_credentials=True)

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET environment variable is not set!")


@auth_bp.route('/signup', methods=['POST', 'OPTIONS'])
def signup_user():
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    conn = None
    cursor = None
    try:
        data = request.json or {}
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        name = data.get('name', '').strip()

        if not name:
            name = email.split('@')[0].capitalize() if email else 'User'

        if not email or not password:
            return jsonify({"error": "Email and password are required."}), 400

        if len(password) < 8:
            return jsonify({"error": "Password must be at least 8 characters long."}), 400

        hashed_bytes = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        password_hash = hashed_bytes.decode('utf-8')

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "INSERT INTO users (email, password_hash, name, role) VALUES (%s, %s, %s, %s) RETURNING id, role;",
            [email, password_hash, name, 'user']
        )
        row = cursor.fetchone()
        new_id, user_role = row[0], row[1]
        conn.commit()

        return jsonify({
            "success": True,
            "message": "User registered successfully.",
            "userId": new_id,
            "role": user_role
        }), 201

    except Exception as e:
        if conn:
            conn.rollback()
        error_msg = str(e).lower()
        if "duplicate key" in error_msg or "already exists" in error_msg:
            return jsonify({"error": "An account with this email already exists."}), 400
        return jsonify({"error": f"Registration failed: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@auth_bp.route('/login', methods=['POST', 'OPTIONS'])
def login_user():
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    conn = None
    cursor = None
    try:
        data = request.json or {}
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({"error": "Email and password are required."}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT id, password_hash, role, name FROM users WHERE email = %s;",
            [email]
        )
        user_row = cursor.fetchone()

        if not user_row:
            return jsonify({"error": "Invalid credentials."}), 401

        user_id, stored_hash, role, name = user_row
        role = role if role else 'user'

        # ---------- NEW: Block banned users ----------
        if str(role).lower() == 'banned':
            return jsonify({
                "error": "Your account has been suspended. Please contact support."
            }), 403
        # ---------------------------------------------

        if bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8')):
            cursor.execute("""
                UPDATE users 
                SET last_login = CURRENT_TIMESTAMP 
                WHERE id = %s;
            """, [user_id])
            conn.commit()

            current_time = datetime.datetime.now(datetime.timezone.utc)

            token = jwt.encode({
                "userId": user_id,
                "email": email,
                "role": role,
                "exp": current_time + datetime.timedelta(hours=24)
            }, JWT_SECRET, algorithm="HS256")

            return jsonify({
                "success": True,
                "token": token,
                "userId": user_id,
                "email": email,
                "name": name or email.split('@')[0],
                "role": role,
                "message": "Login successful."
            }), 200
        else:
            return jsonify({"error": "Invalid credentials."}), 401

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": f"Authentication failure: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# Import secondary route modules so they register on the same blueprint
from . import password_reset
from . import user_routes
from . import signin_otp