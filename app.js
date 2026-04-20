// Real available height → CSS custom property --vh (1% of visible height)
// visualViewport handles iOS Safari toolbar correctly
(function(){
  function setVH(){
    const h=window.visualViewport?window.visualViewport.height:window.innerHeight;
    document.documentElement.style.setProperty('--vh',(h*0.01)+'px');
    if(typeof moveImmunity==='function')moveImmunity();
  }
  if(window.visualViewport)window.visualViewport.addEventListener('resize',setVH);
  window.addEventListener('resize',setVH);
  setVH();
})();

const SUITS=[
  {sym:'♣',cls:'cb',code:'C',color:'#2e7d32'},
  {sym:'♦',cls:'cr',code:'D',color:'#e65c00'},
  {sym:'♥',cls:'cr',code:'H',color:'#c0392b'},
  {sym:'♠',cls:'cb',code:'S',color:'#1a1a1a'},
];
const RANKS=[{sym:'J',hp:20,atk:10},{sym:'Q',hp:30,atk:15},{sym:'K',hp:40,atk:20}];

const LANGS={
  fr:{hp:'PV',atk:'ATK',
    ranks:['Valet','Dame','Roi'],ranks_pl:['Valets','Dames','Rois'],
    powers:{'♣':'Trèfle · Immunité aux dégâts doublés','♦':'Carreau · Immunité à la pioche','♥':'Cœur · Immunité à la guérison','♠':'Pique · Immunité au bouclier'},
    rank_defeated:'⚔ Rang vaincu ! ⚔',next_rank:'Prochain rang',fight:'Au combat !',
    victory:'Victoire Totale !',all_defeated:'Tous les boss ont été vaincus !',restart:'Recommencer',
    fan:'Web app créée par un fan, sans lien avec',createdby:'Créée par',onbgg:'sur BGG'},
  en:{hp:'HP',atk:'ATK',
    ranks:['Jack','Queen','King'],ranks_pl:['Jacks','Queens','Kings'],
    powers:{'♣':'Clubs · Immunity to double damage','♦':'Diamonds · Immunity to drawing','♥':'Hearts · Immunity to healing','♠':'Spades · Immunity to shield'},
    rank_defeated:'⚔ Rank Defeated! ⚔',next_rank:'Next rank',fight:'Fight!',
    victory:'Total Victory!',all_defeated:'All bosses have been defeated!',restart:'Restart',
    fan:'Fan-made web app, not affiliated with',createdby:'Created by',onbgg:'on BGG'},
  it:{hp:'PV',atk:'ATK',
    ranks:['Fante','Regina','Re'],ranks_pl:['Fanti','Regine','Re'],
    powers:{'♣':'Fiori · Immunità ai danni doppi','♦':'Quadri · Immunità al pescaggio','♥':'Cuori · Immunità alla guarigione','♠':'Picche · Immunità allo scudo'},
    rank_defeated:'⚔ Grado sconfitto! ⚔',next_rank:'Prossimo grado',fight:'Al combattimento!',
    victory:'Vittoria Totale!',all_defeated:'Tutti i boss sono stati sconfitti!',restart:'Ricominciare',
    fan:'App fan, non affiliata a',createdby:'Creata da',onbgg:'su BGG'},
  de:{hp:'LP',atk:'ATK',
    ranks:['Bube','Dame','König'],ranks_pl:['Buben','Damen','Könige'],
    powers:{'♣':'Kreuz · Immunität gegen doppelten Schaden','♦':'Karo · Immunität gegen Ziehen','♥':'Herz · Immunität gegen Heilung','♠':'Pik · Immunität gegen Schild'},
    rank_defeated:'⚔ Rang besiegt! ⚔',next_rank:'Nächster Rang',fight:'Zum Kampf!',
    victory:'Totaler Sieg!',all_defeated:'Alle Bosse wurden besiegt!',restart:'Neustart',
    fan:'Fan-App, nicht verbunden mit',createdby:'Erstellt von',onbgg:'auf BGG'},
  jp:{hp:'HP',atk:'ATK',
    ranks:['ジャック','クイーン','キング'],ranks_pl:['ジャック','クイーン','キング'],
    powers:{'♣':'クラブ · 2倍ダメージ無効','♦':'ダイヤ · ドロー無効','♥':'ハート · 回復無効','♠':'スペード · シールド無効'},
    rank_defeated:'⚔ ランク撃破！ ⚔',next_rank:'次のランク',fight:'戦闘へ！',
    victory:'完全勝利！',all_defeated:'全ボスを倒した！',restart:'もう一度',
    fan:'非公式ファンアプリ・無関係：',createdby:'制作',onbgg:'BGG'},
  cn:{hp:'HP',atk:'攻击',
    ranks:['J','Q','K'],ranks_pl:['J','Q','K'],
    powers:{'♣':'梅花 · 免疫双倍伤害','♦':'方块 · 免疫抽牌','♥':'红心 · 免疫治疗','♠':'黑桃 · 免疫护盾'},
    rank_defeated:'⚔ 等级击败！ ⚔',next_rank:'下一等级',fight:'战斗！',
    victory:'完全胜利！',all_defeated:'所有Boss已被击败！',restart:'重新开始',
    fan:'粉丝制作，与以下无关：',createdby:'创建者',onbgg:'BGG'},
};

