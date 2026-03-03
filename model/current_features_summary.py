"""
Summary of features used in current SPN/BM split models
"""
import pandas as pd

print("=" * 80)
print("CURRENT FEATURE SET: SPN/BM SPLIT MODELS")
print("=" * 80)

# ============================================================================
# SPN MODEL FEATURES (20 features total)
# ============================================================================
print("\n" + "=" * 80)
print("SPN MODEL FEATURES (Short-term bonds: tenor < 1 year)")
print("=" * 80)
print("Total: 20 features")

spn_features = {
    "Basic Bond Characteristics": [
        "tenor"
    ],
    
    "US Treasury Rates (lagged +1 day)": [
        "ust_3m    - 3-month Treasury yield",
        "ust_2y    - 2-year Treasury yield"
    ],
    
    "Yield Curve Slopes": [
        "slope_2y_3m    - ust_2y - ust_3m (short-end curve)"
    ],
    
    "FX & Volatility Indices (lagged +1 day)": [
        "dxy     - US Dollar Index",
        "vix     - CBOE Volatility Index",
        "move    - MOVE Index (bond volatility)"
    ],
    
    "Credit Risk (lagged +1 day)": [
        "cds_3y    - Indonesia 3Y CDS spread"
    ],
    
    "Indonesia Market": [
        "indo_10y                - Indonesia 10Y government bond yield",
        "spread_indo10y_ust10y   - indo_10y - ust_10y"
    ],
    
    "Engineered Features": [
        "vix_x_move       - VIX * MOVE (combined volatility stress)",
        "dxy_x_vix        - DXY * VIX (FX-volatility interaction)",
        "market_stress    - VIX + MOVE (market stress proxy)"
    ],
    
    "Auction History (code-specific)": [
        "prev_owners_estimate_code       - Previous owner estimate for same code",
        "prev_way_awarded_code           - Previous yield awarded for same code",
        "days_since_prev_auction_code    - Days since last auction of same code",
        "auctions_since_prev_code        - Number of auctions since last one",
        "bid_to_cover_ratio              - Total bids / accepted bids"
    ],
    
    "Auction Volume": [
        "total_penawaran           - Total bids received",
        "total_penawaran_diterima  - Total bids accepted"
    ],
    
    "Code Identifiers (dummy variables)": [
        "code_spn01m    - 1 if spn01m, 0 otherwise",
        "code_spn03m    - 1 if spn03m, 0 otherwise",
        "(spn12m is implicit when both are 0)"
    ]
}

for category, features in spn_features.items():
    print(f"\n{category}:")
    for feature in features:
        print(f"  • {feature}")

# ============================================================================
# BM MODEL FEATURES (23 numeric + 1 categorical = 24 input features)
# ============================================================================
print("\n" + "=" * 80)
print("BM MODEL FEATURES (Medium/Long-term bonds: tenor >= 1 year)")
print("=" * 80)
print("Total: 23 numeric + 1 categorical (code) = 24 input features")
print("After OneHotEncoding: 23 + 7 code dummies = 30 features")

bm_features = {
    "Basic Bond Characteristics": [
        "tenor"
    ],
    
    "US Treasury Rates (lagged +1 day)": [
        "ust_2y     - 2-year Treasury yield",
        "ust_10y    - 10-year Treasury yield"
    ],
    
    "Yield Curve Slopes": [
        "slope_10y_2y    - ust_10y - ust_2y (long-end curve)"
    ],
    
    "FX & Volatility Indices (lagged +1 day)": [
        "dxy     - US Dollar Index",
        "vix     - CBOE Volatility Index",
        "move    - MOVE Index (bond volatility)"
    ],
    
    "Credit Risk (lagged +1 day)": [
        "cds_5y     - Indonesia 5Y CDS spread",
        "cds_7y     - Indonesia 7Y CDS spread",
        "cds_10y    - Indonesia 10Y CDS spread"
    ],
    
    "Indonesia Market": [
        "indo_10y                - Indonesia 10Y government bond yield",
        "spread_indo10y_ust10y   - indo_10y - ust_10y"
    ],
    
    "Engineered Features": [
        "tenor_x_ust10y       - tenor * ust_10y (maturity-rate interaction)",
        "tenor_x_spread       - tenor * spread_indo10y_ust10y",
        "vix_x_move           - VIX * MOVE (combined volatility stress)",
        "dxy_x_vix            - DXY * VIX (FX-volatility interaction)",
        "market_stress        - VIX + MOVE (market stress proxy)"
    ],
    
    "Auction History (code-specific)": [
        "prev_owners_estimate_code       - Previous owner estimate for same code",
        "prev_way_awarded_code           - Previous yield awarded for same code",
        "days_since_prev_auction_code    - Days since last auction of same code",
        "auctions_since_prev_code        - Number of auctions since last one",
        "bid_to_cover_ratio              - Total bids / accepted bids"
    ],
    
    "Auction Volume": [
        "total_penawaran           - Total bids received",
        "total_penawaran_diterima  - Total bids accepted"
    ],
    
    "Categorical Feature (OneHotEncoded)": [
        "code    - Bond series code (bm05, bm10, bm15, bm20, bm30, bm40, sdg07)",
        "        → OneHotEncoded into 7 dummy variables"
    ]
}

