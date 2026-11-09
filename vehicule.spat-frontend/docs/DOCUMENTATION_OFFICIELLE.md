# Documentation officielle — SPAT Gestion du parc automobile

| Référence | Valeur |
|---|---|
| Version du document | 1.0 |
| Date | 19 octobre 2026 |
| Périmètre | Application de gestion du parc automobile SPAT |
| Langue | Français |

Ce document présente les fonctions, les règles de gestion et les éléments techniques du projet `vehicule.spat`. Il s’adresse aux utilisateurs, aux responsables fonctionnels et aux équipes qui installent ou maintiennent l’application. Les comptes, mots de passe, clés et adresses internes ne font pas partie de cette documentation.

## 1. Présentation

SPAT Gestion du parc automobile est une application web interne destinée à centraliser les demandes de mission et le suivi des ressources de transport. Elle associe une interface web Next.js à une API Spring Boot et une base relationnelle PostgreSQL.

Les objectifs principaux sont de :

- gérer les véhicules, les fiches conducteurs et leur disponibilité ;
- enregistrer, planifier, valider et clôturer les missions ;
- suivre l’entretien, les contrôles techniques, les incidents et les opérations de carburant ;
- fournir des tableaux de bord, des rapports et des informations GPS lorsque cette intégration est configurée ;
- tracer les décisions au moyen de comptes utilisateurs et de notifications.

## 2. Profils et responsabilités

Les accès effectifs dépendent du rôle attribué au compte. Les rôles ci-dessous sont ceux déclarés par l’application ; un administrateur habilité gère les comptes et leur activation.

| Profil | Responsabilités principales |
|---|---|
| `SUPER_ADMIN` | Administration générale, comptes et habilitations. |
| `ADMIN` | Gestion des référentiels et des modules d’administration (véhicules, fiches conducteurs, utilisateurs, affectations, maintenance, carburant, rapports et statistiques selon les droits configurés). |
| `CHEF_DIRECTION` | Compte et espace masqués, ainsi que l'intérim Chef de direction. Les comptes et la page sont conservés pour une réactivation future. |
| `ASSISTANT_DIRECTION` | Gestion des missions en ville (voiture ou moto selon disponibilité). La création hors ville est masquée. Selon la configuration de la direction, consulte le calendrier partagé et son véhicule affecté. |
| `CHEF_SERVICE_LOGISTIQUE` | Création et traitement des missions hors ville, vérification de disponibilité, affectation manuelle d’un véhicule et d’un chauffeur, première validation et suivi du parc. |
| `MECANICIEN_DID` | Contrôles visuels demandés avant mission, avis technique, ainsi que signalement et suivi des entretiens dans son périmètre. |
| `CHEF_DGAL` | Seconde validation des missions transmises après la première validation. |
| Données conducteur | Les conducteurs sont des fiches d'affectation gérées par la Logistique. Aucun compte ni espace de connexion conducteur n'est ouvert. |
| `AGENT_FLOTTE` | Opérations de flotte et traitement des urgences selon les droits configurés. |
| `DIRECTEUR_DFP` | Rôle référencé par le backend ; les écrans et permissions associés dépendent des droits configurés dans l’application. |

L’accès aux pages est également contrôlé côté API. Masquer une page dans l’interface ne remplace pas les vérifications d’autorisation du serveur.

## 3. Règles de gestion des missions

### 3.1 Zones et véhicules

- Une mission est qualifiée comme **en ville (Toamasina)** ou **hors ville**.
- Le compte Chef de direction est masqué. Le Chef du Service Logistique crée désormais les missions hors ville.
- L’Assistant de direction planifie uniquement les missions en ville. Son parcours de création hors ville est conservé mais masqué pour une éventuelle réactivation.
- Les missions en ville peuvent utiliser une voiture ou une moto, selon les règles et ressources configurées.
- Une mission hors ville est affectée à une voiture. Une moto ne doit pas être proposée ni affectée.
- Pour une demande hors ville, le Chef du Service Logistique choisit le véhicule et le chauffeur. Le demandeur ne présélectionne pas ces ressources dans le circuit normal.
- La disponibilité d’un véhicule ou d’un chauffeur se vérifie sur toute la période de la mission. Le calendrier peut signaler le jour de départ sans afficher une réservation sur chaque jour intermédiaire ; une autre demande qui chevauche la période doit toutefois être détectée comme conflit.

