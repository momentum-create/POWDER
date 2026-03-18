const fs = require('fs');
const path = require('path');
const j = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/resort-names-en.json'), 'utf8'));
const lines = ['window.__RESORT_NAMES_EN__ = {'];
for (const k of Object.keys(j)) {
  const v = String(j[k] || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  lines.push('  "' + k + '": "' + v + '",');
}
lines[lines.length - 1] = lines[lines.length - 1].replace(/,\s*$/, '');
lines.push('};');
fs.writeFileSync(path.join(__dirname, '../data/resort-names-en.js'), lines.join('\n'), 'utf8');
console.log('Wrote data/resort-names-en.js');
