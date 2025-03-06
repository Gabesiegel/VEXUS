#!/bin/bash

# Script to ensure all pages have the exact same menu order as index.html
# This is more targeted than standardize_menus.sh and focuses only on the menu order

echo "Fixing menu order across all HTML files to match index.html..."

# Directory containing HTML files
HTML_DIR="../"

# Extract the menu items from index.html to use as the reference
MENU_ITEMS=$(grep -A 12 '<ul>' "$HTML_DIR/index.html" | grep -E '<li><a href=".*\.html">.*</a></li>' | grep -v '</ul>')

# Find all HTML files in the directory (excluding index.html since it's our reference)
for file in $(find "$HTML_DIR" -name "*.html" ! -name "index.html"); do
    echo "Processing $file..."
    
    # Check if the file has a menu section
    if grep -q '<nav id="menu">' "$file"; then
        echo "Found menu in $file, updating menu order..."
        
        # Create a temporary file
        temp_file=$(mktemp)
        
        # Replace the menu items while keeping the surrounding structure
        awk '
        BEGIN { in_menu = 0; menu_items_found = 0; }
        /<nav id="menu">/ { in_menu = 1; }
        /<ul>/ && in_menu { 
            print $0;  # Print the <ul> line
            print "'"$MENU_ITEMS"'";  # Print our standard menu items
            in_menu = 0;  # Reset flag to stop replacing
            menu_items_found = 1;  # Mark that we found and replaced the menu
            # Skip all original menu items until </ul>
            while (getline line && !match(line, /<\/ul>/)) { }
            print line;  # Print the </ul> line
            next;
        }
        !menu_items_found { print $0; }  # Print everything else unchanged
        ' "$file" > "$temp_file"
        
        # Replace the original file with the fixed menu order
        mv "$temp_file" "$file"
    else
        echo "No menu found in $file"
    fi
done

echo "Menu order standardization complete!"
echo "All pages now have the same menu order as index.html." 