### 3.2 Circuit d’une mission hors ville

Le circuit fonctionnel est le suivant :

1. Le Chef du Service Logistique clique sur **Nouvelle mission**, à côté de **Navettes parapheurs PACT**, et saisit le bénéficiaire, son entité, le motif, la destination, la durée, les dates, le forfaitaire et les passagers.
2. Il sélectionne le véhicule et le chauffeur dans la section **Choisir le véhicule** du formulaire. Le ticket créé apparaît dans les tickets à traiter avec les ressources choisies, après vérification de leur disponibilité par le serveur.
3. La création envoie automatiquement la demande d’inspection visuelle au mécanicien DID et place le ticket en attente de son avis. Un popup confirme l’envoi avec l’immatriculation choisie ; aucun envoi manuel supplémentaire n’est nécessaire.
4. Le mécanicien réalise l’inspection visuelle et consigne son avis.
5. Après un avis favorable, le Chef du Service Logistique effectue la première validation (N°1).
6. Le Chef DGAL effectue la seconde validation (N°2).
7. Le Service Logistique conserve l'affectation du conducteur. La clôture, le carnet de bord et le signalement sont enregistrés dans les espaces habilités du portail.
8. La mission clôturée est conservée dans l’historique.

Si l’avis DID est défavorable, le Chef du Service Logistique choisit un autre véhicule disponible et un chauffeur compatible avant de relancer l’inspection. Les contrôles précédents restent consultables dans l’historique du ticket.

### 3.3 Missions en ville

L’Assistant de direction crée et suit les demandes en ville. Le formulaire permet de préciser le type de véhicule autorisé et les informations de mission. Le traitement de clôture en ville est distinct du circuit de clôture opérationnel des missions hors ville ; les règles propres à l’Assistant de direction restent applicables.

### 3.5 Ordre de mission et signature manuelle

Le détail d'une mission propose la génération d'un PDF d'ordre de mission. Le document contient les informations de la demande et une zone de signature manuelle. Le bouton d'envoi transmet le PDF en pièce jointe à l'adresse email du compte demandeur ; l'envoi nécessite une adresse email et une configuration SMTP valides. Le document signé est ensuite déposé dans les justificatifs de la réservation et validé par le Service Logistique.

### 3.4 Dates, disponibilité et urgences

La date de début et la date de fin définissent la période de réservation. Deux demandes pour une même ressource dont les périodes se chevauchent ne peuvent pas être considérées comme indépendantes, même si elles ne commencent pas le même jour.

Le délai de dépôt, le caractère tardif et l’urgence opérationnelle sont des notions séparées. Une demande à moins de 24 heures n’est pas automatiquement une urgence : une justification peut être demandée selon le formulaire et les règles configurées.

## 4. Modules de l’application

| Module / espace | Utilité |
|---|---|
| Connexion | Authentification par matricule et mot de passe, puis redirection selon le rôle. |
| Chef de direction | Espace masqué, conservé pour une réactivation future. |
| Assistant de direction | Calendrier et gestion des missions en ville. |
| Chef de Service Logistique | Disponibilités, affectations, contrôles DID, validations de niveau 1, urgences et suivi des demandes. |
| Chef DGAL | Suivi et validation de niveau 2. |
| Fiches conducteurs | Données d'affectation et de permis consultées par la Logistique ; aucun espace de connexion. |
| Mécanicien DID | Avis de contrôle, demandes et compte rendu d’entretien. |
| Agent flotte / Dispatch | Vue opérationnelle de la flotte et traitement des demandes ou urgences selon les droits accordés. |
| Administration | Référentiels des véhicules, chauffeurs, affectations, utilisateurs, carburant, entretien, missions, rapports et statistiques. |
| Notifications | Alertes liées aux demandes et décisions, avec accès aux notifications de l’utilisateur connecté. |
| GPS | Positions et historique des véhicules équipés, si le service GPS externe est activé et configuré. |

