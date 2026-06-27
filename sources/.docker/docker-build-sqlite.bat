@echo off
chcp 65001 > nul 2>&1

Rem argument 1: --no-cache; argument 2: build mode dev/production
call docker-build.bat sqlite %1 %2
