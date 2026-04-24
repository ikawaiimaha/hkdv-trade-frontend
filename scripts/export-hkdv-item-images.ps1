[CmdletBinding()]
param(
  [int]$ThumbnailWidth = 320,
  [int]$ThumbnailHeight = 320,
  [int]$QueryBatchSize = 20,
  [int]$ImageInfoBatchSize = 10,
  [int]$RequestDelayMs = 400,
  [int]$RetryDelayMs = 2000,
  [int]$MaxRetries = 5,
  [string]$OutputDirectory = "..\data\wiki"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$baseUrl = "https://hellokittydreamvillage.wiki.gg"
$apiUrl = "$baseUrl/api.php"
$itemTemplateTitle = "Template:Item_Template"
$happyBagCategoryTitle = "Category:Happy_Bag"
$skipHappyBagTitles = @(
  "Happy Bag",
  "Happy Bag Bonuses",
  "Retired Happy Bags",
  "Retired Happy Bags (2021)",
  "Retired Happy Bags (2022)",
  "Retired Happy Bags (2023)",
  "Retired Happy Bags (2024)",
  "Retired Happy Bags (2025)"
)

function Invoke-WikiApi {
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$Params
  )

  $query = ($Params.GetEnumerator() | Sort-Object Key | ForEach-Object {
    "{0}={1}" -f [uri]::EscapeDataString($_.Key), [uri]::EscapeDataString([string]$_.Value)
  }) -join "&"

  $uri = "${apiUrl}?$query"

  for ($attempt = 1; $attempt -le $MaxRetries; $attempt++) {
    try {
      return Invoke-RestMethod -Uri $uri
    }
    catch {
      $statusCode = $null

      if ($_.Exception.Response -and $null -ne $_.Exception.Response.StatusCode) {
        $statusCode = [int]$_.Exception.Response.StatusCode
      }

      $message = $_.Exception.Message
      $shouldRetry =
        $attempt -lt $MaxRetries -and (
          $statusCode -eq 429 -or
          $message -match "Too Many Requests" -or
          $message -match "connection was closed unexpectedly" -or
          $message -match "The request was aborted" -or
          $message -match "timed out"
        )

      if (-not $shouldRetry) {
        throw
      }

      $delay = [Math]::Min($RetryDelayMs * [Math]::Pow(2, $attempt - 1), 30000)
      Write-Warning "Request failed with status '$statusCode'. Retrying in $([int]$delay) ms."
      Start-Sleep -Milliseconds ([int]$delay)
    }
  }
}

function Test-HasProperty {
  param(
    [object]$InputObject,
    [string]$PropertyName
  )

  if ($null -eq $InputObject) {
    return $false
  }

  return $InputObject.PSObject.Properties.Name -contains $PropertyName
}

function Get-PageSlug {
  param(
    [AllowNull()]
    [string]$Title
  )

  if (-not $Title) {
    return $null
  }

  return $Title -replace " ", "_"
}

function Get-PageUrl {
  param(
    [AllowNull()]
    [string]$Title
  )

  $slug = Get-PageSlug -Title $Title
  if (-not $slug) {
    return $null
  }

  return "$baseUrl/wiki/$slug"
}

function Get-TemplateField {
  param(
    [AllowNull()]
    [string]$Content,
    [string]$FieldName
  )

  if (-not $Content) {
    return $null
  }

  $pattern = "(?is)\{\{Item Template\b.*?\|\s*$([regex]::Escape($FieldName))\s*=\s*([^|\r\n}]+)"
  $match = [regex]::Match($Content, $pattern)

  if ($match.Success) {
    return $match.Groups[1].Value.Trim()
  }

  return $null
}

function Get-NormalizedKey {
  param(
    [AllowNull()]
    [string]$Value
  )

  if (-not $Value) {
    return $null
  }

  $normalized = [System.Net.WebUtility]::HtmlDecode($Value).Normalize([Text.NormalizationForm]::FormKD)
  $normalized = [regex]::Replace($normalized, "\p{Mn}", "")
  $normalized = $normalized.ToLowerInvariant()
  $normalized = $normalized -replace "&", " and "
  $normalized = [regex]::Replace($normalized, "[^a-z0-9]+", " ")
  $normalized = [regex]::Replace($normalized, "\s+", " ")
  $normalized = $normalized.Trim()

  if (-not $normalized) {
    return $null
  }

  return $normalized
}

