'use strict';
// Test des vrais prérequis de démarrage du client, sans API, micro ou token réels.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('async function prepareLiveConnection(){');
const stop=html.indexOf('async function openLive(){',start);
assert.ok(start>0&&stop>start,'Démarrage parallèle réel introuvable');
const source=html.slice(start,stop);
assert.ok(source.includes('Promise.all([micPromise,memoryPromise,tokenPromise])'));
assert.ok(source.includes('controller.signal.aborted'));
assert.ok(source.includes('captured.getTracks().forEach(t=>t.stop())'));
assert.ok(source.includes('jwt!==currentJwt'));
assert.ok(html.includes('if(startupAbort){startupAbort.abort();startupAbort=null;}'));
assert.ok(html.includes('if(stopped)return;\n    await initCapture();'));
assert.ok(html.includes('memoires')||html.includes('mémoires'));
assert.ok(html.includes('Connexion en '));
assert.doesNotMatch(source,/localStorage|sessionStorage|persistSession|setItem\(/);
function deferred(){
 let resolve,reject;
 const promise=new Promise((a,b)=>{resolve=a;reject=b});
 return {promise,resolve,reject};
}
function harness(){
 const mic=deferred(),memory=deferred(),token=deferred(),called=[],closed=[];
 const media={getTracks:()=>[{stop:()=>closed.push('micro-stopped')}]};
 let microphoneCaptureStarted=0;
 const sandbox=vm.createContext({
  AbortController,Promise,Date,Math,Error,
  performance:{now:()=>500},
  navigator:{mediaDevices:{getUserMedia:()=>{called.push('micro');return mic.promise;}}},
  initCapture:async()=>{microphoneCaptureStarted++;called.push('capture-ready');},
  setState:()=>{},
  memories:{refresh:()=>{called.push('memory');return memory.promise;}},
  fetch:(url,init)=>{called.push('token');assert.equal(url,'endpoint');
    assert.equal(init.cache,'no-store');assert.equal(init.method,'POST');assert.ok(init.signal);
    return token.promise;},
 });
 vm.runInContext("let startupAbort=null,startupStats=null,stream=null,stopped=false,jwt='jwt-demo',startupEpoch=0;const TOKEN_ENDPOINT='endpoint',PUBLIC_KEY='publishable';"+source,sandbox);
 return {mic,memory,token,called,closed,media,sandbox,
  begin:()=>vm.runInContext('prepareLiveConnection()',sandbox),
  cancel:()=>vm.runInContext('stopped=true;startupAbort.abort();startupAbort=null;',sandbox),
  changeJwt:()=>vm.runInContext("jwt='different';",sandbox),
  active:()=>vm.runInContext('startupAbort!==null',sandbox),
  hasStream:()=>vm.runInContext('stream!==null',sandbox),
  captureCalls:()=>microphoneCaptureStarted
 };
}
(async()=>{
 const h=harness(),ready=h.begin();
 assert.deepEqual(h.called,['micro','memory','token'],
  'Les trois opérations doivent démarrer immédiatement, sans dépendre du micro.');
 let finished=false;
 ready.then(()=>{finished=true});
 h.memory.resolve({facts:[]});
 h.token.resolve({ok:true,json:async()=>({token:'ephemeral-test'})});
 await Promise.resolve();await Promise.resolve();
 assert.equal(finished,false,'La capture doit encore être attendue');
 h.mic.resolve(h.media);
 const value=await ready;
 assert.equal(value.token,'ephemeral-test');
 assert.equal(value.snapshot.facts.length,0);
 assert.equal(h.closed.length,0);
 assert.equal(h.hasStream(),true);
 assert.equal(h.captureCalls(),1,'La capture démarre sans attendre la validation Google');
 assert.equal(h.active(),false,'Ne pas laisser le contrôleur actif après connexion');
 const b=harness(),pending=b.begin();
 b.cancel();
 b.mic.resolve(b.media);
 b.memory.resolve({facts:[]});
 b.token.resolve({ok:true,json:async()=>({token:'unused'})});
 assert.equal(await pending,null,'Une session arrêtée ne se connecte pas');
 assert.deepEqual(b.closed,['micro-stopped'],'Une permission accordée après arrêt libère le micro');
 assert.equal(b.captureCalls(),0,'Le micro arrivé après arrêt ne doit pas démarrer la capture');
 assert.equal(b.hasStream(),false);
 const c=harness(),unavailable=c.begin();
 c.memory.resolve(null);
 c.mic.resolve(c.media);
 c.token.resolve({ok:true,json:async()=>({token:'unused'})});
 await assert.rejects(unavailable,/Mémoires indisponibles/,'Interdire la session sans mémoire fraîche');
 const d=harness(),stale=d.begin();
 d.changeJwt();d.memory.resolve({facts:[]});d.mic.resolve(d.media);
 d.token.resolve({ok:true,json:async()=>({token:'unused'})});
 assert.equal(await stale,null,'Une session avec ancien JWT ne peut pas aboutir');
 assert.deepEqual(d.closed,['micro-stopped']);
 console.log('PASS accélération Live : trois prérequis en parallèle, souvenirs frais, arrêt sûr, abandon JWT expiré et micro libéré.');
})().catch(e=>{console.error(e);process.exitCode=1});
