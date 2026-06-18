@echo off
chcp 65001 > nul

set "DB=%~1"
set "NO_CACHE=%~2"

set DOCKER_BUILDKIT=1
set COMPOSE_DOCKER_CLI_BUILD=1

if /I "%DB%"=="postgres" (
	if /I "%NO_CACHE%"=="--no-cache" (
		docker compose -f docker-compose-postgres.yml build --build-arg DATABASE_PROVIDER=postgres --no-cache && docker compose -f docker-compose-postgres.yml up --force-recreate -d
		goto :done
	)
	docker compose -f docker-compose-postgres.yml build --build-arg DATABASE_PROVIDER=postgres && docker compose -f docker-compose-postgres.yml up --force-recreate -d
	goto :done
)

if /I "%NO_CACHE%"=="--no-cache" (
	docker compose -f docker-compose-sqlite.yml build --build-arg DATABASE_PROVIDER=sqlite --no-cache && docker compose -f docker-compose-sqlite.yml up --force-recreate -d
	goto :done
)
docker compose -f docker-compose-sqlite.yml build --build-arg DATABASE_PROVIDER=sqlite && docker compose -f docker-compose-sqlite.yml up --force-recreate -d

:done
pause
