'use strict';
// Capture micro immédiate et tampon RAM avant setupComplete de Gemini Live.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('const MAX_STARTUP_AUDIO_MS=');
const end=html.indexOf('let playback=[]',start);
const sendStart=html.indexOf('function sendPCM(data,sampleRate){');
const sendEnd=html.indexOf('async function initCapture(){',sendStart);
assert.ok(start>0&&end>start&&sendStart>0&&sendEnd>sendStart,'Fonctions tampon absentes du client');
const bufferCode=html.slice(start,end)+html.slice(sendStart,sendEnd);
const sent=[],timers=[],cancelled=new Set();
let sequence=0;
const socket={readyState:1,bufferedAmount:0,send:payload=>sent.push(JSON.parse(payload))};
const sandbox=vm.createContext({
 WebSocket:{OPEN:1},socket,
 setTimeout:(fn,ms)=>{const id=++sequence;timers.push({id,fn,ms});return id},
 clearTimeout:id=>{cancelled.add(id)},
 encodePCM:arr=>'chunk-'+arr[0],
});
vm.runInContext('let stopped=false,setupDone=false;\n'+bufferCode,sandbox);
const run=s=>vm.runInContext(s,sandbox,{timeout:1500});
function capture(id){sandbox.chunk=new Float32Array([id]);run('sendPCM(chunk,10)')}
function frameList(){return sent.map(x=>x.realtimeInput.audio.data)}
function tick(){
 while(timers.length){
  const timer=timers.shift();if(cancelled.has(timer.id))continue;
  timer.fn();return true;
 }
 return false;
}
function flushAll(max=2000){for(let i=0;i<max&&tick();i++);assert.equal(timers.length,0,'La file doit se vider');}
capture(1);capture(2);capture(3);
assert.equal(sent.length,0,'Aucune transmission avant setupComplete');
assert.equal(run('pendingAudio.length'),3);
assert.equal(run('pendingAudioMs'),300);
run('setupDone=true;audioFlushTimer=setTimeout(flushPendingAudio,0)');
assert.equal(sent.length,0,'La file est d’abord drainée de manière contrôlée');
assert.equal(tick(),true);assert.deepEqual(frameList(),['chunk-1']);
capture(4); // Les fragments directs ne doivent pas dépasser le tampon.
flushAll();
assert.deepEqual(frameList(),['chunk-1','chunk-2','chunk-3','chunk-4'],
 'Les paroles du clic restent dans le bon ordre après la connexion');
assert.equal(run('pendingAudio.length'),0);
capture(5);
assert.deepEqual(frameList().slice(-1),['chunk-5'],'La capture passe en direct après épuisement du tampon');
run('setupDone=false;');
for(let i=0;i<250;i++)capture(i+100);
assert.ok(run('pendingAudioMs<=MAX_STARTUP_AUDIO_MS'),'Tampon limité à 20 secondes');
assert.equal(run('pendingAudioClipped'),true,'Débordement visible, jamais silencieux');
assert.equal(sent.length,5,'Aucun PCM envoyé lorsque Gemini est déconnecté');
run('setupDone=true;audioFlushTimer=setTimeout(flushPendingAudio,0)');
tick();
const count=sent.length;
run('stopped=true;clearPendingAudio()');
flushAll();
assert.equal(sent.length,count,'Un arrêt bloque les transmissions en attente');
assert.equal(run('pendingAudio.length'),0);
assert.equal(run('pendingAudioMs'),0);
assert.equal(run('pendingAudioClipped'),false);
assert.ok(html.includes("const ready=await prepareLiveConnection()"));
assert.ok(!html.includes('await initCapture();\n    if(stopped)return;\n    const ws='));
assert.ok(html.includes('if(!setupDone||!socket||socket.readyState!==WebSocket.OPEN)'));
assert.ok(html.includes('if(pendingAudio.length&&audioFlushTimer===null)'));
assert.ok(html.includes("Micro actif — parle maintenant"));
assert.ok(html.includes('startupEpoch++'));
console.log('PASS micro immédiat : aucun son envoyé avant Google, 20 s RAM, ordre FIFO, flux direct, annulation et purge.');
