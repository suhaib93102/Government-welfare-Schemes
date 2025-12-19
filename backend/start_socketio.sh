#!/bin/bash
# Start Django with Socket.IO using ASGI
cd "$(dirname "$0")"
python -m uvicorn edtech_project.asgi:application --host 0.0.0.0 --port 8003 --reload
