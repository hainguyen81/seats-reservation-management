@echo off
chcp 65001 > nul

set "NO_CACHE=%~1"
set "TAB=	"
set DOCKER_FOLDER=%~dp0
set DOCKER_FILE_FOLDER=%DOCKER_FOLDER%..
set DOCKER_FILE=Dockerfile

set DOCKER_BUILDKIT=1
set COMPOSE_DOCKER_CLI_BUILD=1

echo ► Build docker images ^(%NO_CACHE% - %DOCKER_FILE_FOLDER%^)
echo.

REM go to root project folder to build image
cd /d %DOCKER_FILE_FOLDER% > nul
if /I "%NO_CACHE%"=="--no-cache" (
	echo %TAB%- ^[ No Cache ^] Build image ^(%NO_CACHE%^)
	docker build --progress=plain --build-arg DATABASE_PROVIDER=postgres --no-cache -f %DOCKER_FILE% -t seats-reservation-management:latest .
	goto :done

)

echo %TAB%- Build image
docker build --progress=plain --build-arg DATABASE_PROVIDER=postgres -f %DOCKER_FILE% -t seats-reservation-management:latest .

:done
exit /b 0
