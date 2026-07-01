const fs = require('fs');
const path = 'src/App.jsx';
let text = fs.readFileSync(path, 'utf8');
const oldBlock = '      )}\r\n      </div>\r\n    </div>\r\n';
const newBlock = '      )}\r\n      </div>}\r\n    </div>\r\n';
if (!text.includes(oldBlock)) {
  console.error('Old block not found');
  process.exit(1);
}
text = text.replace(oldBlock, newBlock);
fs.writeFileSync(path, text, 'utf8');
console.log('patched');
