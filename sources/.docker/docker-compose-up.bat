@echo off
chcp 65001 > nul 2>&1

set "DB=%~1"
set "NO_CACHE=%~2"
set "TAB=	"
set DOCKER_COMPOSE_FOLDER=%~dp0
set DOCKER_FILE_FOLDER=%DOCKER_COMPOSE_FOLDER%..

set DOCKER_BUILDKIT=1
set COMPOSE_DOCKER_CLI_BUILD=1

REM go to root project folder to build image
cd /d %DOCKER_FILE_FOLDER% > nul

echo %TAB%- Build and compose (%NO_CACHE%)
if /I "%DB%"=="postgres" (
	if /I "%NO_CACHE%"=="--no-cache" (
		docker compose -f docker-compose-postgres.yml build --progress=plain --build-arg DATABASE_PROVIDER=postgres --no-cache && docker compose -f %DOCKER_COMPOSE_FOLDER%\docker-compose-postgres.yml up --force-recreate -d
		goto :done
	)
	docker compose -f docker-compose-postgres.yml build --progress=plain --build-arg DATABASE_PROVIDER=postgres && docker compose -f %DOCKER_COMPOSE_FOLDER%\docker-compose-postgres.yml up --force-recreate -d
	goto :done
)

if /I "%NO_CACHE%"=="--no-cache" (
	docker compose -f docker-compose-sqlite.yml build --progress=plain --build-arg DATABASE_PROVIDER=sqlite --no-cache && docker compose -f %DOCKER_COMPOSE_FOLDER%\docker-compose-sqlite.yml up --force-recreate -d
	goto :done
)
docker compose -f docker-compose-sqlite.yml build --progress=plain --build-arg DATABASE_PROVIDER=sqlite && docker compose -f %DOCKER_COMPOSE_FOLDER%\docker-compose-sqlite.yml up --force-recreate -d

:done
pause
