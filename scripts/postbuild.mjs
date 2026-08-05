/* Copy production-only security headers into the build output.
 * Kept out of public/ so they don't apply to the Vite dev server, whose
 * inline HMR preamble would be blocked by the strict script-src policy. */
import { copyFile } from 'node:fs/promises';

await copyFile(new URL('../config/_headers', import.meta.url), new URL('../dist/_headers', import.meta.url));
console.log('postbuild: security headers written to dist/_headers');
