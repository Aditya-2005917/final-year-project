import secrets
import hashlib
import datetime

from flask import jsonify, request
import bcrypt

from .auth import auth_bp
from app.database_setup import get_db_connection
from app.utils.email_services import _send_email


@auth_bp.route('/send-signup-otp', methods=['POST', 'OPTIONS'])
def send_signup_otp():
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

        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if email already registered
        cursor.execute("SELECT id FROM users WHERE email = %s;", [email])
        if cursor.fetchone():
            return jsonify({"error": "An account with this email already exists."}), 400

        # Generate 6-digit OTP
        plain_otp = str(secrets.randbelow(900000) + 100000)
        otp_hash = hashlib.sha256(plain_otp.encode('utf-8')).hexdigest()
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=10)

        # Upsert into pending_registrations
        cursor.execute("""
            INSERT INTO pending_registrations (email, name, password_hash, otp_hash, expires_at)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (email) 
            DO UPDATE SET 
                name = EXCLUDED.name,
                password_hash = EXCLUDED.password_hash,
                otp_hash = EXCLUDED.otp_hash,
                expires_at = EXCLUDED.expires_at,
                created_at = CURRENT_TIMESTAMP;
        """, [email, name, password_hash, otp_hash, expires_at])
        conn.commit()

        # Send OTP email
        body = (
            f"Hello {name},\n\n"
            f"Your verification code for AURA Estate registration is:\n\n"
            f"    {plain_otp}\n\n"
            f"This code will expire in 10 minutes.\n\n"
            f"If you did not request this, please ignore this email.\n\n"
            f"Best regards,\n"
            f"AURA Estate Team"
        )
        _send_email(email, "🔐 AURA Estate – Registration Verification Code", body)

        return jsonify({
            "success": True,
            "message": "Verification code sent to your email."
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": f"Failed to send OTP: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@auth_bp.route('/verify-signup-otp', methods=['POST', 'OPTIONS'])
def verify_signup_otp():
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    conn = None
    cursor = None
    try:
        data = request.json or {}
        email = data.get('email', '').strip().lower()
        otp = data.get('otp', '').strip()

        if not email or not otp:
            return jsonify({"error": "Email and OTP are required."}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT name, password_hash, otp_hash, expires_at 
            FROM pending_registrations 
            WHERE email = %s;
        """, [email])
        row = cursor.fetchone()

        if not row:
            return jsonify({"error": "No pending registration found. Please sign up again."}), 400

        name, password_hash, stored_otp_hash, expires_at = row
        incoming_hash = hashlib.sha256(otp.encode('utf-8')).hexdigest()

        if stored_otp_hash != incoming_hash:
            return jsonify({"error": "Invalid verification code."}), 400

        if expires_at:
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=datetime.timezone.utc)
            if datetime.datetime.now(datetime.timezone.utc) > expires_at:
                return jsonify({"error": "Verification code has expired. Please request a new one."}), 400

        # Create the real user
        cursor.execute("""
            INSERT INTO users (email, password_hash, name, role)
            VALUES (%s, %s, %s, 'user')
            RETURNING id;
        """, [email, password_hash, name])
        new_id = cursor.fetchone()[0]

        # Delete pending record
        cursor.execute("DELETE FROM pending_registrations WHERE email = %s;", [email])
        conn.commit()

        return jsonify({
            "success": True,
            "message": "Account created successfully! You can now log in.",
            "userId": new_id
        }), 201

    except Exception as e:
        if conn:
            conn.rollback()
        error_msg = str(e).lower()
        if "duplicate key" in error_msg or "already exists" in error_msg:
            return jsonify({"error": "An account with this email already exists."}), 400
        return jsonify({"error": f"Verification failed: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()