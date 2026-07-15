/* =========================================================================
HARDGATE \u2014 indicators.js
Pure math / indicator functions extracted from index.html. No DOM, no fetch.
Loaded as a plain global script before the main inline <script> so every
function below remains available as a global, exactly as before this split.
========================================================================= */
'use strict';

function ema(vals, p){
const out = new Array(vals.length).fill(NaN);
if (vals.length < p) return out;
const k = 2/(p+1);
let sum = 0;
for (let i=0;i<p;i++) sum += vals[i];
let e = sum/p;
out[p-1] = e;
for (let i=p;i<vals.length;i++){
e = vals[i]*k + e*(1-k);
out[i] = e;
}
return out;
}
function rsi(vals, p=14){
const out = new Array(vals.length).fill(NaN);
let g=0,l=0;
for (let i=1;i<vals.length;i++){
const d = vals[i]-vals[i-1];
if (i<=p){ g += Math.max(d,0); l += Math.max(-d,0); if(i===p){ out[i]=100-100/(1+(g/p)/((l/p)||1e-12)); g/=p; l/=p; } }
else { g = (g*(p-1)+Math.max(d,0))/p; l = (l*(p-1)+Math.max(-d,0))/p; out[i]=100-100/(1+g/(l||1e-12)); }
}
return out;
}
function atr(rows, p=14){
const out = new Array(rows.length).fill(NaN); let a=null;
for (let i=1;i<rows.length;i++){
const tr = Math.max(rows[i].h-rows[i].l, Math.abs(rows[i].h-rows[i-1].c), Math.abs(rows[i].l-rows[i-1].c));
if (a===null){ if(i>=p){ let s=0; for(let k=i-p+1;k<=i;k++){ s+=Math.max(rows[k].h-rows[k].l, Math.abs(rows[k].h-rows[k-1].c), Math.abs(rows[k].l-rows[k-1].c)); } a=s/p; out[i]=a; } }
else { a=(a*(p-1)+tr)/p; out[i]=a; }
}
return out;
}
function macdHist(vals, f=12, s=26, sig=9){
const ef=ema(vals,f), es=ema(vals,s);
const line = vals.map((_,i)=> ef[i]-es[i]);
const sigline = ema(line.map(v=>isNaN(v)?0:v), sig);
return vals.map((_,i)=> line[i]-sigline[i]);
}
function volZ(rows, look=20){
const n=rows.length; if(n<look+1) return NaN;
const vs = rows.slice(n-1-look, n-1).map(r=>r.v);
const m = vs.reduce((a,b)=>a+b,0)/vs.length;
const sd = Math.sqrt(vs.reduce((a,b)=>a+(b-m)**2,0)/vs.length);
if (sd < 1e-8) return 0;
return (rows[n-1].v - m)/sd;
}
function lastSwing(rows, dir, look=30){
const seg = rows.slice(Math.max(0,rows.length-1-look), rows.length-1);
if (!seg.length) return NaN;
return dir==='long' ? Math.min(...seg.map(r=>r.l)) : Math.max(...seg.map(r=>r.h));
}
function findOrderBlock(rows, dir){
if (!rows || rows.length < 30) return null;
const aArr = atr(rows, 14);
let best = null;
const start = Math.max(2, rows.length - 250);
for (let j = start; j < rows.length - 1; j++){
const disp = rows[j], ob = rows[j-1];
const dispRange = disp.h - disp.l;
const avgAtr = aArr[j];
if (!avgAtr || dispRange < avgAtr * 1.5) continue;
const swingHigh = lastSwing(rows.slice(0, j+1), 'short', 20);
const swingLow = lastSwing(rows.slice(0, j+1), 'long', 20);
if (dir === 'long' && disp.c > disp.o && disp.c > swingHigh && ob.c < ob.o){
const top = ob.h, bottom = ob.l;
let mitigated = false;
for (let k = j+1; k < rows.length; k++){ if (rows[k].l <= bottom){ mitigated = true; break; } }
if (!mitigated) best = { top, bottom, age: rows.length-1-j };
} else if (dir === 'short' && disp.c < disp.o && disp.c < swingLow && ob.c > ob.o){
const top = ob.h, bottom = ob.l;
let mitigated = false;
for (let k = j+1; k < rows.length; k++){ if (rows[k].h >= top){ mitigated = true; break; } }
if (!mitigated) best = { top, bottom, age: rows.length-1-j };
}
}
return best;
}
function findLiquidityPools(rows){
if (!rows || rows.length < 25) return { buySide:null, sellSide:null };
const look = Math.min(40, rows.length-1);
const seg = rows.slice(rows.length-1-look, rows.length-1);
const tol = 0.0015;
let bestHigh = null, bestLow = null;
for (let i=0;i<seg.length;i++){
let cH=[seg[i].h], cL=[seg[i].l];
for (let j=0;j<seg.length;j++){
if (i===j) continue;
if (Math.abs(seg[j].h-seg[i].h)/seg[i].h <= tol) cH.push(seg[j].h);
if (Math.abs(seg[j].l-seg[i].l)/seg[i].l <= tol) cL.push(seg[j].l);
}
if (cH.length>=2){ const lvl=Math.max(...cH); if(!bestHigh||lvl>bestHigh.level) bestHigh={level:lvl,count:cH.length}; }
if (cL.length>=2){ const lvl=Math.min(...cL); if(!bestLow||lvl<bestLow.level) bestLow={level:lvl,count:cL.length}; }
}
if (bestHigh && seg.some(r=>r.c > bestHigh.level)) bestHigh = null;
if (bestLow && seg.some(r=>r.c < bestLow.level)) bestLow = null;
return { buySide: bestHigh, sellSide: bestLow };
}
function nearestOBText(rows, dir){
try{
const ob = findOrderBlock(rows, dir);
return ob ? (px(ob.bottom)+'\u2013'+px(ob.top)+' ('+ob.age+' bars)') : 'none nearby';
}catch(e){ return 'n/a'; }
}
function liquidityTargetText(rows, dir){
try{
const lp = findLiquidityPools(rows);
const target = dir === 'long' ? lp.buySide : lp.sellSide;
return target ? (px(target.level)+' (x'+target.count+')') : 'none nearby';
}catch(e){ return 'n/a'; }
}

