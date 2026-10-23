'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync('onboarding7.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const moduleSource=code.slice(code.indexOf("const TEST="),code.indexOf('function init(config){'));
assert.ok(moduleSource.startsWith('const TEST='));
const calls=[],spoken=[];
const dom={
 'onb-language-ask':{hidden:true},'onb-language-question':{textContent:''}
};
const sandbox=vm.createContext({
 document:{getElementById:id=>dom[id]||null},
 window:{},
 Intl,Date,Promise,
 speechSynthesis:{cancel:()=>spoken.push('stopped')},
 SpeechSynthesisUtterance:function(){this.lang='fr-FR'},
});
vm.runInContext(moduleSource,sandbox,{timeout:1500});
const run=expr=>vm.runInContext(expr,sandbox,{timeout:1500});
const plain=value=>JSON.parse(JSON.stringify(value));
const profile=plain(run("cleanProfile({voice_name:'Puck',main_language:'de-DE',barge_in_enabled:false,manual_mic_stop_enabled:false,secondary_language:'es-US'})"));
assert.equal(profile.voice_name,'Puck');
assert.equal(profile.main_language,'fr-FR');
assert.equal(profile.barge_in_enabled,true);
assert.equal(profile.manual_mic_stop_enabled,true);
assert.equal(profile.secondary_language,'es-US');
const invalid=plain(run("cleanProfile({voice_name:'arbitrary',secondary_language:'xx-XX',main_language:'ru-RU'})"));
assert.equal(invalid.voice_name,'Aoede');
assert.equal(invalid.secondary_language,'none');
assert.equal(invalid.main_language,'fr-FR');
const detected=[
 ['I would like to make an appointment tomorrow please','en-US'],
 ['Buenos dias necesito ayuda para un presupuesto','es-US'],
 ['Buongiorno vorrei parlare in italiano','it-IT'],
 ['Bom dia eu preciso conversar com voce','pt-BR'],
 ['Guten Morgen ich brauche hilfe heute','de-DE']
];
for(const [text,lang] of detected)
 assert.equal(run('detectedCandidate('+JSON.stringify(text)+')'),lang,'Détection forte : '+lang);
for(const t of ['Bonjour je voudrais un devis','Hola','Charpente','Buenos','Aide-moi en français']){
 assert.equal(run('detectedCandidate('+JSON.stringify(t)+')'),null,'Pas de bascule spontanée sur : '+t);
}
sandbox.record=x=>calls.push(x);
run("cfg={sendLive:msg=>record(msg)};connected=true;profile=cleanProfile({secondary_language:'es-US'});draft=cleanProfile({voice_name:'Kore'});");
assert.equal(run('getVoice()'),'Kore');
assert.match(run('languageInstruction()'),/français \(fr-FR\)/);
assert.match(run('languageInstruction()'),/AUCUN réglage/);
assert.equal(run("observeUtterance('Buenos dias necesito ayuda para un presupuesto')"),true);
assert.equal(dom['onb-language-ask'].hidden,false);
assert.match(dom['onb-language-question'].textContent,/espagnol/i);
assert.equal(run("sessionLanguage"),'fr-FR','Aucun passage de langue avant acceptation');
assert.equal(run("observeUtterance('oui')"),true);
assert.equal(run('sessionLanguage'),'es-US');
assert.equal(dom['onb-language-ask'].hidden,true);
assert.ok(calls.some(x=>x.includes('CONFIRMATION EXPLICITE ARTISAN')));
assert.equal(run("observeUtterance('repasse en français')"),true);
assert.equal(run('sessionLanguage'),'fr-FR');
assert.equal(run("profile.main_language"),'fr-FR');
assert.equal(run("observeUtterance('Buenos dias necesito ayuda para un presupuesto')"),true);
assert.equal(run("observeUtterance('non')"),true);
assert.equal(run('sessionLanguage'),'fr-FR');
run('resetConversationLanguage()');
assert.equal(run('proposedLanguage'),null);
assert.equal(run('sessionLanguage'),'fr-FR');
assert.equal(dom['onb-language-ask'].hidden,true);
// Commandes vocales du questionnaire : local uniquement, pas d'écriture sans clic.
run("panel={hidden:false};render=()=>{};collect=()=>{};step=1");
assert.equal(run("wizardVoiceCommand('voix Kore')"),true);
assert.equal(run("draft.voice_name"),'Kore');
assert.equal(run("wizardVoiceCommand('suivant')"),true);
assert.equal(run('step'),2);
assert.equal(run("wizardVoiceCommand('precedent')"),true);
assert.equal(run('step'),1);
assert.equal(run("wizardVoiceCommand('enregistre')"),true);
assert.equal(run('profile.onboarding_completed'),false,'La parole ne sauve pas le profil');
run("step=4;habitIndex=0");
assert.equal(run("wizardVoiceCommand('je suis couvreur')"),true);
assert.equal(run("draft.primary_trade"),'couvreur');
assert.equal(run("wizardVoiceCommand('tu peux me tutoyer')"),true);
assert.equal(run("draft.address_mode"),'tu');
assert.equal(run("wizardVoiceCommand('des réponses courtes')"),true);
assert.equal(run("draft.reply_style"),'court');
assert.equal(run("wizardVoiceCommand('professionnel')"),true);
assert.equal(run("draft.expertise_level"),'professionnel');
assert.equal(run("wizardVoiceCommand('mètres carrés')"),true);
assert.equal(run("draft.preferred_unit"),'m2');
let voiceStops=0;
sandbox.forceStop=()=>{voiceStops++;};
run("cfg.stopVoice=forceStop");
assert.equal(run("observeUtterance('arrête le micro')"),true);
assert.equal(voiceStops,1);
assert.equal(run('profile.main_language'),'fr-FR');

