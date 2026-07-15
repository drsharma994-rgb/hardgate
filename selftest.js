/* selftest.js \u2014 dev-only self-test suite extracted from index.html (Phase 12 modularization).
   runSelfTests() is invoked manually from the console; it is not run on load.
   Depends on cusumLast() from indicators.js, so it loads after that file. */
/* ---------------- dev-only self-tests (console: runSelfTests()) ----------------
   Lightweight fixture checks for the gate logic most prone to silent regressions.
   Not a full test suite \u2014 pins the closePos/sweep formulas and exercises the
   real cusumLast() directly so future edits to these can't silently flip a sign
   or break a divide-by-zero guard without a visible console failure. */
function runSelfTests(){
  const results = [];
  function assert(name, cond, detail){ results.push({name:name, pass:!!cond, detail:detail||''}); }

  (function(){
    function closePosOf(bar){ const range = bar.h - bar.l; return range>0 ? (bar.c - bar.l)/range : 0.5; }
    const strong = {h:110,l:100,c:109};
    const weak = {h:110,l:100,c:101};
    const flatBar = {h:100,l:100,c:100};
    assert('closePos: strong bullish close ~0.9', Math.abs(closePosOf(strong)-0.9)<1e-9, closePosOf(strong));
    assert('closePos: weak close ~0.1', Math.abs(closePosOf(weak)-0.1)<1e-9, closePosOf(weak));
    assert('closePos: zero-range bar defaults to 0.5 (no div/0)', closePosOf(flatBar)===0.5, closePosOf(flatBar));
    assert('closePos gate: long passes on strong close (>=0.60)', closePosOf(strong)>=0.60, '');
    assert('closePos gate: long vetoes weak close (<0.60)', !(closePosOf(weak)>=0.60), '');
    assert('closePos gate: short passes on weak close (<=0.40)', closePosOf(weak)<=0.40, '');
  })();

  (function(){
    function sweepOf(vals, dir, n){
      const priorWin = vals.slice(n-24, n-7);
      const localLow = Math.min.apply(null, priorWin);
      const localHigh = Math.max.apply(null, priorWin);
      const recent = vals.slice(n-7, n-1);
      return dir==='long' ? Math.min.apply(null, recent) < localLow : Math.max.apply(null, recent) > localHigh;
    }
    const flat = new Array(24).fill(100);
    const swept = flat.concat([100,100,100,100,95,100]); // undercut sits inside the 6-bar recent window, not at the very last (excluded) bar
    const notSwept = new Array(23).fill(100).concat(new Array(7).fill(102)); // last 6 bars (recent window) are entirely above the lookback low
    assert('sweep: detected when recent extreme undercuts prior range', sweepOf(swept,'long',swept.length), '');
    assert('sweep: no false-positive when nothing undercuts the range', !sweepOf(notSwept,'long',notSwept.length), '');
  })();

  (function(){
    let p = 100; const up = [];
    for (let i=0;i<60;i++){ p *= 1.01; up.push(p); }
    const evUp = cusumLast(up, 1);
    assert('cusumLast: sustained uptrend yields a long event', !!(evUp && evUp.dir==='long'), JSON.stringify(evUp));

    p = 100; const down = [];
    for (let i=0;i<60;i++){ p *= 0.99; down.push(p); }
    const evDown = cusumLast(down, 1);
    assert('cusumLast: sustained downtrend yields a short event', !!(evDown && evDown.dir==='short'), JSON.stringify(evDown));

    const flatSeries = new Array(60).fill(100);
    const evFlat = cusumLast(flatSeries, 1);
    assert('cusumLast: flat series does not throw (div/0 guard holds)', evFlat===null || typeof evFlat==='object', JSON.stringify(evFlat));
  })();

  const pass = results.filter(function(r){ return r.pass; }).length;
  console.log('HARDGATE self-tests: '+pass+'/'+results.length+' passed', results);
  return { pass:pass, total:results.length, results:results };
}
