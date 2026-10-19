import sys
import json
import os
from datetime import datetime, timezone, timedelta

import requests
import pandas as pd
import numpy as np

from sklearn.ensemble import (
    RandomForestRegressor,
    RandomForestClassifier
)

import joblib


# =========================================================
# CONFIGURATION
# =========================================================

LIMIT = 5000

# Number of candles needed when using cached model.
# 200 is more than enough for our longest feature window.
FAST_LIMIT = 200

HORIZON = 6

RANDOM_STATE = 42

# Cached model lifetime.
# After this time the model is retrained automatically.
MODEL_CACHE_HOURS = 6

SUPPORTED_SYMBOLS = [
    "BTC",
    "ETH",
    "SOL",
    "BNB",
    "XRP",
    "ADA",
    "DOGE",
    "TRX",
    "LINK",
]

BINANCE_URL = (
    "https://data-api.binance.vision/api/v3/klines"
)

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

MODEL_DIR = os.path.join(
    BASE_DIR,
    "models"
)

os.makedirs(
    MODEL_DIR,
    exist_ok=True
)


# =========================================================
# MODEL CACHE
# =========================================================

def get_model_path(symbol):

    return os.path.join(
        MODEL_DIR,
        f"{symbol.upper()}_model.joblib"
    )


def is_cache_valid(symbol):

    path = get_model_path(symbol)

    if not os.path.exists(path):
        return False

    try:

        modified_time = datetime.fromtimestamp(
            os.path.getmtime(path),
            timezone.utc
        )

        age = (
            datetime.now(timezone.utc)
            - modified_time
        )

        if age >= timedelta(hours=MODEL_CACHE_HOURS):
            return False

        payload = joblib.load(path)
        return payload.get("version") == "rf-binary-v3"

    except Exception:

        return False


def save_model_cache(
    symbol,
    regressor,
    classifier,
    feature_columns,
    training_samples
):

    payload = {

        "regressor": regressor,

        "classifier": classifier,

        "feature_columns":
            feature_columns,

        "trainingSamples":
            training_samples,

        "trainedAt":
            datetime.now(
                timezone.utc
            ).isoformat(),

        "version":
            "rf-binary-v3",

    }

    joblib.dump(
        payload,
        get_model_path(symbol)
    )


def load_model_cache(symbol):

    path = get_model_path(symbol)

    payload = joblib.load(path)

    return (
        payload["regressor"],
        payload["classifier"],
        payload["feature_columns"],
        payload.get(
            "trainingSamples",
            0
        ),
        payload.get(
            "trainedAt",
            None
        )
    )


# =========================================================
# DOWNLOAD HISTORICAL CANDLES
# =========================================================

def get_data(
    symbol,
    limit=LIMIT
):

    pair = f"{symbol}USDT"

    rows = []

    end_time = None

    while len(rows) < limit:

        params = {
            "symbol": pair,
            "interval": "1h",
            "limit": min(
                1000,
                limit - len(rows)
            )
        }

        if end_time is not None:
            params["endTime"] = end_time

        response = requests.get(
            BINANCE_URL,
            params=params,
            timeout=30
        )

        response.raise_for_status()

        batch = response.json()

        if not batch:
            break

        rows = batch + rows

        end_time = (
            batch[0][0] - 1
        )

    if not rows:
        raise ValueError(
            f"No candles returned for {pair}"
        )

    columns = [
        "time",
        "open",
        "high",
        "low",
        "close",
        "volume",
        "close_time",
        "quote_volume",
        "trades",
        "taker_buy_base",
        "taker_buy_quote",
        "ignore"
    ]

    df = pd.DataFrame(
        rows[-limit:],
        columns=columns
    )

    # -----------------------------------------------------
    # NUMERIC CONVERSION
    # -----------------------------------------------------

    for col in [
        "open",
        "high",
        "low",
        "close",
        "volume"
    ]:

        df[col] = pd.to_numeric(
            df[col],
            errors="coerce"
        )

    # -----------------------------------------------------
    # TIME
    # -----------------------------------------------------

    df["time"] = pd.to_datetime(
        df["time"],
        unit="ms",
        utc=True
    )

    df["close_time"] = pd.to_numeric(
        df["close_time"],
        errors="coerce"
    )

    # -----------------------------------------------------
    # ONLY CLOSED CANDLES
    # -----------------------------------------------------

    now_ms = int(
        datetime.now(
            timezone.utc
        ).timestamp() * 1000
    )

    df = df[
        df["close_time"] < now_ms
    ]

    # -----------------------------------------------------
    # CLEAN
    # -----------------------------------------------------

    df = df.dropna(
        subset=[
            "open",
            "high",
            "low",
            "close",
            "volume"
        ]
    )

    df = df.drop_duplicates(
        subset=["time"]
    )

    df = df.sort_values(
        "time"
    ).reset_index(
        drop=True
    )

    minimum_required = (
        1000
        if limit >= LIMIT
        else 120
    )

    if len(df) < minimum_required:
        raise ValueError(
            "Not enough historical candles"
        )

    return df


