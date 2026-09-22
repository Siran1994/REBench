/**
 * ByteDance MiniGame (抖音小游戏) Adapter Template for ImpactJS / 2D Canvas Engine
 * 专用于 ImpactJS (MarketJS) 及原生 2D Canvas HTML5 游戏向抖音小游戏的工业级适配
 */
(function() {
    'use strict';

    var globalObj = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : self);

    // 1. 获取基础设备信息
    var sysInfo = {
        windowWidth: 393,
        windowHeight: 852,
        pixelRatio: 3,
        platform: 'android'
    };

    if (typeof tt !== 'undefined' && typeof tt.getSystemInfoSync === 'function') {
        try {
            sysInfo = tt.getSystemInfoSync();
        } catch (e) {
            console.warn('[ImpactAdapter] getSystemInfoSync failed, using fallback viewport');
        }
    }

    var winWidth = sysInfo.windowWidth || 393;
    var winHeight = sysInfo.windowHeight || 852;
    var dpr = sysInfo.pixelRatio || 1;

    console.log('[ImpactAdapter] Device environment initialized: ' + winWidth + 'x' + winHeight + ' @ DPR ' + dpr);

    // ==========================================
    // 2. 主画布 (Screen Canvas) 初始化
    // ==========================================
    var mainCanvas = null;
    if (typeof tt !== 'undefined' && typeof tt.createCanvas === 'function') {
        mainCanvas = tt.createCanvas();
    } else {
        mainCanvas = {
            getContext: function() { return {}; }
        };
    }

    mainCanvas.id = 'canvas';
    mainCanvas.tagName = 'CANVAS';
    mainCanvas.nodeType = 1;

    if (!mainCanvas.style) mainCanvas.style = {};
    mainCanvas.style.width = winWidth + 'px';
    mainCanvas.style.height = winHeight + 'px';
    mainCanvas.style.position = 'absolute';
    mainCanvas.style.left = '0px';
    mainCanvas.style.top = '0px';

    Object.defineProperty(mainCanvas, 'offsetWidth', {
        get: function() { return winWidth; },
        configurable: true
    });
    Object.defineProperty(mainCanvas, 'offsetHeight', {
        get: function() { return winHeight; },
        configurable: true
    });
    Object.defineProperty(mainCanvas, 'clientWidth', {
        get: function() { return winWidth; },
        configurable: true
    });
    Object.defineProperty(mainCanvas, 'clientHeight', {
        get: function() { return winHeight; },
        configurable: true
    });

    mainCanvas.getBoundingClientRect = function() {
        return {
            left: 0,
            top: 0,
            width: winWidth,
            height: winHeight,
            right: winWidth,
            bottom: winHeight,
            x: 0,
            y: 0
        };
    };

    var canvasListeners = {};
    mainCanvas.addEventListener = function(type, listener) {
        if (!canvasListeners[type]) canvasListeners[type] = [];
        canvasListeners[type].push(listener);
    };
    mainCanvas.removeEventListener = function(type, listener) {
        if (!canvasListeners[type]) return;
        canvasListeners[type] = canvasListeners[type].filter(function(l) { return l !== listener; });
    };
    mainCanvas.dispatchEvent = function(event) {
        var list = canvasListeners[event.type] || [];
        for (var i = 0; i < list.length; i++) {
            try {
                list[i].call(mainCanvas, event);
            } catch (e) {
                console.error('[ImpactAdapter] Canvas event listener error:', e);
            }
        }
    };

    // ==========================================
    // 3. Canvas 2D 上下文字体动态 Fallback 拦截
    // ==========================================
    try {
        var proto = null;
        if (typeof CanvasRenderingContext2D !== 'undefined') {
            proto = CanvasRenderingContext2D.prototype;
        } else if (mainCanvas.getContext) {
            var sampleCtx = mainCanvas.getContext('2d');
            if (sampleCtx && sampleCtx.__proto__) proto = sampleCtx.__proto__;
        }

        if (proto) {
            var fontDesc = Object.getOwnPropertyDescriptor(proto, 'font');
            if (fontDesc && fontDesc.set) {
                var rawSetFont = fontDesc.set;
                Object.defineProperty(proto, 'font', {
                    get: fontDesc.get,
                    set: function(val) {
                        if (typeof val === 'string' && val.indexOf('sans-serif') === -1) {
                            val = val + ', "Microsoft YaHei", "PingFang SC", "Heiti SC", sans-serif';
                        }
                        return rawSetFont.call(this, val);
                    },
                    configurable: true,
                    enumerable: true
                });
                console.log('[ImpactAdapter] Canvas 2D context font fallback interceptor active');
            }
        }
    } catch (e) {
        console.warn('[ImpactAdapter] Canvas font descriptor interception failed:', e);
    }

    // ==========================================
    // 4. MiniElement 轻量级 DOM 节点模拟
    // ==========================================
    function MiniElement(tagName, id) {
        this.tagName = (tagName || 'DIV').toUpperCase();
        this.nodeName = this.tagName;
        this.id = id || '';
        this.className = '';
        this.children = [];
        this.childNodes = [];
        this.parentNode = null;
        this.style = {};
        this._listeners = {};
        this._attrs = {};
        this.nodeType = 1;
    }

    MiniElement.prototype.appendChild = function(child) {
        if (child && child !== this) {
            this.children.push(child);
            this.childNodes.push(child);
            child.parentNode = this;
        }
        return child;
    };

    MiniElement.prototype.removeChild = function(child) {
        var idx = this.children.indexOf(child);
        if (idx !== -1) this.children.splice(idx, 1);
        idx = this.childNodes.indexOf(child);
        if (idx !== -1) this.childNodes.splice(idx, 1);
        if (child) child.parentNode = null;
        return child;
    };

    MiniElement.prototype.setAttribute = function(k, v) {
        this._attrs[k] = String(v);
        this[k] = v;
    };

    MiniElement.prototype.getAttribute = function(k) {
        return this._attrs[k] !== undefined ? this._attrs[k] : (this[k] !== undefined ? String(this[k]) : null);
    };

    MiniElement.prototype.getBoundingClientRect = function() {
        return { left: 0, top: 0, width: winWidth, height: winHeight, right: winWidth, bottom: winHeight, x: 0, y: 0 };
    };

    MiniElement.prototype.addEventListener = function(type, listener) {
        if (!this._listeners[type]) this._listeners[type] = [];
        this._listeners[type].push(listener);
    };

    MiniElement.prototype.removeEventListener = function(type, listener) {
        if (!this._listeners[type]) return;
        this._listeners[type] = this._listeners[type].filter(function(l) { return l !== listener; });
    };

    MiniElement.prototype.dispatchEvent = function(event) {
        var list = this._listeners[event.type] || [];
        for (var i = 0; i < list.length; i++) {
            try { list[i].call(this, event); } catch (e) { console.error(e); }
        }
    };

    Object.defineProperty(MiniElement.prototype, 'offsetWidth', { get: function() { return winWidth; }, configurable: true });
    Object.defineProperty(MiniElement.prototype, 'offsetHeight', { get: function() { return winHeight; }, configurable: true });
    Object.defineProperty(MiniElement.prototype, 'clientWidth', { get: function() { return winWidth; }, configurable: true });
    Object.defineProperty(MiniElement.prototype, 'clientHeight', { get: function() { return winHeight; }, configurable: true });

    // ==========================================
    // 5. Document 树结构模拟
    // ==========================================
    var bodyElem = new MiniElement('BODY', 'body');
    var htmlElem = new MiniElement('HTML', 'html');
    htmlElem.appendChild(bodyElem);

    var ajaxbarElem = new MiniElement('DIV', 'ajaxbar');
    var gameElem = new MiniElement('DIV', 'game');
    var orientateElem = new MiniElement('DIV', 'orientate');
    var playElem = new MiniElement('DIV', 'play');

    gameElem.appendChild(mainCanvas);
    ajaxbarElem.appendChild(gameElem);
    ajaxbarElem.appendChild(orientateElem);
    ajaxbarElem.appendChild(playElem);
    bodyElem.appendChild(ajaxbarElem);

    var domElements = {
        '#canvas': mainCanvas,
        'canvas': mainCanvas,
        '#game': gameElem,
        '#ajaxbar': ajaxbarElem,
        '#orientate': orientateElem,
        '#play': playElem,
        'body': bodyElem,
        'html': htmlElem
    };

    var documentObj = {
        nodeType: 9,
        documentElement: htmlElem,
        body: bodyElem,
        fonts: {
            ready: Promise.resolve(),
            check: function() { return true; },
            load: function() { return Promise.resolve([]); }
        },
        visibilityState: 'visible',
        hidden: false,
        hasFocus: function() { return true; },
        createElement: function(tag) {
            tag = String(tag || '').toLowerCase();
            if (tag === 'canvas') {
                var c = typeof tt !== 'undefined' && typeof tt.createCanvas === 'function' ? tt.createCanvas() : new MiniElement('canvas');
                c.style = c.style || {};
                return c;
            }
            if (tag === 'audio') {
                return createWrappedAudio();
            }
            if (tag === 'img' || tag === 'image') {
                var img = typeof tt !== 'undefined' && typeof tt.createImage === 'function' ? tt.createImage() : new MiniElement('img');
                img.style = img.style || {};
                return img;
            }
            return new MiniElement(tag);
        },
        getElementById: function(id) {
            if (id === 'canvas') return mainCanvas;
            if (id === 'game') return gameElem;
            if (id === 'ajaxbar') return ajaxbarElem;
            if (id === 'orientate') return orientateElem;
            if (id === 'play') return playElem;
            return domElements['#' + id] || null;
        },
        querySelector: function(sel) {
            if (domElements[sel]) return domElements[sel];
            if (sel && sel.indexOf('#') === 0) return documentObj.getElementById(sel.slice(1));
            return null;
        },
        querySelectorAll: function(sel) {
            var item = documentObj.querySelector(sel);
            return item ? [item] : [];
        },
        addEventListener: function(type, listener) {
            bodyElem.addEventListener(type, listener);
        },
        removeEventListener: function(type, listener) {
            bodyElem.removeEventListener(type, listener);
        }
    };

    // ==========================================
    // 6. Krypton WebAudio 降级 & AudioParam Polyfill
    // ==========================================
    if (typeof AudioParam !== 'undefined') {
        var apProto = AudioParam.prototype;
        if (!apProto.setValueAtTime) apProto.setValueAtTime = function(v) { this.value = v; };
        if (!apProto.linearRampToValueAtTime) apProto.linearRampToValueAtTime = function(v) { this.value = v; };
        if (!apProto.exponentialRampToValueAtTime) apProto.exponentialRampToValueAtTime = function(v) { this.value = v; };
        if (!apProto.setTargetAtTime) apProto.setTargetAtTime = function(v) { this.value = v; };
    }

    if (typeof AudioContext !== 'undefined') {
        var origCreateGain = AudioContext.prototype.createGain;
        if (origCreateGain) {
            AudioContext.prototype.createGain = function() {
                var node = origCreateGain.call(this);
                if (node && node.gain) {
                    if (!node.gain.setValueAtTime) node.gain.setValueAtTime = function(v) { this.value = v; };
                    if (!node.gain.linearRampToValueAtTime) node.gain.linearRampToValueAtTime = function(v) { this.value = v; };
                }
                return node;
            };
        }
    }

    // ==========================================
    // 7. 纯 JS 包装器: createWrappedAudio
    // ==========================================
    function createWrappedAudio() {
        var inner = null;
        if (typeof tt !== 'undefined' && typeof tt.createInnerAudioContext === 'function') {
            try {
                inner = tt.createInnerAudioContext();
            } catch (e) {
                console.warn('[ImpactAdapter] createInnerAudioContext failed:', e);
            }
        }

        var listeners = {};
        var srcValue = '';
        var volumeValue = 1;
        var loopValue = false;
        var pausedValue = true;

        var wrapper = {
            readyState: 4, // HAVE_ENOUGH_DATA
            duration: 0,
            currentTime: 0,
            canPlayType: function(t) {
                if (t && (t.indexOf('mp3') !== -1 || t.indexOf('mpeg') !== -1 || t.indexOf('m4a') !== -1 || t.indexOf('wav') !== -1)) {
                    return 'probably';
                }
                return 'maybe';
            },
            play: function() {
                pausedValue = false;
                if (inner) {
                    try { inner.play(); } catch (e) {}
                }
            },
            pause: function() {
                pausedValue = true;
                if (inner) {
                    try { inner.pause(); } catch (e) {}
                }
            },
            stop: function() {
                pausedValue = true;
                if (inner) {
                    try { inner.stop(); } catch (e) {}
                }
            },
            addEventListener: function(type, fn) {
                if (!listeners[type]) listeners[type] = [];
                listeners[type].push(fn);
            },
            removeEventListener: function(type, fn) {
                if (!listeners[type]) return;
                listeners[type] = listeners[type].filter(function(f) { return f !== fn; });
            },
            dispatchEvent: function(event) {
                var list = listeners[event.type] || [];
                for (var i = 0; i < list.length; i++) {
                    try { list[i].call(wrapper, event); } catch (e) { console.error(e); }
                }
            }
        };

        Object.defineProperty(wrapper, 'src', {
            get: function() { return srcValue; },
            set: function(v) {
                srcValue = v;
                if (inner) inner.src = v;
            }
        });

        Object.defineProperty(wrapper, 'volume', {
            get: function() { return volumeValue; },
            set: function(v) {
                volumeValue = v;
                if (inner) inner.volume = v;
            }
        });

        Object.defineProperty(wrapper, 'loop', {
            get: function() { return loopValue; },
            set: function(v) {
                loopValue = !!v;
                if (inner) inner.loop = !!v;
            }
        });

        Object.defineProperty(wrapper, 'paused', {
            get: function() { return pausedValue; }
        });

        if (inner) {
            inner.onCanplay(function() {
                wrapper.readyState = 4;
                if (inner.duration) wrapper.duration = inner.duration;
                wrapper.dispatchEvent({ type: 'canplay' });
                wrapper.dispatchEvent({ type: 'canplaythrough' });
            });
            inner.onEnded(function() {
                pausedValue = true;
                wrapper.dispatchEvent({ type: 'ended' });
            });
            inner.onError(function(err) {
                wrapper.dispatchEvent({ type: 'error', detail: err });
            });
        }

        return wrapper;
    }

    // ==========================================
    // 8. 触控事件合成与分发 (Touch -> Mouse)
    // ==========================================
    function synthesizeTouchEvent(name, touchList) {
        var touches = [];
        for (var i = 0; i < touchList.length; i++) {
            var t = touchList[i];
            touches.push({
                identifier: t.identifier || 0,
                clientX: t.clientX !== undefined ? t.clientX : t.pageX,
                clientY: t.clientY !== undefined ? t.clientY : t.pageY,
                pageX: t.pageX !== undefined ? t.pageX : t.clientX,
                pageY: t.pageY !== undefined ? t.pageY : t.clientY,
                target: mainCanvas
            });
        }
        var primary = touches[0] || { clientX: 0, clientY: 0, pageX: 0, pageY: 0 };
        return {
            type: name,
            touches: touches,
            targetTouches: touches,
            changedTouches: touches,
            target: mainCanvas,
            srcElement: mainCanvas,
            currentTarget: mainCanvas,
            clientX: primary.clientX,
            clientY: primary.clientY,
            pageX: primary.pageX,
            pageY: primary.pageY,
            button: 0,
            which: 1,
            preventDefault: function() {},
            stopPropagation: function() {}
        };
    }

    if (typeof tt !== 'undefined') {
        if (typeof tt.onTouchStart === 'function') {
            tt.onTouchStart(function(res) {
                mainCanvas.dispatchEvent(synthesizeTouchEvent('touchstart', res.touches || []));
            });
        }
        if (typeof tt.onTouchMove === 'function') {
            tt.onTouchMove(function(res) {
                mainCanvas.dispatchEvent(synthesizeTouchEvent('touchmove', res.touches || []));
            });
        }
        if (typeof tt.onTouchEnd === 'function') {
            tt.onTouchEnd(function(res) {
                mainCanvas.dispatchEvent(synthesizeTouchEvent('touchend', res.changedTouches || []));
            });
        }
        if (typeof tt.onTouchCancel === 'function') {
            tt.onTouchCancel(function(res) {
                mainCanvas.dispatchEvent(synthesizeTouchEvent('touchcancel', res.changedTouches || []));
            });
        }
    }

    // ==========================================
    // 9. 生命周期管理 (onShow / onHide 前台常驻)
    // ==========================================
    if (typeof tt !== 'undefined') {
        if (typeof tt.onShow === 'function') {
            tt.onShow(function() {
                documentObj.visibilityState = 'visible';
                documentObj.hidden = false;
                if (globalObj.ig && globalObj.ig.game && typeof globalObj.ig.game.resumeGame === 'function') {
                    globalObj.ig.game.resumeGame();
                }
            });
        }
        if (typeof tt.onHide === 'function') {
            tt.onHide(function() {
                documentObj.visibilityState = 'hidden';
                documentObj.hidden = true;
            });
        }
    }

    // ==========================================
    // 10. LocalStorage 桥接
    // ==========================================
    var localStorageObj = {
        getItem: function(k) {
            try { return tt.getStorageSync(k); } catch (e) { return null; }
        },
        setItem: function(k, v) {
            try { tt.setStorageSync(k, v); } catch (e) {}
        },
        removeItem: function(k) {
            try { tt.removeStorageSync(k); } catch (e) {}
        },
        clear: function() {
            try { tt.clearStorageSync(); } catch (e) {}
        }
    };

    // ==========================================
    // 11. 全局注入与环境固化
    // ==========================================
    var windowObj = {
        document: documentObj,
        canvas: mainCanvas,
        Audio: createWrappedAudio,
        Image: documentObj.createElement('img').constructor,
        localStorage: localStorageObj,
        innerWidth: winWidth,
        innerHeight: winHeight,
        devicePixelRatio: dpr,
        screen: { width: winWidth, height: winHeight },
        navigator: {
            userAgent: 'Mozilla/5.0 (Linux; Android 10; ByteDanceMiniGame) AppleWebKit/537.36',
            platform: 'Android'
        },
        location: { href: 'http://localhost/game/', search: '', hash: '' },
        addEventListener: function(t, fn) { mainCanvas.addEventListener(t, fn); },
        removeEventListener: function(t, fn) { mainCanvas.removeEventListener(t, fn); },
        focus: function() {},
        blur: function() {},
        self: null,
        top: null,
        frames: []
    };
    windowObj.self = windowObj;
    windowObj.top = windowObj;

    // 挂载至宿主
    for (var key in windowObj) {
        if (globalObj[key] === undefined) {
            globalObj[key] = windowObj[key];
        }
    }

    if (!globalObj.window) globalObj.window = windowObj;
    if (!globalObj.document) globalObj.document = documentObj;
    if (!globalObj.localStorage) globalObj.localStorage = localStorageObj;

    // FontFaceObserver 假死防护
    if (typeof globalObj.FontFaceObserver === 'undefined') {
        globalObj.FontFaceObserver = function() {
            return {
                load: function() { return Promise.resolve(); }
            };
        };
    } else if (globalObj.FontFaceObserver.prototype) {
        globalObj.FontFaceObserver.prototype.load = function() {
            return Promise.resolve();
        };
    }

    console.log('[ImpactAdapter] ImpactJS MiniGame Adapter initialized successfully.');
})();
