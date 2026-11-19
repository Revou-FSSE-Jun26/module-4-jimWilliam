# Verifies Requirement 23.6: the /guidelines files were committed before any
# file under backend/ or frontend/. Exits 1 when a code commit came first.
$ErrorActionPreference = "Stop"

function Get-FirstAddCommit([string[]]$Paths) {
    $hashes = git log --reverse --diff-filter=A --format=%H -- @Paths
    if (-not $hashes) { return $null }
    return @($hashes)[0]
}

$guidelines = Get-FirstAddCommit @("guidelines/backend.md", "guidelines/database.md", "guidelines/frontend.md")
$code = Get-FirstAddCommit @("backend", "frontend")

if (-not $guidelines) {
    Write-Host "FAIL: the guideline files have not been committed yet."
    exit 1
}
if (-not $code) {
    Write-Host "OK: guidelines committed ($guidelines); no backend or frontend code yet."
    exit 0
}

# The guidelines commit must be an ancestor of (come before) the first code commit.
git merge-base --is-ancestor $guidelines $code
if ($LASTEXITCODE -eq 0 -and $guidelines -ne $code) {
    Write-Host "OK: guidelines ($guidelines) precede the first code commit ($code)."
    exit 0
}
Write-Host "FAIL: code commit $code does not come after the guidelines commit $guidelines."
exit 1
