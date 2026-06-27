@echo off
chcp 65001 > nul 2>&1

Rem argument 1: --no-cache; argument 2: build mode dev/production
call docker-build.bat postgres %1 %2