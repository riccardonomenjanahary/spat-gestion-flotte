[CmdletBinding()]
param(
    [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\backups")
)

$ErrorActionPreference = "Stop"

foreach ($name in @("SPAT_DB_URL", "SPAT_DB_USERNAME", "SPAT_DB_PASSWORD")) {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name))) {
        throw "La variable d'environnement $name est requise. Aucune sauvegarde n'a été lancée."
    }
}

$pgDump = Get-Command "pg_dump" -ErrorAction SilentlyContinue
if (-not $pgDump) {
    throw "pg_dump est introuvable. Installez les outils client PostgreSQL et ajoutez-les au PATH."
}

$databaseUrl = $env:SPAT_DB_URL -replace "^jdbc:", ""
try {
    $uri = [Uri]$databaseUrl
} catch {
    throw "SPAT_DB_URL doit être une URL PostgreSQL valide (jdbc:postgresql://hôte:port/base)."
}

if ($uri.Scheme -notin @("postgres", "postgresql") -or [string]::IsNullOrWhiteSpace($uri.Host)) {
    throw "SPAT_DB_URL doit utiliser le schéma PostgreSQL."
}

$databaseName = [Uri]::UnescapeDataString($uri.AbsolutePath.TrimStart('/'))
if ([string]::IsNullOrWhiteSpace($databaseName) -or $databaseName.Contains('/')) {
    throw "Le nom de la base doit être présent dans SPAT_DB_URL."
}

$null = New-Item -ItemType Directory -Path $OutputDirectory -Force
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $OutputDirectory "spat-$stamp.dump"
$previousPassword = $env:PGPASSWORD

try {
    $env:PGPASSWORD = $env:SPAT_DB_PASSWORD
    & $pgDump.Source `
        --host $uri.Host `
        --port $(if ($uri.IsDefaultPort) { "5432" } else { [string]$uri.Port }) `
        --username $env:SPAT_DB_USERNAME `
        --dbname $databaseName `
        --format custom `
        --no-owner `
        --no-privileges `
        --file $backupPath

    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump a échoué avec le code $LASTEXITCODE. Vérifiez la connexion et les journaux."
    }
} finally {
    if ($null -eq $previousPassword) {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    } else {
        $env:PGPASSWORD = $previousPassword
    }
}

Write-Output "Sauvegarde créée : $backupPath"
