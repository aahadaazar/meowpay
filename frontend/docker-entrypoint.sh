#!/bin/sh
set -eu

dependencies_dir=/workspace/node_modules
expected_hash=$(cat /opt/meowpay/package.sha256)
installed_hash=$(cat "$dependencies_dir/.meowpay-package.sha256" 2>/dev/null || true)

# The source bind mount hides image files. Seed its dedicated volume from the
# image only when package.json changed and the image was rebuilt.
if [ "$installed_hash" != "$expected_hash" ]; then
  mkdir -p "$dependencies_dir"
  find "$dependencies_dir" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  cp -a /opt/meowpay/node_modules/. "$dependencies_dir/"
  cp /opt/meowpay/package.sha256 "$dependencies_dir/.meowpay-package.sha256"
fi

exec "$@"
