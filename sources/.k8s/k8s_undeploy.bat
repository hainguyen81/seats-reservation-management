@echo off
chcp 65001 > nul

echo -------------------------------------------------
echo ► 1. Undeploy K8s
echo -------------------------------------------------
if /I "%~1"=="postgres" (
	kubectl delete -f k8s-deployment-postgres.yml --grace-period=0 --force
	goto :check
)
kubectl delete -f k8s-deployment-sqlite.yml --grace-period=0 --force

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
if /I "%~1"=="postgres" (
	call k4ce-delete-pvc-pattern.bat postgres-
	goto :done
)
call k4ce-delete-pvc-pattern.bat sqlite-

:done
pause
