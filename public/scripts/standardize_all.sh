#!/bin/bash

# Master script to standardize all aspects of the menu/sidebar across all HTML files
# This script runs both the menu structure standardization and JavaScript standardization

echo "Starting complete menu standardization process..."

# Run the menu structure standardization script
echo "Step 1: Standardizing menu structure (close button and menu items)..."
./standardize_menus.sh

# Run the JavaScript standardization script
echo "Step 2: Standardizing JavaScript implementation..."
./standardize_menu_javascript.sh

echo "Complete menu standardization process finished!"
echo "All pages now have consistent menu structure, styling, and functionality." 