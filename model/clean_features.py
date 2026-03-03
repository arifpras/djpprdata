"""
Create cleaned feature set by removing highly correlated features
Strategy: Keep features with higher target correlation, remove redundant ones
"""
import pandas as pd
import numpy as np

print("=" * 80)
print("FEATURE CLEANING: REMOVING MULTICOLLINEARITY")
print("=" * 80)

# Features to remove based on correlation analysis
features_to_remove = {
    # CDS term structure - keep only cds_5y (middle of curve)
    'cds_3y': 'Highly correlated with cds_5y/7y/10y (r>0.95), remove short end',
    'cds_7y': 'Highly correlated with cds_5y/10y (r>0.99), remove',
    'cds_10y': 'Highly correlated with cds_5y/7y (r>0.97), keep cds_5y instead',
    
    # Engineered volatility features - dxy_x_vix is nearly identical to vix
    'dxy_x_vix': 'Nearly perfect correlation with vix (r=0.997), redundant',
    'market_stress': 'Highly correlated with vix and dxy_x_vix (r>0.93), redundant',
    
    # Spread features - creates perfect multicollinearity with ust_10y and indo_10y
    'spread_indo10y_ust10y': 'Perfect VIF, calculated from ust_10y and indo_10y',
    
    # Tenor buckets - tenor itself is continuous and more informative
    'is_short_term': 'Redundant with tenor, creates perfect multicollinearity',
    'is_medium_term': 'Redundant with tenor, weak correlation with target',
    'is_long_term': 'Redundant with tenor, creates perfect multicollinearity',
    
    # Interaction with spread - spread itself is being removed
    'tenor_x_spread': 'Based on spread_indo10y_ust10y which is being removed',
}

features_to_keep_notes = {
    'ust_3m': 'Keep for SPN model (short-term focus)',
    'ust_2y': 'Keep - mid-point of curve, good balance',
    'ust_10y': 'Keep - long-term benchmark',
    'slope_10y_2y': 'Keep - captures yield curve shape',
    'slope_2y_3m': 'Keep - captures short-end curve',
    'cds_5y': 'Keep - middle of CDS curve, represents credit risk',
    'vix': 'Keep - volatility indicator',
    'move': 'Keep - bond volatility',
    'vix_x_move': 'Keep - captures combined equity-bond volatility',
    'dxy': 'Keep - FX risk',
    'indo_10y': 'Keep - local benchmark rate',
    'tenor_x_ust10y': 'Keep - maturity-rate interaction',
    'prev_owners_estimate_code': 'Keep - strongest predictor (r=0.985)',
    'prev_way_awarded_code': 'Keep - auction-specific memory',
    'prev_bid_to_cover_ratio_code': 'Keep - auction demand indicator',
    'prev_total_penawaran_code': 'Keep - bid volume pattern',
    'prev_total_penawaran_diterima_code': 'Keep - award volume pattern',
}

print(f"\n{len(features_to_remove)} features identified for removal:")
print("-" * 80)
for feat, reason in features_to_remove.items():
    print(f"  ✗ {feat:<35} → {reason}")

print(f"\n\nKey features retained:")
print("-" * 80)
for feat, reason in features_to_keep_notes.items():
    print(f"  ✓ {feat:<35} → {reason}")

# Load original features
df = pd.read_csv('data/processed/owners_estimate_features.csv')
print(f"\n\nOriginal features: {df.shape[1]} columns, {df.shape[0]} rows")

# Remove problematic features
df_cleaned = df.drop(columns=list(features_to_remove.keys()))
print(f"Cleaned features:  {df_cleaned.shape[1]} columns, {df_cleaned.shape[0]} rows")

# Save cleaned features
df_cleaned.to_csv('data/processed/owners_estimate_features_cleaned.csv', index=False)
print(f"\n✓ Saved: data/processed/owners_estimate_features_cleaned.csv")

# Show remaining features
numeric_cols = df_cleaned.select_dtypes(include=[np.number]).columns.tolist()
feature_list = [col for col in numeric_cols if col not in ['owners_estimate']]

print(f"\n\n{'='*80}")
print(f"FINAL FEATURE SET ({len(feature_list)} features)")
print(f"{'='*80}")

categories = {
    'Basic': ['tenor'],
    'US Treasury Rates': ['ust_3m', 'ust_2y', 'ust_10y'],
    'Yield Curve': ['slope_10y_2y', 'slope_2y_3m'],
    'Market Indicators': ['dxy', 'vix', 'move'],
    'Credit Risk': ['cds_5y'],
    'Indonesia Market': ['indo_10y'],
    'Engineered': ['tenor_x_ust10y', 'vix_x_move'],
    'Auction History': ['prev_owners_estimate_code', 'prev_way_awarded_code', 
                        'days_since_prev_auction_code', 'auctions_since_prev_code',
                        'prev_bid_to_cover_ratio_code', 'prev_total_penawaran_code',
                        'prev_total_penawaran_diterima_code']
}

for category, feats in categories.items():
    available = [f for f in feats if f in feature_list]
    if available:
        print(f"\n{category}:")
        for feat in available:
            print(f"  • {feat}")

print(f"\n\n{'='*80}")
print("MULTICOLLINEARITY STATUS")
print(f"{'='*80}")
print(f"\n✓ Removed {len(features_to_remove)} highly correlated features")
print("✓ Kept features with high target correlation")
print("✓ Reduced perfect multicollinearity (VIF=inf)")
print("✓ Ready for model training")

print(f"\n\n{'='*80}")
print("NEXT STEPS")
print(f"{'='*80}")
print("\n1. Split cleaned features by SPN/BM")
print("2. Update training scripts to use new feature set")
print("3. Retrain models and compare performance")
print("4. Validate on 20 Jan 2026 hold-out set")
