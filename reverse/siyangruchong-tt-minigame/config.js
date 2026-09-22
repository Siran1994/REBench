/**
 * 游戏运行时配置
 */
const CONFIG = {
  // 本地开发测试 CDN 地址 (端口与 serve_cdn.py 匹配)
  // 真机/手机端测试时使用局域网 IP (192.168.112.177)，电脑模拟器与手机通用
  // 上线时替换为正式 CDN 域名 (例如: https://your-cdn-domain.com/siyangruchong)
  CDN_BASE_URL: 'http://192.168.112.177:8088',

  // 资源缓存版本 (修改资产后递增此版本号以击穿真机沙盒缓存)
  ASSET_CACHE_VERSION: 'v18_fix_ios_webaudio_processer',

  // 游戏元数据
  COMPANY_NAME: 'DefaultCompany',
  PRODUCT_NAME: 'worm-capitalist',
  PRODUCT_VERSION: '1.0',

  // 文件配置
  DATA_FILENAME: 'siyangruchong.data',
  WASM_FILENAME: 'siyangruchong.wasm.br',
  WASM_SUBPACKAGE_PATH: 'wasm_pkg/siyangruchong.wasm.br',

  // 画质分档：以横屏短边（高度）720p 为基准进行等比缩放
  // performance: 540p, balanced: 640p, quality: 720p
  RENDER_QUALITY: 'quality',
  MAX_SHORT_SIDE: 720,

  // 商业化广告位配置 (未填写真实广告位时 SDKManager 自动开启开发测试发奖模式)
  ADS: {
    REWARDED_ID: '',      // 激励视频广告位 ID
    INTERSTITIAL_ID: '',  // 插屏广告位 ID
    BANNER_ID: ''         // Banner 广告位 ID
  }
};

module.exports = CONFIG;
