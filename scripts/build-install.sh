#!/usr/bin/env bash
set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────
APP_NAME="Forja"
APP_ID="dev.forja.terminal"
MONOREPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_ROOT="$MONOREPO_ROOT/apps/desktop"
ICON_SOURCE="$APP_ROOT/assets/icons/icon.png"
RELEASE_DIR="$APP_ROOT/release"

VERSION=$(node -p "require('${APP_ROOT}/package.json').version")

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

# ─── OS Detection ────────────────────────────────────────────────────────────
detect_platform() {
  local kernel arch

  kernel="$(uname -s)"
  arch="$(uname -m)"

  case "$kernel" in
    Darwin)
      PLATFORM="macos"
      if [[ "$arch" == "arm64" ]]; then
        ARCH="arm64"
      else
        ARCH="x64"
      fi
      ;;
    Linux)
      if command -v dpkg &>/dev/null && command -v apt-get &>/dev/null; then
        PLATFORM="debian"
      else
        PLATFORM="linux"
      fi
      ARCH="x64"
      ;;
    MINGW*|MSYS*|CYGWIN*|Windows_NT)
      PLATFORM="windows"
      ARCH="x64"
      ;;
    *)
      error "Unsupported OS: $kernel"
      exit 1
      ;;
  esac

  info "Detected platform: ${PLATFORM} (${ARCH})"
}

# ─── Platform-specific variables ─────────────────────────────────────────────
setup_platform_vars() {
  case "$PLATFORM" in
    macos)
      BUILD_TARGET="--mac dmg --${ARCH}"
      ARTIFACT_EXT="dmg"
      ARTIFACT_PATTERN="*.dmg"
      INSTALL_DIR="/Applications"
      ;;
    debian)
      BUILD_TARGET="--linux deb"
      ARTIFACT_EXT="deb"
      ARTIFACT_PATTERN="*.deb"
      INSTALL_DIR=""
      ;;
    linux)
      BUILD_TARGET="--linux AppImage"
      ARTIFACT_EXT="AppImage"
      ARTIFACT_PATTERN="*.AppImage"
      INSTALL_DIR="$HOME/.local/opt/forja"
      ;;
    windows)
      BUILD_TARGET="--win nsis"
      ARTIFACT_EXT="exe"
      ARTIFACT_PATTERN="*.exe"
      INSTALL_DIR=""
      ;;
  esac
}

# ─── Kill running Forja processes ─────────────────────────────────────────
kill_running_forja() {
  local pids
  pids=$(pgrep -f "${APP_NAME}.*AppImage" 2>/dev/null || true)

  if [[ -z "$pids" ]]; then
    return
  fi

  warn "Running Forja process(es) detected: $pids"
  info "Stopping them before install..."

  for pid in $pids; do
    kill "$pid" 2>/dev/null || true
  done

  # Wait up to 5s for graceful shutdown
  local waited=0
  while kill -0 $pids 2>/dev/null && [[ $waited -lt 5 ]]; do
    sleep 1
    waited=$((waited + 1))
  done

  # Force kill if still alive
  for pid in $pids; do
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
      warn "Force-killed PID $pid"
    fi
  done

  ok "Forja processes stopped"
}

# ─── Find artifact ───────────────────────────────────────────────────────────
find_artifact() {
  local found
  found=$(find "$RELEASE_DIR" -maxdepth 1 -name "$ARTIFACT_PATTERN" -newer "$APP_ROOT/package.json" 2>/dev/null | head -1)

  if [[ -z "$found" ]]; then
    found=$(find "$RELEASE_DIR" -maxdepth 1 -name "$ARTIFACT_PATTERN" 2>/dev/null | head -1)
  fi

  if [[ -z "$found" ]]; then
    error "Artifact not found in $RELEASE_DIR matching $ARTIFACT_PATTERN"
    error "Available files:"
    ls -1 "$RELEASE_DIR"/ 2>/dev/null || echo "  (none)"
    exit 1
  fi

  ARTIFACT_PATH="$found"
  ARTIFACT_NAME="$(basename "$found")"
  ARTIFACT_SIZE=$(du -h "$ARTIFACT_PATH" | cut -f1)
  info "Artifact ready: $ARTIFACT_PATH ($ARTIFACT_SIZE)"
}

