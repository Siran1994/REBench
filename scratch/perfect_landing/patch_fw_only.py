fw_path = r'D:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\0b14ddffb6d6867f4577189187985cab.framework.js'
with open(fw_path, 'r', encoding='utf-8') as f:
    fw = f.read()

fw_old_init = 'if(screen.orientation){screen.orientation.addEventListener("change",JS_ScreenOrientation_eventHandler)}'
fw_new_init = 'if(screen.orientation&&typeof screen.orientation.addEventListener==="function"){screen.orientation.addEventListener("change",JS_ScreenOrientation_eventHandler)}'

fw_old_deinit = 'if(screen.orientation){screen.orientation.removeEventListener("change",JS_ScreenOrientation_eventHandler)}'
fw_new_deinit = 'if(screen.orientation&&typeof screen.orientation.removeEventListener==="function"){screen.orientation.removeEventListener("change",JS_ScreenOrientation_eventHandler)}'

if fw_old_init in fw:
    fw = fw.replace(fw_old_init, fw_new_init, 1)
    print("Patched _JS_ScreenOrientation_Init in framework.js!")
else:
    print("fw_old_init not found (may already be patched)")

if fw_old_deinit in fw:
    fw = fw.replace(fw_old_deinit, fw_new_deinit, 1)
    print("Patched _JS_ScreenOrientation_DeInit in framework.js!")
else:
    print("fw_old_deinit not found (may already be patched)")

with open(fw_path, 'w', encoding='utf-8') as f:
    f.write(fw)

print("Saved framework.js successfully!")
