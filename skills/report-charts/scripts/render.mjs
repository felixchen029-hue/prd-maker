import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const R=require('../assets/report-charts.cjs'),P=require('../assets/portfolio.cjs');
async function sharpModule(){
 try{return require('sharp');}catch{}
 const home=process.env.HOME||process.env.USERPROFILE;
 const paths=[process.env.REPORT_CHARTS_SHARP,home&&path.join(home,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp')].filter(Boolean);
 for(const p of paths){try{return require(p);}catch{}}
 throw Error('PNG 导出需要 sharp。可在本 Skill 目录运行 npm install；SVG 和 HTML 不依赖 sharp。');
}
const args=process.argv.slice(2),opts={};
for(let i=0;i<args.length;i++){const k=args[i];if(['--png','--html'].includes(k))opts[k]=true;else if(['--input','--output','--width','--chart','--theme'].includes(k)){if(!args[i+1]||args[i+1].startsWith('--'))throw Error('缺少参数：'+k);opts[k]=args[++i];}else throw Error('未知参数：'+k);}
try{
 if(!opts['--input']||!opts['--output'])throw Error('用法：node scripts/render.mjs --input request.json --output output/chart [--width 1100] [--png] [--html]');
 const input=JSON.parse(await fs.readFile(path.resolve(opts['--input']),'utf8'));
 const portfolio=(opts['--chart']||input.chart||input.settings?.chart)==='portfolio'||input.kind==='portfolio';
 const engine=portfolio?P:R;
 const project=engine.normalize(input);
 if(opts['--chart']&&!portfolio)project.settings.chart=opts['--chart'];
 if(opts['--theme'])Object.assign(project.settings,portfolio?{}:(R.themes[opts['--theme']]||{}),{theme:opts['--theme']});
 const result=engine.render(project,opts['--width']?{width:Number(opts['--width'])}:undefined);
 result.project.settings.width=result.width;
 const output=path.resolve(opts['--output']);await fs.mkdir(path.dirname(output),{recursive:true});
 await fs.writeFile(output+'.svg',result.svg);
 await fs.writeFile(output+'.project.json',JSON.stringify(result.project,null,2));
 const outputs=[output+'.svg',output+'.project.json'];
 if(opts['--png']){const sharp=await sharpModule();await sharp(Buffer.from(result.svg),{density:144}).png().toFile(output+'.png');outputs.push(output+'.png');}
 if(opts['--html']){
  let html=await fs.readFile(path.join(base,portfolio?'assets/portfolio.html':'assets/editor.html'),'utf8');
  const projectJSON=JSON.stringify(result.project).replace(/</g,'\\u003c');
  html=html.replaceAll('__PROJECT_JSON__',()=>projectJSON);
  html=html.replace('__PORTFOLIO_CSS__',()=>require('fs').readFileSync(path.join(base,'assets/portfolio.css'),'utf8'));
  html=html.replace('__PORTFOLIO_EXAMPLE__',()=>require('fs').readFileSync(path.join(base,'assets/portfolio.example.json'),'utf8').replace(/</g,'\\u003c'));
  for(const [token,file] of [['__ECHARTS_JS__','vendor/echarts-5.6.0.cjs'],['__RENDERER_JS__','report-charts.cjs'],['__PORTFOLIO_ENGINE__','portfolio.cjs'],['__PORTFOLIO_APP__','portfolio-app.js'],['__LIVE_JS__','editor-live.js'],['__APP_JS__','editor.js']])html=html.replace(token,()=>'\n'+require('fs').readFileSync(path.join(base,'assets',file),'utf8').replace(/<\/script/gi,'<\\/script'));
  await fs.writeFile(output+'.html',html);outputs.push(output+'.html');
 }
 const manifest={templateVersion:engine.VERSION,kind:portfolio?'portfolio':'financial',interactiveHTML:!!opts['--html'],engineVersion:'echarts-5.6.0',width:result.width,height:result.height,svgSHA256:createHash('sha256').update(result.svg).digest('hex'),records:result.total.count,industries:result.summary.groups.length,totals:result.total,warnings:result.warnings,outputs};
 await fs.writeFile(output+'.manifest.json',JSON.stringify(manifest,null,2));
 console.log(JSON.stringify(manifest,null,2));
}catch(e){console.error(e.message);process.exitCode=1;}
