# HARDGATE

**Gates, not scores.** A single-file trading terminal for crypto perpetual futures and gold, built on one discipline: every setup must pass a ledger of explicit pass/veto gates, and any single veto stands the trade aside. No composite scores, no black boxes -- every gate shows its evidence.

Runs entirely in the browser against free public data. No build step, no backend required (one optional execution endpoint, disabled by default).

## The 17 tabs

| Tab | What it does |
|---|---|
| **BIAS** | Daily direction verdict: 1D structure, 4H cascade, momentum, funding crowding, TSMOM, CUSUM, sentiment + a Binance cross-exchange confirm row (informational only) |
| **SWING SCAN** | 4H swing setups across the exchange universe: EMA cascade with real spread, HTF side, RSI guard, funding clean, vol/wick commit, structural R:R >= 2, CUSUM |
| **SCALP SCAN** | 1H trend + 15m Judas sweep-and-reclaim triggers, RSI band, >=25 min to funding settlement, ATR vol-alive, 1.5R vol-capped targets |
| **COIL WATCHLIST** | Compression stalker: finds stored-energy ranges, then an expansion check on volume spike |
| **APEX (RS)** | Relative-strength scan |
| **LIQUIDITY TRAP** | Trap patterns around swept levels |
| **SMC (FVG)** | Fair Value Gaps: displacement, unmitigated, tap, HTF context |
| **ORDER BLOCKS** | OB detection with mitigation tracking |
| **DIVERGENCE** | RSI divergence scan |
| **GOLD** | XAUUSD session-aware ledgers (swing GS1-GS7 + kill-zone Judas scalps), auto macro panel (DXY, 10Y, real-rate hint), 37-gate deep scan, Twelve Data key override |
| **SMART $** | Binance positioning scanner: price/OI regime, funding crowding, retail contrarian, top-vs-retail divergence, taker imbalance -- evidence cards, >=2 reads to list |
| **BEST** | Whole-exchange cascade: the seven hard gates + evidence scoring; emails the top pick when alerts are on |
| **BASIS** | Funding/basis monitor (Delta + Binance 8h funding side by side) |
| **SEARCH** | Cross-exchange symbol lookup + on-demand Twelve Data swing backtests |
| **LOG** | Auto-logged CLEAN setups, outcomes graded against closed candles (conservative same-bar = SL rule) |
| **TRADE PLAN** | Fixed-R ticket builder with portfolio-heat check and an optional execution backend |
| **FIND TRADE** | Per-symbol evaluation of all strategies + full backtest context |

## Free data sources

| Source | Used for | Key? |
|---|---|---|
| **Delta Exchange India** public API + WebSocket | Primary crypto perp tickers, funding, candles | No |
| **CoinDCX** public API (via CORS proxies) | Secondary crypto perps (no funding/turnover fields -- gates degrade honestly) | No |
| **Binance USD-M futures fapi** | SMART $ positioning (funding, OI history, retail/top-trader ratios, taker flow), PAXG gold candles, B1 cross-exchange confirm | No |
| **Frankfurter (ECB reference rates)** | DXY proxy computed from 6 currency pairs | No |
| **alternative.me** | Fear & Greed sentiment index | No |
| **CoinGecko** | BTC dominance | No |
| **Twelve Data** | Crypto backtest history + gold candle fallback | Free key -- built-in, overridable in the GOLD tab (stored in localStorage as hg_td_key) |
| **Yahoo Finance via proxy** | Gold GC=F fallback, 10Y yield, silver | Best-effort, nullable legs degrade to "--" |

Gold candles follow the fallback chain **Binance PAXG -> Twelve Data -> Yahoo GC=F**; the active source is shown on the GOLD tab's DATA chip and in backtest footers.

## Run it

Open index.html in a browser, or serve the folder (e.g. GitHub Pages). Everything loads from the folder plus one CDN library (EmailJS).

## Alerts

Toggle the bell chip in the header. While ON, every 15 minutes a silent cycle runs:

1. **Delta** and **CoinDCX**: full best-setup scan -- emails the top CLEAN pick when it changes (deduped by symbol+direction).
2. 2. **Gold**: silent swing-gate read -- emails only on a fresh STRONG verdict (all GS gates clean with a full plan), deduped the same way.
  
   3. Emails go through EmailJS (account embedded in index.html). Every alert also lands in the LOG tab.
  
   4. ## Tests
  
   5. ```
      node tests/extract-inline.mjs     # inline script blocks parse + key markers present
      node tests/test-data-layer.mjs    # live-network smoke: binance.js, macro.js, DXY, PAXG
      node tests/test-gold-deep.mjs     # 37-gate gold deep scan, macro-null degradation, quick ledgers
      node tests/test-smart.mjs         # SMART $ classifier, symbol mapping, B1 confirm, scan end-to-end
      node tests/test-backtest-ux.mjs   # chunked backtests: identical results, progress, cooperative cancel
      ```

      ## Repo layout

      ```
      index.html      the whole app (markup + all app logic inline)
      indicators.js   shared indicators (EMA/RSI/ATR/CUSUM/swing/vol-profile...)
      store.js        tiny localStorage helpers
      binance.js      Binance fapi data layer + token bucket
      macro.js        gold candle fallback chain + gold macro (DXY/10Y/silver) + DXY-from-rates
      alert-state.json
      scripts/        alert-check helper
      tests/          node test suites above
      archive/        dead source modules kept for reference only -- never loaded by index.html
      ```

      ## Disclaimer

      Educational tool, not financial advice. Gates replay what already happened and filter what is happening; neither is a promise about what happens next. Backtests exclude funding and volume-z where the data doesn't exist, include no fees/slippage, and the app says so wherever it shows them. Any real order routing is your own endpoint, your own keys, your own responsibility.
      
