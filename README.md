# HARDGATE

**Gates, not scores.** A single-file trading terminal for crypto perpetual futures and gold, built on one discipline: every setup must pass a ledger of explicit pass/veto gates, and any single veto stands the trade aside. No composite scores, no black boxes -- every gate shows its evidence.

Runs entirely in the browser against free public data. No build step, no backend required (one optional execution endpoint, disabled by default).

## The 16 tabs

| Tab | What it does |
|---|---|
| **BIAS** | Daily direction verdict: 1D structure, 4H cascade, momentum, funding crowding, TSMOM, CUSUM, sentiment |
| **SWING SCAN** | 4H swing setups across the exchange universe: EMA cascade with real spread, HTF side, RSI guard, funding clean, vol/wick commit, structural R:R, CUSUM |
| **SCALP SCAN** | 1H trend + 15m Judas sweep-and-reclaim triggers, RSI band, minutes-to-funding guard, ATR vol-alive, vol-capped targets |
| **COIL WATCHLIST** | Compression stalker: finds stored-energy ranges, then an expansion check on volume spike |
| **APEX (RS)** | Relative-strength scan |
| **LIQUIDITY TRAP** | Trap patterns around swept levels |
| **SMC (FVG)** | Fair Value Gaps: displacement, unmitigated, tap, HTF context |
| **ORDER BLOCKS** | OB detection with mitigation tracking |
| **DIVERGENCE** | RSI divergence scan |
| **GOLD** | XAUUSD session-aware ledgers (swing + kill-zone Judas scalps), with Twelve Data candles |
| **BEST** | Whole-exchange cascade: the hard gates + evidence scoring; emails the top pick when alerts are on |
| **BASIS** | Funding/basis monitor |
| **SEARCH** | Cross-exchange symbol lookup + on-demand Twelve Data swing backtests |
| **LOG** | Auto-logged CLEAN setups, outcomes graded against closed candles |
| **TRADE PLAN** | Fixed-R ticket builder with portfolio-heat check and an optional execution backend |
| **FIND TRADE** | Per-symbol evaluation of all strategies + backtest context |

## Free data sources

| Source | Used for | Key? |
|---|---|---|
| **Delta Exchange India** public API + WebSocket | Primary crypto perp tickers, funding, candles | No |
| **CoinDCX** public API (via CORS proxies) | Secondary crypto perps | No |
| **alternative.me** | Fear & Greed sentiment index | No |
| **CoinGecko** | BTC dominance | No |
| **Twelve Data** | Gold candles + crypto backtest history | Free key (hardcoded in index.html) |

## Run it

Open index.html in a browser, or serve the folder (e.g. GitHub Pages). Everything loads from the folder plus one CDN library (EmailJS).

## Alerts

Toggle the alert chip in the header. While ON, a silent cycle periodically runs a best-setup scan (Delta and CoinDCX) and emails the top CLEAN pick when it changes, deduped by symbol+direction. Emails go through EmailJS (account embedded in index.html). Every alert also lands in the LOG tab.

## Repo layout

Loaded by the app:

```
index.html      the whole app (markup + all app logic inline)
indicators.js   shared indicators (EMA/RSI/ATR/CUSUM/swing)
store.js        lightweight publish/subscribe event store
```

The repo also contains additional standalone module files and a scripts/ helper folder that are not loaded by index.html.

## Disclaimer

Educational tool, not financial advice. Gates replay what already happened and filter what is happening; neither is a promise about what happens next. Backtests exclude funding and volume-z where the data doesn't exist, include no fees/slippage. Any real order routing is your own endpoint, your own keys, your own responsibility.
