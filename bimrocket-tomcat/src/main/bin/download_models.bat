@echo off
setlocal enabledelayedexpansion

set models_url=https://bim.santfeliu.cat/bimrocket-server/api/cloudfs/models/PUBLIC
set bimrocket_server=http://localhost:8080
set credentials=admin:bimrocket
set models=AC20-FZK-Haus.ifc AC20-Institute-Var-2.ifc


echo Downloading sample models...

cd /d "%~dp0\.."

mkdir sample_models

for %%i in (%models%) do (
  echo Downloading %%i...
  curl "%models_url%/%%i" --output sample_models\%%i
  echo Uploading %%i to %bimrocket_server%...

  curl -X PUT "%bimrocket_server%/bimrocket-server/api/cloudfs/models/%%i" --upload-file sample_models\%%i -u "%credentials%"
)