function Convert-FromHtmlFragment {
  param(
    [AllowNull()]
    [string]$Value
  )

  if (-not $Value) {
    return $null
  }

  $withoutTags = [regex]::Replace($Value, "(?is)<.*?>", " ")
  $decoded = [System.Net.WebUtility]::HtmlDecode($withoutTags)
  $decoded = $decoded -replace [char]0xA0, " "
  $decoded = [regex]::Replace($decoded, "\s+", " ")
  $decoded = $decoded.Trim()

  if (-not $decoded) {
    return $null
  }

  return $decoded
}

function Get-FileTitle {
  param(
    [AllowNull()]
    [string]$ImageValue
  )

  if (-not $ImageValue) {
    return $null
  }

  if ($ImageValue -like "File:*") {
    return $ImageValue
  }

  return "File:$ImageValue"
}

function Get-FileTitleFromHtml {
  param(
    [AllowNull()]
    [string]$Html
  )

  if (-not $Html) {
    return $null
  }

  $hrefMatch = [regex]::Match($Html, '(?is)href="/wiki/File:([^"#?]+)"')
  if ($hrefMatch.Success) {
    $fileName = [System.Net.WebUtility]::HtmlDecode([uri]::UnescapeDataString($hrefMatch.Groups[1].Value))
    return "File:$($fileName -replace "_", " ")"
  }

  $altMatch = [regex]::Match($Html, '(?is)alt="([^"]+)"')
  if ($altMatch.Success) {
    $fileName = [System.Net.WebUtility]::HtmlDecode($altMatch.Groups[1].Value).Trim()
    if ($fileName) {
      return "File:$fileName"
    }
  }

  return $null
}

