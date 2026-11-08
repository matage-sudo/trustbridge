function Write-Utf8NoBom {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true, ValueFromPipeline=$true)][string]$Content
    )
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText(
        (Resolve-Path -LiteralPath $Path -ErrorAction SilentlyContinue)?.Path ?? [System.IO.Path]::GetFullPath($Path),
        $Content,
        $utf8NoBom
    )
}
