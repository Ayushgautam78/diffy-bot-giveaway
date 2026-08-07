Add-Type -AssemblyName System.IO.Compression.FileSystem
$srcDir = "c:\Users\pc\Desktop\unemployed bot"
$zipPath = Join-Path $srcDir "bot.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')

# Core bot files
$files = @('main.py','app.py','requirements.txt','discloud.config','squarecloud.app','Dockerfile','.env','.env.example','vercel.json','template.png','temp.png','temp_cutout.png')
foreach ($f in $files) {
    $fullPath = Join-Path $srcDir $f
    if (Test-Path $fullPath) {
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $fullPath, $f, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
}

# Static web files
$staticFiles = @('static/index.html', 'static/styles.css', 'static/app.js')
foreach ($sf in $staticFiles) {
    $fullPath = Join-Path $srcDir $sf.Replace('/', '\')
    if (Test-Path $fullPath) {
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $fullPath, $sf, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
}

$zip.Dispose()
$sizeKB = [math]::Round((Get-Item $zipPath).Length / 1KB, 2)
Write-Host "✅ bot.zip created successfully!"
Write-Host "Path: $zipPath"
Write-Host "Size: $sizeKB KB"