# ─── Uninstall ───────────────────────────────────────────────────────────────
do_uninstall() {
  info "Uninstalling ${APP_NAME}..."

  case "$PLATFORM" in
    macos)
      local app_path
      app_path=$(find /Applications -maxdepth 1 -name "${APP_NAME}*.app" 2>/dev/null | head -1)
      if [[ -n "$app_path" ]]; then
        rm -rf "$app_path"
        ok "Removed $app_path"
      else
        warn "No ${APP_NAME}.app found in /Applications"
      fi
      ;;
    debian)
      if dpkg -l | grep -q "forja"; then
        sudo dpkg -r forja
        ok "Package forja removed"
      else
        warn "Package forja not installed"
      fi
      ;;
    linux)
      local bin_link="$HOME/.local/bin/forja"
      local desktop_file="$HOME/.local/share/applications/${APP_NAME}.desktop"
      local icon_dir="$HOME/.local/share/applications/icons"

      if [[ -L "$bin_link" ]]; then
        rm "$bin_link"
        ok "Removed symlink $bin_link"
      fi

      if [[ -f "$desktop_file" ]]; then
        rm "$desktop_file"
        ok "Removed desktop entry $desktop_file"
      fi

      if [[ -d "$INSTALL_DIR" ]]; then
        rm -rf "$INSTALL_DIR"
        ok "Removed install directory $INSTALL_DIR"
      fi

      if [[ -f "$icon_dir/${APP_NAME}.png" ]]; then
        rm "$icon_dir/${APP_NAME}.png"
        ok "Removed icon"
      fi

      update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
      ;;
    windows)
      warn "On Windows, uninstall via Settings > Apps or Control Panel"
      exit 0
      ;;
  esac

  ok "${APP_NAME} uninstalled."
  exit 0
}

# ─── Install: macOS ──────────────────────────────────────────────────────────
install_macos() {
  info "Mounting DMG..."
  local mount_point
  mount_point=$(hdiutil attach "$ARTIFACT_PATH" -nobrowse -noverify | grep "/Volumes" | awk '{print $NF}')

  if [[ -z "$mount_point" ]]; then
    error "Failed to mount DMG"
    exit 1
  fi

  local app_source
  app_source=$(find "$mount_point" -maxdepth 1 -name "*.app" | head -1)

  if [[ -z "$app_source" ]]; then
    hdiutil detach "$mount_point" -quiet 2>/dev/null || true
    error "No .app found inside DMG"
    exit 1
  fi

  local app_name
  app_name="$(basename "$app_source")"

  # Remove previous version if exists
  if [[ -d "/Applications/$app_name" ]]; then
    info "Removing previous version..."
    rm -rf "/Applications/$app_name"
  fi

  info "Copying $app_name to /Applications..."
  cp -R "$app_source" /Applications/
  ok "App installed to /Applications/$app_name"

  hdiutil detach "$mount_point" -quiet 2>/dev/null || true
  ok "DMG unmounted"

  # Clear quarantine attribute (required for non-notarized apps)
  info "Clearing quarantine attribute..."
  xattr -cr "/Applications/$app_name"
  ok "Quarantine cleared (xattr -cr)"
}

# ─── Install: Debian (.deb) ─────────────────────────────────────────────────
install_debian() {
  info "Installing .deb package..."
  sudo dpkg -i "$ARTIFACT_PATH" || true
  sudo apt-get install -f -y
  ok "Package installed via dpkg"
}

# ─── Install: Linux AppImage ────────────────────────────────────────────────
install_linux_appimage() {
  local bin_link="$HOME/.local/bin/forja"
  local desktop_file="$HOME/.local/share/applications/${APP_NAME}.desktop"
  local icon_dir="$HOME/.local/share/applications/icons"

  # Clean old versions from install dir
  if [[ -d "$INSTALL_DIR" ]]; then
    local old_count
    old_count=$(find "$INSTALL_DIR" -maxdepth 1 -name "*.AppImage" ! -name "$ARTIFACT_NAME" | wc -l)
    if [[ "$old_count" -gt 0 ]]; then
      info "Removing $old_count old AppImage(s) from $INSTALL_DIR..."
      find "$INSTALL_DIR" -maxdepth 1 -name "*.AppImage" ! -name "$ARTIFACT_NAME" -print -delete | while read -r f; do
        ok "Removed $(basename "$f")"
      done
    fi
  fi

  # Clean old versions from release dir
  if [[ -d "$RELEASE_DIR" ]]; then
    local old_count
    old_count=$(find "$RELEASE_DIR" -maxdepth 1 -name "*.AppImage" ! -name "$ARTIFACT_NAME" | wc -l)
    if [[ "$old_count" -gt 0 ]]; then
      info "Removing $old_count old AppImage(s) from $RELEASE_DIR..."
      find "$RELEASE_DIR" -maxdepth 1 -name "*.AppImage" ! -name "$ARTIFACT_NAME" -print -delete | while read -r f; do
        ok "Removed $(basename "$f")"
      done
    fi
  fi

  mkdir -p "$INSTALL_DIR"
  mkdir -p "$HOME/.local/bin"
  mkdir -p "$icon_dir"

  cp "$ARTIFACT_PATH" "$INSTALL_DIR/$ARTIFACT_NAME"
  chmod +x "$INSTALL_DIR/$ARTIFACT_NAME"
  ok "AppImage copied"

  ln -sf "$INSTALL_DIR/$ARTIFACT_NAME" "$bin_link"
  ok "Symlink created: $bin_link -> $ARTIFACT_NAME"

  # Icon
  if [[ -f "$ICON_SOURCE" ]]; then
    cp "$ICON_SOURCE" "$icon_dir/${APP_NAME}.png"
    ok "Icon installed"
  else
    warn "Icon not found at $ICON_SOURCE"
  fi

  # Desktop entry
  info "Creating desktop entry..."
  cat > "$desktop_file" << EOF
[Desktop Entry]
Version=${VERSION}
Name=${APP_NAME} v${VERSION}
Comment=Desktop GUI for AI coding CLIs
Exec=${INSTALL_DIR}/${ARTIFACT_NAME} %U
Terminal=false
Type=Application
Icon=${icon_dir}/${APP_NAME}.png
Categories=Development;IDE;
StartupNotify=true
StartupWMClass=${APP_NAME}
MimeType=x-scheme-handler/${APP_ID};
EOF

  ok "Desktop entry created: $desktop_file"
  update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
}

