// Ángel V2: test de bout en bout de l'affichage du panneau de mémorisation.
// DOM fictif, aucun appel réseau, aucune donnée réelle.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const nodes=[];
class FakeElement {
  constructor(tag){
    this.tagName=tag;this.children=[];this.style={};this.hidden=false;
    this.listeners={};this.textContent='';this.id='';this.className='';
    nodes.push(this);
  }
  append(...children){this.children.push(...children)}
  addEventListener(name,cb){this.listeners[name]=cb}
  insertAdjacentElement(_where,el){this.append(el)}
  scrollIntoView(){this.scrolled=true}
  setAttribute(name,value){this[name]=value}
}
const doc={
  head:new FakeElement('head'),
  createElement(tag){return new FakeElement(tag)},
  getElementById(id){
    if(id==='voicePanel')return voice;
    if(id==='stopBtn')return stop;
    return nodes.find(x=>x.id===id)||null;
  }
};
const voice=new FakeElement('section');
const stop=new FakeElement('button');
const win={};
const context=vm.createContext({window:win,document:doc,console});
vm.runInContext(fs.readFileSync('memory-intent.js','utf8'),context,{filename:'memory-intent.js'});
vm.runInContext(fs.readFileSync('memory-learn.js','utf8'),context,{filename:'memory-learn.js'});
let userFinalHandler=null;
const transcripts={setFinalUserHandler(callback){userFinalHandler=callback}};
win.AngelMemoryLearning.init({baseUrl:'https://dchunxngtdbtgxbccmlb.supabase.co',
  publicKey:'sb_publishable_test',getToken:()=> 'FAKE_TEST_TOKEN',refresh:async()=>{},transcripts});
win.AngelMemoryLearning.show();
assert.equal(typeof userFinalHandler,'function');

const panel=doc.getElementById('angel-memory-learn-panel');
const approval=nodes.find(x=>x.className==='angel-memory-preview');
const summary=approval.children.find(x=>x.tagName==='p');
const banner=doc.getElementById('angel-memory-save-status');
const manualButton=doc.getElementById('angel-memory-open');
assert.equal(panel.hidden,false,'Memory panel must be available after login');
assert.ok(manualButton,'Manual fallback near microphone must exist');
assert.ok(banner,'Persistent truthful status must exist');
assert.equal(approval.hidden,true,'No fake memory confirmation before request');
const reply=userFinalHandler({speaker:'user',body:'Ángel, retiens que je préfère des réponses courtes pour les devis.'});
assert.equal(approval.hidden,false,'Voice request must show human confirmation');
assert.equal(panel.scrolled,true,'Panel must scroll into view');
assert.ok(summary.textContent.includes('réponses courtes'),'Shows exactly what user asked');
assert.ok(banner.textContent.includes('NON ENREGISTRÉE'),'Never claim data saved without POST');
const btn=doc.getElementById('angel-memory-confirm');
assert.ok(btn,'A clickable human confirmation is required');
const cancel=approval.children.find(x=>x.className==='actions').children[1];
cancel.listeners.click();
assert.equal(approval.hidden,true,'Cancel must dismiss proposal');
assert.ok(banner.textContent.includes('aucune mémoire enregistrée'),'Cancel must not save');
console.log('PASS: spoken memory proposal opens the panel, exposes button, no fake save, cancellation works.');
