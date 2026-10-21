// Ángel V2 — prévisualisation intégrale locale (SANS archivage serveur).
// Les transcriptions ne quittent pas la page via ce module. Ne pas présenter
// cette interface comme une archive sauvegardée : migration RLS en attente.
(() => {
  'use strict';
  let history=null, partialUser='', partialAssistant='', turns=0, onFinal=null;
  function join(a,b){
    const current=a.trim(), next=(typeof b==='string'?b:'').trim();
    if(!next)return current;
    if(!current)return next;
    if(current===next||current.endsWith(next))return current;
    if(next.startsWith(current))return next;
    for(let len=Math.min(current.length,next.length);len>=4;len--){
      if(current.endsWith(next.slice(0,len)))return (current+next.slice(len)).slice(0,6000);
    }
    return (current+(/^[,.;:!?]/.test(next)?'':' ')+next).slice(0,6000);
  }
  function line(speaker,body,emit=true) {
    if(!history||!body.trim())return;
    const row=document.createElement('div');
    row.className='history-line';
    const role=document.createElement('strong');
    role.textContent=speaker==='user'?'Toi : ':'Ángel : ';
    const text=document.createElement('span');
    text.textContent=body.trim();
    row.append(role,text);
    history.append(row);
    turns+=1;
    history.scrollTop=history.scrollHeight;
    if(emit && onFinal)onFinal({id:crypto.randomUUID(),speaker,body:body.trim(),timestamp:Date.now()});
  }
  function finish(){
    if(partialUser)line('user',partialUser);
    if(partialAssistant)line('assistant',partialAssistant);
    partialUser='';partialAssistant='';
  }
  function input(text){
    partialUser=join(partialUser,text);
    document.getElementById('heard').textContent=partialUser||'—';
  }
  function output(text){
    partialAssistant=join(partialAssistant,text);
    document.getElementById('said').textContent=partialAssistant||'—';
  }
  function init(){
    const host=document.querySelector('#voicePanel .log');
    if(!host)return;
    const heading=document.createElement('div');
    heading.className='history-heading';
    heading.textContent='Historique de la conversation en cours';
    const notice=document.createElement('p');
    notice.className='history-notice';
    notice.textContent='Prévisualisation locale : visible durant cette page, non archivée tant que le stockage sécurisé n’est pas activé.';
    const div=document.createElement('div');
    div.id='transcriptHistory';div.className='transcript-history';
    div.setAttribute('aria-live','polite');
    const first=document.createElement('p');
    first.textContent='Les échanges s’afficheront ici au fur et à mesure.';
    first.className='history-empty';
    div.append(first);
    history=div;
    host.insertAdjacentElement('afterend',div);
    host.insertAdjacentElement('afterend',notice);
    host.insertAdjacentElement('afterend',heading);
  }
  function interrupted(){finish();}
  function turnComplete(){
    if(!history)return;
    if(history.querySelector('.history-empty'))history.querySelector('.history-empty').remove();
    finish();
  }
  function close(){turnComplete();}
  function load(items){
    if(!history)return;
    history.replaceChildren();
    for(const item of items||[]){if(item && (item.speaker==='user'||item.speaker==='assistant') && typeof item.body==='string')line(item.speaker,item.body,false);}
    partialUser='';partialAssistant='';
    document.getElementById('heard').textContent='—';document.getElementById('said').textContent='—';
  }
  function setFinalHandler(callback){onFinal=callback;}
  function reset(){
    partialUser='';partialAssistant='';turns=0;
    if(history)history.replaceChildren();
    document.getElementById('heard').textContent='—';
    document.getElementById('said').textContent='—';
  }
  window.AngelTranscriptPreview={init,input,output,turnComplete,interrupted,close,reset,load,setFinalHandler};
})();
