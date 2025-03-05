#!/bin/bash

# This script ensures that the TPA link styling is consistent across all HTML files
# by updating the sidebar.css file and making sure all HTML files include it.

# Path to the sidebar.css file
SIDEBAR_CSS="public/html5up-phantom/assets/css/sidebar.css"

# Check if sidebar.css exists
if [ ! -f "$SIDEBAR_CSS" ]; then
    echo "Error: $SIDEBAR_CSS not found!"
    exit 1
fi

# First, ensure the TPA link styling is present in sidebar.css
# Check if the external-link styles already exist
if grep -q "a.external-link" "$SIDEBAR_CSS"; then
    echo "TPA link styles already exist in $SIDEBAR_CSS"
else
    # Add the TPA link styles to sidebar.css
    cat << 'EOF' >> "$SIDEBAR_CSS"

/* External Link Styles for TPA Link */
nav#menu ul li a.external-link {
    position: relative;
    padding-right: 2.2em;
    display: flex;
    align-items: center;
    font-weight: 500;
    color: #5b94c5 !important;
}

nav#menu ul li a.external-link:before {
    background: #5b94c5;
}

nav#menu ul li a.external-link:after {
    content: '\f35d';
    font-family: 'Font Awesome 5 Free';
    font-weight: 900;
    width: auto;
    height: auto;
    position: absolute;
    right: 1.2em;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.85em;
    opacity: 0.85;
    transition: all 0.2s ease;
}

nav#menu ul li a.external-link:hover:after {
    opacity: 1;
    transform: translateY(-50%) translateX(2px);
}

/* Divider for external links section */
nav#menu ul li.external-divider {
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    position: relative;
}

nav#menu ul li.external-divider:before {
    content: 'The POCUS Atlas';
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    background: #fff;
    padding: 0 10px;
    font-size: 0.7em;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 1px;
}
EOF
    echo "Added TPA link styles to $SIDEBAR_CSS"
fi

# Make sure all HTML files include the sidebar.css file
HTML_FILES=$(find public -name "*.html")

for file in $HTML_FILES; do
    # Check if the file includes sidebar.css
    if grep -q "sidebar.css" "$file"; then
        echo "$file already includes sidebar.css"
    else
        # Add sidebar.css link before the closing head tag
        sed -i '' 's|</head>|<link rel="stylesheet" href="html5up-phantom/assets/css/sidebar.css" />\n</head>|' "$file"
        echo "Added sidebar.css to $file"
    fi
    
    # Check if the file includes the add-tpa-link.js script
    if grep -q "add-tpa-link.js" "$file"; then
        echo "$file already includes add-tpa-link.js"
    else
        # Add add-tpa-link.js script before the closing body tag
        sed -i '' 's|</body>|<script src="html5up-phantom/assets/js/add-tpa-link.js"></script>\n</body>|' "$file"
        echo "Added add-tpa-link.js to $file"
    fi
done

echo "All files have been updated with consistent TPA link styling!" 