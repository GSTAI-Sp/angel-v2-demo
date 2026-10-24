'use strict';
// Sprint 16 — garde démo avant recette humaine et publication GitHub Pages.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const html=read('index.html');
const metier=read('metier.js');
const onboarding=read('onboarding7.js');
const archive=read('archive.js');
const memory=read('memory-manager.js');
const reports=read('sprints456.js');
const workflow=read('.github/workflows/pages.yml');
const manifest=JSON.parse(read('docs/angel-v2/knowledge-and-release.json'));
assert.match(html,/dchunxngtdbtgxbccmlb/);
assert.match(html,/BidiGenerateContentConstrained/);
assert.match(html,/const MODEL='models\/gemini-3\.8-live'/);
assert.match(html,/const archiveReady=await archives\.show\(\)/);
assert.match(html,/if\(!archives\.isReady\(\)\)/);
assert.match(html,/MAX_STARTUP_AUDIO_MS=20000/);
assert.match(html,/restartWithVoice/);
assert.match(html,/onboarding\.observeUtterance\(thisRequest\)/);
assert.match(html,/stop\(\);setState\('Micro coupé'/);
assert.match(onboarding,/manual_mic_stop_enabled:true/);
assert.match(onboarding,/barge_in_enabled:true/);
assert.doesNotMatch(onboarding,/speechSynthesis|SpeechSynthesisUtterance/);
assert.match(memory,/confirm_delete:'SUPPRIMER'/);
assert.match(memory,/confirm_update:true/);
assert.match(archive,/Reprendre cette conversation/);
assert.match(metier,/Tester les modules 12–15, même sans micro/);
assert.match(metier,/prepareSiteReport/);
assert.match(metier,/siteReportInput/);
assert.match(metier,/readback\.devis\?\.id!==doc/);
assert.match(metier,/request\('consulter_rendez_vous',\{filtre:'date',date:row\.date\}\)/);
assert.match(metier,/request\('consulter_signalements_test',\{\}\)/);
assert.match(metier,/data\.photo_fichiers_stockes!==false/);
assert.match(reports,/URL\.revokeObjectURL/);
const tools=metier.split('const toolDefs=')[1].split('const viewCSS=')[0];
for(const tool of ['confirmer_devis','confirmer_rendez_vous','enregistrer_signalement_test',
 'envoyer_facture','supprimer_memoire','confirmer_deplacement_rendez_vous'])
 assert.equal(tools.includes("{name:'"+tool+"'"),false,'Gemini ne doit pas confirmer : '+tool);
for(const tool of ['consulter_signalements_test','consulter_modules_test','rechercher_devis',
 'preparer_facture','preparer_devis'])
 assert.ok(tools.includes("{name:'"+tool+"'"),'Outil manquant : '+tool);
assert.match(workflow,/workflow_run/);
assert.match(workflow,/conclusion == 'success'/);
assert.match(workflow,/CURRENT_SHA.*VERIFIED_SHA/);
assert.equal(manifest.scope,'DEMO_TEST_SEULEMENT');
assert.equal(manifest.production_approval,false);
assert.doesNotMatch(metier+html,/hjrmkkybhhwfelmatcga|sb_secret_|SUPABASE_SERVICE_ROLE_KEY|AIza[0-9A-Za-z_-]{12}/);
console.log('PASS sprint16 démo — mémoire, voix, arrêt micro, parité TEST devis/agendas/chantiers, confirmation humaine, CI→Pages sur même SHA, secrets absents.');
