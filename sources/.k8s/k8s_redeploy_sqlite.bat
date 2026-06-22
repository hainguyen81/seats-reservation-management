@echo off
chcp 65001 > nul

call k8s_redeploy.bat sqlite /wait
