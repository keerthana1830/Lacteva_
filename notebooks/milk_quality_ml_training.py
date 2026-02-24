# LACTEVA Milk Quality ML Training Notebook
# This script trains machine learning models for milk quality prediction


import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix, mean_squared_error, r2_score
import xgboost as xgb
import lightgbm as lgb
import joblib
# ONNX imports (optional for faster inference)
try:
    import onnx
    import onnxmltools
    from skl2onnx import convert_sklearn
    from skl2onnx.common.data_types import FloatTensorType
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False
    print("ONNX not available - will save joblib models only")
import warnings
warnings.filterwarnings('ignore')

# Set random seed for reproducibility
np.random.seed(42)

print("LACTEVA Milk Quality ML Training")
print("=" * 50)

# Feature names (matching the spectral analysis features)
FEATURE_NAMES = [
    'peak_wavelength', 'peak_intensity', 'area_under_curve', 'vis_nir_delta',
    'red_ratio', 'green_ratio', 'blue_ratio', 'turbidity_index',
    'protein_color_est', 'fat_color_est', 'a680_a550_ratio', 'a630_slope',
    'uv_blue_ratio', 'nir_absorption_index', 'k_value_spoilage',
    'moving_average', 'exponential_decay', 'fermentation_slope'
]

def generate_synthetic_data(n_samples=5000):
    """Generate synthetic milk quality data for training"""
    print(f"Generating {n_samples} synthetic samples...")
    
    # Generate base spectral features
    np.random.seed(42)
    
    # Peak wavelength (415-680 nm range)
    peak_wavelength = np.random.normal(550, 50, n_samples)
    peak_wavelength = np.clip(peak_wavelength, 415, 680)
    
    # Peak intensity (correlated with freshness)
    freshness_factor = np.random.beta(2, 2, n_samples)  # 0-1 range
    peak_intensity = 1000 + 2000 * freshness_factor + np.random.normal(0, 200, n_samples)
    peak_intensity = np.clip(peak_intensity, 100, 5000)
    
    # Area under curve
    area_under_curve = peak_intensity * (5 + 3 * freshness_factor) + np.random.normal(0, 1000, n_samples)
    
    # VIS-NIR delta (visible vs near-infrared difference)
    vis_nir_delta = 500 * freshness_factor + np.random.normal(0, 100, n_samples)
    
    # RGB ratios (normalized)
    red_base = 0.3 + 0.2 * (1 - freshness_factor) + np.random.normal(0, 0.05, n_samples)
    green_base = 0.4 + 0.1 * freshness_factor + np.random.normal(0, 0.05, n_samples)
    blue_base = 0.3 + 0.1 * freshness_factor + np.random.normal(0, 0.05, n_samples)
    
    # Normalize RGB
    rgb_sum = red_base + green_base + blue_base
    red_ratio = red_base / rgb_sum
    green_ratio = green_base / rgb_sum
    blue_ratio = blue_base / rgb_sum
    
    # Turbidity index (higher = more spoiled)
    turbidity_index = 0.5 + 0.8 * (1 - freshness_factor) + np.random.normal(0, 0.1, n_samples)
    turbidity_index = np.clip(turbidity_index, 0.1, 2.0)
    
    # Protein and fat color estimates
    protein_color_est = 0.2 + 0.3 * freshness_factor + np.random.normal(0, 0.05, n_samples)
    fat_color_est = 0.15 + 0.25 * freshness_factor + np.random.normal(0, 0.05, n_samples)
    
    # Absorbance ratios
    a680_a550_ratio = 0.8 + 0.4 * (1 - freshness_factor) + np.random.normal(0, 0.1, n_samples)
    a630_slope = 0.1 * freshness_factor + np.random.normal(0, 0.02, n_samples)
    
    # UV-Blue ratio
    uv_blue_ratio = 0.6 + 0.3 * freshness_factor + np.random.normal(0, 0.1, n_samples)
    
    # NIR absorption index
    nir_absorption_index = 0.4 + 0.4 * (1 - freshness_factor) + np.random.normal(0, 0.08, n_samples)
    
    # K-value spoilage indicator (key spoilage metric)
    k_value_spoilage = 0.2 + 1.5 * (1 - freshness_factor) + np.random.normal(0, 0.15, n_samples)
    k_value_spoilage = np.clip(k_value_spoilage, 0, 2.5)
    
    # Time series features
    moving_average = peak_intensity * 0.8 + np.random.normal(0, 100, n_samples)
    exponential_decay = np.exp(-2 * (1 - freshness_factor)) + np.random.normal(0, 0.1, n_samples)
    fermentation_slope = 0.05 * (1 - freshness_factor) + np.random.normal(0, 0.01, n_samples)
    
    # Combine all features
    features = np.column_stack([
        peak_wavelength, peak_intensity, area_under_curve, vis_nir_delta,
        red_ratio, green_ratio, blue_ratio, turbidity_index,
        protein_color_est, fat_color_est, a680_a550_ratio, a630_slope,
        uv_blue_ratio, nir_absorption_index, k_value_spoilage,
        moving_average, exponential_decay, fermentation_slope
    ])
    
    # Generate target variables
    # Freshness score (0-1, where 1 is fresh)
    freshness_scores = freshness_factor
    
    # Add some noise and edge cases
    noise = np.random.normal(0, 0.05, n_samples)
    freshness_scores = np.clip(freshness_scores + noise, 0, 1)
    
    # Shelf life in hours (0-168 hours = 1 week max)
    base_shelf_life = 72  # 3 days base
    shelf_life_hours = base_shelf_life * freshness_scores + np.random.normal(0, 12, n_samples)
    shelf_life_hours = np.clip(shelf_life_hours, 0, 168)
    
    # Create DataFrame
    df = pd.DataFrame(features, columns=FEATURE_NAMES)
    df['freshness_score'] = freshness_scores
    df['shelf_life_hours'] = shelf_life_hours
    
    # Clean any NaN or infinite values
    df = df.replace([np.inf, -np.inf], np.nan)
    df = df.fillna(df.mean())
    
    # Add categorical freshness labels
    df['freshness_category'] = pd.cut(
        df['freshness_score'], 
        bins=[0, 0.4, 0.7, 1.0], 
        labels=['spoiled', 'moderate', 'fresh']
    )
    
    print(f"Generated dataset shape: {df.shape}")
    print(f"Freshness distribution:")
    print(df['freshness_category'].value_counts())
    
    return df