const last = a => a[a.length-1];
function roc(vals, n){ const L=vals.length; return L>n ? (vals[L-1]/vals[L-1-n]-1)*100 : NaN; }
function avgFinite(vals){ const f=vals.filter(function(v){return isFinite(v);}); return f.length ? f.reduce(function(a,b){return a+b;},0)/f.length : NaN; }
function bollinger(vals, p, mult){ p=p||20; mult=mult||2;
const out=new Array(vals.length).fill(NaN); const mid=new Array(vals.length).fill(NaN);
const upper=new Array(vals.length).fill(NaN); const lower=new Array(vals.length).fill(NaN);
for (let i=p-1;i<vals.length;i++){ let sum=0; for(let k=i-p+1;k<=i;k++) sum+=vals[k]; const m=sum/p;
let sq=0; for(let k=i-p+1;k<=i;k++) sq+=(vals[k]-m)*(vals[k]-m); const sd=Math.sqrt(sq/p);
mid[i]=m; upper[i]=m+mult*sd; lower[i]=m-mult*sd; }
const widthPct=vals.map(function(_,i){ return (isFinite(mid[i])&&mid[i]!==0) ? (upper[i]-lower[i])/mid[i]*100 : NaN; });
return {mid:mid, upper:upper, lower:lower, widthPct:widthPct}; }
function volRegime(c){ if (!c || c.length<70) return 'NEUTRAL'; const bb=bollinger(c,20,2); const currentWidth=bb.widthPct[c.length-1]; const pastWidths=bb.widthPct.slice(-50).filter(isFinite); if (!pastWidths.length || !isFinite(currentWidth)) return 'NEUTRAL'; const avgWidth=pastWidths.reduce(function(a,b){return a+b;},0)/pastWidths.length; if (currentWidth<avgWidth*0.75) return 'COMPRESSING'; if (currentWidth>avgWidth*1.25) return 'EXPANDING'; return 'NEUTRAL'; } function adx(rows, p){ p=p||14; const n=rows.length;
const plusDM=new Array(n).fill(0), minusDM=new Array(n).fill(0), tr=new Array(n).fill(0);
for (let i=1;i<n;i++){ const up=rows[i].h-rows[i-1].h, down=rows[i-1].l-rows[i].l;
plusDM[i]=(up>down&&up>0)?up:0; minusDM[i]=(down>up&&down>0)?down:0;
tr[i]=Math.max(rows[i].h-rows[i].l, Math.abs(rows[i].h-rows[i-1].c), Math.abs(rows[i].l-rows[i-1].c)); }
function wilder(vals){ const out=new Array(n).fill(NaN); let a=null;
for (let i=1;i<n;i++){ if(a===null){ if(i>=p){ let sum=0; for(let k=i-p+1;k<=i;k++) sum+=vals[k]; a=sum; out[i]=a; } }
else { a=a-a/p+vals[i]; out[i]=a; } } return out; }
const trS=wilder(tr), pdS=wilder(plusDM), mdS=wilder(minusDM);
const plusDI=trS.map(function(v,i){ return v?100*pdS[i]/v:NaN; });
const minusDI=trS.map(function(v,i){ return v?100*mdS[i]/v:NaN; });
const dx=plusDI.map(function(v,i){ const md=minusDI[i]; return (isFinite(v)&&isFinite(md)&&(v+md)!==0) ? 100*Math.abs(v-md)/(v+md) : NaN; });
const out=new Array(n).fill(NaN); let a=null;
for (let i=0;i<n;i++){ if(isNaN(dx[i])) continue; a=(a===null)?dx[i]:(a*(p-1)+dx[i])/p; out[i]=a; }
return {adx:out, plusDI:plusDI, minusDI:minusDI}; }
function stochRsi(vals, rsiP, stochP){ rsiP=rsiP||14; stochP=stochP||14; const r=rsi(vals,rsiP); const n=r.length;
const k=new Array(n).fill(NaN);
for (let i=0;i<n;i++){ if(i<stochP-1) continue; let lo=Infinity,hi=-Infinity,ok=true;
for (let j=i-stochP+1;j<=i;j++){ if(isNaN(r[j])){ ok=false; break; } lo=Math.min(lo,r[j]); hi=Math.max(hi,r[j]); }
if(!ok||hi===lo) continue; k[i]=100*(r[i]-lo)/(hi-lo); }
return k; }
function vwapDev(rows, look){ look=look||20; const n=rows.length; if (n<look) return NaN;
let pv=0, vv=0; for (let i=n-look;i<n;i++){ const typ=(rows[i].h+rows[i].l+rows[i].c)/3; pv+=typ*rows[i].v; vv+=rows[i].v; }
if (vv<=0) return NaN; const vwap=pv/vv; return (rows[n-1].c-vwap)/vwap*100; }
function cascadeAge(closes, dir){
const e9=ema(closes,9), e21=ema(closes,21), e50=ema(closes,50);
let n=0;
for (let i=closes.length-1;i>=0;i--){
if (!isFinite(e50[i])) break;
const ok = dir==='long' ? (e9[i]>e21[i]&&e21[i]>e50[i]) : (e9[i]<e21[i]&&e21[i]<e50[i]);
if (!ok) break;
n++;
}
return n;
}
function cusumLast(vals, k=1){
if (vals.length<30) return null;
const rets=[]; for(let i=1;i<vals.length;i++) rets.push(Math.log(vals[i]/vals[i-1]));
const m=rets.reduce((a,b)=>a+b,0)/rets.length;
const sd=Math.sqrt(rets.reduce((a,b)=>a+(b-m)**2,0)/rets.length)||1e-12;
const h=k*sd;
let sPos=0, sNeg=0, ev=null;
for(let i=0;i<rets.length;i++){
sPos=Math.max(0,sPos+rets[i]); sNeg=Math.min(0,sNeg+rets[i]);
if (sPos>h){ ev={dir:'long', i}; sPos=0; }
if (sNeg<-h){ ev={dir:'short', i}; sNeg=0; }
}
return ev ? {dir:ev.dir, barsAgo:rets.length-1-ev.i} : null;
}
function findPivots(vals, win){
win = win || 3;
const out = [];
for (let i=win;i<vals.length-win;i++){
let isHigh=true, isLow=true;
for (let k=1;k<=win;k++){
if (!(vals[i]>vals[i-k] && vals[i]>vals[i+k])) isHigh=false;
if (!(vals[i]<vals[i-k] && vals[i]<vals[i+k])) isLow=false;
}
if (isHigh) out.push({i:i, type:"high", v:vals[i]});
if (isLow) out.push({i:i, type:"low", v:vals[i]});
}
return out;
}
function detectRegime(rows){
if (!rows || rows.length < 60) return {regime:"unknown", label:"DATA THIN"};
const c = rows.map(function(r){ return r.c; });
const n = c.length;
const adxR = adx(rows,14);
const bb = bollinger(c,20,2);
const atrArr = atr(rows,14);
const adxNow = adxR.adx[n-1];
const wNow = bb.widthPct[n-1], wPrev = bb.widthPct[n-2];
const wHist = bb.widthPct.slice(Math.max(0,n-51), n-1).filter(function(v){ return isFinite(v); });
const wAvg = wHist.length ? wHist.reduce(function(a,b){ return a+b; },0)/wHist.length : NaN;
const atrNow = atrArr[n-1];
const atrHist = atrArr.slice(Math.max(0,n-51), n-1).filter(function(v){ return isFinite(v); }).slice().sort(function(a,b){ return a-b; });
const atrMedian = atrHist.length ? atrHist[Math.floor(atrHist.length/2)] : NaN;
const distMid = (isFinite(bb.mid[n-1]) && bb.mid[n-1]!==0) ? Math.abs(c[n-1]-bb.mid[n-1])/bb.mid[n-1] : NaN;
let regime="weak_trend", label="WEAK TREND";
if (isFinite(atrNow) && isFinite(atrMedian) && atrMedian>0 && atrNow > atrMedian*2){ regime="volatile"; label="VOLATILE EXPANSION"; }
else if (isFinite(wNow) && isFinite(wAvg) && wAvg>0 && wNow < wAvg*0.6){ regime="compression"; label="COMPRESSION"; }
else if (isFinite(adxNow) && adxNow>30 && isFinite(wNow) && isFinite(wPrev) && wNow>wPrev){ regime="trend"; label="STRONG TREND"; }
else if (isFinite(adxNow) && adxNow<20 && isFinite(distMid) && distMid<0.02){ regime="range"; label="RANGE"; }
return {regime:regime, label:label};
}

