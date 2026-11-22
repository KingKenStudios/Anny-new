# 🤖 Universal AI Robot Builder - Deployment Guide

This system allows you to turn ANY PC (Windows/Mac/Linux) into a powerful AI node with a single command. It auto-detects your hardware and adapts the installation to provide the best possible performance.

## 🚀 Quick Start

### 1. Requirements
- Python 3.10 or higher
- Internet connection (for model downloads)
- Storage space based on detected tier (2GB to 50GB)

### 2. Run the Installer
Download these files to your machine and run:

```bash
# Detect your system profile
python3 detect_system.py

# Start interactive installation
python3 installer.py
```

## 🛠️ Features
- **Auto-Hardware Detection**: Precisely identifies CPU, RAM, and GPU capabilities.
- **Intelligent Tiering**: Categorizes your PC into one of 6 tiers (Legacy to Ultra).
- **Adaptive Stack**: Installs the optimized LLM (Llama 3, Qwen, Phi), Vision models, and Speech engines for your hardware.
- **Hardware Acceleration**: Auto-configures CUDA (NVIDIA) or Metal (Apple Silicon) if available.

## 📊 Performance Tiers

| Tier | Hardware Req | Main Model | Features |
| :--- | :--- | :--- | :--- |
| **Ultra** | >32GB RAM + High VRAM | Llama 3.3 (Large) | Full capability, High-res vision |
| **High** | 16-32GB RAM | Llama 3.3 | Robotics sim, Large Context |
| **Medium** | 8-16GB RAM | Llama 3.2 | Vision, Speech, Coding |
| **Low** | 6-8GB RAM | Llama 3.2 | Basic Vision, Fast Chat |
| **Minimal** | <6GB RAM | Phi-4 | Text only, Lightweight |
| **Legacy** | Old PCs | Phi-4 | Ultra-light text fallback |

## 📁 Included Files
- `detect_system.py`: The hardware profiling engine.
- `installer.py`: The cross-platform installation orchestrator.
- `requirements.txt`: Python package requirements.

---
*Powered by Anny Group Architecture.*