for category, features in bm_features.items():
    print(f"\n{category}:")
    for feature in features:
        print(f"  • {feature}")

# ============================================================================
# KEY DIFFERENCES BETWEEN SPN AND BM MODELS
# ============================================================================
print("\n" + "=" * 80)
print("KEY DIFFERENCES BETWEEN SPN AND BM MODELS")
print("=" * 80)

differences = {
    "Treasury Rate Focus": [
        "SPN: Uses ust_3m, ust_2y (short-end sensitivity)",
        "BM:  Uses ust_2y, ust_10y (long-end sensitivity)"
    ],
    
    "Yield Curve": [
        "SPN: slope_2y_3m (monitors short-term curve steepness)",
        "BM:  slope_10y_2y (monitors long-term curve steepness)"
    ],
    
    "CDS Spreads": [
        "SPN: Only cds_3y (short-term credit risk)",
        "BM:  cds_5y, cds_7y, cds_10y (term structure of credit risk)"
    ],
    
    "Engineered Features": [
        "SPN: No tenor interactions (tenor range too narrow: 0.08-0.99 years)",
        "BM:  tenor_x_ust10y, tenor_x_spread (tenor range: 4.68-39.70 years)"
    ],
    
    "Code Treatment": [
        "SPN: Manual dummy variables (code_spn01m, code_spn03m)",
        "BM:  OneHotEncoding via sklearn (7 categories)"
    ],
    
    "Feature Count": [
        "SPN: 20 features (simpler, less prone to overfitting)",
        "BM:  30 features after encoding (richer feature space)"
    ]
}

for aspect, details in differences.items():
    print(f"\n{aspect}:")
    for detail in details:
        print(f"  • {detail}")

# ============================================================================
# CRITICAL DATA TRANSFORMATIONS
# ============================================================================
print("\n" + "=" * 80)
print("CRITICAL DATA TRANSFORMATIONS")
print("=" * 80)

transformations = [
    ("Timezone Lag", "All US market data (UST, DXY, VIX, MOVE, CDS) lagged +1 day to account for Indonesia-US timezone difference"),
    ("Missing Data", "Median imputation for numeric features, most_frequent for categorical"),
    ("Scaling", "StandardScaler applied to all numeric features (mean=0, std=1)"),
    ("Target", "owners_estimate - yield estimate from DJPPR (no transformation)"),
    ("Train/Val/Test", "80% train, 10% validation, 10% test - time-based split (chronological)"),
    ("Validation Set", "20 Jan 2026 held out completely (9 bonds: 3 SPN, 6 BM)")
]

for name, description in transformations:
    print(f"\n{name}:")
    print(f"  {description}")

# ============================================================================
# FEATURES NOT USED (DROPPED FROM INITIAL DATASET)
# ============================================================================
print("\n" + "=" * 80)
print("FEATURES DROPPED FROM INITIAL DATASET")
print("=" * 80)

dropped_features = {
    "Temporal Identifiers": [
        "tanggal_lelang_pricing    - Date (used for splitting only, not as feature)"
    ],
    
    "Non-Predictive": [
        "metode                    - Auction method (removed: all same value)",
        "seri                      - Series (removed: redundant with code)",
        "is_gso                    - Green/Sukuk/Other flag (removed: insufficient samples)",
        "target_penerbitan         - Target issuance (removed: not available at prediction time)"
    ],
    
    "Mid-Point Rates (excluded from rate features)": [
        "ust_5y, ust_7y            - Not used (SPN focuses on short-end, BM uses 2y/10y)",
        "cds_2y                    - Not used (focus on 3y for SPN, 5y/7y/10y for BM)"
    ],
    
    "Intermediate Slope Calculations": [
        "slope_5y_2y, slope_7y_5y, slope_10y_7y    - Excluded (too granular, noise)"
    ],
    
    "Tenor Buckets (not used in final models)": [
        "is_short_term, is_medium_term, is_long_term    - Excluded (tenor itself used)"
    ]
}

for category, features in dropped_features.items():
    print(f"\n{category}:")
    for feature in features:
        print(f"  • {feature}")

print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)
print("\nData Pipeline:")
print("  Raw Data → Feature Engineering → Timezone Lag → Train/Test Split → ")
print("  Imputation → Scaling → XGBoost → Validation")

print("\nModel Architecture:")
print("  • SPN Model: 20 features → XGBoost (max_depth=5, n_estimators=1000)")
print("  • BM Model:  30 features → XGBoost (max_depth=6, n_estimators=1500)")
print("  • Both: RandomizedSearchCV hyperparameter tuning (30-40 iterations)")

print("\nValidation Performance (20 Jan 2026):")
print("  • SPN:  MAE = 30.12 bps, R² = -4.10 (overfitting issue)")
print("  • BM:   MAE = 4.20 bps,  R² = 0.96  (excellent)")
print("  • Combined: MAE = 12.84 bps, R² = 0.96")
