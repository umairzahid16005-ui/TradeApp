
import requests
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

SYMBOL = "BTCUSDT"
LIMIT = 5000
HORIZON = 6
WINDOWS = 5
FEE = 0.001
SIGNAL_THRESHOLDS = [0.002, 0.003, 0.005]


def get_data():
    url = "https://data-api.binance.vision/api/v3/klines"
    rows = []
    end_time = None

    while len(rows) < LIMIT:
        params = {
            "symbol": SYMBOL,
            "interval": "1h",
            "limit": min(1000, LIMIT - len(rows))
        }
        if end_time is not None:
            params["endTime"] = end_time

        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        batch = response.json()
        if not batch:
            break

        rows = batch + rows
        end_time = batch[0][0] - 1

    df = pd.DataFrame(rows[-LIMIT:], columns=[
        "time", "open", "high", "low", "close", "volume",
        "close_time", "quote_volume", "trades",
        "taker_buy_base", "taker_buy_quote", "ignore"
    ])

    for col in ["open", "high", "low", "close", "volume"]:
        df[col] = df[col].astype(float)

    return df


def make_features(df):
    close, high, low = df.close, df.high, df.low
    op, volume = df.open, df.volume
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
    X["upper_wick"] = (high - np.maximum(op, close)) / close
    X["lower_wick"] = (np.minimum(op, close) - low) / close

    delta = close.diff()
    gain = delta.clip(lower=0).rolling(14).mean()
    loss = -delta.clip(upper=0).rolling(14).mean()
    rs = gain / loss.replace(0, np.nan)
    X["rsi"] = 100 - 100 / (1 + rs)

    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    X["macd"] = (ema12 - ema26) / close

    for n in [9, 21, 50]:
        X[f"ema{n}"] = close / close.ewm(span=n, adjust=False).mean() - 1

    previous = close.shift(1)
    tr = pd.concat([
        high - low,
        (high - previous).abs(),
        (low - previous).abs()
    ], axis=1).max(axis=1)
    X["atr_pct"] = tr.rolling(14).mean() / close

    target = close.shift(-HORIZON) / close - 1
    valid = X.notna().all(axis=1) & target.notna()

    return X[valid], target[valid]


def evaluate_trades(predictions, actual_returns, threshold):
    trades = []
    next_allowed = 0

    for i, prediction in enumerate(predictions):
        if i < next_allowed:
            continue

        if prediction > threshold:
            net = actual_returns[i] - 2 * FEE
        elif prediction < -threshold:
            net = -actual_returns[i] - 2 * FEE
        else:
            continue

        trades.append(net)
        next_allowed = i + HORIZON

    if not trades:
        return 0, 0, 0, 0

    trades = np.array(trades)
    return (
        len(trades),
        (trades > 0).mean() * 100,
        trades.mean() * 100,
        (np.prod(1 + trades) - 1) * 100
    )


def main():
    print("Downloading BTCUSDT 5000 candles...")
    df = get_data()
    X, y = make_features(df)

    print(f"Candles: {len(df)}")
    print(f"Prepared samples: {len(X)}")
    print(f"Features: {X.shape[1]}")
    print(f"Prediction horizon: {HORIZON} hours")

    n = len(X)
    initial = n // 2
    window_size = (n - initial) // WINDOWS
    all_predictions = []
    all_actual = []

    for w in range(WINDOWS):
        start = initial + w * window_size
        end = initial + (w + 1) * window_size
        if w == WINDOWS - 1:
            end = n

        train_end = max(0, start - HORIZON)
        train_X, train_y = X.iloc[:train_end], y.iloc[:train_end]
        test_X, test_y = X.iloc[start:end], y.iloc[start:end]

        model = RandomForestRegressor(
            n_estimators=400,
            max_depth=8,
            min_samples_leaf=5,
            max_features=0.7,
            random_state=42,
            n_jobs=-1
        )

        model.fit(train_X, train_y)
        predictions = model.predict(test_X)

        mae = mean_absolute_error(test_y, predictions) * 100
        rmse = np.sqrt(mean_squared_error(test_y, predictions)) * 100

        print(
            f"Window {w + 1}: "
            f"MAE={mae:.4f}% | RMSE={rmse:.4f}% "
            f"| samples={len(test_X)}"
        )

        all_predictions.extend(predictions)
        all_actual.extend(test_y.to_numpy())

    predictions = np.array(all_predictions)
    actual = np.array(all_actual)

    print("\n========== REGRESSION RESULTS ==========")
    print(f"Overall MAE: {mean_absolute_error(actual, predictions)*100:.4f}%")
    print(f"Overall RMSE: {np.sqrt(mean_squared_error(actual, predictions))*100:.4f}%")

    print("\n========== SIGNAL TEST ==========")
    for threshold in SIGNAL_THRESHOLDS:
        trades, win, avg, compounded = evaluate_trades(
            predictions, actual, threshold
        )

        print(f"\nPrediction threshold: {threshold*100:.2f}%")
        print(f"Trades: {trades}")
        print(f"Win rate: {win:.2f}%")
        print(f"Average net return/trade: {avg:.3f}%")
        print(f"Compounded return: {compounded:.2f}%")

    print("\n==================================")


if __name__ == "__main__":
    main()