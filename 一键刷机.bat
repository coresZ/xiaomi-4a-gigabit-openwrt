@echo off
chcp 65001 >nul
cd /d "%~dp0"
python flash_openwrt.py %*
echo.
pause
