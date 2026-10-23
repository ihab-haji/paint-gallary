// Turns recorded sentences into the clip keys for every fallback level (uses the game's own splitSpeech).
// Usage: node tools/keys.js out_dir phrases1.json [phrases2.json ...]  -> out_dir/keys_ar.json, keys_en.json
const path=require('path'),fs=require('fs');const puppeteer=require(process.env.PUPPETEER_PATH||'puppeteer-core');
const [outDir,...files]=process.argv.slice(2);
const texts=[...new Set(files.flatMap(f=>JSON.parse(fs.readFileSync(f,'utf8')).texts))];
(async()=>{const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const pg=await b.newPage();await pg.goto('file://'+path.join(__dirname,'..','index.html'));await new Promise(r=>setTimeout(r,3000));
  const res=await pg.evaluate(all=>{const B=window.__blockmath,out={ar:{texts:[],keys:new Set()},en:{texts:[],keys:new Set()}};
    for(const t of all){const L=/[؀-ۿ]/.test(t)?'ar':'en';out[L].texts.push(t);for(let lv=0;lv<3;lv++)B.splitSpeech(t,L,lv).forEach(p=>out[L].keys.add(p.k))}
    return {ar:{texts:out.ar.texts,keys:[...out.ar.keys]},en:{texts:out.en.texts,keys:[...out.en.keys]}}},texts);
  for(const L of ['ar','en']){fs.writeFileSync(path.join(outDir,`keys_${L}.json`),JSON.stringify(res[L]));console.log(L,res[L].texts.length,'sentences',res[L].keys.length,'keys')}
  await b.close()})();
