# s1mple-shooting 修复推送脚本
$repo = "E:\s1mple-shooting"
Set-Location $repo

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  s1mple-shooting - Bug Fix Push" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# 创建新分支
git checkout -b bugfix-color-lerp 2>&1
if ($LASTEXITCODE -ne 0) {
    git checkout bugfix-color-lerp 2>&1 | Out-Null
}

# 暂存所有修改的文件
git add css/style.css index.html js/textures.js js/state.js js/game.js js/controls.js js/shooting.js js/balloon.js js/scene.js js/gun.js js/particles.js js/main.js build.bat s1mple-shooting.spec push-updates.ps1 2>&1

$msg = @"
fix: THREE.Color.lerpColors API compatibility - fixes startup crash

Critical bugfix:
- textures.js: replace THREE.Color.lerpColors() static method (removed in r149)
  with instance lerp() for Three.js r149 compatibility
  This was the root cause of game failing to load - bootstrap crashed
  during makeTileTexture(), preventing all mode button event bindings

Build fix:
- build.bat: add assets/ and lib/ to --add-data, so exe includes
  gunshot audio files and Three.js library
- s1mple-shooting.spec: same fix for datas list
"@
git commit -m $msg 2>&1
git push -u origin bugfix-color-lerp 2>&1

Write-Host "============================================" -ForegroundColor Green
Write-Host "  推送完成！" -ForegroundColor Green
Write-Host "  分支: bugfix-color-lerp" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "请在 GitHub 上创建 Pull Request 合并到 main 分支" -ForegroundColor Yellow
Write-Host "或运行以下命令手动合并：" -ForegroundColor Yellow
Write-Host "  git checkout main" -ForegroundColor Yellow
Write-Host "  git merge bugfix-color-lerp" -ForegroundColor Yellow
Write-Host "  git push origin main" -ForegroundColor Yellow
Read-Host "Press Enter to exit"