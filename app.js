const $=s=>document.querySelector(s),LS='studyassist.v1';
let S={cfg:{provider:'gemini',model:'gemini-3.8-flash',key:''},subject:'',ch:[]},cur=-1,tab='all',file=null,busy=false;
try{Object.assign(S,JSON.parse(localStorage.getItem(LS)||'{}'))}catch(e){}
if(S.cfg.provider=='gemini'&&/gemini-(1\.|2\.)/.test(S.cfg.model))S.cfg.model='gemini-3.8-flash';
const save=()=>{try{localStorage.setItem(LS,JSON.stringify(S))}catch(e){}};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const st=(t,err,spin)=>{$('#st').textContent=t;$('#bar').className=err?'err':spin?'spin':''};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const TABS=[['all','All'],['notes','Notes'],['q2','2 Marks'],['q5','5 Marks'],['q10','10 Marks'],['mm','Mindmaps']];
const DEF={gemini:'gemini-3.8-flash',anthropic:'claude-sonnet-5-5'};
window.addEventListener('error',e=>st('Error: '+e.message,1));
window.addEventListener('unhandledrejection',e=>st('Error: '+(e.reason?.message||e.reason),1));

function md(t){let h='',ul=false,m;for(let l of String(t||'').split('\n')){l=esc(l).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
 if(m=l.match(/^\s*[-*•]\s+(.*)/)){if(!ul){h+='<ul>';ul=true}h+='<li>'+m[1]+'</li>';continue}
 if(ul){h+='</ul>';ul=false}
 if(m=l.match(/^#{1,4}\s+(.*)/))h+='<h3>'+m[1]+'</h3>';else if(l.trim())h+='<p>'+l+'</p>'}
 return h+(ul?'</ul>':'')}

function mm(t){const C=['#6366f1','#10b981','#f59e0b','#ef4444','#06b6d4','#a855f7','#84cc16'],RH=34,N=[];let y=0;
 const lay=(n,d,col,p)=>{n.t=String(n.t||'');n.d=d;n.col=col;n.p=p;n.w=Math.max(70,n.t.length*7+22);const k=Array.isArray(n.c)?n.c.filter(Boolean):[];n.c=k;
  if(!k.length){n.y=y;y+=RH}else{k.forEach((c,i)=>lay(c,d+1,d?col:C[i%C.length],n));n.y=(k[0].y+k[k.length-1].y)/2}N.push(n)};
 lay(t,0,'#6366f1',null);
 const mx=[];N.forEach(n=>mx[n.d]=Math.max(mx[n.d]||0,n.w));
 const X=[];let x=8;mx.forEach((w,i)=>{X[i]=x;x+=w+46});
 let s='';
 N.forEach(n=>{if(n.p){const a=X[n.p.d]+n.p.w,b=X[n.d],y1=n.p.y+RH/2,y2=n.y+RH/2,m=(a+b)/2;
  s+=`<path d="M${a} ${y1}C${m} ${y1} ${m} ${y2} ${b} ${y2}" fill="none" stroke="${n.col}" stroke-width="2"/>`}});
 N.forEach(n=>{const r=!n.d;s+=`<rect x="${X[n.d]}" y="${n.y+2}" width="${n.w}" height="${RH-4}" rx="9" fill="${r?n.col:n.col+'22'}" stroke="${n.col}"/><text x="${X[n.d]+n.w/2}" y="${n.y+RH/2+4}" text-anchor="middle" font-size="12" fill="${r?'#fff':'currentColor'}">${esc(n.t)}</text>`});
 return `<svg width="${x}" height="${y+4}" viewBox="0 0 ${x} ${y+4}" xmlns="http://www.w3.org/2000/svg">${s}</svg>`}

function readCfg(){const p=$('#prov').value;S.cfg={provider:p,model:$('#model').value.trim()||DEF[p],key:$('#key').value.trim()};save();return S.cfg}
const HDR=k=>({'Content-Type':'application/json','x-api-key':k,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'});
async function http(url,opt){let r;try{r=await fetch(url,opt)}catch(e){throw Error('Cannot reach the AI service. Check your internet/VPN. ('+e.message+')')}
 const txt=await r.text();let j={};try{j=JSON.parse(txt)}catch(e){}
 if(!r.ok){const er=new Error((j.error?.message||txt.slice(0,200)||'request failed')+` [HTTP ${r.status}]`);er.retry=[429,500,503,529].includes(r.status);throw er}
 return j}
async function raw0(prompt,f){const c=readCfg();if(!c.key)throw Error('No API key yet. Open ⚙ Settings, paste your key and press “Save & test connection”.');
 if(c.provider=='gemini'){const parts=[{text:prompt}];if(f)parts.push({inline_data:{mime_type:f.type,data:f.b64}});
  const F=(S.fl=S.fl||{}),fl=F[c.model]||{};
  const gc={temperature:0.4,maxOutputTokens:fl.lo?8192:(/gemini-(2\.5|[3-9])/.test(c.model)?16000:8192)};
  if(!fl.nj)gc.responseMimeType='application/json';
  if(/gemini-2\.5-flash/.test(c.model)&&!fl.nt)gc.thinkingConfig={thinkingBudget:0};
  const j=await http(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(c.model)}:generateContent?key=${encodeURIComponent(c.key)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts}],generationConfig:gc})});
  const cd=j.candidates?.[0];if(!cd?.content?.parts)throw Error('Gemini returned nothing ('+(cd?.finishReason||j.promptFeedback?.blockReason||'unknown reason')+')');
  return cd.content.parts.map(p=>p.text||'').join('')}
 const content=[];if(f)content.push({type:'document',source:{type:'base64',media_type:f.type,data:f.b64}});content.push({type:'text',text:prompt});
 const j=await http('https://api.anthropic.com/v1/messages',{method:'POST',headers:HDR(c.key),body:JSON.stringify({model:c.model,max_tokens:8000,messages:[{role:'user',content}]})});
 return (j.content||[]).map(p=>p.text||'').join('')}
