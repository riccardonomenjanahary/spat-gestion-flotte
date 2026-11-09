[CmdletBinding()]
param([string]$Compte = 'ingitspat@gmail.com')

$ErrorActionPreference = 'Stop'
$taskSecret = Read-Host "Mot de passe d'application Google pour $Compte (saisie masquee)" -AsSecureString
$taskBstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskSecret)
try {
    $taskPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskBstr) -replace '\s', ''
    if ($taskPassword.Length -ne 16) {
        throw "Le mot de passe d'application Google doit comporter 16 caracteres. Aucune variable n'a ete modifiee."
    }
    [Environment]::SetEnvironmentVariable('SPAT_MAIL_USERNAME', $Compte, 'User')
    [Environment]::SetEnvironmentVariable('SPAT_MAIL_PASSWORD', $taskPassword, 'User')
    Write-Output 'Configuration SMTP utilisateur enregistree. Redemarrez le backend pour la prendre en compte.'
} finally {
    $taskPassword = $null
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskBstr)
    $taskSecret.Dispose()
}
