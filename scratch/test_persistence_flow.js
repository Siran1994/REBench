/**
 * 仿真测试脚本：验证 MiniGamePersistence 双向同步与持久化全链路
 */

const fs = require('fs');
const path = require('path');

// 1. 构造小游戏平台环境沙盒 (Mock tt / tt.getFileSystemManager)
const mockUserDir = path.resolve(__dirname, 'mock_user_dir').replace(/\\/g, '/');
if (fs.existsSync(mockUserDir)) {
  fs.rmSync(mockUserDir, { recursive: true, force: true });
}
fs.mkdirSync(mockUserDir, { recursive: true });

const mockFSManager = {
  accessSync: function (p) {
    if (!fs.existsSync(p)) throw new Error('File not found: ' + p);
  },
  mkdirSync: function (p, recursive) {
    fs.mkdirSync(p, { recursive: true });
  },
  readdirSync: function (p) {
    return fs.readdirSync(p);
  },
  statSync: function (p) {
    const s = fs.statSync(p);
    return {
      size: s.size,
      isDirectory: function () { return s.isDirectory(); }
    };
  },
  readFileSync: function (p) {
    const b = fs.readFileSync(p);
    return new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
  },
  writeFileSync: function (p, data) {
    const b = Buffer.from(data);
    fs.writeFileSync(p, b);
  },
  unlinkSync: function (p) {
    fs.unlinkSync(p);
  }
};

let hideCallback = null;
global.tt = {
  env: {
    USER_DATA_PATH: mockUserDir
  },
  getFileSystemManager: function () {
    return mockFSManager;
  },
  onHide: function (cb) {
    hideCallback = cb;
  },
  onError: function () {}
};

// 2. 加载 persistence.js
const MiniGamePersistence = require('../reverse/siyangruchong-tt-minigame/adapter/persistence.js');

// 3. 构造 Mock Emscripten FS
function createMockFS() {
  const tree = {
    '/': { isDir: true, children: {} }
  };

  function normalize(p) {
    return p.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  }

  return {
    analyzePath: function (p) {
      p = normalize(p);
      return { exists: !!tree[p] };
    },
    mkdir: function (p) {
      p = normalize(p);
      tree[p] = { isDir: true, children: {} };
      const parent = p.substring(0, p.lastIndexOf('/')) || '/';
      const name = p.substring(p.lastIndexOf('/') + 1);
      if (tree[parent]) {
        tree[parent].children[name] = true;
      }
    },
    writeFile: function (p, bytes) {
      p = normalize(p);
      const parent = p.substring(0, p.lastIndexOf('/')) || '/';
      const name = p.substring(p.lastIndexOf('/') + 1);
      if (!tree[parent]) {
        this.mkdir(parent);
      }
      tree[p] = { isDir: false, data: new Uint8Array(bytes) };
      tree[parent].children[name] = true;
    },
    readFile: function (p) {
      p = normalize(p);
      if (!tree[p] || tree[p].isDir) throw new Error('Cannot read file: ' + p);
      return tree[p].data;
    },
    readdir: function (p) {
      p = normalize(p);
      if (!tree[p] || !tree[p].isDir) throw new Error('Not a directory: ' + p);
      return Object.keys(tree[p].children);
    },
    stat: function (p) {
      p = normalize(p);
      if (!tree[p]) throw new Error('No such file: ' + p);
      return { mode: tree[p].isDir ? 0o040000 : 0o100000 };
    },
    isDir: function (mode) {
      return (mode & 0o040000) !== 0;
    },
    unlink: function (p) {
      p = normalize(p);
      const parent = p.substring(0, p.lastIndexOf('/')) || '/';
      const name = p.substring(p.lastIndexOf('/') + 1);
      delete tree[p];
      if (tree[parent]) delete tree[parent].children[name];
    }
  };
}

console.log('=== [测试 1] 游戏运行中保存存档 (PlayerPrefs.Save -> Sync) ===');
const fs1 = createMockFS();
fs1.mkdir('/idbfs');
MiniGamePersistence.bindFS(fs1);

