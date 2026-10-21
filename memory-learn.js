// Ángel V2 — validation humaine d'une suggestion mémoire.
// Gemini peut UNIQUEMENT appeler propose(); seul le clic de l'artisan peut appeler save().
(() => {
  'use strict';
  const TEST_URL='https://dchunxngtdbtgxbccmlb.supabase.co';
  const types=new Set(['vocabulaire','preference','souvenir']);
  const vocabTypes=new Set(['synonyme','raccourci','correction','expression_regionale']);
  const categories=new Set(['materiaux_favoris','zones_intervention']);
  let getToken=null,pubKey='',refresh=null,panel=null,summary=null,notice=null,approval=null,voiceStatus=null,manualDetails=null,quickBtn=null;
  let proposal=null,busy=false;
  function elem(tag,content,cls){
    const e=document.createElement(tag);
    if(content!==undefined&&content!==null)e.textContent=content;
    if(cls)e.className=cls;
    return e;
  }
  function validText(value,max,min=2) {
    if(typeof value!=='string')return null;
    const s=value.replace(/\s+/g,' ').trim();
    if(s.length<min||s.length>max)return null;
    return s;
  }
  function makeProposal(args) {
    if(!args || typeof args!=='object'||!types.has(args.type))
      throw new Error('Type de mémoire inconnu.');
    if(args.type==='vocabulaire'){
      const source=validText(args.source,55),cible=validText(args.cible,95),
        vocab_type=args.vocab_type||'synonyme';
      if(!source||!cible||!vocabTypes.has(vocab_type))
        throw new Error('Terme métier et signification nécessaires.');
      return {type:'vocabulaire',source,cible,vocab_type};
    }
    if(args.type==='preference'){
      const raw=args.valeur??args.contenu??args.description??args.texte;
      const categorie=args.categorie;
      const valeur=validText(raw,110);
      if(valeur && categories.has(categorie))
        return {type:'preference',valeur,categorie};
      // Les préférences de communication, devis, durée, vocabulaire et
      // habitudes ne sont PAS des matériaux/zones. La mémoire long terme V1
      // les accepte sans imposer un enum de profil artisan inadapté.
      const souvenir=validText(raw,240,8);
      if(souvenir) return {type:'souvenir',contenu:souvenir};
      throw new Error('Précise ce que tu souhaites faire retenir à Ángel.');
    }
    const contenu=validText(args.contenu,240,8);
    if(!contenu)throw new Error('Précise le souvenir en une phrase.');
    return {type:'souvenir',contenu};
  }
  function pretty(x){
    if(x.type==='vocabulaire')return 'Vocabulaire BTP : « '+x.source+' » signifie « '+x.cible+' ».';
    if(x.type==='preference')return (x.categorie==='materiaux_favoris'?'Matériau favori':'Zone d’intervention')+' : '+x.valeur+'.';
    return 'Souvenir utile : '+x.contenu;
  }
  function setStatus(text,error=false){
    if(notice){notice.textContent=text;notice.style.color=error?'#ae2935':'#496781';}
    if(voiceStatus){
      voiceStatus.textContent=text;
      voiceStatus.style.color=error?'#ae2935':'#1d4873';
    }
  }
  function propose(args){
    if(!getToken?.())return {status:'non_connecte',message:'Compte TEST requis.'};
    if(proposal){
      if(panel)panel.scrollIntoView({behavior:'smooth',block:'start'});
      setStatus('Une mémoire est déjà en attente : confirme-la ou refuse-la avant toute nouvelle proposition.');
      return {status:'confirmation_deja_en_attente',message:'Une mémoire attend ton choix dans le panneau. Confirme ou annule avant d’en proposer une autre.'};
    }
    try{
      proposal=makeProposal(args);
      panel.hidden=false;
      approval.hidden=false;
      summary.textContent=pretty(proposal);
      setStatus('⚠ NON ENREGISTRÉE — clique sur « Confirmer cette mémoire » pour la sauvegarder dans Supabase TEST.');
      // Affichage immédiatement sous les boutons vocaux, jamais au bas d'un menu replié.
      panel.scrollIntoView({behavior:'smooth',block:'start'});
      return {status:'confirmation_humaine_requise',memoire:pretty(proposal),
        message:'L’artisan doit cliquer sur « Confirmer cette mémoire » dans la démo. Ne prétends pas que l’enregistrement est effectué.'};
    }catch(e){
      setStatus('Proposition refusée : '+e.message,true);
      return {status:'proposition_invalide',message:e.message};
    }
  }
  function fromVoiceText(text){
    // Rattrapage local pour le cas où Gemini Live répond « je ne peux pas »
    // au lieu d'utiliser son outil. La proposition reste NON enregistrée.
    const candidate=window.AngelMemoryIntent?.extract(text);
    if(!candidate)return {status:'aucune_demande_explicite'};
    return propose(candidate);
  }
  async function save(){
    if(!proposal||busy)return;
    busy=true;const button=document.getElementById('angel-memory-confirm');
    button.disabled=true;
    try{
      const token=getToken?.();
      if(!token)throw new Error('Reconnecte-toi avant de confirmer.');
      // Le seul point d'appel POST est dans ce gestionnaire de clic.
      const r=await fetch(TEST_URL+'/functions/v1/angel-live-memory-save',{
        method:'POST',cache:'no-store',headers:{
          'Content-Type':'application/json','apikey':pubKey,'Authorization':'Bearer '+token
        },body:JSON.stringify({...proposal,action:'enregistrer_memoire',confirmation:true})
      });
      const body=await r.json().catch(()=>({}));
      if(!r.ok||body.saved!==true)throw new Error(String(body.error||'Échec de mémorisation.'));
      // Le POST est accepté, mais on ne dit « retenu » que si la relecture
      // via le service mémoire confirme bien la nouvelle donnée.
      const justSaved=proposal;
      const readback=refresh ? await refresh() : null;
      const verified=readback && (
        (justSaved.type==='souvenir' && (readback.long_terme||[]).some(
          m=>m.fait===justSaved.contenu)) ||
        (justSaved.type==='vocabulaire' && (readback.vocabulaire||[]).some(
          m=>m.source===justSaved.source && m.cible===justSaved.cible)) ||
        (justSaved.type==='preference' && (readback.profile||[]).some(
          m=>m.categorie===justSaved.categorie && m.valeur?.texte===justSaved.valeur))
      );
      proposal=null;approval.hidden=true;
      if(verified){
        setStatus('✓ MÉMOIRE VÉRIFIÉE : enregistrée et retrouvée dans Supabase TEST. Redémarre le micro pour le rappel.');
      }else{
        setStatus('⚠ Enregistrement accepté, mais la relecture n’a pas confirmé la mémoire. Redémarre le micro ou réessaie plus tard.',true);
      }
    }catch(err){
      setStatus('✗ MÉMOIRE NON ENREGISTRÉE : '+err.message,true);
    }finally{busy=false;button.disabled=false;}
  }
  function cancel(){
    if(busy)return;
    proposal=null;
    approval.hidden=true;
    setStatus('Proposition annulée : aucune mémoire enregistrée.');
  }
  function init(config){
    if(config.baseUrl!==TEST_URL)throw new Error('Mémoire TEST uniquement.');
    pubKey=config.publicKey;getToken=config.getToken;refresh=config.refresh;
    if(config.transcripts?.setFinalUserHandler)config.transcripts.setFinalUserHandler(line=>fromVoiceText(line.body));
    const style=elem('style');
    style.textContent='.angel-memory-learn{max-width:680px}.angel-memory-preview{border:1px solid #b9d8f6;background:#f2f8ff;border-radius:10px;padding:16px;margin-top:12px;font-size:14px;line-height:1.6}.angel-memory-learn select{width:100%;padding:11px 12px;border:1px solid #cbd8e8;border-radius:8px;background:#fff;color:#172b4b;font-size:15px}.angel-memory-learn .note{margin:8px 0}.angel-memory-learn .actions{margin:14px 0}.angel-memory-learn form{margin-top:14px}.angel-memory-learn .hidden-field{display:none}.angel-memory-learn textarea{font:inherit;width:100%;min-height:60px;padding:12px;border:1px solid #cbd8e8;border-radius:8px}';
    document.head.append(style);
    panel=elem('section',null,'card angel-memory-learn');panel.id='angel-memory-learn-panel';panel.hidden=true;
    const title=elem('h2','Apprentissage contrôlé d’Ángel');
    const intro=elem('p','Dis « Ángel, retiens que… » ou clique sur « Écrire une mémoire ». Le texte n’est sauvegardé qu’après clic sur « Confirmer cette mémoire ».','muted');
    notice=elem('p','Aucune mémoire en attente.','archive-status');
    approval=elem('div',null,'angel-memory-preview');approval.hidden=true;
    const apt=elem('h3','Information à mémoriser');apt.style.margin='0 0 8px';
    summary=elem('p','');
    const confirm=elem('button','Confirmer cette mémoire','primary');confirm.id='angel-memory-confirm';confirm.type='button';confirm.addEventListener('click',()=>{void save();});
    const refuse=elem('button','Ne pas mémoriser','secondary');refuse.type='button';refuse.addEventListener('click',cancel);
    const actions=elem('div',null,'actions');actions.append(confirm,refuse);
    approval.append(apt,summary,actions);
    const details=document.createElement('details');manualDetails=details;
    const head=elem('summary','Mémoriser sans le microphone');details.append(head);
    const form=document.createElement('form');
    const chooser=elem('select');chooser.id='angel-memo-type';
    for(const [v,t] of [['vocabulaire','Terme métier / abréviation'],['preference','Préférence artisan'],['souvenir','Souvenir utile']]){
      const o=elem('option',t);o.value=v;chooser.append(o);
    }
    const field=(label,placeholder)=>{
      const block=elem('div');
      const lab=elem('label',label);
      const input=elem('input');input.required=true;input.placeholder=placeholder;
      block.append(lab,input);
      return {block,input};
    };
    const source=field('Terme prononcé','ex. : ml');
    const target=field('Signification','ex. : mètre linéaire');
    const val=field('Préférence','ex. : lames en pin');
    const content=field('Souvenir factuel','ex. : Je préfère des réponses courtes sur les devis');
    const cat=elem('select');for(const [v,t] of [['materiaux_favoris','Matériaux favoris'],['zones_intervention','Zones d’intervention']]){
      const o=elem('option',t);o.value=v;cat.append(o);
    }
    const pref=elem('div');pref.append(elem('label','Type de préférence'),cat,val.block);
    const vocab=elem('div');vocab.append(source.block,target.block);
    const souvenir=elem('div');souvenir.append(content.block);
    function update(){
      const t=chooser.value;
      vocab.hidden=t!=='vocabulaire';pref.hidden=t!=='preference';souvenir.hidden=t!=='souvenir';
      source.input.required=target.input.required=t==='vocabulaire';
      val.input.required=t==='preference';
      content.input.required=t==='souvenir';
    }
    chooser.addEventListener('change',update);
    const proposeButton=elem('button','Préparer cette mémoire','secondary');
    proposeButton.type='submit';
    form.append(elem('label','Choisis le type'),chooser,vocab,pref,souvenir,proposeButton);
    form.addEventListener('submit',e=>{
      e.preventDefault();
      const t=chooser.value;
      propose(t==='vocabulaire'?{type:t,source:source.input.value,cible:target.input.value,vocab_type:'synonyme'}:
        t==='preference'?{type:t,valeur:val.input.value,categorie:cat.value}:
        {type:t,contenu:content.input.value});
    });
    update();details.append(form);
    panel.append(title,intro,notice,approval,details);
    // Le panneau est placé juste sous la conversation, avant les archives et modules métiers.
    document.getElementById('voicePanel').insertAdjacentElement('afterend',panel);
    quickBtn=elem('button','🧠 Écrire une mémoire','secondary');
    quickBtn.type='button';quickBtn.id='angel-memory-open';
    quickBtn.addEventListener('click',()=>{
      panel.hidden=false;manualDetails.open=true;
      panel.scrollIntoView({behavior:'smooth',block:'start'});
    });
    const stopButton=document.getElementById('stopBtn');
    stopButton.insertAdjacentElement('afterend',quickBtn);
    voiceStatus=elem('p','Mémoire : rien de nouveau enregistré. Pour enregistrer, une confirmation écrite est obligatoire.','archive-status');
    voiceStatus.id='angel-memory-save-status';
    voiceStatus.setAttribute('role','status');
    voiceStatus.setAttribute('aria-live','polite');
    document.getElementById('voicePanel').append(voiceStatus);
  }
  function show(){if(panel)panel.hidden=false;}
  function hide(){
    if(panel)panel.hidden=true;
    proposal=null;
    if(approval)approval.hidden=true;
    if(voiceStatus)voiceStatus.textContent='Mémoire : aucune sauvegarde en cours.';
  }
  window.AngelMemoryLearning={init,show,hide,propose,fromVoiceText};
})();
