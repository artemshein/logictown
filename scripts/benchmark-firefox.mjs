// Serves instrumented historical snapshots without modifying the checkout.
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,copyFileSync,symlinkSync,appendFileSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const temp=realpathSync(mkdtempSync(join(tmpdir(),'logictown-benchmark-')));
const results=join(temp,'results.jsonl');
const git=(...args)=>execFileSync('git',args,{cwd:root});
for(const [label,ref,port] of [['before',process.argv[2]||'25fe752',5181],['after',process.argv[3]||'ae618e8',5182]]){
 const dir=join(temp,label);mkdirSync(dir);
 for(const file of git('ls-tree','-r','--name-only',ref).toString().trim().split('\n')){
  if(!file.startsWith('src/')&&!['index.html','package.json','tsconfig.json'].includes(file))continue;
  const target=join(dir,file);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,git('show',`${ref}:${file}`));
 }
 for(const name of ['public','node_modules'])symlinkSync(join(root,name),join(dir,name),'dir');
 copyFileSync(join(root,'scripts/benchmark-sampler.ts'),join(dir,'src/benchmark.ts'));
 let main=git('show',`${ref}:src/main.ts`).toString();
 main="import {startBenchmark} from './benchmark';\n"+main;
 main=main.replace('for(const id of houseRooms.keys())if(id!==initialRoom)await interior.ensure(id);',`for(const id of houseRooms.keys())if(id!==initialRoom)await interior.ensure(id);\nstartBenchmark(scene,engine,'${label}');`);
 if(label==='before'){
  main=main.replace('const engine=new Engine',"const experiment=new URLSearchParams(location.search).get('experiment')||'baseline';\nconst engine=new Engine");
  main=main.replace('preserveDrawingBuffer:true',"preserveDrawingBuffer:experiment!=='buffer'");
  main=main.replace('const shadow=new ShadowGenerator(2048,sun)',"if(experiment==='fps')engine.maxFPS=60;\nconst shadow=new ShadowGenerator(experiment==='shadows'?1024:2048,sun)");
  let art=git('show',`${ref}:src/art.ts`).toString();
  art=art.replace('pipeline.samples=4',"pipeline.samples=new URLSearchParams(location.search).get('experiment')==='msaa'?1:4");
  art=art.replace('if(scene.getEngine().getCaps().drawBuffersExtension)',"if(new URLSearchParams(location.search).get('experiment')!=='ssao'&&scene.getEngine().getCaps().drawBuffersExtension)");
  writeFileSync(join(dir,'src/art.ts'),art);
 }
 writeFileSync(join(dir,'src/main.ts'),main);
 const server=await createServer({root:dir,configFile:false,cacheDir:join(dir,'.vite'),server:{host:'127.0.0.1',port,strictPort:true,fs:{allow:[temp,root]}},plugins:[{name:'benchmark-results',configureServer(s){s.middlewares.use('/benchmark-result',(req,res)=>{let body='';req.on('data',c=>body+=c);req.on('end',()=>{try{const result=JSON.parse(body);appendFileSync(results,JSON.stringify(result)+'\n');console.log(result)}catch{res.statusCode=400}res.end()})})}}]});
 await server.listen();console.log(`${label}: http://localhost:${port}/`);
}
console.log('Use the same Firefox tab and window size. Wait 45 seconds per run.');
console.log('Before ablations: ?experiment=ssao or ?experiment=msaa');
console.log('Results: '+results);
