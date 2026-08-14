import os
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import (
    RandomForestRegressor,
    GradientBoostingRegressor,
)
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from xgboost import XGBRegressor
from locality_config import (
    base_locality,
    region_for_locality,
)
# ============================================================
# ENCODER
# ============================================================
def make_encoder():
    try:
        return OneHotEncoder(
            handle_unknown="ignore",
            sparse_output=False,
        )
    except TypeError:
        return OneHotEncoder(
            handle_unknown="ignore",
            sparse=False,
        )
# ============================================================
# BASIC FEATURES
# ============================================================
def add_basic_features(df):
    out = df.copy()

    out["Avg_Room_Size"] = (
        out["Area_SqFt"]
        / out["BHK_Size"].replace(0, np.nan)
    )
    out["Avg_Room_Size"] = (
        out["Avg_Room_Size"]
        .replace(
            [np.inf, -np.inf],
            np.nan,
        )
        .fillna(0)
    )
    out["Area_SqFt_Log"] = np.log1p(
        out["Area_SqFt"].clip(lower=1)
    )
    out["Region"] = out[
        "Locality"
    ].apply(region_for_locality)
    out["Base_Locality"] = out[
        "Locality"
    ].apply(base_locality)
    return out
# ============================================================
# MARKET FEATURE BUILDER
# ============================================================
# Defined in market_feature_builder.py so joblib can unpickle
# model_metadata.joblib under a stable module path (not __main__).
import sys
from pathlib import Path as _Path
# Ensure the directory that contains market_feature_builder.py is on sys.path
_here = _Path(__file__).resolve().parent
_candidates = [
    _here,                          # same folder as train.py (ml/src/)
    _here.parent,                   # ml/
    _here.parent / "src",           # ml/src
    _here.parent.parent / "ml",     # project/ml
    _here.parent.parent / "backend" / "app" / "services",
]
for _p in _candidates:
    _p_str = str(_p)
    if (_p / "market_feature_builder.py").exists() and _p_str not in sys.path:
        sys.path.insert(0, _p_str)

try:
    from market_feature_builder import MarketFeatureBuilder
except ImportError as _e:
    raise ImportError(
        "Could not import MarketFeatureBuilder. "
        "Place market_feature_builder.py next to train.py "
        f"(looked in: {[str(c) for c in _candidates]}). "
        f"Original error: {_e}"
    ) from _e

# ============================================================
# BASIC MODEL FEATURES
# ============================================================

CATEGORICAL_FEATURES = [
    "Locality",
    "Base_Locality",
    "Region",
    "Property_Type",
    "Furnishing_Status",
    "Property_Age",
    "Market_Fallback_Level",
]


NUMERICAL_FEATURES = [
    "BHK_Size",
    "Bathroom_Count",
    "Area_SqFt",
    "Balcony_Count",
    "Avg_Room_Size",
    "Area_SqFt_Log",

    "Locality_Market_PPSF",
    "Locality_BHK_PPSF",
    "Locality_Type_PPSF",
    "Region_Market_PPSF",
    "Region_BHK_PPSF",

    "Area_Market_Interaction",
]


def build_preprocessor():

    return ColumnTransformer(
        transformers=[
            (
                "num",
                "passthrough",
                NUMERICAL_FEATURES,
            ),
            (
                "cat",
                make_encoder(),
                CATEGORICAL_FEATURES,
            ),
        ],
        remainder="drop",
    )


# ============================================================
# MODEL FACTORY
# ============================================================

def make_models():
    # XGBoost only — faster retrain, usually the best model in this pipeline.
    # For permanent pickle fix this is enough.
    return {
        "XGBoost": XGBRegressor(
            n_estimators=900,
            learning_rate=0.025,
            max_depth=6,
            min_child_weight=5,
            subsample=0.85,
            colsample_bytree=0.85,
            reg_alpha=0.20,
            reg_lambda=2.0,
            objective="reg:squarederror",
            random_state=42,
            n_jobs=-1,
        ),
    }


# ============================================================
# METRICS
# ============================================================

def calculate_metrics(
    actual,
    predicted,
):

    actual = np.asarray(actual)
    predicted = np.asarray(predicted)

    mae = mean_absolute_error(
        actual,
        predicted,
    )

    rmse = np.sqrt(
        mean_squared_error(
            actual,
            predicted,
        )
    )

    r2 = r2_score(
        actual,
        predicted,
    )

    nonzero = actual > 0

    mape = (
        np.mean(
            np.abs(
                (
                    actual[nonzero]
                    - predicted[nonzero]
                )
                / actual[nonzero]
            )
        )
        * 100
    )

    return {
        "mae_lakhs": float(mae),
        "rmse_lakhs": float(rmse),
        "r2": float(r2),
        "mape_percent": float(mape),
    }


