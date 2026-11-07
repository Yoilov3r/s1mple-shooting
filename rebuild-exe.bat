@echo off
chcp 65001 >nul
echo ============================================
echo   s1mple-shooting 一键重建 EXE
echo ============================================
echo.

cd /d "E:\s1mple-shooting"

echo [1/3] 清理旧构建...
rmdir /s /q build 2>nul
rmdir /s /q dist 2>nul

echo [2/3] 打包 EXE（包含所有资源）...
pyinstaller --noconfirm --onefile --windowed ^
  --name s1mple-shooting ^
  --add-data "index.html;." ^
  --add-data "css;css" ^
  --add-data "js;js" ^
  --add-data "assets;assets" ^
  --add-data "lib;lib" ^
  --collect-all webview ^
  --collect-all clr_loader ^
  launcher.py

echo [3/3] 复制到桌面...
copy /Y "dist\s1mple-shooting.exe" "%USERPROFILE%\Desktop\s1mple-shooting.exe"

echo.
echo ============================================
echo   完成！桌面上的 s1mple-shooting.exe 已更新
echo ============================================
echo.
echo 注意：如果桌面exe正在运行，请先关闭再运行此脚本
pause