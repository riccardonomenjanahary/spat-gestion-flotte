# SPAT — Gestion du parc automobile

Application web de gestion des véhicules, des missions et des opérations de flotte de la Société du Port à Gestion Autonome de Toamasina (SPAT). Les fiches de conducteurs restent des données d'affectation ; aucun compte ni espace conducteur n'est ouvert.

## Documentation

La [documentation officielle du projet](docs/DOCUMENTATION_OFFICIELLE.md) décrit les profils, les règles métier, le circuit des missions, les modules, l’installation, la configuration et les principes d’exploitation.

## Démarrage rapide

Le dépôt contient deux applications distinctes :

- `vehicule.spat-frontend` : interface Next.js ;
- `vehicule.spat-backend` : API Spring Boot connectée à PostgreSQL.

### Prérequis

- Node.js 20.9 ou supérieur et npm ;
- Java 21 ;
- PostgreSQL ;
- le wrapper Maven fourni dans `vehicule.spat-backend`.

### API

Préparer une base PostgreSQL et configurer `SPAT_DB_URL`, `SPAT_DB_USERNAME`, `SPAT_DB_PASSWORD` et un secret JWT fort (`SPAT_JWT_SECRET`). Depuis `vehicule.spat-backend` :

```powershell
.\mvnw.cmd spring-boot:run
```

Par défaut, Spring Boot écoute sur le port `8080`.

### Interface web

Créer `vehicule.spat-frontend/.env.local` avec l’adresse de l’API :

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

Depuis `vehicule.spat-frontend` :

```powershell
npm install
npm run dev
```

