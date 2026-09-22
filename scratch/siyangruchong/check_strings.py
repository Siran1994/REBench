import gzip

src_path = 'extracted/siyangruchong_package/Build/siyangruchong.framework.js.unityweb'
with gzip.open(src_path, 'rt', encoding='utf-8', errors='replace') as f:
    content = f.read()

s1 = 'var specialHTMLTargets=[0,typeof document!=="undefined"?document:0,typeof window!=="undefined"?window:0];'
s2 = 'function findEventTarget(target){target=maybeCStringToJsString(target);var domElement=specialHTMLTargets[target]||(typeof document!=="undefined"?document.querySelector(target):undefined);return domElement}'
s3 = 'registerOrRemoveHandler:function(eventHandler){var jsEventHandler=function jsEventHandler(event){++JSEvents.inEventHandler;JSEvents.currentEventHandler=eventHandler;JSEvents.runDeferredCalls();eventHandler.handlerFunc(event);JSEvents.runDeferredCalls();--JSEvents.inEventHandler};if(eventHandler.callbackfunc){eventHandler.eventListenerFunc=jsEventHandler;eventHandler.target.addEventListener(eventHandler.eventTypeString,jsEventHandler,eventHandler.useCapture);JSEvents.eventHandlers.push(eventHandler);JSEvents.registerRemoveEventListeners()}else{'
s4 = 'h.target.removeEventListener(h.eventTypeString,h.eventListenerFunc,h.useCapture)'
s5 = 'function _emscripten_set_wheel_callback_on_thread(target,userData,useCapture,callbackfunc,targetThread){target=findEventTarget(target);if(typeof target.onwheel!=="undefined"){registerWheelEventCallback(target,userData,useCapture,callbackfunc,9,"wheel",targetThread);return 0}else{return-1}}'

print('s1 found:', s1 in content)
print('s2 found:', s2 in content)
print('s3 found:', s3 in content)
print('s4 found:', s4 in content)
print('s5 found:', s5 in content)
