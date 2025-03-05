#!/bin/bash

# Script to remove inline critical menu styles from all HTML files
# Ensures all pages use the centralized sidebar.css for menu styling

# Find all HTML files in the public directory
HTML_FILES=$(find public -name "*.html")

for file in $HTML_FILES; do
  echo "Processing $file..."
  
  # Check if file contains the critical menu styles comment
  if grep -q "Critical styles for menu visibility" "$file"; then
    echo "  Found critical menu styles in $file"
    
    # Create a temporary file
    temp_file=$(mktemp)
    
    # Use sed to remove the critical menu styles section
    # This pattern matches from the comment to the closing style tag
    sed '/<!-- Critical styles for menu visibility -->/,/<\/style>/d' "$file" > "$temp_file"
    
    # Replace the original file with the modified content
    mv "$temp_file" "$file"
    
    echo "  Removed critical menu styles from $file"
  else
    echo "  No critical menu styles found in $file"
  fi
done

echo "All files processed. The menu styles are now centralized in sidebar.css."
echo "Make sure all HTML files include the correct reference to sidebar.css:"
echo '<link rel="stylesheet" href="html5up-phantom/assets/css/sidebar.css" />' 