Ouvrir ensuite [http://localhost:3000](http://localhost:3000). Pour un déploiement, voir les exigences de configuration et de sécurité dans la documentation complète.

### Préparer une mise à jour de la base

Avant une évolution, sauvegarder la base avec `scripts/backup-db.ps1`, tester la migration sur une copie, puis créer un nouveau fichier SQL versionné dans `vehicule.spat-backend/src/main/resources/db/migration` (par exemple `V2__ajout_colonne.sql`). La procédure complète et les précautions de restauration figurent dans la [documentation officielle](docs/DOCUMENTATION_OFFICIELLE.md#10-sauvegarde-et-mise-à-jour-de-la-base-de-données).

## Mode d'emploi

### Se connecter

1. Ouvrir l'application et saisir le matricule et le mot de passe du compte.
2. Après connexion, utiliser l'espace correspondant au rôle attribué au compte.
3. Si l'accès à une fonction est refusé, vérifier auprès du Super Admin que le compte est actif et possède le bon rôle.

### Choisir une personne dans un formulaire

Dans les formulaires concernés, utiliser le champ de recherche portant le nom du rôle attendu (par exemple **Demandeur**, **Conducteur** ou **Chauffeur**). Saisir une partie du nom, du prénom, du matricule, de la direction ou du poste, puis choisir la bonne personne dans les résultats. Les champs associés sont alors remplis. Vérifier les informations avant l'enregistrement ; les coordonnées absentes du répertoire, comme l'email, restent à saisir manuellement.

### Qui fait quoi selon le rôle

| Rôle | Fonctionnalités dans l'outil |
|---|---|
| **Super Admin** | Gère les comptes utilisateurs, consulte le répertoire du personnel et les habilitations. |
| **Admin** | Administre les véhicules, les fiches conducteurs, les directions et affectations ; peut rattacher un véhicule à cinq directions au maximum ; gère les utilisateurs et les données de maintenance, carburant et missions ; consulte les rapports et statistiques. |
| **Directeur DFP** | Consulte les écrans d'administration et les indicateurs autorisés en lecture seule, selon les droits configurés. |
| **Chef de direction** | Crée et suit les demandes de mission hors ville de sa direction avec une voiture uniquement ; consulte le calendrier et l'historique. |
| **Assistant de direction** | Crée et suit les missions en ville (voiture ou moto) et les demandes hors ville (voiture uniquement) ; clôture les missions en ville ; consulte l'historique et exporte les statistiques mensuelles au format CSV. |
| **Chef du Service Logistique** | Traite les demandes hors ville, vérifie les disponibilités, affecte manuellement le véhicule et le chauffeur, transmet le véhicule à l'inspection DID et effectue la validation N°1. Suit aussi les dossiers logistiques, entretiens et échéances présentés dans son espace. |
| **Mécanicien DID** | Effectue l'inspection visuelle demandée, enregistre son avis, signale les travaux nécessaires et met à jour les dossiers d'entretien qui lui sont attribués. |
| **Chef DGAL** | Supervise les indicateurs présentés dans son espace et effectue la validation N°2 des missions qui lui sont transmises. |
| **Conducteur** | Fiche d'affectation gérée par la Logistique ; aucun compte ni espace de connexion. |
| **Agent Flotte** | Suit les véhicules, missions et positions GPS ; traite les opérations de carburant, assurances et sinistres ainsi que les urgences prévues dans son espace. |

L'ancienne route **Dispatch** redirige vers les affectations enregistrées dans la base ; aucun jeu de données de démonstration n'y est affiché.

### Règles de gestion du dispositif DGAL

#### 1. Zones et types de véhicules

- Toute demande de véhicule est saisie dans le portail et suit le circuit correspondant à sa catégorie.
- Les véhicules mutualisés et les motos sont planifiés par l'Assistant de direction ; les véhicules de mission et les autres demandes passent par le Service Logistique.
- **Une mission hors ville utilise uniquement une voiture. Une moto ne peut pas être utilisée pour les missions hors ville.** Le Chef du Service Logistique choisit la voiture et le conducteur après vérification de la disponibilité.
- **Les missions en ville peuvent utiliser soit une moto, soit une voiture**, selon les ressources disponibles et les règles d'affectation de la direction.
- **L'espace Chef de direction est dédié exclusivement aux missions hors ville**. Le formulaire propose uniquement des voitures ; aucun choix de moto n'est disponible.
- **L'espace Assistant de direction gère deux types de missions** :
  - **Missions en ville** : formulaire rapide avec choix entre moto et voiture
  - **Missions hors ville** : formulaire complet similaire au Chef de direction, avec voiture uniquement

#### 2. Catégories de véhicules

Le dispositif DGAL reconnaît quatre catégories de véhicules :

- **Véhicule de patrouille et d'urgence** : Réservé aux patrouilles de sûreté/sécurité et aux urgences motivées. Ne peut pas servir de navette.
- **Véhicule de mission** : Traité par le Service Logistique, ordre de mission obligatoire (signature manuelle). Exemples : 1614 WWA, 1615 WWA.
- **Voiture de service mutualisée** : Affectée par groupe de Directions (6 véhicules). Peut être affectée à 5 directions maximum.
- **Moto électrique** : Une par Direction hors Direction Générale. Affectée à une seule Direction. Interdite à la Direction Générale.

#### 3. Règles d'affectation

- **Un véhicule peut être affecté à cinq directions maximum** (sauf moto électrique : une seule direction).
- **Une moto électrique ne peut être affectée à la Direction Générale.**
- **Une moto électrique est affectée à une seule Direction** ; elle ne peut pas être mutualisée.
- Une direction sélectionnée ne peut apparaître qu'une seule fois dans l'affectation d'un véhicule.

#### 4. Règles des motos électriques

- **Interdiction de nuit** : Toute réservation de nuit est interdite pour les motos électriques (par défaut : 18:00 à 06:00).
- **Conducteurs autorisés** : Le conducteur de la moto doit figurer sur la liste validée par le Directeur de sa Direction.
- **Une direction par moto** : Affectation exclusive à une seule Direction (pas de mutualisation).
- **Pas à la DG** : Aucune moto ne peut être affectée à la Direction Générale.
- **Hors ville interdit** : Les motos ne peuvent pas effectuer de missions hors ville.
- **Niveau de charge** : Le carnet de bord enregistre le niveau de charge (0-100 %) au lieu du kilométrage.

#### 5. Délais et urgences

- **Délai de 24 heures** : Une demande déposée moins de 24 heures avant le départ nécessite une urgence motivée et tracée.
- **Mission planifiée** : Une demande future doit être déposée au moins 24 heures à l'avance.
- **Urgence opérationnelle** : Une urgence doit être justifiée dans le champ "Motif d'urgence".
- **Demande tardive** : Une demande tardive (< 24h) doit comporter une justification ; elle ne constitue pas automatiquement une urgence.
- **Mission en ville planifiée** : Doit être demandée au moins 24 heures à l'avance et respecter les horaires 08:00–12:00 ou 14:00–18:00.

#### 6. Horaires et périodes

- **Horaires de travail** : Par défaut, 08:00–12:00 et 14:00–18:00 (pause méridienne : 12:00–14:00).
- **Hors horaires** : Une mission hors horaires (avant 08h, après 18h, pause méridienne, week-end ou jour férié) exige une justification dans les observations avant validation.
- **Week-end et jours fériés** : Nécessitent une observation justificative et une validation préalable.
- **Jours fériés** : Configurables via `app.dispositif.jours-feries` (format : dates séparées par des virgules).

#### 7. Mobilisabilité

- **FLEXIBLE** : Mission pouvant éventuellement être réorganisée par le Service Logistique en cas d'urgence. Ne signifie PAS qu'un véhicule peut être doublement affecté.
- **VERROUILLEE** : Mission qui ne doit normalement pas être déplacée. Statut par défaut pour :
  - Les missions hors ville
  - Les missions urgentes EXPRESS
  - Les navettes PACT
  - Les missions en ville à partir de leur heure de départ prévue
- **Passage automatique** : Les missions en ville passent de FLEXIBLE à VERROUILLEE (affichée comme "Planifiée") à leur heure de départ.

#### 8. Validation et circuit

- Après la validation N°1, l'ordre de mission des véhicules de mission est disponible en téléchargement pour signature manuelle. Le Chef DGAL effectue ensuite la validation N°2 ; le PDF peut être envoyé au demandeur par email lorsqu'il est renseigné.
- **Inspection DID** : Obligatoire pour les véhicules de mission avant validation N°1. Si l'avis est défavorable, le Service Logistique choisit un autre véhicule.
- **Ordre de mission** : Obligatoire pour les véhicules de mission. Signature manuelle requise, validation avant la mission.

#### 9. Fiche de contrôle mécanique (DID)

- **Auto-population du kilométrage** : Le système récupère automatiquement le dernier compteur km enregistré dans l'historique du véhicule (carnet de bord). Si équipé GPS (fonctionnalité future), le kilométrage sera récupéré automatiquement. Sinon, le système utilise le dernier `kilometrageRetour` du carnet de bord ou le `kilometrageDepart` du carnet en cours. Si aucun historique n'existe, une saisie manuelle est requise.
- **Vérification du carburant** : Le système analyse le niveau de carburant saisi (formats acceptés : fraction 3/4, pourcentage 80%, litres 45L) et affiche une alerte si le niveau est inférieur à 40%. L'alerte indique : "⚠ ATTENTION : Le niveau de carburant est faible. Vérifier la suffisance pour la distance prévue. Prévoir un ravitaillement si nécessaire pendant la mission."
- **Maintenance périodique** : Le dernier compteur km devient le point de référence pour le calcul des échéances de maintenance (vidange, révision, etc.).
- **Motos électriques** : Utilisent le niveau de charge (0-100%) au lieu du kilométrage.
- **7 sections de contrôle** : EXTERIEUR, EQUIPEMENT DE SECURITE, OPERATION DU MOTEUR, NIVEAU DES FLUIDES, TRAIN AVANT ET ARRIERE, ECLAIRAGE/SYSTEME ELECTRIQUE, CIRCUIT DE CLIMATISATION.
- **Clôture et inspection** : Disponibles dans les 24 dernières heures de la mission uniquement.

#### 9. Navette parapheurs PACT

- **Circuits automatiques** : Génération automatique des occurrences de navette PACT (circuits de 10h et 17h).
- **Planification** : Les navettes sont générées pour le prochain jour ouvrable après-demain (anticipation > 24h).
- **Jours ouvrables** : Les samedis, dimanches et jours fériés sont exclus de la génération.
- **Catégorie interdite** : Les véhicules de patrouille ne peuvent pas servir de navette.
- **Mobilisabilité** : Les navettes sont automatiquement VERROUILLEE.

#### 10. Disponibilité et contrôles bloquants

- Toute période est contrôlée contre les réservations et indisponibilités existantes.
- Une panne, une maintenance, une assurance expirée ou absente, une carte grise non validée ou une visite technique expirée bloque l'affectation.
- **Carte grise** : Doit être chargée et validée avant toute utilisation du véhicule.
- **Permis de conduire** : Obligatoire pour toute voiture. Le permis du chauffeur doit être renseigné et valide jusqu'à la fin de la mission.
- **Chauffeur disponible** : Vérifié sur toute la période de la mission. Un conflit avec une autre mission bloque l'affectation.

#### 11. Incidents et échéances

- Un incident (panne, dommage, contravention ou accident) rend automatiquement le véhicule indisponible et alerte le Service Logistique et l'assistante concernée.
- Les échéances d'assurance, de visite technique et d'entretien sont alertées à J-30, J-15 et J-7. Les notifications sont conservées dans l'application et peuvent être envoyées par email.
- **Retour en retard** : Les missions en ville dépassant leur durée estimée génèrent une alerte automatique invitant à vérifier le retour et clôturer la mission.

#### 12. Carnet de bord et traçabilité

- Le carnet de bord conserve les horaires, la destination, le motif, le conducteur, le kilométrage ou le niveau de charge, ainsi que l'état avant/après et les anomalies.
- Les opérations de carburant et de recharge acceptent un justificatif. Le GPS est rapproché du kilométrage déclaré lorsqu'un traceur et les identifiants du prestataire sont configurés.
- Chaque utilisation effective d'un véhicule doit être enregistrée : date, conducteur, horaires de sortie et de retour, destination, motif, kilométrage (ou niveau de charge pour les motos).

#### 13. Réquisition DGAL

- Le DGAL peut réquisitionner un véhicule ; le motif, les personnes prévenues et l'opération sont tracés dans le journal.
- Les réquisitions sont créées et gérées par le Chef DGAL uniquement.
- Une réquisition active apparaît dans le planning et rend le véhicule indisponible pour d'autres missions.

#### 14. Urgences de dernière minute

- Seul un ticket validé au niveau 2 peut faire l'objet d'un changement de dernière minute.
- **Mission FLEXIBLE** : Peut être réorganisée par l'Agent Flotte.
- **Mission VERROUILLEE** : Nécessite une dérogation exceptionnelle explicite. La dérogation est tracée dans le motif d'urgence et l'historique.
- Un ticket d'urgence EXPRESS est créé et hérité des validations N°1 et N°2 du ticket initial.

#### 15. Configuration

Les valeurs configurables (jours fériés, horaires, catégories, affectations, identifiants GPS et SMTP) doivent être renseignées avant la recette sur les données officielles.

**Paramètres configurables** :
- `app.dispositif.debut-travail` (défaut : 08:00)
- `app.dispositif.fin-travail` (défaut : 18:00)
- `app.dispositif.debut-pause` (défaut : 12:00)
- `app.dispositif.fin-pause` (défaut : 14:00)
- `app.dispositif.debut-nuit` (défaut : 18:00)
- `app.dispositif.fin-nuit` (défaut : 06:00)
- `app.dispositif.jours-feries` (format : dates ISO séparées par des virgules)

### Créer et traiter une mission

- **Chef de direction** : créer une demande hors ville en cliquant sur **Nouvelle mission**. Renseigner le bénéficiaire, le motif, la destination et les dates. Le type de véhicule est automatiquement défini comme voiture (les motos ne sont pas disponibles pour les missions hors ville). Suivre ensuite l'avancement du ticket dans le calendrier.
- **Assistant de direction** : cliquer sur **Nouvelle mission**, puis :
  1. **Choisir d'abord la zone de mission** : "Dans la ville de Toamasina" ou "Hors ville de Toamasina"
  2. **Choisir le type de véhicule** :
     - Si zone = "Dans la ville de Toamasina" : moto ou voiture disponibles
     - Si zone = "Hors ville de Toamasina" : voiture uniquement (pas de moto)
  3. **Compléter le formulaire adapté** :
     - Mission en ville : formulaire rapide (date, heure, bénéficiaire, objet)
     - Mission hors ville : formulaire complet (bénéficiaire, dates, destination, passagers)
  
  Pour une mission en ville, utiliser le calendrier pour suivre la mission ; au retour, renseigner la date et l'heure de retour, ajouter un incident si nécessaire et clôturer. La mission clôturée rejoint l'historique. Pour une mission hors ville, la demande suit le circuit de validation du Service Logistique.
  
- **Chef du Service Logistique** : traiter les demandes hors ville, vérifier la disponibilité, affecter manuellement une voiture et un chauffeur, puis transmettre le véhicule au mécanicien DID avant la première validation.
- **Mécanicien DID** : inspecter le véhicule transmis et saisir son avis.
- **Chef DGAL** : consulter les demandes transmises et effectuer la seconde validation.
- **Conducteur** : les données de conducteur sont affectées par le Service Logistique ; aucun compte de connexion conducteur n'est disponible. La clôture, le carnet de bord et le signalement sont enregistrés par les espaces habilités.

### Documents, rapports et traçabilité

- L'ordre de mission se télécharge depuis le détail d'une mission en PDF, avec une zone de signature manuelle. Il peut être envoyé en pièce jointe au demandeur si son compte possède une adresse email.
- **Admin > Rapports** fournit la disponibilité, les incidents, les échéances et les taux d'utilisation par véhicule et par direction. Les états sont exportables en Excel compatible (`.xls`), PDF et CSV.
- **Admin > Modifications** présente le journal des opérations de modification : auteur, rôle, méthode, chemin, résultat HTTP et date.
- Les actions de mise en service, reprise de l'inventaire, recette avec les assistantes et formation sont des étapes organisationnelles à réaliser avec les équipes ; elles ne sont pas simulées par l'application.

### Exporter les statistiques de missions

Dans l'espace **Assistant de direction**, ouvrir le calendrier, choisir le mois de début et le mois de fin, puis cliquer sur **Exporter CSV (Excel)**. Le fichier contient une synthèse totale de la période et une ligne par mois : nombre de missions, répartition par zone et type de véhicule, missions historisées ou actives, incidents et durées. Il s'ouvre dans Excel ou dans un tableur compatible.

### Gérer les personnels et les chauffeurs

Le **Super Admin** peut gérer les comptes dans **Utilisateurs** et consulter **Liste des personnels**. Les fiches conducteurs servent uniquement à l'affectation par la Logistique ; aucun compte conducteur ne doit être créé. La sélection d'une personne par matricule remplit les champs d'identité disponibles. Les emails absents du compte restent à renseigner avant un envoi d'ordre de mission.

Pour le détail des responsabilités, du circuit de validation, de l'installation et du dépannage, consulter la [documentation officielle](docs/DOCUMENTATION_OFFICIELLE.md).
