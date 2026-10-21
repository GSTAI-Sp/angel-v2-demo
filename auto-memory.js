// Ángel V2 TEST — suggestions automatiques conservatrices, sans écriture.
// Analyse seulement les propos finalisés de l'artisan, après activation volontaire.
// Aucun accès réseau, aucune extraction des données de clients ou financières.
(function(root){
'use strict';
const clean=s=>String(s||'').replace(/\s+/g,' ').trim().replace(/[.!?;:,]+$/,'').trim();
function unsafe(s){
  return /(?:@|https?:|www\.|<|>|\b(?:mot de passe|password|secret|token|api\s*key|iban|rib|siret|siren|code d'accès|identifiant|num[eé]ro de t[eé]l[eé]phone|adresse|n[o°]\s*de\s*compte|client|prospect|monsieur|madame|m\.\s+[A-Z]|mme|mle|facture|chiffre d'affaires|taux de tva|tva|tarif|prix|euro|€|r[eé]mun[eé]ration|salaire|marge|code postal|chiffrement|virement|banque|parti|religion|maladie|m[eé]dicament)\b|\+?\d[\d\s.-]{6,}\d)/iu.test(s);
}
function normalize(s){return clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function key(p){
  if(!p)return '';
  return normalize(p.type==='vocabulaire'?'voc:'+p.source+'='+p.cible:p.type==='preference'?'pref:'+p.categorie+'='+p.valeur:'souvenir:'+p.contenu);
}
function extract(text){
  if(typeof text!=='string')return null;
  const raw=clean(text);
  if(raw.length<18||raw.length>260||unsafe(raw))return null;
  // Ne pas interpréter les négations, questions, suppositions, tiers ou citations.
  if(/\?|^(?:ne |non |si |peut[- ]être|imagine |il |elle |le client|on m'a dit|tu |vous |comment |pourquoi |quel|quand )/iu.test(raw))return null;

  // Définition personnelle: la formulation doit explicitement concerner son entreprise.
  const vocab=/^(?:chez moi|dans mon entreprise|dans notre [eé]quipe|sur nos chantiers)[,\s]+(?:le mot|le terme|l['’]abr[eé]viation)\s+(.{2,32}?)\s+(?:signifie|veut dire)\s+(.{2,80})$/iu.exec(raw);
  if(vocab){
    const source=clean(vocab[1]),cible=clean(vocab[2]);
    if(source.length<=32 && cible.length<=80 && !unsafe(source)&&!unsafe(cible))
      return {type:'vocabulaire',source,cible,vocab_type:'synonyme'};
  }

  // Préférences explicites de communication, sans prix ni obligations métier.
  const style=/^(?:(?:pour mes devis|pour les devis|pour les factures|quand je te parle|pour les explications)\s*[,;:]?\s*)?je (?:pr[eé]f[eè]re|veux|souhaite)\s+(?:que tu\s+)?((?:me\s+)?(?:r[eé]pondes?|fasses?\s+des\s+r[eé]ponses?)\s+.{6,125})$/iu.exec(raw);
  const short=/^(?:(?:pour mes devis|pour les devis)\s*[,;:]?\s*)?je (?:pr[eé]f[eè]re|veux|souhaite)\s+(?:des\s+)?(?:r[eé]ponses?|explications?)\s+.{5,115}$/iu.exec(raw);
  if(style||short){
    const result=clean(raw);
    if(result.length<=180)return {type:'souvenir',contenu:result};
  }

  // Habitudes de matériaux clairement exprimées, sans recette constructeur implicite.
  const material=/^(?:je (?:pr[eé]f[eè]re|travaille (?:surtout|principalement) avec|utilise (?:habituellement|souvent))|dans mon entreprise[,;:]?\s*(?:je|nous)\s+(?:pr[eé]f[eè]re|utilisons souvent))\s+(?:du|de la|de l['’]|des|le|la|les)\s+([a-zà-ÿ][a-zà-ÿ -]{2,55})$/iu.exec(raw);
  if(material){
    const value=clean(material[1]);
    const exclusions=/\b(?:personne|client|maison|chantier|heure|jour|d[eé]lai|semaine|mois|norme|dt[u]|r[eè]gle)\b/iu;
    if(!exclusions.test(value) && value.length<=55)
      return {type:'preference',categorie:'materiaux_favoris',valeur:value};
  }
  return null;
}
root.AngelAutoMemory={extract,key};
if(typeof module!=='undefined'&&module.exports)module.exports={extract,key};
})(typeof window!=='undefined'?window:globalThis);
