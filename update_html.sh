#!/bin/bash

# This script adds the menu toggle functionality to all HTML files in the public folder

# CSS styles to add to the head section
CSS_STYLES='<!-- Additional styles for menu functionality -->
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

# JavaScript to add before the closing body tag
JS_CODE='<!-- Menu Toggle Script -->
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
                
                // First ensure menu is properly hidden to start
                document.body.classList.remove('\''is-menu-visible'\'');
                menu.style.right = "-100%";
                menu.style.display = "none";
                menu.classList.remove('\''visible'\'', '\''active'\'');
                
                // Remove any existing click handlers by cloning and replacing
                const newMenuToggle = menuToggle.cloneNode(true);
                menuToggle.parentNode.replaceChild(newMenuToggle, menuToggle);
                
                // Add our click handler with support for both CSS class and display property
                newMenuToggle.addEventListener('\''click'\'', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Menu toggle clicked");
                    
                    // Use both approaches: class toggle (for theme) and display property (for our custom code)
                    document.body.classList.add('\''is-menu-visible'\'');
                    menu.style.display = '\''block'\'';
                    menu.style.right = '\''0'\'';
                    menu.classList.add('\''visible'\'', '\''active'\'');
                    
                    // Force a repaint to ensure styles are applied
                    void menu.offsetWidth;
                });
                
                // Create close button handler (important for mobile)
                const closeButton = menu.querySelector('\''a.close'\'');
                if (closeButton) {
                    const newCloseButton = closeButton.cloneNode(true);
                    closeButton.parentNode.replaceChild(newCloseButton, closeButton);
                    
                    newCloseButton.addEventListener('\''click'\'', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("Close button clicked");
                        
                        // Hide menu using both approaches
                        document.body.classList.remove('\''is-menu-visible'\'');
                        menu.style.display = '\''none'\'';
                        menu.style.right = '\''-100%'\'';
                        menu.classList.remove('\''visible'\'', '\''active'\'');
                    });
                }
                
                // Handle clicks outside the menu (use capture phase to run before other handlers)
                const bodyClickHandler = function(e) {
                    // If clicking outside menu and not on menu toggle
                    if (!e.target.closest('\''#menu'\'') && !e.target.closest('\''a[href="#menu"]'\'')) {
                        console.log("Clicked outside menu");
                        
                        // Hide menu using both approaches
                        document.body.classList.remove('\''is-menu-visible'\'');
                        menu.style.display = '\''none'\'';
                        menu.style.right = '\''-100%'\'';
                        menu.classList.remove('\''visible'\'', '\''active'\'');
                    }
                };
                
                // Remove any existing body click handler and add our new one
                document.body.removeEventListener('\''click'\'', bodyClickHandler, true);
                document.body.addEventListener('\''click'\'', bodyClickHandler, true);
                
                // Handle escape key
                const keyHandler = function(e) {
                    if (e.key === '\''Escape'\'' || e.keyCode === 27) {
                        document.body.classList.remove('\''is-menu-visible'\'');
                        menu.style.display = '\''none'\'';
                        menu.style.right = '\''-100%'\'';
                        menu.classList.remove('\''visible'\'', '\''active'\'');
                    }
                };
                
                // Remove any existing key handler and add our new one
                document.removeEventListener('\''keydown'\'', keyHandler);
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

# Close button HTML
CLOSE_BUTTON='<a href="#menu" class="close" style="position: absolute; top: 20px; right: 20px; display: block; width: 40px; height: 40px; text-align: center; line-height: 40px; color: #777; border: 1px solid #ddd; border-radius: 50%;">✕</a>'

# List of HTML files to update (excluding calculator.html since it already has the fix)
HTML_FILES=(
    "public/index.html"
    "public/literature_review.html"
    "public/education.html"
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

# Process each HTML file
for file in "${HTML_FILES[@]}"; do
    echo "Processing $file..."
    
    # Skip if file doesn't exist
    if [ ! -f "$file" ]; then
        echo "  File not found, skipping."
        continue
    fi
    
    # Create a backup
    cp "$file" "${file}.bak"
    
    # 1. Add CSS styles to head section (before closing head tag)
    sed -i '' "s|</head>|$CSS_STYLES\n</head>|" "$file"
    
    # 2. Add close button to menu (before closing div tag in nav#menu)
    if ! grep -q "a.close" "$file"; then
        sed -i '' "s|</div>\s*</nav>|$CLOSE_BUTTON\n            </div>\n        </nav>|" "$file"
    fi
    
    # 3. Add JavaScript before closing body tag
    sed -i '' "s|</body>|$JS_CODE\n</body>|" "$file"
    
    echo "  Updated successfully."
done

echo "All files updated successfully!" 