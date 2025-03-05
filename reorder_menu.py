#!/usr/bin/env python3

import re

# Read the file
with open('public/index.html', 'r') as file:
    content = file.read()

# Find the menu section
menu_pattern = r'(<h2>Menu</h2>\s*<ul>)(.*?)(<\/ul>)'
menu_match = re.search(menu_pattern, content, re.DOTALL)

if menu_match:
    menu_start = menu_match.group(1)
    menu_items = menu_match.group(2)
    menu_end = menu_match.group(3)
    
    # Extract all menu items
    item_pattern = r'<li><a href="([^"]+)">(.*?)<\/a><\/li>'
    items = re.findall(item_pattern, menu_items)
    
    # Reorder items (move About and Our Team to the end before Contact)
    ordered_items = []
    about_item = None
    team_item = None
    contact_item = None
    
    for href, text in items:
        if href == "about.html":
            about_item = (href, text)
        elif href == "our_team.html":
            team_item = (href, text)
        elif href == "contact.html":
            contact_item = (href, text)
        else:
            ordered_items.append((href, text))
    
    # Add the items in the right order
    if contact_item:
        ordered_items.append(about_item)
        ordered_items.append(team_item)
        ordered_items.append(contact_item)
    
    # Generate the new menu HTML
    new_menu_items = ""
    for href, text in ordered_items:
        new_menu_items += f'                    <li><a href="{href}">{text}</a></li>\n'
    
    # Replace the menu in the content
    new_menu = menu_start + '\n' + new_menu_items + '                ' + menu_end
    new_content = re.sub(menu_pattern, new_menu, content, flags=re.DOTALL)
    
    # Write back to file
    with open('public/index.html', 'w') as file:
        file.write(new_content)
    
    print("Menu successfully reordered!")
else:
    print("Menu section not found in the file.") 