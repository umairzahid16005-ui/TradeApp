
import json
import time
import urllib.parse
import urllib.request
import pandas as pd

SYMBOL = "BTCUSDT"
INTERVAL = "1h"
TOTAL_CANDLES = 5000
BATCH_SIZE = 1000
INTERVAL_MS = 60 * 60 * 1000

def fetch_batch(end_time=None):
    url = "https://data-api.binance.vision/api/v3/klines"
    params = {
        "symbol": SYMBOL,
        "interval": INTERVAL,
        "limit": BATCH_SIZE
    }

    if end_time is not None:
        params["endTime"] = end_time

    full_url = url + "?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(
        full_url,
        headers={"User-Agent": "Mozilla/5.0"}
    )

    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def main():
    all_rows = []
    end_time = None

    while len(all_rows) < TOTAL_CANDLES:
        batch = fetch_batch(end_time)

        if not batch:
            print("API returned no more candles.")
            break

        all_rows = batch + all_rows
        print(f"Downloaded: {len(all_rows)}")

        first_open_time = int(batch[0][0])
        end_time = first_open_time - 1

        if len(batch) < BATCH_SIZE:
            print("Received a partial batch.")
            break

        time.sleep(0.3)

    columns = [
        "open_time", "open", "high", "low", "close", "volume",
        "close_time", "quote_volume", "trades",
        "taker_buy_base", "taker_buy_quote", "ignore"
    ]

    df = pd.DataFrame(all_rows, columns=columns)
    df = df.drop_duplicates(subset=["open_time"])
    df = df.sort_values("open_time").reset_index(drop=True)

    if df.empty:
        raise RuntimeError("No candle data downloaded.")

    df = df.tail(TOTAL_CANDLES).copy()
    df["open_time"] = pd.to_datetime(df["open_time"], unit="ms")

    for col in ["open", "high", "low", "close", "volume"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df.to_csv("btc_5000_candles.csv", index=False)

    print("\nDownload complete.")
    print(f"Unique candles: {len(df)}")
    print(f"First candle: {df['open_time'].iloc[0]}")
    print(f"Last candle:  {df['open_time'].iloc[-1]}")
    print("Saved: btc_5000_candles.csv")

    if len(df) < TOTAL_CANDLES:
        print("WARNING: Fewer than 5000 candles downloaded.")


if __name__ == "__main__":
    main()