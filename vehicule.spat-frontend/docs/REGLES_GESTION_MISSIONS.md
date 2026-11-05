# Règles de Gestion des Missions et du Parc Automobile

Ce document centralise toutes les règles métier relatives à la gestion des missions, véhicules, et contrôles mécaniques dans le système SPAT.

---

## 1. Règles sur les zones de mission

### 1.1. Zones disponibles
- **EN_VILLE_TOAMASINA** : Missions dans la ville de Toamasina uniquement
- **HORS_TOAMASINA** : Missions hors de la ville (intercommunales, interrégionales)

### 1.2. Restrictions par zone
- **Motos** : Autorisées **uniquement EN_VILLE_TOAMASINA**, **interdites HORS_TOAMASINA**
- **Voitures** : Autorisées dans **toutes les zones**

---

## 2. Règles sur les catégories de véhicules

### 2.1. Les 4 catégories de véhicules

1. **PATROUILLE_URGENCE**
   - Véhicules dédiés aux opérations de patrouille et interventions d'urgence
   - Priorité maximale, disponibilité 24h/24

2. **MISSION**
   - Véhicules affectés à une **direction unique**
   - Réservés exclusivement aux missions de cette direction

3. **MUTUALISEE**
   - Véhicules **partagés entre plusieurs directions** (maximum 5 directions)
   - Planification partagée entre les directions autorisées

4. **MOTO_ELECTRIQUE**
   - Motos électriques affectées à **une seule direction**
   - Utilisent le **niveau de charge** (%) au lieu du kilométrage
   - Soumises aux mêmes restrictions de zone que les motos classiques

### 2.2. Règles d'affectation

- Un véhicule de catégorie **MISSION** ou **MOTO_ELECTRIQUE** ne peut être affecté qu'à **1 direction**
- Un véhicule de catégorie **MUTUALISEE** peut être affecté jusqu'à **5 directions maximum**
- Un véhicule de catégorie **PATROUILLE_URGENCE** n'a pas de restriction d'affectation

---

## 3. Règles spécifiques aux motos électriques

### 3.1. Restrictions des motos

**Interdictions** :
- ❌ **Missions hors de Toamasina** (zone HORS_TOAMASINA)
- ❌ **Missions de nuit** (entre 18h00 et 06h00)
- ❌ **Missions pour la Direction Générale**

**Conducteurs** :
- Les conducteurs de motos doivent figurer sur la **liste validée des conducteurs de motos**
- Validation par le Chef du Service Logistique

### 3.2. Tracking des motos électriques

- Utilisation du **niveau de charge** (0-100%) au lieu du kilométrage
- `niveauChargeDepart` : Charge au départ
- `niveauChargeRetour` : Charge au retour

---

## 4. Règles de planification et délais

### 4.1. Délai de réservation

- **Missions planifiées** : Réservation requise au minimum **24 heures à l'avance**
- **Missions urgentes** : Validation immédiate possible avec **justification obligatoire**

### 4.2. Horaires de service

- **Horaires normaux** : 08h00 - 18h00
- **Missions de nuit** : Requièrent autorisation spéciale et justification
- **Motos interdites la nuit** (18h00 - 06h00)

---

## 5. Règles sur les navettes PACT (parapheur)

### 5.1. Circuits automatisés

