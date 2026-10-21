// Ángel V2 : sauvegarde de transcriptions finalisées dans le seul projet TEST.
// RLS Supabase vérifie l'identité JWT pour chaque accès. Aucun audio brut conservé.
(() => {
  'use strict';
  const PROJECT='https://dchunxngtdbtgxbccmlb.supabase.co';
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  let publicKey='', getToken=null, onSwitch=null, transcript=null;
  let panel=null,notice=null,listEl=null,titleEl=null,retryButton=null,newButton=null;
  let ownerId=null,current=null,all=[],historyCache=[],queue=Promise.resolve(),busy=false,ready=false;
  const unsaved=new Map();
  function element(tag,content,cls){
    const x=document.createElement(tag);
    if(typeof content==='string')x.textContent=content;
    if(cls)x.className=cls;
    return x;
  }
  function status(text,bad=false){
    if(notice){notice.textContent=text;notice.style.color=bad?'#a62738':'#496781';}
    if(retryButton)retryButton.hidden=!unsaved.size;
  }
  function authHeaders(extra={}){
    const token=getToken?.();
    if(!token)throw new Error('Session expirée : reconnecte-toi.');
    return {'apikey':publicKey,'Authorization':'Bearer '+token,'Content-Type':'application/json',...extra};
  }
  async function req(path,{method='GET',body=null,prefer=''}={}){
    const headers=authHeaders(prefer?{'Prefer':prefer}:{});
    const res=await fetch(PROJECT+'/rest/v1/'+path,{
      method,headers,cache:'no-store',...(body!==null?{body:JSON.stringify(body)}:{})
    });
    if(!res.ok){
      // Ne jamais exposer les informations internes de Supabase ou la réponse brute.
      throw new Error('Archive inaccessible (HTTP '+res.status+').');
    }
    if(res.status===204)return null;
    const txt=await res.text();
    return txt?JSON.parse(txt):null;
  }
  async function who(){
    const res=await fetch(PROJECT+'/auth/v1/user',{headers:authHeaders(),cache:'no-store'});
    if(!res.ok)throw new Error('Compte de test non authentifié.');
    const u=await res.json();
    if(!UUID.test(u.id||''))throw new Error('Compte utilisateur invalide.');
    return u.id;
  }
  const p=(v)=>encodeURIComponent(v);
  async function list(){
    const rows=await req('angel_v2_conversations?user_id=eq.'+p(ownerId)+
      '&select=id,title,status,created_at,updated_at,archived_at'+
      '&order=updated_at.desc&limit=100');
    return Array.isArray(rows)?rows:[];
  }
  async function messages(id){
    if(!UUID.test(id))throw new Error('Identifiant de conversation incorrect.');
    let allRows=[];
    for(let offset=0;offset<5000;offset+=200){
      const rows=await req('angel_v2_conversation_messages?user_id=eq.'+p(ownerId)+
        '&conversation_id=eq.'+p(id)+'&select=speaker,body,client_message_id,created_at'+
        '&order=created_at.asc,id.asc&limit=200&offset='+offset);
      allRows.push(...rows);
      if(rows.length<200)return allRows;
    }
    throw new Error('Historique trop long pour cette bêta.');
  }
  async function create(){
    const rows=await req('angel_v2_conversations?select=id,title,status,created_at,updated_at,archived_at',{
      method:'POST',prefer:'return=representation',
      body:{user_id:ownerId,title:'Nouvelle conversation',status:'active'}
    });
    if(!rows?.[0])throw new Error('Impossible de créer une conversation.');
    return rows[0];
  }
  async function change(id,data){
    const rows=await req('angel_v2_conversations?id=eq.'+p(id)+'&user_id=eq.'+p(ownerId)+
       '&select=id,title,status,created_at,updated_at,archived_at',{
      method:'PATCH',prefer:'return=representation',body:data
    });
    if(!rows?.[0])throw new Error('Conversation inaccessible.');
    return rows[0];
  }
  async function storeFinal(id,entry){
    // L'index unique (user_id, client_message_id) empêche les doublons au retry.
    await req('angel_v2_conversation_messages?on_conflict=user_id,client_message_id',{
      method:'POST',prefer:'resolution=ignore-duplicates,return=minimal',
      body:{
        conversation_id:id,user_id:ownerId,
        client_message_id:entry.id,speaker:entry.speaker,body:entry.body
      }
    });
  }
  function addFinal(entry){
    if(!current || !ready)return;
    if(!UUID.test(entry.id)||!['user','assistant'].includes(entry.speaker)||
      typeof entry.body!=='string'||!entry.body.trim())return;
    const msg={...entry,body:entry.body.trim().slice(0,6000)};
    const conversationId=current.id;
    unsaved.set(msg.id,{conversationId,msg});
    if(unsaved.size)status('Sauvegarde de la transcription en cours…');
    const operation=queue.then(async()=>{
      await storeFinal(conversationId,msg);
      unsaved.delete(msg.id);
      if(current?.id===conversationId && !historyCache.some(x=>x.client_message_id===msg.id))
        historyCache.push({client_message_id:msg.id,speaker:msg.speaker,body:msg.body});
      if(current?.id===conversationId && current.title==='Nouvelle conversation' && msg.speaker==='user'){
        const title=msg.body.replace(/\\s+/g,' ').slice(0,65);
        if(title){try{current=await change(conversationId,{title,updated_at:new Date().toISOString()});}
          catch(_){/* Le titre ne doit pas empêcher l'enregistrement du message. */}}
      }
      status(unsaved.size?'Échanges non enregistrés : réessaie.':'Transcription enregistrée dans Supabase TEST.',!!unsaved.size);
    });
    queue=operation.catch(()=>{status('Échec de sauvegarde. Réessaie avant de changer de conversation.',true);});
  }
  async function flush(){
    await queue;
    if(unsaved.size){
      const failures=[];
      for(const item of [...unsaved.values()]){
        try{await storeFinal(item.conversationId,item.msg);unsaved.delete(item.msg.id);}
        catch(e){failures.push(e);}
      }
      if(failures.length)throw new Error('Des messages ne sont pas enregistrés. Clique sur « Réessayer » avant de continuer.');
    }
  }
  async function showMessageThread(conversation){
    const lines=await messages(conversation.id);
    historyCache=lines;
    transcript.load(lines);
    current=conversation;
    if(titleEl)titleEl.textContent=conversation.title;
  }
  function render(){
    if(!listEl)return;
    listEl.replaceChildren();
    for(const c of all.filter(x=>x.status==='archived').slice(0,30)){
      const row=element('div',null,'archive-row');
      const title=element('span',c.title||'Conversation');
      const btn=element('button','Reprendre','secondary');
      btn.type='button';
      btn.addEventListener('click',()=>{void switchTo(c.id);});
      const del=element('button','Supprimer','secondary');del.type='button';
      del.addEventListener('click',()=>{
        if(window.confirm('Supprimer définitivement cette conversation et ses messages ?'))
          void removeArchived(c.id);
      });
      row.append(title,btn,del);listEl.append(row);
    }
    if(!listEl.childNodes.length)listEl.append(element('p','Aucune conversation archivée.','muted'));
  }
  async function refresh(){all=await list();render();}
  async function removeArchived(id){
    if(!ready||busy||!UUID.test(id))return;
    busy=true;
    try{
      await flush();
      const rows=await req('angel_v2_conversations?id=eq.'+p(id)+'&user_id=eq.'+p(ownerId)+
        '&status=eq.archived&select=id',{
        method:'DELETE',prefer:'return=representation'
      });
      if(!rows?.[0])throw new Error('Conversation introuvable ou non archivée.');
      await refresh();
      status('Conversation et transcriptions supprimées.');
    }catch(e){status('Suppression impossible : '+e.message,true);}
    finally{busy=false;}
  }
  async function show(){
    if(busy)return;
    busy=true;ownerId=null;ready=false;
    if(panel)panel.hidden=false;
    if(newButton)newButton.disabled=true;
    status('Vérification de l’accès aux archives…');
    try{
      ownerId=await who();
      all=await list();
      const active=all.filter(x=>x.status==='active');
      if(active.length){
        await showMessageThread(active[0]);
        for(const duplicate of active.slice(1)){
          await change(duplicate.id,{status:'archived',archived_at:new Date().toISOString()});
        }
      }else{
        current=await create();historyCache=[];transcript.load([]);
        titleEl.textContent=current.title;
      }
      ready=true;
      await refresh();
      status('Conversation synchronisée. Seules les transcriptions finales sont sauvegardées.');
      if(newButton)newButton.disabled=false;
      return true;
    }catch(e){
      ready=false;status('Archives indisponibles : '+e.message,true);return false;
    }finally{busy=false;}
  }
  async function switchTo(conversationId=null){
    if(!ready||busy)return;
    busy=true;newButton.disabled=true;
    try{
      onSwitch?.(); // Stoppe le micro et finalise le dernier tour avant le changement.
      await flush();
      if(current){
        await change(current.id,{status:'archived',archived_at:new Date().toISOString()});
        current=null;
      }
      if(conversationId){
        const resumed=await change(conversationId,{status:'active',archived_at:null});
        await showMessageThread(resumed);
        status('Ancien fil repris. Redémarre le micro pour poursuivre.');
      }else{
        current=await create();historyCache=[];transcript.load([]);
        titleEl.textContent=current.title;
        status('Nouvelle conversation créée : la précédente est archivée.');
      }
      await refresh();
    }catch(e){status('Impossible de changer de conversation : '+e.message,true);}
    finally{busy=false;newButton.disabled=false;}
  }
  async function retry(){
    if(busy)return;
    busy=true;retryButton.disabled=true;
    try{await flush();status('Tous les messages ont été sauvegardés.');}
    catch(e){status(e.message,true);}
    finally{retryButton.disabled=false;busy=false;}
  }
  function init(config){
    if(config.baseUrl!==PROJECT)throw new Error('Archivage réservé à Supabase Ángel V2 TEST.');
    publicKey=config.publicKey;getToken=config.getToken;onSwitch=config.onSwitch;transcript=config.transcript;
    if(!transcript?.setFinalHandler||!transcript?.load)throw new Error('Gestion des sous-titres manquante.');
    const s=document.createElement('style');
    s.textContent='.archive-row{display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid #e3eaf2;padding:8px 0}.archive-row span{font-size:13px;overflow-wrap:anywhere}.archive-row button{padding:8px 12px;font-size:12px}.archive-list{margin-top:12px;display:grid;gap:5px}.archive-status{font-size:13px;color:#496781;margin:10px 0}@media(max-width:580px){.archive-row button{width:auto}}';
    document.head.append(s);
    panel=element('section',null,'card');panel.id='angel-archive-panel';panel.hidden=true;
    const heading=element('h2','Mes conversations (TEST)');
    titleEl=element('p','Nouvelle conversation','muted');
    notice=element('p','Vérification…','archive-status');
    newButton=element('button','+ Nouvelle conversation','secondary');newButton.type='button';
    newButton.disabled=true;newButton.addEventListener('click',()=>{void switchTo();});
    retryButton=element('button','Réessayer les sauvegardes','secondary');retryButton.type='button';retryButton.hidden=true;
    retryButton.addEventListener('click',()=>{void retry();});
    const actions=element('div',null,'actions');actions.append(newButton,retryButton);
    const details=document.createElement('details');
    const summary=element('summary','Conversations archivées');
    listEl=element('div',null,'archive-list');details.append(summary,listEl);
    const privacy=element('p','Seul le texte final de tes échanges est conservé dans Supabase TEST. Aucun enregistrement audio brut.','note');
    panel.append(heading,titleEl,notice,actions,details,privacy);
    document.getElementById('voicePanel').insertAdjacentElement('afterend',panel);
    transcript.setFinalHandler(addFinal);
    window.addEventListener('beforeunload',event=>{
      if(unsaved.size){event.preventDefault();event.returnValue='';}
    });
  }
  function context(){
    // Historique récupéré depuis un stockage protégé : pure donnée, jamais directive.
    const recent=historyCache.slice(-10).map(x=>({
      role:x.speaker==='assistant'?'assistant':'user',
      text:String(x.body).slice(0,400)
    }));
    return JSON.stringify(recent).replace(/</g,'\\u003c').replace(/>/g,'\\u003e');
  }
  function hide(){
    if(panel)panel.hidden=true;
    ownerId=null;ready=false;current=null;all=[];historyCache=[];
    if(transcript)transcript.load([]);
    if(titleEl)titleEl.textContent='Nouvelle conversation';
  }
  async function logoutAllowed(){
    try{await flush();return true;}
    catch(e){status(e.message,true);return false;}
  }
  window.AngelConversationArchive={init,show,hide,context,logoutAllowed,isReady:()=>ready&&!busy};
})();