/* ============================================================
   Phase 6 additions \u2014 new confluence indicators
   Appended helpers: heikinAshi, bollingerPercentB, volumeProfile,
   fundingMomentum, macdZeroLine. Pure math, no DOM/fetch.
   ============================================================ */

/* Heikin Ashi trend state. Input: rows [{o,h,l,c}]. Returns last HA
   candle + a coarse trend state used to CONFIRM (not override) EMA dir.
   HAclose = (o+h+l+c)/4 ; HAopen = prev( (HAopen+HAclose)/2 ). */
function heikinAshi(rows){
  if (!rows || rows.length < 2) return null;
  let haOpenPrev = (rows[0].o + rows[0].c) / 2;
  let haCandle = null, prevClose = null;
  for (let i = 0; i < rows.length; i++){
    const r = rows[i];
    const haClose = (r.o + r.h + r.l + r.c) / 4;
    const haOpen  = i === 0 ? (r.o + r.c) / 2 : (haOpenPrev + prevClose) / 2;
    const haHigh  = Math.max(r.h, haOpen, haClose);
    const haLow   = Math.min(r.l, haOpen, haClose);
    haCandle = { o: haOpen, h: haHigh, l: haLow, c: haClose };
    haOpenPrev = haOpen; prevClose = haClose;
  }
  const bull = haCandle.c > haCandle.o;
  const noLowerWick = Math.abs(haCandle.o - haCandle.l) / (haCandle.h - haCandle.l || 1e-12) < 0.05;
  const noUpperWick = Math.abs(haCandle.h - haCandle.c) / (haCandle.h - haCandle.l || 1e-12) < 0.05;
  let state = 'NEUTRAL';
  if (bull) state = noLowerWick ? 'STRONG_UP' : 'UP';
  else      state = noUpperWick ? 'STRONG_DOWN' : 'DOWN';
  return { candle: haCandle, bull: bull, state: state };
}

