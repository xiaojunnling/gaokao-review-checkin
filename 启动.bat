@echo off
setlocal
set "APP=file:///C:/App/ReviewTracker/index.html"
set "PROF=%LOCALAPPDATA%\ReviewTrackerProfile"
set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

start "" "%CHROME%" --app="%APP%" --user-data-dir="%PROF%" --no-first-run --no-default-browser-check --disable-extensions --disable-sync --disable-features=Translate --window-size=1340,900
