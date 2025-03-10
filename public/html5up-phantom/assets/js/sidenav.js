document.addEventListener('DOMContentLoaded', function() {
    // Prevent multiple initialization
    if (window.sideNavInitialized) {
        console.log("Side navigation already initialized, skipping...");
        return;
    }
    
    // Mark as initialized
    window.sideNavInitialized = true;
    
    const sections = document.querySelectorAll('.acquisition-section');
    const navLinks = document.querySelectorAll('.side-nav-link');
    let isMobile = window.innerWidth <= 768;
    let isSmallScreen = window.innerWidth <= 480;
    
    // Toggle side navigation
    const sideNav = document.querySelector('.side-nav');
    const navToggle = document.getElementById('sideNavToggle');
    
    // If elements don't exist, exit early
    if (!sideNav || !navToggle) {
        console.error("Required navigation elements not found!");
        return;
    }
    
    const toggleIcon = navToggle.querySelector('i');
    
    // Add debugging to verify elements
    console.log("Side Navigation Elements:", {
        "sideNav": sideNav ? "Found" : "Not Found",
        "navToggle": navToggle ? "Found" : "Not Found",
        "toggleIcon": toggleIcon ? "Found" : "Not Found"
    });
    
    // Collect trigger links and their subnav dynamically
    const triggerElements = {};
    
    // Find all triggers with specific classes
    const ivcTrigger = document.querySelector('.ivc-trigger');
    const hepaticTrigger = document.querySelector('.hepatic-trigger');
    const portalTrigger = document.querySelector('.portal-trigger');
    const renalTrigger = document.querySelector('.renal-trigger');
    const tipsTrigger = document.querySelector('.tips-trigger');
    
    // Add any found triggers to our collection
    if (ivcTrigger) {
        triggerElements.ivc = {
            trigger: ivcTrigger,
            subNav: document.querySelector('.ivc-sub-nav')
        };
    }
    
    if (hepaticTrigger) {
        triggerElements.hepatic = {
            trigger: hepaticTrigger,
            subNav: document.querySelector('.hepatic-sub-nav')
        };
    }
    
    if (portalTrigger) {
        triggerElements.portal = {
            trigger: portalTrigger,
            subNav: document.querySelector('.portal-sub-nav')
        };
    }
    
    if (renalTrigger) {
        triggerElements.renal = {
            trigger: renalTrigger,
            subNav: document.querySelector('.renal-sub-nav')
        };
    }
    
    if (tipsTrigger) {
        triggerElements.tips = {
            trigger: tipsTrigger,
            subNav: document.querySelector('.tips-sub-nav')
        };
    }
    
    // Track current sub-nav open state
    let currentOpenSubNav = null;
    let isAnySubNavOpen = false;
    
    // Force navigation to always be visible on mobile - prevent any bottom positioning
    function ensureProperNavPosition() {
        console.log("Ensuring proper nav position, collapsed:", sideNav.classList.contains('collapsed'));
        
        if (isSmallScreen) {
            // Force the sidenav to be on the left side
            sideNav.style.top = '50%';
            sideNav.style.bottom = 'auto';
            sideNav.style.transform = 'translateY(-50%)';
            
            // Position sidenav to the right of toggle when open
            if (!sideNav.classList.contains('collapsed')) {
                sideNav.style.left = '36px'; // Match mobile toggle button width
            } else {
                sideNav.style.left = '-200px'; // Force complete hiding when collapsed
            }
            
            // Force the toggle button to be on the left side
            navToggle.style.top = '50%';
            navToggle.style.bottom = 'auto';
            navToggle.style.left = '0';
            navToggle.style.transform = 'translateY(-50%)';
        } else {
            // Desktop positioning
            if (!sideNav.classList.contains('collapsed')) {
                sideNav.style.left = '36px'; // Position to the right of toggle button
            } else {
                sideNav.style.left = '-200px'; // Force complete hiding when collapsed
            }
            
            // Ensure toggle button is always on the left edge
            navToggle.style.left = '0';
            navToggle.style.opacity = '1';
            navToggle.style.visibility = 'visible';
        }
        
        // Double-check collapsed class and positioning
        if (sideNav.classList.contains('collapsed')) {
            console.log("Sidenav is collapsed - ensuring it's hidden");
            sideNav.style.left = '-200px';
        }
    }
    
    // Always start with sidebar collapsed
    sideNav.classList.add('collapsed');
    // Set arrow to point right (outward) when collapsed
    if (toggleIcon) {
        toggleIcon.classList.remove('fa-chevron-left');
        toggleIcon.classList.add('fa-chevron-right');
    }
    
    // Apply initial positioning
    ensureProperNavPosition();
    
    // Remove any existing click listeners before adding new ones
    const newNavToggle = navToggle.cloneNode(true);
    navToggle.parentNode.replaceChild(newNavToggle, navToggle);
    
    // Get the new element reference
    const navToggleRefreshed = document.getElementById('sideNavToggle');
    const toggleIconRefreshed = navToggleRefreshed.querySelector('i');
    
    // Toggle navigation on button click with enhanced functionality and debugging
    navToggleRefreshed.addEventListener('click', function(e) {
        console.log("Toggle button clicked");
        e.stopPropagation();
        e.preventDefault(); // Prevent any default behavior
        
        const isCollapsing = !sideNav.classList.contains('collapsed');
        console.log("Is sidebar collapsing?", isCollapsing);
        
        // Clear any inline styles that might be interfering
        if (isCollapsing) {
            // Explicitly set left position when collapsing
            sideNav.style.left = '-200px'; // Force collapsed position
            console.log("Forcing sidebar to collapsed position");
        } else {
            // Explicitly set left position when expanding
            sideNav.style.left = '36px'; // Position to the right of toggle
            console.log("Forcing sidebar to expanded position");
        }
        
        // Toggle collapsed class
        sideNav.classList.toggle('collapsed');
        
        // Toggle arrow direction based on sidebar state
        if (isCollapsing) {
            // If now collapsing, point right
            console.log("Collapsing sidebar - arrow pointing right");
            toggleIconRefreshed.classList.remove('fa-chevron-left');
            toggleIconRefreshed.classList.add('fa-chevron-right');
            // Remove subnav-open class when collapsing
            navToggleRefreshed.classList.remove('subnav-open');
            // Close all subnavs when collapsing
            closeAllSubNavs();
        } else {
            // If now expanding, pointing left
            console.log("Expanding sidebar - arrow pointing left");
            toggleIconRefreshed.classList.remove('fa-chevron-right');
            toggleIconRefreshed.classList.add('fa-chevron-left');
            // Check if we need to update the toggle position
            updateSubNavState();
        }
        
        // Make sure toggle is properly positioned
        ensureProperNavPosition();
        
        // Force a repaint to ensure CSS transitions work properly
        void sideNav.offsetWidth;
    });
    
    // Add a class to make the toggle button more visible
    navToggleRefreshed.classList.add('visible');
    
    // Add ID attributes to sections if they don't have them
    sections.forEach((section, index) => {
        if (!section.id) {
            // Generate an ID if not present
            if (section.dataset.section) {
                section.id = section.dataset.section;
            } else {
                section.id = `section-${index + 1}`;
            }
        }
    });
    
    // Function to check if any subnav is open
    function updateSubNavState() {
        isAnySubNavOpen = false;
        
        // Check each subNav element
        Object.keys(triggerElements).forEach(key => {
            const item = triggerElements[key];
            if (item.subNav && item.subNav.classList.contains('active')) {
                isAnySubNavOpen = true;
            }
        });
        
        // Update toggle button position based on subnav state
        if (isAnySubNavOpen && !sideNav.classList.contains('collapsed')) {
            navToggleRefreshed.classList.add('subnav-open');
        } else {
            navToggleRefreshed.classList.remove('subnav-open');
        }
        
        // Ensure proper positioning
        ensureProperNavPosition();
    }
    
    // Function to close all sub-navs
    function closeAllSubNavs() {
        // Close each subNav element
        Object.keys(triggerElements).forEach(key => {
            const item = triggerElements[key];
            if (item.subNav) {
                item.subNav.classList.remove('active');
                // Also remove hover state from parent
                if (item.trigger && item.trigger.parentElement) {
                    item.trigger.parentElement.classList.remove('hover');
                }
            }
        });
        
        currentOpenSubNav = null;
        // Update subnav state after closing
        updateSubNavState();
    }
    
    // Function to position sub-nav properly
    function positionSubNav(subNav, trigger) {
        if (!subNav || !trigger) return;
        
        // Get the parent text in consistent format for comparison
        const parentText = trigger.querySelector('.long-text')?.textContent.trim().toUpperCase() || '';
        const parentMobileText = trigger.querySelector('.mobile-text')?.textContent.trim().toUpperCase() || '';
        
        console.log("Parent texts for comparison:", parentText, parentMobileText);
        
        // Process all sub-nav items to find and hide duplicates
        const subNavItems = subNav.querySelectorAll('.sub-nav-item');
        
        // Show all items by default
        subNavItems.forEach(item => {
            item.style.display = 'block';
            item.style.visibility = 'visible';
            item.style.opacity = '1';
            item.style.height = 'auto';
            item.style.overflow = 'visible';
        });
        
        // Get data-section attributes from the parent
        const parentSection = trigger.getAttribute('data-section') || '';
        
        // Define the typical sub-nav items we always want to keep visible
        const keepVisible = ['NORMAL', 'MILD', 'SEVERE', 'MODERATE'];
        
        // Then, hide any items that match the parent text or section
        subNavItems.forEach(item => {
            const link = item.querySelector('.sub-nav-link');
            if (!link) return;
            
            // Get link text and data-section for comparison
            const linkText = link.textContent.trim().toUpperCase();
            const linkSection = link.getAttribute('data-section') || '';
            
            console.log("Checking sub-nav link:", linkText, linkSection);
            
            // If this is one of our standard gradations (NORMAL, MILD, SEVERE), always keep it visible
            if (keepVisible.includes(linkText)) {
                console.log("Keeping standard item visible:", linkText);
                return;
            }
            
            // More precise duplicate detection
            let isDuplicate = false;
            
            // Check if the subNav item is an exact duplicate of the parent nav item
            if (linkText === parentText || linkText === parentMobileText) {
                isDuplicate = true;
            }
            
            // Check for partial matches with known problematic sections
            if (!isDuplicate) {
                // Special check for "HEPATIC VEIN" vs "HEPATIC"
                if (parentText.includes('HEPATIC') && linkText === 'HEPATIC') {
                    isDuplicate = true;
                }
                // Special check for "PORTAL VEIN" vs "PORTAL" 
                else if (parentText.includes('PORTAL') && linkText === 'PORTAL') {
                    isDuplicate = true;
                }
                // Special check for "RENAL VEIN" vs "RENAL"
                else if (parentText.includes('RENAL') && linkText === 'RENAL') {
                    isDuplicate = true;
                }
                // Special check for "IVC ASSESSMENT" vs "IVC"
                else if (parentText.includes('IVC') && linkText === 'IVC') {
                    isDuplicate = true;
                }
            }
            
            if (isDuplicate) {
                console.log("Hiding duplicate:", linkText);
                
                // Hide the matching item
                item.style.display = 'none';
                item.style.visibility = 'hidden';
                item.style.opacity = '0';
                item.style.height = '0';
                item.style.overflow = 'hidden';
            }
        });
        
        if (isSmallScreen) {
            // Position horizontally to the right of the side nav
            let triggerRect = trigger.getBoundingClientRect();
            subNav.style.top = triggerRect.top + 'px'; // Align with the trigger
            subNav.style.left = '80px'; // Position to the right of sidenav
            
            // Ensure the submenu doesn't go off screen at the bottom
            const subNavHeight = subNav.offsetHeight;
            const viewportHeight = window.innerHeight;
            
            if (triggerRect.top + subNavHeight > viewportHeight) {
                // Reposition to ensure it's visible
                const newTop = Math.max(10, viewportHeight - subNavHeight - 10);
                subNav.style.top = newTop + 'px';
            }
        } else {
            // Reset inline styles on desktop
            subNav.style.top = '';
            subNav.style.left = '';
        }
    }
    
    // Setup event listeners for each trigger element
    Object.keys(triggerElements).forEach(key => {
        const item = triggerElements[key];
        
        if (!item.trigger || !item.subNav) return;
        
        // Clean up existing event listeners by cloning
        const newTrigger = item.trigger.cloneNode(true);
        item.trigger.parentNode.replaceChild(newTrigger, item.trigger);
        item.trigger = newTrigger;
        
        // Get subNav links
        item.links = item.subNav.querySelectorAll('.sub-nav-link');
        
        // Desktop hover behavior
        if (!isMobile) {
            // Mouse enter - show submenu
            item.trigger.parentElement.addEventListener('mouseenter', function() {
                if (!sideNav.classList.contains('collapsed')) {
                    // First close any open submenus
                    closeAllSubNavs();
                    
                    // Open this submenu
                    item.subNav.classList.add('active');
                    this.classList.add('hover');
                    
                    // Set as current open
                    currentOpenSubNav = item.subNav;
                    
                    // Position and clean up submenu
                    positionSubNav(item.subNav, item.trigger);
                    
                    // Update state
                    updateSubNavState();
                }
            });
            
            // Mouse leave - hide submenu
            item.trigger.parentElement.addEventListener('mouseleave', function() {
                // Close this submenu
                item.subNav.classList.remove('active');
                this.classList.remove('hover');
                
                // Clear current open
                if (currentOpenSubNav === item.subNav) {
                    currentOpenSubNav = null;
                }
                
                // Update state
                updateSubNavState();
            });
        }
        
        // Click behavior for both mobile and desktop
        item.trigger.addEventListener('click', function(e) {
            // Prevent default link behavior
            e.preventDefault();
            e.stopPropagation();
            
            // First, navigate to the main section
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            
            if (targetSection) {
                // Calculate scroll position with offset for header
                const headerOffset = 70;
                const targetPosition = targetSection.offsetTop - headerOffset;
                
                // Scroll to the section
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // Update active state for navigation
                navLinks.forEach(link => link.classList.remove('active'));
                this.classList.add('active');
                
                // For mobile - improved submenu toggle behavior
                if (isMobile) {
                    // If the sidebar is collapsed, skip submenu toggling
                    if (sideNav.classList.contains('collapsed')) {
                        return;
                    }
                    
                    // Toggle current submenu
                    const isOpening = !item.subNav.classList.contains('active');
                    
                    if (isOpening) {
                        // Close any open submenus first
                        closeAllSubNavs();
                        
                        // Then open this one
                        item.subNav.classList.add('active');
                        currentOpenSubNav = item.subNav;
                        positionSubNav(item.subNav, this);
                    } else {
                        // Close this submenu
                        item.subNav.classList.remove('active');
                        currentOpenSubNav = null;
                    }
                    
                    // Update subnav state
                    updateSubNavState();
                    
                    // Handle outside clicks to close submenu
                    if (isOpening) {
                        setTimeout(() => {
                            const handleOutsideClick = function(event) {
                                // Check if click was outside submenu and trigger
                                if (!item.subNav.contains(event.target) && 
                                    !item.trigger.contains(event.target)) {
                                    item.subNav.classList.remove('active');
                                    currentOpenSubNav = null;
                                    updateSubNavState();
                                    document.removeEventListener('click', handleOutsideClick);
                                }
                            };
                            
                            // Remove any existing handlers first
                            document.removeEventListener('click', handleOutsideClick);
                            
                            // Add new handler
                            document.addEventListener('click', handleOutsideClick);
                        }, 10);
                    }
                }
            }
        });
        
        // Add click handlers for sub-navigation links
        if (item.links && item.links.length > 0) {
            item.links.forEach(link => {
                // Clean up existing event listeners
                const newLink = link.cloneNode(true);
                link.parentNode.replaceChild(newLink, link);
                
                newLink.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation(); // Prevent bubbling
                    
                    // Get the target section ID
                    const targetId = this.getAttribute('href').substring(1);
                    const targetSection = document.getElementById(targetId);
                    
                    if (targetSection) {
                        // Calculate scroll position with offset for header
                        const headerOffset = 70;
                        const targetPosition = targetSection.offsetTop - headerOffset;
                        
                        // Scroll to the section
                        window.scrollTo({
                            top: targetPosition,
                            behavior: 'smooth'
                        });
                        
                        // Update active states
                        item.links.forEach(l => l.classList.remove('active'));
                        this.classList.add('active');
                        
                        // Close the sub-navigation after a delay (slightly longer on mobile)
                        if (isMobile) {
                            setTimeout(() => {
                                item.subNav.classList.remove('active');
                                currentOpenSubNav = null;
                                // Update subnav state
                                updateSubNavState();
                            }, 800); // Longer delay for better UX
                        }
                    }
                });
            });
        }
    });
    
    // Function to update active nav item based on scroll position
    function updateActiveNavItem() {
        // Get current scroll position
        const scrollPosition = window.scrollY + 100; // Add offset to improve detection
        
        // Find the section that is currently in view
        let currentSection = null;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            
            // Check if the current scroll position is within this section
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                currentSection = section;
            }
        });
        
        // If we're at the bottom of the page, highlight the last section
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
            currentSection = sections[sections.length - 1];
        }
        
        // Remove active class from all links
        navLinks.forEach(link => {
            link.classList.remove('active');
            
            // If we found a current section, activate the corresponding link
            if (currentSection && link.getAttribute('href').substring(1) === currentSection.id) {
                link.classList.add('active');
            }
        });
    }
    
    // Throttle scroll event for better performance
    let isScrolling = false;
    window.addEventListener('scroll', function() {
        if (!isScrolling) {
            isScrolling = true;
            setTimeout(function() {
                updateActiveNavItem();
                isScrolling = false;
            }, 50); // Reduced from typical 100ms for more responsive feel
        }
    });
    
    // Update mobile detection on window resize
    window.addEventListener('resize', function() {
        isMobile = window.innerWidth <= 768;
        isSmallScreen = window.innerWidth <= 480;
        
        // If screen size changes, close all subnavs
        closeAllSubNavs();
        
        // Ensure proper positioning after resize
        ensureProperNavPosition();
    });
    
    // Add touch event listeners for better mobile support
    if ('ontouchstart' in window) {
        // Close any open submenu when touching elsewhere on the page
        document.addEventListener('touchstart', function(e) {
            if (currentOpenSubNav) {
                // Find the associated trigger
                let shouldClose = true;
                
                // Check if touch was on a trigger or its submenu
                Object.values(triggerElements).forEach(item => {
                    if (item.subNav === currentOpenSubNav) {
                        if (item.trigger.contains(e.target) || item.subNav.contains(e.target)) {
                            shouldClose = false;
                        }
                    }
                });
                
                if (shouldClose) {
                    currentOpenSubNav.classList.remove('active');
                    currentOpenSubNav = null;
                    updateSubNavState();
                }
            }
        });
    }
    
    // Initialize active state
    updateActiveNavItem();
}); 