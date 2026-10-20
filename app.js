(function(){
'use strict';
const $=id=>document.getElementById(id),key='drift-depot-public-v1';
const clone=x=>JSON.parse(JSON.stringify(x));
let config=clone(DriftEngine.DEFAULT),game,storage=true;
try{const stored=JSON.parse(localStorage.getItem(key)||'null');if(stored&&stored.state.version===1&&Array.isArray(stored.state.events)&&stored.config.version==='1.0'&&stored.config.orders.length===6){config=stored.config;game=DriftEngine.create(config,stored.state);}}catch(e){storage=false;}
if(!game)game=DriftEngine.create(config);
const escape=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function save(){try{localStorage.setItem(key,JSON.stringify({config,state:game.snapshot()}));}catch(e){storage=false;}}
function tell(message){$('status').textContent=message;}
function reset(c=config){config=clone(c);game=DriftEngine.create(config);save();render();tell('已重新开始。先交付第一份补给。');}
function act(t,v){const ok=game.act(t,v);if(ok){const messages={submit:'订单已交付，选择领取方式。',claim:'基础奖励已领取，可以继续完成下一单。',gather:'物资已入库，查看订单还缺什么。',upgrade:'工具升级成功，单次采集量增加。',repair:'灯塔亮起来了！还可以体验剩余订单。',adStart:'请在流程模拟选择一种广告结果。',advance:'模拟时间推进 60 秒。',duplicate:'重复奖励回调已忽略，贝币没有增加。'};tell(t==='adResult'?(v==='success'?'完整播放成功，基础奖励和额外奖励已一次性到账。':'未发放广告加成，基础奖励仍可领取。'):messages[t]||'操作完成。');save();render();}return ok;}
function render(){
const s=game.state,c=game.config,o=game.current(),n=s.upgraded?c.upgradeGather:c.gather,play=s.phase==='play';
$('wood').textContent='木 '+s.wood;$('fish').textContent='鱼 '+s.fish;$('coins').textContent='币 '+s.coins;
$('progress').textContent=Math.min(s.completed,c.minOrders)+'/'+c.minOrders;
$('goal-title').textContent=s.repaired?'灯塔已经亮起':'让灯塔亮起来';
$('goal-copy').textContent=s.repaired?'继续服务来往船只，完成本轮 6 个订单。':'完成 '+c.minOrders+' 单，并支付 '+c.lighthouseCost+' 贝币。';
$('scene-status').textContent=s.repaired?'晨光海湾重新迎来船只':'灯塔还在等待第一束光';
$('lamp').setAttribute('fill',s.repaired?'#ffe685':'#abc1b2');$('beam').setAttribute('opacity',s.repaired?'.6':'0');
$('order-name').textContent=o?o.name:'本轮补给已完成';$('order-reward').textContent=o?'+'+o.coins+' 贝币':'6 / 6';
$('order-desc').textContent=o?(s.completed===0?'木材已经备好，先试着完成第一单。':'订单 '+(s.completed+1)+' / 6 · 按需要收集物资'):'可以修复灯塔、查看事件，或重新体验其他方案。';
$('requirements').innerHTML=o?['wood','fish'].map(r=>'<span class="need '+(s[r]>=o[r]?'ready':'')+'">'+(r==='wood'?'木材':'鲜鱼')+' '+s[r]+' / '+o[r]+'</span>').join(''):'';
$('submit').disabled=!play||!o||s.wood<o.wood||s.fish<o.fish;
$('submit').textContent=o?'交付订单':'本轮结束';
for(const r of ['wood','fish']){const el=$('gather-'+r);el.disabled=!play||!o||s[r]>=c.storageCap;el.querySelector('small').textContent='每次 +'+n+' · '+c.gatherSeconds+' 秒';}
$('upgrade').textContent=s.upgraded?'工具已升级':(s.completed<2?'工具升级 · 2 单后解锁':'升级工具 · '+c.upgradeCost+' 币');
$('upgrade').disabled=!play||s.upgraded||s.completed<2||s.coins<c.upgradeCost;
$('repair').textContent=s.repaired?'灯塔已修复':'修复灯塔 · '+c.lighthouseCost+' 币';
$('repair').disabled=!play||s.repaired||s.completed<c.minOrders||s.coins<c.lighthouseCost;
$('variant').value=c.variant;$('variant').disabled=!play;$('reset').disabled=s.phase==='ad';
$('advance').disabled=!play;$('duplicate').disabled=!play||!s.lastTransaction;
for(const r of ['success','cancel','fail'])$('ad-'+r).disabled=s.phase!=='ad';
$('siminfo').textContent='模拟时间 '+s.time+' 秒 · 广告完成 '+s.adCount+'/'+c.adCap+' 次 · '+(storage?'本机存档开启':'本次打开有效，存储不可用');
$('modal').hidden=play;
if(s.phase==='settlement'){
const p=s.pending,extra=Math.floor(p.base*(c.adMultiplier-1));
let reason=s.completed<2?'先享受第一份奖励。':p.attempted?'视频未完成，可直接领取基础奖励。':s.adCount>=c.adCap?'本轮额外奖励次数已用完。':s.time-s.lastAd<c.adCooldown?'额外奖励冷却中，先继续补给。':'';
$('modal-content').innerHTML='<div class="icon">✦</div><h3 id="modal-title">补给已送达</h3><p>你帮助了一位远航的朋友。</p><div class="payout">'+p.base+' <small style="font-size:14px">贝币</small></div><button class="full" data-action="claim">普通领取 '+p.base+' 贝币</button>'+(game.allowedAd()?'<button class="outline full" data-action="adStart">观看视频 · 共领 '+(p.base+extra)+' 贝币</button><p style="font-size:11px;margin-top:12px">自愿观看，完整播放后额外获得 '+extra+' 贝币。</p>':'<p style="font-size:12px;margin-top:12px">'+reason+'</p>');
}else if(s.phase==='ad')$('modal-content').innerHTML='<h3 id="modal-title">奖励视频演示</h3><div class="adplace">▷<br>此处模拟广告播放<br><small>不会请求真实广告</small></div><p>请在流程模拟选择<br>播放完成、提前退出或加载失败。</p><button class="outline full" data-action="cancelAd">退出视频</button>';
$('cfg-gather').value=c.gather;$('cfg-cost').value=c.lighthouseCost;
$('config-notice').textContent='当前：基础 +'+c.gather+'，升级后 +'+c.upgradeGather+'；方案 '+c.variant+'。';
$('orders-table').innerHTML=c.orders.map(o=>'<tr><td>'+o.id+'</td><td>'+o.name+'</td><td>'+o.wood+'</td><td>'+o.fish+'</td><td>'+o.coins+'</td><td>'+Math.floor(o.coins*.5)+'</td><td>'+o.coins+'</td></tr>').join('');
const incomes=s.events.filter(e=>e.event==='order_settle').reduce((sum,e)=>sum+e.coins,0),bonuses=s.events.filter(e=>e.event==='rv_reward').reduce((sum,e)=>sum+e.bonus,0);
$('stats').innerHTML=[['已结算订单',s.paid.length,'共 6 单'],['累计收入',incomes,'不扣除建设消耗'],['广告额外收入',bonuses,'仅本轮模拟'],['灯塔修复',s.repaired?'完成':'未完成','目标 '+c.lighthouseCost+' 贝币']].map(x=>'<div class="stat"><small>'+x[0]+'</small><strong>'+x[1]+'</strong><small>'+x[2]+'</small></div>').join('');
$('event-log').innerHTML=s.events.slice().reverse().map(e=>{const{seq,event,sim_seconds,variant,...d}=e;return '<tr><td>'+seq+'</td><td>'+sim_seconds+'</td><td><code>'+event+'</code></td><td>'+escape(JSON.stringify(d))+'</td></tr>';}).join('');
}
function download(name,obj){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(t=>t.classList.toggle('active',t===b));document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!==b.dataset.tab);});
$('gather-wood').onclick=()=>act('gather','wood');$('gather-fish').onclick=()=>act('gather','fish');
for(const t of ['submit','upgrade','repair','advance','duplicate'])$(t).onclick=()=>act(t);
for(const r of ['success','cancel','fail'])$('ad-'+r).onclick=()=>act('adResult',r);
$('modal-content').onclick=e=>{const b=e.target.closest('[data-action]');if(b){if(b.dataset.action==='cancelAd')act('adResult','cancel');else act(b.dataset.action);}};
$('reset').onclick=()=>{if(confirm('清除本轮进度并重新开始？可先在数据页导出事件。'))reset();};
$('variant').onchange=()=>{const v=$('variant').value;if(confirm('切换奖励方案会清除当前进度，继续吗？'))reset({...config,variant:v,adMultiplier:v==='B'?2:1.5});else $('variant').value=config.variant;};
$('apply').onclick=()=>{const n=Number($('cfg-gather').value),cost=Number($('cfg-cost').value);if(!Number.isInteger(n)||n<1||n>4||!Number.isInteger(cost)||cost<80||cost>150||cost%5){$('config-notice').textContent='采集量请填 1–4 的整数；修复费用为 80–150 内的 5 的倍数。';return;}if(confirm('应用新数值并清除本轮进度？')){reset({...config,gather:n,upgradeGather:n+1,lighthouseCost:cost});$('config-notice').textContent='配置已应用。可返回交互原型验证新节奏。';}};
$('export-config').onclick=()=>download('漂流补给站_当前配置.json',config);
$('export-events').onclick=()=>download('漂流补给站_本轮模拟事件.json',{notice:'本地模拟，不是真实用户数据',config,events:game.state.events});
window.demo={get state(){return game.snapshot();},get config(){return clone(config);}};
save();render();
})();
