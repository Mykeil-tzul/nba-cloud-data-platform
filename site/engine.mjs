export const games = [
  {id:"count",name:"Treasure Count",skill:"Counting",icon:"⭐",prompt:"Tap each friend to count it. Then choose how many you found."},
  {id:"number",name:"Number Echo",skill:"Number recognition",icon:"🔢",prompt:"Listen to the number or read it. Choose the matching number."},
  {id:"color",name:"Color Cove",skill:"Colors",icon:"🎨",prompt:"Find the tile that matches this color."},
  {id:"shape",name:"Shape Harbor",skill:"Shapes",icon:"🔶",prompt:"Find the shape that matches the outline."},
  {id:"pattern",name:"Pattern Path",skill:"Patterns",icon:"🧩",prompt:"Look at the pattern. What comes next?"}
];
export const worlds={
  ocean:{name:"Ocean",guide:"Shelly the turtle",emoji:"🐢",item:"⭐",pattern:["🐚","🐠","⭐"],namePlural:"starfish"},
  space:{name:"Space",guide:"Orbit the astronaut",emoji:"👩‍🚀",item:"🌟",pattern:["🪐","🚀","🌟"],namePlural:"stars"},
  animals:{name:"Animals",guide:"Pip the fox",emoji:"🦊",item:"🐾",pattern:["🦊","🐻","🐰"],namePlural:"paw prints"},
  bible:{name:"Bible stories",guide:"An ark adventure",emoji:"🕊️",item:"🐑",pattern:["🐑","🕊️","🌈"],namePlural:"sheep"}
};
export const palette={red:"#e74751",blue:"#247cdd",yellow:"#f3c62c",green:"#319b58",purple:"#8e4dc7",orange:"#f08035",pink:"#e7549e",teal:"#138d91"};
export const shapes={circle:"●",square:"■",triangle:"▲",diamond:"◆",star:"★",hexagon:"⬢",heart:"♥",oval:"⬭"};
export const outlines={circle:"○",square:"□",triangle:"△",diamond:"◇",star:"☆",hexagon:"⬡",heart:"♡",oval:"⬯"};

export function emptySkill() {
  return {attempts:0,first:0,rounds:0,level:1,recent:[]};
}
export function advance(skill,firstTry) {
  const recent=[...skill.recent,Boolean(firstTry)].slice(-4);
  let level=skill.level;
  const last=recent.slice(-3);
  if (last.length===3 && last.every(Boolean) && level<3) {level++;recent.length=0;}
  else if (recent.length>=2 && recent.slice(-2).every(x=>!x) && level>1) {level--;recent.length=0;}
  return {...skill,attempts:skill.attempts+1,first:skill.first+Number(firstTry),recent,level};
}
function choose(items,rng) {return items[Math.floor(rng()*items.length)];}
function shuffle(items,rng) {
  const result=[...items];
  for (let i=result.length-1;i>0;i--) {
    const j=Math.floor(rng()*(i+1));
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}
function options(answer,domain,rng,count=3) {
  return shuffle([answer,...shuffle(domain.filter(x=>x!==answer),rng).slice(0,count-1)],rng);
}
export function question(game,level,world,rng=Math.random,avoid) {
  const max=[4,7,10][level-1];
  const numeric=Array.from({length:max},(_,i)=>i+1);
  const pick=domain=>choose(domain.length>1?domain.filter(value=>value!==avoid):domain,rng);
  if (game==="count" || game==="number") {
    const answer=pick(numeric);
    return {answer,choices:options(answer,numeric,rng,level===3?4:3),kind:game};
  }
  if (game==="color" || game==="shape") {
    const domain=Object.keys(game==="color"?palette:shapes).slice(0,[4,6,8][level-1]);
    const answer=pick(domain);
    return {answer,choices:options(answer,domain,rng,level===3?4:3),kind:game};
  }
  const symbols=shuffle(world.pattern,rng);
  const unit=level===1?[symbols[0],symbols[1]]:level===2?[symbols[0],symbols[0],symbols[1]]:symbols;
  const length=unit.length*2;
  return {kind:"pattern",sequence:Array.from({length},(_,i)=>unit[i%unit.length]),
    answer:unit[length%unit.length],choices:shuffle(symbols,rng)};
}
export function recommendation(metrics) {
  return [...games].sort((a,b)=>{
    const score=id=>{
      const s=metrics[id]||emptySkill();
      return s.attempts ? (s.first+1)/(s.attempts+2) : 0.15;
    };
    return score(a.id)-score(b.id);
  })[0];
}
