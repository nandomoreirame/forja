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

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Bumping version to $VERSION..."

# package.json
sed -i'' -e "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$REPO_ROOT/package.json"
echo "  Updated package.json"

# backend/Cargo.toml (only the package version, not dependency versions)
sed -i'' -e "0,/^version = \"[^\"]*\"/s//version = \"$VERSION\"/" "$REPO_ROOT/backend/Cargo.toml"
echo "  Updated backend/Cargo.toml"

# backend/tauri.conf.json
sed -i'' -e "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$REPO_ROOT/backend/tauri.conf.json"
echo "  Updated backend/tauri.conf.json"

# Regenerate Cargo.lock
(cd "$REPO_ROOT/backend" && cargo generate-lockfile 2>/dev/null) || true
echo "  Regenerated Cargo.lock"

echo ""
echo "Version bumped to $VERSION in all files."
echo "Next steps:"
echo "  git add -A && git commit -m \"🧹 chore: bump version to $VERSION\""
echo "  git tag v$VERSION"
echo "  git push origin v$VERSION"
