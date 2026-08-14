from flask import Blueprint, jsonify, request
from flask_cors import CORS
from app.database_setup import get_db_connection
from app.utils.auth_middleware import admin_required

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')
CORS(admin_bp, supports_credentials=True)


@admin_bp.route('/predictions', methods=['GET', 'OPTIONS'])
@admin_required
def get_admin_predictions(current_user_id, current_user_role):
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT 
                id, user_id, timestamp, locality, property_type, 
                furnishing_status, property_age, area_sqft, bhk_size, 
                bathrooms, balconies, normal_min, normal_max, 
                premium_min, premium_max, brand_min, brand_max 
            FROM valuation_logs 
            ORDER BY timestamp DESC
            LIMIT 200;
        """)
        rows = cursor.fetchall()

        formatted_data = []
        for row in rows:
            formatted_data.append({
                "id": row[0],
                "userId": row[1],
                "timestamp": str(row[2]) if row[2] else None,
                "locality": row[3],
                "property_type": row[4],
                "furnishing_status": row[5],
                "property_age": row[6],
                "area_sqft": float(row[7]) if row[7] is not None else 0,
                "bhk": row[8],
                "bathrooms": row[9],
                "balconies": row[10],
                "normal_min": row[11],
                "normal_max": row[12],
                "premium_min": row[13],
                "premium_max": row[14],
                "brand_min": row[15],
                "brand_max": row[16]
            })

        return jsonify({"success": True, "data": formatted_data, "count": len(formatted_data)}), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@admin_bp.route('/chat-history', methods=['GET', 'OPTIONS'])
@admin_required
def get_all_chat_history(current_user_id, current_user_role):
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT 
                ch.id, ch.user_id, u.email, 
                ch.user_message, ch.bot_response, ch.created_at 
            FROM chat_history ch
            LEFT JOIN users u ON ch.user_id = u.id
            ORDER BY ch.created_at DESC 
            LIMIT 150;
        """)

        rows = cursor.fetchall()
        chats = []
        for r in rows:
            chats.append({
                "id": r[0],
                "userId": r[1],
                "userEmail": r[2] if r[2] else "Guest User",
                "userMessage": r[3],
                "botResponse": r[4],
                "createdAt": str(r[5]) if r[5] else None
            })

        return jsonify({"success": True, "data": chats, "count": len(chats)}), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "error": f"Failed to fetch chat logs: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@admin_bp.route('/users', methods=['GET', 'OPTIONS'])