function Get-MediaHintsFromHtml {
  param(
    [AllowNull()]
    [string]$Html
  )

  $emptyHints = [pscustomobject]@{
    image_url_hint = $null
    thumbnail_url_hint = $null
    thumbnail_width_hint = $null
    thumbnail_height_hint = $null
    original_image_url_hint = $null
    description_url_hint = $null
    description_short_url_hint = $null
  }

  if (-not $Html) {
    return $emptyHints
  }

  $srcMatch = [regex]::Match($Html, '(?is)<img[^>]*src="([^"]+)"')
  if (-not $srcMatch.Success) {
    return $emptyHints
  }

  $rawSrc = [System.Net.WebUtility]::HtmlDecode($srcMatch.Groups[1].Value)
  $absoluteSrc =
    if ($rawSrc.StartsWith("//")) {
      "https:$rawSrc"
    }
    elseif ($rawSrc.StartsWith("/")) {
      "$baseUrl$rawSrc"
    }
    else {
      $rawSrc
    }

  $hrefMatch = [regex]::Match($Html, '(?is)href="([^"]+)"')
  $descriptionUrl = $null
  if ($hrefMatch.Success) {
    $rawHref = [System.Net.WebUtility]::HtmlDecode($hrefMatch.Groups[1].Value)
    $descriptionUrl =
      if ($rawHref.StartsWith("//")) {
        "https:$rawHref"
      }
      elseif ($rawHref.StartsWith("/")) {
        "$baseUrl$rawHref"
      }
      else {
        $rawHref
      }
  }

  $dataWidth = $null
  $dataHeight = $null

  $dataWidthMatch = [regex]::Match($Html, '(?is)data-file-width="(\d+)"')
  if ($dataWidthMatch.Success) {
    $dataWidth = [int]$dataWidthMatch.Groups[1].Value
  }

  $dataHeightMatch = [regex]::Match($Html, '(?is)data-file-height="(\d+)"')
  if ($dataHeightMatch.Success) {
    $dataHeight = [int]$dataHeightMatch.Groups[1].Value
  }

  $thumbnailWidthValue = $null
  $thumbnailHeightValue = $null
  $imageUrl = $absoluteSrc
  $thumbnailUrl = $absoluteSrc
  $originalImageUrl = $absoluteSrc

  $thumbMatch = [regex]::Match($absoluteSrc, '(?is)^https?://[^/]+/images/thumb/([^/?]+)/(\d+)px-[^?]+(\?[^"]*)?$')
  $originalMatch = [regex]::Match($absoluteSrc, '(?is)^https?://[^/]+/images/([^/?]+)(\?[^"]*)?$')

  if ($thumbMatch.Success) {
    $encodedFileName = $thumbMatch.Groups[1].Value
    $querySuffix = $thumbMatch.Groups[3].Value
    $originalImageUrl = "$baseUrl/images/$encodedFileName$querySuffix"

    if ($dataWidth -and $dataHeight -and $dataWidth -le $ThumbnailWidth -and $dataHeight -le $ThumbnailHeight) {
      $imageUrl = $originalImageUrl
      $thumbnailUrl = $originalImageUrl
      $thumbnailWidthValue = $dataWidth
      $thumbnailHeightValue = $dataHeight
    }
    else {
      $imageUrl = "$baseUrl/images/thumb/$encodedFileName/${ThumbnailWidth}px-$encodedFileName$querySuffix"
      $thumbnailUrl = $imageUrl

      if ($dataWidth -and $dataHeight) {
        $scale = [Math]::Min(1.0, $ThumbnailWidth / [double]$dataWidth)
        $thumbnailWidthValue = [int][Math]::Round($dataWidth * $scale)
        $thumbnailHeightValue = [int][Math]::Round($dataHeight * $scale)
      }
    }
  }
  elseif ($originalMatch.Success) {
    $encodedFileName = $originalMatch.Groups[1].Value
    $querySuffix = $originalMatch.Groups[2].Value
    $originalImageUrl = $absoluteSrc

    if ($dataWidth -and $dataHeight -and ($dataWidth -gt $ThumbnailWidth -or $dataHeight -gt $ThumbnailHeight)) {
      $thumbnailUrl = "$baseUrl/images/thumb/$encodedFileName/${ThumbnailWidth}px-$encodedFileName$querySuffix"
      $imageUrl = $thumbnailUrl
      $scale = [Math]::Min(1.0, $ThumbnailWidth / [double]$dataWidth)
      $thumbnailWidthValue = [int][Math]::Round($dataWidth * $scale)
      $thumbnailHeightValue = [int][Math]::Round($dataHeight * $scale)
    }
    else {
      $thumbnailUrl = $originalImageUrl
      $imageUrl = $originalImageUrl
      $thumbnailWidthValue = $dataWidth
      $thumbnailHeightValue = $dataHeight
    }
  }

  return [pscustomobject]@{
    image_url_hint = $imageUrl
    thumbnail_url_hint = $thumbnailUrl
    thumbnail_width_hint = $thumbnailWidthValue
    thumbnail_height_hint = $thumbnailHeightValue
    original_image_url_hint = $originalImageUrl
    description_url_hint = $descriptionUrl
    description_short_url_hint = $null
  }
}

