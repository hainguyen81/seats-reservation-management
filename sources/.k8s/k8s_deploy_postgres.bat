@echo off
chcp 65001 > nul

call k8s_deploy.bat postgres %1 /wait
