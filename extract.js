const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'public', 'index.html');
const cssPath = path.join(__dirname, 'public', 'css', 'styles.css');
const jsPath = path.join(__dirname, 'public', 'js', 'main.js');

// Ensure directories exist
if (!fs.existsSync(path.join(__dirname, 'public', 'css'))) {
    fs.mkdirSync(path.join(__dirname, 'public', 'css'));
}
if (!fs.existsSync(path.join(__dirname, 'public', 'js'))) {
    fs.mkdirSync(path.join(__dirname, 'public', 'js'));
}

const content = fs.readFileSync(indexPath, 'utf-8');
const lines = content.split('\n');

// Find boundaries
const styleStart = lines.findIndex(l => l.includes('<style>'));
const styleEnd = lines.findIndex(l => l.includes('</style>'));

let scriptStart = -1;
let scriptEnd = -1;
for (let i = styleEnd; i < lines.length; i++) {
    if (lines[i].includes('<script>') && scriptStart === -1) {
        scriptStart = i;
    } else if (lines[i].includes('</script>') && scriptStart !== -1 && scriptEnd === -1) {
        scriptEnd = i;
        break; // First script block is the main.js, the second is the Three.js one we added
    }
}

console.log(`Style: ${styleStart} to ${styleEnd}`);
console.log(`Script: ${scriptStart} to ${scriptEnd}`);

const cssContent = lines.slice(styleStart + 1, styleEnd).join('\n');
const jsContent = lines.slice(scriptStart + 1, scriptEnd).join('\n');

fs.writeFileSync(cssPath, cssContent);
fs.writeFileSync(jsPath, jsContent);

// Reconstruct index.html
const newLines = [
    ...lines.slice(0, styleStart),
    '  <link rel="stylesheet" href="/css/styles.css">',
    ...lines.slice(styleEnd + 1, scriptStart),
    '  <script src="/js/main.js" defer></script>',
    ...lines.slice(scriptEnd + 1)
];

// Further clean up: remove the second <script> block containing the old Three.js
const finalHtml = newLines.join('\n');
// Regex to remove the second script block we added previously
const cleanHtml = finalHtml.replace(/<script>\s*\/\/\s*=====================\s*\/\/\s*THREE\.JS HERO CORE[\s\S]*?<\/script>/g, '');

fs.writeFileSync(indexPath, cleanHtml);

console.log("Extraction complete.");
