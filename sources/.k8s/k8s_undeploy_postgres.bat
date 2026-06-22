@echo off
chcp 65001 > nul

call k8s_undeploy.bat postgres /wait
