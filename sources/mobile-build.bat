@echo off
chcp 65001 > nul

SET "TAB=	"
SET DATABASE_URL=file:./sqlite.db
SET	"iOS=%~1"

echo -------------------------------------------------
echo ► Default using SQLite
echo -------------------------------------------------
echo %TAB%- Initial prisma schema for SQLite
copy /y prisma\schema.sqlite.prisma prisma\schema.prisma > nul 2>&1

echo -------------------------------------------------
echo ► 1. Install libraries/dependencies
echo -------------------------------------------------
echo %TAB%- Install Capacitor
call npm install @capacitor/core @capacitor/cli
echo %TAB%- Initialize Mobile App Configuration
call npx cap init
echo %TAB%- Install Android, iOS Compiler
if /I "%iOS%"=="ios" (
	npm install @capacitor/ios
	npx cap add ios
) else (
	npm install @capacitor/android
	npx cap add android
)

Rem !!!IMPORTANT!!! Due to mobile webview restrict authentication via cookie
Rem because different domains between API and mobile app (policy: Cross-Origin Cookie Block)
Rem so using this to break the policy
npm install @capacitor/preferences

echo.
echo -------------------------------------------------
echo ► 2. Initial SQLite Prisma database
echo -------------------------------------------------
call npx prisma migrate dev --name init

echo.
echo -------------------------------------------------
echo ► 3. Create client to query based on Prisma Schema
echo -------------------------------------------------
call npx prisma generate

echo.
echo -------------------------------------------------
echo ► 4. Build app for mobile
echo -------------------------------------------------
echo %TAB%- Build Mobile App Next.js
NODE_ENV=mobile && npm run build
echo %TAB%- Sync Next.js built ^`out^` folder to Capacitor Android^/iOS Project
npx cap sync
echo %TAB%- Open Android Studio or Xcode to build .apk/.ipa
if /I "%iOS%"=="ios" (
	npx cap open ios
) else (
	npx cap open android
)

pause
