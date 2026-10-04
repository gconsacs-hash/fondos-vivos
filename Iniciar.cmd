@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo No se encontro Node.js. Abriendo index.html directamente.
  echo  (los sensores del telefono necesitan el servidor: instala Node.js para usarlos)
  start "" "index.html"
  exit /b 0
)
echo Iniciando Fondos Vivos en http://localhost:3400
start "" "http://localhost:3400"
node servidor.js 3400
