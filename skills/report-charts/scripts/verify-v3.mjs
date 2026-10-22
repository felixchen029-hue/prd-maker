import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),R=require('../assets/report-charts.cjs');
const fixture={period:'模拟期间',data:[10,20,30,40,1000].map((revenue,i)=>({industry:i<4?'甲行业':'乙行业',customer:'客户'+i,revenue,cost:revenue*.2,profit:revenue*.7}))};
const hash=s=>createHash('sha256').update(s).digest('hex');
const render=(chart,style={})=>R.render({...fixture,chart,style});
const histogram=render('histogram',{bins:10});
assert.equal(histogram.analysis.bins.reduce((n,b)=>n+b.count,0),5,'Every record belongs to exactly one bin');
assert.equal(histogram.analysis.bins.at(-1).count,1,'Maximum belongs to the closed last bin');
assert.equal(histogram.analysis.samples,5);
const boxes=render('boxplot').analysis.boxes;
const alpha=boxes.find(g=>g.name==='甲行业');
assert.deepEqual([alpha.q1,alpha.median,alpha.q3,alpha.low,alpha.high],[17.5,25,32.5,10,40]);
const outlier=R.render({chart:'boxplot',data:[1,2,3,4,100].map(revenue=>({industry:'行业',revenue,cost:0,profit:0}))});
assert.deepEqual(outlier.analysis.boxes[0].outliers,[100]);
assert.equal(render('pareto').analysis.cumulative.at(-1),100);
assert.ok(render('pareto',{top:1}).groups.some(g=>g.name==='其他行业'),'TopN must retain the remaining revenue');
const signed={chart:'waterfall',data:[{industry:'正',revenue:100,cost:5,profit:90},{industry:'负',revenue:-30,cost:2,profit:-40}]};
const water=R.render(signed);
assert.equal(water.analysis.net,70);
assert.deepEqual(water.analysis.steps.map(g=>[g.start,g.end]),[[0,100],[100,70]]);
assert.equal(water.option.series[0].data.at(-1)[2],.007,'Waterfall coordinates use the displayed scale');
for(const chart of ['pie','share','treemap','pareto'])assert.ok(R.render({...signed,chart}).warnings.length,'Signed data must have a visible caveat/fallback');
const zero={chart:'bubble',data:[{industry:'零',revenue:0,cost:1,profit:-1}]};
assert.equal(R.render(zero).analysis.omitted,1,'Undefined margin is omitted rather than shown as zero');
assert.throws(()=>render('histogram',{bins:7.5}));
assert.throws(()=>render('revenue',{fill:'css(...)'}));
let renders=0;
for(const chart of Object.keys(R.chartNames))for(const width of [560,1100])for(const orientation of ['vertical','horizontal']){
 const request={...fixture,chart,style:{width,orientation,showTable:true}};
 const a=R.render(request),b=R.render(request);renders+=2;
 assert.equal(hash(a.svg),hash(b.svg),chart+' must render deterministically');
 assert.equal(a.total.revenue,1100);assert.equal(a.total.cost,220);assert.equal(a.total.profit,770);
 assert.ok(!/NaN|Infinity|foreignObject|<image\b/.test(a.svg),chart+' must remain a finite vector graphic');
 assert.equal(R.render(a.project).svg,a.svg,'Saved project must round-trip exactly');
}
for(const fill of ['solid','gradient','texture','gradient-texture','duotone','striped','dotted','outline']){
 const r=render('stack',{fill});assert.ok(!/NaN|Infinity/.test(r.svg));
 if(['texture','gradient-texture','striped','dotted'].includes(fill))assert.ok(r.svg.includes('<pattern'));
}
const empty=R.normalize(fixture);empty.settings.tier='不存在的分层';
for(const chart of Object.keys(R.chartNames)){empty.settings.chart=chart;const r=R.render(empty);assert.ok(!/NaN|Infinity/.test(r.svg));assert.ok(r.warnings.some(w=>w.includes('没有记录')));}
console.log(JSON.stringify({status:'passed',chartTypes:Object.keys(R.chartNames).length,deterministicRenders:renders,assertions:'statistics, signed values, bin boundaries, project round-trip, empty filters, vector fills'}));
