#!/usr/bin/env python3
"""
LACTEVA Improved ML Training Script
Enhanced training with better consistency and accuracy
"""


import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, roc_auc_score
import joblib
import warnings
import os
from datetime import datetime

warnings.filterwarnings('ignore')

# Set random seeds for reproducibility
RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)

print("LACTEVA Improved ML Training")
print("=" * 50)

class ImprovedLactevaTrainer:
    def __init__(self):
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.feature_names = []
        self.model = None
        self.accuracy = 0
        
    def load_datasets(self):
        """Load and combine datasets"""
        print("Loading datasets...")
        
        try:
            # Load fresh milk data
            fresh_df = pd.read_csv('../sample-data/Fresh_milk_dataset.csv')
            print(f"Fresh milk samples: {len(fresh_df)}")
            
            # Load spoiled milk data  
            spoiled_df = pd.read_csv('../sample-data/Spoiled_Milk_dataset.csv')
            print(f"Spoiled milk samples: {len(spoiled_df)}")
            
            # Combine datasets
            df = pd.concat([fresh_df, spoiled_df], ignore_index=True)
            print(f"Total samples: {len(df)}")
            print(f"Label distribution: {df['label'].value_counts()}")
            
            return df
            
        except FileNotFoundError as e:
            print(f"Error loading datasets: {e}")
            return None
    
    def preprocess_data(self, df):
        """Enhanced preprocessing with better feature handling"""
        print("\nPreprocessing data...")
        print(f"Initial samples: {len(df)}")
        
        # Handle missing values and inf values
        df = df.replace([np.inf, -np.inf], np.nan)
        
        # Get feature columns (exclude non-feature columns)
        exclude_cols = ['timestamp_ms', 'label', 'CFU_value', 'timestamp']
        feature_cols = [col for col in df.columns if col not in exclude_cols]
        
        print(f"Feature columns found: {len(feature_cols)}")
        
        # Fill missing values intelligently
        for col in feature_cols:
            if df[col].dtype in ['float64', 'int64']:
                # For spectral channels, use 0 (legitimate reading)
                if any(x in col.lower() for x in ['ch', 'raw', 'reflect', 'absorb']):
                    df[col] = df[col].fillna(0)
                else:
                    # For other features, use median
                    median_val = df[col].median()
                    df[col] = df[col].fillna(median_val if not pd.isna(median_val) else 0)
        
        # Remove rows with missing labels
        df = df.dropna(subset=['label'])
        
        print(f"Samples after cleaning: {len(df)}")
        
        # Store feature names
        self.feature_names = feature_cols
        
        return df, feature_cols
    
    def engineer_features(self, df, feature_cols):
        """Create robust engineered features"""
        print("Engineering features...")
        
        # Spectral channel analysis
        raw_channels = [col for col in df.columns if 'raw_ch' in col]
        reflect_channels = [col for col in df.columns if 'reflect_ch' in col]
        absorb_channels = [col for col in df.columns if 'absorb_ch' in col]
        
        # Raw intensity features
        if raw_channels:
            raw_data = df[raw_channels].fillna(0)
            df['peak_intensity'] = raw_data.max(axis=1)
            df['total_intensity'] = raw_data.sum(axis=1)
            df['intensity_mean'] = raw_data.mean(axis=1)
            df['intensity_std'] = raw_data.std(axis=1).fillna(0)
            df['intensity_range'] = raw_data.max(axis=1) - raw_data.min(axis=1)
        
        # Reflectance features
        if reflect_channels:
            reflect_data = df[reflect_channels].fillna(0)
            df['avg_reflectance'] = reflect_data.mean(axis=1)
            df['reflectance_std'] = reflect_data.std(axis=1).fillna(0)
            df['reflectance_range'] = reflect_data.max(axis=1) - reflect_data.min(axis=1)
        
        # Absorbance features
        if absorb_channels:
            absorb_data = df[absorb_channels].fillna(0)
            df['avg_absorbance'] = absorb_data.mean(axis=1)
            df['absorbance_std'] = absorb_data.std(axis=1).fillna(0)
            df['max_absorbance'] = absorb_data.max(axis=1)
        
        # VOC features
        if 'VOC_raw' in df.columns:
            df['voc_normalized'] = df['VOC_raw'] / (df['VOC_raw'].max() + 1e-6)
        
        if 'VOC_voltage' in df.columns:
            df['voc_voltage_normalized'] = df['VOC_voltage'] / (df['VOC_voltage'].max() + 1e-6)
        
        # Cross-spectral ratios (important for milk quality)
        if len(raw_channels) >= 4:
            df['red_blue_ratio'] = (df[raw_channels[2]] + 1e-6) / (df[raw_channels[0]] + 1e-6)
            df['nir_red_ratio'] = (df[raw_channels[-1]] + 1e-6) / (df[raw_channels[2]] + 1e-6)
        
        # CFU features
        if 'CFU_value' in df.columns:
            df['log_cfu'] = np.log10(df['CFU_value'] + 1)
            df['cfu_normalized'] = df['CFU_value'] / (df['CFU_value'].max() + 1e-6)
        
        # Update feature names
        new_features = [
            'peak_intensity', 'total_intensity', 'intensity_mean', 'intensity_std', 'intensity_range',
            'avg_reflectance', 'reflectance_std', 'reflectance_range',
            'avg_absorbance', 'absorbance_std', 'max_absorbance',
            'voc_normalized', 'voc_voltage_normalized',
            'red_blue_ratio', 'nir_red_ratio',
            'log_cfu', 'cfu_normalized'
        ]
        
        available_new_features = [f for f in new_features if f in df.columns]
        self.feature_names = feature_cols + available_new_features
        
        print(f"Engineered features: {len(available_new_features)}")
        print(f"Total features: {len(self.feature_names)}")
        
        return df
    
    def train_optimized_model(self, X_train, X_test, y_train, y_test):
        """Train optimized Random Forest with fixed parameters for consistency"""
        print("\nTraining optimized Random Forest model...")
        
        # Use Random Forest with optimized parameters for milk quality prediction
        self.model = RandomForestClassifier(
            n_estimators=200,           # More trees for better accuracy
            max_depth=15,               # Prevent overfitting
            min_samples_split=5,        # Minimum samples to split
            min_samples_leaf=2,         # Minimum samples in leaf
            max_features='sqrt',        # Feature sampling
            bootstrap=True,             # Bootstrap sampling
            oob_score=True,            # Out-of-bag scoring
            class_weight='balanced',    # Handle class imbalance
            random_state=RANDOM_SEED,   # Fixed seed for consistency
            n_jobs=-1                   # Use all cores
        )
        
        # Train the model
        self.model.fit(X_train, y_train)
        
        # Make predictions
        y_pred = self.model.predict(X_test)
        y_pred_proba = self.model.predict_proba(X_test)
        
        # Calculate accuracy
        self.accuracy = accuracy_score(y_test, y_pred)
        
        # Cross-validation with stratified folds
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_SEED)
        cv_scores = cross_val_score(self.model, X_train, y_train, cv=cv, scoring='accuracy')
        
        print(f"Test Accuracy: {self.accuracy:.4f}")
        print(f"CV Accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
        print(f"OOB Score: {self.model.oob_score_:.4f}")
        
        # Detailed evaluation
        print("\nClassification Report:")
        print(classification_report(y_test, y_pred, target_names=self.label_encoder.classes_))
        
        # Confusion Matrix
        cm = confusion_matrix(y_test, y_pred)
        print(f"\nConfusion Matrix:")
        print(cm)
        
        return {
            'accuracy': self.accuracy,
            'cv_scores': cv_scores,
            'oob_score': self.model.oob_score_,
            'confusion_matrix': cm
        }
    
    def test_consistency(self, X_test):
        """Test model consistency with same inputs"""
        print("\nTesting model consistency...")
        
        # Take first test sample and predict multiple times
        test_sample = X_test[0:1]  # First sample
        
        predictions = []
        probabilities = []
        
        for i in range(10):
            pred = self.model.predict(test_sample)[0]
            prob = self.model.predict_proba(test_sample)[0]
            predictions.append(pred)
            probabilities.append(prob)
        
        # Check if all predictions are the same
        unique_predictions = set(predictions)
        is_consistent = len(unique_predictions) == 1
        
        print(f"Consistency test: {'PASSED' if is_consistent else 'FAILED'}")
        print(f"Unique predictions: {unique_predictions}")
        
        if is_consistent:
            print("✓ Model produces consistent results for same input")
        else:
            print("⚠ Model predictions vary for same input")
        
        return is_consistent
    
    def save_models(self):
        """Save all models and metadata"""
        print("\nSaving models...")
        
        # Create models directory
        os.makedirs('../ml-service/models', exist_ok=True)
        
        # Save main classifier
        joblib.dump(self.model, '../ml-service/models/lacteva_classifier.joblib')
        
        # Save scaler
        joblib.dump(self.scaler, '../ml-service/models/scaler.joblib')
        
        # Save label encoder
        joblib.dump(self.label_encoder, '../ml-service/models/label_encoder.joblib')
        
        # Save feature names
        joblib.dump(self.feature_names, '../ml-service/models/feature_names.joblib')
        
        # Save comprehensive metadata
        metadata = {
            'model_name': 'Optimized Random Forest',
            'accuracy': float(self.accuracy),
            'feature_count': len(self.feature_names),
            'training_date': datetime.now().isoformat(),
            'classes': list(self.label_encoder.classes_),
            'feature_names': self.feature_names,
            'model_params': self.model.get_params(),
            'random_seed': RANDOM_SEED,
            'oob_score': float(self.model.oob_score_) if hasattr(self.model, 'oob_score_') else None
        }
        
        joblib.dump(metadata, '../ml-service/models/model_metadata.joblib')
        
        print("✓ Saved trained classifier")
        print("✓ Saved feature scaler") 
        print("✓ Saved label encoder")
        print("✓ Saved feature names")
        print("✓ Saved model metadata")
        
        return True
    
    def run_training_pipeline(self):
        """Run the complete improved training pipeline"""
        print("Starting Improved LACTEVA ML Training Pipeline")
        print("=" * 60)
        
        # Load datasets
        df = self.load_datasets()
        if df is None:
            return False
        
        # Preprocess data
        result = self.preprocess_data(df)
        if result[0] is None:
            return False
        
        df, feature_cols = result
        
        # Engineer features
        df = self.engineer_features(df, feature_cols)
        
        # Prepare features and labels
        X = df[self.feature_names].values
        y = self.label_encoder.fit_transform(df['label'].values)
        
        print(f"\nFinal Dataset Summary:")
        print(f"Samples: {len(X)}")
        print(f"Features: {len(self.feature_names)}")
        print(f"Classes: {list(self.label_encoder.classes_)}")
        print(f"Class distribution: {dict(zip(self.label_encoder.classes_, np.bincount(y)))}")
        
        # Split data with stratification
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        print(f"\nTraining set: {X_train_scaled.shape}")
        print(f"Test set: {X_test_scaled.shape}")
        
        # Train optimized model
        results = self.train_optimized_model(X_train_scaled, X_test_scaled, y_train, y_test)
        
        # Test consistency
        self.test_consistency(X_test_scaled)
        
        # Save models
        self.save_models()
        
        print("\n" + "=" * 60)
        print("🎉 IMPROVED TRAINING COMPLETE!")
        print(f"Final Accuracy: {self.accuracy:.4f}")
        print(f"OOB Score: {self.model.oob_score_:.4f}")
        print("Models saved with enhanced consistency and accuracy!")
        print("=" * 60)
        
        return True

def main():
    """Main training function"""
    trainer = ImprovedLactevaTrainer()
    success = trainer.run_training_pipeline()
    
    if success:
        print("\n✅ Training completed successfully!")
        print("The improved ML model is ready for deployment.")
    else:
        print("\n❌ Training failed. Please check the error messages above.")

if __name__ == "__main__":
    main()