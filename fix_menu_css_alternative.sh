#!/bin/bash

# This script ensures all HTML files have the critical CSS for menu visibility
# Using a different approach to avoid sed issues with multiline strings

echo "Fixing menu CSS in all HTML files (alternative approach)..."

for file in public/*.html; do
    echo "Processing $file..."
    
    # Skip if the file already has the updated menu CSS (check for one of our specific additions)
    if grep -q "max-width: 80% !important" "$file"; then
        echo "  Updated CSS already exists, skipping."
        continue
    fi
    
    # Remove any existing Critical styles for menu visibility to avoid duplicates
    if grep -q "Critical styles for menu visibility" "$file"; then
        echo "  Removing old CSS..."
        awk '
        BEGIN { printing = 1 }
        /<!-- Critical styles for menu visibility/ { printing = 0 }
        /\/style>/ && !printing { printing = 1; next }
        { if (printing) print $0 }
        ' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
    fi
    
    # Add the updated CSS using awk to insert before </head>
    echo "  Adding new CSS..."
    awk '
    {
        if (match($0, /<\/head>/)) {
            print "    <!-- Critical styles for menu visibility -->";
            print "    <style>";
            print "        /* Critical styles for menu visibility */";
            print "        body.is-menu-visible #menu {";
            print "            display: block !important;";
            print "            visibility: visible !important;";
            print "            right: 0 !important;";
            print "            z-index: 10000 !important;";
            print "        }";
            print "        ";
            print "        #menu {";
            print "            transition: all 0.5s ease;";
            print "            position: fixed !important;";
            print "            top: 0 !important;";
            print "            height: 100% !important;";
            print "            width: 300px !important;";
            print "            max-width: 80% !important;";
            print "            right: -300px !important;";
            print "            z-index: 10000 !important;";
            print "            overflow-y: auto !important;";
            print "        }";
            print "        ";
            print "        #menu.visible {";
            print "            display: block !important;";
            print "            visibility: visible !important;";
            print "            right: 0 !important;";
            print "        }";
            print "        ";
            print "        /* Increase z-index for menu toggle button */";
            print "        a[href=\"#menu\"] {";
            print "            z-index: 9000 !important;";
            print "            position: relative !important;";
            print "        }";
            print "        ";
            print "        /* Ensure menu appears above other elements */";
            print "        nav#menu {";
            print "            z-index: 10000 !important;";
            print "        }";
            print "    </style>";
            print $0;
        } else {
            print $0;
        }
    }
    ' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
    
    echo "  Updated successfully."
done

echo "All CSS styles updated!" 