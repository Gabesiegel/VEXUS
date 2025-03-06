#!/bin/bash

# Script to standardize the JavaScript menu implementation across all HTML files
# This ensures all pages have the same optimized menu toggle functionality from index.html

echo "Standardizing JavaScript menu implementation across all HTML files..."

# Directory containing HTML files
HTML_DIR="../"

# Find all HTML files in the directory
HTML_FILES=$(find "$HTML_DIR" -name "*.html")

# The standardized JavaScript implementation from index.html
STANDARD_JS='    <!-- Menu Toggle Script -->
    <script>
        // Function to initialize menu toggle
        function initializeMenuToggle() {
            console.log("Initializing menu toggle");
            
            try {
                // Get menu elements
                const menuToggle = document.querySelector('\''a[href="#menu"]'\'');
                const menu = document.getElementById('\''menu'\'');
                
                if (!menuToggle) {
                    console.error("Menu toggle element not found!");
                    return;
                }
                
                if (!menu) {
                    console.error("Menu element not found!");
                    return;
                }
                
                // Track transition state to prevent multiple simultaneous transitions
                let isMenuTransitioning = false;
                
                // First ensure menu is properly hidden to start
                document.body.classList.remove('\''is-menu-visible'\'');
                menu.classList.remove('\''visible'\'', '\''active'\'');
                
                // Remove any existing click handlers by cloning and replacing
                const newMenuToggle = menuToggle.cloneNode(true);
                menuToggle.parentNode.replaceChild(newMenuToggle, menuToggle);
                
                // Add our click handler with support for both CSS class and display property
                newMenuToggle.addEventListener('\''click'\'', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (isMenuTransitioning) return;
                    isMenuTransitioning = true;
                    
                    requestAnimationFrame(() => {
                        // Use both approaches: class toggle (for theme) and display property (for our custom code)
                        document.body.classList.add('\''is-menu-visible'\'');
                        menu.style.display = '\''block'\'';
                        
                        // Force a repaint to ensure styles are applied before transition
                        void menu.offsetWidth;
                        
                        menu.classList.add('\''visible'\'', '\''active'\'');
                        
                        // Reset transition flag after animation completes
                        setTimeout(() => {
                            isMenuTransitioning = false;
                        }, 300); // Match with CSS transition duration
                    });
                });
                
                // Function to hide menu with performance optimizations
                function hideMenu() {
                    if (isMenuTransitioning) return;
                    isMenuTransitioning = true;
                    
                    requestAnimationFrame(() => {
                        // Hide menu using classes first (for transitions)
                        document.body.classList.remove('\''is-menu-visible'\'');
                        menu.classList.remove('\''visible'\'', '\''active'\'');
                        
                        // After transition completes, update display property and reset flag
                        setTimeout(() => {
                            menu.style.display = '\''none'\'';
                            isMenuTransitioning = false;
                        }, 300); // Match with CSS transition duration
                    });
                }
                
                // Create close button handler (important for mobile)
                const closeButton = menu.querySelector('\''a.close'\'');
                if (closeButton) {
                    const newCloseButton = closeButton.cloneNode(true);
                    closeButton.parentNode.replaceChild(newCloseButton, closeButton);
                    
                    newCloseButton.addEventListener('\''click'\'', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        hideMenu();
                    });
                }
                
                // Handle clicks outside the menu (use event delegation instead of capture phase)
                const bodyClickHandler = function(e) {
                    // If clicking outside menu and not on menu toggle
                    if (!e.target.closest('\''#menu'\'') && !e.target.closest('\''a[href="#menu"]'\'')) {
                        hideMenu();
                    }
                };
                
                // Remove any existing body click handler and add our new one
                document.body.removeEventListener('\''click'\'', bodyClickHandler);
                document.body.removeEventListener('\''click'\'', bodyClickHandler, true);  // Also remove any with capture phase
                document.body.addEventListener('\''click'\'', bodyClickHandler);
                
                // Handle escape key
                const keyHandler = function(e) {
                    if (e.key === '\''Escape'\'' || e.keyCode === 27) {
                        hideMenu();
                    }
                };
                
                // Remove any existing key handler and add our new one
                document.removeEventListener('\''keydown'\'', keyHandler);
                document.removeEventListener('\''keydown'\'', keyHandler, true);  // Also remove any with capture phase
                document.addEventListener('\''keydown'\'', keyHandler);
                
                console.log("Menu toggle initialization complete");
            } catch (error) {
                console.error("Error initializing menu toggle:", error);
            }
        }
        
        // Initialize the menu toggle after DOM is loaded
        document.addEventListener('\''DOMContentLoaded'\'', function() {
            console.log("DOM loaded, initializing menu toggle");
            // Initial setup with delay to ensure DOM is fully processed
            setTimeout(initializeMenuToggle, 100);
        });
        
        // Fallback initialization in case DOMContentLoaded already fired
        if (document.readyState === '\''complete'\'' || document.readyState === '\''interactive'\'') {
            console.log("Document already loaded, running fallback initialization");
            setTimeout(initializeMenuToggle, 200);
        }
    </script>'

# Loop through each HTML file
for file in $HTML_FILES; do
    echo "Processing $file..."
    
    # Create a temporary file
    temp_file=$(mktemp)
    
    # Replace the JavaScript implementation
    # This is more complex so we use awk for pattern matching
    awk -v standard_js="$STANDARD_JS" '
    BEGIN { in_scripts = 0; found_menu_toggle = 0; skip_toggle_script = 0; }
    /<!-- Scripts -->/ { in_scripts = 1; print; next; }
    in_scripts && /<!-- Menu Toggle Script -->/ {
        # Found the menu toggle script section, replace with standard implementation
        print standard_js;
        found_menu_toggle = 1;
        skip_toggle_script = 1;
        next;
    }
    in_scripts && /function initializeMenuToggle/ && !found_menu_toggle {
        # Found initializeMenuToggle but no specific header, replace with standard implementation
        print standard_js;
        found_menu_toggle = 1;
        skip_toggle_script = 1;
        next;
    }
    skip_toggle_script && /<\/script>/ {
        # End of the script section we want to skip
        skip_toggle_script = 0;
        next;
    }
    !skip_toggle_script { print; }
    ' "$file" > "$temp_file"
    
    # Add the standard implementation if it wasn't found
    if ! grep -q "function initializeMenuToggle" "$temp_file"; then
        # Insert the standard JS before the closing body tag
        sed "s|</body>|$STANDARD_JS\n</body>|" "$temp_file" > "$file"
    else
        # Replace the original file
        mv "$temp_file" "$file"
    fi
done

echo "JavaScript menu implementation standardization complete!"
echo "All pages now use the optimized menu toggle implementation from index.html." 