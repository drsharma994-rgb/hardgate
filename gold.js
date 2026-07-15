// gold.js \u2014 XAU/gold trading scanners & cascade core (extracted from index.html, Phase 21)
// Call-time deps stay elsewhere: $, S, getXAUCandles, indicators, judasSweepCheck, etc.
// Globals: GOLD_SYM, goldSession, utcDayStart, runGold, runCascadeCore.

/* =============================================================================
   GOLD \u2014 XAUTUSD session + liquidity module.
   Swing: same hard gates as crypto. Scalp: Judas sweep-and-reclaim of Asian
   range / PDH/PDL inside London/NY kill zones only. Closed bars only.
   F&G deliberately NOT applied \u2014 it measures crypto sentiment, not gold.
   ============================================================================= */
const GOLD_SYM = 'XAUTUSD';
function goldSession(){
  const d = new Date();
  const h = d.getUTCHours() + d.getUTCMinutes()/60;
  if (h>=7  && h<10) return {name:'LONDON KZ', kz:true};   // 12:30\u201315:30 IST
  if (h>=12 && h<15) return {name:'NY KZ', kz:true};        // 17:30\u201320:30 IST
  if (h>=0  && h<7)  return {name:'ASIA (range builds)', kz:false};
  return {name:'OFF-SESSION', kz:false};
}
function utcDayStart(){ const d=new Date(); return Math.floor(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())/1000); }

