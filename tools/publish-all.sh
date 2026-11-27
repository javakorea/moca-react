#!/usr/bin/env bash
# packages/* 를 npm 에 공개 배포한다. 먼저 npm login 을 하고, npm 에 조직(@teammoca)이 있어야 한다.
#   bash tools/publish-all.sh            # 실제 배포
#   bash tools/publish-all.sh --dry-run  # 올라갈 내용만 확인
set -e
cd "$(dirname "$0")/.."
npm whoami >/dev/null || { echo "npm login 부터 하세요"; exit 1; }
for d in packages/*/; do
  echo "== $d"
  (cd "$d" && npm publish --access public "$@")
done
