#!/bin/bash
# 👉 Grown-ups: put pictures in the "images" folder, then double-click this file once.
cd "$(dirname "$0")"
echo "🎨 Getting the pictures ready..."
echo
python3 tools/update_pictures.py
