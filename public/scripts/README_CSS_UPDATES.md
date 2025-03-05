# CSS Centralization Guide

## Overview

This document describes the process of centralizing the sidebar menu CSS for the VExUS ATLAS website. This change ensures that updates to the sidebar styling are automatically applied to all pages, eliminating the need to update each HTML file individually.

## What Was Changed

1. **Centralized Menu Styles**: All critical menu visibility styles were moved from inline `<style>` tags in individual HTML files to the centralized `sidebar.css` file.

2. **Removed Duplicate Styles**: Removed redundant menu styles that were embedded in each HTML file.

3. **Consistent Menu Behavior**: Ensured consistent menu behavior across all pages by using the same CSS rules.

## Files Modified

- `public/html5up-phantom/assets/css/sidebar.css` - Added critical menu visibility styles
- HTML files throughout the site - Removed embedded menu styles

## How to Update Additional Pages

If you need to update additional HTML files to use the centralized CSS:

1. **Manual Method**: Remove the following section from any HTML file:
   ```html
   <!-- Critical styles for menu visibility -->
   <style>
       /* Critical styles for menu visibility */
       body.is-menu-visible #menu {
           /* styles */
       }
       
       #menu {
           /* styles */
       }
       
       /* other menu styles */
   </style>
   ```

2. **Automated Method**: Run the provided script:
   ```bash
   chmod +x public/scripts/update_css.sh
   ./public/scripts/update_css.sh
   ```

## Testing Your Changes

1. After removing the embedded styles, use the test page (`test_menu.html`) to verify that the menu still functions correctly.

2. Test on different devices and screen sizes to ensure responsive behavior.

## Making Future CSS Updates

When you need to update the sidebar styling:

1. Edit only the `sidebar.css` file
2. The changes will automatically apply to all pages that include this CSS file

## Troubleshooting

If the menu doesn't appear correctly after these changes:

1. Ensure all HTML files include the sidebar.css reference:
   ```html
   <link rel="stylesheet" href="html5up-phantom/assets/css/sidebar.css" />
   ```

2. Check for any remaining inline styles that might be overriding the centralized CSS

3. Verify that JavaScript for menu functionality is working correctly 