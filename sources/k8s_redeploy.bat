@echo off
chcp 65001 > nul

set "TAB=	"

echo -------------------------------------------------
echo ► 1. Redeploy services
echo -------------------------------------------------
echo %TAB%- Deploy seats reservation service
kubectl apply -f k8s-deployment.yml
echo.

echo -------------------------------------------------
echo ► 2. Wait for K8s Pods READY
echo -------------------------------------------------
echo %TAB%- Wait for services READY
kubectl wait --for=condition=Ready pods -l app=seat-reservation --timeout=90s

pause
