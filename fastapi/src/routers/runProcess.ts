import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";

/** Mimics Python's str.title(): capitalise each run of letters, lowercase the rest. */
function title(s: string): string {
  return s.replace(/\p{L}+/gu, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

/** Rewrites [label](slug.md) links to <b>Label</b>, in place. */
export async function mdLinksToHtml(inputFile: string): Promise<void> {
  const pattern = /\[([^\]]+)\]\(([^)]+)\.md\)/g;
  const text = await readFile(inputFile, "utf8");
  const out = text.replace(pattern, (_m, label: string) => `<b>${title(label)}</b>`);
  await writeFile(inputFile, out);
}

/** Runs a command in the working directory and returns its stdout. */
export function render(command: string[]): Promise<string> {
  const [file, ...args] = command;
  return new Promise((resolve) => {
    execFile(file, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }, (_err, stdout) => {
      resolve(stdout ?? "");
    });
  });
}
