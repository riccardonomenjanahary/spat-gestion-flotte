# Mise en service des contrôles DGAL

## Supervision globale dans l'espace Admin

Le menu **Supervision globale** et le raccourci de l'accueil Admin ouvrent `/admin/supervision`.
Cette page consulte les données existantes sans créer, valider, modifier ou supprimer de dossier.
Elle couvre le planning des missions confirmées et réquisitions actives, les occurrences PACT,
les carnets et états des lieux, les incidents, les sinistres, les fiches de sûreté et leurs PDF,
les échéances à 30 jours ou dépassées et les habilitations motos.
Les listes déjà présentes dans l'Admin (missions, véhicules, chauffeurs, affectations, comptes,
carburant, maintenance, assurances, GPS et journal des modifications) ne sont pas dupliquées.
Les missions sont uniquement lues pour alimenter le planning commun et les occurrences PACT.

La recherche, les filtres de période et statut, la pagination et les exports portent sur les données chargées.
Les horaires sont affichés à Madagascar.
Une actualisation toutes les 30 secondes est effectuée lorsque la page est visible ; un bouton permet de la forcer.
Chaque source en erreur est signalée explicitement et ses indicateurs affichent un tiret plutôt qu'un zéro trompeur.

Le Directeur DFP et le Co-admin disposent de la même consultation. Les droits GET des carnets,
états des lieux, fiches de sûreté, comptes et journal leur sont ouverts ; leurs mutations restent interdites.
L'Admin conserve ses droits existants dans les autres modules. Redémarrer le backend pour charger
les règles de sécurité actualisées. Cette vue de supervision ne crée pas de carnet automatique
et ne transforme pas les réquisitions en carnets : ces évolutions du circuit opérationnel sont distinctes.

Les migrations Flyway V9 et V10 ajoutent la validité du permis chauffeur et la date du prochain entretien. Elles s'appliquent au démarrage selon la configuration Flyway existante. Aucune donnée de production n'a été modifiée pendant cette intervention.

Avant d'activer les parcours sur les données existantes :

- Renseigner les dates de validité des permis dans la gestion des chauffeurs.
- Renseigner l'assurance couvrant toute la mission et la visite technique dans la fiche véhicule ; déposer et valider sa carte grise.
- Utiliser les quatre catégories officielles du dispositif et configurer les Directions associées dans le référentiel.
- Faire valider les conducteurs de motos par le Directeur de leur Direction.
- Déposer et faire valider l'ordre de mission signé avant l'affectation d'un véhicule de mission.

Les horaires confirmés sont lundi–vendredi, 08:00–12:00 et 14:00–18:00. Une mission chevauchant la pause méridienne, s'étendant sur plusieurs jours, le week-end ou un jour férié exige une justification dans les observations ; la décision finale conserve l'auteur et la date de validation.

Les propriétés Spring suivantes permettent d'adapter les heures sans changement de code :

```properties
app.dispositif.debut-travail=08:00
app.dispositif.debut-pause=12:00
app.dispositif.fin-pause=14:00
app.dispositif.fin-travail=18:00
app.dispositif.debut-nuit=18:00
app.dispositif.fin-nuit=06:00
# À renseigner à partir du calendrier officiel : dates ISO séparées par des virgules.
app.dispositif.jours-feries=
```

La plage de nuit 18:00–06:00 est provisoire et doit être confirmée. Aucun jour férié n'est inventé ni préchargé. La génération PACT exclut actuellement les week-ends ; le calendrier officiel doit être renseigné avant la recette.

Les navettes 10 h et 17 h sont créées automatiquement pour un prochain jour ouvrable à J+2, avec un demandeur logistique actif. Les week-ends et les jours fériés configurés sont exclus. Une occurrence existante n'est pas recréée après changement de statut.

Dans l'espace Chef du Service Logistique, le panneau « Navettes parapheurs PACT » permet de choisir une voiture et un chauffeur. « Affecter et planifier » passe directement la navette EN_ATTENTE à PLANIFIEE si tous les contrôles sont conformes, sans seconde validation DGAL. Le permis, la compatibilité du chauffeur, les conflits de réservation, la conformité documentaire et l'ordre de mission pour un véhicule de mission restent bloquants. Les véhicules de patrouille et les motos sont exclus de ce circuit de transport avec chauffeur. L'auteur de l'affectation et sa date sont conservés dans les champs de validation N1 ; aucun auteur N2 n'est inventé. Les missions ordinaires conservent leur circuit. Les occurrences générées avant cette évolution sont reconnues par leurs caractéristiques précises, sans reprise destructive des données.

La recette finale doit couvrir les interfaces de carnet de bord et d'état des lieux, incidents, réquisitions, conducteurs autorisés, recharge et sinistres ; la présence des API ne suffit pas à certifier ces parcours. L'import de l'inventaire officiel, les droits de chaque profil, le raccordement au prestataire GPS, la réception SMTP, les exports et les essais sur PostgreSQL restent à vérifier avec les données et les accès réels. Les ateliers fonctionnels et la formation des assistantes restent à organiser.

## Vérification automatisée des parcours et profils

La chaîne de sécurité HTTP est exercée pour les onze rôles existants, sans base de données : autorisations de validation, administration, atelier, incidents, réquisitions et profils en lecture seule. Ces tests utilisent des sessions simulées et une route de sonde ; les règles des vrais contrôleurs sont testées séparément avec des repositories simulés. Ils ne constituent pas une recette visuelle ni un test d'intégration PostgreSQL.

Les cas métier couvrent la validation/refus par l'assistante du groupe autorisé, la validation avant départ, l'interdiction de clôturer un ticket non validé, les habilitations motos validées par le Directeur de la bonne Direction, l'identité du déposant issue du matricule JWT, le cloisonnement des pièces et carnets, les relevés de retour et la conservation des indisponibilités après clôture.

L'espace Assistante propose désormais une date future, une destination, une justification d'urgence sous 24 heures et une décision explicite avec choix du chauffeur. Les espaces Directeur et Assistante donnent accès à la liste des conducteurs motos. La logistique consulte le planning partagé dans un panneau dédié ; la décision reste dans le circuit de sa catégorie. Le chauffeur consulte ses missions affectées, y compris en ville.

Commande de test ciblée, sans démarrage de l'application ni connexion à PostgreSQL :

```powershell
mvn -o '-Dtest=*ParcoursTest,*ProfilsTest,ProfilsHttpTest,ValidationDirectionControllerTest,ReglesDispositifServiceTest,DisponibiliteDispositifTest,AccesParcoursServiceTest,StatutApresClotureTest' test
```

La recette sur comptes réels reste à effectuer avec les services backend et PostgreSQL disponibles, puis avec le GPS et SMTP. Les parcours de recharge, de sinistre et les exports n'ont pas encore fait l'objet de tests fonctionnels complets.
