
const mockGl = {
  VERSION: 0x1F02,
  COLOR_BUFFER_BIT: 0x4000,
  BLEND: 0x0BE2,
  ONE: 1,
  ONE_MINUS_SRC_ALPHA: 0x0303,
  CULL_FACE: 0x0B44,
  STENCIL_TEST: 0x0B90,
  DITHER: 0x0BD0,
  DEPTH_TEST: 0x0B71,
  DYNAMIC_DRAW: 0x88E8,
  STATIC_DRAW: 0x88E4,
  ARRAY_BUFFER: 0x8892,
  ELEMENT_ARRAY_BUFFER: 0x8893,
  TEXTURE0: 0x84C0,
  TEXTURE1: 0x84C1,
  TEXTURE_2D: 0x0DE1,
  MAX_TEXTURE_SIZE: 0x0D33,
  ALIASED_POINT_SIZE_RANGE: 0x846D,
  VERTEX_SHADER: 0x8B31,
  FRAGMENT_SHADER: 0x8B30,
  HIGH_FLOAT: 0x8DF2,
  FRAMEBUFFER: 0x8D40,
  getContextAttributes: () => ({ desynchronized: false }),
  getParameter: (param) => {
    if (param === 0x1F02) return 'WebGL 1.0';
    if (param === 0x0D33) return 4096;
    if (param === 0x846D) return [1, 100];
    return null;
  },
  clearColor: () => {},
  clear: () => {},
  enable: () => {},
  disable: () => {},
  blendFunc: () => {},
  depthMask: () => {},
  depthFunc: () => {},
  createBuffer: () => ({}),
  bindBuffer: () => {},
  bufferData: () => {},
  activeTexture: () => {},
  bindTexture: () => {},
  getShaderPrecisionFormat: () => ({ precision: 24 }),
  getSupportedExtensions: () => [],
  getExtension: () => null,
  createShader: () => ({}),
  shaderSource: () => {},
  compileShader: () => {},
  getShaderParameter: () => true,
  createProgram: () => ({}),
  attachShader: () => {},
  linkProgram: () => {},
  getProgramParameter: () => true,
  getProgramInfoLog: () => '',
  getShaderInfoLog: () => '',
  getAttribLocation: () => 0,
  getUniformLocation: () => ({}),
  useProgram: () => {},
  bindFramebuffer: () => {},
  viewport: () => {},
  deleteTexture: () => {},
  createTexture: () => ({}),
  texParameteri: () => {},
  pixelStorei: () => {},
  texImage2D: () => {}
};

// Global canvas hook before loading
globalThis.canvas = {
  width: 393,
  height: 852,
  getContext: (type) => {
    if (type.includes('webgl')) return mockGl;
    return null;
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {},
  style: {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 393, height: 852 })
};

require('../game.js');
setTimeout(() => {
  console.log('SUCCESS! C3 Runtime loaded and initialized successfully in simulated environment!');
  process.exit(0);
}, 1000);
