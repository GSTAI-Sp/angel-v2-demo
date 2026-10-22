// Ángel V2: UI memory owner actions, cancellations and refresh (no external network).
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const all=[];
class E{
 constructor(tag){this.tagName=tag;this.children=[];this.listeners={};this.style={};this.hidden=false;this.id='';this.className='';this.textContent='';this.value='';this.disabled=false;all.push(this);}
 append(...parts){this.children.push(...parts)}
 addEventListener(name,cb){this.listeners[name]=cb}
 insertAdjacentElement(_where,node){this.children.push(node)}
 replaceChildren(...nodes){this.children=nodes}
 scrollIntoView(){this.scrolled=true}
 setAttribute(name,value){this[name]=value}
 focus(){this.focused=true}
}
const voice=new E('section'),stop=new E('button'),learn=new E('section');learn.id='angel-memory-learn-panel';
const document={head:new E('head'),createElement:tag=>new E(tag),getElementById(id){return id==='stopBtn'?stop:id==='voicePanel'?voice:all.find(x=>x.id===id)}};
const uuid1='11111111-1111-4111-8111-111111111111',uuid2='22222222-2222-4222-8222-222222222222',uuid3='33333333-3333-4333-8333-333333333333';
const stamp='2026-10-21T17:00:00+00:00';
let saved=[
 {id:uuid1,kind:'souvenir',text:'Je préfère des réponses courtes pour les devis',updated_at:stamp,origin:'angel_v2_test'},
 {id:uuid2,kind:'vocabulaire',text:'ml → mètre linéaire',source:'ml',value:'mètre linéaire',updated_at:stamp,origin:'angel_v2_test'},
 {id:uuid3,kind:'preference',text:'pin',value:'pin',category:'materiaux_favoris',updated_at:stamp,origin:'angel_v2_test'}
],changes=0,confirmCount=0,requests=[],allowDelete=false,readbackEnabled=true;
const fetch=async (_url,opts)=>{
 const request=JSON.parse(opts.body);requests.push(request);
 if(opts.headers.Authorization!=='Bearer TEST_JWT')return {ok:false,status:401,json:async()=>({error:'JWT invalide'})};
 if(request.action==='list')return {ok:true,json:async()=>({environment:'TEST',rows:saved.map(x=>({...x}))})};
 if(request.action==='update'){
   assert.equal(request.confirm_update,true);
   const x=saved.find(y=>y.id===request.id);
   if(!x)return {ok:false,status:404,json:async()=>({error:'Mémoire introuvable'})};
   x.text=request.value;x.value=request.value;x.updated_at='2026-10-21T17:01:00+00:00';
   return {ok:true,json:async()=>({environment:'TEST',updated:true})};
 }
 if(request.action==='delete'){
   assert.equal(request.confirm_delete,'SUPPRIMER');
   saved=saved.filter(x=>x.id!==request.id);
   return {ok:true,json:async()=>({environment:'TEST',deleted:true})};
 }
 return {ok:false,status:400,json:async()=>({error:'Action inconnue'})};
};
const context=vm.createContext({document,window:{confirm:()=>{confirmCount++;return allowDelete;}},fetch,console});
vm.runInContext(fs.readFileSync('memory-manager.js','utf8'),context);
const manager=context.window.AngelMemoryManager;
manager.init({baseUrl:'https://dchunxngtdbtgxbccmlb.supabase.co',publicKey:'sb_publishable_test',getToken:()=> 'TEST_JWT',onChanged:async()=>{
  changes++;
  if(!readbackEnabled)return null;
  return {environment:'TEST',read_only:true,
    long_terme:saved.filter(x=>x.kind==='souvenir').map(x=>({fait:x.text})),
    vocabulaire:saved.filter(x=>x.kind==='vocabulaire').map(x=>({source:x.source,cible:x.value})),
    profile:saved.filter(x=>x.kind==='preference').map(x=>({categorie:x.category,valeur:{texte:x.value}}))
  };
}});
(async()=>{
 assert.equal(await manager.show(),true);
 const panel=document.getElementById('angel-memory-manager');
 assert.equal(panel.hidden,false);
 assert.ok(document.getElementById('angel-memory-manager-open'));
 let list=document.getElementById('angel-memory-manager-list');
 let rows=list.children.filter(x=>x.className==='angel-memory-item');
 assert.equal(rows.length,3);
 const first=rows[0], buttons=first.children[2];
 const edit=buttons.children[0],del=buttons.children[1],form=first.children[3];
 edit.listeners.click();
 assert.equal(form.hidden,false);
 const textarea=form.children[1];textarea.value='Je préfère des réponses très courtes pour les devis';
 await form.listeners.submit({preventDefault(){}});
 assert.equal(changes,1);
 assert.equal(saved[0].text,'Je préfère des réponses très courtes pour les devis');
 assert.ok(document.getElementById('angel-memory-manager-status').textContent.includes('CORRECTION VÉRIFIÉE'));
 // Recharged row now has fresh etag.
 list=document.getElementById('angel-memory-manager-list');
 rows=list.children.filter(x=>x.className==='angel-memory-item');
 const updatedButtons=rows[0].children[2];
 await updatedButtons.children[1].listeners.click();
 assert.equal(confirmCount,1);
 assert.equal(saved.length,3,'Cancel must never delete');
 allowDelete=true;
 await updatedButtons.children[1].listeners.click();
 assert.equal(saved.length,2);
 assert.equal(changes,2);
 assert.ok(document.getElementById('angel-memory-manager-status').textContent.includes('SUPPRESSION VÉRIFIÉE'));
 assert.equal(requests.filter(x=>x.action==='delete').length,1);
 const filter=document.getElementById('angel-memory-filter');
 filter.value='vocabulaire';filter.listeners.change();
 assert.equal(document.getElementById('angel-memory-manager-list').children.filter(x=>x.className==='angel-memory-item').length,1);
 // Une mise à jour en base sans relecture valide ne doit JAMAIS afficher un succès.
 saved.push({id:uuid1,kind:'souvenir',text:'Je préfère du bois',updated_at:stamp,origin:'angel_v2_test'});
 // Le test précédent filtrait exclusivement le vocabulaire : restaurer la vue entière.
 filter.value='all';filter.listeners.change();
 assert.equal(await manager.refresh(),true);
 list=document.getElementById('angel-memory-manager-list');
 const final= list.children.filter(x=>x.className==='angel-memory-item').find(
   x=>x.children[1].textContent.includes('Je préfère du bois'));
 assert.ok(final);
 final.children[2].children[0].listeners.click();
 final.children[3].children[1].value='Je préfère du bois réutilisable';
 readbackEnabled=false;
 await final.children[3].listeners.submit({preventDefault(){}});
 assert.equal(saved.find(x=>x.id===uuid1).text,'Je préfère du bois réutilisable');
 const warning=document.getElementById('angel-memory-manager-status').textContent;
 assert.ok(warning.includes('vérification incomplète'),'A failed live readback is not a validated correction');
 assert.ok(!warning.includes('CORRECTION VÉRIFIÉE'),'Never show false success when Live is stale');
 readbackEnabled=true;
 manager.hide();
 assert.equal(panel.hidden,true);
 assert.equal(document.getElementById('angel-memory-manager-list').children.length,0);
 console.log('PASS memory manager: corrected/deleted values verified in Live, cancelled delete, filters, false-success prevention, logout');
})().catch(e=>{console.error(e);process.exitCode=1});
