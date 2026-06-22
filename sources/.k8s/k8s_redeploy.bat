@echo off
chcp 65001 > nul

set "TAB=	"

echo -------------------------------------------------
echo ► 1. Redeploy services
echo -------------------------------------------------
echo %TAB%- Redeploy seats reservation service
if /I "%~1"=="postgres" (
	kubectl delete service seats-reservation-service-lb
	call k4ce-delete-pvc-pattern.bat postgres- /wait
	kubectl apply -f k8s-deployment-postgres.yml --force
	goto :check
)
kubectl delete service seats-reservation-service-lb
call k4ce-delete-pvc-pattern.bat sqlite- /wait
kubectl apply -f k8s-deployment-sqlite.yml --force

:check
echo.
echo -------------------------------------------------
echo ► 2. Wait for K8s Pods READY
echo -------------------------------------------------
echo %TAB%- Wait for services READY
kubectl rollout status deployment/seats-reservation-deployment --timeout=120s

pause
