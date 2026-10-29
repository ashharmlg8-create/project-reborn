import {blankData,validateData,DB_NAME} from "./core.mjs";
const enc=new TextEncoder(),dec=new TextDecoder();
const ITERATIONS=310000;
function b64(a){let s="";for(let i=0;i<a.length;i+=4096)s+=String.fromCharCode(...a.slice(i,i+4096));return btoa(s)}
function bytes(s){return Uint8Array.from(atob(s),x=>x.charCodeAt(0))}
function txGet(db){return new Promise((resolve,reject)=>{const tx=db.transaction("vault","readonly"),r=tx.objectStore("vault").get("primary");r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)})}
function compareSwap(db,oldRevision,value){return new Promise((resolve,reject)=>{
 const tx=db.transaction("vault","readwrite"),store=tx.objectStore("vault");let conflict=false;
 const req=store.get("primary");
 req.onsuccess=()=>{
  if((req.result?.revision??-1)!==oldRevision){conflict=true;tx.abort();return}
  store.put(value,"primary");
 };
 req.onerror=()=>tx.abort();
 tx.oncomplete=resolve;
 tx.onabort=()=>reject(conflict?Error("Vault modified in another tab. Lock and unlock before retrying."):tx.error||Error("Vault write aborted"));
})}
async function derive(password,salt){
 const base=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveKey"]);
 return crypto.subtle.deriveKey({name:"PBKDF2",hash:"SHA-256",iterations:ITERATIONS,salt},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}
async function encrypt(data,key,salt,revision){
 const nonce=crypto.getRandomValues(new Uint8Array(12)),plaintext=enc.encode(JSON.stringify(validateData(data)));
 const ciphertext=await crypto.subtle.encrypt({name:"AES-GCM",iv:nonce,additionalData:enc.encode("reborn-v4:"+revision)},key,plaintext);
 return{format:"reborn-v4-encrypted-alpha",revision,salt:b64(salt),nonce:b64(nonce),ciphertext:b64(new Uint8Array(ciphertext)),kdf:"PBKDF2-SHA256",iterations:ITERATIONS};
}
async function decrypt(record,password){
 if(record?.format!=="reborn-v4-encrypted-alpha"||!Number.isSafeInteger(record.revision)||record.revision<0||
    record.kdf!=="PBKDF2-SHA256"||record.iterations!==ITERATIONS)throw Error("Unsupported or damaged encrypted record");
 const salt=bytes(record.salt),nonce=bytes(record.nonce),ciphertext=bytes(record.ciphertext);
 if(salt.length!==16||nonce.length!==12||ciphertext.length<16||ciphertext.length>4_000_000)throw Error("Invalid encrypted record");
 const key=await derive(password,salt);
 let plain;
 try{plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:nonce,additionalData:enc.encode("reborn-v4:"+record.revision)},key,ciphertext)}
 catch{throw Error("Incorrect password or damaged encrypted record")}
 const data=validateData(JSON.parse(dec.decode(plain)));
 return{data,key,salt};
}
export class Vault{
 constructor(){this.db=null;this.data=null;this.key=null;this.salt=null;this.revision=-1}
 get unlocked(){return Boolean(this.data)}
 async init(){
  if(typeof isSecureContext==="undefined"||!isSecureContext||!crypto?.subtle||!globalThis.indexedDB)throw Error("Encrypted storage requires HTTPS/localhost and IndexedDB");
  this.db=await new Promise((resolve,reject)=>{
   const q=indexedDB.open(DB_NAME,1);
   q.onupgradeneeded=()=>q.result.createObjectStore("vault");
   q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);
  });
  return Boolean(await txGet(this.db));
 }
 async exists(){return Boolean(await txGet(this.db))}
 async create(password){
  if(typeof password!=="string"||password.length<12)throw Error("Use at least 12 password characters");
  const salt=crypto.getRandomValues(new Uint8Array(16)),key=await derive(password,salt),data=blankData();
  await compareSwap(this.db,-1,await encrypt(data,key,salt,0));
  this.data=data;this.key=key;this.salt=salt;this.revision=0;
 }
 async unlock(password){
  const record=await txGet(this.db);if(!record)throw Error("No saved vault found");
  const result=await decrypt(record,password);
  this.data=result.data;this.key=result.key;this.salt=result.salt;this.revision=record.revision;
 }
 async save(next){
  if(!this.unlocked)throw Error("Vault locked");
  const packed=await encrypt(next,this.key,this.salt,this.revision+1);
  await compareSwap(this.db,this.revision,packed);
  this.data=next;this.revision+=1;
 }
 async backup(){
  if(!this.unlocked)throw Error("Unlock first");
  const record=await txGet(this.db);
  if(record?.revision!==this.revision)throw Error("Vault changed in another tab");
  return JSON.stringify(record,null,2);
 }
 async restore(file,password){
  if(await this.exists())throw Error("Restore requires a new empty V4 vault. Existing data was not overwritten.");
  if(!file||file.size>5_000_000)throw Error("Invalid backup file");
  const record=JSON.parse(await file.text()),result=await decrypt(record,password);
  await compareSwap(this.db,-1,record);
  this.data=result.data;this.key=result.key;this.salt=result.salt;this.revision=record.revision;
 }
 lock(){this.data=null;this.key=null;this.salt=null;this.revision=-1}
}
