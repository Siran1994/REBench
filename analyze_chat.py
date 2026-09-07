import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('chatGPT.md', 'r', encoding='utf-8') as f:
    lines = f.readlines()

in_details = 0
in_codeblock = False
user_turns = []

for idx, line in enumerate(lines):
    stripped = line.strip()
    if '```' in stripped:
        in_codeblock = not in_codeblock
    if '<details' in stripped:
        in_details += 1
    if '</details>' in stripped:
        in_details = max(0, in_details - 1)
        
    if in_details == 0 and not in_codeblock:
        if stripped.startswith('> '):
            # check if it is not a blockquote of an assistant tip or header
            text = stripped[2:].strip()
            if not text.startswith('**') and not text.startswith('!['):
                user_turns.append((idx + 1, text))

print(f"Detected {len(user_turns)} user turns:")
for line_num, text in user_turns:
    print(f"L{line_num:5d}: {text}")
