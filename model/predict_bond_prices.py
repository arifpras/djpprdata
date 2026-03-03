#!/usr/bin/env python3
import argparse
import json
import pickle
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd
import statsmodels.api as sm
import xgboost as xgb
from catboost import CatBoostRegressor

REQUIRED_BASE_COLUMNS = ["code", "tenor"]

MODEL_COLUMN_MAP = {
    "Quantile": "Quantile_Q50",
    "LightGBM": "LightGBM_Std",
    "XGBoost": "XGBoost",
    "CatBoost": "CatBoost",
    "RandomForest": "RandomForest",
}

MODEL_OUTPUT_COLUMNS = [
    "Quantile",
    "LightGBM",
    "XGBoost",
    "CatBoost",
    "RandomForest",
    "StepwiseOLS",
    "QuantileReg",
]


def _expected_feature_columns(preprocessor: dict) -> list[str]:
    imputer = preprocessor.get("imputer")
    if imputer is not None and hasattr(imputer, "feature_names_in_"):
        return list(imputer.feature_names_in_)
    raise ValueError("Preprocessor is missing feature schema (imputer.feature_names_in_).")


def _prepare_features(df: pd.DataFrame, preprocessor: dict) -> pd.DataFrame:
    expected_cols = _expected_feature_columns(preprocessor)
    missing = [col for col in expected_cols if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required feature columns: {', '.join(missing)}")

    x = df[expected_cols].copy()
    x_imputed = pd.DataFrame(preprocessor["imputer"].transform(x), columns=x.columns)
    x_scaled = preprocessor["scaler"].transform(x_imputed)
    return pd.DataFrame(x_scaled, columns=x.columns, index=df.index)


def _load_models(models_dir: Path) -> dict:
    quantiles = [0.5]

    quantile_spn = {
        q: lgb.Booster(model_file=str(models_dir / f"quantile_model_spn_q{int(q * 100):02d}.txt"))
        for q in quantiles
    }
    quantile_bm = {
        q: lgb.Booster(model_file=str(models_dir / f"quantile_model_bm_q{int(q * 100):02d}.txt"))
        for q in quantiles
    }

    lgbm_spn = lgb.Booster(model_file=str(models_dir / "lightgbm_model_spn.txt"))
    lgbm_bm = lgb.Booster(model_file=str(models_dir / "lightgbm_model_bm.txt"))

    xgb_spn = xgb.Booster()
    xgb_spn.load_model(str(models_dir / "xgboost_model_spn.json"))
    xgb_bm = xgb.Booster()
    xgb_bm.load_model(str(models_dir / "xgboost_model_bm.json"))

    cat_spn = CatBoostRegressor()
    cat_spn.load_model(str(models_dir / "catboost_model_spn.cbm"))
    cat_bm = CatBoostRegressor()
    cat_bm.load_model(str(models_dir / "catboost_model_bm.cbm"))

    with open(models_dir / "randomforest_model_spn.pkl", "rb") as f:
        rf_spn = pickle.load(f)
    with open(models_dir / "randomforest_model_bm.pkl", "rb") as f:
        rf_bm = pickle.load(f)

    with open(models_dir / "preprocessor_spn.pkl", "rb") as f:
        pre_spn = pickle.load(f)
    with open(models_dir / "preprocessor_bm.pkl", "rb") as f:
        pre_bm = pickle.load(f)

    return {
        "quantile_spn": quantile_spn,
        "quantile_bm": quantile_bm,
        "lgbm_spn": lgbm_spn,
        "lgbm_bm": lgbm_bm,
        "xgb_spn": xgb_spn,
        "xgb_bm": xgb_bm,
        "cat_spn": cat_spn,
        "cat_bm": cat_bm,
        "rf_spn": rf_spn,
        "rf_bm": rf_bm,
        "pre_spn": pre_spn,
        "pre_bm": pre_bm,
    }


def _stepwise_selection(
    x: pd.DataFrame,
    y: pd.Series,
    threshold_in: float = 0.01,
    threshold_out: float = 0.05,
    max_iter: int = 200,
) -> list[str]:
    included: list[str] = []

    for _ in range(max_iter):
        changed = False

        excluded = [col for col in x.columns if col not in included]
        new_pvals = pd.Series(dtype=float)

        for col in excluded:
            try:
                x_model = sm.add_constant(x[included + [col]], has_constant="add")
                model = sm.OLS(y, x_model).fit()
                new_pvals.loc[col] = model.pvalues.get(col, np.nan)
            except Exception:
                continue

        if not new_pvals.empty:
            best_pval = new_pvals.min()
            best_feature = new_pvals.idxmin()
            if pd.notna(best_pval) and best_pval < threshold_in:
                included.append(best_feature)
                changed = True

        if included:
            try:
                x_model = sm.add_constant(x[included], has_constant="add")
                model = sm.OLS(y, x_model).fit()
                pvalues = model.pvalues.drop("const", errors="ignore")
            except Exception:
                pvalues = pd.Series(dtype=float)

            if not pvalues.empty:
                worst_pval = pvalues.max()
                worst_feature = pvalues.idxmax()
                if pd.notna(worst_pval) and worst_pval > threshold_out:
                    included.remove(worst_feature)
                    changed = True

        if not changed:
            break

    return included


def _build_stepwise_bundle(dbtrain_csv: Path | None) -> dict | None:
    if dbtrain_csv is None or not dbtrain_csv.exists():
        return None

    df = pd.read_csv(dbtrain_csv)
    if "owners_estimate" not in df.columns:
        return None

    df = df.copy()
    if "tanggal_lelang_pricing" in df.columns:
        df["tanggal_lelang_pricing_dt"] = pd.to_datetime(
            df["tanggal_lelang_pricing"], dayfirst=True, errors="coerce"
        )

    df["owners_estimate"] = pd.to_numeric(df["owners_estimate"], errors="coerce")
    df = df[df["owners_estimate"].notna()].copy()
    if df.empty:
        return None

    drop_non_features = ["owners_estimate", "tanggal_lelang_pricing", "tanggal_lelang_pricing_dt"]
    x_raw = df.drop(columns=[c for c in drop_non_features if c in df.columns], errors="ignore").copy()
    x_enc = pd.get_dummies(x_raw, drop_first=True, prefix_sep="__")
    x_enc = x_enc.apply(pd.to_numeric, errors="coerce").replace([np.inf, -np.inf], np.nan)

    valid_cols: list[str] = []
    for col in x_enc.columns:
        s = x_enc[col]
        if s.notna().sum() == 0:
            continue
        if s.nunique(dropna=True) <= 1:
            continue
        valid_cols.append(col)

    if not valid_cols:
        return None

    x_enc = x_enc[valid_cols]
    medians = x_enc.median(numeric_only=True)
    x_train = x_enc.fillna(medians).astype(float)
    y_train = df["owners_estimate"].astype(float)

    selected_features = _stepwise_selection(x_train, y_train)
    if not selected_features:
        selected_features = list(x_train.columns)

    x_sel = sm.add_constant(x_train[selected_features], has_constant="add")
    ols_model = sm.OLS(y_train, x_sel).fit()
    qreg_model = sm.QuantReg(y_train, x_sel).fit(q=0.5, max_iter=5000)

    return {
        "train_columns": list(x_train.columns),
        "selected_features": selected_features,
        "medians": medians,
        "ols_model": ols_model,
        "qreg_model": qreg_model,
    }


def _prepare_stepwise_features(df: pd.DataFrame, bundle: dict) -> pd.DataFrame:
    drop_non_features = ["owners_estimate", "tanggal_lelang_pricing", "tanggal_lelang_pricing_dt"]
    x_raw = df.drop(columns=[c for c in drop_non_features if c in df.columns], errors="ignore").copy()
    x_enc = pd.get_dummies(x_raw, drop_first=True, prefix_sep="__")
    x_enc = x_enc.reindex(columns=bundle["train_columns"], fill_value=0)
    x_enc = x_enc.apply(pd.to_numeric, errors="coerce").replace([np.inf, -np.inf], np.nan)
    x_enc = x_enc.fillna(bundle["medians"]).astype(float)
    return x_enc


def _predict_rows(input_df: pd.DataFrame, models: dict, stepwise_bundle: dict | None = None) -> pd.DataFrame:
    if input_df.empty:
        return pd.DataFrame(
            columns=[
                "code",
                "tenor",
                "Quantile",
                "LightGBM",
                "XGBoost",
                "CatBoost",
                "RandomForest",
                "StepwiseOLS",
                "QuantileReg",
            ]
        )

    input_df = input_df.copy()
    input_df["code"] = input_df["code"].astype(str).str.strip().str.lower()

    is_spn = input_df["code"].str.startswith("spn")
    spn_df = input_df[is_spn].copy()
    bm_df = input_df[~is_spn].copy()

    preds = pd.DataFrame(index=input_df.index)

    if not spn_df.empty:
        x_spn = _prepare_features(spn_df, models["pre_spn"])
        preds.loc[spn_df.index, "Quantile"] = models["quantile_spn"][0.5].predict(x_spn)
        preds.loc[spn_df.index, "LightGBM"] = models["lgbm_spn"].predict(x_spn)
        preds.loc[spn_df.index, "XGBoost"] = models["xgb_spn"].predict(xgb.DMatrix(x_spn))
        preds.loc[spn_df.index, "CatBoost"] = models["cat_spn"].predict(x_spn)
        preds.loc[spn_df.index, "RandomForest"] = models["rf_spn"].predict(x_spn)

    if not bm_df.empty:
        x_bm = _prepare_features(bm_df, models["pre_bm"])
        preds.loc[bm_df.index, "Quantile"] = models["quantile_bm"][0.5].predict(x_bm)
        preds.loc[bm_df.index, "LightGBM"] = models["lgbm_bm"].predict(x_bm)
        preds.loc[bm_df.index, "XGBoost"] = models["xgb_bm"].predict(xgb.DMatrix(x_bm))
        preds.loc[bm_df.index, "CatBoost"] = models["cat_bm"].predict(x_bm)
        preds.loc[bm_df.index, "RandomForest"] = models["rf_bm"].predict(x_bm)

    result = pd.DataFrame(
        {
            "code": input_df["code"],
            "tenor": pd.to_numeric(input_df["tenor"], errors="coerce"),
            "Quantile": preds["Quantile"],
            "LightGBM": preds["LightGBM"],
            "XGBoost": preds["XGBoost"],
            "CatBoost": preds["CatBoost"],
            "RandomForest": preds["RandomForest"],
        }
    )

    if stepwise_bundle is not None:
        x_stepwise = _prepare_stepwise_features(input_df, stepwise_bundle)
        selected_features = [
            col for col in stepwise_bundle["selected_features"] if col in x_stepwise.columns
        ]
        if selected_features:
            x_sel = sm.add_constant(x_stepwise[selected_features], has_constant="add")
            result["StepwiseOLS"] = np.asarray(
                stepwise_bundle["ols_model"].predict(x_sel), dtype=float
            ).ravel()
            result["QuantileReg"] = np.asarray(
                stepwise_bundle["qreg_model"].predict(x_sel), dtype=float
            ).ravel()
        else:
            result["StepwiseOLS"] = np.nan
            result["QuantileReg"] = np.nan
    else:
        result["StepwiseOLS"] = np.nan
        result["QuantileReg"] = np.nan

    return result.reset_index(drop=True)


def _sort_metrics(metrics: list[dict]) -> list[dict]:
    return sorted(
        metrics,
        key=lambda item: item.get("mae") if item.get("mae") is not None else float("inf")
    )


def _compute_model_metrics(validation_csv: Path) -> list[dict]:
    if not validation_csv.exists():
        return []

    df = pd.read_csv(validation_csv)
    if "actual" not in df.columns:
        return []

    actual = pd.to_numeric(df["actual"], errors="coerce")
    valid_mask = actual.notna()
    actual_values = actual[valid_mask].to_numpy(dtype=float)

    metrics = []
    for label, col in MODEL_COLUMN_MAP.items():
        if col not in df.columns:
            continue

        pred = pd.to_numeric(df[col], errors="coerce")
        model_mask = valid_mask & pred.notna()
        if not model_mask.any():
            continue

        y_true = actual[model_mask].to_numpy(dtype=float)
        y_pred = pred[model_mask].to_numpy(dtype=float)

        mae = float(np.mean(np.abs(y_true - y_pred)))
        rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))

        nonzero_mask = np.abs(y_true) > 1e-12
        if np.any(nonzero_mask):
            mape = float(np.mean(np.abs((y_true[nonzero_mask] - y_pred[nonzero_mask]) / y_true[nonzero_mask])) * 100)
        else:
            mape = None

        metrics.append(
            {
                "model": label,
                "mae": mae,
                "rmse": rmse,
                "mape": mape,
                "sampleSize": int(y_true.size),
            }
        )

    metrics.sort(key=lambda item: item.get("mae", float("inf")))
    return metrics