# ============================================================
# LOCALITY-BALANCED METRIC
# ============================================================

def locality_balanced_mape(
    df,
    actual,
    predicted,
):

    temp = pd.DataFrame({
        "Locality": df["Locality"].values,
        "actual": actual,
        "predicted": predicted,
    })

    temp["ape"] = (
        np.abs(
            temp["actual"]
            - temp["predicted"]
        )
        / temp["actual"].clip(lower=1)
        * 100
    )

    locality_scores = (
        temp.groupby("Locality")["ape"]
        .mean()
    )

    return float(
        locality_scores.mean()
    )


# ============================================================
# TRAIN
# ============================================================

def run_model_comparison(
    data_path=None,
    model_output_path=None,
):

    base_dir = os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )

    if data_path is None:

        data_path = os.path.join(
            base_dir,
            "data",
            "processed",
            "cleaned_properties.csv",
        )

    if model_output_path is None:

        model_output_path = os.path.join(
            base_dir,
            "saved_models",
            "house_model.joblib",
        )

    if not os.path.exists(data_path):

        raise FileNotFoundError(
            f"Missing dataset: {data_path}"
        )

    df = pd.read_csv(
        data_path
    )

    required = [
        "Locality",
        "Region",
        "Property_Type",
        "Furnishing_Status",
        "Property_Age",
        "BHK_Size",
        "Bathroom_Count",
        "Area_SqFt",
        "Balcony_Count",
        "Price_Lakhs",
    ]

    missing = [
        col
        for col in required
        if col not in df.columns
    ]

    if missing:

        raise ValueError(
            f"Missing columns: {missing}"
        )

    print(
        f"Loaded {len(df):,} rows."
    )

    # --------------------------------------------------------
    # BASIC FEATURES
    # --------------------------------------------------------

    df = add_basic_features(
        df
    )

    # --------------------------------------------------------
    # TRAIN / VALIDATION SPLIT
    #
    # IMPORTANT:
    # Market features are learned from TRAIN ONLY.
    # --------------------------------------------------------

    train_df, valid_df = train_test_split(
        df,
        test_size=0.20,
        random_state=42,
    )

    train_df = train_df.reset_index(
        drop=True
    )

    valid_df = valid_df.reset_index(
        drop=True
    )

    market_features = (
        MarketFeatureBuilder()
        .fit(train_df)
    )

    train_features = (
        market_features.transform(
            train_df
        )
    )

    valid_features = (
        market_features.transform(
            valid_df
        )
    )

    feature_columns = (
        CATEGORICAL_FEATURES
        + NUMERICAL_FEATURES
    )

    X_train = train_features[
        feature_columns
    ]

    X_valid = valid_features[
        feature_columns
    ]

    y_train = np.log1p(
        train_df["Price_Lakhs"]
    )

    y_valid = np.log1p(
        valid_df["Price_Lakhs"]
    )

    models = make_models()

    results = {}

    print(
        "\n================================"
    )
    print(
        "MODEL COMPARISON"
    )
    print(
        "================================"
    )

    for name, model in models.items():

        print(
            f"\nTraining {name}..."
        )

        pipeline = Pipeline([
            (
                "preprocessor",
                build_preprocessor(),
            ),
            (
                "regressor",
                model,
            ),
        ])

        pipeline.fit(
            X_train,
            y_train,
        )

        pred_log = pipeline.predict(
            X_valid
        )

        predicted = np.maximum(
            np.expm1(pred_log),
            0,
        )

        actual = np.maximum(
            np.expm1(y_valid),
            0,
        )

        metrics = calculate_metrics(
            actual,
            predicted,
        )

        balanced_mape = (
            locality_balanced_mape(
                valid_df,
                actual,
                predicted,
            )
        )

        metrics[
            "locality_balanced_mape_percent"
        ] = balanced_mape

        results[name] = {
            "pipeline": pipeline,
            "metrics": metrics,
            "predicted": predicted,
            "actual": actual,
        }

        print(
            f"MAPE: "
            f"{metrics['mape_percent']:.2f}%"
        )

        print(
            f"Locality-balanced MAPE: "
            f"{balanced_mape:.2f}%"
        )

        print(
            f"R²: "
            f"{metrics['r2'] * 100:.2f}%"
        )

        print(
            f"MAE: "
            f"₹{metrics['mae_lakhs']:.2f} L"
        )

    # --------------------------------------------------------
    # MODEL SELECTION
    #
    # 60% global MAPE
    # 40% locality-balanced MAPE
    # --------------------------------------------------------

    def selection_score(name):

        metrics = results[
            name
        ]["metrics"]

        return (
            0.60
            * metrics["mape_percent"]
            + 0.40
            * metrics[
                "locality_balanced_mape_percent"
            ]
        )

    best_name = min(
        results,
        key=selection_score,
    )

    best_result = results[
        best_name
    ]

    print(
        f"\nWINNING MODEL: {best_name}"
    )

    print(
        f"Selection score: "
        f"{selection_score(best_name):.2f}"
    )

    # --------------------------------------------------------
    # LOCALITY REPORT
    # --------------------------------------------------------

    valid_report = valid_df[
        [
            "Locality",
        ]
    ].copy()

    valid_report[
        "Actual_Lakhs"
    ] = best_result["actual"]

    valid_report[
        "Predicted_Lakhs"
    ] = best_result["predicted"]

    valid_report["APE"] = (
        np.abs(
            valid_report[
                "Actual_Lakhs"
            ]
            - valid_report[
                "Predicted_Lakhs"
            ]
        )
        / valid_report[
            "Actual_Lakhs"
        ].clip(lower=1)
        * 100
    )

    valid_report["Bias_Percent"] = (
        (
            valid_report[
                "Predicted_Lakhs"
            ]
            - valid_report[
                "Actual_Lakhs"
            ]
        )
        / valid_report[
            "Actual_Lakhs"
        ].clip(lower=1)
        * 100
    )

    locality_report = (
        valid_report
        .groupby("Locality")
        .agg(
            samples=(
                "Actual_Lakhs",
                "size",
            ),
            mape=(
                "APE",
                "mean",
            ),
            bias_percent=(
                "Bias_Percent",
                "mean",
            ),
            median_actual=(
                "Actual_Lakhs",
                "median",
            ),
            median_predicted=(
                "Predicted_Lakhs",
                "median",
            ),
        )
        .sort_values(
            "mape",
            ascending=False,
        )
    )

    report_path = os.path.join(
        os.path.dirname(
            model_output_path
        ),
        "locality_validation_report.csv",
    )

    os.makedirs(
        os.path.dirname(
            model_output_path
        ),
        exist_ok=True,
    )

    locality_report.to_csv(
        report_path
    )

    print(
        f"\nSaved locality report:"
        f"\n{report_path}"
    )

    # --------------------------------------------------------
    # UNCERTAINTY
    # --------------------------------------------------------

    actual = best_result["actual"]
    predicted = best_result["predicted"]

    abs_relative_error = (
        np.abs(
            actual - predicted
        )
        / np.maximum(
            predicted,
            1.0,
        )
    )

    uncertainty = {
        "p70": float(
            np.quantile(
                abs_relative_error,
                0.70,
            )
        ),
        "p90": float(
            np.quantile(
                abs_relative_error,
                0.90,
            )
        ),
        "p975": float(
            np.quantile(
                abs_relative_error,
                0.975,
            )
        ),
    }

    # --------------------------------------------------------
    # FINAL MARKET FEATURE BUILDER
    #
    # Fit only once on ALL historical training data for
    # production inference.
    # --------------------------------------------------------

    final_market_features = (
        MarketFeatureBuilder()
        .fit(df)
    )

    final_features = (
        final_market_features.transform(
            df
        )
    )

    X_full = final_features[
        feature_columns
    ]

    y_full = np.log1p(
        df["Price_Lakhs"]
    )

    # --------------------------------------------------------
    # FINAL MODEL
    # --------------------------------------------------------

    final_model = make_models()[
        best_name
    ]

    final_pipeline = Pipeline([
        (
            "preprocessor",
            build_preprocessor(),
        ),
        (
            "regressor",
            final_model,
        ),
    ])

    final_pipeline.fit(
        X_full,
        y_full,
    )

    # --------------------------------------------------------
    # SAVE
    # --------------------------------------------------------

    joblib.dump(
        final_pipeline,
        model_output_path,
    )

    metadata_path = os.path.join(
        os.path.dirname(
            model_output_path
        ),
        "model_metadata.joblib",
    )

    metadata = {
        "best_model": best_name,

        "feature_columns": feature_columns,

        "categorical_features":
            CATEGORICAL_FEATURES,

        "numerical_features":
            NUMERICAL_FEATURES,

        "metrics": {
            name: result["metrics"]
            for name, result in results.items()
        },

        "uncertainty": uncertainty,

        "market_features":
            final_market_features,

        "target":
            "log1p(Price_Lakhs)",

        "notes": [
            "Locality and region market PPSF features are learned from training data only during validation.",
            "Final production market features are fitted on all historical training data.",
            "No global 1%-99% price clipping is used.",
            "Model selection balances global and locality-level MAPE.",
            "Training and inference must use the same feature schema.",
        ],
    }

    joblib.dump(
        metadata,
        metadata_path,
    )

    print(
        f"\nSaved model:"
        f"\n{model_output_path}"
    )

    print(
        f"Saved metadata:"
        f"\n{metadata_path}"
    )

    return final_pipeline


if __name__ == "__main__":
    run_model_comparison()
