@echo off
setlocal enabledelayedexpansion

set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
set URL=https://www.berluti.com/en-nl/

set INDEX=1
set POS=0

for %%P in (9223 9233 9243 9253 9263 9273 9283 9293) do (
  start "" %CHROME% ^
    --remote-debugging-port=%%P ^
    --user-data-dir="C:\chrome-profile-berluti!INDEX!" ^
    --window-size=1920,1080 ^
    --window-position=!POS!,0 ^
    %URL%

  set /a INDEX+=1
  set /a POS+=50
)
