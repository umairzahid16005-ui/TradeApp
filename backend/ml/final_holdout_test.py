
import json
import time
import numpy as np
import pandas as pd

from pathlib import Path
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

BASE_DIR = Path(__file__).resolve().parent
CSV_PATH = BASE_DIR / "btc_5000_candles.csv"

HORIZON = 6
HOLDOUT_RATIO = 0.20

df = pd.read_csv(CSV_PATH)
df.columns = [c.lower().strip() for c in df.columns]

# Handle timestamps stored as text or milliseconds
if "open_time" in df.columns:
    timestamp_col = "open_time"
elif "timestamp" in df.columns:
    timestamp_col = "timestamp"
else:
    timestamp_col = None

if timestamp_col:
    if pd.api.types.is_numeric_dtype(df[timestamp_col]):
        df["timestamp"] = pd.to_datetime(
            df[timestamp_col], unit="ms", errors="coerce"
        )
    else:
        df["timestamp"] = pd.to_datetime(
            df[timestamp_col], errors="coerce"
        )

required = ["open", "high", "low", "close", "volume"]
missing = [col for col in required if col not in df.columns]
if missing:
    raise ValueError(f"Missing CSV columns: {missing}")

for col in required:
    df[col] = pd.to_numeric(df[col], errors="coerce")

close = df["close"]
high = df["high"]
low = df["low"]
volume = df["volume"]
open_price = df["open"]

features = pd.DataFrame(index=df.index)

for n in [1, 3, 6, 12, 24]:
    features[f"return_{n}"] = close.pct_change(n)

returns = close.pct_change()

for n in [6, 12, 24]:
    features[f"volatility_{n}"] = returns.rolling(n).std()

for n in [5, 12, 24, 48]:
    features[f"ma_ratio_{n}"] = close / close.rolling(n).mean() - 1

features["volume_change"] = volume.pct_change()
features["range"] = (high - low) / close
features["body"] = (close - open_price) / close

features["upper_wick"] = (
    high - pd.concat([open_price, close], axis=1).max(axis=1)
) / close

features["lower_wick"] = (
    pd.concat([open_price, close], axis=1).min(axis=1) - low
) / close

delta = close.diff()
gain = delta.clip(lower=0).rolling(14).mean()
loss = -delta.clip(upper=0).rolling(14).mean()
rs = gain / loss.replace(0, np.nan)

features["rsi"] = 100 - (100 / (1 + rs))

ema12 = close.ewm(span=12, adjust=False).mean()
ema26 = close.ewm(span=26, adjust=False).mean()
macd = ema12 - ema26

features["macd"] = macd / close
features["ema9"] = close / close.ewm(span=9, adjust=False).mean() - 1
features["ema21"] = close / close.ewm(span=21, adjust=False).mean() - 1
features["ema50"] = close / close.ewm(span=50, adjust=False).mean() - 1

tr = pd.concat([
    high - low,
    (high - close.shift()).abs(),
    (low - close.shift()).abs()
], axis=1).max(axis=1)

features["atr_pct"] = tr.rolling(14).mean() / close

target = close.shift(-HORIZON) / close - 1

data = features.replace([np.inf, -np.inf], np.nan).copy()
data["target"] = target
data = data.dropna()

X = data.drop(columns=["target"])
y = data["target"]

split = int(len(data) * (1 - HOLDOUT_RATIO))

# Leave a 6-row gap before the untouched holdout period
train_end = split - HORIZON

X_train = X.iloc[:train_end]
y_train = y.iloc[:train_end]
X_test = X.iloc[split:]
y_test = y.iloc[split:]

if len(X_train) == 0 or len(X_test) == 0:
    raise ValueError("Not enough data for holdout test.")

model = RandomForestRegressor(
    n_estimators=200,
    max_depth=6,
    min_samples_leaf=10,
    max_features=0.7,
    random_state=42,
    n_jobs=-1
)

start = time.time()
model.fit(X_train, y_train)
train_seconds = time.time() - start

start = time.time()
pred = model.predict(X_test)
predict_seconds = time.time() - start

mae = mean_absolute_error(y_test, pred) * 100
rmse = np.sqrt(mean_squared_error(y_test, pred)) * 100

direction_accuracy = (
    np.mean(np.sign(pred) == np.sign(y_test.to_numpy())) * 100
)

results = {
    "model": "RandomForestRegressor",
    "parameters": {
        "n_estimators": 200,
        "max_depth": 6,
        "min_samples_leaf": 10,
        "max_features": 0.7
    },
    "trainingSamples": int(len(X_train)),
    "testSamples": int(len(X_test)),
    "holdoutPeriod": "Latest 20% of usable data",
    "maePct": round(mae, 6),
    "rmsePct": round(rmse, 6),
    "directionAccuracyPct": round(direction_accuracy, 2),
    "trainingSeconds": round(train_seconds, 3),
    "predictionSeconds": round(predict_seconds, 3)
}

print(json.dumps(results, indent=2))

(BASE_DIR / "rf_final_holdout_results.json").write_text(
    json.dumps(results, indent=2)
)