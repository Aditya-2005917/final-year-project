from datetime import datetime
from app.database_setup import db
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships to other tables
    predictions = db.relationship('Prediction', backref='user', lazy=True, cascade="all, delete-orphan")
    chats = db.relationship('Chat', backref='user', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        """Generates and sets a secure password hash."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Validates the password against the stored hash."""
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "created_at": self.created_at.isoformat()
        }