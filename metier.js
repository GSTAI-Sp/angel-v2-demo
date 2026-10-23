// Ángel V2 — outils de DEMONSTRATION connectés au Supabase de TEST uniquement.
// Jamais de secrets serveur ici, aucun accès à SpeedArti production.
(() => {
'use strict';
const allowed=new Set(['rechercher_client','rechercher_chantier','rechercher_catalogue','preparer_devis','consulter_devis','afficher_conversations','proposer_memoire','consulter_factures','consulter_rendez_vous','rechercher_devis','executer_plan_lecture','preparer_rendez_vous','preparer_deplacement_rendez_vous','preparer_facture','consulter_briefing']);
const toolDefs=[
 {name:'rechercher_client',description:'Recherche un client fictif SpeedArti. Sans nom, liste les clients. Utilise ce résultat pour identifier un client avant un devis.',parameters:{type:'OBJECT',properties:{nom:{type:'STRING',description:'Nom du client demandé (facultatif)'}}}},
 {name:'rechercher_chantier',description:'Consulte les chantiers fictifs, éventuellement filtrés par nom.',parameters:{type:'OBJECT',properties:{nom:{type:'STRING'}}}},
 {name:'rechercher_catalogue',description:'Recherche des articles dans le catalogue de test, avec leurs vrais prix de test. Si aucun article n’est présent, demander au client de donner les prix.',parameters:{type:'OBJECT',properties:{query:{type:'STRING',description:'Expression à chercher (facultatif)'}}}},
 {name:'preparer_devis',description:'Prépare le devis pour un client fictif. Ne l’enregistre pas. Demande les données manquantes, notamment les prix et taux TVA; n’en invente aucun. Une confirmation visible dans la page est indispensable.',parameters:{type:'OBJECT',properties:{
    client_nom:{type:'STRING',description:'Nom du client fictif trouvé, éventuellement partiel'},
    client_id:{type:'STRING',description:'ID client obtenu par rechercher_client, si connu'},
    titre:{type:'STRING',description:'Intitulé du devis'},
    lignes:{type:'ARRAY',items:{type:'OBJECT',properties:{
      description:{type:'STRING'},quantite:{type:'NUMBER'},unite:{type:'STRING'},
      prix_unitaire:{type:'NUMBER',description:'Prix HT explicitement donné ou lu depuis le catalogue, jamais inventé'},
      taux_tva:{type:'NUMBER',description:'Taux explicitement donné parmi 0, 5.5, 10, 20'},
      catalogue_id:{type:'STRING',description:'ID article catalogue réellement trouvé'}
    },required:['description','quantite','unite']}}
  },required:['titre','lignes']}},
 {name:'consulter_devis',description:'Affiche un devis brouillon fictif créé dans la base TEST. Utilise un ID issu du résultat de création.',parameters:{type:'OBJECT',properties:{devis_id:{type:'STRING'}},required:['devis_id']}},
 {name:'consulter_factures',description:'Consulte UNIQUEMENT les factures du compte SpeedArti TEST en lecture seule : montants et soldes de la base sans les inventer. Pour impayés et factures à payer, filtre en_attente. Pour factures échues, filtre en_retard. Pour échéances cette semaine, filtre echeances_semaine. Aucune émission, relance, modification ou envoi.',parameters:{type:'OBJECT',properties:{
    filtre:{type:'STRING',enum:['toutes','en_attente','en_retard','echeances_semaine'],description:'Type de consultation demandé. Utiliser en_attente pour impayés, en_retard pour échues.'},
    recherche:{type:'STRING',description:'Titre ou numéro partiel de facture'},
    montant_min:{type:'NUMBER',description:'Montant TTC minimum explicite en euros'},
    montant_max:{type:'NUMBER',description:'Montant TTC maximum explicite en euros'}
  }}},
 {name:'consulter_rendez_vous',description:'Lis les rendez-vous du compte SpeedArti TEST, en lecture seule, heures civiles Europe/Paris. Pour mon prochain rendez-vous = prochain, demain = demain, cette semaine = semaine, aujourd’hui = aujourd_hui. Ne crée, déplace ni annule un rendez-vous.',parameters:{type:'OBJECT',properties:{
    filtre:{type:'STRING',enum:['aujourd_hui','demain','semaine','prochain','date']},
    date:{type:'STRING',description:'Uniquement si filtre=date, date valide AAAA-MM-JJ, sans inventer'}
  }}},

 {name:'rechercher_devis',description:'Pour « retrouve mes devis », « liste tous mes devis », « combien de devis » et « donne-moi les montants de mes devis » : APPELER cet outil immédiatement sans exiger de nom de client, numéro ni titre. Sans recherche, renvoie toute la liste de devis TEST du compte avec montants TTC. Si la liste est vide, dire qu’aucun devis TEST n’est présent.',parameters:{type:'OBJECT',properties:{recherche:{type:'STRING'}}}},
 {name:'executer_plan_lecture',description:'Quand plusieurs consultations sont demandées en une phrase, exécute deux à cinq actions séquentielles en lecture seule. Jamais de préparation, confirmation, écriture ou suppression dans ce plan.',parameters:{type:'OBJECT',properties:{etapes:{type:'ARRAY',items:{type:'OBJECT',properties:{action:{type:'STRING',enum:['consulter_factures','consulter_rendez_vous','rechercher_client','rechercher_chantier','rechercher_catalogue','rechercher_devis','consulter_briefing']},args:{type:'OBJECT',description:'Paramètres adaptés à la consultation demandée',properties:{
        filtre:{type:'STRING'},date:{type:'STRING'},recherche:{type:'STRING'},
        nom:{type:'STRING'},query:{type:'STRING'},
        montant_min:{type:'NUMBER'},montant_max:{type:'NUMBER'}
      }}},required:['action']}}},required:['etapes']}},
 {name:'preparer_rendez_vous',description:'Si l’artisan demande de préparer ou programmer un rendez-vous fictif et précise le titre, la date future et les heures, appelle immédiatement cet outil. Il crée SEULEMENT une proposition SPÉCIMEN. Le rendez-vous n’existe pas tant que l’artisan ne clique pas sur le bouton visible Confirmer.',parameters:{type:'OBJECT',properties:{titre:{type:'STRING'},date:{type:'STRING',description:'AAAA-MM-JJ'},heure_debut:{type:'STRING',description:'HH:MM 24 h'},heure_fin:{type:'STRING',description:'HH:MM 24 h'}},required:['titre','date','heure_debut','heure_fin']}},
 {name:'preparer_deplacement_rendez_vous',description:'Pour déplacer un rendez-vous TEST existant, consulte d’abord son agenda pour obtenir l’ID du rendez-vous, utilise sa durée enregistrée si la nouvelle heure de fin manque, puis prépare le déplacement en donnant ID et nouveau créneau. Le déplacement n’est PAS effectué sans clic de confirmation humain; refuser tout rendez-vous hors SPÉCIMEN TEST.',parameters:{type:'OBJECT',properties:{
    rendez_vous_id:{type:'STRING',description:'Identifiant obtenu par consulter_rendez_vous'},
    date:{type:'STRING',description:'Nouvelle date AAAA-MM-JJ'},
    heure_debut:{type:'STRING',description:'HH:MM'},
    heure_fin:{type:'STRING',description:'HH:MM'}
  },required:['rendez_vous_id','date','heure_debut','heure_fin']}},
 {name:'preparer_facture',description:'Quand l’artisan demande un aperçu de facture fictive, appelle immédiatement cet outil si HT, TVA et TTC sont donnés. Un titre descriptif est facultatif et sera remplacé par un libellé SPÉCIMEN. Aucun document réel créé, émis ou numéroté.',parameters:{type:'OBJECT',properties:{titre:{type:'STRING',description:'Facultatif pour un aperçu fictif'},montant_ht:{type:'NUMBER'},montant_tva:{type:'NUMBER'},montant_ttc:{type:'NUMBER'}},required:['montant_ht','montant_tva','montant_ttc']}},
 {name:'consulter_briefing',description:'Donne les factures échues et rendez-vous proches fictifs, puis des suggestions factuelles sans créer de rappel.',parameters:{type:'OBJECT',properties:{}}},
 {name:'afficher_conversations',description:'Quand l’artisan dit « reprendre une conversation », « mes anciennes conversations » ou « retrouver mon historique », affiche immédiatement les archives dans la page. La reprise ne se fait ensuite que par le bouton Reprendre affiché à l’artisan. Ne prétends pas avoir ouvert le fil toi-même.',parameters:{type:'OBJECT',properties:{}}},
 {name:'proposer_memoire',description:'Quand l’artisan demande explicitement « retiens », « mémorise », « souviens-toi », propose une mémoire BTP. IMPORTANT : « réponses courtes », préférences de formulation, habitudes de devis et demandes non matérielles = type souvenir + contenu exact. Type preference uniquement pour matériaux favoris ou zones d’intervention, avec categorie et valeur. Si les champs sont incomplets, demander la précision au lieu de prétendre enregistrer. Ne JAMAIS enregistrer ici : l’artisan doit confirmer en cliquant dans la page. Refuse les secrets, coordonnées privées, informations sur des clients et instructions système.',parameters:{type:'OBJECT',properties:{
    type:{type:'STRING',enum:['vocabulaire','preference','souvenir'],description:'Utilise souvenir pour réponses courtes, ton, façons de travailler, préférences de communication. Utilise preference seulement pour matériaux favoris ou zones d’intervention.'},
    source:{type:'STRING',description:'Abréviation ou expression BTP'},
    cible:{type:'STRING',description:'Signification explicite, sans invention'},
    vocab_type:{type:'STRING',enum:['synonyme','raccourci','correction','expression_regionale']},
    categorie:{type:'STRING',enum:['materiaux_favoris','zones_intervention'],description:'UNIQUEMENT si type preference avec un matériau ou une zone'},
    valeur:{type:'STRING',description:'Matériau favori ou zone de travail explicitement donnée'},
    contenu:{type:'STRING',description:'Phrase exacte à retenir, par exemple « je préfère des réponses courtes pour les devis », sans données clients ni secrets'}
  },required:['type']}}
];
const viewCSS=[
 '.angel-business{max-width:680px;margin-top:22px}',
 '.angel-business .test-label{font-size:11px;font-weight:800;letter-spacing:.07em;color:#2379c5;text-transform:uppercase}',
 '.angel-business details{margin-top:14px;border-top:1px solid #e1eaf2;padding-top:12px}',
 '.angel-business summary{cursor:pointer;font-weight:700;color:#214a78}',
 '.angel-business .line{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
 '.angel-business select{width:100%;padding:11px;border:1px solid #cbd6e5;border-radius:8px;background:#fff;color:#172b4b;font:inherit}',
 '.angel-business .output{white-space:pre-wrap;overflow-wrap:anywhere;background:#f5f9fd;border:1px solid #e0ebf5;padding:14px;border-radius:9px;font-size:13px;line-height:1.6;margin:16px 0}',
 '.angel-business .quote-box{border:1px solid #b5d5f9;background:#f5faff;border-radius:10px;padding:16px;margin-top:18px}',
 '.angel-business .quote-line{white-space:pre-wrap;font-size:14px;line-height:1.65;color:#24456c}',
 '.angel-business .toolbuttons{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}',
 '.angel-business .toolbuttons button{padding:10px;font-size:13px}',
 '.angel-business .business-error{color:#ac2834}',
 '@media(max-width:580px){.angel-business .line{grid-template-columns:1fr}.angel-business .toolbuttons{display:grid}}'
].join('');
const style=document.createElement('style');style.textContent=viewCSS;document.head.append(style);
let getToken=null,baseUrl='',pubKey='',getSocket=null,notify=null;
let container=null,clientSelect=null,resultBox=null,pending=null,pendingType=null,busy=false;
const $=(id)=>document.getElementById(id);
function el(tag,text='',cls=''){
  const x=document.createElement(tag);if(cls)x.className=cls;
  if(text)x.textContent=text;return x;
}
function info(message,isError=false){
  if(resultBox){resultBox.textContent=message;resultBox.classList.toggle('business-error',isError);}
}
function validMoney(n){return typeof n==='number'&&Number.isFinite(n)?n.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €':'—';}
function diagnostic(message){
  const target=$('angel-business-diagnostic');
  if(target)target.textContent=message;
}
function buildUI(){
  container=el('section','','card angel-business');container.id='angel-business-panel';container.hidden=true;
  container.innerHTML=`
    <div class="test-label">Modules métier connectés · données fictives</div>
    <h2 style="margin:9px 0 4px">Ángel consulte les données métier</h2>
    <p class="muted">Essaie « mes factures en attente », « mes rendez-vous aujourd’hui » ou « mon prochain rendez-vous ». Consultations en lecture seule sur les données fictives TEST, sans émission, modification ni envoi.</p>
    <div id="angel-business-status" class="output" role="status" aria-live="polite">Connecte-toi pour interroger la base de test.</div>
    <p id="angel-business-diagnostic" class="muted" role="status" aria-live="polite">Dernier outil vocal : aucun appel enregistré.</p>
    <div id="angel-business-pending" class="quote-box" hidden>
      <h2 id="angel-business-pending-title">Action fictive en attente de confirmation</h2>
      <div id="angel-business-preview" class="quote-line"></div>
      <div class="actions">
       <button class="primary" id="angel-business-confirm" type="button">Confirmer l'action fictive</button>
       <button class="secondary" id="angel-business-cancel" type="button">Annuler</button>
      </div>
    </div>
    <details>
      <summary>Vérifier les modules manuellement, même sans micro</summary>
      <div class="toolbuttons">
        <button class="secondary" id="angel-find-clients" type="button">Voir les clients</button>
        <button class="secondary" id="angel-find-jobs" type="button">Voir les chantiers</button>
        <button class="secondary" id="angel-find-items" type="button">Voir le catalogue</button>
        <button class="secondary" id="angel-find-invoices" type="button">Consulter les factures TEST</button>
        <button class="secondary" id="angel-find-appointments" type="button">Rendez-vous du jour</button>
        <button class="secondary" id="angel-find-next-appointment" type="button">Prochain rendez-vous</button>
        <button class="secondary" id="angel-find-devis" type="button">Lister tous mes devis TEST</button>
        <button class="secondary" id="angel-briefing" type="button">Briefing du jour</button>
        <button class="secondary" id="angel-plan-lecture" type="button">Tester 3 consultations</button>
      </div>
      <form id="angel-manual-quote">
        <h2 style="font-size:17px;margin:20px 0 4px">Préparer un devis brouillon</h2>
        <p class="muted">Les tarifs et le taux de TVA doivent être renseignés : Ángel n'en invente pas.</p>
        <label for="angel-client-choice">Client fictif</label>
        <select id="angel-client-choice" required><option value="">Chargement…</option></select>
        <label for="angel-quote-title">Titre du devis</label>
        <input id="angel-quote-title" required minlength="3" value="Terrasse 30 m² — Essai Ángel V2"/>
        <div class="line">
          <div><label for="angel-quote-desc">Description</label><input id="angel-quote-desc" required value="Prestation de terrasse fictive"/></div>
          <div><label for="angel-quote-qty">Quantité</label><input id="angel-quote-qty" type="number" step="any" min="0.01" max="100000" required value="30"/></div>
          <div><label for="angel-quote-unit">Unité</label><select id="angel-quote-unit"><option value="m²">m²</option><option value="ml">ml</option><option value="u">unité</option><option value="h">heure</option></select></div>
          <div><label for="angel-quote-price">Prix HT unitaire (€)</label><input id="angel-quote-price" type="number" step="0.01" min="0" max="1000000" required placeholder="À renseigner"/></div>
          <div><label for="angel-quote-vat">TVA à appliquer</label><select id="angel-quote-vat" required><option value="">Choisir</option><option value="0">0 %</option><option value="5.5">5,5 %</option><option value="10">10 %</option><option value="20">20 %</option></select></div>
        </div>
        <div class="actions"><button type="submit" class="secondary" id="angel-manual-prepare">Préparer sans enregistrer</button></div>
      </form>
      <form id="angel-manual-appointment">
        <h2 style="font-size:17px;margin:20px 0 4px">Préparer un rendez-vous fictif</h2>
        <p class="muted">Aucun rendez-vous créé avant confirmation par clic.</p>
        <label for="angel-rdv-title">Titre</label>
        <input id="angel-rdv-title" required minlength="4" value="Visite chantier — SPÉCIMEN"/>
        <div class="line">
          <div><label for="angel-rdv-date">Date</label><input id="angel-rdv-date" type="date" required/></div>
          <div><label for="angel-rdv-start">Début</label><input id="angel-rdv-start" type="time" required value="15:00"/></div>
          <div><label for="angel-rdv-end">Fin</label><input id="angel-rdv-end" type="time" required value="15:45"/></div>
        </div>
        <div class="actions"><button type="submit" class="secondary" id="angel-rdv-prepare">Préparer, puis confirmer</button></div>
      </form>
    </details>
  `;
  $('voicePanel').insertAdjacentElement('afterend',container);
  clientSelect=$('angel-client-choice');resultBox=$('angel-business-status');
  for(const [id,action] of [['angel-find-clients','rechercher_client'],['angel-find-jobs','rechercher_chantier'],['angel-find-items','rechercher_catalogue'],['angel-find-invoices','consulter_factures'],['angel-find-appointments','consulter_rendez_vous'],['angel-find-next-appointment','consulter_rendez_vous'],['angel-find-devis','rechercher_devis'],['angel-briefing','consulter_briefing'],['angel-plan-lecture','executer_plan_lecture']]){
    $(id).addEventListener('click',()=>{
      const args=id==='angel-find-invoices'?{filtre:'en_attente'}:
        id==='angel-find-next-appointment'?{filtre:'prochain'}:
        id==='angel-find-appointments'?{filtre:'aujourd_hui'}:
        id==='angel-plan-lecture'?{etapes:[{action:'consulter_factures',args:{filtre:'en_attente'}},{action:'consulter_rendez_vous',args:{filtre:'demain'}},{action:'rechercher_devis',args:{}}]}:{};
      void call(action,args).catch(error=>info('Erreur : '+error.message,true));
    });
  }
  $('angel-manual-quote').addEventListener('submit',event=>{event.preventDefault();void prepareManual();});
  $('angel-manual-appointment').addEventListener('submit',event=>{event.preventDefault();void prepareManualAppointment();});
  $('angel-business-confirm').addEventListener('click',()=>{void confirm()});
  $('angel-business-cancel').addEventListener('click',()=>{void cancel()});
}
async function request(action,args={}){
  if(!getToken||!getToken())throw new Error('Connexion administrateur manquante.');
  const r=await fetch(baseUrl+'/functions/v1/angel-live-metier',{
    method:'POST',headers:{'Authorization':'Bearer '+getToken(),'apikey':pubKey,'Content-Type':'application/json'},
    body:JSON.stringify({action,args}),cache:'no-store'
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(String(data.error||('Service métier indisponible (HTTP '+r.status+')')).slice(0,280));
  return data;
}
function clientsSelect(list){
  if(!clientSelect)return;
  const current=clientSelect.value;clientSelect.replaceChildren();
  const blank=el('option','Choisis un client fictif');blank.value='';clientSelect.append(blank);
  for(const c of list){const option=el('option',String(c.contact_name||'Client'));option.value=c.id;clientSelect.append(option);}
  if(list.some(c=>c.id===current))clientSelect.value=current;
}
function renderQuote(data){
  if(!data.context_id||!data.resume)return;
  pending=data.context_id;pendingType='devis';
  $('angel-business-pending-title').textContent='Devis TEST à confirmer';
  $('angel-business-confirm').textContent='Confirmer le brouillon fictif';
  const v=data.resume,lines=v.lignes||[];
  const output=['SPÉCIMEN — '+v.titre,'Client : '+(v.client?.contact_name||'à confirmer')];
  for(const l of lines)output.push('• '+l.description+' : '+l.quantite+' '+l.unite+' × '+validMoney(l.prix_unitaire)+' HT — TVA '+l.taux_tva+' %');
  output.push('Total HT : '+validMoney(v.montant_ht));
  output.push('TVA : '+validMoney(v.montant_tva));
  output.push('TOTAL TTC : '+validMoney(v.montant_ttc));
  output.push('Statut : aperçu uniquement, non enregistré.');
  $('angel-business-preview').textContent=output.join('\n');
  $('angel-business-pending').hidden=false;
  container.hidden=false;
  $('angel-business-pending').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function renderAppointment(data,isMove=false){
  if(!data.context_id||!data.resume)return;
  pending=data.context_id;pendingType=isMove?'deplacement':'rendez_vous';
  const v=data.resume;
  $('angel-business-pending-title').textContent=isMove?'Déplacement du rendez-vous TEST':'Rendez-vous TEST à confirmer';
  $('angel-business-confirm').textContent=isMove?'Confirmer le déplacement fictif':'Confirmer ce rendez-vous fictif';
  $('angel-business-preview').textContent='SPÉCIMEN — '+v.titre+'\nDate : '+v.date+
    '\nDe '+v.heure_debut+' à '+v.heure_fin+' (heure de Paris)'+
    (isMove?'\nDéplacement NON appliqué.':'\nProposition NON créée.');
  $('angel-business-pending').hidden=false;container.hidden=false;
  $('angel-business-pending').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function render(action,data){
  if(action==='rechercher_client'){
    const list=data.clients||[];
    clientsSelect(list);
    info('Clients fictifs ('+list.length+') :\n'+(list.map(c=>c.contact_name+(c.city?' — '+c.city:'')).join('\n')||'Aucun client.'));
  }else if(action==='rechercher_chantier'){
    const list=data.chantiers||[];
    info('Chantiers fictifs ('+list.length+') :\n'+(list.map(c=>c.nom+' — '+c.statut).join('\n')||'Aucun chantier.'));
  }else if(action==='rechercher_catalogue'){
    const list=data.articles||[];
    info('Articles catalogue ('+list.length+') :\n'+(list.map(c=>c.nom+' — '+validMoney(Number(c.prix_unitaire))+' HT/'+c.unite).join('\n')||'Catalogue vide : demande un tarif de test à l’artisan.'));
  }else if(action==='consulter_factures'){
    const items=Array.isArray(data.factures)?data.factures:[];
    if(!data.lecture_seule||!data.fictif)throw Error('Réponse facture non conforme à la démo TEST.');
    info('FACTURES SPÉCIMEN — '+String(data.filtre||'toutes')+
      ' — '+String(data.date_reference||'')+' ('+String(data.fuseau_horaire||'Europe/Paris')+')'+
      '\n'+(items.length?items.map(row=>
        String(row.numero||'Numéro absent')+' — '+String(row.statut||'statut inconnu')+
        ' — TTC '+validMoney(row.montant_ttc_eur)+
        ' — reste '+validMoney(row.solde_restant_eur)+
        ' — échéance '+String(row.date_echeance||'non renseignée')+
        (row.paiement_a_verifier?' (solde à vérifier)':'')
      ).join('\n'):'Aucune facture correspondante dans le compte TEST.'));
  }else if(action==='consulter_rendez_vous'){
    const items=Array.isArray(data.rendez_vous)?data.rendez_vous:[];
    if(!data.lecture_seule||!data.fictif)throw Error('Réponse agenda non conforme à la démo TEST.');
    info('AGENDA SPÉCIMEN — '+String(data.filtre||'')+
      ' ('+String(data.fuseau_horaire||'Europe/Paris')+')\n'+
      (items.length?items.map(row=>String(row.date||'')+' '+
        String(row.heure_debut||'heure non renseignée')+
        (row.heure_fin?'–'+String(row.heure_fin):'')+
        ' — '+String(row.titre||'Rendez-vous')).join('\n'):
        'Aucun rendez-vous correspondant dans le compte TEST.'));
  }else if(action==='rechercher_devis'){
    if(data.fictif!==true||data.lecture_seule!==true||!Array.isArray(data.devis))
      throw new Error('Liste de devis non conforme au compte TEST.');
    const items=data.devis;
    info('DEVIS TEST ('+items.length+') :\n'+(items.map(d=>
      String(d.titre||'Sans titre')+' — '+validMoney(Number(d.montant_ttc))+' TTC'+
      ' — '+String(d.statut||'statut inconnu')).join('\n')||'Aucun devis dans ce compte TEST.'));
    if(container)container.hidden=false;
  }else if(action==='executer_plan_lecture'){
    const steps=Array.isArray(data.etapes)?data.etapes:[];
    info('CONSULTATIONS GROUPÉES ('+steps.length+') :\n'+steps.map((e,i)=>
      (i+1)+'. '+e.action+' — '+(e.status===200?'réponse obtenue':'erreur')+'\n'+JSON.stringify(e.result).slice(0,1800)).join('\n\n'));
  }else if(action==='consulter_briefing'){
    info('BRIEFING TEST :\n'+(data.suggestions||[]).join('\n')+'\n'+
      (data.factures_echues||[]).map(f=>f.numero+' — '+validMoney(f.solde_restant_eur)).join('\n')+'\n'+
      (data.rendez_vous_proches||[]).map(r=>r.date+' '+r.heure_debut+' — '+r.titre).join('\n'));
  }else if(action==='preparer_rendez_vous'){
    renderAppointment(data);
    info('Rendez-vous TEST préparé et NON créé. Vérifie puis clique sur confirmer.');
  }else if(action==='preparer_deplacement_rendez_vous'){
    renderAppointment(data,true);
    info('Déplacement préparé, NON appliqué. Seul un clic humain peut le valider.');
  }else if(action==='confirmer_deplacement_rendez_vous'){
    info('Rendez-vous SPÉCIMEN déplacé après clic : '+String(data.rendez_vous?.date||'')+
      ' à '+String(data.rendez_vous?.heure_debut||'')+'.');
  }else if(action==='annuler_deplacement_rendez_vous'){
    info('Déplacement annulé sans changement.');
  }else if(action==='confirmer_rendez_vous'){
    info('Rendez-vous TEST créé après clic : '+String(data.rendez_vous?.titre||'')+' — '+String(data.rendez_vous?.date||''));
  }else if(action==='annuler_rendez_vous'){
    info('Rendez-vous proposé annulé sans création.');
  }else if(action==='preparer_facture'){
    const v=data.facture||{};
    info('FACTURE NON CRÉÉE — APERÇU\n'+String(v.titre||'')+
      '\nHT '+validMoney(v.montant_ht)+' ; TVA '+validMoney(v.montant_tva)+
      ' ; TTC '+validMoney(v.montant_ttc)+'\nAucune émission, aucun numéro.');
  }else if(action==='preparer_devis'){
    renderQuote(data);
    info('Le devis est préparé. Aucune écriture de devis pour le moment : clique sur « Confirmer le brouillon fictif » après vérification.');
  }else if(action==='consulter_devis'){
    const v=data.devis,lines=data.lignes||[];
    info('DEVIS TEST ENREGISTRÉ — '+v.titre+'\n'+lines.map(l=>l.description+' : '+l.quantite+' '+l.unite+' × '+validMoney(Number(l.prix_unitaire))).join('\n')+'\nTotal TTC : '+validMoney(Number(v.montant_ttc))+'\nStatut : '+v.statut+' (SPÉCIMEN).');
  }else if(action==='confirmer_devis'){
    info('Devis brouillon fictif enregistré sous l’identifiant '+String(data.result?.devis_id||'inconnu')+'. Vérifie-le dans la zone de résultat.');
  }else if(action==='annuler_devis')info('Préparation du devis annulée, aucun devis créé.');
}
async function call(action,args={}){
  const data=await request(action,args);
  render(action,data);
  return data;
}
async function prepareManual(){
  const btn=$('angel-manual-prepare');if(btn.disabled)return;
  btn.disabled=true;
  try{
    const client_id=clientSelect.value,titre=$('angel-quote-title').value.trim(),
      description=$('angel-quote-desc').value.trim(),
      quantite=Number($('angel-quote-qty').value),
      unite=$('angel-quote-unit').value,
      price=$('angel-quote-price').value,
      vat=$('angel-quote-vat').value;
    if(!client_id||price===''||vat==='')throw new Error('Client, prix HT et TVA sont obligatoires.');
    await call('preparer_devis',{client_id,titre,lignes:[{description,quantite,unite,prix_unitaire:Number(price),taux_tva:Number(vat)}]});
  }catch(e){info('Impossible de préparer le devis : '+e.message,true);}
  finally{btn.disabled=false;}
}
async function prepareManualAppointment(){
  const btn=$('angel-rdv-prepare');if(btn.disabled)return;
  btn.disabled=true;
  try{await call('preparer_rendez_vous',{titre:$('angel-rdv-title').value.trim(),
    date:$('angel-rdv-date').value,heure_debut:$('angel-rdv-start').value,
    heure_fin:$('angel-rdv-end').value});}
  catch(e){info('Impossible de préparer : '+e.message,true);}
  finally{btn.disabled=false;}
}
async function confirm(){
  if(!pending||busy)return;
  busy=true;$('angel-business-confirm').disabled=true;$('angel-business-cancel').disabled=true;
  try{
    const type=pendingType;
    const action=type==='deplacement'?'confirmer_deplacement_rendez_vous':
      type==='rendez_vous'?'confirmer_rendez_vous':'confirmer_devis';
    const resp=await call(action,{context_id:pending,confirmation:true});
    const doc=resp.result?.devis_id;
    pending=null;pendingType=null;$('angel-business-pending').hidden=true;
    if(type==='devis'&&doc)await call('consulter_devis',{devis_id:doc});
  }catch(e){info('Échec de confirmation : '+e.message,true);}
  finally{busy=false;$('angel-business-confirm').disabled=false;$('angel-business-cancel').disabled=false;}
}
async function cancel(){
  if(!pending||busy)return;
  const ctx=pending;busy=true;
  try{await call(pendingType==='deplacement'?'annuler_deplacement_rendez_vous':
    pendingType==='rendez_vous'?'annuler_rendez_vous':'annuler_devis',{context_id:ctx});
    pending=null;pendingType=null;$('angel-business-pending').hidden=true;}
  catch(e){info('Impossible d’annuler : '+e.message,true);}
  finally{busy=false;}
}
async function toolCall(calls,options={}){
  const responses=[];
  for(const fc of calls){
    const action=String(fc.name||''),args=(fc.args&&typeof fc.args==='object'&&!Array.isArray(fc.args))?fc.args:{};
    let reply;
    diagnostic('Dernier outil vocal demandé : '+(allowed.has(action)?action:'outil refusé')+'.');
    if(options.incidentMode && ['rechercher_client','rechercher_chantier'].includes(action)){
      // Ne jamais lancer une recherche de client/chantier sur une dictée de constat.
      // Aucune donnée fictive ni résultat de recherche n'est inventé.
      reply={fictif:true,lecture_seule:true,status:'formulaire_incident_prepare',
        recherche_effectuee:false,
        message:'Demande de constat TEST : formulaire local déjà préparé. Le client et le chantier ne sont pas obligatoires. Invite l’artisan à vérifier la description puis à préparer et confirmer via le panneau.'};
      diagnostic('Signalement vocal : recherche '+action+' évitée, formulaire local prérempli.');
    }
    else if(!allowed.has(action))reply={error:'Cet outil vocal est interdit dans la démonstration.'};
    else{
      try{
        reply=action==='afficher_conversations'
          ? window.AngelConversationArchive.openPicker()
          : action==='proposer_memoire'
          ? window.AngelMemoryLearning.propose(args)
          : await call(action,args);
      }
      catch(e){reply={error:e.message};info('Ángel : '+action+' — '+e.message,true);}
    }
    responses.push({id:fc.id,name:action,response:{result:reply}});
  }
  const ws=getSocket?.();
  if(ws && ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({toolResponse:{functionResponses:responses}}));
}
// Filet de sécurité ciblé : si Gemini refuse à tort de lister les devis
// après une demande explicite, lire la vraie base TEST au lieu de répéter une impossibilité.
const cleanTitle=v=>String(v||'Sans titre').replace(/[\r\n<>\\]/g,' ').slice(0,100);
async function recoverDevisRefusal(){
  diagnostic('Réponse vocale incorrecte détectée : lecture directe des devis TEST…');
  const data=await call('rechercher_devis',{});
  if(data.lecture_seule!==true||data.fictif!==true||!Array.isArray(data.devis))
    throw new Error('Résultat TEST invalide : correction vocale annulée.');
  const list=data.devis.slice(0,30);
  const summary=list.length
    ?list.map(d=>cleanTitle(d.titre)+' : '+validMoney(Number(d.montant_ttc))+
      ' TTC, statut '+cleanTitle(d.statut)).join('; ')
    :'Aucun devis enregistré dans le compte TEST.';
  diagnostic('Lecture corrective réussie : '+list.length+' devis TEST trouvés. Correction vocale demandée.');
  return {summary,count:list.length};
}

// Parcours vocal de secours 5/6/7 : les actions préparatoires doivent être
// vérifiées par le serveur TEST même si Gemini refuse ou choisit le mauvais outil.
// Aucune confirmation ni émission n'est appelée depuis cette fonction.
function foldSpeech(raw){
  return String(raw||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}
function speechDate(text){
  const months={janvier:1,fevrier:2,mars:3,avril:4,mai:5,juin:6,juillet:7,
    aout:8,septembre:9,octobre:10,novembre:11,decembre:12};
  const m=foldSpeech(text).match(/\b([0-3]?\d)\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)(?:\s+(\d{4}))?\b/);
  if(!m)return null;
  const year=m[3]?Number(m[3]):Number(new Intl.DateTimeFormat('en-GB',{
    year:'numeric',timeZone:'Europe/Paris'}).format(new Date()));
  const month=months[m[2]],day=Number(m[1]);
  const iso=year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
  const date=new Date(iso+'T12:00:00Z');
  return date.toISOString().slice(0,10)===iso?iso:null;
}
function speechTimes(text){
  const t=foldSpeech(text);
  const found=[...t.matchAll(/\b([01]?\d|2[0-3])\s*(?:h(?:eure)?s?|:)\s*([0-5]?\d)?\b/g)];
  return found.map(m=>{
    const h=Number(m[1]),min=m[2]===undefined?0:Number(m[2]);
    return {text:String(h).padStart(2,'0')+':'+String(min).padStart(2,'0'),total:h*60+min};
  });
}
function speechMoney(text){
  const t=foldSpeech(text),out={};
  for(const m of t.matchAll(/(\d[\d \u00a0\u202f]*(?:[.,]\d{1,2})?)\s*(?:€|euros?)?\s*(?:de\s+)?(ht|ttc|tva)\b/g)){
    const amount=Number(m[1].replace(/[\s\u00a0\u202f]/g,'').replace(',','.'));
    if(Number.isFinite(amount)&&amount>=0&&amount<=1000000)out[m[2]]=amount;
  }
  return out;
}
function speechIntent(text){
  const t=foldSpeech(text);
  if(/\b(?:decale|deplacer|deplace|decal[eé]r|reporte|reporter)\b/.test(t)&&
     /\brendez[\s-]?vous\b/.test(t))return 'deplacement';
  if(/\b(?:prepare|preparer|programme|programmer|planifie|planifier|cree|creer)\b/.test(t)&&
     /\brendez[\s-]?vous\b/.test(t))return 'rendez_vous';
  if(/\b(?:prepare|preparer|fais|faire)\b/.test(t)&&
     /\bfacture\b/.test(t) && /\b(?:fictive?|apercu|simulation|specimen)\b/.test(t))
    return 'facture';
  return null;
}
function minutesClock(value){
  const parts=String(value||'').split(':');
  if(parts.length!==2)return null;
  const h=Number(parts[0]),m=Number(parts[1]);
  if(!Number.isInteger(h)||!Number.isInteger(m)||h<0||h>23||m<0||m>59)return null;
  return h*60+m;
}
function formatClock(m){
  return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
}
async function recoverBusinessVoice(text){
  const intent=speechIntent(text);
  if(!intent)return {handled:false};
  if(pending)return {handled:true,spoken:'Une proposition est déjà en attente. Vérifie-la puis confirme ou annule avant de poursuivre.'};
  try{
    if(intent==='facture'){
      const amounts=speechMoney(text);
      if(!['ht','tva','ttc'].every(k=>Object.hasOwn(amounts,k)))
        return {handled:true,spoken:'Pour préparer l’aperçu de facture fictive, précise les trois montants : HT, TVA et TTC.'};
      const data=await call('preparer_facture',{montant_ht:amounts.ht,
        montant_tva:amounts.tva,montant_ttc:amounts.ttc});
      if(data.fictif!==true||data.lecture_seule!==true||data.facture?.statut!=='NON_CREE')
        throw new Error('L’aperçu de facture n’a pas été confirmé comme non enregistré.');
      return {handled:true,spoken:'Aperçu de facture fictive préparé : '+
        validMoney(data.facture.montant_ht)+' HT, '+validMoney(data.facture.montant_tva)+
        ' de TVA, '+validMoney(data.facture.montant_ttc)+
        ' TTC. Aucune facture créée, émise ou numérotée.'};
    }
    const date=speechDate(text),hours=speechTimes(text);
    if(!date||hours.length<2)
      return {handled:true,spoken:'Précise une date complète et deux heures pour préparer ce rendez-vous fictif.'};
    if(intent==='rendez_vous'){
      const t=foldSpeech(text);
      const label=t.match(/\bpour\s+(?:un|une)\s+([^.,!?]+)/);
      const titre=(label?label[1].trim():'Rendez-vous vocal SPÉCIMEN').slice(0,115);
      const start=hours[0],end=hours[1];
      if(end.total<=start.total)
        return {handled:true,spoken:'L’heure de fin doit être après le début. Aucun rendez-vous créé.'};
      const data=await call('preparer_rendez_vous',{titre,date,
        heure_debut:start.text,heure_fin:end.text});
      if(!data.context_id||data.status!=='confirmation_requise')
        throw new Error('La proposition de rendez-vous n’a pas été acceptée.');
      return {handled:true,spoken:'Rendez-vous fictif préparé pour le '+date+
        ', de '+start.text+' à '+end.text+'. Il n’est PAS créé. Clique sur Confirmer ce rendez-vous fictif pour l’inscrire dans le calendrier TEST.'};
    }
    // Déplacement : on déduit seulement la durée d'un rendez-vous EXISTANT et
    // correspondant exactement à la date et à l'heure de départ explicitement données.
    const original=hours[0],requested=hours[1];
    if(original.total===requested.total)
      return {handled:true,spoken:'Le nouveau début doit être différent de l’ancien. Aucun changement réalisé.'};
    const list=await call('consulter_rendez_vous',{filtre:'date',date});
    if(list.fictif!==true||list.lecture_seule!==true||!Array.isArray(list.rendez_vous))
      throw new Error('Agenda TEST invalide.');
    const matches=list.rendez_vous.filter(item=>item.date===date&&item.heure_debut===original.text);
    if(matches.length!==1)return {handled:true,spoken:matches.length?
      'Plusieurs rendez-vous commencent à cette heure. Précise le rendez-vous à déplacer.' :
      'Aucun rendez-vous TEST ne commence à '+original.text+' le '+date+'. Aucun changement réalisé.'};
    const row=matches[0],from=minutesClock(row.heure_debut),to=minutesClock(row.heure_fin);
    if(from===null||to===null||to<=from)
      return {handled:true,spoken:'L’heure de fin de ce rendez-vous est inconnue. Précise la nouvelle heure de fin.'};
    const end=requested.total+(to-from);
    if(end>=24*60)
      return {handled:true,spoken:'Ce déplacement dépasse minuit et n’est pas proposé en démo TEST.'};
    const data=await call('preparer_deplacement_rendez_vous',{
      rendez_vous_id:row.id,date,heure_debut:requested.text,heure_fin:formatClock(end)});
    if(!data.context_id||data.status!=='confirmation_requise')
      throw new Error('La proposition de déplacement n’a pas été acceptée.');
    return {handled:true,spoken:'Déplacement fictif préparé pour le '+date+
      ', de '+requested.text+' à '+formatClock(end)+'. La durée initiale est conservée. Aucun changement appliqué : clique sur Confirmer le déplacement fictif.'};
  }catch(err){
    const message=String(err?.message||'erreur').slice(0,160);
    info('Ángel — demande métier : '+message,true);
    return {handled:true,spoken:'Je n’ai pas pu préparer cette action TEST : '+message+
      ' Aucune confirmation automatique ni émission de facture.'};
  }
}
function init(ctx){
  baseUrl=ctx.baseUrl;pubKey=ctx.publicKey;getToken=ctx.getToken;getSocket=ctx.getSocket;notify=ctx.notify||null;
  if(!baseUrl.startsWith('https://dchunxngtdbtgxbccmlb.supabase.co'))
    throw new Error('Refus de démarrer les outils hors Supabase Ángel V2 TEST');
  buildUI();
}
async function show(){
  if(!container)return;
  container.hidden=false;
  info('Connexion métier établie. Consultation des clients fictifs…');
  try{await call('rechercher_client',{});}
  catch(e){info('Module métier indisponible : '+e.message,true);}
}
function hide(){
  if(!container)return;container.hidden=true;
  pending=null;pendingType=null;$('angel-business-pending').hidden=true;info('Session terminée.');
  if(clientSelect)clientSelect.replaceChildren();
}
window.AngelBusinessDemo={init,show,hide,toolCall,toolDefs,recoverDevisRefusal,recoverBusinessVoice,speechIntent,speechDate,speechTimes,speechMoney};
})();