function Add-Candidate {
  param(
    [hashtable]$CandidateIndex,
    [pscustomobject]$Candidate
  )

  if ($null -eq $Candidate) {
    return
  }

  $key = Get-NormalizedKey -Value $Candidate.page_title
  if (-not $key) {
    return
  }

  if (-not $CandidateIndex.ContainsKey($key)) {
    $CandidateIndex[$key] = $Candidate
    return
  }

  $existing = $CandidateIndex[$key]

  if ($existing.source_kind -eq "happy_bag" -and $Candidate.source_kind -eq "item_page") {
    $CandidateIndex[$key] = [pscustomobject]@{
      page_title = $Candidate.page_title
      page_slug = $Candidate.page_slug
      page_url = $Candidate.page_url
      type = if ($Candidate.type) { $Candidate.type } else { $existing.type }
      rarity = if ($Candidate.rarity) { $Candidate.rarity } else { $existing.rarity }
      file_title = if ($Candidate.file_title) { $Candidate.file_title } else { $existing.file_title }
      source_kind = $Candidate.source_kind
      source_page_title = $Candidate.source_page_title
      source_page_url = $Candidate.source_page_url
      source_collection_title = if ($existing.source_collection_title) { $existing.source_collection_title } else { $Candidate.source_collection_title }
      source_collection_url = if ($existing.source_collection_url) { $existing.source_collection_url } else { $Candidate.source_collection_url }
      image_url_hint = if ($Candidate.image_url_hint) { $Candidate.image_url_hint } else { $existing.image_url_hint }
      thumbnail_url_hint = if ($Candidate.thumbnail_url_hint) { $Candidate.thumbnail_url_hint } else { $existing.thumbnail_url_hint }
      thumbnail_width_hint = if ($Candidate.thumbnail_width_hint) { $Candidate.thumbnail_width_hint } else { $existing.thumbnail_width_hint }
      thumbnail_height_hint = if ($Candidate.thumbnail_height_hint) { $Candidate.thumbnail_height_hint } else { $existing.thumbnail_height_hint }
      original_image_url_hint = if ($Candidate.original_image_url_hint) { $Candidate.original_image_url_hint } else { $existing.original_image_url_hint }
      description_url_hint = if ($Candidate.description_url_hint) { $Candidate.description_url_hint } else { $existing.description_url_hint }
      description_short_url_hint = if ($Candidate.description_short_url_hint) { $Candidate.description_short_url_hint } else { $existing.description_short_url_hint }
    }
    return
  }

  if (-not $existing.page_url -and $Candidate.page_url) {
    $existing.page_url = $Candidate.page_url
  }

  if (-not $existing.type -and $Candidate.type) {
    $existing.type = $Candidate.type
  }

  if (-not $existing.rarity -and $Candidate.rarity) {
    $existing.rarity = $Candidate.rarity
  }

  if (-not $existing.file_title -and $Candidate.file_title) {
    $existing.file_title = $Candidate.file_title
  }

  if (-not $existing.source_collection_title -and $Candidate.source_collection_title) {
    $existing.source_collection_title = $Candidate.source_collection_title
  }

  if (-not $existing.source_collection_url -and $Candidate.source_collection_url) {
    $existing.source_collection_url = $Candidate.source_collection_url
  }

  if (-not $existing.source_page_title -and $Candidate.source_page_title) {
    $existing.source_page_title = $Candidate.source_page_title
  }

  if (-not $existing.source_page_url -and $Candidate.source_page_url) {
    $existing.source_page_url = $Candidate.source_page_url
  }

  if (-not $existing.image_url_hint -and $Candidate.image_url_hint) {
    $existing.image_url_hint = $Candidate.image_url_hint
  }

  if (-not $existing.thumbnail_url_hint -and $Candidate.thumbnail_url_hint) {
    $existing.thumbnail_url_hint = $Candidate.thumbnail_url_hint
  }

  if (-not $existing.thumbnail_width_hint -and $Candidate.thumbnail_width_hint) {
    $existing.thumbnail_width_hint = $Candidate.thumbnail_width_hint
  }

  if (-not $existing.thumbnail_height_hint -and $Candidate.thumbnail_height_hint) {
    $existing.thumbnail_height_hint = $Candidate.thumbnail_height_hint
  }

  if (-not $existing.original_image_url_hint -and $Candidate.original_image_url_hint) {
    $existing.original_image_url_hint = $Candidate.original_image_url_hint
  }

  if (-not $existing.description_url_hint -and $Candidate.description_url_hint) {
    $existing.description_url_hint = $Candidate.description_url_hint
  }

  if (-not $existing.description_short_url_hint -and $Candidate.description_short_url_hint) {
    $existing.description_short_url_hint = $Candidate.description_short_url_hint
  }
}

function Get-MainNamespaceEmbeddedPages {
  param(
    [string]$TemplateTitle
  )

  $pages = New-Object System.Collections.Generic.List[object]
  $continueToken = $null

  do {
    $queryParams = @{
      action        = "query"
      list          = "embeddedin"
      eititle       = $TemplateTitle
      einamespace   = "0"
      eilimit       = "500"
      format        = "json"
      formatversion = "2"
    }

    if ($continueToken) {
      $queryParams.eicontinue = $continueToken
    }

    $response = Invoke-WikiApi -Params $queryParams

    foreach ($page in $response.query.embeddedin) {
      $pages.Add($page)
    }

    $continueToken = $null
    if (Test-HasProperty -InputObject $response -PropertyName "continue") {
      $continueToken = $response.continue.eicontinue
    }

    Start-Sleep -Milliseconds $RequestDelayMs
  } while ($continueToken)

  return $pages
}