# =========================================================
# FEATURE ENGINEERING
# =========================================================

def make_features(df):

    df = df.copy()

    close = df["close"]

    high = df["high"]

    low = df["low"]

    op = df["open"]

    volume = df["volume"]

    X = pd.DataFrame(
        index=df.index
    )

    # -----------------------------------------------------
    # RETURNS
    # -----------------------------------------------------

    for n in [
        1,
        3,
        6,
        12,
        24,
        48
    ]:

        X[f"return_{n}"] = (
            close.pct_change(n)
            * 100
        )

    # -----------------------------------------------------
    # VOLATILITY
    # -----------------------------------------------------

    hourly_return = (
        close.pct_change()
        * 100
    )

    for n in [
        6,
        12,
        24,
        48
    ]:

        X[f"volatility_{n}"] = (
            hourly_return
            .rolling(n)
            .std()
        )

    # -----------------------------------------------------
    # MOVING AVERAGES
    # -----------------------------------------------------

    for n in [
        5,
        12,
        24,
        48,
        72,
        100
    ]:

        ma = close.rolling(n).mean()

        X[f"ma_{n}"] = (
            close / ma - 1
        ) * 100

    # -----------------------------------------------------
    # EMA
    # -----------------------------------------------------

    for n in [
        9,
        21,
        50,
        100
    ]:

        ema = close.ewm(
            span=n,
            adjust=False
        ).mean()

        X[f"ema_{n}"] = (
            close / ema - 1
        ) * 100

    # -----------------------------------------------------
    # VOLUME
    # -----------------------------------------------------

    X["volume_change"] = (
        volume.pct_change()
        * 100
    )

    volume_ma = (
        volume
        .rolling(24)
        .mean()
    )

    X["volume_ma_ratio"] = (
        volume / volume_ma
    )

    # -----------------------------------------------------
    # CANDLE STRUCTURE
    # -----------------------------------------------------

    X["range"] = (
        (high - low)
        / close
    ) * 100

    X["body"] = (
        (close - op)
        / op
    ) * 100

    candle_top = np.maximum(
        op,
        close
    )

    candle_bottom = np.minimum(
        op,
        close
    )

    X["upper_wick"] = (
        (high - candle_top)
        / close
    ) * 100

    X["lower_wick"] = (
        (candle_bottom - low)
        / close
    ) * 100

    # -----------------------------------------------------
    # RSI
    # -----------------------------------------------------

    delta = close.diff()

    gain = delta.clip(
        lower=0
    )

    loss = -delta.clip(
        upper=0
    )

    avg_gain = (
        gain
        .rolling(14)
        .mean()
    )

    avg_loss = (
        loss
        .rolling(14)
        .mean()
    )

    rs = (
        avg_gain /
        avg_loss.replace(
            0,
            np.nan
        )
    )

    X["rsi"] = (
        100 -
        (
            100 /
            (1 + rs)
        )
    )

    # -----------------------------------------------------
    # MACD
    # -----------------------------------------------------

    ema12 = close.ewm(
        span=12,
        adjust=False
    ).mean()

    ema26 = close.ewm(
        span=26,
        adjust=False
    ).mean()

    X["macd"] = (
        (ema12 - ema26)
        / close
    ) * 100

    # -----------------------------------------------------
    # ATR
    # -----------------------------------------------------

    previous_close = (
        close.shift(1)
    )

    tr = pd.concat(
        [
            high - low,

            (
                high -
                previous_close
            ).abs(),

            (
                low -
                previous_close
            ).abs(),
        ],
        axis=1
    ).max(
        axis=1
    )

    X["atr_pct"] = (
        tr
        .rolling(14)
        .mean()
        / close
    ) * 100

    # -----------------------------------------------------
    # TREND
    # -----------------------------------------------------

    X["regime_return"] = (
        close.pct_change(24)
        * 100
    )

    X["trend_strength"] = (
        X["ma_48"]
        -
        X["ma_24"]
    )

    # -----------------------------------------------------
    # FUTURE RETURN
    # -----------------------------------------------------

    future_return = (
        close.shift(-HORIZON)
        / close
        - 1
    ) * 100

    X = X.replace(
        [np.inf, -np.inf],
        np.nan
    )

    valid = X.notna().all(
        axis=1
    )

    return (
        X,
        future_return,
        valid
    )


