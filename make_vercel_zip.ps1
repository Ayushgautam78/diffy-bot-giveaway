Add-Type -AssemblyName System.IO.Compression.FileSystem
$srcDir = $PSScriptRoot
if (-not $srcDir) { $srcDir = "c:\Users\pc\Desktop\unemployed bot" }
$zipPath = Join-Path $srcDir "vercel-deploy.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

# Create temp directory for Vercel files
$tempDir = Join-Path $srcDir "_vercel_temp"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tempDir "static") | Out-Null

# Copy vercel.json
Copy-Item (Join-Path $srcDir "vercel.json") (Join-Path $tempDir "vercel.json")

# Copy static files
Copy-Item (Join-Path $srcDir "static\styles.css") (Join-Path $tempDir "static\styles.css")
Copy-Item (Join-Path $srcDir "static\app.js") (Join-Path $tempDir "static\app.js")
Copy-Item (Join-Path $srcDir "static\index.html") (Join-Path $tempDir "static\index.html")

# Create zip from temp dir
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')

Get-ChildItem -Path $tempDir -Recurse | ForEach-Object {
    if (-not $_.PSIsContainer) {
        $relPath = $_.FullName.Substring($tempDir.Length + 1).Replace('\', '/')
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $relPath, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
}

$zip.Dispose()

# Clean up temp dir
Remove-Item $tempDir -Recurse -Force

Write-Host "Done! Vercel zip created at: $zipPath Size:" ([math]::Round((Get-Item $zipPath).Length / 1KB, 2)) "KB"
