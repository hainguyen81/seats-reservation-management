@echo off
chcp 65001 > nul

set "TAB=	"

if /I "%~1"=="build" (
	call build.bat /wait
)

echo.
echo -------------------------------------------------
echo ► Start server on Local (http://localhost:3000)
echo -------------------------------------------------
npm run dev_seed
