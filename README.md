# Ángel V2 — Démonstration publique (préparation)

Dépôt PUBLIC destiné **uniquement à la partie déployable de l'interface de démonstration** d'Ángel Live.
Le vrai code source et les fonctions métier restent dans le dépôt privé `GSTAI-Sp/speedarti-thibault` (branche `angel-v2`).

## État au 20 octobre 2026

- Dépôt et écran d'information publics créés.
- **Aucune démo vocale opérationnelle n'est publiée** : le service de jetons Gemini et les clés API de test ne sont pas encore prêts.
- Supabase de développement, jamais la base de production : `dchunxngtdbtgxbccmlb`.
- La démonstration doit utiliser uniquement des identités et données **fictives**.

## Politique de publication obligatoire

Ne jamais copier du dépôt privé vers ce dépôt :
- `supabase/`, migrations, fonctions Edge, sauvegardes `*.sql`, archives ou données réelles ;
- `.env*`, clés privées, fichiers Google Cloud ou secrets de service ;
- moteur d'exécution métier, logique de protection ou base de connaissances privée.

Pour publier plus tard : générer une version frontend compilée et contrôlée, analyser les fichiers produits (absence de secrets/données/code métier serveur), puis publier **uniquement les fichiers statiques approuvés**. Une clé Supabase publiable est conçue pour être côté client mais ne confère pas de droit particulier à elle seule ; maintenir RLS et les contrôles serveur.

## Contrôles avant activation de la vraie démo

1. Authentification de test et liste blanche admin vérifiées sur Supabase.
2. Clé Gemini de test uniquement dans les secrets Edge Functions.
3. Émission de jetons Gemini temporaires, quotas et contrôle d'accès testés.
4. RLS et RPC auditables, aucun accès à la production.
5. Tests Safari/iPhone, interruptions, arrêt du microphone.
6. Déploiement web confirmé et lien HTTP(S) testé.

Pas d'engagement de disponibilité tant que ces conditions ne sont pas remplies.
