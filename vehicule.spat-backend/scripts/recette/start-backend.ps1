param([switch]$Bootstrap)
$ErrorActionPreference = 'Stop'
$taskOriginalMavenOpts = $env:MAVEN_OPTS
if ([string]::IsNullOrWhiteSpace($env:MAVEN_OPTS)) {
    $env:MAVEN_OPTS = '-Xms128m -Xmx768m -Xss512k -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC'
}
$taskBackendRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$taskOriginalDbUrl = $env:SPAT_DB_URL
if (-not $taskOriginalDbUrl) { throw 'SPAT_DB_URL est absente.' }
$taskDbUri = [uri]($taskOriginalDbUrl -replace '^jdbc:', '')
if ($taskDbUri.Host -notin @('localhost', '127.0.0.1', '::1')) { throw 'PostgreSQL doit être local.' }
$taskTcp = [Net.Sockets.TcpClient]::new()
try {
    $taskTcp.Connect($taskDbUri.Host, $taskDbUri.Port)
} catch {
    throw "PostgreSQL est inaccessible sur $($taskDbUri.Host):$($taskDbUri.Port). Démarrez le service PostgreSQL puis relancez ce script."
} finally {
    $taskTcp.Dispose()
}
$taskDbBuilder = [UriBuilder]::new($taskDbUri)
$taskDbBuilder.Path = '/spat_recette_20261022'
$taskDbBuilder.Query = ''
$env:SPAT_DB_URL = 'jdbc:' + $taskDbBuilder.Uri.AbsoluteUri
try {
    Set-Location -LiteralPath $taskBackendRoot
    $taskArguments = @('spring-boot:run', '-Dspring-boot.run.profiles=recette', '-Dspring-boot.run.jvmArguments=-Duser.timezone=Indian/Antananarivo -Dspring.devtools.restart.enabled=false')
    if ($Bootstrap) { $taskArguments += '-Dspring-boot.run.arguments=--spring.flyway.enabled=false' }
    & mvn @taskArguments
    exit $LASTEXITCODE
} finally {
    $env:SPAT_DB_URL = $taskOriginalDbUrl
    $env:MAVEN_OPTS = $taskOriginalMavenOpts
}