/* Bollinger %B = (price - lower) / (upper - lower). >0.8 breakout zone,
   <0.2 mean-reversion zone. Input: close array. Returns last %B (number). */
function bollingerPercentB(closes, p, mult){
  const bb = bollinger(closes, p || 20, mult || 2);
  const i = closes.length - 1;
  const u = bb.upper[i], l = bb.lower[i];
  if (!isFinite(u) || !isFinite(l) || (u - l) === 0) return NaN;
  return (closes[i] - l) / (u - l);
}

/* Volume Profile over the last N bars. Buckets the [min,max] price range,
   accumulates volume per bucket, returns POC (highest-volume price),
   plus VAH/VAL bounding ~70% of volume (value area). Input: rows [{h,l,c,v}]. */
function volumeProfile(rows, lookback, buckets){
  const n = rows.length; const look = Math.min(lookback || 20, n);
  if (look < 5) return null;
  const seg = rows.slice(n - look);
  let lo = Infinity, hi = -Infinity;
  for (const r of seg){ if (r.l < lo) lo = r.l; if (r.h > hi) hi = r.h; }
  if (!isFinite(lo) || !isFinite(hi) || hi <= lo) return null;
  const B = buckets || 24; const step = (hi - lo) / B;
  const vol = new Array(B).fill(0);
  for (const r of seg){
    const typ = (r.h + r.l + r.c) / 3;
    let b = Math.floor((typ - lo) / step); if (b < 0) b = 0; if (b >= B) b = B - 1;
    vol[b] += (r.v || 0);
  }
  const total = vol.reduce((a,b) => a + b, 0) || 1;
  let pocIdx = 0; for (let i = 1; i < B; i++) if (vol[i] > vol[pocIdx]) pocIdx = i;
  const poc = lo + (pocIdx + 0.5) * step;
  let loI = pocIdx, hiI = pocIdx, acc = vol[pocIdx];
  while (acc < total * 0.70 && (loI > 0 || hiI < B - 1)){
    const down = loI > 0 ? vol[loI - 1] : -1;
    const up   = hiI < B - 1 ? vol[hiI + 1] : -1;
    if (up >= down){ hiI++; acc += vol[hiI]; } else { loI--; acc += vol[loI]; }
  }
  const val = lo + loI * step;
  const vah = lo + (hiI + 1) * step;
  return { poc: poc, vah: vah, val: val, priceInVA: null };
}