### 4.1 Mode d'emploi utilisateur

#### Connexion et navigation

1. Ouvrir la page de connexion et saisir le matricule et le mot de passe attribués.
2. L'application ouvre l'espace correspondant au rôle du compte.
3. Utiliser les menus de cet espace pour créer, consulter ou traiter les éléments autorisés. En cas d'accès refusé, vérifier l'activation du compte et son rôle auprès du Super Admin.

#### Sélection d'une personne dans un formulaire

Dans les formulaires équipés du sélecteur du personnel, saisir une partie du nom, du prénom, du matricule, de la direction ou du poste. Choisir le résultat correspondant à l'aide de son bouton radio. Les champs d'identité reliés au formulaire sont alors préremplis. Vérifier la sélection avant d'enregistrer. Le répertoire ne fournit pas toutes les coordonnées ; les champs absents, notamment l'adresse email ou le téléphone, doivent être complétés manuellement lorsqu'ils sont requis.

#### Création et traitement d'une mission

**Chef du Service Logistique — création hors ville**

1. Dans l'espace Logistique, cliquer sur **Nouvelle mission**, à côté de **Navettes parapheurs PACT**.
2. Renseigner le bénéficiaire (nom et prénom), la direction/département/service, le motif et la période de mission hors ville.
3. Le type de véhicule est automatiquement défini comme "Voiture" et la zone comme "Hors ville de Toamasina". Ces champs ne sont pas modifiables.
4. Renseigner le lieu de placement (destination), le nombre de jours, les dates de départ et retour et le forfaitaire. Le point de départ est fixé à SPAT Toamasina.
5. Ajouter les informations sur les passagers (nombre et liste).
6. Dans **Choisir le véhicule**, sélectionner une voiture et un chauffeur disponibles, puis créer le ticket. L’inspection visuelle est demandée automatiquement ; le popup confirme l’envoi avec l’immatriculation. Attendre le retour du mécanicien avant de poursuivre les validations habituelles.

**Assistant de direction**

1. Cliquer sur **Nouvelle mission**.
2. **Étape 1 - Choix du véhicule** :
   - La zone est fixée à "Dans la ville de Toamasina".
   - Choisir le moyen matériel : Moto ou Voiture.
3. **Étape 2 - Mission en ville** (formulaire rapide) :
   - Date du jour (automatique)
   - Moyen matériel (affiché en lecture seule)
   - Prénom (si moto) ou Nom (si voiture)
   - Heure de départ
   - Objet de la mission
   
   Le formulaire hors ville est masqué. Son code est conservé pour une réactivation future via `MISSIONS_HORS_VILLE_ASSISTANT_ACTIVEES` dans `app/assistant-direction/page.tsx`.
   
4. **Suivi et clôture** :
   - Pour une mission en ville : suivre dans le calendrier, puis au retour renseigner la date/heure de retour, ajouter un incident si nécessaire et cliquer sur **Clôturer**

**Service Logistique, mécanicien DID et Chef DGAL**

1. Le Chef du Service Logistique ouvre la demande hors ville, vérifie les conflits de disponibilité, puis affecte manuellement une voiture et un chauffeur.
2. Il transmet le véhicule au mécanicien DID pour inspection visuelle.
3. Le mécanicien enregistre son avis. Si un autre véhicule est requis, le Service Logistique choisit un remplacement et relance l'inspection.
4. Après l'avis requis, le Chef du Service Logistique réalise la validation N°1, puis le Chef DGAL réalise la validation N°2.

**Chauffeur**

1. Ouvrir l'espace Chauffeur et consulter les missions affectées au compte.
2. Au retour, renseigner les informations de clôture demandées et signaler tout incident.
3. Après clôture, consulter la mission dans l'historique lorsqu'il est disponible.

#### Export des statistiques de missions

