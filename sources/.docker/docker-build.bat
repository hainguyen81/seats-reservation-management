@echo off
chcp 65001 > nul 2>&1

set "DB=%~1"
set "NO_CACHE=%~2"
set "BUILD_MODE=%~3"
set "TAB=	"
set DOCKER_COMPOSE_FOLDER=%~dp0
if /I "%DB%"=="dev" (
	set "DB=sqlite"
	set "BUILD_MODE=dev"
)
if /I "%NO_CACHE%"=="dev" (
	set "NO_CACHE="
	set "BUILD_MODE=dev"
)
if /I "%NO_CACHE%" NEQ "--no-cache" set "NO_CACHE="
if /I "%DB%"=="" set DB=sqlite
if /I "%BUILD_MODE%"=="" set BUILD_MODE=production
set DISP_NO_CACHE=%NO_CACHE%
if /I "%DISP_NO_CACHE%"=="" set DISP_NO_CACHE=CACHED
set DISP_BUILD_MODE=%BUILD_MODE%
if /I "%DISP_BUILD_MODE%"=="dev" (
	set DISP_NO_CACHE=Development
) else (
	set DISP_NO_CACHE=Production
)
set "DOCKER_COMPOSE_FILE=docker-compose-sqlite.yml"
if /I "%DB%"=="postgres" (
	set "DOCKER_COMPOSE_FILE=docker-compose-postgres.yml"
)

set DOCKER_BUILDKIT=1
set COMPOSE_DOCKER_CLI_BUILD=1

Rem Force using default context to apply the custom build context via environment, same as variables in compose file
echo %TAB%- 🛡️ !!!IMPORTANT!!!: Force Docker using default context on local
SET DOCKER_CONTEXT=default
echo.

Rem build enviroment - calculate the context path is the parent of current directory
set BUILD_CONTEXT=./..
set DOCKERFILE_PATH=Dockerfile
echo %TAB%- ⚙️ Build Docker^: Compose-File^: %DOCKER_COMPOSE_FILE% ^| Dockerfile^: %DOCKERFILE_PATH% ^| Build Mode: %DISP_BUILD_MODE% ^| %BUILD_CONTEXT_FOLDER%

Rem export .env file to build
echo BUILD_CONTEXT=%BUILD_CONTEXT% > .env
echo DOCKERFILE_PATH=%DOCKERFILE_PATH% >> .env
echo DATABASE_PROVIDER=%DB% >> .env
echo BUILD_MODE=%BUILD_MODE% >> .env
echo.

REM NODE_ENV=dev|production --> Stage in Dockerfile
echo %TAB%- ⚙️ Build and compose (%DISP_BUILD_MODE% ^| %DB% ^| %DISP_NO_CACHE% ^| %DOCKER_COMPOSE_FILE%)
docker build --progress=plain --progress=plain -f %DOCKER_COMPOSE_FILE% --build-arg DATABASE_PROVIDER=%DB% --build-arg BUILD_MODE=%BUILD_MODE% %NO_CACHE%

:done
del /f /s /q .env >nul 2>&1
exit /b 0
