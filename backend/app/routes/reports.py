import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from flask import Blueprint, request, jsonify, send_file
from app.services.pdf_service import generate_valuation_pdf
from app.database_setup import get_db_connection
from app.utils.auth_middleware import token_required

reports_bp = Blueprint('reports', __name__)

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD")


def log_report_to_db(user_id, property_data, report_type="Valuation"):
    """Helper to log report generation into generated_reports table."""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO generated_reports 
                (user_id, locality, bhk, area, furnishing, report_type)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id;
        """, [
            user_id,
            property_data.get('locality'),
            property_data.get('bhk') or property_data.get('bhk_size'),
            property_data.get('area') or property_data.get('area_sqft'),
            property_data.get('furnishing') or property_data.get('furnishing_status'),
            report_type
        ])
        new_id = cursor.fetchone()[0]
        conn.commit()
        return new_id
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"⚠️ Failed to log report history: {e}")
        return None
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# --------------------------------------------------------------------------
# 1. SAVE TO WATCHLIST
# --------------------------------------------------------------------------
@reports_bp.route('/save', methods=['POST', 'OPTIONS'])
@token_required
def save_report(current_user_id, current_user_role):
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    if current_user_id == 0 or str(current_user_role).lower() == "guest":
        return jsonify({
            "success": False,
            "error": "Please log in to save reports to your watchlist."
        }), 401

    data = request.json or {}
    property_data = data.get('property_data') or {}
    valuations = data.get('valuations') or {}

    if not property_data.get('locality'):
        return jsonify({"success": False, "error": "Missing property locality"}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO generated_reports 
                (user_id, locality, bhk, area, furnishing, report_type)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, created_at;
        """, [
            current_user_id,
            property_data.get('locality'),
            property_data.get('bhk') or property_data.get('bhk_size') or 1,
            property_data.get('area') or property_data.get('area_sqft') or 0,
            property_data.get('furnishing') or property_data.get('furnishing_status') or "Unfurnished",
            "Watchlist"
        ])

        row = cursor.fetchone()
        conn.commit()

        return jsonify({
            "success": True,
            "message": "Report saved to your watchlist successfully.",
            "id": row[0],
            "createdAt": str(row[1]) if row[1] else None
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({
            "success": False,
            "error": f"Failed to save report: {str(e)}"
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# --------------------------------------------------------------------------
# 2. DOWNLOAD PDF
# --------------------------------------------------------------------------
@reports_bp.route('/download-pdf', methods=['POST', 'OPTIONS'])
@token_required
def download_pdf(current_user_id, current_user_role):
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    data = request.json or {}
    property_data = data.get('property_data')
    valuations = data.get('valuations')

    if not property_data or not valuations:
        return jsonify({"error": "Missing payload data"}), 400

    # Only log if user is authenticated
    if current_user_id and current_user_id != 0:
        log_report_to_db(current_user_id, property_data, report_type="PDF Download")

    pdf_buffer = generate_valuation_pdf(property_data, valuations)

    return send_file(
        pdf_buffer,
        as_attachment=True,
        download_name="AURA_Valuation_Report.pdf",
        mimetype="application/pdf"
    )


# --------------------------------------------------------------------------
# 3. EMAIL PDF
# --------------------------------------------------------------------------
@reports_bp.route('/email-pdf', methods=['POST', 'OPTIONS'])
@token_required
def email_pdf(current_user_id, current_user_role):
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    data = request.json or {}
    recipient_email = data.get('email', '').strip().lower()
    property_data = data.get('property_data')
    valuations = data.get('valuations')

    if not recipient_email or not property_data or not valuations:
        return jsonify({"error": "Missing recipient email or property data."}), 400

    if not SENDER_EMAIL or not SENDER_PASSWORD:
        return jsonify({"error": "SMTP credentials are not configured on the server."}), 500

    try:
        if current_user_id and current_user_id != 0:
            log_report_to_db(current_user_id, property_data, report_type="Email Report")

        pdf_buffer = generate_valuation_pdf(property_data, valuations)
        pdf_bytes = pdf_buffer.getvalue()

        msg = MIMEMultipart()
        msg['Subject'] = "📊 Your AURA Real Estate Valuation Report"
        msg['From'] = SENDER_EMAIL
        msg['To'] = recipient_email

        body = (
            f"Hello,\n\n"
            f"Attached is your requested property valuation report for "
            f"{property_data.get('locality', 'your property')}.\n\n"
            f"Best regards,\n"
            f"AURA Estate Intelligence Team"
        )
        msg.attach(MIMEText(body, 'plain'))

        attachment = MIMEApplication(pdf_bytes, Name="AURA_Valuation_Report.pdf")
        attachment['Content-Disposition'] = 'attachment; filename="AURA_Valuation_Report.pdf"'
        msg.attach(attachment)

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.sendmail(SENDER_EMAIL, recipient_email, msg.as_string())

        return jsonify({
            "success": True,
            "message": f"Valuation report successfully emailed to {recipient_email}."
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to send email: {str(e)}"}), 500


# --------------------------------------------------------------------------
# 4. GET USER REPORT / WATCHLIST HISTORY
# --------------------------------------------------------------------------
@reports_bp.route('/report-history', methods=['GET', 'OPTIONS'])
@token_required
def get_user_reports(current_user_id, current_user_role):
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    if current_user_id == 0 or str(current_user_role).lower() == "guest":
        return jsonify({"success": False, "error": "Login required to view report history."}), 401

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, locality, bhk, area, furnishing, report_type, created_at 
            FROM generated_reports 
            WHERE user_id = %s 
            ORDER BY created_at DESC;
        """, [current_user_id])

        rows = cursor.fetchall()
        reports = []
        for row in rows:
            reports.append({
                "id": row[0],
                "locality": row[1],
                "bhk": row[2],
                "area": row[3],
                "furnishing": row[4],
                "reportType": row[5],
                "createdAt": str(row[6]) if row[6] else None
            })

        return jsonify({"success": True, "reports": reports}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to retrieve report history: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# --------------------------------------------------------------------------
# 5. DELETE REPORT / WATCHLIST ITEM
# --------------------------------------------------------------------------
@reports_bp.route('/report-history/<int:report_id>', methods=['DELETE', 'OPTIONS'])
@reports_bp.route('/report-history/<int:report_id>/', methods=['DELETE', 'OPTIONS'])
@token_required
def delete_user_report(current_user_id, current_user_role, report_id):
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    if current_user_id == 0 or str(current_user_role).lower() == "guest":
        return jsonify({"success": False, "error": "Login required."}), 401

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            DELETE FROM generated_reports 
            WHERE id = %s AND user_id = %s 
            RETURNING id;
        """, [report_id, current_user_id])

        deleted_row = cursor.fetchone()
        conn.commit()

        if not deleted_row:
            return jsonify({"success": False, "error": "Report not found or unauthorized."}), 404

        return jsonify({
            "success": True,
            "message": f"Report ID {report_id} successfully deleted."
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "error": f"Failed to delete report: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()