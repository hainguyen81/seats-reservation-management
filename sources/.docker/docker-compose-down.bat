@echo off
chcp 65001 > nul

set "DB=%~1"

if /I "%DB%"=="postgres" (
	docker-compose -f docker-compose-postgres.yml down --volumes --remove-orphans --rmi local
	REM force docker remove build cache buffer
	docker builder prune -f
	goto :done
)
docker-compose -f docker-compose-sqlite.yml down --volumes --remove-orphans --rmi local
REM force docker remove build cache buffer
docker builder prune -f

:done
	REM call wsl shutdown to release mount volume to fix mouting existed
	REM call wsl_shutdown.bat /wait
pause
