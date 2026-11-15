import {games,worlds,palette,shapes,outlines,emptySkill,advance,question,recommendation} from "./engine.mjs";
const $=id=>document.getElementById(id);
const aliases=["Little Explorer","Otter","Starlight","Sunny","Pebble","Bubbles","Sprout","Comet","Rainbow","Pip"];
const numbers=["","one","two","three","four","five","six","seven","eight","nine","ten"];
const key="wonderworlds.local.v1";
const profile=alias=>({alias,world:"ocean",metrics:{},badges:[]});
const defaults=()=>({index:0,voice:false,profiles:[profile(aliases[0])]});
function read() {
  try {
    const s=JSON.parse(localStorage.getItem(key));
    if (s?.profiles?.length>0 && Number.isInteger(s.index) && s.profiles[s.index] && s.profiles.every(
      p=>aliases.includes(p.alias) && Object.hasOwn(worlds,p.world) && p.metrics && Array.isArray(p.badges))) return s;
  } catch {}
  return defaults();
}
let state=read(),open=false,game=null,round=0,current,missed=0,solved=false,tapped=new Set(),audio,soundToken=0;
const who=()=>state.profiles[state.index];
const world=()=>worlds[who().world];
function save() {
  try {localStorage.setItem(key,JSON.stringify(state)); return true;}
  catch {return false;}
}
function element(tag,label,cls) {
  const e=document.createElement(tag);
  if (label!==undefined) e.textContent=label;
  if (cls) e.className=cls;
  return e;
}
function button(label,fn,cls) {
  const b=element("button",label,cls);
  b.type="button";b.onclick=fn;
  return b;
}
function stopSound() {
  soundToken++;
  audio?.pause();
}
async function speak(...names) {
  if (!state.voice) return;
  stopSound();
  const token=soundToken;
  for (const name of names) {
    if (token!==soundToken) break;
    const next=new Audio("audio/"+name+".m4a");
    audio=next;
    try {
      await next.play();
      await new Promise(resolve=>{
        next.addEventListener("ended",resolve,{once:true});
        next.addEventListener("pause",resolve,{once:true});
        next.addEventListener("error",resolve,{once:true});
      });
    } catch {break;}
  }
}
function soundUI() {
  $("sound").textContent=state.voice?"🔊 Sound on":"🔇 Sound off";
  $("sound").setAttribute("aria-pressed",String(state.voice));
  $("voice").checked=state.voice;
}
function view(id) {
  for (const name of ["world-map","play","parents"]) $(name).hidden=name!==id;
  window.scrollTo(0,0);
}
function map() {
  stopSound();
  game=null;
  open=false;
  view("world-map");
  const p=who(),w=world(),suggested=recommendation(p.metrics);
  $("hero").dataset.world=p.world;
  $("welcome").textContent=w.name.toUpperCase()+" WORLD";
  $("guide").textContent=w.guide+" is ready to play.";
  $("mascot").textContent=w.emoji;
  document.querySelectorAll(".float").forEach((s,i)=>s.textContent=[...w.pattern,"✦"][i]);
  $("recommended").textContent="Play "+suggested.name;
  $("recommended").onclick=()=>start(suggested);
  $("badges").textContent=p.badges.length+" of 5 badges";
  $("game-map").replaceChildren(...games.map(g=>{
    const b=button(undefined,()=>start(g));
    const icon=element("span",g.icon,"icon");icon.setAttribute("aria-hidden","true");
    b.append(icon,element("strong",g.name),element("small",g.skill+(p.badges.includes(g.id)?" · Badge earned":"")));
    return b;
  }));
}
function readPrompt() {
  if (!game || solved) return;
  speak(game.id,...(game.id==="number"?[current.answer]:[]));
}
function start(g) {
  game=g;
  round=0;
  view("play");
  displayRound();
}
function colorTile(color) {
  const tile=element("span",undefined,"swatch");
  tile.dataset.color=color;
  return tile;
}
function renderActivity() {
  const target=$("activity");
  target.replaceChildren();
  if (game.id==="count") {
    const w=world();
    for (let i=0;i<current.answer;i++) {
      const b=button(w.item,()=>{
        if (tapped.has(i) || solved) return;
        tapped.add(i);
        b.classList.add("counted");
        b.setAttribute("aria-pressed","true");
        $("feedback").textContent="Counted "+tapped.size+" so far.";
        speak(tapped.size);
      },"count-item");
      b.setAttribute("aria-label","Count item "+(i+1));
      b.setAttribute("aria-pressed","false");
      target.append(b);
    }
  } else if (game.id==="number") {
    target.append(element("span",numbers[current.answer],"number-word"));
  } else if (game.id==="color") {
    const sample=colorTile(current.answer);
    sample.setAttribute("role","img");
    sample.setAttribute("aria-label","Target color: "+current.answer);
    target.append(sample);
  } else if (game.id==="shape") {
    const sample=element("span",outlines[current.answer],"sample-shape");
    sample.setAttribute("role","img");
    sample.setAttribute("aria-label","Target shape: "+current.answer);
    target.append(sample);
  } else {
    target.replaceChildren(...[...current.sequence,"?"].map(mark=>element("span",mark,"pattern-item")));
  }
}
function displayRound() {
  stopSound();
  round++;
  const p=who(),metric=p.metrics[game.id]||emptySkill();
  const previous=current?.kind===game.id?current.answer:undefined;
  current=question(game.id,metric.level,world(),Math.random,previous);
  missed=0;
  solved=false;
  tapped=new Set();
  $("game-title").textContent=game.name;
  $("level-label").textContent=world().name.toUpperCase()+" · "+["STARTER","EXPLORER","ADVENTURER"][metric.level-1];
  $("step").textContent="Round "+round+" of 5";
  $("prompt").textContent=game.id==="count" ? "How many "+world().namePlural+" can you find?" : game.prompt;
  $("feedback").textContent="";
  $("next").hidden=true;
  $("hear").hidden=false;
  renderActivity();
  $("answers").replaceChildren(...current.choices.map(choice=>{
    const b=button(game.id==="shape"?shapes[choice]:game.id==="color"?undefined:choice,()=>answer(choice,b),"answer");
    b.dataset.answer=choice;
    if (game.id==="color") b.append(colorTile(choice));
    if (["color","shape"].includes(game.id)) b.setAttribute("aria-label",choice);
    return b;
  }));
  readPrompt();
}
function answer(choice,b) {
  if (solved) return;
  if (choice!==current.answer) {
    missed++;
    b.disabled=true;
    b.classList.add("muted");
    const hint={count:"Tap each item, then choose the total.",number:"Look at the number word or tap Hear prompt.",color:"Compare the colors again.",shape:"Look at the outline and notice its corners.",pattern:"Say the first group, then look for it again."};
    $("feedback").textContent="Let’s look together. "+hint[game.id];
    if (missed>=2) [...$("answers").children].find(e=>e.dataset.answer===String(current.answer))?.classList.add("hint");
    speak("retry");
    return;
  }
  solved=true;
  for (const choice of $("answers").children) if (choice!==b) choice.disabled=true;
  b.classList.add("good");
  const p=who(),metric=p.metrics[game.id]||emptySkill();
  p.metrics[game.id]=advance(metric,missed===0);
  $("feedback").textContent=missed ? "You kept looking and found it!" : "You found it!";
  $("next").hidden=false;
  $("next").textContent=round===5?"Finish adventure":"Next round";
  $("next").focus();
  save();
  speak("correct");
}
function finish() {
  const p=who(),metric=p.metrics[game.id];
  metric.rounds++;
  const fresh=!p.badges.includes(game.id);
  if (fresh) p.badges.push(game.id);
  save();
  $("step").textContent="Adventure complete";
  $("prompt").textContent=fresh?"You earned a "+game.name+" badge!":"You finished "+game.name+"!";
  $("activity").replaceChildren(element("span","🏅","number-word"));
  $("answers").replaceChildren();
  $("feedback").textContent="You finished all five rounds.";
  $("hear").hidden=true;
  $("next").textContent="Back to the map";
  $("next").onclick=()=>{
    $("next").onclick=step;
    map();
  };
  speak("finish");
}
function step() {if (solved) round===5?finish():displayRound();}
$("next").onclick=step;
$("hear").onclick=()=>{
  if (!state.voice) {
    state.voice=true;
    save();
    soundUI();
  }
  readPrompt();
};
$("sound").onclick=()=>{
  state.voice=!state.voice;
  save();soundUI();
  if (!state.voice) stopSound(); else readPrompt();
};
function back() {$("next").onclick=step;map();}
$("home").onclick=$("back").onclick=$("close-parent").onclick=back;
$("grownups").onclick=()=>{
  stopSound(); game=null;
  open=false;
  $("gate").hidden=false;
  $("gate-answer").value="";
  $("gate-status").textContent="";
  $("parent-content").hidden=true;
  view("parents");
  $("gate-answer").focus();
};
$("gate").onsubmit=event=>{
  event.preventDefault();
  if ($("gate-answer").valueAsNumber!==13) {
    $("gate-status").textContent="Try again with a grown-up.";
    return;
  }
  open=true;
  $("gate").hidden=true;
  $("parent-content").hidden=false;
  renderParent();
};
function renderParent() {
  const p=who();
  const remaining=aliases.filter(alias=>!state.profiles.some(person=>person.alias===alias));
  $("profile-name").replaceChildren(...remaining.map(n=>new Option(n)));
  $("profile-form").querySelector("button").disabled=!remaining.length;
  $("profiles").replaceChildren(...state.profiles.map((person,i)=>{
    const row=element("div",undefined,"profile-row");
    const use=button(i===state.index?"Selected":"Use profile",()=>{
      if (!open) return;
      state.index=i;save();renderParent();
    });
    use.disabled=i===state.index;
    const remove=button("Remove",()=>{
      if (!open || state.profiles.length<=1 || !confirm("Delete this nickname and its progress from this device?")) return;
      state.profiles.splice(i,1);
      state.index=Math.min(i,state.profiles.length-1);
      save();renderParent();
    });
    remove.disabled=state.profiles.length<=1;
    row.append(element("strong",person.alias),use,remove);
    return row;
  }));
  $("world-select").value=p.world;
  $("voice").checked=state.voice;
  $("progress").replaceChildren(...games.map(g=>{
    const d=p.metrics[g.id]||emptySkill();
    const row=element("div",undefined,"progress-row");
    row.append(element("strong",g.skill),element("span",d.attempts?
      d.first+" / "+d.attempts+" first try · Level "+d.level+" · "+d.rounds+" adventures":"Ready to try"));
    return row;
  }));
  const suggested=recommendation(p.metrics);
  $("progress").append(element("p","Suggested next practice: "+suggested.name+"."));
}
$("profile-form").onsubmit=event=>{
  event.preventDefault();
  const name=$("profile-name").value;
  if (!open || !aliases.includes(name) || state.profiles.some(p=>p.alias===name)) return;
  state.profiles.push(profile(name));
  state.index=state.profiles.length-1;
  $("parent-status").textContent=save()?"Profile saved on this device.":"Browser storage is unavailable. This profile lasts for this visit.";
  renderParent();
};
$("world-select").onchange=()=>{
  if (!open || !Object.hasOwn(worlds,$("world-select").value)) return;
  who().world=$("world-select").value;
  save();
};
$("voice").onchange=()=>{
  if (!open) return;
  state.voice=$("voice").checked;
  save();soundUI();
};
$("reset").onclick=()=>{
  if (!open || !confirm("Reset practice and badges for this profile?")) return;
  who().metrics={};who().badges=[];save();renderParent();
};
$("clear").onclick=()=>{
  if (!open || !confirm("Delete all WonderWorlds profiles and progress on this device?")) return;
  stopSound();
  state=defaults();
  try {
    localStorage.removeItem(key);
    $("parent-status").textContent="Saved profiles, settings, and progress removed.";
  } catch {$("parent-status").textContent="Browser storage could not be cleared. Use your browser’s site data controls.";}
  soundUI();renderParent();
};
soundUI();map();
