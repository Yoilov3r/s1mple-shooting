@echo off
REM 一键打包 s1mple-shooting 独立 exe
REM 依赖：pip install pywebview pyinstaller

cd /d "%~dp0"

pyinstaller --noconfirm --onefile --windowed ^
  --name s1mple-shooting ^
  --add-data "index.html;." ^
  --add-data "css;css" ^
  --add-data "js;js" ^
  --collect-all webview ^
  --collect-all clr_loader ^
  launcher.py

echo.
echo === 打包完成 ===
echo 产物路径: %~dp0dist\s1mple-shooting.exe
pause
