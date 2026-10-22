(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./vendor/echarts-5.6.0.cjs'));
 else root.ReportCharts=factory(root.echarts);
})(typeof globalThis!=='undefined'?globalThis:this,function(echarts){
'use strict';
const VERSION='3.1.0';
const fonts={
 sans:'PingFang SC,Microsoft YaHei,Noto Sans CJK SC,sans-serif',
 system:'Arial,PingFang SC,Microsoft YaHei,sans-serif',
 serif:'Georgia,Songti SC,SimSun,serif'
};
const themes={
 spectrum:{primary:'#5B86E5',costColor:'#E7AE35',profitColor:'#169E88',gapColor:'#9875C9',palette:['#5B86E5','#E7AE35','#169E88','#9875C9','#DF785A','#658C9D']},
 business:{primary:'#4769D8',costColor:'#35557D',profitColor:'#19A58D',gapColor:'#D7AE67',palette:['#4769D8','#4C91C5','#19A58D','#7882BF','#A99573','#507F91']},
 vivid:{primary:'#6662D9',costColor:'#468CCB',profitColor:'#14A995',gapColor:'#DDA65A',palette:['#6662D9','#329FC3','#17A78F','#E19C52','#C9759A','#7A8DCC']}
};
const defaults={title:'',subtitle:'期间未提供',unit:'元',scale:10000,decimals:1,dimension:'industry',tier:'all',chart:'stack',top:5,theme:'spectrum',
 primary:themes.spectrum.primary,costColor:themes.spectrum.costColor,profitColor:themes.spectrum.profitColor,gapColor:themes.spectrum.gapColor,
 fontFamily:'sans',fontSize:14,titleSize:27,valueSize:13,tableFontSize:13,tableRowHeight:34,tableGap:32,
 titleGap:17,plotGap:28,labelGap:14,rowGap:19,barWidth:64,orientation:'vertical',fill:'gradient',rankColors:'category',width:1100,
 htmlMode:'live',motion:'auto',bins:12,stackBasis:'reported',showTable:true,height:680,titleAlign:'left',showValues:true,annotations:[],manualLayout:{},seriesNames:{},titleMap:{},annotationSets:{}};
const names={revenue:'收入',cost:'成本',profit:'毛利（含交付）',margin:'毛利率',share:'收入占比',gap:'未归因差额',aligned:'推导成本（收入−毛利）'};
const chartNames={revenue:'行业收入排行',cost:'行业成本排行',profit:'行业毛利排行',compare:'行业经营对比',share:'行业收入构成',margin:'行业毛利率排行',stack:'行业收入结构',pie:'行业收入占比（饼图）',lollipop:'行业收入棒棒糖图',pareto:'行业收入帕累托分析',scatter:'行业成本与毛利关系',bubble:'行业收入与毛利率分布',histogram:'客户收入分布',boxplot:'各行业客户收入分布',treemap:'行业收入矩形树图',waterfall:'行业收入贡献瀑布图'};
const dimensionNames={industry:'行业L1',strategic:'客户战略行业',major:'战略行业大类'};
const cp=x=>JSON.parse(JSON.stringify(x));
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function number(v,label){
 if(typeof v!=='number'&&(typeof v!=='string'||!v.trim()||!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(v.trim())))throw Error((label||'金额')+' 必须是有效数字');
 const n=Number(v);if(!Number.isFinite(n)||Math.abs(n)>1e14)throw Error((label||'金额')+' 超出范围');return n;
}
function normalize(input){
 if(!input||typeof input!=='object')throw Error('需要 JSON 图表请求');
 if(input.schemaVersion!=null&&![1,2].includes(input.schemaVersion))throw Error('不支持的项目版本');
 let rows=input.rows;
 if(!rows&&Array.isArray(input.data))rows=input.data.map((r,i)=>({id:'item-'+i,customer:r.customer||r.industry,industry:r.industry,strategic:r.strategic||r.industry,tier:r.tier||'全部客户',revenue:r.revenue,cost:r.cost,profit:r.profit}));
 if(!Array.isArray(rows)||!rows.length||rows.length>10000)throw Error('数据应包含 1–10,000 条记录');
 rows=cp(rows);const ids=new Set();
 rows.forEach((r,i)=>{
  r.id=r.id||'row-'+i;
  if(typeof r.id!=='string'||ids.has(r.id))throw Error('条目编号重复或无效');ids.add(r.id);
  for(const k of ['customer','industry','strategic','tier']){r[k]=r[k]||({customer:r.industry,strategic:r.industry,tier:'全部客户'})[k];if(typeof r[k]!=='string'||!r[k].trim()||r[k].length>200)throw Error('第 '+(i+1)+' 条的 '+k+' 无效');}
  for(const k of ['revenue','cost','profit'])number(r[k],'第 '+(i+1)+' 条 '+k);
 });
 const raw=input.settings||{},theme=raw.theme||input.theme||defaults.theme;
 for(const obj of [raw,input.style||{}])for(const k of Object.keys(obj))if(!(k in defaults)&&k!=='palette')throw Error('未知样式字段：'+k);
 if(!themes[theme])throw Error('未知主题：'+theme);
 const s=Object.assign(cp(defaults),themes[theme],raw);
 if(input.chart)s.chart=input.chart;if(input.title!=null)s.title=input.title;if(input.period!=null)s.subtitle=input.period;
 if(input.style)Object.assign(s,input.style);
 if(input.schemaVersion===1){s.manualLayout={};s.annotations=(s.annotations||[]).map(a=>({text:a.text,x:a.x,y:a.y}));}
 const enums={htmlMode:['live','static'],motion:['auto','off'],dimension:['industry','strategic','major'],chart:Object.keys(chartNames),theme:Object.keys(themes),fontFamily:Object.keys(fonts),orientation:['horizontal','vertical'],fill:['solid','gradient','texture','gradient-texture','duotone','striped','dotted','outline'],rankColors:['single','category'],stackBasis:['reported','aligned'],titleAlign:['left','center','right']};
 for(const [k,values] of Object.entries(enums))if(!values.includes(s[k]))throw Error(k+' 选项无效');
 const ranges={bins:[5,40],scale:[1,1e8],decimals:[0,3],top:[0,100],fontSize:[10,24],titleSize:[18,42],valueSize:[10,24],tableFontSize:[10,22],tableRowHeight:[26,60],tableGap:[12,100],titleGap:[8,50],plotGap:[12,90],labelGap:[6,40],rowGap:[6,55],barWidth:[10,96],width:[560,2400],height:[400,2200]};
 for(const [k,[min,max]] of Object.entries(ranges)){s[k]=number(s[k],k);if(s[k]<min||s[k]>max)throw Error(k+' 超出 '+min+'–'+max+' 范围');}
 if(![1,10000,1e8].includes(s.scale))throw Error('金额单位缩放必须为 1、10000 或 100000000');
 if(!Number.isInteger(s.decimals)||!Number.isInteger(s.top)||!Number.isInteger(s.bins))throw Error('小数位和展示条目数必须为整数');
 for(const k of ['primary','costColor','profitColor','gapColor'])if(!/^#[a-f0-9]{6}$/i.test(s[k]))throw Error('颜色格式无效：'+k);
 for(const [k,max] of [['title',180],['subtitle',100],['unit',20]])if(typeof s[k]!=='string'||s[k].length>max)throw Error(k+' 长度或类型无效');
 if(typeof s.showTable!=='boolean'||typeof s.showValues!=='boolean')throw Error('显示选项必须为布尔值');
 if(!Array.isArray(s.annotations)||s.annotations.length>30)throw Error('标注最多 30 条');
 s.annotations=s.annotations.map(a=>{if(typeof a.text!=='string'||a.text.length>200)throw Error('标注文字无效');return {text:a.text,x:Math.max(0,Math.min(1,number(a.x??.6))),y:Math.max(0,Math.min(1,number(a.y??.3)))};});
 if(!s.manualLayout||Array.isArray(s.manualLayout)||typeof s.manualLayout!=='object')throw Error('手动布局应为对象');
 return {schemaVersion:2,source:Object.assign({file:'用户提供数据',sheet:'数据',range:'全部记录'},input.source),rows,settings:s,savedAt:input.savedAt};
}
function aggregate(project){
 const s=project.settings,rows=project.rows.filter(r=>s.tier==='all'||r.tier===s.tier),map=new Map(),total={count:rows.length,revenue:0,cost:0,profit:0};
 for(const r of rows){const name=s.dimension==='major'?(r.strategic==='EMPTY'?'未归类':r.strategic.split('-')[0]):r[s.dimension];if(!map.has(name))map.set(name,{name,count:0,revenue:0,cost:0,profit:0});const g=map.get(name);g.count++;for(const k of ['revenue','cost','profit']){const n=number(r[k]);g[k]+=n;total[k]+=n;}}
 total.margin=total.revenue===0?null:total.profit/total.revenue;total.gap=total.revenue-total.cost-total.profit;
 return {rows,total,groups:Array.from(map.values()).map(g=>Object.assign(g,{gap:g.revenue-g.cost-g.profit,margin:g.revenue===0?null:g.profit/g.revenue,share:total.revenue===0?null:g.revenue/total.revenue}))};
}
function rank(groups,s){const key=['revenue','cost','profit','margin'].includes(s.chart)?s.chart:'revenue';return groups.slice().sort((a,b)=>(b[key]??-Infinity)-(a[key]??-Infinity)||(a.name<b.name?-1:a.name>b.name?1:0));}
function format(n,d){if(n==null||!Number.isFinite(n))return '—';const parts=Number(n).toFixed(d).split('.');parts[0]=parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,',');return parts.join('.');}
function unit(s){return s.unit==='元'?({1:'元',10000:'万元',100000000:'亿元'})[s.scale]:s.unit+(s.scale===1?'':' ÷ '+s.scale);}
function tint(hex,amount){const n=parseInt(hex.slice(1),16),out=[(n>>16)&255,(n>>8)&255,n&255].map(v=>Math.round(v+(amount>=0?255-v:v)*amount));return '#'+out.map(v=>Math.max(0,Math.min(255,v)).toString(16).padStart(2,'0')).join('');}
function measure(text,size){let n=0;for(const c of String(text)){n+=c.codePointAt(0)>255?.99:c===' '?.33:/[MW@]/.test(c)?.87:/[ilI.,:;!]/.test(c)?.29:.56;}return n*size;}
if(echarts.setPlatformAPI)echarts.setPlatformAPI({measureText:(text,font)=>({width:Math.max(...String(text).split('\n').map(t=>measure(t,Number((font||'14px').match(/([\d.]+)px/)?.[1]||14))))})});
function wrap(text,width,size){const lines=[];let part='';for(const c of String(text)){if(part&&measure(part+c,size)>width){lines.push(part);part='';}part+=c;}if(part)lines.push(part);return lines.length?lines:[''];}
function text(x,y,value,size,color,attrs){return '<text x="'+x+'" y="'+y+'" font-size="'+size+'" fill="'+color+'" '+(attrs||'')+'>'+esc(value)+'</text>';}
function canonical(svg){const ids=Array.from(svg.matchAll(/\bid="([^"]+)"/g),m=>m[1]);const map=new Map(ids.map((id,i)=>[id,'rc-'+i]));const classes=new Map();return svg.replace(/id="([^"]+)"/g,(m,id)=>'id="'+map.get(id)+'"').replace(/url\(#([^)]+)\)/g,(m,id)=>'url(#'+(map.get(id)||id)+')').replace(/(href|xlink:href)="#([^"]+)"/g,(m,key,id)=>key+'="#'+(map.get(id)||id)+'"').replace(/\bzr\d+-cls-\d+\b/g,name=>{if(!classes.has(name))classes.set(name,'rc-cls-'+classes.size);return classes.get(name);});}
// Additional templates consume the same normalized financial rows. No synthetic time axis.
function quantile(sorted,q){const i=(sorted.length-1)*q,lo=Math.floor(i);return sorted[lo]+(sorted[Math.ceil(i)]-sorted[lo])*(i-lo);}
function extendedChart(ctx){
 const {p,s,data,groups,W,bodyH,palette,colors,itemStyle,category,valueAxis,horizontal}=ctx;
 if(!['lollipop','pareto','scatter','bubble','histogram','boxplot','treemap','waterfall'].includes(s.chart))return null;
 const warnings=[],analysis={},label={show:s.showValues,fontFamily:fonts[s.fontFamily],fontSize:s.valueSize,color:'#34435C'},money=v=>format(v/s.scale,s.decimals),axisName=label=>({name:label,nameLocation:'end',nameGap:18,nameRotate:0,nameTextStyle:{color:'#596579',fontSize:s.fontSize-1}});
 const val=(name)=>({...valueAxis,...axisName(name),axisLabel:{...valueAxis.axisLabel,formatter:v=>format(v,Math.abs(v)<1&&v!==0?2:1)}});
 const cat={...category,inverse:false,axisLabel:{...category.axisLabel,formatter:n=>wrap(n,Math.max(55,(W-180)/Math.max(1,groups.length)-12),s.fontSize).join('\n')}};
 const bottom=Math.max(100,Math.max(1,...groups.map(g=>wrap(g.name,Math.max(55,(W-180)/Math.max(1,groups.length)-12),s.fontSize).length))*(s.fontSize+6)+25);
 const option={animation:false,grid:{left:95,right:75,top:35,bottom},xAxis:cat,yAxis:val(unit(s)),series:[]};
 if(s.chart==='lollipop'){
  option.xAxis=horizontal?val(unit(s)):cat;option.yAxis=horizontal?{...category,axisLabel:{...category.axisLabel,formatter:n=>wrap(n,Math.min(180,W*.25),s.fontSize).join('\n')}}:val(unit(s));
  if(horizontal)option.grid.left=Math.min(230,W*.3);
  option.series=[{type:'bar',barWidth:3,silent:true,data:groups.map((g,i)=>({value:g.revenue/s.scale,itemStyle:{color:g.revenue<0?'#C9586C':palette[i%palette.length],opacity:.45}}))},{type:'scatter',symbolSize:13,silent:true,label:{...label,position:horizontal?'right':'top',formatter:x=>format(horizontal?x.value[0]:x.value[1],s.decimals)},data:groups.map((g,i)=>({name:g.name,value:horizontal?[g.revenue/s.scale,g.name]:[g.name,g.revenue/s.scale],itemStyle:{color:g.revenue<0?'#C9586C':palette[i%palette.length],borderColor:'#fff',borderWidth:2}}))}];
 }else if(s.chart==='pareto'){
  if(data.groups.some(g=>g.revenue<0)||data.total.revenue<=0){warnings.push('帕累托累计占比需要非负且合计为正的收入；当前改用有符号收入柱图');option.series=[{type:'bar',barMaxWidth:52,data:groups.map(g=>({value:g.revenue/s.scale,itemStyle:itemStyle(g.revenue<0?'#C9586C':s.primary)}))}];}
  else{let cumulative=0;analysis.cumulative=groups.map(g=>(cumulative+=g.revenue)/data.total.revenue*100);option.yAxis=[val(unit(s)),{...valueAxis,min:0,max:100,position:'right',splitLine:{show:false},axisLabel:{...valueAxis.axisLabel,formatter:v=>v+'%'}}];option.series=[{name:'收入',type:'bar',barMaxWidth:52,itemStyle:itemStyle(s.primary),data:groups.map(g=>g.revenue/s.scale)},{name:'累计收入占比',type:'line',yAxisIndex:1,symbolSize:7,lineStyle:{width:2,color:s.profitColor},itemStyle:{color:s.profitColor},label:{...label,position:'top',formatter:x=>format(x.value,1)+'%'},data:analysis.cumulative}];warnings.push('柱为收入（左轴），线为累计占比（右轴）；含其余行业，累计至100%');}
 }else if(s.chart==='scatter'||s.chart==='bubble'){
  const bubble=s.chart==='bubble';option.xAxis=val((bubble?'收入':'成本')+'（'+unit(s)+'）');option.yAxis=bubble?{...val('毛利率'),axisLabel:{...valueAxis.axisLabel,formatter:v=>format(v,0)+'%'}}:val('毛利（'+unit(s)+'）');
  const points=groups.filter(g=>!bubble||g.margin!=null);analysis.omitted=groups.length-points.length;
  const maxCount=Math.max(1,...points.map(g=>g.count));
  option.series=[{type:'scatter',silent:true,symbolSize:v=>bubble?Math.max(6,Math.sqrt(v[2]/maxCount)*42):12,label:{...label,position:'top',formatter:x=>wrap(x.name,120,s.fontSize).join('\n')},data:points.map((g,i)=>({name:g.name,value:[(bubble?g.revenue:g.cost)/s.scale,bubble?g.margin*100:g.profit/s.scale,g.count],itemStyle:{color:palette[i%palette.length],opacity:.85,borderColor:'#fff',borderWidth:1.5}}))}];
  warnings.push(bubble?'横轴为收入，纵轴为毛利率；气泡大小与客户记录数对应':'每点代表一个行业；横轴成本、纵轴原表毛利');
  if(analysis.omitted)warnings.push(analysis.omitted+' 个零收入行业无毛利率，未绘入气泡图');
  if(bubble)return {option,warnings,analysis,table:{headers:['行业','收入（'+unit(s)+'）','毛利率','客户记录数'],rows:groups.map(g=>[g.name,money(g.revenue),g.margin==null?'—':format(g.margin*100,1)+'%',String(g.count)])}};
 }else if(s.chart==='histogram'){
  const values=data.rows.map(r=>number(r.revenue)),min=Math.min(...values),max=Math.max(...values);
  const count=s.bins,low=values.length?min:0,high=values.length?max:0,step=high===low?Math.max(Math.abs(low)*.01,1):(high-low)/count;
  const start=high===low?low-step*count/2:low,bins=Array.from({length:count},(_,i)=>({low:start+i*step,high:start+(i+1)*step,count:0}));
  for(const value of values)bins[Math.max(0,Math.min(count-1,Math.floor((value-start)/step)))].count++;
  analysis.bins=bins;analysis.samples=values.length;
  const precision=Math.min(6,Math.max(s.decimals,Math.ceil(-Math.log10(step/s.scale))+1)),bound=v=>format(v/s.scale,precision);
  const labels=bins.map((b,i)=>'['+bound(b.low)+', '+bound(b.high)+(i===count-1?']':')'));
  option.xAxis={...category,data:labels,axisLabel:{...category.axisLabel,fontSize:11,formatter:n=>n.replace(', ', ',\n')}};option.yAxis={...val('客户记录数'),minInterval:1,axisLabel:{...valueAxis.axisLabel,formatter:v=>format(v,0)}};
  option.series=[{type:'bar',barCategoryGap:'4%',itemStyle:itemStyle(s.primary),label:{...label,position:'top',formatter:x=>x.value||''},data:bins.map(b=>b.count)}];
  warnings.push('全部筛选后客户记录等宽分箱，非行业总额；展示前N名不适用于本图');
  return {option,warnings,analysis,displayInfo:values.length+' 条客户记录 · '+count+' 个等宽区间',table:{headers:['收入区间（'+unit(s)+'）','客户记录数','记录占比'],rows:bins.map((b,i)=>[labels[i],String(b.count),format(values.length?b.count/values.length*100:0,1)+'%'])}};
 }else if(s.chart==='boxplot'){
  const stats=groups.map(g=>{const values=data.rows.filter(r=>(s.dimension==='major'?(r.strategic==='EMPTY'?'未归类':r.strategic.split('-')[0]):r[s.dimension])===g.name).map(r=>number(r.revenue)).sort((a,b)=>a-b);const q1=quantile(values,.25),median=quantile(values,.5),q3=quantile(values,.75),iqr=q3-q1,inside=values.filter(v=>v>=q1-1.5*iqr&&v<=q3+1.5*iqr);return {name:g.name,count:values.length,q1,median,q3,low:inside[0],high:inside[inside.length-1],outliers:values.filter(v=>v<q1-1.5*iqr||v>q3+1.5*iqr)};});
  analysis.boxes=stats;option.series=[{type:'boxplot',boxWidth:[12,50],itemStyle:{color:tint(s.primary,.8),borderColor:s.primary,borderWidth:1.5},data:stats.map(g=>[g.low,g.q1,g.median,g.q3,g.high].map(v=>v/s.scale))},{type:'scatter',symbolSize:6,itemStyle:{color:s.gapColor},data:stats.flatMap((g,i)=>g.outliers.map(v=>[i,v/s.scale]))}];
  warnings.push('箱体为Q1–Q3，中线为中位数，须为1.5×IQR内极值；散点为离群值（均保留）');
  if(stats.some(g=>g.count<4))warnings.push('部分行业不足4条记录，分布解释需谨慎');
  return {option,warnings,analysis,table:{headers:['行业 / 样本数','下四分位','中位数','上四分位'],rows:stats.map(g=>[g.name+' / '+g.count,money(g.q1),money(g.median),money(g.q3)])}};
 }else if(s.chart==='treemap'){
  if(data.groups.some(g=>g.revenue<0)||data.total.revenue<=0){warnings.push('矩形面积需要非负且合计为正的收入；当前改用有符号收入柱图');option.series=[{type:'bar',barMaxWidth:52,itemStyle:itemStyle(s.primary),data:groups.map(g=>g.revenue/s.scale)}];}
  else{delete option.xAxis;delete option.yAxis;option.series=[{type:'treemap',silent:true,left:48,right:48,top:20,bottom:20,roam:false,nodeClick:false,breadcrumb:{show:false},label:{show:true,fontSize:s.fontSize,color:'#fff',formatter:x=>wrap(x.name,Math.max(50,Math.sqrt(x.value/data.total.revenue)*(W-100)-20),s.fontSize).join('\n')+(s.showValues?'\n'+money(x.value):'')},itemStyle:{borderColor:'#fff',borderWidth:3,gapWidth:3},data:groups.filter(g=>g.revenue>0).map((g,i)=>({name:g.name,value:g.revenue,itemStyle:{color:palette[i%palette.length]}}))}];warnings.push('矩形面积编码收入；含其余行业，保留全部正收入');}
 }else if(s.chart==='waterfall'){
  let sum=0;const steps=groups.map(g=>{const before=sum;sum+=g.revenue;return {name:g.name,value:g.revenue,start:before,end:sum};});analysis.steps=steps;analysis.net=sum;
  const labels=steps.map(g=>g.name).concat('净收入合计');option.xAxis={...cat,data:labels};option.series=[{type:'custom',silent:true,renderItem:(params,api)=>{const start=api.value(1),end=api.value(2),a=api.coord([api.value(0),start]),b=api.coord([api.value(0),end]),width=Math.min(s.barWidth,api.size([1,0])[0]*.6),last=params.dataIndex===steps.length;return {type:'rect',shape:{x:a[0]-width/2,y:Math.min(a[1],b[1]),width,height:Math.max(1,Math.abs(a[1]-b[1]))},style:{fill:last?s.primary:end>=start?s.profitColor:'#C9586C'}};},encode:{x:0,y:[1,2]},data:steps.map((g,i)=>[i,g.start/s.scale,g.end/s.scale]).concat([[steps.length,0,sum/s.scale]])},{type:'scatter',symbolSize:1,itemStyle:{opacity:0},label:{...label,opacity:1,position:'top',formatter:x=>money(x.value[2])},data:steps.map((g,i)=>[i,g.end/s.scale,g.value]).concat([[steps.length,sum/s.scale,sum]])}];
  warnings.push('按收入排序累计各行业贡献，保留负收入及其余行业；末柱为净收入合计，不代表时间变化');
 }
 if(option.xAxis?.name){option.xAxis.nameLocation='middle';option.xAxis.nameGap=38;}
 for(const series of option.series)series.silent=true;
 return {option,warnings,analysis};
}

function render(input,options){
 const p=normalize(input),s=p.settings,data=aggregate(p),all=rank(data.groups,s),W=Math.round(options?.width||s.width);
 if(!Number.isFinite(W)||W<560||W>2400)throw Error('画布宽度必须为 560–2400');
 let groups=s.top?all.slice(0,s.top):all;
 if(['share','pie','pareto','treemap','waterfall'].includes(s.chart)&&s.top&&all.length>s.top){const other={name:'其他行业',count:0,revenue:0,cost:0,profit:0};for(const r of all.slice(s.top)){other.count+=r.count;for(const k of ['revenue','cost','profit'])other[k]+=r[k];}while(groups.some(g=>g.name===other.name))other.name+='（汇总）';other.gap=other.revenue-other.cost-other.profit;other.margin=other.revenue===0?null:other.profit/other.revenue;other.share=data.total.revenue===0?null:other.revenue/data.total.revenue;groups=groups.concat(other);}
 const isStack=s.chart==='stack',compare=s.chart==='compare',ratio=s.chart==='margin'||s.chart==='share'||s.chart==='pie',horizontal=s.orientation==='horizontal';
 const donut=['share','pie'].includes(s.chart)&&data.total.revenue>0&&data.groups.every(g=>g.revenue>=0);
 const keys=isStack?(s.stackBasis==='aligned'?['aligned','profit']:['cost','profit','gap']):compare?['revenue','cost','profit']:[['revenue','cost','profit','margin','share'].includes(s.chart)?s.chart:s.chart==='pie'?'share':'revenue'];
 const negativeStack=isStack&&groups.some(g=>keys.some(k=>(k==='aligned'?g.revenue-g.profit:g[k])<0));
 const palette=[s.primary].concat(themes[s.theme].palette.slice(1)),colors={revenue:s.primary,cost:s.costColor,profit:s.profitColor,gap:s.gapColor,aligned:s.costColor,margin:s.primary,share:s.primary};
 const categoryColors=new Map(rank(data.groups,{chart:'revenue'}).map((g,i)=>[g.name,palette[i%palette.length]]));
 const padding=48,titleLines=wrap(s.title||chartNames[s.chart],W-padding*2,s.titleSize),titleBottom=padding+titleLines.length*(s.titleSize+8)-8;
 const scope=s.chart==='histogram'?'全部 '+data.rows.length+' 条客户记录 / '+s.bins+' 个区间':(s.top&&all.length>s.top?(['share','pie','pareto','treemap','waterfall'].includes(s.chart)?'前 '+s.top+' 名及其他':'前 '+s.top+' / '+all.length+' 个行业'):'全部 '+all.length+' 个行业');
 const meta=[s.subtitle,s.chart==='histogram'?'客户收入分布':dimensionNames[s.dimension],s.tier==='all'?'全部客户':s.tier,scope,'单位：'+(ratio?'%':unit(s))].join('  ');
 const metaLines=wrap(meta,W-padding*2,s.fontSize),metaY=titleBottom+s.titleGap;
 let headerBottom=metaY+(metaLines.length-1)*(s.fontSize+8)+s.fontSize;
 const legendKeys=compare||isStack?keys:[],legendH=legendKeys.length?36:0;
 headerBottom+=legendH;
 const plotY=headerBottom+s.plotGap,tableH=s.showTable?((s.chart==='histogram'?s.bins:groups.length)+1)*s.tableRowHeight+38:0;
 const nSeries=compare?3:1;
 const minimumBody=['scatter','bubble','histogram','boxplot','treemap','pareto','waterfall','lollipop'].includes(s.chart)?420:donut?Math.max(330,groups.reduce((n,g)=>n+Math.max(29,wrap(g.name,W*.24,s.fontSize-1).length*(s.fontSize+4)+8),0)+50):horizontal?Math.max(260,groups.length*(s.barWidth*nSeries+s.rowGap)+52):370;
 let bodyH=Math.max(minimumBody,s.height-plotY-(tableH?s.tableGap+tableH:0)-80);
 const legendX=padding,legendY=headerBottom-10;
 const labelWidth=horizontal?Math.min(W*.32,Math.max(100,...groups.map(g=>measure(g.name,s.fontSize)))):0;
 const gridLeft=horizontal?padding+labelWidth+s.labelGap:padding+36,gridRight=horizontal?100:padding;
 const categoryWidth=Math.max(20,(W-gridLeft-gridRight)/Math.max(1,groups.length)-8);
 const categoryLines=Math.max(1,...groups.map(g=>wrap(g.name,categoryWidth,s.fontSize).length));
 const gridBottom=horizontal?45:Math.max(80,categoryLines*(s.fontSize+6)+s.labelGap+20);
 if(!horizontal&&!donut)bodyH=Math.max(bodyH,280+gridBottom);
 const barValue=(g,k)=>k==='aligned'?(g.revenue-g.profit)/s.scale:ratio?(g[k]==null?null:g[k]*100):g[k]/s.scale;
 const maxAbs=Math.max(1,...groups.flatMap(g=>keys.map(k=>Math.abs(barValue(g,k)??0)))),spanMax=Math.max(1,...groups.map(g=>Math.abs(g.revenue/s.scale)));
 const decimalTicks=Math.min(6,Math.max(0,1-Math.floor(Math.log10(maxAbs))));
 const valueFormatter=v=>ratio?format(v,1)+'%':format(v,s.decimals);
 const widestValue=Math.max(0,...groups.flatMap(g=>keys.map(k=>measure(valueFormatter(barValue(g,k)),s.valueSize))));
 const valuesFit=horizontal||categoryWidth/(compare?3:1)>widestValue+8;
 const totalsFit=horizontal||categoryWidth>Math.max(0,...groups.map(g=>measure(valueFormatter(g.revenue/s.scale),s.valueSize)))+8;
 function itemStyle(color,index,last){
  const grad=s.fill.includes('gradient')?{type:'linear',x:0,y:horizontal?0:1,x2:horizontal?1:0,y2:0,colorStops:[{offset:0,color:tint(color,.25)},{offset:1,color:tint(color,-.08)}]}:color;
  let paint=grad;if(s.fill==='duotone')paint={type:'linear',x:0,y:horizontal?0:1,x2:horizontal?1:0,y2:0,colorStops:[{offset:0,color:tint(color,.7)},{offset:.55,color:tint(color,.7)},{offset:.55,color},{offset:1,color}]};
  const style={color:s.fill==='outline'?'rgba(255,255,255,0)':paint,borderRadius:isStack?2:horizontal?[2,7,7,2]:[7,7,2,2],borderColor:'#ffffff',borderWidth:isStack?1:0};
  if(s.fill==='outline'){style.borderColor=color;style.borderWidth=2;}
  if(s.fill==='striped'||s.fill==='dotted')style.decal={symbol:s.fill==='dotted'?'circle':'rect',symbolSize:.8,dashArrayX:s.fill==='dotted'?[2,4]:[1,0],dashArrayY:s.fill==='dotted'?[2,4]:[2,5],rotation:0,color:'rgba(255,255,255,.45)'};
  if(s.fill.includes('texture'))style.decal={symbol:'rect',symbolSize:1,dashArrayX:[1,0],dashArrayY:[1,7],rotation:-Math.PI/4,color:'rgba(255,255,255,0.14)',backgroundColor:'rgba(255,255,255,0)'};
  if(index==='gap')style.decal={symbol:'rect',dashArrayX:[1,0],dashArrayY:[2,4],rotation:-Math.PI/4,color:'rgba(92,68,30,0.24)'};
  return style;
 }
 const category={type:'category',data:groups.map(g=>g.name),inverse:horizontal,axisLine:{show:false},axisTick:{show:false},axisLabel:{fontFamily:fonts[s.fontFamily],fontSize:s.fontSize,color:'#53617A',margin:s.labelGap,interval:0,lineHeight:s.fontSize+6,formatter:name=>wrap(name,horizontal?labelWidth:categoryWidth,s.fontSize).join('\n')}};
 const valueAxis={type:'value',splitNumber:5,axisLine:{show:false},axisTick:{show:false},axisLabel:{fontFamily:fonts[s.fontFamily],fontSize:s.fontSize-1,color:'#8290A5',formatter:v=>format(v,decimalTicks)+(ratio?'%':'')},splitLine:{lineStyle:{color:'#E8EDF5',type:'dashed'}}};
 const option={animation:false,textStyle:{fontFamily:fonts[s.fontFamily]},grid:{left:gridLeft,right:gridRight,top:25,bottom:gridBottom},xAxis:horizontal?valueAxis:category,yAxis:horizontal?category:valueAxis,series:[]};
 if(donut){
  delete option.xAxis;delete option.yAxis;
  option.series=[{type:'pie',silent:true,radius:[s.chart==='pie'?'0%':'48%','74%'],center:['34%','50%'],startAngle:90,avoidLabelOverlap:false,label:{show:false},itemStyle:{borderColor:'#fff',borderWidth:3,borderRadius:5},
   data:groups.map((g,i)=>({name:g.name,value:g.revenue,itemStyle:itemStyle(palette[i%palette.length],i)}))}];
 }else{
  const effectiveBar=horizontal?s.barWidth:Math.min(s.barWidth,(W-gridLeft-gridRight)/Math.max(1,groups.length)/(compare?4:1.5));
  option.series=keys.map(k=>({name:(s.seriesNames||{})[k]||names[k],type:'bar',stack:isStack?'income':undefined,silent:true,barWidth:effectiveBar,barGap:'18%',barCategoryGap:s.rowGap,
   itemStyle:itemStyle(colors[k],k),label:{show:s.showValues&&(isStack||valuesFit),position:isStack?'inside':horizontal?'right':'top',distance:8,fontSize:s.valueSize,fontFamily:fonts[s.fontFamily],color:isStack&&s.fill!=='outline'?'#fff':'#33435E',fontWeight:isStack?600:500,
    formatter:params=>isStack?(Math.abs(params.value)>spanMax*.035&&(horizontal||measure(valueFormatter(params.value),s.valueSize)<effectiveBar-8)&&Math.abs(params.value)/spanMax*(bodyH-110)>s.valueSize+8?valueFormatter(params.value):''):valueFormatter(params.value)},
   data:groups.map(g=>{const v=barValue(g,k);let color=v<0?'#C9586C':colors[k];if(!compare&&!isStack&&s.rankColors==='category'&&v>=0)color=categoryColors.get(g.name)||s.primary;return {value:v,itemStyle:itemStyle(color,k),...(!isStack&&v<0?{label:{position:horizontal?'left':'bottom'}}:{})};})}));
  if(isStack)option.series.push({type:'scatter',silent:true,symbol:'circle',symbolSize:negativeStack?7:4,itemStyle:{color:'#24344F'},label:{show:s.showValues&&totalsFit,position:horizontal?'right':'top',distance:12,fontSize:s.valueSize,fontFamily:fonts[s.fontFamily],fontWeight:600,color:'#24344F',formatter:param=>valueFormatter(horizontal?param.value[0]:param.value[1])},data:groups.map(g=>horizontal?[g.revenue/s.scale,g.name]:[g.name,g.revenue/s.scale])});
 }
 const extended=extendedChart({p,s,data,groups,W,bodyH,palette,colors,itemStyle,category,valueAxis,horizontal});
 if(extended)Object.assign(option,extended.option);
 const instance=echarts.init(null,null,{renderer:'svg',ssr:true,width:W,height:bodyH});
 let body;try{instance.setOption(option);body=instance.renderToSVGString({useViewBox:true});}finally{instance.dispose();}
 body=body.replace(/<svg\b/,'<svg y="'+plotY+'"');
 let extra='';
 titleLines.forEach((line,i)=>extra+=text(({left:padding,center:W/2,right:W-padding})[s.titleAlign],padding+i*(s.titleSize+8),line,s.titleSize,'#20314D','font-weight="650" text-anchor="'+({left:'start',center:'middle',right:'end'})[s.titleAlign]+'" data-role="chart-title"'));
 metaLines.forEach((line,i)=>extra+=text(padding,metaY+i*(s.fontSize+8),line,s.fontSize,'#7A879B'));
 if(legendKeys.length){
  const manual=s.manualLayout[s.chart+'|'+s.dimension]||{},lx=Number.isFinite(manual['legend.x'])?manual['legend.x']*W:legendX,ly=Number.isFinite(manual['legend.y'])?manual['legend.y']*(plotY+bodyH):legendY;
  let x=0;extra+='<g data-role="legend" transform="translate('+lx+','+ly+')">';
  for(const k of legendKeys){const label=(s.seriesNames||{})[k]||names[k];extra+='<rect x="'+x+'" y="-11" width="13" height="13" rx="3" fill="'+colors[k]+'"/>'+text(x+21,0,label,s.fontSize-1,'#52617B','data-series="'+k+'"');x+=measure(label,s.fontSize-1)+51;}
  extra+='</g>';
 }
 if(donut){
  if(s.chart==='share'){extra+=text(W*.34,plotY+bodyH*.5-12,'净收入',s.fontSize,'#7A879B','text-anchor="middle"');
  extra+=text(W*.34,plotY+bodyH*.5+21,format(data.total.revenue/s.scale,s.decimals),s.titleSize,'#20314D','text-anchor="middle" font-weight="650"');}
  let keyY=plotY+25;groups.forEach((g,i)=>{const lines=wrap(g.name,W*.19,s.fontSize-1);extra+='<rect x="'+W*.67+'" y="'+(keyY-11)+'" width="11" height="11" rx="3" fill="'+palette[i%palette.length]+'"/>';lines.forEach((line,j)=>extra+=text(W*.67+20,keyY+j*(s.fontSize+4),line,s.fontSize-1,'#52617B'));extra+=text(W-padding,keyY,format(g.share*100,1)+'%',s.valueSize,'#20314D','text-anchor="end" font-weight="550"');keyY+=Math.max(29,lines.length*(s.fontSize+4)+8);});
 }
 let tableBottom=plotY+bodyH;
 if(s.showTable){
  const table=extended?.table||{headers:['行业','收入（'+unit(s)+'）','成本（'+unit(s)+'）','毛利（'+unit(s)+'）','毛利率'],rows:groups.map(g=>[g.name,format(g.revenue/s.scale,s.decimals),format(g.cost/s.scale,s.decimals),format(g.profit/s.scale,s.decimals),g.margin==null?'—':format(g.margin*100,1)+'%'])};
  const y=plotY+bodyH+s.tableGap,columns=table.headers.length,available=W-padding*2,firstWidth=available*(columns===5?.26:columns===4?.34:.5),cellWidth=(available-firstWidth)/(columns-1);
  let ry=y;extra+='<g data-role="summary-table">';
  [table.headers,...table.rows].forEach((row,i)=>{
   const lines=row.map((v,j)=>wrap(v,Math.max(30,(j?cellWidth:firstWidth)-18),s.tableFontSize));
   const rowHeight=Math.max(s.tableRowHeight,Math.max(...lines.map(v=>v.length))*(s.tableFontSize+5)+12);
   if(i===0)extra+='<rect x="'+padding+'" y="'+ry+'" width="'+available+'" height="'+rowHeight+'" rx="5" fill="#F0F4FA"/>';
   lines.forEach((ls,j)=>ls.forEach((v,k)=>extra+=text(j?padding+firstWidth+j*cellWidth:padding,ry+17+k*(s.tableFontSize+5),v,s.tableFontSize,i?'#43536D':'#677892',j?'text-anchor="end"':'')));
   extra+='<path d="M'+padding+' '+(ry+rowHeight)+'H'+(W-padding)+'" stroke="#E7ECF3"/>';ry+=rowHeight;
  });extra+='</g>';tableBottom=ry+5;
 }
 const warnings=extended?.warnings||[];
 if(!data.rows.length)warnings.push('当前客户筛选没有记录，请更改筛选');
 if(isStack&&Math.abs(data.total.gap)>.01)warnings.push(s.stackBasis==='reported'?'成本、原表毛利与未归因差额相加为收入':'推导成本 = 收入 − 原表毛利，含未归因差额');
 if(negativeStack)warnings.push('含负值，正负分开展示，圆点表示净收入');
 if(['share','pie'].includes(s.chart)&&!donut)warnings.push('含负收入或净收入非正，使用带正负号的条形图');
 if(!extended&&!donut&&s.showValues&&!(isStack?totalsFit:valuesFit))warnings.push('类别较密，省略柱端数值；可查阅明细表或切换横向');
 const footerLines=wrap('来源：'+p.source.file+'。毛利采用原表含交付口径。'+warnings.join('。'),W-2*padding,11);
 const footerY=tableBottom+35,H=footerY+footerLines.length*17+25;
 footerLines.forEach((line,i)=>extra+=text(padding,footerY+i*17,line,11,'#8B97A9'));
 s.annotations.forEach((a,i)=>{const lines=wrap(a.text,240,13),nw=Math.min(264,Math.max(...lines.map(line=>measure(line,13)))+24),nh=lines.length*20+16,nx=Math.min(W-padding-nw,padding+a.x*(W-2*padding)),ny=Math.min(plotY+bodyH-nh,plotY+a.y*bodyH);
  extra+='<g data-note="'+i+'" transform="translate('+nx+','+ny+')"><rect width="'+nw+'" height="'+nh+'" rx="7" fill="#FFF7DF" stroke="#E5D8AA"/>';lines.forEach((line,j)=>extra+=text(12,23+j*20,line,13,'#6F5C2E'));extra+='</g>';
 });
 const svg=canonical('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" role="img" font-family="'+esc(fonts[s.fontFamily])+'"><title>'+esc(s.title||chartNames[s.chart])+'</title><desc>'+esc(meta+'. '+warnings.join('。'))+'</desc><rect width="'+W+'" height="'+H+'" fill="#fff"/>'+body+extra+'</svg>');
 return {svg,width:W,height:H,project:p,summary:data,total:data.total,groups,option,warnings,analysis:extended?.analysis||null,displayInfo:extended?.displayInfo||'',geometry:{padding,plotY,bodyH}};
}
return {VERSION,defaults,themes,fonts,names,chartNames,dimensionNames,normalize,aggregate,rank,render,format,measure};
});