Dans le calendrier de l'Assistant de direction, définir le mois de début et le mois de fin, puis cliquer sur **Exporter CSV (Excel)**. La période est calculée à partir du mois de départ des missions. Le fichier comprend une ligne de total pour la période et une ligne par mois, avec le nombre de missions, leur répartition en ville/hors ville et voiture/moto, leur état actif ou historisé, le nombre d'incidents et les durées cumulée et moyenne. Les durées sont calculées à partir des retours renseignés. Le CSV utilise un séparateur adapté à Excel en français.

#### Administration des utilisateurs et des personnels

Le Super Admin gère les comptes dans **Utilisateurs**, consulte le répertoire dans **Liste des personnels** et gère les profils des chauffeurs dans **Comptes chauffeurs**. Le répertoire, les comptes utilisateurs et les fiches chauffeurs sont des jeux de données distincts. Les emails affichés dans le répertoire sont associés aux comptes enregistrés par matricule ; un email absent du compte ne peut pas être déduit du répertoire personnel.

## 5. Statuts des demandes

Les principaux statuts métier utilisés dans le circuit des missions sont :

| Statut | Signification |
|---|---|
| `EN_ATTENTE` | Demande reçue, à traiter par le Service Logistique. |
| `EN_ATTENTE_AVIS_DID` | Véhicule transmis pour inspection ; l’avis DID ou la suite du traitement est attendu. |
| `VALIDEE_N1` | Première validation effectuée ; la demande attend le niveau 2. |
| `VALIDEE` | Seconde validation effectuée. |
| `REFUSEE` | Demande refusée ; le motif et l’auteur sont conservés lorsqu’ils sont renseignés. |
| `CLOTUREE` | Mission clôturée après son exécution. |

Des statuts supplémentaires peuvent exister dans des modules opérationnels ou techniques. Le statut affiché par l’interface dépend de l’état renvoyé par l’API.

## 6. Architecture technique

```text
Navigateur
   │ HTTPS / JSON / API REST
   ▼
Frontend Next.js (React, TypeScript)
   │ Authorization: Bearer <JWT>
   ▼
Backend Spring Boot (Java 21)
   ├── Spring Security et authentification JWT
   ├── Services métier et contrôleurs REST
   ├── Spring Data JPA / Hibernate
   ├── PostgreSQL
   └── Services externes optionnels : courriel et GPS
```

Le frontend se trouve dans `vehicule.spat-frontend`. Le backend se trouve dans `vehicule.spat-backend`. Les données métier sont structurées autour des entités telles que `Reservation`, `Vehicule`, `Chauffeur`, `Utilisateur`, `Maintenance`, `Sinistre`, `Assurance`, `Affectation` et `TransactionCarburant`.

### Principales routes API

Toutes les routes API sont préfixées par `/api`. Les permissions et paramètres détaillés sont définis dans les contrôleurs et la configuration de sécurité.

| Préfixe | Ressource |
|---|---|
| `/auth` | Connexion et authentification. |
| `/reservations` | Demandes, missions, disponibilités, avis DID et décisions N1/N2. |
| `/vehicules`, `/chauffeurs`, `/affectations` | Ressources et affectations. |
| `/maintenances`, `/sinistres`, `/assurances`, `/carburant` | Entretien, incidents, assurances et carburant. |
| `/notifications` | Notifications de l’utilisateur connecté. |
| `/chauffeur` | Route conservée pour compatibilité et redirigée vers l'accès non autorisé. |
| `/dashboard`, `/rapports`, `/gps` | Indicateurs, rapports et données GPS. |

Exemples de routes visibles dans l’API : `POST /api/auth/login`, `GET /api/reservations/mes`, `GET /api/reservations/{id}/disponibilites` et `GET /api/notifications/me`.

## 7. Installation et démarrage local

### 7.1 Prérequis

- Node.js **20.9 ou supérieur** et npm pour Next.js ;
- Java **21** pour Spring Boot ;
- PostgreSQL accessible depuis le backend ;
- PowerShell sur Windows, ou un terminal équivalent pour les commandes adaptées au système ;
- accès aux dépendances npm/Maven lors de la première installation.

