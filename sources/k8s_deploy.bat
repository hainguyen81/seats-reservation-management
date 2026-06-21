@echo off
chcp 65001 > nul

set "TAB=	"

set DOCKER_BUILDKIT=1
set COMPOSE_DOCKER_CLI_BUILD=1

echo -------------------------------------------------
echo Deploy with the Built-in Kubernetes of Docker Desktop
echo -------------------------------------------------

echo -------------------------------------------------
echo ► 1. Build Docker Images
echo -------------------------------------------------
REM Postgres
if /I "%~1"=="postgres" (
	if /I "%~2"=="--no-cache" (
		call docker-build-postgres.bat --no-cache /wait
		goto :deploy
	)
	call docker-build-postgres.bat /wait
	goto :deploy
)
REM SQLite
if /I "%~1"=="sqlite" (
	if /I "%~2"=="--no-cache" (
		call docker-build-sqlite.bat --no-cache /wait
		goto :deploy
	)
	call docker-build-sqlite.bat /wait
	goto :deploy
)
if /I "%~1"=="--no-cache" (
	call docker-build-sqlite.bat --no-cache /wait
	goto :deploy
)
call docker-build-sqlite.bat /wait

:deploy
REM back to k8s folder to deploy
echo.
echo -------------------------------------------------
echo ► 2. Deploy Built Docker Images to K8s
echo -------------------------------------------------
echo %TAB%- Deploy seats reservation service
if /I "%~1"=="postgres" (
	kubectl apply -f k8s-deployment-postgres.yml
	goto :check
)
kubectl apply -f k8s-deployment-sqlite.yml

:check
echo.
echo -------------------------------------------------
echo ► 3. Wait for K8s Pods READY
echo -------------------------------------------------
echo %TAB%- Wait for services READY
kubectl rollout status deployment/seats-reservation-deployment --timeout=90s

pause