let currentLang='fr';
function t(key){return LANGS[currentLang][key];}
function rankName(idx){return t('ranks')[idx];}
function rankNamePl(idx){return t('ranks_pl')[idx];}

function setLang(code){
  currentLang=code;
  document.querySelectorAll('.lang-btn').forEach(b=>
    b.classList.toggle('active',b.dataset.lang===code));
  updateLangUI();
  renderImmunity();
  renderBossCard();
}

function updateLangUI(){
  const lh=document.getElementById('lbl-hp');if(lh)lh.textContent=t('hp');
  const la=document.getElementById('lbl-atk');if(la)la.textContent=t('atk');
  document.getElementById('ov-rank-title').textContent=t('rank_defeated');
  document.getElementById('ov-fight-btn').textContent=t('fight');
  document.getElementById('ov-win-title').textContent=t('victory');
  document.getElementById('ov-win-sub').textContent=t('all_defeated');
  document.getElementById('ov-restart-btn').textContent=t('restart');
  const lf=document.getElementById('lbl-fan');if(lf)lf.textContent=t('fan');
  const lc=document.getElementById('lbl-createdby');if(lc)lc.textContent=t('createdby');
  const lb=document.getElementById('lbl-onbgg');if(lb)lb.textContent=t('onbgg');
}

/* ── State ── */
let rankIdx=0,suitIdx=0,killedSuits=new Set(),hp=20,atk=10,dead=[],locked=false;
let holdTimer=null,holdInterval=null;

function startHold(fn,e){
  if(e&&e.type==='touchstart')e.preventDefault();
  stopHold();fn();
  holdTimer=setTimeout(()=>{holdInterval=setInterval(fn,80);},380);
}
function stopHold(){clearTimeout(holdTimer);clearInterval(holdInterval);}

function boss(){return RANKS[rankIdx];}
function suit(){return SUITS[suitIdx];}

function setSuit(i){
  if(killedSuits.has(i))return;
  suitIdx=i;
  renderBossCard();renderImmunity();renderSuitSelector();
}

/* ── Immunity ── */
// ♦=1 ♥=2 → HP panel ; ♣=0 ♠=3 → ATK panel
function moveImmunity(){
  try{
    const imm=document.getElementById('immunity');
    if(!imm)return;
    const portrait=window.innerWidth<=window.innerHeight;
    if(portrait){
      const footer=document.getElementById('boss-footer');
      if(footer&&imm.parentElement!==footer)footer.insertBefore(imm,footer.firstChild);
    }else{
      const targetId=(suitIdx===1||suitIdx===2)?'hp-panel':'atk-panel';
      const target=document.getElementById(targetId);
      if(target&&imm.parentElement!==target)target.appendChild(imm);
    }
  }catch(e){}
}

function renderImmunity(){
  const s=suit();
  const sym=document.getElementById('imm-sym');
  sym.textContent=s.sym;sym.className='imm-sym '+s.cls;
  document.getElementById('imm-text').textContent=t('powers')[s.sym]||'';
  moveImmunity();
}

