(function () {
'use strict';
const $ = id => document.getElementById(id);
const copy = x => JSON.parse(JSON.stringify(x));
const esc = x => String(x).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const embedded = JSON.parse($('project-data').textContent);
const original = JSON.parse($('source-data').textContent);

const R=window.ReportCharts;
function fingerprint(value){let hash=2166136261;for(const c of JSON.stringify(value)){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16);}
const storageKey='report-charts-v2-'+fingerprint(embedded);
let state=R.normalize(embedded),history=[],mode='summary',rendering=false,rendered=null,pendingRender,toastTimer;
const names=R.names,dimensions=R.dimensionNames,numeric=['revenue','cost','profit'],themes=R.themes;
const styleFields=['fontFamily','titleSize','valueSize','tableFontSize','tableRowHeight','tableGap','titleGap','plotGap','labelGap','rowGap','barWidth','bins','motion','orientation','fill','rankColors','stackBasis','width'];

function num(v) {
 const text = String(v == null ? '' : v).replace(/[,\s，]/g,'');
 if(!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) throw Error('请输入有效数字，空白不会作为 0 处理');
 const value = Number(text);
 if(!Number.isFinite(value) || Math.abs(value)>1e14) throw Error('金额超出支持范围');
 return value;
}
function unit() {return ({1:'元',10000:'万元',100000000:'亿元'})[state.settings.scale] || '原表金额';}
function fmt(v, places) {
 if(v == null || !Number.isFinite(v)) return '—';
 return Number(v).toLocaleString('zh-CN',{minimumFractionDigits:places == null ? state.settings.decimals : places,maximumFractionDigits:places == null ? state.settings.decimals : places});
}
function pct(v) {return v == null || !Number.isFinite(v) ? '—' : fmt(v*100,1)+'%';}
function rawfmt(v) {return fmt(v,2);}
function toast(text) {$('toast').textContent=text;$('toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),3500);}
function validate(project){return R.normalize(project);}
try {
 const saved=JSON.parse(localStorage.getItem(storageKey)||'null');
 if(saved)state=validate(saved);
} catch(e) { /* A bad local cache never prevents opening the embedded source. */ }
function save() {
 state.savedAt=new Date().toISOString();
 try {localStorage.setItem(storageKey,JSON.stringify(state));$('saveStatus').textContent='已保存到本机';}
 catch(e) {$('saveStatus').textContent='请保存项目文件';}
}
function checkpoint() {history.push(copy(state));if(history.length>40) history.shift();$('undo').disabled=false;}

function commit(fn){
 const before=copy(state);
 try{fn();state=R.normalize(state);history.push(before);if(history.length>40)history.shift();save();sync();scheduleRender();}
 catch(e){state=before;sync();toast(e.message);}
}
function aggregate(){return R.aggregate(state);}


function sorted(groups){return R.rank(groups,state.settings);}
function autoTitle(){return R.chartNames[state.settings.chart];}

function sync() {
 const s=state.settings;
 for(const k of styleFields)$(k).value=s[k];
 $('showTable').checked=s.showTable;
 document.documentElement.style.setProperty('--table-font',s.tableFontSize+'px');
 document.documentElement.style.setProperty('--table-pad',Math.max(5,(s.tableRowHeight-s.tableFontSize)/2)+'px');
 for(const k of ['dimension','tier','top','scale','primary','costColor','profitColor','gapColor','fontSize','decimals','height','title','subtitle','titleAlign']) $(k).value=s[k];
 $('showValues').checked=s.showValues;$('heightLabel').textContent=s.height+' px';
 document.querySelectorAll('[data-theme]').forEach(b=>b.classList.toggle('active',b.dataset.theme===s.theme));
 document.querySelectorAll('[data-chart]').forEach(b=>{b.classList.toggle('active',b.dataset.chart===s.chart);b.setAttribute('aria-pressed',b.dataset.chart===s.chart?'true':'false');b.setAttribute('aria-current',b.dataset.chart===s.chart?'true':'false');});
 document.documentElement.style.setProperty('--accent',s.primary);
 document.documentElement.style.setProperty('--soft',s.theme==='vivid'?'#f1edfc':'#edf2fd');
 document.querySelectorAll('[data-preview-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.previewMode===s.htmlMode)));
 $('chartHeading').textContent=R.chartNames[s.chart];
 $('binsField').hidden=s.chart!=='histogram';
 $('orientation').disabled=!['revenue','cost','profit','margin','stack','compare','share','pie','lollipop'].includes(s.chart);
 $('top').disabled=s.chart==='histogram';
 $('stackBasis').disabled=s.chart!=='stack';
 $('rankColors').disabled=!['revenue','cost','profit','margin','lollipop'].includes(s.chart);
 $('periodHeading').textContent=s.subtitle||'统计期间未填写';
 const data=aggregate();
 $('scopeLine').textContent=dimensions[s.dimension]+'汇总 · '+data.groups.length+' 个行业 · '+data.total.count+' 条记录 · '+(s.tier==='all'?'全部客户':s.tier);
 $('kpis').innerHTML=[['总收入',data.total.revenue],['总成本',data.total.cost],['总毛利（含交付）',data.total.profit],['整体毛利率',data.total.margin]].map((x,i)=>'<div class="kpi"><div class="kpi-label">'+x[0]+'</div><div class="kpi-value">'+(i===3?(x[1]==null?'—':fmt(x[1]*100,2)+'%'):fmt(x[1]/s.scale))+(i===3?'':'<span class="kpi-unit">'+unit()+'</span>')+'</div></div>').join('');
 const gap=data.total.revenue-data.total.cost-data.total.profit;
 const reported=data.rows.filter(r=>r.reportedShare!=null);
 const shareNote=reported.length===data.rows.length?'当前记录的原始收入占比合计为 '+pct(reported.reduce((sum,r)=>sum+num(r.reportedShare),0))+'。':'导入数据没有完整的原始收入占比字段。';
 $('auditNote').textContent='当前范围内，收入 − 成本 − 原表毛利 = '+rawfmt(gap)+' 元。该差额的构成未在原表单列，本工具不将其直接认定为交付成本。'+shareNote+'图内占比按当前记录重新计算。';
 $('sourceNote').textContent='来源：'+state.source.file+'，'+state.source.sheet+'!'+state.source.range+'。原表金额单位为元。';
 $('undo').disabled=!history.length;
}

function scheduleRender(){clearTimeout(pendingRender);pendingRender=setTimeout(()=>{pendingRender=null;render();},70);}
function render(){
 if(rendering)return;rendering=true;
 try{
  rendered=R.render(state);
  window.ReportChartsLive?.dispose();
  $('chart').innerHTML=rendered.svg;
  if(state.settings.htmlMode==='live')window.ReportChartsLive.mount($('chart'),rendered,state.settings);
  $('viewStatus').textContent=rendered.displayInfo||(
 '展示 '+rendered.groups.length+' / '+rendered.summary.groups.length+' 个行业'+(rendered.warnings.length?' · '+rendered.warnings.join('；'):''));
 }catch(e){toast('生成失败：'+e.message);console.error(e);}
 finally{rendering=false;}
}
function inlineEdit(element,value,apply){
 const r=element.getBoundingClientRect(),input=document.createElement('input');
 input.className='inline-chart-editor';input.setAttribute('aria-label','编辑图中文字');
 input.style.cssText='position:fixed;z-index:30;left:'+r.x+'px;top:'+(r.y-4)+'px;width:'+Math.max(220,r.width+40)+'px;font-size:18px;background:white;padding:8px;box-shadow:0 8px 28px #19304c33';
 input.value=value;document.body.append(input);input.focus();input.select();
 input.onkeydown=e=>{if(e.key==='Enter')input.blur();if(e.key==='Escape'){input.onblur=null;input.remove();}};
 input.onblur=()=>{const value=input.value.trim();input.remove();apply(value);};
}
$('chart').addEventListener('dblclick',e=>{
 const title=e.target.closest('[data-role="chart-title"]'),note=e.target.closest('[data-note]'),series=e.target.closest('[data-series]');
 if(title)inlineEdit(title,state.settings.title||autoTitle(),v=>commit(()=>state.settings.title=v));
 else if(note){const i=Number(note.dataset.note);inlineEdit(note,state.settings.annotations[i].text,v=>commit(()=>state.settings.annotations[i].text=v));}
 else if(series){const key=series.dataset.series;inlineEdit(series,state.settings.seriesNames[key]||names[key],v=>commit(()=>state.settings.seriesNames[key]=v));}
});
let dragging=null;
$('chart').addEventListener('pointerdown',e=>{
 if(e.button!==0)return;
 const element=e.target.closest('[data-note],[data-role="legend"]');if(!element||!rendered)return;
 const svg=$('chart').querySelector('svg'),box=svg.getBoundingClientRect(),m=element.getAttribute('transform').match(/translate\(([-\d.]+)[ ,]([-\d.]+)\)/);
 if(!m)return;
 dragging={element,svg,startX:e.clientX,startY:e.clientY,x:Number(m[1]),y:Number(m[2]),dx:0,dy:0,scale:rendered.width/box.width,moved:false};
 $('chart').setPointerCapture(e.pointerId);e.preventDefault();
});
$('chart').addEventListener('pointermove',e=>{
 if(!dragging)return;const d=dragging;
 d.dx=(e.clientX-d.startX)*d.scale;d.dy=(e.clientY-d.startY)*d.scale;d.moved=Math.abs(d.dx)+Math.abs(d.dy)>3;
 if(d.moved)d.element.setAttribute('transform','translate('+(d.x+d.dx)+','+(d.y+d.dy)+')');
});
function endDrag(){
 if(!dragging)return;const d=dragging;dragging=null;if(!d.moved)return;
 const g=rendered.geometry;
 commit(()=>{
  if(d.element.hasAttribute('data-note')){const a=state.settings.annotations[Number(d.element.dataset.note)];a.x=Math.max(0,Math.min(1,(d.x+d.dx-g.padding)/(rendered.width-g.padding*2)));a.y=Math.max(0,Math.min(1,(d.y+d.dy-g.plotY)/g.bodyH));}
  else{const key=state.settings.chart+'|'+state.settings.dimension;state.settings.manualLayout[key]={'legend.x':(d.x+d.dx)/rendered.width,'legend.y':(d.y+d.dy)/(g.plotY+g.bodyH)};}
 });
}
$('chart').addEventListener('pointerup',endDrag);$('chart').addEventListener('pointercancel',endDrag);
for(const k of styleFields){
 const apply=()=>{
  let value=$(k).value;if(!['fontFamily','orientation','fill','rankColors','stackBasis','motion'].includes(k))value=Number(value);
  if(state.settings[k]!==value)commit(()=>state.settings[k]=value);
 };
 $(k).addEventListener('change',apply);
 $(k).addEventListener('focusout',apply);
 if($(k).type==='number')$(k).addEventListener('input',()=>{if($(k).value!==''&&$(k).checkValidity())apply();});
}
$('showTable').addEventListener('change',()=>commit(()=>state.settings.showTable=$('showTable').checked));

for(const k of ['dimension','tier','top','scale','primary','costColor','profitColor','gapColor','fontSize','decimals','height','title','subtitle','titleAlign']){
 const apply=()=>{
  let v=$(k).value;
  if(['top','scale','fontSize','decimals','height'].includes(k))v=Number(v);
  if(k==='fontSize'&&(!Number.isFinite(v)||v<10||v>24)){$(k).value=state.settings[k];return toast('字号范围为 10–24');}
  if(v===state.settings[k])return;
  commit(()=>state.settings[k]=v);
 };
 $(k).addEventListener('input',apply);
 $(k).addEventListener('change',apply);
}
$('showValues').addEventListener('change',()=>commit(()=>state.settings.showValues=$('showValues').checked));
document.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>commit(()=>{state.settings.theme=b.dataset.theme;for(const k of ['primary','costColor','profitColor','gapColor'])state.settings[k]=themes[b.dataset.theme][k];}));
document.querySelectorAll('[data-chart]').forEach(b=>b.onclick=()=>commit(()=>{
 const s=state.settings;s.titleMap ||= {};s.annotationSets ||= {};
 s.titleMap[s.chart]=s.title;s.annotationSets[s.chart]=copy(s.annotations);
 s.chart=b.dataset.chart;s.title=s.titleMap[s.chart]||'';s.annotations=copy(s.annotationSets[s.chart]||[]);document.querySelector('.shell').dataset.mobile='preview';document.querySelectorAll('[data-mobile-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mobileView==='preview'?'true':'false'));
}));
$('addAnnotation').onclick=()=>{
 const text=$('annotationText').value.trim();if(!text)return toast('请先输入标注文字');
 if(state.settings.annotations.length>=30)return toast('最多添加 30 条标注');
 commit(()=>state.settings.annotations.push({text,x:.64,y:.7}));
 $('annotationText').value='';
};
$('clearAnnotations').onclick=()=>commit(()=>state.settings.annotations=[]);
$('undo').onclick=()=>{if(!history.length)return;state=history.pop();save();sync();scheduleRender();if($('dataDialog').open)renderTable();};
$('showMethod').onclick=()=>{$('method').open=!$('method').open;if($('method').open)$('method').scrollIntoView({behavior:'smooth',block:'nearest'});};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
function download(content,filename,mime) {
 const url=URL.createObjectURL(new Blob([content],{type:mime}));
 const a=document.createElement('a');a.href=url;a.download=filename;a.style.display='none';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 let link=$('lastDownload');if(!link){link=document.createElement('a');link.id='lastDownload';link.style.cssText='display:inline-block;margin:12px 20px 0 0;font-size:12px';$('viewStatus').parentNode.after(link);}
 link.href='data:'+mime+','+encodeURIComponent(content);link.download=filename;link.textContent='下载刚保存的文件：'+filename;
}
function projectText() {return JSON.stringify(state,null,2);}
$('saveProject').onclick=()=>{save();download(projectText(),'行业经营图表项目.json','application/json');toast('项目文件包含数据、样式和标注，可重新打开');};
$('openProject').onclick=()=>$('projectFile').click();
$('projectFile').onchange=async e=>{
 const f=e.target.files[0];if(!f)return;
 try{const loaded=validate(JSON.parse(await f.text()));commit(()=>state=copy(loaded));toast('项目已打开');}
 catch(err){toast('打开失败：'+err.message);}e.target.value='';
};
$('saveHTML').onclick=()=>{
 save();const root=document.documentElement.cloneNode(true);
 root.querySelector('#project-data').textContent=JSON.stringify(state).replace(/</g,'\\u003c');
 root.querySelector('#chart').replaceChildren();root.querySelector('#portfolioMount')?.replaceChildren();
 root.querySelector('#lastExport')?.remove();
 root.querySelector('#lastDownload')?.remove();
 root.querySelectorAll('dialog,.menu').forEach(d=>d.removeAttribute('open'));
 root.querySelector('#toast').classList.add('hidden');
 root.querySelectorAll('input[type=file]').forEach(e=>e.value='');
 download('<!doctype html>\n'+root.outerHTML,'行业经营图表工作台.html','text/html;charset=utf-8');toast('已保存，打开 HTML 即可继续编辑');
};

async function exportImage(type){
 try{
  if(pendingRender){clearTimeout(pendingRender);pendingRender=null;render();}
  if(!rendered)throw Error('没有可导出的图表');
  let url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(rendered.svg);
  if(type==='png'){
   const image=new Image(),loaded=new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('PNG 转换失败'));});
   image.src=url;await loaded;
   const canvas=document.createElement('canvas');canvas.width=rendered.width*2;canvas.height=rendered.height*2;
   const ctx=canvas.getContext('2d');ctx.scale(2,2);ctx.fillStyle='#fff';ctx.fillRect(0,0,rendered.width,rendered.height);ctx.drawImage(image,0,0);
   url=canvas.toDataURL('image/png');
  }
  const a=document.createElement('a');a.href=url;a.download=(state.settings.subtitle||'全量')+'-'+autoTitle()+'.'+type;a.click();
  let link=$('lastExport');if(!link){link=document.createElement('a');link.id='lastExport';link.style.cssText='display:inline-block;font-size:12px;margin-top:12px';$('viewStatus').parentNode.after(link);}
  link.href=url;link.download=a.download;link.textContent='下载刚导出的 '+type.toUpperCase();
  toast(type.toUpperCase()+' 已导出');
 }catch(e){toast('导出失败：'+e.message);console.error(e);}
}

$('exportSVG').onclick=()=>exportImage('svg');$('exportPNG').onclick=()=>exportImage('png');
function openTable(newMode){mode=newMode;renderTable();$('dataDialog').showModal();}
$('showSummary').onclick=()=>openTable('summary');$('editData').onclick=()=>openTable('source');
function renderTable() {
 const data=aggregate(),summary=mode==='summary';
 $('dataTitle').textContent=summary?'行业汇总':'编辑源数据';
 $('dataHelp').textContent=summary?'显示当前客户筛选范围的全部行业，金额单位为元，毛利率按汇总金额计算。':'金额单位为元。修改后离开单元格即生效；毛利独立录入，不以收入减成本自动覆盖。';
 $('tableCount').textContent=summary?data.groups.length+' 个行业':state.rows.length+' 条客户记录';
 for(const id of ['addRow','importCSV','pasteTable'])$(id).classList.toggle('hidden',summary);
 $('dataMessage').innerHTML=summary?'':'<div class="notice">增减数据会重新计算图表，标题、主题和标注将保留。原表为税后金额；负数会参与汇总。</div>';
 let html;
 if(summary){
  html='<table><thead><tr><th>'+dimensions[state.settings.dimension]+'</th><th>客户记录</th><th>收入（元）</th><th>成本（元）</th><th>毛利（含交付，元）</th><th>毛利率</th><th>收入占比</th></tr></thead><tbody>';
  html+=sorted(data.groups).map(g=>'<tr><td>'+esc(g.name)+'</td><td>'+g.count+'</td>'+numeric.map(k=>'<td class="'+(g[k]<0?'neg':'')+'">'+rawfmt(g[k])+'</td>').join('')+'<td>'+pct(g.margin)+'</td><td>'+pct(g.share)+'</td></tr>').join('');
  html+='<tr style="font-weight:650"><td>合计</td><td>'+data.total.count+'</td>'+numeric.map(k=>'<td>'+rawfmt(data.total[k])+'</td>').join('')+'<td>'+pct(data.total.margin)+'</td><td>'+(data.total.revenue===0?'—':'100.0%')+'</td></tr></tbody></table>';
 }else{
  const fields=[['customer','客户名称'],['industry','行业L1'],['strategic','客户战略行业'],['tier','客户分层'],['revenue','收入（元）'],['cost','成本（元）'],['profit','毛利（含交付，元）']];
  html='<table><thead><tr>'+fields.map(f=>'<th>'+f[1]+'</th>').join('')+'<th>毛利率</th><th>操作</th></tr></thead><tbody>';
  html+=state.rows.map(r=>'<tr data-id="'+esc(r.id)+'">'+fields.map(([k,label])=>'<td><input aria-label="'+esc(r.customer+' '+label)+'" data-key="'+k+'" value="'+esc(r[k])+'"></td>').join('')+'<td>'+pct(num(r.revenue)===0?null:num(r.profit)/num(r.revenue))+'</td><td><button class="small delete-row" aria-label="删除 '+esc(r.customer)+'">删除</button></td></tr>').join('')+'</tbody></table>';
 }
 $('tableWrap').innerHTML=html;
}
function applyCell(e){
 if(!e.target.dataset.key)return;
 const input=e.target,key=input.dataset.key,row=state.rows.find(r=>r.id===input.closest('tr').dataset.id),value=input.value.trim();
 try {
  if(numeric.includes(key))num(value);else if(!value||value.length>200)throw Error('文字不能为空，且最多 200 字');
  if(value===row[key])return;
  commit(()=>row[key]=value);
  input.closest('tr').querySelector('td:nth-last-child(2)').textContent=pct(num(row.revenue)===0?null:num(row.profit)/num(row.revenue));
 }catch(err){input.value=row[key];toast(err.message);}
}
$('tableWrap').addEventListener('change',applyCell);
$('tableWrap').addEventListener('focusout',applyCell);
$('tableWrap').addEventListener('click',e=>{
 const b=e.target.closest('.delete-row');if(!b)return;
 if(state.rows.length===1)return toast('至少保留一条记录');
 const id=b.closest('tr').dataset.id;
 commit(()=>state.rows=state.rows.filter(r=>r.id!==id));renderTable();
});
$('addRow').onclick=()=>{commit(()=>state.rows.push({id:'r'+Date.now(),sourceRow:null,customer:'新增客户',industry:'未归类',strategic:'未归类',tier:'尾部客户',revenue:'0',cost:'0',profit:'0',reportedShare:null,reportedMargin:null}));renderTable();$('tableWrap').scrollTop=$('tableWrap').scrollHeight;};
function parseDelimited(text) {
 text=text.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
 const delimiter=text.split('\n')[0].includes('\t')?'\t':',';
 const out=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(!quoted&&(c===delimiter||c==='\n')){row.push(cell);cell='';if(c==='\n'){if(row.some(v=>v.trim()))out.push(row);row=[];}}
  else cell+=c;
 }
 if(quoted)throw Error('CSV 引号未闭合');
 row.push(cell);if(row.some(v=>v.trim()))out.push(row);
 if(out.length<2)throw Error('至少需要一行表头和一行数据');
 const header=out.shift().map(v=>v.trim().replace(/[（）]/g,c=>c==='（'?'(':')'));
 const aliases={customer:['客户名称','customer'],industry:['行业L1','industry'],strategic:['客户战略行业','strategic'],tier:['客户分层','tier'],revenue:['实际收入税后','收入','收入(元)','revenue'],cost:['实际成本税后','成本','成本(元)','cost'],profit:['实际毛利额(含交付)','毛利','毛利(含交付,元)','profit']};
 const mapping={};Object.entries(aliases).forEach(([key,list])=>{mapping[key]=header.findIndex(h=>list.includes(h));if(mapping[key]<0&&['industry',...numeric].includes(key))throw Error('缺少必要列：'+list[0]);});
 return out.map((r,i)=>{
  const x={id:'import-'+Date.now()+'-'+i,sourceRow:i+2,reportedMargin:null,reportedShare:null};
  Object.entries(mapping).forEach(([k,index])=>{if(index<0)return;x[k]=(r[index]||'').trim();if(numeric.includes(k))num(x[k]);else if(!x[k])throw Error('第 '+(i+2)+' 行的 '+k+' 为空');});
  x.customer ||= x.industry;x.strategic ||= x.industry;x.tier ||= '全部客户';return x;
 });
}
function applyImport(text,file) {
 const rows=parseDelimited(text);
 validate(Object.assign({},state,{rows:rows}));
 commit(()=>{state.rows=rows;state.source={file:file,sheet:'导入数据',range:'1:'+String(rows.length+1)};});
 renderTable();toast('已导入 '+rows.length+' 条记录，样式已保留');
}
$('importCSV').onclick=()=>$('csvFile').click();
$('csvFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{applyImport(await f.text(),f.name);}catch(err){toast('导入失败：'+err.message);}e.target.value='';};
$('pasteTable').onclick=()=>{$('pasteArea').value='';$('pasteError').textContent='';$('pasteDialog').showModal();};
$('applyPaste').onclick=()=>{try{applyImport($('pasteArea').value,'粘贴表格');$('pasteDialog').close();}catch(err){$('pasteError').textContent=err.message;}};
function csvCell(v){return '"'+String(v??'').replace(/"/g,'""')+'"';}
$('exportCSV').onclick=()=>{
 let rows;
 if(mode==='summary')rows=[[dimensions[state.settings.dimension],'客户记录','收入(元)','成本(元)','毛利(含交付,元)','毛利率','收入占比']].concat(sorted(aggregate().groups).map(g=>[g.name,g.count,g.revenue,g.cost,g.profit,g.margin,g.share]));
 else rows=[['客户名称','客户战略行业','客户分层','行业L1','实际收入税后','实际成本税后','实际毛利额（含交付)']].concat(state.rows.map(r=>[r.customer,r.strategic,r.tier,r.industry,r.revenue,r.cost,r.profit]));
 download('\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n'),mode==='summary'?'行业汇总.csv':'客户源数据.csv','text/csv;charset=utf-8');
};

function selectInspector(tab){
 for(const id of ['tab-style','tab-notes']){const active=id===tab;$(id).setAttribute('aria-selected',String(active));$(id).tabIndex=active?0:-1;}
 $('stylePanel').hidden=tab!=='tab-style';$('notesPanel').hidden=tab!=='tab-notes';
}
for(const id of ['tab-style','tab-notes']){
 $(id).onclick=()=>selectInspector(id);
 $(id).onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?'tab-style':e.key==='End'?'tab-notes':id==='tab-style'?'tab-notes':'tab-style';selectInspector(next);$(next).focus();}};
}
document.querySelectorAll('[data-mobile-view]').forEach(b=>b.onclick=()=>{document.querySelector('.shell').dataset.mobile=b.dataset.mobileView;document.querySelectorAll('[data-mobile-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
document.querySelectorAll('.menu-items button').forEach(b=>b.addEventListener('click',()=>b.closest('details').open=false));
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.menu[open]').forEach(m=>m.open=false);});
let portfolioController=null;
$('openPortfolio').onclick=()=>{$('portfolioDialog').showModal();portfolioController?.dispose();portfolioController=window.PortfolioApp.mount($('portfolioMount'),JSON.parse($('portfolio-example').textContent));};
$('portfolioDialog').addEventListener('close',()=>{portfolioController?.dispose();portfolioController=null;});
document.querySelectorAll('[data-preview-mode]').forEach(b=>b.onclick=()=>commit(()=>state.settings.htmlMode=b.dataset.previewMode));
sync();render();
})();
