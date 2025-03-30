#!/bin/bash

models_url="https://bim.santfeliu.cat/bimrocket-server/api/cloudfs/models/PUBLIC"
bimrocket_server="http://localhost:8080"
credentials="admin:bimrocket"
declare -a models=("AC20-FZK-Haus.ifc" "AC20-Institute-Var-2.ifc")


echo Downloading sample models...

cd "$(dirname "$0")/.."

mkdir sample_models


for i in "${models[@]}"
do
  echo "Downloading $i..."
  curl "$models_url/$i" --output sample_models/$i
  echo "Uploading $i to $bimrocket_server..."

  curl -X PUT "$bimrocket_server/bimrocket-server/api/cloudfs/models/$i" --upload-file sample_models/$i -u "$credentials"
done



