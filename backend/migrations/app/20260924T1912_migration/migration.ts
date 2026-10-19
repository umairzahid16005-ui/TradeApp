#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/3023aeda91f5dd64fe96f9e4c8606d892349041d20ac6cbaabc26b8374776ff7/contract';
import endContract from '../../snapshots/3023aeda91f5dd64fe96f9e4c8606d892349041d20ac6cbaabc26b8374776ff7/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f3d31e527c3cb6e7486544865bebc534572779813134bd300973f285a6457be1/contract';
import startContract from '../../snapshots/f3d31e527c3cb6e7486544865bebc534572779813134bd300973f285a6457be1/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'marketCandle',
        columns: [
          col('candleTime', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('close', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('high', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('low', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('open', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('platform', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('symbol', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('timeframe', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('volume', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'marketCandle',
        index: 'marketCandle_candleTime_idx_dc9584cb',
        columns: ['candleTime'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'marketCandle',
        index: 'marketCandle_platform_symbol_timeframe_idx_4d05798e',
        columns: ['platform', 'symbol', 'timeframe'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
