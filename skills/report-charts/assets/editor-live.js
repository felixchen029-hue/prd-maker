(function(){
'use strict';
let active=null;
function dispose(){if(!active)return;active.observer.disconnect();active.instance.dispose();active.layer.remove();active.body.style.visibility='';active=null;}
function mount(root,result,settings){
 dispose();const body=root.querySelector('svg > svg');if(!body)return;
 const layer=document.createElement('div');layer.className='live-chart-layer';layer.setAttribute('aria-label','可交互图表，悬停或点按查看数值');
 layer.style.cssText='position:absolute;left:0;top:0;transform-origin:top left;width:'+result.width+'px;height:'+result.geometry.bodyH+'px;';root.style.position='relative';root.append(layer);body.style.visibility='hidden';
 const instance=echarts.init(layer,null,{renderer:'svg',width:result.width,height:result.geometry.bodyH}),option=result.option;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches||settings.motion==='off';
 option.animation=!reduced;option.animationDuration=650;option.animationDurationUpdate=280;option.animationEasing='cubicOut';
 const number=n=>Number.isFinite(Number(n))?Number(n).toLocaleString('zh-CN',{maximumFractionDigits:2}):'—';
 const units=({1:'元',10000:'万元',100000000:'亿元'})[settings.scale];
 function itemText(param){
  const values=param.value,name=String(param.name||''),series=String(param.seriesName||'').replace(/^\u0000.*$/,'');
  if(param.seriesType==='pie')return name+'\n收入：'+number(values/settings.scale)+' '+units+'\n占比：'+number(param.percent)+'%';
  if(param.seriesType==='treemap')return name+'\n收入：'+number(values/settings.scale)+' '+units;
  if(settings.chart==='bubble')return name+'\n收入：'+number(values[0])+' '+units+'\n毛利率：'+number(values[1])+'%\n客户记录：'+number(values[2]);
  if(settings.chart==='scatter')return name+'\n成本：'+number(values[0])+' '+units+'\n毛利：'+number(values[1])+' '+units;
  if(settings.chart==='boxplot'){const category=option.xAxis.data[param.seriesType==='scatter'?values[0]:param.dataIndex];return category+'\n'+(param.seriesType==='scatter'?'离群值：'+number(values[1]):'须与四分位：'+values.slice(-5).map(number).join(' / '))+' '+units;}
  if(settings.chart==='waterfall')return '收入贡献：'+number(values[2]/settings.scale)+' '+units+'\n累计收入：'+number(values[1])+' '+units;
  if(Array.isArray(values))return (settings.chart==='stack'?'净收入':series||name)+'：'+number(settings.orientation==='horizontal'?values[0]:values[1])+' '+units;
  const ratio=settings.chart==='margin'||settings.chart==='share'||settings.chart==='pie'||series.includes('占比');return (series||name)+'：'+number(values)+(ratio?'%':settings.chart==='histogram'?' 条':' '+units);
 }
 const itemMode=['share','pie','treemap','scatter','bubble','boxplot'].includes(settings.chart);
 option.tooltip={trigger:itemMode?'item':'axis',renderMode:'richText',confine:true,backgroundColor:'#fff',borderColor:'#dbe2eb',textStyle:{color:'#26344b',fontSize:13},axisPointer:{type:'shadow',shadowStyle:{color:'rgba(91,134,229,.07)'}},formatter:params=>{if(Array.isArray(params))return String(params[0]?.axisValueLabel||'')+'\n'+params.filter(p=>p.seriesType!=='custom'&&!(settings.chart==='lollipop'&&p.seriesType==='bar')).map(itemText).join('\n');return itemText(params);}};
 for(const series of option.series){series.silent=false;series.emphasis={focus:'self',itemStyle:{opacity:1}};}
 instance.setOption(option);
 const resize=()=>{const factor=root.clientWidth/result.width;layer.style.top=result.geometry.plotY*factor+'px';layer.style.transform='scale('+factor+')';};
 const observer=new ResizeObserver(resize);observer.observe(root);resize();active={instance,layer,body,observer};
}
window.ReportChartsLive={mount,dispose};
})();
