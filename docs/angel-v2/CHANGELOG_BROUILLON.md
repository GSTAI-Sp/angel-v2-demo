# Journal des évolutions — DÉMO Ángel V2 (brouillon non publié dans SpeedArti)

Date : 22/10/2026 · Version : `2026.10.22-test`.
Statut : **BROUILLON / À VALIDER PAR ANNE-SOPHIE ET THIBAULT**.
Périmètre : démo indépendante + Supabase TEST uniquement. **Ne pas créer/publier d'entrée dans `app_changelog` de production depuis ce dépôt.**

## Pour les artisans (à reprendre après validation)
Ángel aide à retrouver une conversation et à conserver les habitudes métier importantes, sous votre contrôle.
Vous pouvez voir vos souvenirs, proposer leur correction ou confirmer leur suppression dans la zone de test.

## Changement de sécurité du 22 octobre
La démo n'est plus autorisée à publier un commit si les contrôles GitHub échouent. La publication doit utiliser le commit vérifié et non la simple branche `main`. Seuls les fichiers publics nécessaires sont publiés. Vérifications documentées séparément.

## Tests et limites non validés
- Test humain « Mes mémoires » (consultation, correction, suppression, rappel après changement) **REPORTÉ** à la demande du responsable, statut NON VALIDÉ.
- Tests complets en situation sur téléphone et tablette **À FAIRE**.
- Isolation inter-comptes RLS, échecs réseau et limites de consommation : contrôles statiques en place mais validations négatives réelles complémentaires **À FAIRE**.
- Synchronisation prouvée avec la table `knowledge_base` existante : **NON VALIDÉE**. Aucune « base Ángel parallèle ».
- Aucune facturation ni intégration administrative de production incluse.

**Conditions pour intégration :** validateur humain + base Ángel mise à jour + tests mobiles + revue Annso + changelog brouillon réel de SpeedArti par l'équipe autorisée.
