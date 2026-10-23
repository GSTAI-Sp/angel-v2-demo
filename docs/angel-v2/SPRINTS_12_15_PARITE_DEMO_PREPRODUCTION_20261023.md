# ÁNGEL V2 — RECETTE TEST IDENTIQUE SUR DÉMO ET PRÉPRODUCTION — 23 OCTOBRE 2026

## But et autorisation
La démo GitHub Pages **reste accessible** à `https://gstai-sp.github.io/angel-v2-demo/` sans attendre le futur sous-domaine d'Anne-Sophie. Elle réutilise les **mêmes Edge Functions et tables du compte Supabase TEST** que le développement React SpeedArti Thibault (`GSTAI-Sp/speedarti-thibault@angel-v2`). Les deux façades offrent des fonctionnalités métier TEST comparables, mais **pas la même présentation** : le sous-domaine aura la vraie barre latérale, les pages et les modules React SpeedArti ; la démo garde son interface indépendante.

**Ne jamais modifier** `GSTAI-Sp/speedarti-v2`. JWT et données de production ne sont jamais utilisés.

## Fonctionnalités à tester dès GitHub Pages
- Voix native Google Gemini Live, interruption et bouton arrêt micro permanents, 12 voix (6 femmes et 6 hommes), paramétrage vocal et mémoires EXISTANTES avec consentement.
- Lectures réelles owner-scoped des clients, chantiers, catalogue, devis existants, factures, agenda et briefing de Supabase TEST.
- Consultation vocale ou tactile des **signalements SPÉCIMENS** avec `chantier_id` et des **statuts réels des modules**.
- Préparation des devis avec client TEST, lignes, quantités, prix HT et TVA explicitement renseignés, sans enregistrer avant clic. Après clic de confirmation, un brouillon dans les tables devis et devis_lignes TEST est relu par son ID.
- Préparation rendez-vous et déplacements, confirmation humaine par clic et **relecture par date exacte + ID + heure**.
- Aperçu facture avec HT/TVA/TTC saisis et validés, sans facture enregistrée, numéro ou émission.
- Nouveau formulaire de **signalement relié à un chantier TEST** : chargement des chantiers du compte, titre, zone, description, urgence et maximum trois NOMS de photos. Préparer sans écriture, Confirmer seulement par clic puis relecture du même `id` et `chantier_id`, ou Annuler sans écriture. Aucune pièce jointe/photo envoyée.
- L'ancien constat de la démo reste utilisable pour les scénarios historiques non rattachés : il est explicitement distinct du nouveau parcours.
- Bouton visible « Tester les modules 12–15, même sans micro » pour ne pas obliger à passer par des détails repliés.

## Sécurité
Les appels Gemini sont en lecture ou préparation uniquement. Aucun outil `confirmer_*`, `enregistrer_signalement_test`, `envoyer_facture`, paiement ou upload n'est déclarable au modèle.
Les écritures TEST passent uniquement par une interaction explicite de l'artisan avec les boutons, une vérification JWT et propriétaire côté serveur, puis relecture ciblée côté démo. En cas de succès serveur suivi d'échec de relecture, le bouton Confirmer est invalidé pour éviter une répétition de l'opération.
Les scripts publics n'incluent ni clé `service_role`, ni jeton éphémère permanent, ni base de production. GitHub Pages est déployé seulement si le contrôle CI du dernier commit réussit.

## Traçabilité des commits de cette série
Chaque commit Git a un message **structuré avec Contexte, Évolution, Tests, Risques et Raccordement** et au moins 300 caractères.
- `f604377f` : deux outils Gemini en lecture seule et consultation des signalements reliés aux chantiers.
- `78adc3da` : panneaux de test factures et rapports chantier, sélecteurs et formulaires.
- `6a27d169` : validation bornée, confirmation humaine, double lecture et refus de doublons.
- `cf81efee` : tests Node exécutant les comportements réels de la démo.
- `7f8914c4` : ajout des assertions et tests obligatoires dans la CI.
- `b434b091` : registre des empreintes et des outils, CI puis Pages SUCCESS pour la première version.
- `59516f1e` : accès rapide aux modules et relecture stricte après confirmation devis/RDV.
- `fed6d38b` : tests de non-régression de ce dernier correctif.
- Registre final actualisé séparément pour homologuer la révision `metier.js`.

## Statut de validation
- **Code** : branches de démo et de préproduction séparées, intégration de leurs API TEST réalisée.
- **CI** : les assertions et tests de parité doivent tous être PASS sur la révision finale; ne pas déclarer déployé un nouveau changement avant succès des workflows CI et Pages du même SHA.
- **Tests humains** : à faire par l'artisan sur la démo avec connexion TEST, puis sur sous-domaine avec Anne-Sophie, ordinateur/iPhone/Android.
- **Sous-domaine** : non encore publié; CORS de son URL précise à configurer dans Supabase TEST.
- **Hors périmètre** : émision de factures légales, vrais devis expédiés aux clients, photos enregistrées, e-mails envoyés, import de l'ensemble du moteur professionnel SpeedArti dans le site statique, production officielle.

## Parcours de test suggéré
1. Se connecter sur la démo, vérifier les voix féminines/masculines et l'arrêt immédiat.
2. Cliquer « Tester les modules 12–15 » et comparer le nombre de clients, devis, factures, RDV à ce qui est effectivement présent dans Supabase TEST.
3. Préparer un devis, vérifier qu'il n'existe PAS encore, puis confirmer et contrôler son ID et ses montants TTC; refaire en annulant.
4. Créer un RDV SPÉCIMEN dans 2 semaines, confirmer et vérifier son jour exact.
5. Saisir un aperçu de facture HT 100, TVA 20 et TTC 120, constater **NON CRÉÉE**.
6. Charger les chantiers, en sélectionner un, rédiger un constat, préparer puis confirmer. Vérifier l'ID du chantier conservé, qu'aucune photo ni alerte n'est envoyée.
7. Vérifier qu'une modification de description APRÈS Préparer désactive le bouton Confirmer et que l'annulation ne crée rien.
8. Après publication d'Anne-Sophie, refaire les étapes dans SpeedArti Thibault, comparer les enregistrements du MÊME compte TEST, et vérifier l'UI (sidebar/bouton flottant) de l'application React.
