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
            console.log('TPA link already exists');
            return;
        }
        
        // Create the divider list item
        const dividerLi = document.createElement('li');
        dividerLi.className = 'external-divider';
        dividerLi.style.position = 'relative';
        dividerLi.style.marginTop = '35px';  // Increased margin for more space
        
        // Add the label
        const label = document.createElement('div');
        label.textContent = 'THE POCUS ATLAS';
        label.style.position = 'absolute';
        label.style.top = '-10px';
        label.style.left = '0';
        label.style.right = '0';
        label.style.margin = '0 auto';
        label.style.width = 'fit-content';
        label.style.textAlign = 'center';
        label.style.background = '#f8f9fa';  // Match the gray theme
        label.style.padding = '0 10px';
        label.style.fontSize = '0.8em';
        label.style.color = '#999';
        label.style.textTransform = 'uppercase';
        label.style.letterSpacing = '1px';
        label.style.fontWeight = '600';
        
        // Create the link to The POCUS Atlas
        const tpaLink = document.createElement('a');
        tpaLink.href = 'https://www.thepocusatlas.com/?srsltid=AfmBOoq7pcv82sgRNATxd7g1veRr7E_X-TyeqMIrEae4L5l9Hs_3Lg8N';
        tpaLink.target = '_blank';
        tpaLink.rel = 'noopener';
        tpaLink.className = 'external-link';
        tpaLink.setAttribute('aria-label', 'Go to The POCUS Atlas Website');
        
        // Create flex container for the link content
        const linkContainer = document.createElement('div');
        linkContainer.style.display = 'flex';
        linkContainer.style.alignItems = 'center';
        linkContainer.style.gap = '12px';
        linkContainer.style.paddingTop = '16px';  // Increased padding
        linkContainer.style.paddingBottom = '16px';  // Increased padding
        
        // Try multiple paths for the TPA logo
        const tpaLogoImg = document.createElement('img');
        const possibleTPAPaths = [
            '/images/vexus-ai-logo.png',
            './images/vexus-ai-logo.png',
            '../images/vexus-ai-logo.png',
            '../../images/vexus-ai-logo.png',
            '../../../images/vexus-ai-logo.png'
        ];
        
        // Set initial path for TPA logo
        tpaLogoImg.src = possibleTPAPaths[0];
        tpaLogoImg.alt = 'The POCUS Atlas Logo';
        tpaLogoImg.style.width = '32px';
        tpaLogoImg.style.height = '32px';
        tpaLogoImg.style.borderRadius = '50%';
        
        // Handle TPA logo load error - try alternative paths
        let tpaPathIndex = 0;
        tpaLogoImg.onerror = function() {
            tpaPathIndex++;
            if (tpaPathIndex < possibleTPAPaths.length) {
                console.log('Trying alternative TPA logo path:', possibleTPAPaths[tpaPathIndex]);
                this.src = possibleTPAPaths[tpaPathIndex];
            } else {
                // If all paths fail, hide the image
                console.error('Failed to load TPA logo image after trying all paths');
                this.style.display = 'none';
            }
        };
        
        // Create text span
        const tpaTextSpan = document.createElement('span');
        tpaTextSpan.textContent = 'TPA Home';
        tpaTextSpan.style.fontWeight = '500';
        tpaTextSpan.style.fontSize = '1.1em';
        
        // Assemble the components
        linkContainer.appendChild(tpaLogoImg);
        linkContainer.appendChild(tpaTextSpan);
        
        tpaLink.appendChild(linkContainer);
        dividerLi.appendChild(label);  // Add the label first
        dividerLi.appendChild(tpaLink);
        
        // Append to the end of the menu
        menuList.appendChild(dividerLi);
        
        console.log('TPA link with logo added to menu');
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