/* Funding-rate momentum. Input: array of recent funding rates (oldest->newest,
   fraction e.g. 0.0001 = 0.01%). Returns per-settlement slope + accelerating flag.
   Positive slope means longs increasingly pay shorts (worsening for longs). */
function fundingMomentum(frSeries){
  if (!frSeries || frSeries.length < 3) return null;
  const s = frSeries.slice(-3);
  const slope = (s[s.length - 1] - s[0]) / (s.length - 1);
  const accelerating = (s[2] - s[1]) > (s[1] - s[0]);
  return { now: s[s.length - 1], slope: slope, accelerating: accelerating };
}

/* MACD zero-line filter. Returns the sign of the MACD LINE (not histogram)
   on the last bar: +1 above zero (long-permissible), -1 below, 0 flat/NaN. */
function macdZeroLine(closes, f, s){
  const ef = ema(closes, f || 12), es = ema(closes, s || 26);
  const i = closes.length - 1;
  const line = ef[i] - es[i];
  if (!isFinite(line)) return 0;
  return line > 0 ? 1 : (line < 0 ? -1 : 0);
}

/* ===== Phase 7 additions ===== */

/* Token-bucket rate limiter. Create with capacity + refillPerSec.
   Call take() -> returns ms to wait (0 if a token is available now).
   Non-blocking: caller decides how to schedule. */
function makeTokenBucket(capacity, refillPerSec){
  const cap = capacity || 10;
  const rate = refillPerSec || 5;
  let tokens = cap;
  let last = Date.now();
  function refill(){
    const now = Date.now();
    const gain = ((now - last) / 1000) * rate;
    if (gain > 0){ tokens = Math.min(cap, tokens + gain); last = now; }
  }
  return {
    take: function(){
      refill();
      if (tokens >= 1){ tokens -= 1; return 0; }
      return Math.ceil((1 - tokens) / rate * 1000);
    },
    available: function(){ refill(); return Math.floor(tokens); }
  };
}

/* Killzone timing (UTC-based). Returns which session window a timestamp
   falls in for ICT-style timing. Informational only. */
