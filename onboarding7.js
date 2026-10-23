// Ángel V2 Sprint 7 — configuration guidée TEST (sans autre base de mémoire).
(()=>{'use strict';
const TEST='https://dchunxngtdbtgxbccmlb.supabase.co';
const VOICES=[
 ['Aoede','Accueillante'],['Kore','Posée'],['Puck','Dynamique'],
 ['Charon','Informative'],['Leda','Jeune'],['Zephyr','Claire'],
 ['Sulafat','Chaleureuse'],['Fenrir','Énergique']
];
const LANGUAGES=[
 ['none','Français uniquement'],['en-US','Anglais'],['es-US','Espagnol'],
 ['it-IT','Italien'],['pt-BR','Portugais'],['de-DE','Allemand']
];
const TRADES=[
 ['general','Général'],['couvreur','Couverture'],['charpentier','Charpente'],
 ['plombier','Plomberie'],['electricien','Électricité'],['macon','Maçonnerie'],
 ['plaquiste','Plaquiste'],['terrassier','Terrassement'],['menuisier','Menuiserie']
];
const BASIC={
 voice_name:'Aoede',main_language:'fr-FR',secondary_language:'none',
 address_mode:'vous',reply_style:'court',expertise_level:'professionnel',
 primary_trade:'general',preferred_unit:'m2',onboarding_completed:false,
 onboarding_step:0,barge_in_enabled:true,manual_mic_stop_enabled:true
};
const QUESTIONS={
 general:['Une abréviation utilisée dans vos devis','Un mot local utilisé sur vos chantiers','Une expression pour une finition','Un surnom de matériau','Une phrase que vous dites régulièrement'],
 couvreur:['Le nom que vous donnez à une pièce de toiture','Une expression pour une réparation','Un nom local de tuile','Une abréviation de couverture','Votre expression pour une finition'],
 plombier:['Un nom utilisé pour un raccord','Un raccourci pour une canalisation','Un terme habituel pour une robinetterie','Une expression pour une intervention','Un mot régional de plomberie'],
 electricien:['Une abréviation de tableau','Un raccourci pour une prise','Une expression de diagnostic','Un nom de matériel que vous utilisez','Un terme local de chantier']
};
let cfg=null,panel=null,profile={...BASIC},draft={...BASIC},step=0;
let busy=false,notice=null,quiz=0,lastWord=null,wordCount=0;
let proposedLanguage=null,sessionLanguage='fr-FR',guideSpeaking=false;
let draftApplied=false,connected=false,initiated=false;
const $=id=>document.getElementById(id);
const elt=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el};
function message(text,error=false){
 if(notice){notice.textContent=text;notice.style.color=error?'#a62b3c':'#305a83'}
}
function voiceStop(){
 if(typeof speechSynthesis!=='undefined')speechSynthesis.cancel();
 guideSpeaking=false;
}
function speak(text,preview=false){
 voiceStop();
 if(!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window)){
  message('Lecture vocale locale indisponible dans ce navigateur ; suis le guide à l’écran.',true);return false;
 }
 const utterance=new SpeechSynthesisUtterance(text);
 utterance.lang='fr-FR';utterance.rate=.95;utterance.volume=1;
 // L'aperçu TTS est celui du navigateur. Il n'imite pas la voix Google Gemini.
 const french=speechSynthesis.getVoices().filter(v=>v.lang.toLowerCase().startsWith('fr'));
 if(french.length)utterance.voice=french[0];
 utterance.onend=()=>{guideSpeaking=false};
 guideSpeaking=true;
 speechSynthesis.speak(utterance);
 if(preview)message('Écoute indicative du téléphone, pas un échantillon Gemini. Utilise « Tester avec Ángel » pour entendre la voix choisie.');
 return true;
}
async function call(action,args={}){
 if(!cfg?.getToken?.())throw Error('Reconnecte-toi au compte TEST.');
 const res=await fetch(TEST+'/functions/v1/angel-live-metier',{
  method:'POST',cache:'no-store',headers:{
   apikey:cfg.publicKey,Authorization:'Bearer '+cfg.getToken(),'Content-Type':'application/json'
  },body:JSON.stringify({action,args})
 });
 const body=await res.json().catch(()=>({}));
 if(!res.ok||body.fictif!==true)throw Error(String(body.error||'Service de configuration TEST indisponible').slice(0,180));
 return body;
}
function cleanProfile(p){
 const result={...BASIC};
 for(const key of ['voice_name','secondary_language','address_mode','reply_style','expertise_level','primary_trade','preferred_unit'])
  if(typeof p?.[key]==='string')result[key]=p[key];
 result.voice_name=VOICES.some(v=>v[0]===result.voice_name)?result.voice_name:'Aoede';
 result.secondary_language=LANGUAGES.some(v=>v[0]===result.secondary_language)?result.secondary_language:'none';
 result.primary_trade=TRADES.some(v=>v[0]===result.primary_trade)?result.primary_trade:'general';
 result.address_mode=['tu','vous'].includes(result.address_mode)?result.address_mode:'vous';
 result.reply_style=['court','detaille'].includes(result.reply_style)?result.reply_style:'court';
 result.expertise_level=['debutant','professionnel'].includes(result.expertise_level)?result.expertise_level:'professionnel';
 result.preferred_unit=['m2','m3','ml','u'].includes(result.preferred_unit)?result.preferred_unit:'m2';
 result.main_language='fr-FR';result.barge_in_enabled=true;result.manual_mic_stop_enabled=true;
 result.onboarding_completed=p?.onboarding_completed===true;
 result.onboarding_step=Number.isInteger(p?.onboarding_step)?Math.max(0,Math.min(5,p.onboarding_step)):0;
 return result;
}
async function loadProfile(){
 const data=await call('consulter_preferences_angel');
 if(data.lecture_seule!==true||!data.profile)throw Error('Préférences TEST illisibles.');
 profile=cleanProfile(data.profile);draft={...profile};step=profile.onboarding_completed?0:profile.onboarding_step;
 initiated=true;
 return profile;
}
async function saveProfile(completed){
 if(busy)return false;
 busy=true;
 try{
  const submitted={
   voice_name:draft.voice_name,main_language:'fr-FR',
   secondary_language:draft.secondary_language,
   address_mode:draft.address_mode,reply_style:draft.reply_style,
   expertise_level:draft.expertise_level,primary_trade:draft.primary_trade,
   preferred_unit:draft.preferred_unit,
   onboarding_completed:completed===true,onboarding_step:completed?5:step,
   barge_in_enabled:true,manual_mic_stop_enabled:true,confirmation:true
  };
  const result=await call('enregistrer_preferences_angel',submitted);
  if(result.saved!==true||result.profile?.main_language!=='fr-FR'||
    result.profile?.barge_in_enabled!==true||result.profile?.manual_mic_stop_enabled!==true)
    throw Error('La confirmation du profil n’a pas été vérifiée.');
  const verified=await call('consulter_preferences_angel');
  if(verified.lecture_seule!==true||verified.profile?.voice_name!==submitted.voice_name||
    verified.profile?.secondary_language!==submitted.secondary_language||
    verified.profile?.onboarding_completed!==submitted.onboarding_completed||
    verified.profile?.main_language!=='fr-FR')
    throw Error('Enregistrement accepté, mais profil non confirmé par relecture.');
  profile=cleanProfile(verified.profile);draft={...profile};
  message(completed?'✓ Profil confirmé dans Supabase TEST. Langue principale : français.':
    '✓ Étape conservée dans Supabase TEST. Reprends à tout moment.');
  return true;
 }catch(e){message('Préférences non confirmées : '+String(e.message||e),true);return false;}
 finally{busy=false;}
}
const select=(id,options,selected)=>{
 const s=elt('select');s.id=id;s.style.width='100%';s.style.minHeight='47px';
 for(const [value,label] of options){
  const opt=elt('option',label);opt.value=value;opt.selected=value===selected;s.append(opt);
 }
 return s;
};
const field=(title,element)=>{
 const wrapper=elt('div');const l=elt('label',title);l.htmlFor=element.id;
 wrapper.append(l,element);return wrapper;
};
function buttons(){
 const actions=elt('div');actions.className='actions';
 const back=elt('button','← Précédent');back.type='button';back.className='secondary';
 back.disabled=step===0;back.onclick=()=>{voiceStop();collect();step--;render()};
 const next=elt('button',step===5?'Enregistrer mes réglages':'Continuer →');
 next.type='button';next.className='primary';
 next.onclick=async()=>{
  voiceStop();collect();
  if(step===5){
   if(await saveProfile(true)){panel.hidden=true;message('Configuration terminée. Pour modifier tes réglages, rouvre Configurer Ángel.');}
  }else{step++;render()}
 };
 const later=elt('button','Enregistrer et terminer plus tard');later.type='button';later.className='secondary';
 later.onclick=async()=>{voiceStop();collect();if(await saveProfile(false))panel.hidden=true;};
 const skip=elt('button','Passer cette étape');skip.type='button';skip.className='secondary';
 skip.onclick=()=>{voiceStop();step=Math.min(5,step+1);render()};
 const stop=elt('button','■ Couper immédiatement Ángel');stop.type='button';stop.className='secondary';
 stop.onclick=()=>{
  voiceStop();
  if(cfg.isLive?.())cfg.stopVoice?.();
  message('Voix coupée. Le micro peut toujours être arrêté à tout moment.');
 };
 actions.append(back,next,later,stop);
 if(step>0&&step<5)actions.append(skip);
 return actions;
}
function collect(){
 const voice=$('onb-voice');if(voice)draft.voice_name=voice.value;
 for(const key of ['secondary_language','primary_trade','address_mode','reply_style','expertise_level','preferred_unit']){
  const el=$('onb-'+key);if(el)draft[key]=el.value;
 }
}
function render(){
 if(!panel)return;
 const body=$('onb-body');body.replaceChildren();
 $('onb-progress').textContent='Étape '+(step+1)+' sur 6 · objectif 5 minutes, à ton rythme';
 const sub=elt('p','Tu peux interrompre Ángel pendant qu’elle parle et arrêter le microphone à tout instant. Cette sécurité ne peut pas être désactivée.');
 sub.className='onb-note';body.append(sub);
 const headline=[
  'Bienvenue chez SpeedArti','Choisis la voix d’Ángel',
  'Français principal et langues secondaires','Jeu : « Apprends mon métier, Ángel ! »',
  'Mes habitudes de travail','Vérification et confirmation'
 ][step];
 body.append(elt('h3',headline));
 if(step===0){
  body.append(elt('p','Bonjour ! Je suis Ángel, ton assistante SpeedArti. Ensemble, nous allons personnaliser ma voix, mes langues et mes expressions métier en cinq minutes environ. Tu peux me couper à tout instant.'));
  const say=elt('button','▶ Ángel, souhaite-moi la bienvenue');say.type='button';say.className='secondary';
  say.onclick=()=>speak('Bonjour et bienvenue sur SpeedArti ! Je suis Ángel, votre assistante. En cinq minutes, nous allons choisir ma voix, garder le français comme langue principale et apprendre vos expressions de chantier. Vous pouvez toujours m’interrompre ou couper le microphone.');
  body.append(say);
 }
 if(step===1){
  body.append(field('Voix Gemini Live',select('onb-voice',VOICES,draft.voice_name)));
  const preview=elt('button','▶ Écoute indicative sur cet appareil');preview.type='button';preview.className='secondary';
  preview.onclick=()=>{collect();speak('Bonjour, je suis Ángel. Je vous accompagne dans la gestion de vos chantiers et de votre entreprise.',true)};
  const real=elt('button','🎙 Tester réellement cette voix avec Ángel');real.type='button';real.className='secondary';
  real.onclick=()=>{
   collect();voiceStop();
   if(cfg.isLive?.())return message('Coupe d’abord la conversation existante, puis réessaie avec la nouvelle voix.');
   message('Ouverture de Gemini Live avec la voix '+draft.voice_name+' en mode TEST. Le micro peut demander ton autorisation.');
   cfg.startVoice?.();
  };
  body.append(elt('p','Choisis librement parmi huit voix Gemini. Les exemples de synthèse du navigateur sont indicatifs : écoute la vraie voix en lançant un test Gemini. Si tu changes de voix, termine d’abord toute conversation en cours.'));
  body.append(preview,real);
 }
 if(step===2){
  body.append(elt('p','La langue principale reste toujours le français, même après une conversation dans une autre langue.'));
  body.append(field('Langue principale (fixe)',select('onb-french',[['fr-FR','Français — obligatoire']], 'fr-FR')));
  $('onb-french').disabled=true;
  body.append(field('Langue secondaire facultative',select('onb-secondary_language',LANGUAGES,draft.secondary_language)));
  body.append(elt('p','Si tu prononces une phrase clairement dans ta langue secondaire, Ángel demandera en français si tu souhaites changer. Elle ne changera rien sans ton accord. « Repasse en français » rétablit toujours le français.'));
 }
 if(step===3){
  const list=QUESTIONS[draft.primary_trade]||QUESTIONS.general;
  const challenge=elt('p','Défi '+(quiz+1)+'/5 — '+list[quiz%list.length]);
  const term=elt('input');term.type='text';term.id='onb-term';term.maxLength=55;term.placeholder='Ton mot ou ton expression métier';
  const definition=elt('input');definition.type='text';definition.id='onb-definition';definition.maxLength=95;definition.placeholder='Ce que cette expression veut dire';
  const submit=elt('button','Préparer ce mot dans mes mémoires');submit.type='button';submit.className='primary';
  submit.onclick=()=>{
   const a=term.value.trim(),b=definition.value.trim();
   if(a.length<2||b.length<2)return message('Renseigne le terme et sa signification avant de proposer une mémoire.',true);
   lastWord={source:a,cible:b};
   const result=cfg.proposeWord?.({type:'vocabulaire',vocab_type:'expression_regionale',source:a,cible:b});
   if(result?.status==='confirmation_humaine_requise'){
    quiz=Math.min(4,quiz+1);message('Défi proposé. Confirme l’enregistrement dans le panneau mémoire existant. Rien n’est encore enregistré.');
    render();
   }else message('Le panneau mémoire n’a pas accepté cette proposition. Valide ou annule celle déjà en attente.',true);
  };
  const count=elt('p','Mots métier déjà confirmés dans ta mémoire : '+wordCount+
   '. Les propositions du jeu doivent être confirmées dans le panneau mémoire existant.');
  const reload=elt('button','Actualiser mes mots confirmés');reload.type='button';reload.className='secondary';
  reload.onclick=()=>void refreshVocabCount();
  body.append(challenge,field('Ton expression',term),field('Sa définition',definition),submit,count,reload);
  body.append(elt('p','Pas de bonne ou mauvaise réponse. Tu construis ton propre lexique métier ; tu peux corriger ou supprimer les mots dans « Mes mémoires ». Aucun doublon de base.'));
 }
 if(step===4){
  body.append(field('Métier principal',select('onb-primary_trade',TRADES,draft.primary_trade)));
  body.append(field('Comment Ángel doit s’adresser à toi',select('onb-address_mode',[['vous','Vouvoiement'],['tu','Tutoiement']],draft.address_mode)));
  body.append(field('Longueur de réponse',select('onb-reply_style',[['court','Courte'],['detaille','Détaillée']],draft.reply_style)));
  body.append(field('Niveau d’explication',select('onb-expertise_level',[['debutant','Débutant'],['professionnel','Professionnel']],draft.expertise_level)));
  body.append(field('Unité favorite d’affichage (sans modifier les quantités métier)',
   select('onb-preferred_unit',[['m2','m²'],['m3','m³'],['ml','ml'],['u','Unité']],draft.preferred_unit)));
  body.append(elt('p','Les taux de TVA, quantités et prix ne sont jamais déduits de ces préférences. Les interruptions vocales et le bouton Arrêter restent obligatoires.'));
 }
 if(step===5){
  body.append(elt('p','Vérifie ton profil avant de l’enregistrer. Les réglages de voix s’appliqueront à la prochaine conversation Gemini.'));
  const detail=elt('p',
   'Voix : '+draft.voice_name+'\nLangue principale : français\nLangue secondaire : '+
   (LANGUAGES.find(x=>x[0]===draft.secondary_language)?.[1]||'Aucune')+
   '\nMétier : '+(TRADES.find(x=>x[0]===draft.primary_trade)?.[1]||'Général')+
   '\n'+(draft.address_mode==='tu'?'Tutoiement':'Vouvoiement')+
   ' · '+(draft.reply_style==='court'?'Réponses courtes':'Réponses détaillées')+
   '\nInterruption pendant la parole : TOUJOURS ACTIVE'+
   '\nBouton « Arrêter le micro » : TOUJOURS ACTIF');
  detail.style.whiteSpace='pre-line';body.append(detail);
 }
 body.append(buttons());
}
async function open(){
 if(!cfg?.getToken?.())return;
 panel.hidden=false;
 if(!initiated){try{await loadProfile();}catch(e){message('Préférences non disponibles : '+String(e.message),true);}}
 step=profile.onboarding_completed?0:profile.onboarding_step;
 render();panel.scrollIntoView({behavior:'smooth',block:'start'});
}
async function show(){
 connected=true;
 try{
  await loadProfile();
  if(!profile.onboarding_completed){
   panel.hidden=false;render();
   message('Première configuration : bienvenue ! Lance le guide vocal ou avance avec les boutons.');
  }else panel.hidden=true;
 }catch(e){message('Profil TEST indisponible : '+String(e.message),true);}
}
function resetConversationLanguage(){
 sessionLanguage='fr-FR';proposedLanguage=null;
 if($('onb-language-ask'))$('onb-language-ask').hidden=true;
}
function hide(){
 connected=false;voiceStop();resetConversationLanguage();
 panel.hidden=true;initiated=false;draft={...BASIC};profile={...BASIC};
}
function getVoice(){return VOICES.some(v=>v[0]===draft.voice_name)?draft.voice_name:'Aoede';}
function languageInstruction(){
 const address=profile.address_mode==='tu'?'tutoie':'vouvoie';
 const style=profile.reply_style==='detaille'?'avec des explications détaillées':'brièvement';
 return 'PARAMÉTRAGE ARTISAN TEST CONFIRMÉ : tu '+address+' l’artisan et réponds '+style+
  '. Le niveau demandé est '+profile.expertise_level+
  ', métier '+profile.primary_trade+
  '. La langue principale et de sécurité est TOUJOURS le français (fr-FR). Langue secondaire autorisée : '+
  profile.secondary_language+
  '. Si une phrase clairement dans une autre langue apparaît, DEMANDE EN FRANÇAIS avant de changer, sans jamais changer la préférence principale. '+
  'La voix peut toujours être interrompue par la parole de l’artisan et le bouton Arrêter le micro reste disponible : AUCUN réglage ne peut l’empêcher.';
}
function detectedCandidate(text){
 const t=String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(t.trim().split(/\s+/).length<4)return null;
 // Heuristiques prudentes à forte évidence ; les expressions métier et mots isolés ne suffisent pas.
 const rules=[
  ['en-US',/\b(i would like|can you help me|please tell me|i need help)\b/],
  ['es-US',/\b(buenos dias|quiero hablar en espanol|necesito ayuda para|puedes ayudarme con)\b/],
  ['it-IT',/\b(buongiorno vorrei|vorrei parlare in italiano|puoi aiutarmi con)\b/],
  ['pt-BR',/\b(bom dia eu|preciso de ajuda para|quero falar portugues)\b/],
  ['de-DE',/\b(guten morgen ich|ich brauche hilfe|konnen sie mir helfen)\b/]
 ];
 const result=rules.find(([l,r])=>r.test(t));
 return result?result[0]:null;
}
function proposal(lang){
 proposedLanguage=lang;
 const name=LANGUAGES.find(x=>x[0]===lang)?.[1]||lang;
 const ask=$('onb-language-ask');ask.hidden=false;
 $('onb-language-question').textContent='Tu viens de parler en '+name+
  '. Souhaites-tu continuer CETTE conversation en '+name+' ? Le français reste ta langue principale.';
 return name;
}
function dispatchLanguage(accepted){
 const language=accepted&&proposedLanguage?proposedLanguage:'fr-FR';
 sessionLanguage=language;
 proposedLanguage=null;$('onb-language-ask').hidden=true;
 const text=language==='fr-FR'
  ?'CONFIRMATION ARTISAN : on reste en français. Le français est et reste la langue principale. Réponds en français.'
  :'CONFIRMATION EXPLICITE ARTISAN : pour CETTE CONVERSATION SEULEMENT, réponds désormais en '+
    (LANGUAGES.find(x=>x[0]===language)?.[1]||'français')+
    '. Retour au français dès que je le demande. Ne modifie pas la préférence principale fr-FR.';
 cfg.sendLive?.(text);
 message(language==='fr-FR'?'Conversation conservée en français.':
  'Langue temporaire confirmée ; retour au français sur simple demande.');
}
function wizardVoiceCommand(text){
 if(!connected||!panel||panel.hidden||typeof text!=='string')return false;
 const t=text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(/^(?:angel[, ]+)?(?:etape suivante|suivant|continue|on continue)[.! ]*$/.test(t)){
  collect();step=Math.min(step+1,5);render();message('Étape suivante affichée. Rien enregistré.');return true;
 }
 if(/^(?:angel[, ]+)?(?:retour|precedent|etape precedente)[.! ]*$/.test(t)){
  collect();step=Math.max(step-1,0);render();message('Étape précédente affichée.');return true;
 }
 if(/^(?:angel[, ]+)?(?:repete|redis)[.! ]*$/.test(t)){
  speak('Étape '+(step+1)+' : '+['bienvenue','choix de la voix','langues','apprendre mon métier','habitudes','confirmation'][step]+'.');
  return true;
 }
 if(step===1){
  for(const [name] of VOICES)if(t.includes('voix '+name.toLowerCase())){
   draft.voice_name=name;render();message('Voix '+name+' sélectionnée pour la prochaine session. Enregistre tes réglages pour la conserver.');
   return true;
  }
 }
 if(step===4){
  if(/\b(tutoie moi|tu peux me tutoyer)\b/.test(t)){
   draft.address_mode='tu';render();message('Tutoiement proposé, non enregistré avant clic.');return true;
  }
  if(/\b(vouvoie moi|vous pouvez me vouvoyer)\b/.test(t)){
   draft.address_mode='vous';render();message('Vouvoiement proposé, non enregistré avant clic.');return true;
  }
  for(const [name,label] of TRADES)if(name!=='general'&&
    t.includes('je suis '+name)){
    draft.primary_trade=name;render();message('Métier '+label+' sélectionné, à confirmer à la fin.');return true;
  }
 }
 if(/\b(enregistre|termine|sauvegarde)\b/.test(t)){
  message('Pour protéger tes préférences, clique sur « Enregistrer mes réglages » ou « Enregistrer et terminer plus tard ». Aucune sauvegarde automatique.');
  return true;
 }
 return false;
}
function observeUtterance(text){
 if(typeof text!=='string'||!connected)return false;
 const t=text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(/^(?:angel[, ]+)?(?:arrete toi|arrete le micro|coupe le micro|stop angel|stop le micro)[.! ]*$/.test(t)){
  voiceStop();cfg.stopVoice?.();return true;
 }
 if(wizardVoiceCommand(text))return true;
 if(/(?:repasse|revenons|reviens|parle|continue|retourne)(?:-|\s)+(?:en\s+)?francais/.test(t)){
  proposedLanguage='fr-FR';dispatchLanguage(false);return true;
 }
 if(proposedLanguage){
  if(/\b(oui|d'accord|yes|si|sim|ja)\b/.test(t)){dispatchLanguage(true);return true;}
  if(/\b(non|no|nein|nao)\b/.test(t)){dispatchLanguage(false);return true;}
  return false;
 }
 if(sessionLanguage!=='fr-FR')return false;
 const lang=detectedCandidate(text);
 if(lang){
  proposal(lang);
  // L'artisan confirme lui-même ; ce message au modèle n'est qu'une demande
  // de formulation, sans bascule avant oui explicite.
  cfg.sendLive?.('J’ai prononcé une phrase dans une autre langue. Demande-moi EN FRANÇAIS si je veux continuer en '+
    (LANGUAGES.find(x=>x[0]===lang)?.[1]||'français')+
    '. Ne change pas de langue avant ma confirmation.');
  return true;
 }
 return false;
}
async function refreshVocabCount(){
 if(!cfg?.getToken?.())return;
 try{
  const data=await cfg.getCurrentMemories?.();
  const r=data||await cfg.reloadMemories?.();
  wordCount=Array.isArray(r?.vocabulaire)?r.vocabulaire.length:0;
  if(panel&&!panel.hidden&&step===3)render();
 }catch(_){/* Ne jamais certifier une sauvegarde non relue. */}
}
function init(config){
 if(config.baseUrl!==TEST)throw Error('Seul Supabase Ángel V2 TEST est autorisé.');
 cfg=config;
 const style=elt('style');
 style.textContent='.onb7{max-width:680px}.onb7 h3{font-size:19px;margin:15px 0}.onb7 p{line-height:1.6}.onb7 input,.onb7 select{font:inherit;width:100%;min-height:46px;border:1px solid #cedbed;border-radius:9px;padding:10px;color:#152a46;background:#fff}.onb7 button{margin:3px}.onb-note{font-size:13px;color:#415c7d;background:#f1f7ff;padding:12px;border-radius:8px}.onb7 .onb7-progress{font-size:13px;font-weight:750;color:#0769d3}.onb7 aside{background:#f4f9ff;border:1px solid #cbdff4;padding:12px;border-radius:9px;margin-top:12px}@media(max-width:580px){.onb7 .actions button{width:100%;min-height:48px}}';
 document.head.append(style);
 const openBtn=elt('button','🎙 Configurer Ángel avec moi (5 min)');
 openBtn.id='onb-open';openBtn.className='secondary';openBtn.type='button';
 openBtn.onclick=()=>{
  // Déclenché directement par le geste utilisateur : lecture vocale de bienvenue,
  // sans démarrer ni autoriser silencieusement la capture du micro.
  speak('Bonjour et bienvenue sur SpeedArti ! Je suis Ángel, votre assistante. En cinq minutes, nous allons choisir ma voix, ma langue secondaire et apprendre vos expressions métier. Le français restera ma langue principale. Vous pourrez toujours me couper à tout moment.');
  void open();
 };
 const voicePanel=$('voicePanel');
 voicePanel.querySelector('.status')?.insertAdjacentElement('beforebegin',openBtn);
 panel=elt('section');panel.id='onb-panel';panel.className='card onb7';panel.hidden=true;
 const title=elt('h2','Bienvenue — personnalisons Ángel');
 const progress=elt('p');progress.id='onb-progress';progress.className='onb7-progress';
 const body=elt('div');body.id='onb-body';
 const alert=elt('aside');alert.id='onb-status';alert.setAttribute('role','status');notice=alert;
 const langAsk=elt('aside');langAsk.id='onb-language-ask';langAsk.hidden=true;
 const question=elt('p');question.id='onb-language-question';langAsk.append(question);
 const yes=elt('button','Oui, pour cette conversation');yes.id='onb-language-yes';yes.type='button';
 yes.className='primary';yes.onclick=()=>dispatchLanguage(true);
 const no=elt('button','Non, rester en français');no.id='onb-language-no';no.type='button';
 no.className='secondary';no.onclick=()=>dispatchLanguage(false);
 langAsk.append(yes,no);
 panel.append(title,progress,body,alert);
 voicePanel.insertAdjacentElement('afterend',panel);
 // La demande de langue reste visible MÊME quand le guide a été terminé et fermé.
 voicePanel.insertAdjacentElement('afterend',langAsk);
 window.addEventListener('pagehide',voiceStop);
}
window.AngelOnboarding7={init,show,hide,open,getVoice,languageInstruction,observeUtterance,
 voiceStop,resetConversationLanguage,refreshVocabCount,detectedCandidate,dispatchLanguage};
})();