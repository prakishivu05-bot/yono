const fs = require('fs');

let html = fs.readFileSync('c:/Users/Admin/Desktop/Yono/yono.html', 'utf8');
let newScript = fs.readFileSync('c:/Users/Admin/Desktop/Yono/scriptContent.js', 'utf8');

const scriptStart = html.indexOf('<script>') + '<script>'.length;
const scriptEnd = html.lastIndexOf('</script>');

html = html.substring(0, scriptStart) + '\n' + newScript + '\n' + html.substring(scriptEnd);
fs.writeFileSync('c:/Users/Admin/Desktop/Yono/yono.html', html);
console.log('Injected successfully');
