import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const monitor=path.join(root,fs.existsSync(path.join(root,'SN/monitor'))?'SN/monitor':'monitor');
