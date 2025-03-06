#!/bin/bash

# Script to add lazy loading attribute to images across the website
# This helps improve initial page load time by loading images only when they come into view

echo "Adding lazy loading to images across the website..."

# Directory containing HTML files
HTML_DIR="../"

# Find all HTML files in the directory
HTML_FILES=$(find "$HTML_DIR" -name "*.html")

# Loop through each HTML file
for file in $HTML_FILES; do
    echo "Processing $file..."
    
    # Create a temporary file
    temp_file=$(mktemp)
    
    # Add loading="lazy" to img tags that don't already have it
    # This avoids adding it to images that might need to load immediately (like logos)
    # Skip small logos and icons (typically class contains logo or icon)
    sed -E '
        # Skip logo and icon elements
        /class="(logo|sidebar-logo|icon|symbol)"/b
        # Skip img tags that already have loading attribute
        /img.*loading=/b
        # Add loading="lazy" attribute to remaining img tags
        s/(<img[^>]*)>/\1 loading="lazy">/g
    ' "$file" > "$temp_file"
    
    # Replace the original file with the one with lazy loading
    mv "$temp_file" "$file"
done

echo "Lazy loading added to images!"
echo "This should improve initial page load performance." 