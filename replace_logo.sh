#!/bin/bash

# This script replaces all references to "vexus-ai-logo.png" with "vexus.atlas.png" in all HTML files

# Find all HTML files in the public directory
HTML_FILES=$(find public -name "*.html")

# Counter for changed files
CHANGED_FILES=0

echo "Replacing logo references in HTML files..."

for file in $HTML_FILES; do
  # Check if file contains the old logo name
  if grep -q "vexus-ai-logo.png" "$file"; then
    # Create a backup of the original file
    cp "$file" "${file}.bak"
    
    # Replace all instances of the old logo name with the new one
    sed -i '' 's/vexus-ai-logo\.png/vexus.atlas.png/g' "$file"
    
    echo "Updated logo reference in $file"
    CHANGED_FILES=$((CHANGED_FILES + 1))
  fi
done

echo "----------------------------------------"
echo "Logo replacement complete!"
echo "$CHANGED_FILES file(s) were updated."
echo "----------------------------------------"
echo ""
echo "NOTE: You may need to also rename the actual logo file in your images directory."
echo "To do this, run: mv public/images/vexus-ai-logo.png public/images/vexus.atlas.png" 