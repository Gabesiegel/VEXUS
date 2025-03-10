document.addEventListener('DOMContentLoaded', function() {
    const sections = document.querySelectorAll('.acquisition-section');
    const navLinks = document.querySelectorAll('.side-nav-link');
    let isMobile = window.innerWidth <= 768;
    let isSmallScreen = window.innerWidth <= 480;
    
    // Toggle side navigation
    const sideNav = document.querySelector('.side-nav');
    const navToggle = document.getElementById('sideNavToggle');
    const toggleIcon = navToggle.querySelector('i');
    
    // Add debugging to verify elements
    console.log("Side Navigation Elements:", {
        "sideNav": sideNav ? "Found" : "Not Found",
        "navToggle": navToggle ? "Found" : "Not Found",
        "toggleIcon": toggleIcon ? "Found" : "Not Found"
    });
    
    // Track subnav state
    let isAnySubNavOpen = false;
    let currentOpenSubNav = null;
    
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
                sideNav.style.left = '40px'; // Position to the right of toggle button
            } else {
                sideNav.style.left = '-200px'; // Force complete hiding when collapsed
            }
            
            // Ensure toggle button is visible
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
    toggleIcon.classList.remove('fa-chevron-left');
    toggleIcon.classList.add('fa-chevron-right');
    
    // Apply initial positioning
    ensureProperNavPosition();
    
    // Toggle navigation on button click with enhanced functionality and debugging
    navToggle.addEventListener('click', function(e) {
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
            if (isSmallScreen) {
                sideNav.style.left = '36px'; // Mobile position
            } else {
                sideNav.style.left = '40px'; // Desktop position
            }
            console.log("Forcing sidebar to expanded position");
        }
        
        // Toggle collapsed class
        sideNav.classList.toggle('collapsed');
        
        // Toggle arrow direction based on sidebar state
        if (isCollapsing) {
            // If now collapsing, point right
            console.log("Collapsing sidebar - arrow pointing right");
            toggleIcon.classList.remove('fa-chevron-left');
            toggleIcon.classList.add('fa-chevron-right');
            // Remove subnav-open class when collapsing
            navToggle.classList.remove('subnav-open');
            // Close all subnavs when collapsing
            closeAllSubNavs();
        } else {
            // If now expanding, pointing left
            console.log("Expanding sidebar - arrow pointing left");
            toggleIcon.classList.remove('fa-chevron-right');
            toggleIcon.classList.add('fa-chevron-left');
            // Check if we need to update the toggle position
            updateSubNavState();
        }
        
        // Make sure toggle is properly positioned
        ensureProperNavPosition();
        
        // Force a repaint to ensure CSS transitions work properly
        void sideNav.offsetWidth;
    });
    
    // Add a class to make the toggle button more visible
    navToggle.classList.add('visible');
    
    // Collect all trigger links and their corresponding sub-navs
    const triggerElements = {
        ivc: {
            trigger: document.querySelector('.ivc-trigger'),
            subNav: document.querySelector('.ivc-sub-nav'),
            links: document.querySelectorAll('.ivc-sub-nav .sub-nav-link')
        },
        hepatic: {
            trigger: document.querySelector('.hepatic-trigger'),
            subNav: document.querySelector('.hepatic-sub-nav'),
            links: document.querySelectorAll('.hepatic-sub-nav .sub-nav-link')
        },
        portal: {
            trigger: document.querySelector('.portal-trigger'),
            subNav: document.querySelector('.portal-sub-nav'),
            links: document.querySelectorAll('.portal-sub-nav .sub-nav-link')
        },
        renal: {
            trigger: document.querySelector('.renal-trigger'),
            subNav: document.querySelector('.renal-sub-nav'),
            links: document.querySelectorAll('.renal-sub-nav .sub-nav-link')
        },
        tips: {
            trigger: document.querySelector('.tips-trigger'),
            subNav: document.querySelector('.tips-sub-nav'),
            links: document.querySelectorAll('.tips-sub-nav .sub-nav-link')
        }
    };
    
    // Add ID attributes to sections if they don't have them
    sections.forEach((section, index) => {
        if (!section.id) {
            // Extract section name from the h2 within this section
            const heading = section.querySelector('h2');
            if (heading) {
                const idText = heading.textContent.trim().toLowerCase().replace(/\s+/g, '-');
                section.id = idText;
            } else {
                section.id = `section-${index + 1}`;
            }
        }
    });
    
    // Function to check if any subnav is open
    function updateSubNavState() {
        isAnySubNavOpen = false;
        Object.values(triggerElements).forEach(item => {
            if (item.subNav && item.subNav.classList.contains('active')) {
                isAnySubNavOpen = true;
            }
        });
        
        // Update toggle button position based on subnav state
        if (isAnySubNavOpen && !sideNav.classList.contains('collapsed')) {
            navToggle.classList.add('subnav-open');
        } else {
            navToggle.classList.remove('subnav-open');
        }
        
        // Ensure proper positioning
        ensureProperNavPosition();
    }
    
    // Function to close all sub-navs
    function closeAllSubNavs() {
        Object.values(triggerElements).forEach(item => {
            if (item.subNav) item.subNav.classList.remove('active');
        });
        currentOpenSubNav = null;
        // Update subnav state after closing
        updateSubNavState();
    }
    
    // Enhanced positioning for subnavs on small screens
    function positionSubNav(subNav, trigger) {
        if (isSmallScreen) {
            // Position horizontally to the right of the side nav
            let triggerRect = trigger.getBoundingClientRect();
            subNav.style.top = (triggerRect.top - 5) + 'px'; // Align with the trigger
            subNav.style.left = '85px'; // Position to the right of sidenav (increased from 75px)
            
            // Ensure the submenu doesn't go off screen at the bottom
            const subNavHeight = subNav.offsetHeight;
            const viewportHeight = window.innerHeight;
            const triggerBottom = triggerRect.bottom;
            
            if (triggerBottom + subNavHeight > viewportHeight) {
                // Position above if it would go off screen below
                subNav.style.top = (triggerRect.top - subNavHeight + triggerRect.height) + 'px';
            }
        }
    }
    
    // Add click handlers for all trigger elements
    Object.values(triggerElements).forEach(item => {
        if (item.trigger && item.subNav) {
            // Desktop hover behavior for showing subnavs
            if (!isMobile) {
                // Mouse enter - show submenu
                item.trigger.parentElement.addEventListener('mouseenter', function() {
                    if (!sideNav.classList.contains('collapsed')) {
                        // Show this submenu
                        item.subNav.classList.add('active');
                        // Update toggle position
                        updateSubNavState();
                    }
                });
                
                // Mouse leave - hide submenu
                item.trigger.parentElement.addEventListener('mouseleave', function() {
                    // Hide this submenu
                    item.subNav.classList.remove('active');
                    // Update toggle position
                    updateSubNavState();
                });
            }
            
            // Add trigger click handler with improved mobile support
            item.trigger.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation(); // Prevent bubbling
                
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
                    
                    // For mobile - improve submenu toggle behavior
                    if (isMobile) {
                        // If a different submenu is open, close it first
                        if (currentOpenSubNav && currentOpenSubNav !== item.subNav) {
                            currentOpenSubNav.classList.remove('active');
                        }
                        
                        // Toggle current submenu
                        const isOpening = !item.subNav.classList.contains('active');
                        
                        // Toggle this submenu
                        item.subNav.classList.toggle('active');
                        
                        // Position the submenu correctly when opening
                        if (isOpening) {
                            currentOpenSubNav = item.subNav;
                            positionSubNav(item.subNav, this);
                        } else {
                            currentOpenSubNav = null;
                        }
                        
                        // Update subnav state
                        updateSubNavState();
                        
                        // Add click handler for outside clicks
                        setTimeout(() => {
                            if (item.subNav.classList.contains('active')) {
                                // Create a one-time document click handler
                                const handleOutsideClick = function(event) {
                                    // Check if click was outside submenu and trigger
                                    if (!item.subNav.contains(event.target) && !item.trigger.contains(event.target)) {
                                        item.subNav.classList.remove('active');
                                        currentOpenSubNav = null;
                                        updateSubNavState();
                                        document.removeEventListener('click', handleOutsideClick);
                                    }
                                };
                                
                                // Add the handler with a small delay
                                setTimeout(() => {
                                    document.addEventListener('click', handleOutsideClick);
                                }, 10);
                            }
                        }, 50);
                    }
                }
            });
            
            // Add sub-link click handlers with improved mobile support
            if (item.links) {
                item.links.forEach(link => {
                    link.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation(); // Prevent bubbling
                        
                        // Get the target view section ID
                        const targetId = this.getAttribute('href').substring(1);
                        const targetSection = document.getElementById(targetId);
                        
                        if (targetSection) {
                            // Calculate scroll position with offset for header
                            const headerOffset = 70;
                            const targetPosition = targetSection.offsetTop - headerOffset;
                            
                            // Scroll to the view section
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
                                }, 800); // Increased from 500ms for better UX
                            }
                        }
                    });
                });
            }
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