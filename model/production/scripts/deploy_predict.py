#!/usr/bin/env python3
"""
Bond Pricing Prediction - Production Deployment Script
Description: Load models and make predictions for Indonesian government bonds
"""

import pandas as pd
import numpy as np
import pickle
import lightgbm as lgb
import xgboost as xgb
import catboost as cb
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer

class BondPricingPredictor:
    """Production-ready bond pricing prediction system"""

    def __init__(self, models_dir='production/models'):
        self.models_dir = models_dir
        self.models = {}
        self.preprocessors = {}

    def load_models(self):
        """Load all trained models"""
        print("Loading models...")

        # Load quantile models
        quantiles = [0.05, 0.25, 0.5, 0.75, 0.95]
        self.models['quantile_spn'] = {}
        self.models['quantile_bm'] = {}
        for q in quantiles:
            self.models['quantile_spn'][q] = lgb.Booster(
                model_file=f'{self.models_dir}/quantile_model_spn_q{int(q*100):02d}.txt'
            )
            self.models['quantile_bm'][q] = lgb.Booster(
                model_file=f'{self.models_dir}/quantile_model_bm_q{int(q*100):02d}.txt'
            )

        # Load LightGBM Standard
        self.models['lgbm_spn'] = lgb.Booster(
            model_file=f'{self.models_dir}/lightgbm_model_spn.txt'
        )
        self.models['lgbm_bm'] = lgb.Booster(
            model_file=f'{self.models_dir}/lightgbm_model_bm.txt'
        )

        # Load XGBoost
        self.models['xgb_spn'] = xgb.Booster()
        self.models['xgb_spn'].load_model(f'{self.models_dir}/xgboost_model_spn.json')
        self.models['xgb_bm'] = xgb.Booster()
        self.models['xgb_bm'].load_model(f'{self.models_dir}/xgboost_model_bm.json')

        # Load CatBoost
        self.models['catboost_spn'] = cb.CatBoostRegressor()
        self.models['catboost_spn'].load_model(f'{self.models_dir}/catboost_model_spn.cbm')
        self.models['catboost_bm'] = cb.CatBoostRegressor()
        self.models['catboost_bm'].load_model(f'{self.models_dir}/catboost_model_bm.cbm')

        # Load Random Forest
        with open(f'{self.models_dir}/randomforest_model_spn.pkl', 'rb') as f:
            self.models['rf_spn'] = pickle.load(f)
        with open(f'{self.models_dir}/randomforest_model_bm.pkl', 'rb') as f:
            self.models['rf_bm'] = pickle.load(f)

        # Load preprocessors
        with open(f'{self.models_dir}/preprocessor_spn.pkl', 'rb') as f:
            self.preprocessors['spn'] = pickle.load(f)
        with open(f'{self.models_dir}/preprocessor_bm.pkl', 'rb') as f:
            self.preprocessors['bm'] = pickle.load(f)

        print("✓ All models loaded successfully")

    def prepare_features(self, df, bond_type):
        """Prepare features for prediction"""
        preprocessor = self.preprocessors[bond_type]

        # Select feature columns (exclude metadata)
        feature_cols = [col for col in df.columns if col not in 
                       ['tanggal_lelang_pricing', 'code', 'owners_estimate']]
        X = df[feature_cols].copy()

        # Apply imputer and scaler
        X_imputed = pd.DataFrame(
            preprocessor['imputer'].transform(X), 
            columns=X.columns
        )
        X_scaled = preprocessor['scaler'].transform(X_imputed)

        return pd.DataFrame(X_scaled, columns=X.columns)

    def predict(self, input_df):
        """Make predictions using all models"""
        results = []

        # Separate by bond type
        spn_df = input_df[input_df['code'].str.startswith('spn')].copy()
        bm_df = input_df[input_df['code'].str.startswith('bm')].copy()

        # Process SPN bonds
        if len(spn_df) > 0:
            X_spn = self.prepare_features(spn_df, 'spn')

            for idx, (_, row) in enumerate(spn_df.iterrows()):
                X_single = X_spn.iloc[[idx]]

                pred = {
                    'code': row['code'],
                    'tenor': row['tenor'],
                    'Quantile_Q50': self.models['quantile_spn'][0.5].predict(X_single)[0],
                    'LightGBM': self.models['lgbm_spn'].predict(X_single)[0],
                    'XGBoost': self.models['xgb_spn'].predict(xgb.DMatrix(X_single))[0],
                    'CatBoost': self.models['catboost_spn'].predict(X_single)[0],
                    'RandomForest': self.models['rf_spn'].predict(X_single)[0]
                }

                # Add confidence intervals
                pred['CI90_lower'] = self.models['quantile_spn'][0.05].predict(X_single)[0]
                pred['CI90_upper'] = self.models['quantile_spn'][0.95].predict(X_single)[0]

                results.append(pred)

        # Process BM bonds
        if len(bm_df) > 0:
            X_bm = self.prepare_features(bm_df, 'bm')

            for idx, (_, row) in enumerate(bm_df.iterrows()):
                X_single = X_bm.iloc[[idx]]

                pred = {
                    'code': row['code'],
                    'tenor': row['tenor'],
                    'Quantile_Q50': self.models['quantile_bm'][0.5].predict(X_single)[0],
                    'LightGBM': self.models['lgbm_bm'].predict(X_single)[0],
                    'XGBoost': self.models['xgb_bm'].predict(xgb.DMatrix(X_single))[0],
                    'CatBoost': self.models['catboost_bm'].predict(X_single)[0],
                    'RandomForest': self.models['rf_bm'].predict(X_single)[0]
                }

                # Add confidence intervals
                pred['CI90_lower'] = self.models['quantile_bm'][0.05].predict(X_single)[0]
                pred['CI90_upper'] = self.models['quantile_bm'][0.95].predict(X_single)[0]

                results.append(pred)

        return pd.DataFrame(results)


# Example usage
if __name__ == "__main__":
    predictor = BondPricingPredictor()
    predictor.load_models()

    input_file = 'data/processed/owners_estimate_validation_combined_cleaned.csv'
    input_df = pd.read_csv(input_file)

    predictions = predictor.predict(input_df)

    print("\n" + "="*100)
    print("BOND PRICING PREDICTIONS")
    print("="*100 + "\n")

    for _, row in predictions.iterrows():
        print(f"{row['code']:8s}  Tenor: {row['tenor']:6.2f}y  │  "
              f"Quantile: {row['Quantile_Q50']:5.2f}%  │  "
              f"LGBM: {row['LightGBM']:5.2f}%  │  "
              f"XGB: {row['XGBoost']:5.2f}%  │  "
              f"CatB: {row['CatBoost']:5.2f}%  │  "
              f"RF: {row['RandomForest']:5.2f}%  │  "
              f"90% CI: [{row['CI90_lower']:.2f}-{row['CI90_upper']:.2f}]")

    output_file = 'production/models/predictions_latest.csv'
    predictions.to_csv(output_file, index=False)
    print(f"\n✓ Predictions saved to {output_file}")