async function runGold(){
  const btn=$('goldRun'); btn.disabled=true; setProg('goldProg',0.1);
  $('goldStat').textContent='';
  try{
    
    
    
    const d1 = await getXAUCandles('1d',260);  setProg('goldProg',0.35);
    const h4 = await getXAUCandles('4h',300);  setProg('goldProg',0.6);
    const h1 = await getXAUCandles('1h',160);  setProg('goldProg',0.75);
    const m15= await getXAUCandles('15m',200); setProg('goldProg',0.9);
    if (d1.length<60||h4.length<210||m15.length<40){ $('goldStat').textContent='not enough XAUTUSD history'; return; }

    /* ---- levels: prior-day H/L from last CLOSED daily; Asian range 00:00\u201307:00 UTC today ---- */
    const pdc = d1[d1.length-1];
    const PDH = pdc.h, PDL = pdc.l;
    const day0now = utcDayStart();
    const day0 = (nowSec() < day0now+7*3600) ? day0now-86400 : day0now;
    const asia = m15.filter(r=> r.t>=day0 && r.t<day0+7*3600);
    const asiaHi = asia.length ? Math.max(...asia.map(r=>r.h)) : NaN;
    const asiaLo = asia.length ? Math.min(...asia.map(r=>r.l)) : NaN;
    const sess = goldSession();
    $('goldSess').innerHTML = `session <b>${sess.name}</b>`;
    $('goldLvl').innerHTML  = `PDH <b>${px(PDH)}</b> \u00B7 PDL <b>${px(PDL)}</b> \u00B7 Asia <b>${isFinite(asiaLo)?px(asiaLo):'\u2014'}\u2013${isFinite(asiaHi)?px(asiaHi):'\u2014'}</b>`;

    /* ---------------- SWING ledger ---------------- */
    const c4=h4.map(r=>r.c), c1=d1.map(r=>r.c);
    const e9=last(ema(c4,9)), e21=last(ema(c4,21)), e50=last(ema(c4,50));
    const a4=last(atr(h4,14));
    const e50d=last(ema(c1,50)), pd=last(c1);
    const r4=last(rsi(c4,14));
    const fr = null; // real spot XAUUSD has no futures funding rate
    const casc = e9>e21&&e21>e50 ? 'long' : (e9<e21&&e21<e50 ? 'short' : 'mixed');
    const spreadOk = isFinite(a4) && Math.abs(e21-e50) >= 0.25*a4;
    const dSide = pd>e50d ? 'long' : 'short';
    const sg=[];
    sg.push(['GS1','4H EMA cascade with real spread (anti-chop)', casc!=='mixed'&&spreadOk?'pass':'veto',
      `9/21/50 \u2192 ${casc.toUpperCase()} \u00B7 |21\u221250| ${isFinite(a4)?fmt(Math.abs(e21-e50)/a4,2):'\u2014'}\u00D7ATR (need \u22650.25)`]);
    sg.push(['GS2','1D side agrees (close vs 1D EMA50)', casc!=='mixed'&&casc===dSide?'pass':'veto', `1D \u2192 ${dSide.toUpperCase()}`]);
    const rsiVeto=(casc==='long'&&r4>70)||(casc==='short'&&r4<30);
    sg.push(['GS3','4H RSI exhaustion guard', rsiVeto?'veto':'pass', `RSI14 ${fmt(r4,1)}`]);
    let gs4='na', gs4d='funding n/a on this feed';
    if (fr!==null){
      const bad = Math.abs(fr)>0.05-1e-9 || (casc==='long'&&fr>=0.04) || (casc==='short'&&fr<=-0.04);
      gs4 = bad?'veto':'pass'; gs4d = `${fmt(fr,4)}%/interval`;
    }
    sg.push(['GS4','Funding clean (crowding veto)', gs4, gs4d]);
    const r30g=roc(c1,30), r90g=roc(c1,90);
    let gs5='na', gs5d=`30d ${pct(r30g,1)} \u00B7 90d ${pct(r90g,1)}`;
    if (casc!=='mixed' && isFinite(r30g) && isFinite(r90g)){
      const want=casc==='long'?1:-1;
      const agree=(Math.sign(r30g)===want?1:0)+(Math.sign(r90g)===want?1:0);
      gs5 = agree===2?'pass':agree===0?'veto':'na';
    }
    sg.push(['GS5','TSMOM 30/90d sign \u2014 trend persistence incl. commodities (MOP 2012)', gs5, gs5d]);
    const evG = cusumLast(c4.slice(-120), 1);
    let gs6='na', gs6d='no recent event';
    if (evG && evG.barsAgo<=20 && casc!=='mixed'){
      gs6 = evG.dir===casc?'pass':'veto';
      gs6d = `${evG.dir.toUpperCase()} event ${evG.barsAgo} bars ago (4H)`;
    } else if (evG){ gs6d = `${evG.dir.toUpperCase()} event ${evG.barsAgo} bars ago (stale)`; }
    sg.push(['GS6','CUSUM event alignment \u2014 your walk-forward\'s top feature (OOS AUC \u22480.58)', gs6, gs6d]);
    let swingPlanHtml='', sVerdict='aside', nearMissSwing='';
    if (casc!=='mixed'){
      const stop=lastSwing(h4,casc,30), entry=last(c4), risk=Math.abs(entry-stop);
      const room = casc==='long' ? Math.max(...h4.slice(-120).map(r=>r.h))-entry : entry-Math.min(...h4.slice(-120).map(r=>r.l));
      const rrOk = risk>0 && room/risk>=2;
      sg.push(['GS7','Structural R:R \u2265 2 (30-bar swing stop vs 120-bar room)', rrOk?'pass':'veto',
        risk>0?`${fmt(room/risk,2)}R room \u00B7 stop ${px(stop)}`:'no structure']);
      const vet = sg.some(x=>x[2]==='veto');
      sVerdict = vet?'aside':casc;
      nearMissSwing = vet ? (' Nearest miss: '+sg.filter(x=>x[2]==='pass').length+'/'+sg.length+' gates cleared \u2014 blocked by '+sg.filter(x=>x[2]==='veto').map(x=>x[0]).join(', ')+'. Not a signal, just how close price is.') : '';
      if(!vet){
        const t1=casc==='long'?entry+2*risk:entry-2*risk, t2=casc==='long'?entry+3*risk:entry-3*risk;
        logSetup(GOLD_SYM, casc, 'gold-swing', entry, stop, t1);
        swingPlanHtml = `<div class="plan">${planBlock(casc,entry,stop,t1,t2)}</div>
          <button class="toTrade" onclick="toTrade('${GOLD_SYM}','${casc}',${entry},${stop})">SEND TO TRADE PLAN \u2192</button>`;
      }
    } else {
      sg.push(['GS7','Structural R:R \u2265 2','na','no direction to measure']);
    }
    let sEvidenceHtml = '';
    try{
      if (casc!=='mixed' && c4 && c4.length>=40){
        const eeBB = bollinger(c4,20,2); const nE = c4.length;
        const priorW = eeBB.widthPct.slice(Math.max(0,nE-50), nE-1).filter(function(v){return isFinite(v);});
        const wAvgE = priorW.length ? priorW.reduce(function(a,b){return a+b;},0)/priorW.length : NaN;
        const wantE = casc==='long' ? 1 : -1;
        const bbBreakE = (wantE>0 ? c4[nE-1]>eeBB.upper[nE-1] : c4[nE-1]<eeBB.lower[nE-1]) && isFinite(wAvgE) && eeBB.widthPct[nE-2]<=wAvgE;
        const adxE = adx(h4,14);
        const adxAlignedE = adxE.adx[nE-1]>=23 && (wantE>0 ? adxE.plusDI[nE-1]>adxE.minusDI[nE-1] : adxE.minusDI[nE-1]>adxE.plusDI[nE-1]);
        const srsiE = stochRsi(c4,14,14);
        const srsiOkE = isFinite(srsiE[nE-1]) && (wantE>0 ? srsiE[nE-1]<80 : srsiE[nE-1]>20);
        const votesE = (bbBreakE?1:0)+(adxAlignedE?1:0)+(srsiOkE?1:0);
        const detailE = 'BB '+(bbBreakE?'breakout':'no breakout')+' \u00B7 ADX '+fmt(adxE.adx[nE-1],1)+' '+(adxAlignedE?'aligned':'not aligned')+' \u00B7 StochRSI '+fmt(srsiE[nE-1],0)+' '+(srsiOkE?'not exhausted':'exhausted');
        sEvidenceHtml = '<div class="vwhy" style="margin-top:4px">Context (not a gate) \u2014 momentum evidence '+votesE+'/3 aligned with '+casc.toUpperCase()+': '+detailE+'.</div>';
      }
    }catch(e){}
    $('goldSwingOut').innerHTML = `<div class="ledger">${sg.map(x=>gateRow(...x)).join('')}</div>
      <div class="verdict ${sVerdict==='aside'?'aside':sVerdict}">
        <div class="vword">${sVerdict==='aside'?'STAND ASIDE':sVerdict.toUpperCase()}</div>
        <div class="vwhy">${sVerdict==='aside'
          ?('Gold swing gates did not all clear. Remember: a clean ledger can still be invalidated by DXY strength, a real-yield spike, or an event \u2014 those are your manual checks.'+nearMissSwing)
          :'All swing gates cleared. Verify DXY, real yields and the event calendar manually before sizing \u2014 this ledger cannot see them and will not pretend to.'}</div>
      ${sEvidenceHtml}
      </div>${swingPlanHtml}`;

    /* ---------------- SCALP ledgers: both scenarios, judged independently ---------------- */
    const c15=m15.map(r=>r.c), n15=c15.length;
    const lastClose=c15[n15-1];
    const atr15arr=atr(m15,14), a15=last(atr15arr);
    const vbase=atr15arr.slice(-96).filter(isFinite).sort((x,y)=>x-y);
    const aMed=vbase.length?vbase[Math.floor(vbase.length/2)]:NaN;
    const volAlive=isFinite(a15)&&isFinite(aMed)&&a15>=0.8*aMed;
    const e21h1=last(ema(h1.map(r=>r.c),21));
    const look=m15.slice(-12); // last ~3h of closed 15m bars

    function scalpLedger(dir){
      const lvls = dir==='long' ? [['Asia low',asiaLo],['PDL',PDL]] : [['Asia high',asiaHi],['PDH',PDH]];
      let swept=null, sweptLvl=NaN, ext=NaN;
      for (const [nm,lv] of lvls){
        if (!isFinite(lv)) continue;
        if (dir==='long'  && Math.min(...look.map(r=>r.l)) < lv){ swept=nm; sweptLvl=lv; ext=Math.min(...look.map(r=>r.l)); break; }
        if (dir==='short' && Math.max(...look.map(r=>r.h)) > lv){ swept=nm; sweptLvl=lv; ext=Math.max(...look.map(r=>r.h)); break; }
      }
      const reclaimed = swept && (dir==='long' ? lastClose>sweptLvl : lastClose<sweptLvl);
      const htfOk = dir==='long' ? lastClose>e21h1 : lastClose<e21h1;
      const g=[];
      g.push(['GC1','Kill zone active (London/NY)', sess.kz?'pass':'veto', sess.name]);
      g.push(['GC2',`Liquidity sweep of ${dir==='long'?'Asia low / PDL':'Asia high / PDH'} (last 3h)`, swept?'pass':'veto',
        swept?`swept ${swept} ${px(sweptLvl)} \u00B7 extreme ${px(ext)}`:'no sweep']);
      g.push(['GC3','Closed 15m bar reclaimed the level', reclaimed?'pass':'veto', swept?`close ${px(lastClose)} vs ${px(sweptLvl)}`:'\u2014']);
      g.push(['GC4','1H context not fighting you (close vs 1H EMA21)', htfOk?'pass':'veto', `1H EMA21 ${px(e21h1)}`]);
      g.push(['GC5','Volatility alive (15m ATR \u2265 0.8\u00D7 24h median)', volAlive?'pass':'veto', `ATR ${px(a15)} \u00B7 med ${px(aMed)}`]);
      let planHtml='';
      if (swept && reclaimed){
        const stop = dir==='long' ? ext-0.25*a15 : ext+0.25*a15;   // beyond the sweep extreme, ATR buffer
        const risk = Math.abs(lastClose-stop);
        const oppoCands = (dir==='long'?[asiaHi,PDH]:[asiaLo,PDL]).filter(isFinite);
        const oppo = oppoCands.length ? (dir==='long'?Math.min(...oppoCands):Math.max(...oppoCands)) : NaN;
        const room = dir==='long' ? oppo-lastClose : lastClose-oppo;
        const rrOk = risk>0 && isFinite(room) && room>=2*risk;
        g.push(['GC6','2R fits before the opposite liquidity pool', rrOk?'pass':'veto',
          risk>0&&isFinite(room)?`room ${px(room)} vs 2R ${px(2*risk)} (pool ${px(oppo)})`:'\u2014']);
        if (!g.some(x=>x[2]==='veto')){
          const t1=dir==='long'?lastClose+2*risk:lastClose-2*risk;
          logSetup(GOLD_SYM, dir, 'gold-scalp', lastClose, stop, t1);
          planHtml=`<div class="plan">${planBlock(dir,lastClose,stop,t1,oppo)}</div>
            <button class="toTrade" onclick="toTrade('${GOLD_SYM}','${dir}',${lastClose},${stop})">SEND TO TRADE PLAN \u2192</button>`;
        }
      } else {
        g.push(['GC6','2R fits before the opposite pool','na','needs a completed sweep + reclaim first']);
      }
      let cEvidenceHtml = '';
      try{
        const c15E = m15.map(function(r){return r.c;}); const nE2 = c15E.length;
        if (nE2>=40){
          const eeBB2 = bollinger(c15E,20,2);
          const priorW2 = eeBB2.widthPct.slice(Math.max(0,nE2-50), nE2-1).filter(function(v){return isFinite(v);});
          const wAvg2 = priorW2.length ? priorW2.reduce(function(a,b){return a+b;},0)/priorW2.length : NaN;
          const wantE2 = dir==='long' ? 1 : -1;
          const bbBreak2 = (wantE2>0 ? c15E[nE2-1]>eeBB2.upper[nE2-1] : c15E[nE2-1]<eeBB2.lower[nE2-1]) && isFinite(wAvg2) && eeBB2.widthPct[nE2-2]<=wAvg2;
          const adx2 = adx(m15,14);
          const adxAligned2 = adx2.adx[nE2-1]>=23 && (wantE2>0 ? adx2.plusDI[nE2-1]>adx2.minusDI[nE2-1] : adx2.minusDI[nE2-1]>adx2.plusDI[nE2-1]);
          const srsi2 = stochRsi(c15E,14,14);
          const srsiOk2 = isFinite(srsi2[nE2-1]) && (wantE2>0 ? srsi2[nE2-1]<80 : srsi2[nE2-1]>20);
          const votes2 = (bbBreak2?1:0)+(adxAligned2?1:0)+(srsiOk2?1:0);
          const detail2 = 'BB '+(bbBreak2?'breakout':'no breakout')+' \u00B7 ADX '+fmt(adx2.adx[nE2-1],1)+' '+(adxAligned2?'aligned':'not aligned')+' \u00B7 StochRSI '+fmt(srsi2[nE2-1],0)+' '+(srsiOk2?'not exhausted':'exhausted');
          cEvidenceHtml = '<div class="vwhy" style="margin-top:2px;font-size:11px">Context (not a gate) \u2014 momentum evidence '+votes2+'/3 aligned with '+dir.toUpperCase()+': '+detail2+'.</div>';
        }
      }catch(e){}
      const vet=g.some(x=>x[2]==='veto');
    const nearMissScalp = vet ? ('<div class="vwhy">Nearest miss: '+g.filter(x=>x[2]==='pass').length+'/'+g.length+' gates cleared \u2014 blocked by '+g.filter(x=>x[2]==='veto').map(x=>x[0]).join(', ')+'.</div>') : '';
      return `<div style="margin:2px 0 6px;font-size:11px;letter-spacing:.12em;color:var(--${dir==='long'?'long':'short'})">${dir.toUpperCase()} SCENARIO</div>
        <div class="ledger" style="margin-bottom:10px">${g.map(x=>gateRow(...x)).join('')}</div>
        <div class="verdict ${vet?'aside':dir}" style="margin:0 0 16px"><div class="vword" style="font-size:16px">${vet?'NO TRADE':dir.toUpperCase()+' VALID'}${nearMissScalp}</div>${cEvidenceHtml}</div>${planHtml}`;
    }
    $('goldScalpOut').innerHTML = scalpLedger('long') + scalpLedger('short');
    $('goldStat').textContent = `evaluated \u00B7 closed bars only \u00B7 ${S.cdcxViaProxy?'':''}${new Date().toTimeString().slice(0,5)}`;
  }catch(e){
    $('goldStat').textContent = 'gold eval failed: '+e.message;
  }finally{ setProg('goldProg',null); setTimeout(()=>{ btn.disabled=false; }, 10000); }
}


