/**
 * Performance utilities for better handling of frequently-firing events
 */

/**
 * Debounce function for improved event handling
 * Only triggers the function after the specified delay has passed
 * @param {Function} func - The function to debounce
 * @param {number} wait - Delay in milliseconds
 * @param {boolean} immediate - Whether to trigger on the leading edge instead of trailing
 * @returns {Function} - Debounced function
 */
function debounce(func, wait, immediate) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        
        if (callNow) func.apply(context, args);
    };
}

/**
 * Throttle function for improved event handling
 * Limits the rate at which a function can fire
 * @param {Function} func - The function to throttle
 * @param {number} limit - Minimum time between executions in milliseconds
 * @returns {Function} - Throttled function
 */
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const context = this;
        const args = arguments;
        
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Request animation frame throttle for smooth visual updates
 * Ideal for scroll or resize events that trigger visual changes
 * @param {Function} func - The function to throttle with requestAnimationFrame
 * @returns {Function} - RAF throttled function
 */
function rafThrottle(func) {
    let ticking = false;
    return function() {
        const context = this;
        const args = arguments;
        
        if (!ticking) {
            requestAnimationFrame(() => {
                func.apply(context, args);
                ticking = false;
            });
            ticking = true;
        }
    };
}

// Export the utilities if in a module environment
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = {
        debounce,
        throttle,
        rafThrottle
    };
} 