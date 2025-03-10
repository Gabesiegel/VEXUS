document.addEventListener('DOMContentLoaded', function() {
    const sections = document.querySelectorAll('.acquisition-section');
    const navLinks = document.querySelectorAll('.side-nav-link');
    let isMobile = window.innerWidth <= 768;
    let isSmallScreen = window.innerWidth <= 480;
    
    // Toggle side navigation
    const sideNav = document.querySelector('.side-nav');
    const navToggle = document.getElementById('sideNavToggle');
    const toggleIcon = navToggle.querySelector('i');
    
    // Track subnav state
    let isAnySubNavOpen = false;
    
    // Always start with sidebar collapsed
    sideNav.classList.add('collapsed');
    // Set arrow to point right (outward) when collapsed
    toggleIcon.classList.remove('fa-chevron-left');
    toggleIcon.classList.add('fa-chevron-right');
    
    // Toggle navigation on button click
    navToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        const isCollapsing = !sideNav.classList.contains('collapsed');
        sideNav.classList.toggle('collapsed');
        
        // Toggle arrow direction based on sidebar state
        if (isCollapsing) {
            // If now collapsing, point right
            toggleIcon.classList.remove('fa-chevron-left');
            toggleIcon.classList.add('fa-chevron-right');
            // Remove subnav-open class when collapsing
            navToggle.classList.remove('subnav-open');
            // Close all subnavs when collapsing
            closeAllSubNavs();
        } else {
            // If now expanding, still point right but from the other side
            toggleIcon.classList.remove('fa-chevron-right');
            toggleIcon.classList.add('fa-chevron-left');
            // Check if we need to update the toggle position
            updateSubNavState();
        }
    });
    
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
    }
    
    // Function to close all sub-navs
    function closeAllSubNavs() {
        Object.values(triggerElements).forEach(item => {
            if (item.subNav) item.subNav.classList.remove('active');
        });
        // Update subnav state after closing
        updateSubNavState();
    }
    
    // Enhanced positioning for subnavs on small screens
    function positionSubNav(subNav, trigger) {
        if (isSmallScreen) {
            // Position horizontally to the right of the side nav
            let triggerRect = trigger.getBoundingClientRect();
            subNav.style.top = (triggerRect.top - 5) + 'px'; // Align with the trigger
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
            
            // Add trigger click handler
            item.trigger.addEventListener('click', function(e) {
                e.preventDefault();
                
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
                    
                    // For mobile or touch devices, toggle the sub-nav menu
                    if (isMobile) {
                        // Close any open sub-navs first
                        closeAllSubNavs();
                        
                        // Then toggle this sub-nav with slight delay
                        setTimeout(() => {
                            item.subNav.classList.toggle('active');
                            // Position the subnav correctly on small screens
                            if (isSmallScreen) {
                                positionSubNav(item.subNav, this);
                            }
                            // Update subnav state
                            updateSubNavState();
                        }, 300);
                        
                        // Handle clicks outside to close sub-nav
                        function handleOutsideClick(event) {
                            if (!item.subNav.contains(event.target) && !item.trigger.contains(event.target)) {
                                item.subNav.classList.remove('active');
                                // Update subnav state
                                updateSubNavState();
                                document.removeEventListener('click', handleOutsideClick);
                            }
                        }
                        
                        // Add click listener if sub-nav is open
                        setTimeout(() => {
                            if (item.subNav.classList.contains('active')) {
                                document.addEventListener('click', handleOutsideClick);
                            } else {
                                document.removeEventListener('click', handleOutsideClick);
                            }
                        }, 350);
                    }
                }
            });
            
            // Add sub-link click handlers
            if (item.links) {
                item.links.forEach(link => {
                    link.addEventListener('click', function(e) {
                        e.preventDefault();
                        
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
                            
                            // Close the sub-navigation after a short delay (for mobile)
                            if (isMobile) {
                                setTimeout(() => {
                                    item.subNav.classList.remove('active');
                                    // Update subnav state
                                    updateSubNavState();
                                }, 500);
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
    });
    
    // Initialize active state
    updateActiveNavItem();
}); 