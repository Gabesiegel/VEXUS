#!/bin/bash

# Script to add mobile.css to HTML files that don't include it
# This ensures mobile optimization is uniform across all pages

echo "Checking HTML files for mobile.css inclusion..."

# Directory to search for HTML files
DIR="$(dirname "$(dirname "$0")")"
cd "$DIR" || exit 1

# Counter for modified files
MODIFIED=0

# Find all HTML files in public directory
for HTML_FILE in $(find . -name "*.html" -not -path "*/\.*" -not -path "*/backups/*" -not -path "*/scripts/*"); do
    # Check if file already includes mobile.css
    if ! grep -q "mobile.css" "$HTML_FILE"; then
        echo "Adding mobile.css to $HTML_FILE"
        
        # Create a backup
        cp "$HTML_FILE" "${HTML_FILE}.bak"
        
        # Add mobile.css link after other CSS files
        sed -i '' -e '/<link rel="stylesheet" href="html5up-phantom\/assets\/css\/.*\.css" \/>/a\'$'\n''<link rel="stylesheet" href="html5up-phantom/assets/css/mobile.css" />' "$HTML_FILE"
        
        MODIFIED=$((MODIFIED + 1))
    fi
done

echo "Done! Modified $MODIFIED HTML files."
echo "Check the backups (.bak files) if you need to revert any changes." 