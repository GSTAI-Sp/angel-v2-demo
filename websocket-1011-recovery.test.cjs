'use strict';
// Régression 1011 : contrôle le vrai handler publié sur GitHub Pages, sans réseau.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const a=html.indexOf('function recordConnectionFailure(');
const b=html.indexOf('function clearConnectionFailure()',a);
const c=html.indexOf("    ws.onclose=e=>{");
const d=html.indexOf("    };",c);
assert.ok(a>0&&b>a&&c>0&&d>c,'Gestion 1011 manquante');
const diagnostic=html.slice(a,b);
const onclose=html.slice(c,d+6);
const elements={startBtn:{textContent:''},connectionDiagnostic:{textContent:'',hidden:true},copyConnectionDiagnostic:{hidden:true}};
const messages=[];
let stopCalls=0;
const sandbox=vm.createContext({
  MODEL:'models/gemini-3.8-live',
  openedAt:1000,sessionTurns:3,lastConnectionDiagnostic:'',
  lastSessionPhase:'conversation',stopped:false,
  performance:{now:()=>5300},Date,
  $:id=>elements[id],
  stop(){stopCalls++;sandbox.stopped=true},
  setState:(...args)=>messages.push(args)
});
vm.runInContext(diagnostic,sandbox);
vm.runInContext('const ws={};'+onclose,sandbox);
vm.runInContext('ws.onclose({code:1011})',sandbox);
assert.equal(stopCalls,1,'Le microphone doit être arrêté');
assert.equal(elements.copyConnectionDiagnostic.hidden,false);
assert.equal(elements.connectionDiagnostic.hidden,false);
assert.match(elements.startBtn.textContent,/nouveau jeton/);
assert.match(messages.at(-1)[0],/1011/);
const content=sandbox.lastConnectionDiagnostic;
assert.match(content,/WebSocket 1011/);
assert.match(content,/phase conversation/);
assert.match(content,/tours 3/);
assert.doesNotMatch(content,/Bearer|access_token|Authorization|email|@|GEMINI_API_KEY|secret/i);
assert.match(html,/if\(stopped\)return;\s*const phase=lastSessionPhase;/);
assert.match(html,/if\(data\.error\)\{\s*const code=.*recordConnectionFailure\(code,lastSessionPhase\);\s*stop\(\);/);
assert.match(html,/if\(data\.setupComplete\)\{[\s\S]{0,150}lastSessionPhase='conversation';\s*clearConnectionFailure\(\)/);
assert.match(html,/method:'POST',signal:controller.signal/);
assert.match(html,/const ws=new WebSocket\(WS_URL\+'\?access_token='\+encodeURIComponent\(ready.token\)\)/);
assert.match(html,/if\(stopped\)return;\s*const phase=lastSessionPhase;/);
console.log('PASS WebSocket 1011: micro arrêté, aucune reconnexion automatique, nouveau jeton à clic, diagnostic local sans données personnelles, nettoyage après setup.');
