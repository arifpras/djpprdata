# Production Deployment

Complete production package for Indonesian government bond pricing predictions with 5 different models.

## 📦 Models Included

### 1. Quantile Regression (LightGBM)
- **Purpose**: Uncertainty quantification with confidence intervals
- **Files**: `quantile_model_spn_q*.txt`, `quantile_model_bm_q*.txt`
- **Quantiles**: 0.05, 0.25, 0.50, 0.75, 0.95

### 2. LightGBM Standard Regression
- **Purpose**: Fast, accurate point predictions
- **Files**: `lightgbm_model_spn.txt`, `lightgbm_model_bm.txt`

### 3. XGBoost
- **Purpose**: Robust gradient boosting alternative
- **Files**: `xgboost_model_spn.json`, `xgboost_model_bm.json`

### 4. CatBoost
- **Purpose**: Categorical feature handling
- **Files**: `catboost_model_spn.cbm`, `catboost_model_bm.cbm`

### 5. Random Forest
- **Purpose**: Tree-ensemble baseline with strong robustness
- **Files**: `randomforest_model_spn.pkl`, `randomforest_model_bm.pkl`

## 🔧 Preprocessors

- `preprocessor_spn.pkl`: SPN bonds (imputer + scaler)
- `preprocessor_bm.pkl`: BM bonds (imputer + scaler)

## 📊 Results & Validation

- `predictions_all_models.csv`: All model predictions with actual values
- `predictions_quantile_ci.csv`: Quantile predictions with confidence intervals
- `predictions_default_model.csv`: Default-model predictions for production use
- `validation_report.json`: Performance metrics summary

## 🚀 Quick Start

### Using the Deployment Script

```python
from production.scripts.deploy_predict import BondPricingPredictor
import pandas as pd

# Initialize predictor
predictor = BondPricingPredictor()
predictor.load_models()

# Load your input data
input_df = pd.read_csv('your_input_file.csv')

# Make predictions
predictions = predictor.predict(input_df)
print(predictions)
```

### Command Line Usage

```bash
python production/scripts/deploy_predict.py
```

## 📋 Input Data Requirements

Your input CSV must contain these columns:
- `code`: Bond series code (e.g., 'spn01m', 'bm10')
- `tenor`: Remaining tenor in years
- `ust_yield_2y`: US Treasury 2-year yield
- `ust_yield_10y`: US Treasury 10-year yield
- `ust_3m_rate`: US Treasury 3-month rate
- Additional market features (see training data template)

## 📁 Directory Structure

```
production/
├── README_PRODUCTION.md          # This file
├── models/                        # All trained models
│   ├── quantile_model_spn_q*.txt
│   ├── quantile_model_bm_q*.txt
│   ├── lightgbm_model_spn.txt
│   ├── lightgbm_model_bm.txt
│   ├── xgboost_model_spn.json
│   ├── xgboost_model_bm.json
│   ├── catboost_model_spn.cbm
│   ├── catboost_model_bm.cbm
│   ├── randomforest_model_spn.pkl
│   ├── randomforest_model_bm.pkl
│   ├── preprocessor_spn.pkl
│   ├── preprocessor_bm.pkl
│   ├── predictions_all_models.csv
│   ├── predictions_quantile_ci.csv
│   ├── predictions_default_model.csv
│   └── validation_report.json
└── scripts/                       # Deployment scripts
    └── deploy_predict.py
```

## 🎯 Key Features

- **Multi-Model Ensemble**: 5 algorithms for robust predictions
- **Uncertainty Quantification**: 90% confidence intervals from quantile regression
- **Production-Ready**: Complete preprocessing pipeline included
- **Default-Model Routing**: Uses holdout-selected best model for production output
- **Fast Inference**: Predictions in milliseconds

---

**Last Updated**: Auto-generated during export
