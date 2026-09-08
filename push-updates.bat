@echo off
chcp 65001 >nul
echo ============================================
echo   s1mple-shooting - 修复推送脚本
echo ============================================
echo.

cd /d "E:\s1mple-shooting"

echo [1/4] 创建新分支 bugfix-color-lerp...
git checkout -b bugfix-color-lerp
if %errorlevel% neq 0 (
    git checkout bugfix-color-lerp 2>nul
)

echo.
echo [2/4] 暂存修改的文件...
git add css\style.css index.html js\*.js build.bat s1mple-shooting.spec push-updates.bat push-updates.ps1

echo.
echo [3/4] 提交修复...
git commit -m "fix: THREE.Color.lerpColors API compatibility - fixes startup crash

Critical bugfix:
- textures.js: replace THREE.Color.lerpColors() static method (removed in r149)
  with instance lerp() for Three.js r149 compatibility
  This was the root cause of game failing to load - bootstrap crashed
  during makeTileTexture(), preventing all mode button event bindings

Build fix:
- build.bat: add assets/ and lib/ to --add-data, so exe includes all files
- s1mple-shooting.spec: same fix for datas list"

echo.
echo [4/4] 推送到 GitHub...
git push -u origin bugfix-color-lerp

echo.
echo ============================================
echo   推送完成！
echo   分支: bugfix-color-lerp
echo ============================================
echo.
echo 请在 GitHub 上创建 Pull Request 合并到 main 分支
echo 或手动运行:
echo   git checkout main
echo   git merge bugfix-color-lerp
echo   git push origin main
pause
