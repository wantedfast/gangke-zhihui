import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceDirs = ["app", "lib", "types", "scripts"];
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".mjs"]);
const failures = [];

async function listFiles(dir) {
  const absoluteDir = path.join(root, dir);
  const entries = await readdir(absoluteDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(relativePath)));
    } else if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(relativePath);
    }
  }

  return files;
}

function fail(file, message) {
  failures.push(`${file}: ${message}`);
}

const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
if (packageJson.scripts?.lint === "next build") {
  fail("package.json", "lint script must not alias next build");
}

const files = [];
for (const dir of sourceDirs) {
  try {
    if ((await stat(path.join(root, dir))).isDirectory()) {
      files.push(...(await listFiles(dir)));
    }
  } catch {
    // Optional source directory.
  }
}

for (const file of files) {
  if (file === path.join("scripts", "lint.mjs")) {
    continue;
  }

  const content = await readFile(path.join(root, file), "utf8");
  const isApiRoute = file.startsWith(`app${path.sep}api${path.sep}`);

  if (!isApiRoute && /DEEPSEEK_API_KEY|api\.deepseek\.com|deepseek-v4-flash/.test(content)) {
    fail(file, "DeepSeek server config must stay out of client/shared code");
  }

  if (/后续切片接入|当前切片未实现|当前交付尚未覆盖/.test(content)) {
    fail(file, "stale placeholder copy remains");
  }

  if (/console\.(log|debug|warn|error)\(/.test(content)) {
    fail(file, "console debugging statement remains");
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`lint passed (${files.length} files checked)`);
