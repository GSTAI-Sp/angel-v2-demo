// Ángel V2 — outils de DEMONSTRATION connectés au Supabase de TEST uniquement.
// Jamais de secrets serveur ici, aucun accès à SpeedArti production.
(() => {
'use strict';
const allowed=new Set(['rechercher_client','rechercher_chantier','rechercher_catalogue','preparer_devis','consulter_devis','afficher_conversations','proposer_memoire']);
const toolDefs=[
 {name:'rechercher_client',description:'Recherche un client fictif SpeedArti. Sans nom, liste les clients. Utilise ce résultat pour identifier un client avant un devis.',parameters:{type:'OBJECT',properties:{nom:{type:'STRING',description:'Nom du client demandé (facultatif)'}}}},
 {name:'rechercher_chantier',description:'Consulte la liste des chantiers fictifs dans SpeedArti TEST.',parameters:{type:'OBJECT',properties:{}}},
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
let container=null,clientSelect=null,resultBox=null,pending=null,busy=false;
const $=(id)=>document.getElementById(id);
function el(tag,text='',cls=''){
  const x=document.createElement(tag);if(cls)x.className=cls;
  if(text)x.textContent=text;return x;
}
function info(message,isError=false){
  if(resultBox){resultBox.textContent=message;resultBox.classList.toggle('business-error',isError);}
}
function validMoney(n){return typeof n==='number'&&Number.isFinite(n)?n.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €':'—';}
function buildUI(){
  container=el('section','','card angel-business');container.id='angel-business-panel';container.hidden=true;
  container.innerHTML=`
    <div class="test-label">Modules métier connectés · données fictives</div>
    <h2 style="margin:9px 0 4px">Ángel peut aussi agir</h2>
    <p class="muted">Demande-lui « cherche mes clients », « quels sont mes chantiers ? » ou « prépare un devis ». Tu peux consulter les résultats ici, sans quitter la conversation.</p>
    <div id="angel-business-status" class="output" role="status" aria-live="polite">Connecte-toi pour interroger la base de test.</div>
    <div id="angel-business-pending" class="quote-box" hidden>
      <h2>Devis en attente de confirmation</h2>
      <div id="angel-business-preview" class="quote-line"></div>
      <div class="actions">
       <button class="primary" id="angel-business-confirm" type="button">Confirmer le brouillon fictif</button>
       <button class="secondary" id="angel-business-cancel" type="button">Annuler</button>
      </div>
    </div>
    <details>
      <summary>Vérifier les modules manuellement, même sans micro</summary>
      <div class="toolbuttons">
        <button class="secondary" id="angel-find-clients" type="button">Voir les clients</button>
        <button class="secondary" id="angel-find-jobs" type="button">Voir les chantiers</button>
        <button class="secondary" id="angel-find-items" type="button">Voir le catalogue</button>
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
    </details>
  `;
  $('voicePanel').insertAdjacentElement('afterend',container);
  clientSelect=$('angel-client-choice');resultBox=$('angel-business-status');
  for(const [id,action] of [['angel-find-clients','rechercher_client'],['angel-find-jobs','rechercher_chantier'],['angel-find-items','rechercher_catalogue']]){
    $(id).addEventListener('click',()=>{void call(action,{}).catch(error=>info('Erreur : '+error.message,true));});
  }
  $('angel-manual-quote').addEventListener('submit',event=>{event.preventDefault();void prepareManual();});
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
  pending=data.context_id;
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
async function confirm(){
  if(!pending||busy)return;
  busy=true;$('angel-business-confirm').disabled=true;$('angel-business-cancel').disabled=true;
  try{
    const resp=await call('confirmer_devis',{context_id:pending,confirmation:true});
    const doc=resp.result?.devis_id;
    pending=null;$('angel-business-pending').hidden=true;
    if(doc)await call('consulter_devis',{devis_id:doc});
  }catch(e){info('Échec de confirmation : '+e.message,true);}
  finally{busy=false;$('angel-business-confirm').disabled=false;$('angel-business-cancel').disabled=false;}
}
async function cancel(){
  if(!pending||busy)return;
  const ctx=pending;busy=true;
  try{await call('annuler_devis',{context_id:ctx});pending=null;$('angel-business-pending').hidden=true;}
  catch(e){info('Impossible d’annuler : '+e.message,true);}
  finally{busy=false;}
}
async function toolCall(calls){
  const responses=[];
  for(const fc of calls){
    const action=String(fc.name||''),args=(fc.args&&typeof fc.args==='object'&&!Array.isArray(fc.args))?fc.args:{};
    let reply;
    if(!allowed.has(action))reply={error:'Cet outil vocal est interdit dans la démonstration.'};
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
  pending=null;$('angel-business-pending').hidden=true;info('Session terminée.');
  if(clientSelect)clientSelect.replaceChildren();
}
window.AngelBusinessDemo={init,show,hide,toolCall,toolDefs};
})();
