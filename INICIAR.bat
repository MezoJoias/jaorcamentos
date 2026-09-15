@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Instalando dependencias...
  call npm install
)
echo.
echo Iniciando JA Orcamentos...
echo.
call npm run dev
pause
