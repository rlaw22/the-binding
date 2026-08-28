'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { auditIngestedContent, assertIngestedContent } = require('../src/storyline-v2/domain/content-quality-gate');
const manifestPath = path.join(__dirname, '..', 'content/ingestion/dracula-1897/candidates/dracula-opening-dramatic-002/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function base(overrides = {}) {
  return { schemaVersion:'2.0', adventureId:'book-test', title:'Book', source:{generation:'whole-book-ingestion'}, ingestionPolicy:{sourceClassification:'required'}, scenes:[{
    sceneId:'s1', name:'The Inn', setting:'A crowded inn at dusk.', openingNarration:'Rain lashes the windows as the traveller reaches the inn. A frightened host bars the door, and footsteps approach from the road.', actions:[
      {actionId:'look', type:'exploration', role:'discovery', sourceClass:'discovery', replay:'repeatable', resurface:{whilePlausible:true,maxAuthoredRevisits:2}, label:'Inspect the barred door', shortLabel:'Inspect the door', resolution:{narration:'You inspect the barred door and find fresh scratches in the wood.'}},
      {actionId:'leave', type:'exit', role:'commitment', sourceClass:'decision', replay:'consumable', label:'Leave before the footsteps arrive', shortLabel:'Leave now', resolution:{narration:'You leave before the footsteps arrive.'}}
    ]
  }], graph:{entry:'s1',edges:[]}, ...overrides };
}

assert.doesNotThrow(() => assertIngestedContent(manifest, {strict:true}));
assert(auditIngestedContent({...base(), scenes:[{...base().scenes[0], openingNarration:'Chapter 1: THE INN'}]}, {strict:true}).errors.length);
assert(auditIngestedContent({...base(), scenes:[{...base().scenes[0], actions:[{...base().scenes[0].actions[0],label:'Observe chapter 1 evidence'} ,base().scenes[0].actions[1]]}]}, {strict:true}).errors.length);
assert(auditIngestedContent({...base(), scenes:[{...base().scenes[0], actions:[{...base().scenes[0].actions[0], replay:'consumable'}, {...base().scenes[0].actions[1]}]}]}, {strict:true}).errors.length === 0, 'one consumable plus repeatable action is valid');
assert(auditIngestedContent({...base(), scenes:[{...base().scenes[0], actions:[{...base().scenes[0].actions[0], replay:'consumable'}, {...base().scenes[0].actions[0], actionId:'ask', label:'Question the frightened host', shortLabel:'Question the host', role:'alternative', replay:'consumable', resolution:{narration:'You question the frightened host.'}}, {...base().scenes[0].actions[1]}]}]}, {strict:true}).errors.some(e=>e.message.includes('exhaust')));
console.log('  ✓ universal ingested-content quality gate');
