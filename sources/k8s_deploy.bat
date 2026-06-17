@echo off
chcp 65001 > nul

set "TAB=	"
set K8S_FOLDER=%~dp0

set DOCKER_BUILDKIT=1
set COMPOSE_DOCKER_CLI_BUILD=1

echo -------------------------------------------------
echo Deploy with the Built-in Kubernetes of Docker Desktop
echo -------------------------------------------------

echo -------------------------------------------------
echo ► 1. Build Docker Images
echo -------------------------------------------------
REM go to root project folder to build image
cd %K8S_FOLDER%.. > nul
if /I "%~1"=="--no-cache" (
	call docker-build.bat --no-cache /wait
	goto :deploy
)
call docker-build.bat /wait

:deploy
REM back to k8s folder to deploy
cd /d %K8S_FOLDER% > nul
echo -------------------------------------------------
echo ► 2. Deploy Built Docker Images to K8s
echo -------------------------------------------------
echo %TAB%- Deploy seats reservation service
kubectl apply -f k8s-deployment.yml
echo.

echo -------------------------------------------------
echo ► 3. Wait for K8s Pods READY
echo -------------------------------------------------
echo %TAB%- Wait for services READY
kubectl wait --for=condition=Ready pods -l app=seat-reservation --timeout=90s

pause
