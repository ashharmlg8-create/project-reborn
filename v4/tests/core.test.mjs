import test from "node:test";
import assert from "node:assert/strict";
import {blankData,validDate,shiftDate,weekStart,centsFromInput,dailyPlan,weeklyStats,nudgeDecision,routeFallback,validateData} from "../src/core.mjs";
test("leap dates",()=>{assert.equal(validDate("2024-02-29"),true);assert.equal(validDate("2025-02-29"),false)});
test("year rollover",()=>assert.equal(shiftDate("2026-12-31",1),"2027-01-01"));
test("weekly Monday",()=>assert.equal(weekStart("2026-10-29"),"2026-10-26"));
test("integer rupees to paise",()=>{assert.equal(centsFromInput("120.50"),12050);assert.throws(()=>centsFromInput("2.123"))});
test("70 percent free-time capacity",()=>assert.equal(dailyPlan(blankData(),"2026-10-29").capacity,378));
test("no overlap and cap",()=>{
 const d=blankData();
 d.events.push({id:"e",date:"2026-10-29",title:"Class",start:"10:00",end:"12:00"});
 d.tasks.push(...Array.from({length:12},(_,i)=>({id:String(i),title:"Task "+i,minutes:40,priority:"High",due:"",done:false,completedOn:"",goalId:""})));
 const p=dailyPlan(d,"2026-10-29");
 assert.ok(p.used<=p.capacity);
 for(const a of p.slots)for(const b of p.fixed)assert.ok(a.b<=b.a||a.a>=b.b);
 for(let i=0;i<p.slots.length;i++)for(let j=i+1;j<p.slots.length;j++)assert.ok(p.slots[i].b<=p.slots[j].a||p.slots[j].b<=p.slots[i].a);
});
test("evening sample gate",()=>assert.equal(weeklyStats(blankData(),"2026-10-29").canDiscussPatterns,false));
test("opt-in disabled by default",()=>assert.equal(nudgeDecision(blankData().nudge,[],{id:"x",dueDate:"2026-10-29"},"2026-10-29").reason,"opt_in_required"));
test("nudge cap and quiet hours",()=>{
 const d=blankData();d.nudge.optIn=true;
 const candidate={id:"c",dueDate:"2026-10-29"};
 assert.equal(nudgeDecision(d.nudge,[],candidate,"2026-10-29","23:00").reason,"quiet_hours");
 assert.equal(nudgeDecision(d.nudge,[{id:"a",day:"2026-10-29",action:"delivered"},{id:"b",day:"2026-10-29",action:"delivered"}],candidate,"2026-10-29").reason,"daily_cap");
});
test("private and safety suppression",()=>{
 const d=blankData();d.nudge.optIn=true;
 const x={id:"c",dueDate:"2026-10-29"};
 assert.equal(nudgeDecision(d.nudge,[],x,"2026-10-29","12:00",true).reason,"private_session");
 assert.equal(nudgeDecision(d.nudge,[],x,"2026-10-29","12:00",false,true).reason,"safety_pause");
});
test("no unconfirmed memory",()=>{
 const d=blankData();d.world.push({id:"w",category:"preferences",key:"tone",value:"calm",provenance:"proposed"});
 assert.throws(()=>validateData(d));
});
test("routing does not execute tools",()=>assert.equal(routeFallback("Spent ₹200 on lunch").toolExecuted,false));

test("budget input validates integer paise",()=>{
 const d=blankData();d.budgets["2026-10"]=99950;assert.equal(validateData(d),d);
 d.budgets["2026-13"]=100;assert.throws(()=>validateData(d));
});
test("negative monthly budget rejected",()=>{const d=blankData();d.budgets["2026-10"]=-1;assert.throws(()=>validateData(d))});
