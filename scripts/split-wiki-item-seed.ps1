param(
  [string]$SourcePath = ".\supabase\generated\wiki-item-catalog.seed.sql",
  [string]$OutputDir = ".\supabase\generated\wiki-item-catalog.seed.parts",
  [int]$StatementsPerChunk = 5
)

if ($StatementsPerChunk -lt 1) {
  throw "StatementsPerChunk must be at least 1."
}

$resolvedSource = Resolve-Path -LiteralPath $SourcePath
$sourceLines = Get-Content -LiteralPath $resolvedSource

$statementStartIndexes = @()
$headerEndIndex = -1

for ($i = 0; $i -lt $sourceLines.Length; $i++) {
  if ($sourceLines[$i].TrimStart().StartsWith("insert into public.wiki_item_catalog")) {
    if ($headerEndIndex -lt 0) {
      $headerEndIndex = $i - 1
    }

    $statementStartIndexes += $i
  }
}

if (-not $statementStartIndexes.Count) {
  throw "Could not detect any insert statements in the source seed file."
}

$headerLines = if ($headerEndIndex -ge 0) { $sourceLines[0..$headerEndIndex] } else { @() }
$statements = @()

for ($i = 0; $i -lt $statementStartIndexes.Count; $i++) {
  $start = $statementStartIndexes[$i]
  $end = if ($i -lt $statementStartIndexes.Count - 1) {
    $statementStartIndexes[$i + 1] - 1
  } else {
    $sourceLines.Length - 1
  }

  $statements += ,@($sourceLines[$start..$end])
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
Get-ChildItem -LiteralPath $OutputDir -File -Filter "*.sql" -ErrorAction SilentlyContinue | Remove-Item -Force

$chunkCount = [Math]::Ceiling($statements.Count / $StatementsPerChunk)

for ($chunkIndex = 0; $chunkIndex -lt $chunkCount; $chunkIndex++) {
  $start = $chunkIndex * $StatementsPerChunk
  $end = [Math]::Min($start + $StatementsPerChunk - 1, $statements.Count - 1)
  $chunkStatements = @($statements[$start..$end])

  $chunkFileName = "wiki-item-catalog.seed.part-{0:D2}.sql" -f ($chunkIndex + 1)
  $chunkFilePath = Join-Path $OutputDir $chunkFileName

  $chunkLines = @(
    "-- Generated from $([System.IO.Path]::GetFileName($resolvedSource))"
    "-- Chunk $($chunkIndex + 1) of $chunkCount"
    "-- Contains statements $($start + 1) through $($end + 1)"
  ) + $headerLines

  foreach ($statement in $chunkStatements) {
    $chunkLines += $statement
    $chunkLines += ""
  }

  Set-Content -LiteralPath $chunkFilePath -Value $chunkLines -Encoding UTF8
}

Write-Output "Created $chunkCount chunk files in $OutputDir"
