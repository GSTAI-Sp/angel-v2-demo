'use strict';
// Tests reproductibles sur le code réellement poussé, sans micro, réseau ni BDD.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const moduleCode=fs.readFileSync('sprints456.js','utf8');
const metierCode=fs.readFileSync('metier.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const first=moduleCode.indexOf('function normalizeSpeech(');
const last=moduleCode.indexOf('function note(message)',first);
const draftBegin=moduleCode.indexOf('function voiceDraft(t)');
const draftEnd=moduleCode.indexOf('function init(c)',draftBegin);
assert.ok(first>0&&last>first&&draftBegin>0&&draftEnd>draftBegin);
const fields={
 's456-title':{value:''},
 's456-zone':{value:''},
 's456-description':{value:''},
 's456-confirm':{disabled:false},
 's456-preview':{textContent:''}
};
const messages=[];
const ctx=vm.createContext({$:x=>fields[x],token:()=> 'jwt-test',
  box:{hidden:true},pending:null,note:x=>messages.push(x)});
vm.runInContext(moduleCode.slice(first,last)+moduleCode.slice(draftBegin,draftEnd),ctx,{timeout:1200});
function evaluate(expr){return vm.runInContext(expr,ctx,{timeout:1200})}
for(const phrase of ['Angel','Ángel','Angèle','angele','Hey Angèle !']){
 assert.equal(evaluate('isWakeName('+JSON.stringify(phrase)+')'),true,'Le prénom '+phrase+' doit être reconnu');
}
for(const phrase of ['Angélique','angelique','Jeanne','Angelo']){
 assert.equal(evaluate('isWakeName('+JSON.stringify(phrase)+')'),false,'Ne pas déclencher sur '+phrase);
}
const requests=[
 'Angèle signale une fuite sur la toiture.',
 'Signaler une fuite sur la toiture de monsieur Dupont.',
 'Angel, signaler un problème de fuite sur la toiture du chantier'
];
for(const [i,request] of requests.entries()){
 assert.equal(evaluate('isIncidentSpeech('+JSON.stringify(request)+')'),true,'Intention manquante '+i);
 const ok=evaluate('voiceDraft('+JSON.stringify(request)+')');
 assert.equal(ok,true,'Brouillon non préparé '+i);
 assert.equal(fields['s456-confirm'].disabled,true,'La voix ne confirme jamais un incident');
 assert.equal(fields['s456-zone'].value,'Toiture du chantier fictif');
 assert.equal(fields['s456-title'].value,'Fuite à signaler — SPÉCIMEN');
 assert.equal(fields['s456-description'].value,request);
 assert.match(fields['s456-preview'].textContent,/Aucune alerte envoyée/);
 assert.equal(ctx.box.hidden,false);
}
assert.equal(evaluate('isIncidentSpeech("Angèle")'),false);
assert.equal(evaluate('isIncidentSpeech("Recherche le chantier toiture")'),false);
assert.equal(evaluate('isIncidentSpeech("Ne signale pas de fuite sur la toiture")'),false);
assert.equal(evaluate('voiceDraft("Recherche un chantier toiture")'),false);
assert.ok(messages.some(m=>m.includes('aucun client ni chantier')));
assert.match(html,/RÈGLE PRIORITAIRE SIGNALEMENT CHANTIER/);
assert.match(html,/extras\.isIncidentSpeech\(spokenUserTurn\)/);
assert.match(html,/metier\.toolCall\(data\.toolCall\.functionCalls,\{incidentMode\}\)/);
const start=metierCode.indexOf('async function toolCall(calls,options={})');
const end=metierCode.indexOf('// Filet de sécurité ciblé',start);
assert.ok(start>0&&end>start);
let networkCalls=0;
const wsFrames=[];
const socket={readyState:1,send:x=>wsFrames.push(JSON.parse(x))};
const bridge=vm.createContext({
 allowed:new Set(['rechercher_client','rechercher_chantier']),
 getSocket:()=>socket,WebSocket:{OPEN:1},window:{},diagnostic:()=>{},info:()=>{},
 call:async()=>{networkCalls++;return {clients:[{contact_name:'Fictif TEST'}],fictif:true};}
});
vm.runInContext(metierCode.slice(start,end),bridge,{timeout:1200});
async function main(){
 await vm.runInContext("toolCall([{id:'a',name:'rechercher_client',args:{nom:'Dupont'}},{id:'b',name:'rechercher_chantier',args:{nom:'toiture'}}],{incidentMode:true})",bridge);
 assert.equal(networkCalls,0,'La dictée de constat ne doit pas chercher des clients ni chantiers');
 assert.equal(wsFrames.length,1);
 assert.equal(wsFrames[0].toolResponse.functionResponses.length,2);
 for(const answer of wsFrames[0].toolResponse.functionResponses){
  assert.equal(answer.response.result.recherche_effectuee,false);
  assert.equal(answer.response.result.status,'formulaire_incident_prepare');
 }
 await vm.runInContext("toolCall([{id:'c',name:'rechercher_chantier',args:{nom:'toiture'}}],{incidentMode:false})",bridge);
 assert.equal(networkCalls,1,'Les recherches métier explicites hors incident continuent de fonctionner');
 console.log('PASS test incident / Angèle : trois transcriptions réelles, six variantes prénom, brouillon local, aucune recherche hors sujet ni confirmation.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
