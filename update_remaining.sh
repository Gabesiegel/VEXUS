#!/bin/bash

# This script adds the menu toggle functionality to the remaining HTML files individually

# List of remaining HTML files to update
HTML_FILES=(
    "public/Publications.html"
    "public/about.html"
    "public/image_uploader.html"
    "public/our_team.html"
    "public/image_upload.html"
    "public/image_gallery.html"
    "public/contact.html"
    "public/acquisition.html"
    "public/test_api.html"
)

update_html_file() {
    local file=$1
    echo "Processing $file..."
    
    # Skip if file doesn't exist
    if [ ! -f "$file" ]; then
        echo "  File not found, skipping."
        return
    fi
    
    # Create a backup
    cp "$file" "${file}.bak"
    
    # Add the close button to the menu
    # First check if the close button already exists
    if ! grep -q "a href=\"#menu\" class=\"close\"" "$file"; then
        # Find the </div></nav> pattern and replace it with the close button + </div></nav>
        awk '
        {
            if (match($0, /<\/div>\s*<\/nav>/)) {
                print substr($0, 1, RSTART-1) "<a href=\"#menu\" class=\"close\" style=\"position: absolute; top: 20px; right: 20px; display: block; width: 40px; height: 40px; text-align: center; line-height: 40px; color: #777; border: 1px solid #ddd; border-radius: 50%;\">✕</a>" substr($0, RSTART);
            } else {
                print $0;
            }
        }
        ' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
    fi
    
    # Add the CSS styles to the head section
    # First check if the styles already exist
    if ! grep -q "Critical styles for menu visibility" "$file"; then
        awk '
        {
            if (match($0, /<\/head>/)) {
                print "    <!-- Additional styles for menu functionality -->";
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
    fi
    
    # Add the JavaScript to the body section
    # First check if the script already exists
    if ! grep -q "function initializeMenuToggle" "$file"; then
        awk '
        {
            if (match($0, /<\/body>/)) {
                print "    <!-- Menu Toggle Script -->";
                print "    <script>";
                print "        // Function to initialize menu toggle";
                print "        function initializeMenuToggle() {";
                print "            console.log(\"Initializing menu toggle\");";
                print "            ";
                print "            try {";
                print "                // Get menu elements";
                print "                const menuToggle = document.querySelector(\"a[href=\\\"#menu\\\"]\");";
                print "                const menu = document.getElementById(\"menu\");";
                print "                ";
                print "                if (!menuToggle) {";
                print "                    console.error(\"Menu toggle element not found!\");";
                print "                    return;";
                print "                }";
                print "                ";
                print "                if (!menu) {";
                print "                    console.error(\"Menu element not found!\");";
                print "                    return;";
                print "                }";
                print "                ";
                print "                // First ensure menu is properly hidden to start";
                print "                document.body.classList.remove(\"is-menu-visible\");";
                print "                menu.style.right = \"-100%\";";
                print "                menu.style.display = \"none\";";
                print "                menu.classList.remove(\"visible\", \"active\");";
                print "                ";
                print "                // Remove any existing click handlers by cloning and replacing";
                print "                const newMenuToggle = menuToggle.cloneNode(true);";
                print "                menuToggle.parentNode.replaceChild(newMenuToggle, menuToggle);";
                print "                ";
                print "                // Add our click handler with support for both CSS class and display property";
                print "                newMenuToggle.addEventListener(\"click\", function(e) {";
                print "                    e.preventDefault();";
                print "                    e.stopPropagation();";
                print "                    console.log(\"Menu toggle clicked\");";
                print "                    ";
                print "                    // Use both approaches: class toggle (for theme) and display property (for our custom code)";
                print "                    document.body.classList.add(\"is-menu-visible\");";
                print "                    menu.style.display = \"block\";";
                print "                    menu.style.right = \"0\";";
                print "                    menu.classList.add(\"visible\", \"active\");";
                print "                    ";
                print "                    // Force a repaint to ensure styles are applied";
                print "                    void menu.offsetWidth;";
                print "                });";
                print "                ";
                print "                // Create close button handler (important for mobile)";
                print "                const closeButton = menu.querySelector(\"a.close\");";
                print "                if (closeButton) {";
                print "                    const newCloseButton = closeButton.cloneNode(true);";
                print "                    closeButton.parentNode.replaceChild(newCloseButton, closeButton);";
                print "                    ";
                print "                    newCloseButton.addEventListener(\"click\", function(e) {";
                print "                        e.preventDefault();";
                print "                        e.stopPropagation();";
                print "                        console.log(\"Close button clicked\");";
                print "                        ";
                print "                        // Hide menu using both approaches";
                print "                        document.body.classList.remove(\"is-menu-visible\");";
                print "                        menu.style.display = \"none\";";
                print "                        menu.style.right = \"-100%\";";
                print "                        menu.classList.remove(\"visible\", \"active\");";
                print "                    });";
                print "                }";
                print "                ";
                print "                // Handle clicks outside the menu (use capture phase to run before other handlers)";
                print "                const bodyClickHandler = function(e) {";
                print "                    // If clicking outside menu and not on menu toggle";
                print "                    if (!e.target.closest(\"#menu\") && !e.target.closest(\"a[href=\\\"#menu\\\"]\")) {";
                print "                        console.log(\"Clicked outside menu\");";
                print "                        ";
                print "                        // Hide menu using both approaches";
                print "                        document.body.classList.remove(\"is-menu-visible\");";
                print "                        menu.style.display = \"none\";";
                print "                        menu.style.right = \"-100%\";";
                print "                        menu.classList.remove(\"visible\", \"active\");";
                print "                    }";
                print "                };";
                print "                ";
                print "                // Remove any existing body click handler and add our new one";
                print "                document.body.removeEventListener(\"click\", bodyClickHandler, true);";
                print "                document.body.addEventListener(\"click\", bodyClickHandler, true);";
                print "                ";
                print "                // Handle escape key";
                print "                const keyHandler = function(e) {";
                print "                    if (e.key === \"Escape\" || e.keyCode === 27) {";
                print "                        document.body.classList.remove(\"is-menu-visible\");";
                print "                        menu.style.display = \"none\";";
                print "                        menu.style.right = \"-100%\";";
                print "                        menu.classList.remove(\"visible\", \"active\");";
                print "                    }";
                print "                };";
                print "                ";
                print "                // Remove any existing key handler and add our new one";
                print "                document.removeEventListener(\"keydown\", keyHandler);";
                print "                document.addEventListener(\"keydown\", keyHandler);";
                print "                ";
                print "                console.log(\"Menu toggle initialization complete\");";
                print "            } catch (error) {";
                print "                console.error(\"Error initializing menu toggle:\", error);";
                print "            }";
                print "        }";
                print "        ";
                print "        // Initialize the menu toggle after DOM is loaded";
                print "        document.addEventListener(\"DOMContentLoaded\", function() {";
                print "            console.log(\"DOM loaded, initializing menu toggle\");";
                print "            // Initial setup with delay to ensure DOM is fully processed";
                print "            setTimeout(initializeMenuToggle, 100);";
                print "        });";
                print "        ";
                print "        // Fallback initialization in case DOMContentLoaded already fired";
                print "        if (document.readyState === \"complete\" || document.readyState === \"interactive\") {";
                print "            console.log(\"Document already loaded, running fallback initialization\");";
                print "            setTimeout(initializeMenuToggle, 200);";
                print "        }";
                print "    </script>";
                print $0;
            } else {
                print $0;
            }
        }
        ' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
    fi
    
    echo "  Updated successfully."
}

# Process each HTML file
for file in "${HTML_FILES[@]}"; do
    update_html_file "$file"
done

echo "All files updated successfully!" 