#!/bin/bash
# Akinwumi AI Setup Script
echo "[ AKINWUMI_OS_DETECTED: UNIX/MAC ]"
echo "Status: Initializing local environment..."

if ! command -v python3 &> /dev/null
then
    echo "Error: Python3 is not installed. Please install Python 3.10+."
    exit 1
fi

echo "Status: Running Advanced Neural Installer..."
python3 installer.py
