import fs from 'fs';
import path from 'path';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
console.log(Object.keys(config));