function killzone(tsMs){
  const d = new Date(tsMs || Date.now());
  const h = d.getUTCHours() + d.getUTCMinutes() / 60;
  if (h >= 0 && h < 5) return { zone: "ASIA", active: true };
  if (h >= 7 && h < 10) return { zone: "LONDON", active: true };
  if (h >= 12 && h < 15) return { zone: "NEWYORK", active: true };
  return { zone: "OFF", active: false };
}

/* MTF 3-of-4 alignment. Pass an array of per-timeframe bias signs
   (+1 up, -1 down, 0 neutral). Returns aligned direction + count. */
function mtfAlign(biases){
  if (!biases || !biases.length) return { dir: 0, agree: 0, of: 0, aligned: false };
  const up = biases.filter(function(b){ return b > 0; }).length;
  const dn = biases.filter(function(b){ return b < 0; }).length;
  const of = biases.length;
  const dir = up > dn ? 1 : (dn > up ? -1 : 0);
  const agree = Math.max(up, dn);
  return { dir: dir, agree: agree, of: of, aligned: agree >= Math.min(3, of) };
}

/* Wick commitment + delta proxy on the last bar. Returns commitment 0..1
   and which side rejected. Informational only. */
function wickCommit(bar){
  if (!bar) return null;
  const rng = bar.high - bar.low;
  if (!(rng > 0)) return { commit: 0, reject: "NONE" };
  const body = Math.abs(bar.close - bar.open);
  const upWick = bar.high - Math.max(bar.open, bar.close);
  const dnWick = Math.min(bar.open, bar.close) - bar.low;
  const commit = body / rng;
  const reject = upWick > dnWick ? "TOP" : (dnWick > upWick ? "BOTTOM" : "NONE");
  return { commit: commit, reject: reject };
}

/* Gold macro context. Given latest DXY change and 10y-yield change (as
   fractions), returns headwind/tailwind for gold longs. Informational. */
function goldMacro(dxyChg, yieldChg){
  const d = dxyChg || 0, y = yieldChg || 0;
  const score = -(d) - (y);
  let read = "NEUTRAL";
  if (score > 0.001) read = "TAILWIND";
  else if (score < -0.001) read = "HEADWIND";
  return { read: read, score: score };
}

/* Pre-NFP stand-aside. NFP releases first Friday of month at 13:30 UTC.
   Returns true when within +/- windowMin of that time. Informational. */
function preNfp(tsMs, windowMin){
  const d = new Date(tsMs || Date.now());
  const w = windowMin || 60;
  const isFriday = d.getUTCDay() === 5;
  const dom = d.getUTCDate();
  const isFirstFriday = isFriday && dom <= 7;
  if (!isFirstFriday) return { standAside: false };
  const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
  const nfpMin = 13 * 60 + 30;
  const near = Math.abs(mins - nfpMin) <= w;
  return { standAside: near, minutesTo: nfpMin - mins };
}

/* RSI divergence detector. Compares the last two price pivots vs RSI at
   those pivots. Bullish div: price lower-low but RSI higher-low.
   Bearish div: price higher-high but RSI lower-high. Informational. */
function rsiDivergence(closes, period){
  const p = period || 14;
  if (!closes || closes.length < p + 10) return { type: "NONE" };
  const r = rsi(closes, p);
  const lows = [], highs = [];
  for (let i = 2; i < closes.length - 2; i++){
    if (closes[i] < closes[i-1] && closes[i] < closes[i-2] && closes[i] < closes[i+1] && closes[i] < closes[i+2]) lows.push(i);
    if (closes[i] > closes[i-1] && closes[i] > closes[i-2] && closes[i] > closes[i+1] && closes[i] > closes[i+2]) highs.push(i);
  }
  let type = "NONE", detail = null;
  if (lows.length >= 2){
    const a = lows[lows.length-2], b = lows[lows.length-1];
    if (closes[b] < closes[a] && isFinite(r[a]) && isFinite(r[b]) && r[b] > r[a]) { type = "BULLISH"; detail = { pIdx: b, rNow: r[b], rPrev: r[a] }; }
  }
  if (highs.length >= 2){
    const a = highs[highs.length-2], b = highs[highs.length-1];
    if (closes[b] > closes[a] && isFinite(r[a]) && isFinite(r[b]) && r[b] < r[a]) { type = "BEARISH"; detail = { pIdx: b, rNow: r[b], rPrev: r[a] }; }
  }
  return { type: type, detail: detail };
}
