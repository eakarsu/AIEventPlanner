'use strict'; delete process.env.OPENROUTER_API_KEY; delete process.env.OPENAI_API_KEY;
const test=require('node:test'); const assert=require('node:assert/strict');
const {eventReadiness,budgetInsights,taskPrioritization}=require('../domain/aiFallback');
test('offline AI preserves false/0/empty and labels fallback',()=>{const r=eventReadiness([{name:'Gala',status:'planned',budget:0}],[]);assert.equal(r.aiGenerated,false);assert.equal(r.sections['Has open tasks'],false);assert.equal(r.sections.Events[0].budget,0);const b=budgetInsights([]);assert.equal(b.sections['Total budget'],0);assert.deepEqual(b.sections.Categories,[]);const t=taskPrioritization([{title:'B',priority:'low'},{title:'A',priority:'high'}]);assert.equal(t.sections['Ranked tasks'][0].title,'A');});
