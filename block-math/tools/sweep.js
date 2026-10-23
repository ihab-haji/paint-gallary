// Builds every puzzle type many times (random settings, boy/girl wording), taps every object and answer,
// and records every sentence the game would speak, so the voice covers combinations random play never reaches.
// PROMPTS_ONLY=1 records just each puzzle's instructions (fast, use many rounds).
// Usage: node tools/sweep.js <ar|en> <rounds per type> <out.json> [type,type,...]   (needs puppeteer-core + Google Chrome)
// Feed out.json to tools/keys.js together with the crawl.js phrase files.
const path=require('path'),fs=require('fs');
const puppeteer=require(process.env.PUPPETEER_PATH||'puppeteer-core');
const [lang,rounds,outFile,only]=[process.argv[2]||'ar',+(process.argv[3]||40),process.argv[4]||`sweep_${process.argv[2]||'ar'}.json`,process.argv[5]];
let src=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const rep=(a,b)=>{if(!src.includes(a))throw new Error('missing: '+a.slice(0,60));src=src.replace(a,b)};
rep('<head>',`<head><script>window.__rec=[];window.__e=[];onerror=(m,u,l)=>__e.push(m+' @'+l);addEventListener('unhandledrejection',e=>__e.push('REJ '+(e.reason&&e.reason.message||e.reason)));
try{localStorage.setItem('blockmath.ar.v1',JSON.stringify({lang:'${lang}',level:1}))}catch(e){}</script>`);
rep("const wait=s=>new Promise(r=>setTimeout(r,s*1000));","const wait=s=>new Promise(r=>setTimeout(r,s*30));");
rep("const type=pick(pool);","const type=window.__forceType||pick(pool);");
rep("/* ---------- boot ---------- */",`window.__X={planChallenge,buildChallenge,H,S,BIOMES,BIOME_KEYS,DIRS,scene,tappables,updaters,removeLabel,clearLabels,hideQ,clearAnswers,posTap,golemPlace,sortPut,homeAdd,homeDone,homeUndo,torchTap,torchDone,beeTap,hatchTap,
  mockSeg(biome){const dir=(Math.random()*4)|0,f=DIRS[dir],r={x:-f.z,z:f.x},start={x:0,z:0},st=14;
    return {start,dir,f,r,len:34,st,biome,keys:[],pathKeys:[],group:new THREE.Group(),gems:[],solids:[],challengeDone:false,at:(t,s,y=0)=>new V3(f.x*t+r.x*s,y,f.z*t+r.z*s)}},
  dispose(seg){seg.group.traverse(o=>{tappables.delete(o);updaters.delete(o);removeLabel(o)});scene.remove(seg.group);clearLabels();hideQ();clearAnswers()}};
/* ---------- boot ---------- */`);
rep("renderer.render(scene,camera);requestAnimationFrame(loop)}","requestAnimationFrame(loop)}"); // no drawing needed, only speech
const tmp=path.join(__dirname,'..','.sweep_'+lang+'_'+process.pid+'.html');fs.writeFileSync(tmp,src); // next to index.html so vendor/ resolves
const SEA_ONLY=['fishing','fishJump','fishColor'];
(async()=>{const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',protocolTimeout:0,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const pg=await b.newPage();await pg.setViewport({width:900,height:700});await pg.goto('file://'+tmp);await new Promise(r=>setTimeout(r,3500));
  const types=only?only.split(','):await pg.evaluate(()=>Object.keys(window.__X.H));
  for(const type of types){const n=await pg.evaluate(async(type,R,seaOnly,promptsOnly)=>{const X=window.__X,S=X.S,sl=ms=>new Promise(r=>setTimeout(r,ms));const before=window.__rec.length;
      const land=X.BIOME_KEYS.filter(k=>!X.BIOMES[k].sea);
      for(const [kid,name] of [['boy','faris'],['boy','laith'],['girl','faris']]){S.kid=kid;S.name=name;
        for(let i=0;i<R;i++){S.level=1+(i%3);const biome=seaOnly.includes(type)?'sea':(i%5===4?'sea':land[i%land.length]);const seg=X.mockSeg(biome);window.__forceType=type;
          let ch;try{ch=X.planChallenge(seg);seg.challenge=ch;ch.riverFrom=seg.st+2;X.buildChallenge(seg);X.scene.add(seg.group)}catch(e){window.__e.push('build '+type+': '+e.message);continue}
          ch.active=true;ch.counter=0;ch.tries=0;
          try{await Promise.race([Promise.resolve(X.H[type](ch)),sl(1500),promptsOnly&&(async()=>{for(let j=0;j<60&&!ch.prompt;j++)await sl(25)})()].filter(Boolean))}catch(e){window.__e.push('H '+type+': '+e.message)}
          if(ch.prompt)window.__rec.push([S.lang,ch.prompt]); // full instructions (spoken the first time and by the 🔊 button)
          if(promptsOnly){ch.done=true;X.dispose(seg);continue}
          await sl(30);
          // every wrong answer button, then the right one
          try{for(const bt of document.querySelectorAll('#answers [data-ok="0"]')){if(ch.done)break;bt.click()}
            const objs=[];seg.group.traverse(o=>{if(o.userData&&o.userData.tap)objs.push(o)});objs.sort(()=>Math.random()-0.5);
            if(type==='position'&&kid==='boy'&&name==='faris'){for(const k of [...ch.spots].sort(()=>Math.random()-0.5)){if(ch.done)break;await X.posTap(ch,k)}}
            else if(type==='golem'){await X.golemPlace(ch,'head');for(let j=0;j<ch.body;j++)await X.golemPlace(ch,'body');await X.golemPlace(ch,'body');await X.golemPlace(ch,'head');await sl(200)}
            else if(type==='sort'){for(let j=0;j<8&&ch.cur;j++){await X.sortPut(ch,Math.random()<0.5?'food':'gem')}}
            else if(type==='home'){X.homeAdd(ch,ch.extra||ch.need[0][0]);X.homeDone(ch);X.homeUndo(ch);for(const [k,c] of ch.need)for(let j=0;j<c;j++)X.homeAdd(ch,k);X.homeAdd(ch,ch.need[0][0]);X.homeDone(ch);X.homeUndo(ch);X.homeDone(ch)}
            else if(type==='torches'){for(let j=0;j<20&&!ch.prompt;j++)await sl(30);for(const p of ch.pads.slice(0,ch.n+1))X.torchTap(ch,p);X.torchDone(ch);X.torchTap(ch,ch.pads[0]);X.torchTap(ch,ch.pads[0]);X.torchTap(ch,ch.pads[0]);X.torchDone(ch)}
            else if(type==='bees'){for(const bee of ch.bees)await X.beeTap(ch,bee);await sl(100);for(const bt of document.querySelectorAll('#answers [data-ok="0"]'))bt.click()}
            else if(type==='hatch'){for(const e of [...ch.eggs])await X.hatchTap(ch,e);await sl(100)}
            else for(const o of objs){if(ch.done)break;try{o.userData.tap(o)}catch(e){}}
            await sl(60);for(const bt of document.querySelectorAll('#answers [data-ok="0"]:not([disabled])')){if(ch.done)break;bt.click()}
            const ok=document.querySelector('#answers [data-ok="1"]:not([disabled])');if(ok&&!ch.done)ok.click()}catch(e){window.__e.push('tap '+type+': '+e.message)}
          await sl(40);ch.done=true;X.dispose(seg)}}
      return window.__rec.length-before},type,rounds,SEA_ONLY,!!process.env.PROMPTS_ONLY);
    process.stdout.write(`${type}:${n} `)}
  const res=await pg.evaluate(()=>{const B=window.__blockmath,S=B.S;const texts=window.__rec.filter(r=>r[0]===S.lang||(S.lang!=='en'&&r[0]!=='en')).map(r=>r[1]);
    for(const [kid,name] of [['boy','faris'],['boy','laith'],['girl','faris']]){S.kid=kid;S.name=name;texts.push(...B.speechCatalog())}
    return {texts:[...new Set(texts)],errors:[...new Set(window.__e)].slice(0,30)}});
  fs.writeFileSync(outFile,JSON.stringify(res,null,1));console.log(`\n${lang}: ${res.texts.length} sentences; errors: ${JSON.stringify(res.errors).slice(0,800)}`);
  await b.close();fs.unlinkSync(tmp)})();
