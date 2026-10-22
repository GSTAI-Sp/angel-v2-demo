// Ángel V2 — consultation, correction et suppression humaines des mémoires V1 du compte TEST.
// L'IA ne peut jamais appeler ce service ; seules les actions du propriétaire authentifié.
(() => {
'use strict';
const TEST_URL='https://dchunxngtdbtgxbccmlb.supabase.co';
let key='',getToken=null,onChanged=null,onBeforeChange=null,root=null,list=null,status=null,filter=null,openBtn=null,rows=[],busy=false;
const labels={souvenir:'Souvenir',vocabulaire:'Vocabulaire métier',preference:'Préférence artisan'};
function el(tag,text,className){
 const node=document.createElement(tag);
 if(text!==undefined&&text!==null)node.textContent=text;
 if(className)node.className=className;
 return node;
}
function note(text,error=false){
 if(status){status.textContent=text;status.style.color=error?'#ac2938':'#235a83';}
}
async function request(payload){
 const jwt=getToken?.();
 if(!jwt)throw Error('Connexion TEST requise.');
 const r=await fetch(TEST_URL+'/functions/v1/angel-live-memory-manage',{
   method:'POST',cache:'no-store',headers:{
     'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+jwt
   },body:JSON.stringify(payload)
 });
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(String(data.error||'Erreur HTTP '+r.status));
 if(data.environment!=='TEST')throw Error('Service non conforme à TEST.');
 return data;
}
function valueOf(row){return row.kind==='vocabulaire'?String(row.value||''):String(row.value||row.text||'');}
function norm(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[.!?;:,]+$/g,'').replace(/\s+/g,' ').trim();}
function inLive(data,row,content){
 if(!data||data.environment!=='TEST'||data.read_only!==true)return false;
 const target=norm(content);
 if(row.kind==='souvenir')return (data.long_terme||[]).some(v=>norm(v.fait)===target);
 if(row.kind==='vocabulaire')return (data.vocabulaire||[]).some(v=>norm(v.source)===norm(row.source)&&norm(v.cible)===target);
 return (data.profile||[]).some(v=>v.categorie===row.category && norm(v.valeur?.texte)===target);
}
function render(){
 if(!list)return;
 list.replaceChildren();
 const current=filter?.value||'all';
 const subset=rows.filter(row=>current==='all'||row.kind===current);
 const h=el('p',subset.length+' mémoire'+(subset.length===1?'':'s')+' affichée'+(subset.length===1?'':'s'),'muted');
 list.append(h);
 if(!subset.length){list.append(el('p','Aucune mémoire de cette catégorie.','muted'));return;}
 for(const row of subset){
  const item=el('div',null,'angel-memory-item');
  const top=el('div',null,'angel-memory-item-top');
  const kind=el('strong',labels[row.kind]||'Mémoire');
  const source=el('span',row.origin==='angel_v2_test'?'Enregistrée dans Ángel V2':'Mémoire existante V1','muted');
  top.append(kind,source);
  const body=el('p',row.text||'','angel-memory-text');
  const buttons=el('div',null,'actions');
  const edit=el('button','✏ Corriger','secondary');edit.type='button';
  const del=el('button','Supprimer','secondary');del.type='button';
  buttons.append(edit,del);
  item.append(top,body,buttons);
  const form=el('form',null,'angel-memory-edit');form.hidden=true;
  const label=el('label',row.kind==='vocabulaire'?'Nouvelle signification du terme « '+(row.source||'')+' »':'Nouvelle formulation');
  const field=el('textarea');field.value=valueOf(row);
  field.maxLength=row.kind==='souvenir'?240:row.kind==='vocabulaire'?95:110;
  field.required=true;field.rows=3;
  const msg=el('p','Le changement remplace la valeur enregistrée.','muted');
  const confirm=el('button','Enregistrer la correction','primary');confirm.type='submit';
  const abort=el('button','Annuler','secondary');abort.type='button';
  abort.addEventListener('click',()=>{form.hidden=true;edit.disabled=false;});
  const editActions=el('div',null,'actions');editActions.append(confirm,abort);
  form.append(label,field,msg,editActions);
  edit.addEventListener('click',()=>{
    if(busy)return;
    form.hidden=false;edit.disabled=true;field.value=valueOf(row);field.focus();
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(busy)return;
    const updated=field.value.trim();
    if(updated===valueOf(row).trim()){
      note('Aucune modification détectée.');form.hidden=true;edit.disabled=false;return;
    }
    const before=rows.slice();
    busy=true;confirm.disabled=true;del.disabled=true;
    let written=false;
    try {
      if(onBeforeChange)onBeforeChange();
      const result=await request({action:'update',kind:row.kind,id:row.id,
        updated_at:row.updated_at??null,value:updated,confirm_update:true});
      if(result.updated!==true)throw Error('Correction non confirmée par le serveur.');
      written=true;
      await refreshAfterWrite('update',row,updated);
    }catch(e){
      rows=before;note((written?'Correction enregistrée, mais vérification incomplète : ':'Correction non effectuée : ')+e.message,true);
    }finally{busy=false;confirm.disabled=false;del.disabled=false;}
  });
  del.addEventListener('click',async()=>{
    if(busy)return;
    const answer=window.confirm('Supprimer définitivement cette mémoire TEST ?\n\n'+String(row.text||'').slice(0,160));
    if(!answer)return;
    busy=true;del.disabled=true;edit.disabled=true;
    let removed=false;
    try {
      if(onBeforeChange)onBeforeChange();
      const result=await request({action:'delete',kind:row.kind,id:row.id,
        updated_at:row.updated_at??null,confirm_delete:'SUPPRIMER'});
      if(result.deleted!==true)throw Error('Suppression non confirmée par le serveur.');
      removed=true;
      await refreshAfterWrite('delete',row,valueOf(row));
    }catch(e){note((removed?'Suppression enregistrée, mais vérification incomplète : ':'Suppression non effectuée : ')+e.message,true);}
    finally{busy=false;del.disabled=false;edit.disabled=false;}
  });
  item.append(form);
  list.append(item);
 }
}
async function refreshAfterWrite(action,row,content){
 // Deux lectures distinctes et authentifiées : l'état en base, puis ce que
 // Gemini recevra réellement au prochain démarrage. Aucun succès optimiste.
 const stored=await request({action:'list'});
 const entry=(stored.rows||[]).find(x=>x.id===row.id&&x.kind===row.kind);
 const expected=action==='update'
   ? Boolean(entry&&norm(valueOf(entry))===norm(content))
   : !entry;
 if(!expected)throw Error('La relecture des mémoires en base ne confirme pas le changement.');
 const live=onChanged?await onChanged():null;
 if(!live||live.environment!=='TEST'||live.read_only!==true)
   throw Error('Ángel ne peut pas recharger les mémoires pour le moment.');
 const present=inLive(live,row,content);
 if(action==='update'&&!present)
   throw Error('La correction existe en base mais n’est pas transmise à Ángel.');
 if(action==='delete'&&present)
   throw Error('Cette information apparaît encore dans les souvenirs actifs : vérifie les doublons.');
 const refreshed=await refresh(true);
 if(!refreshed)throw Error('Liste non actualisée.');
 note(action==='update'
   ? '✓ CORRECTION VÉRIFIÉE en base ET dans la mémoire d’Ángel. Redémarre le micro.'
   : '✓ SUPPRESSION VÉRIFIÉE en base ET dans la mémoire d’Ángel. Redémarre le micro.');
}
async function refresh(force=false){
 if((busy&&!force)||!getToken?.())return false;
 busy=true;
 try{
   const data=await request({action:'list'});
   rows=Array.isArray(data.rows)?data.rows.filter(item=>
     item&&['souvenir','vocabulaire','preference'].includes(item.kind)&&typeof item.id==='string'):[];
   render();
   note(rows.length+' mémoire'+(rows.length===1?'':'s')+' consultable'+(rows.length===1?'':'s')+' — compte TEST uniquement.');
   return true;
 }catch(e){note('Impossible de charger les mémoires : '+e.message,true);return false;}
 finally{busy=false;}
}
function init(config){
 if(config.baseUrl!==TEST_URL)throw Error('Gestion mémoires TEST uniquement.');
 key=config.publicKey;getToken=config.getToken;onChanged=config.onChanged;onBeforeChange=config.onBeforeChange;
 const css=el('style');
 css.textContent='.angel-memory-manage{max-width:680px}.angel-memory-item{padding:16px 0;border-top:1px solid #dfe6ef}.angel-memory-item-top{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}.angel-memory-text{overflow-wrap:anywhere;white-space:pre-wrap;margin:8px 0}.angel-memory-edit{padding:14px;background:#f5f8fc;border:1px solid #dce7f4;border-radius:10px;margin:12px 0}.angel-memory-edit textarea{width:100%;box-sizing:border-box;min-height:85px;padding:10px;border:1px solid #cad8e5;border-radius:8px;font:inherit;color:#1e3251}.angel-memory-manage select{width:100%;max-width:360px;border:1px solid #d4dfed;padding:12px;border-radius:8px;background:white;color:#173459}.angel-memory-manage .actions{gap:10px;flex-wrap:wrap}.angel-memory-manage button{white-space:normal}@media(max-width:500px){.angel-memory-manage .angel-memory-item .actions button{flex:1;min-width:140px}}';
 document.head.append(css);
 root=el('section',null,'card angel-memory-manage');root.id='angel-memory-manager';root.hidden=true;
 root.append(el('h2','Mes mémoires (TEST)'));
 root.append(el('p','Consulte, corrige ou supprime les souvenirs d’Ángel. Aucune modification sans ton clic. Les données clients et secrets ne sont pas proposés ici.','muted'));
 const actions=el('div',null,'actions');
 const reload=el('button','↻ Actualiser mes mémoires','secondary');reload.type='button';
 reload.addEventListener('click',()=>{void refresh();});
 actions.append(reload);
 const chooser=el('label','Filtrer :');
 filter=el('select');filter.id='angel-memory-filter';
 for(const [id,title] of [['all','Toutes les mémoires'],['souvenir','Souvenirs'],['vocabulaire','Vocabulaire métier'],['preference','Préférences artisan']]){
   const option=el('option',title);option.value=id;filter.append(option);
 }
 filter.value='all';filter.addEventListener('change',render);
 chooser.append(filter);
 status=el('p','Connecte-toi pour consulter les mémoires.','archive-status');
 status.id='angel-memory-manager-status';status.setAttribute('role','status');
 list=el('div');list.id='angel-memory-manager-list';
 root.append(actions,chooser,status,list);
 const anchor=document.getElementById('angel-memory-learn-panel');
 anchor.insertAdjacentElement('afterend',root);
 openBtn=el('button','📚 Mes mémoires','secondary');openBtn.type='button';
 openBtn.id='angel-memory-manager-open';
 openBtn.addEventListener('click',()=>{
   root.hidden=false;root.scrollIntoView({behavior:'smooth',block:'start'});
   void refresh();
 });
 document.getElementById('stopBtn').insertAdjacentElement('afterend',openBtn);
}
async function show(){if(root)root.hidden=false;return await refresh();}
function hide(){
 rows=[];busy=false;
 if(root)root.hidden=true;
 if(list)list.replaceChildren();
 note('Mémoires déconnectées.');
}
window.AngelMemoryManager={init,show,hide,refresh};
})();