async function pickModel(key,bad,lite){bad=[].concat(bad);const j=await http('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key='+encodeURIComponent(key));
 const v=n=>{const m=n.match(/gemini-(\d+(?:\.\d+)?)/);return m?parseFloat(m[1]):0};
 const l=(j.models||[]).filter(m=>(m.supportedGenerationMethods||[]).includes('generateContent')).map(m=>m.name.replace('models/','')).filter(n=>/flash/.test(n)&&!(lite?/image|tts|live|audio|thinking|exp|robotics|computer|embedding/:/lite|image|tts|live|audio|thinking|exp|robotics|computer|embedding/).test(n)&&!bad.includes(n));
 l.sort((a,b)=>(/lite/.test(a)?1:0)-(/lite/.test(b)?1:0)||v(b)-v(a)||(/preview/.test(a)?1:0)-(/preview/.test(b)?1:0));return l[0]}
async function raw(prompt,f){for(let a=0;a<6;a++){try{return await raw0(prompt,f)}catch(e){const c=S.cfg,m=e.message;if(c.provider!='gemini')throw e;
 const F=(S.fl=S.fl||{});const fl=F[c.model]=F[c.model]||{};
 if(/JSON mode|responseMimeType|response_mime/i.test(m)&&!fl.nj){fl.nj=1;save();continue}
 if(/thinking/i.test(m)&&!fl.nt){fl.nt=1;save();continue}
 if(/output.?tokens/i.test(m)&&!fl.lo){fl.lo=1;save();continue}
 if(/HTTP 404|no longer available|not found/i.test(m)){const n=await pickModel(c.key,c.model);
  if(n){$('#model').value=n;readCfg();st('Model updated automatically to '+n,0,1);continue}}
 throw e}}throw Error('Could not get a response from the model.')}
async function ai(prompt,f){const tried=[S.cfg.model];for(let a=0;;a++){try{return await raw(prompt,f)}catch(e){
 if(!e.retry||a>=8)throw e;
 if(S.cfg.provider=='gemini'&&a%2==1){try{const n=await pickModel(S.cfg.key,tried,a>=3);if(n){tried.push(n);$('#model').value=n;readCfg();st('That model is busy. Switching to '+n+'…',0,1);continue}}catch(_){}}
 const code=(e.message.match(/HTTP (\d+)/)||[])[1];
 for(let s=Math.min(60,8*(a+1));s>0;s--){st(`Google AI is busy (HTTP ${code}). Retrying in ${s}s… attempt ${a+1} of 8`,0,1);await sleep(1000)}}}}
function fixJ(s){let o='',q=false,e=false;for(const ch of s){if(q){if(e){o+=ch;e=false;continue}if(ch=='\\'){o+=ch;e=true;continue}if(ch=='"'){q=false;o+=ch;continue}if(ch=='\n'){o+='\\n';continue}if(ch=='\r')continue;if(ch=='\t'){o+='\\t';continue}o+=ch}else{if(ch=='"')q=true;o+=ch}}return o.replace(/,\s*([}\]])/g,'$1')}
function parse(t){t=String(t).replace(/```json|```/gi,'');const a=t.indexOf('{'),b=t.lastIndexOf('}');if(a<0||b<a)throw Error('AI did not return JSON: '+t.slice(0,100));const j=t.slice(a,b+1);try{return JSON.parse(j)}catch(e){return JSON.parse(fixJ(j))}}
async function jcall(p,f){let err;for(let a=0;a<3;a++){try{return parse(await ai(p,f))}catch(e){if(e.retry!==undefined||/HTTP|API key|Cannot reach/.test(e.message))throw e;err=e;st('Reply was malformed, retrying…',0,1)}}throw Error('AI reply was cut off or invalid. Press Regenerate. ('+err.message+')')}

