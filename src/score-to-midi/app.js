
/* PROFILE */
const $=s=>document.querySelector(s), lname=e=>(e.localName||e.nodeName||"").replace(/^.*:/,""), kids=(e,n)=>Array.from(e?.children||[]).filter(x=>!n||lname(x)===n), one=(e,n)=>kids(e,n)[0]||null, txt=(e,n,d="")=>one(e,n)?.textContent?.trim()||d;
const sets=PROFILE.articulation_sets, assignments=PROFILE.track_assignments, groups=[...new Set(assignments.map(x=>x.instrument_group))].sort(), banks=["Cinematic Studio Strings (CSS)","Cinematic Studio Brass (CSB)","Cinematic Studio Woodwinds (CSW)","Cinematic Studio Solo Strings (CSSS)","Cinematic Studio Piano (CSP)"];
let parsed=null;
function clean(s){return (s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}
function infer(name){const n=clean(name);let group="",bank=banks[2];if(/violin|violon(?!cell)/.test(n)){group=/ii|2|second/.test(n)?"VIOLINS II":"VIOLINS I";bank=banks[0]}else if(/viola|alto a cordes/.test(n)){group="VIOLAS";bank=banks[0]}else if(/cello|violoncelle/.test(n)){group="CELLO";bank=banks[0]}else if(/double bass|doublebass|contrabasses?$|contrebasses?$/.test(n)){group="DOUBLEBASSES";bank=banks[0]}else if(/^piccolo$/.test(n)){group="PICCOLO"}else if(/english horn|cor anglais/.test(n)){group="ENGLISH HORN"}else if(/oboe|hautbois/.test(n)){group="2 OBOES"}else if(/^(bass clarinet|clarinette basse)/.test(n)){group="BASS CLARINET"}else if(/^(?!.*contrabass).*clarinet/.test(n)){group="2 CLARINETS"}else if(/contrabassoon|contrebasson/.test(n)){group="CONTRABASSOON"}else if(/bassoon|basson/.test(n)){group="2 BASSOONS"}else if(/alto flute|flute alto/.test(n)){group="FLUTE ALTO"}else if(/flute|flute|flute/.test(n)){group="2 FLUTES"}else if(/horn|cor en fa/.test(n)){group="4 HORNS";bank=banks[1]}else if(/trumpet|trompette/.test(n)){group="2 TRUMPETS";bank=banks[1]}else if(/bass trombone/.test(n)){group="BASS TROMBONE";bank=banks[1]}else if(/trombone|trombone/.test(n)){group="2 TROMBONES";bank=banks[1]}else if(/tuba/.test(n)){group="TUBA";bank=banks[1]}return {group:groups.includes(group)?group:"",bank}}
async function xmlText(file){const buf=await file.arrayBuffer();if(!/\.mxl$/i.test(file.name))return new TextDecoder().decode(buf);const v=new DataView(buf);let eocd=-1;for(let i=buf.byteLength-22;i>=Math.max(0,buf.byteLength-65558);i--)if(v.getUint32(i,true)===0x06054b50){eocd=i;break}if(eocd<0)throw Error("Archive MXL invalide.");let count=v.getUint16(eocd+10,true),pos=v.getUint32(eocd+16,true),chosen=null,first=null;for(let k=0;k<count;k++){if(v.getUint32(pos,true)!==0x02014b50)break;let method=v.getUint16(pos+10,true),size=v.getUint32(pos+20,true),nl=v.getUint16(pos+28,true),el=v.getUint16(pos+30,true),cl=v.getUint16(pos+32,true),off=v.getUint32(pos+42,true),name=new TextDecoder().decode(new Uint8Array(buf,pos+46,nl));if(name.toLowerCase().endsWith(".xml")&&!name.toLowerCase().includes("container.xml")){if(!first)first={name,method,size,off};if(name.toLowerCase().includes("score"))chosen={name,method,size,off}}pos+=46+nl+el+cl}chosen=chosen||first;if(!chosen)throw Error("Aucun MusicXML trouvé dans le .mxl.");let lp=chosen.off,nn=v.getUint16(lp+26,true),ee=v.getUint16(lp+28,true),start=lp+30+nn+ee,raw=buf.slice(start,start+chosen.size);if(chosen.method===0)return new TextDecoder().decode(raw);if(chosen.method!==8||!window.DecompressionStream)throw Error("Ce navigateur ne peut pas décompresser cet export .mxl; exporte plutôt un .musicxml.");const stream=new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"));return await new Response(stream).text()}
const LEVELS = {ppp:0, pp:12, p:28, mp:47, mf:76, f:99, ff:116, fff:127};
const tick = q => Math.max(0, Math.round(q * 480));
const clamp = v => Math.max(0, Math.min(127, Math.round(v)));
const under = (el, tag) => Array.from(el.getElementsByTagName(tag));
function writtenLevel(name) {
  const s = clean(name).trim();
  if (/^p{3,}$/.test(s)) return 0;
  if (/^f{3,}$/.test(s)) return 127;
  return LEVELS[s];
}
function readDirection(el, p, events) {
  const staff = txt(el,'staff','1');
  for (const dt of kids(el,'direction-type')) for (const item of kids(dt)) {
    const tag = lname(item), words = clean(item.textContent || '').trim();
    if (tag === 'wedge') events.push({p,staff,type:'wedge',mode:item.getAttribute('type'),number:item.getAttribute('number') || '1',niente:item.getAttribute('niente')==='yes'});
    if (tag === 'words') {
      events.push({p,staff,type:'words',words});
      const mode = /\b(decresc|diminu|dim\b)/.test(words) ? 'diminuendo' : /\bcresc/.test(words) ? 'crescendo' : '';
      if (mode) events.push({p,staff,type:'textRamp',mode});
    }
    const marks = tag==='dynamics' ? kids(item).map(x=>lname(x)==='other-dynamics'?x.textContent:lname(x)) : tag==='words' ? [words] : [];
    for (const mark of marks) {
      if (mark==='fp' || mark==='sfp') {
        events.push({p,staff,type:'dyn',value:LEVELS.f},{p:p+1/32,staff,type:'dyn',value:LEVELS.p});
      } else {
        const value=writtenLevel(mark);
        if(value!==undefined) events.push({p,staff,type:'dyn',value});
      }
    }
  }
}
function joinTies(notes) {
  const endings = new Map(), result = [];
  for (const n of notes.sort((a,b)=>a.p-b.p)) {
    const boundary = (t) => [t,n.pitch,n.unpitched].join('/');
    const candidates = endings.get(boundary(tick(n.p))) || [];
    const compatible = candidates.filter(c =>
      (!c.instrument || !n.instrument || c.instrument === n.instrument) &&
      (!c.number || !n.stopNumber || c.number === n.stopNumber));
    const sameVoice = compatible.filter(c => c.voice === n.voice && c.staff === n.staff);
    const pool = sameVoice.length ? sameVoice : compatible;
    const previous = n.stop && pool.length === 1 ? pool[0] : null;
    const bow = n.labels.some(x => x === 'Up Bow' || x === 'Down Bow');
    let root = n;
    if (previous) candidates.splice(candidates.indexOf(previous),1);
    if (previous && !bow) {
      root = previous.root;
      root.d = n.p + n.d - root.p;
    } else {
      result.push(n);
    }
    if (n.start) {
      const key = boundary(tick(n.p+n.d));
      if (!endings.has(key)) endings.set(key,[]);
      endings.get(key).push({root,voice:n.voice,staff:n.staff,instrument:n.instrument,number:n.startNumber});
    }
  }
  return result;
}
function parseXML(text) {
  const doc=new DOMParser().parseFromString(text,'application/xml');
  if(doc.querySelector('parsererror')) throw Error('Le MusicXML est illisible.');
  const definitions=new Map(under(doc,'score-part').map(sp=>[sp.getAttribute('id'),sp]));
  const scoreTitle=(under(doc,'work-title')[0]?.textContent||under(doc,'movement-title')[0]?.textContent||'').trim();
  const parts=[];
  for(const part of under(doc,'part')) {
    const id=part.getAttribute('id'), def=definitions.get(id), name=txt(def,'part-name',id);
    const instrumentNames=Object.fromEntries(kids(def,'score-instrument').map(x=>[x.getAttribute('id'),txt(x,'instrument-name','')]));
    const drums=new Map(kids(def,'midi-instrument').map(x=>[x.getAttribute('id'),Number(txt(x,'midi-unpitched',0))-1]));
    const notes=[], events=[], bars=[], slurs=new Set(), transpose=new Map();
    let div=1, base=0, meter=4, fifths=0;
    for(const measure of kids(part,'measure')) {
      let cursor=0, span=0, previous=0;
      const acc=new Map();
      bars.push({number:measure.getAttribute('number'),p:base});
      for(const el of kids(measure)) {
        const tag=lname(el);
        if(tag==='attributes') {
          div=Number(txt(el,'divisions',div));
          for(const tr of kids(el,'transpose')) transpose.set(tr.getAttribute('number')||'*',Number(txt(tr,'chromatic',0))+12*Number(txt(tr,'octave-change',0)));
          const key=one(el,'key'); if(key) fifths=Number(txt(key,'fifths',0));
          const time=one(el,'time');
          if(time) {
            const beats=txt(time,'beats').split('+').reduce((a,x)=>a+Number(x),0), unit=Number(txt(time,'beat-type',4));
            if(beats && unit) {meter=4*beats/unit; events.push({p:base+cursor,type:'meter',beats,unit});}
          }
        }
        if(tag==='direction' || tag==='sound') {
          const p=base+cursor+Number(txt(el,'offset',0))/div;
          if(tag==='direction') readDirection(el,p,events);
          const sound=tag==='sound'?el:one(el,'sound'), tempo=Number(sound?.getAttribute('tempo'));
          if(tempo>0) events.push({p,type:'tempo',value:tempo});
        }
        if(tag==='forward' || tag==='backup') cursor+=(tag==='forward'?1:-1)*Number(txt(el,'duration',0))/div;
        if(tag==='note') {
          const chord=!!one(el,'chord'), grace=!!one(el,'grace'), start=chord?previous:cursor;
          const dur=grace?0.10:Number(txt(el,'duration',0))/div;
          const staff=txt(el,'staff','1'), voice=txt(el,'voice','1'), instrument=one(el,'instrument')?.getAttribute('id')||'';
          const p=base+start, pitched=one(el,'pitch'), unpitched=!!one(el,'unpitched');
          let pitch=notePitch(el);
          if(pitch!==null) {
            const trans=pitched?(transpose.get(staff)??transpose.get('*')??0):0;
            pitch=clamp(unpitched && drums.get(instrument)>=0?drums.get(instrument):pitch+trans);
            const labels=noteLabels(el);
            const arpeggio=under(el,'arpeggiate')[0];
            const roll=arpeggio?{number:arpeggio.getAttribute('number')||'1',direction:arpeggio.getAttribute('direction')||'up'}:null;
            if(under(el,'spiccato').length) labels.push('Spiccato');
            const slurKey=staff+'/'+voice;
            const slur=under(el,'slur');
            if(slur.some(x=>x.getAttribute('type')==='start')) slurs.add(slurKey);
            if(slurs.has(slurKey)) labels.push('Legato');
            if(slur.some(x=>x.getAttribute('type')==='stop')) slurs.delete(slurKey);
            const notatedTies=under(el,'tied');
            const tieNumber=type=>notatedTies.find(x=>[type,'continue'].includes(x.getAttribute('type')))?.getAttribute('number');
            const ties=[...kids(el,'tie'),...notatedTies].map(x=>x.getAttribute('type'));
            let trill=null;
            if(pitched) {
              const steps='CDEFGAB', sem=[0,2,4,5,7,9,11], step=txt(pitched,'step'), i=steps.indexOf(step), j=(i+1)%7;
              const oct=Number(txt(pitched,'octave')), upperOct=oct+(j===0?1:0), upper=steps[j];
              const signature=(fifths<0?'BEADGCF':'FCGDAEB').slice(0,Math.abs(fifths)).includes(upper)?Math.sign(fifths):0;
              const mark=under(el,'accidental-mark')[0]?.textContent?.trim();
              const alteration=({flat:-1,natural:0,sharp:1,'double-flat':-2,'double-sharp':2})[mark]??acc.get(staff+upper+upperOct)??signature;
              if(labels.includes('Trille')) trill=clamp((upperOct+1)*12+sem[j]+alteration+trans);
              acc.set(staff+step+oct,Number(txt(pitched,'alter',0)));
            }
            notes.push({p,d:dur,pitch,trans,roll,startNumber:tieNumber('start'),stopNumber:tieNumber('stop'),labels,voice,staff,instrument,start:ties.includes('start')||ties.includes('continue'),stop:ties.includes('stop')||ties.includes('continue'),accent:labels.some(x=>['Accent','Marcato','Sforzando'].includes(x)),trill,unpitched});
          }
          if(!chord) previous=start;
          if(!chord && !grace) cursor+=dur;
          if(!grace) span=Math.max(span,start+dur);
        }
        span=Math.max(span,cursor);
      }
      base+=measure.getAttribute('implicit')==='yes'?span:Math.max(span,meter);
    }
    const words=events.filter(x=>x.type==='words').sort((a,b)=>a.p-b.p), bow=new Map(); let wi=0;
    for(const n of notes.sort((a,b)=>a.p-b.p)){
      while(wi<words.length && words[wi].p<=n.p+1e-7){const w=words[wi++]; if(/\bpizz/.test(w.words))bow.set(w.staff,'Pizzicato'); if(/\b(arco|ord)/.test(w.words))bow.delete(w.staff);}
      if(bow.has(n.staff)) n.labels.push(bow.get(n.staff));
    }
    parts.push({id,name,scoreTitle,instrumentNames,notes:joinTies(notes),events,end:base,bars});
  }
  return parts;
}
function curve(part,staff) {
  const events=part.events.filter(e=>e.staff===staff).sort((a,b)=>a.p-b.p);
  const marks=new Map([[0,LEVELS.mf]]), opens=new Map(), spans=[];
  for(const e of events) if(e.type==='dyn') marks.set(tick(e.p),e.value);
  for(const e of events) {
    if(e.type==='wedge') {
      if(['crescendo','diminuendo'].includes(e.mode)) opens.set(e.number,e);
      if(e.mode==='stop' && opens.has(e.number)){spans.push([opens.get(e.number),e.p,e.niente]); opens.delete(e.number);}
    }
    if(e.type==='textRamp' && !events.some(x=>x.type==='wedge' && tick(x.p)===tick(e.p) && x.mode===e.mode)){
      const finish=events.find(x=>x.p>e.p && ['dyn','textRamp','wedge'].includes(x.type));
      spans.push([e,finish?.p??Math.min(part.end,e.p+4),false]);
    }
  }
  for(const e of opens.values())spans.push([e,part.end,false]);
  const notation=new Map(marks), last=(t)=>[...marks].filter(([p])=>p<=t).sort((a,b)=>b[0]-a[0])[0][1];
  for(const [e,end,niente] of spans.sort((a,b)=>a[0].p-b[0].p)){
    let a=tick(e.p), b=tick(end); if(b<=a)continue;
    const sign=e.mode==='crescendo'?1:-1;
    let from=e.niente && sign>0?0:last(a);
    // An earlier unlabelled hairpin may already have reached the MIDI ceiling.
    // Give the next gesture room when there is no written dynamic at its onset.
    if(!notation.has(a) && ((sign>0 && from===127) || (sign<0 && from===0)))
      from=clamp(from-sign*24);
    const near=[...notation].find(([p,v])=>p>=b && p<=b+480 && sign*(v-from)>0);
    const endMark=notation.get(b);
    const lastInterior=[...notation].filter(([p])=>p>a && p<b).at(-1);
    const baseline=lastInterior?.[1]??from;
    // A soft sign at the next attack can immediately follow a loud crescendo peak.
    const reset=endMark!==undefined && sign*(endMark-baseline)<=0;
    const targetTime=reset?Math.max(a,b-1):b;
    const dest=niente && sign<0 ? 0 : (!reset && endMark!==undefined ? endMark :
      (near && sign*(near[1]-baseline)>0 ? near[1] : clamp(baseline+sign*38)));
    const anchors=[[a,from],...[...notation].filter(([p])=>p>a && p<targetTime).sort((x,y)=>x[0]-y[0]),[targetTime,dest]];
    for(let i=1;i<anchors.length;i++){
      const [p,v]=anchors[i-1],[q,w]=anchors[i];
      if(q<=p)continue;
      const count=Math.min(q-p,Math.max(Math.abs(w-v),Math.ceil((q-p)/30)));
      let previous;
      for(let k=0;k<=count;k++){
        const x=k/count;
        const shape=x+0.60*x*(1-x)*(1-2*x);
        const value=clamp(v+(w-v)*shape);
        if(value!==previous)marks.set(Math.round(p+(q-p)*x),value);
        previous=value;
      }
    }
    if(reset)marks.set(b,endMark);
  }
  return [...marks].sort((a,b)=>a[0]-b[0]);
}
function notePitch(n){let p=one(n,"pitch");if(!p){const u=one(n,"unpitched");if(!u)return null;p=u}let step=txt(p,"step",txt(p,"display-step")),oct=Number(txt(p,"octave",txt(p,"display-octave","4"))),a=Number(txt(p,"alter",0));let sem={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[step];return sem===undefined?null:Math.max(0,Math.min(127,Math.round((oct+1)*12+sem+a)))}
function noteLabels(n){let o=[];for(const e of Array.from(n.getElementsByTagName("articulations")))for(const x of kids(e)){let t=lname(x);if(t==="staccato")o.push("Staccato");if(t==="staccatissimo")o.push("Staccatissimo");if(t==="accent")o.push("Accent");if(t==="strong-accent")o.push("Marcato");if(t==="tenuto")o.push("Tenuto")}for(const e of Array.from(n.getElementsByTagName("technical")))for(const x of kids(e)){let t=lname(x);if(t.includes("pizzicato"))o.push("Pizzicato");if(t.includes("harmonic"))o.push("Harmonic");if(t.includes("up-bow"))o.push("Up Bow");if(t.includes("down-bow"))o.push("Down Bow");if(t.includes("snap-pizzicato"))o.push("Pizzicato Bartók");if(t.includes("vibrato"))o.push("Vibrato");if(t.includes("portamento"))o.push("Portamento");if(t.includes("flutter"))o.push("Flutter tongue");if(t.includes("double tongue"))o.push("Double tongue")}for(const x of Array.from(n.getElementsByTagName("other-technical"))){let t=clean(x.textContent);if(t.includes("vibrato"))o.push("Vibrato");if(t.includes("portamento"))o.push("Portamento");if(t.includes("flutter"))o.push("Flutter tongue");if(t.includes("double tongue"))o.push("Double tongue")}if(n.getElementsByTagName("trill-mark").length)o.push("Trille");if(n.getElementsByTagName("tremolo").length)o.push("Tremolo");if(n.getElementsByTagName("fermata").length)o.push("Tenuto");return o}
function laneFor(labels,group){let a=labels.map(clean).join(" ");if(/bartok|pizz/.test(a))return "Pizzicato";if(/trille/.test(a))return "Trills";if(/tremolo/.test(a))return "Tremolo";if(/harmonic/.test(a))return "Harmonics";if(/flutter/.test(a))return "Flutter";if(/double tongue/.test(a))return "Double Tongue";if(/staccato|staccatissimo|spiccato/.test(a))return "Shorts";if(/marcato|sforzando/.test(a))return "Marcato";return "Longs"}
function findRow(group,lane,bank){let rows=assignments.filter(x=>x.instrument_group===group&&x.lane.toLowerCase()===lane.toLowerCase());if(!rows.length&&lane==="Tremolo")rows=assignments.filter(x=>x.instrument_group===group&&/Tremolo|Repetition/i.test(x.lane));if(!rows.length&&lane==="Harmonics")rows=assignments.filter(x=>x.instrument_group===group&&/Harmonic/i.test(x.lane));return rows.find(x=>{let s=x.articulation_set||"";return bank.includes("Strings")?s.startsWith("CSS"):bank.includes("Brass")?s.startsWith("CSB"):bank.includes("Woodwinds")?s.startsWith("CSW"):false})||rows[0]||null}
function chooseArt(setName,labels,lane){let list=sets[setName]?.articulations||[];if(!list.length || (setName==="CSB Legato" && lane!=="Longs") || (setName==="CSW Trills" && lane!=="Trills"))return null;let a=labels.map(clean).join(" "),want="";if(setName==="CSB Legato")want=/legato/.test(a)?"Legato":"Sustain";else if(setName==="CSS Pizz")want=/bartok/.test(a)?"Bartok Snap":/col legno/.test(a)?"Col Legno":"Pizzicato";else if(/Shorts/.test(setName))want=/spiccato/.test(a)?"Spiccato":/staccatissimo/.test(a)?"Staccatissimo":"Staccato";else if(/Trills/.test(setName))want="Legato On";else if(/Longs/.test(setName))want=/legato/.test(a)?(setName==="CSS Longs"?"Legato (Low Latency)":"Legato"):"Sustain";else if(/Muted/.test(setName))want="Sustain Long";else if(/Marcato/.test(setName))want="Leg On";return list.find(x=>clean(x.Name)===clean(want))||null}
function actionEvents(art,ch,tick,ev){for(const o of art?.Output||[]){let n=o.MB1??58,v=o.ValueLow??(String(o.Status).toLowerCase().includes("note")?100:0);if(String(o.Status).toLowerCase().includes("controller"))ev.push({t:tick,p:-20,b:[0xb0|ch,n,v]});else if(String(o.Status).toLowerCase().includes("note")){ev.push({t:tick,p:-19,b:[0x90|ch,n,Math.max(1,v)]},{t:tick+1,p:-18,b:[0x80|ch,n,0]})}}}
function vlq(v){v=Math.max(0,Math.floor(v));let a=[v&127];while((v>>=7)){a.unshift((v&127)|128)}return a}
function midiTrack(name,events){let nm=[...new TextEncoder().encode(name)],E=[{t:0,p:-100,b:[255,3,...vlq(nm.length),...nm]},...events];E.sort((a,b)=>a.t-b.t||a.p-b.p);let data=[],last=0;for(const e of E){let delta=Math.max(0,e.t-last);data.push(...vlq(delta),...e.b);last=e.t}data.push(0,255,47,0);return [77,84,114,107,...u32(data.length),...data]}
function u32(n){return [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]}
function tomTarget(name){
  if(/basse|bass|very low|4|5/i.test(name))return 'Tom Very Low';
  if(/high|aigu|1/i.test(name))return 'Tom High';
  if(/medium|moyen|2/i.test(name))return 'Tom Medium';
  if(/low|grave|3/i.test(name))return 'Tom Low';
  return 'Tom Ensemble';
}
function trackDelay(row,longMode){
  if(!row)return {ms:null,basis:'Autre banque : réglage conservé'};
  const section=row.section||(row.articulation_set?.startsWith('CSS')?'STRINGS':row.articulation_set==='CSB Legato'?'BRASS':'WOODWINDS');
  if(longMode==='sustain')return {ms:0,basis:'Sustain : point de départ estimé, attaque à vérifier'};
  if(row.lane==='Longs'){
    return {ms:section==='STRINGS'?-250:section==='WOODWINDS'?-130:-100,basis:'Transition du manuel ; vélocité 80, accents 86 dans la même zone de vitesse'};
  }
  if(/Shorts|Pizzicato|Measured/i.test(row.lane))return {ms:-60,basis:'Shorts : référence du manuel ; pizzicato et répétitions mesurées : estimation'};
  if(section==='BRASS' && row.lane==='Marcato')return {ms:-100,basis:'Marcato rapide du manuel, vélocité 80'};
  if(row.lane==='Muted')return {ms:0,basis:'Sustain avec sourdine : point de départ estimé'};
  return {ms:-60,basis:'Point de départ estimé pour cette articulation, à affiner à l’écoute'};
}
function repetitionArt(notes,index,row,parts){
  if(row?.section!=='BRASS' || row.lane!=='Shorts')return null;
  const n=notes[index], start=tick(n.p);
  const tempos=conductor(parts).filter(e=>e.b[1]===81);
  const e=tempos.filter(e=>e.t<=start).sort((a,b)=>a.t-b.t).at(-1);
  const us=e?e.b[3]*65536+e.b[4]*256+e.b[5]:500000;
  if(n.d>.75)return null;
  const matches=o=>o && o.pitch===n.pitch && tick(o.p)!==start && Math.abs(o.p-n.p)<=.5+1/480 && Math.abs(o.p-n.p)*us/1000<=500 && Math.abs(o.p-n.p)>0;
  const sameVoice=notes.filter(o=>o.source===n.source && o.voice===n.voice);
  const starts=[...new Set(sameVoice.map(o=>tick(o.p)))].sort((a,b)=>a-b);
  const i=starts.indexOf(start);
  let count=1;
  for(const direction of [-1,1]){
    let previous=n;
    for(let j=i+direction;j>=0 && j<starts.length;j+=direction){
      const other=sameVoice.find(o=>tick(o.p)===starts[j] && o.pitch===n.pitch);
      if(!other || Math.abs(other.p-previous.p)>.5+1/480 ||
        Math.abs(other.p-previous.p)*us/1000>500 || other.d>.75)break;
      count++;previous=other;
    }
  }
  if(count<3)return null;
  return (sets[row.articulation_set]?.articulations||[]).find(a=>/^repetitions?$/i.test(clean(a.Name)))||null;
}
function percussivePart(part){
  return part.notes.some(n=>n.unpitched) || /piano|harp|harpe|celest|célest|marimba|vibraph|xyloph|glock|crotal|tubular bell|chimes|percussion|drum|cymbal|tam[- ]?tam|gong|toms|brake|wood.?block|tambour|triang|castanet|shaker|claves|timpani|timbale/i.test(part.name);
}
function accentRole(note,part,choice){
  if(percussivePart(part) || !note.accent ||
    laneFor(note.labels,choice.group)!=='Longs' || !findRow(choice.group,'Longs',choice.bank))return null;
  return 'legato-accent';
}
function scoreClock(parts){
  const tempos=conductor(parts).filter(e=>e.b[1]===81).sort((a,b)=>a.t-b.t);
  const segments=[{t:0,ms:0,rate:500/480}];
  for(const e of tempos){
    const previous=segments.at(-1), rate=(e.b[3]*65536+e.b[4]*256+e.b[5])/480000;
    const segment={t:e.t,ms:previous.ms+(e.t-previous.t)*previous.rate,rate};
    if(e.t===previous.t)segments[segments.length-1]=segment;else segments.push(segment);
  }
  const ms=t=>{const s=segments.findLast(s=>s.t<=t)||segments[0];return s.ms+(t-s.t)*s.rate;};
  const at=value=>{const s=segments.findLast(s=>s.ms<=value)||segments[0];return Math.round(s.t+(value-s.ms)/s.rate);};
  return {ms,at,after:(t,value)=>at(ms(t)+value)};
}
function compensateStringTiming(notes,parts,lane,written){
  const delay=-trackDelay(lane.row,lane.longMode).ms, clock=scoreClock(parts), report=[];
  const timing=written.map(current=>{
    const {note,start,end}=current;
    const voice=written.filter(o=>note.performanceVoice!==undefined?o.note.performanceVoice===note.performanceVoice:o.note.source===note.source && o.note.voice===note.voice);
    const previous=voice.filter(o=>o.start<start).at(-1), next=voice.find(o=>o.start>start);
    const mono=!written.some(o=>o!==current && o.note.pitch!==note.pitch && o.start<=start && o.end>start);
    const transition=mono && previous && previous.end>=start-1 && previous.note.pitch!==note.pitch;
    const gap=previous?clock.ms(start)-clock.ms(previous.start):Infinity;
    const rapid=transition && lane.choice.fastStringTiming!==false && gap<delay+40;
    const latency=transition?(rapid?100:delay):0;
    note.fastLegato=!!rapid;
    return {...current,voice,next,latency,rapid,desired:clock.after(start,delay-latency)};
  });
  // Work backwards so no correction can pass the next actual attack.
  for(let i=timing.length-1;i>=0;i--){
    const t=timing[i];
    const same=timing.filter(o=>o.start>t.start && (t.note.performanceVoice!==undefined?o.note.performanceVoice===t.note.performanceVoice:o.note.source===t.note.source && o.note.voice===t.note.voice))[0];
    t.nextTiming=same;
    t.performed=same?Math.min(t.desired,Math.max(t.start,clock.after(same.performed,-20))):t.desired;
  }
  for(const t of timing){
    const {note,start,end,performed,nextTiming:next}=t;
    const shiftMs=clock.ms(performed)-clock.ms(start);
    let release=clock.after(end,shiftMs);
    if(next && Math.abs(end-next.start)<=1){
      release=next.note.pitch===note.pitch?clock.after(next.performed,-10):clock.after(next.performed,60);
      release=Math.min(release,clock.after(next.end,clock.ms(next.performed)-clock.ms(next.start))-1);
    }else if(next)release=Math.min(release,clock.after(next.performed,-10));
    note.p=performed/480;note.d=Math.max(1,release-performed)/480;
    if(performed!==start || t.rapid)report.push({writtenTick:start,performedTick:performed,pitch:note.pitch,
      requestedMs:delay-t.latency,appliedMs:Math.round(shiftMs*1000)/1000,capped:performed<t.desired,
      expectedLatencyMs:t.latency,fastLegato:t.rapid,kind:t.latency?'legato-transition':'fresh-attack'});
  }
  return report;
}
function compensatePhraseStarts(notes,parts,lane,written){
  const delay=trackDelay(lane.row,lane.longMode).ms;
  if(!(delay<0) || lane.lane!=='Longs' || lane.longMode==='sustain' || lane.percussive)return [];
  if(lane.row?.section==='STRINGS' && lane.longMode==='legato')return compensateStringTiming(notes,parts,lane,written);
  const clock=scoreClock(parts), report=[];
  for(const current of written){
    const {note,start,end}=current;
    const voice=written.filter(o=>note.performanceVoice!==undefined?
      o.note.performanceVoice===note.performanceVoice:o.note.source===note.source && o.note.voice===note.voice);
    // Use the score, not the added 60 ms overlap or the 10 ms retrigger gap.
    const previous=voice.filter(o=>o.start<start);
    if(previous.some(o=>o.end>=start-1 && o.note.pitch!==note.pitch))continue;
    if(written.some(o=>o!==current && o.start<=start && o.end>start))continue;
    const next=voice.find(o=>o.start>start);
    const requested=clock.after(start,-delay);
    // A first note cannot be moved beyond the following MIDI attack. Very
    // short starts need an audible attack before the next legato transition.
    const connected=next && Math.abs(end-next.start)<=1;
    const nextReattack=next && (!connected || next.note.pitch===note.pitch);
    const nextAttack=next?clock.after(next.start,nextReattack?-delay:0):Infinity;
    const latest=next?Math.max(start,clock.after(nextAttack,-20)):Infinity;
    const performed=Math.min(requested,latest);
    const shift=performed-start;
    let release=tick(note.p+note.d);
    if(connected && nextReattack)release=clock.after(nextAttack,-10);
    else if(!connected){
      release=clock.after(end,clock.ms(performed)-clock.ms(start));
      if(next)release=Math.min(release,clock.after(nextAttack,-10));
    }
    note.p=performed/480;
    note.d=Math.max(1,release-performed)/480;
    report.push({writtenTick:start,performedTick:performed,pitch:note.pitch,requestedMs:-delay,
      appliedMs:Math.round((clock.ms(performed)-clock.ms(start))*1000)/1000,capped:performed<requested,kind:previous.some(o=>o.end>=start-1 && o.note.pitch===note.pitch)?'repeated-attack':'phrase-start'});
  }
  return report;
}
function rolledNotes(part,parts){
  const notes=part.notes.map(n=>({...n})), chords=new Map();
  for(const note of notes){
    if(!note.roll)continue;
    const key=tick(note.p)+'/'+note.roll.number;
    if(!chords.has(key))chords.set(key,[]);
    chords.get(key).push(note);
  }
  const tempos=conductor(parts).filter(e=>e.b[1]===81).sort((a,b)=>a.t-b.t);
  for(const chord of chords.values()){
    if(chord.length<2)continue;
    const p=chord[0].p, t=tick(p);
    const e=tempos.findLast(e=>e.t<=t);
    const us=e?e.b[3]*65536+e.b[4]*256+e.b[5]:500000;
    const quarterMs=us/1000;
    const next=part.notes.find(n=>tick(n.p)>t);
    const room=Math.min(...chord.map(n=>n.d),next?next.p-p:Infinity)*0.45;
    const total=Math.min((chord.length-1)*30/quarterMs,240/quarterMs,room);
    const down=chord.some(n=>n.roll.direction==='down');
    chord.sort((a,b)=>down?b.pitch-a.pitch:a.pitch-b.pitch);
    chord.forEach((note,i)=>{
      const delay=total*i/(chord.length-1);
      note.p+=delay;
      note.d=Math.max(1/480,note.d-delay);
    });
  }
  return notes;
}
function preparedLanes(parts,choices){
  const lanes=new Map();
  parts.forEach((part,index)=>{
    const choice=choices[index], group=choice.group;
    const contra=/contrabass clarinet|clarinette contrebasse|clarinette contre-basse/i.test(clean(part.name));
    const choir=/^(soprano|alto|tenor|bass|basse)$/i.test(clean(part.name).trim());
    const whistle=/tin whistle/i.test(part.name);
    const family=choir?'CHOIR':whistle?'TIN WHISTLE':group||part.id;
    for(const note of rolledNotes(part,parts)){
      note.accentRole=accentRole(note,part,choice);
      const tomDestination=/^toms?$/i.test(part.name)?tomTarget(part.instrumentNames?.[note.instrument]||''):null;
      const lane=group||contra?laneFor(note.labels,group):'Partition';
      const key=[family,choice.bank,choice.octave||'template',lane,tomDestination||''].join('/');
      if(!lanes.has(key)){
        const row=group?findRow(group,lane,choice.bank):null;
        lanes.set(key,{name:(choir?'Chœur SATB':group?group:part.name)+' — '+(row?.lane||lane),
          sourceName:part.name+' — '+(row?.lane||lane), row,lane,group,whistle,choir,choice,contra,tomDestination,percussive:percussivePart(part),timpani:/timpani|timbales?/i.test(part.name),notes:[],sources:[]});
      }
      const target=lanes.get(key);
      let source=target.sources.find(s=>s.part===part && s.staff===note.staff);
      if(!source){
        const staff=part.events.some(e=>e.type==='dyn' && e.staff===note.staff)?note.staff:'1';
        source={part,staff:note.staff,points:curve(part,staff)};target.sources.push(source);
      }
      const offset=note.unpitched?0:(choice.octave==='template'||choice.octave===undefined?templateOffset(note,group,part.name):Number(choice.octave));
      target.notes.push({...note,pitch:clamp(note.pitch+offset),trill:note.trill===null?null:clamp(note.trill+offset),source});
    }
  });
  const arranged=[...lanes.values()];
  return arranged.filter(l=>l.notes.length).flatMap(splitLongLane);
}
function splitLongLane(lane){
  if(lane.lane!=='Longs' || lane.choice.splitLongs===false || !lane.row)return [lane];
  const row=lane.row;
  const unique=new Map();
  for(const n of lane.notes){
    const key=tick(n.p)+'/'+n.pitch;
    const identity=n.source.part.id+'/'+n.staff+'/'+n.voice;
    const prior=unique.get(key);
    if(prior){prior.d=Math.max(prior.d,n.d);prior.origins.add(identity);prior.accent ||= n.accent;}
    else unique.set(key,{...n,origins:new Set([identity])});
  }
  const notes=[...unique.values()].sort((a,b)=>a.p-b.p || a.pitch-b.pitch);
  // Connected written overlaps stay together. Any component requiring three
  // simultaneous pitches uses Sustain, preserving held notes without slicing them.
  const components=[];let component=[],end=-Infinity;
  for(const n of notes){
    if(tick(n.p)>=end){if(component.length)components.push(component);component=[];end=-Infinity;}
    component.push(n);end=Math.max(end,tick(n.p+n.d));
  }
  if(component.length)components.push(component);
  const lists={legato1:[],legato2:[],sustain:[]};
  const tails=[null,null];
  for(const component of components){
    const poly=component.some(n=>new Set(component.filter(o=>tick(o.p)<=tick(n.p) && tick(o.p+o.d)>tick(n.p)).map(o=>o.pitch)).size>2);
    if(poly){lists.sustain.push(...component);continue;}
    for(const n of component){
      const available=[0,1].filter(i=>!tails[i] || tick(tails[i].p+tails[i].d)<=tick(n.p));
      if(!available.length)throw Error('Impossible de répartir les deux voix sans couper une note.');
      available.sort((a,b)=>{
        const score=i=>!tails[i]?1000+i:([ ...n.origins ].some(id=>tails[i].origins.has(id))?0:200)+
          (Math.abs(tick(tails[i].p+tails[i].d)-tick(n.p))<=1?-500:0)+Math.abs(n.pitch-tails[i].pitch)+i/100;
        return score(a)-score(b);
      });
      const i=available[0];n.performanceVoice=i;lists['legato'+(i+1)].push(n);tails[i]=n;
    }
  }
  const expressive=(sets[row.articulation_set]?.articulations||[]).some(a=>/legato expressif/i.test(a.Name));
  return Object.entries(lists).filter(([,notes])=>notes.length).map(([longVoice,notes])=>({...lane,row,notes,
    longMode:longVoice==='sustain'?'sustain':'legato',longVoice,baseName:lane.name,
    name:lane.name+' — '+(longVoice==='sustain'?'Sustain':(expressive?'Legato expressif ':'Legato ')+longVoice.slice(-1))}));
}
function levelAt(points,t){return points.findLast(x=>x[0]<=t)?.[1]??LEVELS.mf;}
function laneCurve(lane){
  const boundaries=new Set([0]);
  for(const source of lane.sources)for(const [t] of source.points)boundaries.add(t);
  for(const n of lane.notes){boundaries.add(tick(n.p));boundaries.add(tick(n.p+n.d));}
  let previous=-1;const result=[];
  for(const t of [...boundaries].sort((a,b)=>a-b)){
    const active=lane.notes.filter(n=>tick(n.p)<=t && tick(n.p+n.d)>t);
    const values=active.map(n=>levelAt(n.source.points,t));
    const value=values.length?Math.max(...values):levelAt(lane.sources[0].points,t);
    if(value!==previous){result.push([t,value]);previous=value;}
  }
  return result;
}
function longModes(notes,row,lane,forcedMode=null){
  if(!row || lane!=='Longs')return [];
  const times=[...new Set(notes.flatMap(n=>[tick(n.p),tick(n.p+n.d)]))].sort((a,b)=>a-b);
  const modes=[];let last=null;
  for(const t of times){
    const active=notes.filter(n=>tick(n.p)<=t && tick(n.p+n.d)>t);
    if(!active.length)continue;
    const poly=forcedMode==='sustain' || (forcedMode!=='legato' && new Set(active.map(n=>n.pitch)).size>1);
    const labels=poly?[]:[...active[0].labels,'Legato'];
    const normal=chooseArt(row.articulation_set,labels,lane);
    const muted=/sordino/i.test(normal?.Name||'');
    const expressive=(sets[row.articulation_set]?.articulations||[]).find(a=>/legato expressif/i.test(a.Name) && /sordino/i.test(a.Name)===muted);
    const art=!poly && expressive?expressive:normal;
    if(art && art.ID!==last){modes.push({t,art,poly});last=art.ID;}
  }
  return modes;
}
function overlapLegato(notes,modes,parts,lane){
  if(lane.longMode==='sustain' || lane.percussive || (!lane.whistle && !lane.choir && lane.lane!=='Longs'))return;
  const tempos=conductor(parts).filter(e=>e.b[1]===81).sort((a,b)=>a.t-b.t);
  const original=notes.map(note=>({note,start:tick(note.p),end:tick(note.p+note.d)}));
  const written=(lane.allWrittenNotes||notes).map(note=>({note,start:tick(note.p),end:tick(note.p+note.d)}));
  const short=n=>n.labels.some(label=>['Staccato','Staccatissimo','Spiccato'].includes(label));
  for(const {note:n,start,end} of original){
    if(short(n))continue;
    const next=original.find(other=>other.start>start && (n.performanceVoice!==undefined?other.note.performanceVoice===n.performanceVoice:other.note.source===n.source && other.note.voice===n.voice));
    if(!next || short(next.note) || Math.abs(end-next.start)>1)continue;
    // Test the written intervals, before adding any performance overlap.
    if(written.some(other=>other.note.pitch!==n.pitch && other.start<end && other.end>start))continue;
    const state=modes.findLast(m=>m.t<=next.start);
    if(state && (state.poly || !/legato/i.test(state.art.Name)))continue;
    const tempo=tempos.findLast(e=>e.t<=next.start);
    const us=tempo?tempo.b[3]*65536+tempo.b[4]*256+tempo.b[5]:500000;
    if(next.note.pitch===n.pitch){
      // Retrigger repeated pitches; never alter either written onset.
      const gap=Math.max(1,Math.round(10*480000/us));
      n.d=Math.max(1,next.start-gap-start)/480;
      continue;
    }
    const overlap=Math.max(1,Math.round(60*480000/us));
    const repeat=original.find(other=>other.start>start && other.note.pitch===n.pitch);
    const limit=Math.min(next.start+overlap,next.end-1,repeat?repeat.start-1:Infinity);
    if(written.some(other=>other.note.pitch!==next.note.pitch && other.start<limit && other.end>end))continue;
    if(limit>end)n.d=(limit-start)/480;
  }
}
function midiFile(tracks,format=1){
  const header=[77,84,104,100,0,0,0,6,0,format,tracks.length>>8,tracks.length&255,1,224];
  const result=new Uint8Array(header.length+tracks.reduce((sum,t)=>sum+t.length,0));
  result.set(header); let offset=header.length;
  for(const t of tracks){result.set(t,offset);offset+=t.length;}
  return result;
}
function conductor(parts){
  const entries=new Map();
  for(const part of parts) for(const e of part.events){
    const t=tick(e.p);
    if(e.type==='tempo'){
      const us=Math.round(60000000/e.value);
      entries.set('t'+t,{t,p:-50,b:[255,81,3,(us>>16)&255,(us>>8)&255,us&255]});
    }
    if(e.type==='meter')entries.set('m'+t,{t,p:-50,b:[255,88,4,e.beats,Math.round(Math.log2(e.unit)),24,8]});
  }
  return [...entries.values()];
}
// In the example profile these three octave instruments take the written register.
function templateOffset(note,group,name=''){
  if(/tin whistle/i.test(name))return -12;
  if(group==='BASS TROMBONE' || group==='TUBA' || /timpani|timbales?/i.test(name))return 12;
  if(group==='PICCOLO' && note.trans===12)return -12;
  if(['CONTRABASSOON','DOUBLEBASSES'].includes(group) && note.trans===-12)return 12;
  return 0;
}
function expression(value){
  // Keep headroom in soft sustains while letting upper dynamics reach full gain.
  return clamp(127*Math.pow(value/127,0.72));
}
function smoothController(points,notes,parts,anchors=points.filter((p,i)=>i && Math.abs(p[1]-points[i-1][1])>1).map(p=>p[0])){
  // Round only the jumps, retaining the written hairpins and target times.
  // Work on controller copies: struck-note velocities keep the written levels.
  const clock=scoreClock(parts), result=[], changes=[];
  for(let i=0;i<points.length;i++){
    const [t,value]=points[i], previous=points[i-1];
    if(!previous || t===0 || Math.abs(value-previous[1])<=1){result.push([t,value]);continue;}
    const preceding=notes.filter(n=>tick(n.p)<t).sort((a,b)=>
      Math.min(t,tick(b.p+b.d))-Math.min(t,tick(a.p+a.d)) || b.p-a.p)[0];
    const noteStart=preceding?tick(preceding.p):0;
    const duration=preceding?clock.ms(tick(preceding.p+preceding.d))-clock.ms(noteStart):600;
    const windowMs=Math.min(350,Math.max(30,duration*.35));
    // Preserve actual notated dynamics, not intermediate hairpin samples.
    // In particular a peak one tick before a soft sign must not force a jump.
    const protectedTime=anchors.filter(a=>a<t).reduce((a,b)=>Math.max(a,b),0);
    const start=Math.max(protectedTime,noteStart,clock.after(t,-windowMs),0);
    if(start>=t){result.push([t,value]);continue;}
    const from=levelAt(result,start);
    while(result.length && result.at(-1)[0]>=start)result.pop();
    result.push([start,from]);
    const count=Math.min(t-start,Math.max(Math.abs(value-from),Math.ceil((clock.ms(t)-clock.ms(start))/12)));
    let last=from;
    for(let k=1;k<=count;k++){
      const x=k/count, rounded=clamp(from+(value-from)*x*x*(3-2*x));
      if(rounded!==last || k===count)result.push([Math.round(start+(t-start)*x),rounded]);
      last=rounded;
    }
    changes.push({start,end:t,from,to:value});
  }
  return {points:result,changes};
}
function addVibrato(events,notes,parts,lane){
  const {row,choice}=lane;
  if(choice.autoVibrato===false || lane.percussive || lane.lane!=='Longs' || lane.longMode==='sustain')return [];
  const section=row?.section;
  const enabled=section==='STRINGS'?choice.vibratoStrings!==false:
    section==='WOODWINDS'?choice.vibratoWinds!==false:
    section==='BRASS'?choice.vibratoBrass===true:false;
  if(!enabled)return [];
  const clock=scoreClock(parts), phrases=[], points=new Map([[0,0]]);
  let lastEndMs=-Infinity;
  const ramp=(a,b,from,to)=>{
    const count=Math.max(1,Math.min(b-a,Math.max(2*Math.abs(to-from),Math.ceil((clock.ms(b)-clock.ms(a))/20))));
    for(let i=0;i<=count;i++){
      const x=i/count;points.set(Math.round(a+(b-a)*x),clamp(from+(to-from)*x*x*(3-2*x)));
    }
  };
  for(const [index,n] of notes.entries()){
    const start=tick(n.p), noteEnd=tick(n.p+n.d), next=notes[index+1];
    const end=Math.min(noteEnd,next?clock.after(tick(next.p),-15):noteEnd);
    const durationMs=clock.ms(end)-clock.ms(start);
    if(durationMs<1200 || n.trill!=null || /stacc|spicc|tremolo|harmonic/i.test(n.labels.join(' ')))continue;
    if(notes.some(o=>o!==n && o.p<=n.p && o.p+o.d>n.p && o.pitch!==n.pitch))continue;
    const words=n.source.part.events.filter(e=>e.type==='words' && e.staff===n.source.staff && tick(e.p)<=(n.scoreTick??start) && /vib/.test(e.words)).at(-1)?.words||'';
    if(/senza\s+vib|non[ -]?vib|sans\s+vib|no\s+vib/.test(words))continue;
    const explicit=n.labels.includes('Vibrato') || /con\s+vib|molto\s+vib/.test(words);
    const phraseEnd=!next || clock.ms(tick(next.p))-clock.ms(noteEnd)>=180;
    if(!explicit && !phraseEnd && durationMs<2400)continue;
    if(!explicit && clock.ms(start)-lastEndMs<2000)continue;
    const a=clock.at(clock.ms(start)+durationMs*.55), peak=clock.at(clock.ms(start)+durationMs*.84);
    const ceiling=section==='STRINGS'?68:section==='WOODWINDS'?56:48;
    const amount=Math.min(ceiling,clamp(24+.35*levelAt(n.source.points,n.scoreTick??start)));
    ramp(a,peak,0,amount);ramp(peak,end,amount,0);
    phrases.push({start,noteEnd,end,rampStart:a,peak,amount,pitch:n.pitch,reason:explicit?'written':phraseEnd?'phrase-end':'long-note'});
    lastEndMs=clock.ms(end);
  }
  for(const [t,value] of [...points].sort((a,b)=>a[0]-b[0]))events.push({t,p:-25,b:[176,2,value]});
  return phrases;
}
function renderScore(parts,choices){
  const meta=conductor(parts), files=[], warnings=new Set();
  for(const laneData of preparedLanes(parts,choices)){
    const {name,sourceName,row,lane,group,whistle,choir,choice,percussive,timpani,contra}=laneData;
    const musical=[], switches=[], events=[], points=laneCurve(laneData);
    const short=['Shorts','Pizzicato'].includes(lane);
    const controllerTransitions=[];
    const controllers=[];
    const dynamicAnchors=laneData.sources.flatMap(s=>s.part.events.filter(e=>e.type==='dyn' && e.staff===s.staff).map(e=>tick(e.p)));
    if(timpani || (!percussive && (!short || choice.shortCC)))controllers.push([1,points]);
    if(!percussive && !short)controllers.push([11,points.map(([t,value])=>[t,expression(value)])]);
    if(!percussive && short)events.push({t:0,p:-31,b:[176,11,127]});
    for(const [cc,raw] of controllers){
      const smooth=smoothController(raw,laneData.notes,parts,dynamicAnchors);
      for(const [t,value] of smooth.points)events.push({t,p:cc===1?-32:-31,b:[176,cc,value]});
      controllerTransitions.push(...smooth.changes.map(change=>({cc,...change})));
    }
    const notes=[], unique=new Map();
    for(const n of laneData.notes.sort((a,b)=>a.p-b.p)){
      const key=[tick(n.p),tick(n.d),n.pitch,n.trill,[...n.labels].sort().join(',')].join('/');
      const earlier=unique.get(key);
      if(earlier){
        if(levelAt(n.source.points,tick(n.p))>levelAt(earlier.source.points,tick(n.p)))earlier.source=n.source;
      }else{const copy={...n};unique.set(key,copy);notes.push(copy);}
    }
    const modes=longModes(notes,row,lane,laneData.longMode);
    const written=notes.map(note=>({note,start:tick(note.p),end:tick(note.p+note.d)}));
    for(const {note,start} of written)note.scoreTick=start;
    overlapLegato(notes,modes,parts,laneData);
    const phraseStarts=compensatePhraseStarts(notes,parts,laneData,written);
    const limited=phraseStarts.filter(n=>n.capped).length;
    if(limited)warnings.add(name+' · '+limited+' débuts très courts : compensation limitée pour préserver la note suivante');
    const addSwitch=(art,t)=>{
      const changes=[];actionEvents(art,0,t,changes);events.push(...changes);
      for(const e of changes)if(e.b[0]===144)switches.push([e.t,e.b[1],e.b[2]]);
    };
    for(const mode of modes)addSwitch(mode.art,mode.t);
    let lastId=null, lastWhistle=null, lastTimpani=null;
    for(const [noteIndex,n] of notes.entries()){
      const t=tick(n.p),end=Math.max(t+1,tick(n.p+n.d));
      const scoreTick=n.scoreTick??t;
      const art=repetitionArt(notes,noteIndex,row,parts)||(modes.length?modes.findLast(m=>m.t<=scoreTick)?.art:row && chooseArt(row.articulation_set,n.labels,lane));
      if(row && !art)warnings.add(name+' · déclencheur à vérifier');
      if(!modes.length && art && art.ID!==lastId){addSwitch(art,t);lastId=art.ID;}
      if(whistle){
        const staccato=n.labels.some(x=>['Staccato','Staccatissimo','Spiccato'].includes(x));
        if(staccato!==lastWhistle){
          const pitch=staccato?Number(choice.whistleShort??33):Number(choice.whistleLong??24);
          switches.push([t,pitch,100]);events.push({t,p:-19,b:[144,pitch,100]},{t:t+1,p:-18,b:[128,pitch,0]});lastWhistle=staccato;
        }
      }
      const value=levelAt(n.source.points,scoreTick);
      const baseVelocity=percussive?Math.max(1,Math.round(value*120/127)):Math.max(1,value);
      const fixedLegato=laneData.longMode==='legato' || /legato/i.test(art?.Name||'');
      // A small accent increment keeps legato 80/86 in the same speed zone.
      const nominalVelocity=fixedLegato?(n.fastLegato?105:80):(percussive || !group || short?baseVelocity:80);
      const v=Math.min(percussive?120:127,nominalVelocity+(n.accent?6:0));
      if(timpani){
        const roll=n.labels.includes('Tremolo');
        const crescendo=roll && levelAt(points,end-1)>levelAt(points,t);
        const key=crescendo?Number(choice.timpaniCresc??40):roll?Number(choice.timpaniRoll??38):Number(choice.timpaniHit??36);
        if(key!==lastTimpani){
          switches.push([t,key,100]);
          events.push({t,p:-19,b:[144,key,100]},{t:t+1,p:-18,b:[128,key,0]});
          lastTimpani=key;
        }
      }
      for(const pitch of [n.pitch,n.trill].filter(x=>x!=null))musical.push([t,pitch,v,end-t,art?.ArticulationID||0]);
    }
    // One MIDI gate per pitch prevents an overlapping voice from releasing a held note.
    const gates=new Map();
    for(const [t,pitch,v,d] of musical){
      const key=t+'/'+pitch, existing=gates.get(key);
      if(existing){existing.v=Math.max(existing.v,v);existing.end=Math.max(existing.end,t+d);}
      else gates.set(key,{t,pitch,v,end:t+d});
    }
    const ordered=[...gates.values()].sort((a,b)=>a.t-b.t);
    for(const gate of ordered){
      const next=ordered.find(other=>other.pitch===gate.pitch && other.t>gate.t);
      if(next && next.t<gate.end){next.end=Math.max(next.end,gate.end);gate.end=next.t;}
      events.push({t:gate.t,p:0,b:[144,gate.pitch,gate.v]},{t:gate.end,p:-8,b:[128,gate.pitch,0]});
    }
    const originalMusical=musical.slice();musical.length=0;
    for(const gate of ordered){
      const art=originalMusical.find(n=>n[0]===gate.t && n[1]===gate.pitch)?.[4]||0;
      musical.push([gate.t,gate.pitch,gate.v,gate.end-gate.t,art]);
    }
    let destination=contra?(lane==='Shorts'?'CONTRABASS_CLARINET_SHORTS':'CONTRABASS_CLARINET_LONGS'):choir?'All Saints Choir':whistle?'Tin Whistle':
      /bagpipe/i.test(name)?'Bagpipes':/^(Piccolo Snare|Snare Drum)/i.test(name)?'Snare High':
      /^Suspended Cymbal/i.test(name)?'Cymbal High':
      /^Crash Cymbal/i.test(name)?'Piatti':/^Harp 2/i.test(name)?'Harp 2':null;
    if(laneData.tomDestination)destination=laneData.tomDestination;
    const delay=trackDelay(row,laneData.longMode);
    let route=(destination==='CONTRABASS_CLARINET_LONGS'?'Contrebasse clarinette legato':destination==='CONTRABASS_CLARINET_SHORTS'?'Contrebasse clarinette staccato':destination)|| (row?row.instrument_group+' / '+row.lane:'À affecter · désactivée');
    if(laneData.longVoice && laneData.longVoice!=='legato1')route=name.replace(' — Longs — ',' — ');
    const vibratoPhrases=addVibrato(events,notes,parts,laneData);
    const shortAccentCount=0;
    const legatoAccentCount=notes.filter(n=>n.accent && laneData.longMode==='legato').length;
    const bridgedRests=notes.filter(n=>n.bridgedRest).map(n=>n.bridgedRest);
    files.push({name,sourceName,destination,route,delayMs:delay.ms,delayBasis:delay.basis,longMode:laneData.longMode||null,longVoice:laneData.longVoice||null,baseName:laneData.baseName||null,number:row?.track_number||0,musical,switches,phraseStarts,shortAccentCount,legatoAccentCount,bridgedRests,
      modes:modes.map(m=>[m.t,m.art.ArticulationID,m.poly]),events,controllerTransitions,vibratoPhrases,
      track:midiTrack(name,events),single:midiFile([midiTrack(name,[...meta,...events])],0)});
  }
  const meters=meta.filter(e=>e.b[1]===88).sort((a,b)=>a.t-b.t).map(e=>[e.t,e.b[3],2**e.b[4]]);
  const tempos=meta.filter(e=>e.b[1]===81).sort((a,b)=>a.t-b.t).map(e=>[e.t,60000000/(e.b[3]*65536+e.b[4]*256+e.b[5])]);
  return {meters,tempos,bytes:midiFile([midiTrack('Tempo et mesures',meta),...files.map(f=>f.track)]),files,warnings:[...warnings]};
}
function build(){
  const choices=parsed.map((_,i)=>{
    const box=document.querySelector('[data-part="'+i+'"]');
    return {group:box.querySelector('.group').value,bank:box.querySelector('.bank').value,octave:box.querySelector('.octave').value,shortCC:$('#shortCC').checked,whistleShort:$('#whistleShort').value,whistleLong:$('#whistleLong').value,timpaniHit:$('#timpaniHit').value,timpaniRoll:$('#timpaniRoll').value,timpaniCresc:$('#timpaniCresc').value,splitLongs:$('#splitLongs').checked,autoVibrato:$('#autoVibrato').checked,vibratoStrings:$('#vibratoStrings').checked,vibratoWinds:$('#vibratoWinds').checked,vibratoBrass:$('#vibratoBrass').checked,fastStringTiming:$('#fastStringTiming').checked};
  });
  return renderScore(parsed,choices);
}
function download(bytes,name){
  const url=URL.createObjectURL(new Blob([bytes],{type:'audio/midi'}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
}
$('#convert').onclick=()=>{
  try {
    const r=build();
    const title=$('#file').files[0].name.replace(/\.[^.]+$/,'');
    download(r.bytes,title+' - Logic.mid');
    const box=$('#summary');box.replaceChildren();
    const details=document.createElement('details'), heading=document.createElement('summary');
    heading.textContent=r.files.length+' pistes · Télécharger une région pour une piste existante';
    details.append(heading);
    for(const f of r.files){
      const button=document.createElement('button');
      button.textContent=f.route+' · '+f.name;
      button.onclick=()=>download(f.single,button.textContent+'.mid');
      details.append(button,document.createElement('br'));
    }
    box.append(details);
    const mapping=document.createElement('button');
    mapping.textContent='Enregistrer les affectations pour le projet Logic';
    mapping.onclick=()=>download(new TextEncoder().encode(JSON.stringify(planForLogic(r))),title+' - Logic.json');
    box.append(mapping);$('#convertStatus').textContent=r.warnings.join(' / ');
  } catch(e){$('#convertStatus').textContent=e.message;}
};

function planForLogic(r){return {version:7,revision:'7.13',meters:r.meters,tempos:r.tempos,templateDelays:assignments.map(row=>({number:row.track_number,group:row.instrument_group,lane:row.lane,section:row.section,...trackDelay(row,null)})),tracks:r.files.map(({name,sourceName,destination,number,delayMs,delayBasis,longMode,longVoice,baseName,musical,switches,modes,events,phraseStarts,shortAccentCount,legatoAccentCount,bridgedRests,controllerTransitions,vibratoPhrases})=>({name,sourceName,destination,number,delayMs,delayBasis,longMode,longVoice,baseName,musical,switches,modes,events,phraseStarts,shortAccentCount,legatoAccentCount,bridgedRests,controllerTransitions,vibratoPhrases}))};}
function renderParts(){let html="";parsed.forEach((p,i)=>{let d=infer(p.name);html+='<div class="part" data-part="'+i+'"><div><strong>'+esc(p.name)+'</strong><small>'+p.notes.length+' notes</small></div><label><small>Instrument</small><select class="group">'+['',...groups].map(g=>'<option value="'+esc(g)+'" '+(g===d.group?'selected':'')+'>'+esc(g||'Hors template')+'</option>').join("")+'</select></label><label><small>Banque</small><select class="bank">'+banks.map(b=>'<option '+(b===d.bank?'selected':'')+'>'+esc(b)+'</option>').join("")+ '</select></label><label><small>Octave des notes</small><select class="octave"><option value="template">Réglage template</option><option value="0">Son réel Dorico</option><option value="-12">Son réel − 1 octave</option><option value="12">Son réel + 1 octave</option></select></label></div>' });$('#parts').innerHTML=html}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
$('#analyze').onclick=async()=>{let f=$('#file').files[0];if(!f){$('#fileStatus').textContent='Choisis d’abord un fichier MusicXML.';return}$('#analyze').disabled=true;$('#fileStatus').textContent='Lecture et analyse de la partition…';try{parsed=parseXML(await xmlText(f));if(!parsed.length)throw Error('Aucune partie instrumentale trouvée.');renderParts();$('#setup').classList.remove('hidden');$('#fileStatus').textContent='Partition analysée : '+parsed.length+' partie(s).'}catch(e){$('#fileStatus').textContent='Impossible de lire ce fichier : '+e.message}finally{$('#analyze').disabled=false}};
