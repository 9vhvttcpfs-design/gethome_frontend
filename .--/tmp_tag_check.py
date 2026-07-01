from pathlib import Path
import re
lines = Path('src/App.jsx').read_text(encoding='utf-8').splitlines()
start = 148 - 1
open_sum = 0
close_sum = 0
for i in range(start, len(lines)):
    open_sum += len(re.findall(r'<div\b', lines[i]))
    close_sum += len(re.findall(r'</div>', lines[i]))
    if close_sum > open_sum:
        print('too many closes at', i+1, 'open_sum', open_sum, 'close_sum', close_sum)
        break
print('final', open_sum, close_sum)
