#!/bin/bash

# Script to remove inline styles from the close button in all HTML files
# This ensures we use the centralized CSS rule that hides the close button

# Find all HTML files in the public directory
HTML_FILES=$(find public -name "*.html")

for file in $HTML_FILES; do
  echo "Processing $file..."
  
  # Create a temporary file
  temp_file=$(mktemp)
  
  # Use sed to replace the close button with inline style to just a simple close button with class
  sed 's/<a href="#menu" class="close" style="[^"]*">/<a href="#menu" class="close">/' "$file" > "$temp_file"
  
  # Replace the original file with the modified content
  mv "$temp_file" "$file"
  
  echo "  Updated close button in $file"
done

echo "All files processed. The close button now uses centralized CSS that hides it." 