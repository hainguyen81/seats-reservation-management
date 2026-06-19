@echo off
chcp 65001 > nul

set "TAB=	"
SET DATABASE_URL=file:./sqlite.db

echo -------------------------------------------------
echo ► Default using SQLite
echo -------------------------------------------------
echo %TAB%- Initial prisma schema for SQLite
copy /y prisma\schema.sqlite.prisma prisma\schema.prisma > nul 2>&1

echo -------------------------------------------------
echo ► 1. Install libraries/dependencies
echo -------------------------------------------------
call npm install

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
