Write-Host "🔧 Fixing ALL src/ imports..." -ForegroundColor Cyan

$tsFiles = Get-ChildItem -Path src -Recurse -Filter "*.ts"

foreach ($file in $tsFiles) {
    $content = Get-Content $file.FullName -Raw
    $original = $content
    
    # Fix pattern: from '../../src/xxx' → from '../xxx'
    # Remove the ../../src/ and keep appropriate ../
    $content = $content -replace "from\s+['""](\.\.\/)+src\/", "from '../"
    
    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content
        Write-Host "✅ Fixed: $($file.FullName)" -ForegroundColor Green
    }
}

Write-Host "✅ All src/ imports fixed!" -ForegroundColor Green