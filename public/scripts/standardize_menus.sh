#!/bin/bash

# Script to standardize sidebar/menu implementation across all HTML files
# This ensures all menus have the same style, functionality, and buttons

echo "Standardizing menu implementation across all HTML files..."

# Directory containing HTML files
HTML_DIR="../"

# Find all HTML files in the directory
HTML_FILES=$(find "$HTML_DIR" -name "*.html")

# Standard menu HTML - this is the correct menu item order from index.html
STANDARD_MENU='<ul>
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
                </ul>'

# Loop through each HTML file
for file in $HTML_FILES; do
    echo "Processing $file..."
    
    # Create a temporary file
    temp_file=$(mktemp)
    
    # Fix close button (remove text content and inline styles)
    sed 's/<a href="#menu" class="close"[^>]*>.*<\/a>/<a href="#menu" class="close"><\/a>/g' "$file" > "$temp_file"
    
    # Replace original file with fixed close button
    cp "$temp_file" "$file"
    
    # Now let's fix the menu ordering
    # This requires a more complex pattern match so we use awk for this
    awk -v standard_menu="$STANDARD_MENU" '
    BEGIN { in_menu = 0; fixed = 0; }
    /<nav id="menu">/ { in_menu = 1; }
    in_menu && /<ul>/ && !fixed {
        # Skip until the closing </ul> tag
        print;
        print standard_menu;
        fixed = 1;
        # Skip the existing menu items
        while (getline && !match($0, /<\/ul>/)) { }
        print;
        next;
    }
    { print; }
    ' "$file" > "$temp_file"
    
    # Replace the original file with the one with standardized menu
    mv "$temp_file" "$file"
done

echo "Menu standardization complete!"
echo "Note: For complete standardization, the JavaScript implementation should be consistent across files."
echo "Consider applying the optimized index.html JavaScript implementation to all pages." 