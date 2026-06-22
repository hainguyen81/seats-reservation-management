@echo off
setlocal enabledelayedexpansion

echo ====================================================
echo      SCRIPT FORCE DELETE PVC BY KEYWORD / PATTERN
echo ====================================================
echo.
if "%~1"=="" (
    echo [ WARN ] Require PVC pattern!
    goto end
)

echo.
echo [1/3] Find PVC name by pattern: "%~1"...
echo ----------------------------------------------------

:: loop to scan PVC by pattern
set found=0
for /f "tokens=*" %%i in ('kubectl get pvc -o custom-columns^=:metadata.name ^| findstr "%~1"') do (
    set found=1
    echo [+] Stuck PVC: %%i
    
    echo     - Force delete %%i...
    kubectl delete pvc %%i --grace-period=0 --force
    
    echo     - Finalize %%i...
    kubectl patch pvc %%i -p "{\"metadata\":{\"finalizers\":null}}"
    echo ----------------------------------------------------
)

if "!found!"=="0" (
    echo [ WARN ] Not found any PVC by pattern: "%~1"
) else (
    echo [ DONE ] Scanned and deleted all PVC by pattern "%~1"
)

:end
echo.
