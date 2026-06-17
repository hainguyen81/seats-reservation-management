@echo off
chcp 65001 > nul

set "TAB=	"

echo -------------------------------------------------
echo ► 1. Install libraries/dependencies
echo -------------------------------------------------
npm install

echo.
echo -------------------------------------------------
echo ► 2. Initial SQLite Prisma database
echo -------------------------------------------------
npx prisma db push

echo.
echo -------------------------------------------------
echo ► 3. Create client to query based on Prisma Schema
echo -------------------------------------------------
npx prisma generate
