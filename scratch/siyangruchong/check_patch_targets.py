import gzip

src_path = "extracted/siyangruchong_package/Build/siyangruchong.framework.js.unityweb"
with gzip.open(src_path, "rt", encoding="utf-8", errors="replace") as f:
    content = f.read()

target1 = 'for(var i=0;i<e.targetTouches.length;++i){touches[e.targetTouches[i].identifier].onTarget=1}'
print('target1 in src:', target1 in content)

target2 = 'var touch=event.touch;if(touch===undefined){return}'
print('target2 in src:', target2 in content)
