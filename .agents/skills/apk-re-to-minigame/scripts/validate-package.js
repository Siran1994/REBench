#!/usr/bin/env node
/**
 * ByteDance MiniGame Package Validator
 * Validates:
 *  1. Main package size <= 4.0 MB limit
 *  2. Subpackages defined in game.json have required game.js entry file
 *  3. Essential polyfills and adapters exist (tt-c3-adapter.js, game.js)
 *  4. Reserved word collisions (e.g. class switch) in scripts
 */

const fs = require('fs');
const path = require('path');

const MAX_MAIN_PACKAGE_BYTES = 4 * 1024 * 1024; // 4.0 MB

function getDirectorySizeBytes(dir, excludePaths = []) {
  let total = 0;
  if (!fs.existsSync(dir)) return 0;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Check if this path should be excluded
    const isExcluded = excludePaths.some(p => {
      const absExclude = path.resolve(p);
      const absCurrent = path.resolve(fullPath);
      return absCurrent === absExclude || absCurrent.startsWith(absExclude + path.sep);
    });

    if (isExcluded) continue;

    if (entry.isDirectory()) {
      total += getDirectorySizeBytes(fullPath, excludePaths);
    } else if (entry.isFile()) {
      total += fs.statSync(fullPath).size;
    }
  }
  return total;
}

function validateProject(projectDir) {
  console.log(`[validate-package] Validating ByteDance MiniGame project: ${projectDir}\n`);
  const root = path.resolve(projectDir);
  const errors = [];
  const warnings = [];

  // 1. Check game.json
  const gameJsonPath = path.join(root, 'game.json');
  if (!fs.existsSync(gameJsonPath)) {
    errors.push(`Missing 'game.json' in project root.`);
    return { success: false, errors, warnings };
  }

  let gameConfig = {};
  try {
    gameConfig = JSON.parse(fs.readFileSync(gameJsonPath, 'utf-8'));
  } catch (err) {
    errors.push(`Invalid JSON format in game.json: ${err.message}`);
    return { success: false, errors, warnings };
  }

  // 2. Check game.js entry
  const gameJsPath = path.join(root, 'game.js');
  if (!fs.existsSync(gameJsPath)) {
    errors.push(`Missing main game entry 'game.js'.`);
  }

  // 3. Check Subpackages & ensure each has game.js
  const subpackages = gameConfig.subPackages || gameConfig.subpackages || [];
  const subpackageDirs = [];

  console.log(`[validate-package] Subpackages configured in game.json: ${subpackages.length}`);
  for (const sub of subpackages) {
    const subRoot = sub.root || sub.name;
    const subPath = path.join(root, subRoot);
    subpackageDirs.push(subPath);

    if (!fs.existsSync(subPath)) {
      errors.push(`Subpackage directory not found: '${subRoot}'`);
      continue;
    }

    const subGameJs = path.join(subPath, 'game.js');
    if (!fs.existsSync(subGameJs)) {
      errors.push(`ByteDance Compiler Requirement: Subpackage '${subRoot}' MUST contain a 'game.js' entry file! (Missing ${path.relative(root, subGameJs)})`);
    } else {
      console.log(`  ✓ Subpackage '${subRoot}' entry verified: game.js`);
    }
  }

  // 4. Check Main Package Size
  const mainPackageBytes = getDirectorySizeBytes(root, subpackageDirs);
  const mainPackageMB = (mainPackageBytes / (1024 * 1024)).toFixed(3);
  console.log(`\n[validate-package] Main Package Size: ${mainPackageMB} MB (${mainPackageBytes} bytes)`);

  if (mainPackageBytes > MAX_MAIN_PACKAGE_BYTES) {
    errors.push(`Main package exceeds ByteDance 4.0 MB limit! Size is ${mainPackageMB} MB (${mainPackageBytes} bytes). Please move images/media/data into subpackages.`);
  } else {
    console.log(`  ✓ Main package is within 4.0 MB limit (Remaining allowance: ${(4 - mainPackageMB).toFixed(3)} MB)`);
  }

  // 5. Check Adapter & Polyfills
  const adapterPath = path.join(root, 'adapter', 'tt-c3-adapter.js');
  if (!fs.existsSync(adapterPath)) {
    warnings.push(`Missing 'adapter/tt-c3-adapter.js'. Ensure custom adapter is loaded.`);
  } else {
    const adapterCode = fs.readFileSync(adapterPath, 'utf-8');
    if (!adapterCode.includes('visualViewport')) {
      warnings.push(`'tt-c3-adapter.js' does not contain 'visualViewport' polyfill. Android may experience black screen!`);
    }
  }

  // 6. Check Syntax & Reserved Word Conflicts (SWC Parser issues)
  const scriptsToCheck = [
    path.join(root, 'scripts', 'objRefTable.js'),
    path.join(root, 'scripts', 'modernjscheck.js')
  ];

  for (const scriptPath of scriptsToCheck) {
    if (fs.existsSync(scriptPath)) {
      const code = fs.readFileSync(scriptPath, 'utf-8');
      if (code.includes('switch: class extends') || code.includes('class switch') || code.includes('function switch(')) {
        errors.push(`Reserved word conflict in '${path.relative(root, scriptPath)}': 'switch' used as identifier. ByteDance SWC compiler will fail! Rename to 'SwitchObject' or '_switch'.`);
      }
      if (scriptPath.endsWith('modernjscheck.js') && code.includes('#p')) {
        warnings.push(`'modernjscheck.js' contains private field syntax (#p). Verify it does not cause syntax error in older minigame engines.`);
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  if (errors.length > 0) {
    console.error(`[validate-package] FAILED with ${errors.length} error(s):`);
    for (const e of errors) console.error(`  ✖ ${e}`);
  }
  if (warnings.length > 0) {
    console.warn(`[validate-package] ${warnings.length} warning(s):`);
    for (const w of warnings) console.warn(`  ⚠ ${w}`);
  }
  if (errors.length === 0) {
    console.log(`[validate-package] SUCCESS: MiniGame package complies with ByteDance standards!`);
  }
  console.log('='.repeat(50) + '\n');

  return {
    success: errors.length === 0,
    errors,
    warnings,
    mainPackageBytes,
    mainPackageMB
  };
}

const target = process.argv[2] || '.';
const result = validateProject(target);
process.exit(result.success ? 0 : 1);
