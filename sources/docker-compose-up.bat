@echo off
chcp 65001 > nul

set "DB=%~1"

set DOCKER_BUILDKIT=1
set COMPOSE_DOCKER_CLI_BUILD=1

if /I "%DB%"=="postgres" (
	docker compose -f docker-compose-postgres.yml build --build-arg DATABASE_PROVIDER=postgres --no-cache && docker compose -f docker-compose-postgres.yml up --force-recreate
	goto :done
)
docker compose -f docker-compose-sqlite.yml build --build-arg DATABASE_PROVIDER=postgres --no-cache && docker compose -f docker-compose-sqlite.yml up --force-recreate

:done
pause
