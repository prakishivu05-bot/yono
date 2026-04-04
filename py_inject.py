import re

with open('c:/Users/Admin/Desktop/Yono/yono.html', 'r', encoding='utf-8') as f:
    html = f.read()

with open('c:/Users/Admin/Desktop/Yono/scriptContent.js', 'r', encoding='utf-8') as f:
    new_script = f.read()

print("Original HTML length:", len(html))

# use string split or regex to replace the content
start = html.find('<script>')
end = html.rfind('</script>')
if start != -1 and end != -1:
    new_html = html[:start + len('<script>')] + '\n' + new_script + '\n' + html[end:]
    with open('c:/Users/Admin/Desktop/Yono/yono.html', 'w', encoding='utf-8') as f:
        f.write(new_html)
    print("Replaced successfully. New length:", len(new_html))
else:
    print("Could not find script tags")
