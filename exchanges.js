// exchanges.js \u2014 Delta/CoinDCX ticker & candle fetchers (extracted from index.html, Phase 18)
// Call-time deps stay inline/earlier: DELTA, CDCX_API, CDCX_PUB, cdcxGet, nowSec, fetch.
// Globals: loadTickersDelta, DELTA_RES, candlesDelta, loadTickersCdcx, CDCX_RES, candlesCdcx.

async function loadTickersDelta(){
  const r = await fetch(`${DELTA}/v2/tickers?contract_types=perpetual_futures`);
  const j = await r.json();
  return (j.result||[]).map(t=>({
    symbol: t.symbol,
    mark: parseFloat(t.mark_price ?? t.close),
    fundingPct: t.funding_rate!==undefined && t.funding_rate!==null ? parseFloat(t.funding_rate) : null, // Delta India: percent units per interval. NO *100.
    oiUsd: parseFloat(t.oi_value_usd ?? t.oi_value ?? 0),
    turnoverUsd: parseFloat(t.turnover_usd ?? t.turnover ?? 0),
    chg24: (isFinite(parseFloat(t.close)) && isFinite(parseFloat(t.open))) ? (parseFloat(t.close)/parseFloat(t.open)-1)*100 : null,
  })).filter(t=>isFinite(t.mark));
}
const DELTA_RES = {'15m':'15m','1h':'1h','2h':'2h','4h':'4h','1d':'1d'};
async function candlesDelta(sym, res, count){
  const secPer = {'15m':900,'1h':3600,'2h':7200,'4h':14400,'1d':86400}[res];
  const end = nowSec(), start = end - secPer*(count+3);
  const r = await fetch(`${DELTA}/v2/history/candles?resolution=${DELTA_RES[res]}&symbol=${encodeURIComponent(sym)}&start=${start}&end=${end}`);
  const j = await r.json();
  const rows = (j.result||[]).map(c=>({t:c.time, o:+c.open, h:+c.high, l:+c.low, c:+c.close, v:+c.volume}));
  rows.sort((a,b)=>a.t-b.t);
  return rows;
}

async function loadTickersCdcx(){
  // Active USDT-margined futures instruments; ticker detail endpoints vary \u2014 we
  // rank by what candles give us and mark funding as unavailable rather than faking it.
  const j = await cdcxGet(`${CDCX_API}/exchange/v1/derivatives/futures/data/active_instruments?margin_currency_short_name[]=USDT`);
  const list = Array.isArray(j) ? j : (j.instruments||[]);
  return list.map(s=>({ symbol: typeof s==='string'? s : s.symbol, mark: NaN, fundingPct: null, oiUsd: 0, turnoverUsd: 0, chg24: null }));
}
const CDCX_RES = {'15m':'15','1h':'60','2h':'120','4h':'240','1d':'1D'};
async function candlesCdcx(sym, res, count){
  const secPer = {'15m':900,'1h':3600,'2h':7200,'4h':14400,'1d':86400}[res];
  const to = nowSec(), from = to - secPer*(count+3);
  const j = await cdcxGet(`${CDCX_PUB}/market_data/candlesticks?pair=${encodeURIComponent(sym)}&from=${from}&to=${to}&resolution=${CDCX_RES[res]}&pcode=f`);
  const rows = (j.data||[]).map(c=>({t:Math.floor((c.time??c.t)/1000), o:+c.open, h:+c.high, l:+c.low, c:+c.close, v:+(c.volume??0)}));
  rows.sort((a,b)=>a.t-b.t);
  return rows;
}
