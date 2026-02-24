#!/usr/bin/env python3
"""
Simple LACTEVA Real Data ML Training Script
Handles datasets with many NaN values more robustly
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os
import warnings
warnings.filterwarnings('ignore')


def load_and_prepare_data():
    """Load and prepare the datasets"""
    print("Loading datasets...")
    
    try:
        # Load datasets
        fresh_df = pd.read_csv('../sample-data/Fresh_milk_dataset.csv')
        spoiled_df = pd.read_csv('../sample-data/Spoiled_Milk_dataset.csv')
        
        print(f"Fresh samples: {len(fresh_df)}")
        print(f"Spoiled samples: {len(spoiled_df)}")
        
        # Combine datasets
        df = pd.concat([fresh_df, spoiled_df], ignore_index=True)
        print(f"Total samples: {len(df)}")
        
        return df
        
    except Exception as e:
        print(f"Error loading data: {e}")
        return None

def preprocess_data(df):
    """Simple preprocessing for the spectral data"""
    print("Preprocessing data...")
    
    # Get all numeric columns except timestamp and label
    feature_cols = [col for col in df.columns 
                   if col not in ['timestamp_ms', 'label'] 
                   and df[col].dtype in ['int64', 'float64']]
    
    print(f"Feature columns: {len(feature_cols)}")
    
    # Fill NaN values with 0 (appropriate for spectral data)
    df[feature_cols] = df[feature_cols].fillna(0)
    
    # Replace inf values with large numbers
    df[feature_cols] = df[feature_cols].replace([np.inf, -np.inf], [1e6, -1e6])
    
    # Remove rows with missing labels
    df = df.dropna(subset=['label'])
    
    print(f"Samples after preprocessing: {len(df)}")
    print(f"Label distribution: {df['label'].value_counts()}")
    
    return df, feature_cols

def create_simple_features(df, feature_cols):
    """Create simple engineered features"""
    print("Creating engineered features...")
    
    # Get raw channel data
    raw_channels = [col for col in feature_cols if col.startswith('raw_ch')]
    reflect_channels = [col for col in feature_cols if col.startswith('reflect_ch')]
    absorb_channels = [col for col in feature_cols if col.startswith('absorb_ch')]
    
    print(f"Raw channels: {len(raw_channels)}")
    print(f"Reflect channels: {len(reflect_channels)}")
    print(f"Absorb channels: {len(absorb_channels)}")
    
    # Simple aggregated features
    if raw_channels:
        df['raw_sum'] = df[raw_channels].sum(axis=1)
        df['raw_mean'] = df[raw_channels].mean(axis=1)
        df['raw_max'] = df[raw_channels].max(axis=1)
        df['raw_std'] = df[raw_channels].std(axis=1).fillna(0)
    
    if reflect_channels:
        df['reflect_sum'] = df[reflect_channels].sum(axis=1)
        df['reflect_mean'] = df[reflect_channels].mean(axis=1)
    
    if absorb_channels:
        df['absorb_sum'] = df[absorb_channels].sum(axis=1)
        df['absorb_mean'] = df[absorb_channels].mean(axis=1)
    
    # Add new features to feature list
    new_features = ['raw_sum', 'raw_mean', 'raw_max', 'raw_std', 
                   'reflect_sum', 'reflect_mean', 'absorb_sum', 'absorb_mean']
    
    # Only include features that were actually created
    available_new_features = [f for f in new_features if f in df.columns]
    all_features = feature_cols + available_new_features
    
    print(f"Total features: {len(all_features)}")
    
    return df, all_features

def train_model(df, feature_cols):
    """Train a robust and consistent model"""
    print("Training model...")
    
    # Prepare data
    X = df[feature_cols].values
    y = df['label'].values
    
    # Encode labels
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    
    print(f"Classes: {label_encoder.classes_}")
    print(f"Class distribution: {np.bincount(y_encoded)}")
    
    # Split data with stratification for balanced training
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    
    # Scale features for consistency
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train Random Forest with optimized parameters for consistency
    model = RandomForestClassifier(
        n_estimators=200,  # More trees for stability
        random_state=42,   # Fixed seed for reproducibility
        max_depth=15,      # Deeper trees for better learning
        min_samples_split=10,  # Prevent overfitting
        min_samples_leaf=5,    # Ensure leaf nodes have enough samples
        bootstrap=True,        # Use bootstrap sampling
        oob_score=True,        # Out-of-bag scoring
        class_weight='balanced'  # Handle class imbalance
    )
    
    model.fit(X_train_scaled, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test_scaled)
    y_pred_proba = model.predict_proba(X_test_scaled)
    
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"Model Accuracy: {accuracy:.4f}")
    print(f"OOB Score: {model.oob_score_:.4f}")
    print(f"Feature Importance Range: {model.feature_importances_.min():.4f} - {model.feature_importances_.max():.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=label_encoder.classes_))
    
    # Test prediction consistency (same input should give same output)
    test_sample = X_test_scaled[0:1]  # First test sample
    pred1 = model.predict_proba(test_sample)[0]
    pred2 = model.predict_proba(test_sample)[0]
    consistency_check = np.allclose(pred1, pred2, rtol=1e-10)
    print(f"Prediction Consistency Check: {'PASS' if consistency_check else 'FAIL'}")
    
    return model, scaler, label_encoder, feature_cols, accuracy

def save_models(model, scaler, label_encoder, feature_names, accuracy):
    """Save the trained models"""
    print("Saving models...")
    
    # Create models directory
    os.makedirs('../ml-service/models', exist_ok=True)
    
    # Save models
    joblib.dump(model, '../ml-service/models/lacteva_classifier.joblib')
    joblib.dump(scaler, '../ml-service/models/scaler.joblib')
    joblib.dump(label_encoder, '../ml-service/models/label_encoder.joblib')
    joblib.dump(feature_names, '../ml-service/models/feature_names.joblib')
    
    # Save metadata
    metadata = {
        'model_name': 'RandomForest',
        'accuracy': accuracy,
        'feature_count': len(feature_names),
        'training_date': pd.Timestamp.now().isoformat(),
        'feature_names': feature_names,
        'classes': label_encoder.classes_.tolist()
    }
    
    joblib.dump(metadata, '../ml-service/models/model_metadata.joblib')
    
    print("✓ Models saved successfully!")
    print(f"✓ Accuracy: {accuracy:.4f}")
    print(f"✓ Features: {len(feature_names)}")

def main():
    """Main training function"""
    print("LACTEVA Simple Real Data Training")
    print("=" * 40)
    
    # Load data
    df = load_and_prepare_data()
    if df is None:
        print("❌ Failed to load data")
        return False
    
    # Preprocess
    df, feature_cols = preprocess_data(df)
    if len(df) == 0:
        print("❌ No data remaining after preprocessing")
        return False
    
    # Engineer features
    df, all_features = create_simple_features(df, feature_cols)
    
    # Train model
    model, scaler, label_encoder, feature_names, accuracy = train_model(df, all_features)
    
    # Save models
    save_models(model, scaler, label_encoder, feature_names, accuracy)
    
    print("\n" + "=" * 40)
    print("🎉 Training completed successfully!")
    print(f"Model accuracy: {accuracy:.1%}")
    print("Ready for predictions!")
    
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        print("\n❌ Training failed")
        exit(1)