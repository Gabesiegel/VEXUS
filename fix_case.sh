#!/bin/bash

# This script updates the logo filename case in all HTML files to match the actual file

# Find all HTML files in the public directory
HTML_FILES=$(find public -name "*.html")

# Counter for changed files
CHANGED_FILES=0

echo "Fixing logo filename case in HTML files..."

for file in $HTML_FILES; do
  # Check if file contains the incorrect case version
  if grep -q "vexus.atlas.png" "$file"; then
    # Create a backup of the original file if not already created
    if [ ! -f "${file}.bak" ]; then
      cp "$file" "${file}.bak"
    fi
    
    # Update the filename case to match the actual file
    sed -i '' 's/vexus\.atlas\.png/VEXUS.ATLAS.png/g' "$file"
    
    echo "Fixed logo filename case in $file"
    CHANGED_FILES=$((CHANGED_FILES + 1))
  fi
done

echo "----------------------------------------"
echo "Logo filename case fix complete!"
echo "$CHANGED_FILES file(s) were updated."
echo "----------------------------------------" 