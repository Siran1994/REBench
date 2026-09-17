import os

fw_path = r'd:/Desktop/REBench/reverse/perfect-landing-tt-minigame/Build/0b14ddffb6d6867f4577189187985cab.framework.js'
with open(fw_path, 'r', encoding='utf-8') as f:
    fw = f.read()

# 1. Patch createContext to eliminate SafariWebGL2Fixed instanceof check and add webgl fallback
old_ctx = 'createContext:function(canvas,webGLContextAttributes){if(!canvas.getContextSafariWebGL2Fixed){canvas.getContextSafariWebGL2Fixed=canvas.getContext;function fixedGetContext(ver,attrs){var gl=canvas.getContextSafariWebGL2Fixed(ver,attrs);return ver=="webgl"==gl instanceof WebGLRenderingContext?gl:null}canvas.getContext=fixedGetContext}var ctx=webGLContextAttributes.majorVersion>1?canvas.getContext("webgl2",webGLContextAttributes):canvas.getContext("webgl",webGLContextAttributes);if(!ctx)return 0;var handle=GL.registerContext(ctx,webGLContextAttributes);return handle}'

new_ctx = 'createContext:function(canvas,webGLContextAttributes){var ctx=null;try{if(webGLContextAttributes&&webGLContextAttributes.majorVersion>1){ctx=canvas.getContext("webgl2",webGLContextAttributes)}}catch(e){}if(!ctx){try{ctx=canvas.getContext("webgl",webGLContextAttributes)||canvas.getContext("experimental-webgl",webGLContextAttributes)}catch(e){}}if(!ctx){console.error("[Unity WebGL] Failed to create WebGL context!");return 0;}console.log("[Unity WebGL] WebGL context created successfully!");var handle=GL.registerContext(ctx,webGLContextAttributes);return handle}'

print('old_ctx found:', old_ctx in fw)
if old_ctx in fw:
    fw = fw.replace(old_ctx, new_ctx)
    print('Replaced createContext successfully')

# 2. Patch _JS_ScreenOrientation_Init and DeInit with try-catch
old_init = 'function _JS_ScreenOrientation_Init(callback){if(!JS_ScreenOrientation_callback){if(screen.orientation&&typeof screen.orientation.addEventListener==="function"){screen.orientation.addEventListener("change",JS_ScreenOrientation_eventHandler)}window.addEventListener("resize",JS_ScreenOrientation_eventHandler);JS_ScreenOrientation_callback=callback;setTimeout(JS_ScreenOrientation_eventHandler,0)}}'

new_init = 'function _JS_ScreenOrientation_Init(callback){if(!JS_ScreenOrientation_callback){try{if(screen.orientation&&typeof screen.orientation.addEventListener==="function"){screen.orientation.addEventListener("change",JS_ScreenOrientation_eventHandler)}}catch(e){}try{window.addEventListener("resize",JS_ScreenOrientation_eventHandler)}catch(e){}JS_ScreenOrientation_callback=callback;setTimeout(JS_ScreenOrientation_eventHandler,0)}}'

print('old_init found:', old_init in fw)
if old_init in fw:
    fw = fw.replace(old_init, new_init)
    print('Replaced _JS_ScreenOrientation_Init successfully')

old_deinit = 'function _JS_ScreenOrientation_DeInit(){JS_ScreenOrientation_callback=0;window.removeEventListener("resize",JS_ScreenOrientation_eventHandler);if(screen.orientation&&typeof screen.orientation.removeEventListener==="function"){screen.orientation.removeEventListener("change",JS_ScreenOrientation_eventHandler)}}'

new_deinit = 'function _JS_ScreenOrientation_DeInit(){JS_ScreenOrientation_callback=0;try{window.removeEventListener("resize",JS_ScreenOrientation_eventHandler)}catch(e){}try{if(screen.orientation&&typeof screen.orientation.removeEventListener==="function"){screen.orientation.removeEventListener("change",JS_ScreenOrientation_eventHandler)}}catch(e){}}'

print('old_deinit found:', old_deinit in fw)
if old_deinit in fw:
    fw = fw.replace(old_deinit, new_deinit)
    print('Replaced _JS_ScreenOrientation_DeInit successfully')

with open(fw_path, 'w', encoding='utf-8') as f:
    f.write(fw)
print('Saved updated framework.js')
