from datetime import datetime
from app import db

class Prediction(db.Model):
    __tablename__ = 'predictions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=True)  # Set nullable=True until auth/users are connected
    
    # Property Features
    locality = db.Column(db.String(150), nullable=False)
    property_type = db.Column(db.String(50), nullable=False)
    bhk_size = db.Column(db.Integer, nullable=False)
    bathroom_count = db.Column(db.Integer, nullable=False)
    area_sqft = db.Column(db.Float, nullable=False)
    furnishing_status = db.Column(db.String(50), nullable=False)
    property_age = db.Column(db.Integer, nullable=True)
    
    # Result
    predicted_price = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "locality": self.locality,
            "property_type": self.property_type,
            "bhk_size": self.bhk_size,
            "bathroom_count": self.bathroom_count,
            "area_sqft": self.area_sqft,
            "furnishing_status": self.furnishing_status,
            "property_age": self.property_age,
            "predicted_price": self.predicted_price,
            "created_at": self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }