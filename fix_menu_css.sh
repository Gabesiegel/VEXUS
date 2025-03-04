#!/bin/bash

# This script ensures all HTML files have the critical CSS for menu visibility

echo "Fixing menu CSS in all HTML files..."

CSS_STYLES='
    <!-- Critical styles for menu visibility -->
    <style>
        /* Critical styles for menu visibility */
        body.is-menu-visible #menu {
            display: block !important;
            visibility: visible !important;
            right: 0 !important;
            z-index: 10000 !important;
        }
        
        #menu {
            transition: all 0.5s ease;
            position: fixed !important;
            top: 0 !important;
            height: 100% !important;
            width: 300px !important;
            max-width: 80% !important;
            right: -300px !important;
            z-index: 10000 !important;
            overflow-y: auto !important;
        }
        
        #menu.visible {
            display: block !important;
            visibility: visible !important;
            right: 0 !important;
        }
        
        /* Increase z-index for menu toggle button */
        a[href="#menu"] {
            z-index: 9000 !important;
            position: relative !important;
        }
        
        /* Ensure menu appears above other elements */
        nav#menu {
            z-index: 10000 !important;
        }
    </style>'

for file in public/*.html; do
    echo "Processing $file..."
    
    # Skip if the file already has the menu visibility CSS
    if grep -q "Critical styles for menu visibility" "$file"; then
        echo "  CSS already exists, but will be updated."
        # Remove existing CSS to avoid duplicates
        sed -i.bak3 '/<!-- Critical styles for menu visibility/,/<\/style>/d' "$file"
    fi
    
    # Add the CSS styles before the closing head tag
    sed -i.bak4 "s|</head>|$CSS_STYLES\n</head>|" "$file"
    
    echo "  Updated successfully."
done

echo "All CSS styles updated!" 