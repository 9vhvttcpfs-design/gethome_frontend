var sharp = require('sharp');
var fs = require('fs');
var path = require('path');

var svgPath = path.join(__dirname, 'public', 'gethome-icon.svg');
var svg = fs.readFileSync(svgPath);

var sizes = [
  { name: 'icon-192.png',        size: 192 },
  { name: 'icon-512.png',        size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

Promise.all(sizes.map(function(s) {
  return sharp(svg)
    .resize(s.size, s.size)
    .png()
    .toFile(path.join(__dirname, 'public', s.name))
    .then(function() { console.log('Generated ' + s.name); });
})).then(function() {
  console.log('All icons generated.');
}).catch(function(err) {
  console.error('Error:', err.message);
  process.exit(1);
});