/* ── Boss card (beige card + overflowing image + label on top) ── */
function renderBossCard(){
  const b=boss(),s=suit(),bname=rankName(rankIdx);
  const wrap=document.getElementById('card-wrap');
  wrap.innerHTML='';

  // z-index 1 — beige card background
  const card=document.createElement('div');
  card.id='boss-card';
  wrap.appendChild(card);

  // z-index 2 — character image, overflows card at bottom-right
  const img=document.createElement('img');
  img.className='b-img';
  img.alt=`${bname} ${s.sym}`;
  img.onerror=function(){
    this.remove();
    const fb=document.createElement('div');
    fb.className='b-fallback';
    fb.innerHTML=`<span class="b-rank ${s.cls}" style="font-size:22px">${b.sym}</span>`+
      `<span class="b-suit ${s.cls}" style="font-size:26px">${s.sym}</span>`+
      `<span class="b-name">${bname}</span>`;
    card.appendChild(fb);
  };
  img.src=`images/${b.sym}${s.code}.png`;
  wrap.appendChild(img);

  // z-index 3 — rank+suit label, always visible above the image
  const lbl=document.createElement('div');
  lbl.className='b-label-top';
  lbl.innerHTML=`<span class="b-rank ${s.cls}">${b.sym}</span>`+
    `<span class="b-suit ${s.cls}">${s.sym}</span>`;
  wrap.appendChild(lbl);
}

/* ── Suit selector ── */
function renderSuitSelector(){
  const sel=document.getElementById('suit-selector');
  sel.innerHTML='';
  SUITS.forEach((s,i)=>{
    const btn=document.createElement('button');
    const killed=killedSuits.has(i),active=i===suitIdx;
    btn.className='suit-btn'+(active?' active':'')+(killed?' killed':'');
    btn.disabled=killed;
    btn.innerHTML=`<span class="${s.cls}">${s.sym}</span>`;
    if(!killed)btn.onclick=()=>setSuit(i);
    sel.appendChild(btn);
  });
}

/* ── Numbers ── */
function updateNums(){
  document.getElementById('hp-val').textContent=hp;
  document.getElementById('atk-val').textContent=atk;
}

function changeHP(d){
  if(locked)return;
  hp=Math.max(0,hp+d);updateNums();
  if(hp===0){locked=true;setTimeout(handleDeath,260);}
}
function changeATK(d){atk=Math.max(0,atk+d);updateNums();}

function killBoss(){
  if(locked)return;
  locked=true;hp=0;updateNums();
  setTimeout(handleDeath,260);
}

/* ── Death & progression ── */
function handleDeath(){
  dead.push({rank:boss().sym,suit:suit()});
  killedSuits.add(suitIdx);
  if(killedSuits.size<4){
    for(let i=0;i<4;i++){if(!killedSuits.has(i)){suitIdx=i;break;}}
    hp=boss().hp;atk=boss().atk;locked=false;
    renderBossCard();renderImmunity();renderSuitSelector();updateNums();
  } else {
    rankIdx++;killedSuits=new Set();suitIdx=0;
    if(rankIdx>=RANKS.length){
      document.getElementById('ov-win').classList.add('show');return;
    }
    const next=RANKS[rankIdx];
    document.getElementById('ov-sub').textContent=
      `${t('next_rank')} : ${rankNamePl(rankIdx)}  (${t('hp')} ${next.hp} · ${t('atk')} ${next.atk})`;
    document.getElementById('ov-next').classList.add('show');
  }
}

function advanceBoss(){
  hp=boss().hp;atk=boss().atk;locked=false;
  document.getElementById('ov-next').classList.remove('show');
  renderBossCard();renderImmunity();renderSuitSelector();updateNums();
}

function resetGame(){
  rankIdx=0;suitIdx=0;killedSuits=new Set();dead=[];locked=false;
  hp=RANKS[0].hp;atk=RANKS[0].atk;
  document.getElementById('ov-win').classList.remove('show');
  renderBossCard();renderImmunity();renderSuitSelector();updateNums();
}

/* ── Boot ── */
(function(){
  if(typeof FontFace==='undefined'){init();return;}
  const ff=new FontFace('VikingRunes','url(fonts/viking_middle_runes.ttf)');
  ff.load().then(f=>{document.fonts.add(f);}).catch(()=>{}).finally(()=>{init();});
})();

function init(){
  updateLangUI();
  renderBossCard();renderImmunity();renderSuitSelector();updateNums();
}
