"use strict";
const $=id=>document.getElementById(id);
const state={queue:[],index:0,revealed:false,turning:false,chosen:new Set(WORDS.filter(w=>w.suitable).map(w=>w.word))};
const els=Object.fromEntries(["startPanel","playingPanel","picturePanel","endPanel","actionBtn","picture","answer","progress","mode","letter","letterBox","chooseBox","wordChoices","wordSearch","count","sounds","startNotice","turnLayer","turnVideo"].map(k=>[k,$(k)]));
const letters=[...new Set(WORDS.map(w=>w.initial))].sort((a,b)=>a.localeCompare(b,"nl"));
letters.forEach(l=>{const option=document.createElement("option");option.value=l;option.textContent=l;els.letter.append(option)});
function show(el,visible){el.classList.toggle("hidden",!visible)}
function view(name){show(els.startPanel,name==="start");show(els.playingPanel,name==="play");show(els.picturePanel,name==="play");show(els.endPanel,name==="end");show(els.actionBtn,name==="play")}
function renderChoices(){els.wordChoices.replaceChildren();WORDS.filter(w=>w.word.includes(els.wordSearch.value.toLowerCase().trim())).forEach(w=>{const label=document.createElement("label");const c=document.createElement("input");c.type="checkbox";c.checked=state.chosen.has(w.word);c.onchange=()=>{if(c.checked)state.chosen.add(w.word);else state.chosen.delete(w.word)};label.append(c,document.createTextNode(" "+w.word));els.wordChoices.append(label)})}
function updateMode(){show(els.letterBox,els.mode.value==="letter");show(els.chooseBox,els.mode.value==="choose")}
els.mode.onchange=updateMode;els.wordSearch.oninput=renderChoices;$("allWords").onclick=()=>{WORDS.forEach(w=>state.chosen.add(w.word));renderChoices()};$("noWords").onclick=()=>{state.chosen.clear();renderChoices()};
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function sound(){if(!els.sounds.checked)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const c=new AC();[660,880,1100].forEach((hz,i)=>{let o=c.createOscillator(),g=c.createGain();o.type="sine";o.frequency.value=hz;g.gain.setValueAtTime(.0001,c.currentTime+i*.08);g.gain.exponentialRampToValueAtTime(.065,c.currentTime+i*.08+.02);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+i*.08+.23);o.connect(g);g.connect(c.destination);o.start(c.currentTime+i*.08);o.stop(c.currentTime+i*.08+.25)});setTimeout(()=>c.close(),900)}catch(e){}}
function prepare(){let pool=WORDS.filter(w=>els.mode.value==="letter"?w.initial===els.letter.value:els.mode.value==="choose"?state.chosen.has(w.word):w.suitable);if(!pool.length){els.startNotice.textContent="Kies minimaal één plaatje.";return}els.startNotice.textContent="";shuffle(pool);const n=els.count.value==="all"?pool.length:Number(els.count.value);state.queue=pool.slice(0,n);state.index=0;state.revealed=false;view("play");display()}

