@echo off
chcp 65001 > nul

call k8s_deploy.bat sqlite %1 /wait
