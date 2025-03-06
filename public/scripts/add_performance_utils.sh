#!/bin/bash

# Script to add performance utilities and defer scripts across the website
# This helps improve page load time and overall performance

echo "Adding performance optimizations to all pages..."

# Directory containing HTML files
HTML_DIR="../"

# Find all HTML files in the directory
HTML_FILES=$(find "$HTML_DIR" -name "*.html")

# Loop through each HTML file
for file in $HTML_FILES; do
    echo "Processing $file..."
    
    # Create a temporary file
    temp_file=$(mktemp)
    
    # Add defer attribute to scripts that don't already have it
    sed -E '
        # Skip scripts that already have defer or async
        /<script.*defer|<script.*async/b
        # Skip inline scripts (those without src attribute)
        /<script[^>]*>[^<]/b
        # Add defer attribute to remaining external scripts
        s/(<script[^>]*src="[^"]*")/\1 defer/g
    ' "$file" > "$temp_file"
    
    # Replace the original file with the deferred scripts
    mv "$temp_file" "$file"
    
    # Now add performance-utils.js before main.js if it doesn't exist
    temp_file=$(mktemp)
    
    # Check if performance-utils.js is already included
    if ! grep -q "performance-utils.js" "$file"; then
        # Add performance-utils.js before main.js
        sed -E 's|(<script[^>]*src="[^"]*main.js"[^>]*>)|<script src="html5up-phantom/assets/js/performance-utils.js" defer></script>\n    \1|' "$file" > "$temp_file"
        # Replace the original file
        mv "$temp_file" "$file"
    else
        rm "$temp_file"  # Clean up the temp file if not used
    fi
done

echo "Performance optimizations added!"
echo "This should improve page load time and overall performance." 