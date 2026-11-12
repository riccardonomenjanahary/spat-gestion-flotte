$ErrorActionPreference = 'Stop'
$narrations = @(
    'Bienvenue dans GPA SPAT. Cette démonstration présente la création des missions en ville dans l''espace Assistant de direction. Connectez-vous avec votre matricule et votre mot de passe. Le portail ouvre ensuite l''espace correspondant à votre rôle et à votre direction.',
    'Depuis le calendrier, le bouton Nouvelle mission ouvre la préparation d''une sortie. Choisissez le déplacement en ville, puis le moyen matériel : moto ou voiture. Les ressources proposées correspondent à votre direction. Une voiture mutualisée peut servir plusieurs directions, mais jamais sur des créneaux qui se chevauchent. Vérifiez sa disponibilité. Le bouton Annuler ferme la fenêtre sans créer de mission.',
    'Dans le formulaire, recherchez le demandeur par son nom, son prénom, son matricule ou son email. Les résultats sont limités au personnel de votre direction. Sélectionnez la bonne personne avec le bouton radio. Pour une moto, choisissez le conducteur habilité lorsque le formulaire le demande. Renseignez ensuite la destination, le départ et la durée estimée en minutes. Cette durée détermine le créneau réservé au véhicule.',
    'Le départ peut être immédiat ou programmé. Pour une réservation à une date future, respectez au moins vingt-quatre heures d''anticipation et les plages de départ prévues. Complétez les observations utiles. Le bouton Créer la mission enregistre le déplacement après vérification des ressources. En cas de refus, lisez le message : conflit de planning, entretien, documents ou chauffeur indisponible. Corrigez la cause avant de recommencer.',
    'L''historique permet de retrouver les déplacements. Le bouton Signaler un incident sert à déclarer une panne ou une anomalie sur le bon véhicule et à prévenir les responsables. Le véhicule devient indisponible. Les conducteurs de moto doivent être habilités et rattachés à la direction. Après chaque sortie, saisissez le retour réel avant de clôturer la mission. Vérifiez toujours le résultat de vos actions dans le portail.'
)
$voiceToken = New-Object -ComObject SAPI.SpObjectToken
$voiceToken.SetId('HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Speech_OneCore\Voices\Tokens\MSTTS_V110_frFR_PaulM')
$voiceNarrator = New-Object -ComObject SAPI.SpVoice
$voiceNarrator.Voice = $voiceToken
$voiceNarrator.Rate = 1
for ($segmentIndex = 0; $segmentIndex -lt $narrations.Count; $segmentIndex++) {
    $voicePath = Join-Path $PSScriptRoot ('SPAT_voix_gratuite_{0:00}.wav' -f ($segmentIndex + 1))
    $voiceOutput = New-Object -ComObject SAPI.SpFileStream
    try {
        $voiceOutput.Open($voicePath, 3)
        $voiceNarrator.AudioOutputStream = $voiceOutput
        [void]$voiceNarrator.Speak($narrations[$segmentIndex])
    } finally {
        $voiceOutput.Close()
    }
    Write-Output ([System.IO.Path]::GetFileName($voicePath))
}
