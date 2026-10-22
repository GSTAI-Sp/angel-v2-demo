# SPEEDARTI — CONVENTION DE COMMITS ULTRA-DÉTAILLÉS

Applicable à chaque modification de la démo Ángel V2 (branche `main`) à partir du 22/10/2026.
**But : retrouver précisément pourquoi un choix a été fait et préparer le raccordement au vrai SpeedArti.**

## Format imposé

```text
type(angel-v2): objet métier très précis de la modification

Contexte: origine du besoin, bug observé ou règle SpeedArti concernée.
Évolution: liste des fichiers changés, fonctions touchées, comportement avant/après.
Tests: commandes exécutées, nombre de cas, résultat réel PASS/FAIL et tests encore non effectués.
Risques: cas limites, compatibilité ancienne version, protections maintenues et blocages.
Raccordement: impact concret sur l'intégration future à SpeedArti, service métier, données, UX ou 'aucun'.
```

Chaque champ doit contenir une explication réelle (pas « RAS » générique). Minimum 300 caractères pour le message complet, avec les cinq rubriques exactes. Un commit n'est **pas** une preuve que le test utilisateur a été effectué.

## Livraisons et traçabilité
- Un changement fonctionnel cohérent = un commit identifiable ; séparer modifications indépendantes.
- Avant modification : dépôt, branche, propriétaire et autorisation confirmés ; ne pas pousser ailleurs.
- Avant commit : consulter les fichiers existants, examiner le diff et l'effet de bord.
- Ajouter tests automatisés pertinents et renouveler les empreintes des sources de comportement dans `knowledge-and-release.json` après revue, pas pour masquer un échec.
- Actualiser les connaissances existantes d'Ángel si une commande ou un module change et préciser sa limite connue.
- Aucune livraison vers production depuis cette démo. Workflow CI requis avant GitHub Pages.
- Lorsque l'évolution concerne un comportement visible par l'artisan, mettre à jour le brouillon de changelog.
- Si un test humain est reporté : conserver **EN ATTENTE**, les étapes, résultats attendus, risques et limite de validation.
- Les messages antérieurs à cette convention étaient parfois trop courts ; ne pas réécrire leur historique de manière destructive.

## Interdictions
- « fix bug », « update », « push » comme seuls messages.
- Affirmer un test vocal réel en s'appuyant uniquement sur des mocks.
- Publier des clés, JWT, coordonnées client, données privées ou captures contenant des secrets.
- Faire un commit directement sur `GSTAI-Sp/speedarti-v2` depuis la mission Ángel V2.
