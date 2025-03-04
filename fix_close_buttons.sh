#!/bin/bash

# This script specifically adds close buttons to all HTML files

echo "Adding close buttons to all HTML files..."

for file in public/*.html; do
    echo "Processing $file..."
    
    # Skip if the file already has a close button
    if grep -q "a href=\"#menu\" class=\"close\"" "$file"; then
        echo "  Close button already exists, skipping."
        continue
    fi
    
    # Create a backup
    cp "$file" "${file}.bak2"
    
    # Look for the menu end pattern and add the close button
    # This uses awk for better pattern matching across multiple lines
    awk '
    {
        if (match($0, /<\/ul>\s*<\/div>\s*<\/nav>/)) {
            print "                </ul>";
            print "                <a href=\"#menu\" class=\"close\" style=\"position: absolute; top: 20px; right: 20px; display: block; width: 40px; height: 40px; text-align: center; line-height: 40px; color: #777; border: 1px solid #ddd; border-radius: 50%;\">✕</a>";
            print "            </div>";
            print "        </nav>";
        } 
        else if (match($0, /<\/ul>/) && getline && match($0, /<\/div>/) && getline && match($0, /<\/nav>/)) {
            # Go back 2 lines
            print "                </ul>";
            print "                <a href=\"#menu\" class=\"close\" style=\"position: absolute; top: 20px; right: 20px; display: block; width: 40px; height: 40px; text-align: center; line-height: 40px; color: #777; border: 1px solid #ddd; border-radius: 50%;\">✕</a>";
            print "            </div>";
            print "        </nav>";
        }
        else {
            print $0;
        }
    }
    ' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
    
    # In case the above pattern didn't match, try a simpler approach
    if ! grep -q "a href=\"#menu\" class=\"close\"" "$file"; then
        awk '
        {
            if (match($0, /<\/ul>/)) {
                print $0;
                print "                <a href=\"#menu\" class=\"close\" style=\"position: absolute; top: 20px; right: 20px; display: block; width: 40px; height: 40px; text-align: center; line-height: 40px; color: #777; border: 1px solid #ddd; border-radius: 50%;\">✕</a>";
            } else {
                print $0;
            }
        }
        ' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
    fi
    
    echo "  Updated successfully."
done

echo "All close buttons added!" 