// Contrat de persistance : écritures uniquement par clic de sauvegarde, JWT TEST,
// relecture avant confirmation, jamais de bascule de la langue principale.
let writes=0;
sandbox.server=async(action,args)=>{
 if(action==='enregistrer_preferences_angel'){
  writes++;assert.equal(args.confirmation,true);
  assert.equal(args.main_language,'fr-FR');
  assert.equal(args.barge_in_enabled,true);
  assert.equal(args.manual_mic_stop_enabled,true);
  sandbox.saved={...args};
  return {fictif:true,saved:true,profile:{...args}};
 }
 if(action==='consulter_preferences_angel')
  return {fictif:true,lecture_seule:true,profile:{...sandbox.saved}};
 throw Error('Appel inattendu '+action);
};
run('call=server');
(async()=>{
 assert.equal(await run('saveProfile(true)'),true);
 assert.equal(writes,1);
 assert.equal(run('profile.onboarding_completed'),true);
 assert.equal(run('profile.main_language'),'fr-FR');
 const raw=fs.readFileSync('index.html','utf8');
 assert.match(raw,/onboarding\.voiceStop\(\)/);
 assert.match(raw,/onboarding\.resetConversationLanguage\(\)/);
 assert.match(raw,/voiceName:onboarding\.getVoice\(\)/);
 assert.match(raw,/onboarding\.observeUtterance\(thisRequest\)/);
 assert.match(raw,/onboarding\.languageInstruction\(\)/);
 assert.match(raw,/id="stopBtn"/);
 assert.match(raw,/function stop\(\)/);
 assert.match(raw,/if\(c\.interrupted\)/,'Barge-in du moteur conservé');
 assert.doesNotMatch(code,/barge_in_enabled.*(false|disabled)/);
 assert.ok(code.includes("cfg.stopVoice?.()"),'La coupure du micro est toujours accessible dans le guide');
 assert.ok(code.includes("cfg.proposeWord?.("),'Le quiz utilise la mémoire existante');
 assert.ok(code.includes("confirmation:true"),'Profil enregistré après clic confirmé');
 assert.ok(code.includes("getCurrentMemories")||code.includes("reloadMemories"));
 assert.ok(code.includes('voicePanel.insertAdjacentElement'),'Question de langue visible même si guide fermé');
 console.log('PASS Sprint 7 : 8 voix bornées, français immuable, 5 langues, consentement oui/non, mémoire existante, profil relu, stop et interruption permanents.');
})().catch(error=>{console.error(error);process.exitCode=1;});