### 7.2 Configurer la base et le backend

Créer une base PostgreSQL dédiée et un compte applicatif avec les permissions nécessaires. Configurer la connexion, le secret JWT et les intégrations nécessaires dans l’environnement d’exécution du backend. Les noms des propriétés Spring correspondent notamment à :

```text
SPAT_DB_URL
SPAT_DB_USERNAME
SPAT_DB_PASSWORD
SPAT_JWT_SECRET
```

Les propriétés de messagerie et GPS sont nécessaires uniquement si ces intégrations sont activées. Se référer aux clés présentes dans `vehicule.spat-backend/src/main/resources/application.properties`. Ne pas copier de secrets réels dans la documentation, dans Git ou dans un fichier livré au navigateur.

Dans PowerShell :

```powershell
cd vehicule.spat-backend
.\mvnw.cmd spring-boot:run
```

Le port Spring Boot par défaut est `8080`, sauf surcharge de configuration.

### 7.3 Configurer et lancer le frontend

Créer `vehicule.spat-frontend/.env.local` (fichier local, non destiné à être publié) :

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

Puis lancer l’interface :

```powershell
cd vehicule.spat-frontend
npm install
npm run dev
```

L’application est disponible par défaut sur `http://localhost:3000`. Pour générer et exécuter la version de production :

```powershell
npm run build
npm run start
```

Le backend doit être démarré et connecté à PostgreSQL pour que les fonctions métier puissent charger ou enregistrer les données.

## 8. Connexion et sécurité

L’utilisateur se connecte avec son matricule et son mot de passe. L’API vérifie le compte, son état actif et le mot de passe, puis renvoie un jeton JWT. Le frontend utilise ce jeton pour les appels protégés ; le backend reste l’autorité qui contrôle les rôles.

Pour un environnement réel :

- servir le frontend et l’API en HTTPS ;
- fournir un secret JWT long, privé et renouvelable via un gestionnaire de secrets ou les variables d’environnement ;
- ne jamais réutiliser de mots de passe d’exemple ni inclure un `.env.local` réel dans une livraison ;
- limiter CORS aux origines réellement utilisées. La configuration du projet autorise actuellement `http://localhost:3000` ; elle doit être adaptée avant une publication sur un autre domaine ;
- restreindre l’accès à PostgreSQL et organiser les sauvegardes/restaurations ;
- désactiver ou sécuriser les comptes inutilisés et attribuer le rôle minimal nécessaire.

## 9. Exploitation et maintenance

- Les comptes et les données de référence conditionnent les listes de choix : véhicules, catégories, fiches conducteurs, permis, directions et affectations doivent être tenus à jour. Aucun compte conducteur n'est nécessaire.
- Une liste de chauffeurs disponible dépend de la compatibilité du chauffeur avec le véhicule et de l’absence de conflit sur la période demandée.
- Une demande de contrôle DID conserve l’avis du mécanicien et l’historique des tentatives de remplacement du véhicule.
- Les notifications et courriels peuvent dépendre des paramètres du serveur de messagerie ; leur indisponibilité doit être diagnostiquée dans les journaux du backend.
- Les positions GPS nécessitent un traceur associé au véhicule et un accès valide au service GPS externe.
- Avant une mise à jour, sauvegarder la base, livrer les versions frontend/backend compatibles, vérifier les variables d’environnement et confirmer la connexion à PostgreSQL.

## 10. Sauvegarde et mise à jour de la base de données

Le backend utilise PostgreSQL. Hibernate crée ou met à jour les tables au démarrage (`spring.jpa.hibernate.ddl-auto=update`). Flyway mémorise les évolutions SQL versionnées. La base existante est prise comme référence **V1** ; les prochaines migrations commencent à **V2**. Cette configuration de transition préserve le démarrage actuel tout en permettant de suivre les changements SQL.

### Avant une mise à jour

