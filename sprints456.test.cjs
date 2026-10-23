'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('sprints456.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const pages=fs.readFileSync('.github/workflows/pages.yml','utf8');
const script=source.slice(source.indexOf('function payload(){'),source.indexOf('function prepare(){'));
assert.ok(script.includes('function valid('));
const values={
  's456-title':{value:'Infiltration SPÉCIMEN'},
  's456-zone':{value:'Toiture TEST'},
  's456-description':{value:'Tuiles cassées sur le chantier fictif.'},
  's456-urgency':{value:'elevee'},
  's456-pics':{replaceChildren(){}}
};
const sandbox=vm.createContext({$:(id)=>values[id],files:[{name:'photo-demo.jpg'}]});
vm.runInContext(script,sandbox);
const payload=vm.runInContext('payload()',sandbox);
assert.equal(payload.titre,'Infiltration SPÉCIMEN');
assert.equal(payload.zone,'Toiture TEST');
assert.equal(payload.urgence,'elevee');
assert.equal(payload.photo_noms[0],'photo-demo.jpg');
assert.equal(vm.runInContext('valid(payload())',sandbox),true);
values['s456-description'].value='court';
assert.equal(vm.runInContext('valid(payload())',sandbox),false);
values['s456-description'].value='Description chantier fictif correcte.';
values['s456-urgency'].value='impossible';
assert.equal(vm.runInContext('valid(payload())',sandbox),false);
values['s456-urgency'].value='normale';
assert.equal(vm.runInContext('valid(payload())',sandbox),true);
assert.match(source,/window\.SpeechRecognition\|\|window\.webkitSpeechRecognition/);
assert.match(source,/stopWake\(\)/);
assert.match(source,/config|cfg\.startVoice\(\)/);
assert.match(source,/getToken/);
assert.match(source,/consulter_modules_test/);
assert.match(source,/enregistrer_signalement_test/);
assert.match(source,/consulter_signalements_test/);
assert.match(source,/confirmation:true/);
assert.match(source,/notification_envoyee!==false/);
assert.match(source,/devis_cree!==false/);
assert.match(source,/photo_fichiers_stockes!==false/);
assert.match(source,/URL\.createObjectURL/);
assert.match(source,/URL\.revokeObjectURL/);
assert.doesNotMatch(source,/file\.arrayBuffer\(|FileReader|fetch\(\s*currentFiles|storage\/v1\/object/);
assert.match(html,/<script src="\.\/sprints456\.js"><\/script>/);
assert.match(html,/extras\.init\(/);
assert.match(html,/extras\.voiceDraft\(thisRequest\)/);
assert.match(html,/extras\.hide\(\)/);
assert.match(pages,/workflow_run/);
assert.match(pages,/conclusion == 'success'/);
console.log('PASS S4-S6 TEST : voix optionnelle, formulaires bornés, photos locales, confirmation humaine, lecture métiers et CI conditionnelle.');
