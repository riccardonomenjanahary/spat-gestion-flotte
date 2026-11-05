# Guide de Dépannage - Problèmes de Mémoire Backend

## 🔴 Symptômes

- Le serveur backend s'arrête brusquement
- Message d'erreur : `Out of Memory Error`
- Fichiers `hs_err_pid*.log` générés
- Compilation ou tests échouent sans raison apparente

---

## 🔍 Diagnostic

### 1. Vérifier les logs d'erreur JVM

```powershell
Get-ChildItem hs_err_*.log | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | Get-Content -Head 30
```

Si vous voyez `insufficient memory` ou `Out of Memory Error`, c'est un problème de mémoire.

### 2. Vérifier la mémoire système disponible

```powershell
Get-CimInstance Win32_OperatingSystem | Select-Object @{Name="TotalRAM(GB)";Expression={[math]::Round($_.TotalVisibleMemorySize/1MB,2)}}, @{Name="FreeRAM(GB)";Expression={[math]::Round($_.FreePhysicalMemory/1MB,2)}}
```

**Recommandation** : Au moins 3-4 GB de RAM libre pour compiler et exécuter le backend.

---

## ✅ Solutions

### Solution 1 : Utiliser le script de démarrage optimisé (RECOMMANDÉ)

```powershell
cd d:\PROJET SPAT2026\vehicule.spat-backend
.\start-backend-optimized.ps1
```

Ce script configure automatiquement :
- Heap initial : 512 MB
- Heap maximum : 2048 MB (2 GB)
- Metaspace : 512 MB
- Garbage Collector G1 (optimisé)

### Solution 2 : Configurer manuellement MAVEN_OPTS

Avant de lancer Maven, définissez :

```powershell
$env:MAVEN_OPTS = "-Xms512m -Xmx2048m -XX:MaxMetaspaceSize=512m -XX:ReservedCodeCacheSize=240m -XX:+UseG1GC"
.\mvnw.cmd spring-boot:run
```

### Solution 3 : Réduire la mémoire si système limité

Si votre système a **moins de 8 GB de RAM**, utilisez des valeurs plus faibles :

```powershell
$env:MAVEN_OPTS = "-Xms256m -Xmx1024m -XX:MaxMetaspaceSize=256m"
.\mvnw.cmd spring-boot:run
```

⚠️ **Attention** : La compilation sera plus lente et les tests pourraient échouer.

### Solution 4 : Nettoyer les processus Java zombies

Parfois des processus Java restent bloqués et consomment de la mémoire :

```powershell
# Voir les processus Java
Get-Process java -ErrorAction SilentlyContinue

# Arrêter tous les processus Java
Stop-Process -Name java -Force -ErrorAction SilentlyContinue
```

### Solution 5 : Compiler sans exécuter les tests

Les tests consomment beaucoup de mémoire. Pour compiler rapidement :

```powershell
.\mvnw.cmd clean install -DskipTests
```

Ou pour simplement vérifier la compilation :

```powershell
.\mvnw.cmd compile
```

---

## 🛠️ Configuration Permanente

### Fichier `.mvn/jvm.config` (déjà créé)

Le fichier `.mvn/jvm.config` contient les paramètres JVM par défaut pour Maven.

Contenu actuel :
```
-Xms512m
-Xmx2048m
-XX:MaxMetaspaceSize=512m
-XX:ReservedCodeCacheSize=240m
-XX:+UseG1GC
-XX:+UseStringDeduplication
-Djava.awt.headless=true
```

### Variables d'environnement système (permanent)

Pour rendre la configuration permanente, ajoutez dans les variables d'environnement Windows :

1. Ouvrir **Paramètres système avancés** → **Variables d'environnement**
2. Créer une nouvelle variable utilisateur :
   - Nom : `MAVEN_OPTS`
   - Valeur : `-Xms512m -Xmx2048m -XX:MaxMetaspaceSize=512m -XX:+UseG1GC`

---

## 📊 Comprendre les Paramètres Mémoire

| Paramètre | Signification | Valeur recommandée |
|-----------|--------------|-------------------|
| `-Xms` | Mémoire heap initiale | 512m (minimum de départ) |
| `-Xmx` | Mémoire heap maximale | 2048m (2 GB, peut monter plus si RAM disponible) |
| `-XX:MaxMetaspaceSize` | Métaspace maximum (classes chargées) | 512m |
| `-XX:ReservedCodeCacheSize` | Cache du code compilé JIT | 240m |
| `-XX:+UseG1GC` | Utiliser le GC G1 (moderne, performant) | Activé |
| `-XX:+UseStringDeduplication` | Dédupliquer les strings (économie mémoire) | Activé |

**Heap** = Mémoire pour les objets Java  
**Metaspace** = Mémoire pour les métadonnées des classes  
**Code Cache** = Mémoire pour le code compilé par le JIT

---

## 🚨 Cas Critiques

### Le backend crash même avec 2 GB de heap

**Causes possibles** :
1. Trop d'applications ouvertes (Chrome, IDE, etc.)
2. Fuite mémoire dans le code
3. Base de données retourne trop de données

**Solutions** :
1. Fermer Chrome et autres applications gourmandes
2. Redémarrer l'ordinateur pour libérer la mémoire
3. Augmenter le swap Windows (fichier d'échange)
4. Limiter les requêtes SQL avec `LIMIT` ou pagination

### Impossible de compiler avec 1 GB de heap

C'est normal. Le backend SPAT nécessite au minimum 1.5-2 GB pour compiler.

**Options** :
- Augmenter la RAM physique de votre machine
- Utiliser un serveur distant avec plus de RAM
- Compiler sur une autre machine et copier le `.jar`

---

## 📈 Monitoring de la Mémoire en Production

### Voir la consommation mémoire du backend en cours

```powershell
Get-Process java | Select-Object ProcessName, @{Name="Memory(MB)";Expression={[math]::Round($_.WorkingSet64/1MB,2)}}
```

### Logs de performance

Spring Boot expose des métriques via Actuator (si activé) :
```
http://localhost:8080/actuator/metrics/jvm.memory.used
http://localhost:8080/actuator/metrics/jvm.memory.max
```

---

## 🔄 Prévention

### Checklist avant démarrage

✅ Au moins 4 GB de RAM libre  
✅ Aucun autre processus Java en cours  
✅ Fichier `.mvn/jvm.config` configuré  
✅ Variables `SPAT_DB_*` et `SPAT_JWT_SECRET` définies  
✅ PostgreSQL en cours d'exécution  

### Utiliser le script optimisé systématiquement

Ne **jamais** lancer directement `.\mvnw.cmd spring-boot:run` sans configurer `MAVEN_OPTS`.

**Toujours** utiliser :
```powershell
.\start-backend-optimized.ps1
```

---

## 📞 Support

Si le problème persiste après avoir appliqué toutes les solutions :

1. Vérifier les logs dans `.recette/backend.log`
2. Nettoyer le projet Maven : `.\mvnw.cmd clean`
3. Supprimer le dossier `target` et recompiler
4. Redémarrer PostgreSQL
5. Redémarrer l'ordinateur en dernier recours

---

**Version du guide** : 1.0  
**Dernière mise à jour** : 2026-11-02
