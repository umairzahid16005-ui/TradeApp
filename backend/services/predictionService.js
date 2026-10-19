import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SUPPORTED_SYMBOLS = [
  'BTC',
  'ETH',
  'SOL',
  'BNB',
  'XRP',
  'ADA',
  'DOGE',
  'TRX',
  'LINK',
];

/*
 * Only one Python process is created for each unique symbol.
 *
 * Python itself now caches the trained ML model.
 * Therefore:
 *
 * First prediction:
 *   Download 5000 candles
 *   Train model
 *   Save model cache
 *
 * Later predictions:
 *   Load cached model
 *   Download only recent candles
 *   Generate prediction
 */

export function generatePrediction(marketData = []) {
  if (!Array.isArray(marketData)) {
    return Promise.reject(
      new Error('Market data must be an array'),
    );
  }

  // -------------------------------------------------------
  // GROUP DUPLICATE MARKETPLACE RECORDS BY SYMBOL
  // -------------------------------------------------------

  const symbolMap = new Map();

  for (const item of marketData) {
    const symbol = String(
      item.symbol || '',
    ).toUpperCase();

    if (!SUPPORTED_SYMBOLS.includes(symbol)) {
      continue;
    }

    if (!symbolMap.has(symbol)) {
      symbolMap.set(symbol, {
        ...item,
        platformCount: 1,
      });
    } else {
      const existing = symbolMap.get(symbol);

      existing.platformCount += 1;

      symbolMap.set(
        symbol,
        existing,
      );
    }
  }

  const uniqueMarketData =
    Array.from(symbolMap.values());

  console.log(
    'Unique prediction symbols:',
    uniqueMarketData.map(
      item => item.symbol,
    ),
  );

  // -------------------------------------------------------
  // RUN ONE PYTHON PROCESS PER UNIQUE SYMBOL
  // -------------------------------------------------------

  return Promise.all(
    uniqueMarketData.map(item => {
      const symbol = String(
        item.symbol || '',
      ).toUpperCase();

      return new Promise(
        (resolve, reject) => {
          const scriptPath = path.join(
            __dirname,
            '..',
            'ml',
            'predict.py',
          );

          console.log(
            `Starting Python prediction for ${symbol}`,
          );

          console.log(
            `Python script: ${scriptPath}`,
          );

          console.log(
            `Platforms compared for ${symbol}: ${item.platformCount}`,
          );

          const python = spawn(
            'py',
            [
              '-3.12',
              scriptPath,
              symbol,
            ],
            {
              cwd: path.join(
                __dirname,
                '..',
              ),
              windowsHide: true,
            },
          );

          let output = '';
          let errorOutput = '';

          // ------------------------------------------------
          // STDOUT
          // ------------------------------------------------

          python.stdout.on(
            'data',
            data => {
              output += data.toString();
            },
          );

          // ------------------------------------------------
          // STDERR
          // ------------------------------------------------

          python.stderr.on(
            'data',
            data => {
              errorOutput += data.toString();
            },
          );

          // ------------------------------------------------
          // PROCESS ERROR
          // ------------------------------------------------

          python.on(
            'error',
            error => {
              console.error(
                `Python process error for ${symbol}:`,
                error,
              );

              reject(error);
            },
          );

          // ------------------------------------------------
          // PROCESS FINISHED
          // ------------------------------------------------

          python.on(
            'close',
            code => {
              console.log(
                `Python process finished for ${symbol}. Exit code: ${code}`,
              );

              if (code !== 0) {
                console.error(
                  `Python stderr for ${symbol}:`,
                  errorOutput,
                );

                return reject(
                  new Error(
                    errorOutput ||
                      `Python exited with code ${code}`,
                  ),
                );
              }

              const cleanOutput =
                output.trim();

              if (!cleanOutput) {
                return reject(
                  new Error(
                    `Python returned empty output for ${symbol}`,
                  ),
                );
              }

              try {
                const result =
                  JSON.parse(cleanOutput);

                if (result.error) {
                  return reject(
                    new Error(
                      result.error,
                    ),
                  );
                }

                resolve({
                  ...result,

                  symbol:
                    result.symbol ||
                    symbol,

                  change24h: Number(
                    item.change24h || 0,
                  ),

                  platformsCompared:
                    item.platformCount || 1,
                });
              } catch (error) {
                console.error(
                  `Invalid Python JSON for ${symbol}:`,
                  cleanOutput,
                );

                reject(
                  new Error(
                    `Invalid Python response: ${cleanOutput}`,
                  ),
                );
              }
            },
          );
        },
      );
    }),
  );
}