@echo off
echo Starting LACTEVA Milk Quality Intelligence Dashboard
echo ================================================

echo.
echo 1. Checking dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)


echo.
echo 2. Training ML model with your real data...
echo This will use Fresh_milk_dataset.csv and Spoiled_Milk_dataset.csv
cd notebooks
python simple_real_data_training.py
if %errorlevel% neq 0 (
    echo Warning: ML training failed, using fallback models
)
cd ..

echo.
echo 3. Starting ML Service...
start "LACTEVA ML Service" cmd /k "cd ml-service && python main.py"

echo.
echo 4. Waiting for ML service to start...
timeout /t 8 /nobreak > nul

echo.
echo 5. Starting Dashboard...
start "LACTEVA Dashboard" cmd /k "npm run dev"

echo.
echo ================================================
echo LACTEVA Dashboard is ready!
echo.
echo Dashboard: http://localhost:3000
echo ML Service: http://localhost:8002
echo.
echo Features:
echo - Real-time milk quality prediction
echo - PDF report generation
echo - Model accuracy display
echo - Custom dataset training
echo.
echo Press any key to close this window...
pause > nul