path = r'D:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\0b14ddffb6d6867f4577189187985cab.framework.js'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Pointer_stringify
p_old = "function Pointer_stringify(s,len){warnOnce(\"The JavaScript function 'Pointer_stringify(ptrToSomeCString)' is obsoleted and will be removed in a future Unity version. Please call 'UTF8ToString(ptrToSomeCString)' instead.\");return UTF8ToString(s,len)}"
p_new = "function Pointer_stringify(s,len){return UTF8ToString(s,len)}"
if p_old in text:
    text = text.replace(p_old, p_new, 1)
    print("Patched Pointer_stringify")
else:
    print("p_old not found")

# 2. writeStringToMemory
w_old = "function writeStringToMemory(string,buffer,dontAddNull){warnOnce(\"writeStringToMemory is deprecated and should not be called! Use stringToUTF8() instead!\");var lastChar,end;if(dontAddNull){end=buffer+lengthBytesUTF8(string);lastChar=HEAP8[end]}stringToUTF8(string,buffer,Infinity);if(dontAddNull)HEAP8[end]=lastChar}"
w_new = "function writeStringToMemory(string,buffer,dontAddNull){var lastChar,end;if(dontAddNull){end=buffer+lengthBytesUTF8(string);lastChar=HEAP8[end]}stringToUTF8(string,buffer,Infinity);if(dontAddNull)HEAP8[end]=lastChar}"
if w_old in text:
    text = text.replace(w_old, w_new, 1)
    print("Patched writeStringToMemory")
else:
    print("w_old not found")

# 3. _JS_Log_Dump
l_old = 'function _JS_Log_Dump(ptr,type){var str=UTF8ToString(ptr);if(typeof dump=="function")dump(str);switch(type){case 0:case 1:case 4:console.error(str);return;case 2:console.warn(str);return;case 3:case 5:console.log(str);return;default:console.error("Unknown console message type!");console.error(str)}}'
l_new = 'function _JS_Log_Dump(ptr,type){var str=UTF8ToString(ptr);if(str.indexOf("UnityAnalyticsModule")!==-1)return;if(typeof dump=="function")dump(str);switch(type){case 0:case 1:case 4:console.error(str);return;case 2:console.warn(str);return;case 3:case 5:console.log(str);return;default:console.error("Unknown console message type!");console.error(str)}}'
if l_old in text:
    text = text.replace(l_old, l_new, 1)
    print("Patched _JS_Log_Dump")
else:
    print("l_old not found")

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Saved framework.js successfully!")
