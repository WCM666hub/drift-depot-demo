const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('./engine.js');
const passed=[];
function test(n,f){f();passed.push(n);}
function deliver(g){const o=g.current();for(const r of ['wood','fish'])while(g.state[r]<o[r])assert(g.act('gather',r));assert(g.act('submit'));}
function normal(g){deliver(g);assert(g.act('claim'));}
test('免费路径第3单后修复，剩余15币，105模拟秒',()=>{const g=E.create();normal(g);normal(g);normal(g);assert.equal(g.state.coins,115);assert.equal(g.state.time,105);assert(g.act('repair'));assert.equal(g.state.coins,15);});
test('先升级路径第4单修复，剩余30币，125模拟秒',()=>{const g=E.create();normal(g);normal(g);assert(g.act('upgrade'));normal(g);assert.equal(g.state.coins,85);assert.equal(g.act('repair'),false);normal(g);assert.equal(g.state.time,125);assert(g.act('repair'));assert.equal(g.state.coins,30);});
test('不足资源提交不扣款，不跳订单',()=>{const g=E.create();normal(g);const before=g.snapshot();assert.equal(g.act('submit'),false);assert.deepEqual(g.snapshot(),before);});
test('首单无视频，A方案第2单额外17币',()=>{const g=E.create();deliver(g);assert.equal(g.act('adStart'),false);g.act('claim');deliver(g);assert(g.act('adStart'));assert(g.act('adResult','success'));assert.equal(g.state.coins,72);assert.equal(g.state.adCount,1);});
test('视频失败或退出仍可基础领取，且无法在本单重试',()=>{for(const result of ['cancel','fail']){const g=E.create();normal(g);deliver(g);g.act('adStart');g.act('adResult',result);assert.equal(g.act('adStart'),false);assert(g.act('claim'));assert.equal(g.state.coins,55);assert.equal(g.state.adCount,0);}});
test('重复完成回调和重复普通领取均不增加余额',()=>{const g=E.create();normal(g);deliver(g);g.act('adStart');g.act('adResult','success');const coins=g.state.coins;assert.equal(g.act('adResult','success'),false);assert.equal(g.act('claim'),false);assert.equal(g.state.coins,coins);});
test('冷却边界与3次上限',()=>{const g=E.create();normal(g);let rewards=0;for(let i=1;i<6;i++){deliver(g);if(g.state.adCount<3){if(!g.allowedAd())g.act('advance');assert(g.act('adStart'));g.act('adResult','success');rewards++;}else{assert.equal(g.allowedAd(),false);g.act('claim');}}assert.equal(rewards,3);const h=E.create();normal(h);deliver(h);h.act('adStart');h.act('adResult','success');deliver(h);const saved=h.snapshot();for(const [elapsed,allowed] of [[59,false],[60,true]]){const checkpoint=JSON.parse(JSON.stringify(saved));checkpoint.time=checkpoint.lastAd+elapsed;assert.equal(E.create(E.DEFAULT,checkpoint).allowedAd(),allowed);}});
test('资源上限20，满仓点击不推进时间',()=>{const g=E.create();for(let i=0;i<20;i++)g.act('gather','wood');assert.equal(g.state.wood,20);const t=g.state.time;assert.equal(g.act('gather','wood'),false);assert.equal(g.state.time,t);});
test('广告中刷新恢复普通领取，不凭刷新发放加成',()=>{let g=E.create();normal(g);deliver(g);g.act('adStart');g=E.create(E.DEFAULT,g.snapshot());assert.equal(g.state.phase,'settlement');assert.equal(g.allowedAd(),false);assert(g.act('claim'));assert.equal(g.state.coins,55);});
test('六单免费结算总收入295，结束后不再采集或交付',()=>{const g=E.create();for(let i=0;i<6;i++)normal(g);assert.equal(g.state.coins,295);assert.equal(g.act('gather','fish'),false);assert.equal(g.act('submit'),false);});
const paths=[];
for(const variant of ['A','B']){const g=E.create({...E.DEFAULT,variant,adMultiplier:variant==='A'?1.5:2});normal(g);for(let i=0;i<2;i++){deliver(g);assert(g.act('adStart'));g.act('adResult','success');}paths.push({variant,coins:g.state.coins,time:g.state.time,adCount:g.state.adCount});}
console.log(JSON.stringify({tests:passed.length,passed,paths},null,2));
