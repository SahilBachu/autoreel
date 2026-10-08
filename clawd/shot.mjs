// shot.mjs: run the kit's render.mjs inside one job folder.
//   node shot.mjs jobs/<id> --sheet=0.5,1.5 --out=out/sheet.jpg     (same flags as render.mjs)
// render.mjs reads studio.html and writes out/ relative to the working directory; this lets the
// shot author (and the bot) stay in clawd/ and still render any job.
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [job, ...rest] = process.argv.slice(2);
if (!job) { console.error('usage: node shot.mjs jobs/<id> <render.mjs flags>'); process.exit(1); }
process.chdir(resolve(here, job));
process.argv = [process.argv[0], resolve(here, 'render.mjs'), ...rest];
await import(pathToFileURL(resolve(here, 'render.mjs')).href);
