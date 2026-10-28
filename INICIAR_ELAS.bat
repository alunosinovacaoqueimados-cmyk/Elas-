@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale Node.js 20 ou superior.
  echo https://nodejs.org/
  pause
  exit /b 1
)
echo.
echo ==============================================
echo           ELAS+ - SERVIDOR LOCAL
 echo ==============================================
echo Abra no navegador: http://localhost:8000
echo Para encerrar: Ctrl+C
 echo ==============================================
echo.
node server.mjs
if errorlevel 1 (
 echo Servidor encerrado com erro. Verifique a mensagem acima.
 pause
)
