#!/bin/sh
set -eu

cache_dir=${GRADLE_USER_HOME:-/gradle-cache}
marker="$cache_dir/.meowpay-cache-ready"

# The bind mount hides image files, so seed the named Gradle cache volume once.
if [ ! -f "$marker" ]; then
  mkdir -p "$cache_dir"
  cp -a /opt/meowpay/gradle-home/. "$cache_dir/"
  touch "$marker"
fi

exec "$@"
