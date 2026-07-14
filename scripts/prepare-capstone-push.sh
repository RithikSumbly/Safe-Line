# Push to capstone submission repo — run from dev repo root:
#   ./scripts/prepare-capstone-push.sh
# Then:
#   cd /tmp/himshikhar-capstone-safeline && git push -u origin main
#
# Target: https://github.com/RithikSumbly/Himshikhar-Capstone-Safe-Line.git
# Excludes: _archive, _private, .cursor, .vercel, secrets, node_modules

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGING="${STAGING_DIR:-/tmp/himshikhar-capstone-safeline}"
CAPSTONE_REMOTE="${CAPSTONE_REMOTE:-https://github.com/RithikSumbly/Himshikhar-Capstone-Safe-Line.git}"
AUTHOR_NAME="${GIT_AUTHOR_NAME:-Rithik Vimal Sumbly}"
AUTHOR_EMAIL="${GIT_AUTHOR_EMAIL:-rithiksumbly@gmail.com}"
COMMIT_MSG="${COMMIT_MSG:-Himshikhar 2026 Agentic AI Capstone — SafeLine}"

echo "==> Staging clean copy to: $STAGING"
rm -rf "$STAGING"
mkdir -p "$STAGING"

rsync -a \
  --exclude '.git' \
  --exclude '_archive' \
  --exclude '_private' \
  --exclude '.cursor' \
  --exclude '.vercel' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.venv' \
  --exclude '__pycache__' \
  --exclude '.pytest_cache' \
  --exclude '.DS_Store' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '.env.*.local' \
  --exclude '/scripts/' \
  "$REPO_ROOT/" "$STAGING/"

# Capstone README: drop HF Space frontmatter and point GitHub link at submission repo.
STAGING="$STAGING" python3 - <<'PY'
from pathlib import Path
import os

readme = Path(os.environ["STAGING"]) / "README.md"
text = readme.read_text(encoding="utf-8")
if text.startswith("---\n"):
    end = text.find("\n---\n", 4)
    if end != -1:
        text = text[end + 5 :]
text = text.replace(
    "github.com/RithikSumbly/Safe-Line",
    "github.com/RithikSumbly/Himshikhar-Capstone-Safe-Line",
)
text = text.replace(
    "https://github.com/RithikSumbly/Safe-Line",
    "https://github.com/RithikSumbly/Himshikhar-Capstone-Safe-Line",
)
readme.write_text(text, encoding="utf-8")
PY

cd "$STAGING"
git init -q
git add -A
git -c user.name="$AUTHOR_NAME" -c user.email="$AUTHOR_EMAIL" \
  commit -m "$COMMIT_MSG"

git branch -M main
git remote add origin "$CAPSTONE_REMOTE" 2>/dev/null || git remote set-url origin "$CAPSTONE_REMOTE"

echo ""
echo "==> Ready. Staging repo: $STAGING"
echo "==> Single commit on main, author: $AUTHOR_NAME <$AUTHOR_EMAIL>"
echo ""
echo "Run this to publish (you execute the push):"
echo ""
echo "  cd \"$STAGING\" && git push -u origin main --force"
echo ""
echo "Target: $CAPSTONE_REMOTE"
