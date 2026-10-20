(function(root){
'use strict';
const DEFAULT={version:'1.0',variant:'A',gather:2,gatherSeconds:15,storageCap:20,upgradeCost:30,upgradeGather:3,lighthouseCost:100,minOrders:3,adMultiplier:1.5,adSeconds:30,adCooldown:60,adCap:3,orders:[
{id:'O01',name:'第一份补给',wood:2,fish:0,coins:20},
{id:'O02',name:'渔夫的午餐',wood:2,fish:2,coins:35},
{id:'O03',name:'灯塔物资',wood:4,fish:3,coins:60},
{id:'O04',name:'远航准备',wood:3,fish:3,coins:45},
{id:'O05',name:'邻岛来信',wood:4,fish:4,coins:60},
{id:'O06',name:'最后一班船',wood:5,fish:5,coins:75}]};
const copy=x=>JSON.parse(JSON.stringify(x));
function create(config=DEFAULT,saved=null){
const c=copy(config);
const s=saved?copy(saved):{version:1,time:0,wood:2,fish:0,coins:0,completed:0,upgraded:false,repaired:false,phase:'play',pending:null,adCount:0,lastAd:-99999,events:[],paid:[],lastTransaction:null};
function log(event,details={}){s.events.push({seq:s.events.length+1,event,sim_seconds:s.time,variant:c.variant,...details});}
function current(){return c.orders[s.completed]||null;}
function allowedAd(){return !!(s.phase==='settlement'&&s.pending&&!s.pending.attempted&&s.completed>=2&&s.adCount<c.adCap&&s.time-s.lastAd>=c.adCooldown);}
function claim(bonus=0){
const p=s.pending;if(!p||s.paid.includes(p.id))return false;
s.coins+=p.base+bonus;s.paid.push(p.id);s.lastTransaction=p.id;
log('order_settle',{order_id:p.id,base:p.base,bonus,coins:p.base+bonus});
s.pending=null;s.phase='play';return true;
}
function act(type,payload){
let ok=false;const o=current();
if(type==='gather'&&s.phase==='play'&&o&&['wood','fish'].includes(payload)&&s[payload]<c.storageCap){const n=Math.min(s.upgraded?c.upgradeGather:c.gather,c.storageCap-s[payload]);s[payload]+=n;s.time+=c.gatherSeconds;log('resource_gather',{resource:payload,amount:n});ok=true;}
if(type==='submit'&&s.phase==='play'&&o&&s.wood>=o.wood&&s.fish>=o.fish){s.wood-=o.wood;s.fish-=o.fish;s.completed++;s.time+=5;s.pending={id:o.id,base:o.coins,attempted:false};s.phase='settlement';log('order_complete',{order_id:o.id});if(allowedAd())log('rv_offer',{order_id:o.id,multiplier:c.adMultiplier});ok=true;}
if(type==='claim'&&s.phase==='settlement'){ok=claim();}
if(type==='adStart'&&allowedAd()){s.pending.attempted=true;s.phase='ad';log('rv_start',{order_id:s.pending.id});ok=true;}
if(type==='adResult'&&s.phase==='ad'&&['success','cancel','fail'].includes(payload)){
const id=s.pending.id;log('rv_'+payload,{order_id:id});
if(payload==='success'){s.time+=c.adSeconds;s.lastAd=s.time;s.adCount++;const bonus=Math.floor(s.pending.base*(c.adMultiplier-1));log('rv_reward',{order_id:id,bonus});ok=claim(bonus);}
else{s.phase='settlement';ok=true;}
}
if(type==='upgrade'&&s.phase==='play'&&!s.upgraded&&s.completed>=2&&s.coins>=c.upgradeCost){s.coins-=c.upgradeCost;s.upgraded=true;log('upgrade_buy',{cost:c.upgradeCost});ok=true;}
if(type==='repair'&&s.phase==='play'&&!s.repaired&&s.completed>=c.minOrders&&s.coins>=c.lighthouseCost){s.coins-=c.lighthouseCost;s.repaired=true;log('lighthouse_repair',{cost:c.lighthouseCost});ok=true;}
if(type==='advance'&&s.phase!=='ad'){s.time+=60;log('demo_time_advance',{seconds:60});ok=true;}
if(type==='duplicate'){log('duplicate_callback_ignored',{order_id:s.lastTransaction});ok=true;}
return ok;
}
if(!saved)log('session_start');
if(saved&&s.phase==='ad'){s.phase='settlement';log('rv_interrupted',{order_id:s.pending.id});}
return {config:c,state:s,current,allowedAd,act,snapshot:()=>copy(s)};
}
const api={DEFAULT,create};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.DriftEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
