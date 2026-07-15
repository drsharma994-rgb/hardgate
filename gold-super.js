/* SUPER GOLD MODULE - integrated feature. Software integration only;
   the trading/strategy logic, risk guidance, and broker order handoff are
   user-owned and NOT evaluated or endorsed. Manual verification required.
   Data: getCandles (Delta India XAUTUSD). DXY/TNX are manual dropdowns. */

(function(){
'use strict';
var _last = (typeof last==='function') ? last : function(a){ return a && a.length ? a[a.length-1] : NaN; };
var _ema = (typeof ema==='function') ? ema : function(src,n){ var out=[],k=2/(n+1),e=src[0]; for(var i=0;i<src.length;i++){ e=isFinite(src[i])?src[i]*k+e*(1-k):e; out.push(e);} return out; };
var _rsi = (typeof rsi==='function') ? rsi : function(src,n){ var out=[]; for(var i=0;i<src.length;i++) out.push(NaN); return out; };
var _atr = (typeof atr==='function') ? atr : function(rows,n){ var out=[]; for(var i=0;i<rows.length;i++){ out.push(i===0?rows[i].h-rows[i].l:Math.max(rows[i].h-rows[i].l,Math.abs(rows[i].h-rows[i-1].c),Math.abs(rows[i].l-rows[i-1].c))); } return _ema(out,n); };
var _adx = (typeof adx==='function') ? adx : function(rows,n){ return {adx:[],plusDI:[],minusDI:[]}; };
var _roc = (typeof roc==='function') ? roc : function(src,n){ var out=[]; for(var i=0;i<src.length;i++){ out.push(i>=n&&src[i-n]?((src[i]-src[i-n])/src[i-n])*100:NaN);} return out; };
var _cusumLast = (typeof cusumLast==='function') ? cusumLast : function(src,thr){ return null; };
var _lastSwing = (typeof lastSwing==='function') ? lastSwing : function(rows,dir,n){ var idx=n||30; if(dir==='long'){ var lo=Infinity; for(var i=Math.max(0,rows.length-idx);i<rows.length;i++) lo=Math.min(lo,rows[i].l); return lo;} var hi=-Infinity; for(var j=Math.max(0,rows.length-idx);j<rows.length;j++) hi=Math.max(hi,rows[j].h); return hi; };
var _bollinger = (typeof bollinger==='function') ? bollinger : function(src,n,m){ return {upper:[],mid:[],lower:[],widthPct:[]}; };
var _goldSession = (typeof goldSession==='function') ? goldSession : function(){ return {name:'OFF-SESSION',kz:false}; };
var _utcDayStart = (typeof utcDayStart==='function') ? utcDayStart : function(){ var d=new Date(); return Math.floor(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())/1000); };
function heikinAshi(rows){ var ha=[]; for(var i=0;i<rows.length;i++){ var c=(rows[i].o+rows[i].h+rows[i].l+rows[i].c)/4; var o=i===0?rows[i].o:(ha[i-1].o+ha[i-1].c)/2; var h=Math.max(rows[i].h,o,c); var l=Math.min(rows[i].l,o,c); ha.push({o:o,h:h,l:l,c:c}); } return ha; }
function hullMA(vals,p){ p=p||20; function wma(src,len){ var out=new Array(src.length).fill(NaN); for(var i=len-1;i<src.length;i++){ var num=0,den=0; for(var j=0;j<len;j++){num+=src[i-j]*(len-j);den+=(len-j);} out[i]=num/den; } return out; } var w1=wma(vals,Math.floor(p/2)); var w2=wma(vals,p); var raw=w1.map(function(v,i){return isFinite(v)&&isFinite(w2[i])?2*v-w2[i]:NaN;}); return wma(raw,Math.floor(Math.sqrt(p))); }
function donchian(rows,p){ p=p||20; var upper=new Array(rows.length).fill(NaN),lower=new Array(rows.length).fill(NaN),mid=new Array(rows.length).fill(NaN); for(var i=p-1;i<rows.length;i++){ var hh=Math.max.apply(null,rows.slice(i-p+1,i+1).map(function(r){return r.h;})); var ll=Math.min.apply(null,rows.slice(i-p+1,i+1).map(function(r){return r.l;})); upper[i]=hh; lower[i]=ll; mid[i]=(hh+ll)/2; } return {upper:upper,lower:lower,mid:mid}; }
function pivotPoints(d1){ if(!d1||d1.length<2) return {pp:NaN,r1:NaN,r2:NaN,s1:NaN,s2:NaN}; var p=d1[d1.length-2]; var pp=(p.h+p.l+p.c)/3; return {pp:pp,r1:2*pp-p.l,r2:pp+(p.h-p.l),s1:2*pp-p.h,s2:pp-(p.h-p.l)}; }
function williamsR(rows,p){ p=p||14; var out=new Array(rows.length).fill(NaN); for(var i=p-1;i<rows.length;i++){ var hh=Math.max.apply(null,rows.slice(i-p+1,i+1).map(function(r){return r.h;})); var ll=Math.min.apply(null,rows.slice(i-p+1,i+1).map(function(r){return r.l;})); if(hh!==ll) out[i]=-100*(hh-rows[i].c)/(hh-ll); } return out; }
function keltner(rows,p,mult){ p=p||20; mult=mult||1.5; var emaArr=_ema(rows.map(function(r){return r.c;}),p); var atrArr=_atr(rows,p); var upper=emaArr.map(function(v,i){return isFinite(v)&&isFinite(atrArr[i])?v+mult*atrArr[i]:NaN;}); var lower=emaArr.map(function(v,i){return isFinite(v)&&isFinite(atrArr[i])?v-mult*atrArr[i]:NaN;}); return {upper:upper,lower:lower,mid:emaArr}; }
function parabolicSAR(rows,step,max){ step=step||0.02; max=max||0.2; var sar=new Array(rows.length).fill(NaN); var ep=rows[0].h,af=step,trend=1,prevSAR=rows[0].l; for(var i=1;i<rows.length;i++){ if(trend===1){ sar[i]=prevSAR+af*(ep-prevSAR); if(rows[i].l<sar[i]){ trend=-1; sar[i]=ep; prevSAR=ep; ep=rows[i].l; af=step; } else { if(rows[i].h>ep){ep=rows[i].h; af=Math.min(af+step,max);} prevSAR=sar[i]; } } else { sar[i]=prevSAR+af*(ep-prevSAR); if(rows[i].h>sar[i]){ trend=1; sar[i]=ep; prevSAR=ep; ep=rows[i].h; af=step; } else { if(rows[i].l<ep){ep=rows[i].l; af=Math.min(af+step,max);} prevSAR=sar[i]; } } } return {sar:sar,trend:trend}; }
function cci(rows,p){ p=p||20; var out=new Array(rows.length).fill(NaN); var tp=rows.map(function(r){return (r.h+r.l+r.c)/3;}); for(var i=p-1;i<rows.length;i++){ var slice=tp.slice(i-p+1,i+1); var m=slice.reduce(function(a,b){return a+b;},0)/slice.length; var md=slice.reduce(function(a,b){return a+Math.abs(b-m);},0)/slice.length; if(md>0) out[i]=(tp[i]-m)/(0.015*md); } return out; }
function ichimoku(rows){ var c=rows.map(function(r){return r.c;}),h=rows.map(function(r){return r.h;}),l=rows.map(function(r){return r.l;}); var n=c.length; var tenkan=new Array(n).fill(NaN),kijun=new Array(n).fill(NaN),senkouA=new Array(n).fill(NaN),senkouB=new Array(n).fill(NaN),chikou=new Array(n).fill(NaN); for(var i=0;i<n;i++){ if(i>=8) tenkan[i]=(Math.max.apply(null,h.slice(i-8,i+1))+Math.min.apply(null,l.slice(i-8,i+1)))/2; if(i>=25) kijun[i]=(Math.max.apply(null,h.slice(i-25,i+1))+Math.min.apply(null,l.slice(i-25,i+1)))/2; if(i>=25) senkouA[i]=(tenkan[i]+kijun[i])/2; if(i>=52) senkouB[i]=(Math.max.apply(null,h.slice(i-52,i+1))+Math.min.apply(null,l.slice(i-52,i+1)))/2; chikou[i]=c[i]; } return {tenkan:tenkan,kijun:kijun,senkouA:senkouA,senkouB:senkouB,chikou:chikou}; }
function fibLevels(high,low){ var diff=high-low; return {'0':high,'23.6':high-diff*0.236,'38.2':high-diff*0.382,'50':high-diff*0.5,'61.8':high-diff*0.618,'78.6':high-diff*0.786,'100':low}; }
function vwap(rows,look){ look=look||rows.length; var n=rows.length; if(n<2) return new Array(n).fill(NaN); var out=new Array(n).fill(NaN); for(var i=0;i<n;i++){ var start=Math.max(0,i-look+1); var pv=0,vv=0; for(var j=start;j<=i;j++){ var typ=(rows[j].h+rows[j].l+rows[j].c)/3; pv+=typ*rows[j].v; vv+=rows[j].v; } if(vv>0) out[i]=pv/vv; } return out; }
function wyckoffPhase(rows){ if(rows.length<60) return {phase:'unknown',label:'UNKNOWN'}; var c=rows.map(function(r){return r.c;}),n=c.length; var bb=_bollinger(c,20,2); var vols=rows.slice(-20).map(function(r){return r.v;}).filter(function(v){return v>0;}); var avgVol=vols.length?vols.reduce(function(a,b){return a+b;},0)/vols.length:0; var recentVol=rows.slice(-5).map(function(r){return r.v;}).filter(function(v){return v>0;}); var rVol=recentVol.length?recentVol.reduce(function(a,b){return a+b;},0)/recentVol.length:0; var inRange=bb.mid[n-1]?Math.abs(c[n-1]-bb.mid[n-1])/bb.mid[n-1]<0.02:false; var spring=isFinite(bb.lower[n-1])&&c[n-1]<bb.lower[n-1]&&c[n-2]>c[n-1]&&c[n-1]>rows[n-1].l; if(spring) return {phase:'spring',label:'WYCKOFF SPRING - potential accumulation'}; if(inRange&&rVol<avgVol*0.7) return {phase:'compression',label:'COMPRESSION - possible accumulation/distribution'}; if(isFinite(bb.upper[n-1])&&c[n-1]>bb.upper[n-1]&&rVol>avgVol*1.3) return {phase:'markup',label:'MARKUP - trending'}; if(isFinite(bb.lower[n-1])&&c[n-1]<bb.lower[n-1]&&rVol>avgVol*1.3) return {phase:'markdown',label:'MARKDOWN - trending down'}; return {phase:'neutral',label:'NEUTRAL - no clear Wyckoff phase'}; }
function isNFPWeek(){ var d=new Date(); var firstDay=new Date(d.getFullYear(),d.getMonth(),1); var firstFriday=1+((5-firstDay.getDay()+7)%7); var nfpDay=new Date(d.getFullYear(),d.getMonth(),firstFriday); var diff=Math.floor((d-nfpDay)/86400000); return diff>=-1&&diff<=1; }
function isEventWindow(){ var d=new Date(); var day=d.getUTCDay(); var hour=d.getUTCHours(); if(day===5&&isNFPWeek()&&hour>=12&&hour<=15) return {active:true,event:'NFP WINDOW'}; if(day===3&&hour>=18&&hour<=21) return {active:false,event:'POSSIBLE FOMC - verify calendar'}; return {active:false,event:'none'}; }
async function runSuperGold(){
  var btn=$('superGoldRun'); if(btn) btn.disabled=true; setProg('sgProg',0.05);
  var st=$('sgStat'); if(st) st.textContent='loading XAUUSD data...';
  var _savedEx=S.exchange;
  try{
    S.exchange='delta';
    var _tf=await Promise.all([getCandles('XAUTUSD','1d',1500).catch(function(){return [];}),getCandles('XAUTUSD','1d',260).catch(function(){return [];}),getCandles('XAUTUSD','4h',300).catch(function(){return [];}),getCandles('XAUTUSD','1h',200).catch(function(){return [];}),getCandles('XAUTUSD','15m',200).catch(function(){return [];})]);
    var w1=_tf[0],d1=_tf[1],h4=_tf[2],h1=_tf[3],m15=_tf[4];
    setProg('sgProg',0.25);
    if(d1.length<60||h4.length<210||m15.length<40){ if(st) st.textContent='not enough XAUUSD history from Delta India'; return; }
    var sess=_goldSession(); if($('sgSess')) $('sgSess').innerHTML='session <b>'+sess.name+'</b>';
    var nfp=isNFPWeek(); if($('sgNfp')) $('sgNfp').innerHTML='NFP <b>'+(nfp?'THIS WEEK - STAND ASIDE':'clear')+'</b>';
    var dxySelect=$('sgDxySelect'); var dxyDir=dxySelect?dxySelect.value:'n/a'; if($('sgDxy')) $('sgDxy').innerHTML='DXY <b>'+dxyDir.toUpperCase()+'</b>';
    var tnxSelect=$('sgTnxSelect'); var tnxDir=tnxSelect?tnxSelect.value:'n/a'; if($('sgTnx')) $('sgTnx').innerHTML='TNX <b>'+tnxDir.toUpperCase()+'</b>';
    setProg('sgProg',0.35);
    var wStruct='mixed',wHigh=NaN,wLow=NaN;
    if(w1.length>=100){ var weeks=[]; var curWeek={h:-Infinity,l:Infinity,c:null}; for(var i=0;i<w1.length;i++){ curWeek.h=Math.max(curWeek.h,w1[i].h); curWeek.l=Math.min(curWeek.l,w1[i].l); curWeek.c=w1[i].c; if(i%5===4||i===w1.length-1){ weeks.push({h:curWeek.h,l:curWeek.l,c:curWeek.c}); curWeek={h:-Infinity,l:Infinity,c:null}; } } if(weeks.length>=10){ var wc=weeks.map(function(w){return w.c;}); var we9=_last(_ema(wc,9)),we21=_last(_ema(wc,21)); wStruct=_last(wc)>we9&&we9>we21?'long':(_last(wc)<we9&&we9<we21?'short':'mixed'); wHigh=Math.max.apply(null,weeks.slice(-4).map(function(w){return w.h;})); wLow=Math.min.apply(null,weeks.slice(-4).map(function(w){return w.l;})); } }
    var pdc=d1[d1.length-1]; var PDH=pdc.h,PDL=pdc.l;
    var day0now=_utcDayStart(); var day0=(nowSec()<day0now+7*3600)?day0now-86400:day0now;
    var asia=m15.filter(function(r){return r.t>=day0&&r.t<day0+7*3600;}); var asiaHi=asia.length?Math.max.apply(null,asia.map(function(r){return r.h;})):NaN; var asiaLo=asia.length?Math.min.apply(null,asia.map(function(r){return r.l;})):NaN;
    var eventWin=isEventWindow(); var piv=pivotPoints(d1);
    var c4=h4.map(function(r){return r.c;}),c1=d1.map(function(r){return r.c;});
    var e9=_last(_ema(c4,9)),e21=_last(_ema(c4,21)),e50=_last(_ema(c4,50)),e200=_last(_ema(c4,200));
    var a4=_last(_atr(h4,14)); var e50d=_last(_ema(c1,50)),pd=_last(c1); var r4=_last(_rsi(c4,14));
    var casc=e9>e21&&e21>e50?'long':(e9<e21&&e21<e50?'short':'mixed');
    var spreadOk=isFinite(a4)&&Math.abs(e21-e50)>=0.25*a4; var dSide=pd>e50d?'long':'short'; var n=c4.length-1;
    var haOk=false,haDetail='insufficient history'; if(h4.length>=10){ var ha=heikinAshi(h4); var last3=ha.slice(-3); var allGreen=last3.every(function(b){return b.c>b.o;}); var allRed=last3.every(function(b){return b.c<b.o;}); haDetail='last 3 HA: '+(allGreen?'all green':(allRed?'all red':'mixed')); haOk=(casc==='long'&&allGreen)||(casc==='short'&&allRed); }
    var hullOk=false,hullDetail='insufficient history'; if(c4.length>=30){ var hma=hullMA(c4,20); var hNow=_last(hma),hPrev=hma[hma.length-2]; hullOk=(casc==='long'&&hNow>hPrev)||(casc==='short'&&hNow<hPrev); hullDetail='Hull MA '+px(hNow)+' - slope '+(hNow>hPrev?'rising':'falling'); }
    var donOk=false,donDetail='insufficient history'; if(h4.length>=25){ var dch=donchian(h4,20); var pNowD=c4[n]; donOk=(casc==='long'&&pNowD>=dch.upper[n]-0.3*a4)||(casc==='short'&&pNowD<=dch.lower[n]+0.3*a4); donDetail='Donchian-20: upper '+px(dch.upper[n])+' - lower '+px(dch.lower[n])+' - price '+px(pNowD); }
    var psarOk=false,psarDetail='insufficient history'; if(h4.length>=10){ var ps=parabolicSAR(h4,0.02,0.2); psarOk=(casc==='long'&&ps.trend===1)||(casc==='short'&&ps.trend===-1); psarDetail='SAR trend '+(ps.trend===1?'UP':'DOWN')+' - SAR '+px(ps.sar[ps.sar.length-1]); }
    var willOk=false,willDetail='insufficient history'; if(h4.length>=14){ var wr=williamsR(h4,14); var wNow=_last(wr); willDetail='Williams %R '+fmt(wNow,1); willOk=(casc==='long'&&wNow>-20)||(casc==='short'&&wNow<-80)?false:true; willDetail+=' - '+(willOk?'not exhausted':'EXHAUSTED'); }
    var cciOk=false,cciDetail='insufficient history'; if(h4.length>=20){ var cc=cci(h4,20); var ccNow=_last(cc); cciDetail='CCI(20) '+fmt(ccNow,1); cciOk=(casc==='long'&&ccNow>100)||(casc==='short'&&ccNow<-100)?true:(((casc==='long'&&ccNow<-100)||(casc==='short'&&ccNow>100))?false:true); cciDetail+=' - '+(cciOk?'momentum aligned':'momentum against'); }
    var keltOk=false,keltDetail='insufficient history'; if(h4.length>=25){ var kc=keltner(h4,20,1.5); var pNowK=c4[n]; keltOk=(casc==='long'&&pNowK>kc.mid[n])||(casc==='short'&&pNowK<kc.mid[n]); keltDetail='Keltner: price '+px(pNowK)+' - mid '+px(kc.mid[n])+' - upper '+px(kc.upper[n]); }
    var ichiOk=false,ichiDetail='insufficient history'; if(h4.length>=60){ var ic=ichimoku(h4); var priceAboveKumo=isFinite(ic.senkouA[n-26])&&isFinite(ic.senkouB[n-26])&&c4[n]>Math.max(ic.senkouA[n-26],ic.senkouB[n-26]); var priceBelowKumo=isFinite(ic.senkouA[n-26])&&isFinite(ic.senkouB[n-26])&&c4[n]<Math.min(ic.senkouA[n-26],ic.senkouB[n-26]); var tkCross=ic.tenkan[n]>ic.kijun[n]; ichiDetail='TK cross '+(tkCross?'bullish':'bearish')+' - Kumo '+(priceAboveKumo?'above':(priceBelowKumo?'below':'inside')); if(casc==='long') ichiOk=tkCross&&priceAboveKumo; if(casc==='short') ichiOk=!tkCross&&priceBelowKumo; }
    var adx4=_adx(h4,14); var adxVal=adx4.adx[n]; var diPlus=adx4.plusDI[n]; var diMinus=adx4.minusDI[n]; var adxOk=isFinite(adxVal)&&adxVal>=25&&((casc==='long'&&diPlus>diMinus)||(casc==='short'&&diMinus>diPlus));
    var fibDetail='n/a',fibOk=false; if(isFinite(wHigh)&&isFinite(wLow)&&casc!=='mixed'){ var fib=fibLevels(wHigh,wLow); var pNowF=c4[n]; var inZone=pNowF>=fib['38.2']&&pNowF<=fib['61.8']; fibDetail='38.2% '+px(fib['38.2'])+' - 50% '+px(fib['50'])+' - 61.8% '+px(fib['61.8']); fibOk=inZone; }
    var wyk=wyckoffPhase(h4);
    var dxyOk='na',dxyGateDetail='manual input - select DXY trend above'; if(dxyDir!=='n/a'&&casc!=='mixed'){ dxyOk=((casc==='long'&&dxyDir==='bearish')||(casc==='short'&&dxyDir==='bullish'))?'pass':'veto'; dxyGateDetail=dxyDir.toUpperCase()+(casc==='long'?' - gold longs want DXY weak':' - gold shorts want DXY strong'); }
    var tnxOk='na',tnxGateDetail='manual input - select TNX trend above'; if(tnxDir!=='n/a'&&casc!=='mixed'){ tnxOk=((casc==='long'&&tnxDir==='falling')||(casc==='short'&&tnxDir==='rising'))?'pass':'veto'; tnxGateDetail=tnxDir.toUpperCase()+(casc==='long'?' - gold longs want yields falling':' - gold shorts want yields rising'); }
    var sg=[];
    sg.push(['SGS1','Weekly structure (5-day EMA9/21 approx)',(wStruct!=='mixed'&&wStruct===dSide)?'pass':'veto','Weekly -> '+wStruct.toUpperCase()+' - 1D -> '+dSide.toUpperCase()]);
    sg.push(['SGS2','4H EMA cascade with real spread',(casc!=='mixed'&&spreadOk)?'pass':'veto','9/21/50 -> '+casc.toUpperCase()]);
    sg.push(['SGS3','1D side agrees',(casc!=='mixed'&&casc===dSide)?'pass':'veto','1D -> '+dSide.toUpperCase()]);
    sg.push(['SGS4','Heikin Ashi trend confirmed',haOk?'pass':'veto',haDetail]);
    sg.push(['SGS5','Hull MA slope aligned',hullOk?'pass':'veto',hullDetail]);
    sg.push(['SGS6','Donchian-20 breakout / near breakout',donOk?'pass':'veto',donDetail]);
    sg.push(['SGS7','Parabolic SAR not flipped',psarOk?'pass':'veto',psarDetail]);
    sg.push(['SGS8','Ichimoku Cloud aligned',ichiOk?'pass':'veto',ichiDetail]);
    sg.push(['SGS9','ADX >= 25 with DI aligned',adxOk?'pass':'veto','ADX '+fmt(adxVal,1)+' - DI+ '+fmt(diPlus,1)+' - DI- '+fmt(diMinus,1)]);
    sg.push(['SGS10','DXY anti-correlation',dxyOk,dxyGateDetail]);
    sg.push(['SGS11','TNX (real yield) direction aligned',tnxOk,tnxGateDetail]);
    var rsiVeto=(casc==='long'&&r4>70)||(casc==='short'&&r4<30); sg.push(['SGS12','4H RSI exhaustion guard',rsiVeto?'veto':'pass','RSI14 '+fmt(r4,1)]);
    sg.push(['SGS13','Williams %R not extreme',willOk?'pass':'veto',willDetail]);
    sg.push(['SGS14','CCI momentum aligned',cciOk?'pass':'veto',cciDetail]);
    sg.push(['SGS15','Keltner position (price vs middle band)',keltOk?'pass':'veto',keltDetail]);
    sg.push(['SGS16','Fibonacci pullback zone (weekly range)',fibOk?'pass':'na',fibDetail]);
    sg.push(['SGS17','Wyckoff phase not against position',((wyk.phase==='markup'&&casc==='long')||(wyk.phase==='markdown'&&casc==='short')||(wyk.phase!=='markup'&&wyk.phase!=='markdown'))?'pass':'veto',wyk.label]);
    sg.push(['SGS18','NFP/Event stand-aside',!eventWin.active?'pass':'veto',eventWin.active?eventWin.event+' - no new positions':'calendar clear']);
    var r30g=_last(_roc(c1,30)),r90g=_last(_roc(c1,90)); var gs5='na'; if(casc!=='mixed'&&isFinite(r30g)&&isFinite(r90g)){ var want=casc==='long'?1:-1; var agree=(Math.sign(r30g)===want?1:0)+(Math.sign(r90g)===want?1:0); gs5=agree===2?'pass':(agree===0?'veto':'na'); } sg.push(['SGS19','TSMOM 30/90d sign',gs5,'30d '+pct(r30g,1)+' - 90d '+pct(r90g,1)]);
    var evG=_cusumLast(c4.slice(-120),1); var gs6='na'; if(evG&&evG.barsAgo<=20&&casc!=='mixed') gs6=evG.dir===casc?'pass':'veto'; sg.push(['SGS20','CUSUM event alignment',gs6,evG?evG.dir.toUpperCase()+' event '+evG.barsAgo+' bars ago':'no recent event']);
    var entry=null,stop=null,t1=null,t2=null;
    if(casc!=='mixed'){ stop=_lastSwing(h4,casc,30); entry=_last(c4); var risk=Math.abs(entry-stop); var room=casc==='long'?Math.max.apply(null,h4.slice(-120).map(function(r){return r.h;}))-entry:entry-Math.min.apply(null,h4.slice(-120).map(function(r){return r.l;})); var rrOk=risk>0&&room/risk>=2; sg.push(['SGS21','Structural R:R >= 2',rrOk?'pass':'veto',risk>0?fmt(room/risk,2)+'R room':'no structure']); if(rrOk){ t1=casc==='long'?entry+2*risk:entry-2*risk; t2=casc==='long'?entry+3*risk:entry-3*risk; } } else { sg.push(['SGS21','Structural R:R >= 2','na','no direction']); }
    var veto=sg.some(function(x){return x[2]==='veto';}); var sVerdict=veto?'aside':casc;
    var swingPlanHtml='';
    if(!veto&&casc!=='mixed'&&entry!=null&&stop!=null&&t1!=null){ logSetup('XAUUSD',casc,'supergold-swing',entry,stop,t1); swingPlanHtml='<div class="plan">'+planBlock(casc,entry,stop,t1,t2||t1)+'</div>'+'<button class="toTrade" onclick="toTrade(\'XAUUSD\',\''+casc+'\','+entry+','+stop+','+t1+')">SEND TO TRADE PLAN (XM 360)</button>'+'<div class="note" style="margin-top:6px">XM 360: copy ticket to MT4/MT5. Verify spread under 35 pips. Set SL and TP before executing. Max 1% risk.</div>'; }
    if($('sgSwingOut')) $('sgSwingOut').innerHTML='<div class="ledger">'+sg.map(function(x){return gateRow(x[0],x[1],x[2],x[3]);}).join('')+'</div>'+'<div class="verdict '+(sVerdict==='aside'?'aside':sVerdict)+'">'+'<div class="vword">'+(sVerdict==='aside'?'STAND ASIDE':sVerdict.toUpperCase())+'</div>'+'<div class="vwhy">'+(sVerdict==='aside'?'Super Gold swing gates did not all clear. Macro headwinds (DXY, yields) or indicator misalignment may be blocking - those are vetoes, not signal failures.':'All 21 swing gates cleared. Verify DXY, yields, and calendar manually before sizing on XM 360 - the ledger cannot see everything.')+'</div>'+'</div>'+swingPlanHtml;
    setProg('sgProg',0.65);
    var c15=m15.map(function(r){return r.c;}),n15=c15.length; var lastClose=c15[n15-1];
    var atr15arr=_atr(m15,14),a15=_last(atr15arr); var vbase=atr15arr.slice(-96).filter(isFinite).sort(function(x,y){return x-y;}); var aMed=vbase.length?vbase[Math.floor(vbase.length/2)]:NaN; var volAlive=isFinite(a15)&&isFinite(aMed)&&a15>=0.8*aMed;
    var e21h1=_last(_ema(h1.map(function(r){return r.c;}),21)); var look=m15.slice(-12);
    var haScalpOk=false,haScalpDetail='insufficient history'; if(m15.length>=5){ var ha15=heikinAshi(m15); var last2=ha15.slice(-2); haScalpOk=(casc==='long'&&last2.every(function(b){return b.c>b.o;}))||(casc==='short'&&last2.every(function(b){return b.c<b.o;})); haScalpDetail='last 2 HA(15m): '+(haScalpOk?'trend aligned':'mixed / against'); }
    var will15Ok=false,will15Detail='insufficient history'; if(m15.length>=14){ var wr15=williamsR(m15,14); var w15=_last(wr15); will15Ok=(casc==='long'&&w15>-20)?false:((casc==='short'&&w15<-80)?false:true); will15Detail='W%R(15m) '+fmt(w15,1)+' - '+(will15Ok?'not extreme':'EXTREME'); }
    var svwapOk=false,svwapDetail='n/a'; if(sess.kz&&h1.length>=30){ var kzStart=nowSec()-3*3600; var kzRows=m15.filter(function(r){return r.t>=kzStart;}); if(kzRows.length>=4){ var sv=vwap(kzRows,kzRows.length); var svNow=sv[sv.length-1]; var dist=Math.abs(lastClose-svNow)/svNow*100; svwapOk=dist<0.15; svwapDetail='session VWAP '+px(svNow)+' - price '+px(lastClose)+' - dist '+fmt(dist,3)+'% (limit 0.15%)'; } }
    function sgScalpLedger(dir){
      var lvls=dir==='long'?[['Asia low',asiaLo],['PDL',PDL]]:[['Asia high',asiaHi],['PDH',PDH]];
      var swept=null,sweptLvl=NaN,ext=NaN;
      for(var li=0;li<lvls.length;li++){ var nm=lvls[li][0],lv=lvls[li][1]; if(!isFinite(lv)) continue; if(dir==='long'&&Math.min.apply(null,look.map(function(r){return r.l;}))<lv){ swept=nm; sweptLvl=lv; ext=Math.min.apply(null,look.map(function(r){return r.l;})); break; } if(dir==='short'&&Math.max.apply(null,look.map(function(r){return r.h;}))>lv){ swept=nm; sweptLvl=lv; ext=Math.max.apply(null,look.map(function(r){return r.h;})); break; } }
      var reclaimed=swept&&(dir==='long'?lastClose>sweptLvl:lastClose<sweptLvl); var htfOk=dir==='long'?lastClose>e21h1:lastClose<e21h1;
      var g=[];
      g.push(['SGC1','Kill zone active',sess.kz?'pass':'veto',sess.name]);
      g.push(['SGC2','Liquidity sweep of '+(dir==='long'?'Asia low / PDL':'Asia high / PDH')+' (last 3h)',swept?'pass':'veto',swept?'swept '+swept+' '+px(sweptLvl)+' - extreme '+px(ext):'no sweep']);
      g.push(['SGC3','Closed 15m bar reclaimed the level',reclaimed?'pass':'veto',swept?'close '+px(lastClose)+' vs '+px(sweptLvl):'-']);
      g.push(['SGC4','1H context not fighting (close vs 1H EMA21)',htfOk?'pass':'veto','1H EMA21 '+px(e21h1)]);
      g.push(['SGC5','Volatility alive (15m ATR >= 0.8x median)',volAlive?'pass':'veto','ATR '+px(a15)+' - med '+px(aMed)]);
      g.push(['SGC6','15m Heikin Ashi aligned',haScalpOk?'pass':'veto',haScalpDetail]);
      g.push(['SGC7','15m Williams %R not extreme',will15Ok?'pass':'veto',will15Detail]);
      g.push(['SGC8','Session VWAP not extended',svwapOk?'pass':'na',svwapDetail]);
      g.push(['SGC9','DXY 4H momentum aligned',dxyOk,dxyGateDetail]);
      g.push(['SGC10','NFP/Event stand-aside',!eventWin.active?'pass':'veto',eventWin.active?eventWin.event+' - no new positions':'calendar clear']);
      var planHtml='';
      if(swept&&reclaimed){ var stopS=dir==='long'?ext-0.25*a15:ext+0.25*a15; var riskS=Math.abs(lastClose-stopS); var oppoCands=(dir==='long'?[asiaHi,PDH]:[asiaLo,PDL]).filter(isFinite); var oppo=oppoCands.length?(dir==='long'?Math.min.apply(null,oppoCands):Math.max.apply(null,oppoCands)):NaN; var roomS=dir==='long'?oppo-lastClose:lastClose-oppo; var rrOkS=riskS>0&&isFinite(roomS)&&roomS>=2*riskS; g.push(['SGC11','2R fits before opposite liquidity pool',rrOkS?'pass':'veto',riskS>0&&isFinite(roomS)?'room '+px(roomS)+' vs 2R '+px(2*riskS)+' (pool '+px(oppo)+')':'-']); if(rrOkS&&!g.some(function(x){return x[2]==='veto';})){ var t1S=dir==='long'?lastClose+2*riskS:lastClose-2*riskS; logSetup('XAUUSD',dir,'supergold-scalp',lastClose,stopS,t1S); planHtml='<div class="plan">'+planBlock(dir,lastClose,stopS,t1S,oppo)+'</div>'+'<button class="toTrade" onclick="toTrade(\'XAUUSD\',\''+dir+'\','+lastClose+','+stopS+','+t1S+')">SEND TO TRADE PLAN (XM 360)</button>'+'<div class="note" style="margin-top:6px">XM 360 scalp: use 15m or 5m chart. Entry on reclaim close. Stop beyond sweep extreme. Target opposite liquidity. Spread check mandatory.</div>'; } } else { g.push(['SGC11','2R fits before opposite pool','na','needs completed sweep + reclaim first']); }
      var vet=g.some(function(x){return x[2]==='veto';});
      return '<div style="margin:2px 0 6px;font-size:11px;letter-spacing:.12em;color:var(--'+(dir==='long'?'long':'short')+')">'+dir.toUpperCase()+' SCENARIO</div>'+'<div class="ledger" style="margin-bottom:10px">'+g.map(function(x){return gateRow(x[0],x[1],x[2],x[3]);}).join('')+'</div>'+'<div class="verdict '+(vet?'aside':dir)+'" style="margin:0 0 16px"><div class="vword" style="font-size:16px">'+(vet?'NO TRADE':dir.toUpperCase()+' VALID')+'</div></div>'+planHtml;
    }
    if($('sgScalpOut')) $('sgScalpOut').innerHTML=sgScalpLedger('long')+sgScalpLedger('short'); setProg('sgProg',0.85);
    if($('sgMacroOut')) $('sgMacroOut').innerHTML=
      '<div class="panel">'+
      '<div class="kv"><span class="k">Weekly Structure</span><span class="v">'+wStruct.toUpperCase()+'</span></div>'+
      '<div class="kv"><span class="k">Weekly Range</span><span class="v">'+px(wLow)+' - '+px(wHigh)+'</span></div>'+
      '<div class="kv"><span class="k">Wyckoff Phase</span><span class="v">'+wyk.label+'</span></div>'+
      '<div class="kv"><span class="k">Pivot (daily)</span><span class="v">PP '+px(piv.pp)+' - R1 '+px(piv.r1)+' - S1 '+px(piv.s1)+'</span></div>'+
      '</div>'+
      '<div class="panel">'+
      '<div class="kv"><span class="k">DXY Trend</span><span class="v">'+dxyDir.toUpperCase()+'</span></div>'+
      '<div class="kv"><span class="k">TNX Yield</span><span class="v">'+tnxDir.toUpperCase()+'</span></div>'+
      '<div class="kv"><span class="k">NFP This Week</span><span class="v" style="color:'+(nfp?'var(--short)':'var(--pass)')+'">'+(nfp?'YES - STAND ASIDE':'No')+'</span></div>'+
      '</div>'+
      '<div class="panel">'+
      '<div class="kv"><span class="k">Session</span><span class="v">'+sess.name+'</span></div>'+
      '<div class="kv"><span class="k">Event Window</span><span class="v" style="color:'+(eventWin.active?'var(--short)':'var(--pass)')+'">'+(eventWin.active?eventWin.event:'Clear')+'</span></div>'+
      '<div class="kv"><span class="k">XM 360 Spread Check</span><span class="v">Verify under 35 pips before entry</span></div>'+
      '</div>';
    if(st) st.textContent='evaluated - closed bars only - '+new Date().toTimeString().slice(0,5)+' IST';
  }catch(e){ if(st) st.textContent='Super Gold eval failed: '+e.message; console.error(e); }
  finally{ S.exchange=_savedEx; setProg('sgProg',null); setTimeout(function(){ if(btn) btn.disabled=false; },8000); }
}
window.runSuperGold = runSuperGold;
})();