1. Prévoir une fenêtre de maintenance et arrêter les écritures dans l'application.
2. Depuis PowerShell, dans `vehicule.spat-backend`, créer une sauvegarde :

   ```powershell
   .\scripts\backup-db.ps1
   ```

   Le script lit `SPAT_DB_URL`, `SPAT_DB_USERNAME` et `SPAT_DB_PASSWORD` depuis l'environnement. Il nécessite `pg_dump` dans le `PATH` et crée un fichier PostgreSQL au format custom dans `vehicule.spat-backend/backups/`. Ce dossier est ignoré par Git.
3. Restaurer la sauvegarde dans une base de test séparée et y essayer la migration. Ne pas effectuer une restauration de test sur la base active.
4. Vérifier les données ainsi que les écrans touchés dans l'application de test.

### Créer et appliquer une migration

Créer un nouveau fichier dans `vehicule.spat-backend/src/main/resources/db/migration/`. Le nom respecte la forme `V<version>__<description>.sql`, par exemple `V2__ajout_numero_reference.sql` :

```sql
ALTER TABLE nom_table
    ADD COLUMN numero_reference VARCHAR(80);
```

Adapter l'exemple à la table et aux règles concernées, choisir un numéro supérieur au dernier appliqué et vérifier les effets sur les lignes existantes. Flyway applique les migrations inédites au démarrage du backend et enregistre leur historique dans `flyway_schema_history`.

Ne pas modifier ou supprimer une migration déjà appliquée dans un environnement partagé. Pour corriger son résultat, créer une nouvelle migration. Tester d'abord sur la copie restaurée, puis déployer le même script sur les autres environnements. Après le redémarrage, vérifier les journaux du backend et les parcours concernés.

### Restaurer en cas de problème

Flyway ne génère pas de retour arrière automatique. En cas d'échec, conserver les journaux et corriger avec une nouvelle migration ou une restauration préalablement testée. Pour restaurer, créer une base distincte et y charger le fichier avec `pg_restore`, puis vérifier les données avant de reconfigurer l'application. Ne pas écraser la base active sans avoir contrôlé la sauvegarde et la cible.

La référence V1 correspond au schéma existant et n'est pas reconstruite à partir d'un script SQL initial. Lorsqu'une base vide est créée, Hibernate génère encore les tables à partir des entités JPA. Avant de basculer entièrement vers une création du schéma par migrations, il faudra générer et valider un script initial complet sur une base de test.

## 11. Dépannage courant

| Symptôme | Vérifications à effectuer |
|---|---|
| « `NEXT_PUBLIC_API_URL` n’est pas configurée » | Vérifier `vehicule.spat-frontend/.env.local`, son URL et redémarrer Next.js après modification. |
| Erreur réseau ou interface sans données | Vérifier que le backend tourne, que l’adresse de l’API est correcte et que CORS autorise l’origine du frontend. |
| Erreur de connexion à l’API | Vérifier la base PostgreSQL, les identifiants et les journaux Spring Boot. |
| Accès refusé après connexion | Vérifier le rôle du compte, son activation et la permission de l’endpoint concerné. |
| Aucun véhicule disponible | Vérifier la catégorie requise, le statut opérationnel, la période demandée et les autres réservations qui la chevauchent. |
| Aucun chauffeur proposé | Vérifier son statut, sa compatibilité avec le véhicule et ses affectations sur la période. |
| Échec du contrôle DID, courriel ou GPS | Vérifier les données du véhicule, les identifiants de l’intégration et les journaux de l’API. |

## 12. Références du dépôt

- Interface web : `vehicule.spat-frontend/`
- API : `vehicule.spat-backend/`
- Configuration applicative backend : `vehicule.spat-backend/src/main/resources/application.properties`
- Contrôleurs REST : `vehicule.spat-backend/src/main/java/com/vehicule/Spat/vehicule/spat_backend/controller/`
- Entités métier : `vehicule.spat-backend/src/main/java/com/vehicule/Spat/vehicule/spat_backend/model/`
- Règles d’accès HTTP : `vehicule.spat-backend/src/main/java/com/vehicule/Spat/vehicule/spat_backend/config/SecurityConfig.java`

---

**Fin du document — SPAT Gestion du parc automobile**
