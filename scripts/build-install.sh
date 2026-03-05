#!/usr/bin/env bash
set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────
APP_NAME="Forja"
APP_ID="dev.forja.terminal"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INSTALL_DIR="$HOME/.local/opt/forja"
BIN_LINK="$HOME/.local/bin/forja"
DESKTOP_FILE="$HOME/.local/share/applications/${APP_NAME}.desktop"
ICON_DIR="$HOME/.local/share/applications/icons"
ICON_SOURCE="$REPO_ROOT/assets/icons/icon.png"

VERSION=$(node -p "require('${REPO_ROOT}/package.json').version")
APPIMAGE_NAME="${APP_NAME}-${VERSION}.AppImage"
RELEASE_DIR="$REPO_ROOT/release"

# ─── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[info]${NC}  $*"; }
ok()    { echo -e "${GREEN}[ok]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC}  $*"; }
error() { echo -e "${RED}[error]${NC} $*" >&2; }

# ─── Flags ───────────────────────────────────────────────────────────────────
SKIP_BUILD=false
UNINSTALL=false

for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
    --uninstall)  UNINSTALL=true ;;
    --help|-h)
      echo "Usage: $(basename "$0") [OPTIONS]"
      echo ""
      echo "Build and install ${APP_NAME} as a local application."
      echo ""
      echo "Options:"
      echo "  --skip-build   Skip build, install existing AppImage from release/"
      echo "  --uninstall    Remove installed app, desktop entry, and symlink"
      echo "  -h, --help     Show this help"
      exit 0
      ;;
    *)
      error "Unknown option: $arg"
      exit 1
      ;;
  esac
done

# ─── Uninstall ───────────────────────────────────────────────────────────────
if [[ "$UNINSTALL" == true ]]; then
  info "Uninstalling ${APP_NAME}..."

  if [[ -L "$BIN_LINK" ]]; then
    rm "$BIN_LINK"
    ok "Removed symlink $BIN_LINK"
  fi

  if [[ -f "$DESKTOP_FILE" ]]; then
    rm "$DESKTOP_FILE"
    ok "Removed desktop entry $DESKTOP_FILE"
  fi

  if [[ -d "$INSTALL_DIR" ]]; then
    rm -rf "$INSTALL_DIR"
    ok "Removed install directory $INSTALL_DIR"
  fi

  if [[ -f "$ICON_DIR/${APP_NAME}.png" ]]; then
    rm "$ICON_DIR/${APP_NAME}.png"
    ok "Removed icon"
  fi

  update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
  ok "${APP_NAME} uninstalled."
  exit 0
fi

# ─── Pre-checks ──────────────────────────────────────────────────────────────
info "Building ${APP_NAME} v${VERSION}"

if ! command -v pnpm &>/dev/null; then
  error "pnpm not found. Install it first: npm install -g pnpm"
  exit 1
fi

if ! command -v node &>/dev/null; then
  error "node not found."
  exit 1
fi

# ─── Build ───────────────────────────────────────────────────────────────────
if [[ "$SKIP_BUILD" == true ]]; then
  info "Skipping build (--skip-build)"
else
  info "Installing dependencies..."
  (cd "$REPO_ROOT" && pnpm install --frozen-lockfile)
  ok "Dependencies installed"

  info "Building Vite + Electron TypeScript..."
  (cd "$REPO_ROOT" && pnpm build)
  ok "Build completed"

  info "Packaging AppImage..."
  (cd "$REPO_ROOT" && pnpm exec electron-builder --linux AppImage)
  ok "AppImage packaged"
fi

# ─── Verify AppImage exists ──────────────────────────────────────────────────
APPIMAGE_PATH="$RELEASE_DIR/$APPIMAGE_NAME"

if [[ ! -f "$APPIMAGE_PATH" ]]; then
  error "AppImage not found at: $APPIMAGE_PATH"
  error "Available files in release/:"
  ls -1 "$RELEASE_DIR"/*.AppImage 2>/dev/null || echo "  (none)"
  exit 1
fi

APPIMAGE_SIZE=$(du -h "$APPIMAGE_PATH" | cut -f1)
info "AppImage ready: $APPIMAGE_PATH ($APPIMAGE_SIZE)"

# ─── Install ─────────────────────────────────────────────────────────────────
info "Installing to $INSTALL_DIR..."

mkdir -p "$INSTALL_DIR"
mkdir -p "$HOME/.local/bin"
mkdir -p "$ICON_DIR"

cp "$APPIMAGE_PATH" "$INSTALL_DIR/$APPIMAGE_NAME"
chmod +x "$INSTALL_DIR/$APPIMAGE_NAME"
ok "AppImage copied"

# Symlink (update if exists)
ln -sf "$INSTALL_DIR/$APPIMAGE_NAME" "$BIN_LINK"
ok "Symlink created: $BIN_LINK -> $APPIMAGE_NAME"

# Icon
if [[ -f "$ICON_SOURCE" ]]; then
  cp "$ICON_SOURCE" "$ICON_DIR/${APP_NAME}.png"
  ok "Icon installed"
else
  warn "Icon not found at $ICON_SOURCE"
fi

# ─── Desktop Entry ───────────────────────────────────────────────────────────
info "Creating desktop entry..."

cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Version=${VERSION}
Name=${APP_NAME}
Comment=Desktop GUI for AI coding CLIs
Exec=${INSTALL_DIR}/${APPIMAGE_NAME} %U
Terminal=false
Type=Application
Icon=${ICON_DIR}/${APP_NAME}.png
Categories=Development;IDE;
StartupNotify=true
StartupWMClass=${APP_NAME}
MimeType=x-scheme-handler/${APP_ID};
EOF

ok "Desktop entry created: $DESKTOP_FILE"

update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true

# ─── Done ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN} ${APP_NAME} v${VERSION} installed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Run from terminal:  forja"
echo "  App launcher:       Search for '${APP_NAME}'"
echo "  Uninstall:          $0 --uninstall"
echo ""
