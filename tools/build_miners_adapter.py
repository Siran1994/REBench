import os

template_path = r'd:\Desktop\REBench\.agents\skills\apk-re-to-minigame\templates\tt-c3-adapter.template.js'
out_path = r'd:\Desktop\REBench\reverse\mine_line-tt-minigame\adapter\tt-c3-adapter.js'

with open(template_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add MiniResponse before MiniEvent
response_def = '''
class MiniResponse {
  constructor(body, init = {}) {
    this._body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new Map(Object.entries(init.headers || {}));
  }
  async arrayBuffer() {
    if (this._body instanceof ArrayBuffer) return this._body;
    if (this._body && typeof this._body.arrayBuffer === 'function') return await this._body.arrayBuffer();
    if (this._body && this._body._arrayBuffer) return this._body._arrayBuffer;
    if (ArrayBuffer.isView(this._body)) {
      return this._body.buffer.slice(this._body.byteOffset, this._body.byteOffset + this._body.byteLength);
    }
    return new ArrayBuffer(0);
  }
  async text() {
    if (typeof this._body === 'string') return this._body;
    if (this._body && typeof this._body.text === 'function') return await this._body.text();
    const ab = await this.arrayBuffer();
    if (typeof TextDecoder !== 'undefined') return new TextDecoder('utf-8').decode(ab);
    const u8 = new Uint8Array(ab);
    let s = '';
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return s;
  }
  async json() {
    const txt = await this.text();
    return JSON.parse(txt);
  }
  async blob() {
    if (this._body instanceof MiniBlob) return this._body;
    return new MiniBlob([this._body]);
  }
}
'''

content = content.replace('class MiniEvent {', response_def + '\nclass MiniEvent {')

# Add to _exposeGlobals
content = content.replace('if (!target.CustomEvent) target.CustomEvent = MiniCustomEvent;', 'if (!target.CustomEvent) target.CustomEvent = MiniCustomEvent;\n  if (!target.Response) target.Response = MiniResponse;')

# 2. Update screenObj for portrait
content = content.replace("type: 'landscape-primary'", "type: 'portrait-primary'")
content = content.replace("angle: 90", "angle: 0")

# 3. Update embeddedMap
content = content.replace("const embeddedMap = globalThis.__diggerEmbeddedImages;", "const embeddedMap = globalThis.__minersEmbeddedImages || globalThis.__embeddedAssets || globalThis.__diggerEmbeddedImages;")

# 4. Add WebAssembly instantiateStreaming wrapper
wasm_hook = '''
if (typeof WebAssembly !== 'undefined') {
  const origInstantiateStreaming = WebAssembly.instantiateStreaming;
  WebAssembly.instantiateStreaming = async function (resp, importObject) {
    try {
      const response = await resp;
      if (response && typeof response.arrayBuffer === 'function') {
        const buf = await response.arrayBuffer();
        return await WebAssembly.instantiate(buf, importObject);
      }
      if (origInstantiateStreaming) {
        return await origInstantiateStreaming(resp, importObject);
      }
    } catch (e) {
      console.warn('[WebAssembly] instantiateStreaming fallback to instantiate:', e);
      if (resp && typeof resp.arrayBuffer === 'function') {
        const buf = await resp.arrayBuffer();
        return await WebAssembly.instantiate(buf, importObject);
      }
      throw e;
    }
  };
}
'''

content = content + '\n' + wasm_hook

with open(out_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Generated {out_path} successfully. Length: {len(content)}")
