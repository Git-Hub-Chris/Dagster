#!/bin/bash

if [[ "$VERCEL_ENV" != "production" ]]; then
  echo "🛑 - Not production, cancel build."
  exit 0;
fi

git diff --quiet HEAD^ HEAD ./
any_dagit_changes=$?

if [[ $any_dagit_changes -eq 1 ]]; then
  echo "✅ - Changes found in @dagster-io/ui, proceed with build."
  exit 1;
else
  echo "🛑 - No changes to @dagster-io/ui, cancel build."
  exit 0;
fi