def _compute_holdout_model_metrics(
    dbtrain_csv: Path,
    models: dict,
    stepwise_bundle: dict | None = None,
) -> list[dict]:
    if not dbtrain_csv.exists():
        return []

    train_df = pd.read_csv(dbtrain_csv)
    if "tanggal_lelang_pricing" not in train_df.columns or "owners_estimate" not in train_df.columns:
        return []

    train_df["tanggal_lelang_pricing_dt"] = pd.to_datetime(
        train_df["tanggal_lelang_pricing"], dayfirst=True, errors="coerce"
    )
    if train_df["tanggal_lelang_pricing_dt"].isna().all():
        return []

    latest_pricing_date = train_df["tanggal_lelang_pricing_dt"].max()
    holdout_df = train_df[train_df["tanggal_lelang_pricing_dt"] == latest_pricing_date].copy()
    if holdout_df.empty:
        return []

    holdout_df["code"] = holdout_df["code"].astype(str).str.strip().str.lower()
    holdout_df["owners_estimate"] = pd.to_numeric(holdout_df["owners_estimate"], errors="coerce")
    holdout_df = holdout_df[holdout_df["owners_estimate"].notna()].copy()
    if holdout_df.empty:
        return []

    model_values = {
        "Quantile": {"y_true": [], "y_pred": []},
        "LightGBM": {"y_true": [], "y_pred": []},
        "XGBoost": {"y_true": [], "y_pred": []},
        "CatBoost": {"y_true": [], "y_pred": []},
        "RandomForest": {"y_true": [], "y_pred": []},
        "StepwiseOLS": {"y_true": [], "y_pred": []},
        "QuantileReg": {"y_true": [], "y_pred": []},
    }

    for bond_type, prefix, pre_key in [("spn", "spn", "pre_spn"), ("bm", "bm", "pre_bm")]:
        subset = holdout_df[holdout_df["code"].str.startswith(prefix)].copy()
        if subset.empty:
            continue

        x_subset = _prepare_features(subset, models[pre_key])
        y_true = subset["owners_estimate"].to_numpy(dtype=float)

        preds = {
            "Quantile": models[f"quantile_{bond_type}"][0.5].predict(x_subset),
            "LightGBM": models[f"lgbm_{bond_type}"].predict(x_subset),
            "XGBoost": models[f"xgb_{bond_type}"].predict(xgb.DMatrix(x_subset)),
            "CatBoost": models[f"cat_{bond_type}"].predict(x_subset),
            "RandomForest": models[f"rf_{bond_type}"].predict(x_subset),
        }

        for name, y_pred in preds.items():
            model_values[name]["y_true"].append(y_true)
            model_values[name]["y_pred"].append(np.asarray(y_pred, dtype=float))

    if stepwise_bundle is not None:
        x_hold = _prepare_stepwise_features(holdout_df, stepwise_bundle)
        selected_features = [
            col for col in stepwise_bundle["selected_features"] if col in x_hold.columns
        ]
        if selected_features:
            x_hold_sel = sm.add_constant(x_hold[selected_features], has_constant="add")
            y_true = holdout_df["owners_estimate"].to_numpy(dtype=float)
            y_pred_ols = np.asarray(stepwise_bundle["ols_model"].predict(x_hold_sel), dtype=float).ravel()
            y_pred_qr = np.asarray(stepwise_bundle["qreg_model"].predict(x_hold_sel), dtype=float).ravel()

            model_values["StepwiseOLS"]["y_true"].append(y_true)
            model_values["StepwiseOLS"]["y_pred"].append(y_pred_ols)
            model_values["QuantileReg"]["y_true"].append(y_true)
            model_values["QuantileReg"]["y_pred"].append(y_pred_qr)

    metrics = []
    for name, values in model_values.items():
        if not values["y_true"]:
            continue

        y_true = np.concatenate(values["y_true"])
        y_pred = np.concatenate(values["y_pred"])
        if y_true.size == 0:
            continue

        mae = float(np.mean(np.abs(y_true - y_pred)))
        rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))
        nonzero_mask = np.abs(y_true) > 1e-12
        if np.any(nonzero_mask):
            mape = float(np.mean(np.abs((y_true[nonzero_mask] - y_pred[nonzero_mask]) / y_true[nonzero_mask])) * 100)
        else:
            mape = None

        metrics.append(
            {
                "model": name,
                "mae": mae,
                "rmse": rmse,
                "mape": mape,
                "sampleSize": int(y_true.size),
            }
        )

    return _sort_metrics(metrics)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--models-dir", required=True)
    parser.add_argument("--validation-csv", required=True)
    parser.add_argument("--validation-report", required=False)
    parser.add_argument("--dbtrain", required=False)
    args = parser.parse_args()

    input_path = Path(args.input)
    models_dir = Path(args.models_dir)
    validation_csv = Path(args.validation_csv)
    validation_report = Path(args.validation_report) if args.validation_report else None
    dbtrain_csv = Path(args.dbtrain) if args.dbtrain else None

    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")
    if not models_dir.exists():
        raise FileNotFoundError(f"Models directory not found: {models_dir}")

    input_df = pd.read_csv(input_path)

    missing = [col for col in REQUIRED_BASE_COLUMNS if col not in input_df.columns]
    if missing:
        raise ValueError(
            f"Missing required columns: {', '.join(missing)}"
        )

    models = _load_models(models_dir)
    stepwise_bundle = _build_stepwise_bundle(dbtrain_csv)
    predictions_df = _predict_rows(input_df, models, stepwise_bundle)
    model_metrics = _compute_holdout_model_metrics(dbtrain_csv, models, stepwise_bundle) if dbtrain_csv else []
    if not model_metrics:
        model_metrics = _sort_metrics(_compute_model_metrics(validation_csv))

    output = {
        "predictions": predictions_df.to_dict(orient="records"),
        "modelMetrics": model_metrics,
    }

    print(json.dumps(output, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"error": str(error)}))
        raise