const ctx=c=>`Subject: ${S.subject}. Unit: ${c.unit}. Chapter: ${c.title}. Topics: ${c.topics.join('; ')}.`;
const P1=`OUTLINE TASK. You are an expert academic tutor. From the syllabus / subject below, return ONLY valid JSON: {"subject":"","units":[{"name":"","chapters":[{"title":"","topics":["",""]}]}]}. Follow the syllabus's own units and chapters exactly when present; if the input is only a subject name or a single topic, infer a sensible chapter structure. 3-8 topics per chapter.`;
const PARTS=[
 ['notes','Notes',c=>`${ctx(c)} NOTES TASK. Write detailed exam-oriented study notes covering every topic. Return ONLY valid JSON {"notes":"<markdown string>"}. Inside the string use a '## Topic' heading per topic, then lines starting with '- ' for definitions, formulas, examples and key terms in **bold**. Use \\n for line breaks.`],
 ['q2','2 & 5 mark Q&A',c=>`${ctx(c)} QA TASK. Return ONLY valid JSON {"q2":[{"q":"","a":""}],"q5":[{"q":"","a":""}]}. q2: 8 short-answer questions (2 marks), answers 2-3 sentences. q5: 5 questions (5 marks), answers about 150 words as points starting with '- '. Cover all topics.`],
 ['q10','10 mark Q&A',c=>`${ctx(c)} LONG TASK. Return ONLY valid JSON {"q10":[{"q":"","a":""}]}. 3 questions (10 marks), each answer about 350 words: Introduction, '## ' headed sections with '- ' points, an example or diagram description, Conclusion. Use \\n for line breaks.`],
 ['mindmaps','Mindmaps',c=>`${ctx(c)} MINDMAP TASK. Return ONLY valid JSON {"mindmaps":[{"topic":"","tree":{"t":"","c":[{"t":"","c":[{"t":""}]}]}}]}. One mindmap for EVERY topic listed, 3-6 main branches, 2-3 levels, each label max 5 words.`]];

async function build(){const t=$('#txt').value.trim();if(!t&&!file)throw Error('Paste a syllabus, type a subject name, or upload a file first.');
 st('Reading syllabus and building outline…',0,1);
 const j=await jcall(P1+'\n\nINPUT:\n'+t,file);S.subject=j.subject||'Subject';S.ch=[];
 (j.units||[]).forEach(u=>(u.chapters||[]).forEach(c=>S.ch.push({unit:u.name||'Unit',title:c.title,topics:c.topics||[],data:{},done:false})));
 if(!S.ch.length)throw Error('No chapters found. Try pasting the syllabus text.');
 cur=0;save();nav();view();st(`Found ${S.ch.length} chapters. Now press “2. Generate everything” or open a chapter and press Generate.`)}
async function gen(i){const c=S.ch[i];c.data=c.data||{};
 for(let k=0;k<PARTS.length;k++){const [key,label,fn]=PARTS[k];if(c.data[key]&&c.data[key].length)continue;
  st(`${c.title}: writing ${label} (${k+1}/${PARTS.length})…`,0,1);
  Object.assign(c.data,await jcall(fn(c)));if(!c.data[key]||!c.data[key].length)throw Error(`The AI reply had no ${label}. Press Generate to try again.`);save();if(cur==i)view()}
 c.done=true;save();nav();if(cur==i)view();st('Done: '+c.title)}
async function genAll(){if(!S.ch.length)throw Error('Build the chapter outline first (step 1).');
 for(let i=0;i<S.ch.length;i++)if(!S.ch[i].done)await gen(i);st('Everything generated ✓')}
async function run(fn){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);
 try{await fn()}catch(e){st(e.message,1)}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false)}}

async function test(){readCfg();st('Testing connection…',0,1);parse(await ai('Return ONLY this JSON: {"ok":true}'));st(`✓ Connected: ${S.cfg.provider} / ${S.cfg.model}. Now paste your syllabus.`);$('#setBox').hidden=true}
async function models(){const c=readCfg();if(!c.key)throw Error('Paste your API key first.');st('Loading models…',0,1);let l=[];
 if(c.provider=='gemini'){const j=await http('https://generativelanguage.googleapis.com/v1beta/models?pageSize=100&key='+encodeURIComponent(c.key));
  l=(j.models||[]).filter(m=>(m.supportedGenerationMethods||[]).includes('generateContent')).map(m=>m.name.replace('models/',''))}
 else{const j=await http('https://api.anthropic.com/v1/models',{headers:HDR(c.key)});l=(j.data||[]).map(m=>m.id)}
 $('#models').innerHTML=l.map(m=>`<option value="${esc(m)}">`).join('');st(`${l.length} models available. Click the Model box to choose one.`)}

