#!/usr/bin/env bash
# Publica el sitio.
#
# El número de versión del pie de página solo sirve si sube en cada publicación
# — si no, una alumna lee el mismo número esté viendo el build que esté viendo.
# Por eso publicar no es `git push` a secas: este script sube el número, lo
# commitea y empuja. Render tiene autoDeploy en main, así que el push es el
# deploy.
set -euo pipefail

cd "$(dirname "$0")/.."

rama=$(git rev-parse --abbrev-ref HEAD)
if [ "$rama" != "main" ]; then
  echo "Estás en '$rama'. Se publica desde main."
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Hay cambios sin commitear — commitéalos antes de publicar:"
  git status --short
  exit 1
fi

git fetch --quiet origin main
if [ -n "$(git log origin/main..HEAD --oneline)" ]; then
  echo "Se van a publicar:"
  git log origin/main..HEAD --oneline
else
  echo "No hay nada nuevo que publicar (main ya está en origin)."
  exit 1
fi

npm version patch --no-git-tag-version >/dev/null
version=$(node -p "require('./package.json').version")

git add package.json package-lock.json
git commit --quiet -m "Versión $version"
git push --quiet origin main

echo "Publicado v$version — Render está desplegando."