# =========================================================
# TRAIN MODELS
# =========================================================

def train_models(
    X,
    future_return,
    valid
):

    train_mask = (
        valid
        &
        future_return.notna()
    )

    train_X = X.loc[
        train_mask
    ]

    train_y = future_return.loc[
        train_mask
    ]

    if len(train_X) < 500:

        raise ValueError(
            "Not enough historical training samples"
        )

    # -----------------------------------------------------
    # REGRESSION
    # -----------------------------------------------------

    regressor = RandomForestRegressor(
        n_estimators=300,
        max_depth=8,
        min_samples_leaf=5,
        max_features=0.7,
        random_state=RANDOM_STATE,
        n_jobs=-1
    )

    regressor.fit(
        train_X,
        train_y
    )

    # -----------------------------------------------------
    # BINARY CLASSIFIER
    # -----------------------------------------------------

    direction_labels = (
        train_y > 0
    ).astype(int)

    classifier = RandomForestClassifier(
        n_estimators=300,
        max_depth=8,
        min_samples_leaf=8,
        max_features=0.7,
        class_weight="balanced_subsample",
        random_state=RANDOM_STATE,
        n_jobs=-1
    )

    classifier.fit(
        train_X,
        direction_labels
    )

    return (
        regressor,
        classifier,
        train_X
    )


# =========================================================
# LOAD OR TRAIN MODEL
# =========================================================

def get_models(
    symbol,
    X,
    future_return,
    valid
):

    # -----------------------------------------------------
    # USE CACHE
    # -----------------------------------------------------

    if is_cache_valid(symbol):

        try:

            (
                regressor,
                classifier,
                feature_columns,
                training_samples,
                trained_at
            ) = load_model_cache(
                symbol
            )

            # Ensure current features have
            # exactly the same columns.
            if list(X.columns) == list(
                feature_columns
            ):

                return (
                    regressor,
                    classifier,
                    training_samples,
                    True,
                    trained_at
                )

        except Exception:

            # Corrupt/old cache.
            # Automatically retrain.
            pass

    # -----------------------------------------------------
    # TRAIN NEW MODEL
    # -----------------------------------------------------

    (
        regressor,
        classifier,
        train_X
    ) = train_models(
        X,
        future_return,
        valid
    )

    save_model_cache(
        symbol,
        regressor,
        classifier,
        list(train_X.columns),
        len(train_X)
    )

    return (
        regressor,
        classifier,
        len(train_X),
        False,
        datetime.now(
            timezone.utc
        ).isoformat()
    )


# =========================================================
# GENERATE PREDICTION
# =========================================================

