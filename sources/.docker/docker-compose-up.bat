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
if /I "%BUILD_MODE%"=="dev" (
	echo %TAB%- ⚙️ Build Docker with context: %BUILD_CONTEXT_FOLDER% ^| Dockerfile^: %DOCKERFILE_PATH% ^| Build Mode: Development
) else (
	set BUILD_MODE=production
	echo %TAB%- ⚙️ Build Docker with context: %BUILD_CONTEXT_FOLDER% ^| Dockerfile^: %DOCKERFILE_PATH% ^| Build Mode: Production
)
echo BUILD_CONTEXT=%BUILD_CONTEXT% > .env
echo DOCKERFILE_PATH=%DOCKERFILE_PATH% >> .env
if /I "%DB%"=="postgres" (
	echo DATABASE_PROVIDER=postgres >> .env
) else (
	echo DATABASE_PROVIDER=sqlite >> .env
)
if /I "%BUILD_MODE%"=="dev" (
	echo BUILD_MODE=dev >> .env
) else (
	echo BUILD_MODE=production >> .env
)
echo.

REM NODE_ENV=dev|production --> Stage in Dockerfile
echo %TAB%- ⚙️ Build and compose (%NO_CACHE%)
if /I "%DB%"=="postgres" (
	REM --no-cache
	if /I "%NO_CACHE%"=="--no-cache" (
		docker compose --progress=plain -f docker-compose-postgres.yml build --build-arg DATABASE_PROVIDER=postgres --build-arg BUILD_MODE=%BUILD_MODE% --no-cache ^
			&& docker compose -f docker-compose-postgres.yml up --force-recreate -d
		goto :done
	)
	docker compose --progress=plain -f docker-compose-postgres.yml build --build-arg DATABASE_PROVIDER=postgres --build-arg BUILD_MODE=%BUILD_MODE% ^
		&& docker compose -f docker-compose-postgres.yml up --force-recreate -d
	goto :done
)

REM --no-cache
if /I "%NO_CACHE%"=="--no-cache" (
	docker compose --progress=plain -f docker-compose-sqlite.yml build --build-arg DATABASE_PROVIDER=sqlite --build-arg BUILD_MODE=%BUILD_MODE% --no-cache ^
		&& docker compose -f docker-compose-sqlite.yml up --force-recreate -d
	goto :done
)
docker compose --progress=plain -f docker-compose-sqlite.yml build --build-arg DATABASE_PROVIDER=sqlite --build-arg BUILD_MODE=%BUILD_MODE% ^
	&& docker compose -f docker-compose-sqlite.yml up --force-recreate -d

:done
del /f /s /q .env >nul 2>&1
pause
