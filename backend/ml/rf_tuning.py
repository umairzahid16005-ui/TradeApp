
import json
import time
import itertools
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

# =========================
# CONFIGURATION
# =========================
CSV_FILE = "btc_5000_candles.csv"
HORIZON = 6
FOLDS = 5
RANDOM_STATE = 42

# Different Random Forest settings
PARAM_GRID = {
    "n_estimators": [200, 400],
    "max_depth": [6, 8, 12],
    "min_samples_leaf": [3, 5, 10],
    "max_features": [0.7]
}


# =========================
# LOAD DATA
# =========================
def load_data():
    df = pd.read_csv(CSV_FILE)
    df.columns = [c.lower().strip() for c in df.columns]

    if "time" not in df.columns:
        for name in ["timestamp", "open_time", "date"]:
            if name in df.columns:
                df = df.rename(columns={name: "time"})
                break

    required = ["open", "high", "low", "close", "volume"]
    missing = [c for c in required if c not in df.columns]

    if missing:
        raise ValueError(f"Missing CSV columns: {missing}")

    for col in required:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna(subset=required).reset_index(drop=True)

    if "time" in df.columns:
        df = df.sort_values("time").reset_index(drop=True)

    if len(df) < 1000:
        raise ValueError("Not enough candles")

    return df


# =========================
# FEATURE ENGINEERING
# =========================
def make_features(df):
    close = df["close"]
    high = df["high"]
    low = df["low"]
    op = df["open"]
    volume = df["volume"]

    X = pd.DataFrame(index=df.index)

    for n in [1, 3, 6, 12, 24]:
        X[f"return_{n}"] = close.pct_change(n)

    returns = close.pct_change()

    for n in [6, 12, 24]:
        X[f"volatility_{n}"] = returns.rolling(n).std()

    for n in [5, 12, 24, 48]:
        X[f"ma_{n}"] = close / close.rolling(n).mean() - 1

    X["volume_change"] = volume.pct_change()
    X["range"] = (high - low) / close
    X["body"] = (close - op) / op

    X["upper_wick"] = (
        high - np.maximum(op, close)
    ) / close

    X["lower_wick"] = (
        np.minimum(op, close) - low
    ) / close

    delta = close.diff()
    gain = delta.clip(lower=0).rolling(14).mean()
    loss = -delta.clip(upper=0).rolling(14).mean()
    rs = gain / loss.replace(0, np.nan)

    X["rsi"] = 100 - 100 / (1 + rs)

    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    X["macd"] = (ema12 - ema26) / close

    for n in [9, 21, 50]:
        X[f"ema{n}"] = (
            close / close.ewm(span=n, adjust=False).mean() - 1
        )

    previous = close.shift(1)

    tr = pd.concat(
        [
            high - low,
            (high - previous).abs(),
            (low - previous).abs()
        ],
        axis=1
    ).max(axis=1)

    X["atr_pct"] = tr.rolling(14).mean() / close

    y = close.shift(-HORIZON) / close - 1
    valid = X.notna().all(axis=1) & y.notna()

    return X.loc[valid], y.loc[valid]


# =========================
# WALK-FORWARD SPLITS
# =========================
def make_splits(total):
    test_size = total // (FOLDS + 1)

    if test_size < 100:
        raise ValueError("Not enough data for walk-forward testing")

    splits = []

    for fold in range(FOLDS):
        test_start = total - FOLDS * test_size + fold * test_size
        test_end = min(test_start + test_size, total)
        train_end = test_start - HORIZON

        splits.append((
            train_end,
            test_start,
            test_end
        ))

    return splits


# =========================
# TEST ONE CONFIGURATION
# =========================
def evaluate(X, y, params, splits):
    actual_all = []
    predicted_all = []
    train_times = []
    predict_times = []

    for train_end, test_start, test_end in splits:
        train_X = X.iloc[:train_end]
        train_y = y.iloc[:train_end]
        test_X = X.iloc[test_start:test_end]
        test_y = y.iloc[test_start:test_end]

        model = RandomForestRegressor(
            **params,
            random_state=RANDOM_STATE,
            n_jobs=-1
        )

        start = time.perf_counter()
        model.fit(train_X, train_y)
        train_times.append(time.perf_counter() - start)

        start = time.perf_counter()
        predictions = model.predict(test_X)
        predict_times.append(time.perf_counter() - start)

        actual_all.extend(test_y.to_numpy())
        predicted_all.extend(predictions)

    actual = np.array(actual_all)
    predicted = np.array(predicted_all)

    mae = mean_absolute_error(actual, predicted) * 100
    rmse = np.sqrt(mean_squared_error(actual, predicted)) * 100
    direction = (
        np.sign(actual) == np.sign(predicted)
    ).mean() * 100

    return {
        "maePct": round(mae, 6),
        "rmsePct": round(rmse, 6),
        "directionAccuracyPct": round(direction, 2),
        "avgTrainingSeconds": round(float(np.mean(train_times)), 3),
        "totalTrainingSeconds": round(float(np.sum(train_times)), 3),
        "totalPredictionSeconds": round(float(np.sum(predict_times)), 3),
    }


# =========================
# MAIN
# =========================
def main():
    df = load_data()
    X, y = make_features(df)
    splits = make_splits(len(X))

    combinations = list(itertools.product(
        PARAM_GRID["n_estimators"],
        PARAM_GRID["max_depth"],
        PARAM_GRID["min_samples_leaf"],
        PARAM_GRID["max_features"]
    ))

    print(f"Candles: {len(df)}")
    print(f"Usable samples: {len(X)}")
    print(f"Walk-forward folds: {FOLDS}")
    print(f"Configurations: {len(combinations)}")
    print("Starting Random Forest tuning...\n")

    results = []

    for index, (trees, depth, leaf, features) in enumerate(combinations, 1):
        params = {
            "n_estimators": trees,
            "max_depth": depth,
            "min_samples_leaf": leaf,
            "max_features": features
        }

        print(f"[{index}/{len(combinations)}] Testing: {params}")

        metrics = evaluate(X, y, params, splits)
        result = {**params, **metrics}
        results.append(result)

        print(
            f"  MAE: {metrics['maePct']:.4f}% | "
            f"Direction: {metrics['directionAccuracyPct']:.2f}% | "
            f"Train: {metrics['totalTrainingSeconds']:.2f}s\n"
        )

    results.sort(key=lambda r: r["maePct"])

    print("\n========== TOP 5 CONFIGURATIONS ==========")
    for rank, result in enumerate(results[:5], 1):
        print(f"\nRank {rank}")
        print(json.dumps(result, indent=2))

    best = results[0]

    with open("rf_tuning_results.json", "w", encoding="utf-8") as file:
        json.dump(results, file, indent=2)

    with open("rf_best_config.json", "w", encoding="utf-8") as file:
        json.dump(best, file, indent=2)

    print("\n========== BEST BY MAE ==========")
    print(json.dumps(best, indent=2))
    print("\nResults saved to rf_tuning_results.json")
    print("Best settings saved to rf_best_config.json")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"TEST FAILED: {error}")