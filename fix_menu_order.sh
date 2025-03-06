#!/bin/bash

# Script to ensure all pages have the exact same menu order as index.html
# This is more targeted than standardize_menus.sh and focuses only on the menu order

echo "Fixing menu order across all HTML files to match index.html..."

# Directory containing HTML files
HTML_DIR="../"

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

# Find all HTML files in the directory (excluding index.html since it's our reference)
for file in $(find "$HTML_DIR" -name "*.html" ! -name "index.html"); do
    echo "Processing $file..."
    
    # Create a temporary file
    temp_file=$(mktemp)
    
    # Check if the file contains a menu section with at least one menu item
    if grep -q '<nav.*id="menu"' "$file" && grep -q '<li><a href=".*\.html">' "$file"; then
        echo "Found menu in $file, updating menu order..."
        
        # Use perl to replace the menu content more reliably
        perl -0777 -pe '
            s/(<nav\s+[^>]*id="menu"[^>]*>.*?<ul>).*?(<\/ul>)/$1\n`cat \/tmp\/standard_menu.txt`$2/s
        ' "$file" > "$temp_file"
        
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