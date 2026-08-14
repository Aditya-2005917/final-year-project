from flask import Blueprint, request, jsonify
from flask_cors import CORS
from app.utils.auth_middleware import token_required
from app.services.chat_services import process_chat_message, fetch_user_chat_history

chat_bp = Blueprint('chat', __name__)
CORS(chat_bp, supports_credentials=True)


@chat_bp.route('/', methods=['POST', 'OPTIONS'])
@token_required
def handle_chat(current_user_id, current_user_role):
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    # Extra safety
    if str(current_user_role).lower() == "banned":
        return jsonify({
            "success": False,
            "error": "Your account has been suspended. Please contact support."
        }), 403

    try:
        data = request.json or {}
        user_message = data.get("message", "").strip()

        if not user_message:
            return jsonify({"error": "Message content cannot be empty."}), 400

        if len(user_message) > 2000:
            return jsonify({"error": "Message is too long. Maximum 2000 characters."}), 400

        bot_response = process_chat_message(user_message, current_user_id)

        return jsonify({
            "success": True,
            "response": bot_response,
            "reply": bot_response
        }), 200

    except Exception as e:
        return jsonify({"error": f"Chat Processing Error: {str(e)}"}), 500


@chat_bp.route('/chat-history', methods=['GET', 'OPTIONS'])
@token_required
def get_user_chat_history(current_user_id, current_user_role):
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    if current_user_id == 0 or str(current_user_role).lower() == "guest":
        return jsonify({
            "success": False,
            "error": "Please log in to view chat history."
        }), 401

    if str(current_user_role).lower() == "banned":
        return jsonify({
            "success": False,
            "error": "Your account has been suspended. Please contact support."
        }), 403

    try:
        history = fetch_user_chat_history(current_user_id)
        return jsonify({"success": True, "data": history}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve chat history: {str(e)}"}), 500