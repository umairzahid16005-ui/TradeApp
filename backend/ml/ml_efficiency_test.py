
import time
import json
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
N_ESTIMATORS = 400
RANDOM_STATE = 42


# =========================
# LOAD DATA
# =========================
def load_data():
    df = pd.read_csv(CSV_FILE)
    df.columns = [c.lower().strip() for c in df.columns]

    # Support common timestamp column names.
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
        raise ValueError("Not enough candles in CSV")

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

    # Future 6-hour return is the target.
    y = close.shift(-HORIZON) / close - 1

    valid = X.notna().all(axis=1) & y.notna()
    return X.loc[valid], y.loc[valid]


# =========================
# WALK-FORWARD TEST
# =========================
def run_test():
    df = load_data()
    X, y = make_features(df)

    total = len(X)
    test_size = total // (FOLDS + 1)

    if test_size < 100:
        raise ValueError("Not enough data for 5 test folds")

    all_actual = []
    all_predictions = []
    training_times = []
    prediction_times = []

    print(f"Total candles: {len(df)}")
    print(f"Usable samples: {total}")
    print(f"Test folds: {FOLDS}")
    print("Starting walk-forward evaluation...\n")

    for fold in range(FOLDS):
        test_start = total - FOLDS * test_size + fold * test_size
        test_end = min(test_start + test_size, total)

        # Purge the last HORIZON rows before testing.
        train_end = test_start - HORIZON

        train_X = X.iloc[:train_end]
        train_y = y.iloc[:train_end]
        test_X = X.iloc[test_start:test_end]
        test_y = y.iloc[test_start:test_end]

        model = RandomForestRegressor(
            n_estimators=N_ESTIMATORS,
            max_depth=8,
            min_samples_leaf=5,
            max_features=0.7,
            random_state=RANDOM_STATE,
            n_jobs=-1
        )

        start = time.perf_counter()
        model.fit(train_X, train_y)
        train_seconds = time.perf_counter() - start

        start = time.perf_counter()
        predictions = model.predict(test_X)
        prediction_seconds = time.perf_counter() - start

        training_times.append(train_seconds)
        prediction_times.append(prediction_seconds)

        all_actual.extend(test_y.to_numpy())
        all_predictions.extend(predictions)

        fold_mae = mean_absolute_error(test_y, predictions) * 100
        fold_direction = (
            np.sign(test_y.to_numpy()) == np.sign(predictions)
        ).mean() * 100

        print(f"Fold {fold + 1}/{FOLDS}")
        print(f"  Train samples: {len(train_X)}")
        print(f"  Test samples: {len(test_X)}")
        print(f"  MAE: {fold_mae:.4f}%")
        print(f"  Direction accuracy: {fold_direction:.2f}%")
        print(f"  Training time: {train_seconds:.2f} sec")
        print(f"  Prediction time: {prediction_seconds:.4f} sec\n")

    actual = np.array(all_actual)
    predicted = np.array(all_predictions)

    mae = mean_absolute_error(actual, predicted) * 100
    rmse = np.sqrt(mean_squared_error(actual, predicted)) * 100
    direction = (
        np.sign(actual) == np.sign(predicted)
    ).mean() * 100

    total_test_rows = len(actual)
    total_prediction_time = sum(prediction_times)

    results = {
        "model": "RandomForestRegressor",
        "horizonHours": HORIZON,
        "folds": FOLDS,
        "testSamples": total_test_rows,
        "maePct": round(mae, 6),
        "rmsePct": round(rmse, 6),
        "directionAccuracyPct": round(direction, 2),
        "averageTrainingSeconds": round(
            float(np.mean(training_times)), 4
        ),
        "totalTrainingSeconds": round(
            float(np.sum(training_times)), 4
        ),
        "totalPredictionSeconds": round(
            total_prediction_time, 4
        ),
        "predictionMillisecondsPerRow": round(
            total_prediction_time / total_test_rows * 1000, 4
        )
    }

    print("========== FINAL RESULTS ==========")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    try:
        run_test()
    except Exception as error:
        print(f"TEST FAILED: {error}")