(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./vendor/echarts-5.6.0.cjs'));
 else root.ReportPortfolio=factory(root.echarts);
})(typeof globalThis!=='undefined'?globalThis:this,function(echarts){
'use strict';
const VERSION='3.1.0',DAY=86400000,RANGES=['1W','1M','3M','6M','1Y','ALL'];
const colors={dark:{background:'#171717',text:'#f4f4f5',muted:'#a1a1aa',grid:'#303033',line:'#20d7a2',basis:'#73777b',loss:'#f17387'},light:{background:'#ffffff',text:'#202b3c',muted:'#687487',grid:'#e6e9ef',line:'#0b9278',basis:'#9099a8',loss:'#cf5269'}};
const copy=x=>JSON.parse(JSON.stringify(x));
if(echarts.setPlatformAPI)echarts.setPlatformAPI({measureText:(text,font)=>{const size=Number((font||'14px').match(/([\d.]+)px/)?.[1]||14);return {width:Math.max(...String(text).split('\n').map(line=>[...line].reduce((sum,c)=>sum+(c.codePointAt(0)>255?.99:c===' '?.33:/[MW@]/.test(c)?.87:/[ilI.,:;!]/.test(c)?.29:.56),0)))*size};}});
function numeric(value,name){if((typeof value!=='number'&&typeof value!=='string')||String(value).trim()===''||!/^\d*\.?\d+(?:e[+-]?\d+)?$/i.test(String(value)))throw Error(name+' 必须为非负有效金额');const n=Number(value);if(!Number.isFinite(n)||n>1e14)throw Error(name+' 超出范围');return n;}
function date(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('日期必须为 YYYY-MM-DD');const ms=Date.parse(value+'T00:00:00Z');if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==value)throw Error('日期无效：'+value);return ms;}
function normalize(input){
 if(!input||typeof input!=='object')throw Error('需要 Portfolio 项目');
 if(input.kind!=null&&input.kind!=='portfolio')throw Error('项目不是 Portfolio 数据');
 if(input.schemaVersion!=null&&input.schemaVersion!==1)throw Error('不支持的 Portfolio 项目版本');
 const raw=input.points||input.data;
 if(!Array.isArray(raw)||raw.length<2||raw.length>10000)throw Error('Portfolio 需要 2–10,000 条日期、value、basis 记录');
 const seen=new Set(),points=raw.map((r,i)=>{const ts=date(r.date);if(seen.has(ts))throw Error('同一日期不能重复：'+r.date);seen.add(ts);return {date:r.date,value:numeric(r.value,'第'+(i+1)+'条 value'),basis:numeric(r.basis,'第'+(i+1)+'条 basis')};}).sort((a,b)=>a.date.localeCompare(b.date));
 const settings=Object.assign({width:1100,height:640,theme:'dark',range:'1Y',motion:'auto'},input.style,input.settings);
 for(const k of Object.keys(settings))if(!['width','height','theme','range','motion'].includes(k))throw Error('未知 Portfolio 样式：'+k);
 for(const [k,min,max] of [['width',560,2400],['height',440,1200]]){settings[k]=Number(settings[k]);if(!Number.isFinite(settings[k])||settings[k]<min||settings[k]>max)throw Error(k+' 超出 '+min+'–'+max);}
 if(!colors[settings.theme]||!RANGES.includes(settings.range)||!['auto','off'].includes(settings.motion))throw Error('Portfolio 主题、时间范围或动效设置无效');
 const title=input.title??'资产组合';if(typeof title!=='string'||title.length>100)throw Error('标题应少于100字');
 const currency=input.currency??'USD';if(typeof currency!=='string'||!/^[A-Z]{3}$/.test(currency))throw Error('currency 应为三位货币代码');
 return {kind:'portfolio',chart:'portfolio',schemaVersion:1,title,currency,source:{file:String(input.source?.file||'用户提供数据').slice(0,200),simulated:input.source?.simulated===true},points,settings};
}
function statistics(points){let peak=0;return points.map(r=>{peak=Math.max(peak,r.value);return {...r,time:date(r.date),peak,drawdown:peak?r.value/peak-1:0,pnl:r.value-r.basis,pnlRatio:r.basis?r.value/r.basis-1:null};});}
function cutoff(time,range){if(range==='ALL')return -Infinity;if(range==='1W')return time-6*DAY;const end=new Date(time),months=({'1M':1,'3M':3,'6M':6,'1Y':12})[range],day=end.getUTCDate();end.setUTCDate(1);end.setUTCMonth(end.getUTCMonth()-months);const last=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1,0)).getUTCDate();end.setUTCDate(Math.min(day,last));return +end;}
function view(project){const p=normalize(project),full=statistics(p.points),end=full.at(-1).time,from=cutoff(end,p.settings.range),rows=full.filter(r=>r.time>=from);return {project:p,full,rows,last:rows.at(-1),maxDrawdown:Math.min(0,...rows.map(r=>r.drawdown)),globalMaxDrawdown:Math.min(0,...full.map(r=>r.drawdown))};}
function nearest(rows,time){let lo=0,hi=rows.length-1;while(lo<hi){const m=(lo+hi)>>1;if(rows[m].time<time)lo=m+1;else hi=m;}return lo>0&&Math.abs(rows[lo-1].time-time)<=Math.abs(rows[lo].time-time)?lo-1:lo;}
function money(n,currency,compact=true){const symbol=({USD:'$',CNY:'¥',EUR:'€',GBP:'£',JPY:'¥'})[currency]||currency+' ';const abs=Math.abs(n);return (n<0?'−':'')+symbol+(compact&&abs>=1e6?(abs/1e6).toFixed(2)+'M':compact&&abs>=1e3?(abs/1e3).toFixed(2)+'K':abs.toFixed(2));}
function percent(n){return n==null?'—':(n>0?'+':'')+(n*100).toFixed(2)+'%';}
function canonical(svg){let i=0;const ids=new Map([...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],'rp-'+i++]));const classes=new Map();return svg.replace(/id="([^"]+)"/g,(_,id)=>'id="'+ids.get(id)+'"').replace(/url\(#([^)]+)\)/g,(_,id)=>'url(#'+(ids.get(id)||id)+')').replace(/\bzr\d+-cls-\d+\b/g,name=>{if(!classes.has(name))classes.set(name,'rp-cls-'+classes.size);return classes.get(name);});}
function optionFor(project){
 const v=view(project),{rows,last,project:p}=v,c=colors[p.settings.theme],H=p.settings.height,W=p.settings.width;
 const start=rows[0].time,end=last.time,xMin=rows.length===1?start-DAY:start,xMax=rows.length===1?end+DAY:end;
 const font='Arial,PingFang SC,Microsoft YaHei,sans-serif';
 const xAxis=index=>({type:'time',gridIndex:index,min:xMin,max:xMax,splitNumber:W<720?3:6,boundaryGap:false,axisLine:{show:false},axisTick:{show:false},splitLine:{show:false},axisLabel:{show:index===1,color:c.muted,fontSize:11,formatter:time=>new Date(time).toISOString().slice(5,10)},axisPointer:{show:true,snap:true,lineStyle:{color:c.muted,type:'dashed',width:1},label:{show:index===1,backgroundColor:c.text,color:c.background,formatter:x=>new Date(x.value).toISOString().slice(0,10)}}});
 const option={animation:false,backgroundColor:c.background,textStyle:{fontFamily:font},grid:[{left:32,right:76,top:132,height:H*.43},{left:32,right:76,top:132+H*.43+22,height:H*.16}],xAxis:[xAxis(0),xAxis(1)],yAxis:[{type:'value',scale:true,position:'right',gridIndex:0,splitNumber:4,axisLine:{show:false},axisTick:{show:false},axisLabel:{color:c.muted,fontSize:11,formatter:n=>money(n,p.currency)},splitLine:{lineStyle:{color:c.grid,type:'dashed'}}},{type:'value',max:0,min:Math.min(-.01,v.maxDrawdown)*100*1.12,position:'right',gridIndex:1,splitNumber:2,axisLine:{show:false},axisTick:{show:false},axisLabel:{color:c.muted,fontSize:10,formatter:n=>n.toFixed(1)+'%'},splitLine:{show:false}}],axisPointer:{link:[{xAxisIndex:[0,1]}]},tooltip:{trigger:'axis',showContent:false,axisPointer:{type:'line',snap:true}},series:[
 {name:'资产价值',type:'line',showSymbol:rows.length===1,symbol:'circle',symbolSize:7,clip:true,smooth:false,lineStyle:{color:c.line,width:1.8},itemStyle:{color:c.line},areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:p.settings.theme==='dark'?'rgba(32,215,162,.28)':'rgba(11,146,120,.22)'},{offset:1,color:'rgba(32,215,162,0)'}]}},data:rows.map(r=>[r.time,r.value])},
 {name:'成本基准',type:'line',showSymbol:false,step:'end',itemStyle:{color:c.basis},lineStyle:{color:c.basis,width:1.3,type:'dashed'},data:rows.map(r=>[r.time,r.basis])},
 {name:'历史峰值回撤',type:'line',xAxisIndex:1,yAxisIndex:1,showSymbol:false,itemStyle:{color:c.loss},lineStyle:{color:c.loss,width:1},areaStyle:{color:p.settings.theme==='dark'?'rgba(241,115,135,.25)':'rgba(207,82,105,.18)'},data:rows.map(r=>[r.time,r.drawdown*100])}
 ],graphic:[
 {type:'text',left:32,top:26,style:{text:p.title+(p.source.simulated?' · 演示数据':''),fill:c.text,font:'13px '+font}},
 {type:'text',left:32,top:51,style:{text:money(last.value,p.currency),fill:c.text,font:'600 30px '+font}},
 {type:'text',left:Math.max(200,W*.26),top:64,style:{text:(last.pnl>=0?'+':'')+money(last.pnl,p.currency)+' ('+percent(last.pnlRatio)+')',fill:last.pnl>=0?c.line:c.loss,font:'12px '+font}},
 {type:'text',left:32,top:100,style:{text:last.date+'  成本 '+money(last.basis,p.currency)+'  回撤 '+percent(last.drawdown)+'  区间最大回撤 '+percent(v.maxDrawdown),fill:c.muted,font:'11px '+font}},
 {type:'text',left:32,top:132+H*.43+6,style:{text:'DRAWDOWN / 历史峰值回撤',fill:c.muted,font:'10px '+font}},
 {type:'text',left:W-158,top:26,style:{text:p.settings.range+' · '+rows.length+' 个观测点',fill:c.muted,font:'11px '+font}},
 {type:'text',left:32,bottom:12,style:{text:'来源：'+p.source.file+' · 相对成本差额不是时间加权收益率；回撤基于完整输入历史峰值',width:W-64,overflow:'break',lineHeight:14,fill:c.muted,font:'10px '+font}}
 ]};
 return {option,...v};
}
function render(input,overrides){const p=normalize(input);if(overrides?.width)p.settings.width=overrides.width;const result=optionFor(p);const instance=echarts.init(null,null,{renderer:'svg',ssr:true,width:p.settings.width,height:p.settings.height});let svg;try{instance.setOption(result.option);svg=canonical(instance.renderToSVGString({useViewBox:true}));}finally{instance.dispose();}const description=p.title+'；'+result.rows[0].date+' 至 '+result.last.date+'；资产价值、成本基准与历史峰值回撤';svg=svg.replace(/(<svg\b[^>]*>)/,m=>m+'<title>'+description.replace(/[<&]/g,c=>c==='<'?'&lt;':'&amp;')+'</title>');return {...result,svg,width:p.settings.width,height:p.settings.height,total:{count:p.points.length,value:result.last.value,basis:result.last.basis,maxDrawdown:result.maxDrawdown},summary:{groups:[]},groups:[],warnings:[p.source.simulated?'演示数据，非实际资产或业绩记录':'回撤基于完整输入历史峰值；不包含输入起始日前的历史']};}
return {VERSION,RANGES,colors,normalize,statistics,view,nearest,money,percent,render,optionFor,cutoff};
});
