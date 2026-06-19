@echo off
chcp 65001 > nul

set "TAB=	"
set NODE_ENV=production

if /I "%~1"=="build" (
	call build.bat /wait
)

echo.
echo -------------------------------------------------
echo ► Start server on Local (http://localhost:3000)
echo -------------------------------------------------
npm run prod_seed

