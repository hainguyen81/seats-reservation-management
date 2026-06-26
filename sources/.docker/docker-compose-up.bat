@echo off
chcp 65001 > nul 2>&1

set "DB=%~1"
set "NO_CACHE=%~2"
set "TAB=	"
set DOCKER_COMPOSE_FOLDER=%~dp0
if /I "%NO_CACHE%"=="" set NO_CACHE=CACHED

set DOCKER_BUILDKIT=1
set COMPOSE_DOCKER_CLI_BUILD=1

Rem Force using default context to apply the custom build context via environment, same as variables in compose file
echo %TAB%- 🛡️ !!!IMPORTANT!!!: Force Docker using default context on local
SET DOCKER_CONTEXT=default
echo.

Rem build enviroment - calculate the context path is the parent of current directory
set BUILD_CONTEXT=./..
set DOCKERFILE_PATH=Dockerfile
echo %TAB%- ⚙️ Build Docker with context: %BUILD_CONTEXT_FOLDER% ^| Dockerfile^: %DOCKERFILE_PATH%
echo BUILD_CONTEXT=%BUILD_CONTEXT% > .env
echo DOCKERFILE_PATH=%DOCKERFILE_PATH% >> .env
echo.

echo %TAB%- ⚙️ Build and compose (%NO_CACHE%)
if /I "%DB%"=="postgres" (
	REM --no-cache
	if /I "%NO_CACHE%"=="--no-cache" (
		docker compose --progress=plain -f docker-compose-postgres.yml build --build-arg DATABASE_PROVIDER=postgres --no-cache ^
			&& docker compose -f docker-compose-postgres.yml up --force-recreate -d
		goto :done
	)
	docker compose --progress=plain -f docker-compose-postgres.yml build --build-arg DATABASE_PROVIDER=postgres ^
		&& docker compose -f docker-compose-postgres.yml up --force-recreate -d
	goto :done
)

REM --no-cache
if /I "%NO_CACHE%"=="--no-cache" (
	docker compose --progress=plain -f docker-compose-sqlite.yml build --build-arg DATABASE_PROVIDER=sqlite --no-cache ^
		&& docker compose -f docker-compose-sqlite.yml up --force-recreate -d
	goto :done
)
docker compose --progress=plain -f docker-compose-sqlite.yml build --build-arg DATABASE_PROVIDER=sqlite ^
	&& docker compose -f docker-compose-sqlite.yml up --force-recreate -d

:done
del /f /s /q .env >nul 2>&1
pause
