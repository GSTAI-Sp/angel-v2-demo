// SPEEDARTI : garde CI obligatoire pour la démo TEST Ángel V2.
// Les tests techniques ne valent ni validation humaine ni déploiement de production.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const manifest=JSON.parse(read('docs/angel-v2/knowledge-and-release.json'));
const pages=read('.github/workflows/pages.yml');
const verify=read('.github/workflows/verify.yml');
const entry=read('index.html');
const metier=read('metier.js');
const expected=[
 'index.html','metier.js','transcript-preview.js','archive.js',
 'memory.js','memory-learn.js','memory-manager.js','memory-intent.js','auto-memory.js'
];
const sources=Object.keys(manifest.tracked_sources||{});
assert.deepEqual(sources.sort(),expected.slice().sort(),'Sources de comportement manquantes');
const present=fs.readdirSync(root).filter(x=>x.endsWith('.js')||x==='index.html');
assert.deepEqual(present.sort(),expected.slice().sort(),'Source JS non revue détectée');
for(const f of expected){
 const buffer=fs.readFileSync(path.join(root,f));
 const blob=crypto.createHash('sha1').update('blob '+buffer.length+'\0').update(buffer).digest('hex');
 assert.equal(blob,manifest.tracked_sources[f],'Comportement non revu : '+f+'. Actualiser le registre des connaissances et impacts.');
}
assert.equal(manifest.scope,'DEMO_TEST_SEULEMENT');
assert.equal(manifest.production_approval,false);
assert.match(manifest.knowledge_base_existing,/knowledge_base/);
assert.ok(fs.existsSync(path.join(root,manifest.changes_log)),'Changelog brouillon manquant');
assert.match(pages,/^\s+workflow_run:/m,'Pages doit attendre la réussite du contrôle CI');
assert.doesNotMatch(pages,/^\s{2}(push|workflow_dispatch|pull_request):/m,'Publication directe interdite');
assert.match(pages,/workflow_run\.conclusion\s*==\s*'success'/);
assert.match(pages,/workflow_run\.head_sha/);
assert.match(pages,/git ls-remote origin refs\/heads\/main/);
assert.match(pages,/public-site/);
assert.match(verify,/node scripts\/quality-gate\.cjs/,'Contrôle CI non exécuté');
assert.match(verify,/node memory-manager\.test\.cjs/);
assert.match(verify,/node auto-memory\.test\.cjs/);
assert.match(entry,/<meta name="viewport" content="width=device-width,initial-scale=1/);
assert.match(entry,/@media\s*\(max-width:/);
assert.match(entry,/<meta name="robots" content="noindex,nofollow"/);
const forbidden=[
 /hjrmkkybhhwfelmatcga/i, /sb_secret_/i,
 /GEMINI_API_KEY/i, /SUPABASE_SERVICE_ROLE_KEY/i,
 /AIza[0-9A-Za-z_-]{20,}/,
 /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
];
for(const name of expected){
 const src=read(name);
 for(const bad of forbidden)
  assert.equal(bad.test(src),false,'Secret ou production exposé dans '+name);
}
assert.match(entry,/dchunxngtdbtgxbccmlb/);
const defs=metier.split('const toolDefs=[',2)[1]?.split('];\n',1)[0];
assert.ok(defs,'Déclarations outils Gemini absentes');
const declared=[...defs.matchAll(/\{name:'([^']+)'/g)].map(m=>m[1]);
assert.ok(declared.length>0);
const entries=manifest.tools||[];
assert.deepEqual(declared.slice().sort(),entries.map(x=>x.name).sort(),'Impact des outils sur la base Ángel non documenté');
for(const item of entries){
 assert.ok(item.meaning?.length>=20,'Explication métier manquante : '+item.name);
 assert.ok(item.known_limits?.length>=20,'Limites connues manquantes : '+item.name);
 assert.ok(['EN_ATTENTE','VALIDE_HUMAIN'].includes(item.human_test),'Statut humain incohérent');
 assert.equal(typeof item.knowledge_db_synced,'boolean','Statut connaissance invalide');
}
if(manifest.completion_status==='TERMINE'){
 assert.equal(manifest.manual_acceptance,'VALIDE_HUMAIN');
 assert.equal(manifest.knowledge_sync_status,'VERIFIE_DANS_BASE_EXISTANTE');
 assert.ok(entries.every(x=>x.knowledge_db_synced&&x.human_test==='VALIDE_HUMAIN'));
 assert.equal(manifest.security_attestations.rls_live_cross_owner_negative_test,'VALIDE_HUMAIN');
 assert.equal(manifest.security_attestations.real_browser_mobile_tablet_test,'VALIDE_HUMAIN');
}
console.log('PASS garde SpeedArti: CI→Pages, isolation TEST, empreintes des sources, connaissances, secrets, CSS mobile.');
console.log('Statut du sprint:',manifest.completion_status,'; test humain:',manifest.manual_acceptance,'; savoir Ángel:',manifest.knowledge_sync_status);
