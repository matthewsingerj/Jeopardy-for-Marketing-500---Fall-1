/* Shared Marketing Jeopardy engine. Expects window.JEOPARDY = { boardId, title, eyebrow, subtitle, data } before this script. */
(function(){

(function boot(){
  const cfg = window.JEOPARDY || {};
  document.title = cfg.title || document.title;
  const mount = document.createElement('div');
  mount.id = 'app';
  mount.innerHTML = "<header>\n<div class=\"eyebrow\" id=\"eyebrow\"></div>\n<h1 id=\"pageTitle\"></h1>\n<div class=\"subtitle\" id=\"pageSubtitle\"></div>\n</header>\n\n<div class=\"controls\">\n<div class=\"player-tag\">\n<span class=\"label\">Now Playing</span>\n<span class=\"player-tag-val\" id=\"currentPlayerLabel\">&mdash;</span>\n</div>\n<div class=\"scoreboard\" id=\"scoreboard\">\n<span class=\"label\">Score</span>\n<span class=\"value\" id=\"scoreValue\">$0</span>\n</div>\n<button class=\"btn btn-gold\" id=\"saveBtn\" disabled>Submit Score</button>\n<button class=\"btn btn-ghost\" id=\"retryBtn\">Retry</button>\n<button class=\"btn btn-ghost\" id=\"resetBtn\">New Player</button>\n</div>\n\n<div class=\"layout\">\n<div>\n<div class=\"submitted-banner\" id=\"submittedBanner\">&#10003; Score submitted &mdash; click \"New Player\" for the next student.</div>\n<div class=\"board\" id=\"board\"></div>\n</div>\n<aside class=\"leaderboard\">\n<h2>&#127942; Leaderboard</h2>\n<div class=\"lb-sub\" id=\"lbSub\">Top scores</div>\n<div class=\"lb-list\" id=\"lbList\"></div>\n</aside>\n</div>\n\n<footer>Enter your name and class to start, then click a dollar value to open each clue. Once you've answered all clues, hit Submit Score to post to the leaderboard. Use \"New Player\" to hand off to the next student.</footer>\n\n<div class=\"overlay open\" id=\"gateOverlay\">\n<div class=\"modal gate-modal\">\n<div class=\"tag\">Welcome</div>\n<h2>Enter Your Details to Play</h2>\n<p>Fill in your name and class to start the game.</p>\n<div class=\"gate-field\">\n<label for=\"playerName\">Your Name</label>\n<input id=\"playerName\" type=\"text\" maxlength=\"20\" placeholder=\"Enter your name\" autocomplete=\"off\">\n</div>\n<div class=\"gate-field\">\n<label for=\"playerClass\">Class</label>\n<select id=\"playerClass\">\n<option value=\"\" selected disabled>Select your class</option>\n<option value=\"MKT500 - Class A\">MKT500 - Class A</option>\n<option value=\"MKT500 - Class B\">MKT500 - Class B</option>\n</select>\n</div>\n<button class=\"btn btn-gold gate-start\" id=\"startBtn\" disabled>Start Game</button>\n<button class=\"btn btn-ghost gate-cancel\" id=\"gateCancelBtn\" style=\"display:none;\">Cancel &mdash; back to my game</button>\n</div>\n</div>\n\n<div class=\"overlay\" id=\"overlay\">\n<div class=\"modal\">\n<div class=\"tag\" id=\"modalCat\">Category</div>\n<div class=\"value-tag\" id=\"modalValue\">$100</div>\n<div class=\"question\" id=\"modalQuestion\">Question text</div>\n<div class=\"choices\" id=\"modalChoices\"></div>\n<div class=\"feedback\" id=\"modalFeedback\"></div>\n<button class=\"close-btn\" id=\"closeBtn\" disabled>Close</button>\n</div>\n</div>\n\n<div class=\"overlay\" id=\"finishOverlay\">\n<div class=\"modal\">\n<div class=\"tag\">Game Complete</div>\n<div class=\"finish-score\" id=\"finishScore\">$0</div>\n<div class=\"finish-sub\" id=\"finishSub\">Nice work! Submit your score to the leaderboard.</div>\n<div class=\"finish-actions\">\n<button class=\"btn btn-gold\" id=\"finishSaveBtn\">Submit to Leaderboard</button>\n<button class=\"btn btn-ghost\" id=\"finishCloseBtn\">Not now</button>\n</div>\n</div>\n</div>";
  document.body.prepend(mount);
  const eyebrow = document.getElementById('eyebrow');
  const pageTitle = document.getElementById('pageTitle');
  const pageSubtitle = document.getElementById('pageSubtitle');
  if(eyebrow) eyebrow.innerHTML = cfg.eyebrow || '';
  if(pageTitle) pageTitle.textContent = cfg.title || '';
  if(pageSubtitle) pageSubtitle.innerHTML = cfg.subtitle || '';
})();

const _SALT = "MKT500-Jeopardy-v1";
function _sha256b64url(str){
  function rotr(n,x){return (x>>>n)|(x<<(32-n));}
  function toWords(bytes){
    const w=[];
    for(let i=0;i<bytes.length;i+=4) w.push(((bytes[i]<<24)|(bytes[i+1]<<16)|(bytes[i+2]<<8)|bytes[i+3])>>>0);
    return w;
  }
  const enc=new TextEncoder().encode(str);
  const l=enc.length;
  const bitLen=l*8;
  const withOne=l+1;
  const padLen=((withOne%64<=56)?56:120)-(withOne%64);
  const total=withOne+padLen+8;
  const bytes=new Uint8Array(total);
  bytes.set(enc); bytes[l]=0x80;
  const dv=new DataView(bytes.buffer);
  // length as 64-bit big-endian (we only need low 32 for short strings)
  dv.setUint32(total-4, bitLen>>>0, false);
  const K=[
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  let H0=0x6a09e667,H1=0xbb67ae85,H2=0x3c6ef372,H3=0xa54ff53a,H4=0x510e527f,H5=0x9b05688c,H6=0x1f83d9ab,H7=0x5be0cd19;
  for(let i=0;i<bytes.length;i+=64){
    const w=new Array(64);
    for(let j=0;j<16;j++) w[j]=dv.getUint32(i+j*4,false);
    for(let j=16;j<64;j++){
      const s0=rotr(7,w[j-15])^rotr(18,w[j-15])^(w[j-15]>>>3);
      const s1=rotr(17,w[j-2])^rotr(19,w[j-2])^(w[j-2]>>>10);
      w[j]=(w[j-16]+s0+w[j-7]+s1)>>>0;
    }
    let a=H0,b=H1,c=H2,d=H3,e=H4,f=H5,g=H6,h=H7;
    for(let j=0;j<64;j++){
      const S1=rotr(6,e)^rotr(11,e)^rotr(25,e);
      const ch=(e&f)^((~e)&g);
      const t1=(h+S1+ch+K[j]+w[j])>>>0;
      const S0=rotr(2,a)^rotr(13,a)^rotr(22,a);
      const maj=(a&b)^(a&c)^(b&c);
      const t2=(S0+maj)>>>0;
      h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;
    }
    H0=(H0+a)>>>0;H1=(H1+b)>>>0;H2=(H2+c)>>>0;H3=(H3+d)>>>0;
    H4=(H4+e)>>>0;H5=(H5+f)>>>0;H6=(H6+g)>>>0;H7=(H7+h)>>>0;
  }
  const out=new Uint8Array(32);
  const o=new DataView(out.buffer);
  o.setUint32(0,H0);o.setUint32(4,H1);o.setUint32(8,H2);o.setUint32(12,H3);
  o.setUint32(16,H4);o.setUint32(20,H5);o.setUint32(24,H6);o.setUint32(28,H7);
  let s='';
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  for(let i=0;i<out.length;i+=3){
    const x=(out[i]<<16)|((out[i+1]||0)<<8)|(out[i+2]||0);
    s+=alphabet[(x>>18)&63]+alphabet[(x>>12)&63]+alphabet[(x>>6)&63]+alphabet[x&63];
  }
  return s.slice(0, Math.ceil(32*4/3)); // full base64url without pad trim later
}
function _tok(text){
  return _sha256b64url(_SALT + '\0' + text).slice(0, 22);
}
function _isCorrect(optionText, token){
  return _tok(optionText) === token;
}
function _correctIndex(q){
  for(let i=0;i<q.options.length;i++){
    if(_isCorrect(q.options[i], q.k)) return i;
  }
  return -1;
}

const cfg = window.JEOPARDY || {};
const DATA = cfg.data;
if(!DATA || !Array.isArray(DATA)){
  throw new Error('window.JEOPARDY.data is required');
}
const TOTAL_CLUES = DATA.reduce((n,c)=> n + c.questions.length, 0);
const FIREBASE_DB_URL = (cfg.firebaseUrl || 'https://mkt500-default-rtdb.firebaseio.com/');
const BOARD_ID = cfg.boardId || 'week1';
// ==========================================================

const useCloud = FIREBASE_DB_URL.trim().length > 0;
const CLOUD_BASE = FIREBASE_DB_URL.replace(/\/$/, '');
const CLOUD_PATH = CLOUD_BASE + '/leaderboards/' + BOARD_ID + '.json';

let score = 0;
const usedSet = new Set();
let currentKey = null;
let leaderboard = [];
let savedThisRound = false;
let currentName = '';
let currentClass = '';

/* ---------- Storage layer ----------
   When FIREBASE_DB_URL is set, the leaderboard is shared live across all devices
   via the Firebase Realtime Database REST API. When it's empty, scores are kept
   only in memory (this browser, this session) so you can still test locally. */
function dedupeBest(arr){
  const best = new Map();
  arr.forEach(e => {
    if(!e || typeof e.score !== 'number') return;
    const key = (e.name || '') + '||' + (e.class || '');
    const cur = best.get(key);
    if(!cur || e.score > cur.score) best.set(key, e);
  });
  const out = Array.from(best.values());
  out.sort((a,b)=> b.score - a.score);
  return out;
}
async function readLeaderboard(){
  if(!useCloud) return dedupeBest(leaderboard);
  try{
    const res = await fetch(CLOUD_PATH);
    if(!res.ok) return leaderboard;
    const data = await res.json();
    if(!data) return [];
    return dedupeBest(Object.values(data));
  }catch(e){
    return leaderboard;
  }
}
async function addScore(entry){
  if(!useCloud){ leaderboard.push(entry); return; }
  try{
    await fetch(CLOUD_PATH, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry)
    });
  }catch(e){}
}
async function loadLeaderboard(){
  leaderboard = await readLeaderboard();
  renderLeaderboard();
}
async function saveScore(){
  if(savedThisRound) return;
  const name = (currentName || 'Anonymous').slice(0,20);
  const klass = (currentClass || '').slice(0,20);
  await addScore({ name: name, class: klass, score: score, date: Date.now() });
  savedThisRound = true;
  await loadLeaderboard();
  rebuildGrid();
}

function renderLeaderboard(){
  const list = document.getElementById('lbList');
  const sub = document.getElementById('lbSub');
  list.innerHTML = '';
  if(!leaderboard.length){
    if(sub) sub.textContent = 'Top scores';
    list.innerHTML = '<div class="lb-empty">No scores yet.<br>Be the first to make the board!</div>';
    return;
  }
  if(sub){
    sub.textContent = leaderboard.length + (leaderboard.length === 1 ? ' player' : ' players');
  }
  leaderboard.forEach((e, i)=>{
    const row = document.createElement('div');
    const isMe = currentName && e.name === currentName && e.class === currentClass;
    row.className = 'lb-row' + (i === 0 ? ' top' : '') + (isMe ? ' me' : '');
    const scoreStr = (e.score < 0 ? '-$' + Math.abs(e.score) : '$' + e.score);
    row.innerHTML =
      '<span class="lb-rank">' + (i+1) + '</span>' +
      '<span class="lb-name"><span class="nm"></span><span class="cls"></span></span>' +
      '<span class="lb-score' + (e.score < 0 ? ' neg' : '') + '">' + scoreStr + '</span>';
    row.querySelector('.nm').textContent = e.name;
    const clsEl = row.querySelector('.cls');
    if(e.class){ clsEl.textContent = e.class; } else { clsEl.remove(); }
    list.appendChild(row);
  });
}

function updateScoreDisplay(){
  document.getElementById('scoreValue').textContent = (score < 0 ? '-$' + Math.abs(score) : '$' + score);
  document.getElementById('scoreboard').classList.toggle('negative', score < 0);
}

function updateSaveBtn(){
  const btn = document.getElementById('saveBtn');
  const retry = document.getElementById('retryBtn');
  if(savedThisRound){
    btn.disabled = true;
    btn.textContent = 'Submitted \u2713';
    btn.title = '';
    retry.disabled = true;
  } else {
    btn.textContent = 'Submit Score';
    const allAnswered = (usedSet.size === TOTAL_CLUES);
    btn.disabled = !allAnswered;
    btn.title = allAnswered ? '' : 'Answer all clues before submitting your score';
    retry.disabled = false;
  }
}

function rebuildGrid(){
  const board = document.getElementById('board');
  board.classList.toggle('locked', savedThisRound);
  board.style.gridTemplateRows = 'auto repeat(5, 1fr)';
  board.innerHTML = '';
  DATA.forEach((cat)=>{
    const header = document.createElement('div');
    header.className = 'cat-header';
    header.textContent = cat.category;
    board.appendChild(header);
  });
  for(let row=0; row<5; row++){
    DATA.forEach((cat, ci)=>{
      const q = cat.questions[row];
      const key = ci + '-' + row;
      const cell = document.createElement('div');
      cell.className = 'cell' + (usedSet.has(key) ? ' used' : '');
      cell.textContent = '$' + q.value;
      if(!usedSet.has(key) && !savedThisRound){
        cell.addEventListener('click', () => openModal(ci, row));
      }
      board.appendChild(cell);
    });
  }
  const banner = document.getElementById('submittedBanner');
  if(banner) banner.style.display = savedThisRound ? 'block' : 'none';
  updateScoreDisplay();
  updateSaveBtn();
}

function openModal(ci, qi){
  const cat = DATA[ci];
  const q = cat.questions[qi];
  currentKey = ci + '-' + qi;
  document.getElementById('modalCat').textContent = cat.category;
  document.getElementById('modalValue').textContent = '$' + q.value;
  document.getElementById('modalQuestion').textContent = q.q;
  document.getElementById('modalFeedback').textContent = '';
  document.getElementById('modalFeedback').className = 'feedback';
  document.getElementById('closeBtn').disabled = true;
  const choicesEl = document.getElementById('modalChoices');
  choicesEl.innerHTML = '';
  const letters = ['A','B','C','D'];
  q.options.forEach((opt, idx) => {
    const div = document.createElement('div');
    div.className = 'choice';
    div.innerHTML = '<span class="letter">' + letters[idx] + '</span>';
    div.appendChild(document.createTextNode(opt));
    div.addEventListener('click', () => selectAnswer(idx, q, div, choicesEl));
    choicesEl.appendChild(div);
  });
  document.getElementById('overlay').classList.add('open');
}

function selectAnswer(idx, q, el, container){
  Array.from(container.children).forEach(c => c.classList.add('locked'));
  const feedback = document.getElementById('modalFeedback');
  const right = _correctIndex(q);
  if(idx === right){
    el.classList.add('correct');
    score += q.value;
    feedback.textContent = 'Correct! +$' + q.value;
    feedback.className = 'feedback correct-text';
  } else {
    el.classList.add('wrong');
    if(right >= 0) Array.from(container.children)[right].classList.add('correct');
    score -= q.value;
    feedback.textContent = 'Not quite. -$' + q.value;
    feedback.className = 'feedback wrong-text';
  }
  usedSet.add(currentKey);
  document.getElementById('closeBtn').disabled = false;
}

function maybeShowFinish(){
  if(usedSet.size === TOTAL_CLUES && !savedThisRound){
    const fs = document.getElementById('finishScore');
    fs.textContent = (score < 0 ? '-$' + Math.abs(score) : '$' + score);
    fs.classList.toggle('neg', score < 0);
    document.getElementById('finishSub').textContent = 'Nice work! Submit your score to the leaderboard.';
    const saveBtn = document.getElementById('finishSaveBtn');
    saveBtn.textContent = 'Submit to Leaderboard';
    saveBtn.classList.remove('btn-ghost');
    saveBtn.classList.add('btn-gold');
    saveBtn.onclick = finishSaveHandler;
    document.getElementById('finishCloseBtn').textContent = 'Not now';
    document.getElementById('finishOverlay').classList.add('open');
  }
}

function updatePlayerLabel(){
  const el = document.getElementById('currentPlayerLabel');
  el.innerHTML = '';
  el.appendChild(document.createTextNode(currentName || '\u2014'));
  if(currentClass){
    const c = document.createElement('span');
    c.className = 'pt-class';
    c.textContent = '  \u00b7  ' + currentClass;
    el.appendChild(c);
  }
}
function validateGate(){
  const n = document.getElementById('playerName').value.trim();
  const c = document.getElementById('playerClass').value.trim();
  document.getElementById('startBtn').disabled = !(n && c);
}
function openGate(){
  document.getElementById('playerName').value = '';
  document.getElementById('playerClass').selectedIndex = 0;
  document.getElementById('startBtn').disabled = true;
  document.getElementById('gateCancelBtn').style.display = currentName ? 'block' : 'none';
  document.getElementById('gateOverlay').classList.add('open');
  document.getElementById('playerName').focus();
}
function startGame(){
  const n = document.getElementById('playerName').value.trim();
  const c = document.getElementById('playerClass').value.trim();
  if(!n || !c) return;
  currentName = n.slice(0,20);
  currentClass = c.slice(0,20);
  updatePlayerLabel();
  score = 0;
  usedSet.clear();
  savedThisRound = false;
  rebuildGrid();
  document.getElementById('gateOverlay').classList.remove('open');
}
function retryGame(){
  if(savedThisRound) return;
  if(!currentName){ openGate(); return; }
  score = 0;
  usedSet.clear();
  rebuildGrid();
}

document.getElementById('playerName').addEventListener('input', validateGate);
document.getElementById('playerClass').addEventListener('change', validateGate);
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('gateCancelBtn').addEventListener('click', () => {
  document.getElementById('gateOverlay').classList.remove('open');
});
document.getElementById('playerName').addEventListener('keydown', (e) => {
  if(e.key === 'Enter' && !document.getElementById('startBtn').disabled) startGame();
});
document.getElementById('closeBtn').addEventListener('click', () => {
  document.getElementById('overlay').classList.remove('open');
  rebuildGrid();
  maybeShowFinish();
});
document.getElementById('resetBtn').addEventListener('click', openGate);
document.getElementById('retryBtn').addEventListener('click', retryGame);
document.getElementById('saveBtn').addEventListener('click', saveScore);
function finishSaveHandler(){
  saveScore().then(() => {
    document.getElementById('finishSub').textContent = 'Score submitted to the leaderboard!';
    const b = document.getElementById('finishSaveBtn');
    b.textContent = 'New Player';
    b.classList.remove('btn-gold');
    b.classList.add('btn-ghost');
    b.onclick = () => {
      document.getElementById('finishOverlay').classList.remove('open');
      openGate();
    };
    document.getElementById('finishCloseBtn').textContent = 'Close';
  });
}
document.getElementById('finishCloseBtn').addEventListener('click', () => {
  document.getElementById('finishOverlay').classList.remove('open');
});

rebuildGrid();
loadLeaderboard();

if(useCloud){
  setInterval(loadLeaderboard, 15000);
}

})();
