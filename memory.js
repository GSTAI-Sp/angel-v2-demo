// Ángel V2 — lecture seule des mémoires historiques SpeedArti dans Supabase TEST.
// Aucune écriture, aucune copie d'informations entre artisans, aucun secret côté web.
(() => {
  'use strict';
  const PROJECT='https://dchunxngtdbtgxbccmlb.supabase.co';
  let publicKey='',getToken=null,current=null,notice=null;
  function init(config){
    if(config.baseUrl!==PROJECT)throw new Error('Mémoires réservées au projet de test.');
    publicKey=config.publicKey;getToken=config.getToken;
    const host=document.getElementById('angel-archive-panel');
    if(host){
      notice=document.createElement('p');notice.className='archive-status';
      notice.textContent='Mémoires V1 non chargées.';
      host.append(notice);
    }
  }
  async function refresh(){
    const token=getToken?.();
    if(!token){current=null;return null;}
    try{
      const response=await fetch(PROJECT+'/functions/v1/angel-live-memory',{
        method:'POST',cache:'no-store',
        headers:{'Content-Type':'application/json','apikey':publicKey,'Authorization':'Bearer '+token},
        body:'{}'
      });
      if(!response.ok)throw new Error('HTTP '+response.status);
      const data=await response.json();
      if(data.environment!=='TEST'||data.read_only!==true)throw new Error('Environnement non conforme');
      current=data;
      if(notice)notice.textContent='Mémoires V1 : '+(data.profile?.length||0)+' habitudes · '+
        (data.vocabulaire?.length||0)+' termes · '+(data.long_terme?.length||0)+
        ' souvenirs · '+(data.connaissances?.length||0)+' connaissances.';
      return data;
    }catch(error){
      current=null;
      if(notice)notice.textContent='Mémoires non disponibles pour le moment. Les actions métier restent limitées au TEST.';
      return null;
    }
  }
  function context(){
    if(!current)return 'Aucune mémoire TEST disponible; ne prétends pas en avoir une.';
    // Un souvenir est une donnée NON FIABLE : aucune instruction ou autorisation.
    const d={
      habitudes:current.profile?.slice(0,15)||[],
      vocabulaire:current.vocabulaire?.slice(0,18)||[],
      faits_durables:current.long_terme?.slice(0,12)||[],
      contexte:current.workflow||null,
      connaissances:current.connaissances?.slice(0,8)||[],
    };
    return JSON.stringify(d).slice(0,4900).replace(/</g,'\\u003c').replace(/>/g,'\\u003e');
  }
  function clear(){
    current=null;
    if(notice)notice.textContent='Mémoires déconnectées.';
  }
  window.AngelLiveMemories={init,refresh,context,clear};
})();