// 模拟 Unity 游戏写入 PlayerPrefs
const fakeSaveJson = JSON.stringify({
  version: 1,
  coins: 888888,
  leafScale: 1.05,
  unlockedFoods: ['Crumb', 'Pea', 'Cookie', 'Apple', 'Burger'],
  activeSkills: [101, 102, 103]
});

fs1.mkdir('/idbfs/DefaultCompany_worm-capitalist');
fs1.writeFile('/idbfs/DefaultCompany_worm-capitalist/PlayerPrefs', Buffer.from(fakeSaveJson, 'utf-8'));
fs1.writeFile('/idbfs/Parasites.SaveSystem.worm_capitalist_save.json', Buffer.from(fakeSaveJson, 'utf-8'));

// 触发同步落盘
MiniGamePersistence.sync(fs1, 'PlayerPrefs.Save');

// 校验物理磁盘上的文件
const diskFile1 = path.join(mockUserDir, 'idbfs_storage/DefaultCompany_worm-capitalist/PlayerPrefs');
const diskFile2 = path.join(mockUserDir, 'idbfs_storage/Parasites.SaveSystem.worm_capitalist_save.json');
console.log('物理文件 1 存在:', fs.existsSync(diskFile1));
console.log('物理文件 2 存在:', fs.existsSync(diskFile2));
const readContent1 = fs.readFileSync(diskFile1, 'utf-8');
if (readContent1 === fakeSaveJson) {
  console.log('✓ 物理文件内容与游戏存档完全一致！');
} else {
  throw new Error('物理文件内容不一致！');
}

console.log('\n=== [测试 2] 模拟退出小游戏并重新启动 (Restore 测试) ===');
// 构造一个全新的内存文件系统 (没有任何先验数据)
const fs2 = createMockFS();
fs2.mkdir('/idbfs');
MiniGamePersistence.bindFS(fs2);

// 执行启动还原
const restoredCount = MiniGamePersistence.restore(fs2);
console.log('已还原文件数量:', restoredCount);
if (restoredCount !== 2) {
  throw new Error(`预期还原 2 个文件，实际还原 ${restoredCount} 个！`);
}

// 检查 fs2 内存中的数据是否完美重现
const restoredBytes1 = fs2.readFile('/idbfs/DefaultCompany_worm-capitalist/PlayerPrefs');
const restoredStr1 = Buffer.from(restoredBytes1).toString('utf-8');
const restoredBytes2 = fs2.readFile('/idbfs/Parasites.SaveSystem.worm_capitalist_save.json');
const restoredStr2 = Buffer.from(restoredBytes2).toString('utf-8');

if (restoredStr1 === fakeSaveJson && restoredStr2 === fakeSaveJson) {
  console.log('✓ 重启后历史存档 100% 完美无损还原到虚拟文件系统 /idbfs！');
} else {
  throw new Error('还原后的内容损坏或不一致！');
}

console.log('\n=== [测试 3] 模拟切后台触发 onHide 自动落盘 ===');
// 更新金币数
const updatedSaveJson = JSON.stringify({
  version: 1,
  coins: 9999999,
  leafScale: 1.05
});
fs2.writeFile('/idbfs/DefaultCompany_worm-capitalist/PlayerPrefs', Buffer.from(updatedSaveJson, 'utf-8'));

if (typeof hideCallback === 'function') {
  hideCallback(); // 触发 onHide
}

const readContentUpdated = fs.readFileSync(diskFile1, 'utf-8');
if (readContentUpdated === updatedSaveJson) {
  console.log('✓ onHide 切后台自动落盘成功，最新金币 9999999 已写入磁盘！');
} else {
  throw new Error('onHide 未能成功更新磁盘文件！');
}

// 清理测试临时目录
fs.rmSync(mockUserDir, { recursive: true, force: true });
console.log('\n🎉 所有持久化仿真测试全部 100% 通过！');
