// Ángel V2 — validation humaine d'une suggestion mémoire.
// Gemini peut UNIQUEMENT appeler propose(); seul le clic de l'artisan peut appeler save().
(() => {
  'use strict';
  const TEST_URL='https://dchunxngtdbtgxbccmlb.supabase.co';
  const types=new Set(['vocabulaire','preference','souvenir']);
  const vocabTypes=new Set(['synonyme','raccourci','correction','expression_regionale']);
  const categories=new Set(['materiaux_favoris','zones_intervention']);
  let getToken=null,pubKey='',refresh=null,panel=null,summary=null,notice=null,approval=null;
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
      const valeur=validText(args.valeur,110),categorie=args.categorie;
      if(!valeur||!categories.has(categorie))
        throw new Error('Préférence matériau ou zone manquante.');
      return {type:'preference',valeur,categorie};
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
  }
  function propose(args){
    if(!getToken?.())return {status:'non_connecte',message:'Compte TEST requis.'};
    try{
      proposal=makeProposal(args);
      panel.hidden=false;
      approval.hidden=false;
      summary.textContent=pretty(proposal);
      setStatus('Cette information n’est pas encore mémorisée. Vérifie-la puis clique sur Confirmer.');
      approval.scrollIntoView({behavior:'smooth',block:'nearest'});
      return {status:'confirmation_humaine_requise',memoire:pretty(proposal),
        message:'L’artisan doit cliquer sur « Confirmer cette mémoire » dans la démo. Ne prétends pas que l’enregistrement est effectué.'};
    }catch(e){
      setStatus('Proposition refusée : '+e.message,true);
      return {status:'proposition_invalide',message:e.message};
    }
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
      proposal=null;approval.hidden=true;
      setStatus('Mémoire enregistrée dans SpeedArti TEST. Redémarre le micro pour vérifier qu’Ángel s’en souvient.');
      if(refresh)await refresh();
    }catch(err){
      setStatus('Mémoire non enregistrée : '+err.message,true);
    }finally{busy=false;button.disabled=false;}
  }
  function cancel(){
    if(busy)return;
    proposal=null;
    approval.hidden=true;
    setStatus('Proposition annulée, aucune mémoire enregistrée.');
  }
  function init(config){
    if(config.baseUrl!==TEST_URL)throw new Error('Mémoire TEST uniquement.');
    pubKey=config.publicKey;getToken=config.getToken;refresh=config.refresh;
    const style=elem('style');
    style.textContent='.angel-memory-learn{max-width:680px}.angel-memory-preview{border:1px solid #b9d8f6;background:#f2f8ff;border-radius:10px;padding:16px;margin-top:12px;font-size:14px;line-height:1.6}.angel-memory-learn select{width:100%;padding:11px 12px;border:1px solid #cbd8e8;border-radius:8px;background:#fff;color:#172b4b;font-size:15px}.angel-memory-learn .note{margin:8px 0}.angel-memory-learn .actions{margin:14px 0}.angel-memory-learn form{margin-top:14px}.angel-memory-learn .hidden-field{display:none}.angel-memory-learn textarea{font:inherit;width:100%;min-height:60px;padding:12px;border:1px solid #cbd8e8;border-radius:8px}';
    document.head.append(style);
    panel=elem('section',null,'card angel-memory-learn');panel.id='angel-memory-learn-panel';panel.hidden=true;
    const title=elem('h2','Apprentissage contrôlé d’Ángel');
    const intro=elem('p','Dis « Ángel, retiens que… » ou utilise le formulaire ci-dessous. Rien n’est mémorisé sans ton clic de confirmation.','muted');
    notice=elem('p','Aucune mémoire en attente.','archive-status');
    approval=elem('div',null,'angel-memory-preview');approval.hidden=true;
    const apt=elem('h3','Information à mémoriser');apt.style.margin='0 0 8px';
    summary=elem('p','');
    const confirm=elem('button','Confirmer cette mémoire','primary');confirm.id='angel-memory-confirm';confirm.type='button';confirm.addEventListener('click',()=>{void save();});
    const refuse=elem('button','Ne pas mémoriser','secondary');refuse.type='button';refuse.addEventListener('click',cancel);
    const actions=elem('div',null,'actions');actions.append(confirm,refuse);
    approval.append(apt,summary,actions);
    const details=document.createElement('details');
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
    document.getElementById('angel-archive-panel').insertAdjacentElement('afterend',panel);
  }
  function show(){if(panel)panel.hidden=false;}
  function hide(){if(panel)panel.hidden=true;cancel();}
  window.AngelMemoryLearning={init,show,hide,propose};
})();
