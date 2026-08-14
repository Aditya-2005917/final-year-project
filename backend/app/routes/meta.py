from flask import Blueprint, jsonify, request
from flask_cors import CORS
from app.database_setup import get_db_connection

meta_bp = Blueprint('meta', __name__)
CORS(meta_bp, supports_credentials=True)


@meta_bp.route('/meta-options', methods=['GET', 'OPTIONS'])
def get_dataset_meta_options():
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        table_name = "mumbai_properties"

        cursor.execute(f"""
            SELECT DISTINCT INITCAP(TRIM(locality)) 
            FROM {table_name} 
            WHERE locality IS NOT NULL AND TRIM(locality) != '' 
            ORDER BY INITCAP(TRIM(locality)) ASC;
        """)
        localities = [row[0] for row in cursor.fetchall()]

        cursor.execute(f"""
            SELECT DISTINCT INITCAP(TRIM(property_type)) 
            FROM {table_name} 
            WHERE property_type IS NOT NULL AND TRIM(property_type) != '' 
            ORDER BY INITCAP(TRIM(property_type)) ASC;
        """)
        property_types = [row[0] for row in cursor.fetchall()]

        cursor.execute(f"""
            SELECT DISTINCT INITCAP(TRIM(furnishing_status)) 
            FROM {table_name} 
            WHERE furnishing_status IS NOT NULL AND TRIM(furnishing_status) != '' 
            ORDER BY INITCAP(TRIM(furnishing_status)) ASC;
        """)
        furnishing_options = [row[0] for row in cursor.fetchall()]

        return jsonify({
            "localities": sorted(list(set([str(loc).strip() for loc in localities if loc]))),
            "property_types": sorted(list(set([str(pt).strip() for pt in property_types if pt]))),
            "furnishing_statuses": sorted(list(set([str(f).strip() for f in furnishing_options if f]))),
            "property_age_range": {"min": 0, "max": 60, "default": 5}
        }), 200

    except Exception as e:
        # Fallback defaults if DB query fails
        return jsonify({
            "localities": [
                "Andheri", "Bandra", "Borivali", "Chembur", "Ghatkopar",
                "Goregaon", "Kalyan", "Malad", "Mulund", "Powai", "Thane"
            ],
            "property_types": ["Apartment", "Villa", "Independent House", "Penthouse"],
            "furnishing_statuses": ["Unfurnished", "Semi-Furnished", "Fully Furnished"],
            "property_age_range": {"min": 0, "max": 60, "default": 5}
        }), 200
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()