# ─── Install: Windows (.exe) ────────────────────────────────────────────────
install_windows() {
  info "Launching NSIS installer..."
  "$ARTIFACT_PATH"
  ok "Installer launched (follow the wizard to complete)"
}

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
      echo "Build and install ${APP_NAME} for the current platform."
      echo ""
      echo "Supported platforms:"
      echo "  macOS (Intel x64)       Build and install .dmg"
      echo "  macOS (Apple Silicon)   Build and install .dmg (arm64)"
      echo "  Linux (Debian/Ubuntu)   Build and install .deb"
      echo "  Linux (other)           Build and install .AppImage"
      echo "  Windows                 Build and launch .exe installer"
      echo ""
      echo "Options:"
      echo "  --skip-build   Skip build, install existing artifact from release/"
      echo "  --uninstall    Remove installed app"
      echo "  -h, --help     Show this help"
      exit 0
      ;;
    *)
      error "Unknown option: $arg"
      exit 1
      ;;
  esac
done

# ─── Main ────────────────────────────────────────────────────────────────────
detect_platform
setup_platform_vars

if [[ "$UNINSTALL" == true ]]; then
  do_uninstall
fi

# ─── Pre-checks ──────────────────────────────────────────────────────────────
info "Building ${APP_NAME} v${VERSION} for ${PLATFORM} (${ARCH})"

if ! command -v pnpm &>/dev/null; then
  error "pnpm not found. Install it first: npm install -g pnpm"
  exit 1
fi

if ! command -v node &>/dev/null; then
  error "node not found."
  exit 1
fi

# Python distutils is required by node-gyp to compile native addons (node-pty).
# Python 3.12+ removed distutils from stdlib; setuptools provides it.
if ! python3 -c "import distutils" &>/dev/null; then
  warn "Python distutils not found (required by node-gyp for native addons)."
  warn "Install setuptools to provide it:"
  case "$PLATFORM" in
    macos)   warn "  brew install python-setuptools" ;;
    debian)  warn "  sudo apt-get install python3-setuptools" ;;
    linux)   warn "  pip install setuptools  # or: sudo pacman -S python-setuptools" ;;
    windows) warn "  pip install setuptools" ;;
  esac
  exit 1
fi

# ─── Build ───────────────────────────────────────────────────────────────────
if [[ "$SKIP_BUILD" == true ]]; then
  info "Skipping build (--skip-build)"
else
  info "Installing dependencies..."
  (cd "$APP_ROOT" && pnpm install --frozen-lockfile)
  ok "Dependencies installed"

  info "Building Vite + Electron TypeScript..."
  (cd "$APP_ROOT" && pnpm build)
  ok "Build completed"

  info "Packaging for ${PLATFORM} (${ARTIFACT_EXT})..."
  # shellcheck disable=SC2086
  (cd "$APP_ROOT" && pnpm exec electron-builder $BUILD_TARGET)
  ok "Package created"
fi

# ─── Find and verify artifact ────────────────────────────────────────────────
find_artifact

# ─── Stop running instances before install ────────────────────────────────
kill_running_forja

# ─── Install ─────────────────────────────────────────────────────────────────
case "$PLATFORM" in
  macos)           install_macos ;;
  debian)          install_debian ;;
  linux)           install_linux_appimage ;;
  windows)         install_windows ;;
esac

# ─── Done ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN} ${APP_NAME} v${VERSION} installed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

case "$PLATFORM" in
  macos)
    echo "  Open:       open /Applications/${APP_NAME}-${VERSION}.app"
    echo "  Or search:  Spotlight > '${APP_NAME}'"
    ;;
  debian)
    echo "  Run:        forja"
    echo "  Or search:  App launcher > '${APP_NAME}'"
    ;;
  linux)
    echo "  Run from terminal:  forja"
    echo "  App launcher:       Search for '${APP_NAME}'"
    ;;
  windows)
    echo "  Run:  Search for '${APP_NAME}' in Start Menu"
    ;;
esac

echo "  Uninstall:  $0 --uninstall"
echo ""
