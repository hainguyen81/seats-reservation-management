@echo off
chcp 65001 > nul

set "DB=%~1"

if /I "%DB%"=="postgres" (
	docker-compose -f docker-compose-sqlite.yml down --volumes --rmi local
	goto :done
)
docker-compose -f docker-compose-postgres.yml down --volumes --rmi local

:done
	REM call wsl shutdown to release mount volume to fix mouting existed
	REM call wsl_shutdown.bat /wait
pause
