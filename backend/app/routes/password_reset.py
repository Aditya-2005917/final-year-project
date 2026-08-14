import datetime
import secrets
import hashlib
import bcrypt
from flask import request, jsonify
from app.database_setup import get_db_connection
from .auth import auth_bp
from app.utils.email_services import send_reset_email_async


@auth_bp.route('/forgot-password', methods=['POST', 'OPTIONS'])
def forgot_password():
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    conn = None
    cursor = None
    try:
        data = request.get_json() or {}
        email = data.get('email', '').strip().lower()

        if not email:
            return jsonify({"error": "Email is required."}), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = %s;", [email])
        user_row = cursor.fetchone()

        if user_row:
            plain_otp = str(secrets.randbelow(900000) + 100000)
            hashed_token = hashlib.sha256(plain_otp.encode('utf-8')).hexdigest()

            current_time = datetime.datetime.now(datetime.timezone.utc)
            expiry_time = current_time + datetime.timedelta(minutes=15)

            cursor.execute("""
                UPDATE users 
                SET reset_token = %s, token_expiry = %s 
                WHERE email = %s;
            """, [hashed_token, expiry_time, email])
            conn.commit()

            send_reset_email_async(email, plain_otp)

        # Always return success to avoid email enumeration
        return jsonify({
            "success": True,
            "message": "If an account with that email exists, a password reset code has been sent."
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": f"Forgot password error: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@auth_bp.route('/reset-password', methods=['POST', 'OPTIONS'])
def reset_password():
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    conn = None
    cursor = None
    try:
        data = request.get_json() or {}
        email = data.get('email', '').strip().lower()
        token = data.get('token', '').strip()
        new_password = data.get('newPassword', '')

        if not email or not token or not new_password:
            return jsonify({"error": "Missing required fields."}), 400

        if len(new_password) < 8:
            return jsonify({"error": "Password must be at least 8 characters long."}), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT reset_token, token_expiry FROM users WHERE email = %s;",
            [email]
        )
        user_row = cursor.fetchone()

        if not user_row or not user_row[0]:
            return jsonify({"error": "Invalid or expired reset token."}), 400

        saved_token, expiry_time = user_row
        incoming_token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()

        if saved_token != incoming_token_hash:
            return jsonify({"error": "Invalid or expired reset token."}), 400

        if expiry_time:
            if expiry_time.tzinfo is None:
                expiry_time = expiry_time.replace(tzinfo=datetime.timezone.utc)
            if datetime.datetime.now(datetime.timezone.utc) > expiry_time:
                return jsonify({"error": "Verification token has expired. Request a new one."}), 400

        hashed_bytes = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
        new_hash = hashed_bytes.decode('utf-8')

        cursor.execute("""
            UPDATE users 
            SET password_hash = %s, reset_token = NULL, token_expiry = NULL 
            WHERE email = %s;
        """, [new_hash, email])
        conn.commit()

        return jsonify({
            "success": True,
            "message": "Password updated successfully."
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": f"Reset password error: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()