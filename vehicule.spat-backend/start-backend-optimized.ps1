# =========================================================
# Script de démarrage optimisé du backend SPAT
# =========================================================
# Ce script démarre le backend Spring Boot avec des paramètres
# mémoire optimisés pour éviter les crashes Out of Memory.
# =========================================================

Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  Démarrage Backend SPAT (Optimisé)  " -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que les variables d'environnement sont définies
$requiredVars = @("SPAT_DB_URL", "SPAT_DB_USERNAME", "SPAT_DB_PASSWORD", "SPAT_JWT_SECRET")
$missingVars = @()

foreach ($var in $requiredVars) {
    if (-not (Test-Path "Env:$var")) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "ERREUR : Variables d'environnement manquantes :" -ForegroundColor Red
    foreach ($var in $missingVars) {
        Write-Host "  - $var" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Définissez-les avec :" -ForegroundColor Cyan
    Write-Host '  $env:SPAT_DB_URL = "jdbc:postgresql://localhost:5432/vehiculespatbd"' -ForegroundColor Gray
    Write-Host '  $env:SPAT_DB_USERNAME = "postgres"' -ForegroundColor Gray
    Write-Host '  $env:SPAT_DB_PASSWORD = "votre_mot_de_passe"' -ForegroundColor Gray
    Write-Host '  $env:SPAT_JWT_SECRET = "votre_secret_jwt_long_et_securise"' -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host "[OK] Variables d'environnement configurées" -ForegroundColor Green
Write-Host ""

# Configuration mémoire optimisée
$MAVEN_OPTS = @(
    "-Xms512m",                    # Mémoire initiale heap
    "-Xmx2048m",                   # Mémoire maximale heap (2GB)
    "-XX:MaxMetaspaceSize=512m",   # Métaspace maximum
    "-XX:ReservedCodeCacheSize=240m", # Cache de code
    "-XX:+UseG1GC",                # Garbage Collector G1 (performant)
    "-XX:+UseStringDeduplication", # Optimisation strings
    "-Djava.awt.headless=true"     # Mode headless (pas d'interface graphique)
) -join " "

$env:MAVEN_OPTS = $MAVEN_OPTS

Write-Host "Configuration JVM :" -ForegroundColor Cyan
Write-Host "  Heap initial : 512 MB" -ForegroundColor Gray
Write-Host "  Heap maximum : 2048 MB (2 GB)" -ForegroundColor Gray
Write-Host "  Metaspace : 512 MB" -ForegroundColor Gray
Write-Host "  GC : G1 (optimisé)" -ForegroundColor Gray
Write-Host ""

# Nettoyer les anciens logs d'erreur
$errorLogs = Get-ChildItem -Path . -Filter "hs_err_*.log" -ErrorAction SilentlyContinue
if ($errorLogs) {
    Write-Host "Nettoyage des anciens logs d'erreur..." -ForegroundColor Yellow
    $errorLogs | Remove-Item -Force
    Write-Host "[OK] Logs d'erreur nettoyés" -ForegroundColor Green
    Write-Host ""
}

# Afficher l'utilisation mémoire système
$mem = Get-CimInstance -ClassName Win32_OperatingSystem
$totalRAM = [math]::Round($mem.TotalVisibleMemorySize / 1MB, 2)
$freeRAM = [math]::Round($mem.FreePhysicalMemory / 1MB, 2)
$usedRAM = [math]::Round($totalRAM - $freeRAM, 2)

Write-Host "Mémoire système :" -ForegroundColor Cyan
Write-Host "  Total : $totalRAM GB" -ForegroundColor Gray
Write-Host "  Utilisée : $usedRAM GB" -ForegroundColor Gray
Write-Host "  Libre : $freeRAM GB" -ForegroundColor Gray
Write-Host ""

if ($freeRAM -lt 3) {
    Write-Host "ATTENTION : Mémoire libre faible (< 3 GB)" -ForegroundColor Yellow
    Write-Host "Le backend pourrait manquer de ressources." -ForegroundColor Yellow
    Write-Host "Fermez les applications non nécessaires." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Démarrage du backend Spring Boot..." -ForegroundColor Cyan
Write-Host "Appuyez sur Ctrl+C pour arrêter" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Démarrer Maven avec Spring Boot
# Un chemin temporaire court évite l'échec des sockets internes Java sur Windows.
.\mvnw.cmd spring-boot:run '-Dspring-boot.run.jvmArguments=-Djdk.net.unixdomain.tmpdir=.'

# Si le script se termine (arrêt ou erreur)
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend arrêté" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
