#!/bin/sh
set -eu

project=multi-country-car-insurance
volume=${project}_strapi-content
image=${project}-cms
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$root"

usage() {
  printf '%s\n' "Usage: sh scripts/sync-dev-plans.sh --dry-run [--preserve-co-ruta-price PRICE] | --apply FINGERPRINT [--preserve-co-ruta-price PRICE]" >&2
  exit 2
}

validate_args() {
  case "${1-}" in
    --dry-run) shift ;;
    --apply)
      printf '%s\n' "${2-}" | grep -Eq '^[a-f0-9]{64}$' || usage
      shift 2
      ;;
    *) usage ;;
  esac
  case "$#" in
    0) ;;
    2) [ "$1" = "--preserve-co-ruta-price" ] || usage ;;
    *) usage ;;
  esac
}
validate_args "$@"

if [ -n "${DOCKER_CONTEXT:-}" ]; then
  endpoint=$(docker context inspect "$DOCKER_CONTEXT" --format '{{ (index .Endpoints "docker").Host }}')
else
  endpoint=${DOCKER_HOST:-$(docker context inspect --format '{{ (index .Endpoints "docker").Host }}')}
fi
case "$endpoint" in
  unix://*) ;;
  *) printf '%s\n' "Plan sync requires a local Unix Docker socket." >&2; exit 1 ;;
esac

labels=$(docker volume inspect --format '{{ index .Labels "com.docker.compose.project" }}:{{ index .Labels "com.docker.compose.volume" }}' "$volume")
if [ "$labels" != "$project:strapi-content" ]; then
  printf '%s\n' "The named volume does not belong to the default development Compose project." >&2
  exit 1
fi

mount_mode=readonly
if [ "$1" = "--apply" ]; then
  running=$(docker ps --filter "volume=$volume" --quiet)
  if [ -n "$running" ]; then
    printf '%s\n' "Stop the development Compose services before applying the plan sync." >&2
    exit 1
  fi
  mount_mode=rw
fi

mount="type=volume,source=$volume,target=/data"
if [ "$mount_mode" = readonly ]; then mount="$mount,readonly"; fi
exec docker run --rm --network none --platform linux/amd64 \
  --env QUOTE_DEV_CATALOG_MAINTENANCE=local-compose \
  --mount "$mount" "$image" node scripts/sync-dev-plans.mjs "$@"
