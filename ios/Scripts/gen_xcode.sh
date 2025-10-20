#!/bin/bash

#
# gen_xcode.sh
# Generates Pare.xcodeproj from project.yml using XcodeGen
#
# Usage: ./Scripts/gen_xcode.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛠️  Generating Xcode project...${NC}"
echo ""

# Check if xcodegen is installed
if ! command -v xcodegen &> /dev/null; then
    echo -e "${RED}❌ XcodeGen not found${NC}"
    echo ""
    echo "Install XcodeGen:"
    echo "  brew install xcodegen"
    echo ""
    echo "Or:"
    echo "  mint install yonaskolb/XcodeGen"
    echo ""
    exit 1
fi

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
IOS_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# Change to ios directory
cd "$IOS_DIR"

# Run XcodeGen
echo -e "${YELLOW}📝 Running XcodeGen...${NC}"
xcodegen generate

# Check if successful
if [ -d "Pare.xcodeproj" ]; then
    echo ""
    echo -e "${GREEN}✅ Xcode project generated successfully!${NC}"
    echo ""
    echo "Location: $IOS_DIR/Pare.xcodeproj"
    echo ""
    echo "Next steps:"
    echo "  1. Open Pare.xcodeproj in Xcode"
    echo "  2. Select Pare-Debug scheme"
    echo "  3. Start Next.js dev server: cd .. && npm run dev"
    echo "  4. Run on iPhone Simulator"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Failed to generate Xcode project${NC}"
    exit 1
fi