function Get-CategoryPageTitles {
  param(
    [string]$CategoryTitle
  )

  $titles = New-Object System.Collections.Generic.List[string]
  $continueToken = $null

  do {
    $queryParams = @{
      action        = "query"
      list          = "categorymembers"
      cmtitle       = $CategoryTitle
      cmtype        = "page"
      cmlimit       = "500"
      format        = "json"
      formatversion = "2"
    }

    if ($continueToken) {
      $queryParams.cmcontinue = $continueToken
    }

    $response = Invoke-WikiApi -Params $queryParams

    foreach ($page in $response.query.categorymembers) {
      $titles.Add($page.title)
    }

    $continueToken = $null
    if (Test-HasProperty -InputObject $response -PropertyName "continue") {
      $continueToken = $response.continue.cmcontinue
    }

    Start-Sleep -Milliseconds $RequestDelayMs
  } while ($continueToken)

  return $titles
}

function Get-StandaloneItemCandidates {
  param(
    [hashtable]$CandidateIndex
  )

  Write-Host "Fetching standalone item pages using $itemTemplateTitle..."
  $itemPages = Get-MainNamespaceEmbeddedPages -TemplateTitle $itemTemplateTitle
  $titles = $itemPages.title | Sort-Object -Unique
  Write-Host "Found $($titles.Count) standalone item pages."

  for ($offset = 0; $offset -lt $titles.Count; $offset += $QueryBatchSize) {
    $batchTitles = $titles | Select-Object -Skip $offset -First $QueryBatchSize
    Write-Host "Reading standalone item page batch $($offset + 1)-$([Math]::Min($offset + $QueryBatchSize, $titles.Count))..."

    $response = Invoke-WikiApi -Params @{
      action        = "query"
      prop          = "revisions"
      rvslots       = "main"
      rvprop        = "content"
      titles        = ($batchTitles -join "|")
      format        = "json"
      formatversion = "2"
    }

    foreach ($page in $response.query.pages) {
      if ((Test-HasProperty -InputObject $page -PropertyName "missing") -or -not (Test-HasProperty -InputObject $page -PropertyName "revisions")) {
        continue
      }

      $content = $page.revisions[0].slots.main.content
      $imageValue = Get-TemplateField -Content $content -FieldName "image1"
      $typeValue = Get-TemplateField -Content $content -FieldName "type"
      $rarityValue = Get-TemplateField -Content $content -FieldName "rarity"
      $fileTitle = Get-FileTitle -ImageValue $imageValue

      if (-not $fileTitle) {
        continue
      }

      Add-Candidate -CandidateIndex $CandidateIndex -Candidate ([pscustomobject]@{
          page_title = $page.title
          page_slug = Get-PageSlug -Title $page.title
          page_url = Get-PageUrl -Title $page.title
          type = $typeValue
          rarity = $rarityValue
          file_title = $fileTitle
          source_kind = "item_page"
          source_page_title = $page.title
          source_page_url = Get-PageUrl -Title $page.title
          source_collection_title = $null
          source_collection_url = $null
          image_url_hint = $null
          thumbnail_url_hint = $null
          thumbnail_width_hint = $null
          thumbnail_height_hint = $null
          original_image_url_hint = $null
          description_url_hint = $null
          description_short_url_hint = $null
        })
    }

    Start-Sleep -Milliseconds $RequestDelayMs
  }
}

