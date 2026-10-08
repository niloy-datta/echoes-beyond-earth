// Post-build fix for the static export: Next writes nested route segment prefetch files as
// directories (explore/__next.explore/__PAGE__.txt) while the client router requests the
// flat dotted name (explore/__next.explore.__PAGE__.txt), as it already does for "/".
// Copying each file to its flat name keeps client-side prefetching working on any static host.
import { copyFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "out");
let copied = 0;

function files(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

function walk(dir) {
  // Snapshot entries before writing flattened files. Next 16 may expose nested
  // segment folders while the export is being traversed.
  for (const name of [...readdirSync(dir)]) {
    const p = join(dir, name);
    if (!statSync(p).isDirectory() || name === "_next") continue;
    if (name.startsWith("__next.")) {
      for (const f of files(p)) {
        if (!existsSync(f)) continue;
        const destination = join(dir, `${name}.${relative(p, f).split(/[\/]/).join(".")}`);
        if (f === destination) continue;
        try {
          copyFileSync(f, destination);
          copied++;
        } catch (error) {
          // A concurrent export cleanup can remove a transient prefetch file.
          // The HTML export remains valid without that optional optimization.
          if (error?.code !== "ENOENT") throw error;
        }
      }
    } else {
      walk(p);
    }
  }
}

walk(out);
console.log(`✓ flattened ${copied} segment prefetch files`);