function nav(){let h='',u='';S.ch.forEach((c,i)=>{if(c.unit!==u){u=c.unit;h+=`<div class="u">${esc(u)}</div>`}
 h+=`<div class="c ${i==cur?'on':''}" data-i="${i}">${c.done?'✓ ':''}${esc(c.title)}</div>`});$('#nav').innerHTML=h}
function view(){const m=$('#main');if(!S.ch[cur]){m.innerHTML='<p class="muted">Paste or upload a syllabus on the left, then press “1. Build chapter outline”.</p>';return}
 const c=S.ch[cur],d=c.data||{};
 let h=`<h2>${esc(c.title)}</h2><div class="muted">${esc(S.subject)} · ${esc(c.unit)}</div><div class="tabs">`+
  TABS.map(([k,l])=>`<button data-t="${k}" class="${tab==k?'on':''}">${l}</button>`).join('')+
  `<button data-act="print">🖨 Print / PDF</button><button class="pri" data-act="gen">${c.done?'Regenerate':'Generate'}</button></div>`;
 if(!Object.keys(d).length)h+='<p>Not generated yet. Press <b>Generate</b>.</p>';
 const qa=(k,l)=>d[k]?`<section><h2>${l}</h2>`+d[k].map((x,i)=>`<div class="qa"><b>Q${i+1}. ${esc(x.q)}</b>${md(x.a)}</div>`).join('')+'</section>':'';
 const sec={notes:()=>d.notes?`<section><h2>📝 Notes</h2>${md(d.notes)}</section>`:'',q2:()=>qa('q2','2 Mark Questions'),q5:()=>qa('q5','5 Mark Questions'),q10:()=>qa('q10','10 Mark Questions'),
  mm:()=>(d.mindmaps||[]).map(x=>{try{return `<section><h2>🧠 ${esc(x.topic)}</h2><div class="mm">${mm(x.tree)}</div></section>`}catch(e){return ''}}).join('')};
 h+=(tab=='all'?['notes','q2','q5','q10','mm']:[tab]).map(k=>sec[k]()).join('');
 m.innerHTML=h}

document.addEventListener('click',e=>{const t=e.target.closest('[data-i],[data-t],[data-act]');if(!t||busy)return;
 if(t.dataset.i!=null){cur=+t.dataset.i;nav();view()}
 else if(t.dataset.t){tab=t.dataset.t;view()}
 else if(t.dataset.act=='print')print();
 else if(t.dataset.act=='gen')run(()=>{S.ch[cur].data={};S.ch[cur].done=false;return gen(cur)})});
$('#bBuild').onclick=()=>run(build);$('#bAll').onclick=()=>run(genAll);
$('#bKey').onclick=()=>run(test);$('#bModels').onclick=()=>run(models);
$('#bSet').onclick=()=>$('#setBox').hidden=!$('#setBox').hidden;
$('#prov').onchange=e=>{$('#model').value=DEF[e.target.value];readCfg()};
['#model','#key'].forEach(s=>$(s).oninput=readCfg);
$('#bExp').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({subject:S.subject,ch:S.ch},null,1)],{type:'application/json'}));a.download='studyassist.json';a.click()};
$('#file').onchange=e=>{const f=e.target.files[0];file=null;if(!f)return;const r=new FileReader();
 if(/pdf$/i.test(f.name)){r.onload=()=>{file={type:'application/pdf',b64:r.result.split(',')[1]};st('PDF ready: '+f.name+'. Press “1. Build chapter outline”.')};r.readAsDataURL(f)}
 else{r.onload=()=>{$('#txt').value=r.result;st('Loaded '+f.name+'. Press “1. Build chapter outline”.')};r.readAsText(f)}};
$('#prov').value=S.cfg.provider;$('#model').value=S.cfg.model;$('#key').value=S.cfg.key;$('#setBox').hidden=!!S.cfg.key;
if(S.ch.length){cur=0;st('Welcome back. Your saved chapters are loaded.')}else if(S.cfg.key)st('Ready. Paste your syllabus or upload a PDF.');
nav();view();
if(window.chrome&&chrome.storage&&chrome.storage.local)chrome.storage.local.get('pending',r=>{if(r.pending){$('#txt').value=r.pending;chrome.storage.local.remove('pending');st('Selection loaded. Press “1. Build chapter outline”.')}});