function Get-HappyBagCandidates {
  param(
    [hashtable]$CandidateIndex
  )

  Write-Host "Fetching Happy Bag pages from $happyBagCategoryTitle..."
  $bagTitles = Get-CategoryPageTitles -CategoryTitle $happyBagCategoryTitle |
    Where-Object { $_ -notin $skipHappyBagTitles } |
    Sort-Object -Unique

  Write-Host "Found $($bagTitles.Count) Happy Bag pages to inspect."

  for ($index = 0; $index -lt $bagTitles.Count; $index++) {
    $bagTitle = $bagTitles[$index]
    Write-Host "Parsing Happy Bag page $($index + 1)/$($bagTitles.Count): $bagTitle"

    try {
      $response = Invoke-WikiApi -Params @{
        action        = "parse"
        page          = $bagTitle
        prop          = "text"
        format        = "json"
        formatversion = "2"
      }
    }
    catch {
      Write-Warning "Skipping $bagTitle because the rendered HTML request failed: $($_.Exception.Message)"
      Start-Sleep -Milliseconds $RequestDelayMs
      continue
    }

    if (-not (Test-HasProperty -InputObject $response -PropertyName "parse")) {
      Start-Sleep -Milliseconds $RequestDelayMs
      continue
    }

    $html = $response.parse.text
    if (-not $html) {
      Start-Sleep -Milliseconds $RequestDelayMs
      continue
    }

    $tableMatches = [regex]::Matches($html, '(?is)<table\b[^>]*id="items"[^>]*>.*?</table>')

    foreach ($tableMatch in $tableMatches) {
      $tableHtml = $tableMatch.Value

      if ($tableHtml -notmatch '(?is)<th[^>]*>\s*Name\s*</th>' -or $tableHtml -notmatch '(?is)<th[^>]*>\s*Rarity\s*</th>') {
        continue
      }

      $rowMatches = [regex]::Matches($tableHtml, '(?is)<tr\b[^>]*>(.*?)</tr>')

      foreach ($rowMatch in $rowMatches) {
        $rowHtml = $rowMatch.Groups[1].Value

        if ($rowHtml -match '(?is)<th\b') {
          continue
        }

        $cellMatches = [regex]::Matches($rowHtml, '(?is)<t[dh]\b[^>]*>(.*?)</t[dh]>')
        if ($cellMatches.Count -lt 4) {
          continue
        }

        $fileTitle = Get-FileTitleFromHtml -Html $cellMatches[0].Groups[1].Value
        $pageTitle = Convert-FromHtmlFragment -Value $cellMatches[1].Groups[1].Value
        $typeValue = Convert-FromHtmlFragment -Value $cellMatches[2].Groups[1].Value
        $rarityValue = Convert-FromHtmlFragment -Value $cellMatches[3].Groups[1].Value

        if (-not $pageTitle -or -not $fileTitle) {
          continue
        }

        $mediaHints = Get-MediaHintsFromHtml -Html $cellMatches[0].Groups[1].Value

        Add-Candidate -CandidateIndex $CandidateIndex -Candidate ([pscustomobject]@{
            page_title = $pageTitle
            page_slug = Get-PageSlug -Title $pageTitle
            page_url = $null
            type = $typeValue
            rarity = $rarityValue
            file_title = $fileTitle
            source_kind = "happy_bag"
            source_page_title = $bagTitle
            source_page_url = Get-PageUrl -Title $bagTitle
            source_collection_title = $bagTitle
            source_collection_url = Get-PageUrl -Title $bagTitle
            image_url_hint = $mediaHints.image_url_hint
            thumbnail_url_hint = $mediaHints.thumbnail_url_hint
            thumbnail_width_hint = $mediaHints.thumbnail_width_hint
            thumbnail_height_hint = $mediaHints.thumbnail_height_hint
            original_image_url_hint = $mediaHints.original_image_url_hint
            description_url_hint = $mediaHints.description_url_hint
            description_short_url_hint = $mediaHints.description_short_url_hint
          })
      }
    }

    Start-Sleep -Milliseconds $RequestDelayMs
  }
}

function Resolve-ImageInfo {
  param(
    [pscustomobject[]]$Candidates
  )

  $fileMap = @{}
  $fileTitles = $Candidates |
    Where-Object { -not $_.image_url_hint -and $_.file_title } |
    Select-Object -ExpandProperty file_title |
    Sort-Object -Unique
  Write-Host "Resolving image metadata for $($fileTitles.Count) files..."

  for ($offset = 0; $offset -lt $fileTitles.Count; $offset += $ImageInfoBatchSize) {
    $batchFileTitles = $fileTitles | Select-Object -Skip $offset -First $ImageInfoBatchSize
    Write-Host "Reading file metadata batch $($offset + 1)-$([Math]::Min($offset + $ImageInfoBatchSize, $fileTitles.Count))..."

    $response = Invoke-WikiApi -Params @{
      action        = "query"
      prop          = "imageinfo"
      iiprop        = "url"
      iiurlwidth    = [string]$ThumbnailWidth
      iiurlheight   = [string]$ThumbnailHeight
      titles        = ($batchFileTitles -join "|")
      format        = "json"
      formatversion = "2"
    }

    foreach ($page in $response.query.pages) {
      if ((Test-HasProperty -InputObject $page -PropertyName "missing") -or -not (Test-HasProperty -InputObject $page -PropertyName "imageinfo")) {
        continue
      }

      $fileMap[$page.title] = $page.imageinfo[0]
    }

    Start-Sleep -Milliseconds $RequestDelayMs
  }

  return $fileMap
}

