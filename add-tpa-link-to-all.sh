#!/bin/bash

# This script adds the TPA HOME link script to all HTML files in the project

# Find all HTML files in the public directory
files=$(find public -name "*.html")

# Loop through each file
for file in $files; do
  echo "Processing $file..."
  
  # Check if the script is already added
  if grep -q "add-tpa-link.js" "$file"; then
    echo "Script already added to $file"
  else
    # Insert the script tag before the closing body tag
    sed -i '' 's|</body>|<script src="html5up-phantom/assets/js/add-tpa-link.js"></script>\n</body>|' "$file"
    echo "Added script to $file"
  fi
done

echo "All files processed!" 