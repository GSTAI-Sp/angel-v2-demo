// Ángel V2 : détecteur local d'une demande EXPLICITE de mémorisation.
// Fonction pure : n'écrit aucune donnée, n'envoie aucune requête et ne déduit aucune préférence.
(function(root){
  'use strict';
  function extract(text){
    if(typeof text!=='string')return null;
    const raw=text.trim().replace(/[.!?\s]+$/g,'');
    if(raw.length<12||raw.length>700)return null;
    const lead="(?:\\s*(?:(?:salut|bonjour|ok|hey)\\s+)?(?:[aàáâ]ng[eèé]l(?:e|a)?\\s*[,;:!]?\\s*)?(?:s['’]il te pla[iî]t\\s*[,;:]?\\s*)?)";
    const phrases=[
      "(?:retiens|m[eé]morise|souviens[- ]toi|garde(?:s)? en m[eé]moire|enregistre dans ta m[eé]moire)\\s+(?:bien\\s+)?(?:que\\s+)?",
      "(?:je (?:veux|voudrais|souhaite) que tu)\\s+(?:retiennes|m[eé]morises|gardes en m[eé]moire)\\s+(?:que\\s+)?",
      "(?:est[- ]ce que tu peux|tu peux|peux[- ]tu)\\s+(?:retenir|m[eé]moriser|noter)\\s+(?:que\\s+)?"
    ];
    let content=null;
    for(const phrase of phrases){
      const re=new RegExp("^"+lead+phrase+"(.+)$","iu");
      const hit=re.exec(raw);
      if(hit){content=hit[1].trim();break;}
    }
    if(!content)return null;
    content=content.replace(/^que\s+/iu,'').replace(/[\s.,!?;:]+$/g,'').trim();
    if(content.length<8||content.length>240)return null;
    if(/^(?:ne\s+|pas\s+|rien\b)/iu.test(content))return null;
    // Vocabulaire explicite, exemple : « le terme ml signifie mètre linéaire ».
    const vocab=/^(?:(?:dans le b[âa]timent|en plomberie|sur les chantiers)\s*[,;:]?\s*)?(?:le mot|le terme|l['’]abr[eé]viation)\s+(.{2,55}?)\s+(?:veut dire|signifie)\s+(.{2,95})$/iu.exec(content);
    if(vocab)return {type:'vocabulaire',source:vocab[1].trim(),cible:vocab[2].trim(),vocab_type:'synonyme'};
    return {type:'souvenir',contenu:content};
  }
  root.AngelMemoryIntent={extract};
  if(typeof module!=='undefined'&&module.exports)module.exports={extract};
})(typeof window!=='undefined'?window:globalThis);
