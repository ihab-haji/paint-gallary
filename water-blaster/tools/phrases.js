// Prints every sentence Water Blaster Arena can say, per language, as JSON (read from ../words.js).
// Usage: node tools/phrases.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'words.js'), 'utf8'), sandbox);
const words = sandbox.window.WB_WORDS;
process.stdout.write(JSON.stringify({ar: words.phrases('ar'), en: words.phrases('en')}));
