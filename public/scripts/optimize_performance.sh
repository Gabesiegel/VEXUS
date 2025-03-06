#!/bin/bash

# Master script to optimize website performance
# This script runs all performance optimization scripts in sequence

echo "Starting complete performance optimization process..."

# Standardize viewport settings
echo "Step 1: Standardizing viewport settings..."
./standardize_viewport.sh

# Add lazy loading to images
echo "Step 2: Adding lazy loading to images..."
./add_lazy_loading.sh

# Add performance utilities and defer scripts
echo "Step 3: Adding performance utilities and deferring scripts..."
./add_performance_utils.sh

# Standardize menu implementation (already done previously)
echo "Step 4: Standardizing menu implementation..."
./standardize_all.sh

echo "Performance optimization process complete!"
echo "These changes should significantly improve website performance and reduce freezing issues."
echo "Additional optimizations may still be needed for specific pages or complex interactions." 