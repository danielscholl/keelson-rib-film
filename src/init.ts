import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

export const STARTER_DIR = new URL("../starter", import.meta.url).pathname;
export const STARTER_PIECE = "first-steps/fig-01-hello";

// A bare "start a library here" is safe only in an empty folder, a git repo, or a library already.
export function isLibrarySite(dir: string): boolean {
  if (!existsSync(dir)) return true;
  if (existsSync(join(dir, ".git")) || existsSync(join(dir, "assets"))) return true;
  return readdirSync(dir).every((name) => name.startsWith("."));
}

export interface InitResult {
  library: string;
  written: string[];
  kept: string[];
}

// Packing drops .gitignore files, so the starter ships it as _gitignore. Never overwrites: a file that already exists is kept as it is.
export function initLibrary(dest: string, starter: string = STARTER_DIR): InitResult {
  const library = resolve(dest);
  const written: string[] = [];
  const kept: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const from = join(dir, name);
      const rel = relative(starter, from)
        .split(sep)
        .join("/")
        .replace(/(^|\/)_gitignore$/, "$1.gitignore");
      const to = join(library, rel);
      if (statSync(from).isDirectory()) {
        walk(from);
        continue;
      }
      if (existsSync(to)) {
        kept.push(rel);
        continue;
      }
      mkdirSync(join(to, ".."), { recursive: true });
      copyFileSync(from, to);
      written.push(rel);
    }
  };
  walk(starter);
  return { library, written, kept };
}
