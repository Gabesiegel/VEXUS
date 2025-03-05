// Add TPA HOME link to the sidebar menu
document.addEventListener('DOMContentLoaded', function() {
    // Function to add the TPA HOME link
    function addTPAHomeLink() {
        // Get the menu list
        const menuList = document.querySelector('nav#menu ul');
        const closeButton = document.querySelector('nav#menu a.close');
        
        if (!menuList) {
            console.error('Menu list not found');
            return;
        }
        
        // Remove inline styles from close button if it exists
        if (closeButton) {
            closeButton.removeAttribute('style');
        }
        
        // Check if the link already exists to avoid duplication
        if (document.querySelector('nav#menu ul li a.external-link')) {
            console.log('TPA HOME link already exists');
            return;
        }
        
        // Create the divider list item
        const dividerLi = document.createElement('li');
        dividerLi.className = 'external-divider';
        
        // Create the link
        const tpaLink = document.createElement('a');
        tpaLink.href = 'https://www.thepocusatlas.com/?srsltid=AfmBOoq7pcv82sgRNATxd7g1veRr7E_X-TyeqMIrEae4L5l9Hs_3Lg8N';
        tpaLink.target = '_blank';
        tpaLink.rel = 'noopener';
        tpaLink.className = 'external-link';
        tpaLink.textContent = 'TPA Home';
        
        // Append the link to the list item
        dividerLi.appendChild(tpaLink);
        
        // Append the list item to the menu
        menuList.appendChild(dividerLi);
        
        console.log('TPA HOME link added to menu');
    }
    
    // Initial attempt to add the link
    addTPAHomeLink();
    
    // If the menu is loaded later or dynamically, try again when the DOM changes
    // Create a mutation observer to watch for changes in the DOM
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                // If nav#menu was added, add our link
                if (!document.querySelector('nav#menu ul li a.external-link')) {
                    addTPAHomeLink();
                }
            }
        });
    });
    
    // Start observing the document body for changes
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Fallback: Try again after a delay in case DOMContentLoaded fired before scripts executed
    setTimeout(addTPAHomeLink, 1000);
}); 