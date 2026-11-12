$ErrorActionPreference = 'Stop'
$projectRoot = 'D:\PROJET SPAT2026'
$scenario = Get-Content -LiteralPath (Join-Path $projectRoot 'output/video/Narration_agent_surete_synchronisee.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$voiceToken = New-Object -ComObject SAPI.SpObjectToken
$voiceToken.SetId('HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Speech_OneCore\Voices\Tokens\MSTTS_V110_frFR_PaulM')
$narrator = New-Object -ComObject SAPI.SpVoice
$narrator.Voice = $voiceToken
$narrator.Rate = 0
$index = 0
foreach ($segment in $scenario.segments) {
    $index++
    $stream = New-Object -ComObject SAPI.SpFileStream
    try {
        $stream.Open((Join-Path $PSScriptRoot ('voix-{0:00}.wav' -f $index)), 3)
        $narrator.AudioOutputStream = $stream
        [void]$narrator.Speak($segment.text)
    } finally {
        $stream.Close()
    }
}
Write-Output "$index passages generes avec Microsoft Paul (francais, local)."

