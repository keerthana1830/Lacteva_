from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import joblib
import logging
import os
from datetime import datetime
from contextlib import asynccontextmanager
from typing import List, Dict

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global model variables
classifier_model = None
feature_scaler = None
label_encoder = None
feature_names_list = None
model_metadata = None

def load_models():
    """Load trained models and preprocessing objects"""
    global classifier_model, feature_scaler, label_encoder, feature_names_list, model_metadata
    
    try:
        # Load the trained classifier
        if os.path.exists('models/lacteva_classifier.joblib'):
            classifier_model = joblib.load('models/lacteva_classifier.joblib')
            logger.info("✓ Loaded trained classifier")
        
        # Load scaler
        if os.path.exists('models/scaler.joblib'):
            feature_scaler = joblib.load('models/scaler.joblib')
            logger.info("✓ Loaded feature scaler")
        
        # Load label encoder
        if os.path.exists('models/label_encoder.joblib'):
            label_encoder = joblib.load('models/label_encoder.joblib')
            logger.info("✓ Loaded label encoder")
        
        # Load feature names
        if os.path.exists('models/feature_names.joblib'):
            feature_names_list = joblib.load('models/feature_names.joblib')
            logger.info(f"✓ Loaded {len(feature_names_list)} feature names")
        
        # Load model metadata
        if os.path.exists('models/model_metadata.joblib'):
            model_metadata = joblib.load('models/model_metadata.joblib')
            logger.info(f"✓ Model accuracy: {model_metadata.get('accuracy', 'N/A')}")
            
    except Exception as e:
        logger.error(f"Error loading models: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize models on startup"""
    load_models()
    yield

app = FastAPI(
    title="LACTEVA ML Service",
    description="Machine Learning service for milk quality prediction with real datasets",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class MLInput(BaseModel):
    features: List[float]
    deviceId: str = "unknown"
    timestamp: int = 0

class MLOutput(BaseModel):
    freshness_prediction: float
    shelf_life_hours: float
    confidence: float
    model_accuracy: float
    prediction_label: str
    feature_importance: Dict[str, float] = {}

@app.get("/")
async def root():
    return {
        "service": "LACTEVA ML Service",
        "version": "2.0.0",
        "status": "running",
        "models_loaded": {
            "classifier": classifier_model is not None,
            "scaler": feature_scaler is not None,
            "label_encoder": label_encoder is not None
        },
        "model_info": model_metadata if model_metadata else "No metadata available"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "models": {
            "classifier": type(classifier_model).__name__ if classifier_model else None,
            "scaler": type(feature_scaler).__name__ if feature_scaler else None,
            "label_encoder": type(label_encoder).__name__ if label_encoder else None
        },
        "accuracy": model_metadata.get('accuracy', 'N/A') if model_metadata else 'N/A'
    }

@app.post("/predict", response_model=MLOutput)
async def predict(input_data: MLInput):
    """Make predictions using the trained model"""
    try:
        if not all([classifier_model, feature_scaler, label_encoder]):
            raise HTTPException(status_code=503, detail="Models not loaded properly")
        
        # Validate input features
        expected_features = len(feature_names_list) if feature_names_list else 47
        if len(input_data.features) != expected_features:
            # If we have fewer features, pad with zeros
            if len(input_data.features) < expected_features:
                padded_features = input_data.features + [0.0] * (expected_features - len(input_data.features))
                logger.warning(f"Padded features from {len(input_data.features)} to {expected_features}")
            else:
                # If we have more features, truncate
                padded_features = input_data.features[:expected_features]
                logger.warning(f"Truncated features from {len(input_data.features)} to {expected_features}")
        else:
            padded_features = input_data.features
        
        # Prepare features
        features = np.array(padded_features).reshape(1, -1)
        
        # Handle NaN and inf values
        features = np.nan_to_num(features, nan=0.0, posinf=1e6, neginf=-1e6)
        
        # Scale features
        features_scaled = feature_scaler.transform(features)
        
        # Make prediction with fixed random state for consistency
        np.random.seed(42)  # Ensure consistent results
        
        prediction = classifier_model.predict(features_scaled)[0]
        probabilities = classifier_model.predict_proba(features_scaled)[0]
        
        # Get prediction label
        prediction_label = label_encoder.inverse_transform([prediction])[0]
        
        # Calculate freshness score and shelf life based on model output
        fresh_class_idx = list(label_encoder.classes_).index('fresh') if 'fresh' in label_encoder.classes_ else 1
        spoiled_class_idx = list(label_encoder.classes_).index('Spoiled') if 'Spoiled' in label_encoder.classes_ else 0
        
        if prediction == fresh_class_idx:
            # Fresh milk
            freshness_score = 0.7 + (probabilities[fresh_class_idx] * 0.3)  # 0.7-1.0 for fresh
            shelf_life_hours = 48 + (probabilities[fresh_class_idx] * 24)   # 48-72 hours
            prediction_label = 'fresh'
        else:
            # Spoiled milk
            freshness_score = probabilities[spoiled_class_idx] * 0.3  # 0.0-0.3 for spoiled
            shelf_life_hours = probabilities[spoiled_class_idx] * 12  # 0-12 hours
            prediction_label = 'spoiled'
        
        # Get confidence (highest probability)
        confidence = float(max(probabilities))
        
        # Get model accuracy
        accuracy = model_metadata.get('accuracy', 0.95) if model_metadata else 0.95
        
        # Simple feature importance (based on feature values)
        feature_importance = {}
        if feature_names_list and len(feature_names_list) == len(padded_features):
            # Normalize feature values for importance
            normalized_features = np.abs(padded_features) / (np.max(np.abs(padded_features)) + 1e-6)
            for i, name in enumerate(feature_names_list[:10]):  # Top 10 features
                feature_importance[name] = float(normalized_features[i])
        
        return MLOutput(
            freshness_prediction=freshness_score,
            shelf_life_hours=shelf_life_hours,
            confidence=confidence,
            model_accuracy=accuracy,
            prediction_label=prediction_label.lower(),
            feature_importance=feature_importance
        )
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.get("/model-info")
async def get_model_info():
    """Get detailed model information"""
    if not model_metadata:
        raise HTTPException(status_code=404, detail="Model metadata not available")
    
    return {
        "model_name": model_metadata.get('model_name', 'Unknown'),
        "accuracy": model_metadata.get('accuracy', 'N/A'),
        "feature_count": model_metadata.get('feature_count', 0),
        "training_date": model_metadata.get('training_date', 'Unknown'),
        "classes": model_metadata.get('classes', []),
        "feature_names": feature_names_list[:10] if feature_names_list else []  # First 10 features
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)