@echo off
chcp 65001 > nul

set "TAB=	"

echo ===================================================
echo ► Initialize project structure
echo ===================================================
echo.

:: 1. Create folders
echo %TAB%- Create project folders
mkdir prisma
mkdir src\app\api\auth\login
mkdir src\app\api\seats
mkdir src\app\api\reserve
mkdir src\app\api\release
mkdir src\lib

:: 2. Create empty source file
echo %TAB%- Create empty source files
type nul > prisma\schema.prisma
type nul > src\lib\db.ts
type nul > src\lib\auth.ts
type nul > src\app\layout.tsx
type nul > src\app\page.tsx
type nul > src\app\api\auth\login\route.ts
type nul > src\app\api\seats\route.ts
type nul > src\app\api\reserve\route.ts
type nul > src\app\api\release\route.ts
type nul > .env
type nul > README.md
type nul > package.json

echo.
echo ===================================================
echo [SUCCESS] Project structure has been created successfully!
echo ===================================================
pause
