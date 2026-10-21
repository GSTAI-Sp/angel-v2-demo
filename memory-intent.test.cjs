// Automated assertions: explicit speech request only, no implicit memory or secret saving.
const assert=require('node:assert/strict');
const {extract}=require('./memory-intent.js');
const rememberCases=[
  ['Ángel, retiens que je préfère des réponses courtes pour les devis.','souvenir','je préfère des réponses courtes pour les devis'],
  ['Mémorise que je préfère les réponses concises.','souvenir','je préfère les réponses concises'],
  ['Souviens-toi que je travaille surtout en rénovation.','souvenir','je travaille surtout en rénovation'],
  ['Je voudrais que tu retiennes que je préfère le pin.','souvenir','je préfère le pin'],
  ['Angel, retiens que le terme ml signifie mètre linéaire.','vocabulaire','ml'],
];
for(const [phrase,type,value] of rememberCases){
  const out=extract(phrase);
  assert.ok(out,'Expected memory suggestion for: '+phrase);
  assert.equal(out.type,type);
  assert.equal(type==='souvenir'?out.contenu:out.source,value);
}
for(const phrase of [
  'Pourquoi tu ne peux pas retenir quelque chose ?',
  'Arrête de retenir toutes les informations.',
  'Ne retiens pas que je préfère le bois.',
  'Raconte-moi ton fonctionnement.',
  'Le devis du client est validé.',
  'Bonjour, comment ça va ?',
]){
  assert.equal(extract(phrase),null,'No proposal expected for: '+phrase);
}
console.log('PASS 11/11: deterministic explicit speech memory intent and non-intent tests');
