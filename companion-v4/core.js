(function (root) {
  "use strict";
  const KEY="reborn-companion-v4-local-2026-10-p1";
  const BACKUP_KEY=KEY+":last-good";
  const FORMAT="reborn-v4-persistent";
  const MAX_BACKUP_SIZE=1200000;
  const collections=["tasks","events","expenses","notes","coaching"];
  const fresh=()=>({format:FORMAT,version:4,revision:0,tasks:[],events:[],expenses:[],notes:[],coaching:[],days:{},profile:{}});
  const validDate=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s||"")))return false;const d=new Date(s+"T00:00:00Z");return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s};
  const validTime=s=>/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s||"");
  const validText=s=>typeof s==="string"&&s.trim().length>0&&s.length<=500;
  const validRecordId=id=>typeof id==="string"&&/^[A-Za-z0-9_-]{4,100}$/.test(id);
  function validate(data){
    if(!data||typeof data!=="object"||Array.isArray(data)||data.format!==FORMAT||data.version!==4||!Number.isSafeInteger(data.revision)||data.revision<0)return false;
    if(!collections.every(k=>Array.isArray(data[k])&&data[k].length<=2000))return false;
    if(!data.days||typeof data.days!=="object"||Array.isArray(data.days)||!data.profile||typeof data.profile!=="object"||Array.isArray(data.profile)||Object.keys(data.days).length>3650||Object.keys(data.profile).length>20)return false;
    const ids=new Set();
    for(const kind of collections)for(const r of data[kind]){
      if(!r||typeof r!=="object"||Array.isArray(r)||!validRecordId(r.id)||ids.has(r.id))return false;
      ids.add(r.id);
      if(kind==="tasks"&&(!validText(r.title)||!Number.isInteger(r.minutes)||r.minutes<1||r.minutes>600||typeof r.done!=="boolean"||!["high","medium","low"].includes(r.priority)||(r.due&&!validDate(r.due))))return false;
      if(kind==="events"&&(!validText(r.title)||!validTime(r.start)||!validTime(r.end)||r.end<=r.start))return false;
      if(kind==="expenses"&&(!validText(r.title)||!Number.isFinite(r.amount)||r.amount<.01||r.amount>1000000||!validDate(r.date)))return false;
      if(kind==="notes"&&(!validText(r.text)||!validDate(r.date)))return false;
      if(kind==="coaching"&&(!validText(r.text)||!["woop","restart","ifthen"].includes(r.type)))return false;
    }
    for(const [day,r] of Object.entries(data.days)){
      if(!validDate(day)||!r||typeof r!=="object"||Array.isArray(r)||typeof r.morning!=="boolean"||typeof r.evening!=="boolean"||["focus","wins","blocks","carry"].some(k=>String(r[k]||"").length>500))return false;
    }
    for(const [k,r] of Object.entries(data.profile)){
      if(!["planningStyle","nudgeStyle","languageMix","peakTime"].includes(k)||!r||r.provenance!=="confirmed"||typeof r.value!=="string"||!r.value.trim()||r.value.length>80)return false;
    }
    return true;
  }
  function parseBackup(raw){
    if(typeof raw!=="string"||raw.length>MAX_BACKUP_SIZE)throw Error("Backup too large");
    const obj=JSON.parse(raw);if(!validate(obj))throw Error("Unsupported or invalid V4 backup");return obj;
  }
  function merge(current,incoming){
    if(!validate(current)||!validate(incoming))throw Error("Invalid data");
    const out=JSON.parse(JSON.stringify(current)),ids=new Set(collections.flatMap(k=>out[k].map(x=>x.id)));
    let added=0,skipped=0;
    for(const kind of collections)for(const r of incoming[kind]){
      if(ids.has(r.id)){skipped++;continue}out[kind].push(r);ids.add(r.id);added++;
    }
    for(const [day,entry] of Object.entries(incoming.days)){
      if(Object.prototype.hasOwnProperty.call(out.days,day))skipped++;
      else{out.days[day]=entry;added++}
    }
    for(const [key,entry] of Object.entries(incoming.profile)){
      if(Object.prototype.hasOwnProperty.call(out.profile,key))skipped++;
      else{out.profile[key]=entry;added++}
    }
    out.revision=current.revision+1;
    if(!validate(out))throw Error("Merged payload exceeds limits");
    return{data:out,added,skipped};
  }
  function load(storage){
    try{const raw=storage.getItem(KEY);return raw===null?{status:"new",data:fresh()}:{status:"ok",data:parseBackup(raw)}}
    catch(e){return{status:"recovery",data:null,error:String(e.message||e)}}
  }
  function commit(storage,data){
    if(!validate(data))throw Error("Invalid state: write refused");
    const raw=JSON.stringify(data);if(raw.length>MAX_BACKUP_SIZE)throw Error("State exceeds 1.2MB safety limit");
    const original=storage.getItem(KEY);
    try{
      if(original!==null)storage.setItem(BACKUP_KEY,original);
      storage.setItem(KEY,raw);
      if(storage.getItem(KEY)!==raw)throw Error("Storage read-back mismatch");
    }catch(error){
      try{if(original!==null)storage.setItem(KEY,original);else storage.removeItem(KEY)}catch(_){}
      throw error;
    }
    return true;
  }
  const minutes=s=>Number(s.slice(0,2))*60+Number(s.slice(3));
  const fmt=n=>String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");
  function union(events){
    const sorted=events.filter(x=>x.end>x.start).sort((a,b)=>a.start-b.start),result=[];
    for(const e of sorted){const last=result[result.length-1];if(last&&e.start<=last.end)last.end=Math.max(last.end,e.end);else result.push({...e})}
    return result;
  }
  function schedule(tasks,events,date,start="09:00",end="18:00"){
    if(!validTime(start)||!validTime(end)||end<=start)return{error:"Invalid planning window",slots:[],deferred:[]};
    const a=minutes(start),b=minutes(end),fixed=union(events.map(e=>({start:Math.max(a,minutes(e.start)),end:Math.min(b,minutes(e.end))})));
    const free=Math.max(0,b-a-fixed.reduce((n,x)=>n+x.end-x.start,0)),cap=Math.floor(.7*free),slots=[],deferred=[];
    const prio=t=>({high:3,medium:2,low:1})[t.priority]||2;
    const pending=tasks.filter(t=>!t.done).slice().sort((x,y)=>((y.due&&y.due<=date?100:0)+prio(y))-((x.due&&x.due<=date?100:0)+prio(x)));
    let used=0;
    for(const t of pending){
      if(used+t.minutes>cap){deferred.push({...t,reason:"Buffer cap"});continue}
      let at=a;
      for(const e of union([...fixed,...slots.map(s=>({start:s.start,end:s.end}))])){if(at+t.minutes<=e.start)break;at=Math.max(at,e.end)}
      if(at+t.minutes>b){deferred.push({...t,reason:"No continuous gap"});continue}
      slots.push({...t,start:at,end:at+t.minutes});used+=t.minutes;
    }
    return{free,cap,used,slots:slots.sort((x,y)=>x.start-y.start),deferred,fixed};
  }
  function parseCapture(raw){
    const s=String(raw||"").trim();let m;
    if(m=/^task:\s*(.+)$/i.exec(s))return{kind:"task",title:m[1].trim()};
    if(m=/^note:\s*(.+)$/i.exec(s))return{kind:"note",title:m[1].trim()};
    if((m=/^expense:\s*₹?\s*(\d+(?:\.\d{1,2})?)\s+(.+)$/i.exec(s))||(m=/^(?:₹\s*)?(\d+(?:\.\d{1,2})?)\s+(chai|tea|coffee|bus|auto|food|snack|lunch|travel)\b/i.exec(s)))return{kind:"expense",title:m[2].trim(),amount:Number(m[1])};
    return null;
  }
  function lastSeven(date){
    if(!validDate(date))throw Error("Invalid review date");
    const d=new Date(date+"T12:00:00Z");
    return Array.from({length:7},(_,i)=>{const x=new Date(d.getTime());x.setUTCDate(x.getUTCDate()-6+i);return x.toISOString().slice(0,10)});
  }
  function review(days,date){
    const dates=lastSeven(date),morning=dates.filter(d=>days[d]?.morning).length,evening=dates.filter(d=>days[d]?.evening).length,full=dates.filter(d=>days[d]?.morning&&days[d]?.evening).length;
    return{dates,morning,evening,full,observations:Object.values(days).filter(x=>x?.evening).length};
  }
  function dayLocal(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
  root.RebornCore={KEY,BACKUP_KEY,FORMAT,MAX_BACKUP_SIZE,fresh,validate,validDate,validTime,parseBackup,merge,load,commit,minutes,fmt,schedule,parseCapture,lastSeven,review,dayLocal};
})(typeof window!=="undefined"?window:globalThis);
