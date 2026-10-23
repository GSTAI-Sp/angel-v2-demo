// Ángel V2 Sprint 7 — configuration guidée TEST (sans autre base de mémoire).
(()=>{'use strict';
const TEST='https://dchunxngtdbtgxbccmlb.supabase.co';
// Douze voix réellement DISTINCTES Google Gemini Live, six présentations
// féminines et six masculines (catalogue officiel Google).
const VOICES=[
 ['Aoede','Femme 1 — Aoede, légère','female'],
 ['Kore','Femme 2 — Kore, affirmée','female'],
 ['Leda','Femme 3 — Leda, jeune','female'],
 ['Zephyr','Femme 4 — Zephyr, claire','female'],
 ['Sulafat','Femme 5 — Sulafat, chaleureuse','female'],
 ['Achernar','Femme 6 — Achernar, douce','female'],
 ['Puck','Homme 1 — Puck, dynamique','male'],
 ['Charon','Homme 2 — Charon, posé','male'],
 ['Fenrir','Homme 3 — Fenrir, énergique','male'],
 ['Orus','Homme 4 — Orus, ferme','male'],
 ['Achird','Homme 5 — Achird, amical','male'],
 ['Algieba','Homme 6 — Algieba, fluide','male']
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
let voiceGender='female',habitIndex=0,quizTerm='',quizDefinition='',quizWaitingForConfirmation=false;
let spokenStepKey='',lastQuestion='',onboardingLiveReady=false;
const $=id=>document.getElementById(id);
const elt=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el};
function message(text,error=false){
 if(notice){notice.textContent=text;notice.style.color=error?'#a62b3c':'#305a83'}
}
// La seule voix d'Ángel est Gemini Live : jamais SpeechSynthesis de Safari.
function voiceStop(){
 guideSpeaking=false;
 cfg?.interruptAudio?.();
}
function questionForStep(){
 if(step===0)return 'Bonjour, bienvenue sur SpeedArti ! Je suis Ángel. Nous allons me personnaliser en environ cinq minutes, exclusivement en français. Tu peux toujours m’interrompre ou couper le micro. Souhaites-tu commencer ?';
 if(step===1){
  const v=VOICES.filter(row=>row[2]===voiceGender).map((x,i)=>(i+1)+': '+x[0]).join(', ');
  return 'Préférez-vous une voix de femme ou une voix d’homme ? '+(voiceGender==='female'?'Voix féminines':'Voix masculines')+' disponibles : '+v+'. Dis par exemple « voix femme deux » ou « voix homme trois », et je te proposerai un essai avec cette voix réelle.';
 }
 if(step===2)return 'Le français restera toujours ma langue principale. Souhaites-tu une autre langue ponctuelle : anglais, espagnol, italien, portugais ou allemand, ou seulement le français ?';
 if(step===3){
  if(quizWaitingForConfirmation)return 'J’ai préparé ce mot dans ta mémoire existante. Souhaites-tu vraiment l’enregistrer ? Dis précisément « oui je confirme ce mot », ou dis « non » pour l’annuler.';
  if(quizTerm)return 'Merci. Que signifie exactement le mot '+quizTerm+' dans ton métier ?';
  const prompts=QUESTIONS[draft.primary_trade]||QUESTIONS.general;
  return 'Petit jeu du vocabulaire, défi '+(quiz+1)+' sur cinq. '+prompts[quiz%prompts.length]+'. Dis par exemple « mon mot est ... » ou dis « passer » si tu ne souhaites rien ajouter.';
 }
 if(step===4){
  const qs=[
   'Quel est ton métier principal : couvreur, charpentier, plombier, électricien, maçon, plaquiste, terrassier ou menuisier ?',
   'Préfères-tu que je te tutoie ou que je te vouvoie ?',
   'Souhaites-tu des réponses courtes ou détaillées ?',
   'Préfères-tu des explications pour débutant ou pour professionnel ?',
   'Ton unité préférée à afficher : mètres carrés, mètres cubes, mètres linéaires ou unités ?'
  ];
  return qs[habitIndex]||'Tes habitudes sont renseignées. Dis suivant pour voir le résumé.';
 }
 return 'Voici ton récapitulatif à l’écran. Tu gardes le français principal, et tu peux toujours m’interrompre ou arrêter le micro. Si tout est correct, dis exactement « oui je confirme et j’enregistre mes réglages ». Ou demande une correction.';
}
function askGuide(force=false){
 if(!connected||!panel||panel.hidden||!cfg?.isReady?.())return false;
 const question=questionForStep();
 if(!force&&question===lastQuestion)return true;
 lastQuestion=question;
 return cfg.sendGuide?.('QUESTION DU GUIDE DE PARAMÉTRAGE. Tu es Ángel, la voix native Google Gemini Live configurée dans cette session. Réponds EN FRANÇAIS, avec ta vraie voix audio Gemini et en une seule question. Dis exactement ou reformule très légèrement : '+question+
 ' Ne cherche pas de client ni de chantier. Écoute la réponse et attends, l’interface enregistre les choix dans son brouillon. Le micro et l’interruption restent toujours actifs.')===true;
}
function onLiveReady(){
 onboardingLiveReady=true;
 if(panel&&!panel.hidden){lastQuestion='';askGuide(true);}
}
function speak(text){
 if(!cfg?.isReady?.()){
  message('Connexion à la vraie voix Google Gemini Live en cours. Aucune voix robotique du téléphone ne sera utilisée.');
  return false;
 }
 return cfg.sendGuide?.('Avec ta voix native GEMINI LIVE en français, dis : '+text+
  ' Pose ensuite une seule question si la configuration est ouverte.')===true;
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
 back.disabled=step===0;back.onclick=()=>{collect();step--;lastQuestion='';render()};
 const next=elt('button',step===5?'Enregistrer mes réglages':'Continuer →');
 next.type='button';next.className='primary';
 next.onclick=async()=>{
  collect();
  if(step===5){
   if(await saveProfile(true)){panel.hidden=true;message('Configuration terminée. Pour modifier tes réglages, rouvre Configurer Ángel.');}
  }else{step++;lastQuestion='';render()}
 };
 const later=elt('button','Enregistrer et terminer plus tard');later.type='button';later.className='secondary';
 later.onclick=async()=>{collect();if(await saveProfile(false))panel.hidden=true;};
 const skip=elt('button','Passer cette étape');skip.type='button';skip.className='secondary';
 skip.onclick=()=>{step=Math.min(5,step+1);lastQuestion='';render()};
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
 const gender=$('onb-gender');if(gender)voiceGender=gender.value;
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
  say.onclick=()=>{lastQuestion='';askGuide(true)};
  body.append(say);
 }
 if(step===1){
  body.append(elt('p','Choisis une vraie voix féminine ou masculine, puis parmi six voix différentes de chaque catégorie. C’est toujours le moteur Google Gemini Live qui parle, jamais la voix robotique du téléphone.'));
  const g=select('onb-gender',[['female','Voix de femmes (6)'],['male','Voix d’hommes (6)']],voiceGender);
  g.onchange=()=>{
   voiceGender=g.value;draft.voice_name=VOICES.find(v=>v[2]===voiceGender)[0];
   lastQuestion='';render();
  };
  body.append(field('Voix de femme ou d’homme',g));
  const choices=VOICES.filter(v=>v[2]===voiceGender);
  const voice=select('onb-voice',choices,draft.voice_name);
  voice.onchange=()=>{draft.voice_name=voice.value;message('Voix '+voice.value+' sélectionnée. Utilise Tester pour l’entendre réellement.')};
  body.append(field('Choisis parmi les voix individuelles',voice));
  const real=elt('button','▶ Écouter cette VRAIE voix avec Gemini');real.type='button';real.className='primary';
  real.onclick=()=>{
   collect();message('Essai de '+draft.voice_name+' avec le moteur Google Gemini Live. Connexion d’une nouvelle session, l’arrêt du micro reste accessible.');
   cfg.restartWithVoice?.();
  };
  body.append(real);
  body.append(elt('p','Pour comparer, sélectionne une autre voix et relance l’essai. La voix finale est sauvegardée seulement à ta confirmation du profil.'));
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
 askGuide();
}
async function open(){
 if(!cfg?.getToken?.())return;
 panel.hidden=false;
 lastQuestion='';
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
 connected=false;voiceStop();resetConversationLanguage();onboardingLiveReady=false;lastQuestion='';
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
function nextVoiceStep(){
 collect();step=Math.min(step+1,5);lastQuestion='';render();
}
function answerHabit(t){
 const trades=[['couvreur','couvreur'],['charpentier','charpentier'],['plombier','plombier'],
  ['electricien','electricien'],['macon','macon'],['plaquiste','plaquiste'],
  ['terrassier','terrassier'],['menuisier','menuisier']];
 if(habitIndex===0){
  const match=trades.find(([word])=>t.includes(word));
  if(!match)return false;
  draft.primary_trade=match[1];
 }else if(habitIndex===1){
  if(/tutoie|tutoyer|tutoiement/.test(t))draft.address_mode='tu';
  else if(/vouvoie|vouvoyer|vouvoiement/.test(t))draft.address_mode='vous';
  else return false;
 }else if(habitIndex===2){
  if(/courte|court|bref|rapide/.test(t))draft.reply_style='court';
  else if(/detaille|longue|precis/.test(t))draft.reply_style='detaille';
  else return false;
 }else if(habitIndex===3){
  if(/debutant|simple|explique/.test(t))draft.expertise_level='debutant';
  else if(/professionnel|pro|technique/.test(t))draft.expertise_level='professionnel';
  else return false;
 }else if(habitIndex===4){
  if(/metres? carre|m2|m²/.test(t))draft.preferred_unit='m2';
  else if(/metres? cube|m3|m³/.test(t))draft.preferred_unit='m3';
  else if(/metres? lineaire|ml/.test(t))draft.preferred_unit='ml';
  else if(/unite|piece/.test(t))draft.preferred_unit='u';
  else return false;
 }else return false;
 habitIndex++;
 lastQuestion='';
 render();
 message('Réponse orale prise en compte dans le brouillon, pas encore enregistrée.');
 return true;
}
function answerVocabulary(text,t){
 if(quizWaitingForConfirmation){
  if(/\b(?:oui je confirme ce mot|je confirme ce mot|oui enregistre ce mot|je valide ce mot)\b/.test(t)){
   if(busy)return true;
   busy=true;
   void Promise.resolve(cfg.confirmWord?.()).then(async verified=>{
    if(verified!==true){
     message('Mot non vérifié dans la mémoire. Utilise le panneau mémoire pour vérifier.',true);
     return;
    }
    quizWaitingForConfirmation=false;quizTerm='';quizDefinition='';
    quiz++;
    await refreshVocabCount();
    if(quiz>=5)nextVoiceStep();
    else{lastQuestion='';render()}
    message('Expression enregistrée et relue depuis la mémoire TEST existante.');
   }).catch(e=>message('Impossible de confirmer le mot : '+String(e),true))
   .finally(()=>{busy=false});
   return true;
  }
  if(/^\s*(non|annule|annuler|je refuse)\b/.test(t)){
   cfg.cancelWord?.();quizWaitingForConfirmation=false;quizTerm='';quizDefinition='';
   lastQuestion='';render();return true;
  }
  message('Dis exactement « oui je confirme ce mot » ou « non » pour le refuser.');
  return true;
 }
 if(/\b(?:passer|passe|aucun mot|je passe)\b/.test(t)){
  quizTerm='';quizDefinition='';quiz++;
  if(quiz>=5)nextVoiceStep();else{lastQuestion='';render();}
  return true;
 }
 if(!quizTerm){
  const m=t.match(/(?:mon mot est|mon expression est|j appelle ca|je dis)\s+(.+)/);
  if(!m||m[1].trim().length<2){
   message('Pour le jeu, dis par exemple « mon mot est liteau » ou « passer ».');return true;
  }
  quizTerm=m[1].trim().slice(0,55);lastQuestion='';render();return true;
 }
 const m=t.match(/(?:ca veut dire|cela veut dire|il signifie|sa definition est|c est)\s+(.+)/);
 const definition=(m?m[1]:text).trim().slice(0,95);
 if(definition.length<2){message('Dis ce que signifie le terme.');return true;}
 quizDefinition=definition;
 const result=cfg.proposeWord?.({type:'vocabulaire',vocab_type:'expression_regionale',
  source:quizTerm,cible:quizDefinition});
 if(result?.status!=='confirmation_humaine_requise'){
  message('Une autre mémoire est peut-être en attente. Confirme-la ou annule-la avant ce défi.',true);
  return true;
 }
 quizWaitingForConfirmation=true;lastQuestion='';render();
 return true;
}
function wizardVoiceCommand(text){
 if(!connected||!panel||panel.hidden||typeof text!=='string')return false;
 const t=text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[’']/g,' ').replace(/\s+/g,' ').trim();
 if(/^(?:angel[, ]+)?(?:etape suivante|suivant|continue|on continue)[.! ]*$/.test(t)){
  nextVoiceStep();return true;
 }
 if(/^(?:angel[, ]+)?(?:retour|precedent|etape precedente)[.! ]*$/.test(t)){
  collect();step=Math.max(step-1,0);lastQuestion='';render();return true;
 }
 if(/^(?:angel[, ]+)?(?:repete|redis)[.! ]*$/.test(t)){
  lastQuestion='';askGuide(true);return true;
 }
 if(step===0){
  if(/\b(?:oui|commence|on commence|allons y|c est parti|demarrer)\b/.test(t)){
   nextVoiceStep();return true;
  }
 }
 if(step===1){
  const gender=t.match(/\b(?:femme|feminin|voix feminine|femmes|homme|masculin|voix masculine|hommes)\b/);
  if(gender){
   const newGender=/femme|feminin/.test(gender[0])?'female':'male';
   if(voiceGender!==newGender){
    voiceGender=newGender;draft.voice_name=VOICES.find(row=>row[2]===newGender)[0];
   }
  }
  const numberWords={une:1,un:1,premiere:1,premier:1,deux:2,deuxieme:2,
   trois:3,troisieme:3,quatre:4,quatrieme:4,cinq:5,cinquieme:5,six:6,sixieme:6};
  const numbered=t.match(/\b(?:voix\s+)?(?:femme|homme|feminine|masculine)\s+(\d|une|un|premiere|premier|deux|deuxieme|trois|troisieme|quatre|quatrieme|cinq|cinquieme|six|sixieme)\b/);
  const num=numbered?(Number(numbered[1])||numberWords[numbered[1]]):null;
  let selected=VOICES.find(row=>new RegExp('\\b'+row[0].toLowerCase()+'\\b').test(t));
  if(!selected&&num&&num>=1&&num<=6)selected=VOICES.filter(row=>row[2]===voiceGender)[num-1];
  if(selected){
   draft.voice_name=selected[0];voiceGender=selected[2];lastQuestion='';render();
   message('Voix '+selected[0]+' sélectionnée. Dis « écoute cette voix » pour la tester avec Gemini, ou « suivant ».');return true;
  }
  if(/ecoute|tester|teste|essayer|essaie/.test(t)){
   message('Nouvelle connexion Gemini Live avec la voix '+draft.voice_name+'.');
   cfg.restartWithVoice?.();return true;
  }
  if(gender){
   lastQuestion='';render();message('Catégorie '+(voiceGender==='female'?'femmes':'hommes')+
    ' sélectionnée. Dis le numéro de voix que tu préfères.');return true;
  }
 }
 if(step===2){
  const rules=[['none',/francais uniquement|pas d autre langue|aucune|seulement francais/],
   ['es-US',/espagnol/],['en-US',/anglais/],['it-IT',/italien/],
   ['pt-BR',/portugais/],['de-DE',/allemand/]];
  const match=rules.find(row=>row[1].test(t));
  if(match){
   draft.secondary_language=match[0];nextVoiceStep();
   return true;
  }
 }
 if(step===3)return answerVocabulary(text,t);
 if(step===4)return answerHabit(t);
 if(step===5){
  if(/\b(?:oui je confirme et j enregistre mes reglages|je confirme et j enregistre mes reglages|oui j enregistre mes reglages)\b/.test(t)){
   if(busy)return true;
   collect();
   void saveProfile(true).then(ok=>{
    if(ok){panel.hidden=true;cfg.sendGuide?.('Réglages du compte TEST enregistrés et vérifiés. Remercie brièvement l’artisan en français avec ta vraie voix Google Gemini.');}
   });
   return true;
  }
  if(/\b(?:reprendre|modifier|changer)\b/.test(t)){
   step=1;lastQuestion='';render();return true;
  }
 }
 if(/\b(enregistre|termine|sauvegarde)\b/.test(t)){
  message('Par sécurité, le mot « enregistre » seul ne suffit pas. La confirmation complète sera demandée au résumé.');return true;
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
  // Le vrai micro Gemini Live démarre DIRECTEMENT sur le geste utilisateur,
  // y compris sur Safari iOS. Pas de SpeechSynthesis locale.
  lastQuestion='';
  void open();
  if(!cfg.isLive?.())cfg.startVoice?.();
  else if(cfg.isReady?.())askGuide(true);
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
 voiceStop,resetConversationLanguage,refreshVocabCount,detectedCandidate,dispatchLanguage,
 onLiveReady,askGuide,questionForStep};
})();