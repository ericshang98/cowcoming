#!/bin/zsh
cd "$(dirname "$0")/.." || exit 1
if [[ -x /opt/homebrew/opt/node@24/bin/node ]]; then
  export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
fi
# Reopening this entry never restarts or replaces an occupied service.
if curl --silent --fail --output /dev/null http://127.0.0.1:4337/__motion-lab/start; then
  open http://127.0.0.1:4337/__motion-lab/start
else
  npm run motion:lab -- --open
fi
