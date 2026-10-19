
import sys
import json
import warnings

import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier

from predict import (
    SUPPORTED_SYMBOLS,
    get_data,
    make_features,
)

warnings.filterwarnings("ignore")

# Assumptions for a simple simulated strategy.
# Adjust these to match the intended real exchange and order type.
FEE_PER_SIDE_PCT = 0.10
SLIPPAGE_PER_SIDE_PCT = 0.05
MIN_DIRECTION_PROBABILITY = 0.55


def backtest_symbol(symbol):
    df = get_data(symbol, limit=5000)
    X, future_return, valid = make_features(df)

    mask = valid & future_return.notna()
    X = X.loc[mask]
    y = future_return.loc[mask]

    if len(X) < 1000:
        raise ValueError(f"Not enough usable samples: {len(X)}")

    # Chronological holdout. The model never trains on test rows.
    split = int(len(X) * 0.80)
    X_train, X_test = X.iloc[:split], X.iloc[split:]
    y_train, y_test = y.iloc[:split], y.iloc[split:]

    regressor = RandomForestRegressor(
        n_estimators=300,
        max_depth=8,
        min_samples_leaf=5,
        max_features=0.7,
        random_state=42,
        n_jobs=-1,
    )

    classifier = RandomForestClassifier(
        n_estimators=300,
        max_depth=8,
        min_samples_leaf=8,
        max_features=0.7,
        class_weight="balanced_subsample",
        random_state=42,
        n_jobs=-1,
    )

    regressor.fit(X_train, y_train)
    classifier.fit(X_train, (y_train > 0).astype(int))

    predicted_return = regressor.predict(X_test)
    probabilities = classifier.predict_proba(X_test)
    classes = classifier.classes_

    probability_up = np.zeros(len(X_test))
    for index, cls in enumerate(classes):
        if int(cls) == 1:
            probability_up = probabilities[:, index]

    probability_down = 1 - probability_up
    actual_return = y_test.to_numpy()

    # Same signal rule for every supported coin.
    signals = np.full(len(X_test), "HOLD", dtype=object)
    signals[
        (predicted_return > 0)
        & (probability_up >= MIN_DIRECTION_PROBABILITY)
    ] = "BUY"
    signals[
        (predicted_return < 0)
        & (probability_down >= MIN_DIRECTION_PROBABILITY)
    ] = "SELL"

    actual_direction = (actual_return > 0).astype(int)
    predicted_direction = (predicted_return > 0).astype(int)

    directional_accuracy = float(
        np.mean(predicted_direction == actual_direction) * 100
    )

    baseline_direction = int((y_train > 0).mean() >= 0.5)
    baseline_accuracy = float(
        np.mean(actual_direction == baseline_direction) * 100
    )

    mae = float(np.mean(np.abs(predicted_return - actual_return)))

    buy_mask = signals == "BUY"
    sell_mask = signals == "SELL"
    active_mask = buy_mask | sell_mask
    hold_mask = signals == "HOLD"

    def signal_accuracy(signal_mask, is_buy):
        if not np.any(signal_mask):
            return None
        if is_buy:
            correct = actual_return[signal_mask] > 0
        else:
            correct = actual_return[signal_mask] < 0
        return round(float(np.mean(correct) * 100), 2)

    # Simple directional simulation on the model's 6-hour forecast.
    # This is a diagnostic estimate, not a real execution backtest.
    positions = np.zeros(len(X_test))
    positions[buy_mask] = 1
    positions[sell_mask] = -1

    gross_returns = positions * actual_return
    round_trip_cost_pct = 2 * (
        FEE_PER_SIDE_PCT + SLIPPAGE_PER_SIDE_PCT
    )
    net_returns = np.where(
        active_mask,
        gross_returns - round_trip_cost_pct,
        0.0,
    )

    active_count = int(np.sum(active_mask))

    return {
        "symbol": symbol,
        "trainSamples": int(len(X_train)),
        "testSamples": int(len(X_test)),
        "directionalAccuracyPct": round(directional_accuracy, 2),
        "majorityBaselineAccuracyPct": round(baseline_accuracy, 2),
        "returnMAEPercentagePoints": round(mae, 4),
        "buySignals": int(np.sum(buy_mask)),
        "sellSignals": int(np.sum(sell_mask)),
        "holdSignals": int(np.sum(hold_mask)),
        "buyDirectionalAccuracyPct": signal_accuracy(buy_mask, True),
        "sellDirectionalAccuracyPct": signal_accuracy(sell_mask, False),
        "signalCoveragePct": round(
            float(np.mean(active_mask) * 100), 2
        ),
        "assumedRoundTripCostPct": round(round_trip_cost_pct, 4),
        "meanNetReturnPerTestPeriodPct": round(
            float(np.mean(net_returns)), 4
        ),
        "totalNetReturnPct": round(
            float(np.sum(net_returns)), 4
        ),
        "profitableSignalRatePct": (
            round(float(np.mean(net_returns[active_mask] > 0) * 100), 2)
            if active_count else None
        ),
        "warning": (
            "Single chronological holdout; overlapping 6-hour forecasts, "
            "simplified costs, no order-book execution, and no walk-forward "
            "retraining. Not proof of live profitability."
        ),
    }


def main():
    results = []

    for symbol in SUPPORTED_SYMBOLS:
        print(f"Testing {symbol}...", file=sys.stderr)
        try:
            results.append(backtest_symbol(symbol))
        except Exception as error:
            results.append({
                "symbol": symbol,
                "error": str(error),
            })

    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
