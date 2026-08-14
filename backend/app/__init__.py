import os
from flask import Flask, app, jsonify
from flask_cors import CORS
from app.config import config  # ✅ Import your config dictionary

def create_app(config_name=None):
    app = Flask(__name__)

    # Determine environment configuration (defaults to 'development')
    if not config_name:
        config_name = os.getenv("FLASK_ENV", "development")
    
    # Load settings from config.py
    app.config.from_object(config.get(config_name, config['default']))

    # 1. Disable strict slashes to prevent 308 redirects from breaking CORS preflights
    app.url_map.strict_slashes = False

    # 2. Configure dynamic allowed origins from env or default local dev ports
    env_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
    default_origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://localhost:5000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ]
    allowed_origins = env_origins if env_origins else default_origins

    # 3. Configure Flask-CORS
    CORS(
        app,
        resources={r"/*": {"origins": allowed_origins}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )

    # 4. Import Blueprints inside factory (prevents circular imports)
    from app.routes.auth import auth_bp
    from app.routes.predict import predict_bp
    from app.routes.meta import meta_bp
    from app.routes.history import history_bp
    from app.routes.chat import chat_bp
    from app.routes.admin import admin_bp
    from app.routes.reports import reports_bp
    from app.routes.comps import comps_bp
    from app.routes.share import share_bp
    from app.routes.properties import properties_bp

    # 5. Register Blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(predict_bp, url_prefix="/api/predict")
    app.register_blueprint(meta_bp, url_prefix="/api/meta")
    app.register_blueprint(history_bp, url_prefix="/api/history")
    app.register_blueprint(chat_bp, url_prefix="/api/chat")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")
    app.register_blueprint(comps_bp)
    app.register_blueprint(share_bp)
    app.register_blueprint(properties_bp)

    # 6. Global Health Check Endpoint
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            "status": "online",
            "service": "MMR Real Estate API",
            "environment": os.getenv("FLASK_ENV", "development")
        }), 200

    # 7. Fallback Error Handlers
    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({"error": "Requested API route was not found."}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "An internal server error occurred."}), 500

    return app