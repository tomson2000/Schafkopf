#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_HOST="${DEPLOY_HOST:-87.106.230.244}"
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/schafkopf}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

SSH_OPTS="-o StrictHostKeyChecking=no"

if [[ -n "${SSHPASS:-}" ]]; then
  SSH_PREFIX=(sshpass -e)
else
  SSH_PREFIX=()
fi

run_ssh() {
  "${SSH_PREFIX[@]}" ssh ${SSH_OPTS} "${DEPLOY_USER}@${DEPLOY_HOST}" "$@"
}

run_rsync() {
  if [[ -n "${SSHPASS:-}" ]]; then
    SSHPASS="${SSHPASS}" sshpass -e rsync -az --delete \
      --exclude ".git" \
      --exclude "node_modules" \
      --exclude "dist" \
      --exclude "apps/*/dist" \
      --exclude "packages/*/dist" \
      --exclude "*.tsbuildinfo" \
      -e "ssh ${SSH_OPTS}" \
      "${ROOT_DIR}/" "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"
  else
    rsync -az --delete \
      --exclude ".git" \
      --exclude "node_modules" \
      --exclude "dist" \
      --exclude "apps/*/dist" \
      --exclude "packages/*/dist" \
      --exclude "*.tsbuildinfo" \
      -e "ssh ${SSH_OPTS}" \
      "${ROOT_DIR}/" "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"
  fi
}

echo "Deploying Schafkopf to ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}"

run_ssh "mkdir -p '${DEPLOY_PATH}'"
run_rsync
run_ssh "cd '${DEPLOY_PATH}' && docker compose -f '${COMPOSE_FILE}' up -d --build"
run_ssh "cd '${DEPLOY_PATH}' && docker compose -f '${COMPOSE_FILE}' ps"

echo
echo "Deployment finished."
echo "App: https://schafkopf.argumentit.de"
echo "Health: https://schafkopf.argumentit.de/health"
