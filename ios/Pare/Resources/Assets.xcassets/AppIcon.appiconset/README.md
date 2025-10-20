# App Icon

## Requirements

iOS requires a 1024x1024 PNG app icon with the following specifications:

- **Size**: 1024x1024 pixels
- **Format**: PNG
- **Color Space**: RGB (no CMYK)
- **Transparency**: No alpha channel (fully opaque)
- **Filename**: `AppIcon-1024.png`

## Current Status

⚠️ **PLACEHOLDER NEEDED**

The app icon file `AppIcon-1024.png` is not yet created. You can:

1. **Use existing icon**: Convert `/public/icon-192.png` to 1024x1024
   ```bash
   # Using ImageMagick (install with: brew install imagemagick)
   magick ~/Documents/Pare/public/icon-192.png -resize 1024x1024 AppIcon-1024.png
   ```

2. **Create new icon**: Design a 1024x1024 icon and save it here

3. **Use placeholder**: For development, any 1024x1024 PNG will work

## Installation

1. Place `AppIcon-1024.png` in this directory
2. Xcode will automatically generate all required sizes
3. Build and run to see the icon on device/simulator

## Design Guidelines

- Use the Pare brand colors (purple: #9B55D5)
- Consider using one of the NFL team logos from `/public/images/nfl-logos/`
- Keep it simple and recognizable at small sizes
- Avoid text (it won't be readable at small sizes)

## Resources

- [Apple Human Interface Guidelines - App Icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- Existing web icon: `/public/icon-192.png`
- NFL team logos: `/public/images/nfl-logos/*.svg`

