const fs = require('fs');
const acorn = require('acorn');
const jsx = require('acorn-jsx');
const Parser = acorn.Parser.extend(jsx());
const path = 'src/App.jsx';
let text = fs.readFileSync(path, 'utf8');
const rx = /localStorage\.setItem\(`gh_tier_\$\{user\.id\}`, t\);/;
console.log('found', rx.test(text));
if (rx.test(text)) {
  text = text.replace(rx, "localStorage.setItem('gh_tier_' + user.id, t);");
}
try {
  Parser.parse(text, { ecmaVersion: 'latest', sourceType: 'module' });
  console.log('parsed');
} catch (e) {
  console.error('parse fail', e.toString());
  process.exit(1);
}