/* Eerst leegmaken en de volgende illustratie voorbereiden; nooit een oud plaatje op de nieuwe bladzijde. */
let imageRequest=0;
function concealPicture(){els.picturePanel.classList.add("content-concealed");els.picture.classList.remove("appear");els.answer.replaceChildren();els.answer.classList.remove("reveal")}
function loadPicture(word,token){
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>resolve({src:img.src,ok:true,token});
    img.onerror=()=>resolve({src:img.src,ok:false,token});
    img.src="./"+word.image;
  });
}
async function display(preloaded=null){
  const w=state.queue[state.index];
  if(!w){view("end");return}
  const token=++imageRequest;
  concealPicture();
  state.revealed=false;
  els.progress.textContent="Plaatje "+(state.index+1)+" van "+state.queue.length;
  els.actionBtn.textContent="Beginklank gezegd!";
  els.actionBtn.setAttribute("aria-label","Beginklank gezegd");
  els.actionBtn.disabled=true;
  const loaded=preloaded||await loadPicture(w,token);
  if(token!==imageRequest||state.turning)return;
  els.picture.alt=loaded.ok?"Plaatje om te benoemen":"Afbeelding niet beschikbaar: "+w.word;
  els.picture.src=loaded.src;
  show(els.picturePanel,true);
  els.picturePanel.classList.remove("content-concealed");
  void els.picture.offsetWidth;
  els.picture.classList.add("appear");
  els.actionBtn.disabled=false;
}
function sparkleInitial(first){
  const spots=[[-18,12,-9,-10],[104,7,13,-9],[0,50,-14,5],[105,68,15,12],[30,-18,-7,-12],[82,106,10,15],[55,12,4,-14],[15,95,-11,12],[93,39,15,-3],[38,85,-5,13]];
  spots.forEach(([x,y,dx,dy],i)=>{
    const s=document.createElement("span");
    s.className="letter-spark";
    s.style.setProperty("--spark-x",x+"%");
    s.style.setProperty("--spark-y",y+"%");
    s.style.setProperty("--spark-dx",dx+"px");
    s.style.setProperty("--spark-dy",dy+"px");
    s.style.setProperty("--spark-delay",(i*0.105)+"s");
    s.style.setProperty("--spark-color",i%3===0?"#ffffff":i%3===1?"#ffdf68":"#fff0ad");
    first.append(s);
  });
}
function reveal(){
  if(state.turning||state.revealed)return;
  const w=state.queue[state.index];
  state.revealed=true;
  els.answer.replaceChildren();
  const first=document.createElement("span");
  first.className="initial";
  first.append(document.createTextNode(w.initial));
  sparkleInitial(first);
  els.answer.append(first,document.createTextNode(w.word.slice(1)));
  els.answer.classList.remove("reveal");
  void els.answer.offsetWidth;
  els.answer.classList.add("reveal");
  els.actionBtn.textContent="Volgende plaatje ›";
  els.actionBtn.setAttribute("aria-label","Volgende plaatje");
  sound();
}
const BOOK_TURN_RATE=1.75;
function resetBookVideoSpeed(){
  const video=els.turnVideo;
  video.pause();
  video.defaultPlaybackRate=1;
  video.playbackRate=1;
}
window.addEventListener("pagehide",resetBookVideoSpeed);
async function turn(){
  if(state.turning)return;
  state.turning=true;
  els.actionBtn.disabled=true;
  ++imageRequest;
  const nextWord=state.queue[state.index+1];
  const preload=nextWord?loadPicture(nextWord,imageRequest):Promise.resolve(null);
  concealPicture(); // synchroon verbergen VOORDAT de omslagvideo begint
  els.turnLayer.classList.remove("hidden");
  const v=els.turnVideo;
  try{
    v.pause();
    v.defaultPlaybackRate=1;
    v.playbackRate=1;
    v.currentTime=0;
    v.playbackRate=BOOK_TURN_RATE;
    await Promise.race([
      new Promise(resolve=>{v.onended=resolve;const p=v.play();if(p&&typeof p.catch==="function")p.catch(resolve)}),
      new Promise(resolve=>setTimeout(resolve,4500))
    ]);
  }catch(e){}finally{
    resetBookVideoSpeed();
    v.onended=null;
    state.index++;
    const loaded=await preload;
    // De oude inhoud blijft verborgen tot het omslaan afgelopen is.
    els.turnLayer.classList.add("hidden");
    state.turning=false;
    if(state.index>=state.queue.length)view("end");
    else await display(loaded);
  }
}
els.actionBtn.onclick=()=>{if(state.turning)return;if(!state.revealed)reveal();else turn()};
$("backBtn").onclick=()=>{if(state.turning||state.index===0)return;state.index--;display()};
$("homeBtn").onclick=()=>{if(state.turning)return;++imageRequest;concealPicture();view("start")};
$("againBtn").onclick=()=>view("start");
$("startBtn").onclick=prepare;
document.addEventListener("keydown",e=>{if(e.target.matches("input,select,button"))return;if(e.key==="ArrowRight"||e.key===" "){e.preventDefault();if(!els.actionBtn.classList.contains("hidden"))els.actionBtn.click()}if(e.key==="ArrowLeft")$("backBtn").click()});
resetBookVideoSpeed();
renderChoices();updateMode();view("start");