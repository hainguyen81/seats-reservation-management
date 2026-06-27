@echo off
chcp 65001 > nul

set "K8S_PVC_PATTERN=sqlite-"
set "K8S_DEPLOYMENT_FILE=k8s-deployment-sqlite.yml"
if /I "%~1"=="postgres" (
	set "K8S_DEPLOYMENT_FILE=k8s-deployment-postgres.yml"
	set "K8S_PVC_PATTERN=postgres-"
)

echo -------------------------------------------------
echo ► 1. Undeploy K8s
echo -------------------------------------------------
kubectl delete -f %K8S_DEPLOYMENT_FILE% --grace-period=0 --force

:check
echo.
echo -------------------------------------------------
echo ► 2. Delete persistent volume claims
echo -------------------------------------------------
REM delete all deployments (include pods)
kubectl delete deployments --all --grace-period=0 --force
REM delete all services (include all opened NodePort/ClusterIP)
kubectl delete pvc --selector=seat-reservation --grace-period=0 --force
kubectl delete pvc --all --grace-period=0 --force
call k4ce-delete-pvc-pattern.bat %K8S_PVC_PATTERN%

:done
pause