$candidateIndex = @{}

Get-StandaloneItemCandidates -CandidateIndex $candidateIndex
Get-HappyBagCandidates -CandidateIndex $candidateIndex

$candidates = $candidateIndex.Values | Sort-Object page_title
Write-Host "Collected $($candidates.Count) unique item candidates before image resolution."

$fileMap = Resolve-ImageInfo -Candidates $candidates

$export = foreach ($candidate in $candidates) {
  $imageInfo = $null
  if ($candidate.file_title -and $fileMap.ContainsKey($candidate.file_title)) {
    $imageInfo = $fileMap[$candidate.file_title]
  }

  $imageUrl = $candidate.image_url_hint
  $thumbnailUrl = $candidate.thumbnail_url_hint
  $thumbnailWidthValue = $candidate.thumbnail_width_hint
  $thumbnailHeightValue = $candidate.thumbnail_height_hint
  $originalImageUrl = $candidate.original_image_url_hint
  $descriptionUrl = $candidate.description_url_hint
  $descriptionShortUrl = $candidate.description_short_url_hint

  if (-not $imageUrl -and $null -ne $imageInfo) {
    $thumbnailUrl = $imageInfo.thumburl
    $thumbnailWidthValue = $imageInfo.thumbwidth
    $thumbnailHeightValue = $imageInfo.thumbheight
    $originalImageUrl = $imageInfo.url
    $descriptionUrl = $imageInfo.descriptionurl
    $descriptionShortUrl = $imageInfo.descriptionshorturl
    $imageUrl = if ($thumbnailUrl) { $thumbnailUrl } else { $originalImageUrl }
  }

  [pscustomobject]@{
    page_title = $candidate.page_title
    page_slug = $candidate.page_slug
    page_url = $candidate.page_url
    type = $candidate.type
    rarity = $candidate.rarity
    file_title = $candidate.file_title
    image_url = $imageUrl
    thumbnail_url = $thumbnailUrl
    thumbnail_width = $thumbnailWidthValue
    thumbnail_height = $thumbnailHeightValue
    original_image_url = $originalImageUrl
    description_url = $descriptionUrl
    description_short_url = $descriptionShortUrl
    source_kind = $candidate.source_kind
    source_page_title = $candidate.source_page_title
    source_page_url = $candidate.source_page_url
    source_collection_title = $candidate.source_collection_title
    source_collection_url = $candidate.source_collection_url
  }
}

$filteredExport = $export | Where-Object { $_.image_url }

$resolvedOutputDirectory = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot $OutputDirectory))
New-Item -ItemType Directory -Path $resolvedOutputDirectory -Force | Out-Null

$jsonPath = Join-Path $resolvedOutputDirectory "hkdv-item-images.json"
$csvPath = Join-Path $resolvedOutputDirectory "hkdv-item-images.csv"

$filteredExport | ConvertTo-Json -Depth 5 | Set-Content -Path $jsonPath -Encoding UTF8
$filteredExport | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8

$happyBagRows = ($filteredExport | Where-Object { $_.source_kind -eq "happy_bag" }).Count
$standaloneRows = ($filteredExport | Where-Object { $_.source_kind -eq "item_page" }).Count

Write-Host "Export complete:"
Write-Host "  JSON: $jsonPath"
Write-Host "  CSV:  $csvPath"
Write-Host "  Rows: $($filteredExport.Count)"
Write-Host "  Standalone item pages: $standaloneRows"
Write-Host "  Happy Bag table rows:  $happyBagRows"
Write-Host "  Thumbnail size request: ${ThumbnailWidth}x${ThumbnailHeight}"
