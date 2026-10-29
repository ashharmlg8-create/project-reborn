import {blankData,validateData,localDate,weekStart,shiftDate,timeMinutes,clock,dailyPlan,weeklyStats,centsFromInput,rupees,routeFallback,nudgeDecision,WORLD_CATEGORIES,EXPENSE_CATEGORIES} from "./core.mjs";
import {Vault} from "./vault.mjs";

const root=document.getElementById("app");
const $=id=>document.getElementById(id);
const vault=new Vault();
let demo=blankData(),mode="demo",page="Today",day=localDate(),month=day.slice(0,7);
let vaultReady=false,busy=false,noticeTimer,activeAt=Date.now(),backgroundAt=null;
const routes=["Today","Capture","Tasks","Planner","Money","Habits","Goals","Journal","Weekly Review","World Model","Coaching","Nudges","Privacy"];
const ico={Today:"⌂",Capture:"＋",Tasks:"☑",Planner:"▦",Money:"₹",Habits:"✦",Goals:"◎",Journal:"✎","Weekly Review":"▥","World Model":"◇",Coaching:"♡",Nudges:"◷",Privacy:"▣"};
const state=()=>mode==="vault"?vault.data:demo;
const id=()=>crypto.randomUUID();
const clone=x=>structuredClone(x);
function node(parent,tag,text,className){
  const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(className)e.className=className;
  parent.append(e);return e;
}
function button(parent,label,action,variant="btn"){
  const e=node(parent,"button",label,variant);e.type="button";
  e.addEventListener("click",()=>run(action));return e;
}
function card(parent,title){const c=node(parent,"section",undefined,"card");node(c,"h2",title,"card-title");return c}
function field(parent,label,value="",type="text"){
  const l=node(parent,"label",label,"form-label");
  const x=node(parent,type==="textarea"?"textarea":type==="select"?"select":"input",undefined,"field");
  x.id="field-"+Math.random().toString(36).slice(2);l.htmlFor=x.id;
  if(type!=="textarea"&&type!=="select")x.type=type;
  x.value=value??"";return x;
}
function select(parent,label,values,chosen){
  const s=field(parent,label,"","select");
  for(const v of values){
    const option=node(s,"option",typeof v==="string"?v:v.label);
    option.value=typeof v==="string"?v:v.value;if(option.value===chosen)option.selected=true;
  }
  return s;
}
function actions(parent){return node(parent,"div",undefined,"actions")}
function message(text){
  const el=$("toast");el.textContent=text;el.hidden=false;clearTimeout(noticeTimer);
  noticeTimer=setTimeout(()=>el.hidden=true,4000);
}
async function run(action){
  if(busy)return;busy=true;
  try{await action()}catch(e){message(e?.message||"Unexpected error");if(String(e?.message).includes("another tab"))lock()}
  finally{busy=false}
}
async function change(fn){
  const next=clone(state());fn(next);validateData(next);
  if(mode==="vault")await vault.save(next);else demo=next;
  render();message(mode==="vault"?"Saved in encrypted vault":"Updated in demo (not persistent)");
}
function lock(){
  vault.lock();mode="demo";demo=blankData();render();message("Vault locked");
}
function nav(){
  $("navigation").replaceChildren();$("mobile-nav").replaceChildren();
  for(const route of routes){
    const b=button($("navigation"),ico[route]+"  "+route,()=>navigate(route),"nav-btn"+(page===route?" selected":""));
    if(page===route)b.setAttribute("aria-current","page");
  }
  for(const route of ["Today","Tasks","Money","Journal","More"]){
    const b=button($("mobile-nav"),ico[route]||"•••",()=>route==="More"?showMore():navigate(route),"mobile-btn"+(page===route?" selected":""));
    node(b,"span",route);
  }
}
function navigate(next){page=next;render();$("main").scrollTop=0}
function render(){
  nav();$("page-title").textContent=page;$("mode").textContent=mode==="vault"?"Encrypted vault":"Demo · temporary";
  $("mode").className=mode==="vault"?"pill":"pill demo";
  const v=$("view");v.replaceChildren();
  const pageFunctions={Today:home,Capture:capture,Tasks:tasks,Planner:planner,Money:money,Habits:habits,Goals:goals,Journal:journal,"Weekly Review":review,"World Model":world,Coaching:coaching,Nudges:nudges,Privacy:privacy};
  pageFunctions[page](v);
}
function metric(parent,label,value){
  const c=node(parent,"div",undefined,"metric");node(c,"strong",value);node(c,"span",label);
}
function row(parent,title,meta,controls){
  const r=node(parent,"div",undefined,"item"),body=node(r,"div",undefined,"grow");
  node(body,"div",title,"item-title");
  if(meta)node(body,"div",meta,"muted");
  if(controls)controls(r);
  return r;
}
function confirmDelete(label,fn){if(confirm("Delete "+label+"?"))return change(fn)}
function goalOptions(){return[{label:"None",value:""},...state().goals.filter(x=>x.status==="active").map(g=>({label:g.title,value:g.id}))]}
function home(v){
  const d=state(),stats=weeklyStats(d,day),hero=node(v,"section",undefined,"hero");
  node(hero,"div","CALM PROGRESS · ONE DAY AT A TIME","eyebrow");
  node(hero,"h2","One useful step today.");node(hero,"p","Plan realistically, capture quickly, reflect without pressure.");
  button(actions(hero),"＋ Quick capture",()=>navigate("Capture"));
  const m=node(v,"div",undefined,"metrics");
  metric(m,"Open tasks",d.tasks.filter(x=>!x.done).length);
  metric(m,"Monthly expenses",rupees(d.expenses.filter(x=>x.date.slice(0,7)===month).reduce((s,x)=>s+x.amountCents,0)));
  metric(m,"Complete weekly loops",stats.loops+"/7");
  const left=card(v,"Today priorities");
  if(!d.tasks.filter(x=>!x.done).length)node(left,"p","No pending tasks. You can add your first action.","muted");
  for(const t of d.tasks.filter(x=>!x.done).slice(0,3)){
    row(left,t.title,t.priority+" · "+t.minutes+" minutes",r=>button(r,"Done",()=>change(x=>{const z=x.tasks.find(a=>a.id===t.id);z.done=true;z.completedOn=localDate()}),"btn small"));
  }
  const status=card(v,"Daily loop");
  const journal=d.journal[day];
  node(status,"p","Morning: "+(journal?.morning?"Complete":"Pending")+" · Evening: "+(journal?.evening?"Complete":"Pending"),"muted");
  button(status,"Open journal",()=>navigate("Journal"),"btn soft");
}
function capture(v){
  const c=card(v,"Quick capture"),type=select(c,"Entry type",["Task","Expense","Note"],"Task"),label=field(c,"Description");
  const amount=field(c,"Amount (for expenses only)","","text");
  button(actions(c),"Review and save",()=>{
    const value=label.value.trim();if(!value||value.length>160)throw Error("Enter a description (max 160 characters)");
    if(type.value==="Note")return change(d=>{const entry=d.journal[day]||{morning:false,evening:false,focus:"",wins:"",obstacles:""};entry.focus=(entry.focus?entry.focus+"\n":"")+value;if(entry.focus.length>1000)throw Error("Journal note too long");d.journal[day]=entry});
    if(type.value==="Task")return change(d=>d.tasks.push({id:id(),title:value,minutes:30,priority:"Medium",due:"",done:false,completedOn:"",goalId:""}));
    const amountCents=centsFromInput(amount.value);
    return change(d=>d.expenses.push({id:id(),date:day,title:value,category:"Other",amountCents}));
  });
  const r=card(v,"Intelligent capture status");
  node(r,"p","Manual structured capture is working. Natural-language model parsing is not yet connected and cannot silently save entries.","muted");
  const sample=field(r,"Router preview (not an action)","Spent ₹200 on lunch","textarea");
  const out=node(r,"pre","","code");
  button(actions(r),"Classify locally",()=>{out.textContent=JSON.stringify(routeFallback(sample.value),null,2)},"btn soft");
}
function taskForm(v){
  const c=card(v,"New task"),name=field(c,"Title"),minutes=field(c,"Estimated minutes",30,"number"),
    priority=select(c,"Priority",["High","Medium","Low"],"Medium"),due=field(c,"Due date (optional)","","date"),
    goal=select(c,"Related goal",goalOptions(),"");
  button(actions(c),"Add task",()=>{
    const title=name.value.trim(),m=Number(minutes.value);
    if(!title||title.length>180||!Number.isInteger(m)||m<1||m>600)throw Error("Check title and minutes (1–600)");
    return change(d=>d.tasks.push({id:id(),title,minutes:m,priority:priority.value,due:due.value,goalId:goal.value,done:false,completedOn:""}));
  });
}
function tasks(v){
  taskForm(v);const d=state(),c=card(v,"Task list");
  if(!d.tasks.length)node(c,"p","No tasks yet.","muted");
  for(const t of d.tasks){
    const goal=d.goals.find(x=>x.id===t.goalId);
    row(c,t.title,(t.done?"Completed":"Pending")+" · "+t.priority+" · "+t.minutes+"m"+(goal?" · "+goal.title:""),r=>{
      button(r,t.done?"Reopen":"Done",()=>change(d=>{const z=d.tasks.find(x=>x.id===t.id);z.done=!z.done;z.completedOn=z.done?localDate():""}),"btn small soft");
      button(r,"×",()=>confirmDelete("task",d=>{d.tasks=d.tasks.filter(x=>x.id!==t.id)}),"btn small ghost");
    });
  }
}
function planner(v){
  const d=state(),c=card(v,"Daily planner"),date=field(c,"Day",day,"date");
  date.addEventListener("change",()=>{if(date.value){day=date.value;render()}});
  const result=dailyPlan(d,day);
  const m=node(v,"div",undefined,"metrics");
  metric(m,"Available",result.free+"m");metric(m,"70% capacity",result.capacity+"m");metric(m,"Scheduled",result.used+"m");
  const form=card(v,"Fixed class / commitment"),title=field(form,"Title"),start=field(form,"From","10:00","time"),end=field(form,"Until","11:00","time");
  button(actions(form),"Add commitment",()=>{
    const name=title.value.trim();if(!name||name.length>180)throw Error("Enter a commitment title");
    return change(d=>d.events.push({id:id(),date:day,title:name,start:start.value,end:end.value}));
  });
  const timeline=card(v,"Suggested timeline");
  const entries=[...d.events.filter(e=>e.date===day).map(e=>({a:timeMinutes(e.start),b:timeMinutes(e.end),title:e.title,fixed:true,id:e.id})),...result.slots.map(s=>({...s,fixed:false}))].sort((a,b)=>a.a-b.a);
  if(!entries.length)node(timeline,"p","No commitments or scheduled tasks.","muted");
  for(const e of entries){
    row(timeline,clock(e.a)+"–"+clock(e.b)+" · "+e.title,e.fixed?"Fixed commitment":"Suggested task",e.fixed?r=>button(r,"×",()=>confirmDelete("commitment",d=>{d.events=d.events.filter(x=>x.id!==e.id)}),"btn small ghost"):null);
  }
  node(timeline,"p","Keeps 30% of free time unscheduled. Skipped "+result.unplanned.length+" task(s) due to capacity and constraints.","muted");
}
function money(v){
  const d=state(),c=card(v,"Expense entry"),date=field(c,"Date",day,"date"),
    title=field(c,"Description"),amount=field(c,"Amount ₹","","text"),
    category=select(c,"Category",EXPENSE_CATEGORIES,"Food");
  button(actions(c),"Add expense",()=>{
    const name=title.value.trim();if(!name||name.length>180)throw Error("Enter a valid expense description");
    return change(d=>d.expenses.push({id:id(),date:date.value,title:name,amountCents:centsFromInput(amount.value),category:category.value}));
  });
  const browse=card(v,"Monthly spending"),pick=field(browse,"Month",month,"month");
  pick.addEventListener("change",()=>{month=pick.value;render()});
  const items=d.expenses.filter(x=>x.date.startsWith(month)).sort((a,b)=>b.date.localeCompare(a.date));
  node(browse,"div",rupees(items.reduce((s,x)=>s+x.amountCents,0)),"money-total");
  for(const e of items){
    row(browse,e.title,e.date+" · "+e.category+" · "+rupees(e.amountCents),r=>button(r,"×",()=>confirmDelete("expense",d=>{d.expenses=d.expenses.filter(x=>x.id!==e.id)}),"btn small ghost"));
  }
}
function habits(v){
  const d=state(),c=card(v,"New habit"),title=field(c,"Habit"),goal=select(c,"Related goal",goalOptions(),"");
  button(actions(c),"Add habit",()=>{
    const t=title.value.trim();if(!t||t.length>120)throw Error("Enter a habit name");
    return change(d=>d.habits.push({id:id(),title:t,goalId:goal.value,archived:false}));
  });
  const log=card(v,"Date-wise check-ins"),date=field(log,"Date",day,"date");
  date.addEventListener("change",()=>{day=date.value;render()});
  for(const h of d.habits.filter(x=>!x.archived)){
    const checked=Boolean(d.habitLogs[day]?.[h.id]);
    row(log,h.title,checked?"Completed today":"Not checked",r=>{
      button(r,checked?"✓":"○",()=>change(x=>{x.habitLogs[day]??={};x.habitLogs[day][h.id]=!checked}),"btn small soft");
      button(r,"Archive",()=>change(x=>{x.habits.find(y=>y.id===h.id).archived=true}),"btn small ghost");
    });
  }
}
function goals(v){
  const d=state(),c=card(v,"Create goal"),title=field(c,"Goal"),why=field(c,"Why it matters (your own words)","","textarea"),due=field(c,"Target date","","date");
  button(actions(c),"Add goal",()=>{
    if(!title.value.trim()||title.value.length>160||why.value.length>500)throw Error("Enter valid goal and reason");
    return change(d=>d.goals.push({id:id(),title:title.value.trim(),why:why.value.trim(),due:due.value,status:"active"}));
  });
  for(const g of d.goals){
    const c=card(v,g.title);
    node(c,"p",g.why+(g.due?" · Due "+g.due:""),"muted");
    const ms=d.milestones.filter(m=>m.goalId===g.id);
    node(c,"div",ms.filter(m=>m.done).length+"/"+ms.length+" milestones complete","pill");
    for(const m of ms)row(c,m.title,m.done?"Done":"Pending",r=>button(r,m.done?"Reopen":"Done",()=>change(d=>{d.milestones.find(x=>x.id===m.id).done=!m.done}),"btn small soft"));
    const inp=field(c,"Add milestone");
    button(actions(c),"Save milestone",()=>{if(!inp.value.trim()||inp.value.length>160)throw Error("Enter milestone");return change(d=>d.milestones.push({id:id(),goalId:g.id,title:inp.value.trim(),done:false}))},"btn soft");
    button(actions(c),g.status==="active"?"Complete goal":"Reopen goal",()=>change(d=>{d.goals.find(x=>x.id===g.id).status=g.status==="active"?"completed":"active"}),"btn ghost");
  }
}
function journal(v){
  const d=state(),pick=card(v,"Daily reflection"),date=field(pick,"Date",day,"date");
  date.addEventListener("change",()=>{day=date.value;render()});
  const entry=d.journal[day]||{morning:false,evening:false,focus:"",wins:"",obstacles:""};
  const morning=card(v,"Morning · 60 seconds"),focus=field(morning,"Top focus",entry.focus,"textarea");
  button(actions(morning),"Save morning",()=>{if(!focus.value.trim()||focus.value.length>1000)throw Error("Write a short focus");return change(d=>{d.journal[day]={...(d.journal[day]||entry),focus:focus.value.trim(),morning:true}})});
  const evening=card(v,"Evening · 2 minutes"),wins=field(evening,"What went well?",entry.wins,"textarea"),
    blocks=field(evening,"What blocked progress?",entry.obstacles,"textarea");
  button(actions(evening),"Save evening",()=>{if(!wins.value.trim()&&!blocks.value.trim())throw Error("Enter a reflection");return change(d=>{d.journal[day]={...(d.journal[day]||entry),wins:wins.value.trim(),obstacles:blocks.value.trim(),evening:true}})});
}
function review(v){
  const d=state(),stats=weeklyStats(d,day);
  const c=card(v,"Week "+stats.start+" — "+stats.end),m=node(c,"div",undefined,"metrics");
  metric(m,"Morning + evening loops",stats.loops+"/7");metric(m,"Finished tasks",stats.finished);metric(m,"Habit check-ins",stats.habits);
  node(c,"p","Evidence: "+stats.evenings+" evening entries. "+(stats.canDiscussPatterns?"Enough to consider cautious manual review.":"Below 14 observations; no personal pattern claims."),"muted");
  const old=d.reviews.find(x=>x.week===stats.start);
  const form=card(v,"Self-authored weekly review"),wins=field(form,"Wins",old?.wins||"","textarea"),
    challenge=field(form,"Challenges",old?.challenge||"","textarea"),next=field(form,"One experiment next week",old?.next||"","textarea"),
    rating=select(form,"Was Companion helpful?",["1","2","3","4","5"],String(old?.helpfulness||3));
  button(actions(form),"Save review",()=>{if(!wins.value.trim()&&!challenge.value.trim()&&!next.value.trim())throw Error("Add a reflection");return change(d=>{
    const data={id:old?.id||id(),week:stats.start,wins:wins.value.trim(),challenge:challenge.value.trim(),next:next.value.trim(),helpfulness:Number(rating.value)};
    const i=d.reviews.findIndex(x=>x.week===stats.start);if(i<0)d.reviews.push(data);else d.reviews[i]=data;
  })});
}
function world(v){
  const d=state(),c=card(v,"Add explicitly confirmed fact"),category=select(c,"Category",WORLD_CATEGORIES,"preferences"),
    key=field(c,"Field"),value=field(c,"Your words","","textarea"),label=node(c,"label",undefined,"checkbox"),
    agree=node(label,"input");agree.type="checkbox";node(label,"span","I confirm this information is correct and may be stored.");
  button(actions(c),"Save confirmed detail",()=>{if(!agree.checked)throw Error("Explicit confirmation required");if(!key.value.trim()||!value.value.trim())throw Error("Enter field and value");
    return change(d=>d.world.push({id:id(),category:category.value,key:key.value.trim(),value:value.value.trim(),provenance:"confirmed"}));
  });
  const list=card(v,"My confirmed details");
  for(const f of d.world)row(list,f.key+" · "+f.category,f.value,r=>button(r,"Delete",()=>confirmDelete("confirmed detail",d=>{d.world=d.world.filter(x=>x.id!==f.id)}),"btn small ghost"));
}
function coaching(v){
  const c=card(v,"User-authored coaching plan"),kind=select(c,"Method",["woop","ifthen","tiny"],"ifthen"),
    situation=field(c,"Situation or obstacle"),action=field(c,"Small next action");
  button(actions(c),"Save plan",()=>{
    const a=situation.value.trim(),b=action.value.trim();
    if(!a||!b||a.length>300||b.length>300)throw Error("Enter a situation and a small action");
    const statement=kind.value==="tiny"?"After "+a+", I will "+b+" for 2 minutes.":"If "+a+", then I will "+b+".";
    return change(d=>d.coaching.push({id:id(),kind:kind.value,statement}));
  });
  const list=card(v,"My plans");
  for(const p of state().coaching)row(list,p.statement,p.kind,r=>button(r,"×",()=>confirmDelete("plan",d=>{d.coaching=d.coaching.filter(x=>x.id!==p.id)}),"btn small ghost"));
}
function nudges(v){
  const d=state(),c=card(v,"Nudge preferences"),label=node(c,"label",undefined,"checkbox"),enabled=node(label,"input");enabled.type="checkbox";enabled.checked=d.nudge.optIn;
  node(label,"span","I opt in to seeing reminder suggestions (no notifications are sent).");
  enabled.addEventListener("change",()=>run(()=>change(d=>{d.nudge.optIn=enabled.checked})));
  const settings=card(v,"Quiet hours"),from=field(settings,"Start",d.nudge.quietStart,"time"),to=field(settings,"End",d.nudge.quietEnd,"time");
  button(actions(settings),"Save hours",()=>change(d=>{d.nudge.quietStart=from.value;d.nudge.quietEnd=to.value}),"btn soft");
  const candidate=card(v,"New reminder candidate"),title=field(candidate,"Title"),due=field(candidate,"Due date",day,"date");
  button(actions(candidate),"Add candidate",()=>{if(!title.value.trim()||title.value.length>160)throw Error("Enter reminder title");return change(d=>{d.nudge.candidates.push({id:id(),title:title.value.trim(),dueDate:due.value})})});
  const list=card(v,"Eligible now (simulation only)");
  for(const r of d.nudge.candidates){
    const p=nudgeDecision(d.nudge,d.nudge.history,r,day,"12:00");
    row(list,r.title,p.reason,rn=>{
      if(p.eligible)button(rn,"Simulate",()=>change(d=>{d.nudge.history.push({id:r.id,day,action:"delivered"})}),"btn small soft");
      if(d.nudge.history.some(h=>h.id===r.id&&h.action==="delivered")){
        button(rn,"Ignored",()=>change(d=>{d.nudge.history.push({id:r.id,day,action:"ignored"})}),"btn small ghost");
      }
    });
  }
  node(v,"p","This module does not send scheduled reminders. Nudge policy is not a validated safety service.","notice");
}
function privacy(v){
  const c=card(v,"Private vault"),pass=field(c,"Password (12 or more characters)","","password");
  pass.autocomplete="off";
  if(!vaultReady){node(c,"p","Secure IndexedDB storage unavailable until run on HTTPS or localhost.","notice");}
  else if(mode==="demo"){
    node(c,"p","Demo entries are temporary. Creating a vault starts with empty records, not demo examples.","muted");
    button(actions(c),"Create vault",async()=>{if(!confirm("Start a separate empty V4 encrypted vault? Demo data will not be imported."))return;await vault.create(pass.value);mode="vault";pass.value="";render();message("Encrypted vault created")});
    button(actions(c),"Unlock vault",async()=>{await vault.unlock(pass.value);mode="vault";pass.value="";render();message("Vault unlocked")},"btn soft");
    const file=field(c,"Restore encrypted V4 backup into empty vault","","file");file.accept=".json";
    button(actions(c),"Restore to empty vault",async()=>{if(!file.files?.[0])throw Error("Select a backup");if(!confirm("Restore only if this V4 vault is empty?"))return;
      await vault.restore(file.files[0],pass.value);mode="vault";pass.value="";render();message("Backup recovered")}, "btn ghost");
  }else{
    button(actions(c),"Download encrypted backup",async()=>download("reborn-v4-encrypted-"+localDate()+".json",await vault.backup(),"application/json"));
    button(actions(c),"Lock vault",lock,"btn soft");
  }
  node(v,"p","No server sync, password recovery or AI API. Do not lose your vault password. CSV or copied text is not encrypted.","notice");
}
function showMore(){
  const box=$("more-content");box.replaceChildren();
  for(const r of routes)button(box,r,()=>{$("more-dialog").close();navigate(r)},"btn soft");
  box.showModal();
}
function download(name,text,type){
  const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),12000);
  message("Encrypted backup download requested. Verify browser Downloads.");
}
$("vault-shortcut").addEventListener("click",()=>navigate("Privacy"));

render();
(async()=>{
  try{await vault.init();vaultReady=true}
  catch(e){console.warn("Vault unavailable:",e.message);message("Vault unavailable in this browser. Use HTTPS or localhost.")}
  if(page==="Privacy")render();
})();
document.addEventListener("visibilitychange",()=>{
 if(document.hidden)backgroundAt=Date.now();
 else if(backgroundAt&&Date.now()-backgroundAt>120000&&mode==="vault")lock();
});
document.addEventListener("pagehide",()=>{if(mode==="vault"){vault.lock();mode="demo"}});
root.addEventListener("pointerdown",()=>activeAt=Date.now());
root.addEventListener("keydown",()=>activeAt=Date.now());
setInterval(()=>{if(mode==="vault"&&Date.now()-activeAt>600000)lock()},20000);
