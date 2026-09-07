require("./c3runtime.js");
require("./plugins/EMI_INDO_AppLovin_Ads/c3runtime/main.js");
require("./objRefTable.js");
require("./project/javaScriptInEvents.js");

// Hook C3.BlobToImage to route directly through Helium image loading without blob URLs
if (typeof self !== 'undefined' && self.C3) {
  const C3 = self.C3;
  if (C3.Supports) {
    C3.Supports.ImageBitmap = false;
    C3.Supports.ImageBitmapOptions = false;
    C3.Supports.ImageBitmapOptionsResize = false;
  }
  C3.BlobToImage = async function (blob, needDecode) {
    if (blob && blob._dataUri) {
      return C3.FetchImage(blob._dataUri);
    }
    if (blob && blob._path && globalThis.__diggerEmbeddedImages && globalThis.__diggerEmbeddedImages[blob._path]) {
      return C3.FetchImage(globalThis.__diggerEmbeddedImages[blob._path]);
    }
    try {
      let arrayBuf = blob._arrayBuffer;
      if (!arrayBuf && typeof blob.arrayBuffer === 'function') {
        arrayBuf = await blob.arrayBuffer();
      }
      if (arrayBuf) {
        let base64 = '';
        if (typeof tt !== 'undefined' && tt.arrayBufferToBase64) {
          base64 = tt.arrayBufferToBase64(arrayBuf);
        } else if (typeof Buffer !== 'undefined') {
          base64 = Buffer.from(arrayBuf).toString('base64');
        }
        if (base64) {
          const mime = (blob && blob.type) || 'image/webp';
          const dataUri = `data:${mime};base64,${base64}`;
          return await C3.FetchImage(dataUri);
        }
      }
    } catch (e) {
      console.warn('[BlobToImage] ArrayBuffer conversion error:', e);
    }
    let n = URL.createObjectURL(blob);
    try {
      const img = await C3.FetchImage(n);
      if (URL.revokeObjectURL) URL.revokeObjectURL(n);
      n = "";
      if (needDecode && typeof img.decode === 'function') {
        await img.decode();
      }
      return img;
    } finally {
      if (n && URL.revokeObjectURL) URL.revokeObjectURL(n);
    }
  };
}