@admin_required
def get_admin_users(current_user_id, current_user_role):
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, email, role, last_login, created_at, name
            FROM users 
            ORDER BY id DESC;
        """)

        rows = cursor.fetchall()
        users_list = []

        for row in rows:
            email = row[1] or ""
            derived_name = row[5] or (email.split("@")[0] if email else "N/A")
            role = row[2] or "user"

            users_list.append({
                "id": row[0],
                "name": derived_name,
                "email": email,
                "role": role.upper(),
                "lastLogin": str(row[3]) if row[3] else "Never",
                "createdAt": str(row[4]) if row[4] else None
            })

        return jsonify({"success": True, "data": users_list, "count": len(users_list)}), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@admin_bp.route('/update-role', methods=['PUT', 'OPTIONS'])
@admin_required
def update_user_role(current_user_id, current_user_role):
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    conn = None
    cursor = None
    try:
        data = request.json or {}
        target_user_id = data.get("user_id") or data.get("userId")
        target_email = data.get("email")
        new_role = data.get("role", "").strip().lower()

        if new_role not in ['admin', 'user']:
            return jsonify({"success": False, "error": "Invalid role. Must be 'admin' or 'user'."}), 400

        if not target_user_id and not target_email:
            return jsonify({"success": False, "error": "Specify either user_id or email."}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # -------------------------------------------------
        # 1. Find the protected "Default Admin"
        #    (the admin with the lowest ID)
        # -------------------------------------------------
        cursor.execute("""
            SELECT id FROM users 
            WHERE role = 'admin' 
            ORDER BY id ASC 
            LIMIT 1;
        """)
        protected_row = cursor.fetchone()
        protected_admin_id = protected_row[0] if protected_row else None

        # Resolve target user id if email was given
        if not target_user_id and target_email:
            cursor.execute("SELECT id FROM users WHERE email = %s;", [target_email])
            row = cursor.fetchone()
            if not row:
                return jsonify({"success": False, "error": "Target user not found."}), 404
            target_user_id = row[0]

        target_user_id = int(target_user_id)

        # -------------------------------------------------
        # 2. Protect the Default Admin from being demoted
        # -------------------------------------------------
        if protected_admin_id and target_user_id == protected_admin_id and new_role != "admin":
            return jsonify({
                "success": False,
                "error": "This is the Default Admin account and cannot be demoted."
            }), 400

        # -------------------------------------------------
        # 3. Perform the update
        # -------------------------------------------------
        cursor.execute(
            "UPDATE users SET role = %s WHERE id = %s RETURNING id, email, role;",
            [new_role, target_user_id]
        )

        updated_row = cursor.fetchone()
        conn.commit()

        if not updated_row:
            return jsonify({"success": False, "error": "Target user not found."}), 404

        return jsonify({
            "success": True,
            "message": f"User '{updated_row[1]}' updated to role '{updated_row[2].upper()}'.",
            "data": {
                "id": updated_row[0],
                "email": updated_row[1],
                "role": updated_row[2].upper()
            }
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "error": f"Failed to update user role: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@admin_bp.route('/stats', methods=['GET', 'OPTIONS'])
@admin_required
def get_admin_stats(current_user_id, current_user_role):
    """Simple dashboard stats for admin panel."""
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM users;")
        total_users = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM valuation_logs;")
        total_predictions = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM chat_history;")
        total_chats = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM generated_reports;")
        total_reports = cursor.fetchone()[0]

        cursor.execute("""
            SELECT locality, COUNT(*) as cnt 
            FROM valuation_logs 
            GROUP BY locality 
            ORDER BY cnt DESC 
            LIMIT 5;
        """)
        top_localities = [{"locality": r[0], "count": r[1]} for r in cursor.fetchall()]

        return jsonify({
            "success": True,
            "data": {
                "totalUsers": total_users,
                "totalPredictions": total_predictions,
                "totalChats": total_chats,
                "totalReports": total_reports,
                "topLocalities": top_localities
            }
        }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
@admin_bp.route('/ban-user', methods=['PUT', 'OPTIONS'])
@admin_required
def ban_user(current_user_id, current_user_role):
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    conn = None
    cursor = None
    try:
        data = request.json or {}
        target_user_id = data.get("user_id") or data.get("userId")

        if not target_user_id:
            return jsonify({"success": False, "error": "user_id is required."}), 400

        target_user_id = int(target_user_id)

        conn = get_db_connection()
        cursor = conn.cursor()

        # Protect Default Admin
        cursor.execute("""
            SELECT id FROM users 
            WHERE role = 'admin' 
            ORDER BY id ASC 
            LIMIT 1;
        """)
        protected = cursor.fetchone()
        if protected and protected[0] == target_user_id:
            return jsonify({
                "success": False,
                "error": "Default Admin cannot be banned."
            }), 400

        # Soft ban: set role to 'banned'
        cursor.execute(
            "UPDATE users SET role = 'banned' WHERE id = %s RETURNING id, email, role;",
            [target_user_id]
        )
        updated = cursor.fetchone()
        conn.commit()

        if not updated:
            return jsonify({"success": False, "error": "User not found."}), 404

        return jsonify({
            "success": True,
            "message": f"User '{updated[1]}' has been banned.",
            "data": {"id": updated[0], "email": updated[1], "role": updated[2].upper()}
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


@admin_bp.route('/unban-user', methods=['PUT', 'OPTIONS'])
@admin_required
def unban_user(current_user_id, current_user_role):
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    conn = None
    cursor = None
    try:
        data = request.json or {}
        target_user_id = data.get("user_id") or data.get("userId")

        if not target_user_id:
            return jsonify({"success": False, "error": "user_id is required."}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "UPDATE users SET role = 'user' WHERE id = %s AND role = 'banned' RETURNING id, email, role;",
            [int(target_user_id)]
        )
        updated = cursor.fetchone()
        conn.commit()

        if not updated:
            return jsonify({"success": False, "error": "User not found or not banned."}), 404

        return jsonify({
            "success": True,
            "message": f"User '{updated[1]}' has been unbanned.",
            "data": {"id": updated[0], "email": updated[1], "role": updated[2].upper()}
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