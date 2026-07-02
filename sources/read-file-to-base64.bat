@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul

SET "TAB=	"
SET "INPUT=%~1"
SET "OUTPUT=%~2"

:: Check if the file exists
if not exist "%INPUT%" (
    echo %TAB%- ❌ Error: %INPUT% not found.
    exit /b
)
if /I "%OUTPUT%"=="" (
	for %%I in ("%INPUT%") do (
        :: parse full file name including extension
        set "OUTPUT=%%~nxI"
        
        :: parse only base file name
        for %%A in ("!OUTPUT!") do set "OUTPUT=%%~nA"
        
		:: build output file name
        set "OUTPUT=!OUTPUT!.base64.txt"
    )
)

:: Encode the file to Base64
echo %TAB%- ⚡ Read file %INPUT% to base64 file %OUTPUT%
certutil -encode "%INPUT%" "%OUTPUT%" >nul
echo %TAB%---^> 🎉 Successfully! Base64 Output File: %OUTPUT%

pause
