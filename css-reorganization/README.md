# CSS Reorganization

This directory contains a reorganized version of the project's CSS files, split into logical modules to improve maintainability and reduce conflicts.

## Folder Structure

```
css-reorganization/
├── base/
│   ├── reset.css          # CSS reset and base styles
│   └── typography.css     # Text styling and fonts
├── components/
│   ├── fancybox.css       # Fancybox lightbox improvements
│   ├── form.css           # Form elements and controls
│   ├── header.css         # Site header styling
│   ├── logo.css           # Logo components
│   └── sidebar.css        # Sidebar menu
├── layout/
│   └── grid.css           # Layout grid system
├── responsive/
│   └── responsive.css     # Mobile-first responsive utilities
├── main.css               # Main stylesheet that imports all modules
└── README.md              # This documentation file
```

## Usage

To use this reorganized CSS structure:

1. Replace your current CSS files with this modular approach
2. Link only the `main.css` file in your HTML
3. The main.css file will import all the necessary component CSS files

## Benefits

- **Separation of Concerns**: Each file focuses on a specific component or functionality
- **Easier Maintenance**: Smaller files are easier to edit and debug
- **Reduced Conflicts**: By organizing styles into logical buckets, we reduce the chance of conflicts
- **Better Performance**: Only necessary styles are loaded
- **Improved Collaboration**: Different team members can work on different components

## Import Order

The import order in `main.css` is important to maintain the cascade and inheritance properly:

1. External imports (FontAwesome, Google Fonts)
2. Base styles (reset, typography)
3. Layout components (grid)
4. Specific UI components (header, sidebar, etc.)
5. Responsive utilities
6. Site-specific overrides

## Migration Notes

This reorganization maintains all existing functionality while:

- Eliminating duplicate CSS rules
- Consolidating related styles
- Standardizing responsive breakpoints
- Improving naming consistency
- Reducing CSS specificity conflicts
- Implementing a more maintainable structure

## Responsive Breakpoints

Consistent breakpoints are used across all files:

- **Large screens**: 1680px
- **Medium large**: 1280px
- **Medium**: 980px
- **Small**: 736px
- **Extra small**: 480px 