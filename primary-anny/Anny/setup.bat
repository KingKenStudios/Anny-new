@echo off
title Akinwumi AI Setup
echo [ AKINWUMI_OS_DETECTED: WINDOWS ]
echo Status: Initializing local environment...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Python is not installed. Please install Python 3.10+ and add it to PATH.
    pause
    exit /b
)
echo Status: Running Advanced Neural Installer...
python installer.py
pause
