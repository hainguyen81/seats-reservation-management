@echo off
chcp 65001 > nul

set "NO_CACHE=%~1"
set "TAB=	"

set DOCKER_BUILDKIT=1
set COMPOSE_DOCKER_CLI_BUILD=1

echo ► Build docker images (%NO_CACHE%)
echo.

REM go to root project folder to build image
if /I "%NO_CACHE%"=="--no-cache" (
	echo %TAB%- ^[ No Cache ^] Build image %NO_CACHE%
	docker build --no-cache -f Dockerfile -t seats-reservation-management:latest .
	goto :done

)

echo %TAB%- Build image
docker build -f Dockerfile -t seats-reservation-management:latest .

:done
exit /b 0