/* =============================================================================
   BEST \u2014 all hard gates first (binary ticket), then rank CLEAN survivors by a
   visible tally of independent aligned confirmations. Never a weighted score.
   ============================================================================= */
async function runCascadeCore(uni){
  const clean=[];
    let breadthBull=0, breadthTotal=0;
    const CHUNK1_SIZE=5;
    for (let ci=0; ci<uni.length; ci+=CHUNK1_SIZE){
      const chunk = uni.slice(ci, ci+CHUNK1_SIZE);
      await Promise.all(chunk.map(async function(t, idxInChunk){
      const i = ci+idxInChunk; setProg('bestProg',(i+1)/uni.length*0.65);
      $('bestStat').textContent=`gates ${i+1}/${uni.length} \u00B7 ${t.symbol}`;
      try{
        const rows=await getCandles(t.symbol,'4h',260);
        if (rows.length<210) return;
        const c=rows.map(r=>r.c);
        const e9=last(ema(c,9)), e21=last(ema(c,21)), e50=last(ema(c,50)), e200=last(ema(c,200));
        const p=last(c), r14=last(rsi(c,14)), vz=volZ(rows,20), a4=last(atr(rows,14));
      if (isFinite(e200)){ breadthTotal++; if (p>e200) breadthBull++; }
        let dir=null;
        if (e9>e21&&e21>e50) dir='long'; else if (e9<e21&&e21<e50) dir='short';
        if (!dir) return;
        if (!(isFinite(a4)&&Math.abs(e21-e50)>=0.25*a4)) return; const vr=volRegime(c); if (vr==='COMPRESSING') return;
        if (dir==='long' ? !(p>e200) : !(p<e200)) return;
        if ((dir==='long'&&r14>70)||(dir==='short'&&r14<30)) return;
        const fr=t.fundingPct;
        if (fr!==null){
          if (Math.abs(fr)>0.05-1e-9) return;
          if ((dir==='long'&&fr>=0.04)||(dir==='short'&&fr<=-0.04)) return;
        }
        if (!(vz > 0.5)) return; const currentBar = rows[rows.length-1]; const range = currentBar.h - currentBar.l; const closePos = range > 0 ? (currentBar.c - currentBar.l) / range : 0.5; if (dir === 'long' && closePos < 0.60) return; if (dir === 'short' && closePos > 0.40) return;
        const stop=lastSwing(rows,dir,30); const distToAnchor = Math.abs(p - e21) / a4; if (!(isFinite(distToAnchor) && distToAnchor <= 1.5)) return; let plannedEntry = p, entryType = 'MARKET'; const distToFast = Math.abs(p - e9) / a4; if (distToFast > 0.25){ plannedEntry = dir === 'long' ? Math.min(p, e9) : Math.max(p, e9); entryType = 'LIMIT @ EMA9'; } const entry = plannedEntry, risk=Math.abs(entry-stop);
if (!(risk>0)) return;
const expectedMove = a4 * 3.5; const maxExcursion = a4 * 4.9; const t1 = dir==='long' ? entry+expectedMove : entry-expectedMove; const t2 = dir==='long' ? entry+maxExcursion : entry-maxExcursion; const rr = expectedMove/risk; if (!(rr>=2)) return; const ev = cusumLast(c.slice(-120),1); if (ev && ev.barsAgo<=20 && ev.dir!==dir) return; clean.push({t,dir,rows,entry,entryType,distToAnchor,stop,risk,rr,t1,t2,vz,fr,ev});
      }catch(e){}
      }));
      await sleep(60);
    }
    
    /* Evidence FAMILIES for survivors \u2014 independence over count.
       Correlated indicators are grouped; each family yields at most ONE point,
       and the TREND family needs a 2-of-3 internal majority. This is the fix
       for triple-counting one fact (TSMOM, 1D side and CUSUM all measure trend).
       Plus two robustness checks: cross-timeframe stability and persistence. */
    const PF_CHUNK=5; for (let ci2=0; ci2<clean.length; ci2+=PF_CHUNK){ const chunk2=clean.slice(ci2,ci2+PF_CHUNK); await Promise.all(chunk2.map(async function(s){ try{ await getCandles(s.t.symbol,'1d',120); await getCandles(s.t.symbol,'2h',160); }catch(e){} })); } for (let i=0;i<clean.length;i++){
      const s=clean[i]; setProg('bestProg',0.65+((i+1)/clean.length)*0.3);
      $('bestStat').textContent=`evidence ${i+1}/${clean.length} \u00B7 ${s.t.symbol}`;
      const want=s.dir==='long'?1:-1;
      /* F1 TREND \u2014 members: TSMOM(MOP 2012), 1D side, CUSUM(your OOS top feature). Majority 2/3. */
      let mTs=false, mD1=false, tsD='1D fetch failed', d1D='1D fetch failed';
      try{
        const d1=await getCandles(s.t.symbol,'1d',120); const c1=d1.map(r=>r.c);
        const r30=roc(c1,30), r90=roc(c1,90);
        mTs = isFinite(r30)&&isFinite(r90)&&Math.sign(r30)===want&&Math.sign(r90)===want;
        tsD = `30d ${pct(r30,1)} \u00B7 90d ${pct(r90,1)}`;
        const e50d=last(ema(c1,50));
        mD1 = c1.length>=60 && (s.dir==='long'?last(c1)>e50d:last(c1)<e50d);
        d1D = `1D EMA50 ${px(e50d)}`;
      }catch(e){}
      const mCu = !!(s.ev&&s.ev.barsAgo<=20&&s.ev.dir===s.dir);
      const trendVotes=(mTs?1:0)+(mD1?1:0)+(mCu?1:0);
      const f1 = trendVotes>=2;
      /* F2 POSITIONING \u2014 funding tailwind: the crowd pays you to hold. */
      const f2 = s.fr!==null && (s.dir==='long'?s.fr<0:s.fr>0);
      /* F3 PARTICIPATION \u2014 strong volume expansion. */
      let vwapOk=false, vwapDetail='n/a';
      try{
        const dv = vwapDev(s.rows,20);
        if (isFinite(dv)){ vwapOk = want>0 ? dv>0 : dv<0; vwapDetail = fmt(dv,2)+'% vs 20-bar VWAP'; }
      }catch(e){}
      const f3 = s.vz>1.0 || vwapOk;
      /* F4 STRUCTURE \u2014 breakout location (Donchian-20, Turtle) or extra room (R:R\u22653). */
      const d20 = s.dir==='long' ? Math.max(...s.rows.slice(-20).map(r=>r.h)) : Math.min(...s.rows.slice(-20).map(r=>r.l));
      const mDc = Math.abs(s.entry-d20)/s.entry<=0.015, mRr=s.rr>=3;
      const f4 = mDc||mRr;
      /* F5 VOLATILITY/MOMENTUM \u2014 members: Bollinger(20,2) squeeze-to-breakout, ADX(14) trend
         strength+direction, StochRSI(14) not-exhausted. Majority 2/3 \u2014 grouped as one family
         because all three measure the same underlying fact: is momentum expanding in your
         favor right now, not three independent facts. No claim of profitability; this only
         changes which of the already-gated survivors gets ranked first. */
      let f5=false, f5Detail='insufficient history';
      try{
        const closesX = s.rows.map(function(r){return r.c;}); const nX = closesX.length;
        if (nX>=40){
          const bbX = bollinger(closesX,20,2);
          const priorWidths = bbX.widthPct.slice(Math.max(0,nX-50), nX-1).filter(function(v){return isFinite(v);});
          const wAvg = priorWidths.length ? priorWidths.reduce(function(a,b){return a+b;},0)/priorWidths.length : NaN;
          const bbBreak = (want>0 ? closesX[nX-1]>bbX.upper[nX-1] : closesX[nX-1]<bbX.lower[nX-1]) && isFinite(wAvg) && bbX.widthPct[nX-2]<=wAvg;
          const adxX = adx(s.rows,14);
          const adxAligned = adxX.adx[nX-1]>=23 && (want>0 ? adxX.plusDI[nX-1]>adxX.minusDI[nX-1] : adxX.minusDI[nX-1]>adxX.plusDI[nX-1]);
          const srsiX = stochRsi(closesX,14,14);
          const srsiOk = isFinite(srsiX[nX-1]) && (want>0 ? srsiX[nX-1]<80 : srsiX[nX-1]>20);
          const votes5 = (bbBreak?1:0)+(adxAligned?1:0)+(srsiOk?1:0);
          f5 = votes5>=2;
          f5Detail = 'BB '+(bbBreak?'breakout':'no breakout')+' \u00B7 ADX '+fmt(adxX.adx[nX-1],1)+' '+(adxAligned?'aligned':'not aligned')+' \u00B7 StochRSI '+fmt(srsiX[nX-1],0)+' '+(srsiOk?'not exhausted':'exhausted');
        }
      }catch(e){}
      /* R1 ROBUSTNESS \u2014 cascade must also hold on 2H: a signal living at exactly
         one timeframe is a curve-fit artifact, not a trend. */
      let r1=false, r1D='2H fetch failed';
      try{
        const h2=await getCandles(s.t.symbol,'2h',160); const c2=h2.map(r=>r.c);
        const a9=last(ema(c2,9)), a21=last(ema(c2,21)), a50=last(ema(c2,50));
        r1 = s.dir==='long' ? (a9>a21&&a21>a50) : (a9<a21&&a21<a50);
        r1D = `2H EMA9/21/50 ${r1?'aligned':'NOT aligned'}`;
      }catch(e){}
      /* R2 ROBUSTNESS \u2014 persistence: cascade held \u22653 consecutive closed 4H bars. */
      const age = cascadeAge(s.rows.map(r=>r.c), s.dir);
      const r2 = age>=3;
      s.fam=[
['G0','Anti-Chase Guard \u2014 price to EMA21 distance', true, `${fmt(s.distToAnchor,2)} ATR (limit \u2264 1.5, entry: ${s.entryType})`],
        ['F1','TREND family \u2014 2-of-3 majority: TSMOM \u00B7 1D side \u00B7 CUSUM', f1,
          `${trendVotes}/3 \u2192 TSMOM ${mTs?'\u2713':'\u2717'} (${tsD}) \u00B7 1D ${mD1?'\u2713':'\u2717'} \u00B7 CUSUM ${mCu?'\u2713':'\u2717'}${s.ev?` (${s.ev.dir.toUpperCase()} ${s.ev.barsAgo} bars ago)`:''}`],
        ['F2','POSITIONING family \u2014 funding tailwind (crowd pays you)', f2, s.fr!==null?`${fmt(s.fr,4)}%/interval`:'n/a'],
        ['F3','PARTICIPATION family \u2014 volume z > 1.0 or VWAP side', f3, `z ${fmt(s.vz,2)} \u00B7 ${vwapDetail}`],
        ['F4','STRUCTURE family \u2014 Donchian-20 breakout zone or R:R \u2265 3', f4, `Donchian ${mDc?'\u2713':'\u2717'} (${px(d20)}) \u00B7 R:R ${mRr?'\u2713':'\u2717'} (${fmt(s.rr,2)}R)`],
        ['F5','VOLATILITY/MOMENTUM family \u2014 2-of-3 majority: Bollinger breakout \u00B7 ADX trend+direction \u00B7 StochRSI not-exhausted', f5, f5Detail],
        ['R1','ROBUSTNESS \u2014 cascade also holds on 2H (anti curve-fit)', r1, r1D],
        ['R2','ROBUSTNESS \u2014 cascade age \u22653 closed 4H bars (anti flicker)', r2, `${age} bars`],
      ];
      s.famScore=(f1?1:0)+(f2?1:0)+(f3?1:0)+(f4?1:0)+(f5?1:0);
      s.robScore=(r1?1:0)+(r2?1:0);
      await sleep(60);
    }
    clean.sort((a,b)=> b.famScore-a.famScore || b.robScore-a.robScore || b.rr-a.rr);
  return {clean, breadth:{bull:breadthBull, total:breadthTotal}};
}
