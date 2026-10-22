'use strict';
// Contrôle isolé du code réellement publié : trois demandes vocales 5, 6 et 7.
// Simule uniquement les réponses du service TEST; aucune connexion ou émission.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const src=fs.readFileSync('metier.js','utf8');
const begin=src.indexOf('function foldSpeech(');
const end=src.indexOf('function init(ctx)',begin);
assert.ok(begin>0 && end>begin,'Récupération vocale métier absente du client');
const actions=[];const messages=[];
const responses={
  consulter_rendez_vous:{fictif:true,lecture_seule:true,rendez_vous:[
    {id:'specimen-001',titre:'Visite chantier',date:'2026-10-29',heure_debut:'16:00',heure_fin:'16:30'}
  ]}
};
let mockBusy=false;
const sandbox=vm.createContext({
  call:async(name,args)=>{
    actions.push({name,args});
    if(name==='preparer_rendez_vous')return {context_id:'draft-1',status:'confirmation_requise',fictif:true,resume:args};
    if(name==='consulter_rendez_vous')return responses.consulter_rendez_vous;
    if(name==='preparer_deplacement_rendez_vous')return {context_id:'draft-2',status:'confirmation_requise',fictif:true,resume:args};
    if(name==='preparer_facture')return {fictif:true,lecture_seule:true,
      facture:{titre:'Aperçu SPÉCIMEN',statut:'NON_CREE',...args}};
    throw Error('Action interdite à la démo : '+name);
  },
  info:(...args)=>messages.push(args),
  validMoney:n=>n.toFixed(2)+' €',Date,Intl,Object,
});
vm.runInContext('let pending=null;\n'+src.slice(begin,end),sandbox,{timeout:1500});
const run=code=>vm.runInContext(code,sandbox,{timeout:1500});
const json=value=>JSON.parse(JSON.stringify(value));
async function main(){
  assert.equal(run("speechIntent('Ángel, prépare un rendez-vous fictif le 29 octobre à 16 h, jusqu’à 16 h 30')"),'rendez_vous');
  assert.equal(run("speechIntent('Décale mon rendez-vous fictif du 29 octobre de 16 h à 17 h')"),'deplacement');
  assert.equal(run("speechIntent('Prépare une facture fictive de 1 000 euros HT, 200 euros de TVA, soit 1 200 euros TTC')"),'facture');
  assert.equal(run("speechIntent('Consulte les factures de TEST')"),null);
  assert.equal(run("speechDate('le 29 octobre 2026')"),'2026-10-29');
  assert.equal(run("speechDate('le 31 février 2026')"),null);
  assert.deepEqual(json(run("speechTimes('de 16 h à 16 h 30')").map(x=>x.text)),['16:00','16:30']);
  assert.deepEqual(json(run("speechMoney('1 000 euros HT, 200 euros de TVA, 1 200 euros TTC')")),
    {ht:1000,tva:200,ttc:1200});
  const prep=await run("recoverBusinessVoice('Ángel, prépare un rendez-vous fictif le 29 octobre 2026 à 16 h, jusqu’à 16 h 30, pour une visite de chantier.')");
  assert.equal(prep.handled,true);assert.match(prep.spoken,/Confirmer/);
  assert.equal(actions.at(-1).name,'preparer_rendez_vous');
  assert.deepEqual(json(actions.at(-1).args),{titre:'visite de chantier',date:'2026-10-29',heure_debut:'16:00',heure_fin:'16:30'});
  assert.equal(actions.some(x=>x.name==='confirmer_rendez_vous'),false);
  const moved=await run("recoverBusinessVoice('Décale mon rendez-vous fictif du 29 octobre 2026 de 16 h à 17 h.')");
  assert.equal(moved.handled,true);assert.match(moved.spoken,/17:30/);
  assert.deepEqual(actions.slice(-2).map(x=>x.name),['consulter_rendez_vous','preparer_deplacement_rendez_vous']);
  assert.deepEqual(json(actions.at(-1).args),{rendez_vous_id:'specimen-001',date:'2026-10-29',heure_debut:'17:00',heure_fin:'17:30'});
  assert.equal(actions.some(x=>x.name==='confirmer_deplacement_rendez_vous'),false);
  const invoice=await run("recoverBusinessVoice('Prépare une facture fictive de 1 000 euros HT, 200 euros de TVA, soit 1 200 euros TTC.')");
  assert.equal(invoice.handled,true);assert.match(invoice.spoken,/Aucune facture créée/);
  assert.deepEqual(json(actions.at(-1)),{name:'preparer_facture',args:{montant_ht:1000,montant_tva:200,montant_ttc:1200}});
  const count=actions.length;
  const notReady=await run("recoverBusinessVoice('Prépare une facture fictive de 1000 euros HT et 200 euros de TVA.')");
  assert.match(notReady.spoken,/trois montants/);assert.equal(actions.length,count);
  responses.consulter_rendez_vous={fictif:true,lecture_seule:true,rendez_vous:[]};
  const missing=await run("recoverBusinessVoice('Décale mon rendez-vous fictif du 29 octobre 2026 de 16 h à 17 h.')");
  assert.match(missing.spoken,/Aucun rendez-vous TEST/);
  assert.equal(actions.at(-1).name,'consulter_rendez_vous');
  responses.consulter_rendez_vous={fictif:true,lecture_seule:true,rendez_vous:[
    {id:'a',date:'2026-10-29',heure_debut:'16:00',heure_fin:'16:30'},
    {id:'b',date:'2026-10-29',heure_debut:'16:00',heure_fin:'17:00'}
  ]};
  const ambiguous=await run("recoverBusinessVoice('Décale mon rendez-vous fictif du 29 octobre 2026 de 16 h à 17 h.')");
  assert.match(ambiguous.spoken,/Plusieurs rendez-vous/);
  assert.equal(actions.at(-1).name,'consulter_rendez_vous');
  const beforePending=actions.length;
  run("pending={context_id:'already-waiting'}");
  const wait=await run("recoverBusinessVoice('Prépare une facture fictive de 1000 euros HT, 200 euros de TVA, 1200 euros TTC')");
  assert.match(wait.spoken,/déjà en attente/);assert.equal(actions.length,beforePending);
  assert.equal(actions.some(x=>/^(confirmer|annuler)/.test(x.name)),false);
  console.log('PASS commandes vocales 5/6/7 — reconnaissance, agenda, déplacement, facture, refus, zéro confirmation automatique.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
