// Plays the game headless at high speed (with deliberate mistakes) and records every sentence it speaks.
// Usage: node tools/crawl.js <ar|en> <challenges> <out.json>   (needs puppeteer-core + Google Chrome)
const path=require('path'),fs=require('fs');
const puppeteer=require(process.env.PUPPETEER_PATH||'puppeteer-core');
const [lang,count,outFile]=[process.argv[2]||'ar',+(process.argv[3]||400),process.argv[4]||`phrases_${process.argv[2]||'ar'}.json`];
const GAME=path.join(__dirname,'..','index.html');
let src=fs.readFileSync(GAME,'utf8');
const rep=(a,b)=>{if(!src.includes(a))throw new Error('missing: '+a.slice(0,60));src=src.replace(a,b)};
rep('<head>',`<head><script>window.__rec=[];window.__e=[];onerror=(m,u,l,c)=>__e.push(m+' @'+l);addEventListener('unhandledrejection',e=>__e.push('REJ '+(e.reason&&e.reason.stack||e.reason)));
try{localStorage.setItem('blockmath.ar.v1',JSON.stringify({lang:'${lang}',level:1}))}catch(e){}</script>`);
rep("const wait=s=>new Promise(r=>setTimeout(r,s*1000));","const wait=s=>new Promise(r=>setTimeout(r,s*30));");
rep("Math.min(3.4,","Math.min(30,");
if(process.env.TYPES)rep('const type=pick(pool);',`const type=pick(${JSON.stringify(process.env.TYPES.split(','))}.filter(t=>base.includes(t)).concat(['count']).slice(0,99));`);
rep("const dt=Math.min(0.05,","const dt=Math.min(0.3,");
rep("renderer.render(scene,camera);requestAnimationFrame(loop)}","requestAnimationFrame(loop)}");
rep("function startChallenge(){const ch=P.seg.challenge;","function startChallenge(){const ch=P.seg.challenge;window.__ch=ch;ch.__w=Math.random()<0.55;window.__n=(window.__n||0)+1;window.__T={numTap,mineTap,bridgePlace,towerAdd,towerDone,towerRemove,feedTap,orderTap,shareTap,colorTap,oddTap,shopTap,shopPay,shopBack,fishTap,fishDone,fishRelease,shapeTap,sizeTap,posTap,golemPlace,torchTap,torchDone,beeTap,shadowTap,hatchTap,homeAdd,homeUndo,homeDone,sortPut,mobTap,propTap,npcTap,updaters,force:c=>correct(c,null),enterBuild,exitBuild,buildTap,P,setMode:m=>{buildMode=m}};");
const harness=`<script>
const B=()=>window.__blockmath, q=s=>document.querySelector(s);
setTimeout(()=>{q('#kidRow').children[1].click();q('#kidRow').children[0].click();q('#btnLang').click();q('#btnLang').click();q('#btnPlay').click()},2500);
let lastCh=null,step=0,lastT=Date.now();
setInterval(()=>{const T=window.__T,c=window.__ch,S=B()&&B().S;if(!S)return;
  if(c&&c.active&&!c.__rep){c.__rep=1;q('#btnRepeat').click()}
  if(c&&c===lastCh&&c.active&&!c.done&&Date.now()-lastT>30000){(window.__stalls=window.__stalls||[]).push({type:c.type,q:q('#qtext').textContent,tries:c.tries});lastT=Date.now();T.force(c)}
  if(window.__n&&c!==lastCh){lastCh=c;lastT=Date.now();step=0;S.level=1+((window.__n/3|0)%3);S.kid=(window.__n%7<3)?'girl':'boy';S.name=(window.__n%2)?'laith':'faris'}
  step++;
  if(!q('#reward').classList.contains('hidden'))q('#rbtn').click();
  const fork=q('.fork');if(fork&&T&&T.P.state==='fork'){if(window.__n%12===5&&!c.__built){c.__built=1;T.enterBuild();for(let i=0;i<5;i++)T.buildTap(200+i*90,380+i*20);T.buildTap(450,650);T.buildTap(450,250);T.setMode('break');T.buildTap(450,520);T.buildTap(300,400);T.exitBuild();return}fork.click();return}
  if(!c||!c.active||c.done)return;
  const w=c.__w&&!c.__wd;const done=()=>{c.__wd=1};
  const ans=(ok)=>{const b=q('#answers [data-ok="'+(ok?1:0)+'"]:not([disabled])');if(b){b.click();return true}};
  switch(c.type){
    case 'find':case 'bigger':{const bl=c.blocks.filter(x=>x.parent);const o=w?bl.find(x=>x.userData.num!==c.target):bl.find(x=>x.userData.num===c.target);done();o&&T.numTap(c,o);return}
    case 'colorFind':{const o=w?c.blocks.find(x=>x.userData.col!==c.target&&x.parent):c.blocks.find(x=>x.userData.col===c.target);done();o&&T.colorTap(c,o);return}
    case 'oddOne':{const o=c.things.find(x=>!!x.userData.odd!==!!w);done();o&&T.oddTap(c,o);return}
    case 'order':{const o=w?c.blocks.find(x=>!x.userData.placed&&x.userData.num!==c.sorted[c.next]):c.blocks.find(x=>x.userData.num===c.sorted[c.next]);done();o&&T.orderTap(c,o);return}
    case 'mine':if(c.wall&&c.wall.length&&!c.mineDone){const o=w?c.wall.find(x=>!x.userData.ore):c.wall.find(x=>x.userData.ore);done();o&&T.mineTap(c,o);return}break;
    case 'feed':{const fed=c.animals.find(x=>x.userData.fed);if(w&&fed){done();T.feedTap(c,fed);return}const a=c.animals.find(x=>!x.userData.fed);if(a){T.feedTap(c,a);return}break}
    case 'bridge':T.bridgePlace(c);return;
    case 'tower':{const goal=c.n+(w?1:0);if(c.stack.length<goal){T.towerAdd(c);return}if(c.stack.length>goal){T.towerRemove(c);return}T.towerDone(c);if(w)done();return}
    case 'shop':{const goal=c.price+(w?1:0);const coin=c.coins.find(x=>!x.userData.paid);if(c.paid.length<goal&&coin){T.shopTap(c,coin);return}T.shopPay(c);if(w){done();T.shopBack(c)}return}
    case 'scale':if(!c.balanced){const goal=c.a+(w?1:0);const n=c.stacks[c.light].length;const add=q('[data-act="add"]'),rem=q('[data-act="remove"]');
      if(n<goal&&add){add.click();return}if(w&&rem){done();rem.click();return}}break;
    case 'fishing':{const goal=c.n+(w?1:0);const f=c.fish.find(x=>!x.userData.caught);if(c.caught.length<goal&&f){T.fishTap(c,f);return}T.fishDone(c);if(w){done();T.fishRelease(c)}return}
    case 'shapes':{const o=c.blocks.find(x=>x.parent&&(x.userData.shape===c.target)!==!!w);done();o&&T.shapeTap(c,o);return}
    case 'sizes':if(!c.asking){const o=c.things.find(x=>(x.userData.size===c.target)!==!!w);done();o&&T.sizeTap(c,o);return}break;
    case 'position':{if(c.busy)return;const k=w?c.spots.find(s=>s!==c.target):c.target;done();T.posTap(c,k);return}
    case 'golem':if(!c.built){if(c.busy)return;if(w){done();T.golemPlace(c,'head');return}T.golemPlace(c,c.placed<c.body?'body':'head');return}break;
    case 'torches':{if(!c.prompt||c.sunrise)return;const goal=c.n+(w?1:0);if(c.lit.length<goal){T.torchTap(c,c.pads.find(p=>!p.userData.torch));return}
      if(c.lit.length>goal){T.torchTap(c,c.pads.find(p=>p.userData.torch));return}T.torchDone(c);if(w)done();return}
    case 'bees':if(!c.asked){const b=c.bees.find(x=>!x.userData.done&&!x.userData.fly);if(b)T.beeTap(c,b);return}break;
    case 'shadow':{const o=c.things.find(x=>(x.userData.kind===c.target)!==!!w);done();o&&T.shadowTap(c,o);return}
    case 'hatch':{const e=c.eggs.find(x=>x.parent&&!x.userData.hatched);if(e){T.hatchTap(c,e);return}break}
    case 'home':{if(w&&!c.__x){c.__x=1;T.homeAdd(c,c.extra||c.need[0][0]);T.homeDone(c);done();return}if(c.__x===1){c.__x=2;T.homeUndo(c);return}
      for(const [k,n] of c.need)if(c.placed.filter(p=>p.k===k).length<n){T.homeAdd(c,k);return}T.homeDone(c);return}
    case 'sort':{if(c.busy||!c.cur)return;const good=['apple','carrot','cookie','egg'].includes(c.cur.userData.key)?'food':'gem';T.sortPut(c,w?(good==='food'?'gem':'food'):good);if(w)done();return}
    case 'share':if(c.pile.length){T.shareTap(c,w?0:(c.pile.length%2));if(!c.pile.length)done();return}break;
  }
  if(w&&ans(false)){done();return}
  ans(true);
},120);
</script></body>`;
src=src.replace('</body>',harness);
const tmp=path.join(__dirname,'..','.crawl_'+lang+'_'+process.pid+'.html'); fs.writeFileSync(tmp,src); // next to index.html so vendor/ and audio/ resolve
(async()=>{const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  const pg=await b.newPage();await pg.setViewport({width:900,height:700});const perr=[];pg.on('pageerror',e=>perr.push(e.message));
  await pg.goto('file://'+tmp);const t0=Date.now();
  while(true){await new Promise(r=>setTimeout(r,3000));let n=0;try{n=await pg.evaluate(()=>window.__n||0)}catch(e){console.log('\nframe error, stopping early:',e.message);break}process.stdout.write(`\r${lang}: ${n}/${count} challenges`);if(n>=count||Date.now()-t0>40*60e3)break}
  const res=await pg.evaluate(()=>{const B=window.__blockmath,S=B.S;const texts=window.__rec.map(r=>r[1]);
    for(const [kid,name] of [['boy','faris'],['boy','laith'],['girl','faris']]){S.kid=kid;S.name=name;texts.push(...B.speechCatalog())}
    const keys=new Set();texts.forEach(t=>B.splitSpeech(t,S.lang==='en'?'en':'ar').forEach(p=>keys.add(p.k)));return {texts:[...new Set(texts)],keys:[...keys],errors:window.__e,stalls:window.__stalls||[]}});
  fs.writeFileSync(outFile,JSON.stringify(res,null,1));console.log(`\n${lang}: ${res.texts.length} sentences → ${res.keys.length} clips; errors: ${JSON.stringify(res.errors.concat(perr)).slice(0,500)}; stalls: ${JSON.stringify(res.stalls).slice(0,600)}`);
  await b.close();fs.unlinkSync(tmp)})();
