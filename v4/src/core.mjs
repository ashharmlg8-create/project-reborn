// Reborn Companion V4 — deterministic domain engine.
// No network calls and no access to legacy V3.x storage.
export const SCHEMA = 1;
export const DB_NAME = "reborn-companion-v4-alpha-independent";
export const TASK_PRIORITIES = ["High","Medium","Low"];
export const EXPENSE_CATEGORIES = ["Food","Transport","Education","Bills","Health","Shopping","Other"];
export const WORLD_CATEGORIES = ["preferences","constraints","goals","values","life_areas","energy"];

export function localDate(date=new Date()){
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
}
export function validDate(s){
  if(typeof s!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
  const [y,m,d]=s.split("-").map(Number),a=new Date(Date.UTC(y,m-1,d));
  return y>=1900&&y<=2200&&a.getUTCFullYear()===y&&a.getUTCMonth()+1===m&&a.getUTCDate()===d;
}
export function shiftDate(day,delta){
  if(!validDate(day)||!Number.isInteger(delta)||Math.abs(delta)>10000)throw Error("Invalid date shift");
  const [y,m,d]=day.split("-").map(Number);
  const a=new Date(Date.UTC(y,m-1,d+delta));
  return [a.getUTCFullYear(),String(a.getUTCMonth()+1).padStart(2,"0"),String(a.getUTCDate()).padStart(2,"0")].join("-");
}
export function weekStart(day){
  if(!validDate(day))throw Error("Invalid date");
  return shiftDate(day,-((new Date(day+"T00:00:00Z").getUTCDay()+6)%7));
}
export function timeMinutes(s){
  return typeof s==="string"&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s)
    ?Number(s.slice(0,2))*60+Number(s.slice(3)):NaN;
}
export function clock(n){
  return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");
}
export function centsFromInput(input){
  const s=String(input).trim();
  if(!/^\d{1,8}(?:\.\d{1,2})?$/.test(s))throw Error("Enter a valid positive amount (up to 2 decimal places)");
  const [whole,fraction=""]=s.split(".");
  const n=Number(whole)*100+Number(fraction.padEnd(2,"0"));
  if(!Number.isSafeInteger(n)||n<=0||n>1_000_000_000)throw Error("Amount outside allowed range");
  return n;
}
export function rupees(cents){
  return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(cents/100);
}
export function blankData(){
  return {schema:SCHEMA,tasks:[],events:[],expenses:[],habits:[],habitLogs:{},goals:[],milestones:[],budgets:{},
    journal:{},reviews:[],world:[],coaching:[],
    nudge:{optIn:false,quietStart:"22:00",quietEnd:"08:00",candidates:[],history:[]}};
}
function plain(x){return x&&typeof x==="object"&&!Array.isArray(x)}
function textOk(x,max=280){return typeof x==="string"&&x.length<=max}
function uniqueRecords(arr,label,max=2000){
  if(!Array.isArray(arr)||arr.length>max)throw Error("Invalid "+label);
  const ids=new Set();
  for(const x of arr){
    if(!plain(x)||typeof x.id!=="string"||!x.id||ids.has(x.id))throw Error("Duplicate/invalid "+label+" ID");
    ids.add(x.id);
  }
}
export function validateData(d){
  if(!plain(d)||d.schema!==SCHEMA)throw Error("Unsupported data schema");
  for(const key of ["tasks","events","expenses","habits","goals","milestones","reviews","world","coaching"])uniqueRecords(d[key],key);
  if(!plain(d.habitLogs)||!plain(d.journal)||!plain(d.nudge)||!plain(d.budgets))throw Error("Invalid data maps");
  for(const [month,cents] of Object.entries(d.budgets))if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!Number.isSafeInteger(cents)||cents<0||cents>1_000_000_000)throw Error("Invalid monthly budget");
  const goalIds=new Set(d.goals.map(x=>x.id)),habitIds=new Set(d.habits.map(x=>x.id));
  for(const t of d.tasks){
    if(!textOk(t.title,180)||!t.title.trim()||!Number.isInteger(t.minutes)||t.minutes<1||t.minutes>600||
      !TASK_PRIORITIES.includes(t.priority)||typeof t.done!=="boolean"||
      (t.due&&!validDate(t.due))||(t.completedOn&&!validDate(t.completedOn))||
      (t.goalId&&!goalIds.has(t.goalId)))throw Error("Invalid task");
  }
  for(const e of d.events){
    if(!validDate(e.date)||!textOk(e.title,180)||!e.title.trim()||
      !(timeMinutes(e.end)>timeMinutes(e.start)))throw Error("Invalid commitment");
  }
  for(const x of d.expenses){
    if(!validDate(x.date)||!textOk(x.title,180)||!x.title.trim()||
       !Number.isSafeInteger(x.amountCents)||x.amountCents<=0||x.amountCents>1_000_000_000||
       !EXPENSE_CATEGORIES.includes(x.category))throw Error("Invalid expense");
  }
  for(const g of d.goals)if(!textOk(g.title,160)||!g.title.trim()||!textOk(g.why,500)||
    !["active","completed"].includes(g.status)||(g.due&&!validDate(g.due)))throw Error("Invalid goal");
  for(const h of d.habits)if(!textOk(h.title,120)||!h.title.trim()||
    typeof h.archived!=="boolean"||(h.goalId&&!goalIds.has(h.goalId)))throw Error("Invalid habit");
  for(const m of d.milestones)if(!goalIds.has(m.goalId)||!textOk(m.title,160)||!m.title.trim()||
    typeof m.done!=="boolean")throw Error("Invalid milestone");
  for(const [date,log] of Object.entries(d.habitLogs)){
    if(!validDate(date)||!plain(log))throw Error("Invalid habit log date");
    for(const [id,v] of Object.entries(log))if(!habitIds.has(id)||typeof v!=="boolean")throw Error("Invalid habit log");
  }
  for(const [date,entry] of Object.entries(d.journal)){
    if(!validDate(date)||!plain(entry)||typeof entry.morning!=="boolean"||typeof entry.evening!=="boolean"||
      !textOk(entry.focus,1000)||!textOk(entry.wins,1000)||!textOk(entry.obstacles,1000))throw Error("Invalid journal");
  }
  const weeks=new Set();
  for(const r of d.reviews)if(!validDate(r.week)||weekStart(r.week)!==r.week||weeks.has(r.week)||
    !textOk(r.wins,1000)||!textOk(r.challenge,1000)||!textOk(r.next,1000)||
    !Number.isInteger(r.helpfulness)||r.helpfulness<1||r.helpfulness>5)
    throw Error("Invalid review");else weeks.add(r.week);
  for(const x of d.world)if(!WORLD_CATEGORIES.includes(x.category)||!textOk(x.key,80)||
    !x.key.trim()||!textOk(x.value,400)||!x.value.trim()||x.provenance!=="confirmed")throw Error("Invalid World Model");
  for(const x of d.coaching)if(!["woop","ifthen","tiny"].includes(x.kind)||
    !textOk(x.statement,1000)||!x.statement.trim())throw Error("Invalid coaching plan");
  const n=d.nudge;
  if(typeof n.optIn!=="boolean"||!Number.isFinite(timeMinutes(n.quietStart))||
     !Number.isFinite(timeMinutes(n.quietEnd))||n.quietStart===n.quietEnd)throw Error("Invalid nudge settings");
  uniqueRecords(n.candidates,"nudge candidates"); // candidate IDs are stable
  if(!Array.isArray(n.history)||n.history.length>5000)throw Error("Invalid nudge history");
  for(const candidate of n.candidates)if(!validDate(candidate.dueDate)||!textOk(candidate.title,160)||!candidate.title.trim())throw Error("Invalid nudge");
  for(const e of n.history)if(!textOk(e.id,100)||!validDate(e.day)||!["delivered","ignored","helped","dismissed"].includes(e.action))throw Error("Invalid nudge event");
  if(JSON.stringify(d).length>3_000_000)throw Error("Vault is larger than 3 MB");
  return d;
}
export function dailyPlan(d,day,from="09:00",to="18:00"){
  validateData(d);
  if(!validDate(day))throw Error("Invalid planning day");
  const a=timeMinutes(from),b=timeMinutes(to);
  if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a)throw Error("Invalid work window");
  const commitments=d.events.filter(x=>x.date===day).map(x=>({a:Math.max(a,timeMinutes(x.start)),b:Math.min(b,timeMinutes(x.end)),title:x.title}))
    .filter(x=>x.b>x.a).sort((x,y)=>x.a-y.a);
  const merged=[];
  for(const e of commitments){
    const last=merged[merged.length-1];
    if(last&&e.a<=last.b)last.b=Math.max(last.b,e.b);
    else merged.push({...e});
  }
  const free=b-a-merged.reduce((s,x)=>s+x.b-x.a,0),capacity=Math.floor(free*7/10);
  const weights={High:3,Medium:2,Low:1};
  const todo=d.tasks.filter(x=>!x.done).slice().sort((x,y)=>
    Number(Boolean(y.due&&y.due<=day))-Number(Boolean(x.due&&x.due<=day))||
    weights[y.priority]-weights[x.priority]||String(x.due||"9999").localeCompare(String(y.due||"9999")));
  const slots=[];let used=0;
  for(const task of todo){
    if(used+task.minutes>capacity)continue;
    let cursor=a;
    for(const x of [...merged,...slots].sort((x,y)=>x.a-y.a)){
      if(cursor+task.minutes<=x.a)break;
      cursor=Math.max(cursor,x.b);
    }
    if(cursor+task.minutes<=b){
      slots.push({a:cursor,b:cursor+task.minutes,title:task.title,id:task.id});
      used+=task.minutes;
    }
  }
  return {free,capacity,used,fixed:merged,slots,unplanned:todo.filter(x=>!slots.some(s=>s.id===x.id))};
}
export function weeklyStats(d,day){
  validateData(d);
  const start=weekStart(day),days=Array.from({length:7},(_,i)=>shiftDate(start,i));
  const loops=days.filter(x=>d.journal[x]?.morning&&d.journal[x]?.evening).length;
  const evenings=Object.keys(d.journal).filter(x=>d.journal[x]?.evening).length;
  const finished=d.tasks.filter(x=>x.done&&days.includes(x.completedOn)).length;
  const habits=days.reduce((sum,x)=>sum+Object.values(d.habitLogs[x]||{}).filter(Boolean).length,0);
  return {start,end:days[6],loops,evenings,finished,habits,canDiscussPatterns:evenings>=14};
}
export function routeFallback(message){
  const s=String(message||"").trim().toLowerCase();
  // A UX hint, never a production safety classifier or authorization mechanism.
  let intent="other";
  if(/\b(suicide|kill myself|want to die|hurt myself|self harm)\b/.test(s))intent="crisis";
  else if(/\b(feel sad|stressed|overwhelmed|anxious|lonely)\b/.test(s))intent="vent";
  else if(/\b(review|reflect|what went well)\b/.test(s))intent="reflect";
  else if(/(?:^|\s)(?:note:|spent\b|paid\b|₹|add task|expense)/.test(s))intent="capture";
  else if(/\b(plan|schedule|tomorrow|kal|deadline)\b/.test(s))intent="plan";
  else if(/\b(procrastinat|consistent|motivat|disciplin)/.test(s))intent="coach";
  else if(/\?|what is|explain|kaise/.test(s))intent="ask";
  return {intent,safetyFlag:intent==="crisis"?"requires_review":"unverified",toolExecuted:false,modelUsed:false};
}
export function nudgeDecision(config,history,candidate,day,time="12:00",privateMode=false,safetyPause=false){
  if(!validDate(day)||!Number.isFinite(timeMinutes(time))||!validDate(candidate.dueDate))
    return {eligible:false,reason:"invalid_time"};
  if(safetyPause)return {eligible:false,reason:"safety_pause"};
  if(privateMode)return {eligible:false,reason:"private_session"};
  if(!config.optIn)return {eligible:false,reason:"opt_in_required"};
  const t=timeMinutes(time),a=timeMinutes(config.quietStart),b=timeMinutes(config.quietEnd);
  if(!Number.isFinite(a)||!Number.isFinite(b)||a===b)return {eligible:false,reason:"invalid_quiet_hours"};
  if(a<b?(t>=a&&t<b):(t>=a||t<b))return {eligible:false,reason:"quiet_hours"};
  if(candidate.dueDate>day)return {eligible:false,reason:"not_due"};
  if(history.some(x=>x.id===candidate.id&&x.action==="delivered"))return {eligible:false,reason:"duplicate"};
  const response=history.filter(x=>x.action==="ignored"||x.action==="helped").slice().sort((x,y)=>x.day.localeCompare(y.day));
  let ignores=0,backoffUntil="";
  for(const event of response){
    if(event.action==="helped"){ignores=0;backoffUntil="";continue}
    ignores++;
    if(ignores===3){backoffUntil=shiftDate(event.day,7);ignores=0}
  }
  const backoff=backoffUntil&&day<backoffUntil;
  const cap=backoff?1:2;
  const delivered=history.filter(x=>x.action==="delivered"&&x.day===day).length;
  if(delivered>=cap)return {eligible:false,reason:"daily_cap",cap};
  return {eligible:true,reason:"eligible",cap};
}
