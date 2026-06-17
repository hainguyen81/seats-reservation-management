@echo off

docker-compose down --volumes --rmi local
REM call wsl shutdown to release mount volume to fix mouting existed
call wsl_shutdown.bat /wait
pause
