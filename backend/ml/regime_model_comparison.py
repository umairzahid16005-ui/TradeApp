
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error


# SETTINGS
SYMBOL = "BTCUSDT"
CANDLE_FILE = "btc_5000_candles.csv"
HORIZON = 6
REGIME_LOOKBACK = 24
REGIME_THRESHOLD = 1.0
SIGNAL_THRESHOLD = 0.5
FEE_PER_SIDE = 0.1
N_SPLITS = 5
MIN_REGIME_TRAIN = 100

FEATURES = [
    "return_1", "return_3", "return_6", "return_12", "return_24",
    "volatility_6", "volatility_12", "volatility_24",
    "ma_5", "ma_12", "ma_24", "ma_48",
    "volume_change", "range", "body", "upper_wick", "lower_wick",
    "rsi", "macd", "ema50", "atr_pct", "volume_ma_ratio",
    "regime_return"
]


# LOAD DOWNLOADED CANDLES
def fetch_candles():
    print(f"Loading candles from {CANDLE_FILE}...")

    df = pd.read_csv(CANDLE_FILE)
    df["open_time"] = pd.to_datetime(df["open_time"])

    for col in ["open", "high", "low", "close", "volume"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.drop_duplicates(subset=["open_time"])
    df = df.sort_values("open_time").reset_index(drop=True)

    print(f"Loaded {len(df)} candles")
    return df


# FEATURES
def add_features(df):
    df = df.copy()

    close = df["close"]
    high = df["high"]
    low = df["low"]
    open_price = df["open"]
    volume = df["volume"]

    for period in [1, 3, 6, 12, 24]:
        df[f"return_{period}"] = close.pct_change(period) * 100

    hourly_return = close.pct_change() * 100

    for period in [6, 12, 24]:
        df[f"volatility_{period}"] = (
            hourly_return.rolling(period).std()
        )

    for period in [5, 12, 24, 48]:
        ma = close.rolling(period).mean()
        df[f"ma_{period}"] = (close / ma - 1) * 100

    df["volume_change"] = volume.pct_change() * 100
    df["range"] = (high - low) / close * 100
    df["body"] = (close - open_price) / open_price * 100

    candle_top = np.maximum(open_price, close)
    candle_bottom = np.minimum(open_price, close)

    df["upper_wick"] = (high - candle_top) / close * 100
    df["lower_wick"] = (candle_bottom - low) / close * 100

    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.rolling(14).mean()
    avg_loss = loss.rolling(14).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    df["rsi"] = 100 - (100 / (1 + rs))

    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    df["macd"] = (ema12 - ema26) / close * 100

    ema50 = close.ewm(span=50, adjust=False).mean()
    df["ema50"] = (close / ema50 - 1) * 100

    previous_close = close.shift(1)
    true_range = pd.concat([
        high - low,
        (high - previous_close).abs(),
        (low - previous_close).abs()
    ], axis=1).max(axis=1)

    df["atr_pct"] = true_range.rolling(14).mean() / close * 100

    volume_ma = volume.rolling(24).mean()
    df["volume_ma_ratio"] = volume / volume_ma

    # Regime uses past data only
    df["regime_return"] = close.pct_change(REGIME_LOOKBACK) * 100

    df["regime"] = np.select(
        [
            df["regime_return"] >= REGIME_THRESHOLD,
            df["regime_return"] <= -REGIME_THRESHOLD
        ],
        ["UPTREND", "DOWNTREND"],
        default="SIDEWAYS"
    )

    df["target"] = (
        (close.shift(-HORIZON) / close - 1) * 100
    )

    df = df.replace([np.inf, -np.inf], np.nan)
    df = df.dropna(subset=FEATURES + ["target"])
    return df.reset_index(drop=True)


# MODEL
def make_model():
    return RandomForestRegressor(
        n_estimators=300,
        max_depth=8,
        min_samples_leaf=5,
        random_state=42,
        n_jobs=-1
    )


# SEQUENTIAL TRADING METRICS
def trade_metrics(predictions):
    trades = []
    next_allowed = -1

    for i, row in enumerate(predictions):
        if i < next_allowed:
            continue

        prediction = row["prediction"]
        actual = row["actual"]

        if prediction >= SIGNAL_THRESHOLD:
            gross_return = actual
        elif prediction <= -SIGNAL_THRESHOLD:
            gross_return = -actual
        else:
            continue

        net_return = gross_return - 2 * FEE_PER_SIDE
        trades.append(net_return)
        next_allowed = i + HORIZON

    if not trades:
        return 0, 0, 0.0, 0.0, 0.0

    trades = np.array(trades)
    compounded = (np.prod(1 + trades / 100) - 1) * 100

    return (
        len(trades),
        int(np.sum(trades > 0)),
        float(np.mean(trades > 0) * 100),
        float(np.mean(trades)),
        float(compounded)
    )


def print_results(name, predictions):
    actual = np.array([r["actual"] for r in predictions])
    predicted = np.array([r["prediction"] for r in predictions])

    mae = mean_absolute_error(actual, predicted)
    rmse = np.sqrt(mean_squared_error(actual, predicted))
    direction = np.mean(np.sign(actual) == np.sign(predicted)) * 100

    trades, wins, win_rate, avg_net, compound = trade_metrics(predictions)

    print(f"\n{name}")
    print("-" * 45)
    print(f"Samples:             {len(predictions)}")
    print(f"MAE:                 {mae:.4f}%")
    print(f"RMSE:                {rmse:.4f}%")
    print(f"Direction accuracy:  {direction:.2f}%")
    print(f"Trades:              {trades}")
    print(f"Winning trades:      {wins}")
    print(f"Win rate:            {win_rate:.2f}%")
    print(f"Average net/trade:   {avg_net:.4f}%")
    print(f"Compounded return:   {compound:.2f}%")


# WALK-FORWARD COMPARISON
def run_comparison(data):
    splitter = TimeSeriesSplit(n_splits=N_SPLITS)

    pooled_predictions = []
    specialist_predictions = []

    X = data[FEATURES]

    for fold, (train_idx, test_idx) in enumerate(splitter.split(X), 1):
        train = data.iloc[train_idx]
        test = data.iloc[test_idx]

        print(f"\nFold {fold}: train={len(train)}, test={len(test)}")

        pooled_model = make_model()
        pooled_model.fit(train[FEATURES], train["target"])
        pooled_pred = pooled_model.predict(test[FEATURES])

        specialists = {}

        for regime in ["UPTREND", "DOWNTREND", "SIDEWAYS"]:
            regime_train = train[train["regime"] == regime]

            if len(regime_train) < MIN_REGIME_TRAIN:
                print(f"  {regime}: fallback to pooled model")
                specialists[regime] = None
            else:
                model = make_model()
                model.fit(regime_train[FEATURES], regime_train["target"])
                specialists[regime] = model
                print(f"  {regime}: trained on {len(regime_train)} rows")

        for pos, (_, row) in enumerate(test.iterrows()):
            pooled_predictions.append({
                "index": int(test_idx[pos]),
                "prediction": float(pooled_pred[pos]),
                "actual": float(row["target"])
            })

            model = specialists.get(row["regime"])

            if model is None:
                prediction = pooled_pred[pos]
            else:
                prediction = model.predict(
                    row[FEATURES].to_frame().T
                )[0]

            specialist_predictions.append({
                "index": int(test_idx[pos]),
                "prediction": float(prediction),
                "actual": float(row["target"])
            })

    pooled_predictions.sort(key=lambda x: x["index"])
    specialist_predictions.sort(key=lambda x: x["index"])

    print("\n========== FINAL COMPARISON ==========")
    print_results("POOLED RANDOM FOREST", pooled_predictions)
    print_results("REGIME-SPECIALIST RANDOM FOREST", specialist_predictions)

    output = data[["open_time", "regime", "target"]].copy()
    output = output.rename(columns={"target": "actual_return"})
    output["pooled_prediction"] = np.nan
    output["specialist_prediction"] = np.nan

    for row in pooled_predictions:
        output.loc[row["index"], "pooled_prediction"] = row["prediction"]

    for row in specialist_predictions:
        output.loc[row["index"], "specialist_prediction"] = row["prediction"]

    output.to_csv("regime_model_comparison.csv", index=False)
    print("\nSaved: regime_model_comparison.csv")


def main():
    candles = fetch_candles()
    print(f"\nCandles loaded: {len(candles)}")

    if len(candles) < 1000:
        raise ValueError("Not enough candles for this experiment.")

    data = add_features(candles)

    print(f"Prepared samples: {len(data)}")
    print(f"Features: {len(FEATURES)}")
    print(f"Horizon: {HORIZON} hours")
    print("\nRegime distribution:")
    print(data["regime"].value_counts())

    run_comparison(data)


if __name__ == "__main__":
    main()