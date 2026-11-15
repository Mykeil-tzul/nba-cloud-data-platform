import test from "node:test";
import assert from "node:assert/strict";
import {existsSync} from "node:fs";
import {games,worlds,emptySkill,advance,question,recommendation} from "../site/engine.mjs";

test("every lesson has one correct answer and distinct choices across themes and levels",()=>{
  let seed=100;
  const random=()=>{seed=(seed*16807)%2147483647; return (seed-1)/2147483646;};
  for (const world of Object.values(worlds)) for (const game of games) for (const level of [1,2,3]) {
    for (let i=0;i<25;i++) {
      const q=question(game.id,level,world,random);
      assert.equal(new Set(q.choices).size,q.choices.length);
      assert.ok(q.choices.includes(q.answer));
      if (typeof q.answer==="number") assert.ok(q.answer>=1 && q.answer<=[4,7,10][level-1]);
      if (q.sequence) assert.equal(q.answer,q.sequence[0]);
    }
  }
});
test("first-try success raises difficulty and two supported answers ease it",()=>{
  let skill=emptySkill();
  for (let i=0;i<3;i++) skill=advance(skill,true);
  assert.equal(skill.level,2);
  skill=advance(advance(skill,false),false);
  assert.equal(skill.level,1);
  assert.deepEqual([skill.first,skill.attempts],[3,5]);
});
test("suggestions prefer a skill that would benefit from more practice",()=>{
  const metrics=Object.fromEntries(games.map(g=>[g.id,{...emptySkill(),first:8,attempts:10}]));
  metrics.pattern={...emptySkill(),first:1,attempts:8};
  assert.equal(recommendation(metrics).id,"pattern");
});
test("number ten and recorded prompts are available in the game bundle",()=>{
  const q=question("number",3,worlds.ocean,()=>0.99999);
  assert.equal(q.answer,10);
  for (const name of [...games.map(g=>g.id),"correct","retry","finish",...Array.from({length:10},(_,i)=>String(i+1))]) {
    assert.ok(existsSync(new URL("../site/audio/"+name+".m4a",import.meta.url)));
  }
});
