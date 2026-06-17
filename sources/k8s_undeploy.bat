@echo off
chcp 65001 > nul

echo -------------------------------------------------
echo ► 1. Undeploy K8s
echo -------------------------------------------------
kubectl delete -f k8s-deployment.yml
echo.

echo -------------------------------------------------
echo ► 2. Delete persistent volume claims
echo -------------------------------------------------
REM delete all deployments (include pods)
kubectl delete deployments --all
REM delete all services (include all opened NodePort/ClusterIP)
kubectl delete pvc --selector=seat-reservation
kubectl delete pvc --all

pause
