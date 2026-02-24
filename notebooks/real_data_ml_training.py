#!/usr/bin/env python3
"""
LACTEVA Real Data ML Training Script
Uses actual fresh and spoiled milk datasets for training
"""


import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, roc_auc_score, roc_curve
import xgboost as xgb
import lightgbm as lgb
import joblib
import warnings
import os
from datetime import datetime

warnings.filterwarnings('ignore')

# Set random seed for reproducibility
np.random.seed(42)

print("LACTEVA Real Data ML Training")
print("=" * 50)

class LactevaMLTrainer:
    def __init__(self):
        self.models = {}
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.feature_names = []
        self.best_model = None
        self.best_accuracy = 0
        self.training_history = {}
        
    def load_datasets(self):
        """Load fresh and spoiled milk datasets"""
        print("Loading datasets...")
        
        try:
            # Load fresh milk data
            fresh_df = pd.read_csv('../sample-data/Fresh_milk_dataset.csv')
            print(f"Fresh milk samples: {len(fresh_df)}")
            print(f"Fresh milk columns: {list(fresh_df.columns)}")
            print(f"Fresh milk labels: {fresh_df['label'].value_counts()}")
            
            # Load spoiled milk data  
            spoiled_df = pd.read_csv('../sample-data/Spoiled_Milk_dataset.csv')
            print(f"Spoiled milk samples: {len(spoiled_df)}")
            print(f"Spoiled milk labels: {spoiled_df['label'].value_counts()}")
            
            # Check for data consistency
            print(f"Fresh data shape: {fresh_df.shape}")
            print(f"Spoiled data shape: {spoiled_df.shape}")
            
            # Combine datasets
            df = pd.concat([fresh_df, spoiled_df], ignore_index=True)
            print(f"Total samples: {len(df)}")
            print(f"Combined label distribution: {df['label'].value_counts()}")
            
            # Check for missing values in key columns
            print(f"Missing values in label column: {df['label'].isna().sum()}")
            
            return df
            
        except FileNotFoundError as e:
            print(f"Error loading datasets: {e}")
            print("Please ensure Fresh_milk_dataset.csv and Spoiled_Milk_dataset.csv are in sample-data/")
            return None
    
    def preprocess_data(self, df):
        """Clean and preprocess the data"""
        print("\nPreprocessing data...")
        print(f"Initial samples: {len(df)}")
        
        # Handle missing values and inf values
        df = df.replace([np.inf, -np.inf], np.nan)
        
        # Get feature columns (exclude timestamp, label, CFU_value)
        feature_cols = [col for col in df.columns if col not in ['timestamp_ms', 'label', 'CFU_value']]
        
        print(f"Feature columns found: {len(feature_cols)}")
        print(f"Sample feature columns: {feature_cols[:10]}")
        
        # Check data quality
        print(f"NaN percentage per column:")
        for col in feature_cols[:10]:  # Show first 10 columns
            nan_pct = (df[col].isna().sum() / len(df)) * 100
            print(f"  {col}: {nan_pct:.1f}% NaN")
        
        # More lenient cleaning - only remove rows that are completely empty
        # First, fill NaN values with appropriate defaults
        for col in feature_cols:
            if df[col].dtype in ['float64', 'int64']:
                # For spectral data, use 0 as default instead of median (many channels legitimately read 0)
                if col.startswith(('raw_ch', 'reflect_ch', 'absorb_ch')):
                    df[col] = df[col].fillna(0)
                else:
                    # For other numeric columns, use median
                    median_val = df[col].median()
                    if pd.isna(median_val):
                        df[col] = df[col].fillna(0)
                    else:
                        df[col] = df[col].fillna(median_val)
        
        # Only remove rows where ALL feature columns are NaN (completely empty rows)
        df = df.dropna(subset=feature_cols, how='all')
        
        # Also ensure we have the label column
        df = df.dropna(subset=['label'])
        
        print(f"Samples after cleaning: {len(df)}")
        print(f"Features: {len(feature_cols)}")
        
        if len(df) == 0:
            print("ERROR: No samples remaining after cleaning!")
            print("This might be due to:")
            print("1. All rows having missing labels")
            print("2. Incorrect column names")
            print("3. Data format issues")
            return None, None
        
        # Store feature names
        self.feature_names = feature_cols
        
        return df, feature_cols
    
    def engineer_features(self, df, feature_cols):
        """Create additional engineered features"""
        print("Engineering features...")
        
        # Calculate spectral ratios and indices
        raw_channels = [f'raw_ch{i}' for i in range(12)]
        reflect_channels = [f'reflect_ch{i}' for i in range(12)]
        absorb_channels = [f'absorb_ch{i}' for i in range(12)]
        
        # Check which channels exist in the data
        available_raw = [col for col in raw_channels if col in df.columns]
        available_reflect = [col for col in reflect_channels if col in df.columns]
        available_absorb = [col for col in absorb_channels if col in df.columns]
        
        print(f"Available raw channels: {len(available_raw)}")
        print(f"Available reflect channels: {len(available_reflect)}")
        print(f"Available absorb channels: {len(available_absorb)}")
        
        # Peak wavelength and intensity (only if we have raw channels)
        if len(available_raw) > 0:
            # Handle case where all values might be 0 or NaN
            raw_data = df[available_raw].fillna(0)
            
            # Only calculate if we have non-zero values
            if (raw_data.sum(axis=1) > 0).any():
                df['peak_intensity'] = raw_data.max(axis=1)
                # Safer peak channel calculation
                try:
                    peak_indices = raw_data.idxmax(axis=1)
                    df['peak_channel'] = peak_indices.str.extract('(\d+)').astype(float).fillna(0)
                except:
                    df['peak_channel'] = 0
                df['total_intensity'] = raw_data.sum(axis=1)
                df['intensity_std'] = raw_data.std(axis=1).fillna(0)
            else:
                df['peak_intensity'] = 0
                df['peak_channel'] = 0
                df['total_intensity'] = 0
                df['intensity_std'] = 0
        
        # Reflectance features
        if len(available_reflect) > 0:
            reflect_data = df[available_reflect].fillna(0)
            df['avg_reflectance'] = reflect_data.mean(axis=1)
            df['reflectance_range'] = reflect_data.max(axis=1) - reflect_data.min(axis=1)
        
        # Absorbance features
        if len(available_absorb) > 0:
            absorb_data = df[available_absorb].fillna(0)
            df['avg_absorbance'] = absorb_data.mean(axis=1)
            df['absorbance_slope'] = absorb_data.diff(axis=1).mean(axis=1).fillna(0)
        
        # VOC features
        if 'VOC_raw' in df.columns and 'VOC_voltage' in df.columns:
            df['voc_ratio'] = df['VOC_voltage'] / (df['VOC_raw'] + 1e-6)
        
        # Spectral indices (if channels exist)
        if 'raw_ch4' in df.columns and 'raw_ch8' in df.columns:
            df['ndvi_like'] = (df['raw_ch8'] - df['raw_ch4']) / (df['raw_ch8'] + df['raw_ch4'] + 1e-6)
        
        # CFU feature engineering
        if 'CFU_value' in df.columns:
            df['log_cfu'] = np.log10(df['CFU_value'] + 1)
        
        # Update feature names - only include features that were actually created
        new_features = ['peak_intensity', 'peak_channel', 'total_intensity', 'intensity_std',
                       'avg_reflectance', 'reflectance_range', 'avg_absorbance', 'absorbance_slope',
                       'voc_ratio', 'ndvi_like', 'log_cfu']
        
        available_new_features = [f for f in new_features if f in df.columns]
        self.feature_names = feature_cols + available_new_features
        
        print(f"Engineered features added: {available_new_features}")
        print(f"Total features after engineering: {len(self.feature_names)}")
        
        return df
    
    def train_models(self, X_train, X_test, y_train, y_test):
        """Train multiple ML models and select the best one"""
        print("\nTraining ML models...")
        
        # Define models to train
        models = {
            'Random Forest': RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1),
            'XGBoost': xgb.XGBClassifier(random_state=42, eval_metric='logloss'),
            'LightGBM': lgb.LGBMClassifier(random_state=42, verbose=-1),
            'Gradient Boosting': GradientBoostingClassifier(random_state=42),
            'SVM': SVC(random_state=42, probability=True)
        }
        
        results = {}
        
        for name, model in models.items():
            print(f"\nTraining {name}...")
            
            # Train model
            model.fit(X_train, y_train)
            
            # Make predictions
            y_pred = model.predict(X_test)
            y_pred_proba = model.predict_proba(X_test)[:, 1] if hasattr(model, 'predict_proba') else None
            
            # Calculate metrics
            accuracy = accuracy_score(y_test, y_pred)
            
            # Cross-validation score
            cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='accuracy')
            
            results[name] = {
                'model': model,
                'accuracy': accuracy,
                'cv_mean': cv_scores.mean(),
                'cv_std': cv_scores.std(),
                'predictions': y_pred,
                'probabilities': y_pred_proba
            }
            
            print(f"  Accuracy: {accuracy:.4f}")
            print(f"  CV Score: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
            
            # Update best model
            if accuracy > self.best_accuracy:
                self.best_accuracy = accuracy
                self.best_model = model
                self.best_model_name = name
        
        self.models = results
        return results
    
    def evaluate_best_model(self, X_test, y_test):
        """Detailed evaluation of the best model"""
        print(f"\nDetailed evaluation of best model: {self.best_model_name}")
        print("-" * 50)
        
        y_pred = self.best_model.predict(X_test)
        y_pred_proba = self.best_model.predict_proba(X_test)[:, 1]
        
        # Classification report
        print("Classification Report:")
        print(classification_report(y_test, y_pred))
        
        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        print(f"\nConfusion Matrix:")
        print(cm)
        
        # Calculate additional metrics
        accuracy = accuracy_score(y_test, y_pred)
        auc_score = roc_auc_score(y_test, y_pred_proba)
        
        print(f"\nFinal Metrics:")
        print(f"Accuracy: {accuracy:.4f}")
        print(f"AUC Score: {auc_score:.4f}")
        
        # Feature importance
        if hasattr(self.best_model, 'feature_importances_'):
            feature_importance = pd.DataFrame({
                'feature': self.feature_names,
                'importance': self.best_model.feature_importances_
            }).sort_values('importance', ascending=False)
            
            print(f"\nTop 10 Most Important Features:")
            print(feature_importance.head(10))
            
            # Save feature importance plot
            plt.figure(figsize=(10, 8))
            sns.barplot(data=feature_importance.head(15), x='importance', y='feature')
            plt.title('Feature Importance - Top 15 Features')
            plt.tight_layout()
            plt.savefig('../ml-service/models/feature_importance.png', dpi=300, bbox_inches='tight')
            plt.close()
        
        # ROC Curve
        fpr, tpr, _ = roc_curve(y_test, y_pred_proba)
        plt.figure(figsize=(8, 6))
        plt.plot(fpr, tpr, color='darkorange', lw=2, label=f'ROC curve (AUC = {auc_score:.2f})')
        plt.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--')
        plt.xlim([0.0, 1.0])
        plt.ylim([0.0, 1.05])
        plt.xlabel('False Positive Rate')
        plt.ylabel('True Positive Rate')
        plt.title('Receiver Operating Characteristic (ROC) Curve')
        plt.legend(loc="lower right")
        plt.savefig('../ml-service/models/roc_curve.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        return {
            'accuracy': accuracy,
            'auc_score': auc_score,
            'confusion_matrix': cm.tolist(),
            'feature_importance': feature_importance.to_dict('records') if hasattr(self.best_model, 'feature_importances_') else None
        }
    
    def save_models(self):
        """Save the trained models and preprocessing objects"""
        print("\nSaving models...")
        
        # Create models directory
        os.makedirs('../ml-service/models', exist_ok=True)
        
        # Save best model
        joblib.dump(self.best_model, '../ml-service/models/lacteva_classifier.joblib')
        
        # Save scaler
        joblib.dump(self.scaler, '../ml-service/models/scaler.joblib')
        
        # Save label encoder
        joblib.dump(self.label_encoder, '../ml-service/models/label_encoder.joblib')
        
        # Save feature names
        joblib.dump(self.feature_names, '../ml-service/models/feature_names.joblib')
        
        # Save model metadata
        metadata = {
            'model_name': self.best_model_name,
            'accuracy': self.best_accuracy,
            'feature_count': len(self.feature_names),
            'training_date': datetime.now().isoformat(),
            'feature_names': self.feature_names
        }
        
        joblib.dump(metadata, '../ml-service/models/model_metadata.joblib')
        
        print("✓ Saved trained classifier")
        print("✓ Saved feature scaler")
        print("✓ Saved label encoder")
        print("✓ Saved feature names")
        print("✓ Saved model metadata")
        
        # Try to convert to ONNX (optional)
        try:
            from skl2onnx import convert_sklearn
            from skl2onnx.common.data_types import FloatTensorType
            
            initial_type = [('float_input', FloatTensorType([None, len(self.feature_names)]))]
            onnx_model = convert_sklearn(self.best_model, initial_types=initial_type)
            
            with open('../ml-service/models/lacteva_classifier.onnx', 'wb') as f:
                f.write(onnx_model.SerializeToString())
            
            print("✓ Saved ONNX model")
            
        except ImportError:
            print("⚠ ONNX conversion skipped (skl2onnx not available)")
        except Exception as e:
            print(f"⚠ ONNX conversion failed: {e}")
    
    def run_training_pipeline(self):
        """Run the complete training pipeline"""
        print("Starting LACTEVA ML Training Pipeline")
        print("=" * 50)
        
        # Load datasets
        df = self.load_datasets()
        if df is None:
            return False
        
        # Preprocess data
        result = self.preprocess_data(df)
        if result[0] is None:
            print("❌ Preprocessing failed - no data remaining")
            return False
        
        df, feature_cols = result
        
        # Engineer features
        df = self.engineer_features(df, feature_cols)
        
        # Prepare features and labels
        X = df[self.feature_names].values
        y = self.label_encoder.fit_transform(df['label'].values)
        
        print(f"\nDataset Summary:")
        print(f"Samples: {len(X)}")
        print(f"Features: {len(self.feature_names)}")
        print(f"Classes: {list(self.label_encoder.classes_)}")
        print(f"Class distribution: {np.bincount(y)}")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        print(f"\nTraining set: {X_train_scaled.shape}")
        print(f"Test set: {X_test_scaled.shape}")
        
        # Train models
        results = self.train_models(X_train_scaled, X_test_scaled, y_train, y_test)
        
        # Evaluate best model
        evaluation = self.evaluate_best_model(X_test_scaled, y_test)
        
        # Save models
        self.save_models()
        
        print("\n" + "=" * 50)
        print("Training Complete!")
        print(f"Best Model: {self.best_model_name}")
        print(f"Best Accuracy: {self.best_accuracy:.4f}")
        print("Models saved to ../ml-service/models/")
        print("Ready for deployment!")
        
        return True

def main():
    """Main training function"""
    trainer = LactevaMLTrainer()
    success = trainer.run_training_pipeline()
    
    if success:
        print("\n🎉 Training completed successfully!")
        print("The ML model is now ready to predict milk quality.")
    else:
        print("\n❌ Training failed. Please check the error messages above.")

if __name__ == "__main__":
    main()