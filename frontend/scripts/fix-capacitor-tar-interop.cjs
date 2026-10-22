const fs = require('node:fs');
const path = require('node:path');

const capacitorTemplatePath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@capacitor',
  'cli',
  'dist',
  'util',
  'template.js',
);

if (!fs.existsSync(capacitorTemplatePath)) {
  process.exit(0);
}

const original = fs.readFileSync(capacitorTemplatePath, 'utf8');
const brokenImport = 'const tar_1 = tslib_1.__importDefault(require("tar"));';
const brokenCall = 'tar_1.default.extract({ file: src, cwd: dir })';
const fixedImport = 'const tar_1 = require("tar");';
const fixedCall = 'tar_1.extract({ file: src, cwd: dir })';

if (original.includes(fixedImport) && original.includes(fixedCall)) {
  process.exit(0);
}

if (!original.includes(brokenImport) || !original.includes(brokenCall)) {
  throw new Error(
    'Capacitor CLI tar import changed; review scripts/fix-capacitor-tar-interop.cjs before continuing.',
  );
}

const patched = original.replace(brokenImport, fixedImport).replace(brokenCall, fixedCall);
fs.writeFileSync(capacitorTemplatePath, patched);
