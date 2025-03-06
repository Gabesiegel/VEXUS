#!/bin/bash

# Script to ensure all pages have the exact same menu order as index.html
# This is more targeted than standardize_menus.sh and focuses only on the menu order

echo "Fixing menu order across all HTML files to match index.html..."

# Directory containing HTML files
HTML_DIR="../"

# Find all HTML files in the directory (excluding index.html since it's our reference)
HTML_FILES=$(find "$HTML_DIR" -name "*.html" ! -name "index.html")

# Create a file with the correct menu order
cat > /tmp/standard_menu.txt << 'EOL'
                <ul>
                    <li><a href="index.html">Home</a></li>
                    <li><a href="calculator.html">AI Image Recognition</a></li>
                    <li><a href="acquisition.html">Image Acquisition Guide</a></li>
                    <li><a href="education.html">Education</a></li>
                    <li><a href="Publications.html">Publications</a></li>
                    <li><a href="literature_review.html">Literature Review</a></li>
                    <li><a href="image_gallery.html">Image Gallery</a></li>
                    <li><a href="about.html">About VExUS ATLAS</a></li>
                    <li><a href="our_team.html">Our Team</a></li>
                    <li><a href="contact.html">Contact</a></li>
                </ul>
EOL

# Loop through each HTML file
for file in $HTML_FILES; do
    echo "Processing $file..."
    
    # Create a temporary file
    temp_file=$(mktemp)
    
    # Check if the file has a menu
    if grep -q '<nav id="menu">' "$file"; then
        # Extract the start of the menu section until the <ul> tag
        menu_start=$(sed -n '/<nav id="menu">/,/<ul>/p' "$file" | sed '$d')
        
        # Extract the end of the menu section from </ul> onwards
        menu_end=$(sed -n '/<\/ul>/,/<\/nav>/p' "$file")
        
        # Combine all parts
        (
            # Part 1: Everything before the menu
            sed -n '1,/<nav id="menu">/p' "$file" | sed '$d'
            
            # Part 2: Menu start
            echo "$menu_start"
            
            # Part 3: Standard menu content
            cat /tmp/standard_menu.txt
            
            # Part 4: Menu end
            echo "$menu_end"
            
            # Part 5: Everything after the menu
            sed -n '/<\/nav>/,$p' "$file" | sed '1d'
        ) > "$temp_file"
        
        # Replace the original file with the fixed menu order
        mv "$temp_file" "$file"
    else
        # Clean up temp file if not used
        rm "$temp_file"
        echo "No menu found in $file"
    fi
done

# Clean up
rm /tmp/standard_menu.txt

echo "Menu order standardization complete!"
echo "All pages now have the same menu order as index.html." 