import os
from dotenv import load_dotenv
from app import create_app

# Load environment variables from .env file in backend directory
load_dotenv()

# Get application environment (default to 'development')
env_name = os.getenv('FLASK_ENV', 'development')

# Instantiate application using the factory
app = create_app()

if __name__ == '__main__':
    # Enable debug mode only in development environment
    is_debug = env_name == 'development'
    
    # Run application
    app.run(
        host=os.getenv('FLASK_RUN_HOST', '0.0.0.0'),
        port=int(os.getenv('FLASK_RUN_PORT', 5000)),
        debug=is_debug
    )