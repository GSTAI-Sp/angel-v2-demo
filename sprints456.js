// Ángel V2 : Sprints 4-6, démo TEST autonome, aucune donnée production.
(()=>{'use strict';
const REF='dchunxngtdbtgxbccmlb';
let cfg=null,box=null,rec=null,active=false,files=[],pending=null,busy=false;
const $=x=>document.getElementById(x);
const token=()=>cfg?.getToken?.();
function note(message){$('s456-note').textContent=message;}
function stopWake(){
 active=false;
 if(rec){const r=rec;rec=null;try{r.abort()}catch(_){}}
 if($('s456-wake'))$('s456-wake').textContent='Activer le prénom';
}
function wake(){
 if(active){stopWake();return}
 if(!token())return note('Connexion TEST nécessaire.');
 if(cfg.isLive())return note('Conversation déjà ouverte.');
 const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Speech)return note('Reconnaissance du prénom non disponible : utilise Démarrer.');
 const r=new Speech();rec=r;active=true;r.lang='fr-FR';r.continuous=true;r.interimResults=false;
 r.onresult=e=>{
   for(let i=e.resultIndex;i<e.results.length;i++){
     const spoken=String(e.results[i][0]?.transcript||'')
       .normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
     if(/\bangel\b/.test(spoken)){
       stopWake();note('Prénom reconnu. Activation du micro en cours, démarrage manuel si bloqué par le navigateur.');
       cfg.startVoice();break;
     }
   }
 };
 r.onerror=()=>{stopWake();note('Veille indisponible. Utilise Démarrer.')};
 r.onend=()=>{if(active){stopWake();note('Veille arrêtée par le navigateur.')}}; 
 try{r.start();$('s456-wake').textContent='Arrêter la veille';
  note('Veille activée volontairement : dis « Ángel ». Le navigateur peut utiliser un service de reconnaissance distant.');}
 catch(_){stopWake();note('Veille non disponible : utilise le bouton Démarrer.')}
}
async function call(action,args={}){
 if(!token())throw Error('Connexion TEST nécessaire.');
 const url=cfg.baseUrl+'/functions/v1/angel-live-metier';
 if(!url.startsWith('https://'+REF+'.supabase.co/'))throw Error('Environnement non autorisé.');
 const r=await fetch(url,{method:'POST',cache:'no-store',headers:{
   'Content-Type':'application/json','apikey':cfg.publicKey,
   Authorization:'Bearer '+token()},body:JSON.stringify({action,args})});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(String(data.error||'Requête TEST impossible').slice(0,180));
 if(data.fictif!==true)throw Error('Résultat non fictif refusé.');
 return data;
}
function revoke(){
 for(const f of files)URL.revokeObjectURL(f.url);
 files=[];$('s456-pics').replaceChildren();
}
function payload(){
 return {
 titre:$('s456-title').value.trim().slice(0,120),
 zone:$('s456-zone').value.trim().slice(0,80),
 description:$('s456-description').value.trim().slice(0,1500),
 urgence:$('s456-urgency').value,
 photo_noms:files.map(f=>f.name)
 };
}
function valid(p){
 return p.titre.length>=4&&p.zone.length>=2&&p.description.length>=12&&
   ['normale','elevee','critique'].includes(p.urgence)&&p.photo_noms.length<=3;
}
function prepare(){
 const p=payload();
 if(!valid(p))return note('Titre, zone et description sont obligatoires; rien enregistré.');
 pending=JSON.stringify(p);$('s456-confirm').disabled=false;
 $('s456-preview').textContent='SPÉCIMEN À CONFIRMER\n'+p.titre+'\nZone : '+p.zone+
  '\nUrgence : '+p.urgence+'\n'+p.description+'\nPhotos locales : '+p.photo_noms.length+
  '\nAlerte responsable : BROUILLON NON ENVOYÉ\nDevis : chiffrage à préparer, AUCUN TARIF ni devis émis.';
 note('Préparation uniquement : le bouton Confirmer enregistre un signalement fictif sans envoyer d’alerte.');
}
async function save(){
 if(!pending||busy)return;
 const p=payload();
 if(JSON.stringify(p)!==pending||!valid(p))return note('Modifications détectées : prépare à nouveau le dossier.');
 busy=true;$('s456-confirm').disabled=true;
 try{
   const r=await call('enregistrer_signalement_test',{...p,confirmation:true});
   if(r.notification_envoyee!==false||r.devis_cree!==false||
      r.photo_fichiers_stockes!==false||r.signalement?.statut!=='specimen_a_valider')
      throw Error('Enregistrement non conforme.');
   pending=null;$('s456-preview').textContent='Signalement TEST enregistré : '+r.signalement.id+
    '\nPhotos NON transférées. Alerte NON envoyée. Devis NON créé.';
   note('Signalement fictif enregistré après ton clic. Aucun envoi ni facturation.');
   await list();
 }catch(e){$('s456-confirm').disabled=false;note('Non enregistré : '+String(e.message))}
 finally{busy=false}
}
async function modules(){
 try{
   const r=await call('consulter_modules_test');
   if(r.lecture_seule!==true||!Array.isArray(r.modules))throw Error('Résultat TEST invalide.');
   $('s456-modules').textContent=r.modules.map(x=>x.code+' — '+x.statut+
    (x.nombre_elements===null?'':' ('+x.nombre_elements+' TEST)')).join('\n');
   note('Raccordements TEST réels affichés. « A_RACCORDER » signifie non intégré.');
 }catch(e){note(String(e.message))}
}
async function list(){
 try{
   const r=await call('consulter_signalements_test');
   if(r.lecture_seule!==true||!Array.isArray(r.signalements))throw Error('Données invalides.');
   $('s456-reports').textContent=r.signalements.map(x=>x.titre+' — '+x.zone+
    ' — '+x.urgence+' (alerte non envoyée, devis non émis)').join('\n')||'Aucun signalement TEST.';
 }catch(e){note(String(e.message))}
}
function photoChange(){
 revoke();pending=null;$('s456-confirm').disabled=true;
 const input=$('s456-photos'),batch=[...(input.files||[])];
 if(batch.length>3||batch.some(x=>!['image/jpeg','image/png','image/webp'].includes(x.type)||
    x.size>3*1024*1024)){input.value='';return note('Maximum 3 images JPEG/PNG/WebP, chacune inférieure à 3 Mo. Aucun envoi.')}
 files=batch.map(f=>({name:f.name.slice(0,100),url:URL.createObjectURL(f)}));
 for(const f of files){
   const im=document.createElement('img');im.src=f.url;im.alt='Aperçu photo locale';
   im.width=108;im.height=84;im.style.objectFit='cover';im.style.margin='5px';
   $('s456-pics').append(im);
 }
 note('Photos locales : aucun transfert vers Supabase.');
}
function voiceDraft(t){
 if(!token()||typeof t!=='string'||!/(signale|signaler|probleme|problème|constat)/i.test(t)||
    !/(chantier|toiture|terrasse|mur|plomberie|électricité)/i.test(t))return false;
 $('s456-title').value='Constat vocal chantier — SPÉCIMEN';
 $('s456-zone').value='Chantier fictif';
 $('s456-description').value=t.trim().slice(0,1500);
 pending=null;$('s456-confirm').disabled=true;
 box.hidden=false;
 $('s456-preview').textContent='Constat dicté ajouté au BROUILLON, non enregistré. Complète les champs, joins tes photos locales, prépare puis confirme.';
 note('Constat oral reçu. Rien envoyé.');return true;
}
function init(c){
 if(!c?.baseUrl?.startsWith('https://'+REF+'.supabase.co'))throw Error('TEST obligatoire.');
 cfg=c;
 const style=document.createElement('style');
 style.textContent='.s456{max-width:680px}.s456 fieldset{border:1px solid #deebf7;border-radius:11px;margin:15px 0;padding:14px}.s456 legend{font-weight:800;color:#12569c}.s456 textarea,.s456 select{font:inherit;font-size:16px;padding:12px;border:1px solid #cddae8;border-radius:8px;width:100%}.s456 textarea{min-height:100px}.s456 .out{white-space:pre-line;background:#f5f9fc;padding:13px;border-radius:8px;margin:12px 0;font-size:13px;line-height:1.6}.s456 .hint{font-size:13px;color:#52677d;line-height:1.6}@media(max-width:580px){.s456 button{min-height:48px;width:100%}.s456 fieldset{padding:10px}}';
 document.head.append(style);
 box=document.createElement('section');box.id='s456';box.className='card s456';box.hidden=true;
 box.innerHTML='<h2>Ángel V2 — Sprints 4, 5 et 6</h2>'+
  '<p class="hint">Démonstration isolée du compte TEST. Aucun accès aux modules de production.</p>'+
  '<fieldset><legend>4 — Voix et mobile</legend><p class="hint">Veille du prénom expérimentale : active-la volontairement. Interruption et arrêt micro par les boutons existants. Fonctionnalité dépendante du navigateur.</p>'+
  '<button type="button" class="secondary" id="s456-wake">Activer le prénom</button></fieldset>'+
  '<fieldset><legend>5 — Modules métier</legend><p class="hint">Vérification des connexions réelles au TEST ; moteurs non raccordés identifiés.</p>'+
  '<button type="button" class="secondary" id="s456-check">Vérifier les modules TEST</button><div class="out" id="s456-modules">Pas encore vérifiés.</div></fieldset>'+
  '<fieldset><legend>6 — Constat de chantier et proposition commerciale</legend>'+
  '<p class="hint">Photos prévisualisées localement (pas envoyées). Une alerte responsable et un brouillon de devis sont seulement proposés, jamais expédiés ni tarifés.</p>'+
  '<form id="s456-form"><label for="s456-title">Titre fictif</label><input id="s456-title" required minlength="4" maxlength="120" />'+
  '<label for="s456-zone">Zone</label><input id="s456-zone" required minlength="2" maxlength="80" />'+
  '<label for="s456-description">Problème observé</label><textarea id="s456-description" required minlength="12" maxlength="1500"></textarea>'+
  '<label for="s456-urgency">Urgence proposée</label><select id="s456-urgency"><option value="normale">Normale</option><option value="elevee">Élevée</option><option value="critique">Critique</option></select>'+
  '<label for="s456-photos">Photos fictives (3 max, aperçu local uniquement)</label><input type="file" id="s456-photos" accept="image/jpeg,image/png,image/webp" multiple>'+
  '<div id="s456-pics"></div><div class="actions"><button class="secondary" type="submit">Préparer</button>'+
  '<button class="primary" type="button" disabled id="s456-confirm">Confirmer le signalement SPÉCIMEN</button></div>'+
  '<div class="out" id="s456-preview">Aucun signalement préparé.</div></form>'+
  '<button class="secondary" type="button" id="s456-list">Voir les signalements TEST</button>'+
  '<div class="out" id="s456-reports">Aucun contrôle.</div></fieldset>'+
  '<p class="hint" id="s456-note" role="status">Aucune opération externe effectuée.</p>';
 document.getElementById('voicePanel').insertAdjacentElement('afterend',box);
 $('s456-wake').addEventListener('click',wake);
 $('s456-check').addEventListener('click',()=>void modules());
 $('s456-list').addEventListener('click',()=>void list());
 $('s456-photos').addEventListener('change',photoChange);
 $('s456-form').addEventListener('submit',e=>{e.preventDefault();prepare()});
 $('s456-confirm').addEventListener('click',()=>void save());
 for(const id of ['s456-title','s456-zone','s456-description','s456-urgency']){
  $(id).addEventListener('input',()=>{pending=null;$('s456-confirm').disabled=true});
 }
 window.addEventListener('offline',()=>{stopWake();note('Hors ligne : opérations vocales et métier indisponibles.')});
 window.addEventListener('pagehide',()=>{stopWake();revoke()});
}
function show(){if(box&&token()){box.hidden=false;note('TEST actif. Sélectionne une fonctionnalité à essayer.')}}
function hide(){stopWake();revoke();pending=null;busy=false;if(box){box.hidden=true;$('s456-confirm').disabled=true;$('s456-preview').textContent='Aucun signalement préparé.'}}
window.AngelSprints456={init,show,hide,stopWake,voiceDraft};
})();