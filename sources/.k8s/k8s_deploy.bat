@echo off
chcp 65001 > nul

set "TAB=	"
set K8S_FOLDER=%~dp0
set DOCKER_FOLDER=%K8S_FOLDER%..\.docker
set "K8S_DEPLOYMENT_FILE=k8s-deployment-sqlite.yml"
if /I "%~1"=="postgres" (
	set "K8S_DEPLOYMENT_FILE=k8s-deployment-postgres.yml"
)

set DOCKER_BUILDKIT=1
set COMPOSE_DOCKER_CLI_BUILD=1

echo -------------------------------------------------
echo Deploy with the Built-in Kubernetes of Docker Desktop
echo -------------------------------------------------

echo -------------------------------------------------
echo ► 1. Build Docker Images
echo -------------------------------------------------
REM go to root project folder to build image
cd /d %DOCKER_FOLDER%.. > nul
REM Postgres
call docker-build.bat %1 %2

:deploy
REM back to k8s folder to deploy
cd /d %K8S_FOLDER% > nul
REM back to k8s folder to deploy
echo.
echo -------------------------------------------------
echo ► 2. Deploy Built Docker Images to K8s
echo -------------------------------------------------
echo %TAB%- Deploy seats reservation service
kubectl apply -f %K8S_DEPLOYMENT_FILE% --force

:check
echo.
echo -------------------------------------------------
echo ► 3. Wait for K8s Pods READY
echo -------------------------------------------------
echo %TAB%- Wait for services READY
kubectl rollout status deployment/seats-reservation-deployment --timeout=120s

pause