Les **navettes PACT** sont des missions récurrentes automatiquement générées par le système :
- **Circuit aller** : Départ à **10h00**
- **Circuit retour** : Départ à **17h00**
- **Fréquence** : Tous les **jours ouvrables** (du lundi au vendredi)
- **Anticipation** : Générées à **J+2** (2 jours ouvrés à l'avance)

### 5.2. Mobilisabilité

- **Statut de mobilisabilité** : **VERROUILLEE**
- Les navettes parapheur **ne peuvent pas être réorganisées** ou modifiées
- Elles sont **prioritaires** et figées dans le planning

---

## 6. Règles de mobilisabilité des missions

### 6.1. Deux types de mobilisabilité

1. **FLEXIBLE**
   - Missions **réorganisables** : peuvent être reportées, annulées, ou modifiées
   - Utilisées pour les missions standard et planifiées

2. **VERROUILLEE**
   - Missions **non modifiables** et **prioritaires**
   - Exemples : Navettes PACT, missions urgentes validées, réquisitions DGAL

### 6.2. Réorganisation

- Seules les missions **FLEXIBLE** peuvent être réorganisées
- Les missions **VERROUILLEE** restent figées même en cas de conflit de planning

---

## 7. Règles sur les listes de passagers

### 7.1. Liste obligatoire (missions en ville)

- **Missions EN_VILLE_TOAMASINA** : Le champ "Liste des passagers" est **OBLIGATOIRE**
- Exemple : "Jean DUPONT, Marie CLAIRE, Paul MARTIN"

### 7.2. Liste facultative (missions hors ville)

- **Missions HORS_TOAMASINA** : Le champ "Liste des passagers" est **FACULTATIF**
- Il se peut qu'aucun passager n'accompagne le demandeur

---

## 8. Règles de contrôle et validation

### 8.1. Circuit de validation

1. **Demandeur** (Agent) : Crée la demande de mission
2. **Assistant de direction** : Première validation (N1)
3. **Chef de direction** : Validation définitive (N2) pour missions en ville
4. **Chef du Service Logistique** : Validation finale et affectation du véhicule
5. **Mécanicien DID** : Inspection technique avant départ

### 8.2. Incidents et anomalies

- Tout incident doit être signalé immédiatement au Chef du Service Logistique
- **Types d'incidents** : Panne, accident, dégradation, retard significatif
- **Gravité** : MINEURE, MOYENNE, GRAVE

---

## 9. Règles sur le carnet de bord

### 9.1. Enregistrement obligatoire

Chaque utilisation effective d'un véhicule doit être enregistrée dans le **carnet de bord** :
- Date et heure de sortie
- Date et heure de retour
- Conducteur (nom, matricule)
- Destination et motif
- **Kilométrage départ et retour** (ou niveau de charge pour motos électriques)
- Etat des lieux avant et après

### 9.2. Statuts du carnet

- **EN_COURS** : Véhicule sorti, pas encore revenu
- **CLOTURE** : Retour enregistré, mission terminée

### 9.3. Etat des lieux

Enregistrement obligatoire de l'état du véhicule :
- **AVANT** sortie : état apparent, niveau carburant, équipements, anomalies
- **APRES** retour : vérification complète, signalement d'anomalies

---

## 10. Règles d'inspection et de contrôle mécanique (DID)

### 10.1. Fiche de contrôle véhicule en mission

La fiche de contrôle DID doit être remplie avant le départ et après le retour de chaque mission. Elle comporte plusieurs sections de vérification technique.

### 10.2. Auto-population du compteur kilométrique

**Règle d'auto-remplissage du kilométrage de départ :**
- Le système récupère automatiquement le **dernier compteur km** enregistré dans l'historique du véhicule
- **Si équipé GPS** : Le kilométrage est récupéré automatiquement depuis les données GPS (fonctionnalité future)
- **Si non équipé GPS** : Le système prend le dernier `kilometrageRetour` du carnet de bord le plus récent
- **Si carnet en cours** : Le système utilise le `kilometrageDepart` du carnet en cours
- **Si aucun historique** : L'utilisateur doit effectuer une **saisie manuelle obligatoire**

**Source de données** (par ordre de priorité) :
1. Dernier `kilometrageRetour` d'un carnet CLOTURE (trajet terminé)
2. `kilometrageDepart` du carnet EN_COURS (véhicule sorti non rentré)
3. Saisie manuelle si aucune donnée disponible

**Indication visuelle** :
- Message vert : "Auto-rempli depuis dernier trajet: XXX km"
- Message gris : "Aucun historique disponible — saisie manuelle requise"
- Chargement : "Chargement du dernier kilométrage..."

### 10.3. Vérification de suffisance du carburant

**Règle de vérification du carburant de départ :**
- Le système analyse le niveau de carburant saisi au format **fraction** (3/4, 1/2), **pourcentage** (80%, 50%) ou **litres** (45L, 30L)
- **Seuil minimal recommandé** : 40% du réservoir ou équivalent
- **Alerte rouge** si carburant < 40% : "⚠ ATTENTION : Le niveau de carburant est faible. Vérifier la suffisance pour la distance prévue. Prévoir un ravitaillement si nécessaire pendant la mission."
- **Indicateur vert** si carburant ≥ 40% : "✓ Le niveau de carburant semble suffisant pour la mission."

**Formats acceptés** :
- Fraction : `3/4`, `1/2`, `1/4`
- Pourcentage : `80%`, `50%`, `25%`
- Litres : `45L`, `30L`, `15L`
- Texte : `plein`, `vide`

**Champs carburant** :
- `carburantDepart` : **Obligatoire** — Niveau avant le départ
- `carburantArrivee` : Optionnel — Niveau après le retour (pour contrôle après mission)

### 10.4. Maintenance périodique basée sur kilométrage

Le dernier compteur km enregistré devient le **point de référence** pour :
- Calcul des échéances de **maintenance périodique** (vidange, révision, etc.)
- Suivi de l'**usure** et du **kilométrage total** du véhicule
- **Alertes de maintenance** automatiques basées sur les seuils configurés

### 10.5. Sections de contrôle technique

La fiche de contrôle comporte **7 sections** détaillées :

1. **EXTERIEUR** : Carrosserie, pneus, vitres, rétroviseurs, éclairage extérieur, plaques
2. **EQUIPEMENT DE SECURITE** : Ceintures, airbags, triangle, extincteur, trousse, gilet
3. **OPERATION DU MOTEUR** : Démarrage, ralenti, bruits, fumées, vibrations, accélération
4. **NIVEAU DES FLUIDES** : Huile, refroidissement, freins, direction, lave-glaces, carburant
5. **TRAIN AVANT ET ARRIERE** : Freins, suspension, amortisseurs, cardans, transmission
6. **ECLAIRAGE / SYSTEME ELECTRIQUE** : Phares, feux, batterie, alternateur, instrumentation
7. **CIRCUIT DE CLIMATISATION** : Climatisation, chauffage, ventilation, désembuage

### 10.6. Traçabilité de la fiche

Chaque fiche de contrôle enregistre :
- **Chauffeur** (sélection depuis la liste validée)
- **Vérificateur** (mécanicien DID)
- **Date et heure de départ**
- **Date et heure d'arrivée** (contrôle après mission)
- **Destination**
- **Compteur km départ** (auto-rempli ou manuel)
- **Compteur km arrivée**
- **Carburant départ** (avec vérification de suffisance)
- **Carburant arrivée**
- **Observations du mécanicien**

### 10.7. Validation et transmission

**Avant mission** :
- Le mécanicien DID remplit la fiche de contrôle
- Il peut **enregistrer** (brouillon) ou **transmettre l'avis** au Chef du Service Logistique
- Une fois transmis, le véhicule est validé pour la sortie

**Après mission** :
- Le mécanicien DID enregistre le contrôle de retour
- Il vérifie l'état du véhicule et le kilométrage d'arrivée
- Il transmet l'avis après mission pour clôture officielle

### 10.8. Avis DID sur dossiers de maintenance

Pour les dossiers d'entretien nécessitant un avis DID, le mécanicien doit fournir :
- **Diagnostic visuel** (obligatoire)
- **Observations du mécanicien** (obligatoire)
- **Pièces ou actions nécessaires** (obligatoire)
- **Décision DID** : FAVORABLE ou DEFAVORABLE

### 10.9. Notifications d'inspection

Le système envoie des **notifications popup** au mécanicien DID lorsqu'une inspection visuelle est demandée :
- Notification avant mission (départ)
- Notification après mission (arrivée)
- Accès direct à la fiche de contrôle depuis la notification

---

## 11. Règles sur les réquisitions DGAL

### 11.1. Réquisitions prioritaires

Les **réquisitions de la Direction Générale de l'Administration Locale (DGAL)** sont des demandes prioritaires :
- **Validation immédiate** sans circuit de validation standard
- **Mobilisabilité VERROUILLEE**
- Affectation prioritaire des véhicules disponibles

---

## 12. Règles sur les missions d'urgence

### 12.1. Justification obligatoire

Toute mission d'urgence nécessite :
- **Justification écrite** de l'urgence
- **Validation du Chef de direction**
- Possibilité de validation immédiate si urgence confirmée

### 12.2. Traçabilité

Les missions d'urgence sont marquées et tracées séparément pour audit et reporting.

---

## 13. Règles de configuration et paramétrage

### 13.1. Seuils de maintenance

Les seuils de maintenance sont configurables :
- **Kilométrage** : Alertes à 5000 km, 10000 km, etc.
- **Temporelle** : Alertes à 3 mois, 6 mois, 12 mois

### 13.2. Capacités des véhicules

Chaque véhicule a des caractéristiques configurées :
- **Nombre de places** (conducteur + passagers)
- **Capacité de charge**
- **Type de carburant** (essence, diesel, électrique)
- **Equipement GPS** (oui/non)

---

## Résumé des règles critiques

✅ **Motos interdites hors ville et la nuit (18h-6h)**  
✅ **Liste passagers obligatoire en ville, facultative hors ville**  
✅ **Navettes PACT auto-générées à 10h et 17h (J+2, mobilisabilité VERROUILLEE)**  
✅ **Délai 24h pour missions planifiées, justification pour urgences**  
✅ **Maximum 5 directions pour véhicules mutualisés**  
✅ **Compteur km auto-rempli depuis historique (GPS ou manuel)**  
✅ **Alerte carburant si niveau < 40% au départ**  
✅ **Carnet de bord obligatoire pour toute sortie de véhicule**  
✅ **Fiche de contrôle DID avant et après mission**
