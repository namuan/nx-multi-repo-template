#!/usr/bin/env bash

set -euo pipefail

if [[ ! -x ./node_modules/.bin/nx ]]; then
  npm install
fi

touch .tmux-dev-ready
exec npm run infra:start