def explore_data(df):
    """Explore the generated dataset"""
    print("\nData Exploration")
    print("-" * 30)
    
    # Basic statistics
    print("Dataset Info:")
    print(f"Samples: {len(df)}")
    print(f"Features: {len(FEATURE_NAMES)}")
    print(f"Missing values: {df.isnull().sum().sum()}")
    
    # Target distribution
    print(f"\nFreshness Score Stats:")
    print(df['freshness_score'].describe())
    
    print(f"\nShelf Life Stats:")
    print(df['shelf_life_hours'].describe())
    
    # Correlation analysis
    print(f"\nTop correlations with freshness:")
    correlations = df[FEATURE_NAMES + ['freshness_score']].corr()['freshness_score'].abs().sort_values(ascending=False)
    print(correlations.head(10))
    
    return df

def train_freshness_classifier(X_train, X_test, y_train, y_test):
    """Train freshness classification model"""
    print("\nTraining Freshness Classifier")
    print("-" * 40)
    
    # Convert continuous scores to categories for classification
    y_train_cat = pd.cut(y_train, bins=[0, 0.4, 0.7, 1.0], labels=[0, 1, 2])
    y_test_cat = pd.cut(y_test, bins=[0, 0.4, 0.7, 1.0], labels=[0, 1, 2])
    
    # Handle any NaN values
    y_train_cat = y_train_cat.fillna(0).astype(int)
    y_test_cat = y_test_cat.fillna(0).astype(int)
    
    models = {
        'RandomForest': RandomForestClassifier(n_estimators=100, random_state=42),
        'XGBoost': xgb.XGBClassifier(random_state=42, eval_metric='mlogloss'),
        'LightGBM': lgb.LGBMClassifier(random_state=42, verbose=-1)
    }
    
    best_model = None
    best_score = 0
    
    for name, model in models.items():
        # Train model
        model.fit(X_train, y_train_cat)
        
        # Evaluate
        train_score = model.score(X_train, y_train_cat)
        test_score = model.score(X_test, y_test_cat)
        
        print(f"{name}:")
        print(f"  Train Accuracy: {train_score:.4f}")
        print(f"  Test Accuracy: {test_score:.4f}")
        
        if test_score > best_score:
            best_score = test_score
            best_model = model
    
    # Detailed evaluation of best model
    y_pred = best_model.predict(X_test)
    print(f"\nBest Model Classification Report:")
    print(classification_report(y_test_cat, y_pred, target_names=['Spoiled', 'Moderate', 'Fresh']))
    
    return best_model

