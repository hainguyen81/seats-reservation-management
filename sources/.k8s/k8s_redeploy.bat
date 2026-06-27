@echo off
chcp 65001 > nul

set "TAB=	"
set "K8S_PVC_PATTERN=sqlite-"
set "K8S_DEPLOYMENT_FILE=k8s-deployment-sqlite.yml"
if /I "%~1"=="postgres" (
	set "K8S_DEPLOYMENT_FILE=k8s-deployment-postgres.yml"
	set "K8S_PVC_PATTERN=postgres-"
)

echo -------------------------------------------------
echo ► 1. Redeploy services
echo -------------------------------------------------
echo %TAB%- Redeploy seats reservation service
kubectl delete service seats-reservation-service-lb
call k4ce-delete-pvc-pattern.bat %K8S_PVC_PATTERN%
kubectl apply -f %K8S_DEPLOYMENT_FILE% --force

:check
echo.
echo -------------------------------------------------
echo ► 2. Wait for K8s Pods READY
echo -------------------------------------------------
echo %TAB%- Wait for services READY
kubectl rollout status deployment/seats-reservation-deployment --timeout=120s

pause
