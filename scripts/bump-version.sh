#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-}"

if [[ -z "$VERSION" ]]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 0.2.0"
  exit 1
fi

if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: Invalid semver format. Expected X.Y.Z (e.g., 0.2.0)"
  exit 1
fi

MONOREPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_ROOT="$MONOREPO_ROOT/apps/desktop"

echo "Bumping version to $VERSION..."

# package.json
sed -i'' -e "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$APP_ROOT/package.json"
echo "  Updated apps/desktop/package.json"

echo ""
echo "Version bumped to $VERSION."
echo "Next steps:"
echo "  git add -A && git commit -m \"chore: bump version to $VERSION\""
echo "  git tag v$VERSION"
echo "  git push origin v$VERSION"
