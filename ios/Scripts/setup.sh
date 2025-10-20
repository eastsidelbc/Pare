#!/bin/bash

#
# setup.sh
# First-time setup script for Pare iOS development
#
# Usage: ./Scripts/setup.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}"
echo "╔═══════════════════════════════════════╗"
echo "║   Pare iOS - First-Time Setup        ║"
echo "╚═══════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Check macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}❌ This script requires macOS${NC}"
    exit 1
fi

# Check Xcode
echo -e "${BLUE}1. Checking Xcode...${NC}"
if ! command -v xcodebuild &> /dev/null; then
    echo -e "${RED}❌ Xcode not found${NC}"
    echo "Install Xcode from the App Store: https://apps.apple.com/app/xcode/id497799835"
    exit 1
else
    XCODE_VERSION=$(xcodebuild -version | head -n 1)
    echo -e "${GREEN}✅ $XCODE_VERSION${NC}"
fi
echo ""

# Check Homebrew
echo -e "${BLUE}2. Checking Homebrew...${NC}"
if ! command -v brew &> /dev/null; then
    echo -e "${YELLOW}⚠️  Homebrew not found${NC}"
    echo "Install Homebrew:"
    echo '  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
    echo ""
    echo "Then run this script again."
    exit 1
else
    BREW_VERSION=$(brew --version | head -n 1)
    echo -e "${GREEN}✅ $BREW_VERSION${NC}"
fi
echo ""

# Check/Install XcodeGen
echo -e "${BLUE}3. Checking XcodeGen...${NC}"
if ! command -v xcodegen &> /dev/null; then
    echo -e "${YELLOW}⚠️  XcodeGen not found. Installing...${NC}"
    brew install xcodegen
    echo -e "${GREEN}✅ XcodeGen installed${NC}"
else
    XCODEGEN_VERSION=$(xcodegen --version)
    echo -e "${GREEN}✅ XcodeGen $XCODEGEN_VERSION${NC}"
fi
echo ""

# Check Node.js
echo -e "${BLUE}4. Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    echo "Install Node.js:"
    echo "  brew install node"
    exit 1
else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js $NODE_VERSION${NC}"
fi
echo ""

# Check npm dependencies (in parent directory)
echo -e "${BLUE}5. Checking npm dependencies...${NC}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found. Installing...${NC}"
    cd "$PROJECT_ROOT"
    npm install
    echo -e "${GREEN}✅ npm dependencies installed${NC}"
else
    echo -e "${GREEN}✅ npm dependencies present${NC}"
fi
echo ""

# Generate Xcode project
echo -e "${BLUE}6. Generating Xcode project...${NC}"
cd "$SCRIPT_DIR/.."
./Scripts/gen_xcode.sh
echo ""

# Check for app icon
echo -e "${BLUE}7. Checking app icon...${NC}"
APP_ICON_PATH="$SCRIPT_DIR/../Pare/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png"
if [ ! -f "$APP_ICON_PATH" ]; then
    echo -e "${YELLOW}⚠️  App icon not found${NC}"
    echo ""
    echo "To add an app icon:"
    echo "  1. Create a 1024x1024 PNG image"
    echo "  2. Save it at: Pare/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png"
    echo ""
    echo "Or convert existing web icon:"
    echo "  cd $SCRIPT_DIR/../Pare/Resources/Assets.xcassets/AppIcon.appiconset/"
    echo "  magick $PROJECT_ROOT/public/icon-192.png -resize 1024x1024 AppIcon-1024.png"
    echo ""
else
    echo -e "${GREEN}✅ App icon found${NC}"
fi
echo ""

# Final instructions
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════╗"
echo "║   ✅ Setup Complete!                  ║"
echo "╚═══════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo "Next steps:"
echo ""
echo -e "${YELLOW}1. Start Next.js dev server:${NC}"
echo "   cd $PROJECT_ROOT"
echo "   npm run dev"
echo ""
echo -e "${YELLOW}2. Open Xcode:${NC}"
echo "   open $SCRIPT_DIR/../Pare.xcodeproj"
echo ""
echo -e "${YELLOW}3. In Xcode:${NC}"
echo "   - Select 'Pare-Debug' scheme"
echo "   - Choose 'iPhone 15' simulator (or any iOS 16+ device)"
echo "   - Press ⌘R to build and run"
echo ""
echo -e "${YELLOW}4. Expected result:${NC}"
echo "   - App launches on simulator"
echo "   - Shows loading progress bar"
echo "   - Loads web app from http://localhost:4000/compare"
echo "   - Bottom tabs: Home, Settings, Debug"
echo ""
echo "For troubleshooting, see: docs/mobile/IOS_RUNBOOK.md"
echo ""

