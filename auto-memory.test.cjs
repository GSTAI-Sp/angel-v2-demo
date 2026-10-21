// Ángel V2 TEST : seules des habitudes explicites et sans risque peuvent être suggérées.
// Aucune mémoire n'est enregistrée par ce moteur.
const assert=require('node:assert/strict');
const {extract,key}=require('./auto-memory.js');
const positives=[
 ['Pour mes devis, je préfère des réponses courtes.','souvenir'],
 ['Je préfère des réponses courtes pour mes devis.','souvenir'],
 ['Je préfère que tu répondes de façon courte.','souvenir'],
 ['Je travaille surtout avec du pin.','preference'],
 ['Dans mon entreprise, l’abréviation ml signifie mètre linéaire.','vocabulaire']
];
for(const [spoken,type] of positives){
 const p=extract(spoken);
 assert.ok(p,'Habit must be suggested: '+spoken);
 assert.equal(p.type,type);
 assert.ok(key(p).length>5);
}
const negatives=[
 'Peux-tu m’expliquer ce qu’est une préférence ?',
 'Je préfère du pin pour mon client Dupont.',
 'Le client Jean Dupont veut du pin.',
 'Le taux de TVA est de 10 %.',
 'Je préfère 120 € pour la terrasse.',
 'Mon mot de passe est password123.',
 'On m’a dit que le pin était préférable.',
 'Bonjour Ángel, fais-moi un devis.',
 'Ma banque est en centre-ville.',
 'Si je préfère travailler en pin, ça marche ?',
 'Je souhaite récupérer ma facture.',
 'Je préfère que tu répondes à mon client par email.',
 'Je travaille surtout avec du pin pour monsieur Dupont.',
 'Je veux conserver mon SIRET 12345678901234.',
 'Quel est le prix du cumaru ?'
];
for(const spoken of negatives)assert.equal(extract(spoken),null,'Never suggest memory for: '+spoken);
assert.equal(extract(''),null);
assert.equal(extract('Je travaille surtout avec du pin.'.repeat(30)),null);
assert.equal(key(extract('Je préfère des réponses courtes pour mes devis.')),
  key(extract('Je préfère des réponses courtes pour mes devis.')),
  'Duplicate canonical keys remain stable');
console.log('PASS: automatic memory classifier 23 positive/negative/duplicate/length checks');