def generate_prediction(symbol):

    # -----------------------------------------------------
    # CHECK CACHE FIRST
    # -----------------------------------------------------

    cache_available = (
        is_cache_valid(symbol)
    )

    # -----------------------------------------------------
    # FIRST RUN
    # 5000 candles required for training.
    #
    # CACHED RUN
    # Only 200 recent candles required.
    # -----------------------------------------------------

    if cache_available:

        df = get_data(
            symbol,
            FAST_LIMIT
        )

    else:

        df = get_data(
            symbol,
            LIMIT
        )

    # -----------------------------------------------------
    # FEATURES
    # -----------------------------------------------------

    (
        X,
        future_return,
        valid
    ) = make_features(df)

    # -----------------------------------------------------
    # LOAD OR TRAIN
    # -----------------------------------------------------

    (
        regressor,
        classifier,
        training_samples,
        used_cache,
        trained_at
    ) = get_models(
        symbol,
        X,
        future_return,
        valid
    )

    # -----------------------------------------------------
    # LATEST CLOSED CANDLE
    # -----------------------------------------------------

    latest_index = X.index[-1]

    if not valid.iloc[-1]:

        raise ValueError(
            "Latest candle features are incomplete"
        )

    latest_X = X.loc[
        [latest_index]
    ]

    # -----------------------------------------------------
    # REGRESSION
    # -----------------------------------------------------

    regression_prediction = float(
        regressor.predict(
            latest_X
        )[0]
    )

    # -----------------------------------------------------
    # CLASSIFIER
    # -----------------------------------------------------

    probabilities = (
        classifier
        .predict_proba(
            latest_X
        )[0]
    )

    classes = (
        classifier.classes_
    )

    probability_map = {

        int(cls): float(prob)

        for cls, prob in zip(
            classes,
            probabilities
        )
    }

    down_probability = (
        probability_map.get(
            0,
            0.0
        )
    )

    up_probability = (
        probability_map.get(
            1,
            0.0
        )
    )

    # -----------------------------------------------------
    # CURRENT PRICE
    # -----------------------------------------------------

    current_price = float(
        df.iloc[-1]["close"]
    )

    # -----------------------------------------------------
    # ATR
    # -----------------------------------------------------

    atr_pct = float(
        X.iloc[-1]["atr_pct"]
    )

    # -----------------------------------------------------
    # SIGNAL THRESHOLD
    #
    # Minimum 0.10%
    # Maximum 0.60%
    # ATR multiplier 0.30
    # -----------------------------------------------------

    signal_threshold = max(
        0.30,
        min(
            0.80,
            atr_pct * 0.35
        )
    )

    # -----------------------------------------------------
    # SIGNAL
    # -----------------------------------------------------

    signal = "HOLD"

    regression_up = (
        regression_prediction > 0
    )

    regression_down = (
        regression_prediction < 0
    )

    # BUY
    if (
        regression_up
        and up_probability >= 0.60
        and regression_prediction >= signal_threshold
    ):

        signal = "BUY"

    # SELL
    elif (
        regression_down
        and down_probability >= 0.60
        and regression_prediction <= -signal_threshold
    ):

        signal = "SELL"

    # -----------------------------------------------------
    # PREDICTED PRICE
    # -----------------------------------------------------

    predicted_price = (
        current_price
        *
        (
            1 +
            regression_prediction / 100
        )
    )

    # -----------------------------------------------------
    # MODEL UNCERTAINTY
    # -----------------------------------------------------

    latest_array = (
        latest_X.to_numpy()
    )

    tree_predictions = np.array([

        tree.predict(
            latest_array
        )[0]

        for tree
        in regressor.estimators_

    ])

    model_uncertainty_pct = float(
        np.std(
            tree_predictions
        )
    )

    # -----------------------------------------------------
    # CONFIDENCE
    # -----------------------------------------------------

    directional_edge = abs(
        up_probability
        -
        down_probability
    )

    confidence = min(
        100.0,
        directional_edge * 100.0
    )

    confidence = min(
        100.0,
        confidence
    )

    if signal == "HOLD":

        confidence = min(
            confidence,
            40.0
        )

    # -----------------------------------------------------
    # RISK
    # -----------------------------------------------------

    if atr_pct < 0.50:

        risk_level = "LOW"

    elif atr_pct < 1.00:

        risk_level = "MEDIUM"

    else:

        risk_level = "HIGH"

    # -----------------------------------------------------
    # RETURN
    # -----------------------------------------------------

    return {

        "symbol":
            symbol,

        "currentPrice":
            round(
                current_price,
                8
            ),

        "predictedPrice":
            round(
                predicted_price,
                8
            ),

        "predictedChangePct":
            round(
                regression_prediction,
                6
            ),

        "signal":
            signal,

        "horizonHours":
            HORIZON,

        "model":
            "RandomForestRegressor+BinaryClassifier",

        "modelUncertaintyPct":
            round(
                model_uncertainty_pct,
                6
            ),

        "confidence":
            round(
                confidence,
                2
            ),

        "confidenceType":
            "model_score_not_calibrated_probability",

        "warning":
            "Experimental forecast only; not a guarantee of future price or profit.",

        "riskLevel":
            risk_level,

        "directionProbabilityUp":
            round(
                up_probability * 100,
                2
            ),

        "directionProbabilityDown":
            round(
                down_probability * 100,
                2
            ),

        "directionProbabilityHold":
            0,

        "atrPct":
            round(
                atr_pct,
                6
            ),

        "signalThresholdPct":
            round(
                signal_threshold,
                4
            ),

        "candlesUsed":
            len(df),

        "trainingSamples":
            training_samples,

        "modelCacheUsed":
            used_cache,

        "modelTrainedAt":
            trained_at,

        "generatedAt":
            datetime.now(
                timezone.utc
            ).isoformat()
    }


# =========================================================
# MAIN
# =========================================================

def main():

    try:

        if len(sys.argv) < 2:

            raise ValueError(
                "Symbol argument is required"
            )

        symbol = (
            sys.argv[1]
            .upper()
        )

        if symbol not in SUPPORTED_SYMBOLS:

            raise ValueError(
                f"Unsupported symbol: {symbol}"
            )

        result = generate_prediction(
            symbol
        )

        # Node.js expects ONLY JSON
        print(
            json.dumps(
                result
            )
        )

    except Exception as error:

        print(
            json.dumps({
                "error":
                    str(error)
            })
        )


if __name__ == "__main__":

    main()
