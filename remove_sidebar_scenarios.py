import re

with open("src/App.tsx", "r") as f:
    text = f.read()

# Find "{/* Scenarios Section */}" and remove everything up to "</aside>"
start = text.find("{/* Scenarios Section */}")
end = text.find("</aside>")

if start != -1 and end != -1:
    new_text = text[:start] + text[end:]
    # There might be a divider just before start.
    
    # We can also clean up the divider.
    # We can use regex to remove the <div className="h-px ..."> before it.
    new_text = re.sub(r'<div className="h-px w-full bg-\[#2A2A2E\] my-0 shrink-0"><\/div>\s*$', '', new_text[:start].rstrip()) + "\n        </aside>" + text[end+len("</aside>"):]
    
    with open("src/App.tsx", "w") as f2:
        f2.write(new_text)
    print("Done")
else:
    print("Could not find start or end")

