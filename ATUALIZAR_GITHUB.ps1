param([Parameter(Mandatory=$true)][string]$RepoPath)
$ErrorActionPreference='Stop'
$source=Split-Path -Parent $MyInvocation.MyCommand.Path
$expected='https://github.com/alunosinovacaoqueimados-cmyk/Elas-.git'
if(-not (Test-Path (Join-Path $RepoPath '.git'))) { throw 'A pasta de destino nao e um repositorio Git. Informe a pasta que contem .git.' }
$remote=(& git -C $RepoPath remote get-url origin).Trim()
if($remote -ne $expected) { throw "Repo Git inesperado: $remote. Esperado: $expected" }
if(((& git -C $RepoPath status --porcelain) | Out-String).Trim()) { throw 'Seu repositorio tem mudancas pendentes. Faça commit ou stash antes de atualizar.' }
Write-Host 'Atualizando arquivos do Elas+; o design original sera preservado.'
Get-ChildItem -LiteralPath $source -Force | Where-Object { $_.Name -notin @('.git','storage','.vercel') } | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $RepoPath -Recurse -Force
}
Push-Location $RepoPath
try {
    npm test
    if($LASTEXITCODE -ne 0) { throw 'Testes falharam. Nao foi feito commit.' }
    git add .
    git diff --cached --stat
    $ok=Read-Host 'Confirmar commit e envio ao GitHub? Digite SIM'
    if($ok -cne 'SIM') { Write-Host 'Envio cancelado. Os arquivos ficam no seu repositorio local.'; exit 0 }
    git commit -m 'fix: Vercel routes, public assets and readonly cloud storage'
    if($LASTEXITCODE -ne 0) { throw 'Falha no commit' }
    git push origin main
    if($LASTEXITCODE -ne 0) { throw 'Falha no push. Verifique autenticacao GitHub.' }
    Write-Host 'Atualizacao enviada ao GitHub.'
} finally {Pop-Location}
