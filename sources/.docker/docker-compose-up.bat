@echo off
chcp 65001 > nul 2>&1

set "DB=%~1"
set "NO_CACHE=%~2"
set "DEV_MODE=%~3"
set "TAB=	"
set DOCKER_COMPOSE_FOLDER=%~dp0
if /I "%DB%"=="dev" (
	set "DB=sqlite"
	set "DEV_MODE=dev"
)
if /I "%NO_CACHE%"=="dev" (
	set "NO_CACHE="
	set "DEV_MODE=dev"
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
echo %TAB%- ⚙️ Build Docker with context: %BUILD_CONTEXT_FOLDER% ^| Dockerfile^: %DOCKERFILE_PATH% ^| Build Mode: %DEV_MODE%
echo BUILD_CONTEXT=%BUILD_CONTEXT% > .env
echo DOCKERFILE_PATH=%DOCKERFILE_PATH% >> .env
if /I "%DB%"=="postgres" (
	echo DATABASE_PROVIDER=postgres >> .env
) else (
	echo DATABASE_PROVIDER=sqlite >> .env
)
if /I "%DEV_MODE%"=="dev" (
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
		if /I "%DEV_MODE%"=="dev" (
			docker compose --progress=plain -f docker-compose-postgres.yml build --build-arg DATABASE_PROVIDER=postgres --build-arg BUILD_MODE=dev --no-cache ^
				&& docker compose -f docker-compose-postgres.yml up --force-recreate -d
			goto :done
		)
		docker compose --progress=plain -f docker-compose-postgres.yml build --build-arg DATABASE_PROVIDER=postgres --build-arg BUILD_MODE=production --no-cache ^
			&& docker compose -f docker-compose-postgres.yml up --force-recreate -d
		goto :done
	)
	if /I "%DEV_MODE%"=="dev" (
		docker compose --progress=plain -f docker-compose-postgres.yml build --build-arg DATABASE_PROVIDER=postgres --build-arg BUILD_MODE=dev ^
			&& docker compose -f docker-compose-postgres.yml up --force-recreate -d
		goto :done
	)
	docker compose --progress=plain -f docker-compose-postgres.yml build --build-arg DATABASE_PROVIDER=postgres --build-arg BUILD_MODE=production ^
		&& docker compose -f docker-compose-postgres.yml up --force-recreate -d
	goto :done
)

REM --no-cache
if /I "%NO_CACHE%"=="--no-cache" (
	if /I "%DEV_MODE%"=="dev" (
		docker compose --progress=plain -f docker-compose-sqlite.yml build --build-arg DATABASE_PROVIDER=sqlite --build-arg BUILD_MODE=dev --no-cache ^
			&& docker compose -f docker-compose-sqlite.yml up --force-recreate -d
		goto :done
	)
	docker compose --progress=plain -f docker-compose-sqlite.yml build --build-arg DATABASE_PROVIDER=sqlite --build-arg BUILD_MODE=production --no-cache ^
		&& docker compose -f docker-compose-sqlite.yml up --force-recreate -d
	goto :done
)
if /I "%DEV_MODE%"=="dev" (
	docker compose --progress=plain -f docker-compose-sqlite.yml build --build-arg DATABASE_PROVIDER=sqlite --build-arg BUILD_MODE=dev ^
		&& docker compose -f docker-compose-sqlite.yml up --force-recreate -d
	goto :done
)
docker compose --progress=plain -f docker-compose-sqlite.yml build --build-arg DATABASE_PROVIDER=sqlite --build-arg BUILD_MODE=production ^
	&& docker compose -f docker-compose-sqlite.yml up --force-recreate -d

:done
del /f /s /q .env >nul 2>&1
pause
