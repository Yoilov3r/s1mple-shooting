# s1mple-shooting v5 - 画面优化推送脚本
$repo = "E:\s1mple-shooting"
Set-Location $repo

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  s1mple-shooting - Git Commit & Push v5" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

git checkout -b scene-v5-visual-enhance 2>&1
if ($LASTEXITCODE -ne 0) {
    git checkout scene-v5-visual-enhance 2>&1 | Out-Null
}

git add css/style.css index.html js/main.js js/scene.js js/shooting.js js/textures.js js/particles.js 2>&1

$msg = @"
feat: visual enhancement - ACES tone mapping, brick normal map, dust particles, better sky, muzzle flash

- main.js: ACESFilmicToneMapping, tone mapping exposure 1.15
- scene.js: brick normal map, corner pillars, base trim, sun glow sphere
- textures.js: add makeBrickNormalTexture (procedural normal map)
  improved sky texture with horizon warm band, 30 clouds with sub-layers
- particles.js: new ambient dust particle system (400 particles)
- shooting.js: multi-layer muzzle flash (3 concentric circles)
  longer flash duration 0.08s, smoother fade
"@
git commit -m $msg 2>&1
git push -u origin scene-v5-visual-enhance 2>&1

git checkout main 2>&1
git merge scene-v5-visual-enhance 2>&1
git push origin main 2>&1

Write-Host "============================================" -ForegroundColor Green
Write-Host "  Done! Branch: scene-v5-visual-enhance + main" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Read-Host "Press Enter to exit"