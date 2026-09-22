import sys

sys.stdout.reconfigure(encoding='utf-8')
target_file = r'reverse/siyangruchong-tt-minigame/engine/framework.js'

with open(target_file, 'r', encoding='utf-8') as f:
    content = f.read()

bad_snippet_marker = 'FS Write Event'
assert bad_snippet_marker in content, 'FS Write Event not found in framework.js!'

# Locate start of close:function(stream) before this marker
marker_idx = content.find(bad_snippet_marker)
start_idx = content.rfind('close:function(stream){', 0, marker_idx)
assert start_idx != -1, 'close:function(stream) not found!'

# Locate end of this close function
end_marker = 'stream.fd=null}'
end_idx = content.find(end_marker, marker_idx) + len(end_marker)
assert end_idx != -1, 'stream.fd=null} not found!'

matched_str = content[start_idx:end_idx]
print(f'Matched {len(matched_str)} chars to replace:')
print(matched_str[:80] + ' ... ' + matched_str[-40:])

orig_close = 'close:function(stream){if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if(stream.getdents)stream.getdents=null;try{if(stream.stream_ops.close){stream.stream_ops.close(stream)}}catch(e){throw e}finally{FS.closeStream(stream.fd)}stream.fd=null}'

content = content[:start_idx] + orig_close + content[end_idx:]

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(content)

print('✓ 成功将 framework.js 中的 FS.close 恢复为原生干净实现！')
