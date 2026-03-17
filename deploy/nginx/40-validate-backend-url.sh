#!/bin/sh
set -eu

if [ -z "${BACKEND_URL:-}" ]; then
  echo "BACKEND_URL is required, for example https://yoobu-api-production.up.railway.app" >&2
  exit 1
fi

case "${BACKEND_URL}" in
  */)
    echo "BACKEND_URL must not end with a trailing slash" >&2
    exit 1
    ;;
esac