def train_shelf_life_regressor(X_train, X_test, y_train, y_test):
    """Train shelf life regression model"""
    print("\nTraining Shelf Life Regressor")
    print("-" * 40)
    
    models = {
        'RandomForest': RandomForestRegressor(n_estimators=100, random_state=42),
        'XGBoost': xgb.XGBRegressor(random_state=42),
        'LightGBM': lgb.LGBMRegressor(random_state=42, verbose=-1)
    }
    
    best_model = None
    best_score = float('inf')
    
    for name, model in models.items():
        # Train model
        model.fit(X_train, y_train)
        
        # Evaluate
        train_pred = model.predict(X_train)
        test_pred = model.predict(X_test)
        
        train_mse = mean_squared_error(y_train, train_pred)
        test_mse = mean_squared_error(y_test, test_pred)
        test_r2 = r2_score(y_test, test_pred)
        
        print(f"{name}:")
        print(f"  Train MSE: {train_mse:.4f}")
        print(f"  Test MSE: {test_mse:.4f}")
        print(f"  Test R²: {test_r2:.4f}")
        
        if test_mse < best_score:
            best_score = test_mse
            best_model = model
    
    return best_model

def save_models(freshness_model, shelf_life_model, scaler):
    """Save trained models"""
    print("\nSaving Models")
    print("-" * 20)
    
    import os
    os.makedirs('../ml-service/models', exist_ok=True)
    
    # Save sklearn models
    joblib.dump(freshness_model, '../ml-service/models/freshness_model.joblib')
    joblib.dump(shelf_life_model, '../ml-service/models/shelf_life_model.joblib')
    joblib.dump(scaler, '../ml-service/models/scaler.joblib')
    
    print("✓ Saved joblib models")
    
    # Convert to ONNX for faster inference (if available)
    if ONNX_AVAILABLE:
        try:
            # Define input type
            initial_type = [('float_input', FloatTensorType([None, len(FEATURE_NAMES)]))]
            
            # Convert freshness model
            freshness_onnx = convert_sklearn(freshness_model, initial_types=initial_type)
            with open('../ml-service/models/freshness_model.onnx', 'wb') as f:
                f.write(freshness_onnx.SerializeToString())
            
            # Convert shelf life model
            shelf_life_onnx = convert_sklearn(shelf_life_model, initial_types=initial_type)
            with open('../ml-service/models/shelf_life_model.onnx', 'wb') as f:
                f.write(shelf_life_onnx.SerializeToString())
            
            print("✓ Saved ONNX models")
            
        except Exception as e:
            print(f"⚠ Could not save ONNX models: {e}")
    else:
        print("⚠ ONNX not available - skipping ONNX model export")

def main():
    """Main training pipeline"""
    print("Starting LACTEVA ML Training Pipeline")
    print("=" * 50)
    
    # Generate synthetic data
    df = generate_synthetic_data(n_samples=5000)
    
    # Explore data
    df = explore_data(df)
    
    # Prepare features and targets
    X = df[FEATURE_NAMES].values
    y_freshness = df['freshness_score'].values
    y_shelf_life = df['shelf_life_hours'].values
    
    # Split data
    X_train, X_test, y_fresh_train, y_fresh_test, y_shelf_train, y_shelf_test = train_test_split(
        X, y_freshness, y_shelf_life, test_size=0.2, random_state=42
    )
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    print(f"\nTraining set size: {X_train_scaled.shape}")
    print(f"Test set size: {X_test_scaled.shape}")
    
    # Train models
    freshness_model = train_freshness_classifier(X_train_scaled, X_test_scaled, y_fresh_train, y_fresh_test)
    shelf_life_model = train_shelf_life_regressor(X_train_scaled, X_test_scaled, y_shelf_train, y_shelf_test)
    
    # Feature importance analysis
    print("\nFeature Importance Analysis")
    print("-" * 40)
    
    if hasattr(freshness_model, 'feature_importances_'):
        importance_df = pd.DataFrame({
            'feature': FEATURE_NAMES,
            'importance': freshness_model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print("Top 10 Most Important Features:")
        print(importance_df.head(10))
    
    # Save models
    save_models(freshness_model, shelf_life_model, scaler)
    
    print("\n" + "=" * 50)
    print("Training Complete!")
    print("Models saved to ../ml-service/models/")
    print("Ready for deployment with FastAPI service")

if __name__ == "__main__":
    main()