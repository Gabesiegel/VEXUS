#!/bin/bash

# Script to standardize viewport settings across all HTML files
# Consistent viewport settings help prevent rendering issues on mobile devices

echo "Standardizing viewport settings across all HTML files..."

# Directory containing HTML files
HTML_DIR="../"

# Find all HTML files in the directory
HTML_FILES=$(find "$HTML_DIR" -name "*.html")

# The standardized viewport meta tag
STANDARD_VIEWPORT='<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, minimum-scale=1.0" />'

# Loop through each HTML file
for file in $HTML_FILES; do
    echo "Processing $file..."
    
    # Create a temporary file
    temp_file=$(mktemp)
    
    # Check if the file has a viewport meta tag
    if grep -q '<meta.*name="viewport"' "$file"; then
        # Replace existing viewport tag with the standard one
        sed -E 's|<meta[^>]*name="viewport"[^>]*>|'"$STANDARD_VIEWPORT"'|' "$file" > "$temp_file"
    else
        # Add viewport tag after the charset meta tag if it doesn't exist
        sed -E 's|(<meta[^>]*charset="[^"]*"[^>]*>)|&\n    '"$STANDARD_VIEWPORT"'|' "$file" > "$temp_file"
    fi
    
    # Replace the original file with the standardized viewport
    mv "$temp_file" "$file"
done

echo "Viewport settings standardization complete!"
echo "This should help prevent rendering issues on mobile devices." 