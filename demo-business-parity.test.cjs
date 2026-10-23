'use strict';
// Tests de la vraie logique de la démo, sans données externes et sans réseau.
// Vérifie les mêmes contrats métiers sécurisés que la future interface React.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('metier.js','utf8');
const begin=source.indexOf('async function prepareManualInvoice(){');
const end=source.indexOf('async function prepareManualAppointment(){',begin);
assert.ok(begin>0&&end>begin,'Fonctions facture et constat chantier manquantes');
const contract=source.slice(source.indexOf('const toolDefs='),source.indexOf('const viewCSS='));
for(const name of ['consulter_factures','rechercher_chantier','rechercher_devis',
  'consulter_modules_test','consulter_signalements_test','preparer_facture',
  'preparer_devis','preparer_rendez_vous','preparer_deplacement_rendez_vous']){
 assert.ok(contract.includes("{name:'"+name+"'"),'Parité outil vocal TEST manquante : '+name);
}
for(const name of ['confirmer_devis','confirmer_rendez_vous',
  'confirmer_deplacement_rendez_vous','enregistrer_signalement_test',
  'envoyer_facture','supprimer_devis']){
 assert.equal(contract.includes("{name:'"+name+"'"),false,
  'Aucun outil de validation écriture ne doit être exposé à Gemini : '+name);
}
assert.ok(source.includes('Aperçu facture — jamais émise'));
assert.ok(source.includes('Signalement rattaché à un vrai chantier TEST'));
assert.ok(source.includes('angel-report-site'));
assert.ok(source.includes('id="angel-report-confirm" disabled'));
assert.ok(source.includes('id="angel-report-prepare"'));
assert.ok(source.includes('invalidateSiteReport'));
assert.ok(source.includes('angel-find-reports'));
assert.ok(source.includes('angel-find-modules'));
assert.ok(!contract.includes("{name:'enregistrer_signalement_test'"));
const siteId='f2f025a8-0c47-41b7-94d5-456c96142148';
const reportId='b8b025a8-0c47-41b7-94d5-456c96142148';
const btn={disabled:false};
const fields={
 'angel-manual-invoice':{querySelector:()=>btn},
 'angel-invoice-title':{value:'Facture SPÉCIMEN'},
 'angel-invoice-ht':{value:'100'},
 'angel-invoice-tax':{value:'20'},
 'angel-invoice-ttc':{value:'120'},
 'angel-report-site':{value:siteId,selectedIndex:1,options:[
  {textContent:'Choisir'},{textContent:'Chantier TEST de l’artisan'}]},
 'angel-report-title':{value:'Test de fuite toiture'},
 'angel-report-description':{value:'Une infiltration est visible dans la zone nord.'},
 'angel-report-zone':{value:'Toiture nord'},
 'angel-report-urgency':{value:'elevee'},
 'angel-report-photos':{value:'photo01.jpg,photo02.jpg'},
 'angel-report-preview':{textContent:''},
 'angel-report-confirm':{disabled:true},
 'angel-report-prepare':{disabled:false}
};
const calls=[],texts=[],rendered=[];
const row={id:reportId,chantier_id:siteId,statut:'specimen_a_valider'};
const ctx=vm.createContext({
 $,siteSelect:fields['angel-report-site'],uuid:/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
 siteReportPending:null,siteReportBusy:false,busy:false,JSON,Number,
 request:async (name,args)=>{
  calls.push({name,args});
  if(name==='enregistrer_signalement_test')return {
   fictif:true,signalement:row,photo_fichiers_stockes:false,
   notification_envoyee:false,devis_cree:false
  };
  if(name==='consulter_signalements_test')return {
   fictif:true,lecture_seule:true,signalements:[row]
  };
  throw Error('Appel non prévu : '+name);
 },
 call:async(name,args)=>{
  calls.push({name,args});
  if(name==='preparer_facture')return {fictif:true,lecture_seule:true,
   facture:{statut:'NON_CREE',numero:null,...args}};
  throw Error('Appel non prévu : '+name);
 },
 info:(...x)=>texts.push(x),render:(...x)=>rendered.push(x)
});
function $(id){return fields[id]}
vm.runInContext(source.slice(begin,end),ctx,{timeout:2000});
const run=x=>vm.runInContext(x,ctx,{timeout:2000});
async function main(){
 assert.equal(run('siteReportInput().chantier_id'),siteId);
 fields['angel-report-site'].value='';
 assert.throws(()=>run('siteReportInput()'),/Chantier TEST/);
 fields['angel-report-site'].value=siteId;
 fields['angel-report-photos'].value='../../secret';
 assert.throws(()=>run('siteReportInput()'),/Chantier TEST/);
 fields['angel-report-photos'].value='photo01.jpg,photo02.jpg';
 // Préparer N'ÉCRIT ABSOLUMENT RIEN.
 run('prepareSiteReport()');
 assert.equal(calls.length,0);
 assert.equal(fields['angel-report-confirm'].disabled,false);
 assert.match(fields['angel-report-preview'].textContent,/aucun enregistrement/i);
 // Une modification après l'aperçu invalide le consentement.
 fields['angel-report-description'].value+=' Modification.';
 run('invalidateSiteReport()');
 assert.equal(fields['angel-report-confirm'].disabled,true);
 await run('confirmSiteReport()');
 assert.equal(calls.length,0);
 run('prepareSiteReport()');
 assert.equal(fields['angel-report-confirm'].disabled,false);
 await run('confirmSiteReport()');
 assert.deepEqual(calls.map(c=>c.name),[
  'enregistrer_signalement_test','consulter_signalements_test'
 ]);
 assert.equal(calls[0].args.chantier_id,siteId);
 assert.equal(calls[0].args.confirmation,true);
 assert.equal(calls[0].args.photo_noms.length,2);
 assert.equal(rendered.at(-1)[0],'consulter_signalements_test');
 assert.equal(fields['angel-report-confirm'].disabled,true);
 assert.match(fields['angel-report-preview'].textContent,/SIGNALEMENT SPÉCIMEN VÉRIFIÉ/);
 // Aucun second clic ne réécrit le même constat.
 await run('confirmSiteReport()');
 assert.equal(calls.length,2);
 run('prepareSiteReport()');
 run('cancelSiteReport()');
 await run('confirmSiteReport()');
 assert.equal(calls.length,2);
 // La facture reste seulement un APERÇU et vérifie la cohérence comptable.
 fields['angel-invoice-ttc'].value='125';
 await run('prepareManualInvoice()');
 assert.equal(calls.length,2);
 fields['angel-invoice-ttc'].value='120';
 await run('prepareManualInvoice()');
 assert.equal(calls.at(-1).name,'preparer_facture');
 assert.equal(calls.at(-1).args.montant_ht,100);
 assert.equal(calls.at(-1).args.montant_tva,20);
 assert.equal(calls.at(-1).args.montant_ttc,120);
 assert.equal(calls.some(c=>/confirmer|envoyer|paiement|upload/i.test(c.name)),false);
 console.log('PASS parité métier démo : lectures Gemini bornées, facture aperçu, constat par chantier, confirmation seule après clic + relecture, zéro envoi.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
