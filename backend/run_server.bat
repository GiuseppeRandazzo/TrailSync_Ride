@echo off
echo ==============================================
echo  Starting Outdoora Core Django Backend
echo ==============================================
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    echo [.venv not found, creating virtual environment...]
    python -m venv .venv
    call .venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    call .venv\Scripts\activate.bat
)

python manage.py migrate
python manage.py seed_demo_data
echo.
echo [Django server running on 0.0.0.0:8000]
python manage.py runserver 0.0.0.0:8000
pause
