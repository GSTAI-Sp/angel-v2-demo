// Ángel V2 — tests isolés du secours vocal suite aux retours terrain du test 4.
// Aucune connexion internet, aucun JWT et aucune mutation SQL.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const html=fs.readFileSync('index.html','utf8');
const code=html.split('<script>',2)[1].split('</script>',1)[0];
const start=code.indexOf("let spokenUserTurn=''");
const end=code.indexOf('function setState(',start);
assert.ok(start>0&&end>start,'Garde vocal du devis absent dans index.html');
const guard=code.slice(start,end);
let requestCount=0;const messages=[];const states=[];
const socket={readyState:1,send:value=>messages.push(JSON.parse(value))};
const context=vm.createContext({
  socket,stopped:false,WebSocket:{OPEN:1},
  metier:{recoverDevisRefusal:async()=>{
    requestCount++;return {count:3,summary:'Terrasse 30 m² : 5 400,00 € TTC'};
  }},
  setState:(...args)=>states.push(args),
  String,RegExp,JSON
});
vm.runInContext(guard,context,{timeout:1500});
function test(expr){return vm.runInContext(expr,context,{timeout:1500});}
assert.equal(test("isDevisListingRequest('Retrouve mes devis et donne-moi leurs montants.')"),true);
assert.equal(test("isDevisListingRequest('Liste tous mes devis.')"),true);
assert.equal(test("isDevisListingRequest('Prépare un devis de terrasse.')"),false);
assert.equal(test("isFalseDevisRefusal('Je ne peux toujours pas lister l’ensemble de vos devis.')"),true);
assert.equal(test("isFalseDevisRefusal('Voici vos trois devis TEST.')"),false);
(async()=>{
  await test("correctDevisAfterRefusal('Retrouve mes devis et donne-moi leurs montants', 'Je ne peux toujours pas lister vos devis.')");
  assert.equal(requestCount,1,'Le secours doit appeler uniquement rechercher_devis');
  assert.equal(messages.length,1,'Une seule correction envoyée à Gemini Live');
  assert.equal(messages[0].clientContent.turnComplete,true);
  assert.equal(messages[0].clientContent.turns[0].role,'user');
  assert.match(messages[0].clientContent.turns[0].parts[0].text,/5 400,00 € TTC/);
  assert.ok(states.some(x=>x[0]==='Liste de devis vérifiée'));
  await test("correctDevisAfterRefusal('Prépare un devis', 'Je ne peux pas le créer')");
  assert.equal(requestCount,1,'Jamais de secours sur les opérations de création');
  await test("correctDevisAfterRefusal('Retrouve mes devis', 'Voici vos devis')");
  assert.equal(requestCount,2,'Toute liste sans appel outil doit être confirmée par la base TEST');
  assert.equal(messages.length,2,'Une reformulation des montants vérifiés est demandée');
  test("calledDevisTool=true");
  await test("correctDevisAfterRefusal('Retrouve mes devis', 'Je ne peux pas consulter vos devis')");
  assert.equal(requestCount,2,'Pas de doublon si rechercher_devis a déjà été appelé');
  test("calledDevisTool=false;stopped=true");
  await test("correctDevisAfterRefusal('Retrouve mes devis', 'Je ne peux pas consulter vos devis')");
  assert.equal(requestCount,2,'Pas de secours après fermeture du micro');
  // Contrôle dédié du formatage des résultats et de l'isolement TEST.
  const metierCode=fs.readFileSync('metier.js','utf8');
  const begin=metierCode.indexOf('const cleanTitle=');
  const finish=metierCode.indexOf('function init(ctx)',begin);
  assert.ok(begin>0&&finish>begin);
  let read=0;const logs=[];
  const sandbox=vm.createContext({
    diagnostic:m=>logs.push(m),
    call:async(action,args)=>{
      read++;assert.equal(action,'rechercher_devis');
      assert.deepEqual(JSON.parse(JSON.stringify(args)),{});
      return {fictif:true,lecture_seule:true,
        devis:[{titre:'Terrasse 30 m²',montant_ttc:5400,statut:'brouillon'},
          {titre:'Terrasse Cumaru',montant_ttc:13752,statut:'brouillon'}]};
    },
    validMoney:n=>n.toFixed(2)+' €'
  });
  vm.runInContext(metierCode.slice(begin,finish),sandbox);
  const result=await vm.runInContext('recoverDevisRefusal()',sandbox);
  assert.equal(result.count,2);
  assert.match(result.summary,/13752.00 €/);
  assert.equal(read,1);
  assert.ok(logs.some(x=>x.includes('2 devis')));
  console.log('PASS garde devis vocal : lecture déterministe sans outil, aucune écriture et zéro doublon après appel réel.');
})().catch(error=>{console.error(error);process.exitCode=1;});
