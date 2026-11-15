import { createRequire } from "node:module";
// ── Windows Node.js compatibility (auto-generated) ──
import { fileURLToPath as _ftp } from "node:url";
import { dirname as _dn } from "node:path";
const __browseNodeSrcDir = _dn(_dn(_ftp(import.meta.url))) + "/src";
{ const _r = createRequire(import.meta.url); _r("./bun-polyfill.cjs"); }
// ── end compatibility ──
var __esm = (fn, res, err) => () => {
  if (fn)
    try {
      res = fn(fn = 0);
    } catch (e) {
      err = [e];
    }
  if (err)
    throw err[0];
  return res;
};
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// browse/src/file-permissions.ts
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
function currentUserSid() {
  if (cachedSid !== undefined)
    return cachedSid;
  try {
    const systemRoot = process.env.SystemRoot || process.env.windir || "C:\\Windows";
    const out = execFileSync(`${systemRoot}\\System32\\whoami.exe`, ["/user", "/fo", "csv", "/nh"], {
      encoding: "utf8",
      windowsHide: true
    });
    const match = out.match(/S-1-[\d-]+/);
    cachedSid = match ? match[0] : null;
  } catch {
    cachedSid = null;
  }
  return cachedSid;
}
function currentUserPrincipal() {
  const sid = currentUserSid();
  if (sid)
    return `*${sid}`;
  const domain = process.env.USERDOMAIN || os.hostname();
  return `${domain}\\${os.userInfo().username}`;
}
function warnIcaclsFailure(fsPath, err) {
  if (warnedOnce)
    return;
  warnedOnce = true;
  const msg = err instanceof Error ? err.message : String(err);
  console.warn(`[gstack] Failed to restrict Windows ACL on ${fsPath}: ${msg}
` + `  Sensitive files may be readable by other accounts on this machine.
` + `  This warning appears once per process; subsequent failures are silent.`);
}
function restrictFilePermissions(filePath) {
  if (process.platform === "win32") {
    try {
      const user = currentUserPrincipal();
      execFileSync("icacls", [filePath, "/inheritance:r", "/grant:r", `${user}:(F)`], { stdio: "ignore", windowsHide: true });
    } catch (err) {
      warnIcaclsFailure(filePath, err);
    }
    return;
  }
  try {
    fs.chmodSync(filePath, 384);
  } catch {}
}
function restrictDirectoryPermissions(dirPath) {
  try {
    if (fs.lstatSync(dirPath).isSymbolicLink()) {
      console.warn(`[gstack] Refusing to restrict permissions through symlink ${dirPath} — skipping.
` + `  Restricting through a symlink would alter the link target instead. ` + `Harden the real directory directly.`);
      return;
    }
  } catch {}
  if (process.platform === "win32") {
    try {
      const user = currentUserPrincipal();
      execFileSync("icacls", [dirPath, "/inheritance:r", "/grant:r", `${user}:(OI)(CI)(F)`], { stdio: "ignore", windowsHide: true });
    } catch (err) {
      warnIcaclsFailure(dirPath, err);
    }
    return;
  }
  try {
    const fd = fs.openSync(dirPath, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
    try {
      if (!shouldHardenDir(fs.fstatSync(fd))) {
        warnUnhardenedDirOnce(dirPath);
        return;
      }
      fs.fchmodSync(fd, 448);
    } finally {
      fs.closeSync(fd);
    }
  } catch (err) {
    if (err?.code === "EACCES") {
      try {
        const st = fs.lstatSync(dirPath);
        if (st.isDirectory() && shouldHardenDir(st)) {
          fs.chmodSync(dirPath, 448);
          return;
        }
      } catch {}
    }
    if (err?.code === "ELOOP" || err?.code === "ENOTDIR" || err?.code === "EACCES") {
      warnUnhardenedDirOnce(dirPath);
    }
  }
}
function shouldHardenDir(st) {
  const uid = process.geteuid?.() ?? process.getuid?.();
  if (st.uid !== uid)
    return false;
  if ((st.mode & 514) === 514)
    return false;
  if (uid === 0 && (st.mode & 2) === 2)
    return false;
  return true;
}
function warnUnhardenedDirOnce(dirPath) {
  if (unhardenedWarned.has(dirPath))
    return;
  unhardenedWarned.add(dirPath);
  console.warn(`[gstack] directory ${dirPath} is shared, symlinked, or owned by another user; ` + "gstack left its permissions untouched — use a private, non-symlinked directory for owner-only hardening");
}
function writeSecureFile(filePath, data) {
  fs.writeFileSync(filePath, data, { mode: 384 });
  restrictFilePermissions(filePath);
}
function appendSecureFile(filePath, data) {
  const existed = fs.existsSync(filePath);
  const payload = typeof data === "string" ? data : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  fs.appendFileSync(filePath, payload, { mode: 384 });
  if (!existed)
    restrictFilePermissions(filePath);
}
function canListDir(dirPath) {
  try {
    fs.readdirSync(dirPath);
    return true;
  } catch {
    return false;
  }
}
function repairBrokenDacl(dirPath) {
  if (process.platform !== "win32")
    return;
  try {
    execFileSync("icacls", [dirPath, "/reset", "/T", "/C", "/Q"], { stdio: "ignore", windowsHide: true });
  } catch (err) {
    warnIcaclsFailure(dirPath, err);
  }
}
function isExistingDirectory(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}
function mkdirSecure(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true, mode: 448 });
  } catch (err) {
    if (err?.code !== "EEXIST" || !isExistingDirectory(dirPath))
      throw err;
  }
  restrictDirectoryPermissions(dirPath);
  if (process.platform === "win32" && !canListDir(dirPath)) {
    repairBrokenDacl(dirPath);
    restrictDirectoryPermissions(dirPath);
    if (!canListDir(dirPath))
      repairBrokenDacl(dirPath);
  }
}
var warnedOnce = false, cachedSid, unhardenedWarned;
var init_file_permissions = __esm(() => {
  unhardenedWarned = new Set;
});

// browse/src/buffers.ts
class CircularBuffer {
  buffer;
  head = 0;
  _size = 0;
  _totalAdded = 0;
  capacity;
  constructor(capacity) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }
  push(entry) {
    const index = (this.head + this._size) % this.capacity;
    this.buffer[index] = entry;
    if (this._size < this.capacity) {
      this._size++;
    } else {
      this.head = (this.head + 1) % this.capacity;
    }
    this._totalAdded++;
  }
  toArray() {
    const result = [];
    for (let i = 0;i < this._size; i++) {
      result.push(this.buffer[(this.head + i) % this.capacity]);
    }
    return result;
  }
  last(n) {
    const count = Math.min(n, this._size);
    const result = [];
    const start = (this.head + this._size - count) % this.capacity;
    for (let i = 0;i < count; i++) {
      result.push(this.buffer[(start + i) % this.capacity]);
    }
    return result;
  }
  get length() {
    return this._size;
  }
  get totalAdded() {
    return this._totalAdded;
  }
  clear() {
    this.head = 0;
    this._size = 0;
  }
  get(index) {
    if (index < 0 || index >= this._size)
      return;
    return this.buffer[(this.head + index) % this.capacity];
  }
  set(index, entry) {
    if (index < 0 || index >= this._size)
      return;
    this.buffer[(this.head + index) % this.capacity] = entry;
  }
}
function addConsoleEntry(entry) {
  consoleBuffer.push(entry);
}
function addNetworkEntry(entry) {
  networkBuffer.push(entry);
}
function addDialogEntry(entry) {
  dialogBuffer.push(entry);
}
var HIGH_WATER_MARK = 50000, consoleBuffer, networkBuffer, dialogBuffer;
var init_buffers = __esm(() => {
  consoleBuffer = new CircularBuffer(HIGH_WATER_MARK);
  networkBuffer = new CircularBuffer(HIGH_WATER_MARK);
  dialogBuffer = new CircularBuffer(HIGH_WATER_MARK);
});

// browse/src/activity.ts
function filterArgs(command, args) {
  if (!args || args.length === 0)
    return args;
  if (command === "fill" && args.length >= 2) {
    const selector = args[0];
    if (/password|passwd|secret|token/i.test(selector)) {
      return [selector, "[REDACTED]"];
    }
    return args;
  }
  if (command === "header" && args.length >= 1) {
    const headerLine = args[0];
    if (/^(authorization|x-api-key|cookie|set-cookie)/i.test(headerLine)) {
      const colonIdx = headerLine.indexOf(":");
      if (colonIdx > 0) {
        return [headerLine.substring(0, colonIdx + 1) + "[REDACTED]"];
      }
    }
    return args;
  }
  if (command === "cookie" && args.length >= 1) {
    const cookieStr = args[0];
    const eqIdx = cookieStr.indexOf("=");
    if (eqIdx > 0) {
      return [cookieStr.substring(0, eqIdx + 1) + "[REDACTED]"];
    }
    return args;
  }
  if (command === "type") {
    return ["[REDACTED]"];
  }
  return args.map((arg) => {
    if (arg.startsWith("http://") || arg.startsWith("https://")) {
      try {
        const url = new URL(arg);
        let redacted = false;
        for (const key of url.searchParams.keys()) {
          if (SENSITIVE_PARAM_PATTERN.test(key)) {
            url.searchParams.set(key, "[REDACTED]");
            redacted = true;
          }
        }
        return redacted ? url.toString() : arg;
      } catch {
        return arg;
      }
    }
    return arg;
  });
}
function truncateResult(result) {
  if (!result)
    return;
  if (result.length <= 200)
    return result;
  return result.substring(0, 200) + "...";
}
function emitActivity(entry) {
  const full = {
    ...entry,
    id: nextId++,
    timestamp: Date.now(),
    args: entry.args ? filterArgs(entry.command || "", entry.args) : undefined,
    result: truncateResult(entry.result)
  };
  activityBuffer.push(full);
  for (const notify of subscribers) {
    queueMicrotask(() => {
      try {
        notify(full);
      } catch {}
    });
  }
  return full;
}
function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}
function getActivityAfter(afterId) {
  const total = activityBuffer.totalAdded;
  const allEntries = activityBuffer.toArray();
  if (afterId === 0) {
    return { entries: allEntries, gap: false, totalAdded: total };
  }
  const oldestId = allEntries.length > 0 ? allEntries[0].id : nextId;
  if (afterId < oldestId) {
    return {
      entries: allEntries,
      gap: true,
      gapFrom: afterId + 1,
      availableFrom: oldestId,
      totalAdded: total
    };
  }
  const filtered = allEntries.filter((e) => e.id > afterId);
  return { entries: filtered, gap: false, totalAdded: total };
}
function getActivityHistory(limit = 50) {
  const allEntries = activityBuffer.toArray();
  const sliced = limit < allEntries.length ? allEntries.slice(-limit) : allEntries;
  return { entries: sliced, totalAdded: activityBuffer.totalAdded };
}
function getSubscriberCount() {
  return subscribers.size;
}
var BUFFER_CAPACITY = 1000, activityBuffer, nextId = 1, subscribers, SENSITIVE_COMMANDS, SENSITIVE_PARAM_PATTERN;
var init_activity = __esm(() => {
  init_buffers();
  activityBuffer = new CircularBuffer(BUFFER_CAPACITY);
  subscribers = new Set;
  SENSITIVE_COMMANDS = new Set(["fill", "type", "cookie", "header"]);
  SENSITIVE_PARAM_PATTERN = /\b(password|token|secret|key|auth|bearer|api[_-]?key)\b/i;
});

// browse/src/platform.ts
import * as os2 from "os";
import * as path from "path";
function trustableTmpdir(dir) {
  const resolved = path.resolve(dir);
  const home = os2.homedir();
  if (resolved === path.parse(resolved).root)
    return false;
  if (resolved === home)
    return false;
  return !isPathWithin(path.resolve(process.cwd()), resolved) || isPathWithin(resolved, TEMP_DIR);
}
function isPathWithin(resolvedPath, dir) {
  return resolvedPath === dir || resolvedPath.startsWith(dir + path.sep);
}
var IS_WINDOWS, TEMP_DIR, TEMP_DIRS;
var init_platform = __esm(() => {
  IS_WINDOWS = process.platform === "win32";
  TEMP_DIR = IS_WINDOWS ? os2.tmpdir() : "/tmp";
  TEMP_DIRS = [...new Set([TEMP_DIR, os2.tmpdir()].filter((d, i) => i === 0 || trustableTmpdir(d)))];
});

// browse/src/path-security.ts
import * as fs2 from "fs";
import * as path2 from "path";
function resolveRealPath(filePath) {
  const absolute = path2.resolve(filePath);
  try {
    return realpath(absolute);
  } catch (err) {
    const parent = path2.dirname(absolute);
    if (err?.code !== "ENOENT" || parent === absolute)
      throw err;
    return path2.join(resolveRealPath(parent), foldMissing(path2.basename(absolute)));
  }
}
function validateOutputPath(filePath) {
  const reject = () => {
    throw new Error(`Path must be within: ${SAFE_DIRECTORIES.join(", ")}`);
  };
  for (const spelling of new Set([filePath, path2.resolve(filePath)])) {
    const root = path2.parse(spelling).root;
    let resolved = path2.resolve(root || ".");
    for (const component of spelling.slice(root.length).split(process.platform === "win32" ? /[\\/]+/ : /\/+/)) {
      if (!component || component === ".")
        continue;
      if (component === "..") {
        resolved = path2.dirname(resolved);
        continue;
      }
      const next = path2.join(resolved, component);
      try {
        fs2.lstatSync(next);
      } catch (err) {
        resolved = path2.join(resolved, foldMissing(component));
        if (err?.code === "ENOENT" && SAFE_DIRECTORIES.some((dir) => isPathWithin(resolved, dir)))
          continue;
        reject();
      }
      try {
        resolved = realpath(next);
      } catch {
        reject();
      }
    }
    if (!SAFE_DIRECTORIES.some((dir) => isPathWithin(resolved, dir)))
      reject();
  }
}
function validateReadPath(filePath) {
  let realPath;
  try {
    realPath = resolveRealPath(filePath);
  } catch (err) {
    throw new Error(`Cannot resolve real path: ${filePath} (${err.code})`);
  }
  const isSafe = SAFE_DIRECTORIES.some((dir) => isPathWithin(realPath, dir));
  if (!isSafe) {
    throw new Error(`Path must be within: ${SAFE_DIRECTORIES.join(", ")}`);
  }
}
function validateTempPath(filePath) {
  let realPath;
  try {
    realPath = realpath(path2.resolve(filePath));
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error("File not found");
    }
    throw new Error(`Cannot resolve path: ${filePath}`);
  }
  const isSafe = TEMP_ONLY.some((dir) => isPathWithin(realPath, dir));
  if (!isSafe) {
    throw new Error(`Path must be within: ${TEMP_ONLY.join(", ")} (remote file serving is restricted to temp directory)`);
  }
}
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
var realpath, foldMissing = (component) => process.platform === "win32" ? component.toLowerCase() : component, resolveSafeDir = (dir) => {
  try {
    return resolveRealPath(dir);
  } catch {
    return path2.resolve(dir);
  }
}, SAFE_DIRECTORIES, TEMP_ONLY;
var init_path_security = __esm(() => {
  init_platform();
  realpath = fs2.realpathSync.native;
  SAFE_DIRECTORIES = [...TEMP_DIRS, process.cwd()].map(resolveSafeDir);
  TEMP_ONLY = [TEMP_DIR].map(resolveSafeDir);
});

// browse/src/url-validation.ts
import { fileURLToPath, pathToFileURL } from "node:url";
import * as path3 from "node:path";
import * as os3 from "node:os";
function classifyAddress(host) {
  let h = host.trim().toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!h)
    return null;
  if (h.includes(":")) {
    try {
      h = new URL(`http://[${h}]/`).hostname.slice(1, -1);
    } catch {
      return null;
    }
    const groups = expandIpv6(h);
    if (!groups)
      return null;
    const head = groups.slice(0, 6).map((g) => g.toString(16)).join(":");
    if (head === "0:0:0:0:0:ffff" || head === "64:ff9b:0:0:0:0" || head === "0:0:0:0:0:0" && groups[6] !== 0) {
      return classifyIpv4([groups[6] >> 8, groups[6] & 255, groups[7] >> 8, groups[7] & 255]);
    }
    if (groups.every((g, i) => g === (i === 7 ? 1 : 0)))
      return "loopback";
    if ((groups[0] & 65024) === 64512 || (groups[0] & 65472) === 65152)
      return "blocked";
    return "other";
  }
  try {
    h = new URL(`http://${h}/`).hostname;
  } catch {
    return null;
  }
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
  return m ? classifyIpv4(m.slice(1).map(Number)) : null;
}
function classifyIpv4([a, b, c, d]) {
  if (a === 169 && b === 254)
    return "blocked";
  if (a === 100 && b === 100 && c === 100 && d === 200)
    return "blocked";
  return a === 127 ? "loopback" : "other";
}
function expandIpv6(addr) {
  const halves = addr.split("::");
  if (halves.length > 2)
    return null;
  const parse = (part) => (part ? part.split(":") : []).map((g) => parseInt(g, 16));
  const head = parse(halves[0]);
  const tail = halves.length === 2 ? parse(halves[1]) : [];
  const fill = 8 - head.length - tail.length;
  if (fill < 0 || halves.length === 1 && fill !== 0)
    return null;
  const groups = [...head, ...Array(fill).fill(0), ...tail];
  return groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 65535) ? groups : null;
}
async function resolvesToBlockedIp(hostname) {
  try {
    const { resolve4, resolve6 } = (await import("node:dns")).promises;
    const check = (lookup) => lookup.then((addresses) => addresses.some((addr) => classifyAddress(addr) === "blocked"), () => false);
    const [v4, v6] = await Promise.all([check(resolve4(hostname)), check(resolve6(hostname))]);
    return v4 || v6;
  } catch {
    return false;
  }
}
async function blockedNavigationReason(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
    return null;
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  const kind = classifyAddress(hostname);
  if (kind === "blocked" || BLOCKED_METADATA_HOSTNAMES.has(hostname)) {
    return `Blocked: ${parsed.hostname} is a cloud metadata or link-local address. Access is denied for security.`;
  }
  if (kind !== null || hostname === "localhost")
    return null;
  if (await resolvesToBlockedIp(hostname)) {
    return `Blocked: ${parsed.hostname} resolves to a cloud metadata or link-local address. Possible DNS rebinding attack.`;
  }
  return null;
}
function normalizeFileUrl(url) {
  if (!url.toLowerCase().startsWith("file:"))
    return url;
  const qIdx = url.indexOf("?");
  const hIdx = url.indexOf("#");
  let delimIdx = -1;
  if (qIdx >= 0 && hIdx >= 0)
    delimIdx = Math.min(qIdx, hIdx);
  else if (qIdx >= 0)
    delimIdx = qIdx;
  else if (hIdx >= 0)
    delimIdx = hIdx;
  const pathPart = delimIdx >= 0 ? url.slice(0, delimIdx) : url;
  const trailing = delimIdx >= 0 ? url.slice(delimIdx) : "";
  const rest = pathPart.slice("file:".length);
  if (rest.startsWith("///")) {
    if (rest === "///" || rest === "////") {
      throw new Error("Invalid file URL: file:/// has no path. Use file:///<absolute-path>.");
    }
    return pathPart + trailing;
  }
  if (!rest.startsWith("//")) {
    throw new Error(`Invalid file URL: ${url}. Use file:///<absolute-path> or file://./<rel> or file://~/<rel>.`);
  }
  const afterDoubleSlash = rest.slice(2);
  if (afterDoubleSlash === "") {
    throw new Error("Invalid file URL: file:// is empty. Use file:///<absolute-path>.");
  }
  if (afterDoubleSlash === "." || afterDoubleSlash === "./") {
    throw new Error("Invalid file URL: file://./ would list the current directory. Use file://./<filename> to render a specific file.");
  }
  if (afterDoubleSlash === "~" || afterDoubleSlash === "~/") {
    throw new Error("Invalid file URL: file://~/ would list the home directory. Use file://~/<filename> to render a specific file.");
  }
  if (afterDoubleSlash.startsWith("~/")) {
    const rel = afterDoubleSlash.slice(2);
    const absPath = path3.join(os3.homedir(), rel);
    return pathToFileURL(absPath).href + trailing;
  }
  if (afterDoubleSlash.startsWith("./")) {
    const rel = afterDoubleSlash.slice(2);
    const absPath = path3.resolve(process.cwd(), rel);
    return pathToFileURL(absPath).href + trailing;
  }
  if (afterDoubleSlash.toLowerCase().startsWith("localhost/")) {
    return pathPart + trailing;
  }
  const firstSlash = afterDoubleSlash.indexOf("/");
  const segment = firstSlash === -1 ? afterDoubleSlash : afterDoubleSlash.slice(0, firstSlash);
  const looksLikeHost = /[.:\\%]/.test(segment) || segment.startsWith("[");
  if (looksLikeHost) {
    throw new Error(`Unsupported file URL host: ${segment}. Use file:///<absolute-path> for local files (network/UNC paths are not supported).`);
  }
  const absPath = path3.resolve(process.cwd(), afterDoubleSlash);
  return pathToFileURL(absPath).href + trailing;
}
async function validateNavigationUrl(url) {
  let normalized = url;
  if (url.toLowerCase().startsWith("file:")) {
    normalized = normalizeFileUrl(url);
  }
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
  if (parsed.protocol === "file:") {
    if (parsed.host !== "" && parsed.host.toLowerCase() !== "localhost") {
      throw new Error(`Unsupported file URL host: ${parsed.host}. Use file:///<absolute-path> for local files.`);
    }
    let fsPath;
    try {
      fsPath = fileURLToPath(parsed);
    } catch (e) {
      throw new Error(`Invalid file URL: ${url} (${e.message})`);
    }
    validateReadPath(fsPath);
    return pathToFileURL(fsPath).href + parsed.search + parsed.hash;
  }
  if (parsed.protocol === "about:" && parsed.href.toLowerCase() === "about:blank") {
    return "about:blank";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Blocked: scheme "${parsed.protocol}" is not allowed. Only http:, https:, file:, and about:blank URLs are permitted.`);
  }
  const blocked = await blockedNavigationReason(parsed.href);
  if (blocked)
    throw new Error(blocked);
  return url;
}
var BLOCKED_METADATA_HOSTNAMES;
var init_url_validation = __esm(() => {
  init_path_security();
  BLOCKED_METADATA_HOSTNAMES = new Set([
    "metadata.google.internal",
    "metadata.azure.internal"
  ]);
});

// browse/src/tab-session.ts
class TabSession {
  page;
  refMap = new Map;
  lastSnapshot = null;
  activeFrame = null;
  loadedHtml = null;
  loadedHtmlWaitUntil;
  constructor(page) {
    this.page = page;
  }
  getPage() {
    return this.page;
  }
  setRefMap(refs) {
    this.refMap = refs;
  }
  clearRefs() {
    this.refMap.clear();
  }
  async resolveRef(selector) {
    if (selector.startsWith("@e") || selector.startsWith("@c")) {
      const ref = selector.slice(1);
      const entry = this.refMap.get(ref);
      if (!entry) {
        throw new Error(`Ref ${selector} not found. Run 'snapshot' to get fresh refs.`);
      }
      const count = await entry.locator.count();
      if (count === 0) {
        throw new Error(`Ref ${selector} (${entry.role} "${entry.name}") is stale — element no longer exists. ` + `Run 'snapshot' for fresh refs.`);
      }
      return { locator: entry.locator };
    }
    return { selector };
  }
  getRefRole(selector) {
    if (selector.startsWith("@e") || selector.startsWith("@c")) {
      const entry = this.refMap.get(selector.slice(1));
      return entry?.role ?? null;
    }
    return null;
  }
  getRefCount() {
    return this.refMap.size;
  }
  getRefEntries() {
    return Array.from(this.refMap.entries()).map(([ref, entry]) => ({
      ref,
      role: entry.role,
      name: entry.name
    }));
  }
  setLastSnapshot(text) {
    this.lastSnapshot = text;
  }
  getLastSnapshot() {
    return this.lastSnapshot;
  }
  setFrame(frame) {
    this.activeFrame = frame;
  }
  getFrame() {
    return this.activeFrame;
  }
  getActiveFrameOrPage() {
    if (this.activeFrame?.isDetached()) {
      this.activeFrame = null;
      this.clearRefs();
    }
    return this.activeFrame ?? this.page;
  }
  onMainFrameNavigated() {
    this.clearRefs();
    this.activeFrame = null;
    this.loadedHtml = null;
    this.loadedHtmlWaitUntil = undefined;
  }
  async setTabContent(html, opts = {}) {
    const waitUntil = opts.waitUntil ?? "domcontentloaded";
    await this.page.setContent(html, { waitUntil, timeout: 15000 });
    this.loadedHtml = html;
    this.loadedHtmlWaitUntil = waitUntil;
  }
  getLoadedHtml() {
    if (this.loadedHtml === null)
      return null;
    return { html: this.loadedHtml, waitUntil: this.loadedHtmlWaitUntil };
  }
  clearLoadedHtml() {
    this.loadedHtml = null;
    this.loadedHtmlWaitUntil = undefined;
  }
}

// lib/error-handling.ts
import * as fs3 from "fs";
function safeUnlink(filePath) {
  try {
    fs3.unlinkSync(filePath);
  } catch (err) {
    if (err?.code !== "ENOENT")
      throw err;
  }
}
function safeUnlinkQuiet(filePath) {
  try {
    fs3.unlinkSync(filePath);
  } catch {}
}
function safeKill(pid, signal) {
  try {
    process.kill(pid, signal);
  } catch (err) {
    if (err?.code !== "ESRCH")
      throw err;
  }
}
function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err?.code === "EPERM";
  }
}
var init_error_handling = () => {};

// browse/src/error-handling.ts
var init_error_handling2 = __esm(() => {
  init_error_handling();
});

// lib/state-root.ts
import * as fs4 from "node:fs";
function userHome(env, platform) {
  return env.HOME || (platform === "win32" ? env.USERPROFILE || "" : "");
}
function resolveStateRoot(env = process.env, platform = process.platform) {
  for (const name of STATE_ROOT_VARS) {
    if (env[name])
      return env[name];
  }
  if (env.CLAUDE_PLUGIN_DATA && (env.CLAUDE_PLUGIN_ROOT || "").toLowerCase().includes("gstack"))
    return env.CLAUDE_PLUGIN_DATA;
  const home = userHome(env, platform);
  return home ? `${home}/.gstack` : ".gstack";
}
function legacyStateRoot(env, platform) {
  if (env.GSTACK_TEST_LEGACY_ROOT)
    return env.GSTACK_TEST_LEGACY_ROOT;
  const home = userHome(env, platform);
  return home ? `${home}/.gstack` : null;
}
function mergedStateRoots(env = process.env, platform = process.platform) {
  const resolved = resolveStateRoot(env, platform);
  const legacy = legacyStateRoot(env, platform);
  return legacy && legacy !== resolved ? [resolved, legacy] : [resolved];
}
function readKeyFromRoot(root, key) {
  let yaml;
  try {
    yaml = fs4.readFileSync(`${root}/config.yaml`, "utf-8");
  } catch {
    return null;
  }
  let value = null;
  for (const line of yaml.split(`
`)) {
    if (line.startsWith(`${key}:`))
      value = line.slice(key.length + 1).trim();
  }
  return value ? value : null;
}
function readConfigKeyWithRoot(key, env = process.env, platform = process.platform) {
  const order = MERGED_CONFIG_KEYS[key];
  const candidates = order ? mergedStateRoots(env, platform) : [resolveStateRoot(env, platform)];
  let best = { value: null, root: null };
  let bestRank = Infinity;
  for (const root of candidates) {
    const value = readKeyFromRoot(root, key);
    if (value === null)
      continue;
    const rank = order ? order.indexOf(value) : 0;
    if (rank < bestRank) {
      best = { value, root };
      bestRank = rank;
    }
  }
  return best;
}
function readConfigKey(key, env = process.env, platform = process.platform) {
  return readConfigKeyWithRoot(key, env, platform).value;
}
var STATE_ROOT_VARS, MERGED_CONFIG_KEYS;
var init_state_root = __esm(() => {
  STATE_ROOT_VARS = ["GSTACK_STATE_ROOT", "GSTACK_HOME", "GSTACK_STATE_DIR"];
  MERGED_CONFIG_KEYS = {
    telemetry: ["off", "anonymous", "community"],
    memorable_recall: ["off", "on"],
    codex_reviews: ["disabled", "enabled"],
    update_check: ["false", "true"]
  };
});

// lib/remote-identity.ts
var init_remote_identity = () => {};

// browse/src/config.ts
import * as fs5 from "fs";
import * as path4 from "path";
function getGitRoot() {
  try {
    const proc = Bun.spawnSync(["git", "rev-parse", "--show-toplevel"], {
      windowsHide: true,
      stdout: "pipe",
      stderr: "pipe",
      timeout: 8000
    });
    if (proc.exitCode !== 0)
      return null;
    return proc.stdout.toString().trim() || null;
  } catch {
    return null;
  }
}
function resolveConfig(env = process.env) {
  let stateFile;
  let stateDir;
  let projectDir;
  if (env.BROWSE_STATE_FILE) {
    stateFile = env.BROWSE_STATE_FILE;
    stateDir = path4.dirname(stateFile);
    projectDir = path4.dirname(stateDir);
  } else {
    projectDir = getGitRoot() || process.cwd();
    stateDir = path4.join(projectDir, ".gstack");
    stateFile = path4.join(stateDir, "browse.json");
  }
  return {
    projectDir,
    stateDir,
    stateFile,
    consoleLog: path4.join(stateDir, "browse-console.log"),
    networkLog: path4.join(stateDir, "browse-network.log"),
    dialogLog: path4.join(stateDir, "browse-dialog.log"),
    auditLog: path4.join(stateDir, "browse-audit.jsonl")
  };
}
function isIgnoredByGit(projectDir, relPath) {
  try {
    const proc = Bun.spawnSync(["git", "check-ignore", "-q", "--", relPath], {
      windowsHide: true,
      cwd: projectDir,
      stdout: "pipe",
      stderr: "pipe",
      timeout: 2000
    });
    return proc.exitCode === 0;
  } catch {
    return false;
  }
}
function gitExcludePath(projectDir) {
  try {
    const proc = Bun.spawnSync(["git", "rev-parse", "--git-path", "info/exclude"], {
      windowsHide: true,
      cwd: projectDir,
      stdout: "pipe",
      stderr: "pipe",
      timeout: 2000
    });
    if (proc.exitCode !== 0)
      return null;
    const rel = proc.stdout.toString().trim();
    return rel ? path4.resolve(projectDir, rel) : null;
  } catch {
    return null;
  }
}
function ensureStateDir(config) {
  try {
    mkdirSecure(config.stateDir);
  } catch (err) {
    if (err.code === "EACCES") {
      throw new Error(`Cannot create state directory ${config.stateDir}: permission denied`);
    }
    if (err.code === "ENOTDIR") {
      throw new Error(`Cannot create state directory ${config.stateDir}: a file exists at that path`);
    }
    throw err;
  }
  try {
    fs5.writeFileSync(path4.join(config.stateDir, ".gitignore"), `*
`);
  } catch {}
  if (isIgnoredByGit(config.projectDir, ".gstack/"))
    return;
  const excludePath = gitExcludePath(config.projectDir);
  if (!excludePath)
    return;
  try {
    const content = fs5.existsSync(excludePath) ? fs5.readFileSync(excludePath, "utf-8") : "";
    if (!content.match(/^\.gstack\/?$/m)) {
      const separator = content === "" || content.endsWith(`
`) ? "" : `
`;
      fs5.mkdirSync(path4.dirname(excludePath), { recursive: true });
      fs5.appendFileSync(excludePath, `${separator}.gstack/
`);
    }
  } catch (err) {
    const logPath = path4.join(config.stateDir, "browse-server.log");
    try {
      fs5.appendFileSync(logPath, `[${new Date().toISOString()}] Warning: could not update ${excludePath}: ${err.message}
`);
    } catch {}
  }
}
function readVersionHash(execPath = process.execPath) {
  try {
    const versionFile = path4.resolve(path4.dirname(execPath), ".version");
    return fs5.readFileSync(versionFile, "utf-8").trim() || null;
  } catch {
    return null;
  }
}
function resolveGstackHome() {
  return resolveStateRoot();
}
function readGstackConfigYamlKey(key) {
  const raw = readConfigKey(key);
  if (raw === null)
    return null;
  return raw.replace(/\s*#.*$/, "").trim().replace(/^(['"])(.*)\1$/, "$2");
}
function isPairAgentEnabled() {
  const env = process.env.GSTACK_PAIR_AGENT;
  if (env === "on")
    return true;
  if (env === "off")
    return false;
  const yamlValue = readGstackConfigYamlKey("pair_agent");
  if (yamlValue === "on")
    return true;
  if (yamlValue === "off")
    return false;
  try {
    const raw = fs5.readFileSync(path4.join(resolveGstackHome(), "config.json"), "utf-8");
    return JSON.parse(raw)?.pair_agent === "on";
  } catch {
    return false;
  }
}
function resolveChromiumProfile(explicit) {
  if (explicit && explicit.length > 0)
    return explicit;
  const env = process.env.CHROMIUM_PROFILE;
  if (env && env.length > 0)
    return env;
  return path4.join(resolveConfig().stateDir, "chromium-profile");
}
function cleanSingletonLocks(userDataDir) {
  if (!path4.isAbsolute(userDataDir)) {
    console.warn(`[browse] cleanSingletonLocks: refusing relative path: ${userDataDir}`);
    return;
  }
  const resolved = path4.resolve(userDataDir);
  const basename = path4.basename(resolved);
  const explicitProfile = process.env.CHROMIUM_PROFILE;
  const explicitAbs = explicitProfile && path4.isAbsolute(explicitProfile) ? path4.resolve(explicitProfile) : null;
  const isSafe = basename === "chromium-profile" || explicitAbs !== null && resolved === explicitAbs;
  if (!isSafe) {
    console.warn(`[browse] cleanSingletonLocks: refusing to clean unrecognized profile dir: ${resolved}`);
    return;
  }
  for (const lockFile of ["SingletonLock", "SingletonSocket", "SingletonCookie"]) {
    safeUnlinkQuiet(path4.join(resolved, lockFile));
  }
}
var init_config = __esm(() => {
  init_file_permissions();
  init_error_handling2();
  init_state_root();
  init_remote_identity();
});

// browse/src/xvfb.ts
import * as fs6 from "fs";
import * as path5 from "path";
import * as os4 from "os";
function shouldSpawnXvfb(env, platform) {
  if (env.BROWSE_HEADED !== "1")
    return { spawn: false, reason: "not headed mode" };
  if (platform !== "linux")
    return { spawn: false, reason: `platform ${platform} uses native windowing` };
  if (env.DISPLAY)
    return { spawn: false, reason: `DISPLAY=${env.DISPLAY} already set` };
  if (env.WAYLAND_DISPLAY)
    return { spawn: false, reason: `WAYLAND_DISPLAY=${env.WAYLAND_DISPLAY} set; Chromium uses Wayland natively` };
  return { spawn: true, reason: "linux headed without DISPLAY/WAYLAND_DISPLAY" };
}
function isDisplayFree(displayNum) {
  for (const reservation of [`/tmp/.X11-unix/X${displayNum}`, `/tmp/.X${displayNum}-lock`]) {
    try {
      if (fs6.lstatSync(reservation, { throwIfNoEntry: false }))
        return false;
    } catch {
      return false;
    }
  }
  try {
    const result = Bun.spawnSync(["xdpyinfo", "-display", `:${displayNum}`], {
      windowsHide: true,
      stdout: "ignore",
      stderr: "ignore",
      timeout: 2000
    });
    return result.exitCode !== 0;
  } catch {
    return true;
  }
}
function pickFreeDisplay(rangeStart = DISPLAY_RANGE_START, rangeEnd = DISPLAY_RANGE_END) {
  for (let n = rangeStart;n <= rangeEnd; n++) {
    if (isDisplayFree(n))
      return n;
  }
  return null;
}
function readPidStartTime(pid) {
  if (!isProcessAlive(pid))
    return "";
  try {
    const result = Bun.spawnSync(["ps", "-p", String(pid), "-o", "lstart="], {
      windowsHide: true,
      stdout: "pipe",
      stderr: "pipe",
      timeout: 2000
    });
    if (result.exitCode !== 0)
      return "";
    return result.stdout.toString().trim();
  } catch {
    return "";
  }
}
function readPidCmdline(pid) {
  try {
    return fs6.readFileSync(`/proc/${pid}/cmdline`, "utf-8").replace(/\0/g, " ").trim();
  } catch {
    try {
      const result = Bun.spawnSync(["ps", "-p", String(pid), "-o", "command="], {
        windowsHide: true,
        stdout: "pipe",
        stderr: "pipe",
        timeout: 2000
      });
      if (result.exitCode !== 0)
        return "";
      return result.stdout.toString().trim();
    } catch {
      return "";
    }
  }
}
function readPidArgv0(pid) {
  try {
    const raw = fs6.readFileSync(`/proc/${pid}/cmdline`, "utf-8");
    return raw.split("\x00", 1)[0] ?? "";
  } catch {
    return "";
  }
}
function isOurXvfb(pid, recordedStartTime) {
  if (!pid || !recordedStartTime)
    return false;
  const argv0 = readPidArgv0(pid);
  if (!argv0)
    return false;
  const base = argv0.split("/").pop() ?? "";
  if (base.toLowerCase() !== "xvfb")
    return false;
  const currentStart = readPidStartTime(pid);
  if (!currentStart)
    return false;
  return currentStart === recordedStartTime;
}
async function spawnXvfb(displayNum) {
  const display = `:${displayNum}`;
  if (!isDisplayFree(displayNum))
    throw new XvfbDisplayTakenError(`X display ${display} is already reserved; refusing to replace it`);
  if (!readPidStartTime(process.pid))
    throw new Error("Cannot start Xvfb without process start-time ownership checks");
  const stderrDir = fs6.mkdtempSync(path5.join(os4.tmpdir(), "gstack-xvfb-"));
  const stderrPath = path5.join(stderrDir, "stderr.log");
  const stderrFd = fs6.openSync(stderrPath, "w", 384);
  let proc;
  try {
    proc = Bun.spawn(["Xvfb", display, "-screen", "0", "1920x1080x24", "-ac"], {
      windowsHide: true,
      stdio: ["ignore", "ignore", stderrFd]
    });
  } catch (err) {
    fs6.rmSync(stderrDir, { recursive: true, force: true });
    throw err;
  } finally {
    fs6.closeSync(stderrFd);
  }
  proc.unref();
  const startTime = readPidStartTime(proc.pid);
  try {
    return await awaitXvfbReady(proc, displayNum, startTime, stderrPath);
  } finally {
    fs6.rmSync(stderrDir, { recursive: true, force: true });
  }
}
async function awaitXvfbReady(proc, displayNum, startTime, stderrPath) {
  const display = `:${displayNum}`;
  const deadline = Date.now() + 3000;
  let ready = false;
  while (Date.now() < deadline) {
    await Bun.sleep(100);
    if (proc.exitCode != null) {
      let stderr = "";
      try {
        stderr = fs6.readFileSync(stderrPath, "utf8");
      } catch {}
      if (!isDisplayFree(displayNum) || /Server is already active for display/.test(stderr)) {
        throw new XvfbDisplayTakenError(`X display ${display} was reserved by another X server during startup`);
      }
      const fatal = stderr.split(`
`).map((line) => line.replace(/^\(EE\)\s*/, "").trim()).filter(Boolean).slice(-3).join(" ");
      throw new Error(`Xvfb on ${display} exited during startup (code ${proc.exitCode})${fatal ? `: ${fatal}` : ""}. Hint: install xvfb (apt-get install xvfb / yum install xorg-x11-server-Xvfb).`);
    }
    let ownsLock = false;
    try {
      ownsLock = Number(fs6.readFileSync(`/tmp/.X${displayNum}-lock`, "utf8").trim()) === proc.pid;
    } catch {}
    if (!ownsLock || !isOurXvfb(proc.pid, startTime))
      continue;
    try {
      ready = Bun.spawnSync(["xdpyinfo", "-display", display], {
        windowsHide: true,
        stdout: "ignore",
        stderr: "ignore",
        timeout: 2000
      }).exitCode === 0;
    } catch {
      ready = fs6.existsSync(`/tmp/.X11-unix/X${displayNum}`);
    }
    if (ready)
      break;
  }
  if (!ready) {
    cleanupXvfb({ pid: proc.pid, startTime, display });
    throw new Error(`Xvfb on ${display} never became reachable within 3s timeout`);
  }
  return {
    pid: proc.pid,
    startTime,
    display,
    close: () => cleanupXvfb({ pid: proc.pid, startTime, display })
  };
}
async function spawnFreeXvfb(rangeStart = DISPLAY_RANGE_START, rangeEnd = DISPLAY_RANGE_END) {
  for (let n = pickFreeDisplay(rangeStart, rangeEnd);n != null; n = pickFreeDisplay(n + 1, rangeEnd)) {
    try {
      return await spawnXvfb(n);
    } catch (err) {
      if (!(err instanceof XvfbDisplayTakenError))
        throw err;
    }
  }
  throw new Error(`no free X display in range :${rangeStart}-:${rangeEnd} — refusing to clobber existing X servers`);
}
function isZombie(pid) {
  try {
    const stat = fs6.readFileSync(`/proc/${pid}/stat`, "utf8");
    return stat.slice(stat.lastIndexOf(")") + 2).startsWith("Z");
  } catch {
    return false;
  }
}
function cleanupXvfb(state) {
  if (!state.pid)
    return;
  if (!isOurXvfb(state.pid, state.startTime))
    return;
  try {
    safeKill(state.pid, "SIGTERM");
  } catch {}
  const deadline = Date.now() + 1000;
  while (Date.now() < deadline) {
    if (!isProcessAlive(state.pid) || isZombie(state.pid))
      break;
    Bun.sleepSync(10);
  }
  if (isOurXvfb(state.pid, state.startTime)) {
    try {
      safeKill(state.pid, "SIGKILL");
    } catch {}
  }
}
function xvfbInstallHint() {
  return "Xvfb not installed. apt-get install xvfb (Debian/Ubuntu) or yum install xorg-x11-server-Xvfb (RHEL/CentOS). Note: minimal containers (alpine, distroless) may also need fonts, dbus, gtk libs for headed Chromium to render.";
}
var DISPLAY_RANGE_START = 99, DISPLAY_RANGE_END = 120, XvfbDisplayTakenError;
var init_xvfb = __esm(() => {
  init_error_handling2();
  XvfbDisplayTakenError = class XvfbDisplayTakenError extends Error {
  };
});

// lib/fs-atomic.ts
import * as fs7 from "fs";
import * as crypto from "crypto";
function tmpPathFor(target) {
  return `${target}.tmp.${process.pid}.${crypto.randomBytes(4).toString("hex")}`;
}
function atomicWriteSync(target, data, opts = {}) {
  const tmp = tmpPathFor(target);
  try {
    if (opts.mode !== undefined) {
      fs7.writeFileSync(tmp, data, { mode: opts.mode });
    } else {
      fs7.writeFileSync(tmp, data);
    }
    if (opts.noReplace) {
      fs7.linkSync(tmp, target);
      fs7.unlinkSync(tmp);
    } else
      fs7.renameSync(tmp, target);
  } catch (err) {
    try {
      fs7.unlinkSync(tmp);
    } catch {}
    throw err;
  }
}
var init_fs_atomic = () => {};

// browse/src/chromium-profiles.ts
import * as fs8 from "fs";
import * as os5 from "os";
import * as path6 from "path";
function legacyProfileDir() {
  return path6.join(resolveGstackHome(), "chromium-profile");
}
function registryPath() {
  return path6.join(resolveGstackHome(), "browse-profiles.json");
}
function readParentPid(pid) {
  try {
    const stat = fs8.readFileSync(`/proc/${pid}/stat`, "utf-8");
    return Number(stat.slice(stat.lastIndexOf(")") + 2).split(" ")[1]);
  } catch {
    try {
      const r = Bun.spawnSync(["ps", "-o", "ppid=", "-p", String(pid)], { stdout: "pipe", stderr: "pipe", timeout: 2000, windowsHide: true });
      return r.exitCode === 0 ? Number(r.stdout.toString().trim()) : 0;
    } catch {
      return 0;
    }
  }
}
function profileOwner(profileDir) {
  let target;
  try {
    target = fs8.readlinkSync(path6.join(profileDir, "SingletonLock"));
  } catch {
    return { state: "free" };
  }
  const dash = target.lastIndexOf("-");
  const host = target.slice(0, dash);
  const pid = Number(target.slice(dash + 1));
  if (!Number.isSafeInteger(pid) || pid <= 0)
    return { state: "free" };
  if (host !== os5.hostname()) {
    return { state: "live", pid, detail: `locked by PID ${pid} on another host (${host})` };
  }
  if (!isProcessAlive(pid))
    return { state: "free" };
  const cmd = readPidCmdline(pid);
  const dirs = new Set([profileDir]);
  try {
    dirs.add(fs8.realpathSync(profileDir));
  } catch {}
  const usesProfile = [...dirs].some((d) => cmd.includes(`--user-data-dir=${d}`));
  if (!/chrom/i.test(cmd) || !usesProfile)
    return { state: "free" };
  const ppid = readParentPid(pid);
  const parent = ppid > 1 ? path6.basename(readPidCmdline(ppid).split(" ")[0] || "") : "";
  if (ppid <= 1 || !isProcessAlive(ppid) || REAPERS.has(parent))
    return { state: "orphan", pid };
  return { state: "live", pid, detail: `in use by Chromium PID ${pid} (started by PID ${ppid}: ${parent || "unknown"})` };
}
function readRegistry() {
  try {
    const list = JSON.parse(fs8.readFileSync(registryPath(), "utf-8"));
    return Array.isArray(list) ? list.filter((p) => typeof p === "string") : [];
  } catch {
    return [];
  }
}
function writeRegistry(list) {
  fs8.mkdirSync(path6.dirname(registryPath()), { recursive: true });
  atomicWriteSync(registryPath(), JSON.stringify([...new Set(list)].sort(), null, 2) + `
`);
}
function ensureProjectProfile(profileDir, log = console.log) {
  if (fs8.existsSync(profileDir))
    return;
  const explicit = process.env.CHROMIUM_PROFILE;
  if (explicit && path6.resolve(explicit) === path6.resolve(profileDir))
    return;
  const legacy = legacyProfileDir();
  if (path6.resolve(profileDir) === path6.resolve(legacy))
    return;
  writeRegistry([...readRegistry(), path6.resolve(profileDir)]);
  fs8.mkdirSync(path6.dirname(profileDir), { recursive: true });
  const fresh = (why) => {
    fs8.mkdirSync(profileDir, { recursive: true, mode: 448 });
    if (why)
      log(why);
  };
  if (!fs8.existsSync(legacy))
    return fresh("");
  const before = profileOwner(legacy);
  if (before.state !== "free") {
    return fresh(`[browse] Headed browse now keeps a profile per project (${profileDir}). The old shared profile (${legacy}) is ${"detail" in before ? before.detail : `held by orphaned PID ${before.pid}`}, so this project starts with a fresh profile. To import it later: close that browser, delete ${profileDir}, and start headed browse again.`);
  }
  const tmp = `${profileDir}.seed-${process.pid}`;
  fs8.rmSync(tmp, { recursive: true, force: true });
  try {
    fs8.cpSync(legacy, tmp, {
      recursive: true,
      verbatimSymlinks: true,
      filter: (src) => !path6.basename(src).startsWith("Singleton")
    });
    fs8.chmodSync(tmp, 448);
    if (profileOwner(legacy).state !== "free") {
      fs8.rmSync(tmp, { recursive: true, force: true });
      return fresh(`[browse] The old shared profile (${legacy}) came into use while it was being copied, so this project (${profileDir}) starts with a fresh profile.`);
    }
    fs8.renameSync(tmp, profileDir);
  } catch (err) {
    fs8.rmSync(tmp, { recursive: true, force: true });
    if (fs8.existsSync(profileDir))
      return;
    throw err;
  }
  log(`[browse] Headed browse now keeps a profile per project. Copied your logins and settings from ${legacy} to ${profileDir} (${formatBytes(dirBytes(profileDir))}). See \`browse profiles\` to list or prune profiles.`);
}
function dirBytes(dir) {
  let total = 0;
  const walk = (d) => {
    for (const e of fs8.readdirSync(d, { withFileTypes: true })) {
      const p = path6.join(d, e.name);
      if (e.isDirectory())
        walk(p);
      else if (e.isFile())
        total += fs8.statSync(p).size;
    }
  };
  try {
    walk(dir);
  } catch {}
  return total;
}
function formatBytes(n) {
  if (n < 1024 * 1024)
    return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
var REAPERS;
var init_chromium_profiles = __esm(() => {
  init_config();
  init_error_handling2();
  init_xvfb();
  init_fs_atomic();
  REAPERS = new Set(["init", "systemd", "launchd", "tini", "dumb-init", "docker-init"]);
});

// browse/src/xprotect-heal.ts
import * as fs9 from "fs";
import * as os6 from "os";
import * as path7 from "path";
import { spawn } from "child_process";
import { chromium } from "playwright";
function logHeal(action, fields = {}) {
  console.error(`[browse:xprotect-heal] ${JSON.stringify({ action, ...fields })}`);
}
function isXProtectKillSignature(message, platform = process.platform) {
  if (platform !== "darwin")
    return false;
  if (!message)
    return false;
  for (const neg of NEGATIVE_SIGNATURES) {
    if (neg.test(message))
      return false;
  }
  for (const pos of POSITIVE_SIGNATURES) {
    if (pos.test(message))
      return true;
  }
  return /timeout \d+\s*ms exceeded/i.test(message) && /<launched>/i.test(message);
}
function findPlaywrightRevisionDir(executablePath) {
  let dir = path7.dirname(executablePath);
  for (let i = 0;i < 8; i++) {
    if (REVISION_DIR_RE.test(path7.basename(dir)))
      return dir;
    const parent = path7.dirname(dir);
    if (parent === dir)
      return null;
    dir = parent;
  }
  return null;
}
function expectedChromiumRevision(executablePath) {
  const revDir = findPlaywrightRevisionDir(executablePath);
  if (!revDir)
    return null;
  const m = path7.basename(revDir).match(/-(\d+)$/);
  return m ? m[1] : null;
}
function findGstackInstallRoot(expectedRevision, candidates) {
  const roots = candidates ?? [
    path7.resolve(__dirname, "..", ".."),
    path7.join(os6.homedir(), ".claude", "skills", "gstack")
  ];
  for (const root of roots) {
    if (!path7.isAbsolute(root))
      continue;
    try {
      const browsersJson = path7.join(root, "node_modules", "playwright-core", "browsers.json");
      if (!fs9.existsSync(browsersJson))
        continue;
      const parsed = JSON.parse(fs9.readFileSync(browsersJson, "utf-8"));
      const rev = parsed?.browsers?.find((b) => b?.name === "chromium")?.revision;
      if (String(rev) === String(expectedRevision))
        return root;
    } catch {
      continue;
    }
  }
  return null;
}
function defaultRunXattr(target) {
  const res = Bun.spawnSync(["xattr", "-dr", "com.apple.quarantine", target], {
    windowsHide: true,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 1e4
  });
  return res.exitCode;
}
function clearQuarantineOnPlaywrightCache(executablePath, runXattr = defaultRunXattr) {
  const customPath = process.env.GSTACK_CHROMIUM_PATH;
  if (customPath && path7.resolve(executablePath) === path7.resolve(customPath)) {
    logHeal("quarantine-clear-skipped", { reason: "custom-chromium-path" });
    return false;
  }
  const revDir = findPlaywrightRevisionDir(executablePath);
  if (!revDir) {
    logHeal("quarantine-clear-skipped", { reason: "not-in-playwright-cache", executablePath });
    return false;
  }
  const cacheRoot = path7.dirname(revDir);
  let cleared = 0;
  let entries;
  try {
    entries = fs9.readdirSync(cacheRoot);
  } catch (err) {
    logHeal("quarantine-clear-skipped", {
      reason: "cache-unreadable",
      error: err instanceof Error ? err.message : String(err)
    });
    return false;
  }
  for (const entry of entries) {
    if (!REVISION_DIR_RE.test(entry))
      continue;
    const target = path7.join(cacheRoot, entry);
    try {
      const exitCode = runXattr(target);
      logHeal("quarantine-clear", { target, exitCode });
      cleared++;
    } catch (err) {
      logHeal("quarantine-clear", {
        target,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }
  return cleared > 0;
}
function runBoundedChromiumReinstall(installRoot, timeoutMs = XPROTECT_REINSTALL_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let settled = false;
    let child;
    try {
      child = spawn("bunx", ["playwright", "install", "--force", "chromium"], {
        cwd: installRoot,
        detached: true,
        stdio: ["ignore", "ignore", "pipe"],
        windowsHide: true
      });
    } catch (err) {
      resolve({ ok: false, reason: `spawn-error: ${err instanceof Error ? err.message : String(err)}` });
      return;
    }
    let stderrTail = "";
    child.stderr?.on("data", (d) => {
      stderrTail = (stderrTail + String(d)).slice(-2000);
    });
    const timer = setTimeout(() => {
      if (settled)
        return;
      settled = true;
      try {
        if (child.pid)
          process.kill(-child.pid, "SIGKILL");
      } catch (err) {
        if (err?.code !== "ESRCH") {
          try {
            child.kill("SIGKILL");
          } catch {}
        }
      }
      resolve({ ok: false, reason: "timeout" });
    }, timeoutMs);
    child.on("error", (err) => {
      if (settled)
        return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: false, reason: `spawn-error: ${err.message}` });
    });
    child.on("exit", (code) => {
      if (settled)
        return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) {
        resolve({ ok: true, exitCode: code });
      } else {
        resolve({
          ok: false,
          reason: `install-exit-${code}${stderrTail ? `: ${stderrTail.slice(-300)}` : ""}`,
          exitCode: code
        });
      }
    });
  });
}
async function maybeHealXProtectKill(err, opts = {}, deps = {}) {
  const message = err instanceof Error ? err.message : String(err);
  if (!isXProtectKillSignature(message, deps.platform ?? process.platform))
    return false;
  if (opts.usesCustomExecutable) {
    logHeal("skip", { reason: "custom-executable" });
    return false;
  }
  if (healAttempted) {
    logHeal("skip", { reason: "already-attempted-this-process" });
    return false;
  }
  healAttempted = true;
  logHeal("classified", { signature: "xprotect-kill" });
  const execPath = (deps.executablePath ?? (() => chromium.executablePath()))();
  (deps.clearQuarantine ?? clearQuarantineOnPlaywrightCache)(execPath);
  const revision = expectedChromiumRevision(execPath);
  if (!revision) {
    logHeal("reinstall-skipped", { reason: "no-revision-in-path", execPath });
    return false;
  }
  const root = (deps.installRoot ?? findGstackInstallRoot)(revision);
  if (!root) {
    logHeal("reinstall-skipped", { reason: "no-install-root", revision });
    return false;
  }
  logHeal("reinstall-start", { installRoot: root, revision, timeoutMs: XPROTECT_REINSTALL_TIMEOUT_MS });
  const result = await (deps.runReinstall ?? runBoundedChromiumReinstall)(root);
  if (!result.ok) {
    logHeal("reinstall-failed", { reason: result.reason });
    return false;
  }
  const verify = deps.verifyInstalled ?? ((p) => fs9.existsSync(p));
  if (!verify(execPath)) {
    logHeal("verify-failed", { expected: execPath });
    return false;
  }
  logHeal("reinstall-ok", { installRoot: root, revision });
  return true;
}
function buildXProtectGuidance(originalMessage) {
  return `${originalMessage}
` + "[browse] This launch failure matches the macOS XProtect kill signature (#2554): " + "the OS killed Playwright's Chromium at spawn. Automatic self-heal did not complete. " + "Fix manually: run `bunx playwright install chromium` from your gstack install " + "(the directory whose node_modules pins playwright — ~/.claude/skills/gstack for " + "global installs), then retry.";
}
async function launchWithXProtectHeal(doLaunch, opts = {}, deps = {}) {
  try {
    return await doLaunch();
  } catch (err) {
    const healed = await maybeHealXProtectKill(err, opts, deps);
    if (healed) {
      logHeal("retry-launch", {});
      try {
        return await doLaunch();
      } catch (retryErr) {
        const retryMessage = retryErr instanceof Error ? retryErr.message : String(retryErr);
        if (isXProtectKillSignature(retryMessage, deps.platform ?? process.platform)) {
          throw new Error(buildXProtectGuidance(retryMessage), { cause: retryErr });
        }
        throw retryErr;
      }
    }
    const message = err instanceof Error ? err.message : String(err);
    if (isXProtectKillSignature(message, deps.platform ?? process.platform)) {
      throw new Error(buildXProtectGuidance(message), { cause: err });
    }
    throw err;
  }
}
var __dirname = "C:\\Users\\obrie\\gstack\\browse\\src", NEGATIVE_SIGNATURES, POSITIVE_SIGNATURES, REVISION_DIR_RE, XPROTECT_REINSTALL_TIMEOUT_MS = 120000, healAttempted = false;
var init_xprotect_heal = __esm(() => {
  NEGATIVE_SIGNATURES = [
    /executable doesn't exist/i,
    /spawn\s+\S+\s+(EACCES|EPERM|ENOENT)/i,
    /\b(EACCES|EPERM)\b/,
    /no usable sandbox/i,
    /failed to move to new namespace/i,
    /suid sandbox helper/i
  ];
  POSITIVE_SIGNATURES = [
    /<process did exit:[^>]*signal=SIGKILL/i,
    /signal[:=]\s*['"]?SIGKILL/i
  ];
  REVISION_DIR_RE = /^chromium(?:_headless_shell)?-\d+$/;
});

// browse/src/proxy-config.ts
function percentDecodable(part) {
  try {
    decodeURIComponent(part);
    return true;
  } catch {
    return false;
  }
}
function parseProxyConfig(opts) {
  let url;
  try {
    url = new URL(opts.proxyUrl);
  } catch {
    throw new ProxyConfigError("expected scheme://[user:pass@]host:port", `invalid proxy URL — could not parse`);
  }
  const scheme = url.protocol === "socks5h:" ? "socks5" : url.protocol.replace(":", "");
  if (scheme !== "socks5" && scheme !== "http" && scheme !== "https") {
    throw new ProxyConfigError("use socks5://, http://, or https://", `unsupported proxy scheme '${scheme}'`);
  }
  if (!url.hostname) {
    throw new ProxyConfigError("expected scheme://[user:pass@]host:port", `invalid proxy URL — missing host`);
  }
  if (url.pathname !== "" && url.pathname !== "/" || url.search || url.hash || /[?#]/.test(opts.proxyUrl)) {
    throw new ProxyConfigError("expected scheme://[user:pass@]host:port with no path; percent-encode any / \\ ? # @ in the credentials", `invalid proxy URL — unexpected path, query or fragment`);
  }
  const port = url.port ? parseInt(url.port, 10) : scheme === "http" ? 80 : scheme === "https" ? 443 : 1080;
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new ProxyConfigError("expected scheme://[user:pass@]host:port", `invalid proxy URL — bad port`);
  }
  const urlHasUser = !!url.username;
  const urlHasPass = !!url.password;
  const envHasUser = !!opts.envUser;
  const envHasPass = !!opts.envPass;
  const urlHasCreds = urlHasUser || urlHasPass;
  const envHasCreds = envHasUser || envHasPass;
  if (urlHasCreds && envHasCreds) {
    throw new ProxyConfigError(`unset BROWSE_PROXY_USER/PASS or remove user:pass@ from ${opts.source ?? "--proxy"}`, `proxy creds set in both env (BROWSE_PROXY_USER) and URL — pick one source`);
  }
  let userId;
  let password;
  if (urlHasCreds && ![url.username, url.password].every(percentDecodable)) {
    throw new ProxyConfigError("percent-encode the credentials (a literal % is %25)", `invalid proxy URL — credentials are not valid percent-encoding`);
  }
  if (urlHasCreds) {
    userId = decodeURIComponent(url.username);
    password = url.password ? decodeURIComponent(url.password) : undefined;
  } else if (envHasCreds) {
    userId = opts.envUser;
    password = opts.envPass;
  }
  return {
    scheme,
    host: url.hostname,
    port,
    ...userId ? { userId } : {},
    ...password ? { password } : {},
    hasAuth: !!(userId || password)
  };
}
function toUpstreamConfig(cfg) {
  return {
    host: cfg.host,
    port: cfg.port,
    ...cfg.userId ? { userId: cfg.userId } : {},
    ...cfg.password ? { password: cfg.password } : {}
  };
}
function noProxyToChromiumRules(noProxy) {
  const rules = new Set;
  for (const raw of (noProxy ?? "").toLowerCase().split(/[\s,]+/)) {
    if (!raw)
      continue;
    if (raw === "*" || raw.includes("/")) {
      rules.add(raw);
      continue;
    }
    let host = raw;
    let port = "";
    const bracket = raw.match(/^(\[[0-9a-f:.]+\])(:\d+)?$/);
    if (bracket)
      [host, port] = [bracket[1], bracket[2] ?? ""];
    else if (raw.split(":").length > 2) {
      if (!/^[0-9a-f:.]+$/.test(raw))
        continue;
      host = `[${raw}]`;
    } else if (raw.includes(":"))
      [host, port] = [raw.slice(0, raw.lastIndexOf(":")), raw.slice(raw.lastIndexOf(":"))];
    if (port && !/^:\d+$/.test(port))
      continue;
    if (!port && LOOPBACK_HOSTS.includes(host))
      continue;
    if (host.startsWith("*.")) {
      rules.add(host + port);
      continue;
    }
    host = host.replace(/^\./, "");
    if (!host)
      continue;
    rules.add(host + port);
    if (!host.startsWith("[") && !/^\d+(\.\d+){3}$/.test(host))
      rules.add(`*.${host}${port}`);
  }
  return [...rules].sort();
}
function withLoopbackBypass(rules) {
  return [...new Set([...rules, ...LOOPBACK_HOSTS])].join(",");
}
function serverProxyEnv(env, platform = process.platform) {
  return {
    url: env.BROWSE_PROXY_URL === "direct" ? undefined : env.BROWSE_PROXY_URL || undefined,
    source: env.BROWSE_PROXY_SOURCE || "BROWSE_PROXY_URL",
    bypass: env.BROWSE_PROXY_BYPASS || withLoopbackBypass(noProxyToChromiumRules(env.NO_PROXY || env.no_proxy)),
    direct: explicitDirect(env, platform)
  };
}
function forcesDirect(env, platform = process.platform) {
  return platform === "linux" || explicitDirect(env, platform);
}
function explicitDirect(env, platform = process.platform) {
  return platform !== "linux" && env.BROWSE_PROXY_URL === "direct";
}
function directProxyLogLine(env, platform = process.platform) {
  if (!forcesDirect(env, platform)) {
    return `[browse] [proxy] none: system proxy settings (Chromium's default on ${platform}; BROWSE_PROXY_URL=direct connects directly)`;
  }
  const ignored = platform === "linux" ? STANDARD_PROXY_VARS.filter((name) => env[name]) : ["the system proxy settings"];
  return `[browse] [proxy] none: direct connection (${DIRECT_PROXY_ARG}${ignored.length ? `; ignoring ${ignored.join(", ")}` : ""})`;
}
var ProxyConfigError, STANDARD_PROXY_VARS, LOOPBACK_HOSTS, DIRECT_PROXY_ARG = "--proxy-server=direct://";
var init_proxy_config = __esm(() => {
  ProxyConfigError = class ProxyConfigError extends Error {
    hint;
    constructor(hint, message) {
      super(message);
      this.hint = hint;
      this.name = "ProxyConfigError";
    }
  };
  STANDARD_PROXY_VARS = ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy", "ALL_PROXY", "all_proxy"];
  LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
});

// browse/src/cdp-allowlist.ts
function lookupCdpMethod(qualifiedName) {
  return CDP_ALLOWLIST_INDEX.get(qualifiedName) ?? null;
}
var CDP_ALLOWLIST, CDP_ALLOWLIST_INDEX;
var init_cdp_allowlist = __esm(() => {
  CDP_ALLOWLIST = Object.freeze([
    {
      domain: "Accessibility",
      method: "getFullAXTree",
      scope: "tab",
      output: "untrusted",
      justification: "Read-only AX tree extraction. Output is third-party page content; wrap in UNTRUSTED."
    },
    {
      domain: "Accessibility",
      method: "getPartialAXTree",
      scope: "tab",
      output: "untrusted",
      justification: "Read-only AX tree subtree by node. Output is third-party page content."
    },
    {
      domain: "Accessibility",
      method: "getRootAXNode",
      scope: "tab",
      output: "untrusted",
      justification: "Read-only root AX node accessor."
    },
    {
      domain: "DOM",
      method: "describeNode",
      scope: "tab",
      output: "untrusted",
      justification: "Inspect a DOM node by backend ID; pure read."
    },
    {
      domain: "DOM",
      method: "getBoxModel",
      scope: "tab",
      output: "trusted",
      justification: "Pure geometric data (box dimensions). No page content leaks; safe trusted."
    },
    {
      domain: "DOM",
      method: "getNodeForLocation",
      scope: "tab",
      output: "trusted",
      justification: "Pure coordinate→nodeId mapping; no content leak."
    },
    {
      domain: "CSS",
      method: "getMatchedStylesForNode",
      scope: "tab",
      output: "untrusted",
      justification: "Read computed cascade for a node; output may contain attacker-controlled selectors."
    },
    {
      domain: "CSS",
      method: "getComputedStyleForNode",
      scope: "tab",
      output: "trusted",
      justification: "Computed style values are bounded (CSS keywords/numbers); safe trusted."
    },
    {
      domain: "CSS",
      method: "getInlineStylesForNode",
      scope: "tab",
      output: "untrusted",
      justification: "Inline style content may contain attacker-controlled custom-property values."
    },
    {
      domain: "Performance",
      method: "getMetrics",
      scope: "tab",
      output: "trusted",
      justification: "Pure numeric metrics (timing, layout count); safe."
    },
    {
      domain: "Performance",
      method: "enable",
      scope: "tab",
      output: "trusted",
      justification: "Domain enable; no content; required prerequisite for getMetrics."
    },
    {
      domain: "Performance",
      method: "disable",
      scope: "tab",
      output: "trusted",
      justification: "Domain disable; no content."
    },
    {
      domain: "Tracing",
      method: "start",
      scope: "browser",
      output: "trusted",
      justification: "Trace category capture. Browser-scoped to serialize against other CDP ops."
    },
    {
      domain: "Tracing",
      method: "end",
      scope: "browser",
      output: "untrusted",
      justification: "Trace dump may contain URLs and page data; wrap."
    },
    {
      domain: "Emulation",
      method: "setDeviceMetricsOverride",
      scope: "tab",
      output: "trusted",
      justification: "Viewport/scale override on the active tab."
    },
    {
      domain: "Emulation",
      method: "clearDeviceMetricsOverride",
      scope: "tab",
      output: "trusted",
      justification: "Clear viewport override."
    },
    {
      domain: "Emulation",
      method: "setUserAgentOverride",
      scope: "tab",
      output: "trusted",
      justification: "UA override on the active tab. NOTE: changes affect future requests; fine for tests."
    },
    {
      domain: "Emulation",
      method: "setEmulatedMedia",
      scope: "tab",
      output: "trusted",
      justification: "Media type/feature override (prefers-color-scheme, prefers-reduced-motion, prefers-contrast, forced-colors) so a11y and dark-mode CSS branches are testable. Returns an empty result; no page content. NOTE: like setUserAgentOverride the override persists on the tab until cleared with an empty features array."
    },
    {
      domain: "Emulation",
      method: "setCPUThrottlingRate",
      scope: "tab",
      output: "trusted",
      justification: "CPU slowdown multiplier on the active tab, for measuring performance on a realistic low-end client instead of the developer workstation. Same domain and mutating character as setDeviceMetricsOverride; affects only timing, reads nothing, exfiltrates nothing. NOTE: like setEmulatedMedia the override persists on the tab until cleared (rate: 1) — callers own restoration."
    },
    {
      domain: "Network",
      method: "emulateNetworkConditions",
      scope: "tab",
      output: "trusted",
      justification: "Bandwidth/latency emulation on the active tab, for measuring page behaviour on a slow connection. Constrains traffic rather than reading it — no request bodies, headers or cookies are exposed. NOTE: like setEmulatedMedia the override persists on the tab until cleared (offline: false plus default throughput/latency) — callers own restoration."
    },
    {
      domain: "Page",
      method: "captureScreenshot",
      scope: "tab",
      output: "untrusted",
      justification: "Screenshot bytes; output is bounded image data (no marker injection vector)."
    },
    {
      domain: "Page",
      method: "printToPDF",
      scope: "tab",
      output: "untrusted",
      justification: "PDF bytes; bounded binary output."
    },
    {
      domain: "Network",
      method: "enable",
      scope: "tab",
      output: "trusted",
      justification: "Domain enable; required prerequisite. Does not return data."
    },
    {
      domain: "Network",
      method: "disable",
      scope: "tab",
      output: "trusted",
      justification: "Domain disable; mirrors Network.enable for cleanup symmetry."
    },
    {
      domain: "Runtime",
      method: "getProperties",
      scope: "tab",
      output: "untrusted",
      justification: "Inspect properties of an existing remote object. Read-only; output may contain page data."
    }
  ]);
  CDP_ALLOWLIST_INDEX = new Map(CDP_ALLOWLIST.map((e) => [`${e.domain}.${e.method}`, e]));
});

// browse/src/telemetry.ts
import { promises as fs10 } from "fs";
import * as path8 from "path";
function gstackHome() {
  return resolveStateRoot();
}
function analyticsDir() {
  return path8.join(gstackHome(), "analytics");
}
function telemetryFile() {
  return path8.join(analyticsDir(), "browse-telemetry.jsonl");
}
async function ensureDir() {
  const dir = analyticsDir();
  if (lastEnsuredDir === dir)
    return;
  await fs10.mkdir(dir, { recursive: true });
  lastEnsuredDir = dir;
}
function isTelemetryDisabled() {
  if (telemetryDisabled !== null)
    return telemetryDisabled;
  if (process.env.GSTACK_TELEMETRY_OFF === "1") {
    telemetryDisabled = true;
    return true;
  }
  const tier = readGstackConfigYamlKey("telemetry");
  if (tier === "off") {
    telemetryDisabled = true;
    return true;
  }
  if (tier === "community" || tier === "anonymous") {
    telemetryDisabled = false;
    return false;
  }
  telemetryDisabled = process.env.GSTACK_TELEMETRY_OFF !== "0";
  return telemetryDisabled;
}
function logTelemetry(payload) {
  if (isTelemetryDisabled())
    return Promise.resolve();
  const enriched = { ...payload, ts: new Date().toISOString() };
  return ensureDir().then(() => fs10.appendFile(telemetryFile(), JSON.stringify(enriched) + `
`, "utf8")).catch(() => {});
}
var lastEnsuredDir = null, telemetryDisabled = null;
var init_telemetry = __esm(() => {
  init_config();
  init_state_root();
});

// browse/src/cdp-bridge.ts
async function withCdpSession(page, fn) {
  const session = await page.context().newCDPSession(page);
  try {
    return await fn(session);
  } finally {
    try {
      await session.detach();
    } catch {}
  }
}
async function getOrCreateCdpSession(page, cache) {
  let session = cache.get(page);
  if (session)
    return session;
  session = await page.context().newCDPSession(page);
  cache.set(page, session);
  page.once("close", () => {
    cache.delete(page);
    session.detach().catch(() => {});
  });
  return session;
}
async function getCdpSession(page) {
  return getOrCreateCdpSession(page, sessionCache);
}
async function dispatchCdpCall(input) {
  const qualified = `${input.domain}.${input.method}`;
  const entry = lookupCdpMethod(qualified);
  if (!entry) {
    logTelemetry({ event: "cdp_method_denied", domain: input.domain, method: input.method });
    throw new Error(`DENIED: ${qualified} is not on the CDP allowlist.
` + `Cause: deny-default posture; method has not been audited and added to cdp-allowlist.ts.
` + `Action: if this method is genuinely needed, open a PR adding it to CDP_ALLOWLIST with a one-line justification + scope (tab|browser) + output (trusted|untrusted).`);
  }
  const acquireStart = Date.now();
  const release = entry.scope === "browser" ? await input.bm.acquireGlobalCdpLock(CDP_ACQUIRE_TIMEOUT_MS) : await input.bm.acquireTabLock(input.tabId, CDP_ACQUIRE_TIMEOUT_MS);
  const acquireMs = Date.now() - acquireStart;
  logTelemetry({ event: "cdp_method_lock_acquire_ms", domain: input.domain, method: input.method, ms: acquireMs });
  logTelemetry({ event: "cdp_method_called", domain: input.domain, method: input.method, allowed: true, scope: entry.scope });
  try {
    const page = input.bm.getPageForTab(input.tabId);
    if (!page) {
      throw new Error(`Cannot dispatch: tab ${input.tabId} not found.
` + `Cause: tab was closed between command queue and dispatch.
` + "Action: $B tabs to list current tabs.");
    }
    let session;
    try {
      session = await getCdpSession(page);
    } catch (e) {
      throw new Error(`CDPSessionInvalidated: ${e.message}
` + `Cause: Playwright context was recreated (e.g., viewport scale change) and the prior CDP session is stale.
` + "Action: retry the command; the bridge will create a fresh session.");
    }
    const callPromise = session.send(qualified, input.params);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error(`CDPBridgeTimeout: ${qualified} did not return within ${CDP_TIMEOUT_MS}ms`)), CDP_TIMEOUT_MS));
    const raw = await Promise.race([callPromise, timeoutPromise]);
    return { raw, entry };
  } finally {
    release();
  }
}
var CDP_TIMEOUT_MS = 5000, CDP_ACQUIRE_TIMEOUT_MS = 5000, sessionCache;
var init_cdp_bridge = __esm(() => {
  init_cdp_allowlist();
  init_telemetry();
  sessionCache = new WeakMap;
});

// lib/result-codes-release.ts
var RELEASE_RESULT_CODES;
var init_result_codes_release = __esm(() => {
  RELEASE_RESULT_CODES = {
    POLICY_GSTACK_TOO_OLD: {
      anchor: "policy-gstack-too-old",
      summary: "the ship policy sets min_gstack_version above this gstack, so this gstack refuses to read it",
      fix: "upgrade gstack (bin/gstack-upgrade, or the session install with --for <skill>) to the version named, then rerun"
    },
    QUEUE_NOT_READY: {
      anchor: "queue-not-ready",
      summary: "the lane is not ready to report: the working tree, HEAD or CI state does not match the pushed PR head",
      fix: "commit and push the work (or wait for CI on that exact head), then rerun gstack-ship-queue ready"
    },
    QUEUE_PROOF_MISSING: {
      anchor: "queue-proof-missing",
      summary: "a proof input the queue step needs is missing or does not match (gated head, base, stamp journal, version or tree)",
      fix: "supply the named input (fetch the gated head, pass the expected sha), or regate; nothing was written"
    },
    QUEUE_STAMP_NOT_STAMP_ONLY: {
      anchor: "queue-stamp-not-stamp-only",
      summary: "the stamp commit differs from the gated head by more than stamps, so the gate does not cover it",
      fix: "inspect the printed residual paths; drop the stray edit, or run the gate again on the stamped head"
    },
    QUEUE_VERIFY_MISMATCH: {
      anchor: "queue-verify-mismatch",
      summary: "the coordinator could not reproduce the lane’s stamp claim: the PR head, the recomputed gate-ahead merge or the gated tree differs",
      fix: "do not merge; ask the lane to rerun gstack-ship-queue stamp (or gate-ahead) on the current queue and report again"
    },
    QUEUE_GATE_MISSING: {
      anchor: "queue-gate-missing",
      summary: "the policy sets full_e2e and no passing full-gate record is bound to this tree",
      fix: "run the gate the policy names (gstack-ship-queue gate-ahead, then --record) or pass the record of a passing run on this head"
    },
    GATE_AHEAD_ATTEMPT_INVALID: {
      anchor: "gate-ahead-attempt-invalid",
      summary: "the gate-ahead attempt is unknown, already recorded, or its worktree no longer holds the gated commit",
      fix: "list attempts with gstack-ship-queue gate-ahead --list, then record the live one, or prepare a new attempt"
    },
    QUEUE_TRAIN_OFF: {
      anchor: "queue-train-off",
      summary: "the base revision’s .gstack/ship-policy.json declares no `train` block, so the merge-train surface is off and the per-PR queue applies",
      fix: "use the per-PR queue (ready, stamp, verify), or land a `train` block with min_gstack_version on the base branch first"
    },
    QUEUE_TRAIN_UNTRUSTED: {
      anchor: "queue-train-untrusted",
      summary: "a PR’s head repository is not the base repository; fork work never runs in a train (the train branch and its dispatch carry repository secrets)",
      fix: "leave the PR out of the train (gstack-ship-queue train build --prs <list without it>); fork work stays on the trusted-branch path"
    },
    QUEUE_TRAIN_MOVED: {
      anchor: "queue-train-moved",
      summary: "a PR’s head (or the train branch) is no longer the SHA the train pinned, so the train would not test what merges",
      fix: "ask the lane for a fresh READY on the new head, then rebuild the train with the new pin (train build --prs <n>@<new sha>,...)"
    },
    QUEUE_TRAIN_CONFLICT: {
      anchor: "queue-train-conflict",
      summary: "merging a PR onto the previous prefix conflicts outside the version files and the CHANGELOG; nothing was dispatched and no branch pushed",
      fix: "run the printed train build without that PR; the PR’s lane merges main (with the earlier PRs once they land) and reports READY again"
    },
    QUEUE_TRAIN_FREE_RED: {
      anchor: "queue-train-free-red",
      summary: "the free tests dispatched on train/<nonce> are red, missing, cancelled or ran on another SHA, so the paid gate was not dispatched",
      fix: "read the free-tests run; a PR-caused red drops that PR (train build --prs <list without it>), a flaky one goes to its owner before the next build"
    },
    QUEUE_TRAIN_DISPATCH_UNKNOWN: {
      anchor: "queue-train-dispatch-unknown",
      summary: "a train dispatch was attempted but its run could not be found by nonce, so whether it started is unknown; it is never re-dispatched blindly",
      fix: "run gstack-ship-queue train status --train <nonce>: it finds the run by nonce, or marks the dispatch absent so train build --train <nonce> may dispatch it"
    },
    QUEUE_TRAIN_WAITING: {
      anchor: "queue-train-waiting",
      summary: "the train is below its size and its oldest READY PR has waited less than the policy’s fill time, so it does not dispatch yet",
      fix: "add READY PRs, rerun once the printed time has passed, or pass --urgent for a one-PR train"
    },
    QUEUE_TRAIN_PENDING: {
      anchor: "queue-train-pending",
      summary: "the train’s run (free tests, the full gate or the bisect) has not finished, so there is no verdict yet",
      fix: "rerun the printed NEXT: command later; nothing is dispatched again while a run is pending"
    },
    QUEUE_TRAIN_INCOMPLETE: {
      anchor: "queue-train-incomplete",
      summary: "the train gate did not complete its census (INFRA or INCOMPLETE panels, an unbound, partial or cancelled shard, a slice killed before upload, or no published record), so it is never green",
      fix: "when every gap is machine-classified INFRA or INCOMPLETE, take the one re-dispatch EVAL_POLICY.infraRedispatch allows (train rebuild --train <nonce> --infra) and report both runs; otherwise diagnose the run"
    },
    QUEUE_TRAIN_RED: {
      anchor: "queue-train-red",
      summary: "the train’s full gate is red on the train tree; its PRs do not merge, and nothing is retried to change the verdict",
      fix: "bisect the red cases (train bisect --train <nonce> --spend-cap <usd>); after a rebuild’s second red, route the cases to a repair lane"
    },
    QUEUE_TRAIN_RED_ON_MAIN: {
      anchor: "queue-train-red-on-main",
      summary: "the bisect found the red cases red on every prefix, main (T0) included: main is broken, not the train’s PRs",
      fix: "fix forward on main first (a one-PR train), then rebuild this train unchanged"
    },
    QUEUE_TRAIN_UNATTRIBUTED: {
      anchor: "queue-train-unattributed",
      summary: "the bisect pattern blames no PR and not main (all green, or not monotone); one trial cannot tell a flake from a break",
      fix: "all green: the one preregistered rebuild (train rebuild --train <nonce>), reporting both runs; any other pattern: a repair lane, then a changed train"
    },
    QUEUE_TRAIN_BISECT_CAPPED: {
      anchor: "queue-train-bisect-capped",
      summary: "the bisect’s reserved price (every case×prefix trial, unknown costs at the policy reservation) passes the spend cap; completed prefixes are kept and the outcome stays unattributed",
      fix: "resume with a higher cap (train bisect --train <nonce> --spend-cap <usd>); only prefixes without a result run"
    },
    QUEUE_TRAIN_PREFIX_INVALID: {
      anchor: "queue-train-prefix-invalid",
      summary: "a bisect prefix is not an ancestor of the train head on train/<nonce>, or a red case is not in the gate’s plan, so the bisect inputs are refused",
      fix: "check that train/<nonce> still points at the recorded head (train status); a moved branch needs a new train"
    },
    QUEUE_TRAIN_REBUILD_REFUSED: {
      anchor: "queue-train-rebuild-refused",
      summary: "the rebuild is not allowed: the bisect was not all green, the train was already rebuilt (or re-dispatched), or there is no bisect or INFRA record",
      fix: "route the red cases to a repair lane; the train is rebuilt only once the repair merges (a changed train)"
    },
    QUEUE_TRAIN_STAMP_MISMATCH: {
      anchor: "queue-train-stamp-mismatch",
      summary: "a stamped train prefix S_i is not the merge of S_(i-1) and its pin modulo stamps, or differs from the plain prefix T_i outside release paths, or could not be stamped; nothing was pushed",
      fix: "read the named slot and files: a stamp hook writing product files is fixed in the hook; otherwise rebuild the train without that slot and report it"
    },
    QUEUE_TRAIN_TREE_MISMATCH: {
      anchor: "queue-train-tree-mismatch",
      summary: "main’s tree is neither the train’s prefix before this PR nor after it (modulo stamps), so the merge does not publish what the gate tested",
      fix: "stop merging; if earlier PRs of the train merged, the queue is frozen (QUEUE_TRAIN_FROZEN); otherwise rebuild the train on current main"
    },
    QUEUE_TRAIN_STALE: {
      anchor: "queue-train-stale",
      summary: "every slot of this train already merged on GitHub and main is a prefix another train verified, so the record is stale; comparing today’s main to its prefixes proves nothing and does not freeze the queue",
      fix: "settle the record with train prune --stale --train <nonce>; no backstop is needed"
    },
    QUEUE_TRAIN_FROZEN: {
      anchor: "queue-train-frozen",
      summary: "a train stopped partway through publication, so main holds a prefix no gate covered on its own; ordinary trains are refused until a repair lands",
      fix: "admit one repair PR at its exact head (train build --repair --prs <n>@<sha>); the freeze clears when verify finds main’s tree after that merge in a green record"
    },
    QUEUE_RECEIPT_MISSING: {
      anchor: "queue-receipt-missing",
      summary: "the PR body carries no valid /ship receipt, so the PR was never shipped through gstack and cannot be READY’d, admitted to a train or merged",
      fix: "run /ship on the branch (unattended it writes the receipt into an open PR at HEAD with gstack-ship-receipt write --pr <n> --body …, else leaves it in .gstack/tmp/ship-receipt.md for the parent to post), then gstack-ship-queue ready again; there is no flag to skip this"
    },
    QUEUE_RECEIPT_STALE: {
      anchor: "queue-receipt-stale",
      summary: "the PR body’s /ship receipt is for another head than the one being READY’d or merged (a push after /ship, or a receipt copied from another PR)",
      fix: "rerun /ship on the current head so the receipt names it, then gstack-ship-queue ready again; a slot’s stamp commit keeps the receipt written for its pinned head"
    },
    QUEUE_RECEIPT_CONDITIONAL: {
      anchor: "queue-receipt-conditional",
      summary: "the PR body’s /ship receipt is conditional: Step 5 failed on cases gstack-base-red proved are the base branch’s own, so /ship paused before READY",
      fix: "wait for the base to pass those cases (gstack-base-red wait --pause <file>), then /ship --resume <record>, which re-runs Step 5 and rewrites the receipt without base_red; nothing READYs, trains or merges on a conditional receipt"
    },
    BASE_RED_UNCONFIGURED: {
      anchor: "base-red-unconfigured",
      summary: "the base branch’s ship policy declares no base_red block, so gstack-base-red cannot reproduce a Step 5 failure there and every failure stays in-branch",
      fix: "handle the failure with /ship’s usual triage; to let /ship pause on a red base, add base_red { setup, select, timeout_sec } to .gstack/ship-policy.json on the base branch"
    },
    BASE_RED_UNNAMED: {
      anchor: "base-red-unnamed",
      summary: "the failure evidence names fewer failures than the Step 5 lane reported, so an unnamed failure could be in-branch",
      fix: "list every failing test in the evidence file (id, file, first error line), with total equal to the lane’s failure count, and classify again"
    },
    BASE_RED_REPRO_ERROR: {
      anchor: "base-red-repro-error",
      summary: "gstack-base-red could not reproduce at the base or the PR head: a commit did not resolve, the scratch checkout failed, or the setup command exited non-zero",
      fix: "read the printed detail; fix the base_red setup command on the base branch or fetch the base, then classify again. Until then every failure is in-branch"
    },
    BASE_RED_PAUSE_EXPIRED: {
      anchor: "base-red-pause-expired",
      summary: "the base-red pause is older than 24 hours, so its classification is stale",
      fix: "report the paused PR to its Captain (or owner), then start /ship again on the current base; it classifies afresh"
    },
    BASE_RED_WAIT_TIMEOUT: {
      anchor: "base-red-wait-timeout",
      summary: "no new base head passed the paused cases before gstack-base-red wait’s timeout",
      fix: "run gstack-base-red wait --pause <file> again (the pause stays valid until it expires), or check who owns the base red"
    },
    QUEUE_RECEIPT_DEPTH_RAISED: {
      anchor: "queue-receipt-depth-raised",
      summary: "the PR body’s /ship receipt records a review depth below the one its head needs (the queue recomputed it from git), or a current receipt records no review_depth at all",
      fix: "run /ship on the head the READY names; the REVIEW_DEPTH line shows the receipt’s depth, the required depth, its reasons and inputs, and the receipt is left unchanged"
    },
    QUEUE_RECEIPT_EXCEPTION_INVALID: {
      anchor: "queue-receipt-exception-invalid",
      summary: "the PR body’s /ship receipt records an owner exception (docs or review loop) that is malformed, lacks the fix-check it follows, or whose line the body no longer carries verbatim",
      fix: "restore the exception line in the PR body word for word, or run /ship again and record the owner’s acceptance with --docs or --review-loop-exception"
    },
    QUEUE_SCREEN_STALE_REF: {
      anchor: "queue-screen-stale-ref",
      summary: "GitHub’s refs/pull/<n>/merge is missing or still merges an older head than the PR’s: the PR conflicts with the base (a CHANGELOG-only conflict counts), so a screen dispatched on it would plan no cases and report success",
      fix: "resolve the conflict with the base branch (or wait for GitHub to recompute the merge ref), push, then gstack-ship-queue ready --pr <n> --screen again; a lane never READYs on a screen that planned nothing"
    },
    QUEUE_SCREEN_NOT_RUN: {
      anchor: "queue-screen-not-run",
      summary: "the PR’s dispatched screen run concluded success but ran no slice (the run planned no cases: its route job found the PR head superseded by a push, or the plan selected nothing), so the head is not screened and the run is counted as not-run, never as green",
      fix: "gstack-ship-queue ready --pr <n> --screen dispatches a fresh screen at the current head (a not-run screen is never followed); train build seats the pin unscreened and says so on its SCREEN: line"
    },
    QUEUE_TRAIN_STACK_RED: {
      anchor: "queue-train-stack-red",
      summary: "train build --dry-run --stack-tests ran a PR’s new test files on the integrated prefix that includes it (T<k>: main plus every slot up to that PR) and they failed; the tests pass on the PR head alone only because nothing before it in the train had changed what they read",
      fix: "fix the PR’s tests against that prefix (read the STACK_TESTS: line for the files and the failing assertion), or reorder the train with --order so the PR they depend on comes first, then rerun the dry run; nothing was written, pushed or dispatched"
    },
    QUEUE_POST_MERGE_RED: {
      anchor: "queue-post-merge-red",
      summary: "a push workflow on the merged commit (free tests, the Windows subset, the main backstop) concluded failure, timed out or was cancelled after the train merged it; a neutral or skipped check is not red",
      fix: "read the red run (gstack-ship-queue verify --post-merge <sha> prints one CHECK: line per workflow), repair on a new PR or roll back the merge; gstack-ship-queue train status names the freeze if the backstop filed one"
    },
    QUEUE_SCREEN_RED: {
      anchor: "queue-screen-red",
      summary: "the PR head’s dispatched screen run finished RED (its gate binding says so; a case that failed twice is real), so the head is not READY and a train will not seat it",
      fix: "read the SCREEN_VERDICT line (gstack-ship-queue verify --pr <n> --screen prints the red and flaky cases), repair, push a new head, run /ship and ready again; a red screen is never re-dispatched at the same merge SHA"
    },
    READY_SCREEN_CHOICE_REQUIRED: {
      anchor: "ready-screen-choice-required",
      summary: "the base policy turns trains on, so READY needs an explicit screen choice: --screen (pay for a diff-relevant screen now) or --no-screen",
      fix: "rerun gstack-ship-queue ready with the printed recommendation (--screen or --no-screen); say in the READY block if focused local cases already ran"
    },
    PREGATE_TIMING_ASSERTION: {
      anchor: "pregate-timing-assertion",
      summary: "an added or changed test line compares an elapsed wall-clock or CPU time against a bound, or sleeps and then asserts (a warning, not a block)",
      fix: "assert on the outcome, an injected clock or a forced deadline instead; when the bound is the contract, add `gstack-timing-ok: <reason>` in a comment on the line or the line above"
    },
    PREGATE_NO_POLICY: {
      anchor: "pregate-no-policy",
      summary: "the repository has no pregate policy yet (no .gstack/pregate.json on the base branch and no user-owned file) and a touched file maps to no test lane; a warn, with a starter policy printed",
      fix: "review the printed starter, write it with `gstack-pregate init`, edit the TODO entries, then commit .gstack/pregate.json on the base branch; from then on an unmapped file is PREGATE_NO_LANE"
    },
    PREGATE_ENVIRONMENT: {
      anchor: "pregate-environment",
      summary: "a check could not run because of the machine, not the diff: a runner or guard binary missing from PATH, a network error or quota refusal before any test ran, a full disk, or an unverified runtime; incomplete, never pass",
      fix: "read the `environment:` line (kind and evidence), repair that on this machine or run the lane remotely (`--remote`, `gstack-pregate clear`), then rerun; a waiver cites the kind, never a test name"
    },
    APPROVAL_CLASSES_INVALID: {
      anchor: "approval-classes-invalid",
      summary: "`.gstack/approval-classes.json` is malformed, a class matches nothing, or a path escapes the repository",
      fix: "keep `classes` a non-empty list of uniquely named classes, each with `paths`, `patterns` or `migrations: true`, and every glob repo-relative (`gstack-approval-classes validate` checks the working-tree copy)"
    },
    APPROVAL_CLASS_FOUND: {
      anchor: "approval-class-found",
      summary: "the branch changes something a declared approval class covers",
      fix: "get the owner's approval and put `Approved by <owner> <YYYY-MM-DD> via <plan sha|comment or review URL> for <class>@<digest12>` in the PR body, using the APPROVAL_SCOPE token the check printed"
    },
    APPROVAL_CITATION_MISSING: {
      anchor: "approval-citation-missing",
      summary: "a declared approval class has no citation that resolves and binds to its current effects, so no receipt was written",
      fix: "add an `Approved by` line whose plan (with --approval-run <dir>) or maintainer comment names the APPROVAL_SCOPE token or the class and every effect path; for evidence gstack cannot read, attest it with `for <class>@<digest12>` on the line. Only the owner approves: never write the line without their approval"
    },
    APPROVAL_SOURCE_UNAVAILABLE: {
      anchor: "approval-source-unavailable",
      summary: "origin/<base> is not a resolvable commit, so the committed .gstack/approval-classes.json cannot be read and nothing was checked",
      fix: "git fetch origin <base> (classes are never read from the working tree)"
    },
    STATE_MATRIX_INCOMPLETE: {
      anchor: "state-matrix-incomplete",
      summary: "the state-machines specialist output lacks a kind × owner action cell, maps a cell to a test that does not exist, or leaves an untested cell without a CRITICAL finding",
      fix: "rerun the state-machines specialist on the same diff; its review coverage stays incomplete until gstack-state-matrix check passes"
    },
    WTREE_UNAVAILABLE: {
      anchor: "wtree-unavailable",
      summary: "cannot fingerprint the working tree: bin/gstack-wtree could not start (on Windows, no Git Bash was found) or it ran and failed",
      fix: "on Windows point GSTACK_GIT_BASH at Git Bash's bash.exe (Git Bash: export GSTACK_GIT_BASH='C:/Program Files/Git/bin/bash.exe'; PowerShell: $env:GSTACK_GIT_BASH = 'C:\\Program Files\\Git\\bin\\bash.exe'), or install Git for Windows (winget install --id Git.Git -e); elsewhere rerun ./setup so bin/gstack-wtree is present; then rerun gstack-pregate"
    },
    REGEN_DEPS_MISSING: {
      anchor: "regen-deps-missing",
      summary: "a regen command exited 0 with different outputs while package.json declares dependencies and node_modules is missing, so the outputs were not verified",
      fix: "install the dependencies (the printed command, such as bun install), then rerun the check"
    },
    REVIEW_SCOPE_INPUT: {
      anchor: "review-scope-input",
      summary: "gstack-review-scope was given input it cannot classify: findings that are not a JSON array of objects, a --pass or --policy outside its values, or a pass 2+ call without --range-base",
      fix: "pass the Step 9.3 findings as a JSON array (--findings <file> or stdin), --pass <n> from the invocation record, and from pass 2 on --range-base <sha> (HEAD at the start of the previous pass)"
    },
    REVIEW_SCOPE_RANGE: {
      anchor: "review-scope-range",
      summary: "gstack-review-scope could not read the diff it scopes findings against: the base or the range base does not resolve, or the range base is not an ancestor of HEAD",
      fix: "fetch origin/<base>, check --range-base against the saved pass heads, and start a full pass (--pass 1) when history was rewritten"
    },
    RECEIPT_CARRY_REFUSED: {
      anchor: "receipt-carry-refused",
      summary: "gstack-ship-receipt carry could not carry the /ship receipt to HEAD: the PR body has no receipt, the working tree has uncommitted changes, the receipt head is not an ancestor of HEAD and the receipt records no tree to compare, or the product diff could not be compared",
      fix: "commit or stash working-tree changes and rerun carry; when history was rewritten and the receipt predates head_tree, run /ship on the new head (merge the base in instead of rebasing next time)"
    },
    PROSE_LINT_FOUND: {
      anchor: "prose-lint-found",
      summary: "the prose /ship is about to publish (a CHANGELOG entry or a PR body) carries an AI tell a regular expression can decide",
      fix: "rewrite each PROSE: line in the draft the way its hint says, then rerun gstack-prose-lint on the same file"
    },
    REVIEW_LOOP_EXCEPTION_INVALID: {
      anchor: "review-loop-exception-invalid",
      summary: "write --review-loop-exception got an exception that is malformed, follows no fix-check (review_loop.fix_checks is 0 or missing), names a fix-check head that is not the receipt head or its ancestor, or is missing from the PR body",
      fix: 'pass { accepted_by, date, via, reason, fix_check: { head, findings } } with the owner’s words, the --review-loop summary that counts the fix-check, and the printed "Review-loop exception: …" line in the body'
    },
    RECEIPT_CARRY_TREE_MISMATCH: {
      anchor: "receipt-carry-tree-mismatch",
      summary: "the branch was rebased or force-pushed since its /ship receipt, and HEAD's tree is not a tree the receipt covers, so no review saw this code",
      fix: "run /ship on the new head; next time merge the base in instead of rebasing a reviewed branch (a rebase carries only onto a reviewed tree with the reviewed product diff)"
    },
    RECEIPT_CARRY_PRODUCT_CHANGED: {
      anchor: "receipt-carry-product-changed",
      summary: "the product diff against the base changed between the receipt's head and HEAD (a product file differs beyond a base merge, a test-only fix, release metadata or a regenerated output), so the reviewed verdict does not cover HEAD",
      fix: "run /ship on the new head; the receipt carries only when every changed path is a test, release metadata, a registered output the pregate regen check proved, or the base merge, and the product patch-id is unchanged"
    },
    DOCS_AUDIT_BLOCKED: {
      anchor: "docs-audit-blocked",
      summary: "the documentation audit (/ship Step 14.5) is blocked: gstack-ship-receipt docs-caps found a declared doc cap over, or gstack-ship-receipt write was given a blocked audit with no owner exception and refused to record the ship as audited",
      fix: "repair the audit (or trim the doc named by the DOCS_CAP: over line) and rerun Step 14.5; when the owner accepts the named risk, record it as docs.exception { accepted_by, date, via, reason } and carry the same line in the PR body's Documentation section"
    },
    RECEIPT_PROSE_MISMATCH: {
      anchor: "receipt-prose-mismatch",
      summary: "the PR body quotes a counter the ship receipt also records (review passes, deferred findings, gate case counts) with a different number, so the prose and the receipt disagree about the same run",
      fix: "correct the body to the receipt's number (the PROSE: line names each field with both values); when the receipt is the stale one, rerun /ship so the receipt is rewritten from the run"
    },
    RECEIPT_CARRY_PREGATE_STALE: {
      anchor: "receipt-carry-pregate-stale",
      summary: "gstack-ship-receipt carry would rebind a receipt that records a pregate without a pregate result current for HEAD, so the carried receipt would claim the old tree's checks",
      fix: "run gstack-pregate at HEAD (the remote tests stage when the policy requires it), then rerun carry with --pregate <pregate.json>"
    },
    RECEIPT_GIT_TOO_OLD: {
      anchor: "receipt-git-too-old",
      summary: "gstack-ship-receipt carry needs git 2.39 or later for `git patch-id --verbatim`; the installed git is older, so the product diff could not be compared",
      fix: "upgrade git to 2.39 or later (the refusal names the installed version), then rerun carry; otherwise run /ship on the new head"
    },
    CHANGELOG_FRAGMENT_INVALID: {
      anchor: "changelog-fragment-invalid",
      summary: "a CHANGELOG fragment is not one regular .md file directly in the fragment directory with entry text, optional bump front matter and no release heading, or one of that name already landed with other text",
      fix: 'rewrite the named fragment as a flat <dir>/<slug>.md with only the entry text (and optional "bump: minor|major" front matter), rename it if the name already landed, then rerun'
    },
    QUEUE_LAND_LOCKED: {
      anchor: "queue-land-locked",
      summary: "another gstack-ship-queue land holds the repository land lock (refs/notes/gstack-land), so this one would race it for the next version",
      fix: "wait for the holder named in the line to finish; if it crashed, gstack-ship-queue land --pr <n> --break-lock (refused while its journal shows a push in flight)"
    },
    QUEUE_LAND_CONFLICT: {
      anchor: "queue-land-conflict",
      summary: "the PR conflicts with the base branch in product files (or a release field cannot be resolved alone), so the merge step cannot stamp it",
      fix: "the lane merges the base branch into the PR, resolves the named files, runs /ship and reports READY again"
    },
    QUEUE_LAND_DRIFT: {
      anchor: "queue-land-drift",
      summary: "the base branch moved between the merge step's last check and the squash merge, so main's tree is not the stamped tree land verified",
      fix: "gstack-ship-queue land --pr <n> --repair opens a PR whose only change is a fragment for what the outside merge brought; /ship and land it, which releases the lock"
    },
    QUEUE_LAND_BASE_BUSY: {
      anchor: "queue-land-base-busy",
      summary: "the base branch moved during the stamp commit's CI on each of the allowed restamp attempts, so land stopped instead of restamping again",
      fix: "find what is merging outside land (every merge should go through it), then rerun gstack-ship-queue land --pr <n>; it resumes from its journal"
    },
    PR_WAIT_BLOCKED: {
      anchor: "pr-wait-blocked",
      summary: "the --until condition cannot be met without action: a check failed, the branch conflicts with its base, the PR closed, ready is blocked by unresolved threads or a BEHIND branch, GitHub stayed unreachable, or --timeout passed",
      fix: "act on the event lines above it (fix the check, update or rebase the branch, resolve the threads), push, and start gstack-pr-wait again; after a timeout, start again with a larger --timeout or --timeout 0"
    },
    PR_WAIT_REFUSED: {
      anchor: "pr-wait-refused",
      summary: "the watcher did not start, or a local error stopped it before a verdict",
      fix: "pass a PR number or URL the current gh login can read (--repo owner/name when the checkout is not that repository), stop the watcher the line names before starting another for the same PR, or fix the named local error"
    },
    PREGATE_HEAD_POLICY_LOOSENS: {
      anchor: "pregate-head-policy-loosens",
      summary: "under --policy-from head, the branch’s .gstack/pregate.json removes, shrinks or loosens something the trusted policy declares; a head policy may only add test lanes",
      fix: "keep every key of the trusted policy as it is and only add dependencies globs with tests (or tests on an existing glob); land any other change, a [] declaration included, in its own PR on the base branch first"
    }
  };
});

// lib/result-codes-capy.ts
var CAPY_RESULT_CODES;
var init_result_codes_capy = __esm(() => {
  CAPY_RESULT_CODES = {
    APPROVAL_RECORD_INVALID: {
      anchor: "approval-record-invalid",
      summary: "an approval row is missing a required field, holds a value outside its enum, or exceeds a length cap",
      fix: "rerun gstack-approvals add with every required flag (--ask, --words, --scope, --by) inside the caps it names; nothing was written"
    },
    APPROVAL_RECORD_SECRET: {
      anchor: "approval-record-secret",
      summary: "a field of the approval row matched the secret scanner, so the row was refused and nothing was written",
      fix: "record the words with the secret removed (write [redacted] in its place) or ask the person to restate them; the refusal names the field and rule, never the text"
    },
    APPROVAL_RECORD_NO_BRANCH: {
      anchor: "approval-record-no-branch",
      summary: "the approval record is kept per branch, and HEAD is detached or this is not a git repository",
      fix: "check out the branch the work ships from, or pass --branch <name>"
    },
    APPROVAL_RECORD_UNAVAILABLE: {
      anchor: "approval-record-unavailable",
      summary: "no approval record exists on this machine and the state root is ephemeral with no Drive mirror, so an empty table could be a lost one",
      fix: 'restore the record (copy it back from the thread report, or run on the machine that holds it), or set up the Capy Drive mirror; the section says "Record unavailable" instead of "No approvals recorded"'
    },
    APPROVAL_RECORD_WRITE_FAILED: {
      anchor: "approval-record-write-failed",
      summary: "the approval record or its Drive mirror could not be written",
      fix: "check the path and permission the line names (the state root must be writable), then rerun; a failed append wrote nothing"
    },
    APPROVAL_IMPORT_UNANSWERED: {
      anchor: "approval-import-unanswered",
      summary: "the autoplan run has no answered gate to import",
      fix: "answer the gate first (gstack-autoplan answer ... --by human|agent:<id>), then rerun the import; it is idempotent, so a retry imports nothing twice"
    },
    CAPTAIN_BRIEF_INCOMPLETE: {
      anchor: "captain-brief-incomplete",
      summary: "the plan lacks one or more of the sections the Captain brief needs (ELI5 on a run whose gate carries it, Before → after, Why it matters, What caused this work, Big decisions), so the brief is not ready for approval",
      fix: "add the named sections to the plan, revise the run if the plan is under review, and render again; --allow-incomplete prints a preview that still says it is not ready"
    },
    PR_SHOTS_INPUT_NOT_FOUND: {
      anchor: "pr-shots-input-not-found",
      summary: "a before/after input does not exist: the file, the base ref, the path at that ref, or the heading on both sides",
      fix: "check the ref, path and heading the line names (gstack-pr-shots reads tracked files and repository-local captures only)"
    },
    PR_SHOTS_INPUT_REFUSED: {
      anchor: "pr-shots-input-refused",
      summary: "an input was refused before rendering: it matched the secret scanner, is binary, is too large, lies outside the repository and state root, or names an option-like ref",
      fix: "remove the secret from the capture (the line names the side, line and rule, never the text), or point at a tracked text file inside the repository"
    },
    PR_SHOTS_IDENTICAL: {
      anchor: "pr-shots-identical",
      summary: "the before and after inputs are the same, so there is no change to picture",
      fix: "pick the file or section this change actually touched (git diff --stat origin/<base>...HEAD lists them)"
    },
    PR_SHOTS_RENDER_FAILED: {
      anchor: "pr-shots-render-failed",
      summary: "a browser was available but rendering shot.html failed",
      fix: "read the renderer transcript the line names; screenshot shot.html with your own browser at 880px width, or use the text fallback in text.md"
    },
    LAUNCH_FILE_UNWRITABLE: {
      anchor: "capy-install-launch-file-unwritable",
      summary: "the install passed but its launch file (the sourceable GSTACK_LAUNCH_FILE beside the verdict) could not be written, so the run is a fail: no caller is handed only the launch line to re-type",
      fix: "make the verdict directory under the state root writable, or set GSTACK_STATE_ROOT to a writable directory, then re-run bin/gstack-capy-install"
    },
    PROJECT_FLOOR_UNMET: {
      anchor: "project-floor-unmet",
      summary: "the installed gstack is below the floor the project declares (min_gstack_version in its .gstack/ship-policy.json); the row is a WARN and the trailer stays ok, because a floor is a project rule, not a security minimum",
      fix: "run the install command the row names (the Capy skill installer fast-forwards a clean checkout to origin in one step; gstack-upgrade elsewhere) before the first workflow, or lower the floor in the project"
    },
    PROJECT_NODE_PIN_UNMET: {
      anchor: "project-node-pin-unmet",
      summary: "the Node on PATH does not satisfy the project's Node pin while every Bun pin is met; the pins row is a WARN and the trailer stays ok, because gstack runs on Bun and the project's own tests may select their Node (nvm, CI)",
      fix: "put a Node that satisfies the pin first on PATH (the Capy skill installer installs an exact pin into gstack's runtime store and launches it through the GSTACK_LAUNCH PATH), or change the pin in the project"
    },
    UPGRADE_SKIPPED: {
      anchor: "upgrade-skipped",
      summary: "the install-mode session was behind origin and its session-start fast-forward was skipped (dirty, diverged or pinned checkout, a live lease, or gstack-upgrade missing); the row is a WARN with the reason and the trailer stays ok with a behind= note, because a gap above the supported minimum is never a hard fail",
      fix: "run the fix the row names (bin/gstack-upgrade after clearing its refusal, or the Capy skill installer) when the lane needs the newer gstack; below the supported minimum the bootstrapper fails revision instead"
    }
  };
});

// lib/result-codes-budget.ts
var BUDGET_RESULT_CODES;
var init_result_codes_budget = __esm(() => {
  BUDGET_RESULT_CODES = {
    BUDGET_CAP_REACHED: {
      anchor: "budget-cap-reached",
      summary: "the next step or dispatch would push used + open reservations + its projection + the tail and stop reserve past the admission cap, so it did not start",
      fix: "the run stopped status=incomplete with a resumable record; raising the cap is the owner's call: run the printed RECOVER line, whose resume needs --approved-by <who> --words <their words>"
    },
    BUDGET_READING_MISSING: {
      anchor: "budget-reading-missing",
      summary: "the Capy meter needs a fresh counter reading and none was passed",
      fix: 'read cost.tokens from tools.thread.get({ thread_id: "<your own jam id>" }) (your own jam, its subagents included, never the root thread) inside the execute program that runs the command and pass it with --reading <n> (ship/sections/budget-handoff.md has the recipe)'
    },
    BUDGET_READING_REJECTED: {
      anchor: "budget-reading-rejected",
      summary: "the reading does not fit the run's meter contract: it is lower than the last reading of the same epoch, it was passed to a meter that reads its own source, or --prior-reading is above --reading",
      fix: "pass the counter the run started with (the BUDGET line names meter, unit and epoch); a different meter starts a new epoch through gstack-ship-budget resume --meter <m>"
    },
    BUDGET_METER_UNAVAILABLE: {
      anchor: "budget-meter-unavailable",
      summary: "a cap is set and no meter is readable: no --reading, no bound Claude Code session and no --meter estimate",
      fix: "pass --reading <n> on Capy, --session <id> or --nonce <value> on Claude Code, or --meter estimate to accept the conservative estimate (printed meter=estimate)"
    },
    BUDGET_LEDGER_INVALID: {
      anchor: "budget-ledger-invalid",
      summary: "the budget ledger or the record's gstack-budget block is missing, unparseable, or from another schema version",
      fix: "restore it from the Drive checkpoint (gstack-ship-budget resume --run <id>) or rebuild it from the record with resume --record <path> --rebuild-from-record --reading <n>; open reservations are then charged as unknown"
    },
    BUDGET_CHECK_SKIPPED: {
      anchor: "budget-check-skipped",
      summary: "a dispatch under a cap started without an unspent reservation id from gstack-ship-budget check, or reused or mismatched one",
      fix: "run gstack-ship-budget check --run <id> --step <s> --next dispatch:<roles> before the dispatch and pass its RESERVATION id once; a reservation is never created after the fact, so an unreserved dispatch ends the run status=incomplete for the owner to accept"
    },
    HANDOFF_PIN_MOVED: {
      anchor: "handoff-pin-moved",
      summary: "the handoff brief no longer matches the tree it was written for: HEAD, the merge base, the working tree or the brief's own hash moved",
      fix: "the child returns status=refused; the parent regenerates the handoff at the current tree (gstack-ship-budget handoff ...) or stops; main moving alone never refuses"
    }
  };
});

// lib/result-codes-eval.ts
var EVAL_RESULT_CODES;
var init_result_codes_eval = __esm(() => {
  EVAL_RESULT_CODES = {
    PREREG_INCOMPLETE: {
      anchor: "prereg-incomplete",
      summary: "the preregistration file lacks a required section, a section is empty, or the Comparison or Diagnostics declaration is malformed",
      fix: "fill every section `gstack-eval-plan prereg --check` names (bars, arms, comparison, decoys, stop rules, held-out exposure) before any priced call"
    },
    PREREG_DIAGNOSTIC_UNTESTED: {
      anchor: "prereg-diagnostic-untested",
      summary: "the declared summarizer, run on the declared synthetic fixture, did not report every preregistered diagnostic at its expected count",
      fix: "fix the summarizer or the declared definition (expected count, fixture) until every PREREG_DIAGNOSTIC line says ok, then commit the freeze; never freeze a diagnostic the summarizer has not counted"
    },
    PREREG_NO_GSTACK_ARM: {
      anchor: "prereg-no-gstack-arm",
      summary: "the Comparison says stack: loaded and the No-gstack arm section is missing, lacks a key, or does not give every model its own <model>#no-gstack Arms line",
      fix: "add `## No-gstack arm` with arms:, inputs:, prompt:, panel: and report:, and list each <model>#no-gstack arm under Arms; when no arm loads a skill stack, say stack: none with a why: line"
    },
    EVAL_ARM_DUPLICATE: {
      anchor: "eval-arm-duplicate",
      summary: "the pilot was given the same arm identity twice, so two arms would share one set of attempts",
      fix: "give each arm its own identity, <model> or <model>#<loadout> (for example claude-opus-5-5#no-gstack beside claude-opus-5-5); nothing was reserved"
    }
  };
});

// lib/result-codes.ts
function resultLine(context, code, detail) {
  const row = RESULT_CODES[code];
  const what = detail ? `${row.summary} (${detail})` : row.summary;
  return `${context}: ${what}; fix: ${row.fix} (${code})`;
}
var RESULT_CODES;
var init_result_codes = __esm(() => {
  init_result_codes_release();
  init_result_codes_capy();
  init_result_codes_budget();
  init_result_codes_eval();
  RESULT_CODES = {
    ARTIFACT_INVALID_JSON: {
      anchor: "artifact-invalid-json",
      summary: "the manifest or a JSON artifact is not valid JSON",
      fix: "regenerate the run with the tool that writes it; never hand-edit a manifest"
    },
    ARTIFACT_UNSUPPORTED_VERSION: {
      anchor: "artifact-unsupported-version",
      summary: "the artifact declares a schema_version this gstack does not read",
      fix: "run /gstack-upgrade on the consumer, or regenerate the run with this gstack"
    },
    ARTIFACT_SCHEMA: {
      anchor: "artifact-schema",
      summary: "a required field is missing or holds a value outside its enum",
      fix: "compare the row with `gstack-artifact schema <name>` and regenerate it"
    },
    ARTIFACT_MISSING: {
      anchor: "artifact-missing",
      summary: "an artifact named by the manifest is not in the run directory",
      fix: "copy the whole run directory, not single files; rerun the phase that writes the missing file"
    },
    ARTIFACT_STALE: {
      anchor: "artifact-stale",
      summary: "an artifact’s bytes no longer match the hash the manifest recorded",
      fix: "treat the run as tampered or partially rewritten; regenerate it or re-bind the file through the tool that wrote it"
    },
    ARTIFACT_PATH_ESCAPE: {
      anchor: "artifact-path-escape",
      summary: "an artifact path resolves outside the run directory (a `..` segment, an absolute path or a symlink)",
      fix: "keep every artifact inside the run directory and name it with a plain relative path"
    },
    ARTIFACT_MALFORMED_JSONL: {
      anchor: "artifact-malformed-jsonl",
      summary: "a JSONL artifact has a line (usually the tail) that is not one JSON object",
      fix: "the writer was interrupted mid-append; rerun the phase that writes the file"
    },
    ARTIFACT_DUPLICATE_ID: {
      anchor: "artifact-duplicate-id",
      summary: "two rows share one id",
      fix: "ids are run-bound and unique per file; regenerate the rows with the tool that assigns them"
    },
    ARTIFACT_UNBOUND_ID: {
      anchor: "artifact-unbound-id",
      summary: "a row id does not start with the run id",
      fix: "ids are `<run>-...`; regenerate the row with the run id the manifest names"
    },
    ARTIFACT_DANGLING_REF: {
      anchor: "artifact-dangling-ref",
      summary: "a row references an id no artifact in this run defines",
      fix: "write the referenced finding, decision or task first, or drop the reference"
    },
    ARTIFACT_DEPENDENCY_CYCLE: {
      anchor: "artifact-dependency-cycle",
      summary: "tasks depend on each other in a cycle",
      fix: "break the cycle in `depends_on`; a lane cannot start a task that waits on itself"
    },
    ARTIFACT_COUNT_MISMATCH: {
      anchor: "artifact-count-mismatch",
      summary: "a count in run.json disagrees with the rows in the file it summarizes",
      fix: "regenerate run.json after the last row was written; a count never replaces the file"
    },
    ARTIFACT_RUN_INTERRUPTED: {
      anchor: "artifact-run-interrupted",
      summary: "the run did not reach a terminal status or a reviewer never returned",
      fix: "resume the run (`gstack-autoplan resume --out <dir>`) or treat its artifacts as partial"
    },
    ARTIFACT_REVIEWER_MISSING: {
      anchor: "artifact-reviewer-missing",
      summary: "a required phase or one of its voices has no terminal outcome or no bound output file",
      fix: "finish the phase; a missing voice is missing coverage, never N/A by default"
    },
    ARTIFACT_GUARD_LINE_MISSING: {
      anchor: "artifact-guard-line-missing",
      summary: "an unattended run’s review-record.md does not state that the publication guard was not enforced",
      fix: "start the run through gstack-skill-start so the GUARD_NOT_INSTALLED line is recorded"
    },
    GUARD_NOT_INSTALLED: {
      anchor: "guard-not-installed",
      summary: "this host does not execute the autoplan publication hook, so phase publication order is unverified",
      fix: "nothing to do on this host; the run record carries this line, and the snapshot hashes per phase stand in for the guard"
    },
    REVIEW_STATUS_MISMATCH: {
      anchor: "review-status-mismatch",
      summary: "the review-log row claims a status or count that its findings file contradicts",
      fix: "log through `--findings <file>` and let the row be derived; fix the findings file, not the claim"
    },
    GATE_REV_STALE: {
      anchor: "gate-rev-stale",
      summary: "the reply answers an older revision of the gate list",
      fix: "render the current gate list, read it, and reply with its gate_rev"
    },
    GATE_REPLY_UNPARSED: {
      anchor: "gate-reply-unparsed",
      summary: "part of the reply matched no gate item or option, so nothing was applied",
      fix: "reply with `rec`, `as-is`, `<id><option>` tokens (for example `d3b uc1a`), or `rec except <tokens>`; bare yes/no is ambiguous"
    },
    ANSWER_BY_REQUIRED: {
      anchor: "answer-by-required",
      summary: "an unattended gate answer named no valid answerer, so nothing was applied",
      fix: "pass `--by human` when the owner typed the tokens, or `--by agent:<thread or id>` when an agent relays or decides; the value lands on every decision row as answered_by"
    },
    COMPONENT_MISSING: {
      anchor: "doctor-component-missing",
      summary: "a component the selected workflow needs is not installed, not built or not current",
      fix: "run the command in the row's fix clause, then re-run gstack-doctor --check"
    },
    RUNTIME_BELOW_MINIMUM: {
      anchor: "doctor-runtime-below-minimum",
      summary: "the Bun on PATH is absent, below gstack's security floor, or below its supported minimum",
      fix: "install the supported Bun through setup's checksum-verified recipe (bin/gstack-capy-install does this on Capy), then re-run ./setup"
    },
    PROJECT_PIN_MISMATCH: {
      anchor: "doctor-project-pin-mismatch",
      summary: "the running Bun or Node is outside a version the target project pins (package.json engines, .tool-versions, .nvmrc, .bun-version or a CI workflow)",
      fix: "install the pinned version for this platform (on Capy: run the gstack skill's `scripts/install.sh` without --check), or change the pin in the project"
    },
    REVISION_UNMET: {
      anchor: "doctor-revision-unmet",
      summary: "the installed gstack checkout is not at the revision --revision requested",
      fix: "run /gstack-upgrade (or git -C <checkout> fetch && git checkout <ref>, then ./setup) to move the checkout"
    },
    RUNTIME_PIN_CONFLICT: {
      anchor: "capy-install-runtime-conflict",
      summary: "gstack's supported Bun minimum and the project's Bun pin cannot both be satisfied, so the installer changed nothing",
      fix: "raise the project's pin to gstack's supported minimum, or install gstack on a machine whose Bun the project accepts"
    },
    BROWSER_UNAVAILABLE: {
      anchor: "browser-ensure-failed",
      summary: "Chromium could not be installed or launched by gstack-browser-ensure",
      fix: "read the installer output above (offline, proxy, AppArmor); on Ubuntu 24.04+ try GSTACK_CHROMIUM_NO_SANDBOX=1, then re-run gstack-browser-ensure"
    },
    INSTALL_PREFLIGHT_FAILED: {
      anchor: "capy-install-preflight-failed",
      summary: "a tool the installer needs before ./setup (git, curl, node, jq) is missing, or the Bun install recipe failed its checksum",
      fix: "install the named tool, then re-run bin/gstack-capy-install"
    },
    SETUP_PS1_EMPTY_ARGUMENT: {
      anchor: "setup-ps1-empty-argument",
      summary: "an argument given to .\\setup.ps1 is an empty string, which its Git Bash hand-off cannot carry, so nothing ran",
      fix: "drop the empty argument or give it a value, then run .\\setup.ps1 again"
    },
    POLICY_SOURCE_UNAVAILABLE: {
      anchor: "policy-source-unavailable",
      summary: "policy source unavailable: origin/<base> is not a resolvable commit, or a pin file committed on it cannot be read, so the reviewed .gstack/ship-policy.json cannot be read",
      fix: "git fetch origin <base> --depth=1 (the working-tree copy is never used silently)"
    },
    POLICY_INVALID: {
      anchor: "policy-invalid",
      summary: ".gstack/ship-policy.json has an unknown key, a wrong type or a value outside its enum",
      fix: "run `gstack-ship-policy validate`, compare with `gstack-ship-policy init --explain`, and fix the file on the base branch"
    },
    POLICY_CONTAINMENT: {
      anchor: "policy-containment",
      summary: "a repo-controlled path, glob, command or list in the policy escapes the repository or exceeds its size cap",
      fix: "use repo-relative paths without `..`, globs under 256 characters, lists under 64 entries and a release_tool under 512 characters"
    },
    POLICY_EXISTS: {
      anchor: "policy-exists",
      summary: ".gstack/ship-policy.json already exists; nothing written",
      fix: "edit the existing file, or pass --force to overwrite it"
    },
    REPO_COMMANDS_NOT_ALLOWED: {
      anchor: "repo-commands-not-allowed",
      summary: "repo commands not executed: the policy declares commands and this invocation did not opt in",
      fix: "pass --allow-repo-commands (what /ship does), or run without the release tool"
    },
    QUEUE_STALE: {
      anchor: "queue-stale",
      summary: "the base SHA or queue order the allocation assumed has moved",
      fix: "recompute with the printed command (gstack-restamp --next ... with the current --expect-base) before merging"
    },
    RESTAMP_VERSION_SOURCE: {
      anchor: "restamp-version-source",
      summary: "the configured version source is absent, ambiguous or broken at the base revision or on the branch",
      fix: "create VERSION or pin .gstack/version-path; gstack never invents a version"
    },
    RESTAMP_MERGE_CONFLICT: {
      anchor: "restamp-merge-conflict",
      summary: "the gate-ahead merge of the branch and its predecessor conflicts; nothing written",
      fix: "merge the predecessor into the branch under /ship Step 3’s conflict rules, then run --after again"
    },
    RESTAMP_RELEASE_TOOL_FAILED: {
      anchor: "restamp-release-tool-failed",
      summary: "the policy’s release_tool exited non-zero in the staging worktree; nothing written to the branch",
      fix: "run the release tool by hand in the repo, fix it, and rerun gstack-restamp"
    },
    RESTAMP_OUTPUT_OUTSIDE_ALLOWED: {
      anchor: "restamp-output-outside-allowed",
      summary: "the release tool wrote a path outside the enumerated allowed-output set; nothing written to the branch",
      fix: "list the path in `release_outputs` or `stamp_paths` on the base branch, or stop the tool from writing it"
    },
    RESTAMP_CONFLICT: {
      anchor: "restamp-conflict",
      summary: "a file to write or roll back no longer holds the bytes the journal recorded (a later edit); the restamp stopped",
      fix: "inspect .gstack/tmp/restamp-journal.json, reconcile the file by hand, then rerun gstack-restamp"
    },
    RESTAMP_PREDECESSOR_MOVED: {
      anchor: "restamp-predecessor-moved",
      summary: "PREDECESSOR MOVED: the predecessor head the gate assumed is no longer that PR’s head",
      fix: "gstack-restamp --after <pr> again and regate on the new synthetic tree"
    },
    CHANGELOG_DUPLICATE_HEADING: {
      anchor: "changelog-duplicate-heading",
      summary: "two CHANGELOG sections carry the same version heading, beyond any duplicate the base branch already carries",
      fix: "merge the duplicate sections the PR introduced into one entry under the new version"
    },
    CHANGELOG_TOP_MISMATCH: {
      anchor: "changelog-top-mismatch",
      summary: "the first CHANGELOG entry is not the version being stamped",
      fix: "move the PR’s entry to the top (gstack-restamp does this) or fix the heading to match VERSION"
    },
    CHANGELOG_SECTION_MISSING: {
      anchor: "changelog-section-missing",
      summary: "the CHANGELOG has no `[Unreleased]` or old-version section for this PR to re-head",
      fix: "write the PR’s entry under `## [Unreleased]` (stamp-at-merge) and rerun"
    },
    GATE_REUSE_NOT_ELIGIBLE: {
      anchor: "gate-reuse-not-eligible",
      summary: "the earlier gate ran under a different identity (tree, runtime pins, lockfile, CI config, gate command or selection)",
      fix: "rerun the named lanes on the final stamped tree with the printed command"
    },
    EVIDENCE_IDENTITY_UNKNOWN: {
      anchor: "evidence-identity-unknown",
      summary: "the evidence bundle lacks the execution identity (committed tree, runtime, lockfile or command hash) a reuse decision needs",
      fix: "rebuild the bundle on the gate machine with `gstack-evidence bundle` after the lanes ran on a committed head"
    },
    EVIDENCE_BUNDLE_INVALID: {
      anchor: "evidence-bundle-invalid",
      summary: "the evidence bundle is not valid JSON or not the schema this gstack reads",
      fix: "rebuild it with `gstack-evidence bundle`; never hand-edit a bundle"
    },
    PREREGISTRATION_NOT_ANCESTOR: {
      anchor: "preregistration-not-ancestor",
      summary: "a preregistration_shas entry is not an ancestor of HEAD",
      fix: "rebase or merge so the preregistered commit is in the branch history, or remove the entry on the base branch"
    },
    HISTORY_POLICY_VIOLATION: {
      anchor: "history-policy-violation",
      summary: "the policy says history: merge-only and the plan squashes, rebases or rewrites the branch",
      fix: "merge the base branch instead (git merge origin/<base>) and keep every commit"
    },
    RECEIPT_MISSING: {
      anchor: "receipt-missing",
      summary: "no ```gstack-ship-receipt``` block was found in the PR body",
      fix: "write it with `gstack-ship-receipt write ... --pr <n>` (/ship Step 18) before reading it"
    },
    RECEIPT_INVALID: {
      anchor: "receipt-invalid",
      summary: "the ship receipt block does not validate against the ship-receipt schema",
      fix: "regenerate it with `gstack-ship-receipt write`; never hand-edit the block"
    },
    EXECUTION_UNKNOWN: {
      anchor: "execution-unknown",
      summary: "an attempt was dispatched but never reached a terminal record, so the provider may have finished and charged",
      fix: "submit the result file if the reviewer finished (`gstack-autoplan submit ... --attempt <id>`), or redispatch explicitly with `gstack-autoplan next --redispatch <id>`; nothing is redispatched automatically"
    },
    RUN_LOCKED: {
      anchor: "run-locked",
      summary: "another gstack-autoplan process owns this run directory",
      fix: "wait for it to exit, or if its pid is gone run `gstack-autoplan resume --out <dir>` to take ownership"
    },
    RUN_NOT_INITIALIZED: {
      anchor: "run-not-initialized",
      summary: "the run directory has no run.json written by gstack-autoplan",
      fix: "start with `gstack-autoplan next --plan <file> --out <dir>` (the first call initializes the run)"
    },
    PHASE_NOT_AWAITING: {
      anchor: "phase-not-awaiting",
      summary: "the submitted phase or voice is not waiting for a result",
      fix: "run `gstack-autoplan status --out <dir>` and submit for the attempt `next` printed"
    },
    ATTEMPT_MISMATCH: {
      anchor: "attempt-mismatch",
      summary: "the attempt id does not name the open attempt for this phase and voice, or it was already submitted",
      fix: "pass the attempt id `next` printed for this voice; a result is bound exactly once"
    },
    RESULT_RECEIPT_MISSING: {
      anchor: "result-receipt-missing",
      summary: "the result file does not start with the full-read receipt `INPUT: <phase> <snapshot sha256>` for this attempt",
      fix: "the reviewer must read the prompt file through EOF and begin its result with the INPUT line the prompt names; a result for another snapshot is refused"
    },
    RESULT_FINDINGS_MISSING: {
      anchor: "result-findings-missing",
      summary: "the result file has no valid canonical findings block (a ```gstack-findings fence of JSONL rows)",
      fix: "end the review with one ```gstack-findings fence, one JSON object per line with at least severity and title; `[]` rows are not findings, an empty fence means no findings"
    },
    MODEL_FAMILY_CONFLICT: {
      anchor: "model-family-conflict",
      summary: "the outside model is in the same family as the native reviewer, or its family is unknown",
      fix: "pass `--model <id>` of a different family (anthropic, openai, google, xai, deepseek, qwen, zai, moonshot, meta, mistral); a same-family result is not an outside voice"
    },
    SPEND_CAP_EXCEEDED: {
      anchor: "spend-cap-exceeded",
      summary: "spent + reserved + the next estimate would exceed the spend cap",
      fix: "raise `--spend-cap`, settle or release unsettled attempts, or stop; unknown charges count as their reservation"
    },
    CONSENSUS_MISSING: {
      anchor: "consensus-missing",
      summary: "a closed prior phase has no consensus record to include in the Eng dispatch",
      fix: "resume the run so the phase closes through reconciliation; the Eng prompt is never sent without every prior phase summary"
    },
    OUTSIDE_RUNNER_UNAVAILABLE: {
      anchor: "outside-runner-unavailable",
      summary: "the selected outside-voice runner cannot run here (CLI missing, no API key, or no result file for host-subagent)",
      fix: "install or log in the CLI (`gstack-codex-login` from OPENAI_API_KEY), set an API key for `--runner api`, or pass `--result <file> --model <id>` for `--runner host-subagent`"
    },
    REALITY_ROW_MISSING: {
      anchor: "reality-row-missing",
      summary: "a plan review carries no `REALITY:` line for an applicable reality row, or marks a tier 1 row n/a",
      fix: "work the row (`gstack-plan-reality rows --phase <p>` prints its check) and emit `REALITY: <row> pass|finding <summary> <file:line>`; unattended, the phase is incomplete until it does"
    },
    REALITY_RECEIPT_MISSING: {
      anchor: "reality-receipt-missing",
      summary: "a `REALITY:` line names its row but carries no file:line or commit receipt",
      fix: "cite where the check was made (`path:line`, `path:line-line` or a commit sha); a row without a receipt is a claim, not a row"
    },
    REGEN_REGISTRY_INVALID: {
      anchor: "regen-registry-invalid",
      summary: ".gstack/generated.json is not valid JSON, has an unknown key, a missing field or a duplicate id",
      fix: "run `gstack-regen validate`, compare with `gstack-regen init --explain`, and fix the file on the base branch"
    },
    REGEN_CONTAINMENT: {
      anchor: "regen-containment",
      summary: "a registry glob escapes the repository or a command is not one line under 512 bytes",
      fix: "use repo-relative globs without `..`, at most 64 per list, and a single-line command"
    },
    REGEN_STALE: {
      anchor: "regen-stale",
      summary: "a generated output differs from what its registered command produces (stale, or hand-edited)",
      fix: "run the printed regen command and commit the outputs; never hand-merge a generated file"
    },
    REGEN_COMMAND_FAILED: {
      anchor: "regen-command-failed",
      summary: "a registered regen command exited non-zero in the scratch worktree",
      fix: "run the command by hand in the repository, read its output, fix the generator or its inputs"
    },
    PREGATE_CONFIG_INVALID: {
      anchor: "pregate-config-invalid",
      summary: "the pregate policy (.gstack/pregate.json, or the user-owned copy) has an unknown key, a wrong type, a non-downgradable check in `warn`, or an uncontained glob",
      fix: "run `gstack-pregate validate` and fix the file on the base branch (secrets and required lanes cannot be downgraded)"
    },
    PREGATE_SECRETS: {
      anchor: "pregate-secrets",
      summary: "gstack-redact found a HIGH or MEDIUM finding in the branch’s added lines",
      fix: "rotate the credential, remove it from the added lines (git history included), then rerun; `secrets` cannot be downgraded"
    },
    PREGATE_STRAYS: {
      anchor: "pregate-strays",
      summary: "a file was added at the repository root or outside the usual directories (scratch, tmp, zz-*)",
      fix: "delete the stray or move it under a tracked directory; declare an intentional root file in .gstack/pregate.json `strays.allow`"
    },
    PREGATE_LITERALS: {
      anchor: "pregate-literals",
      summary: "a changed exported constant’s old value still appears in the test tree (nightly- and Heavy-only files included)",
      fix: "update every listed test to the new value, or keep the old constant; a nightly-only file is still a consumer"
    },
    PREGATE_NO_LANE: {
      anchor: "pregate-no-lane",
      summary: "a touched source file maps to no test lane through imports, repo-path literals, the bin/<name> convention or a declaration",
      fix: "add a test that names the file, or declare its lane (or an explicit empty lane) under `dependencies` in .gstack/pregate.json. Markdown no test depends on is already a docs/no-tests empty lane; other documentation goes in `empty_lanes`; a release manifest whose only change against the merge base is its version values is waived as version-stamp-only"
    },
    PREGATE_LANE_FAILED: {
      anchor: "pregate-lane-failed",
      summary: "a local test lane the touched files select failed or ran zero tests under pipefail",
      fix: "read the lane log, fix the in-branch failure, rerun `gstack-pregate --stage tests`; a `| tail`-hidden exit is still a failure"
    },
    PREGATE_INCOMPLETE: {
      anchor: "pregate-incomplete",
      summary: "a check timed out, its tool is unavailable, or the tree changed while it ran; the result is incomplete, never pass",
      fix: "install the named tool or raise --timeout, keep the tree still during the run, then rerun the check"
    },
    PREGATE_STALLED: {
      anchor: "pregate-stalled",
      summary: "a test command printed nothing for the stall timeout, so its process group was killed; the check is incomplete, never pass",
      fix: "read the lane log for the last file started, fix the hang, or raise `--stall-timeout` (`stall_timeout_s`; 0 disables) for a test that is quiet for longer, then rerun `gstack-pregate --stage tests`"
    },
    PREGATE_RECEIPT_INVALID: {
      anchor: "pregate-receipt-invalid",
      summary: "the receipt offered to `gstack-pregate clear` for the remote gate obligation does not show the tested tree passing",
      fix: "rerun the remote gate on this tree and pass its output with `gstack-pregate clear --remote pregate.json/remote_gate --receipt <file>`, or run `gstack-pregate --stage tests --remote --spend-cap <usd> --allow-repo-commands`"
    },
    PREGATE_STALE: {
      anchor: "pregate-stale",
      summary: "pregate.json was recorded against a different tree than the one being published",
      fix: "rerun `gstack-pregate` after the final generation and stamp; publication needs results that are current"
    },
    PREGATE_REMOTE_UNCLEARED: {
      anchor: "pregate-remote-uncleared",
      summary: "a requires-remote lane obligation (a platform lane this machine cannot run) has no matching receipt",
      fix: "dispatch the named workflow job, then pass its run id with `gstack-pregate clear --remote <workflow/job> --run-url <url>` (or an evidence bundle lane) before publishing"
    },
    ISSUE_UNREADABLE: {
      anchor: "issue-unreadable",
      summary: "an issue a closure trailer or --issue names could not be read through gstack-issue-guard, so its link is Refs, never Fixes",
      fix: "check `gh auth status` and the issue number; rerun gstack-issue-links once the issue reads"
    },
    ISSUE_LOOKUP_FAILED: {
      anchor: "issue-lookup-failed",
      summary: "gstack-issue-links could not read the repository, this PR's author, the open PRs closing a fixed issue, or the flake issues naming a CI run, so Related or Flake lines may be missing or list the owner's own PRs",
      fix: "check `gh auth status` and the repository (`--repo <owner/repo>`), pass `--author <login>` when gh runs as an app, then rerun gstack-issue-links; report the gap in the handoff if it still fails"
    },
    ISSUE_LINKS_MISSING: {
      anchor: "issue-links-missing",
      summary: "the PR body lacks a line gstack-issue-links wrote to issues.json, so the body and the ship receipt would disagree about what the PR closes or relates to",
      fix: "paste every line gstack-issue-links printed under `## Issues` in the body, then rerun gstack-ship-receipt write; nothing was written"
    },
    EVAL_PRICE_MISSING: {
      anchor: "eval-price-missing",
      summary: "an arm names a model with no row in the price table, so its admission cannot be estimated",
      fix: "add the model to lib/pricing.ts (provider page, USD per million tokens, as_of) or drop the arm; a $0 estimate is never an admission"
    },
    EVAL_DRY_RUN_FAILED: {
      anchor: "eval-dry-run-failed",
      summary: "the $0 stub-model dry run found an input or checklist problem (input shape, output budget, retry prompt)",
      fix: "repair the named input rows or settings and rerun `gstack-eval-plan dry-run`; the pilot refuses to start on a failed dry run"
    },
    EVAL_ARMS_UNRESOLVED: {
      anchor: "eval-arms-unresolved",
      summary: "no eval arm could be resolved from the model policy or the repo policy document",
      fix: "run `gstack-models resolve --role eval-arms`, or pass `--arms <model,model>` / `--policy-doc <file>` naming models in the price table"
    },
    EVAL_BUDGET_EXHAUSTED: {
      anchor: "eval-budget-exhausted",
      summary: "the pilot or run stopped because spent + reserved + unknown charges reached the cap",
      fix: "read the spend table, settle or release open attempts, then raise `--cap` deliberately or stop; never rerun to make room"
    },
    LANE_CONFLICT: {
      anchor: "lane-conflict",
      summary: "a planned file is already changed by an in-flight branch or pull request",
      fix: "assign the file one owner: wait for that PR, stack on its branch, or drop the file from this lane"
    },
    LANE_REF_UNAVAILABLE: {
      anchor: "lane-ref-unavailable",
      summary: "a branch or pull request named for the lane check could not be resolved",
      fix: "fetch the branch (`git fetch origin <branch>`) or check `gh auth status`; an unresolved lane is reported, never assumed clear"
    },
    EVIDENCE_UNVERIFIED: {
      anchor: "evidence-unverified",
      summary: "a bundle claim could not be verified on this machine (tree moved, log missing, or the probe was not rerun)",
      fix: "rerun the lane here with `gstack-evidence verify <bundle> --rerun`, or treat the claim as an imported assertion"
    },
    BANNED_TERM_FOUND: {
      anchor: "banned-term-found",
      summary: "the diff adds a banned term outside its allowed locations",
      fix: "remove the term or move the text to a path `.gstack/banned-terms.json` allows for it"
    },
    BANNED_TERMS_INVALID: {
      anchor: "banned-terms-invalid",
      summary: "`.gstack/banned-terms.json` is malformed or an allowed path escapes the repository",
      fix: "keep `terms` a non-empty string list and every `allowed_paths` entry a plain repo-relative glob (no `..`, no absolute path)"
    },
    CONTRIBUTOR_SOURCE_UNAVAILABLE: {
      anchor: "contributor-source-unavailable",
      summary: "neither a `maintainers` list in .gstack/ship-policy.json nor the collaborators API could classify the PR author",
      fix: "add `maintainers` to the ship policy, or run `gh auth login`; the review proceeds with contributor mode off and records the source"
    },
    BRIEF_INPUT_MISSING: {
      anchor: "brief-input-missing",
      summary: "the run directory lacks a file the owner brief renders from (gate.json, decisions.jsonl or findings.jsonl)",
      fix: "finish the run to the gate (`gstack-autoplan next`) so the gate list and decisions exist, then render the brief"
    },
    DRAFT_DIRECTION_UNRESOLVED: {
      anchor: "draft-direction-unresolved",
      summary: "a `draft direction stands until the owner decides` line names a decision that is still pending",
      fix: "answer the gate (`gstack-autoplan answer`) before closing; the close rewrites only decided lines"
    },
    PREGATE_GUARD_FAILED: {
      anchor: "pregate-guard-failed",
      summary: "a repo guard from .gstack/pregate.json whose files the branch touched exited non-zero",
      fix: "run the guard command printed in the table, apply the guard's fix line, commit, then rerun `gstack-pregate run --allow-repo-commands`"
    },
    MIGRATION_COLLISION: {
      anchor: "migration-collision",
      summary: "a migration number this branch adds is already used on the base branch or by another open PR",
      fix: "take the next free migration number when this PR is next to merge (rename the file and its id), commit, then rerun `gstack-pregate regate --against <gated-head> --bundle <file>`"
    },
    SEALED_OUTPUT_REFUSED: {
      anchor: "sealed-output-refused",
      summary: "a push or PR would publish sealed or eval output (a sealed path, a transcript, a quoted answer, a seed or a local home path) to a public or unknown destination, or the sealed policy is unreadable",
      fix: "remove it from every published commit, or add one reviewed `rule<TAB>path<TAB>full-commit-sha<TAB>reason` line to the base branch's .gstack/sealed-allow.tsv (a shortened sha is ignored); a private destination sets sealed.visibility \"private\" in the base branch's .gstack/pregate.json"
    },
    EVAL_GATE_UNPRICED: {
      anchor: "eval-gate-unpriced",
      summary: "the paid gate has no call-plan file (no `--plan-file`, no base-policy `price_file`) or the file has no GSTACK_EVAL_CALLS lines, so its cost is unknown",
      fix: 'have the repo commit a call-plan file (docs/eval-calls.md) and set `price_file` in .gstack/pregate.json, or pass `--allow-unpriced "<reason>"` only on the owner\'s say-so'
    },
    EVAL_GATE_OVER_CAP: {
      anchor: "eval-gate-over-cap",
      summary: "the paid gate's priced total, or one call's reservation (input plus maximum output), is above the cap",
      fix: "cut questions, arms or `max_out_tokens` in the call plan, or raise `--cap-usd` / `--smoke-cap-usd` deliberately with the owner; never split calls to slip under it"
    },
    EVAL_PLAN_STALE: {
      anchor: "eval-plan-stale",
      summary: "the call-plan file's binding does not match (a different gate command, a head behind HEAD, an input whose sha256 at HEAD differs) or the declared price_file is not in HEAD",
      fix: "regenerate the call-plan file at HEAD for the exact gate command you are approving, commit it, and rerun `gstack-eval-plan price-gate`"
    },
    PLAN_SECTIONS_INVALID: {
      anchor: "plan-sections-invalid",
      summary: "the plan does not have exactly one non-empty `## Implementation plan` section followed by one `## Review record` section",
      fix: "add the missing heading, or rerun the first `gstack-autoplan next` with --scaffold to review a scaffolded copy (your plan file is never edited); duplicate, reversed or empty sections are fixed by hand"
    },
    PLAN_AMEND_PENDING: {
      anchor: "plan-amend-pending",
      summary: "the owner accepted plan changes at the gate that the plan has not absorbed yet",
      fix: "edit the plan, then `gstack-autoplan revise --out <dir> --plan <file> --incorporates <decision id,...>`; settle a packaging or ordering change with `gstack-autoplan revise --out <dir> --settle <id>`; or drop one with `gstack-autoplan revise --out <dir> --withdraw <decision id>`"
    },
    AMENDMENT_UNKNOWN: {
      anchor: "amendment-unknown",
      summary: "`revise --incorporates` or `--withdraw` named a decision that is not a pending amendment (never accepted as a plan change, or already incorporated or withdrawn)",
      fix: "name only the ids the refusal lists after `pending:`; with none pending, drop --incorporates and run `gstack-autoplan revise --out <dir> --plan <file>`"
    },
    AMENDMENT_NOT_SETTLEABLE: {
      anchor: "amendment-not-settleable",
      summary: "`revise --settle` named an accepted change that needs a plan edit (its item changes scope, cost or direction, or names no packaging/ordering change), or the plan has edits no revise has recorded",
      fix: "edit the plan, then `gstack-autoplan revise --out <dir> --plan <file> --incorporates <decision id>` (add `--settle <id>` to settle packaging/ordering changes in the same call); settle alone only on the plan the run already reviews"
    },
    GATE_REC_STALE: {
      anchor: "gate-rec-stale",
      summary: "a `rec` reply was rendered before `gstack-autoplan recommend` changed the recommendations it takes, or the gate predates `rec` (a gate.json without rec_rev, rendered when `all` left changes pending)",
      fix: "render the gate again (`gstack-gate render <dir>/gate.json --all`), relay it, and answer with the printed `--rec-hash`"
    },
    CHECKPOINT_INVALID: {
      anchor: "checkpoint-invalid",
      summary: "no autoplan checkpoint generation can be restored: a manifest is unreadable, a listed file is missing, escapes the generation (by path or symlink) or does not match its sha256, or the staged run does not validate",
      fix: "run `gstack-autoplan checkpoints --from <dir>` to see each generation's hash status and restore an intact one; nothing was written to --out"
    },
    CHECKPOINT_OVERLAP: {
      anchor: "checkpoint-overlap",
      summary: "the checkpoint directory and the run directory (or the restore target) are the same directory or one contains the other, symlinks resolved",
      fix: "point GSTACK_AUTOPLAN_CHECKPOINT_DIR (or --from / --out) at a directory outside the run; nothing was moved or deleted"
    },
    CHECKPOINT_TARGET_EXISTS: {
      anchor: "checkpoint-target-exists",
      summary: "`gstack-autoplan resume --from` restores only into an empty or missing --out directory",
      fix: "pass a new --out directory, or resume the run already there without --from"
    },
    OWNER_REPLY_REQUIRED: {
      anchor: "owner-reply-required",
      summary: "an agent answered the gate (`--by agent:<id>`) without the owner's verbatim reply",
      fix: 'pass the owner\'s words exactly with `--owner-reply "<text>"`, `--owner-reply -` (stdin) or `--owner-reply-file <path>`'
    },
    GATE_OWNER_REPLY_MISMATCH: {
      anchor: "gate-owner-reply-mismatch",
      summary: "the owner's verbatim reply parses under the gate grammar but resolves to different choices than the relayed tokens",
      fix: "relay exactly what the owner chose (or their reply itself, e.g. `--reply rec`); ask the owner when their words and the tokens disagree"
    },
    GSTACK_VERSION_CHANGED: {
      anchor: "gstack-version-changed",
      summary: "the run directory was written by a different gstack version",
      fix: "nothing to do for an older run (journaled forward migrations ran); a run written by a newer gstack needs that gstack: upgrade with bin/gstack-upgrade"
    },
    ARTIFACT_GATE_UNSETTLED: {
      anchor: "artifact-gate-unsettled",
      summary: "the run says complete while an approval item of its last gate revision or an accepted plan amendment is still pending",
      fix: "answer the gate until every approval settles and revise (or withdraw) every accepted change with `gstack-autoplan`; never hand-edit status"
    },
    UPGRADE_REFUSED: {
      anchor: "upgrade-refused",
      summary: "bin/gstack-upgrade changed nothing: the checkout is dirty, diverged, pinned (detached or off the remote default branch), not a gstack checkout, or the incoming release holds",
      fix: "resolve the named cause (commit or move the listed changes, check out the default branch), then re-run bin/gstack-upgrade; it never stashes or resets"
    },
    UPGRADE_BUSY: {
      anchor: "upgrade-busy",
      summary: "bin/gstack-upgrade changed nothing: another live session holds a workflow lease on this installation (bin/gstack-lease live), or, at a Capy install, the caller's own run does, or a shared harness (capy-server) whose lease may be a sibling session's is under 120 minutes old, so moving the checkout would change gstack under it",
      fix: "wait for those sessions to finish, or for a shared-harness lease to turn 120 minutes old (bin/gstack-lease list names each pid and age), then re-run bin/gstack-upgrade; GSTACK_UPGRADE_FORCE=1 overrides when you know no other session uses the checkout"
    },
    UPGRADE_FETCH_FAILED: {
      anchor: "upgrade-fetch-failed",
      summary: "bin/gstack-upgrade could not fetch the remote default branch, so it cannot tell whether the checkout is current",
      fix: "check network access to the checkout's origin (git -C <checkout> remote -v), then re-run bin/gstack-upgrade"
    },
    REVISION_BELOW_MINIMUM: {
      anchor: "revision-below-minimum",
      summary: "the installed gstack revision is below the supported minimum declared in capy/support.env on the remote default branch",
      fix: "run the Capy skill installer without --check (it fast-forwards a clean, unpinned checkout), or bin/gstack-upgrade; a pinned, dirty or diverged checkout is named in the row"
    },
    CAPY_WRAPPER_STALE: {
      anchor: "capy-wrapper-stale",
      summary: "the Capy skill copy that ran (or, without provenance, every Drive copy) is older than the checkout's GSTACK_CAPY_MIN_WRAPPER",
      fix: "this session: run <checkout>/capy/skill/gstack/scripts/install.sh, which certifies; owner: copy <checkout>/capy/skill/gstack/ over the Drive skill folder (it recurs every session until the copy changes)"
    },
    BUN_RESOLUTION_DRIFT: {
      anchor: "bun-resolution-drift",
      summary: "the Bun the install verdict recorded for this checkout and project is gone, reports another version, or no longer satisfies the pins (or the Bun running is not it)",
      fix: "run the fix the row prints: the installer, which records the current resolution or re-downloads a verified Bun into the store"
    },
    BUN_INSTALL_VERSION_INVALID: {
      anchor: "bun-install-version-invalid",
      summary: "GSTACK_BUN_INSTALL_VERSION names a Bun without a verified archive, or one below gstack's supported minimum",
      fix: "unset GSTACK_BUN_INSTALL_VERSION, or set it to a version listed in GSTACK_BUN_VERIFIED (bin/gstack-bun-version.sh)"
    },
    INSTALL_UNVERIFIED: {
      anchor: "install-unverified",
      summary: "a Capy session (GSTACK_CAPY=1) has no passing install verdict for this checkout, HEAD and workflow, so the workflow refused to start",
      fix: "run the Capy skill installer with --for <workflow> on this machine and launch with the GSTACK_LAUNCH line it prints"
    },
    BROWSE_TAB_UNRECOVERABLE: {
      anchor: "browse-tab-unrecoverable",
      summary: "every tab was closed outside browse and a new one could not be opened, because the browser or its context is gone",
      fix: "run `browse restart` (`$B restart` in a gstack skill); `browse status` and `browse stop` keep working"
    },
    BUN_VERSION_UNREADABLE: {
      anchor: "bun-version-unreadable",
      summary: "bun --version did not print a version gstack can compare with the incoming release's Bun floor, so the update was held and nothing was changed",
      fix: "reinstall Bun from https://bun.sh (bun upgrade may not run on a broken install), check that bun --version prints a version such as 1.4.2, then update again"
    },
    BASH_UNAVAILABLE: {
      anchor: "bash-unavailable",
      summary: "no Git Bash found to run gstack's bash scripts on Windows",
      fix: `install Git for Windows (winget install --id Git.Git -e), or set GSTACK_GIT_BASH to its bash.exe for good: in PowerShell, [Environment]::SetEnvironmentVariable('GSTACK_GIT_BASH', 'C:\\Program Files\\Git\\bin\\bash.exe', 'User') and restart Claude Code, or add it to the "env" block of ~/.claude/settings.json`
    },
    IOS_LAUNCH_ENV_INVALID: {
      anchor: "ios-launch-env-invalid",
      summary: "GSTACK_IOS_LAUNCH_ENV is set but is not a JSON object of string to string, or sets a GSTACK_ variable the debug bridge reserves, so the app was not launched",
      fix: `set it to a JSON object such as GSTACK_IOS_LAUNCH_ENV='{"DEBUG_BRIDGE":"1"}' (string values, no GSTACK_ keys), or unset it, then restart gstack-ios-qa-daemon`
    },
    OUTSIDE_VOICE_UNAVAILABLE: {
      anchor: "outside-voice-unavailable",
      summary: "a plan review ran without its second opinion: the outside provider did not run or failed, and the bounded native Plan reviewer was not offered or did not finish within five minutes",
      fix: "repair the provider the line names (install it, or log in with `codex login`); for the native fallback use Claude Code 2.1.277 or later with background tasks enabled (`CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` unset), then re-run the review"
    },
    ARTIFACT_MACHINE_PATH: {
      anchor: "artifact-machine-path",
      summary: "a public copy of an autoplan run still contains a machine path the run recorded (its run directory, home, plan directory, checkpoint directory or worktree root)",
      fix: "export with `gstack-autoplan export --out <run> --public <dir>`, which rewrites recorded roots in prose; a root inside a code span or fence in the plan is never rewritten, so edit the plan, revise, and export again"
    },
    ARTIFACT_PUBLIC_TARGET_EXISTS: {
      anchor: "artifact-public-target-exists",
      summary: "`gstack-autoplan export --public <dir>` writes only into an empty directory or over an earlier public copy of the same run",
      fix: "pass an empty or new --public directory, or the directory that already holds this run's public copy"
    },
    EVAL_MODELS_INVALID: {
      anchor: "eval-models-invalid",
      summary: "the eval model rules (.gstack/eval-models.json) are unreadable or invalid, so no arm can be checked",
      fix: "fix what the line names (docs/eval-models.md: schema_version 1, a non-empty allow, optional deny, scopes and families newest first), or fetch the base branch; no arm passes until the rules parse"
    },
    EVAL_MODEL_DENIED: {
      anchor: "eval-model-denied",
      summary: "an arm names a model the eval model rules deny, or one no allow entry covers for its scope",
      fix: "pick a model the rules allow for that scope (the EVAL_MODEL line names the rule), or change .gstack/eval-models.json in a reviewed PR"
    },
    EVAL_MODEL_OLD_GENERATION: {
      anchor: "eval-model-old-generation",
      summary: "an arm names an older generation of a model family the eval model rules order newest first",
      fix: "use the newest id of the family the EVAL_MODEL line names, or reorder families in .gstack/eval-models.json in a reviewed PR"
    },
    EVAL_MODEL_GENERATION_UNRESOLVED: {
      anchor: "eval-model-generation-unresolved",
      summary: "the eval model rules declare families (newest generation only) and an arm names a model in none of them, so its generation cannot be checked",
      fix: "add the model to its family in .gstack/eval-models.json (newest first) in a reviewed PR, or pick a model a family lists"
    },
    DX_CAPTURE_USAGE: {
      anchor: "dx-capture-usage",
      summary: "gstack-error-capture arguments are malformed: an unknown flag, a flag missing its value, no `--`, or no command after it",
      fix: "gstack-error-capture [--deadline <s>] [--max-bytes <n>] [--pass-env NAME,...] [--copy-config <path>] [--cwd <dir>] [--approved] [--launch-check] -- <cmd> [args]"
    },
    DX_CAPTURE_BAD_DEADLINE: {
      anchor: "dx-capture-bad-deadline",
      summary: "--deadline is not a positive number of seconds (at most 3600, up to 3 decimals)",
      fix: "--deadline 20"
    },
    DX_CAPTURE_BAD_MAX_BYTES: {
      anchor: "dx-capture-bad-max-bytes",
      summary: "--max-bytes is not an integer from 1 to 1048576",
      fix: "--max-bytes 65536"
    },
    DX_CAPTURE_BAD_PASS_ENV: {
      anchor: "dx-capture-bad-pass-env",
      summary: "--pass-env names an invalid or unset variable, or one the containment owns (PATH, HOME, XDG_CONFIG_HOME, TERM, USERPROFILE)",
      fix: "--pass-env NAME with NAME set in the calling environment"
    },
    DX_CAPTURE_BAD_CWD: {
      anchor: "dx-capture-bad-cwd",
      summary: "--cwd is not an existing directory",
      fix: "--cwd <existing directory> --approved"
    },
    DX_CAPTURE_APPROVAL_REQUIRED: {
      anchor: "dx-capture-approval-required",
      summary: "--pass-env, --copy-config or --cwd was given without --approved; they hand the target credentials or real files",
      fix: "ask the user to approve the named variables, files or directory, then add --approved"
    },
    DX_CAPTURE_CONFIG_REFUSED: {
      anchor: "dx-capture-config-refused",
      summary: "--copy-config names a missing file, a symlink, a non-regular file, a path outside HOME, a duplicate, or a file over 1 MiB",
      fix: "--copy-config <regular file under $HOME, no symlinks>"
    },
    DX_CAPTURE_NOT_FOUND: {
      anchor: "dx-capture-not-found",
      summary: 'the command does not resolve to an executable file; the record carries launch "not_found" and nothing ran',
      fix: "install the command or pass its absolute path after --"
    },
    DX_CAPTURE_TEMP_DIR: {
      anchor: "dx-capture-temp-dir",
      summary: "the private 0700 containment directory under the gstack state root could not be created",
      fix: "make $GSTACK_STATE_ROOT/error-capture a writable directory you own (not a symlink), then rerun"
    },
    DX_CAPTURE_CONTAINMENT_UNAVAILABLE: {
      anchor: "dx-capture-containment-unavailable",
      summary: "process-group or Windows job containment is unavailable on this platform; nothing ran",
      fix: "run the capture on Linux, macOS or Windows with job objects available"
    },
    DX_CAPTURE_SUPERVISOR_FAILED: {
      anchor: "dx-capture-supervisor-failed",
      summary: "the deadline supervisor failed before reporting a result",
      fix: "rerun the same command once; if it repeats, run bin/gstack-qa-deadline --help to check the supervisor"
    },
    DX_CAPTURE_INTERRUPTED: {
      anchor: "dx-capture-interrupted",
      summary: "the helper received SIGINT, SIGTERM or SIGHUP; the target group was killed and no record was printed",
      fix: "rerun the same command without interrupting it"
    },
    DX_CAPTURE_REDACTION_FAILED: {
      anchor: "dx-capture-redaction-failed",
      summary: "the finished record still matched a secret check, so nothing was printed",
      fix: "do not rerun with more --pass-env; report the command name to the gstack maintainers"
    },
    DX_CAPTURE_INTERNAL: {
      anchor: "dx-capture-internal",
      summary: "unexpected helper failure; the line names the error class and its first stack frame",
      fix: "rerun once; if it repeats, report the printed frame to the gstack maintainers"
    },
    ...RELEASE_RESULT_CODES,
    ...CAPY_RESULT_CODES,
    ...BUDGET_RESULT_CODES,
    ...EVAL_RESULT_CODES
  };
});

// lib/sanitize-echo.ts
function sanitizeEcho(text) {
  const out = [];
  for (const byte of Buffer.from(text, "utf8")) {
    const b = byte === 13 || byte === 10 || byte === 9 ? SPACE : byte;
    if (b < SPACE || b === 127)
      continue;
    if (b === SPACE && (out.length === 0 || out[out.length - 1] === SPACE))
      continue;
    out.push(b);
  }
  let bytes = out.slice(0, ECHO_LIMIT);
  const lead = (b, min) => b !== undefined && b >= min;
  const cont = (b) => b !== undefined && b >= 128 && b <= 191;
  const n = bytes.length;
  if (lead(bytes[n - 3], 240) && cont(bytes[n - 2]) && cont(bytes[n - 1]))
    bytes = bytes.slice(0, -3);
  else if (lead(bytes[n - 2], 224) && cont(bytes[n - 1]))
    bytes = bytes.slice(0, -2);
  else if (lead(bytes[n - 1], 192))
    bytes = bytes.slice(0, -1);
  if (bytes[bytes.length - 1] === SPACE)
    bytes = bytes.slice(0, -1);
  return Buffer.from(bytes).toString("utf8");
}
var ECHO_LIMIT = 200, SPACE = 32;

// browse/src/stealth.ts
function readHostProfile() {
  const env = globalThis.process?.env ?? {};
  const concurrency = Number(env.GSTACK_HW_CONCURRENCY);
  const memory = Number(env.GSTACK_DEVICE_MEMORY);
  return {
    hwConcurrency: Number.isFinite(concurrency) && concurrency > 0 ? concurrency : 8,
    deviceMemory: Number.isFinite(memory) && memory > 0 ? memory : 8
  };
}
function buildStealthScript(hw) {
  return `(() => {
  // ──── Function.prototype.toString Proxy (must run first) ────
  // Make every patched getter / function below report
  // 'function NAME() { [native code] }' at every recursion depth.
  // Defeats fn.toString.toString.toString() integrity checks.
  const patchedFns = new WeakSet();
  const nativeToString = Function.prototype.toString;
  const toStringProxy = new Proxy(nativeToString, {
    apply(target, thisArg, args) {
      if (patchedFns.has(thisArg)) {
        const name = (thisArg && thisArg.name) || '';
        return 'function ' + name + '() { [native code] }';
      }
      return Reflect.apply(target, thisArg, args);
    },
  });
  Object.defineProperty(Function.prototype, 'toString', {
    value: toStringProxy, writable: true, configurable: true,
  });
  const markNative = (fn, name) => {
    if (name) {
      try { Object.defineProperty(fn, 'name', { value: name }); } catch {}
    }
    patchedFns.add(fn);
    return fn;
  };

  // ──── navigator.webdriver (canonical mask, kept from D7) ────
  try {
    const webdriverGetter = markNative(function() { return false; }, 'get webdriver');
    Object.defineProperty(navigator, 'webdriver', { get: webdriverGetter, configurable: true });
  } catch {}

  // ──── window.chrome.* restoration ────
  // Real Chrome ships these objects with rich enum / method shape.
  // Headless Chromium / Playwright's launch strips them. Their absence
  // is a universally-checked tell (verified in Cloudflare + DataDome
  // RE catalogs). We don't try to perfectly mimic — we ship plausible
  // shape with native-code-looking methods.
  try {
    if (!('chrome' in window)) {
      window.chrome = {};
    }
    const chrome = window.chrome;
    if (!chrome.runtime) {
      chrome.runtime = {
        OnInstalledReason: { CHROME_UPDATE: 'chrome_update', INSTALL: 'install',
                            SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update' },
        OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' },
        PlatformArch: { ARM: 'arm', ARM64: 'arm64', MIPS: 'mips', MIPS64: 'mips64',
                       X86_32: 'x86-32', X86_64: 'x86-64' },
        PlatformNaclArch: { ARM: 'arm', MIPS: 'mips', MIPS64: 'mips64',
                           X86_32: 'x86-32', X86_64: 'x86-64' },
        PlatformOs: { ANDROID: 'android', CROS: 'cros', LINUX: 'linux',
                     MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win' },
        RequestUpdateCheckStatus: { NO_UPDATE: 'no_update', THROTTLED: 'throttled',
                                   UPDATE_AVAILABLE: 'update_available' },
        id: undefined,
      };
    }
    if (!chrome.app) {
      chrome.app = {
        isInstalled: false,
        InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
        RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
      };
    }
    if (typeof chrome.csi !== 'function') {
      chrome.csi = markNative(function csi() {
        return {
          onloadT: Date.now(),
          pageT: performance.now(),
          startE: Date.now() - 1000,
          tran: 15,
        };
      }, 'csi');
    }
    if (typeof chrome.loadTimes !== 'function') {
      chrome.loadTimes = markNative(function loadTimes() {
        const t = performance.timing;
        return {
          requestTime: t.requestStart / 1000,
          startLoadTime: t.requestStart / 1000,
          commitLoadTime: t.responseStart / 1000,
          finishDocumentLoadTime: t.domContentLoadedEventEnd / 1000,
          finishLoadTime: t.loadEventEnd / 1000,
          firstPaintTime: t.responseEnd / 1000,
          firstPaintAfterLoadTime: 0,
          navigationType: 'Other',
          wasFetchedViaSpdy: true,
          wasNpnNegotiated: true,
          npnNegotiatedProtocol: 'h2',
          wasAlternateProtocolAvailable: false,
          connectionInfo: 'h2',
        };
      }, 'loadTimes');
    }
  } catch (err) {
    // Non-fatal — page might have a stricter Content Security Policy
    // that blocks property mutation on window. Leave chrome.* whatever
    // shape it was; navigator.webdriver mask still applies.
  }

  // ──── Notification.permission align with Permissions API ────
  // The inline addInitScript already overrides permissions.query for
  // notifications → 'prompt'. Notification.permission must match
  // ('default' in real Chrome on pages that haven't asked yet).
  try {
    if (typeof Notification !== 'undefined') {
      const notificationPermissionGetter = markNative(function() { return 'default'; }, 'get permission');
      Object.defineProperty(Notification, 'permission', {
        get: notificationPermissionGetter,
        configurable: true,
      });
    }
  } catch {}

  // ──── Per-install hardware values from GSTACK_* env (T2) ────
  // gbd's host_profile.go fed real host values via cmdline env. Reporting
  // those (not hardcoded defaults) avoids the cross-user GBrowser
  // fingerprint cluster.
  try {
    const hwConcurrencyGetter = markNative(function() { return ${hw.hwConcurrency}; }, 'get hardwareConcurrency');
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: hwConcurrencyGetter,
      configurable: true,
    });
  } catch {}
  try {
    const deviceMemoryGetter = markNative(function() { return ${hw.deviceMemory}; }, 'get deviceMemory');
    Object.defineProperty(navigator, 'deviceMemory', {
      get: deviceMemoryGetter,
      configurable: true,
    });
  } catch {}

  // ──── Selenium / Phantom / Nightmare / Playwright global cleanup ────
  // Static known-name list of Selenium / Playwright / PhantomJS / Nightmare
  // globals. AUTOMATION_ARTIFACT_CLEANUP_SCRIPT (applied right after this on
  // every path) covers the cdc_/__webdriver dynamic prefixes; this list is the
  // fixed-name complement.
  try {
    const auto = [
      '__driver_evaluate', '__webdriver_evaluate', '__selenium_evaluate', '__fxdriver_evaluate',
      '__driver_unwrapped', '__webdriver_unwrapped', '__selenium_unwrapped', '__fxdriver_unwrapped',
      '_Selenium_IDE_Recorder', '_selenium', 'calledSelenium',
      '$chrome_asyncScriptInfo',
      '__$webdriverAsyncExecutor', '__webdriverFunc',
      'domAutomation', 'domAutomationController',
      '__lastWatirAlert', '__lastWatirConfirm', '__lastWatirPrompt',
      '__webdriver_script_fn', '_WEBDRIVER_ELEM_CACHE',
      'callPhantom', '_phantom', 'phantom', '__nightmare',
      '__pwInitScripts', '__playwright__binding__',
    ];
    for (const k of auto) {
      try { delete window[k]; } catch {}
    }
    try { delete document.__webdriver_script_fn; } catch {}
  } catch {}
})();`;
}
function extendedModeEnabled() {
  const v = process.env.GSTACK_STEALTH;
  return v === "extended" || v === "1" || v === "true";
}
async function applyStealth(context) {
  const hw = readHostProfile();
  await context.addInitScript({ content: buildStealthScript(hw) });
  await context.addInitScript({ content: AUTOMATION_ARTIFACT_CLEANUP_SCRIPT });
  if (extendedModeEnabled()) {
    await context.addInitScript({ content: EXTENDED_STEALTH_SCRIPT });
  }
}
function buildGStackLaunchArgs() {
  const env = globalThis.process?.env ?? {};
  const args = [];
  const vendor = env.GSTACK_GPU_VENDOR;
  if (vendor)
    args.push(`--gstack-gpu-vendor=${vendor}`);
  const renderer = env.GSTACK_GPU_RENDERER;
  if (renderer)
    args.push(`--gstack-gpu-renderer=${renderer}`);
  const platform = env.GSTACK_PLATFORM;
  if (platform === "MacARM" || platform === "MacIntel") {
    args.push("--gstack-ua-platform=macOS");
  } else if (platform === "Win32") {
    args.push("--gstack-ua-platform=Windows");
  } else if (platform && platform.startsWith("Linux")) {
    args.push("--gstack-ua-platform=Linux");
  }
  const chipset = env.GSTACK_GPU_CHIPSET;
  if (chipset)
    args.push(`--gstack-ua-model=${chipset}`);
  const hw = env.GSTACK_HW_CONCURRENCY;
  if (hw)
    args.push(`--gstack-hw-concurrency=${hw}`);
  const memory = env.GSTACK_DEVICE_MEMORY;
  if (memory)
    args.push(`--gstack-device-memory=${memory}`);
  const cdpStealth = env.GSTACK_CDP_STEALTH;
  if (cdpStealth === "on" || cdpStealth === "1" || cdpStealth === "true") {
    args.push("--gstack-suppress-prepare-stack-trace");
  }
  return args;
}
var EXTENDED_STEALTH_SCRIPT = `
(() => {
  try {
    // 1. Fully delete navigator.webdriver from the prototype so
    //    \`"webdriver" in navigator\` returns false (not just falsy).
    delete Object.getPrototypeOf(navigator).webdriver;
  } catch {}

  try {
    // 2. WebGL renderer spoof — SwiftShader is the canonical software-GPU
    //    tell. Spoof to a plausible Apple M1 Pro string.
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (parameter) {
      // UNMASKED_VENDOR_WEBGL (37445) → 'Apple Inc.'
      if (parameter === 37445) return 'Apple Inc.';
      // UNMASKED_RENDERER_WEBGL (37446) → realistic Apple silicon string
      if (parameter === 37446) return 'Apple M1 Pro, OpenGL 4.1';
      return getParameter.call(this, parameter);
    };
  } catch {}

  try {
    // 3. navigator.plugins: real PluginArray with MimeType objects.
    const makePlugin = (name, filename, desc, mimes) => {
      const p = Object.create(Plugin.prototype);
      Object.defineProperties(p, {
        name: { get: () => name },
        filename: { get: () => filename },
        description: { get: () => desc },
        length: { get: () => mimes.length },
      });
      mimes.forEach((m, i) => { p[i] = m; });
      p.item = (i) => mimes[i];
      p.namedItem = (n) => mimes.find((m) => m.type === n);
      return p;
    };
    const makeMime = (type, suffixes, desc) => {
      const m = Object.create(MimeType.prototype);
      Object.defineProperties(m, {
        type: { get: () => type },
        suffixes: { get: () => suffixes },
        description: { get: () => desc },
      });
      return m;
    };
    const pdfMime = makeMime('application/pdf', 'pdf', '');
    const cpdfMime = makeMime('application/x-google-chrome-pdf', 'pdf', 'Portable Document Format');
    const plugins = [
      makePlugin('PDF Viewer', 'internal-pdf-viewer', '', [pdfMime]),
      makePlugin('Chrome PDF Viewer', 'internal-pdf-viewer', '', [cpdfMime]),
      makePlugin('Chromium PDF Viewer', 'internal-pdf-viewer', '', [cpdfMime]),
    ];
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        const arr = Object.create(PluginArray.prototype);
        Object.defineProperty(arr, 'length', { get: () => plugins.length });
        plugins.forEach((p, i) => { arr[i] = p; });
        arr.item = (i) => plugins[i];
        arr.namedItem = (n) => plugins.find((p) => p.name === n);
        arr.refresh = () => {};
        return arr;
      },
    });
  } catch {}

  try {
    // 4. window.chrome shape — chrome.app + chrome.runtime + loadTimes/csi.
    if (!window.chrome) {
      window.chrome = {};
    }
    if (!window.chrome.runtime) {
      window.chrome.runtime = { OnInstalledReason: {}, OnRestartRequiredReason: {} };
    }
    if (!window.chrome.app) {
      window.chrome.app = {
        isInstalled: false,
        InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
        RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
      };
    }
    if (!window.chrome.loadTimes) {
      window.chrome.loadTimes = function () {
        return { commitLoadTime: Date.now() / 1000, finishLoadTime: Date.now() / 1000 };
      };
    }
    if (!window.chrome.csi) {
      window.chrome.csi = function () {
        return { startE: Date.now(), onloadT: Date.now(), pageT: 0, tran: 15 };
      };
    }
  } catch {}

  try {
    // 5. mediaDevices — some headless builds drop it entirely.
    if (!navigator.mediaDevices) {
      Object.defineProperty(navigator, 'mediaDevices', {
        get: () => ({ enumerateDevices: () => Promise.resolve([]) }),
      });
    }
  } catch {}

  try {
    // 6. CDP cdc_* property cleanup. Chromium under CDP sets cdc_*-prefixed
    //    globals (driver injection markers); a bot detector finds them by
    //    iterating window keys. Strip all matching keys.
    //    Note: via applyStealth this is redundant with AUTOMATION_ARTIFACT_
    //    CLEANUP_SCRIPT (which runs first on every path). Kept so this script
    //    is self-sufficient if ever applied standalone.
    for (const k of Object.keys(window)) {
      if (k.startsWith('cdc_')) {
        try { delete window[k]; } catch {}
      }
    }
  } catch {}
})();
`, AUTOMATION_ARTIFACT_CLEANUP_SCRIPT = `(() => {
  // cdc_/__webdriver globals are injected by ChromeDriver/CDP. A detector
  // finds them by iterating window keys. Strip immediately and again after a
  // tick in case they are injected late.
  const cleanup = () => {
    for (const key of Object.keys(window)) {
      if (key.startsWith('cdc_') || key.startsWith('__webdriver')) {
        try { delete window[key]; } catch (e) { if (!(e instanceof TypeError)) throw e; }
      }
    }
  };
  cleanup();
  setTimeout(cleanup, 0);

  // Permissions API: automated Chromium returns 'denied' for notifications,
  // a known tell. Return 'prompt' to match real Chrome (and Layer C's
  // Notification.permission = 'default'). Tradeoff: this pins the
  // notifications state to fresh-Chrome values for the whole session, so a
  // site that actually grants/denies notifications would see a stale value.
  // Acceptable for the automation/anti-detection use case (which does not
  // drive real notification grants); only notifications is overridden.
  const originalQuery = window.navigator.permissions && window.navigator.permissions.query;
  if (originalQuery) {
    window.navigator.permissions.query = (params) => {
      if (params && params.name === 'notifications') {
        return Promise.resolve({ state: 'prompt', onchange: null });
      }
      return originalQuery.call(window.navigator.permissions, params);
    };
  }
})();`, STEALTH_LAUNCH_ARGS, STEALTH_IGNORE_DEFAULT_ARGS;
var init_stealth = __esm(() => {
  STEALTH_LAUNCH_ARGS = [
    "--disable-blink-features=AutomationControlled"
  ];
  STEALTH_IGNORE_DEFAULT_ARGS = [
    "--enable-automation",
    "--disable-extensions",
    "--disable-component-extensions-with-background-pages",
    "--disable-popup-blocking",
    "--disable-component-update",
    "--disable-default-apps"
  ];
});

// browse/src/browser-manager.ts
import { chromium as chromium2 } from "playwright";
function headlessGpuArgs(platform, env) {
  if (platform !== "darwin")
    return [];
  if ((env.GSTACK_DISABLE_GPU || "").toLowerCase() === "off")
    return [];
  return [
    "--disable-gpu",
    "--disable-software-rasterizer",
    "--disable-gpu-compositing",
    "--disable-gpu-watchdog"
  ];
}
function isCustomChromium() {
  if (process.env.GSTACK_CHROMIUM_KIND === "custom-extension-baked")
    return true;
  const p = process.env.GSTACK_CHROMIUM_PATH || "";
  return p.includes("GBrowser") || p.includes("gbrowser");
}
function shouldEnableChromiumSandbox() {
  if (process.platform === "win32")
    return false;
  if (process.env.GSTACK_CHROMIUM_NO_SANDBOX === "1")
    return false;
  const isRoot = typeof process.getuid === "function" && process.getuid() === 0;
  return !(process.env.CI || process.env.CONTAINER || isRoot);
}
function probePoisonedChromiumBundle(chromiumExecutablePath) {
  const fs = __require("fs");
  const path = __require("path");
  const customPath = process.env.GSTACK_CHROMIUM_PATH;
  if (customPath && path.resolve(chromiumExecutablePath) === path.resolve(customPath)) {
    return;
  }
  const chromeContentsDir = path.resolve(path.dirname(chromiumExecutablePath), "..");
  const chromePlist = path.join(chromeContentsDir, "Info.plist");
  if (!fs.existsSync(chromePlist))
    return;
  if (!fs.readFileSync(chromePlist, "utf-8").includes("GStack Browser"))
    return;
  const appDir = path.resolve(chromeContentsDir, "..");
  const revisionDir = path.resolve(appDir, "..", "..");
  if (/^chromium-\d+$/.test(path.basename(revisionDir))) {
    fs.rmSync(revisionDir, { recursive: true, force: true });
  } else {
    fs.rmSync(appDir, { recursive: true, force: true });
    for (const marker of ["INSTALLATION_COMPLETE", "DEPENDENCIES_VALIDATED"]) {
      fs.rmSync(path.join(path.dirname(appDir), marker), { force: true });
    }
  }
  throw new PoisonedBundleError("Chromium bundle was mutated by a previous gstack version (broken codesign seal — " + "GPU exit_code=5 on macOS 26). The poisoned bundle has been removed. " + "Re-fetch a clean one with: bunx playwright install chromium — then retry.");
}
function launchedProcess(browser) {
  const withProcess = browser;
  return typeof withProcess?.process === "function" ? withProcess.process() : null;
}
async function launchedChromiumPid(browser, timeoutMs = 2000) {
  let timer;
  const query = async () => {
    const session = await browser.newBrowserCDPSession();
    try {
      const { processInfo } = await session.send("SystemInfo.getProcessInfo");
      const pid = processInfo.find((p) => p.type === "browser")?.id;
      return Number.isInteger(pid) && pid > 0 ? pid : null;
    } finally {
      await session.detach().catch(() => {});
    }
  };
  try {
    return await Promise.race([
      query(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`timed out after ${timeoutMs}ms`)), timeoutMs);
      })
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[browse] Could not record the Chromium PID (CDP SystemInfo.getProcessInfo: ${msg}); browse stop cannot reap a surviving Chromium.`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
async function resolveDisconnectCause(browser) {
  const proc = launchedProcess(browser);
  if (proc && proc.exitCode === null && proc.signalCode === null) {
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 1000);
      proc.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
  return proc?.exitCode === 0 && proc?.signalCode == null ? "clean" : "crash";
}
function markDaemonProcess() {
  daemonProcess = true;
}
async function handleChromiumDisconnect(browser) {
  const cause = await resolveDisconnectCause(browser);
  if (!daemonProcess) {
    console.error(`[browse] Chromium disconnected (${cause}) in an embedded context — host process continues.`);
    return;
  }
  if (cause === "clean") {
    console.error("[browse] Chromium closed cleanly (user-initiated quit). Server exiting (0).");
    process.exit(0);
  }
  console.error("[browse] FATAL: Chromium process crashed or was killed. Server exiting (1).");
  console.error("[browse] Console/network logs flushed to .gstack/browse-*.log");
  process.exit(1);
}
function urlOrigin(url) {
  return URL.canParse(url) ? new URL(url).origin : "";
}
function withinTabBudget(work, ms) {
  let timer;
  const deadline = new Promise((resolve) => {
    timer = setTimeout(() => resolve(undefined), ms);
    timer.unref?.();
  });
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
}
var __dirname = "C:\\Users\\obrie\\gstack\\browse\\src", PoisonedBundleError, daemonProcess = false, TAB_PROBE_TIMEOUT_MS = 1000, TAB_STORAGE_READ_TIMEOUT_MS = 5000, BrowserManager;
var init_browser_manager = __esm(() => {
  init_file_permissions();
  init_buffers();
  init_activity();
  init_url_validation();
  init_config();
  init_chromium_profiles();
  init_xprotect_heal();
  init_proxy_config();
  init_xvfb();
  init_cdp_bridge();
  init_result_codes();
  PoisonedBundleError = class PoisonedBundleError extends Error {
    constructor(message) {
      super(message);
      this.name = "PoisonedBundleError";
    }
  };
  BrowserManager = class BrowserManager {
    browser = null;
    context = null;
    proxyConfig = null;
    pages = new Map;
    tabSessions = new Map;
    activeTabId = 0;
    nextTabId = 1;
    extraHeaders = {};
    customUserAgent = null;
    chromiumProcInfo = null;
    getChromiumProcInfo() {
      return this.chromiumProcInfo;
    }
    deviceScaleFactor = 1;
    currentViewport = { width: 1280, height: 720 };
    serverPort = 0;
    tabOwnership = new Map;
    extensionContext = false;
    navigationGuards = new WeakMap;
    pendingTabReads = new WeakMap;
    lastTabStorage = new WeakMap;
    disconnectHandlers = new WeakMap;
    onBrowserDisconnected(browser, handler) {
      if (!browser)
        return;
      browser.on("disconnected", handler);
      this.disconnectHandlers.set(browser, [...this.disconnectHandlers.get(browser) ?? [], handler]);
    }
    detachDisconnectHandlers(browser) {
      if (!browser)
        return;
      for (const handler of this.disconnectHandlers.get(browser) ?? [])
        browser.off("disconnected", handler);
      this.disconnectHandlers.delete(browser);
    }
    dialogAutoAccept = true;
    dialogPromptText = null;
    cookieImportedDomains = new Set;
    isHeaded = false;
    consecutiveFailures = 0;
    watching = false;
    watchInterval = null;
    watchSnapshots = [];
    watchStartTime = 0;
    connectionMode = "launched";
    onHeadedPromotion;
    intentionalDisconnect = false;
    xvfb = null;
    displayAllocation = null;
    handoffPending = null;
    activeTabRecovery = null;
    closing = false;
    handoffPrevious = null;
    getXvfbHandle() {
      return this.xvfb;
    }
    async ensureHeadedDisplay() {
      if (this.closing)
        throw new Error("Browser is shutting down");
      if (this.xvfb)
        return;
      if (this.displayAllocation)
        return this.displayAllocation;
      if (!shouldSpawnXvfb({ ...process.env, BROWSE_HEADED: "1" }, process.platform).spawn)
        return;
      this.displayAllocation = (async () => {
        try {
          const handle = await spawnFreeXvfb();
          if (this.closing) {
            handle.close();
            throw new Error("Browser is shutting down");
          }
          this.xvfb = handle;
        } catch (err) {
          throw new Error(`${err instanceof Error ? err.message : String(err)}. ${xvfbInstallHint()}`);
        }
      })();
      try {
        await this.displayAllocation;
      } finally {
        this.displayAllocation = null;
      }
    }
    closeOwnedDisplay() {
      this.xvfb?.close();
      this.xvfb = null;
    }
    static TAB_GUARDRAIL_SOFT = 50;
    static TAB_GUARDRAIL_HARD = 200;
    tabGuardrailSoftHit = false;
    tabGuardrailHardHit = false;
    checkTabGuardrails() {
      const total = this.pages.size;
      if (!this.tabGuardrailSoftHit && total >= BrowserManager.TAB_GUARDRAIL_SOFT) {
        this.tabGuardrailSoftHit = true;
        const msg = `Tab count crossed ${BrowserManager.TAB_GUARDRAIL_SOFT} (now ${total}). Consider closing unused tabs — each Chromium tab holds 50–300 MB.`;
        console.warn(`[browse] ${msg}`);
        emitActivity({ type: "error", command: "tab-guardrail", error: msg, tabs: total });
      }
      if (!this.tabGuardrailHardHit && total >= BrowserManager.TAB_GUARDRAIL_HARD) {
        this.tabGuardrailHardHit = true;
        const msg = `Tab count crossed ${BrowserManager.TAB_GUARDRAIL_HARD} (now ${total}). OOM risk imminent. Open the sidebar to see top RAM consumers.`;
        console.error(`[browse] ${msg}`);
        emitActivity({ type: "error", command: "tab-guardrail", error: msg, tabs: total });
      }
    }
    recheckTabGuardrailsOnClose() {
      const total = this.pages.size;
      if (this.tabGuardrailSoftHit && total < BrowserManager.TAB_GUARDRAIL_SOFT) {
        this.tabGuardrailSoftHit = false;
      }
      if (this.tabGuardrailHardHit && total < BrowserManager.TAB_GUARDRAIL_HARD) {
        this.tabGuardrailHardHit = false;
      }
    }
    onDisconnect = null;
    getConnectionMode() {
      return this.connectionMode;
    }
    isWatching() {
      return this.watching;
    }
    startWatch() {
      this.watching = true;
      this.watchSnapshots = [];
      this.watchStartTime = Date.now();
    }
    stopWatch() {
      this.watching = false;
      if (this.watchInterval) {
        clearInterval(this.watchInterval);
        this.watchInterval = null;
      }
      const snapshots = this.watchSnapshots;
      const duration = Date.now() - this.watchStartTime;
      this.watchSnapshots = [];
      this.watchStartTime = 0;
      return { snapshots, duration };
    }
    addWatchSnapshot(snapshot) {
      this.watchSnapshots.push(snapshot);
    }
    findExtensionPath() {
      const fs = __require("fs");
      const path = __require("path");
      const candidates = [
        process.env.BROWSE_EXTENSIONS_DIR || "",
        path.resolve(__dirname, "..", "..", "extension"),
        path.join(process.env.HOME || "", ".claude", "skills", "gstack", "extension"),
        (() => {
          const stateFile = process.env.BROWSE_STATE_FILE || "";
          if (stateFile) {
            const repoRoot = path.resolve(path.dirname(stateFile), "..");
            return path.join(repoRoot, ".claude", "skills", "gstack", "extension");
          }
          return "";
        })()
      ].filter(Boolean);
      for (const candidate of candidates) {
        try {
          if (fs.existsSync(path.join(candidate, "manifest.json"))) {
            return candidate;
          }
        } catch (err) {
          if (err?.code !== "ENOENT" && err?.code !== "EACCES")
            throw err;
        }
      }
      return null;
    }
    setProxyConfig(cfg) {
      this.proxyConfig = cfg;
    }
    proxyLaunchArgs() {
      return !this.proxyConfig && forcesDirect(process.env) ? [DIRECT_PROXY_ARG] : [];
    }
    getRefMap() {
      try {
        return this.getActiveSession().getRefEntries();
      } catch {
        return [];
      }
    }
    async launch() {
      this.closing = false;
      const extensionsDir = process.env.BROWSE_EXTENSIONS_DIR;
      await Promise.resolve().then(() => init_stealth());
      const launchArgs = [...STEALTH_LAUNCH_ARGS, ...buildGStackLaunchArgs(), ...this.proxyLaunchArgs()];
      const executablePath = process.env.GSTACK_CHROMIUM_PATH || undefined;
      const nameCustomChromium = (err) => {
        if (!executablePath)
          throw err;
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Chromium at GSTACK_CHROMIUM_PATH=${executablePath} failed to launch: ${message}
Fix: point GSTACK_CHROMIUM_PATH at a working Chromium or Chrome binary, or unset it to use Playwright's bundled Chromium.`, { cause: err });
      };
      const isRoot = typeof process.getuid === "function" && process.getuid() === 0;
      if (process.env.CI || process.env.CONTAINER || isRoot) {
        launchArgs.push("--no-sandbox");
      }
      if (extensionsDir) {
        if (!isCustomChromium()) {
          launchArgs.push(`--disable-extensions-except=${extensionsDir}`, `--load-extension=${extensionsDir}`);
        }
        launchArgs.push("--headless=new");
        console.log(`[browse] Extensions loaded from: ${extensionsDir}`);
      }
      launchArgs.push(...headlessGpuArgs(process.platform, process.env));
      const contextOptions = {
        viewport: { width: this.currentViewport.width, height: this.currentViewport.height },
        deviceScaleFactor: this.deviceScaleFactor
      };
      if (this.customUserAgent) {
        contextOptions.userAgent = this.customUserAgent;
      }
      if (extensionsDir) {
        const profileDir = __require("path").join(resolveConfig().stateDir, "extensions", "chromium-profile");
        __require("fs").mkdirSync(profileDir, { recursive: true, mode: 448 });
        cleanSingletonLocks(profileDir);
        this.context = await launchWithXProtectHeal(() => chromium2.launchPersistentContext(profileDir, {
          headless: false,
          handleSIGINT: false,
          handleSIGTERM: false,
          handleSIGHUP: false,
          chromiumSandbox: shouldEnableChromiumSandbox(),
          args: launchArgs,
          ignoreDefaultArgs: STEALTH_IGNORE_DEFAULT_ARGS,
          ...contextOptions,
          ...executablePath ? { executablePath } : {},
          ...this.proxyConfig ? { proxy: this.proxyConfig } : {}
        }), { usesCustomExecutable: Boolean(executablePath) }).catch(nameCustomChromium);
        this.extensionContext = true;
        this.browser = this.context.browser();
        this.onBrowserDisconnected(this.browser, () => {
          handleChromiumDisconnect(this.browser);
        });
        for (const page of this.context.pages())
          await page.close().catch(() => {});
        if (Object.keys(this.extraHeaders).length > 0) {
          await this.context.setExtraHTTPHeaders(this.extraHeaders);
        }
        await Promise.resolve().then(() => init_stealth());
        await applyStealth(this.context);
        await this.newTab();
        return;
      }
      this.browser = await launchWithXProtectHeal(() => chromium2.launch({
        headless: true,
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false,
        chromiumSandbox: shouldEnableChromiumSandbox(),
        ...launchArgs.length > 0 ? { args: launchArgs } : {},
        ...executablePath ? { executablePath } : {},
        ...this.proxyConfig ? { proxy: this.proxyConfig } : {}
      }), { usesCustomExecutable: Boolean(executablePath) }).catch(nameCustomChromium);
      this.onBrowserDisconnected(this.browser, () => {
        handleChromiumDisconnect(this.browser);
      });
      {
        const pid = await launchedChromiumPid(this.browser);
        this.chromiumProcInfo = pid ? { pid, startTime: readPidStartTime(pid) } : null;
      }
      this.context = await this.browser.newContext(contextOptions);
      if (Object.keys(this.extraHeaders).length > 0) {
        await this.context.setExtraHTTPHeaders(this.extraHeaders);
      }
      await Promise.resolve().then(() => init_stealth());
      await applyStealth(this.context);
      await this.newTab();
    }
    async launchHeaded(authToken) {
      this.closing = false;
      await this.ensureHeadedDisplay();
      this.pages.clear();
      this.tabSessions.clear();
      this.nextTabId = 1;
      const extensionPath = this.findExtensionPath();
      await Promise.resolve().then(() => init_stealth());
      const launchArgs = [
        "--hide-crash-restore-bubble",
        ...STEALTH_LAUNCH_ARGS,
        ...buildGStackLaunchArgs(),
        ...this.proxyLaunchArgs()
      ];
      if (extensionPath) {
        if (!isCustomChromium()) {
          launchArgs.push(`--disable-extensions-except=${extensionPath}`);
          launchArgs.push(`--load-extension=${extensionPath}`);
        }
        if (authToken) {
          const fs = __require("fs");
          const path = __require("path");
          const gstackDir = path.join(process.env.HOME || "/tmp", ".gstack");
          mkdirSecure(gstackDir);
          const authFile = path.join(gstackDir, ".auth.json");
          try {
            writeSecureFile(authFile, JSON.stringify({ token: authToken, port: this.serverPort || 34567 }));
          } catch (err) {
            console.warn(`[browse] Could not write .auth.json: ${err.message}`);
          }
        }
      }
      const fs = __require("fs");
      const path = __require("path");
      const userDataDir = resolveChromiumProfile();
      ensureProjectProfile(userDataDir);
      fs.mkdirSync(userDataDir, { recursive: true });
      cleanSingletonLocks(userDataDir);
      const executablePath = process.env.GSTACK_CHROMIUM_PATH || undefined;
      if (!executablePath) {
        try {
          probePoisonedChromiumBundle(chromium2.executablePath());
        } catch (err) {
          if (err instanceof PoisonedBundleError)
            throw err;
        }
      }
      let customUA;
      if (!this.customUserAgent) {
        const chromePath = executablePath || chromium2.executablePath();
        try {
          const versionProc = Bun.spawnSync([chromePath, "--version"], {
            stdout: "pipe",
            stderr: "pipe",
            timeout: 5000
          });
          const versionOutput = versionProc.stdout.toString().trim();
          const versionMatch = versionOutput.match(/(\d+\.\d+\.\d+\.\d+)/);
          const chromeVersion = versionMatch ? versionMatch[1] : "131.0.0.0";
          customUA = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
        } catch {
          customUA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
        }
      }
      await Promise.resolve().then(() => init_stealth());
      this.context = await launchWithXProtectHeal(() => chromium2.launchPersistentContext(userDataDir, {
        headless: false,
        ...this.xvfb ? { env: { ...process.env, DISPLAY: this.xvfb.display } } : {},
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false,
        chromiumSandbox: shouldEnableChromiumSandbox(),
        args: launchArgs,
        viewport: null,
        userAgent: this.customUserAgent || customUA,
        ...executablePath ? { executablePath } : {},
        ...this.proxyConfig ? { proxy: this.proxyConfig } : {},
        ignoreDefaultArgs: STEALTH_IGNORE_DEFAULT_ARGS
      }), { usesCustomExecutable: Boolean(executablePath) });
      this.browser = this.context.browser();
      this.connectionMode = "headed";
      this.intentionalDisconnect = false;
      await Promise.resolve().then(() => init_stealth());
      await applyStealth(this.context);
      const indicatorScript = () => {
        const injectIndicator = () => {
          if (document.getElementById("gstack-ctrl"))
            return;
          const topLine = document.createElement("div");
          topLine.id = "gstack-ctrl";
          topLine.style.cssText = `
          position: fixed; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, #F59E0B, #FBBF24, #F59E0B);
          background-size: 200% 100%;
          animation: gstack-shimmer 3s linear infinite;
          pointer-events: none; z-index: 2147483647;
          opacity: 0.8;
        `;
          const style = document.createElement("style");
          style.textContent = `
          @keyframes gstack-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          @media (prefers-reduced-motion: reduce) {
            #gstack-ctrl { animation: none !important; }
          }
        `;
          document.documentElement.appendChild(style);
          document.documentElement.appendChild(topLine);
        };
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", injectIndicator);
        } else {
          injectIndicator();
        }
      };
      await this.context.addInitScript(indicatorScript);
      this.context.on("page", (page) => {
        const id = this.nextTabId++;
        this.pages.set(id, page);
        this.tabSessions.set(id, new TabSession(page));
        this.activeTabId = id;
        this.wirePageEvents(page);
        page.evaluate(indicatorScript).catch(() => {});
        console.log(`[browse] New tab detected (id=${id}, total=${this.pages.size})`);
        this.checkTabGuardrails();
      });
      const existingPages = this.context.pages();
      if (existingPages.length > 0) {
        const page = existingPages[0];
        const id = this.nextTabId++;
        this.pages.set(id, page);
        this.tabSessions.set(id, new TabSession(page));
        this.activeTabId = id;
        this.wirePageEvents(page);
        try {
          await page.evaluate(indicatorScript);
        } catch {}
      } else {
        await this.newTab();
      }
      if (this.browser) {
        this.onBrowserDisconnected(this.browser, () => {
          if (this.intentionalDisconnect)
            return;
          const browserRef = this.browser;
          (async () => {
            const cause = await resolveDisconnectCause(browserRef);
            const exitCode = cause === "clean" ? 0 : 2;
            if (cause === "clean") {
              console.error("[browse] Real browser closed cleanly (user-initiated quit). Server exiting (0).");
            } else {
              console.error("[browse] Real browser disconnected (crash or kill). Server exiting (2).");
              console.error("[browse] Run `$B connect` to reconnect.");
            }
            if (!this.onDisconnect) {
              process.exit(exitCode);
              return;
            }
            try {
              const result = this.onDisconnect(exitCode);
              if (result && typeof result.catch === "function") {
                result.catch((err) => {
                  console.error("[browse] onDisconnect rejected:", err);
                  process.exit(exitCode);
                });
              }
            } catch (err) {
              console.error("[browse] onDisconnect threw:", err);
              process.exit(exitCode);
            }
          })();
        });
      }
      this.dialogAutoAccept = false;
      this.isHeaded = true;
      this.consecutiveFailures = 0;
    }
    closeRaceMs = 5000;
    async close() {
      this.closing = true;
      const previousBrowser = this.handoffPrevious?.browser;
      const currentBrowser = this.browser;
      const raceTimeout = (ms) => new Promise((resolve) => {
        const t = setTimeout(() => resolve(false), ms);
        t.unref?.();
      });
      if (this.browser || (this.connectionMode === "headed" || this.handoffPrevious) && this.context) {
        if (this.connectionMode === "headed" || this.handoffPrevious || this.extensionContext) {
          this.intentionalDisconnect = true;
          this.detachDisconnectHandlers(this.browser);
          await Promise.race([
            this.context ? this.context.close() : Promise.resolve(),
            raceTimeout(this.closeRaceMs)
          ]).catch(() => {});
        } else if (this.browser) {
          this.detachDisconnectHandlers(this.browser);
          const child = launchedProcess(this.browser);
          const closed = await Promise.race([
            this.browser.close().then(() => true),
            raceTimeout(this.closeRaceMs)
          ]).catch(() => false);
          if (closed === false && child && child.exitCode === null && !child.killed) {
            try {
              child.kill("SIGKILL");
            } catch {}
          }
        }
        this.browser = null;
      }
      if (previousBrowser && previousBrowser !== currentBrowser) {
        this.detachDisconnectHandlers(previousBrowser);
        const child = launchedProcess(previousBrowser);
        const closed = await Promise.race([
          previousBrowser.close().then(() => true),
          raceTimeout(this.closeRaceMs)
        ]).catch(() => false);
        if (!closed && child && child.exitCode === null && !child.killed) {
          try {
            child.kill("SIGKILL");
          } catch {}
        }
      }
      await this.displayAllocation?.catch(() => {});
      this.closeOwnedDisplay();
    }
    isHealthy() {
      return Boolean(this.browser?.isConnected());
    }
    async probeActiveTab(timeoutMs = TAB_PROBE_TIMEOUT_MS) {
      const id = this.activeTabId;
      const page = this.pages.get(id);
      if (!page)
        return null;
      const probe = this.sharedTabRead(page, "probe", () => page.evaluate("1").then(() => true, () => false));
      return { id, responsive: await withinTabBudget(probe, timeoutMs) === true };
    }
    sharedTabRead(page, kind, read) {
      let reads = this.pendingTabReads.get(page);
      if (!reads) {
        reads = new Map;
        this.pendingTabReads.set(page, reads);
      }
      const pending = reads.get(kind);
      if (pending)
        return pending;
      const started = read().finally(() => reads.delete(kind));
      reads.set(kind, started);
      return started;
    }
    async newTab(url, clientId) {
      if (!this.context)
        throw new Error("Browser not launched");
      let normalizedUrl;
      if (url) {
        normalizedUrl = await validateNavigationUrl(url);
      }
      const page = await this.context.newPage();
      const id = this.nextTabId++;
      this.pages.set(id, page);
      this.tabSessions.set(id, new TabSession(page));
      this.activeTabId = id;
      if (clientId) {
        this.tabOwnership.set(id, clientId);
      }
      this.wirePageEvents(page);
      if (normalizedUrl) {
        await page.goto(normalizedUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      }
      return id;
    }
    async closeTab(id) {
      const tabId = id ?? this.activeTabId;
      const page = this.pages.get(tabId);
      if (!page)
        throw new Error(`Tab ${tabId} not found`);
      const wasActive = tabId === this.activeTabId;
      await page.close();
      this.pages.delete(tabId);
      this.tabSessions.delete(tabId);
      this.tabOwnership.delete(tabId);
      if (wasActive) {
        const remaining = [...this.pages.keys()];
        if (remaining.length === 0) {
          await this.newTab();
        } else if (!this.pages.has(this.activeTabId)) {
          this.activeTabId = remaining[remaining.length - 1];
        }
      }
    }
    switchTab(id, opts) {
      if (!this.tabSessions.has(id))
        throw new Error(`Tab ${id} not found`);
      this.activeTabId = id;
      if (opts?.bringToFront !== false) {
        const page = this.pages.get(id);
        if (page)
          page.bringToFront().catch(() => {});
      }
    }
    syncActiveTabByUrl(activeUrl) {
      if (!activeUrl || this.pages.size <= 1)
        return;
      let fuzzyId = null;
      let activeOriginPath = "";
      try {
        const u = new URL(activeUrl);
        activeOriginPath = u.origin + u.pathname;
      } catch (err) {
        if (!(err instanceof TypeError))
          throw err;
      }
      for (const [id, page] of this.pages) {
        try {
          const pageUrl = page.url();
          if (pageUrl === activeUrl && id !== this.activeTabId) {
            this.activeTabId = id;
            return;
          }
          if (activeOriginPath && fuzzyId === null && id !== this.activeTabId) {
            try {
              const pu = new URL(pageUrl);
              if (pu.origin + pu.pathname === activeOriginPath) {
                fuzzyId = id;
              }
            } catch (err) {
              if (!(err instanceof TypeError))
                throw err;
            }
          }
        } catch {}
      }
      if (fuzzyId !== null) {
        this.activeTabId = fuzzyId;
      }
    }
    getActiveTabId() {
      return this.activeTabId;
    }
    getTabCount() {
      return this.pages.size;
    }
    getTabOwner(tabId) {
      return this.tabOwnership.get(tabId) || null;
    }
    checkTabAccess(tabId, clientId, options = {}) {
      if (clientId === "root")
        return true;
      if (options.ownOnly) {
        const owner = this.tabOwnership.get(tabId);
        return owner === clientId;
      }
      return true;
    }
    transferTab(tabId, toClientId) {
      if (!this.pages.has(tabId))
        throw new Error(`Tab ${tabId} not found`);
      this.tabOwnership.set(tabId, toClientId);
    }
    releaseClientTabs(clientId) {
      const released = [];
      for (const [tabId, owner] of this.tabOwnership) {
        if (owner === clientId) {
          this.tabOwnership.delete(tabId);
          released.push(tabId);
        }
      }
      return released;
    }
    async getTabListWithTitles() {
      return Promise.all([...this.pages].map(async ([id, page]) => {
        const title = await withinTabBudget(this.sharedTabRead(page, "title", () => page.title().catch(() => "")), TAB_PROBE_TIMEOUT_MS);
        return {
          id,
          url: page.url(),
          title: title ?? "",
          active: id === this.activeTabId,
          busy: title === undefined
        };
      }));
    }
    async ensureActiveTab() {
      if (this.tabSessions.has(this.activeTabId))
        return false;
      const remaining = [...this.tabSessions.keys()];
      if (remaining.length > 0) {
        this.activeTabId = remaining[remaining.length - 1];
        return false;
      }
      if (!this.context)
        throw new Error("Browser not launched");
      this.activeTabRecovery ??= this.newTab().then(() => {}).finally(() => {
        this.activeTabRecovery = null;
      });
      await this.activeTabRecovery;
      return true;
    }
    async ensureCommandTab(command) {
      if (BrowserManager.NO_TAB_RECOVERY.has(command))
        return;
      try {
        if (!await this.ensureActiveTab())
          return;
      } catch (err) {
        throw new Error(resultLine("browse", "BROWSE_TAB_UNRECOVERABLE", sanitizeEcho(err?.message ?? String(err))));
      }
      return "[browse] warning: every tab was closed outside browse, so this command ran on a new blank tab; open your page again with: browse goto <url>";
    }
    static NO_TAB_RECOVERY = new Set(["status", "stop", "restart"]);
    getActiveSession() {
      const session = this.tabSessions.get(this.activeTabId);
      if (!session)
        throw new Error('No active page. Use "browse goto <url>" first.');
      return session;
    }
    getSession(tabId) {
      const session = this.tabSessions.get(tabId);
      if (!session)
        throw new Error(`Tab ${tabId} not found`);
      return session;
    }
    getPageForTab(tabId) {
      return this.pages.get(tabId) ?? null;
    }
    tabLocks = new Map;
    globalCdpLockTail = Promise.resolve();
    async acquireTabLock(tabId, timeoutMs) {
      const existing = this.tabLocks.get(tabId) ?? Promise.resolve();
      const tail = Promise.all([existing, this.globalCdpLockTail]).then(() => {
        return;
      });
      let release;
      const next = new Promise((resolve) => {
        release = resolve;
      });
      this.tabLocks.set(tabId, tail.then(() => next));
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error(`CDPMutexAcquireTimeout: tab ${tabId} lock not acquired within ${timeoutMs}ms.
Cause: a prior CDP or browser-scoped operation has held the lock too long.
` + "Action: retry; if this repeats, the prior operation may be hung — file a bug.")), timeoutMs));
      try {
        await Promise.race([tail, timeoutPromise]);
      } catch (e) {
        release();
        throw e;
      }
      return release;
    }
    async acquireGlobalCdpLock(timeoutMs) {
      const allTabTails = Array.from(this.tabLocks.values());
      const priorGlobal = this.globalCdpLockTail;
      const allPrior = Promise.all([priorGlobal, ...allTabTails]).then(() => {
        return;
      });
      let release;
      const next = new Promise((resolve) => {
        release = resolve;
      });
      this.globalCdpLockTail = allPrior.then(() => next);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error(`CDPMutexAcquireTimeout: global CDP lock not acquired within ${timeoutMs}ms.
Cause: in-flight tab operations have not completed.
` + "Action: retry; if this repeats, file a bug — a tab op may be hung.")), timeoutMs));
      try {
        await Promise.race([allPrior, timeoutPromise]);
      } catch (e) {
        release();
        throw e;
      }
      return release;
    }
    getPage() {
      return this.getActiveSession().page;
    }
    getCurrentUrl() {
      try {
        return this.getPage().url();
      } catch {
        return "about:blank";
      }
    }
    async getMemorySnapshot(structures) {
      const bunMem = process.memoryUsage();
      const notes = [];
      const tabs = [];
      for (const [id, page] of this.pages) {
        try {
          const url = (() => {
            try {
              return page.url();
            } catch {
              return "";
            }
          })();
          const title = await page.title().catch(() => "");
          const metrics = await withCdpSession(page, async (session) => {
            await session.send("Performance.enable").catch(() => {
              return;
            });
            const result = await session.send("Performance.getMetrics");
            return result.metrics ?? [];
          });
          const mm = {};
          for (const m of metrics)
            mm[m.name] = m.value;
          tabs.push({
            id,
            url,
            title,
            jsHeapUsed: mm.JSHeapUsedSize ?? 0,
            jsHeapTotal: mm.JSHeapTotalSize ?? 0,
            documents: mm.Documents ?? 0,
            nodes: mm.Nodes ?? 0,
            listeners: mm.JSEventListeners ?? 0
          });
        } catch {}
      }
      let processes = null;
      const browser = this.browser ?? (this.context ? this.context.browser() : null);
      if (browser) {
        try {
          const maybeFactory = browser.newBrowserCDPSession;
          if (typeof maybeFactory === "function") {
            const browserSession = await maybeFactory.call(browser);
            try {
              const info = await browserSession.send("SystemInfo.getProcessInfo");
              processes = (info.processInfo ?? []).map((p) => ({
                id: p.id,
                type: p.type,
                cpuTime: p.cpuTime
              }));
              notes.push("Per-Chromium-process RSS not collected — SystemInfo.getProcessInfo exposes PID+type+CPU only. " + 'See follow-up TODO "native/GPU memory breakdown" for the deferred fix.');
            } finally {
              await browserSession.detach().catch(() => {
                return;
              });
            }
          } else {
            notes.push("Playwright build does not expose newBrowserCDPSession; per-process info skipped.");
          }
        } catch (err) {
          notes.push(`CDP browser session unavailable: ${err?.message ?? String(err)}`);
        }
      } else {
        notes.push("Browser handle unavailable (server connection mode); per-process info skipped.");
      }
      return {
        bunServer: {
          rss: bunMem.rss,
          heapUsed: bunMem.heapUsed,
          heapTotal: bunMem.heapTotal,
          external: bunMem.external
        },
        tabs,
        processes,
        structures,
        capturedAt: Date.now(),
        notes
      };
    }
    setRefMap(refs) {
      this.getActiveSession().setRefMap(refs);
    }
    clearRefs() {
      this.getActiveSession().clearRefs();
    }
    async resolveRef(selector) {
      return this.getActiveSession().resolveRef(selector);
    }
    getRefRole(selector) {
      return this.getActiveSession().getRefRole(selector);
    }
    getRefCount() {
      return this.getActiveSession().getRefCount();
    }
    setLastSnapshot(text) {
      this.getActiveSession().setLastSnapshot(text);
    }
    getLastSnapshot() {
      return this.getActiveSession().getLastSnapshot();
    }
    setDialogAutoAccept(accept) {
      this.dialogAutoAccept = accept;
    }
    getDialogAutoAccept() {
      return this.dialogAutoAccept;
    }
    setDialogPromptText(text) {
      this.dialogPromptText = text;
    }
    getDialogPromptText() {
      return this.dialogPromptText;
    }
    trackCookieImportDomains(domains) {
      for (const d of domains)
        this.cookieImportedDomains.add(d);
    }
    getCookieImportedDomains() {
      return this.cookieImportedDomains;
    }
    hasCookieImports() {
      return this.cookieImportedDomains.size > 0;
    }
    async setViewport(width, height) {
      this.currentViewport = { width, height };
      await this.getPage().setViewportSize({ width, height });
    }
    async resetViewport() {
      this.currentViewport = { width: 1280, height: 720 };
      if (this.connectionMode !== "headed") {
        await this.getPage().setViewportSize(this.currentViewport);
        return "default";
      }
      if (!this.context)
        throw new Error("Browser not launched");
      const tabId = this.activeTabId;
      const pinned = this.getPage();
      const loaded = this.getActiveSession().getLoadedHtml();
      const url = pinned.url();
      const page = await this.context.newPage();
      const session = new TabSession(page);
      this.wirePageEvents(page);
      try {
        if (loaded)
          await session.setTabContent(loaded.html, { waitUntil: loaded.waitUntil });
        else if (url !== "about:blank")
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
      } catch (err) {
        await page.close().catch(() => {});
        throw err;
      }
      this.pages.set(tabId, page);
      this.tabSessions.set(tabId, session);
      await pinned.close().catch(() => {});
      await page.bringToFront().catch(() => {});
      return "window";
    }
    async setExtraHeader(name, value) {
      this.extraHeaders[name] = value;
      if (this.context) {
        await this.context.setExtraHTTPHeaders(this.extraHeaders);
      }
    }
    setUserAgent(ua) {
      this.customUserAgent = ua;
    }
    getUserAgent() {
      return this.customUserAgent;
    }
    async closeAllPages() {
      for (const page of this.pages.values()) {
        await page.close().catch(() => {});
      }
      this.pages.clear();
      this.tabSessions.clear();
    }
    setFrame(frame) {
      this.getActiveSession().setFrame(frame);
    }
    getFrame() {
      return this.getActiveSession().getFrame();
    }
    getActiveFrameOrPage() {
      return this.getActiveSession().getActiveFrameOrPage();
    }
    async saveState() {
      if (!this.context)
        throw new Error("Browser not launched");
      const cookies = await this.context.cookies();
      const pages = [];
      for (const [id, page] of this.pages) {
        const url = page.url();
        const storage = await this.readTabStorage(page, url);
        const session = this.tabSessions.get(id);
        const loaded = session?.getLoadedHtml();
        const owner = this.tabOwnership.get(id);
        pages.push({
          url: url === "about:blank" ? "" : url,
          isActive: id === this.activeTabId,
          storage,
          loadedHtml: loaded?.html,
          loadedHtmlWaitUntil: loaded?.waitUntil,
          owner
        });
      }
      return { cookies, pages };
    }
    async readTabStorage(page, url) {
      const origin = urlOrigin(url);
      const read = await withinTabBudget(this.sharedTabRead(page, "storage", () => page.evaluate(() => ({
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage }
      })).catch(() => null)), TAB_STORAGE_READ_TIMEOUT_MS);
      if (read === undefined) {
        const last = this.lastTabStorage.get(page);
        return last?.origin === origin ? last.storage : null;
      }
      if (read)
        this.lastTabStorage.set(page, { origin, storage: read });
      else
        this.lastTabStorage.delete(page);
      return read;
    }
    async restoreState(state) {
      if (!this.context)
        throw new Error("Browser not launched");
      if (state.cookies.length > 0) {
        await this.context.addCookies(state.cookies);
      }
      this.tabOwnership.clear();
      let activeId = null;
      for (const saved of state.pages) {
        const page = await this.context.newPage();
        const id = this.nextTabId++;
        this.pages.set(id, page);
        const newSession = new TabSession(page);
        this.tabSessions.set(id, newSession);
        this.wirePageEvents(page);
        if (saved.owner) {
          this.tabOwnership.set(id, saved.owner);
        }
        if (saved.loadedHtml) {
          try {
            await newSession.setTabContent(saved.loadedHtml, { waitUntil: saved.loadedHtmlWaitUntil });
          } catch (err) {
            console.warn(`[browse] Failed to replay loadedHtml for tab ${id}: ${err.message}`);
          }
        } else if (saved.url) {
          let normalizedUrl;
          try {
            normalizedUrl = await validateNavigationUrl(saved.url);
          } catch (err) {
            console.warn(`[browse] Skipping invalid URL in state file: ${saved.url} — ${err.message}`);
            continue;
          }
          await page.goto(normalizedUrl, { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
        }
        if (saved.storage) {
          try {
            await page.evaluate((s) => {
              if (s.localStorage) {
                for (const [k, v] of Object.entries(s.localStorage)) {
                  localStorage.setItem(k, v);
                }
              }
              if (s.sessionStorage) {
                for (const [k, v] of Object.entries(s.sessionStorage)) {
                  sessionStorage.setItem(k, v);
                }
              }
            }, saved.storage);
          } catch {}
        }
        if (saved.isActive)
          activeId = id;
      }
      if (this.pages.size === 0) {
        await this.newTab();
      } else {
        this.activeTabId = activeId ?? [...this.pages.keys()][0];
      }
      this.clearRefs();
    }
    async recreateContext() {
      if (this.connectionMode === "headed") {
        throw new Error("Cannot recreate context in headed mode. Use disconnect first.");
      }
      if (this.extensionContext) {
        throw new Error("Cannot recreate context while BROWSE_EXTENSIONS_DIR extensions are loaded (persistent context). Restart browse with the new settings instead.");
      }
      if (!this.browser || !this.context) {
        throw new Error("Browser not launched");
      }
      try {
        const state = await this.saveState();
        for (const page of this.pages.values()) {
          await page.close().catch(() => {});
        }
        this.pages.clear();
        this.tabSessions.clear();
        await this.context.close().catch(() => {});
        const contextOptions = {
          viewport: { width: this.currentViewport.width, height: this.currentViewport.height },
          deviceScaleFactor: this.deviceScaleFactor
        };
        if (this.customUserAgent) {
          contextOptions.userAgent = this.customUserAgent;
        }
        this.context = await this.browser.newContext(contextOptions);
        await Promise.resolve().then(() => init_stealth());
        await applyStealth(this.context);
        if (Object.keys(this.extraHeaders).length > 0) {
          await this.context.setExtraHTTPHeaders(this.extraHeaders);
        }
        await this.restoreState(state);
        return null;
      } catch (err) {
        try {
          this.pages.clear();
          this.tabSessions.clear();
          if (this.context)
            await this.context.close().catch(() => {});
          const contextOptions = {
            viewport: { width: this.currentViewport.width, height: this.currentViewport.height },
            deviceScaleFactor: this.deviceScaleFactor
          };
          if (this.customUserAgent) {
            contextOptions.userAgent = this.customUserAgent;
          }
          this.context = await this.browser.newContext(contextOptions);
          await Promise.resolve().then(() => init_stealth());
          await applyStealth(this.context);
          await this.newTab();
          this.clearRefs();
        } catch {}
        return `Context recreation failed: ${err instanceof Error ? err.message : String(err)}. Browser reset to blank tab.`;
      }
    }
    async setDeviceScaleFactor(scale, width, height) {
      if (!Number.isFinite(scale)) {
        throw new Error(`viewport --scale: value must be a finite number, got ${scale}`);
      }
      if (scale < 1 || scale > 3) {
        throw new Error(`viewport --scale: value must be between 1 and 3 (gstack policy cap), got ${scale}`);
      }
      if (this.connectionMode === "headed") {
        throw new Error("viewport --scale is not supported in headed mode — scale is controlled by the real browser window.");
      }
      const prevScale = this.deviceScaleFactor;
      const prevViewport = { ...this.currentViewport };
      this.deviceScaleFactor = scale;
      this.currentViewport = { width, height };
      const err = await this.recreateContext();
      if (err !== null) {
        this.deviceScaleFactor = prevScale;
        this.currentViewport = prevViewport;
        const rollbackErr = await this.recreateContext();
        if (rollbackErr !== null) {
          return `${err} (rollback also encountered: ${rollbackErr})`;
        }
        return err;
      }
      return null;
    }
    getDeviceScaleFactor() {
      return this.deviceScaleFactor;
    }
    getCurrentViewport() {
      return { ...this.currentViewport };
    }
    async handoff(message) {
      if (this.handoffPending)
        return this.handoffPending;
      this.handoffPending = this.promoteToHeaded(message);
      try {
        return await this.handoffPending;
      } finally {
        this.handoffPending = null;
      }
    }
    async promoteToHeaded(message) {
      if (this.closing)
        return "ERROR: Browser is shutting down";
      if (this.connectionMode === "headed" || this.isHeaded) {
        return `HANDOFF: Already in headed mode at ${this.getCurrentUrl()}`;
      }
      if (!this.browser || !this.context) {
        throw new Error("Browser not launched");
      }
      const state = await this.saveState();
      if (this.closing)
        return "ERROR: Browser is shutting down";
      const currentUrl = this.getCurrentUrl();
      const previousDisplay = this.xvfb;
      let newContext;
      try {
        await this.ensureHeadedDisplay();
        const fs = __require("fs");
        const path = __require("path");
        const extensionPath = this.findExtensionPath();
        await Promise.resolve().then(() => init_stealth());
        const launchArgs = ["--hide-crash-restore-bubble", ...STEALTH_LAUNCH_ARGS, ...buildGStackLaunchArgs(), ...this.proxyLaunchArgs()];
        if (extensionPath) {
          launchArgs.push(`--disable-extensions-except=${extensionPath}`);
          launchArgs.push(`--load-extension=${extensionPath}`);
          console.log(`[browse] Handoff: loading extension from ${extensionPath}`);
        } else {
          console.log("[browse] Handoff: extension not found — headed mode without side panel");
        }
        const userDataDir = resolveChromiumProfile();
        ensureProjectProfile(userDataDir);
        fs.mkdirSync(userDataDir, { recursive: true });
        cleanSingletonLocks(userDataDir);
        try {
          probePoisonedChromiumBundle(chromium2.executablePath());
        } catch (err) {
          if (err instanceof PoisonedBundleError)
            throw err;
        }
        await Promise.resolve().then(() => init_stealth());
        newContext = await launchWithXProtectHeal(() => chromium2.launchPersistentContext(userDataDir, {
          headless: false,
          ...this.xvfb ? { env: { ...process.env, DISPLAY: this.xvfb.display } } : {},
          handleSIGINT: false,
          handleSIGTERM: false,
          handleSIGHUP: false,
          chromiumSandbox: shouldEnableChromiumSandbox(),
          args: launchArgs,
          viewport: null,
          ...this.proxyConfig ? { proxy: this.proxyConfig } : {},
          ignoreDefaultArgs: STEALTH_IGNORE_DEFAULT_ARGS,
          timeout: 15000
        }));
        if (this.closing) {
          await newContext.close().catch(() => {});
          throw new Error("Browser is shutting down");
        }
      } catch (err) {
        if (!previousDisplay)
          this.closeOwnedDisplay();
        if (this.closing)
          return "ERROR: Browser is shutting down";
        const msg = err instanceof Error ? err.message : String(err);
        return `ERROR: Cannot open headed browser — ${msg}. Headless browser still running.`;
      }
      const previous = {
        browser: this.browser,
        context: this.context,
        pages: this.pages,
        tabSessions: this.tabSessions,
        tabOwnership: this.tabOwnership,
        activeTabId: this.activeTabId,
        nextTabId: this.nextTabId,
        connectionMode: this.connectionMode,
        isHeaded: this.isHeaded,
        dialogAutoAccept: this.dialogAutoAccept,
        intentionalDisconnect: this.intentionalDisconnect,
        chromiumProcInfo: this.chromiumProcInfo,
        tabGuardrailSoftHit: this.tabGuardrailSoftHit,
        tabGuardrailHardHit: this.tabGuardrailHardHit
      };
      this.handoffPrevious = previous;
      try {
        this.context = newContext;
        this.browser = newContext.browser();
        this.pages = new Map;
        this.tabSessions = new Map;
        this.tabOwnership = new Map;
        await Promise.resolve().then(() => init_stealth());
        await applyStealth(newContext);
        if (Object.keys(this.extraHeaders).length > 0) {
          await newContext.setExtraHTTPHeaders(this.extraHeaders);
        }
        await this.restoreState(state);
        if (this.closing)
          throw new Error("Browser is shutting down");
        if (this.browser) {
          const browserRef = this.browser;
          this.onBrowserDisconnected(this.browser, () => {
            if (this.intentionalDisconnect)
              return;
            handleChromiumDisconnect(browserRef);
          });
        }
        this.connectionMode = "headed";
        this.isHeaded = true;
        this.dialogAutoAccept = false;
        this.chromiumProcInfo = null;
        try {
          this.onHeadedPromotion?.();
        } catch (err) {
          console.warn("[browse] Headed promotion callback failed:", err);
        }
        this.detachDisconnectHandlers(previous.browser);
        previous.browser.close().catch(() => {});
        return [
          `HANDOFF: Browser opened at ${currentUrl}`,
          ...this.xvfb ? ["DISPLAY: Off-screen Xvfb; a separate remote desktop is required for human interaction."] : [],
          `MESSAGE: ${message}`,
          `STATUS: Waiting for user. Run 'resume' when done.`
        ].join(`
`);
      } catch (err) {
        await newContext.close().catch(() => {});
        if (!this.closing) {
          Object.assign(this, previous);
          this.recheckTabGuardrailsOnClose();
        }
        if (!previousDisplay)
          this.closeOwnedDisplay();
        if (this.closing)
          return "ERROR: Browser is shutting down";
        const msg = err instanceof Error ? err.message : String(err);
        return `ERROR: Handoff failed during state restore — ${msg}. Headless browser still running.`;
      } finally {
        this.handoffPrevious = null;
      }
    }
    resume() {
      try {
        const session = this.getActiveSession();
        session.clearRefs();
        session.setFrame(null);
      } catch {}
      this.resetFailures();
    }
    getIsHeaded() {
      return this.isHeaded;
    }
    incrementFailures() {
      this.consecutiveFailures++;
    }
    resetFailures() {
      this.consecutiveFailures = 0;
    }
    getFailureHint() {
      if (this.consecutiveFailures >= 3 && !this.isHeaded) {
        return `HINT: ${this.consecutiveFailures} consecutive failures. Consider using 'handoff' to let the user help.`;
      }
      return null;
    }
    async failIfNavigationBlocked(page, work) {
      const outcome = await work.then((value) => ({ value }), (error) => ({ error }));
      const guard = this.navigationGuards.get(page);
      while (guard && guard.pending.size > 0)
        await Promise.all([...guard.pending]);
      const blocked = guard?.blocked ?? null;
      if (guard)
        guard.blocked = null;
      if (blocked)
        throw new Error(blocked);
      if ("error" in outcome)
        throw outcome.error;
      return outcome.value;
    }
    guardNavigations(page) {
      if (this.navigationGuards.has(page))
        return;
      const guard = { pending: new Set, blocked: null };
      this.navigationGuards.set(page, guard);
      page.on("request", (req) => {
        if (!req.isNavigationRequest())
          return;
        const check = blockedNavigationReason(req.url()).then(async (reason) => {
          if (!reason || page.isClosed())
            return;
          guard.blocked = reason;
          console.warn(`[browse] ${reason} (navigation from ${req.frame().url() || "a new page"}; tab reset to about:blank)`);
          await Promise.race([req.response().catch(() => null), new Promise((resolve) => setTimeout(resolve, 1000))]);
          for (let attempt = 0;attempt < 3 && !page.isClosed(); attempt++) {
            await page.goto("about:blank", { waitUntil: "load", timeout: 5000 }).catch(() => {});
            const late = await page.waitForEvent("framenavigated", { predicate: (frame) => frame === page.mainFrame(), timeout: 250 }).then(() => true, () => false);
            if (!late && page.url() === "about:blank")
              break;
          }
        }).finally(() => {
          guard.pending.delete(check);
        });
        guard.pending.add(check);
      });
    }
    wirePageEvents(page) {
      const pages = this.pages;
      const tabSessions = this.tabSessions;
      this.guardNavigations(page);
      page.on("close", () => {
        for (const [id, p] of pages) {
          if (p === page) {
            pages.delete(id);
            tabSessions.delete(id);
            console.log(`[browse] Tab closed (id=${id}, remaining=${pages.size})`);
            const remaining = [...pages.keys()];
            const fallback = remaining.length > 0 ? remaining[remaining.length - 1] : 0;
            if (pages === this.pages) {
              if (this.activeTabId === id)
                this.activeTabId = fallback;
            } else if (this.handoffPrevious?.pages === pages && this.handoffPrevious.activeTabId === id) {
              this.handoffPrevious.activeTabId = fallback;
            }
            break;
          }
        }
        if (pages === this.pages)
          this.recheckTabGuardrailsOnClose();
      });
      page.on("framenavigated", (frame) => {
        if (frame === page.mainFrame()) {
          for (const session of tabSessions.values()) {
            if (session.page === page) {
              session.onMainFrameNavigated();
              break;
            }
          }
        }
      });
      page.on("dialog", async (dialog) => {
        const entry = {
          timestamp: Date.now(),
          type: dialog.type(),
          message: dialog.message(),
          defaultValue: dialog.defaultValue() || undefined,
          action: this.dialogAutoAccept ? "accepted" : "dismissed",
          response: this.dialogAutoAccept ? this.dialogPromptText ?? undefined : undefined
        };
        addDialogEntry(entry);
        try {
          if (this.dialogAutoAccept) {
            await dialog.accept(this.dialogPromptText ?? undefined);
          } else {
            await dialog.dismiss();
          }
        } catch {}
      });
      page.on("console", (msg) => {
        addConsoleEntry({
          timestamp: Date.now(),
          level: msg.type(),
          text: msg.text()
        });
      });
      page.on("request", (req) => {
        addNetworkEntry({
          timestamp: Date.now(),
          method: req.method(),
          url: req.url()
        });
      });
      page.on("response", (res) => {
        const url = res.url();
        const status = res.status();
        for (let i = networkBuffer.length - 1;i >= 0; i--) {
          const entry = networkBuffer.get(i);
          if (entry && entry.url === url && !entry.status) {
            networkBuffer.set(i, { ...entry, status, duration: Date.now() - entry.timestamp });
            break;
          }
        }
      });
      page.on("requestfinished", async (req) => {
        try {
          const sizes = await req.sizes().catch(() => null);
          if (!sizes)
            return;
          const url = req.url();
          const size = sizes.responseBodySize ?? 0;
          for (let i = networkBuffer.length - 1;i >= 0; i--) {
            const entry = networkBuffer.get(i);
            if (entry && entry.url === url && !entry.size) {
              networkBuffer.set(i, { ...entry, size });
              break;
            }
          }
        } catch {}
      });
    }
  };
});

// browse/src/cdp-inspector.ts
async function getOrCreateSession(page) {
  let session = cdpSessions.get(page);
  if (session) {
    try {
      await session.send("DOM.getDocument", { depth: 0 });
      return session;
    } catch (err) {
      if (!err?.message?.includes("closed") && !err?.message?.includes("Target") && !err?.message?.includes("detached"))
        throw err;
      cdpSessions.delete(page);
      initializedPages.delete(page);
    }
  }
  session = await getOrCreateCdpSession(page, cdpSessions);
  if (!initializedPages.has(page)) {
    await session.send("DOM.enable");
    await session.send("CSS.enable");
    initializedPages.add(page);
    page.once("close", () => initializedPages.delete(page));
  }
  page.once("framenavigated", () => {
    try {
      session.detach().catch(() => {});
    } catch (err) {
      if (!err?.message?.includes("closed") && !err?.message?.includes("Target") && !err?.message?.includes("detached"))
        throw err;
    }
    cdpSessions.delete(page);
    initializedPages.delete(page);
  });
  return session;
}
function pushModification(mod) {
  modificationHistory.push(mod);
  modHistoryTotalPushed++;
  while (modificationHistory.length > MOD_HISTORY_CAP) {
    modificationHistory.shift();
  }
}
function computeSpecificity(selector) {
  let a = 0, b = 0, c = 0;
  let cleaned = selector;
  const ids = cleaned.match(/#[a-zA-Z_-][\w-]*/g);
  if (ids)
    a += ids.length;
  const classes = cleaned.match(/\.[a-zA-Z_-][\w-]*/g);
  if (classes)
    b += classes.length;
  const attrs = cleaned.match(/\[[^\]]+\]/g);
  if (attrs)
    b += attrs.length;
  const pseudoClasses = cleaned.match(/(?<!:):[a-zA-Z][\w-]*/g);
  if (pseudoClasses)
    b += pseudoClasses.length;
  const types = cleaned.match(/(?:^|[\s+~>])([a-zA-Z][\w-]*)/g);
  if (types)
    c += types.length;
  const pseudoElements = cleaned.match(/::[a-zA-Z][\w-]*/g);
  if (pseudoElements)
    c += pseudoElements.length;
  return { a, b, c };
}
function compareSpecificity(s1, s2) {
  if (s1.a !== s2.a)
    return s1.a - s2.a;
  if (s1.b !== s2.b)
    return s1.b - s2.b;
  return s1.c - s2.c;
}
async function inspectElement(page, selector, options) {
  const session = await getOrCreateSession(page);
  const { root } = await session.send("DOM.getDocument", { depth: 0 });
  let nodeId;
  try {
    const result = await session.send("DOM.querySelector", {
      nodeId: root.nodeId,
      selector
    });
    nodeId = result.nodeId;
    if (!nodeId)
      throw new Error(`Element not found: ${selector}`);
  } catch (err) {
    throw new Error(`Element not found: ${selector} — ${err.message}`);
  }
  const { node } = await session.send("DOM.describeNode", { nodeId, depth: 0 });
  const tagName = (node.localName || node.nodeName || "").toLowerCase();
  const attrPairs = node.attributes || [];
  const attributes = {};
  for (let i = 0;i < attrPairs.length; i += 2) {
    attributes[attrPairs[i]] = attrPairs[i + 1];
  }
  const id = attributes.id || null;
  const classes = attributes.class ? attributes.class.split(/\s+/).filter(Boolean) : [];
  let boxModel = {
    content: { x: 0, y: 0, width: 0, height: 0 },
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    border: { top: 0, right: 0, bottom: 0, left: 0 },
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  };
  try {
    const boxData = await session.send("DOM.getBoxModel", { nodeId });
    const model = boxData.model;
    const content = model.content;
    const padding = model.padding;
    const border = model.border;
    const margin = model.margin;
    const contentX = content[0];
    const contentY = content[1];
    const contentWidth = content[2] - content[0];
    const contentHeight = content[5] - content[1];
    boxModel = {
      content: { x: contentX, y: contentY, width: contentWidth, height: contentHeight },
      padding: {
        top: content[1] - padding[1],
        right: padding[2] - content[2],
        bottom: padding[5] - content[5],
        left: content[0] - padding[0]
      },
      border: {
        top: padding[1] - border[1],
        right: border[2] - padding[2],
        bottom: border[5] - padding[5],
        left: padding[0] - border[0]
      },
      margin: {
        top: border[1] - margin[1],
        right: margin[2] - border[2],
        bottom: margin[5] - border[5],
        left: border[0] - margin[0]
      }
    };
  } catch (err) {
    if (!err?.message?.includes("box model") && !err?.message?.includes("Could not compute"))
      throw err;
  }
  const matchedData = await session.send("CSS.getMatchedStylesForNode", { nodeId });
  const computedData = await session.send("CSS.getComputedStyleForNode", { nodeId });
  const computedStyles = {};
  for (const entry of computedData.computedStyle) {
    if (KEY_CSS_SET.has(entry.name)) {
      computedStyles[entry.name] = entry.value;
    }
  }
  const inlineData = await session.send("CSS.getInlineStylesForNode", { nodeId });
  const inlineStyles = {};
  if (inlineData.inlineStyle?.cssProperties) {
    for (const prop of inlineData.inlineStyle.cssProperties) {
      if (prop.name && prop.value && !prop.disabled) {
        inlineStyles[prop.name] = prop.value;
      }
    }
  }
  const matchedRules = [];
  const seenProperties = new Map;
  if (matchedData.matchedCSSRules) {
    for (const match of matchedData.matchedCSSRules) {
      const rule = match.rule;
      const isUA = rule.origin === "user-agent";
      if (isUA && !options?.includeUA)
        continue;
      let selectorText = "";
      if (rule.selectorList?.selectors) {
        const matchingIdx = match.matchingSelectors?.[0] ?? 0;
        selectorText = rule.selectorList.selectors[matchingIdx]?.text || rule.selectorList.text || "";
      }
      let source = "inline";
      let sourceLine = 0;
      let sourceColumn = 0;
      let styleSheetId;
      let range;
      if (rule.styleSheetId) {
        styleSheetId = rule.styleSheetId;
        source = rule.origin === "regular" ? rule.styleSheetId || "stylesheet" : rule.origin;
      }
      if (rule.style?.range) {
        range = rule.style.range;
        sourceLine = rule.style.range.startLine || 0;
        sourceColumn = rule.style.range.startColumn || 0;
      }
      let media;
      if (match.rule?.media) {
        const mediaList = match.rule.media;
        if (Array.isArray(mediaList) && mediaList.length > 0) {
          media = mediaList.map((m) => m.text).filter(Boolean).join(", ");
        }
      }
      const specificity = computeSpecificity(selectorText);
      const properties = [];
      if (rule.style?.cssProperties) {
        for (const prop of rule.style.cssProperties) {
          if (!prop.name || prop.disabled)
            continue;
          if (prop.name.startsWith("-") && !KEY_CSS_SET.has(prop.name))
            continue;
          properties.push({
            name: prop.name,
            value: prop.value || "",
            important: prop.important || (prop.value?.includes("!important") ?? false),
            overridden: false
          });
        }
      }
      matchedRules.push({
        selector: selectorText,
        properties,
        source,
        sourceLine,
        sourceColumn,
        specificity,
        media,
        userAgent: isUA,
        styleSheetId,
        range
      });
    }
  }
  matchedRules.sort((a, b) => -compareSpecificity(a.specificity, b.specificity));
  for (let i = 0;i < matchedRules.length; i++) {
    for (const prop of matchedRules[i].properties) {
      const key = prop.name;
      if (!seenProperties.has(key)) {
        seenProperties.set(key, i);
      } else {
        const earlierIdx = seenProperties.get(key);
        const earlierRule = matchedRules[earlierIdx];
        const earlierProp = earlierRule.properties.find((p) => p.name === key);
        if (prop.important && earlierProp && !earlierProp.important) {
          if (earlierProp)
            earlierProp.overridden = true;
          seenProperties.set(key, i);
        } else {
          prop.overridden = true;
        }
      }
    }
  }
  const pseudoElements = [];
  if (matchedData.pseudoElements) {
    for (const pseudo of matchedData.pseudoElements) {
      const pseudoType = pseudo.pseudoType || "unknown";
      const rules = [];
      if (pseudo.matches) {
        for (const match of pseudo.matches) {
          const rule = match.rule;
          const sel = rule.selectorList?.text || "";
          const props = (rule.style?.cssProperties || []).filter((p) => p.name && !p.disabled).map((p) => `${p.name}: ${p.value}`).join("; ");
          if (props) {
            rules.push({ selector: sel, properties: props });
          }
        }
      }
      if (rules.length > 0) {
        pseudoElements.push({ pseudo: `::${pseudoType}`, rules });
      }
    }
  }
  return {
    selector,
    tagName,
    id,
    classes,
    attributes,
    boxModel,
    computedStyles,
    matchedRules,
    inlineStyles,
    pseudoElements
  };
}
async function modifyStyle(page, selector, property, value) {
  if (!/^[a-zA-Z-]+$/.test(property)) {
    throw new Error(`Invalid CSS property name: ${property}. Only letters and hyphens allowed.`);
  }
  const DANGEROUS_CSS = /url\s*\(|expression\s*\(|@import|javascript:|data:/i;
  if (DANGEROUS_CSS.test(value)) {
    throw new Error("CSS value rejected: contains potentially dangerous pattern.");
  }
  let oldValue = "";
  let source = "inline";
  let sourceLine = 0;
  let method = "inline";
  try {
    const session = await getOrCreateSession(page);
    const result = await inspectElement(page, selector);
    oldValue = result.computedStyles[property] || "";
    let targetRule = null;
    for (const rule of result.matchedRules) {
      if (rule.userAgent)
        continue;
      const hasProp = rule.properties.some((p) => p.name === property);
      if (hasProp && rule.styleSheetId && rule.range) {
        targetRule = rule;
        break;
      }
    }
    if (targetRule?.styleSheetId && targetRule.range) {
      const range = targetRule.range;
      const styleText = await session.send("CSS.getStyleSheetText", {
        styleSheetId: targetRule.styleSheetId
      });
      const currentProps = targetRule.properties;
      const newPropsText = currentProps.map((p) => {
        if (p.name === property) {
          return `${p.name}: ${value}`;
        }
        return `${p.name}: ${p.value}`;
      }).join("; ");
      try {
        await session.send("CSS.setStyleTexts", {
          edits: [{
            styleSheetId: targetRule.styleSheetId,
            range,
            text: newPropsText
          }]
        });
        method = "setStyleTexts";
        source = `${targetRule.source}:${targetRule.sourceLine}`;
        sourceLine = targetRule.sourceLine;
      } catch (err) {
        if (!err?.message?.includes("style") && !err?.message?.includes("range") && !err?.message?.includes("closed") && !err?.message?.includes("Target"))
          throw err;
      }
    }
    if (method === "inline") {
      await page.evaluate(([sel, prop, val]) => {
        const el = document.querySelector(sel);
        if (!el)
          throw new Error(`Element not found: ${sel}`);
        el.style.setProperty(prop, val);
      }, [selector, property, value]);
    }
  } catch (err) {
    await page.evaluate(([sel, prop, val]) => {
      const el = document.querySelector(sel);
      if (!el)
        throw new Error(`Element not found: ${sel}`);
      el.style.setProperty(prop, val);
    }, [selector, property, value]);
  }
  const modification = {
    selector,
    property,
    oldValue,
    newValue: value,
    source,
    sourceLine,
    timestamp: Date.now(),
    method
  };
  pushModification(modification);
  return modification;
}
async function undoModification(page, index) {
  const idx = index ?? modificationHistory.length - 1;
  if (idx < 0 || idx >= modificationHistory.length) {
    const evictedNote = modHistoryTotalPushed > MOD_HISTORY_CAP ? ` (most recent ${MOD_HISTORY_CAP} only — ${modHistoryTotalPushed - MOD_HISTORY_CAP} earlier entries evicted at the cap)` : "";
    throw new Error(`No modification at index ${idx}. History has ${modificationHistory.length} entries${evictedNote}.`);
  }
  const mod = modificationHistory[idx];
  if (mod.method === "setStyleTexts") {
    try {
      await modifyStyle(page, mod.selector, mod.property, mod.oldValue);
      modificationHistory.pop();
    } catch (err) {
      if (!err?.message?.includes("closed") && !err?.message?.includes("Target") && !err?.message?.includes("style") && !err?.message?.includes("not found") && !err?.message?.includes("Element"))
        throw err;
      await page.evaluate(([sel, prop, val]) => {
        const el = document.querySelector(sel);
        if (!el)
          return;
        if (val) {
          el.style.setProperty(prop, val);
        } else {
          el.style.removeProperty(prop);
        }
      }, [mod.selector, mod.property, mod.oldValue]);
    }
  } else {
    await page.evaluate(([sel, prop, val]) => {
      const el = document.querySelector(sel);
      if (!el)
        return;
      if (val) {
        el.style.setProperty(prop, val);
      } else {
        el.style.removeProperty(prop);
      }
    }, [mod.selector, mod.property, mod.oldValue]);
  }
  modificationHistory.splice(idx, 1);
}
function getModificationHistory() {
  return [...modificationHistory];
}
function getModificationHistoryStats() {
  return {
    current: modificationHistory.length,
    cap: MOD_HISTORY_CAP,
    evicted: Math.max(0, modHistoryTotalPushed - MOD_HISTORY_CAP)
  };
}
async function resetModifications(page) {
  for (let i = modificationHistory.length - 1;i >= 0; i--) {
    const mod = modificationHistory[i];
    try {
      await page.evaluate(([sel, prop, val]) => {
        const el = document.querySelector(sel);
        if (!el)
          return;
        if (val) {
          el.style.setProperty(prop, val);
        } else {
          el.style.removeProperty(prop);
        }
      }, [mod.selector, mod.property, mod.oldValue]);
    } catch (err) {
      if (!err?.message?.includes("closed") && !err?.message?.includes("Target") && !err?.message?.includes("Execution context"))
        throw err;
    }
  }
  modificationHistory.length = 0;
  modHistoryTotalPushed = 0;
}
function formatInspectorResult(result, options) {
  const lines = [];
  const classStr = result.classes.length > 0 ? ` class="${result.classes.join(" ")}"` : "";
  const idStr = result.id ? ` id="${result.id}"` : "";
  lines.push(`Element: <${result.tagName}${idStr}${classStr}>`);
  lines.push(`Selector: ${result.selector}`);
  const w = Math.round(result.boxModel.content.width + result.boxModel.padding.left + result.boxModel.padding.right);
  const h = Math.round(result.boxModel.content.height + result.boxModel.padding.top + result.boxModel.padding.bottom);
  lines.push(`Dimensions: ${w} x ${h}`);
  lines.push("");
  lines.push("Box Model:");
  const bm = result.boxModel;
  lines.push(`  margin:  ${Math.round(bm.margin.top)}px  ${Math.round(bm.margin.right)}px  ${Math.round(bm.margin.bottom)}px  ${Math.round(bm.margin.left)}px`);
  lines.push(`  padding: ${Math.round(bm.padding.top)}px  ${Math.round(bm.padding.right)}px  ${Math.round(bm.padding.bottom)}px  ${Math.round(bm.padding.left)}px`);
  lines.push(`  border:  ${Math.round(bm.border.top)}px  ${Math.round(bm.border.right)}px  ${Math.round(bm.border.bottom)}px  ${Math.round(bm.border.left)}px`);
  lines.push(`  content: ${Math.round(bm.content.width)} x ${Math.round(bm.content.height)}`);
  lines.push("");
  const displayRules = options?.includeUA ? result.matchedRules : result.matchedRules.filter((r) => !r.userAgent);
  lines.push(`Matched Rules (${displayRules.length}):`);
  if (displayRules.length === 0) {
    lines.push("  (none)");
  } else {
    for (const rule of displayRules) {
      const propsStr = rule.properties.filter((p) => !p.overridden).map((p) => `${p.name}: ${p.value}${p.important ? " !important" : ""}`).join("; ");
      if (!propsStr)
        continue;
      const spec = `[${rule.specificity.a},${rule.specificity.b},${rule.specificity.c}]`;
      lines.push(`  ${rule.selector} { ${propsStr} }`);
      lines.push(`    -> ${rule.source}:${rule.sourceLine} ${spec}${rule.media ? ` @media ${rule.media}` : ""}`);
    }
  }
  lines.push("");
  lines.push("Inline Styles:");
  const inlineEntries = Object.entries(result.inlineStyles);
  if (inlineEntries.length === 0) {
    lines.push("  (none)");
  } else {
    const inlineStr = inlineEntries.map(([k, v]) => `${k}: ${v}`).join("; ");
    lines.push(`  ${inlineStr}`);
  }
  lines.push("");
  lines.push("Computed (key):");
  const cs = result.computedStyles;
  const computedPairs = [];
  for (const prop of KEY_CSS_PROPERTIES) {
    if (cs[prop] !== undefined) {
      computedPairs.push(`${prop}: ${cs[prop]}`);
    }
  }
  for (let i = 0;i < computedPairs.length; i += 3) {
    const chunk = computedPairs.slice(i, i + 3);
    lines.push(`  ${chunk.join(" | ")}`);
  }
  if (result.pseudoElements.length > 0) {
    lines.push("");
    lines.push("Pseudo-elements:");
    for (const pseudo of result.pseudoElements) {
      for (const rule of pseudo.rules) {
        lines.push(`  ${pseudo.pseudo} ${rule.selector} { ${rule.properties} }`);
      }
    }
  }
  return lines.join(`
`);
}
function detachSession(page) {
  if (page) {
    const session = cdpSessions.get(page);
    if (session) {
      try {
        session.detach().catch(() => {});
      } catch (err) {
        if (!err?.message?.includes("closed") && !err?.message?.includes("Target") && !err?.message?.includes("detached"))
          throw err;
      }
      cdpSessions.delete(page);
      initializedPages.delete(page);
    }
  }
}
var KEY_CSS_PROPERTIES, KEY_CSS_SET, cdpSessions, initializedPages, MOD_HISTORY_CAP = 200, modificationHistory, modHistoryTotalPushed = 0;
var init_cdp_inspector = __esm(() => {
  init_cdp_bridge();
  KEY_CSS_PROPERTIES = [
    "display",
    "position",
    "top",
    "right",
    "bottom",
    "left",
    "float",
    "clear",
    "z-index",
    "overflow",
    "overflow-x",
    "overflow-y",
    "width",
    "height",
    "min-width",
    "max-width",
    "min-height",
    "max-height",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "border-top-width",
    "border-right-width",
    "border-bottom-width",
    "border-left-width",
    "border-style",
    "border-color",
    "font-family",
    "font-size",
    "font-weight",
    "line-height",
    "color",
    "background-color",
    "background-image",
    "opacity",
    "box-shadow",
    "border-radius",
    "transform",
    "transition",
    "flex-direction",
    "flex-wrap",
    "justify-content",
    "align-items",
    "gap",
    "grid-template-columns",
    "grid-template-rows",
    "text-align",
    "text-decoration",
    "visibility",
    "cursor",
    "pointer-events"
  ];
  KEY_CSS_SET = new Set(KEY_CSS_PROPERTIES);
  cdpSessions = new WeakMap;
  initializedPages = new WeakSet;
  modificationHistory = [];
});

// browse/src/sanitize.ts
function stripLoneSurrogates(s) {
  return s.replace(LONE_SURROGATE_HIGH, "�").replace(LONE_SURROGATE_LOW, "�");
}
function sanitizeReplacer(_key, value) {
  return typeof value === "string" ? stripLoneSurrogates(value) : value;
}
function stripLoneSurrogateEscapes(s) {
  return s.replace(LONE_SURROGATE_HIGH_ESCAPE, "\\uFFFD").replace(LONE_SURROGATE_LOW_ESCAPE, "\\uFFFD");
}
function sanitizeBody(body, isJson) {
  return isJson ? stripLoneSurrogateEscapes(stripLoneSurrogates(body)) : stripLoneSurrogates(body);
}
var LONE_SURROGATE_HIGH, LONE_SURROGATE_LOW, LONE_SURROGATE_HIGH_ESCAPE, LONE_SURROGATE_LOW_ESCAPE;
var init_sanitize = __esm(() => {
  LONE_SURROGATE_HIGH = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g;
  LONE_SURROGATE_LOW = /(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
  LONE_SURROGATE_HIGH_ESCAPE = /\\u[Dd][89ABab][0-9A-Fa-f]{2}(?!\\u[Dd][C-Fc-f][0-9A-Fa-f]{2})/g;
  LONE_SURROGATE_LOW_ESCAPE = /(?<!\\u[Dd][89ABab][0-9A-Fa-f]{2})\\u[Dd][C-Fc-f][0-9A-Fa-f]{2}/g;
});

// browse/src/network-capture.ts
import * as fs11 from "fs";

class SizeCappedBuffer {
  entries = [];
  totalSize = 0;
  maxSize;
  constructor(maxSize = MAX_BUFFER_SIZE) {
    this.maxSize = maxSize;
  }
  push(entry) {
    while (this.entries.length > 0 && this.totalSize + entry.size > this.maxSize) {
      const evicted = this.entries.shift();
      this.totalSize -= evicted.size;
    }
    this.entries.push(entry);
    this.totalSize += entry.size;
  }
  toArray() {
    return [...this.entries];
  }
  get length() {
    return this.entries.length;
  }
  get byteSize() {
    return this.totalSize;
  }
  clear() {
    this.entries = [];
    this.totalSize = 0;
  }
  exportToFile(filePath) {
    const lines = this.entries.map((e) => JSON.stringify(e));
    fs11.writeFileSync(filePath, lines.join(`
`) + `
`);
    return this.entries.length;
  }
  summary() {
    if (this.entries.length === 0)
      return "No captured responses.";
    const lines = this.entries.map((e, i) => `  [${i + 1}] ${e.status} ${e.url.slice(0, 100)} (${Math.round(e.size / 1024)}KB${e.bodyTruncated ? ", truncated" : ""})`);
    return `${this.entries.length} responses (${Math.round(this.totalSize / 1024)}KB total):
${lines.join(`
`)}`;
  }
}
function isCaptureActive() {
  return captureActive;
}
function getCaptureBuffer() {
  return captureBuffer;
}
function createResponseListener(filter) {
  return async (response) => {
    const url = response.url();
    if (filter && !filter.test(url))
      return;
    const status = response.status();
    if (status === 204 || status === 301 || status === 302 || status === 304)
      return;
    const contentType = response.headers()["content-type"] || "";
    let body = "";
    let bodySize = 0;
    let truncated = false;
    try {
      const rawBody = await response.body();
      bodySize = rawBody.length;
      if (bodySize > MAX_ENTRY_SIZE) {
        truncated = true;
        body = "";
      } else if (contentType.includes("json") || contentType.includes("text") || contentType.includes("xml") || contentType.includes("html")) {
        body = rawBody.toString("utf-8");
      } else {
        body = rawBody.toString("base64");
      }
    } catch {
      body = "";
      truncated = true;
    }
    const entry = {
      url,
      status,
      headers: response.headers(),
      body,
      contentType,
      timestamp: Date.now(),
      size: bodySize,
      bodyTruncated: truncated
    };
    captureBuffer.push(entry);
  };
}
function startCapture(filterPattern) {
  captureFilter = filterPattern ? new RegExp(filterPattern) : null;
  captureActive = true;
  captureListener = createResponseListener(captureFilter);
  return { filter: filterPattern || null };
}
function getCaptureListener() {
  return captureListener;
}
function stopCapture() {
  captureActive = false;
  captureListener = null;
  return {
    count: captureBuffer.length,
    sizeKB: Math.round(captureBuffer.byteSize / 1024)
  };
}
function exportCapture(filePath) {
  return captureBuffer.exportToFile(filePath);
}
var MAX_BUFFER_SIZE, MAX_ENTRY_SIZE, captureBuffer, captureActive = false, captureFilter = null, captureListener = null;
var init_network_capture = __esm(() => {
  MAX_BUFFER_SIZE = 50 * 1024 * 1024;
  MAX_ENTRY_SIZE = 5 * 1024 * 1024;
  captureBuffer = new SizeCappedBuffer;
});

// browse/src/media-extract.ts
async function extractMedia(target, options) {
  const result = await target.evaluate(({ scopeSelector, filter }) => {
    const root = scopeSelector ? document.querySelector(scopeSelector) || document : document;
    const images = [];
    const videos = [];
    const audio = [];
    const backgroundImages = [];
    if (!filter || filter === "images") {
      const imgs = root.querySelectorAll("img");
      imgs.forEach((img, i) => {
        const rect = img.getBoundingClientRect();
        images.push({
          index: i,
          src: img.src || "",
          srcset: img.srcset || "",
          currentSrc: img.currentSrc || "",
          alt: img.alt || "",
          width: img.width,
          height: img.height,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          loading: img.loading || "",
          dataSrc: img.getAttribute("data-src") || img.getAttribute("data-lazy-src") || img.getAttribute("data-original") || "",
          visible: rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0
        });
      });
    }
    if (!filter || filter === "videos") {
      const vids = root.querySelectorAll("video");
      vids.forEach((vid, i) => {
        const sources = Array.from(vid.querySelectorAll("source")).map((s) => ({
          src: s.src || "",
          type: s.type || ""
        }));
        const isHLS = sources.some((s) => s.type.includes("mpegURL") || s.src.includes(".m3u8"));
        const isDASH = sources.some((s) => s.type.includes("dash") || s.src.includes(".mpd"));
        videos.push({
          index: i,
          src: vid.src || "",
          currentSrc: vid.currentSrc || "",
          poster: vid.poster || "",
          width: vid.videoWidth || vid.width,
          height: vid.videoHeight || vid.height,
          duration: isFinite(vid.duration) ? vid.duration : 0,
          type: sources[0]?.type || "",
          sources,
          isHLS,
          isDASH
        });
      });
    }
    if (!filter || filter === "audio") {
      const auds = root.querySelectorAll("audio");
      auds.forEach((aud, i) => {
        const source = aud.querySelector("source");
        audio.push({
          index: i,
          src: aud.src || source?.src || "",
          currentSrc: aud.currentSrc || "",
          duration: isFinite(aud.duration) ? aud.duration : 0,
          type: source?.type || ""
        });
      });
    }
    if (!filter || filter === "images") {
      const allElements = root.querySelectorAll("*");
      let bgCount = 0;
      for (let i = 0;i < allElements.length && bgCount < 500; i++) {
        const el = allElements[i];
        const bg = getComputedStyle(el).backgroundImage;
        if (bg && bg !== "none") {
          const urlMatch = bg.match(/url\(["']?([^"')]+)["']?\)/);
          if (urlMatch && urlMatch[1] && !urlMatch[1].startsWith("data:")) {
            backgroundImages.push({
              index: bgCount,
              url: urlMatch[1],
              selector: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : "") + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : ""),
              element: el.tagName.toLowerCase()
            });
            bgCount++;
          }
        }
      }
    }
    return { images, videos, audio, backgroundImages };
  }, { scopeSelector: options?.selector || null, filter: options?.filter || null });
  return {
    ...result,
    total: result.images.length + result.videos.length + result.audio.length + result.backgroundImages.length
  };
}

// browse/src/read-commands.ts
import * as fs12 from "fs";
import * as path9 from "path";
function hasAwait(code) {
  const stripped = code.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  return /\bawait\b/.test(stripped);
}
function findBalancedClose(src, start) {
  const open = src[start];
  const close = open === "(" ? ")" : "]";
  let depth = 0;
  let inString = null;
  let escape = false;
  for (let i = start;i < src.length; i++) {
    const char = src[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === "\\" && inString) {
      escape = true;
      continue;
    }
    if (inString) {
      if (char === inString)
        inString = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      inString = char;
      continue;
    }
    if (char === open) {
      depth++;
    } else if (char === close) {
      depth--;
      if (depth === 0)
        return i;
    }
  }
  return -1;
}
function isSingleParenOrIifeExpression(code) {
  const trimmed = code.trim().replace(/;+\s*$/, "");
  let src = trimmed;
  if (src.startsWith("await ") || src.startsWith("await\t") || src.startsWith(`await
`)) {
    src = src.slice(5).trim();
  }
  if (!src.startsWith("("))
    return false;
  const mainCloseIndex = findBalancedClose(src, 0);
  if (mainCloseIndex === -1)
    return false;
  let i = mainCloseIndex + 1;
  while (i < src.length) {
    const ch = src[i];
    if (ch === " " || ch === "\t" || ch === `
` || ch === "\r") {
      i++;
      continue;
    }
    if (ch === "(" || ch === "[") {
      const close = findBalancedClose(src, i);
      if (close === -1)
        return false;
      i = close + 1;
      continue;
    }
    if (ch === "." || ch === "?" && src[i + 1] === ".") {
      i += ch === "." ? 1 : 2;
      while (i < src.length && /[\w$]/.test(src[i]))
        i++;
      continue;
    }
    return false;
  }
  return true;
}
function needsBlockWrapper(code) {
  const trimmed = code.trim();
  if (isSingleParenOrIifeExpression(trimmed))
    return false;
  const clean = trimmed.replace(/;+\s*$/, "");
  if (clean.split(`
`).length > 1)
    return true;
  if (/\b(const|let|var|function|class|return|throw|if|for|while|switch|try)\b/.test(clean))
    return true;
  if (clean.includes(";"))
    return true;
  return false;
}
function wrapForEvaluate(code) {
  if (!hasAwait(code))
    return code;
  const trimmed = code.trim();
  const cleanExpr = trimmed.replace(/;+\s*$/, "");
  return needsBlockWrapper(trimmed) ? `(async()=>{
${code}
})()` : `(async()=>(${cleanExpr}))()`;
}
function parseOutArgs(args) {
  let outPath;
  let raw = false;
  const rest = [];
  for (let i = 0;i < args.length; i++) {
    const a = args[i];
    if (a === "--out") {
      if (outPath !== undefined)
        throw new Error("--out specified more than once");
      const val = args[i + 1];
      if (val === undefined || val.startsWith("--"))
        throw new Error("--out requires a file path");
      outPath = val;
      i++;
    } else if (a.startsWith("--out=")) {
      if (outPath !== undefined)
        throw new Error("--out specified more than once");
      const val = a.slice("--out=".length);
      if (val === "")
        throw new Error("--out requires a file path");
      outPath = val;
    } else if (a === "--raw") {
      raw = true;
    } else if (a.startsWith("--raw=")) {
      const v = a.slice("--raw=".length).toLowerCase();
      if (v !== "true" && v !== "false")
        throw new Error("--raw must be true or false");
      raw = v === "true";
    } else {
      rest.push(a);
    }
  }
  return { outPath, raw, rest };
}
function hasOutArg(args) {
  return args.some((a) => a === "--out" || a.startsWith("--out="));
}
function resultToString(result) {
  return typeof result === "object" ? JSON.stringify(result, null, 2) : String(result ?? "");
}
function writeEvalResult(outPath, str, opts) {
  validateOutputPath(outPath);
  fs12.mkdirSync(path9.dirname(path9.resolve(outPath)), { recursive: true });
  if (!opts.raw && str.startsWith("data:")) {
    const comma = str.indexOf(",");
    if (comma !== -1) {
      const header = str.slice("data:".length, comma);
      const tokens = header.split(";").map((t) => t.trim().toLowerCase());
      if (tokens.includes("base64")) {
        const payload = str.slice(comma + 1).replace(/\s+/g, "");
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(payload)) {
          throw new Error("--out: malformed base64 in data URL (decode would corrupt output)");
        }
        const buf = Buffer.from(payload, "base64");
        fs12.writeFileSync(outPath, buf);
        return buf.length;
      }
    }
  }
  const buf = Buffer.from(stripLoneSurrogates(str), "utf-8");
  fs12.writeFileSync(outPath, buf);
  return buf.length;
}
async function getCleanText(page) {
  const raw = await page.evaluate(() => {
    const body = document.body;
    if (!body)
      return "";
    const clone = body.cloneNode(true);
    clone.querySelectorAll("script, style, noscript, svg").forEach((el) => el.remove());
    return clone.innerText.split(`
`).map((line) => line.trim()).filter((line) => line.length > 0).join(`
`);
  });
  return stripLoneSurrogates(raw);
}
function assertJsOriginAllowed(bm, pageUrl) {
  if (!bm.hasCookieImports())
    return;
  let hostname;
  try {
    hostname = new URL(pageUrl).hostname;
  } catch {
    return;
  }
  const importedDomains = bm.getCookieImportedDomains();
  const allowed = [...importedDomains].some((domain) => {
    const normalized = domain.startsWith(".") ? domain : "." + domain;
    return hostname === domain.replace(/^\./, "") || hostname.endsWith(normalized);
  });
  if (!allowed) {
    throw new Error(`JS execution blocked: current page (${hostname}) does not match any cookie-imported domain. ` + `Imported cookies for: ${[...importedDomains].join(", ")}. ` + `This prevents cross-origin cookie exfiltration. Navigate to an imported domain or run without imported cookies.`);
  }
}
async function handleReadCommand(command, args, session, bm) {
  const page = session.getPage();
  const target = session.getActiveFrameOrPage();
  switch (command) {
    case "text": {
      return getCleanText(target);
    }
    case "html": {
      const selector = args[0];
      if (selector) {
        const resolved = await session.resolveRef(selector);
        if ("locator" in resolved) {
          return stripLoneSurrogates(await resolved.locator.innerHTML({ timeout: 5000 }));
        }
        return stripLoneSurrogates(await target.locator(resolved.selector).innerHTML({ timeout: 5000 }));
      }
      const doctype = await target.evaluate(() => {
        const dt = document.doctype;
        return dt ? `<!DOCTYPE ${dt.name}>` : "";
      });
      const html = await target.evaluate(() => document.documentElement.outerHTML);
      return stripLoneSurrogates(doctype ? `${doctype}
${html}` : html);
    }
    case "links": {
      const links = await target.evaluate(() => [...document.querySelectorAll("a[href]")].map((a) => ({
        text: a.textContent?.trim().slice(0, 120) || "",
        href: a.href
      })).filter((l) => l.text && l.href));
      return links.map((l) => `${l.text} → ${l.href}`).join(`
`);
    }
    case "forms": {
      const forms = await target.evaluate(() => {
        return [...document.querySelectorAll("form")].map((form, i) => {
          const fields = [...form.querySelectorAll("input, select, textarea")].map((el) => {
            const input = el;
            return {
              tag: el.tagName.toLowerCase(),
              type: input.type || undefined,
              name: input.name || undefined,
              id: input.id || undefined,
              placeholder: input.placeholder || undefined,
              required: input.required || undefined,
              value: input.type === "password" || input.name && /(^|[_.-])(token|secret|key|password|credential|auth|jwt|session|csrf|sid)($|[_.-])|api.?key/i.test(input.name) || input.id && /(^|[_.-])(token|secret|key|password|credential|auth|jwt|session|csrf|sid)($|[_.-])|api.?key/i.test(input.id) ? "[redacted]" : input.value || undefined,
              options: el.tagName === "SELECT" ? [...el.options].map((o) => ({ value: o.value, text: o.text })) : undefined
            };
          });
          return {
            index: i,
            action: form.action || undefined,
            method: form.method || "get",
            id: form.id || undefined,
            fields
          };
        });
      });
      return JSON.stringify(forms, null, 2);
    }
    case "accessibility": {
      const snapshot = await target.locator("body").ariaSnapshot();
      return stripLoneSurrogates(snapshot);
    }
    case "js": {
      const { outPath, raw, rest } = parseOutArgs(args);
      const expr = rest[0];
      if (!expr)
        throw new Error("Usage: browse js <expression> [--out <file>] [--raw]");
      assertJsOriginAllowed(bm, page.url());
      const wrapped = wrapForEvaluate(expr);
      const result = await target.evaluate(wrapped);
      const str = resultToString(result);
      if (outPath) {
        const n = writeEvalResult(outPath, str, { raw });
        return `JS result written: ${outPath} (${n} bytes)`;
      }
      return str;
    }
    case "eval": {
      const { outPath, raw, rest } = parseOutArgs(args);
      const filePath = rest[0];
      if (!filePath)
        throw new Error("Usage: browse eval <js-file> [--out <file>] [--raw]");
      assertJsOriginAllowed(bm, page.url());
      validateReadPath(filePath);
      if (!fs12.existsSync(filePath))
        throw new Error(`File not found: ${filePath}`);
      const code = fs12.readFileSync(filePath, "utf-8");
      const wrapped = wrapForEvaluate(code);
      const result = await target.evaluate(wrapped);
      const str = resultToString(result);
      if (outPath) {
        const n = writeEvalResult(outPath, str, { raw });
        return `Eval result written: ${outPath} (${n} bytes)`;
      }
      return str;
    }
    case "css": {
      const [selector, property] = args;
      if (!selector || !property)
        throw new Error("Usage: browse css <selector> <property>");
      const resolved = await session.resolveRef(selector);
      if ("locator" in resolved) {
        const value = await resolved.locator.evaluate((el, prop) => getComputedStyle(el).getPropertyValue(prop), property);
        return value;
      }
      const value = await target.evaluate(([sel, prop]) => {
        const el = document.querySelector(sel);
        if (!el)
          return `Element not found: ${sel}`;
        return getComputedStyle(el).getPropertyValue(prop);
      }, [resolved.selector, property]);
      return value;
    }
    case "attrs": {
      const selector = args[0];
      if (!selector)
        throw new Error("Usage: browse attrs <selector>");
      const resolved = await session.resolveRef(selector);
      if ("locator" in resolved) {
        const attrs = await resolved.locator.evaluate((el) => {
          const result = {};
          for (const attr of el.attributes) {
            result[attr.name] = attr.value;
          }
          return result;
        });
        return JSON.stringify(attrs, null, 2);
      }
      const attrs = await target.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el)
          return `Element not found: ${sel}`;
        const result = {};
        for (const attr of el.attributes) {
          result[attr.name] = attr.value;
        }
        return result;
      }, resolved.selector);
      return typeof attrs === "string" ? attrs : JSON.stringify(attrs, null, 2);
    }
    case "console": {
      if (args[0] === "--clear") {
        consoleBuffer.clear();
        return "Console buffer cleared.";
      }
      const entries = args[0] === "--errors" ? consoleBuffer.toArray().filter((e) => e.level === "error" || e.level === "warning") : consoleBuffer.toArray();
      if (entries.length === 0)
        return args[0] === "--errors" ? "(no console errors)" : "(no console messages)";
      return entries.map((e) => `[${new Date(e.timestamp).toISOString()}] [${e.level}] ${e.text}`).join(`
`);
    }
    case "network": {
      if (args[0] === "--clear") {
        networkBuffer.clear();
        return "Network buffer cleared.";
      }
      if (args[0] === "--capture") {
        await Promise.resolve().then(() => init_network_capture());
        if (args[1] === "stop") {
          const page = bm.getPage();
          const listener = getCaptureListener();
          if (listener)
            page.removeListener("response", listener);
          const result = stopCapture();
          return `Network capture stopped. ${result.count} responses captured (${result.sizeKB}KB).`;
        }
        if (isCaptureActive())
          return "Capture already active. Use --capture stop first.";
        const filterIdx = args.indexOf("--filter");
        const filterPattern = filterIdx >= 0 ? args[filterIdx + 1] : undefined;
        const info = startCapture(filterPattern);
        const page = bm.getPage();
        const listener = getCaptureListener();
        if (listener)
          page.on("response", listener);
        return `Network capture started${info.filter ? ` (filter: ${info.filter})` : ""}. Use --capture stop to stop.`;
      }
      if (args[0] === "--export") {
        await Promise.resolve().then(() => init_network_capture());
        await Promise.resolve().then(() => init_path_security());
        const exportPath = args[1];
        if (!exportPath)
          throw new Error("Usage: network --export <path>");
        validateOutputPath(exportPath);
        const count = exportCapture(exportPath);
        return `Exported ${count} captured responses to ${exportPath}`;
      }
      if (args[0] === "--bodies") {
        await Promise.resolve().then(() => init_network_capture());
        return getCaptureBuffer().summary();
      }
      if (networkBuffer.length === 0)
        return "(no network requests)";
      return networkBuffer.toArray().map((e) => `${e.method} ${e.url} → ${e.status || "pending"} (${e.duration || "?"}ms, ${e.size || "?"}B)`).join(`
`);
    }
    case "dialog": {
      if (args[0] === "--clear") {
        dialogBuffer.clear();
        return "Dialog buffer cleared.";
      }
      if (dialogBuffer.length === 0)
        return "(no dialogs captured)";
      return dialogBuffer.toArray().map((e) => `[${new Date(e.timestamp).toISOString()}] [${e.type}] "${e.message}" → ${e.action}${e.response ? ` "${e.response}"` : ""}`).join(`
`);
    }
    case "is": {
      const property = args[0];
      const selector = args[1];
      if (!property || !selector)
        throw new Error(`Usage: browse is <property> <selector>
Properties: visible, hidden, enabled, disabled, checked, editable, focused`);
      const resolved = await session.resolveRef(selector);
      let locator;
      if ("locator" in resolved) {
        locator = resolved.locator;
      } else {
        locator = target.locator(resolved.selector);
      }
      switch (property) {
        case "visible":
          return String(await locator.isVisible());
        case "hidden":
          return String(await locator.isHidden());
        case "enabled":
          return String(await locator.isEnabled());
        case "disabled":
          return String(await locator.isDisabled());
        case "checked":
          return String(await locator.isChecked());
        case "editable":
          return String(await locator.isEditable());
        case "focused": {
          const isFocused = await locator.evaluate((el) => el === document.activeElement);
          return String(isFocused);
        }
        default:
          throw new Error(`Unknown property: ${property}. Use: visible, hidden, enabled, disabled, checked, editable, focused`);
      }
    }
    case "cookies": {
      const cookies = await page.context().cookies();
      const redacted = cookies.map((c) => {
        if (SENSITIVE_COOKIE_NAME.test(c.name) || SENSITIVE_COOKIE_VALUE.test(c.value)) {
          return { ...c, value: `[REDACTED — ${c.value.length} chars]` };
        }
        return c;
      });
      return JSON.stringify(redacted, null, 2);
    }
    case "storage": {
      if (args[0] === "set" && args[1]) {
        const key = args[1];
        const value = args[2] || "";
        await target.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
        return `Set localStorage["${key}"]`;
      }
      const storage = await target.evaluate(() => ({
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage }
      }));
      const SENSITIVE_KEY = /(^|[_.-])(token|secret|key|password|credential|auth|jwt|session|csrf)($|[_.-])|api.?key/i;
      const SENSITIVE_VALUE = /^(eyJ|sk-|sk_live_|sk_test_|pk_live_|pk_test_|rk_live_|sk-ant-|ghp_|gho_|github_pat_|xox[bpsa]-|AKIA[A-Z0-9]{16}|AIza|SG\.|Bearer\s|sbp_)/;
      const redacted = JSON.parse(JSON.stringify(storage));
      for (const storeType of ["localStorage", "sessionStorage"]) {
        const store = redacted[storeType];
        if (!store)
          continue;
        for (const [key, value] of Object.entries(store)) {
          if (typeof value !== "string")
            continue;
          if (SENSITIVE_KEY.test(key) || SENSITIVE_VALUE.test(value)) {
            store[key] = `[REDACTED — ${value.length} chars]`;
          }
        }
      }
      return JSON.stringify(redacted, null, 2);
    }
    case "perf": {
      const timings = await page.evaluate(() => {
        const nav = performance.getEntriesByType("navigation")[0];
        if (!nav)
          return "No navigation timing data available.";
        return {
          dns: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
          tcp: Math.round(nav.connectEnd - nav.connectStart),
          ssl: Math.round(nav.secureConnectionStart > 0 ? nav.connectEnd - nav.secureConnectionStart : 0),
          ttfb: Math.round(nav.responseStart - nav.requestStart),
          download: Math.round(nav.responseEnd - nav.responseStart),
          domParse: Math.round(nav.domInteractive - nav.responseEnd),
          domReady: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
          load: Math.round(nav.loadEventEnd - nav.startTime),
          total: Math.round(nav.loadEventEnd - nav.startTime)
        };
      });
      if (typeof timings === "string")
        return timings;
      return Object.entries(timings).map(([k, v]) => `${k.padEnd(12)} ${v}ms`).join(`
`);
    }
    case "inspect": {
      let includeUA = false;
      let showHistory = false;
      let selector;
      for (const arg of args) {
        if (arg === "--all") {
          includeUA = true;
        } else if (arg === "--history") {
          showHistory = true;
        } else if (!selector) {
          selector = arg;
        }
      }
      if (showHistory) {
        const history = getModificationHistory();
        if (history.length === 0)
          return "(no style modifications)";
        return history.map((m, i) => `[${i}] ${m.selector} { ${m.property}: ${m.oldValue} → ${m.newValue} } (${m.source}, ${m.method})`).join(`
`);
      }
      if (!selector) {
        const stored = bm._inspectorData;
        const storedTs = bm._inspectorTimestamp;
        if (stored) {
          const stale = storedTs && Date.now() - storedTs > 60000;
          let output = formatInspectorResult(stored, { includeUA });
          if (stale)
            output = `⚠ Data may be stale (>60s old)

` + output;
          return output;
        }
        throw new Error(`Usage: browse inspect [selector] [--all] [--history]
Or pick an element in the Chrome sidebar first.`);
      }
      const result = await inspectElement(page, selector, { includeUA });
      bm._inspectorData = result;
      bm._inspectorTimestamp = Date.now();
      return formatInspectorResult(result, { includeUA });
    }
    case "media": {
      await Promise.resolve();
      const target = bm.getActiveFrameOrPage();
      const filter = args.includes("--images") ? "images" : args.includes("--videos") ? "videos" : args.includes("--audio") ? "audio" : undefined;
      const selectorArg = args.find((a) => !a.startsWith("--"));
      const result = await extractMedia(target, { selector: selectorArg, filter });
      return JSON.stringify(result, null, 2);
    }
    case "data": {
      const target = bm.getActiveFrameOrPage();
      const wantJsonLd = args.includes("--jsonld") || args.length === 0;
      const wantOg = args.includes("--og") || args.length === 0;
      const wantTwitter = args.includes("--twitter") || args.length === 0;
      const wantMeta = args.includes("--meta") || args.length === 0;
      const result = await target.evaluate(({ wantJsonLd, wantOg, wantTwitter, wantMeta }) => {
        const data = {};
        if (wantJsonLd) {
          const scripts = document.querySelectorAll('script[type="application/ld+json"]');
          const jsonLd = [];
          scripts.forEach((s) => {
            try {
              jsonLd.push(JSON.parse(s.textContent || ""));
            } catch {}
          });
          data.jsonLd = jsonLd;
        }
        if (wantOg) {
          const og = {};
          document.querySelectorAll('meta[property^="og:"]').forEach((m) => {
            const prop = m.getAttribute("property")?.replace("og:", "") || "";
            og[prop] = m.getAttribute("content") || "";
          });
          data.openGraph = og;
        }
        if (wantTwitter) {
          const tw = {};
          document.querySelectorAll('meta[name^="twitter:"]').forEach((m) => {
            const name = m.getAttribute("name")?.replace("twitter:", "") || "";
            tw[name] = m.getAttribute("content") || "";
          });
          data.twitterCards = tw;
        }
        if (wantMeta) {
          const meta = {};
          const canonical = document.querySelector('link[rel="canonical"]');
          if (canonical)
            meta.canonical = canonical.getAttribute("href") || "";
          const desc = document.querySelector('meta[name="description"]');
          if (desc)
            meta.description = desc.getAttribute("content") || "";
          const keywords = document.querySelector('meta[name="keywords"]');
          if (keywords)
            meta.keywords = keywords.getAttribute("content") || "";
          const author = document.querySelector('meta[name="author"]');
          if (author)
            meta.author = author.getAttribute("content") || "";
          const title = document.querySelector("title");
          if (title)
            meta.title = title.textContent || "";
          data.meta = meta;
        }
        return data;
      }, { wantJsonLd, wantOg, wantTwitter, wantMeta });
      return JSON.stringify(result, null, 2);
    }
    default:
      throw new Error(`Unknown read command: ${command}`);
  }
}
var SENSITIVE_COOKIE_NAME, SENSITIVE_COOKIE_VALUE;
var init_read_commands = __esm(() => {
  init_buffers();
  init_cdp_inspector();
  init_path_security();
  init_sanitize();
  init_path_security();
  SENSITIVE_COOKIE_NAME = /(^|[_.-])(token|secret|key|password|credential|auth|jwt|session|csrf|sid)($|[_.-])|api.?key/i;
  SENSITIVE_COOKIE_VALUE = /^(eyJ|sk-|sk_live_|sk_test_|pk_live_|pk_test_|rk_live_|sk-ant-|ghp_|gho_|github_pat_|xox[bpsa]-|AKIA[A-Z0-9]{16}|AIza|SG\.|Bearer\s|sbp_)/;
});

// browse/src/cookie-database.ts
import { createRequire as createRequire2 } from "node:module";
function databaseError(error) {
  const detail = error;
  const codes = {
    5: "SQLITE_BUSY",
    6: "SQLITE_LOCKED",
    8: "SQLITE_READONLY",
    10: "SQLITE_IOERR",
    11: "SQLITE_CORRUPT",
    14: "SQLITE_CANTOPEN",
    26: "SQLITE_CORRUPT"
  };
  const number = detail?.errcode ?? detail?.errno;
  const code = typeof number === "number" ? codes[number & 255] ?? "SQLITE_ERROR" : Object.values(codes).includes(detail?.code ?? "") ? detail.code : "SQLITE_ERROR";
  const message = code === "SQLITE_BUSY" || code === "SQLITE_LOCKED" ? "Cookie database is locked. Close the source browser and retry." : "Cookie database operation failed (" + code + ").";
  return Object.assign(new Error(message), { code });
}
function openCookieDatabase(dbPath) {
  const isBun = typeof process.versions.bun === "string";
  let Database;
  try {
    const sqlite = require2(isBun ? "bun:sqlite" : "node:sqlite");
    Database = isBun ? sqlite.Database : sqlite.DatabaseSync;
    if (typeof Database !== "function")
      throw new Error;
  } catch {
    throw Object.assign(new Error(isBun ? "Cookie import requires a Bun runtime with SQLite support. Upgrade Bun and retry." : "Cookie import requires Node.js 22.13 or newer with built-in SQLite enabled. Upgrade Node.js or enable SQLite and retry."), { code: "sqlite_unavailable" });
  }
  let database;
  try {
    database = new Database(dbPath, isBun ? { readonly: true, safeIntegers: true } : { readOnly: true });
  } catch (error) {
    throw databaseError(error);
  }
  return {
    query(sql) {
      let statement;
      try {
        statement = isBun ? database.query(sql) : database.prepare(sql);
        if (!isBun)
          statement.setReadBigInts(true);
      } catch (error) {
        throw databaseError(error);
      }
      return {
        all(...bindings) {
          try {
            return statement.all(...bindings).map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [
              key,
              typeof value === "bigint" && Number.isSafeInteger(Number(value)) ? Number(value) : value
            ])));
          } catch (error) {
            throw databaseError(error);
          }
        }
      };
    },
    close() {
      try {
        database.close();
      } catch (error) {
        throw databaseError(error);
      }
    }
  };
}
var require2;
var init_cookie_database = __esm(() => {
  require2 = createRequire2(import.meta.url);
});

// browse/src/bun-child-config.ts
import * as fs13 from "fs";
import * as os7 from "os";
import * as path10 from "path";
function isEmptyRegularFile(file) {
  try {
    const stat = fs13.lstatSync(file);
    return stat.isFile() && stat.size === 0;
  } catch {
    return false;
  }
}
function emptyBunConfig(platform = process.platform) {
  if (platform !== "win32")
    return "/dev/null";
  if (emptyConfig && isEmptyRegularFile(emptyConfig))
    return emptyConfig;
  const dir = fs13.mkdtempSync(path10.join(os7.tmpdir(), "gstack-bunfig-"));
  const file = path10.join(dir, "bunfig.toml");
  fs13.closeSync(fs13.openSync(file, "wx", 384));
  if (!isEmptyRegularFile(file))
    throw new Error(`empty Bun config ${file} is not a zero-byte file`);
  process.once("exit", () => fs13.rmSync(dir, { recursive: true, force: true }));
  emptyConfig = file;
  return file;
}
function findWindowsBunExe(opts = {}) {
  const win = path10.win32;
  const env = opts.env ?? process.env;
  const execPath = opts.execPath ?? process.execPath;
  const isBun = opts.isBun ?? !!process.versions.bun;
  const isFile = opts.isFile ?? ((p) => {
    try {
      return fs13.statSync(p).isFile();
    } catch {
      return false;
    }
  });
  if (isBun && /^bun\.exe$/i.test(win.basename(execPath)))
    return execPath;
  const dirs = (env.PATH || env.Path || "").split(";").filter((d) => d && win.isAbsolute(d));
  const candidates = [
    ...env.BUN_INSTALL ? [win.join(env.BUN_INSTALL, "bin", "bun.exe")] : [],
    ...dirs.flatMap((d) => [
      win.join(d, "bun.exe"),
      ...isFile(win.join(d, "bun.cmd")) ? [win.join(d, "node_modules", "bun", "bin", "bun.exe")] : []
    ]),
    ...env.USERPROFILE ? [win.join(env.USERPROFILE, ".bun", "bin", "bun.exe")] : []
  ];
  return candidates.find(isFile) ?? null;
}
var emptyConfig = null;
var init_bun_child_config = () => {};

// browse/src/cookie-import-native-integrity.ts
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import path11 from "node:path";
async function readBoundedFile(file, deadline, maximumBytes) {
  if (!Number.isFinite(deadline) || Date.now() >= deadline)
    throw new Error("native_timeout");
  const cancellation = new AbortController;
  const timer = setTimeout(() => cancellation.abort(), Math.max(0, deadline - Date.now()));
  const stream = createReadStream(file, { signal: cancellation.signal });
  const chunks = [];
  let size = 0;
  try {
    for await (const chunk of stream) {
      size += chunk.length;
      if (size > maximumBytes)
        throw new Error("native_unqualified");
      chunks.push(chunk);
    }
    if (Date.now() >= deadline)
      throw new Error("native_timeout");
    return Buffer.concat(chunks);
  } catch (error) {
    if (cancellation.signal.aborted)
      throw new Error("native_timeout");
    throw error;
  } finally {
    stream.destroy();
    clearTimeout(timer);
  }
}
async function readNativeQualifications(root, deadline) {
  const builds = JSON.parse((await readBoundedFile(path11.join(root, NATIVE_QUALIFICATION_DATA), deadline, 1024 * 1024)).toString("utf8"));
  if (!Array.isArray(builds) || builds.some((build) => !build || typeof build !== "object"))
    throw new Error("native_unqualified");
  return builds;
}
async function hashNativeFile(file, deadline) {
  return createHash("sha256").update(await readBoundedFile(file, deadline, 64 * 1024 * 1024)).digest("hex");
}
async function nativeCodeHashes(root, deadline) {
  const hashes = {};
  for (const file of NATIVE_CODE_INPUTS)
    hashes[file] = await hashNativeFile(path11.join(root, file), deadline);
  return hashes;
}
function nativeCodeMatches(expected, actual) {
  if (!expected || typeof expected !== "object" || Array.isArray(expected) || Object.keys(expected).length !== NATIVE_CODE_INPUTS.length)
    return false;
  return NATIVE_CODE_INPUTS.every((file) => {
    const hash = expected[file];
    return typeof hash === "string" && /^[0-9a-f]{64}$/.test(hash) && hash === actual[file];
  });
}
var NATIVE_QUALIFICATION_DATA = "browse/src/cookie-import-native-qualification.json", NATIVE_CODE_INPUTS;
var init_cookie_import_native_integrity = __esm(() => {
  NATIVE_CODE_INPUTS = Object.freeze([
    "browse/src/cookie-import-browser.ts",
    "browse/src/cookie-database.ts",
    "browse/src/cookie-import-native.ts",
    "browse/src/cookie-import-native-integrity.ts",
    "browse/src/cookie-import-native-job.ts",
    "browse/src/cookie-import-native-worker.ts",
    "browse/src/bun-child-config.ts",
    "browse/src/bun-polyfill.cjs",
    "browse/scripts/build-node-server.sh",
    ".github/scripts/run-cookie-native-qualification.ps1",
    "browse/dist/server-node.mjs",
    "browse/dist/bun-polyfill.cjs",
    "browse/test/cookie-import-native.test.ts",
    "browse/test/cookie-import-native-job.test.ts",
    "browse/test/cookie-import-native-qualification.ts",
    "browse/test/fixtures/native-cookie-process.cjs",
    "browse/test/fixtures/native-cookie-launch.cjs",
    "browse/test/fixtures/native-cookie-process-observer.ts",
    "browse/test/fixtures/native-cookie-file-owners.ts",
    "browse/test/fixtures/native-cookie-remove-fixture.cjs",
    "node_modules/playwright/package.json",
    "node_modules/playwright/index.js",
    "node_modules/playwright-core/package.json",
    "node_modules/playwright-core/index.js",
    "node_modules/playwright-core/lib/bootstrap.js",
    "node_modules/playwright-core/lib/coreBundle.js",
    "node_modules/playwright-core/lib/utilsBundle.js"
  ]);
});

// browse/src/cookie-import-native.ts
import { spawn as spawn2 } from "node:child_process";
import { realpathSync as realpathSync3, statSync as statSync4 } from "node:fs";
import { createRequire as createRequire3 } from "node:module";
import { release } from "node:os";
import path12 from "node:path";
function nativeBrowserPaths(browserName, env) {
  const get = (key) => Object.entries(env).find(([name]) => name.toLowerCase() === key.toLowerCase())?.[1];
  const local = get("LOCALAPPDATA");
  if (!local || !path12.win32.isAbsolute(local)) {
    throw new CookieImportError("The Windows browser data location is unavailable. Sign in manually in the gstack browser.", "native_profile_unsupported");
  }
  const pf = get("PROGRAMFILES") || "C:\\Program Files";
  const pf86 = get("PROGRAMFILES(X86)") || "C:\\Program Files (x86)";
  const mappings = {
    chrome: { name: "Chrome", root: ["Google", "Chrome"], exe: "chrome.exe", installs: [pf, pf86, local] },
    chromium: { name: "Chromium", root: ["Chromium"], exe: "chrome.exe", installs: [local] },
    brave: { name: "Brave", root: ["BraveSoftware", "Brave-Browser"], exe: "brave.exe", installs: [pf, pf86, local] },
    edge: { name: "Edge", root: ["Microsoft", "Edge"], exe: "msedge.exe", installs: [pf86, pf, local] }
  };
  const key = browserName.toLowerCase();
  if (!Object.hasOwn(mappings, key)) {
    throw new CookieImportError("This browser has no supported Windows native-cookie mapping. Sign in manually in the gstack browser.", "not_supported");
  }
  const browser = mappings[key];
  return {
    name: browser.name,
    userDataDir: path12.win32.join(local, ...browser.root, "User Data"),
    executables: [...new Set(browser.installs.map((root) => path12.win32.join(root, ...browser.root, "Application", browser.exe)))]
  };
}
async function importNativeCookies(options) {
  let domains;
  try {
    if (!Array.isArray(options.domains))
      throw new Error;
    domains = [...new Set(options.domains.map(normalizeCookieDomain))];
  } catch {
    throw new CookieImportError("Native cookie import needs explicit valid domain selections.", "invalid_domain");
  }
  if (!domains.length)
    return [];
  if (process.platform !== "win32" || process.versions.bun) {
    throw new CookieImportError("Native cookie import requires the Windows Node server. Sign in manually in the gstack browser.", "not_supported");
  }
  if (!/^(Default|Profile [0-9]+)$/.test(options.profile)) {
    throw new CookieImportError("Select an existing browser profile before importing cookies.", "invalid_profile");
  }
  const browser = nativeBrowserPaths(options.browserName, process.env);
  if (path12.win32.resolve(options.userDataDir).toLowerCase() !== path12.win32.resolve(browser.userDataDir).toLowerCase()) {
    throw new CookieImportError("Native cookie import cannot substitute or copy the selected browser profile. Sign in manually in the gstack browser.", "native_profile_unsupported");
  }
  if (browser.name === "Chrome") {
    throw new CookieImportError("Chrome 136 and later block remote debugging of the default user-data directory, including every profile inside it, over both pipe and TCP. Default-directory extraction is unavailable; sign in manually in the gstack browser.", "native_profile_unsupported");
  }
  const deadline = Date.now() + 25000;
  let qualified;
  try {
    const root = path12.resolve(__browseNodeSrcDir, "../..");
    const builds = await readNativeQualifications(root, deadline);
    qualified = builds.filter((build) => build.browserName === browser.name && build.nodeVersion === process.version && build.architecture === process.arch && build.windowsRelease === release());
    if (qualified.length) {
      const hashes = await nativeCodeHashes(root, deadline);
      qualified = qualified.filter((build) => nativeCodeMatches(build.sourceHashes, hashes));
    }
  } catch (error) {
    throw new CookieImportError("The native-cookie qualification inputs could not be verified. Sign in manually in the gstack browser.", error instanceof Error && error.message === "native_timeout" ? "native_timeout" : "native_unqualified");
  }
  if (!qualified.length) {
    throw new CookieImportError("Windows native cookie extraction is disabled until this browser and runtime pass native process-ownership and forced-cleanup qualification. Sign in manually in the gstack browser.", "native_unqualified");
  }
  const executablePath = browser.executables.find((candidate) => {
    try {
      return statSync4(candidate).isFile();
    } catch {
      return false;
    }
  });
  if (!executablePath)
    throw new CookieImportError("The selected browser executable is not installed.", "not_installed");
  try {
    const profilePath = path12.join(options.userDataDir, options.profile);
    if (realpathSync3(options.userDataDir).toLowerCase() !== path12.win32.resolve(options.userDataDir).toLowerCase() || realpathSync3(profilePath).toLowerCase() !== path12.win32.resolve(profilePath).toLowerCase() || !statSync4(profilePath).isDirectory()) {
      throw new Error("invalid_profile");
    }
  } catch {
    throw new CookieImportError("The selected source profile is unavailable or redirects to another location.", "native_profile_unsupported");
  }
  const require2 = createRequire3(import.meta.url);
  let playwrightVersion;
  let playwrightEntry;
  let executableSha256;
  try {
    playwrightVersion = require2("playwright/package.json").version;
    playwrightEntry = require2.resolve("playwright");
    executableSha256 = await hashNativeFile(executablePath, deadline);
  } catch (error) {
    throw new CookieImportError("The native browser build could not be checked safely. Sign in manually in the gstack browser.", error instanceof Error && error.message === "native_timeout" ? "native_timeout" : "native_unqualified");
  }
  const bunExecutable = findWindowsBunExe();
  if (!bunExecutable || !qualified.some((build) => build.executableSha256 === executableSha256 && build.playwrightVersion === playwrightVersion)) {
    throw new CookieImportError("This browser build or supervisor runtime has not passed native qualification. Sign in manually in the gstack browser.", "native_unqualified");
  }
  if (Date.now() >= deadline)
    throw new CookieImportError("Native cookie import exceeded its operation deadline.", "native_timeout");
  const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => /^(systemroot|windir|temp|tmp|userprofile|localappdata|appdata|programfiles|programfiles\(x86\)|programdata|path|pathext)$/i.test(key) && typeof value === "string"));
  const worker = spawn2(bunExecutable, ["--no-env-file", "--no-install", "--no-macros", `--config=${emptyBunConfig()}`, path12.join(__browseNodeSrcDir, "cookie-import-native-worker.ts")], {
    env,
    stdio: ["pipe", "pipe", "ignore"],
    windowsHide: true
  });
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => {
      worker.kill();
      reject(new CookieImportError("Native cookie cleanup could not be confirmed within its deadline.", "native_cleanup_failed"));
    }, Math.max(0, deadline + 5000 - Date.now()));
    worker.stdout.setEncoding("utf8");
    worker.stdout.on("data", (chunk) => {
      output += chunk;
      if (Buffer.byteLength(output) > 8 * 1024 * 1024)
        worker.kill();
    });
    worker.once("error", () => {
      clearTimeout(timer);
      reject(new CookieImportError("Native cookie supervision could not start.", "native_supervision_failed"));
    });
    worker.once("close", () => {
      clearTimeout(timer);
      try {
        const result = JSON.parse(output);
        if (Array.isArray(result.cookies))
          resolve(result.cookies);
        else
          reject(new CookieImportError("Native cookie import did not complete. Sign in manually in the gstack browser.", ["native_timeout", "native_failed", "native_cleanup_failed", "native_supervision_failed", "browser_running", "native_profile_unsupported"].includes(result.error) ? result.error : "native_failed"));
      } catch {
        reject(new CookieImportError("Native cookie supervision did not return a complete result.", "native_failed"));
      }
    });
    worker.stdin.on("error", () => {});
    worker.stdin.write(JSON.stringify({
      nodeExecutable: process.execPath,
      nodeArchitecture: process.arch,
      playwrightEntry,
      executablePath,
      userDataDir: options.userDataDir,
      profile: options.profile,
      domains,
      deadline,
      qualifiedBunVersions: qualified.filter((build) => build.executableSha256 === executableSha256 && build.playwrightVersion === playwrightVersion).map((build) => build.bunVersion)
    }) + `
`);
  });
}
var init_cookie_import_native = __esm(() => {
  init_cookie_import_browser();
  init_bun_child_config();
  init_cookie_import_native_integrity();
});

// browse/src/cookie-import-browser.ts
import * as crypto2 from "crypto";
import * as fs14 from "fs";
import * as path13 from "path";
import * as os8 from "os";
import { isIP } from "node:net";
function findInstalledBrowsers() {
  return BROWSER_REGISTRY.filter((browser) => {
    if (findBrowserMatch(browser, "Default") !== null)
      return true;
    for (const platform of getSearchPlatforms()) {
      const dataDir = getDataDirForPlatform(browser, platform);
      if (!dataDir)
        continue;
      const browserDir = path13.join(getBaseDir(platform, browser), dataDir);
      try {
        const entries = fs14.readdirSync(browserDir, { withFileTypes: true });
        if (entries.some((e) => {
          if (!e.isDirectory() || !e.name.startsWith("Profile "))
            return false;
          return profileCookieCandidates(platform, path13.join(browserDir, e.name)).some((candidate) => fs14.existsSync(candidate));
        }))
          return true;
      } catch {}
    }
    return false;
  });
}
function listSupportedBrowserNames() {
  const hostPlatform = getHostPlatform();
  return BROWSER_REGISTRY.filter((browser) => hostPlatform ? getDataDirForPlatform(browser, hostPlatform) !== null : true).map((browser) => browser.name);
}
function listProfiles(browserName) {
  const browser = resolveBrowserInfo(browserName);
  const profiles = [];
  for (const platform of getSearchPlatforms()) {
    const dataDir = getDataDirForPlatform(browser, platform);
    if (!dataDir)
      continue;
    const browserDir = path13.join(getBaseDir(platform, browser), dataDir);
    if (!fs14.existsSync(browserDir))
      continue;
    let profileNames = {};
    try {
      profileNames = JSON.parse(fs14.readFileSync(path13.join(browserDir, "Local State"), "utf-8"))?.profile?.info_cache ?? {};
    } catch {}
    let entries;
    try {
      entries = fs14.readdirSync(browserDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory())
        continue;
      if (entry.name !== "Default" && !entry.name.startsWith("Profile "))
        continue;
      if (!profileCookieCandidates(platform, path13.join(browserDir, entry.name)).some((p) => fs14.existsSync(p)))
        continue;
      if (profiles.some((p) => p.name === entry.name))
        continue;
      let displayName = entry.name;
      try {
        const prefsPath = path13.join(browserDir, entry.name, "Preferences");
        if (fs14.existsSync(prefsPath)) {
          const prefs = JSON.parse(fs14.readFileSync(prefsPath, "utf-8"));
          const email = prefs?.account_info?.[0]?.email;
          if (email && typeof email === "string") {
            displayName = email;
          } else {
            const profileName = prefs?.profile?.name;
            if (profileName && typeof profileName === "string") {
              displayName = profileName;
            }
          }
        }
      } catch {}
      const currentName = profileNames?.[entry.name]?.name;
      if (typeof currentName === "string" && currentName.trim())
        displayName = currentName.trim();
      profiles.push({ name: entry.name, displayName });
    }
    if (profiles.length > 0)
      break;
  }
  return profiles.sort((a, b) => a.name === b.name ? 0 : a.name === "Default" ? -1 : b.name === "Default" ? 1 : a.name.localeCompare(b.name, "en", { numeric: true }));
}
function normalizeCookieDomain(domain) {
  if (typeof domain !== "string" || !domain || domain.length > 254 || /[\s\/@?#\\*]/.test(domain)) {
    throw new CookieImportError("Invalid cookie domain", "bad_request");
  }
  let host = domain.replace(/^\./, "").replace(/\.$/, "");
  if (isIP(host) === 6)
    host = "[" + host + "]";
  try {
    if (host.includes(":") && (!host.startsWith("[") || !host.endsWith("]") || isIP(host.slice(1, -1)) !== 6))
      throw new Error;
    const url = new URL("http://" + host);
    if (!url.hostname || url.hostname.length > 253 || url.port || url.pathname !== "/" || url.hostname.split(".").some((label) => !label))
      throw new Error;
    return url.hostname;
  } catch {
    throw new CookieImportError("Invalid cookie domain", "bad_request");
  }
}
function cookieDomainMatches(hostname, cookieDomain) {
  const host = normalizeCookieDomain(hostname);
  const domain = normalizeCookieDomain(cookieDomain);
  const address = isIP(domain.startsWith("[") ? domain.slice(1, -1) : domain);
  return host === domain || !address && cookieDomain.startsWith(".") && host.endsWith("." + domain);
}
async function withCookieReadRetry(operation) {
  for (let attempt = 0;; attempt++) {
    try {
      return await operation();
    } catch (err) {
      if (attempt < 2 && ["db_locked", "SQLITE_BUSY", "SQLITE_LOCKED"].includes(err?.code)) {
        await new Promise((resolve) => setTimeout(resolve, [150, 500][attempt]));
        continue;
      }
      if (["SQLITE_BUSY", "SQLITE_LOCKED"].includes(err?.code))
        throw new CookieImportError("Cookie database is busy. Close the source browser and retry.", "db_locked", "retry");
      if (err?.code === "SQLITE_CORRUPT")
        throw new CookieImportError("Cookie database is corrupt", "db_corrupt");
      if (err?.code === "SQLITE_READONLY")
        throw new CookieImportError("Cookie database access was denied", "db_permission");
      if (typeof err?.code === "string" && err.code.startsWith("SQLITE_"))
        throw new CookieImportError("Cookie database could not be read", "db_read_error");
      throw err;
    }
  }
}
function listDomains(browserName, profile = "Default") {
  const browser = resolveBrowserInfo(browserName);
  const match = getBrowserMatch(browser, profile);
  const db = openDb(match.dbPath, browser.name);
  try {
    const now = chromiumNow();
    const rows = db.query(`SELECT host_key AS domain, COUNT(*) AS count
       FROM cookies
       WHERE has_expires = 0 OR expires_utc > ?
       GROUP BY host_key
       ORDER BY count DESC`).all(now);
    return { domains: rows, browser: browser.name };
  } finally {
    db.close();
  }
}
async function importCookies(browserName, domains, profile = "Default") {
  if (domains.length === 0)
    return { cookies: [], count: 0, failed: 0, domainCounts: {} };
  const selectedDomains = [...new Set(domains.flatMap((domain) => {
    const normalized = normalizeCookieDomain(domain);
    return [normalized, "." + normalized];
  }))];
  const browser = resolveBrowserInfo(browserName);
  const match = getBrowserMatch(browser, profile);
  const db = openDb(match.dbPath, browser.name);
  try {
    const now = chromiumNow();
    const placeholders = selectedDomains.map(() => "?").join(",");
    const rows = db.query(`SELECT host_key, name, value, encrypted_value, path, expires_utc,
              is_secure, is_httponly, has_expires, samesite
       FROM cookies
       WHERE host_key IN (${placeholders})
         AND (has_expires = 0 OR expires_utc > ?)
       ORDER BY host_key, name`).all(...selectedDomains, now);
    const needsKey = rows.some((row) => !row.value && row.encrypted_value.length > 0 && Buffer.from(row.encrypted_value).subarray(0, 3).toString() !== "v20");
    const derivedKeys = needsKey ? await getDerivedKeys(match) : new Map;
    const cookies = [];
    let failed = 0;
    const domainCounts = Object.create(null);
    const failureReasons = {};
    for (const row of rows) {
      try {
        const value = decryptCookieValue(row, derivedKeys, match.platform);
        const cookie = toPlaywrightCookie(row, value);
        cookies.push(cookie);
        domainCounts[row.host_key] = (domainCounts[row.host_key] || 0) + 1;
      } catch (err) {
        failed++;
        const reason = err instanceof CookieImportError && err.code === "v20_encryption" ? "unsupported_encryption" : "decryption_failed";
        failureReasons[reason] = (failureReasons[reason] || 0) + 1;
      }
    }
    return { cookies, count: cookies.length, failed, domainCounts, failureReasons };
  } finally {
    db.close();
  }
}
function assertCookieDatabase(browserName, profile) {
  getBrowserMatch(resolveBrowserInfo(browserName), profile);
}
function resolveBrowserInfo(nameOrAlias) {
  const needle = nameOrAlias.toLowerCase().trim();
  const found = BROWSER_REGISTRY.find((b) => b.aliases.includes(needle) || b.name.toLowerCase() === needle);
  if (!found) {
    const supported = BROWSER_REGISTRY.flatMap((b) => b.aliases).join(", ");
    throw new CookieImportError(`Unknown browser '${nameOrAlias}'. Supported on this OS: ${hostBrowserTokens()}. All names: ${supported}`, "unknown_browser");
  }
  return found;
}
function joinLabels(labels) {
  return labels.length <= 1 ? labels.join("") : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}
function hostBrowserTokens() {
  const host = getHostPlatform();
  return BROWSER_REGISTRY.filter((browser) => !host || getDataDirForPlatform(browser, host) !== null).map((browser) => `${browser.name} (${browser.aliases[0]})`).join(", ");
}
function symbolicLocation(browser, platform) {
  const dataDir = getDataDirForPlatform(browser, platform).replace(/\/$/, "");
  if (platform === "darwin")
    return `~/Library/Application Support/${dataDir}`;
  if (platform === "linux")
    return `~/.config/${dataDir}`;
  return `${browser.windowsDataRoot === "roaming" ? "%APPDATA%" : "%LOCALAPPDATA%"}\\${dataDir.replace(/\//g, "\\")}`;
}
function profileCookieCandidates(platform, profileDir) {
  return platform === "win32" ? [path13.join(profileDir, "Network", "Cookies"), path13.join(profileDir, "Cookies")] : [path13.join(profileDir, "Cookies")];
}
function validateProfile(profile) {
  if (/[/\\]|\.\./.test(profile) || /[\x00-\x1f]/.test(profile)) {
    throw new CookieImportError(`Invalid profile name: '${profile}'`, "bad_request");
  }
}
function getHostPlatform() {
  const p = process.platform;
  if (p === "darwin" || p === "linux" || p === "win32")
    return p;
  return null;
}
function getSearchPlatforms() {
  const current = getHostPlatform();
  const order = [];
  if (current)
    order.push(current);
  for (const platform of ["darwin", "linux", "win32"]) {
    if (!order.includes(platform))
      order.push(platform);
  }
  return order;
}
function getDataDirForPlatform(browser, platform) {
  if (platform === "darwin")
    return browser.dataDir || null;
  if (platform === "linux")
    return browser.linuxDataDir || null;
  return browser.windowsDataDir || null;
}
function windowsBaseDir(browser) {
  if (browser.windowsDataRoot !== "roaming")
    return path13.join(os8.homedir(), "AppData", "Local");
  const appData = process.env.APPDATA;
  if (typeof appData === "string" && path13.win32.isAbsolute(appData.trim()))
    return appData.trim();
  return path13.join(os8.homedir(), "AppData", "Roaming");
}
function getBaseDir(platform, browser) {
  if (platform === "darwin")
    return path13.join(os8.homedir(), "Library", "Application Support");
  if (platform === "win32")
    return windowsBaseDir(browser);
  return path13.join(os8.homedir(), ".config");
}
function findBrowserMatch(browser, profile) {
  validateProfile(profile);
  for (const platform of getSearchPlatforms()) {
    const dataDir = getDataDirForPlatform(browser, platform);
    if (!dataDir)
      continue;
    const baseProfile = path13.join(getBaseDir(platform, browser), dataDir, profile);
    for (const dbPath of profileCookieCandidates(platform, baseProfile)) {
      try {
        if (fs14.existsSync(dbPath)) {
          return { browser, platform, dbPath };
        }
      } catch {}
    }
  }
  return null;
}
function getBrowserMatch(browser, profile) {
  const match = findBrowserMatch(browser, profile);
  if (match)
    return match;
  const platforms = getSearchPlatforms().filter((platform) => getDataDirForPlatform(browser, platform) !== null);
  const rootFor = (platform) => path13.join(getBaseDir(platform, browser), getDataDirForPlatform(browser, platform));
  const checked = `Checked: ${platforms.flatMap((platform) => profileCookieCandidates(platform, path13.join(rootFor(platform), profile))).join(", ")}.`;
  const host = getHostPlatform();
  if (host && !platforms.includes(host)) {
    const locations = platforms.map((platform) => `${symbolicLocation(browser, platform)} on ${PLATFORM_LABELS[platform]}`).join("; ");
    throw new CookieImportError(`${browser.name} cookie import is available on ${joinLabels(platforms.map((platform) => PLATFORM_LABELS[platform]))} only. It reads ${locations}. Browsers available on this OS: ${hostBrowserTokens()}. ${checked}`, "not_installed");
  }
  if (platforms.some((platform) => fs14.existsSync(rootFor(platform)))) {
    const available = listProfiles(browser.name).map((entry) => entry.name);
    throw new CookieImportError(`${browser.name} profile '${profile}' not found. Available: ${available.length ? available.join(", ") : "none"}. ${checked}`, "not_installed");
  }
  const layout = browser.windowsDataRoot === "roaming" ? ` Supported layout: ${symbolicLocation(browser, "win32")}\\<Default|Profile N>\\Network\\Cookies. Legacy root-level layouts, side profiles and portable installs are not supported; sign in manually with \`$B handoff\` instead.` : "";
  throw new CookieImportError(`No supported ${browser.name} cookie database found. ${checked}${layout}`, "not_installed");
}
function openDb(dbPath, browserName) {
  if (process.platform === "win32") {
    return openDbFromCopy(dbPath, browserName);
  }
  try {
    return openCookieDatabase(dbPath);
  } catch (err) {
    if (err?.code === "sqlite_unavailable")
      throw new CookieImportError(err.message, "sqlite_unavailable");
    if (["SQLITE_BUSY", "SQLITE_LOCKED"].includes(err?.code)) {
      return openDbFromCopy(dbPath, browserName);
    }
    if (err?.code === "SQLITE_CORRUPT") {
      throw new CookieImportError(`Cookie database for ${browserName} is corrupt`, "db_corrupt");
    }
    throw new CookieImportError("Cookie database could not be read", "db_read_error");
  }
}
function openDbFromCopy(dbPath, browserName) {
  const tmpDir = fs14.mkdtempSync(path13.join(os8.tmpdir(), "browse-cookies-"));
  const tmpPath = path13.join(tmpDir, "Cookies");
  try {
    fs14.chmodSync(tmpDir, 448);
    fs14.copyFileSync(dbPath, tmpPath);
    fs14.chmodSync(tmpPath, 384);
    const walPath = dbPath + "-wal";
    const shmPath = dbPath + "-shm";
    if (fs14.existsSync(walPath)) {
      fs14.copyFileSync(walPath, tmpPath + "-wal");
      fs14.chmodSync(tmpPath + "-wal", 384);
    }
    if (fs14.existsSync(shmPath)) {
      fs14.copyFileSync(shmPath, tmpPath + "-shm");
      fs14.chmodSync(tmpPath + "-shm", 384);
    }
    const db = openCookieDatabase(tmpPath);
    const origClose = db.close.bind(db);
    db.close = () => {
      try {
        origClose();
      } finally {
        fs14.rmSync(tmpDir, { recursive: true, force: true });
      }
    };
    return db;
  } catch (err) {
    try {
      fs14.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
    if (err?.code === "sqlite_unavailable")
      throw new CookieImportError(err.message, "sqlite_unavailable");
    if (err?.code === "SQLITE_CORRUPT")
      throw new CookieImportError("Cookie database is corrupt", "db_corrupt");
    if (err?.code === "EACCES" || err?.code === "EPERM")
      throw new CookieImportError("Cookie database access denied", "db_permission");
    if (err?.code === "ENOENT")
      throw new CookieImportError("Cookie database no longer exists", "db_missing");
    if (!/SQLITE_BUSY|SQLITE_LOCKED|database is locked|EBUSY/.test(String(err?.code) + String(err?.message))) {
      throw new CookieImportError("Cookie database could not be read", "db_read_error");
    }
    throw new CookieImportError(`Cookie database is locked (${browserName} may be running). Try closing ${browserName} first.`, "db_locked", "retry");
  }
}
function deriveKey(password, iterations) {
  return crypto2.pbkdf2Sync(password, "saltysalt", iterations, 16, "sha1");
}
function getCachedDerivedKey(cacheKey, password, iterations) {
  const cached = keyCache.get(cacheKey);
  if (cached)
    return cached;
  const derived = deriveKey(password, iterations);
  keyCache.set(cacheKey, derived);
  return derived;
}
async function getDerivedKeys(match) {
  if (match.platform === "darwin") {
    const password = await getMacKeychainPassword(match.browser.keychainService);
    return new Map([
      ["v10", getCachedDerivedKey(`darwin:${match.browser.keychainService}:v10`, password, 1003)]
    ]);
  }
  if (match.platform === "win32") {
    const key = await getWindowsAesKey(match.browser);
    return new Map([["v10", key]]);
  }
  const keys = new Map;
  keys.set("v10", getCachedDerivedKey("linux:v10", "peanuts", 1));
  const linuxPassword = await getLinuxSecretPassword(match.browser);
  if (linuxPassword) {
    keys.set("v11", getCachedDerivedKey(`linux:${match.browser.keychainService}:v11`, linuxPassword, 1));
  }
  return keys;
}
async function getWindowsAesKey(browser) {
  const cacheKey = `win32:${browser.keychainService}`;
  const cached = keyCache.get(cacheKey);
  if (cached)
    return cached;
  const platform = "win32";
  const dataDir = getDataDirForPlatform(browser, platform);
  if (!dataDir)
    throw new CookieImportError(`No Windows data dir for ${browser.name}`, "not_installed");
  const localStatePath = path13.join(getBaseDir(platform, browser), dataDir, "Local State");
  let localState;
  try {
    localState = JSON.parse(fs14.readFileSync(localStatePath, "utf-8"));
  } catch (err) {
    throw new CookieImportError(`Cannot read Local State for ${browser.name}`, "keychain_error");
  }
  const encryptedKeyB64 = localState?.os_crypt?.encrypted_key;
  if (!encryptedKeyB64) {
    throw new CookieImportError(`No encrypted key in Local State for ${browser.name}`, "keychain_not_found");
  }
  const encryptedKey = Buffer.from(encryptedKeyB64, "base64").slice(5);
  const key = await dpapiDecrypt(encryptedKey);
  keyCache.set(cacheKey, key);
  return key;
}
async function dpapiDecrypt(encryptedBytes) {
  const script = [
    "Add-Type -AssemblyName System.Security",
    "$stdin = [Console]::In.ReadToEnd().Trim()",
    "$bytes = [System.Convert]::FromBase64String($stdin)",
    "$dec = [System.Security.Cryptography.ProtectedData]::Unprotect($bytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)",
    "Write-Output ([System.Convert]::ToBase64String($dec))"
  ].join("; ");
  const proc = Bun.spawn(["powershell", "-NoProfile", "-Command", script], {
    windowsHide: true,
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe"
  });
  try {
    proc.stdin.write(encryptedBytes.toString("base64"));
    proc.stdin.end();
    const { exitCode, stdout } = await readCredentialProcess(proc, 1e4, () => new CookieImportError("DPAPI decryption timed out", "keychain_timeout", "retry"));
    if (exitCode !== 0) {
      throw new CookieImportError("DPAPI decryption failed", "keychain_error");
    }
    return Buffer.from(stdout.trim(), "base64");
  } catch (err) {
    if (err instanceof CookieImportError)
      throw err;
    throw new CookieImportError("DPAPI decryption failed", "keychain_error");
  }
}
async function readCredentialProcess(proc, timeoutMs, timeoutError) {
  const readers = [proc.stdout.getReader(), proc.stderr.getReader()];
  const read = async (reader) => {
    const chunks = [];
    let bytes = 0;
    for (;; ) {
      const { done, value } = await reader.read();
      if (done)
        return Buffer.concat(chunks, bytes).toString("utf8");
      bytes += value.byteLength;
      if (bytes > 64 * 1024)
        throw new Error("Credential process output exceeded the limit");
      chunks.push(value);
    }
  };
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(timeoutError()), timeoutMs);
  });
  try {
    const [exitCode, stdout, stderr] = await Promise.race([
      Promise.all([proc.exited, read(readers[0]), read(readers[1])]),
      timeout
    ]);
    return { exitCode, stdout, stderr };
  } catch (error) {
    try {
      proc.kill();
    } catch {}
    for (const reader of readers) {
      try {
        reader.cancel().catch(() => {});
      } catch {}
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
async function getMacKeychainPassword(service) {
  const proc = Bun.spawn(["security", "find-generic-password", "-s", service, "-w"], { stdout: "pipe", stderr: "pipe", windowsHide: true });
  try {
    const { exitCode, stdout, stderr } = await readCredentialProcess(proc, 1e4, () => new CookieImportError(`macOS is waiting for Keychain permission. Look for a dialog asking to allow access to "${service}".`, "keychain_timeout", "retry"));
    if (exitCode !== 0) {
      const errText = stderr.trim().toLowerCase();
      if (errText.includes("user canceled") || errText.includes("denied") || errText.includes("interaction not allowed")) {
        throw new CookieImportError(`Keychain access denied. Click "Allow" in the macOS dialog for "${service}".`, "keychain_denied", "retry");
      }
      if (errText.includes("could not be found") || errText.includes("not found")) {
        throw new CookieImportError(`No Keychain entry for "${service}". Is this a Chromium-based browser?`, "keychain_not_found");
      }
      throw new CookieImportError("Could not read Keychain", "keychain_error", "retry");
    }
    return stdout.trim();
  } catch (err) {
    if (err instanceof CookieImportError)
      throw err;
    throw new CookieImportError("Could not read Keychain", "keychain_error", "retry");
  }
}
async function getLinuxSecretPassword(browser) {
  const attempts = [
    ["secret-tool", "lookup", "Title", browser.keychainService]
  ];
  if (browser.linuxApplication) {
    attempts.push(["secret-tool", "lookup", "xdg:schema", "chrome_libsecret_os_crypt_password_v2", "application", browser.linuxApplication], ["secret-tool", "lookup", "xdg:schema", "chrome_libsecret_os_crypt_password", "application", browser.linuxApplication]);
  }
  for (const cmd of attempts) {
    const password = await runPasswordLookup(cmd, 3000);
    if (password)
      return password;
  }
  return null;
}
async function runPasswordLookup(cmd, timeoutMs) {
  try {
    const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe", windowsHide: true });
    const { exitCode, stdout } = await readCredentialProcess(proc, timeoutMs, () => new Error("timeout"));
    if (exitCode !== 0)
      return null;
    const password = stdout.trim();
    return password.length > 0 ? password : null;
  } catch {
    return null;
  }
}
function decryptCookieValue(row, keys, platform) {
  if (row.value && row.value.length > 0)
    return row.value;
  const ev = Buffer.from(row.encrypted_value);
  if (ev.length === 0)
    return "";
  const prefix = ev.slice(0, 3).toString("utf-8");
  if (prefix === "v20")
    throw new CookieImportError("Cookie uses App-Bound Encryption (v20). Use CDP extraction instead.", "v20_encryption");
  const key = keys.get(prefix);
  if (!key)
    throw new Error(`No decryption key available for ${prefix} cookies`);
  if (platform === "win32" && prefix === "v10") {
    const nonce = ev.slice(3, 15);
    const tag = ev.slice(ev.length - 16);
    const ciphertext = ev.slice(15, ev.length - 16);
    const decipher = crypto2.createDecipheriv("aes-256-gcm", key, nonce);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const hostHash = crypto2.createHash("sha256").update(row.host_key).digest();
    const prefixed = plaintext.length >= 32 && plaintext.subarray(0, 32).equals(hostHash);
    return (prefixed ? plaintext.subarray(32) : plaintext).toString("utf-8");
  }
  const ciphertext = ev.slice(3);
  const iv = Buffer.alloc(16, 32);
  const decipher = crypto2.createDecipheriv("aes-128-cbc", key, iv);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  if (plaintext.length <= 32)
    return "";
  return plaintext.slice(32).toString("utf-8");
}
function toPlaywrightCookie(row, value) {
  return {
    name: row.name,
    value,
    domain: row.host_key,
    path: row.path || "/",
    expires: chromiumEpochToUnix(row.expires_utc, row.has_expires),
    secure: row.is_secure === 1,
    httpOnly: row.is_httponly === 1,
    sameSite: mapSameSite(row.samesite)
  };
}
function chromiumNow() {
  return BigInt(Date.now()) * 1000n + CHROMIUM_EPOCH_OFFSET;
}
function chromiumEpochToUnix(epoch, hasExpires) {
  if (hasExpires === 0 || epoch === 0 || epoch === 0n)
    return -1;
  const epochBig = BigInt(epoch);
  const unixMicro = epochBig - CHROMIUM_EPOCH_OFFSET;
  return Number(unixMicro / 1000000n);
}
function mapSameSite(value) {
  switch (value) {
    case 0:
      return "None";
    case 1:
      return "Lax";
    case 2:
      return "Strict";
    default:
      return "Lax";
  }
}
async function importCookiesViaCdp(browserName, domains, profile = "Default") {
  if (domains.length === 0)
    return { cookies: [], count: 0, failed: 0, domainCounts: {} };
  if (process.platform !== "win32")
    throw new CookieImportError("Native extraction is only supported on Windows", "not_supported");
  const browser = resolveBrowserInfo(browserName);
  validateProfile(profile);
  const dataDir = getDataDirForPlatform(browser, "win32");
  if (!dataDir)
    throw new CookieImportError("This browser is not supported on Windows", "not_supported");
  if (!browser.windowsNative) {
    throw new CookieImportError(`${browser.name} has no native cookie extraction. Sign in manually: run \`$B handoff\`, sign in, then \`$B resume\`.`, "native_unsupported_browser");
  }
  await Promise.resolve().then(() => init_cookie_import_native());
  const cookies = await importNativeCookies({
    browserName: browser.name,
    userDataDir: path13.join(getBaseDir("win32", browser), dataDir),
    profile,
    domains: [...new Set(domains.flatMap((domain) => {
      const normalized = normalizeCookieDomain(domain);
      return [normalized, "." + normalized];
    }))]
  });
  const domainCounts = Object.create(null);
  for (const cookie of cookies)
    domainCounts[cookie.domain] = (domainCounts[cookie.domain] || 0) + 1;
  return { cookies, count: cookies.length, failed: 0, domainCounts };
}
var CookieImportError, BROWSER_REGISTRY, keyCache, PLATFORM_LABELS, CHROMIUM_EPOCH_OFFSET = 11644473600000000n;
var init_cookie_import_browser = __esm(() => {
  init_cookie_database();
  CookieImportError = class CookieImportError extends Error {
    code;
    action;
    constructor(message, code, action) {
      super(message);
      this.code = code;
      this.action = action;
      this.name = "CookieImportError";
    }
  };
  BROWSER_REGISTRY = [
    { name: "Comet", dataDir: "Comet/", keychainService: "Comet Safe Storage", aliases: ["comet", "perplexity"] },
    { name: "Chrome", dataDir: "Google/Chrome/", keychainService: "Chrome Safe Storage", aliases: ["chrome", "google-chrome", "google-chrome-stable"], linuxDataDir: "google-chrome/", linuxApplication: "chrome", windowsDataDir: "Google/Chrome/User Data/", windowsNative: true },
    { name: "Chromium", dataDir: "chromium/", keychainService: "Chromium Safe Storage", aliases: ["chromium"], linuxDataDir: "chromium/", linuxApplication: "chromium", windowsDataDir: "Chromium/User Data/", windowsNative: true },
    { name: "Arc", dataDir: "Arc/User Data/", keychainService: "Arc Safe Storage", aliases: ["arc"] },
    { name: "Brave", dataDir: "BraveSoftware/Brave-Browser/", keychainService: "Brave Safe Storage", aliases: ["brave"], linuxDataDir: "BraveSoftware/Brave-Browser/", linuxApplication: "brave", windowsDataDir: "BraveSoftware/Brave-Browser/User Data/", windowsNative: true },
    { name: "Edge", dataDir: "Microsoft Edge/", keychainService: "Microsoft Edge Safe Storage", aliases: ["edge"], linuxDataDir: "microsoft-edge/", linuxApplication: "microsoft-edge", windowsDataDir: "Microsoft/Edge/User Data/", windowsNative: true },
    { name: "Opera", dataDir: null, keychainService: "Opera Safe Storage", aliases: ["opera"], windowsDataDir: "Opera Software/Opera Stable/", windowsDataRoot: "roaming" },
    { name: "Opera GX", dataDir: null, keychainService: "Opera GX Safe Storage", aliases: ["opera-gx", "operagx"], windowsDataDir: "Opera Software/Opera GX Stable/", windowsDataRoot: "roaming" }
  ];
  keyCache = new Map;
  PLATFORM_LABELS = { darwin: "macOS", linux: "Linux", win32: "Windows" };
});

// browse/src/cookie-picker-ui.ts
function getCookiePickerHTML(serverPort, options = {}) {
  const baseUrl = `http://127.0.0.1:${serverPort}`;
  let targetOrigin;
  try {
    const target = new URL(options.targetOrigin ?? "");
    if (["http:", "https:"].includes(target.protocol))
      targetOrigin = target.origin;
  } catch {}
  const config = JSON.stringify({
    pickerInstance: options.pickerInstance,
    browser: options.browser,
    profile: options.profile,
    targetOrigin,
    verifyAuth: options.verifyAuth === true,
    clearStorage: options.clearStorage === true,
    verificationAvailable: options.verificationAvailable === true,
    storageResetAvailable: options.storageResetAvailable !== false
  }).replace(/[<>&\u2028\u2029]/g, (character) => "\\u" + character.charCodeAt(0).toString(16).padStart(4, "0"));
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cookie Import — gstack browse</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    background: #0a0a0a;
    color: #e0e0e0;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* ─── Header ──────────────────────────── */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    border-bottom: 1px solid #222;
    background: #0f0f0f;
  }
  .header h1 {
    font-size: 16px;
    font-weight: 600;
    color: #fff;
  }
  .header .port {
    font-size: 12px;
    color: #666;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }

  .subtitle {
    padding: 10px 24px 12px;
    font-size: 13px;
    color: #999;
    line-height: 1.5;
    border-bottom: 1px solid #222;
    background: #0f0f0f;
  }

  /* ─── Layout ──────────────────────────── */
  .container {
    display: flex;
    flex: 1;
    min-height: 0;
  }
  .panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .panel-left {
    border-right: 1px solid #222;
  }
  .panel-header {
    padding: 16px 20px 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #888;
  }

  /* ─── Browser Pills ───────────────────── */
  .browser-pills {
    display: flex;
    gap: 8px;
    padding: 0 20px 12px;
    flex-wrap: wrap;
  }
  .pill {
    padding: 6px 14px;
    border-radius: 20px;
    border: 1px solid #333;
    background: #1a1a1a;
    color: #aaa;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .pill:hover { border-color: #555; color: #ddd; }
  .pill.active {
    border-color: #4ade80;
    background: #0a2a14;
    color: #4ade80;
  }
  .pill .dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #4ade80;
  }

  /* ─── Profile Pills ─────────────────── */
  .profile-pills {
    display: flex;
    gap: 6px;
    padding: 0 20px 12px;
    flex-wrap: wrap;
  }
  .profile-pill {
    padding: 4px 10px;
    border-radius: 14px;
    border: 1px solid #2a2a2a;
    background: #141414;
    color: #888;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .profile-pill:hover { border-color: #444; color: #bbb; }
  .profile-pill.active {
    border-color: #60a5fa;
    background: #0a1a2a;
    color: #60a5fa;
  }

  /* ─── Search ──────────────────────────── */
  .search-wrap {
    padding: 0 20px 12px;
  }
  .search-input {
    width: 100%;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid #333;
    background: #141414;
    color: #e0e0e0;
    font-size: 13px;
    outline: none;
    transition: border-color 0.15s;
  }
  .search-input::placeholder { color: #555; }
  .search-input:focus { border-color: #555; }

  /* ─── Domain List ─────────────────────── */
  .domain-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 12px;
  }
  .domain-list::-webkit-scrollbar { width: 6px; }
  .domain-list::-webkit-scrollbar-track { background: transparent; }
  .domain-list::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }

  .domain-row {
    display: flex;
    align-items: center;
    padding: 8px 10px;
    border-radius: 6px;
    transition: background 0.1s;
    gap: 8px;
  }
  .domain-row:hover { background: #1a1a1a; }
  .domain-name {
    flex: 1;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 13px;
    color: #ccc;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .domain-count {
    font-size: 12px;
    color: #666;
    font-family: 'SF Mono', 'Fira Code', monospace;
    min-width: 28px;
    text-align: right;
  }
  .btn-add, .btn-trash {
    width: 28px; height: 28px;
    border-radius: 6px;
    border: 1px solid #333;
    background: #1a1a1a;
    color: #888;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .btn-add:hover { border-color: #4ade80; color: #4ade80; background: #0a2a14; }
  .btn-trash:hover { border-color: #f87171; color: #f87171; background: #2a0a0a; }
  .btn-add:disabled, .btn-trash:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    pointer-events: none;
  }
  .btn-add.imported {
    border-color: #333;
    color: #4ade80;
    background: transparent;
    cursor: default;
    font-size: 14px;
  }

  /* ─── Footer ──────────────────────────── */
  .panel-footer {
    padding: 12px 20px;
    border-top: 1px solid #222;
    font-size: 12px;
    color: #666;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .btn-import-all {
    padding: 4px 12px;
    border-radius: 6px;
    border: 1px solid #333;
    background: #1a1a1a;
    color: #4ade80;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-import-all:hover { border-color: #4ade80; background: #0a2a14; }
  .btn-import-all:disabled { opacity: 0.3; cursor: not-allowed; pointer-events: none; }

  /* ─── Imported Panel ──────────────────── */
  .imported-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #444;
    font-size: 13px;
    padding: 20px;
    text-align: center;
  }

  /* ─── Banner ──────────────────────────── */
  .banner {
    padding: 10px 20px;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .banner.error {
    background: #1a0a0a;
    border-bottom: 1px solid #3a1111;
    color: #f87171;
  }
  .banner.info {
    background: #0a1a2a;
    border-bottom: 1px solid #112233;
    color: #60a5fa;
  }
  .banner.warning {
    background: #241b0a;
    border-bottom: 1px solid #49330d;
    color: #fbbf24;
  }
  .target-options {
    border: 0;
    border-bottom: 1px solid #222;
    padding: 10px 24px;
    font-size: 12px;
    color: #aaa;
    display: grid;
    gap: 8px;
  }
  .target-options legend { padding-top: 10px; color: #ccc; }
  .target-options label { display: flex; align-items: flex-start; gap: 8px; line-height: 1.5; }
  .target-options input { margin-top: 3px; accent-color: #60a5fa; }
  .target-options small { color: #888; }
  button:disabled { opacity: 0.4; cursor: not-allowed; }
  button:focus-visible, input:focus-visible { outline: 2px solid #60a5fa; outline-offset: 3px; }
  .banner .banner-text { flex: 1; }
  .banner .banner-close, .banner .banner-retry {
    background: none;
    border: 1px solid currentColor;
    color: inherit;
    padding: 3px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }

  /* ─── Spinner ─────────────────────────── */
  .spinner {
    display: inline-block;
    width: 14px; height: 14px;
    border: 2px solid #333;
    border-top-color: #4ade80;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .loading-row {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
    gap: 10px;
    color: #666;
    font-size: 13px;
  }
</style>
</head>
<body>

<div class="header">
  <h1>Cookie Import</h1>
  <span class="port">localhost:${serverPort}</span>
</div>

<p class="subtitle">Copy cookies from the browser and profile you choose to this GStack Browser session. Copying cookies does not prove that you are signed in. Cookies are shared by tabs in this session.</p>

<fieldset class="target-options">
  <legend>Captured target: <span id="target-origin">No HTTP(S) target bound</span></legend>
  <label><input id="clear-storage" type="checkbox"><span>Clear storage for this target origin before importing.<br><small>Chromium targets only. Clears origin localStorage (shared across tabs) and this target tab's sessionStorage only. Other origins and other tabs' sessionStorage are preserved.</small></span></label>
  <label><input id="verify-auth" type="checkbox"><span>Reload the captured target and verify the configured account identity.<br><small id="verification-help">Requires an explicitly configured identity assertion and an HTTP(S) target.</small></span></label>
</fieldset>
<div id="banner" class="banner info" role="status" aria-live="polite" aria-atomic="true">Choose a browser and profile to inspect cookie domains.</div>

<div class="container">
  <!-- Left Panel: Source Browser -->
  <div class="panel panel-left">
    <div class="panel-header">Source Browser</div>
    <div id="browser-pills" class="browser-pills"></div>
    <div id="profile-pills" class="profile-pills" style="display:none"></div>
    <div class="search-wrap">
      <input type="text" class="search-input" id="search" placeholder="Search domains..." aria-label="Search cookie domains" />
    </div>
    <div class="domain-list" id="source-domains">
      <div class="loading-row"><span class="spinner"></span> Detecting browsers...</div>
    </div>
    <div class="panel-footer" id="source-footer"><span id="source-footer-text"></span><button class="btn-import-all" id="btn-import-all" style="display:none">Import All</button></div>
  </div>

  <!-- Right Panel: Imported -->
  <div class="panel panel-right">
    <div class="panel-header">Imported to Session</div>
    <div class="domain-list" id="imported-domains">
      <div class="imported-empty">No cookies imported yet</div>
    </div>
    <div class="panel-footer" id="imported-footer"></div>
  </div>
</div>

<script id="picker-config" type="application/json">${config}</script>
<script>
(function() {
  const BASE = '${baseUrl}';
  const config = JSON.parse(document.getElementById('picker-config').textContent);
  let activeBrowser = null;
  let configuredBrowser = null;
  let activeProfile = null;
  let allProfiles = [];
  let allDomains = [];
  let importedSet = Object.create(null);
  let generation = 0;
  let mutation = false;
  const errorMessages = {
    picker_changed: 'This picker is stale because another picker was opened. Reopen the picker from the intended page before continuing.',
    keychain_denied: 'Keychain access was denied. Allow access in the OS permission prompt or settings, then retry manually.',
    keychain_timeout: 'Credential lookup timed out. Check for a pending OS permission prompt, then retry manually.',
    keychain_error: 'Credential lookup failed. Check the OS credential store or sign in manually in GStack Browser.',
    db_locked: 'The source cookie database is busy. Close the source browser, then retry manually.',
    db_corrupt: 'The source cookie database is invalid or corrupt. Choose another profile or sign in manually in GStack Browser.',
    db_permission: 'Cookie database access was denied. Check source-profile permissions, then retry manually.',
    db_read_error: 'Cookie data could not be read from this profile. Choose another profile or sign in manually in GStack Browser.',
    sqlite_unavailable: 'Cookie import needs Node.js 22.13 or newer with built-in SQLite enabled. Upgrade the runtime or sign in manually in GStack Browser.',
    storage_reset_unsupported: 'Storage reset requires a Chromium target. Import cookies without storage reset on other browsers.',
    profile_required: 'Choose a source profile explicitly; multiple or unavailable profiles cannot be selected automatically.',
    target_changed: 'The captured target changed or is unavailable. Reopen the picker from the intended HTTP(S) page.',
    target_closed: 'The captured target is closed. Reopen the picker from the intended HTTP(S) page.',
    target_mismatch: 'The selected cookies do not match the captured target. Select its cookie domain or reopen the picker from the intended page.',
    not_supported: 'Native cookie import is unsupported for this browser or runtime. Sign in manually in GStack Browser.',
    native_profile_unsupported: 'This browser profile does not support native cookie extraction. Sign in manually in GStack Browser.',
    native_unqualified: 'Native extraction is disabled because process ownership and cleanup are not qualified for this browser and runtime. Sign in manually in GStack Browser.',
    native_cleanup_failed: 'Native browser cleanup could not be confirmed. Inspect the source browser before any manual retry, or sign in manually in GStack Browser.',
    native_supervision_failed: 'Native browser supervision could not start. Sign in manually in GStack Browser.',
    native_timeout: 'Native cookie extraction timed out. Sign in manually in GStack Browser.',
    browser_running: 'The source browser is already running. Close it yourself before retrying, or sign in manually in GStack Browser.',
  };

  const $pills = document.getElementById('browser-pills');
  const $profilePills = document.getElementById('profile-pills');
  const $search = document.getElementById('search');
  const $sourceDomains = document.getElementById('source-domains');
  const $importedDomains = document.getElementById('imported-domains');
  const $sourceFooter = document.getElementById('source-footer-text');
  const $btnImportAll = document.getElementById('btn-import-all');
  const $importedFooter = document.getElementById('imported-footer');
  const $banner = document.getElementById('banner');
  const $clearStorage = document.getElementById('clear-storage');
  const $verifyAuth = document.getElementById('verify-auth');
  const canVerify = !!config.targetOrigin && config.verificationAvailable;
  const canReset = !!config.targetOrigin && config.storageResetAvailable;
  document.getElementById('target-origin').textContent = config.targetOrigin || 'No HTTP(S) target bound';
  $clearStorage.checked = canReset && config.clearStorage;
  $clearStorage.disabled = !canReset;
  $verifyAuth.checked = canVerify && config.verifyAuth;
  $verifyAuth.disabled = !canVerify;
  if (canVerify) document.getElementById('verification-help').textContent = 'Optional. Uses the server-configured exact identity assertion; the identity is never displayed here.';

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function errorMessage(error) {
    return error && Object.hasOwn(errorMessages, error.code) ? errorMessages[error.code]
      : 'Inspect the source and destination before retrying, or reopen the picker.';
  }

  function showBanner(message, type, retry) {
    $banner.className = 'banner ' + type;
    $banner.innerHTML = '<span class="banner-text">' + escHtml(message) + '</span>';
    if (retry) {
      const button = document.createElement('button');
      button.className = 'banner-retry';
      button.textContent = 'Retry';
      button.disabled = mutation;
      button.onclick = () => { if (!mutation) retry(); };
      $banner.appendChild(button);
    }
  }

  async function api(path, opts) {
    const headers = new Headers(opts && opts.headers);
    headers.set('X-Gstack-Picker-Instance', config.pickerInstance || '');
    const response = await fetch(BASE + '/cookie-picker' + path, { ...opts, headers, credentials: 'same-origin' });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error('Cookie picker request failed.');
      if (data && typeof data.code === 'string' && Object.hasOwn(errorMessages, data.code)) error.code = data.code;
      throw error;
    }
    return data;
  }

  async function init() {
    try {
      const [browserData, importedData] = await Promise.all([api('/browsers'), api('/imported')]);
      for (const entry of importedData.domains || []) {
        if (Number.isFinite(entry.count) && entry.count > 0) importedSet[entry.domain] = entry.count;
      }
      renderImported();
      const browsers = browserData.browsers || [];
      $pills.innerHTML = '';
      for (const browser of browsers) {
        const button = document.createElement('button');
        button.className = 'pill';
        button.dataset.browser = browser.name;
        button.setAttribute('aria-pressed', 'false');
        button.innerHTML = '<span class="dot"></span>' + escHtml(browser.name);
        button.onclick = () => selectBrowser(browser.name);
        $pills.appendChild(button);
      }
      if (!browsers.length) {
        $sourceDomains.innerHTML = '<div class="imported-empty">No Chromium browsers detected</div>';
        showBanner('No supported source browsers were detected.', 'warning');
        return;
      }
      const selected = config.browser
        ? browsers.find(browser => [browser.name, ...(Array.isArray(browser.aliases) ? browser.aliases : [])]
          .some(name => typeof name === 'string' && name.toLowerCase() === config.browser.trim().toLowerCase()))
        : browsers[0];
      configuredBrowser = config.browser && selected ? selected.name : null;
      if (selected) await selectBrowser(selected.name);
      else {
        $sourceDomains.innerHTML = '<div class="imported-empty">Choose an available source browser</div>';
        showBanner('The requested browser is unavailable. Choose an available browser explicitly.', 'warning');
      }
    } catch (error) {
      showBanner('Could not load the cookie picker. ' + errorMessage(error), 'error', init);
      $sourceDomains.innerHTML = '<div class="imported-empty">Failed to load</div>';
    }
  }

  async function selectBrowser(name) {
    if (mutation) return;
    const selection = ++generation;
    activeBrowser = name;
    activeProfile = null;
    allProfiles = [];
    allDomains = [];
    $search.value = '';
    $profilePills.innerHTML = '';
    $profilePills.style.display = 'none';
    $btnImportAll.style.display = 'none';
    $sourceFooter.textContent = '';
    $pills.querySelectorAll('button').forEach(button => {
      const active = button.dataset.browser === name;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $sourceDomains.innerHTML = '<div class="loading-row"><span class="spinner"></span> Loading profiles...</div>';
    showBanner('Loading profiles from ' + name + '.', 'info');
    try {
      const data = await api('/profiles?browser=' + encodeURIComponent(name));
      if (selection !== generation) return;
      allProfiles = data.profiles || [];
      const explicit = config.profile && configuredBrowser === name;
      const requested = explicit ? config.profile : data.recommendedProfile;
      activeProfile = allProfiles.some(profile => profile.name === requested) ? requested : null;
      renderProfilePills();
      if (!activeProfile) {
        $sourceDomains.innerHTML = '<div class="imported-empty">' + (allProfiles.length ? 'Choose a profile to inspect its domains' : 'No profiles found') + '</div>';
        showBanner(explicit ? 'The requested profile is unavailable. Choose a profile explicitly.'
          : allProfiles.length ? 'Choose a profile. No unambiguous profile was recommended.' : 'No source profiles were found.', 'warning');
        return;
      }
      await loadDomains(selection, name, activeProfile);
    } catch (error) {
      if (selection !== generation) return;
      showBanner('Could not load profiles for ' + name + '. ' + errorMessage(error), 'error', () => selectBrowser(name));
      $sourceDomains.innerHTML = '<div class="imported-empty">Failed to load profiles</div>';
    }
  }

  function renderProfilePills() {
    $profilePills.style.display = allProfiles.length ? 'flex' : 'none';
    $profilePills.innerHTML = allProfiles.map(profile => {
      const active = profile.name === activeProfile;
      const label = (profile.displayName || profile.name) + ' (' + profile.name + ')' + (profile.unavailable ? ' — could not inspect' : '');
      return '<button class="profile-pill' + (active ? ' active' : '') + '" aria-pressed="' + active + '" data-profile="' + escHtml(profile.name) + '"' + (mutation ? ' disabled' : '') + '>' + escHtml(label) + '</button>';
    }).join('');
    $profilePills.querySelectorAll('button').forEach(button => {
      button.onclick = () => selectProfile(button.dataset.profile);
    });
  }

  async function selectProfile(name) {
    if (mutation || !allProfiles.some(profile => profile.name === name)) return;
    const selection = ++generation;
    activeProfile = name;
    allDomains = [];
    $search.value = '';
    renderProfilePills();
    $profilePills.querySelectorAll('button').forEach(button => { if (button.dataset.profile === name) button.focus(); });
    await loadDomains(selection, activeBrowser, name);
  }

  async function loadDomains(selection, browser, profile) {
    $sourceDomains.innerHTML = '<div class="loading-row"><span class="spinner"></span> Loading domains...</div>';
    $sourceFooter.textContent = '';
    $btnImportAll.style.display = 'none';
    showBanner('Loading domains from ' + browser + ' (' + profile + ').', 'info');
    try {
      const data = await api('/domains?browser=' + encodeURIComponent(browser) + '&profile=' + encodeURIComponent(profile));
      if (selection !== generation) return;
      allDomains = data.domains || [];
      renderSourceDomains();
      showBanner(allDomains.length ? 'Ready to import from ' + browser + ' (' + profile + '). Authentication has not been checked.'
        : 'No cookie domains found in ' + browser + ' (' + profile + ').', allDomains.length ? 'info' : 'warning');
    } catch (error) {
      if (selection !== generation) return;
      showBanner('Could not read domains from ' + browser + ' (' + profile + '). ' + errorMessage(error), 'error', () => selectProfile(profile));
      $sourceDomains.innerHTML = '<div class="imported-empty">Failed to load domains</div>';
    }
  }

  function renderSourceDomains() {
    const query = $search.value.toLowerCase();
    const filtered = allDomains.filter(domain => domain.domain.toLowerCase().includes(query));
    $btnImportAll.style.display = filtered.length && activeProfile ? '' : 'none';
    $btnImportAll.disabled = mutation || !activeProfile;
    $btnImportAll.textContent = 'Import All (' + filtered.length + ')';
    $sourceFooter.textContent = allDomains.length ? allDomains.length + ' domains · ' + allDomains.reduce((sum, domain) => sum + domain.count, 0).toLocaleString() + ' cookies' : '';
    if (!filtered.length) {
      $sourceDomains.innerHTML = '<div class="imported-empty">' + (!activeProfile ? 'Choose a profile to inspect its domains' : query ? 'No matching domains' : 'No cookie domains found') + '</div>';
      return;
    }
    $sourceDomains.innerHTML = filtered.map(domain => {
      const label = (domain.domain in importedSet ? 'Reimport ' : 'Import ') + domain.domain;
      return '<div class="domain-row"><span class="domain-name">' + escHtml(domain.domain) + '</span><span class="domain-count">' + escHtml(domain.count) + '</span><button class="btn-add" data-domain="' + escHtml(domain.domain) + '" title="' + escHtml(label) + '" aria-label="' + escHtml(label) + '"' + (mutation ? ' disabled' : '') + '>' + (domain.domain in importedSet ? '&#8635;' : '+') + '</button></div>';
    }).join('');
    $sourceDomains.querySelectorAll('button').forEach(button => {
      button.onclick = () => importDomains([button.dataset.domain]);
    });
  }

  function setMutationBusy(busy) {
    mutation = busy;
    $pills.querySelectorAll('button').forEach(button => { button.disabled = busy; });
    $profilePills.querySelectorAll('button').forEach(button => { button.disabled = busy; });
    $search.disabled = busy;
    $clearStorage.disabled = busy || !canReset;
    $verifyAuth.disabled = busy || !canVerify;
    renderSourceDomains();
    renderImported();
  }

  async function importDomains(domains) {
    if (mutation || !activeBrowser || !activeProfile || !domains.length) return;
    const request = { browser: activeBrowser, profile: activeProfile, domains: domains.slice(),
      clearStorage: canReset && $clearStorage.checked, verifyAuth: canVerify && $verifyAuth.checked };
    setMutationBusy(true);
    showBanner('Importing from ' + request.browser + ' (' + request.profile + '). Keep this picker open.', 'info');
    try {
      const data = await api('/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) });
      const imported = Number.isFinite(data.imported) && data.imported > 0 ? data.imported : 0;
      const failed = Number.isFinite(data.failed) && data.failed > 0 ? data.failed : 0;
      for (const [domain, count] of Object.entries(data.domainCounts || {})) {
        if (imported > 0 && Number.isFinite(count) && count > 0) importedSet[domain] = count;
      }
      const partial = data.outcome === 'partial' || (imported > 0 && failed > 0);
      let type = data.outcome === 'failed' || data.reset === 'failed' ? 'error' : partial || !imported ? 'warning' : 'info';
      let message = (data.outcome === 'failed' ? 'Import failed. ' : partial ? 'Partial import. ' : !imported ? 'No cookies imported. ' : 'Cookies imported. ')
        + imported + ' imported; ' + failed + ' failed. Source: ' + request.browser + ' (' + request.profile + ').';
      if (typeof data.message === 'string' && data.message) message += ' ' + data.message;
      const failureLabels = { unsupported_encryption: 'unsupported encryption', decryption_failed: 'decryption failed', native_unrecovered: 'not recovered by native import' };
      for (const [reason, count] of Object.entries(data.failureReasons || {})) {
        if (Object.hasOwn(failureLabels, reason) && Number.isFinite(count) && count > 0) message += ' ' + failureLabels[reason] + ': ' + count + '.';
      }
      message += data.reset === 'cleared' ? ' Storage cleared for ' + config.targetOrigin + '.'
        : data.reset === 'failed' ? ' Storage reset failed; storage may be partially cleared.' : ' Storage preserved.';
      if (!request.verifyAuth) message += ' Authentication not checked.';
      else if (imported > 0 && data.verification && data.verification.verified === true) message += ' Authentication verified on the captured target.';
      else {
        const reasons = { not_configured: 'identity assertion not configured', no_cookies_imported: 'no cookies imported',
          identity_missing: 'visible identity missing', identity_ambiguous: 'multiple visible identities', identity_mismatch: 'identity did not match',
          login_redirect: 'login page detected', target_changed: 'target changed', target_closed: 'target closed',
          timeout: 'check timed out', http_error: 'unsuccessful HTTP response', reset_failed: 'storage reset failed', application_failed: 'cookie application failed' };
        const reason = data.verification && data.verification.reason;
        message += ' Authentication not verified' + (Object.hasOwn(reasons, reason) ? ': ' + reasons[reason] : '') + '.';
        if (type === 'info') type = 'warning';
      }
      showBanner(message, type);
    } catch (error) {
      showBanner('Import did not complete for ' + request.browser + ' (' + request.profile + '). ' + errorMessage(error) + ' Authentication was not verified.', 'error');
    } finally {
      setMutationBusy(false);
      if (domains.length === 1) {
        $sourceDomains.querySelectorAll('button').forEach(button => { if (button.dataset.domain === domains[0]) button.focus(); });
      } else $btnImportAll.focus();
    }
  }

  $btnImportAll.onclick = () => importDomains(allDomains.filter(domain => domain.domain.toLowerCase().includes($search.value.toLowerCase())).map(domain => domain.domain));

  function renderImported() {
    const entries = Object.entries(importedSet).sort((a, b) => b[1] - a[1]);
    $importedFooter.textContent = entries.length ? entries.length + ' domains · ' + entries.reduce((sum, entry) => sum + entry[1], 0).toLocaleString() + ' cookies imported' : '';
    $importedDomains.innerHTML = entries.length ? entries.map(([domain, count]) => '<div class="domain-row"><span class="domain-name">' + escHtml(domain) + '</span><span class="domain-count">' + escHtml(count) + '</span><button class="btn-trash" data-domain="' + escHtml(domain) + '" aria-label="' + escHtml('Remove ' + domain) + '" title="Remove"' + (mutation ? ' disabled' : '') + '>&#128465;</button></div>').join('')
      : '<div class="imported-empty">No cookies imported yet</div>';
    $importedDomains.querySelectorAll('button').forEach(button => { button.onclick = () => removeDomain(button.dataset.domain); });
  }

  async function removeDomain(domain) {
    if (mutation) return;
    setMutationBusy(true);
    showBanner('Removing imported cookies for ' + domain + '.', 'info');
    try {
      await api('/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domains: [domain] }) });
      delete importedSet[domain];
      showBanner('Removed imported cookies for ' + domain + '. Storage was not cleared.', 'info');
    } catch (error) {
      showBanner('Cookie removal did not complete. ' + errorMessage(error), 'error');
    } finally {
      setMutationBusy(false);
      const first = $importedDomains.querySelector('button') || $sourceDomains.querySelector('button');
      if (first) first.focus();
    }
  }

  $search.addEventListener('input', renderSourceDomains);
  init();
})();
</script>
</body>
</html>`;
}

// browse/src/cookie-auth-verification.ts
import { errors } from "playwright";
function validateOrigin(expectedOrigin) {
  try {
    const target = new URL(expectedOrigin);
    if ((target.protocol === "http:" || target.protocol === "https:") && target.origin === expectedOrigin)
      return;
  } catch {}
  throw new CookieImportError("A captured HTTP(S) target origin is required.", "invalid_target");
}
function validateCookieAuthOptions(options) {
  if (!options || typeof options.identitySelector !== "string" || !options.identitySelector.trim() || typeof options.expectedIdentity !== "string" || !options.expectedIdentity.replace(/\s+/g, " ").trim()) {
    throw new CookieImportError("Authentication verification requires an identity selector and expected identity.", "verification_not_configured");
  }
  if (options.timeoutMs !== undefined && (typeof options.timeoutMs !== "number" || !Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0)) {
    throw new CookieImportError("Authentication verification requires a positive finite timeout.", "invalid_verification_config");
  }
}
async function verifyCookieAuthentication(page, options, expectedOrigin) {
  try {
    validateCookieAuthOptions(options);
    validateOrigin(expectedOrigin);
  } catch (error) {
    const reason = error instanceof CookieImportError && error.code === "verification_not_configured" ? "not_configured" : error instanceof CookieImportError && error.code === "invalid_target" ? "invalid_target" : "invalid_configuration";
    return { verified: false, reason };
  }
  const timeoutMs = Math.min(options.timeoutMs ?? MAX_TIMEOUT_MS, MAX_TIMEOUT_MS);
  const deadline = performance.now() + timeoutMs;
  const expectedIdentity = options.expectedIdentity.replace(/\s+/g, " ").trim();
  let finished = false;
  let status;
  let lastFailure = "timeout";
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => {
      finished = true;
      resolve({ verified: false, reason: lastFailure, ...status === undefined ? {} : { status } });
    }, timeoutMs);
  });
  try {
    return await Promise.race([timeout, (async () => {
      if (page.isClosed())
        return { verified: false, reason: "target_closed" };
      if (new URL(page.url()).origin !== expectedOrigin)
        return { verified: false, reason: "target_changed" };
      const response = await page.reload({ waitUntil: "domcontentloaded", timeout: Math.max(1, deadline - performance.now()) });
      if (finished || performance.now() >= deadline)
        return { verified: false, reason: "timeout" };
      if (page.isClosed())
        return { verified: false, reason: "target_closed" };
      const loadedUrl = page.url();
      if (new URL(loadedUrl).origin !== expectedOrigin)
        return { verified: false, reason: "target_changed" };
      if (LOGIN_PATH.test(decodeURIComponent(new URL(loadedUrl).pathname)))
        return { verified: false, reason: "login_redirect" };
      if (!response)
        return { verified: false, reason: "no_response" };
      status = response.status();
      if (status < 200 || status >= 300)
        return { verified: false, reason: "http_error", status };
      for (let request = response.request();request; request = request.redirectedFrom()) {
        const url = new URL(request.url());
        if (url.origin !== expectedOrigin)
          return { verified: false, reason: "target_changed", status };
        if (LOGIN_PATH.test(decodeURIComponent(url.pathname)))
          return { verified: false, reason: "login_redirect", status };
      }
      if (new URL(response.url()).origin !== expectedOrigin || new URL(response.url()).href !== new URL(loadedUrl.split("#")[0]).href) {
        return { verified: false, reason: "target_changed", status };
      }
      while (!finished && performance.now() < deadline) {
        if (page.isClosed())
          return { verified: false, reason: "target_closed", status };
        if (page.url() !== loadedUrl)
          return { verified: false, reason: "target_changed", status };
        const reason = await page.locator(options.identitySelector).filter({ visible: true }).evaluateAll((elements, expected) => {
          if (location.origin !== expected.origin || location.href !== expected.url)
            return "target_changed";
          if (elements.length === 0)
            return "identity_missing";
          if (elements.length !== 1)
            return "identity_ambiguous";
          const element = elements[0];
          const text = element instanceof HTMLElement ? element.innerText : element.textContent ?? "";
          return text.replace(/\s+/g, " ").trim() === expected.identity ? "verified" : "identity_mismatch";
        }, { origin: expectedOrigin, url: loadedUrl, identity: expectedIdentity });
        if (finished || performance.now() >= deadline)
          return { verified: false, reason: lastFailure, status };
        if (page.isClosed())
          return { verified: false, reason: "target_closed", status };
        if (page.url() !== loadedUrl)
          return { verified: false, reason: "target_changed", status };
        if (reason === "target_changed" || reason === "verified")
          return { verified: reason === "verified", reason, status };
        lastFailure = reason;
        const remaining = deadline - performance.now();
        if (remaining <= 0)
          return { verified: false, reason, status };
        await new Promise((resolve) => setTimeout(resolve, Math.min(50, remaining)));
      }
      return { verified: false, reason: lastFailure, ...status === undefined ? {} : { status } };
    })()]);
  } catch (error) {
    const reason = error instanceof errors.TimeoutError || finished || performance.now() >= deadline ? "timeout" : page.isClosed() ? "target_closed" : "verification_failed";
    return { verified: false, reason, ...status === undefined ? {} : { status } };
  } finally {
    finished = true;
    clearTimeout(timer);
  }
}
function validateCookieStorageSupport(page) {
  try {
    if (page.context().browser()?.browserType().name() === "chromium")
      return;
  } catch {}
  throw new CookieImportError("Storage reset requires a Chromium target. Import cookies without storage reset on other browsers.", "storage_reset_unsupported");
}
async function clearCookieTargetStorage(page, expectedOrigin, timeoutMs = MAX_TIMEOUT_MS) {
  validateOrigin(expectedOrigin);
  validateCookieStorageSupport(page);
  if (page.isClosed())
    throw new CookieImportError("The captured target is closed.", "target_closed");
  let targetUrl;
  try {
    targetUrl = page.url();
    if (new URL(targetUrl).origin !== expectedOrigin) {
      throw new CookieImportError("The captured target has changed.", "target_changed");
    }
  } catch {
    throw new CookieImportError("The captured target has changed.", "target_changed");
  }
  const deadline = performance.now() + timeoutMs;
  let expired = false;
  let navigated = false;
  const frame = page.mainFrame();
  const navigation = Promise.withResolvers();
  const onNavigation = (changed) => {
    if (changed === frame) {
      navigated = true;
      navigation.resolve("target_changed");
    }
  };
  const onClose = () => {
    navigated = true;
    navigation.resolve("target_changed");
  };
  page.on("framenavigated", onNavigation);
  page.on("close", onClose);
  const cancelled = () => expired || performance.now() >= deadline ? "storage_reset_timeout" : navigated || page.isClosed() || page.url() !== targetUrl ? "target_changed" : undefined;
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => {
      expired = true;
      resolve("storage_reset_timeout");
    }, Math.max(0, deadline - performance.now()));
  });
  const cancellation = Promise.race([timeout, navigation.promise]);
  let result;
  try {
    result = await Promise.race([cancellation, withCdpSession(page, async (session) => {
      let isolated;
      let frameId;
      const worldName = "gstack-cookie-storage-reset";
      const onContext = ({ context }) => {
        if (context.name === worldName && context.auxData?.frameId === frameId && context.auxData?.isDefault === false)
          isolated = context;
      };
      session.on("Runtime.executionContextCreated", onContext);
      try {
        return await Promise.race([cancellation, (async () => {
          if (cancelled())
            return cancelled();
          const tree = await session.send("Page.getFrameTree");
          if (cancelled())
            return cancelled();
          frameId = tree.frameTree.frame.id;
          await session.send("Runtime.enable");
          if (cancelled())
            return cancelled();
          const world = await session.send("Page.createIsolatedWorld", { frameId, worldName, grantUniveralAccess: false });
          if (cancelled())
            return cancelled();
          if (!isolated?.uniqueId || isolated.id !== world.executionContextId)
            return "storage_reset_failed";
          const uniqueContextId = isolated.uniqueId;
          const clock = await session.send("Runtime.evaluate", { expression: "performance.now()", uniqueContextId, returnByValue: true, silent: true });
          const remaining = deadline - performance.now();
          if (cancelled() || remaining <= 0)
            return cancelled() ?? "storage_reset_timeout";
          if (clock.exceptionDetails || !Number.isFinite(clock.result?.value))
            return "storage_reset_failed";
          const cleared = await session.send("Runtime.callFunctionOn", {
            uniqueContextId,
            functionDeclaration: String(({ origin, url, deadline }) => {
              if (performance.now() >= deadline)
                return "storage_reset_timeout";
              if (location.origin !== origin || location.href !== url)
                return "target_changed";
              localStorage.clear();
              if (performance.now() >= deadline)
                return "storage_reset_timeout";
              sessionStorage.clear();
              return "cleared";
            }),
            arguments: [{ value: { origin: expectedOrigin, url: targetUrl, deadline: clock.result.value + remaining } }],
            returnByValue: true,
            silent: true
          });
          if (cancelled())
            return cancelled();
          if (cleared.exceptionDetails || !["cleared", "target_changed", "storage_reset_timeout"].includes(cleared.result?.value))
            return "storage_reset_failed";
          return cleared.result.value;
        })()]);
      } finally {
        session.off("Runtime.executionContextCreated", onContext);
      }
    })]);
  } catch {
    result = cancelled() ?? "storage_reset_failed";
  } finally {
    expired = true;
    clearTimeout(timer);
    page.off("framenavigated", onNavigation);
    page.off("close", onClose);
  }
  if (result === "storage_reset_timeout")
    throw new CookieImportError("Target storage reset timed out; storage may be partially cleared.", "storage_reset_timeout");
  if (result === "target_changed")
    throw new CookieImportError("The captured target has changed.", "target_changed");
  if (result !== "cleared")
    throw new CookieImportError("Target storage reset failed; storage may be partially cleared.", "storage_reset_failed");
}
var MAX_TIMEOUT_MS = 15000, LOGIN_PATH;
var init_cookie_auth_verification = __esm(() => {
  init_cookie_import_browser();
  init_cdp_bridge();
  LOGIN_PATH = /(?:^|\/)(?:log[-_]?in|sign[-_]?in|logon)(?:[\/.;]|$)|(?:^|\/)sessions?\/new(?:[\/.;]|$)/i;
});

// browse/src/cookie-import-operation.ts
function parseCookieImportArgs(args) {
  const options = { browser: "comet" };
  let browserSet = false;
  const seen = new Set;
  for (let i = 0;i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) {
      if (browserSet)
        throw new CookieImportError("Specify only one source browser.", "bad_request");
      options.browser = arg;
      browserSet = true;
      continue;
    }
    if (seen.has(arg))
      throw new CookieImportError("Duplicate cookie-import option.", "bad_request");
    seen.add(arg);
    if (arg === "--domain" || arg === "--profile") {
      const value = args[++i];
      if (!value || value.startsWith("--"))
        throw new CookieImportError("Cookie-import option requires a value.", "bad_request");
      if (arg === "--domain")
        options.domains = [normalizeCookieDomain(value)];
      else
        options.profile = value;
    } else if (arg === "--all")
      options.all = true;
    else if (arg === "--clear-storage")
      options.clearStorage = true;
    else if (arg === "--verify-auth")
      options.verifyAuth = true;
    else
      throw new CookieImportError("Unknown cookie-import option.", "bad_request");
  }
  if (options.all && options.domains)
    throw new CookieImportError("Choose --domain or --all, not both.", "bad_request");
  if (options.all && options.clearStorage)
    throw new CookieImportError("Storage reset requires a single target origin; --all is not supported.", "bad_request");
  return options;
}
async function getCookieProfiles(browser, domains = [], hostname) {
  const profiles = listProfiles(browser);
  if (domains.length || hostname) {
    const selected = domains.map(normalizeCookieDomain);
    let index = 0;
    const check = async () => {
      while (index < profiles.length) {
        const profile = profiles[index++];
        try {
          const result = await withCookieReadRetry(() => listDomains(browser, profile.name));
          profile.matches = result.domains.some((entry) => selected.length ? selected.includes(normalizeCookieDomain(entry.domain)) : cookieDomainMatches(hostname, entry.domain));
        } catch (err) {
          if (err instanceof CookieImportError && err.code === "sqlite_unavailable")
            throw err;
          profile.unavailable = true;
        }
      }
    };
    await Promise.all([check(), check()]);
  }
  const matching = profiles.filter((profile) => profile.matches === true);
  const recommendedProfile = !profiles.some((profile) => profile.unavailable) && matching.length === 1 ? matching[0].name : profiles.length === 1 && profiles[0].matches !== false && !profiles[0].unavailable ? profiles[0].name : undefined;
  return { profiles, recommendedProfile };
}
function profileSelectionError(browser, profiles, domains) {
  const { name, aliases } = resolveBrowserInfo(browser);
  if (!profiles.length) {
    assertCookieDatabase(browser, "Default");
    return new CookieImportError(`${name} profiles changed while selecting. Retry with --profile "<dir>", or run \`$B cookie-import-browser ${aliases[0]}\` to choose in the picker.`, "profile_required");
  }
  const retry = `Retry with --profile "<dir>", or run \`$B cookie-import-browser ${aliases[0]}\` to choose in the picker.`;
  const list = (entries) => entries.map((entry) => entry.name).join(", ");
  const unreadable = profiles.filter((entry) => entry.unavailable);
  const matching = profiles.filter((entry) => entry.matches === true);
  const scope = domains.join(", ");
  if (unreadable.length) {
    const found = matching.length ? ` Profiles with cookies for ${scope}: ${list(matching)}.` : "";
    return new CookieImportError(`${name} profiles ${list(unreadable)} could not be read (the browser may be locking them). Close ${name} and retry, or pass --profile.${found}`, "profile_required");
  }
  if (!domains.length)
    return new CookieImportError(`${name} has several profiles: ${list(profiles)}. ${retry}`, "profile_required");
  if (matching.length > 1)
    return new CookieImportError(`${name} has several profiles with cookies for ${scope}: ${list(matching)}. ${retry}`, "profile_required");
  return new CookieImportError(`No ${name} profile has cookies for ${scope}. Check the domain and that you are signed in to it in ${name}.`, "profile_required");
}
function appBoundMessage(browser, result) {
  const { name } = resolveBrowserInfo(browser);
  const recovery = "Sign in manually: run `$B handoff`, sign in to the intended account in the window that opens, then run `$B resume` (needs a display). See BROWSER.md, Platform limits.";
  if (result.count)
    return `Some ${name} cookies use App-Bound Encryption and were skipped, so the session may not be restored. Check with \`$B reload\` (or --verify-auth); if you are signed out, run \`$B handoff\`, sign in, then \`$B resume\`.`;
  if (result.failureReasons?.decryption_failed)
    return `${name} cookies could not be imported: some use App-Bound Encryption and others could not be decrypted. ${recovery}`;
  return `Some selected ${name} cookies use App-Bound Encryption, which gstack cannot decrypt for this browser. ${recovery}`;
}
function validateCookieTarget(target) {
  try {
    const url = new URL(target.url);
    if (!["http:", "https:"].includes(url.protocol))
      throw new Error;
    if (target.page.isClosed() || target.page.url() !== target.url)
      throw new Error;
    return url;
  } catch {
    throw new CookieImportError("The captured HTTP(S) target has changed or is unavailable. Reopen the picker on the intended page.", "target_changed");
  }
}
async function runCookieImport(options, target, trackDomains, authOptions = {}) {
  for (const value of [options.all, options.clearStorage, options.verifyAuth]) {
    if (value !== undefined && typeof value !== "boolean")
      throw new CookieImportError("Cookie import options must be booleans.", "bad_request");
  }
  if (typeof options.browser !== "string" || !options.browser.trim())
    throw new CookieImportError("Select a source browser.", "bad_request");
  if (options.profile !== undefined && (typeof options.profile !== "string" || !options.profile))
    throw new CookieImportError("Invalid source profile.", "bad_request");
  if (options.all && options.domains || options.all && options.clearStorage)
    throw new CookieImportError("All-domain import cannot be combined with a scoped domain or storage reset.", "bad_request");
  if (!options.all && (!Array.isArray(options.domains) || !options.domains.length))
    throw new CookieImportError("Select at least one cookie domain.", "bad_request");
  const selected = options.domains?.map(normalizeCookieDomain) ?? [];
  const needsTarget = options.clearStorage || options.verifyAuth;
  const targetUrl = needsTarget ? validateCookieTarget(target) : undefined;
  if (options.clearStorage)
    validateCookieStorageSupport(target.page);
  if (options.verifyAuth)
    validateCookieAuthOptions(authOptions);
  if (targetUrl && selected.length && !selected.some((domain) => cookieDomainMatches(targetUrl.hostname, "." + domain))) {
    throw new CookieImportError("The selected cookies do not match the captured target origin.", "target_mismatch");
  }
  const context = target.page.context();
  if (target.page.isClosed())
    throw new CookieImportError("The captured target is closed.", "target_closed");
  if (activeImports.has(context))
    throw new CookieImportError("Another cookie import is still running. Wait before retrying.", "import_busy", "retry");
  activeImports.add(context);
  try {
    let profile = options.profile;
    if (!profile) {
      const suggestion = await getCookieProfiles(options.browser, selected);
      profile = suggestion.recommendedProfile;
      if (!profile)
        throw profileSelectionError(options.browser, suggestion.profiles, selected);
    }
    const domains = options.all ? (await withCookieReadRetry(() => listDomains(options.browser, profile))).domains.map((entry) => entry.domain) : selected;
    let result = await withCookieReadRetry(() => importCookies(options.browser, domains, profile));
    const appBound = process.platform === "win32" && result.failureReasons?.unsupported_encryption && !resolveBrowserInfo(options.browser).windowsNative ? appBoundMessage(options.browser, result) : undefined;
    if (!appBound && result.count === 0 && result.failureReasons?.unsupported_encryption && process.platform === "win32") {
      const failed = result.failed;
      result = await importCookiesViaCdp(options.browser, domains, profile);
      result.failed = Math.max(result.failed, failed - result.count);
      if (result.failed)
        result.failureReasons = { native_unrecovered: result.failed };
    }
    const receipt = {
      browser: options.browser,
      profile,
      imported: 0,
      failed: result.failed,
      domainCounts: {},
      failureReasons: result.failureReasons ?? {},
      outcome: result.failed ? "failed" : "empty",
      reset: "not_requested",
      verification: { verified: false, reason: "not_requested" },
      message: appBound ?? (result.failed ? "No cookies imported; cookies could not be decrypted." : "No matching cookies found.")
    };
    if (!result.count) {
      if (options.verifyAuth)
        receipt.verification.reason = "no_cookies_imported";
      return receipt;
    }
    if (targetUrl && !result.cookies.some((cookie) => cookieDomainMatches(targetUrl.hostname, cookie.domain))) {
      throw new CookieImportError("No imported cookies apply to the captured target origin.", "target_mismatch");
    }
    if (target.page.isClosed())
      throw new CookieImportError("The captured target is closed.", "target_closed");
    if (needsTarget)
      validateCookieTarget(target);
    if (options.clearStorage) {
      try {
        await clearCookieTargetStorage(target.page, targetUrl.origin);
        receipt.reset = "cleared";
      } catch {
        receipt.outcome = "failed";
        receipt.reset = "failed";
        receipt.message = "Storage reset did not complete; storage may be partially cleared. No new cookies were applied.";
        receipt.verification.reason = "reset_failed";
        return receipt;
      }
    }
    const appliedDomains = [...new Set(result.cookies.map((cookie) => cookie.domain))];
    try {
      await context.addCookies(result.cookies);
    } catch {
      trackDomains(appliedDomains);
      receipt.outcome = "failed";
      receipt.message = "Cookie application failed; the browser may contain a partial import. Authentication was not verified.";
      receipt.verification.reason = "application_failed";
      return receipt;
    }
    trackDomains(appliedDomains);
    receipt.imported = result.count;
    receipt.domainCounts = result.domainCounts;
    receipt.outcome = result.failed ? "partial" : "imported";
    receipt.message = appBound ?? (result.failed ? "Some cookies could not be decrypted." : "Cookie copy complete.");
    if (options.verifyAuth) {
      try {
        validateCookieTarget(target);
        receipt.verification = await verifyCookieAuthentication(target.page, authOptions, targetUrl.origin);
      } catch {
        receipt.verification = { verified: false, reason: "target_changed" };
      }
    }
    return receipt;
  } finally {
    activeImports.delete(context);
  }
}
function formatCookieImportResult(result) {
  const reasons = Object.entries(result.failureReasons).sort(([a], [b]) => a.localeCompare(b)).map(([key, count]) => `${key}=${count}`);
  const reasonText = reasons.length ? ` Failure reasons: ${reasons.join(", ")}.` : "";
  return `Imported ${result.imported} cookies from ${result.browser} (profile: ${result.profile}); ${result.failed} failed to decrypt. ${result.message}${reasonText} Storage reset: ${result.reset}. Authentication: ${result.verification.reason}.`;
}
var activeImports;
var init_cookie_import_operation = __esm(() => {
  init_cookie_import_browser();
  init_cookie_auth_verification();
  activeImports = new WeakSet;
});

// browse/src/cookie-picker-routes.ts
import * as crypto3 from "crypto";
function generatePickerCode(context = {}) {
  const code = crypto3.randomUUID();
  pendingCodes.set(code, { ...context, expiry: Date.now() + CODE_TTL_MS });
  return code;
}
function hasActivePicker() {
  const now = Date.now();
  for (const [code, context] of pendingCodes) {
    if (context.expiry > now)
      return true;
    pendingCodes.delete(code);
  }
  for (const [session, context] of validSessions) {
    if (context.expiry > now)
      return true;
    validSessions.delete(session);
  }
  return false;
}
function getSessionFromCookie(req) {
  const cookie = req.headers.get("cookie");
  if (!cookie)
    return null;
  const match = cookie.match(/gstack_picker=([^;]+)/);
  return match ? match[1] : null;
}
function isValidSession(session) {
  const context = validSessions.get(session);
  if (!context)
    return false;
  if (Date.now() >= context.expiry) {
    validSessions.delete(session);
    return false;
  }
  return true;
}
function corsOrigin(port) {
  return `http://127.0.0.1:${port}`;
}
function jsonResponse(data, opts) {
  return new Response(JSON.stringify(data), {
    status: opts.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": corsOrigin(opts.port)
    }
  });
}
function errorResponse(message, code, opts) {
  return jsonResponse({ error: message, code, ...opts.action ? { action: opts.action } : {} }, { port: opts.port, status: opts.status ?? 400 });
}
async function handleCookiePickerRoute(url, req, bm, authToken) {
  const pathname = url.pathname;
  const port = parseInt(url.port, 10) || 9400;
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": corsOrigin(port),
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Gstack-Picker-Instance"
      }
    });
  }
  try {
    if (pathname === "/cookie-picker" && req.method === "GET") {
      const code = url.searchParams.get("code");
      if (code) {
        const context = pendingCodes.get(code);
        if (!context || Date.now() >= context.expiry) {
          pendingCodes.delete(code);
          return new Response("Invalid or expired code. Re-run cookie-import-browser.", {
            status: 403,
            headers: { "Content-Type": "text/plain" }
          });
        }
        pendingCodes.delete(code);
        const session = crypto3.randomUUID();
        validSessions.set(session, { ...context, expiry: Date.now() + SESSION_TTL_MS, pickerInstance: crypto3.randomUUID() });
        return new Response(null, {
          status: 302,
          headers: {
            Location: "/cookie-picker",
            "Set-Cookie": `gstack_picker=${session}; HttpOnly; SameSite=Strict; Path=/cookie-picker; Max-Age=3600`,
            "Cache-Control": "no-store"
          }
        });
      }
      const session = getSessionFromCookie(req);
      if (session && isValidSession(session)) {
        const context = validSessions.get(session);
        let targetOrigin;
        let storageResetAvailable = false;
        try {
          const url = new URL(context.target?.url ?? "");
          if (["http:", "https:"].includes(url.protocol))
            targetOrigin = url.origin;
        } catch {}
        if (context.target) {
          try {
            validateCookieStorageSupport(context.target.page);
            storageResetAvailable = true;
          } catch {}
        }
        const html = getCookiePickerHTML(port, {
          pickerInstance: context.pickerInstance,
          browser: context.browser,
          profile: context.profile,
          clearStorage: context.clearStorage,
          verifyAuth: context.verifyAuth,
          targetOrigin,
          storageResetAvailable,
          verificationAvailable: !!process.env.GSTACK_COOKIE_AUTH_SELECTOR?.trim() && !!process.env.GSTACK_COOKIE_AUTH_EXPECTED_IDENTITY?.trim()
        });
        return new Response(html, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
      return new Response("Access denied. Open the cookie picker from gstack.", {
        status: 403,
        headers: { "Content-Type": "text/plain" }
      });
    }
    const authHeader = req.headers.get("authorization");
    const sessionId = getSessionFromCookie(req);
    const hasBearer = !!authToken && !!authHeader && authHeader === `Bearer ${authToken}`;
    const hasSession = sessionId !== null && isValidSession(sessionId);
    if (!hasBearer && !hasSession) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (req.method === "POST" && !hasBearer && req.headers.get("origin") !== url.origin) {
      return errorResponse("Cookie picker mutations require a same-origin request.", "invalid_origin", { port, status: 403 });
    }
    const pickerContext = !hasBearer && hasSession ? validSessions.get(sessionId) : undefined;
    if (pickerContext && req.headers.get("X-Gstack-Picker-Instance") !== pickerContext.pickerInstance) {
      return errorResponse("This picker no longer matches the active picker session. Reopen the picker from the intended page before continuing.", "picker_changed", { port, status: 403 });
    }
    if (pathname === "/cookie-picker/browsers" && req.method === "GET") {
      const browsers = findInstalledBrowsers();
      return jsonResponse({
        browsers: browsers.map((b) => ({
          name: b.name,
          aliases: b.aliases
        }))
      }, { port });
    }
    if (pathname === "/cookie-picker/profiles" && req.method === "GET") {
      const browserName = url.searchParams.get("browser");
      if (!browserName) {
        return errorResponse("Missing 'browser' parameter", "missing_param", { port });
      }
      let hostname;
      try {
        hostname = new URL(pickerContext?.target?.url ?? "").hostname || undefined;
      } catch {}
      return jsonResponse(await getCookieProfiles(browserName, [], hostname), { port });
    }
    if (pathname === "/cookie-picker/domains" && req.method === "GET") {
      const browserName = url.searchParams.get("browser");
      if (!browserName) {
        return errorResponse("Missing 'browser' parameter", "missing_param", { port });
      }
      const profile = url.searchParams.get("profile") || "Default";
      const result = await withCookieReadRetry(() => listDomains(browserName, profile));
      return jsonResponse({
        browser: result.browser,
        domains: result.domains
      }, { port });
    }
    if (pathname === "/cookie-picker/import" && req.method === "POST") {
      let body;
      try {
        body = await req.json();
      } catch {
        return errorResponse("Invalid JSON body", "bad_request", { port });
      }
      const { browser, domains, profile, clearStorage, verifyAuth } = body ?? {};
      if (!browser)
        return errorResponse("Missing 'browser' field", "missing_param", { port });
      if (!domains || !Array.isArray(domains) || domains.length === 0) {
        return errorResponse("Missing or empty 'domains' array", "missing_param", { port });
      }
      const page = pickerContext?.target?.page ?? bm.getActiveSession().getPage();
      const target = pickerContext?.target ?? { page, url: page.url() };
      const result = await runCookieImport({
        browser,
        domains,
        profile,
        clearStorage: clearStorage ?? pickerContext?.clearStorage ?? false,
        verifyAuth: verifyAuth ?? pickerContext?.verifyAuth ?? false
      }, target, (domains) => bm.trackCookieImportDomains(domains), {
        identitySelector: process.env.GSTACK_COOKIE_AUTH_SELECTOR,
        expectedIdentity: process.env.GSTACK_COOKIE_AUTH_EXPECTED_IDENTITY
      });
      for (const domain of Object.keys(result.domainCounts)) {
        importedDomains.add(domain);
        importedCounts.set(domain, result.domainCounts[domain]);
      }
      return jsonResponse(result, { port });
    }
    if (pathname === "/cookie-picker/remove" && req.method === "POST") {
      let body;
      try {
        body = await req.json();
      } catch {
        return errorResponse("Invalid JSON body", "bad_request", { port });
      }
      const { domains } = body;
      if (!domains || !Array.isArray(domains) || domains.length === 0) {
        return errorResponse("Missing or empty 'domains' array", "missing_param", { port });
      }
      const page = bm.getActiveSession().getPage();
      const context = page.context();
      for (const domain of domains) {
        await context.clearCookies({ domain });
        importedDomains.delete(domain);
        importedCounts.delete(domain);
      }
      console.log(`[cookie-picker] Removed cookies for ${domains.length} domains`);
      return jsonResponse({
        removed: domains.length,
        domains
      }, { port });
    }
    if (pathname === "/cookie-picker/imported" && req.method === "GET") {
      const entries = [];
      for (const domain of importedDomains) {
        entries.push({ domain, count: importedCounts.get(domain) || 0 });
      }
      entries.sort((a, b) => b.count - a.count);
      return jsonResponse({
        domains: entries,
        totalDomains: entries.length,
        totalCookies: entries.reduce((sum, e) => sum + e.count, 0)
      }, { port });
    }
    return new Response("Not found", { status: 404 });
  } catch (err) {
    if (err instanceof CookieImportError) {
      return errorResponse(err.message, err.code, { port, status: 400, action: err.action });
    }
    console.error("[cookie-picker] Operation failed");
    return errorResponse("Cookie picker operation failed. Retry or reopen the picker.", "internal_error", { port, status: 500 });
  }
}
var pendingCodes, CODE_TTL_MS, validSessions, SESSION_TTL_MS = 3600000, importedDomains, importedCounts;
var init_cookie_picker_routes = __esm(() => {
  init_cookie_import_browser();
  init_cookie_import_operation();
  init_cookie_auth_verification();
  pendingCodes = new Map;
  CODE_TTL_MS = 5 * 60000;
  validSessions = new Map;
  importedDomains = new Set;
  importedCounts = new Map;
});

// browse/src/screenshot-size-guard.ts
import { writeFileSync as writeFileSync6, readFileSync as readFileSync8 } from "fs";
async function guardScreenshotBuffer(input) {
  const sharpModule = await import("sharp");
  const sharp = sharpModule.default ?? sharpModule;
  const image = sharp(input);
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const longest = Math.max(width, height);
  if (longest <= MAX_DIMENSION_PX) {
    return {
      buffer: input,
      result: {
        resized: false,
        width,
        height,
        originalWidth: width,
        originalHeight: height
      }
    };
  }
  const scale = MAX_DIMENSION_PX / longest;
  const newWidth = Math.round(width * scale);
  const newHeight = Math.round(height * scale);
  const resized = await image.resize(newWidth, newHeight, { fit: "inside" }).png().toBuffer();
  process.stderr.write(`[screenshot-size-guard] image ${width}x${height} exceeded ${MAX_DIMENSION_PX}px max-dim; downscaled to ${newWidth}x${newHeight} to fit Anthropic vision API
`);
  return {
    buffer: resized,
    result: {
      resized: true,
      width: newWidth,
      height: newHeight,
      originalWidth: width,
      originalHeight: height
    }
  };
}
async function guardScreenshotPath(filePath) {
  const input = readFileSync8(filePath);
  const { buffer, result } = await guardScreenshotBuffer(input);
  if (result.resized) {
    writeFileSync6(filePath, buffer);
  }
  return result;
}
var MAX_DIMENSION_PX = 2000;
var init_screenshot_size_guard = () => {};

// browse/src/write-commands.ts
import * as fs15 from "fs";
import * as path14 from "path";
async function handleWriteCommand(command, args, session, bm) {
  const page = session.getPage();
  const target = session.getActiveFrameOrPage();
  const inFrame = session.getFrame() !== null;
  switch (command) {
    case "goto": {
      if (inFrame)
        throw new Error("Cannot use goto inside a frame. Run 'frame main' first.");
      const url = args[0];
      if (!url)
        throw new Error("Usage: browse goto <url>");
      session.clearLoadedHtml();
      const normalizedUrl = await validateNavigationUrl(url);
      const response = await page.goto(normalizedUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      const status = response?.status() || "unknown";
      return `Navigated to ${normalizedUrl} (${status})`;
    }
    case "back": {
      if (inFrame)
        throw new Error("Cannot use back inside a frame. Run 'frame main' first.");
      session.clearLoadedHtml();
      await page.goBack({ waitUntil: "domcontentloaded", timeout: 15000 });
      return `Back → ${page.url()}`;
    }
    case "forward": {
      if (inFrame)
        throw new Error("Cannot use forward inside a frame. Run 'frame main' first.");
      session.clearLoadedHtml();
      await page.goForward({ waitUntil: "domcontentloaded", timeout: 15000 });
      return `Forward → ${page.url()}`;
    }
    case "reload": {
      if (inFrame)
        throw new Error("Cannot use reload inside a frame. Run 'frame main' first.");
      session.clearLoadedHtml();
      await page.reload({ waitUntil: "domcontentloaded", timeout: 15000 });
      return `Reloaded ${page.url()}`;
    }
    case "load-html": {
      if (inFrame)
        throw new Error("Cannot use load-html inside a frame. Run 'frame main' first.");
      let fromFilePayload = null;
      let filePath;
      let waitUntil = "domcontentloaded";
      for (let i = 0;i < args.length; i++) {
        if (args[i] === "--from-file") {
          const payloadPath = args[++i];
          if (!payloadPath)
            throw new Error("load-html: --from-file requires a path");
          try {
            validateReadPath(path14.resolve(payloadPath));
          } catch {
            throw new Error(`load-html: --from-file ${payloadPath} must be under ${SAFE_DIRECTORIES.join(" or ")} (security policy). Copy the payload into the project tree or /tmp first.`);
          }
          const raw = fs15.readFileSync(payloadPath, "utf8");
          let json;
          try {
            json = JSON.parse(raw);
          } catch (e) {
            throw new Error(`load-html: --from-file JSON parse failed: ${e.message}`);
          }
          if (typeof json.html !== "string") {
            throw new Error('load-html: --from-file JSON must have a "html" string field');
          }
          if (json.waitUntil && json.waitUntil !== "load" && json.waitUntil !== "domcontentloaded" && json.waitUntil !== "networkidle") {
            throw new Error(`load-html: --from-file waitUntil '${json.waitUntil}' invalid`);
          }
          fromFilePayload = { html: json.html, waitUntil: json.waitUntil };
        } else if (args[i] === "--wait-until") {
          const val = args[++i];
          if (val !== "load" && val !== "domcontentloaded" && val !== "networkidle") {
            throw new Error(`Invalid --wait-until '${val}'. Must be one of: load, domcontentloaded, networkidle.`);
          }
          waitUntil = val;
        } else if (args[i].startsWith("--")) {
          throw new Error(`Unknown flag: ${args[i]}`);
        } else if (!filePath) {
          filePath = args[i];
        }
      }
      if (fromFilePayload) {
        const MAX_BYTES = parseInt(process.env.GSTACK_BROWSE_MAX_HTML_BYTES || "", 10) || 50 * 1024 * 1024;
        if (Buffer.byteLength(fromFilePayload.html, "utf8") > MAX_BYTES) {
          throw new Error(`load-html: --from-file html too large (> ${MAX_BYTES} bytes). ` + "Raise with GSTACK_BROWSE_MAX_HTML_BYTES=<N>.");
        }
        const peek = fromFilePayload.html.trimStart();
        if (!/^<[a-zA-Z!?]/.test(peek)) {
          throw new Error("load-html: --from-file html does not start with a valid markup opener");
        }
        const finalWaitUntil = fromFilePayload.waitUntil ?? waitUntil;
        await session.setTabContent(fromFilePayload.html, { waitUntil: finalWaitUntil });
        return `Loaded HTML: (inline from --from-file, ${fromFilePayload.html.length} chars)`;
      }
      if (!filePath)
        throw new Error("Usage: browse load-html <file> [--wait-until load|domcontentloaded|networkidle] [--tab-id <N>]  |  load-html --from-file <payload.json> [--tab-id <N>]");
      const ALLOWED_EXT = [".html", ".htm", ".xhtml"];
      const ext = path14.extname(filePath).toLowerCase();
      if (!ALLOWED_EXT.includes(ext)) {
        throw new Error(`load-html: file does not appear to be HTML. Expected .html/.htm/.xhtml, got ${ext || "(no extension)"}. Rename the file if it's really HTML.`);
      }
      const absolutePath = path14.resolve(filePath);
      try {
        validateReadPath(absolutePath);
      } catch (e) {
        throw new Error(`load-html: ${absolutePath} must be under ${SAFE_DIRECTORIES.join(" or ")} (security policy). Copy the file into the project tree or /tmp first.`);
      }
      let stat;
      try {
        stat = await fs15.promises.stat(absolutePath);
      } catch (e) {
        if (e.code === "ENOENT") {
          throw new Error(`load-html: file not found at ${absolutePath}. Check spelling or copy the file under ${process.cwd()} or ${TEMP_DIR}.`);
        }
        throw e;
      }
      if (stat.isDirectory()) {
        throw new Error(`load-html: ${absolutePath} is a directory, not a file. Pass a .html file.`);
      }
      if (!stat.isFile()) {
        throw new Error(`load-html: ${absolutePath} is not a regular file.`);
      }
      const MAX_BYTES = parseInt(process.env.GSTACK_BROWSE_MAX_HTML_BYTES || "", 10) || 50 * 1024 * 1024;
      if (stat.size > MAX_BYTES) {
        throw new Error(`load-html: file too large (${stat.size} bytes > ${MAX_BYTES} cap). Raise with GSTACK_BROWSE_MAX_HTML_BYTES=<N> or split the HTML.`);
      }
      const buf = await fs15.promises.readFile(absolutePath);
      let peek = buf.slice(0, 200);
      if (peek[0] === 239 && peek[1] === 187 && peek[2] === 191) {
        peek = peek.slice(3);
      }
      const peekStr = peek.toString("utf8").trimStart();
      const looksLikeMarkup = /^<[a-zA-Z!?]/.test(peekStr);
      if (!looksLikeMarkup) {
        const hexDump = Array.from(buf.slice(0, 16)).map((b) => b.toString(16).padStart(2, "0")).join(" ");
        throw new Error(`load-html: ${absolutePath} has ${ext} extension but content does not look like HTML. First bytes: ${hexDump}`);
      }
      const html = buf.toString("utf8");
      await session.setTabContent(html, { waitUntil });
      return `Loaded HTML: ${absolutePath} (${stat.size} bytes)`;
    }
    case "click": {
      const selector = args[0];
      if (!selector)
        throw new Error("Usage: browse click <selector>");
      const role = session.getRefRole(selector);
      if (role === "option") {
        const resolved = await session.resolveRef(selector);
        if ("locator" in resolved) {
          const optionInfo = await resolved.locator.evaluate((el) => {
            if (el.tagName !== "OPTION")
              return null;
            const option = el;
            const select = option.closest("select");
            if (!select)
              return null;
            return { value: option.value, text: option.text };
          });
          if (optionInfo) {
            await resolved.locator.locator("xpath=ancestor::select").selectOption(optionInfo.value, { timeout: 5000 });
            return `Selected "${optionInfo.text}" (auto-routed from click on <option>) → now at ${page.url()}`;
          }
        }
      }
      const resolved = await session.resolveRef(selector);
      try {
        if ("locator" in resolved) {
          await resolved.locator.click({ timeout: 5000 });
        } else {
          await target.locator(resolved.selector).click({ timeout: 5000 });
        }
      } catch (err) {
        const isOption = "locator" in resolved ? await resolved.locator.evaluate((el) => el.tagName === "OPTION").catch(() => false) : await target.locator(resolved.selector).evaluate((el) => el.tagName === "OPTION").catch(() => false);
        if (isOption) {
          throw new Error(`Cannot click <option> elements. Use 'browse select <parent-select> <value>' instead of 'click' for dropdown options.`);
        }
        throw err;
      }
      await page.waitForLoadState("networkidle", { timeout: 2000 }).catch(() => {});
      return `Clicked ${selector} → now at ${page.url()}`;
    }
    case "fill": {
      const [selector, ...valueParts] = args;
      const value = valueParts.join(" ");
      if (!selector || !value)
        throw new Error("Usage: browse fill <selector> <value>");
      const resolved = await session.resolveRef(selector);
      const locator = "locator" in resolved ? resolved.locator : target.locator(resolved.selector);
      await locator.fill(value, { timeout: 5000 });
      await locator.dispatchEvent("change");
      await page.waitForLoadState("networkidle", { timeout: 2000 }).catch(() => {});
      return `Filled ${selector}`;
    }
    case "select": {
      const [selector, ...valueParts] = args;
      const value = valueParts.join(" ");
      if (!selector || !value)
        throw new Error("Usage: browse select <selector> <value>");
      const resolved = await session.resolveRef(selector);
      if ("locator" in resolved) {
        await resolved.locator.selectOption(value, { timeout: 5000 });
      } else {
        await target.locator(resolved.selector).selectOption(value, { timeout: 5000 });
      }
      await page.waitForLoadState("networkidle", { timeout: 2000 }).catch(() => {});
      return `Selected "${value}" in ${selector}`;
    }
    case "hover": {
      const selector = args[0];
      if (!selector)
        throw new Error("Usage: browse hover <selector>");
      const resolved = await session.resolveRef(selector);
      if ("locator" in resolved) {
        await resolved.locator.hover({ timeout: 5000 });
      } else {
        await target.locator(resolved.selector).hover({ timeout: 5000 });
      }
      return `Hovered ${selector}`;
    }
    case "type": {
      const usage = "Usage: browse type [--selector <sel>] [--] <text>";
      let rest = args;
      let selector;
      if (rest[0] === "--selector") {
        selector = rest[1];
        if (!selector)
          throw new Error(usage);
        rest = rest.slice(2);
      }
      if (rest[0] === "--")
        rest = rest.slice(1);
      const text = rest.join(" ");
      if (!text)
        throw new Error(usage);
      if (selector) {
        const resolved = await session.resolveRef(selector);
        const locator = "locator" in resolved ? resolved.locator : target.locator(resolved.selector);
        await locator.pressSequentially(text, { timeout: 5000 });
        return `Typed ${text.length} characters into ${selector}`;
      }
      await page.keyboard.type(text);
      const first = rest[0];
      const selectorLike = /^([#.][A-Za-z_-]|\[[^\]]+\]$|[A-Za-z][\w-]*[#.[][A-Za-z_-])/.test(first) || rest.includes(">");
      return selectorLike ? `Typed ${text.length} characters into the focused element
hint: "${first}" looks like a CSS selector. To type into that element: browse type --selector '${first}' <text>` : `Typed ${text.length} characters`;
    }
    case "press": {
      const key = args[0];
      if (!key)
        throw new Error("Usage: browse press <key> (e.g., Enter, Tab, Escape)");
      await page.keyboard.press(key);
      return `Pressed ${key}`;
    }
    case "scroll": {
      const timesIdx = args.indexOf("--times");
      const times = timesIdx >= 0 ? parseInt(args[timesIdx + 1], 10) || 1 : 0;
      const waitIdx = args.indexOf("--wait");
      const waitMs = waitIdx >= 0 ? parseInt(args[waitIdx + 1], 10) || 1000 : 1000;
      const selector = args.find((a) => !a.startsWith("--") && args.indexOf(a) !== timesIdx + 1 && args.indexOf(a) !== waitIdx + 1);
      if (times > 0) {
        for (let i = 0;i < times; i++) {
          if (selector) {
            const resolved = await bm.resolveRef(selector);
            if ("locator" in resolved) {
              await resolved.locator.scrollIntoViewIfNeeded({ timeout: 5000 });
            } else {
              await target.locator(resolved.selector).scrollIntoViewIfNeeded({ timeout: 5000 });
            }
          } else {
            await target.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          }
          if (i < times - 1)
            await new Promise((r) => setTimeout(r, waitMs));
        }
        return `Scrolled ${times} times${selector ? ` (${selector})` : ""} with ${waitMs}ms delay`;
      }
      if (selector) {
        const resolved = await session.resolveRef(selector);
        if ("locator" in resolved) {
          await resolved.locator.scrollIntoViewIfNeeded({ timeout: 5000 });
        } else {
          await target.locator(resolved.selector).scrollIntoViewIfNeeded({ timeout: 5000 });
        }
        return `Scrolled ${selector} into view`;
      }
      await target.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      return "Scrolled to bottom";
    }
    case "wait": {
      const selector = args[0];
      if (!selector)
        throw new Error("Usage: browse wait <selector|--networkidle|--load|--domcontentloaded>");
      if (selector === "--networkidle") {
        const MAX_WAIT_MS = 300000;
        const MIN_WAIT_MS = 1000;
        const timeout = Math.min(Math.max(args[1] ? parseInt(args[1], 10) || MIN_WAIT_MS : 15000, MIN_WAIT_MS), MAX_WAIT_MS);
        await page.waitForLoadState("networkidle", { timeout });
        return "Network idle";
      }
      if (selector === "--load") {
        await page.waitForLoadState("load");
        return "Page loaded";
      }
      if (selector === "--domcontentloaded") {
        await page.waitForLoadState("domcontentloaded");
        return "DOM content loaded";
      }
      const MAX_WAIT_MS = 300000;
      const MIN_WAIT_MS = 1000;
      const timeout = Math.min(Math.max(args[1] ? parseInt(args[1], 10) || MIN_WAIT_MS : 15000, MIN_WAIT_MS), MAX_WAIT_MS);
      const resolved = await session.resolveRef(selector);
      if ("locator" in resolved) {
        await resolved.locator.waitFor({ state: "visible", timeout });
      } else {
        await target.locator(resolved.selector).waitFor({ state: "visible", timeout });
      }
      return `Element ${selector} appeared`;
    }
    case "viewport": {
      let sizeArg;
      let scaleArg;
      for (let i = 0;i < args.length; i++) {
        if (args[i] === "--scale") {
          const val = args[++i];
          if (val === undefined || val === "") {
            throw new Error("viewport --scale: missing value. Usage: viewport [WxH] --scale <n>");
          }
          const parsed = Number(val);
          if (!Number.isFinite(parsed)) {
            throw new Error(`viewport --scale: value '${val}' is not a finite number.`);
          }
          scaleArg = parsed;
        } else if (args[i].startsWith("--")) {
          throw new Error(`Unknown viewport flag: ${args[i]}`);
        } else if (sizeArg === undefined) {
          sizeArg = args[i];
        } else {
          throw new Error(`Unexpected positional arg: ${args[i]}. Usage: viewport [WxH|auto] [--scale <n>]`);
        }
      }
      if (sizeArg === undefined && scaleArg === undefined) {
        throw new Error("Usage: browse viewport [<WxH>|auto] [--scale <n>]  (e.g. 375x812, auto to unpin, or --scale 2 to keep current size)");
      }
      if (sizeArg !== undefined && ["auto", "reset", "unpin"].includes(sizeArg.toLowerCase())) {
        if (scaleArg !== undefined)
          throw new Error("viewport auto cannot be combined with --scale or a size.");
        return await bm.resetViewport() === "window" ? "Viewport unpinned: the page follows the browser window again (refs cleared)" : "Viewport reset to default 1280x720";
      }
      let w, h;
      if (sizeArg) {
        if (!sizeArg.includes("x"))
          throw new Error("Usage: browse viewport [<WxH>|auto] [--scale <n>] (e.g., 375x812)");
        const [rawW, rawH] = sizeArg.split("x").map(Number);
        w = Math.min(Math.max(Math.round(rawW) || 1280, 1), 16384);
        h = Math.min(Math.max(Math.round(rawH) || 720, 1), 16384);
      } else {
        const current = bm.getCurrentViewport();
        w = current.width;
        h = current.height;
      }
      if (scaleArg !== undefined) {
        const err = await bm.setDeviceScaleFactor(scaleArg, w, h);
        if (err)
          return `Viewport partially set: ${err}`;
        return `Viewport set to ${w}x${h} @ ${scaleArg}x (context recreated; refs and load-html content replayed)`;
      }
      await bm.setViewport(w, h);
      return `Viewport set to ${w}x${h}`;
    }
    case "cookie": {
      const cookieStr = args[0];
      if (!cookieStr || !cookieStr.includes("="))
        throw new Error("Usage: browse cookie <name>=<value>");
      const eq = cookieStr.indexOf("=");
      const name = cookieStr.slice(0, eq);
      const value = cookieStr.slice(eq + 1);
      const url = new URL(page.url());
      await page.context().addCookies([{
        name,
        value,
        domain: url.hostname,
        path: "/"
      }]);
      return `Cookie set: ${name}=****`;
    }
    case "header": {
      const headerStr = args[0];
      if (!headerStr || !headerStr.includes(":"))
        throw new Error("Usage: browse header <name>:<value>");
      const sep = headerStr.indexOf(":");
      const name = headerStr.slice(0, sep).trim();
      const value = headerStr.slice(sep + 1).trim();
      await bm.setExtraHeader(name, value);
      const sensitiveHeaders = ["authorization", "cookie", "set-cookie", "x-api-key", "x-auth-token"];
      const redactedValue = sensitiveHeaders.includes(name.toLowerCase()) ? "****" : value;
      return `Header set: ${name}: ${redactedValue}`;
    }
    case "useragent": {
      const ua = args.join(" ");
      if (!ua)
        throw new Error("Usage: browse useragent <string>");
      bm.setUserAgent(ua);
      const error = await bm.recreateContext();
      if (error) {
        return `User agent set to "${ua}" but: ${error}`;
      }
      return `User agent set: ${ua}`;
    }
    case "upload": {
      const [selector, ...filePaths] = args;
      if (!selector || filePaths.length === 0)
        throw new Error("Usage: browse upload <selector> <file1> [file2...]");
      const validatedPaths = filePaths.map((fp) => {
        if (!fs15.existsSync(fp))
          throw new Error(`File not found: ${fp}`);
        const realPath = fs15.realpathSync(path14.resolve(fp));
        validateReadPath(realPath);
        return realPath;
      });
      const resolved = await session.resolveRef(selector);
      if ("locator" in resolved) {
        await resolved.locator.setInputFiles(validatedPaths);
      } else {
        await target.locator(resolved.selector).setInputFiles(validatedPaths);
      }
      const fileInfo = validatedPaths.map((fp) => {
        const stat = fs15.statSync(fp);
        return `${path14.basename(fp)} (${stat.size}B)`;
      }).join(", ");
      return `Uploaded: ${fileInfo}`;
    }
    case "dialog-accept": {
      const text = args.length > 0 ? args.join(" ") : null;
      bm.setDialogAutoAccept(true);
      bm.setDialogPromptText(text);
      return text ? `Dialogs will be accepted with text: "${text}"` : "Dialogs will be accepted";
    }
    case "dialog-dismiss": {
      bm.setDialogAutoAccept(false);
      bm.setDialogPromptText(null);
      return "Dialogs will be dismissed";
    }
    case "cookie-import": {
      const filePath = args[0];
      if (!filePath)
        throw new Error("Usage: browse cookie-import <json-file>");
      validateReadPath(filePath);
      if (!fs15.existsSync(filePath))
        throw new Error(`File not found: ${filePath}`);
      const raw = fs15.readFileSync(filePath, "utf-8");
      let cookies;
      try {
        cookies = JSON.parse(raw);
      } catch (err) {
        throw new Error(`Invalid JSON in ${filePath}: ${err?.message || err}`);
      }
      if (!Array.isArray(cookies))
        throw new Error("Cookie file must contain a JSON array");
      const pageUrl = new URL(page.url());
      const defaultDomain = pageUrl.hostname;
      for (const c of cookies) {
        if (!c.name || c.value === undefined)
          throw new Error('Each cookie must have "name" and "value" fields');
        if (!c.domain) {
          c.domain = defaultDomain;
        } else {
          const cookieDomain = c.domain.startsWith(".") ? c.domain.slice(1) : c.domain;
          if (cookieDomain !== defaultDomain && !defaultDomain.endsWith("." + cookieDomain)) {
            throw new Error(`Cookie domain "${c.domain}" does not match current page domain "${defaultDomain}". Use the target site first.`);
          }
        }
        if (!c.path)
          c.path = "/";
      }
      await page.context().addCookies(cookies);
      const importedDomains = [...new Set(cookies.map((c) => c.domain).filter(Boolean))];
      if (importedDomains.length > 0)
        bm.trackCookieImportDomains(importedDomains);
      return `Loaded ${cookies.length} cookies from ${filePath}`;
    }
    case "cookie-import-browser": {
      const options = parseCookieImportArgs(args);
      const target = { page, url: page.url() };
      const authOptions = {
        identitySelector: process.env.GSTACK_COOKIE_AUTH_SELECTOR,
        expectedIdentity: process.env.GSTACK_COOKIE_AUTH_EXPECTED_IDENTITY
      };
      if (options.domains || options.all) {
        if (options.domains) {
          const targetUrl = validateCookieTarget(target);
          if (!options.domains.every((domain) => cookieDomainMatches(targetUrl.hostname, "." + domain))) {
            throw new CookieImportError("The requested cookie domain does not match the current page. Navigate to the target site first.", "target_mismatch");
          }
        }
        const result = await runCookieImport(options, target, (domains) => bm.trackCookieImportDomains(domains), authOptions);
        const message = formatCookieImportResult(result);
        if (result.outcome === "failed" || options.verifyAuth && !result.verification.verified) {
          throw new CookieImportError(message, "cookie_import_incomplete");
        }
        return message + (options.all ? " Used --all: all source-profile cookie domains were selected." : "");
      }
      const port = bm.serverPort;
      if (!port)
        throw new CookieImportError("Server port not available", "unavailable");
      const browsers = findInstalledBrowsers();
      if (browsers.length === 0)
        throw new CookieImportError(`No Chromium browsers found. Supported: ${listSupportedBrowserNames().join(", ")}`, "not_installed");
      if (options.clearStorage || options.verifyAuth)
        validateCookieTarget(target);
      if (options.clearStorage)
        validateCookieStorageSupport(page);
      if (options.verifyAuth)
        validateCookieAuthOptions(authOptions);
      const code = generatePickerCode({
        target,
        browser: options.browser,
        profile: options.profile,
        clearStorage: options.clearStorage,
        verifyAuth: options.verifyAuth
      });
      const pickerUrl = `http://127.0.0.1:${port}/cookie-picker?code=${code}`;
      const openCommand = process.platform === "darwin" ? ["open", pickerUrl] : process.platform === "win32" ? ["cmd.exe", "/d", "/c", "start", "", pickerUrl] : ["xdg-open", pickerUrl];
      try {
        Bun.spawn(openCommand, { stdout: "ignore", stderr: "ignore", windowsHide: true });
      } catch {
        throw new CookieImportError("Could not open the cookie picker in a local browser. Retry from a desktop session.", "picker_open_failed");
      }
      return `Cookie picker opened at http://127.0.0.1:${port}/cookie-picker
Detected browsers: ${browsers.map((b) => b.name).join(", ")}
Select the source profile and domains. Cookies copied does not mean sign-in verified.`;
    }
    case "style": {
      if (args[0] === "--undo") {
        const idx = args[1] ? parseInt(args[1], 10) : undefined;
        await undoModification(page, idx);
        return idx !== undefined ? `Reverted modification #${idx}` : "Reverted last modification";
      }
      const [selector, property, ...valueParts] = args;
      const value = valueParts.join(" ");
      if (!selector || !property || !value) {
        throw new Error("Usage: browse style <sel> <prop> <value> | style --undo [N]");
      }
      if (!/^[a-zA-Z-]+$/.test(property)) {
        throw new Error(`Invalid CSS property name: ${property}. Only letters and hyphens allowed.`);
      }
      const DANGEROUS_CSS = /url\s*\(|expression\s*\(|@import|javascript:|data:/i;
      if (DANGEROUS_CSS.test(value)) {
        throw new Error("CSS value rejected: contains potentially dangerous pattern.");
      }
      const mod = await modifyStyle(page, selector, property, value);
      return `Style modified: ${selector} { ${property}: ${mod.oldValue || "(none)"} → ${value} } (${mod.method})`;
    }
    case "cleanup": {
      let doAds = false, doCookies = false, doSticky = false, doSocial = false;
      let doOverlays = false, doClutter = false;
      let doAll = false;
      if (args.length === 0) {
        doAll = true;
      }
      for (const arg of args) {
        switch (arg) {
          case "--ads":
            doAds = true;
            break;
          case "--cookies":
            doCookies = true;
            break;
          case "--sticky":
            doSticky = true;
            break;
          case "--social":
            doSocial = true;
            break;
          case "--overlays":
            doOverlays = true;
            break;
          case "--clutter":
            doClutter = true;
            break;
          case "--all":
            doAll = true;
            break;
          default:
            throw new Error(`Unknown cleanup flag: ${arg}. Use: --ads, --cookies, --sticky, --social, --overlays, --clutter, --all`);
        }
      }
      if (doAll) {
        doAds = doCookies = doSticky = doSocial = doOverlays = doClutter = true;
      }
      const removed = [];
      const selectors = [];
      if (doAds)
        selectors.push(...CLEANUP_SELECTORS.ads);
      if (doCookies)
        selectors.push(...CLEANUP_SELECTORS.cookies);
      if (doSocial)
        selectors.push(...CLEANUP_SELECTORS.social);
      if (doOverlays)
        selectors.push(...CLEANUP_SELECTORS.overlays);
      if (doClutter)
        selectors.push(...CLEANUP_SELECTORS.clutter);
      if (selectors.length > 0) {
        const count = await page.evaluate((sels) => {
          let removed = 0;
          for (const sel of sels) {
            try {
              const els = document.querySelectorAll(sel);
              els.forEach((el) => {
                el.style.setProperty("display", "none", "important");
                removed++;
              });
            } catch (err) {
              if (!(err instanceof DOMException))
                throw err;
            }
          }
          return removed;
        }, selectors);
        if (count > 0) {
          if (doAds)
            removed.push("ads");
          if (doCookies)
            removed.push("cookie banners");
          if (doSocial)
            removed.push("social widgets");
          if (doOverlays)
            removed.push("overlays/popups");
          if (doClutter)
            removed.push("clutter");
        }
      }
      if (doSticky) {
        const stickyCount = await page.evaluate(() => {
          let removed = 0;
          const stickyEls = [];
          const allElements = document.querySelectorAll("*");
          const viewportWidth = window.innerWidth;
          for (const el of allElements) {
            const style = getComputedStyle(el);
            if (style.position === "fixed" || style.position === "sticky") {
              const rect = el.getBoundingClientRect();
              stickyEls.push({ el, top: rect.top, width: rect.width, height: rect.height });
            }
          }
          stickyEls.sort((a, b) => a.top - b.top);
          let preservedTopNav = false;
          for (const { el, top, width, height } of stickyEls) {
            const tag = el.tagName.toLowerCase();
            if (tag === "nav" || tag === "header")
              continue;
            if (el.getAttribute("role") === "navigation")
              continue;
            if (el.id === "gstack-ctrl")
              continue;
            if (!preservedTopNav && top <= 50 && width > viewportWidth * 0.8 && height < 120) {
              preservedTopNav = true;
              continue;
            }
            el.style.setProperty("display", "none", "important");
            removed++;
          }
          return removed;
        });
        if (stickyCount > 0)
          removed.push(`${stickyCount} sticky/fixed elements`);
      }
      const scrollFixed = await page.evaluate(() => {
        let fixed = 0;
        for (const el of [document.body, document.documentElement]) {
          if (!el)
            continue;
          const style = getComputedStyle(el);
          if (style.overflow === "hidden" || style.overflowY === "hidden") {
            el.style.setProperty("overflow", "auto", "important");
            el.style.setProperty("overflow-y", "auto", "important");
            fixed++;
          }
          if (style.position === "fixed" && (el === document.body || el === document.documentElement)) {
            el.style.setProperty("position", "static", "important");
            fixed++;
          }
        }
        const blurred = document.querySelectorAll('[style*="blur"], [style*="filter"]');
        blurred.forEach((el) => {
          const s = el.style;
          if (s.filter?.includes("blur") || s.webkitFilter?.includes("blur")) {
            s.setProperty("filter", "none", "important");
            s.setProperty("-webkit-filter", "none", "important");
            fixed++;
          }
        });
        const truncated = document.querySelectorAll('[class*="truncat"], [class*="preview"], [class*="teaser"]');
        truncated.forEach((el) => {
          const s = getComputedStyle(el);
          if (s.maxHeight && s.maxHeight !== "none" && parseInt(s.maxHeight) < 500) {
            el.style.setProperty("max-height", "none", "important");
            el.style.setProperty("overflow", "visible", "important");
            fixed++;
          }
        });
        return fixed;
      });
      if (scrollFixed > 0)
        removed.push("scroll unlocked");
      const adLabelCount = await page.evaluate(() => {
        let removed = 0;
        const adTextPatterns = [
          /^advertisement$/i,
          /^sponsored$/i,
          /^promoted$/i,
          /article continues/i,
          /continues below/i,
          /^ad$/i,
          /^paid content$/i,
          /^partner content$/i
        ];
        const candidates = document.querySelectorAll("div, span, p, figcaption, label");
        for (const el of candidates) {
          const text = (el.textContent || "").trim();
          if (text.length > 50)
            continue;
          if (adTextPatterns.some((p) => p.test(text))) {
            const parent = el.parentElement;
            if (parent && (parent.textContent || "").trim().length < 80) {
              parent.style.setProperty("display", "none", "important");
            } else {
              el.style.setProperty("display", "none", "important");
            }
            removed++;
          }
        }
        return removed;
      });
      if (adLabelCount > 0)
        removed.push(`${adLabelCount} ad labels`);
      const collapsedCount = await page.evaluate(() => {
        let collapsed = 0;
        const candidates = document.querySelectorAll('div[class*="ad"], div[id*="ad"], aside[class*="ad"], div[class*="sidebar"], ' + 'div[class*="rail"], div[class*="right-col"], div[class*="widget"]');
        for (const el of candidates) {
          const rect = el.getBoundingClientRect();
          if (rect.height > 50 && rect.width > 0) {
            const text = (el.textContent || "").trim();
            const images = el.querySelectorAll('img:not([src*="logo"]):not([src*="icon"])');
            const links = el.querySelectorAll("a");
            if (text.length < 20 && images.length === 0 && links.length < 2) {
              el.style.setProperty("display", "none", "important");
              collapsed++;
            }
          }
        }
        return collapsed;
      });
      if (collapsedCount > 0)
        removed.push(`${collapsedCount} empty placeholders`);
      if (removed.length === 0)
        return "No clutter elements found to remove.";
      return `Cleaned up: ${removed.join(", ")}`;
    }
    case "prettyscreenshot": {
      let scrollTo;
      let doCleanup = false;
      const hideSelectors = [];
      let viewportWidth;
      let outputPath;
      for (let i = 0;i < args.length; i++) {
        if (args[i] === "--scroll-to" && i + 1 < args.length) {
          scrollTo = args[++i];
        } else if (args[i] === "--cleanup") {
          doCleanup = true;
        } else if (args[i] === "--hide" && i + 1 < args.length) {
          const values = [];
          i++;
          while (i < args.length && !args[i].startsWith("--")) {
            values.push(args[i]);
            i++;
          }
          i--;
          const last = values[values.length - 1];
          if (!outputPath && values.length > 1 && /^(\/|\.\.?\/|~)|\.(png|jpe?g|webp)$/i.test(last))
            outputPath = values.pop();
          hideSelectors.push(...values);
        } else if (args[i] === "--width" && i + 1 < args.length) {
          viewportWidth = parseInt(args[++i], 10);
          if (isNaN(viewportWidth))
            throw new Error("--width must be a number");
        } else if (!args[i].startsWith("--")) {
          outputPath = args[i];
        } else {
          throw new Error(`Unknown prettyscreenshot flag: ${args[i]}`);
        }
      }
      if (!outputPath) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        outputPath = `${TEMP_DIR}/browse-pretty-${timestamp}.png`;
      }
      validateOutputPath(outputPath);
      const originalViewport = page.viewportSize();
      if (viewportWidth && originalViewport) {
        await page.setViewportSize({ width: viewportWidth, height: originalViewport.height });
      }
      if (doCleanup) {
        const allSelectors = [
          ...CLEANUP_SELECTORS.ads,
          ...CLEANUP_SELECTORS.cookies,
          ...CLEANUP_SELECTORS.social
        ];
        await page.evaluate((sels) => {
          for (const sel of sels) {
            try {
              document.querySelectorAll(sel).forEach((el) => {
                el.style.display = "none";
              });
            } catch (err) {
              if (!(err instanceof DOMException))
                throw err;
            }
          }
          for (const el of document.querySelectorAll("*")) {
            const style = getComputedStyle(el);
            if (style.position === "fixed" || style.position === "sticky") {
              const tag = el.tagName.toLowerCase();
              if (tag === "nav" || tag === "header")
                continue;
              if (el.getAttribute("role") === "navigation")
                continue;
              el.style.display = "none";
            }
          }
        }, allSelectors);
      }
      if (hideSelectors.length > 0) {
        await page.evaluate((sels) => {
          for (const sel of sels) {
            try {
              document.querySelectorAll(sel).forEach((el) => {
                el.style.display = "none";
              });
            } catch (err) {
              if (!(err instanceof DOMException))
                throw err;
            }
          }
        }, hideSelectors);
      }
      if (scrollTo) {
        const scrolled = await page.evaluate((target) => {
          let el = document.querySelector(target);
          if (el) {
            el.scrollIntoView({ behavior: "instant", block: "center" });
            return true;
          }
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
          let node;
          while (node = walker.nextNode()) {
            if (node.textContent?.includes(target)) {
              const parent = node.parentElement;
              if (parent) {
                parent.scrollIntoView({ behavior: "instant", block: "center" });
                return true;
              }
            }
          }
          return false;
        }, scrollTo);
        if (!scrolled) {
          if (viewportWidth && originalViewport) {
            await page.setViewportSize(originalViewport);
          }
          throw new Error(`Could not find element or text to scroll to: ${scrollTo}`);
        }
        await page.waitForTimeout(300);
      }
      await page.screenshot({ path: outputPath, fullPage: !scrollTo });
      if (!scrollTo)
        await guardScreenshotPath(outputPath);
      if (viewportWidth && originalViewport) {
        await page.setViewportSize(originalViewport);
      }
      const parts = ["Screenshot saved"];
      if (doCleanup)
        parts.push("(cleaned)");
      if (scrollTo)
        parts.push(`(scrolled to: ${scrollTo})`);
      parts.push(`: ${outputPath}`);
      return parts.join(" ");
    }
    case "download": {
      if (args.length === 0)
        throw new Error("Usage: download <url|@ref> [path] [--base64] [--navigate]");
      const isBase64 = args.includes("--base64");
      const useNavigate = args.includes("--navigate");
      const filteredArgs = args.filter((a) => a !== "--base64" && a !== "--navigate");
      let url = filteredArgs[0];
      const outputPath = filteredArgs[1];
      if (url.startsWith("@")) {
        const resolved = await bm.resolveRef(url);
        if (!("locator" in resolved))
          throw new Error(`Expected @ref, got CSS selector: ${url}`);
        const locator = resolved.locator;
        const tagName = await locator.evaluate((el) => el.tagName.toLowerCase());
        if (tagName === "img") {
          url = await locator.evaluate((el) => {
            const img = el;
            return img.currentSrc || img.src || img.getAttribute("data-src") || "";
          });
        } else if (tagName === "video") {
          url = await locator.evaluate((el) => el.currentSrc || el.src || "");
        } else if (tagName === "audio") {
          url = await locator.evaluate((el) => el.currentSrc || el.src || "");
        } else {
          url = await locator.evaluate((el) => el.getAttribute("src") || "");
        }
        if (!url)
          throw new Error(`Could not extract URL from ${filteredArgs[0]} (${tagName})`);
      }
      if (url.includes(".m3u8") || url.includes(".mpd")) {
        throw new Error("This is an HLS/DASH stream. Use yt-dlp or ffmpeg for adaptive stream downloads.");
      }
      const page = bm.getPage();
      let contentType = "application/octet-stream";
      let buffer;
      if (url.startsWith("blob:")) {
        const dataUrl = await page.evaluate(async (blobUrl) => {
          try {
            const resp = await fetch(blobUrl);
            const blob = await resp.blob();
            if (blob.size > 100 * 1024 * 1024)
              return "ERROR:TOO_LARGE";
            return new Promise((resolve, reject) => {
              const reader = new FileReader;
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = () => reject("Failed to read blob");
              reader.readAsDataURL(blob);
            });
          } catch (err) {
            return `ERROR:EXPIRED:${err?.message || "unknown"}`;
          }
        }, url);
        if (dataUrl === "ERROR:TOO_LARGE")
          throw new Error("Blob too large (>100MB). Use a different approach.");
        if (dataUrl.startsWith("ERROR:EXPIRED"))
          throw new Error(`Blob URL expired or inaccessible: ${dataUrl.slice("ERROR:EXPIRED:".length)}`);
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!match)
          throw new Error("Failed to decode blob data");
        contentType = match[1];
        buffer = Buffer.from(match[2], "base64");
      } else if (useNavigate) {
        await validateNavigationUrl(url);
        const downloadPromise = page.waitForEvent("download", { timeout: 60000 });
        page.goto(url, { waitUntil: "commit", timeout: 30000 }).catch(() => {});
        const download = await downloadPromise;
        const failure = await download.failure();
        if (failure) {
          throw new Error(`Download failed: ${failure}`);
        }
        const tempPath = path14.join(TEMP_DIR, `browse-nav-download-${Date.now()}`);
        await download.saveAs(tempPath);
        buffer = fs15.readFileSync(tempPath);
        const suggested = download.suggestedFilename();
        if (suggested) {
          const extMatch = suggested.match(/\.([a-z0-9]+)$/i);
          if (extMatch) {
            const extLower = extMatch[1].toLowerCase();
            const mimeMap = {
              epub: "application/epub+zip",
              pdf: "application/pdf",
              zip: "application/zip",
              gz: "application/gzip",
              mp3: "audio/mpeg",
              mp4: "video/mp4",
              jpg: "image/jpeg",
              jpeg: "image/jpeg",
              png: "image/png",
              txt: "text/plain",
              html: "text/html",
              json: "application/json"
            };
            contentType = mimeMap[extLower] || "application/octet-stream";
          }
        }
        if (outputPath || isBase64) {
          try {
            fs15.unlinkSync(tempPath);
          } catch {}
        } else {
          const ext = contentType.split(";")[0].includes("/") ? mimeToExt(contentType.split(";")[0].trim()) : ".bin";
          const finalPath = path14.join(TEMP_DIR, `browse-download-${Date.now()}${ext}`);
          fs15.renameSync(tempPath, finalPath);
          const sizeKB = Math.round(buffer.length / 1024);
          return `Downloaded: ${finalPath} (${sizeKB}KB, ${contentType.split(";")[0].trim()})${suggested ? ` [${suggested}]` : ""}`;
        }
        if (buffer.length > 200 * 1024 * 1024) {
          throw new Error("File too large (>200MB).");
        }
      } else {
        await validateNavigationUrl(url);
        const response = await page.request.fetch(url, { timeout: 30000 });
        const status = response.status();
        if (status >= 400) {
          throw new Error(`Download failed: HTTP ${status} ${response.statusText()}`);
        }
        contentType = response.headers()["content-type"] || "application/octet-stream";
        buffer = Buffer.from(await response.body());
        if (buffer.length > 200 * 1024 * 1024) {
          throw new Error("File too large (>200MB).");
        }
      }
      if (isBase64) {
        if (buffer.length > 10 * 1024 * 1024) {
          throw new Error("File too large for --base64 (>10MB). Use disk download + GET /file instead.");
        }
        const mimeType = contentType.split(";")[0].trim();
        return `data:${mimeType};base64,${buffer.toString("base64")}`;
      }
      const ext = contentType.split(";")[0].includes("/") ? mimeToExt(contentType.split(";")[0].trim()) : ".bin";
      const destPath = outputPath || path14.join(TEMP_DIR, `browse-download-${Date.now()}${ext}`);
      validateOutputPath(destPath);
      fs15.writeFileSync(destPath, buffer);
      const sizeKB = Math.round(buffer.length / 1024);
      return `Downloaded: ${destPath} (${sizeKB}KB, ${contentType.split(";")[0].trim()})`;
    }
    case "scrape": {
      if (args.length === 0)
        throw new Error("Usage: scrape <images|videos|media> [--selector sel] [--dir path] [--limit N]");
      const mediaType = args[0];
      if (!["images", "videos", "media"].includes(mediaType)) {
        throw new Error(`Invalid type: ${mediaType}. Use: images, videos, or media`);
      }
      const selectorIdx = args.indexOf("--selector");
      const selector = selectorIdx >= 0 ? args[selectorIdx + 1] : undefined;
      const dirIdx = args.indexOf("--dir");
      const requestedDir = dirIdx >= 0 ? args[dirIdx + 1] : path14.join(TEMP_DIR, `browse-scrape-${Date.now()}`);
      const limitIdx = args.indexOf("--limit");
      const limit = Math.min(limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) || 50 : 50, 200);
      validateOutputPath(requestedDir);
      const dir = path14.resolve(requestedDir);
      fs15.mkdirSync(dir, { recursive: true });
      const manifestPath = path14.join(dir, "manifest.json");
      validateOutputPath(manifestPath);
      await Promise.resolve();
      const target = bm.getActiveFrameOrPage();
      const filter = mediaType === "images" ? "images" : mediaType === "videos" ? "videos" : undefined;
      const mediaResult = await extractMedia(target, { selector, filter });
      const urls = [];
      const seen = new Set;
      for (const img of mediaResult.images) {
        const url = img.currentSrc || img.src || img.dataSrc;
        if (url && !seen.has(url) && !url.startsWith("data:")) {
          seen.add(url);
          urls.push({ url, type: "image" });
        }
      }
      for (const vid of mediaResult.videos) {
        const url = vid.currentSrc || vid.src;
        if (url && !seen.has(url) && !url.startsWith("blob:") && !vid.isHLS && !vid.isDASH) {
          seen.add(url);
          urls.push({ url, type: "video" });
        }
      }
      for (const bg of mediaResult.backgroundImages) {
        if (bg.url && !seen.has(bg.url)) {
          seen.add(bg.url);
          urls.push({ url: bg.url, type: "image" });
        }
      }
      const toDownload = urls.slice(0, limit);
      const page = bm.getPage();
      const manifest = {
        url: page.url(),
        scraped_at: new Date().toISOString(),
        files: [],
        total_size: 0,
        succeeded: 0,
        failed: 0
      };
      const lines = [];
      for (let i = 0;i < toDownload.length; i++) {
        const { url, type } = toDownload[i];
        try {
          await validateNavigationUrl(url);
          const response = await page.request.fetch(url, { timeout: 30000 });
          if (response.status() >= 400)
            throw new Error(`HTTP ${response.status()}`);
          const ct = response.headers()["content-type"] || "application/octet-stream";
          const ext = mimeToExt(ct.split(";")[0].trim());
          const filename = `${type}-${String(i + 1).padStart(3, "0")}${ext}`;
          const filePath = path14.join(dir, filename);
          validateOutputPath(filePath);
          const body = Buffer.from(await response.body());
          try {
            fs15.writeFileSync(filePath, body);
          } catch (writeErr) {
            throw new Error(`Disk write failed: ${writeErr.message}`);
          }
          manifest.files.push({ path: filename, src: url, size: body.length, type: ct.split(";")[0].trim() });
          manifest.total_size += body.length;
          manifest.succeeded++;
          lines.push(`  [${i + 1}/${toDownload.length}] ${filename} (${Math.round(body.length / 1024)}KB)`);
        } catch (err) {
          manifest.files.push({ path: null, src: url, size: 0, type: "", error: err.message });
          manifest.failed++;
          lines.push(`  [${i + 1}/${toDownload.length}] FAILED: ${err.message}`);
        }
        if (i < toDownload.length - 1)
          await new Promise((r) => setTimeout(r, 100));
      }
      fs15.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      return `Scraped ${toDownload.length} items to ${dir}/
${lines.join(`
`)}

Summary: ${manifest.succeeded} succeeded, ${manifest.failed} failed, ${Math.round(manifest.total_size / 1024)}KB total`;
    }
    case "archive": {
      const page = bm.getPage();
      const outputPath = args[0] || path14.join(TEMP_DIR, `browse-archive-${Date.now()}.mhtml`);
      validateOutputPath(outputPath);
      try {
        const data = await withCdpSession(page, async (cdp) => {
          const result = await cdp.send("Page.captureSnapshot", { format: "mhtml" });
          return result.data;
        });
        fs15.writeFileSync(outputPath, data);
        return `Archive saved: ${outputPath} (${Math.round(data.length / 1024)}KB, MHTML)`;
      } catch (err) {
        throw new Error(`MHTML archive requires Chromium CDP. Use 'text' or 'html' for raw page content. (${err.message})`);
      }
    }
    default:
      throw new Error(`Unknown write command: ${command}`);
  }
}
function mimeToExt(mime) {
  const map = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "image/avif": ".avif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/ogg": ".ogg",
    "application/pdf": ".pdf",
    "application/json": ".json",
    "text/html": ".html",
    "text/plain": ".txt"
  };
  return map[mime] || ".bin";
}
var CLEANUP_SELECTORS;
var init_write_commands = __esm(() => {
  init_cookie_import_browser();
  init_cookie_picker_routes();
  init_cookie_import_operation();
  init_cookie_auth_verification();
  init_url_validation();
  init_path_security();
  init_screenshot_size_guard();
  init_platform();
  init_path_security();
  init_cdp_inspector();
  init_cdp_bridge();
  CLEANUP_SELECTORS = {
    ads: [
      "ins.adsbygoogle",
      '[id^="google_ads"]',
      '[id^="div-gpt-ad"]',
      'iframe[src*="doubleclick"]',
      'iframe[src*="googlesyndication"]',
      "[data-google-query-id]",
      ".google-auto-placed",
      '[class*="ad-banner"]',
      '[class*="ad-wrapper"]',
      '[class*="ad-container"]',
      '[class*="ad-slot"]',
      '[class*="ad-unit"]',
      '[class*="ad-zone"]',
      '[class*="ad-placement"]',
      '[class*="ad-holder"]',
      '[class*="ad-block"]',
      '[class*="adbox"]',
      '[class*="adunit"]',
      '[class*="adwrap"]',
      '[id*="ad-banner"]',
      '[id*="ad-wrapper"]',
      '[id*="ad-container"]',
      '[id*="ad-slot"]',
      '[id*="ad_banner"]',
      '[id*="ad_container"]',
      "[data-ad]",
      "[data-ad-slot]",
      "[data-ad-unit]",
      "[data-adunit]",
      '[class*="sponsored"]',
      '[class*="Sponsored"]',
      ".ad",
      ".ads",
      ".advert",
      ".advertisement",
      "#ad",
      "#ads",
      "#advert",
      "#advertisement",
      'iframe[src*="amazon-adsystem"]',
      'iframe[src*="outbrain"]',
      'iframe[src*="taboola"]',
      'iframe[src*="criteo"]',
      'iframe[src*="adsafeprotected"]',
      'iframe[src*="moatads"]',
      '[class*="promoted"]',
      '[class*="Promoted"]',
      '[data-testid*="promo"]',
      '[class*="native-ad"]',
      'aside[class*="ad"]',
      'section[class*="ad-"]'
    ],
    cookies: [
      '[class*="cookie-consent"]',
      '[class*="cookie-banner"]',
      '[class*="cookie-notice"]',
      '[id*="cookie-consent"]',
      '[id*="cookie-banner"]',
      '[id*="cookie-notice"]',
      '[class*="consent-banner"]',
      '[class*="consent-modal"]',
      '[class*="consent-wall"]',
      '[class*="gdpr"]',
      '[id*="gdpr"]',
      '[class*="GDPR"]',
      '[class*="CookieConsent"]',
      '[id*="CookieConsent"]',
      "#onetrust-consent-sdk",
      ".onetrust-pc-dark-filter",
      "#onetrust-banner-sdk",
      "#CybotCookiebotDialog",
      "#CybotCookiebotDialogBodyUnderlay",
      "#truste-consent-track",
      ".truste_overlay",
      ".truste_box_overlay",
      ".qc-cmp2-container",
      "#qc-cmp2-main",
      '[class*="cc-banner"]',
      '[class*="cc-window"]',
      '[class*="cc-overlay"]',
      '[class*="privacy-banner"]',
      '[class*="privacy-notice"]',
      '[id*="privacy-banner"]',
      '[id*="privacy-notice"]',
      '[class*="accept-cookies"]',
      '[id*="accept-cookies"]'
    ],
    overlays: [
      '[class*="paywall"]',
      '[class*="Paywall"]',
      '[id*="paywall"]',
      '[class*="subscribe-wall"]',
      '[class*="subscription-wall"]',
      '[class*="meter-wall"]',
      '[class*="regwall"]',
      '[class*="reg-wall"]',
      '[class*="newsletter-popup"]',
      '[class*="newsletter-modal"]',
      '[class*="signup-modal"]',
      '[class*="signup-popup"]',
      '[class*="email-capture"]',
      '[class*="lead-capture"]',
      '[class*="popup-modal"]',
      '[class*="modal-overlay"]',
      '[class*="interstitial"]',
      '[id*="interstitial"]',
      '[class*="push-notification"]',
      '[class*="notification-prompt"]',
      '[class*="web-push"]',
      '[class*="survey-"]',
      '[class*="feedback-modal"]',
      '[id*="survey-"]',
      '[class*="nps-"]',
      '[class*="app-banner"]',
      '[class*="smart-banner"]',
      '[class*="app-download"]',
      '[id*="branch-banner"]',
      ".smartbanner",
      '[class*="promo-banner"]',
      '[class*="cross-promo"]',
      '[class*="partner-promo"]',
      '[class*="preferred-source"]',
      '[class*="google-promo"]'
    ],
    clutter: [
      '[class*="audio-player"]',
      '[class*="podcast-player"]',
      '[class*="listen-widget"]',
      '[class*="everlit"]',
      '[class*="Everlit"]',
      "audio",
      '[class*="puzzle"]',
      '[class*="daily-game"]',
      '[class*="games-widget"]',
      '[class*="crossword-promo"]',
      '[class*="mini-game"]',
      'aside [class*="most-popular"]',
      'aside [class*="trending"]',
      'aside [class*="most-read"]',
      'aside [class*="recommended"]',
      '[class*="related-articles"]',
      '[class*="more-stories"]',
      '[class*="recirculation"]',
      '[class*="taboola"]',
      '[class*="outbrain"]',
      '[class*="nativo"]',
      "[data-tb-region]"
    ],
    sticky: [],
    social: [
      '[class*="social-share"]',
      '[class*="share-buttons"]',
      '[class*="share-bar"]',
      '[class*="social-widget"]',
      '[class*="social-icons"]',
      '[class*="share-tools"]',
      'iframe[src*="facebook.com/plugins"]',
      'iframe[src*="platform.twitter"]',
      '[class*="fb-like"]',
      '[class*="tweet-button"]',
      '[class*="addthis"]',
      '[class*="sharethis"]',
      '[class*="follow-us"]',
      '[class*="social-follow"]'
    ]
  };
});

// browse/src/content-security.ts
import { randomBytes as randomBytes2 } from "crypto";
function ensureMarker() {
  if (!sessionMarker) {
    sessionMarker = randomBytes2(3).toString("base64").slice(0, 4);
  }
  return sessionMarker;
}
function datamarkContent(content) {
  const marker = ensureMarker();
  const zwsp = "​";
  const taggedMarker = marker.split("").map((c) => zwsp + c).join("");
  let count = 0;
  return content.replace(/(\. )/g, (match) => {
    count++;
    if (count % 3 === 0) {
      return match + taggedMarker;
    }
    return match;
  });
}
async function markHiddenElements(page) {
  return page.evaluate((ariaPatterns) => {
    const found = [];
    const elements = document.querySelectorAll("body *");
    for (const el of elements) {
      if (el instanceof HTMLElement) {
        const style = window.getComputedStyle(el);
        const text = el.textContent?.trim() || "";
        if (!text)
          continue;
        let isHidden = false;
        let reason = "";
        if (parseFloat(style.opacity) < 0.1) {
          isHidden = true;
          reason = "opacity < 0.1";
        } else if (parseFloat(style.fontSize) < 1) {
          isHidden = true;
          reason = "font-size < 1px";
        } else if (style.position === "absolute" || style.position === "fixed") {
          const rect = el.getBoundingClientRect();
          if (rect.right < -100 || rect.bottom < -100 || rect.left > window.innerWidth + 100 || rect.top > window.innerHeight + 100) {
            isHidden = true;
            reason = "off-screen";
          }
        } else if (style.color === style.backgroundColor && text.length > 10) {
          isHidden = true;
          reason = "same fg/bg color";
        } else if (style.clipPath === "inset(100%)" || style.clip === "rect(0px, 0px, 0px, 0px)") {
          isHidden = true;
          reason = "clip hiding";
        } else if (style.visibility === "hidden") {
          isHidden = true;
          reason = "visibility hidden";
        }
        if (isHidden) {
          el.setAttribute("data-gstack-hidden", "true");
          found.push(`[${el.tagName.toLowerCase()}] ${reason}: "${text.slice(0, 60)}..."`);
        }
        const ariaLabel = el.getAttribute("aria-label") || "";
        const ariaLabelledBy = el.getAttribute("aria-labelledby");
        let labelText = ariaLabel;
        if (ariaLabelledBy) {
          const labelEl = document.getElementById(ariaLabelledBy);
          if (labelEl)
            labelText += " " + (labelEl.textContent || "");
        }
        if (labelText) {
          for (const pattern of ariaPatterns) {
            if (new RegExp(pattern, "i").test(labelText)) {
              el.setAttribute("data-gstack-hidden", "true");
              found.push(`[${el.tagName.toLowerCase()}] ARIA injection: "${labelText.slice(0, 60)}..."`);
              break;
            }
          }
        }
      }
    }
    return found;
  }, ARIA_INJECTION_PATTERNS.map((p) => p.source));
}
async function getCleanTextWithStripping(page) {
  const raw = await page.evaluate(() => {
    const body = document.body;
    if (!body)
      return "";
    const clone = body.cloneNode(true);
    clone.querySelectorAll("script, style, noscript, svg").forEach((el) => el.remove());
    clone.querySelectorAll("[data-gstack-hidden]").forEach((el) => el.remove());
    return clone.innerText.split(`
`).map((line) => line.trim()).filter((line) => line.length > 0).join(`
`);
  });
  return stripLoneSurrogates(raw);
}
async function cleanupHiddenMarkers(page) {
  await page.evaluate(() => {
    document.querySelectorAll("[data-gstack-hidden]").forEach((el) => {
      el.removeAttribute("data-gstack-hidden");
    });
  });
}
function escapeEnvelopeSentinels(content) {
  const zwsp = "​";
  return content.replace(/═══ BEGIN UNTRUSTED WEB CONTENT ═══/g, `═══ BEGIN UNTRUSTED WEB C${zwsp}ONTENT ═══`).replace(/═══ END UNTRUSTED WEB CONTENT ═══/g, `═══ END UNTRUSTED WEB C${zwsp}ONTENT ═══`);
}
function wrapUntrustedPageContent(content, command, filterWarnings) {
  const safeContent = escapeEnvelopeSentinels(content);
  const parts = [];
  if (filterWarnings && filterWarnings.length > 0) {
    parts.push(`⚠ CONTENT WARNINGS: ${filterWarnings.join("; ")}`);
  }
  parts.push(ENVELOPE_BEGIN);
  parts.push(safeContent);
  parts.push(ENVELOPE_END);
  return parts.join(`
`);
}
function registerContentFilter(filter) {
  registeredFilters.push(filter);
}
function getFilterMode() {
  const mode = process.env.BROWSE_CONTENT_FILTER?.toLowerCase();
  if (mode === "off" || mode === "block")
    return mode;
  return "warn";
}
function runContentFilters(content, url, command) {
  const mode = getFilterMode();
  if (mode === "off") {
    return { safe: true, warnings: [] };
  }
  const allWarnings = [];
  let blocked = false;
  for (const filter of registeredFilters) {
    const result = filter(content, url, command);
    if (!result.safe) {
      allWarnings.push(...result.warnings);
      if (mode === "block") {
        blocked = true;
      }
    }
  }
  if (blocked && allWarnings.length > 0) {
    return {
      safe: false,
      warnings: allWarnings,
      blocked: true,
      message: `Content blocked: ${allWarnings.join("; ")}`
    };
  }
  return {
    safe: allWarnings.length === 0,
    warnings: allWarnings
  };
}
function urlBlocklistFilter(content, url, _command) {
  const warnings = [];
  const normalizedUrl = url.toLowerCase();
  for (const domain of BLOCKLIST_DOMAINS) {
    if (normalizedUrl.includes(domain)) {
      warnings.push(`Page URL matches blocklisted domain: ${domain}`);
    }
  }
  const urlPattern = /https?:\/\/[^\s"'<>]+/gi;
  const contentUrls = content.match(urlPattern) || [];
  for (const contentUrl of contentUrls) {
    const normalizedContentUrl = contentUrl.toLowerCase();
    for (const domain of BLOCKLIST_DOMAINS) {
      if (normalizedContentUrl.includes(domain)) {
        warnings.push(`Content contains blocklisted URL: ${contentUrl.slice(0, 100)}`);
        break;
      }
    }
  }
  return { safe: warnings.length === 0, warnings };
}
var sessionMarker = null, ARIA_INJECTION_PATTERNS, ENVELOPE_BEGIN = "═══ BEGIN UNTRUSTED WEB CONTENT ═══", ENVELOPE_END = "═══ END UNTRUSTED WEB CONTENT ═══", registeredFilters, BLOCKLIST_DOMAINS;
var init_content_security = __esm(() => {
  init_sanitize();
  ARIA_INJECTION_PATTERNS = [
    /ignore\s+(previous|above|all)\s+instructions?/i,
    /you\s+are\s+(now|a)\s+/i,
    /system\s*:\s*/i,
    /\bdo\s+not\s+(follow|obey|listen)/i,
    /\bexecute\s+(the\s+)?following/i,
    /\bforget\s+(everything|all|your)/i,
    /\bnew\s+instructions?\s*:/i
  ];
  registeredFilters = [];
  BLOCKLIST_DOMAINS = [
    "requestbin.com",
    "pipedream.com",
    "webhook.site",
    "hookbin.com",
    "requestcatcher.com",
    "burpcollaborator.net",
    "interact.sh",
    "canarytokens.com",
    "ngrok.io",
    "ngrok-free.app"
  ];
  registerContentFilter(urlBlocklistFilter);
});

// browse/src/snapshot-flags.ts
var SNAPSHOT_FLAGS;
var init_snapshot_flags = __esm(() => {
  SNAPSHOT_FLAGS = [
    { short: "-i", long: "--interactive", description: "Interactive elements only (buttons, links, inputs) with @e refs. Also auto-enables cursor-interactive scan (-C) to capture dropdowns and popovers.", optionKey: "interactive" },
    { short: "-c", long: "--compact", description: "Compact (no empty structural nodes)", optionKey: "compact" },
    { short: "-d", long: "--depth", description: "Limit tree depth (0 = root only, default: unlimited)", takesValue: true, valueHint: "<N>", optionKey: "depth" },
    { short: "-s", long: "--selector", description: "Scope to CSS selector", takesValue: true, valueHint: "<sel>", optionKey: "selector" },
    { short: "-D", long: "--diff", description: "Unified diff against previous snapshot (first call stores baseline)", optionKey: "diff" },
    { short: "-a", long: "--annotate", description: "Annotated screenshot with red overlay boxes and ref labels", optionKey: "annotate" },
    { short: "-o", long: "--output", description: "Output path for annotated screenshot (default: <temp>/browse-annotated.png)", takesValue: true, valueHint: "<path>", optionKey: "outputPath" },
    { short: "-C", long: "--cursor-interactive", description: "Cursor-interactive elements (@c refs — divs with pointer, onclick). Auto-enabled when -i is used.", optionKey: "cursorInteractive" },
    { short: "-H", long: "--heatmap", description: `Color-coded overlay screenshot from JSON map: '{"@e1":"green","@e3":"red"}'. Valid colors: green, yellow, red, blue, orange, gray.`, takesValue: true, valueHint: "<json>", optionKey: "heatmap" }
  ];
});

// browse/src/snapshot.ts
import * as Diff from "diff";
function parseSnapshotArgs(args) {
  const opts = {};
  for (let i = 0;i < args.length; i++) {
    const flag = SNAPSHOT_FLAGS.find((f) => f.short === args[i] || f.long === args[i]);
    if (!flag)
      throw new Error(`Unknown snapshot flag: ${args[i]}`);
    if (flag.takesValue) {
      const value = args[++i];
      if (!value)
        throw new Error(`Usage: snapshot ${flag.short} <value>`);
      if (flag.optionKey === "depth") {
        opts[flag.optionKey] = parseInt(value, 10);
        if (isNaN(opts.depth))
          throw new Error("Usage: snapshot -d <number>");
      } else {
        opts[flag.optionKey] = value;
      }
    } else {
      opts[flag.optionKey] = true;
    }
  }
  return opts;
}
function parseLine(line) {
  const match = line.match(/^(\s*)-\s+(\w+)(?:\s+"([^"]*)")?(?:\s+(\[.*?\]))?\s*(?::\s*(.*))?$/);
  if (!match) {
    return null;
  }
  return {
    indent: match[1].length,
    role: match[2],
    name: match[3] ?? null,
    props: match[4] || "",
    children: match[5]?.trim() || "",
    rawLine: line
  };
}
async function handleSnapshot(args, session, securityOpts) {
  const opts = parseSnapshotArgs(args);
  const page = session.getPage();
  const target = session.getActiveFrameOrPage();
  const inFrame = session.getFrame() !== null;
  let rootLocator;
  if (opts.selector) {
    rootLocator = target.locator(opts.selector);
    const count = await rootLocator.count();
    if (count === 0)
      throw new Error(`Selector not found: ${opts.selector}`);
  } else {
    rootLocator = target.locator("body");
  }
  const ariaText = await rootLocator.ariaSnapshot();
  if (!ariaText || ariaText.trim().length === 0) {
    session.setRefMap(new Map);
    return "(no accessible elements found)";
  }
  const lines = ariaText.split(`
`);
  const refMap = new Map;
  const output = [];
  let refCounter = 1;
  const roleNameCounts = new Map;
  const roleNameSeen = new Map;
  for (const line of lines) {
    const node = parseLine(line);
    if (!node)
      continue;
    const key = `${node.role}:${node.name || ""}`;
    roleNameCounts.set(key, (roleNameCounts.get(key) || 0) + 1);
  }
  for (const line of lines) {
    const node = parseLine(line);
    if (!node)
      continue;
    const depth = Math.floor(node.indent / 2);
    const isInteractive = INTERACTIVE_ROLES.has(node.role);
    if (opts.depth !== undefined && depth > opts.depth)
      continue;
    if (opts.interactive && !isInteractive) {
      const key = `${node.role}:${node.name || ""}`;
      roleNameSeen.set(key, (roleNameSeen.get(key) || 0) + 1);
      continue;
    }
    if (opts.compact && !isInteractive && !node.name && !node.children)
      continue;
    const ref = `e${refCounter++}`;
    const indent = "  ".repeat(depth);
    const key = `${node.role}:${node.name || ""}`;
    const seenIndex = roleNameSeen.get(key) || 0;
    roleNameSeen.set(key, seenIndex + 1);
    const totalCount = roleNameCounts.get(key) || 1;
    let locator;
    if (opts.selector) {
      locator = target.locator(opts.selector).getByRole(node.role, {
        name: node.name || undefined
      });
    } else {
      locator = target.getByRole(node.role, {
        name: node.name || undefined
      });
    }
    if (totalCount > 1) {
      locator = locator.nth(seenIndex);
    }
    refMap.set(ref, { locator, role: node.role, name: node.name || "" });
    let outputLine = `${indent}@${ref} [${node.role}]`;
    if (node.name)
      outputLine += ` "${node.name}"`;
    if (node.props)
      outputLine += ` ${node.props}`;
    if (node.children)
      outputLine += `: ${node.children}`;
    output.push(outputLine);
  }
  if (opts.interactive && !opts.cursorInteractive) {
    opts.cursorInteractive = true;
  }
  if (opts.cursorInteractive) {
    try {
      const cursorElements = await target.evaluate(() => {
        const STANDARD_INTERACTIVE = new Set([
          "A",
          "BUTTON",
          "INPUT",
          "SELECT",
          "TEXTAREA",
          "SUMMARY",
          "DETAILS"
        ]);
        const results = [];
        const allElements = document.querySelectorAll("*");
        for (const el of allElements) {
          if (STANDARD_INTERACTIVE.has(el.tagName))
            continue;
          if (!el.offsetParent && el.tagName !== "BODY")
            continue;
          const style = getComputedStyle(el);
          const hasCursorPointer = style.cursor === "pointer";
          const hasOnclick = el.hasAttribute("onclick");
          const hasTabindex = el.hasAttribute("tabindex") && parseInt(el.getAttribute("tabindex"), 10) >= 0;
          const hasRole = el.hasAttribute("role");
          const isInFloating = (() => {
            let parent = el;
            while (parent && parent !== document.documentElement) {
              const pStyle = getComputedStyle(parent);
              const isFloating = (pStyle.position === "fixed" || pStyle.position === "absolute") && parseInt(pStyle.zIndex || "0", 10) >= 10;
              const hasPortalAttr = parent.hasAttribute("data-floating-ui-portal") || parent.hasAttribute("data-radix-popper-content-wrapper") || parent.hasAttribute("data-radix-portal") || parent.hasAttribute("data-popper-placement") || parent.getAttribute("role") === "listbox" || parent.getAttribute("role") === "menu";
              if (isFloating || hasPortalAttr)
                return true;
              parent = parent.parentElement;
            }
            return false;
          })();
          if (!hasCursorPointer && !hasOnclick && !hasTabindex) {
            if (isInFloating && hasRole) {
              const role = el.getAttribute("role");
              if (role !== "option" && role !== "menuitem" && role !== "menuitemcheckbox" && role !== "menuitemradio")
                continue;
            } else {
              continue;
            }
          }
          if (hasRole && !isInFloating)
            continue;
          const parts = [];
          let current = el;
          while (current && current !== document.documentElement) {
            const parent = current.parentElement;
            if (!parent)
              break;
            const siblings = [...parent.children];
            const index = siblings.indexOf(current) + 1;
            parts.unshift(`${current.tagName.toLowerCase()}:nth-child(${index})`);
            current = parent;
          }
          const selector = parts.join(" > ");
          const text = el.innerText?.trim().slice(0, 80) || el.tagName.toLowerCase();
          const reasons = [];
          if (isInFloating)
            reasons.push("popover-child");
          if (hasCursorPointer)
            reasons.push("cursor:pointer");
          if (hasOnclick)
            reasons.push("onclick");
          if (hasTabindex)
            reasons.push(`tabindex=${el.getAttribute("tabindex")}`);
          if (hasRole)
            reasons.push(`role=${el.getAttribute("role")}`);
          results.push({ selector, text, reason: reasons.join(", ") });
        }
        return results;
      });
      if (cursorElements.length > 0) {
        output.push("");
        output.push("── cursor-interactive (not in ARIA tree) ──");
        let cRefCounter = 1;
        for (const elem of cursorElements) {
          const ref = `c${cRefCounter++}`;
          const locator = target.locator(elem.selector);
          refMap.set(ref, { locator, role: "cursor-interactive", name: elem.text });
          output.push(`@${ref} [${elem.reason}] "${elem.text}"`);
        }
      }
    } catch (err) {
      if (!err?.message?.includes("Execution context") && !err?.message?.includes("closed") && !err?.message?.includes("Target") && !err?.message?.includes("Content Security"))
        throw err;
      output.push("");
      output.push("(cursor scan failed — CSP restriction)");
    }
  }
  session.setRefMap(refMap);
  if (output.length === 0) {
    return "(no interactive elements found)";
  }
  const snapshotText = output.join(`
`);
  const outputIgnoredWarning = opts.outputPath && !opts.annotate && !opts.heatmap ? `[warning] -o/--output was ignored: it names the output file for an annotated (-a/--annotate) or heatmap (-H/--heatmap) screenshot. For a plain screenshot use: browse screenshot ${opts.outputPath}` : "";
  if (outputIgnoredWarning) {
    output.push(outputIgnoredWarning);
  }
  if (opts.annotate) {
    const screenshotPath = opts.outputPath || `${TEMP_DIR}/browse-annotated.png`;
    {
      const nodePath = __require("path");
      const nodeFs = __require("fs");
      const absolute = nodePath.resolve(screenshotPath);
      const safeDirs = [TEMP_DIR, process.cwd()].map((d) => {
        try {
          return nodeFs.realpathSync(d);
        } catch (err) {
          if (err?.code !== "ENOENT")
            throw err;
          return d;
        }
      });
      let realPath;
      try {
        realPath = nodeFs.realpathSync(absolute);
      } catch (err) {
        if (err.code === "ENOENT") {
          try {
            const dir = nodeFs.realpathSync(nodePath.dirname(absolute));
            realPath = nodePath.join(dir, nodePath.basename(absolute));
          } catch (err2) {
            if (err2?.code !== "ENOENT")
              throw err2;
            realPath = absolute;
          }
        } else {
          throw new Error(`Cannot resolve real path: ${screenshotPath} (${err.code})`);
        }
      }
      if (!safeDirs.some((dir) => isPathWithin(realPath, dir))) {
        throw new Error(`Path must be within: ${safeDirs.join(", ")}`);
      }
    }
    try {
      const boxes = [];
      const ambiguousRefs = [];
      const skippedRefs = [];
      for (const [ref, entry] of refMap) {
        try {
          let locator = entry.locator;
          const matchCount = await locator.count();
          if (matchCount > 1) {
            ambiguousRefs.push(`@${ref}`);
            locator = locator.first();
          }
          const box = await locator.boundingBox({ timeout: 1000 });
          if (box) {
            boxes.push({ ref: `@${ref}`, box });
          } else {
            skippedRefs.push(`@${ref}`);
          }
        } catch (err) {
          skippedRefs.push(`@${ref}`);
          if (process.env.BROWSE_DEBUG)
            console.error(`[annotate] skipped @${ref}: ${err?.message?.split(`
`)[0]}`);
        }
      }
      await page.evaluate((boxes) => {
        for (const { ref, box } of boxes) {
          const overlay = document.createElement("div");
          overlay.className = "__browse_annotation__";
          overlay.style.cssText = `
            position: absolute; top: ${box.y}px; left: ${box.x}px;
            width: ${box.width}px; height: ${box.height}px;
            border: 2px solid red; background: rgba(255,0,0,0.1);
            pointer-events: none; z-index: 99999;
            font-size: 10px; color: red; font-weight: bold;
          `;
          const label = document.createElement("span");
          label.textContent = ref;
          label.style.cssText = "position: absolute; top: -14px; left: 0; background: red; color: white; padding: 0 3px; font-size: 10px;";
          overlay.appendChild(label);
          document.body.appendChild(overlay);
        }
      }, boxes);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      await guardScreenshotPath(screenshotPath);
      await page.evaluate(() => {
        document.querySelectorAll(".__browse_annotation__").forEach((el) => el.remove());
      });
      output.push("");
      output.push(`[annotated screenshot: ${screenshotPath}]`);
      if (ambiguousRefs.length || skippedRefs.length) {
        const cap = (arr) => arr.slice(0, 8).join(", ") + (arr.length > 8 ? `, +${arr.length - 8} more` : "");
        const parts = [];
        if (ambiguousRefs.length)
          parts.push(`${ambiguousRefs.length} ambiguous (first-match): ${cap(ambiguousRefs)}`);
        if (skippedRefs.length)
          parts.push(`${skippedRefs.length} skipped: ${cap(skippedRefs)}`);
        output.push(`[annotated: ${parts.join(" | ")}]`);
      }
    } catch (err) {
      if (!err?.message?.includes("closed") && !err?.message?.includes("Target") && !err?.message?.includes("Execution context") && !err?.message?.includes("screenshot"))
        throw err;
      try {
        await page.evaluate(() => {
          document.querySelectorAll(".__browse_annotation__").forEach((el) => el.remove());
        });
      } catch (err2) {
        if (!err2?.message?.includes("closed") && !err2?.message?.includes("Target") && !err2?.message?.includes("Execution context"))
          throw err2;
      }
    }
  }
  if (opts.heatmap) {
    const heatmapPath = opts.outputPath || `${TEMP_DIR}/browse-heatmap.png`;
    {
      const nodePath = __require("path");
      const nodeFs = __require("fs");
      const absolute = nodePath.resolve(heatmapPath);
      const safeDirs = [TEMP_DIR, process.cwd()].map((d) => {
        try {
          return nodeFs.realpathSync(d);
        } catch (err) {
          if (err?.code !== "ENOENT")
            throw err;
          return d;
        }
      });
      let realPath;
      try {
        realPath = nodeFs.realpathSync(absolute);
      } catch (err) {
        if (err.code === "ENOENT") {
          try {
            const dir = nodeFs.realpathSync(nodePath.dirname(absolute));
            realPath = nodePath.join(dir, nodePath.basename(absolute));
          } catch (err2) {
            if (err2?.code !== "ENOENT")
              throw err2;
            realPath = absolute;
          }
        } else {
          throw new Error(`Cannot resolve real path: ${heatmapPath} (${err.code})`);
        }
      }
      if (!safeDirs.some((dir) => isPathWithin(realPath, dir))) {
        throw new Error(`Path must be within: ${safeDirs.join(", ")}`);
      }
    }
    const VALID_COLORS = new Set(["green", "yellow", "red", "blue", "orange", "gray"]);
    const COLOR_MAP = {
      green: { border: "#00b400", bg: "rgba(0,180,0,0.15)" },
      yellow: { border: "#ffb400", bg: "rgba(255,180,0,0.15)" },
      red: { border: "#ff0000", bg: "rgba(255,0,0,0.15)" },
      blue: { border: "#0066ff", bg: "rgba(0,102,255,0.15)" },
      orange: { border: "#ff6600", bg: "rgba(255,102,0,0.15)" },
      gray: { border: "#888888", bg: "rgba(136,136,136,0.15)" }
    };
    let colorAssignments;
    try {
      const parsed = JSON.parse(opts.heatmap);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("not an object");
      }
      colorAssignments = parsed;
    } catch {
      throw new Error(`Invalid heatmap JSON. Expected object: '{"@e1":"green","@e3":"red"}'`);
    }
    for (const [ref, color] of Object.entries(colorAssignments)) {
      if (!VALID_COLORS.has(color)) {
        throw new Error(`Invalid heatmap color "${color}" for ${ref}. Valid: ${[...VALID_COLORS].join(", ")}`);
      }
    }
    try {
      const boxes = [];
      for (const [refKey, color] of Object.entries(colorAssignments)) {
        const cleanRef = refKey.startsWith("@") ? refKey.slice(1) : refKey;
        const entry = refMap.get(cleanRef);
        if (!entry)
          continue;
        try {
          const box = await entry.locator.boundingBox({ timeout: 1000 });
          if (box) {
            const colors = COLOR_MAP[color] || COLOR_MAP.gray;
            boxes.push({ ref: `@${cleanRef}`, box, color: JSON.stringify(colors) });
          }
        } catch {}
      }
      await page.evaluate((boxes) => {
        for (const { ref, box, color } of boxes) {
          const colors = JSON.parse(color);
          const overlay = document.createElement("div");
          overlay.className = "__browse_heatmap__";
          overlay.style.cssText = `
            position: absolute; top: ${box.y}px; left: ${box.x}px;
            width: ${box.width}px; height: ${box.height}px;
            border: 2px solid ${colors.border}; background: ${colors.bg};
            pointer-events: none; z-index: 99999;
            font-size: 10px; color: ${colors.border}; font-weight: bold;
          `;
          const label = document.createElement("span");
          label.textContent = ref;
          label.style.cssText = `position: absolute; top: -14px; left: 0; background: ${colors.border}; color: white; padding: 0 3px; font-size: 10px;`;
          overlay.appendChild(label);
          document.body.appendChild(overlay);
        }
      }, boxes);
      await page.screenshot({ path: heatmapPath, fullPage: true });
      await guardScreenshotPath(heatmapPath);
      await page.evaluate(() => {
        document.querySelectorAll(".__browse_heatmap__").forEach((el) => el.remove());
      });
      output.push("");
      output.push(`[heatmap screenshot: ${heatmapPath}]`);
    } catch (err) {
      try {
        await page.evaluate(() => {
          document.querySelectorAll(".__browse_heatmap__").forEach((el) => el.remove());
        });
      } catch {}
      if (!err?.message?.includes("closed") && !err?.message?.includes("Target") && !err?.message?.includes("Execution context") && !err?.message?.includes("screenshot"))
        throw err;
    }
  }
  if (opts.diff) {
    const lastSnapshot = session.getLastSnapshot();
    if (!lastSnapshot) {
      session.setLastSnapshot(snapshotText);
      return snapshotText + `

(no previous snapshot to diff against — this snapshot stored as baseline)` + (outputIgnoredWarning ? `
` + outputIgnoredWarning : "");
    }
    const changes = Diff.diffLines(lastSnapshot, snapshotText);
    const diffOutput = ["--- previous snapshot", "+++ current snapshot", ""];
    for (const part of changes) {
      const prefix = part.added ? "+" : part.removed ? "-" : " ";
      const diffLines = part.value.split(`
`).filter((l) => l.length > 0);
      for (const line of diffLines) {
        diffOutput.push(`${prefix} ${line}`);
      }
    }
    session.setLastSnapshot(snapshotText);
    return stripLoneSurrogates(diffOutput.join(`
`) + (outputIgnoredWarning ? `
` + outputIgnoredWarning : ""));
  }
  session.setLastSnapshot(snapshotText);
  if (inFrame) {
    const frameUrl = session.getFrame()?.url() ?? "unknown";
    output.unshift(`[Context: iframe src="${frameUrl}"]`);
  }
  if (securityOpts?.splitForScoped) {
    const trustedRefs = [];
    const untrustedLines = [];
    for (const line of output) {
      const refMatch = line.match(/^(\s*)@(e\d+|c\d+)\s+\[([^\]]+)\]\s*(.*)/);
      if (refMatch) {
        const [, indent, ref, role, rest] = refMatch;
        const nameMatch = rest.match(/^"(.+?)"/);
        let truncName = nameMatch ? nameMatch[1] : rest.trim();
        if (truncName.length > 50)
          truncName = truncName.slice(0, 47) + "...";
        trustedRefs.push(`${indent}@${ref} [${role}] "${truncName}"`);
      }
      untrustedLines.push(line);
    }
    const parts = [];
    if (trustedRefs.length > 0) {
      parts.push("INTERACTIVE ELEMENTS (trusted — use these @refs for click/fill):");
      parts.push(...trustedRefs);
      parts.push("");
    }
    const safeUntrusted = untrustedLines.map(escapeEnvelopeSentinels);
    parts.push("═══ BEGIN UNTRUSTED WEB CONTENT ═══");
    parts.push(...safeUntrusted);
    parts.push("═══ END UNTRUSTED WEB CONTENT ═══");
    return stripLoneSurrogates(parts.join(`
`));
  }
  return stripLoneSurrogates(output.join(`
`));
}
var INTERACTIVE_ROLES;
var init_snapshot = __esm(() => {
  init_platform();
  init_content_security();
  init_sanitize();
  init_screenshot_size_guard();
  init_snapshot_flags();
  init_snapshot_flags();
  INTERACTIVE_ROLES = new Set([
    "button",
    "link",
    "textbox",
    "checkbox",
    "radio",
    "combobox",
    "listbox",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "option",
    "searchbox",
    "slider",
    "spinbutton",
    "switch",
    "tab",
    "treeitem"
  ]);
});

// browse/src/commands.ts
function wrapUntrustedContent(result, url) {
  const safeUrl = url.replace(/[\n\r]/g, "").slice(0, 200);
  const safeResult = result.replace(/--- (BEGIN|END) UNTRUSTED EXTERNAL CONTENT/g, "--- $1 UNTRUSTED EXTERNAL C​ONTENT");
  return `--- BEGIN UNTRUSTED EXTERNAL CONTENT (source: ${safeUrl}) ---
${safeResult}
--- END UNTRUSTED EXTERNAL CONTENT ---`;
}
function canonicalizeCommand(cmd) {
  return COMMAND_ALIASES[cmd] ?? cmd;
}
function levenshtein(a, b) {
  if (a === b)
    return 0;
  if (a.length === 0)
    return b.length;
  if (b.length === 0)
    return a.length;
  const m = [];
  for (let i = 0;i <= a.length; i++)
    m.push([i, ...Array(b.length).fill(0)]);
  for (let j = 0;j <= b.length; j++)
    m[0][j] = j;
  for (let i = 1;i <= a.length; i++) {
    for (let j = 1;j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + cost);
    }
  }
  return m[a.length][b.length];
}
function buildUnknownCommandError(command, commandSet, aliasMap = COMMAND_ALIASES, newInVersion = NEW_IN_VERSION) {
  let msg = `Unknown command: '${command}'.`;
  if (command.length >= 4) {
    let best;
    let bestDist = 3;
    const candidates = [...commandSet, ...Object.keys(aliasMap)].sort();
    for (const cand of candidates) {
      const d = levenshtein(command, cand);
      if (d <= 2 && d < bestDist) {
        best = cand;
        bestDist = d;
      }
    }
    if (best)
      msg += ` Did you mean '${best}'?`;
  }
  if (newInVersion[command]) {
    msg += ` This command was added in browse v${newInVersion[command]}. Upgrade: cd ~/.claude/skills/gstack && git pull && bun run build.`;
  }
  return msg;
}
var READ_COMMANDS, WRITE_COMMANDS, META_COMMANDS, ALL_COMMANDS, PAGE_CONTENT_COMMANDS, DOM_CONTENT_COMMANDS, COMMAND_DESCRIPTIONS, allCmds, descKeys, COMMAND_ALIASES, NEW_IN_VERSION;
var init_commands = __esm(() => {
  READ_COMMANDS = new Set([
    "text",
    "html",
    "links",
    "forms",
    "accessibility",
    "js",
    "eval",
    "css",
    "attrs",
    "console",
    "network",
    "cookies",
    "storage",
    "perf",
    "dialog",
    "is",
    "inspect",
    "media",
    "data"
  ]);
  WRITE_COMMANDS = new Set([
    "goto",
    "back",
    "forward",
    "reload",
    "load-html",
    "click",
    "fill",
    "select",
    "hover",
    "type",
    "press",
    "scroll",
    "wait",
    "viewport",
    "cookie",
    "cookie-import",
    "cookie-import-browser",
    "header",
    "useragent",
    "upload",
    "dialog-accept",
    "dialog-dismiss",
    "style",
    "cleanup",
    "prettyscreenshot",
    "download",
    "scrape",
    "archive"
  ]);
  META_COMMANDS = new Set([
    "tabs",
    "tab",
    "tab-each",
    "newtab",
    "closetab",
    "status",
    "stop",
    "restart",
    "screenshot",
    "pdf",
    "responsive",
    "chain",
    "diff",
    "url",
    "snapshot",
    "handoff",
    "resume",
    "connect",
    "disconnect",
    "focus",
    "inbox",
    "watch",
    "state",
    "frame",
    "ux-audit",
    "domain-skill",
    "skill",
    "cdp",
    "memory"
  ]);
  ALL_COMMANDS = new Set([...READ_COMMANDS, ...WRITE_COMMANDS, ...META_COMMANDS]);
  PAGE_CONTENT_COMMANDS = new Set([
    "text",
    "html",
    "links",
    "forms",
    "accessibility",
    "attrs",
    "console",
    "dialog",
    "media",
    "data",
    "ux-audit",
    "snapshot"
  ]);
  DOM_CONTENT_COMMANDS = new Set([
    "text",
    "html",
    "links",
    "forms",
    "accessibility",
    "attrs",
    "media",
    "data",
    "ux-audit"
  ]);
  COMMAND_DESCRIPTIONS = {
    memory: { category: "Server", description: "Snapshot Bun heap + per-tab JS heap + Chromium process tree + bounded buffer sizes. JSON output with --json.", usage: "memory [--json]" },
    goto: { category: "Navigation", description: "Navigate to URL (http://, https://, or file:// scoped to cwd/TEMP_DIR)", usage: "goto <url>" },
    "load-html": { category: "Navigation", description: 'Load HTML via setContent. Accepts a file path under safe-dirs (validated), OR --from-file <payload.json> with {"html":"...","waitUntil":"..."} for large inline HTML (Windows argv safe).', usage: "load-html <file> [--wait-until load|domcontentloaded|networkidle] [--tab-id <N>]  |  load-html --from-file <payload.json> [--tab-id <N>]" },
    back: { category: "Navigation", description: "History back" },
    forward: { category: "Navigation", description: "History forward" },
    reload: { category: "Navigation", description: "Reload page" },
    url: { category: "Navigation", description: "Print current URL" },
    text: { category: "Reading", description: "Cleaned visible page text, or cleaned text for a CSS selector/@ref when one is provided", usage: "text [selector|@ref]" },
    html: { category: "Reading", description: "innerHTML of selector (throws if not found), or full page HTML if no selector given", usage: "html [selector]" },
    links: { category: "Reading", description: 'All links as "text → href"' },
    forms: { category: "Reading", description: "Form fields as JSON" },
    accessibility: { category: "Reading", description: "Full ARIA tree" },
    media: { category: "Reading", description: "All media elements (images, videos, audio) with URLs, dimensions, types", usage: "media [--images|--videos|--audio] [selector]" },
    data: { category: "Reading", description: "Structured data: JSON-LD, Open Graph, Twitter Cards, meta tags", usage: "data [--jsonld|--og|--meta|--twitter]" },
    js: { category: "Inspection", description: "Run inline JavaScript expression in the page context and return result as string. Same JS sandbox as eval; the only difference is js takes an inline expr while eval reads from a file. With --out <file>, the result is written to disk instead of returned (a base64 data URL is decoded to raw bytes unless --raw is given) — ideal for rasterizing local renders to PNG without serializing megabytes back through the CLI. --out makes the invocation a WRITE (needs write scope, never allowed over the tunnel).", usage: "js <expr> [--out <file>] [--raw]" },
    eval: { category: "Inspection", description: "Run JavaScript from a file in the page context and return result as string. Path must resolve under /tmp or cwd (no traversal). Use eval for multi-line scripts; use js for one-liners. With --out <file>, the result is written to disk (base64 data URL decoded to bytes unless --raw); --out makes the invocation a WRITE (needs write scope, never allowed over the tunnel).", usage: "eval <file> [--out <file>] [--raw]" },
    css: { category: "Inspection", description: "Computed CSS value", usage: "css <sel> <prop>" },
    attrs: { category: "Inspection", description: "Element attributes as JSON", usage: "attrs <sel|@ref>" },
    is: { category: "Inspection", description: "State check on element. Valid <prop> values: visible, hidden, enabled, disabled, checked, editable, focused (case-sensitive). <sel> accepts a CSS selector OR an @ref token from a prior snapshot (e.g. @e3, @c1) — refs are interchangeable with selectors anywhere a selector is expected.", usage: "is <prop> <sel|@ref>" },
    console: { category: "Inspection", description: "Console messages (--errors filters to error/warning)", usage: "console [--clear|--errors]" },
    network: { category: "Inspection", description: "Captured network requests as lines with method, status, resource type, and URL. --clear empties the captured request buffer.", usage: "network [--clear]" },
    dialog: { category: "Inspection", description: "Captured alert/confirm/prompt messages as text/JSON events. --clear empties the dialog buffer.", usage: "dialog [--clear]" },
    cookies: { category: "Inspection", description: "All cookies as JSON" },
    storage: { category: "Inspection", description: 'Read both localStorage and sessionStorage as JSON. With "set <key> <value>", write to localStorage only (sessionStorage is read-only via this command — set it with `js sessionStorage.setItem(...)`).', usage: "storage  |  storage set <key> <value>" },
    perf: { category: "Inspection", description: "Page load timings as JSON-ish milliseconds for navigation/load phases" },
    click: { category: "Interaction", description: "Click element", usage: "click <sel>" },
    fill: { category: "Interaction", description: "Fill input", usage: "fill <sel> <val>" },
    select: { category: "Interaction", description: "Select dropdown option by value, label, or visible text", usage: "select <sel> <val>" },
    hover: { category: "Interaction", description: "Hover element", usage: "hover <sel>" },
    type: { category: "Interaction", description: "Send keystrokes to the focused element, or to <sel> with --selector (focuses it first). Text that starts with -- goes after a -- separator.", usage: "type [--selector <sel>] [--] <text>" },
    press: { category: "Interaction", description: "Press a Playwright keyboard key against the focused element. Names are case-sensitive: Enter, Tab, Escape, ArrowUp/Down/Left/Right, Backspace, Delete, Home, End, PageUp, PageDown. Modifiers combine with +: Shift+Enter, Control+A, Meta+K. Single printable chars (a, A, 1) work too. Full key list: https://playwright.dev/docs/api/class-keyboard#keyboard-press", usage: "press <key>" },
    scroll: { category: "Interaction", description: "With a selector, smooth-scrolls the element into view. Without a selector, jumps to page bottom. No --by/--to amount option; for pixel-precise scrolling use `js window.scrollTo(0, N)`.", usage: "scroll [sel|@ref]" },
    wait: { category: "Interaction", description: "Wait for element, network idle, or page load (timeout: 15s)", usage: "wait <sel|--networkidle|--load>" },
    upload: { category: "Interaction", description: "Upload file(s)", usage: "upload <sel> <file> [file2...]" },
    viewport: { category: "Interaction", description: "Set viewport size and optional deviceScaleFactor (1-3, for retina screenshots). --scale requires a context rebuild. `auto` (alias `reset`) unpins: headed follows the window again, headless returns to 1280x720.", usage: "viewport [<WxH>|auto] [--scale <n>]" },
    cookie: { category: "Interaction", description: "Set cookie on current page domain", usage: "cookie <name>=<value>" },
    "cookie-import": { category: "Interaction", description: "Import cookies from JSON file", usage: "cookie-import <json>" },
    "cookie-import-browser": { category: "Interaction", description: "Copy cookies from chrome, chromium, brave, edge, Windows-only opera, opera-gx, or macOS-only comet or arc. Omitted browser retains legacy comet; select the intended browser explicitly. --domain requires a matching current page; no scope flag opens the picker. --profile is the source directory; ambiguous profiles require selection. --all explicitly selects every non-expired cookie and cannot accompany --domain or --clear-storage. Storage is preserved unless --clear-storage resets captured-origin localStorage (shared across context tabs) and target-tab sessionStorage. --verify-auth requires daemon GSTACK_COOKIE_AUTH_SELECTOR and GSTACK_COOKIE_AUTH_EXPECTED_IDENTITY before startup; missing config rejects before mutation. Verified means an exact visible identity match, not cookie counts or HTTP 200. Windows native extraction remains disabled pending qualification.", usage: "cookie-import-browser [browser] [--domain d] [--profile p] [--all] [--clear-storage] [--verify-auth]" },
    header: { category: "Interaction", description: "Set custom request header (colon-separated, sensitive values auto-redacted)", usage: "header <name>:<value>" },
    useragent: { category: "Interaction", description: "Set user agent", usage: "useragent <string>" },
    "dialog-accept": { category: "Interaction", description: "Auto-accept next alert/confirm/prompt. Optional text is sent as the prompt response", usage: "dialog-accept [text]" },
    "dialog-dismiss": { category: "Interaction", description: "Auto-dismiss next dialog" },
    download: { category: "Extraction", description: "Download URL or media element to disk using browser cookies. Default path: <temp>/browse-download-<timestamp>.<ext>. --base64 returns a data:<mime>;base64,... string instead of writing, capped at 10MB. Use --navigate for URLs that trigger browser downloads (CDN redirects, Content-Disposition, anti-bot protected sites).", usage: "download <url|@ref> [path] [--base64] [--navigate]" },
    scrape: { category: "Extraction", description: "Bulk download all media from page to --dir (default: <temp>/browse-scrape-<timestamp>). Writes files plus manifest.json with source URL, size, type, success/failure counts. --limit defaults to 50 and caps at 200.", usage: "scrape <images|videos|media> [--selector sel] [--dir path] [--limit N]" },
    archive: { category: "Extraction", description: "Save complete page as MHTML via CDP. Default path: <temp>/browse-archive-<timestamp>.mhtml. Returns the saved path, size, and MHTML marker.", usage: "archive [path]" },
    screenshot: { category: "Visual", description: "Save screenshot. Default path: <temp>/browse-screenshot.png. Default capture is full-page; --viewport captures only the viewport. --selector targets a specific element; --clip uses x,y,width,height pixels. --base64 returns data:image/png;base64,... instead of writing, capped at 10MB. Positional selectors starting with ./#/@/[ still work.", usage: "screenshot [--selector <css>] [--viewport] [--clip x,y,w,h] [--base64] [selector|@ref] [path]" },
    pdf: { category: "Visual", description: "Save the current page as PDF. Default path: <temp>/browse-page.pdf. <dim> accepts CSS units like 1in, 72pt, 25mm, 2.54cm; bare numbers are pixels. Supports page layout (--format, --width, --height, --margins, --margin-*), structure (--toc waits briefly for Paged.js), branding (--header-template, --footer-template, --page-numbers), accessibility (--tagged, --outline), and --from-file <payload.json> for large payloads. Use --tab-id <N> to target a specific tab.", usage: "pdf [path] [--format letter|a4|legal] [--width <dim> --height <dim>] [--margins <dim>] [--margin-top <dim> --margin-right <dim> --margin-bottom <dim> --margin-left <dim>] [--header-template <html>] [--footer-template <html>] [--page-numbers] [--tagged] [--outline] [--print-background] [--prefer-css-page-size] [--toc] [--tab-id <N>]  |  pdf --from-file <payload.json> [--tab-id <N>]" },
    responsive: { category: "Visual", description: "Screenshots at mobile (375x812), tablet (768x1024), desktop (1280x720). Saves as {prefix}-mobile.png etc.", usage: "responsive [prefix]" },
    diff: { category: "Visual", description: "Text diff between pages", usage: "diff <url1> <url2>" },
    tabs: { category: "Tabs", description: "List open tabs" },
    tab: { category: "Tabs", description: "Switch to tab", usage: "tab <id>" },
    newtab: { category: "Tabs", description: 'Open new tab. With --json, returns {"tabId":N,"url":...} for programmatic use (make-pdf).', usage: "newtab [url] [--json]" },
    closetab: { category: "Tabs", description: "Close tab", usage: "closetab [id]" },
    "tab-each": { category: "Tabs", description: "Run a command on every open tab. Returns JSON with per-tab results.", usage: "tab-each <command> [args...]" },
    status: { category: "Server", description: "Health check" },
    stop: { category: "Server", description: "Shutdown server" },
    restart: { category: "Server", description: "Restart server" },
    snapshot: { category: "Snapshot", description: "Accessibility tree with @e refs for element selection. Flags: -i interactive only, -c compact, -d N depth limit, -s sel scope, -D diff vs previous, -a annotated screenshot, -o path output, -C cursor-interactive @c refs", usage: "snapshot [flags]" },
    chain: { category: "Meta", description: 'Run a sequence of commands from JSON on stdin. One JSON array of arrays, each inner array is [cmd, ...args]. Output is one JSON result per command. Pipe a JSON array (e.g. `[["goto","https://example.com"],["text","h1"]]`) to `$B chain` and it runs the goto then the text command in order. Stops at the first error.', usage: "chain  (JSON via stdin)" },
    handoff: { category: "Server", description: "Open visible Chrome at current page for user takeover", usage: "handoff [message]" },
    resume: { category: "Server", description: "Re-snapshot after user takeover, return control to AI", usage: "resume" },
    connect: { category: "Server", description: "Launch headed Chromium with Chrome extension; --supervise keeps the CLI attached and respawns a crashed server", usage: "connect [--supervise]" },
    disconnect: { category: "Server", description: "Disconnect headed browser, return to headless mode" },
    focus: { category: "Server", description: "Bring headed browser window to foreground (macOS)", usage: "focus [@ref]" },
    inbox: { category: "Meta", description: "List sidebar inbox messages from the visible browser extension as JSON/text; --clear removes them after reading.", usage: "inbox [--clear]" },
    watch: { category: "Meta", description: "Start passive observation mode: records periodic snapshots while the user browses and blocks mutation commands. Use watch stop to end observation and return the collected snapshot summary.", usage: "watch [stop]" },
    state: { category: "Server", description: "Save/load browser state (cookies + URLs)", usage: "state save|load <name>" },
    frame: { category: "Meta", description: "Switch command context to an iframe, or `main` to return to the top page. <sel> is CSS, @ref comes from snapshot, --name matches frame name exactly, and --url pattern is a substring match against frame URL.", usage: "frame <sel|@ref|--name n|--url pattern|main>" },
    inspect: { category: "Inspection", description: "Deep CSS inspection via CDP. Default inspects one selector and returns matching element, full rule cascade, box model, and computed styles. --all returns every inspectable element summary; --history returns prior style modifications/inspection state.", usage: "inspect [selector] [--all] [--history]" },
    style: { category: "Interaction", description: "Modify CSS property on element (with undo support)", usage: "style <sel> <prop> <value> | style --undo [N]" },
    cleanup: { category: "Interaction", description: "Remove page clutter by hiding matched elements. With no flags, defaults to --all. --all includes ads, cookies, sticky, social, overlays, and clutter; individual flags limit the categories. Returns removed element count.", usage: "cleanup [--ads] [--cookies] [--sticky] [--social] [--overlays] [--clutter] [--all]" },
    prettyscreenshot: { category: "Visual", description: "Clean screenshot with optional cleanup, scroll positioning, and element hiding", usage: "prettyscreenshot [--scroll-to sel|text] [--cleanup] [--hide sel...] [--width px] [path]" },
    "ux-audit": { category: "Inspection", description: "Extract page structure for UX behavioral analysis — site ID, nav, headings, text blocks, interactive elements. Returns JSON for agent interpretation.", usage: "ux-audit" },
    "domain-skill": { category: "Meta", description: 'Per-site notes the agent writes for itself. Host is derived from the active tab. Lifecycle: `save` adds a quarantined note → after N=3 successful uses without the prompt-injection classifier flagging it, the note auto-promotes to "active" → `promote-to-global` lifts it to the global tier (machine-wide, all projects). The classifier flag is set automatically by the L4 prompt-injection scan; agents do not set it manually. Use `list` / `show` to inspect, `edit` to revise, `rollback` to demote, `rm` to tombstone.', usage: "domain-skill save|list|show|edit|promote-to-global|rollback|rm <host?>" },
    skill: { category: "Meta", description: "Run a browser-skill: deterministic Playwright script that drives the daemon over loopback HTTP. 3-tier lookup (project > global > bundled). Spawned scripts get a per-spawn scoped token (read+write only) — never the daemon root token.", usage: "skill list|show|run|test|rm <name?> [--arg k=v]... [--timeout=Ns]" },
    cdp: { category: "Inspection", description: "Raw Chrome DevTools Protocol method dispatch. Deny-default: only methods enumerated in `browse/src/cdp-allowlist.ts` (CDP_ALLOWLIST const) are reachable; any other method 403s. Each allowlist entry declares scope (tab vs browser) and output (trusted vs untrusted) — untrusted methods (data-exfil-shaped, e.g. Network.getResponseBody) get UNTRUSTED-envelope wrapped output. To discover allowed methods: read `browse/src/cdp-allowlist.ts`. Example: `$B cdp Page.getLayoutMetrics`.", usage: "cdp <Domain.method> [json-params]" }
  };
  allCmds = new Set([...READ_COMMANDS, ...WRITE_COMMANDS, ...META_COMMANDS]);
  descKeys = new Set(Object.keys(COMMAND_DESCRIPTIONS));
  for (const cmd of allCmds) {
    if (!descKeys.has(cmd))
      throw new Error(`COMMAND_DESCRIPTIONS missing entry for: ${cmd}`);
  }
  for (const key of descKeys) {
    if (!allCmds.has(key))
      throw new Error(`COMMAND_DESCRIPTIONS has unknown command: ${key}`);
  }
  COMMAND_ALIASES = {
    setcontent: "load-html",
    "set-content": "load-html",
    setContent: "load-html"
  };
  NEW_IN_VERSION = {
    "load-html": "0.19.0.0"
  };
});

// browse/src/domain-skills.ts
import { promises as fs16 } from "fs";
import { open as fsOpen, constants as fsConstants } from "fs";
import * as path15 from "path";
import { createHash as createHash3 } from "crypto";
function gstackHome2() {
  return resolveStateRoot();
}
function globalFile() {
  return path15.join(gstackHome2(), "global-domain-skills.jsonl");
}
function projectFile(slug) {
  return path15.join(gstackHome2(), "projects", slug, "learnings.jsonl");
}
function normalizeHost(input) {
  let h = input.trim().toLowerCase();
  h = h.replace(/^https?:\/\//, "");
  h = h.split("/")[0].split("?")[0].split("#")[0];
  h = h.split(":")[0];
  h = h.replace(/^www\./, "");
  return h;
}
async function deriveHostFromActiveTab(page) {
  const url = page.url();
  if (!url || url === "about:blank" || url.startsWith("chrome://")) {
    throw new Error(`Cannot save domain-skill: no top-level URL on active tab.
` + `Cause: tab is empty or on chrome:// page.
` + "Action: navigate to the target site first with $B goto <url>.");
  }
  return normalizeHost(url);
}
async function ensureDir2(filePath) {
  await fs16.mkdir(path15.dirname(filePath), { recursive: true });
}
async function appendRow(filePath, row) {
  await ensureDir2(filePath);
  const line = JSON.stringify(row) + `
`;
  return new Promise((resolve, reject) => {
    fsOpen(filePath, fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_APPEND, 420, (err, fd) => {
      if (err)
        return reject(err);
      const buf = Buffer.from(line, "utf8");
      const writeAndSync = () => {
        const fsSync = __require("fs");
        try {
          fsSync.writeSync(fd, buf, 0, buf.length);
          fsSync.fsyncSync(fd);
          fsSync.closeSync(fd);
          resolve();
        } catch (e) {
          try {
            fsSync.closeSync(fd);
          } catch {}
          reject(e);
        }
      };
      writeAndSync();
    });
  });
}
async function readRows(filePath) {
  let raw;
  try {
    raw = await fs16.readFile(filePath, "utf8");
  } catch (e) {
    const err = e;
    if (err.code === "ENOENT")
      return [];
    throw err;
  }
  const rows = [];
  const lines = raw.split(`
`);
  for (const line of lines) {
    if (!line)
      continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed && parsed.type === "domain")
        rows.push(parsed);
    } catch {}
  }
  return rows;
}
function keyOf(row) {
  return `${row.scope}::${row.host}`;
}
function resolveLatest(rows) {
  const m = new Map;
  for (const row of rows) {
    const k = keyOf(row);
    const prior = m.get(k);
    if (!prior || row.version >= prior.version) {
      m.set(k, row);
    }
  }
  for (const [k, row] of m) {
    if (row.tombstone)
      m.delete(k);
  }
  return m;
}
async function readSkill(host, projectSlug) {
  const normalized = normalizeHost(host);
  const projectRows = await readRows(projectFile(projectSlug));
  const projectLatest = resolveLatest(projectRows);
  const projectHit = projectLatest.get(`project::${normalized}`);
  if (projectHit && projectHit.state === "active") {
    return { row: projectHit, source: "project" };
  }
  const globalRows = await readRows(globalFile());
  const globalLatest = resolveLatest(globalRows);
  const globalHit = globalLatest.get(`global::${normalized}`);
  if (globalHit && globalHit.state === "global") {
    return { row: globalHit, source: "global" };
  }
  return null;
}
async function writeSkill(input) {
  if (input.classifierScore >= 0.85) {
    throw new Error(`Save blocked: classifier flagged content as potential injection (score: ${input.classifierScore.toFixed(2)}).
` + `Cause: skill body contains patterns the L4 classifier marks as risky.
` + "Action: rewrite the skill content removing instruction-like prose, retry.");
  }
  const normalized = normalizeHost(input.host);
  const body = input.body;
  const now = new Date().toISOString();
  const sha = createHash3("sha256").update(body, "utf8").digest("hex");
  const projectRows = await readRows(projectFile(input.projectSlug));
  const projectLatest = resolveLatest(projectRows);
  const prior = projectLatest.get(`project::${normalized}`);
  const version = prior ? prior.version + 1 : 1;
  const row = {
    type: "domain",
    host: normalized,
    scope: "project",
    state: "quarantined",
    body,
    version,
    classifier_score: input.classifierScore,
    source: input.source,
    sha256: sha,
    use_count: 0,
    flag_count: 0,
    created_ts: prior?.created_ts ?? now,
    updated_ts: now
  };
  await appendRow(projectFile(input.projectSlug), row);
  return row;
}
async function promoteToGlobal(host, projectSlug) {
  const normalized = normalizeHost(host);
  const rows = await readRows(projectFile(projectSlug));
  const latest = resolveLatest(rows);
  const current = latest.get(`project::${normalized}`);
  if (!current) {
    throw new Error(`Cannot promote: no skill for ${normalized} in project ${projectSlug}.
` + `Cause: skill does not exist or is tombstoned.
` + "Action: $B domain-skill list to see what exists in this project.");
  }
  if (current.state !== "active") {
    throw new Error(`Cannot promote: skill for ${normalized} is in state "${current.state}", expected "active".
` + `Cause: skill must be active in this project (used ${PROMOTE_THRESHOLD}+ times without flag) before global promotion.
` + "Action: use the skill in this project until it auto-promotes to active.");
  }
  const now = new Date().toISOString();
  const globalRow = {
    ...current,
    scope: "global",
    state: "global",
    version: 1,
    use_count: 0,
    flag_count: 0,
    updated_ts: now
  };
  await appendRow(globalFile(), globalRow);
  return globalRow;
}
async function rollbackSkill(host, projectSlug, scope = "project") {
  const normalized = normalizeHost(host);
  const file = scope === "project" ? projectFile(projectSlug) : globalFile();
  const rows = await readRows(file);
  const matching = rows.filter((r) => r.host === normalized && r.scope === scope && !r.tombstone);
  if (matching.length < 2) {
    throw new Error(`Cannot rollback: ${normalized} has fewer than 2 versions in ${scope} scope.
` + `Cause: no prior version to roll back to.
` + "Action: $B domain-skill rm to delete instead, or wait for a future revision to roll back from.");
  }
  matching.sort((a, b) => b.version - a.version);
  const target = matching[1];
  const newVersion = matching[0].version + 1;
  const restored = {
    ...target,
    version: newVersion,
    updated_ts: new Date().toISOString()
  };
  await appendRow(file, restored);
  return restored;
}
async function listSkills(projectSlug) {
  const projectRows = await readRows(projectFile(projectSlug));
  const globalRows = await readRows(globalFile());
  const projectLatest = Array.from(resolveLatest(projectRows).values());
  const globalLatest = Array.from(resolveLatest(globalRows).values()).filter((r) => r.state === "global");
  return { project: projectLatest, global: globalLatest };
}
async function deleteSkill(host, projectSlug, scope = "project") {
  const normalized = normalizeHost(host);
  const file = scope === "project" ? projectFile(projectSlug) : globalFile();
  const rows = await readRows(file);
  const latest = resolveLatest(rows);
  const current = latest.get(`${scope}::${normalized}`);
  if (!current) {
    throw new Error(`Cannot delete: no skill for ${normalized} in ${scope} scope.
` + `Cause: skill does not exist or is already tombstoned.
` + "Action: $B domain-skill list to see what exists.");
  }
  const tombstone = {
    ...current,
    version: current.version + 1,
    updated_ts: new Date().toISOString(),
    tombstone: true
  };
  await appendRow(file, tombstone);
}
var PROMOTE_THRESHOLD = 3;
var init_domain_skills = __esm(() => {
  init_state_root();
});

// browse/src/project-slug.ts
import * as path16 from "path";
import * as os9 from "os";
import { execSync } from "child_process";
function getCurrentProjectSlug() {
  if (cachedSlug)
    return cachedSlug;
  const explicit = process.env.GSTACK_PROJECT_SLUG;
  if (explicit) {
    cachedSlug = explicit;
    return explicit;
  }
  try {
    const slugBin = path16.join(os9.homedir(), ".claude/skills/gstack/bin/gstack-slug");
    const out = execSync(slugBin, { encoding: "utf8", timeout: 2000, windowsHide: true }).trim();
    const m = out.match(/SLUG="?([^"\n]+)"?/);
    cachedSlug = m ? m[1] : out || "unknown";
  } catch {
    cachedSlug = "unknown";
  }
  return cachedSlug;
}
var cachedSlug = null;
var init_project_slug = () => {};

// browse/src/domain-skill-commands.ts
import { promises as fs17 } from "fs";
import * as path17 from "path";
import * as os10 from "os";
import { spawnSync } from "child_process";
async function readBodyFromArgs(args) {
  const fromFileIdx = args.indexOf("--from-file");
  if (fromFileIdx >= 0 && fromFileIdx + 1 < args.length) {
    const filePath = args[fromFileIdx + 1];
    const body = await fs17.readFile(filePath, "utf8");
    return body;
  }
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => data += chunk);
    process.stdin.on("end", () => resolve(data));
    if (process.stdin.isTTY)
      resolve("");
  });
}
function formatSavedOk(row, slug) {
  return [
    `Saved (state: ${row.state}, scope: ${row.scope}).`,
    `Host: ${row.host}`,
    `Bytes: ${row.body.length}`,
    `Version: ${row.version}`,
    `Stored at: ~/.gstack/projects/${slug}/learnings.jsonl`,
    "",
    `Next: skill is quarantined and won't fire in prompts until used 3 times`,
    `      without classifier flags. Run $B domain-skill list to see state.`
  ].join(`
`);
}
function formatSkillListing(list) {
  if (list.project.length === 0 && list.global.length === 0) {
    return `No domain-skills yet.

Next: navigate to a site, then $B domain-skill save with a markdown body to begin.`;
  }
  const lines = [];
  if (list.project.length > 0) {
    lines.push("Project (per-project):");
    for (const r of list.project) {
      lines.push(`  [${r.state}] ${r.host} — v${r.version}, ${r.body.length} bytes, used ${r.use_count}× (${r.flag_count} flags)`);
    }
  }
  if (list.global.length > 0) {
    if (lines.length > 0)
      lines.push("");
    lines.push("Global (cross-project):");
    for (const r of list.global) {
      lines.push(`  ${r.host} — v${r.version}, ${r.body.length} bytes`);
    }
  }
  return lines.join(`
`);
}
async function handleSave(args, bm) {
  const page = bm.getPage();
  const host = await deriveHostFromActiveTab(page);
  const body = await readBodyFromArgs(args);
  if (!body || !body.trim()) {
    throw new Error(`Save failed: empty body.
` + `Cause: no content provided via --from-file or stdin.
` + "Action: pipe markdown into $B domain-skill save, or pass --from-file <path>.");
  }
  const filterResult = runContentFilters(body, page.url(), "domain-skill-save");
  if (filterResult.blocked) {
    logTelemetry({ event: "domain_skill_save_blocked", host, reason: filterResult.message });
    throw new Error(`Save blocked: ${filterResult.message}
` + `Cause: skill body trips L1-L3 content filters (likely contains URL blocklist match or ARIA injection patterns).
` + "Action: review the body for suspicious instruction-like content; rewrite and retry.");
  }
  const slug = getCurrentProjectSlug();
  const row = await writeSkill({
    host,
    body,
    projectSlug: slug,
    source: "agent",
    classifierScore: 0
  });
  logTelemetry({ event: "domain_skill_saved", host, scope: row.scope, state: row.state, bytes: body.length });
  return formatSavedOk(row, slug);
}
async function handleList(_args) {
  const slug = getCurrentProjectSlug();
  const list = await listSkills(slug);
  return formatSkillListing(list);
}
async function handleShow(args) {
  const host = args[0];
  if (!host) {
    throw new Error(`Usage: $B domain-skill show <host>
` + `Cause: missing hostname argument.
` + "Action: $B domain-skill list to see available hosts.");
  }
  const slug = getCurrentProjectSlug();
  const result = await readSkill(host, slug);
  if (!result) {
    return `No active skill for ${host}.

A quarantined skill may exist; run $B domain-skill list to see all states.`;
  }
  return [
    `# ${result.row.host} (${result.source} scope, ${result.row.state})`,
    `# version: ${result.row.version}, used: ${result.row.use_count}×, flags: ${result.row.flag_count}`,
    "",
    result.row.body
  ].join(`
`);
}
async function handleEdit(args) {
  const host = args[0];
  if (!host) {
    throw new Error("Usage: $B domain-skill edit <host>");
  }
  const slug = getCurrentProjectSlug();
  const list = await listSkills(slug);
  const current = [...list.project, ...list.global].find((r) => r.host === host);
  if (!current) {
    throw new Error(`Cannot edit: no skill for ${host}.
` + `Cause: skill does not exist in this project or global scope.
` + "Action: $B domain-skill save to create one first.");
  }
  const editor = process.env.EDITOR || "vi";
  const tmpFile = path17.join(os10.tmpdir(), `gstack-domain-skill-${process.pid}-${Date.now()}.md`);
  await fs17.writeFile(tmpFile, current.body, "utf8");
  const result = spawnSync(editor, [tmpFile], { stdio: "inherit" });
  if (result.status !== 0) {
    await fs17.unlink(tmpFile).catch(() => {});
    throw new Error(`Editor exited with status ${result.status}; no changes saved.`);
  }
  const newBody = await fs17.readFile(tmpFile, "utf8");
  await fs17.unlink(tmpFile).catch(() => {});
  if (newBody === current.body) {
    return `No changes for ${host}.`;
  }
  const page = global.__bm?.getPage?.();
  const row = await writeSkill({
    host: current.host,
    body: newBody,
    projectSlug: slug,
    source: "human",
    classifierScore: 0
  });
  return formatSavedOk(row, slug);
}
async function handlePromoteToGlobal(args) {
  const host = args[0];
  if (!host) {
    throw new Error("Usage: $B domain-skill promote-to-global <host>");
  }
  const slug = getCurrentProjectSlug();
  const row = await promoteToGlobal(host, slug);
  return [
    `Promoted ${row.host} to global scope (v${row.version}).`,
    `Stored at: ~/.gstack/global-domain-skills.jsonl`,
    "",
    `This skill now fires for all projects unless they have a per-project skill for the same host.`
  ].join(`
`);
}
async function handleRollback(args) {
  const host = args[0];
  if (!host) {
    throw new Error("Usage: $B domain-skill rollback <host>");
  }
  const scope = args.includes("--global") ? "global" : "project";
  const slug = getCurrentProjectSlug();
  const row = await rollbackSkill(host, slug, scope);
  return [
    `Rolled back ${row.host} (${scope} scope) to prior version.`,
    `New version: ${row.version} (content from earlier revision)`
  ].join(`
`);
}
async function handleRm(args) {
  const host = args[0];
  if (!host) {
    throw new Error("Usage: $B domain-skill rm <host> [--global]");
  }
  const scope = args.includes("--global") ? "global" : "project";
  const slug = getCurrentProjectSlug();
  await deleteSkill(host, slug, scope);
  return `Tombstoned ${host} (${scope} scope). Use $B domain-skill rollback to restore.`;
}
async function handleDomainSkillCommand(args, bm) {
  const sub = args[0];
  const rest = args.slice(1);
  switch (sub) {
    case "save":
      return handleSave(rest, bm);
    case "list":
      return handleList(rest);
    case "show":
      return handleShow(rest);
    case "edit":
      return handleEdit(rest);
    case "promote-to-global":
      return handlePromoteToGlobal(rest);
    case "rollback":
      return handleRollback(rest);
    case "rm":
    case "remove":
    case "delete":
      return handleRm(rest);
    case undefined:
    case "":
    case "help":
      return [
        "$B domain-skill — agent-authored per-site notes",
        "",
        "Subcommands:",
        "  save              save body from stdin or --from-file (host derived from active tab)",
        "  list              list all skills visible to current project",
        "  show <host>       print skill body",
        "  edit <host>       open in $EDITOR",
        "  promote-to-global <host>  promote active skill to global scope",
        "  rollback <host> [--global]  restore prior version",
        "  rm <host> [--global]  tombstone"
      ].join(`
`);
    default:
      throw new Error(`Unknown subcommand: ${sub}
` + `Cause: not one of save|list|show|edit|promote-to-global|rollback|rm.
` + "Action: $B domain-skill help for the full list.");
  }
}
var init_domain_skill_commands = __esm(() => {
  init_domain_skills();
  init_content_security();
  init_project_slug();
  init_telemetry();
});

// browse/src/browser-skills.ts
import * as fs18 from "fs";
import * as path18 from "path";
import * as cp from "child_process";
function defaultTierPaths(opts = {}) {
  const stateRoot = opts.home !== undefined ? path18.join(opts.home, ".gstack") : resolveStateRoot();
  const projectRoot = opts.projectRoot ?? detectProjectRoot();
  const bundledRoot = opts.bundledRoot ?? detectBundledRoot();
  return {
    project: projectRoot ? path18.join(projectRoot, ".gstack", "browser-skills") : null,
    global: path18.join(stateRoot, "browser-skills"),
    bundled: path18.join(bundledRoot, "browser-skills")
  };
}
function detectProjectRoot() {
  try {
    const proc = cp.spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf-8", timeout: 2000, windowsHide: true });
    if (proc.status === 0) {
      const out = proc.stdout.trim();
      return out || null;
    }
  } catch {}
  return null;
}
function detectBundledRoot() {
  try {
    const exec = process.execPath;
    if (exec && /\/browse\/dist\/browse$/.test(exec)) {
      return path18.resolve(path18.dirname(exec), "..", "..");
    }
  } catch {}
  return path18.resolve(__dirname, "..", "..");
}
function parseSkillFile(content, opts = {}) {
  if (!content.startsWith(`---
`)) {
    throw new Error('SKILL.md missing frontmatter block (expected starting "---\\n")');
  }
  const fmEnd = content.indexOf(`
---`, 4);
  if (fmEnd === -1) {
    throw new Error('SKILL.md frontmatter block not terminated (expected "\\n---")');
  }
  const fmText = content.slice(4, fmEnd);
  const bodyMd = content.slice(fmEnd + 4).replace(/^\n+/, "");
  const fm = parseFrontmatterFields(fmText);
  const errors = [];
  const name = fm.name ?? opts.skillName ?? "";
  if (!name)
    errors.push("missing required field: name (or skillName hint)");
  if (!fm.host)
    errors.push("missing required field: host");
  if (errors.length > 0) {
    throw new Error(`SKILL.md validation failed: ${errors.join("; ")}`);
  }
  const frontmatter = {
    name,
    description: fm.description,
    host: fm.host,
    triggers: Array.isArray(fm.triggers) ? fm.triggers : [],
    args: Array.isArray(fm.args) ? fm.args : [],
    trusted: fm.trusted === true,
    version: typeof fm.version === "string" ? fm.version : undefined,
    source: fm.source === "agent" || fm.source === "human" ? fm.source : undefined
  };
  return { frontmatter, bodyMd };
}
function parseFrontmatterFields(fm) {
  const result = {};
  const lines = fm.split(`
`);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) {
      i++;
      continue;
    }
    const scalar = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)$/);
    if (scalar && !line.startsWith(" ")) {
      const key = scalar[1];
      const rawVal = scalar[2];
      if (!rawVal) {
        const nextNonBlank = findNextNonBlank(lines, i + 1);
        if (nextNonBlank !== -1 && lines[nextNonBlank].match(/^\s+-\s/)) {
          if (key === "args") {
            const { items, consumed } = collectArgsList(lines, i + 1);
            result[key] = items;
            i += 1 + consumed;
          } else {
            const { items, consumed } = collectStringList(lines, i + 1);
            result[key] = items;
            i += 1 + consumed;
          }
          continue;
        }
        i++;
        continue;
      }
      if (rawVal === "[]") {
        result[key] = [];
        i++;
        continue;
      }
      result[key] = parseScalar(rawVal);
      i++;
      continue;
    }
    i++;
  }
  return result;
}
function findNextNonBlank(lines, from) {
  for (let i = from;i < lines.length; i++) {
    if (lines[i].trim())
      return i;
  }
  return -1;
}
function collectStringList(lines, from) {
  const items = [];
  let i = from;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const m = line.match(/^\s+-\s+(.*)$/);
    if (!m)
      break;
    items.push(stripQuotes(m[1]));
    i++;
  }
  return { items, consumed: i - from };
}
function collectArgsList(lines, from) {
  const items = [];
  let i = from;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const itemStart = line.match(/^(\s+)-\s+(.+?):\s*(.*)$/);
    if (!itemStart)
      break;
    const indent = itemStart[1] + "  ";
    const arg = { name: "" };
    if (itemStart[2] === "name") {
      arg.name = stripQuotes(itemStart[3]);
    } else if (itemStart[2] === "description") {
      arg.description = stripQuotes(itemStart[3]);
    }
    i++;
    while (i < lines.length) {
      const cont = lines[i];
      if (!cont.startsWith(indent) || !cont.trim())
        break;
      const kv = cont.match(/^\s+([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)$/);
      if (!kv)
        break;
      if (kv[1] === "name")
        arg.name = stripQuotes(kv[2]);
      else if (kv[1] === "description")
        arg.description = stripQuotes(kv[2]);
      i++;
    }
    items.push(arg);
  }
  return { items, consumed: i - from };
}
function parseScalar(raw) {
  const v = raw.trim();
  if (v === "true")
    return true;
  if (v === "false")
    return false;
  if (/^-?\d+$/.test(v))
    return parseInt(v, 10);
  return stripQuotes(v);
}
function stripQuotes(v) {
  const trimmed = v.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') || trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}
function listBrowserSkills(tiers) {
  const t = tiers ?? defaultTierPaths();
  const seen = new Map;
  const order = [
    { tier: "project", root: t.project },
    { tier: "global", root: t.global },
    { tier: "bundled", root: t.bundled }
  ];
  for (const { tier, root } of order) {
    if (!root || !fs18.existsSync(root))
      continue;
    let entries;
    try {
      entries = fs18.readdirSync(root);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.startsWith(".") || entry === ".tombstones")
        continue;
      if (seen.has(entry))
        continue;
      const dir = path18.join(root, entry);
      let stat;
      try {
        stat = fs18.statSync(dir);
      } catch {
        continue;
      }
      if (!stat.isDirectory())
        continue;
      const skillFile = path18.join(dir, "SKILL.md");
      if (!fs18.existsSync(skillFile))
        continue;
      try {
        const content = fs18.readFileSync(skillFile, "utf-8");
        const { frontmatter, bodyMd } = parseSkillFile(content, { skillName: entry });
        seen.set(entry, { name: entry, tier, dir, frontmatter, bodyMd });
      } catch {
        continue;
      }
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
}
function readBrowserSkill(name, tiers) {
  const t = tiers ?? defaultTierPaths();
  const order = [
    { tier: "project", root: t.project },
    { tier: "global", root: t.global },
    { tier: "bundled", root: t.bundled }
  ];
  for (const { tier, root } of order) {
    if (!root)
      continue;
    const dir = path18.join(root, name);
    const skillFile = path18.join(dir, "SKILL.md");
    if (!fs18.existsSync(skillFile))
      continue;
    try {
      const content = fs18.readFileSync(skillFile, "utf-8");
      const { frontmatter, bodyMd } = parseSkillFile(content, { skillName: name });
      return { name, tier, dir, frontmatter, bodyMd };
    } catch {
      continue;
    }
  }
  return null;
}
function tombstoneBrowserSkill(name, tier, tiers) {
  const t = tiers ?? defaultTierPaths();
  const root = tier === "project" ? t.project : t.global;
  if (!root) {
    throw new Error(`tombstoneBrowserSkill: tier "${tier}" has no resolved path`);
  }
  const src = path18.join(root, name);
  if (!fs18.existsSync(src)) {
    throw new Error(`tombstoneBrowserSkill: skill "${name}" not found in tier "${tier}" at ${src}`);
  }
  const tombstoneDir = path18.join(root, ".tombstones");
  fs18.mkdirSync(tombstoneDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const dst = path18.join(tombstoneDir, `${name}-${ts}`);
  fs18.renameSync(src, dst);
  return dst;
}
var __dirname = "C:\\Users\\obrie\\gstack\\browse\\src";
var init_browser_skills = __esm(() => {
  init_state_root();
});

// browse/src/token-registry.ts
import * as crypto4 from "crypto";
function assertValidTokenOptions(scopes, rateLimit) {
  const validScopes = ["read", "write", "admin", "meta", "control"];
  for (const s of scopes) {
    if (!validScopes.includes(s)) {
      throw new InvalidScopeError(`Invalid scope: ${s}. Valid: ${validScopes.join(", ")}`);
    }
  }
  if (rateLimit < 0)
    throw new InvalidScopeError("rateLimit must be >= 0");
}
function assertValidClientId(clientId) {
  if (typeof clientId !== "string" || clientId.trim() === "") {
    throw new ReservedClientIdError("clientId must be a non-empty string");
  }
  if (clientId.trim().toLowerCase() === "root") {
    throw new ReservedClientIdError("clientId 'root' is reserved");
  }
}
function checkRateLimit(clientId, limit) {
  if (limit <= 0)
    return { allowed: true };
  const now = Date.now();
  const bucket = rateBuckets.get(clientId);
  if (!bucket || now - bucket.windowStart >= 1000) {
    rateBuckets.set(clientId, { count: 1, windowStart: now });
    return { allowed: true };
  }
  if (bucket.count >= limit) {
    const retryAfterMs = 1000 - (now - bucket.windowStart);
    return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 100) };
  }
  bucket.count++;
  return { allowed: true };
}
function initRegistry(root) {
  if (rootToken !== "" && rootToken !== root) {
    throw new Error("token-registry already initialized with a different token; " + "embedders must call buildFetchHandler before any registry-mutating code path");
  }
  rootToken = root;
}
function isRootToken(token) {
  if (!rootToken)
    return false;
  const tokenBytes = Buffer.byteLength(token, "utf8");
  const rootBytes = Buffer.byteLength(rootToken, "utf8");
  if (tokenBytes !== rootBytes)
    return false;
  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(rootToken, "utf8");
  return crypto4.timingSafeEqual(a, b);
}
function generateToken(prefix) {
  return `${prefix}${crypto4.randomBytes(24).toString("hex")}`;
}
function createToken(opts) {
  const {
    clientId,
    scopes = ["read", "write"],
    domains,
    tabPolicy = "own-only",
    rateLimit = 10,
    expiresSeconds = 86400
  } = opts;
  assertValidClientId(clientId);
  assertValidTokenOptions(scopes, rateLimit);
  if (expiresSeconds !== null && expiresSeconds !== undefined && expiresSeconds < 0) {
    throw new Error("expiresSeconds must be >= 0 or null");
  }
  const token = generateToken("gsk_sess_");
  const now = new Date;
  const expiresAt = expiresSeconds === null ? null : new Date(now.getTime() + expiresSeconds * 1000).toISOString();
  const info = {
    token,
    clientId,
    type: "session",
    scopes,
    domains,
    tabPolicy,
    rateLimit,
    expiresAt,
    createdAt: now.toISOString(),
    commandCount: 0
  };
  for (const [t, existing] of tokens) {
    if (existing.clientId === clientId && existing.type === "session") {
      tokens.delete(t);
      break;
    }
  }
  tokens.set(token, info);
  return info;
}
function createSetupKey(opts) {
  if (opts.clientId !== undefined)
    assertValidClientId(opts.clientId);
  const scopes = opts.scopes || ["read", "write"];
  const rateLimit = opts.rateLimit ?? 10;
  assertValidTokenOptions(scopes, rateLimit);
  const token = generateToken("gsk_setup_");
  const now = new Date;
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  const info = {
    token,
    clientId: opts.clientId || `remote-${Date.now()}`,
    type: "setup",
    scopes,
    domains: opts.domains,
    tabPolicy: opts.tabPolicy || "own-only",
    rateLimit,
    expiresAt,
    createdAt: now.toISOString(),
    usesRemaining: 1,
    commandCount: 0
  };
  tokens.set(token, info);
  return info;
}
function exchangeSetupKey(setupKey, sessionExpiresSeconds) {
  const setup = tokens.get(setupKey);
  if (!setup)
    return null;
  if (setup.type !== "setup")
    return null;
  if (setup.expiresAt && new Date(setup.expiresAt) < new Date) {
    tokens.delete(setupKey);
    return null;
  }
  if (setup.usesRemaining === 0) {
    if (setup.issuedSessionToken) {
      const existing = tokens.get(setup.issuedSessionToken);
      if (existing && existing.commandCount === 0) {
        return existing;
      }
    }
    return null;
  }
  setup.usesRemaining = 0;
  const session = createToken({
    clientId: setup.clientId,
    scopes: setup.scopes,
    domains: setup.domains,
    tabPolicy: setup.tabPolicy,
    rateLimit: setup.rateLimit,
    expiresSeconds: sessionExpiresSeconds ?? 86400
  });
  setup.issuedSessionToken = session.token;
  return session;
}
function validateToken(token) {
  if (isRootToken(token)) {
    return {
      token: rootToken,
      clientId: "root",
      type: "session",
      scopes: ["read", "write", "admin", "meta", "control"],
      tabPolicy: "shared",
      rateLimit: 0,
      expiresAt: null,
      createdAt: "",
      commandCount: 0
    };
  }
  const info = tokens.get(token);
  if (!info || info.type !== "session")
    return null;
  if (info.expiresAt && new Date(info.expiresAt) < new Date) {
    tokens.delete(token);
    return null;
  }
  return info;
}
function checkScope(info, command) {
  if (info.clientId === "root")
    return true;
  if (command === "chain" && info.scopes.includes("meta"))
    return true;
  for (const scope of info.scopes) {
    if (SCOPE_MAP[scope]?.has(command))
      return true;
  }
  return false;
}
function checkDomain(info, url) {
  if (info.clientId === "root")
    return true;
  if (!info.domains || info.domains.length === 0)
    return true;
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    for (const pattern of info.domains) {
      if (matchDomainGlob(hostname, pattern))
        return true;
    }
    return false;
  } catch {
    return false;
  }
}
function matchDomainGlob(hostname, pattern) {
  if (pattern.startsWith("*.")) {
    const suffix = pattern.slice(1);
    return hostname.endsWith(suffix) || hostname === pattern.slice(2);
  }
  return hostname === pattern;
}
function checkRate(info) {
  if (info.clientId === "root")
    return { allowed: true };
  return checkRateLimit(info.clientId, info.rateLimit);
}
function recordCommand(token) {
  const info = tokens.get(token);
  if (info)
    info.commandCount++;
}
function revokeToken(clientId) {
  let deleted = 0;
  for (const [token, info] of tokens) {
    if (info.clientId === clientId) {
      tokens.delete(token);
      deleted++;
    }
  }
  if (deleted > 0)
    rateBuckets.delete(clientId);
  return deleted;
}
function revokeSetupKeys(clientId) {
  let deleted = 0;
  for (const [token, info] of tokens) {
    if (info.clientId === clientId && info.type === "setup" && info.usesRemaining !== 0) {
      tokens.delete(token);
      deleted++;
    }
  }
  return deleted;
}
function getClientSession(clientId) {
  const now = new Date;
  for (const info of tokens.values()) {
    if (info.clientId !== clientId || info.type !== "session")
      continue;
    if (info.expiresAt && new Date(info.expiresAt) < now)
      continue;
    return info;
  }
  return null;
}
function grantReducesAccess(prior, grant) {
  return scopesReduced(prior.scopes, grant.scopes) || domainsReduced(prior.domains, grant.domains) || rateReduced(prior.rateLimit, grant.rateLimit) || tabPolicyReduced(prior.tabPolicy, grant.tabPolicy);
}
function scopesReduced(prior, next) {
  return prior.some((s) => !next.includes(s));
}
function domainsReduced(prior, next) {
  const priorUnrestricted = !prior || prior.length === 0;
  const nextUnrestricted = !next || next.length === 0;
  if (priorUnrestricted)
    return !nextUnrestricted;
  if (nextUnrestricted)
    return false;
  return prior.some((p) => !next.some((n) => domainGlobCovers(n, p)));
}
function domainGlobCovers(wide, narrow) {
  if (wide === narrow)
    return true;
  const wideGlob = wide.startsWith("*.");
  if (wideGlob) {
    const wideSuffix = wide.slice(1);
    const wideApex = wide.slice(2);
    if (!narrow.startsWith("*.")) {
      return narrow === wideApex || narrow.endsWith(wideSuffix);
    }
    const narrowApex = narrow.slice(2);
    return narrowApex === wideApex || narrowApex.endsWith(wideSuffix);
  }
  return false;
}
function rateReduced(prior, next) {
  const priorUnlimited = prior <= 0;
  const nextUnlimited = next <= 0;
  if (priorUnlimited)
    return !nextUnlimited;
  if (nextUnlimited)
    return false;
  return next < prior;
}
function tabPolicyReduced(prior, next) {
  return prior === "shared" && next === "own-only";
}
function listTokens(opts) {
  const now = new Date;
  const result = [];
  for (const [token, info] of tokens) {
    if (info.expiresAt && new Date(info.expiresAt) < now) {
      tokens.delete(token);
      continue;
    }
    if (info.type === "session") {
      result.push(info);
    } else if (opts?.includeSetup && info.type === "setup" && info.usesRemaining !== 0) {
      result.push(info);
    }
  }
  return result;
}
function checkConnectRateLimit() {
  const now = Date.now();
  connectAttempts = connectAttempts.filter((a) => now - a.ts < CONNECT_WINDOW_MS);
  if (connectAttempts.length >= CONNECT_RATE_LIMIT)
    return false;
  connectAttempts.push({ ts: now });
  return true;
}
var SCOPE_READ, SCOPE_WRITE, SCOPE_ADMIN, SCOPE_CONTROL, SCOPE_META, SCOPE_MAP, DEFAULT_PAIR_SCOPES, InvalidScopeError, ReservedClientIdError, rateBuckets, tokens, rootToken = "", connectAttempts, CONNECT_RATE_LIMIT = 300, CONNECT_WINDOW_MS = 60000;
var init_token_registry = __esm(() => {
  SCOPE_READ = new Set([
    "snapshot",
    "text",
    "html",
    "links",
    "forms",
    "accessibility",
    "console",
    "network",
    "perf",
    "dialog",
    "is",
    "inspect",
    "url",
    "tabs",
    "status",
    "screenshot",
    "pdf",
    "css",
    "attrs",
    "media",
    "data"
  ]);
  SCOPE_WRITE = new Set([
    "goto",
    "back",
    "forward",
    "reload",
    "load-html",
    "click",
    "fill",
    "select",
    "hover",
    "type",
    "press",
    "scroll",
    "wait",
    "upload",
    "viewport",
    "newtab",
    "closetab",
    "dialog-accept",
    "dialog-dismiss",
    "download",
    "scrape",
    "archive"
  ]);
  SCOPE_ADMIN = new Set([
    "eval",
    "js",
    "cookies",
    "storage",
    "cookie",
    "cookie-import",
    "cookie-import-browser",
    "header",
    "useragent",
    "style",
    "cleanup",
    "prettyscreenshot"
  ]);
  SCOPE_CONTROL = new Set([
    "state",
    "handoff",
    "resume",
    "stop",
    "restart",
    "connect",
    "disconnect"
  ]);
  SCOPE_META = new Set([
    "tab",
    "diff",
    "frame",
    "responsive",
    "snapshot",
    "watch",
    "inbox",
    "focus"
  ]);
  SCOPE_MAP = {
    read: SCOPE_READ,
    write: SCOPE_WRITE,
    admin: SCOPE_ADMIN,
    control: SCOPE_CONTROL,
    meta: SCOPE_META
  };
  DEFAULT_PAIR_SCOPES = ["read", "write", "admin", "meta"];
  InvalidScopeError = class InvalidScopeError extends Error {
  };
  ReservedClientIdError = class ReservedClientIdError extends Error {
  };
  rateBuckets = new Map;
  tokens = new Map;
  connectAttempts = [];
});

// browse/src/skill-token.ts
import * as crypto5 from "crypto";
function generateSpawnId() {
  return crypto5.randomBytes(8).toString("hex");
}
function skillClientId(skillName, spawnId) {
  return `skill:${skillName}:${spawnId}`;
}
function mintSkillToken(opts) {
  const clientId = skillClientId(opts.skillName, opts.spawnId);
  return createToken({
    clientId,
    scopes: opts.scopes ?? DEFAULT_SKILL_SCOPES,
    tabPolicy: "shared",
    rateLimit: 0,
    expiresSeconds: opts.spawnTimeoutSeconds + TOKEN_TTL_SLACK
  });
}
function revokeSkillToken(skillName, spawnId) {
  return Boolean(revokeToken(skillClientId(skillName, spawnId)));
}
var TOKEN_TTL_SLACK = 30, DEFAULT_SKILL_SCOPES;
var init_skill_token = __esm(() => {
  init_token_registry();
  DEFAULT_SKILL_SCOPES = ["read", "write"];
});

// browse/src/browser-skill-commands.ts
import * as fs19 from "fs";
import * as os11 from "os";
import * as path19 from "path";
async function handleSkillCommand(args, ctx) {
  const sub = args[0];
  const rest = args.slice(1);
  switch (sub) {
    case undefined:
    case "help":
    case "--help":
      return formatUsage();
    case "list":
      return handleList2(ctx);
    case "show":
      return handleShow2(rest, ctx);
    case "run":
      return handleRun(rest, ctx);
    case "test":
      return handleTest(rest, ctx);
    case "rm":
      return handleRm2(rest, ctx);
    default:
      throw new Error(`Unknown skill subcommand: "${sub}". Try: list, show, run, test, rm.`);
  }
}
function formatUsage() {
  return [
    "Usage: $B skill <subcommand>",
    "",
    "  list                                  List all skills with resolved tier",
    "  show <name>                           Print SKILL.md",
    "  run <name> [--arg k=v]... [--timeout=Ns]   Run the skill script",
    "  test <name>                           Run script.test.ts",
    "  rm <name> [--global]                  Tombstone a user-tier skill"
  ].join(`
`);
}
function handleList2(ctx) {
  const tiers = ctx.tiers ?? defaultTierPaths();
  const skills = listBrowserSkills(tiers);
  if (skills.length === 0) {
    return `No browser-skills found.

Try: $B skill show <name>  (none right now)
`;
  }
  const lines = ["NAME                          TIER     HOST                        DESC"];
  for (const s of skills) {
    const desc = (s.frontmatter.description ?? "").slice(0, 40);
    lines.push([
      s.name.padEnd(30),
      s.tier.padEnd(8),
      s.frontmatter.host.padEnd(28),
      desc
    ].join(" "));
  }
  return lines.join(`
`) + `
`;
}
function handleShow2(args, ctx) {
  const name = args[0];
  if (!name)
    throw new Error("Usage: $B skill show <name>");
  const tiers = ctx.tiers ?? defaultTierPaths();
  const skill = readBrowserSkill(name, tiers);
  if (!skill)
    throw new Error(`Skill "${name}" not found in any tier.`);
  return readFile(path19.join(skill.dir, "SKILL.md"));
}
function readFile(p) {
  return fs19.readFileSync(p, "utf-8");
}
function parseSkillRunArgs(args) {
  const passthrough = [];
  let timeoutSeconds = DEFAULT_TIMEOUT_SECONDS;
  for (let i = 0;i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--timeout=")) {
      const n = parseInt(a.slice("--timeout=".length), 10);
      if (!isNaN(n) && n > 0)
        timeoutSeconds = n;
      continue;
    }
    passthrough.push(a);
  }
  return { passthrough, timeoutSeconds };
}
async function handleRun(args, ctx) {
  const name = args[0];
  if (!name)
    throw new Error("Usage: $B skill run <name> [--arg k=v]... [--timeout=Ns]");
  const tiers = ctx.tiers ?? defaultTierPaths();
  const skill = readBrowserSkill(name, tiers);
  if (!skill)
    throw new Error(`Skill "${name}" not found.`);
  const { passthrough, timeoutSeconds } = parseSkillRunArgs(args.slice(1));
  const result = await spawnSkill({
    skill,
    skillArgs: passthrough,
    trusted: skill.frontmatter.trusted,
    timeoutSeconds,
    port: ctx.port
  });
  if (result.exitCode !== 0 || result.timedOut || result.truncated) {
    const summary = result.truncated ? `truncated stdout at ${MAX_STDOUT_BYTES} bytes` : result.timedOut ? `timed out after ${timeoutSeconds}s` : `exit ${result.exitCode}`;
    const err = new Error(`Skill "${name}" failed: ${summary}
--- stderr ---
${result.stderr.slice(0, 4096)}`);
    err.exitCode = result.exitCode || 1;
    throw err;
  }
  return result.stdout;
}
async function handleTest(args, ctx) {
  const name = args[0];
  if (!name)
    throw new Error("Usage: $B skill test <name>");
  const tiers = ctx.tiers ?? defaultTierPaths();
  const skill = readBrowserSkill(name, tiers);
  if (!skill)
    throw new Error(`Skill "${name}" not found.`);
  const testFile = path19.join(skill.dir, "script.test.ts");
  if (!fs19.existsSync(testFile)) {
    throw new Error(`Skill "${name}" has no script.test.ts at ${testFile}`);
  }
  const { stdout, stderr, exitCode } = await runToFiles(["bun", "test", testFile], {
    cwd: skill.dir,
    env: process.env
  });
  if (exitCode !== 0) {
    throw new Error(`Skill "${name}" tests failed (exit ${exitCode}).
${stderr || stdout}`);
  }
  const report = (stdout + stderr).trim();
  if (!report) {
    throw new Error(`Skill "${name}" tests exited 0 but produced no output — the run was not captured.`);
  }
  return report + `
`;
}
async function runToFiles(cmd, opts) {
  const dir = fs19.mkdtempSync(path19.join(os11.tmpdir(), "gstack-skill-"));
  const outPath = path19.join(dir, "stdout");
  const errPath = path19.join(dir, "stderr");
  try {
    const proc = Bun.spawn(cmd, {
      windowsHide: true,
      cwd: opts.cwd,
      env: opts.env,
      stdout: Bun.file(outPath),
      stderr: Bun.file(errPath)
    });
    let timedOut = false;
    const killer = opts.timeoutMs === undefined ? undefined : setTimeout(() => {
      timedOut = true;
      try {
        proc.kill();
      } catch {}
    }, opts.timeoutMs);
    const exitCode = await proc.exited;
    if (killer !== undefined)
      clearTimeout(killer);
    const cap = opts.maxStdoutBytes ?? Infinity;
    const stdout = readCappedFile(outPath, cap);
    const stderr = readCappedFile(errPath, cap);
    return {
      stdout: stdout.text,
      stderr: stderr.text,
      exitCode: timedOut ? 124 : exitCode,
      timedOut,
      truncated: stdout.truncated
    };
  } finally {
    fs19.rmSync(dir, { recursive: true, force: true });
  }
}
function readCappedFile(p, capBytes) {
  const size = fs19.statSync(p).size;
  if (size <= capBytes)
    return { text: fs19.readFileSync(p, "utf-8"), truncated: false };
  const fd = fs19.openSync(p, "r");
  try {
    const buf = Buffer.alloc(capBytes);
    const read = fs19.readSync(fd, buf, 0, capBytes, 0);
    return { text: buf.subarray(0, read).toString("utf-8"), truncated: true };
  } finally {
    try {
      fs19.closeSync(fd);
    } catch {}
  }
}
function handleRm2(args, ctx) {
  const name = args[0];
  if (!name)
    throw new Error("Usage: $B skill rm <name> [--global]");
  const isGlobal = args.includes("--global");
  const tier = isGlobal ? "global" : "project";
  const tiers = ctx.tiers ?? defaultTierPaths();
  const effectiveTier = tier === "project" && !tiers.project ? "global" : tier;
  const dst = tombstoneBrowserSkill(name, effectiveTier, tiers);
  return `Tombstoned "${name}" (${effectiveTier} tier) → ${dst}
`;
}
async function spawnSkill(opts) {
  const spawnId = generateSpawnId();
  const tokenInfo = mintSkillToken({
    skillName: opts.skill.name,
    spawnId,
    spawnTimeoutSeconds: opts.timeoutSeconds
  });
  try {
    const env = buildSpawnEnv({
      trusted: opts.trusted,
      port: opts.port,
      skillToken: tokenInfo.token
    });
    const scriptPath = path19.join(opts.skill.dir, "script.ts");
    if (!fs19.existsSync(scriptPath)) {
      throw new Error(`Skill "${opts.skill.name}" missing script.ts at ${scriptPath}`);
    }
    return await runToFiles(["bun", "run", scriptPath, "--", ...opts.skillArgs], {
      cwd: opts.skill.dir,
      env,
      timeoutMs: opts.timeoutSeconds * 1000,
      maxStdoutBytes: MAX_STDOUT_BYTES
    });
  } finally {
    revokeSkillToken(opts.skill.name, spawnId);
  }
}
function buildSpawnEnv(opts) {
  const out = {};
  if (opts.trusted) {
    for (const [k, v] of Object.entries(process.env)) {
      if (v === undefined)
        continue;
      if (k === "GSTACK_TOKEN")
        continue;
      out[k] = v;
    }
    if (!out.PATH)
      out.PATH = "/usr/local/bin:/usr/bin:/bin";
  } else {
    for (const k of UNTRUSTED_ALLOWLIST) {
      const v = process.env[k];
      if (v !== undefined)
        out[k] = v;
    }
    out.PATH = resolveMinimalPath();
  }
  if (!opts.trusted) {
    for (const k of Object.keys(out)) {
      if (SECRET_KEY_PATTERNS.some((p) => p.test(k)))
        delete out[k];
    }
  }
  out.GSTACK_PORT = String(opts.port);
  out.GSTACK_SKILL_TOKEN = opts.skillToken;
  return out;
}
function resolveMinimalPath() {
  const fallback = "/usr/local/bin:/usr/bin:/bin";
  const bunPath = process.execPath;
  if (bunPath && bunPath.includes("/bun")) {
    const dir = path19.dirname(bunPath);
    return `${dir}:${fallback}`;
  }
  return fallback;
}
var DEFAULT_TIMEOUT_SECONDS = 60, MAX_STDOUT_BYTES, SECRET_KEY_PATTERNS, UNTRUSTED_ALLOWLIST;
var init_browser_skill_commands = __esm(() => {
  init_browser_skills();
  init_skill_token();
  MAX_STDOUT_BYTES = 1024 * 1024;
  SECRET_KEY_PATTERNS = [
    /TOKEN/i,
    /KEY/i,
    /SECRET/i,
    /PASSWORD/i,
    /CREDENTIAL/i,
    /^AWS_/,
    /^AZURE_/,
    /^GCP_/,
    /^GOOGLE_APPLICATION_/,
    /^ANTHROPIC_/,
    /^OPENAI_/,
    /^GITHUB_/,
    /^GH_/,
    /^SSH_/,
    /^GPG_/,
    /^NPM_TOKEN/,
    /^PYPI_/
  ];
  UNTRUSTED_ALLOWLIST = new Set([
    "LANG",
    "LC_ALL",
    "LC_CTYPE",
    "TERM",
    "TZ"
  ]);
});

// browse/src/session-persist.ts
import * as fs20 from "fs";
function quarantineCorrupt(filePath) {
  try {
    fs20.renameSync(filePath, `${filePath}.corrupt`);
  } catch {
    safeUnlinkQuiet(filePath);
  }
}
function isSessionPersistEnabled(env = process.env) {
  return env.BROWSE_PERSIST_STATE === "1";
}
function sessionPersistIntervalMs(env = process.env) {
  const parsed = parseInt(env.BROWSE_PERSIST_INTERVAL_MS || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30000;
}
function serializeSessionState(state) {
  return JSON.stringify({
    version: SESSION_STATE_VERSION,
    savedAt: new Date().toISOString(),
    cookies: state.cookies,
    pages: state.pages.map((p) => ({
      url: p.url,
      isActive: p.isActive,
      storage: p.storage
    }))
  }, null, 2);
}
function isInternalCookieDomain(domain) {
  const d = domain.startsWith(".") ? domain.slice(1) : domain;
  if (d === "localhost" || d.endsWith(".internal"))
    return true;
  const kind = classifyAddress(d);
  return kind === "blocked" || kind === "loopback";
}
function filterSessionCookies(cookies) {
  return cookies.filter((c) => {
    if (typeof c !== "object" || !c)
      return false;
    if (typeof c.name !== "string" || typeof c.value !== "string")
      return false;
    if (typeof c.domain !== "string" || !c.domain)
      return false;
    return !isInternalCookieDomain(c.domain);
  });
}
function deserializeSessionState(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || data.version !== SESSION_STATE_VERSION)
    return null;
  if (!Array.isArray(data.cookies) || !Array.isArray(data.pages))
    return null;
  return {
    cookies: filterSessionCookies(data.cookies),
    pages: data.pages.map((p) => ({
      url: typeof p?.url === "string" ? p.url : "",
      isActive: Boolean(p?.isActive),
      storage: p?.storage && typeof p.storage === "object" ? {
        localStorage: typeof p.storage.localStorage === "object" && p.storage.localStorage ? p.storage.localStorage : {},
        sessionStorage: typeof p.storage.sessionStorage === "object" && p.storage.sessionStorage ? p.storage.sessionStorage : {}
      } : null
    }))
  };
}
async function persistSessionState(bm, filePath) {
  if (bm.getConnectionMode() !== "launched")
    return;
  const state = await bm.saveState();
  const tmpPath = `${filePath}.tmp`;
  writeSecureFile(tmpPath, serializeSessionState(state));
  try {
    fs20.renameSync(tmpPath, filePath);
  } catch (err) {
    safeUnlinkQuiet(tmpPath);
    throw err;
  }
}
async function restoreSessionState(bm, filePath) {
  let raw;
  try {
    raw = fs20.readFileSync(filePath, "utf-8");
  } catch (err) {
    if (err?.code === "ENOENT")
      return null;
    throw err;
  }
  const state = deserializeSessionState(raw);
  if (!state) {
    console.warn(`[browse] SESSION_STATE_INVALID: corrupt ${filePath} moved to .corrupt; starting fresh`);
    quarantineCorrupt(filePath);
    return null;
  }
  await bm.closeAllPages();
  await bm.restoreState(state);
  return state;
}
var SESSION_STATE_FILE = "session-state.json", SESSION_STATE_VERSION = 1;
var init_session_persist = __esm(() => {
  init_file_permissions();
  init_error_handling2();
  init_url_validation();
});

// browse/src/cdp-commands.ts
function parseQualified(name) {
  const idx = name.indexOf(".");
  if (idx <= 0 || idx === name.length - 1) {
    throw new Error(`Usage: $B cdp <Domain.method> [json-params]
` + `Cause: '${name}' is not in Domain.method format.
` + "Action: e.g. $B cdp Accessibility.getFullAXTree {}");
  }
  return { domain: name.slice(0, idx), method: name.slice(idx + 1) };
}
async function handleCdpCommand(args, bm) {
  if (args.length === 0 || args[0] === "help" || args[0] === "--help") {
    return [
      "$B cdp — raw CDP method dispatch (deny-default escape hatch)",
      "",
      "Usage: $B cdp <Domain.method> [json-params]",
      "",
      "Allowed methods are listed in browse/src/cdp-allowlist.ts. To add one,",
      "open a PR with a one-line justification and the (scope, output) tags.",
      "Examples:",
      "  $B cdp Accessibility.getFullAXTree {}",
      "  $B cdp Performance.getMetrics {}",
      `  $B cdp DOM.describeNode '{"backendNodeId":42,"depth":3}'`
    ].join(`
`);
  }
  const qualified = args[0];
  const { domain, method } = parseQualified(qualified);
  let params = {};
  if (args[1]) {
    try {
      params = JSON.parse(args[1]) ?? {};
    } catch (e) {
      throw new Error(`Cannot parse params as JSON: ${e.message}
` + `Cause: argument '${args[1]}' is not valid JSON.
` + `Action: pass a JSON object literal, e.g. '{"backendNodeId":42}'.`);
    }
  }
  const tabId = bm.getActiveTabId();
  const { raw, entry } = await dispatchCdpCall({ domain, method, params, tabId, bm });
  const json = JSON.stringify(raw, null, 2);
  if (entry.output === "untrusted") {
    return wrapUntrustedContent(json, `cdp:${qualified}`);
  }
  return json;
}
var init_cdp_commands = __esm(() => {
  init_cdp_bridge();
  init_commands();
});

// browse/src/memory-snapshot.ts
function formatBytes2(n) {
  if (n < 1024)
    return `${n} B`;
  if (n < 1024 * 1024)
    return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024)
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

// browse/src/memory-command.ts
function collectStructureStats() {
  return {
    modificationHistory: getModificationHistoryStats(),
    activitySubscribers: getSubscriberCount(),
    inspectorSubscribers: getInspectorSubscriberCount(),
    consoleBufferLen: consoleBuffer.length,
    networkBufferLen: networkBuffer.length,
    dialogBufferLen: dialogBuffer.length,
    captureBufferBytes: getCaptureBuffer().byteSize
  };
}
function formatSnapshotText(s) {
  const lines = [];
  lines.push(`Bun server:        RSS: ${formatBytes2(s.bunServer.rss)}  ` + `heap: ${formatBytes2(s.bunServer.heapUsed)} / ${formatBytes2(s.bunServer.heapTotal)}  ` + `external: ${formatBytes2(s.bunServer.external)}`);
  if (s.processes && s.processes.length > 0) {
    const byType = {};
    for (const p of s.processes)
      byType[p.type] = (byType[p.type] ?? 0) + 1;
    const typeSummary = Object.entries(byType).map(([t, n]) => `${t}=${n}`).join(" ");
    lines.push(`Chromium processes: ${s.processes.length} total  (${typeSummary})`);
  } else if (s.processes === null) {
    lines.push("Chromium processes: (unavailable — see notes)");
  } else {
    lines.push("Chromium processes: 0");
  }
  if (s.tabs.length > 0) {
    const sorted = [...s.tabs].sort((a, b) => b.jsHeapUsed - a.jsHeapUsed);
    const shown = sorted.slice(0, 10);
    lines.push(`Renderers:         ${s.tabs.length} tabs (top by JS heap):`);
    for (const t of shown) {
      const urlShort = t.url.length > 80 ? t.url.slice(0, 77) + "..." : t.url;
      lines.push(`  [${formatBytes2(t.jsHeapUsed).padStart(8)} JS, ` + `${String(t.nodes).padStart(6)} nodes, ` + `${String(t.listeners).padStart(5)} listeners] ` + `tab #${t.id} — ${urlShort}`);
    }
    if (sorted.length > shown.length) {
      lines.push(`  ...and ${sorted.length - shown.length} more`);
    }
  } else {
    lines.push("Renderers:         (no tabs tracked)");
  }
  lines.push("─────────────────────────────────────────────────");
  lines.push("In-memory structures (Bun side):");
  const m = s.structures.modificationHistory;
  lines.push(`  modificationHistory:    ${m.current} / ${m.cap} entries` + (m.evicted > 0 ? `  (${m.evicted} evicted since reset)` : ""));
  lines.push(`  inspectorSubscribers:   ${s.structures.inspectorSubscribers}`);
  lines.push(`  activitySubscribers:    ${s.structures.activitySubscribers}`);
  lines.push(`  consoleBuffer:          ${s.structures.consoleBufferLen} entries`);
  lines.push(`  networkBuffer:          ${s.structures.networkBufferLen} entries`);
  lines.push(`  dialogBuffer:           ${s.structures.dialogBufferLen} entries`);
  lines.push(`  captureBuffer:          ${formatBytes2(s.structures.captureBufferBytes)}`);
  if (s.notes.length > 0) {
    lines.push("");
    lines.push("Notes:");
    for (const n of s.notes)
      lines.push(`  - ${n}`);
  }
  return lines.join(`
`);
}
async function handleMemoryCommand(args, bm) {
  const jsonMode = args.includes("--json");
  const structures = collectStructureStats();
  const snapshot = await bm.getMemorySnapshot(structures);
  if (jsonMode)
    return JSON.stringify(snapshot);
  return formatSnapshotText(snapshot);
}
async function buildMemorySnapshotJson(bm) {
  const structures = collectStructureStats();
  return bm.getMemorySnapshot(structures);
}
var init_memory_command = __esm(() => {
  init_cdp_inspector();
  init_activity();
  init_server();
  init_buffers();
  init_network_capture();
});

// browse/src/meta-commands.ts
import * as Diff2 from "diff";
import * as fs21 from "fs";
import * as path20 from "path";
function tokenizePipeSegment(segment) {
  const tokens = [];
  let current = "";
  let inQuote = false;
  for (let i = 0;i < segment.length; i++) {
    const ch = segment[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === " " && !inQuote) {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }
  if (current)
    tokens.push(current);
  return tokens;
}
function parsePdfArgs(args) {
  for (let i = 0;i < args.length; i++) {
    if (args[i] === "--from-file") {
      const payloadPath = args[++i];
      if (!payloadPath)
        throw new Error("pdf: --from-file requires a path");
      return parsePdfFromFile(payloadPath);
    }
  }
  const result = {
    output: `${TEMP_DIR}/browse-page.pdf`
  };
  let margins;
  const positional = [];
  for (let i = 0;i < args.length; i++) {
    const a = args[i];
    if (a === "--format") {
      result.format = requireValue(args, ++i, "format");
    } else if (a === "--page-size") {
      result.format = requireValue(args, ++i, "page-size");
    } else if (a === "--width") {
      result.width = requireValue(args, ++i, "width");
    } else if (a === "--height") {
      result.height = requireValue(args, ++i, "height");
    } else if (a === "--margins") {
      margins = requireValue(args, ++i, "margins");
    } else if (a === "--margin-top") {
      result.marginTop = requireValue(args, ++i, "margin-top");
    } else if (a === "--margin-right") {
      result.marginRight = requireValue(args, ++i, "margin-right");
    } else if (a === "--margin-bottom") {
      result.marginBottom = requireValue(args, ++i, "margin-bottom");
    } else if (a === "--margin-left") {
      result.marginLeft = requireValue(args, ++i, "margin-left");
    } else if (a === "--header-template") {
      result.headerTemplate = requireValue(args, ++i, "header-template");
    } else if (a === "--footer-template") {
      result.footerTemplate = requireValue(args, ++i, "footer-template");
    } else if (a === "--page-numbers") {
      result.pageNumbers = true;
    } else if (a === "--tagged") {
      result.tagged = true;
    } else if (a === "--outline") {
      result.outline = true;
    } else if (a === "--print-background") {
      result.printBackground = true;
    } else if (a === "--prefer-css-page-size") {
      result.preferCSSPageSize = true;
    } else if (a === "--toc") {
      result.toc = true;
    } else if (a.startsWith("--")) {
      throw new Error(`Unknown pdf flag: ${a}`);
    } else {
      positional.push(a);
    }
  }
  if (positional.length > 0)
    result.output = positional[0];
  if (margins !== undefined) {
    if (result.marginTop || result.marginRight || result.marginBottom || result.marginLeft) {
      throw new Error("pdf: --margins is mutex with --margin-top/--margin-right/--margin-bottom/--margin-left");
    }
    result.marginTop = result.marginRight = result.marginBottom = result.marginLeft = margins;
  }
  if (result.format && (result.width || result.height)) {
    throw new Error("pdf: --format is mutex with --width/--height");
  }
  if (result.pageNumbers && result.footerTemplate) {
    throw new Error("pdf: --page-numbers is mutex with --footer-template (page-numbers writes the footer itself)");
  }
  return result;
}
function parsePdfFromFile(payloadPath) {
  try {
    validateReadPath(path20.resolve(payloadPath));
  } catch {
    throw new Error(`pdf: --from-file ${payloadPath} must be under ${SAFE_DIRECTORIES.join(" or ")} (security policy). Copy the payload into the project tree or /tmp first.`);
  }
  const raw = fs21.readFileSync(payloadPath, "utf8");
  let json;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`pdf: --from-file ${payloadPath} is not valid JSON (${msg}).`);
  }
  if (json === null || typeof json !== "object" || Array.isArray(json)) {
    throw new Error(`pdf: --from-file ${payloadPath} must be a JSON object, got ${Array.isArray(json) ? "array" : typeof json}.`);
  }
  const out = {
    output: json.output || `${TEMP_DIR}/browse-page.pdf`,
    format: json.format,
    width: json.width,
    height: json.height,
    marginTop: json.marginTop,
    marginRight: json.marginRight,
    marginBottom: json.marginBottom,
    marginLeft: json.marginLeft,
    headerTemplate: json.headerTemplate,
    footerTemplate: json.footerTemplate,
    pageNumbers: json.pageNumbers === true,
    tagged: json.tagged === true,
    outline: json.outline === true,
    printBackground: json.printBackground === true,
    preferCSSPageSize: json.preferCSSPageSize === true,
    toc: json.toc === true
  };
  return out;
}
function requireValue(args, i, flag) {
  const v = args[i];
  if (v === undefined || v.startsWith("--")) {
    throw new Error(`pdf: --${flag} requires a value`);
  }
  return v;
}
function buildPdfOptions(parsed) {
  const opts = {};
  if (parsed.format) {
    opts.format = parsed.format.charAt(0).toUpperCase() + parsed.format.slice(1).toLowerCase();
  } else if (parsed.width && parsed.height) {
    opts.width = parsed.width;
    opts.height = parsed.height;
  } else {
    opts.format = "Letter";
  }
  const margin = {};
  if (parsed.marginTop)
    margin.top = parsed.marginTop;
  if (parsed.marginRight)
    margin.right = parsed.marginRight;
  if (parsed.marginBottom)
    margin.bottom = parsed.marginBottom;
  if (parsed.marginLeft)
    margin.left = parsed.marginLeft;
  if (Object.keys(margin).length > 0)
    opts.margin = margin;
  const displayHeaderFooter = !!parsed.headerTemplate || !!parsed.footerTemplate || parsed.pageNumbers === true;
  if (displayHeaderFooter) {
    opts.displayHeaderFooter = true;
    if (parsed.headerTemplate !== undefined)
      opts.headerTemplate = parsed.headerTemplate;
    else if (parsed.pageNumbers || parsed.footerTemplate)
      opts.headerTemplate = "<div></div>";
    if (parsed.pageNumbers) {
      opts.footerTemplate = [
        '<div style="font-size:9pt; font-family:Helvetica,Arial,sans-serif; color:#666; ',
        'width:100%; text-align:center;">',
        '<span class="pageNumber"></span> of <span class="totalPages"></span>',
        "</div>"
      ].join("");
    } else if (parsed.footerTemplate !== undefined) {
      opts.footerTemplate = parsed.footerTemplate;
    } else {
      opts.footerTemplate = "<div></div>";
    }
  }
  if (parsed.tagged === true)
    opts.tagged = true;
  if (parsed.outline === true)
    opts.outline = true;
  if (parsed.printBackground === true)
    opts.printBackground = true;
  if (parsed.preferCSSPageSize === true)
    opts.preferCSSPageSize = true;
  return opts;
}
async function handleMetaCommand(command, args, bm, shutdown, tokenInfo, opts) {
  switch (command) {
    case "tabs": {
      const tabs = await bm.getTabListWithTitles();
      return tabs.map((t) => `${t.active ? "→ " : "  "}[${t.id}] ${t.busy ? "(not responding)" : t.title || "(untitled)"} — ${t.url}`).join(`
`);
    }
    case "tab": {
      const id = parseInt(args[0], 10);
      if (isNaN(id))
        throw new Error("Usage: browse tab <id>");
      bm.switchTab(id);
      return `Switched to tab ${id}`;
    }
    case "newtab": {
      let url;
      let jsonMode = false;
      for (const a of args) {
        if (a === "--json") {
          jsonMode = true;
        } else if (!url) {
          url = a;
        }
      }
      const id = await bm.newTab(url);
      if (jsonMode) {
        return JSON.stringify({ tabId: id, url: url ?? null });
      }
      return `Opened tab ${id}${url ? ` → ${url}` : ""}`;
    }
    case "closetab": {
      const id = args[0] ? parseInt(args[0], 10) : undefined;
      await bm.closeTab(id);
      return `Closed tab${id ? ` ${id}` : ""}`;
    }
    case "tab-each": {
      if (args.length === 0) {
        throw new Error(`Usage: browse tab-each <command> [args...]
` + "Example: browse tab-each snapshot -i");
      }
      const innerRaw = args[0];
      const innerName = canonicalizeCommand(innerRaw);
      const innerArgs = args.slice(1);
      if (tokenInfo && tokenInfo.clientId !== "root" && !checkScope(tokenInfo, innerName)) {
        throw new Error(`tab-each rejected: subcommand "${innerRaw}" not allowed by your token scope (${tokenInfo.scopes.join(", ")}).`);
      }
      const tabs = await bm.getTabListWithTitles();
      const originalActive = tabs.find((t) => t.active)?.id ?? bm.getActiveTabId();
      const executeCmd = opts?.executeCommand;
      const results = [];
      try {
        for (const tab of tabs) {
          if (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
            results.push({
              tabId: tab.id,
              url: tab.url,
              title: tab.title || "",
              status: 0,
              output: "skipped: internal page"
            });
            continue;
          }
          bm.switchTab(tab.id, { bringToFront: false });
          let status = 0;
          let output = "";
          if (executeCmd) {
            const r = await executeCmd({ command: innerName, args: innerArgs, tabId: tab.id }, tokenInfo);
            status = r.status;
            output = r.result;
            if (status !== 200) {
              try {
                output = JSON.parse(output).error || output;
              } catch (err) {
                if (!(err instanceof SyntaxError))
                  throw err;
              }
            }
          } else {
            status = 500;
            output = "tab-each requires the browse server (no executeCommand context)";
          }
          results.push({
            tabId: tab.id,
            url: tab.url,
            title: tab.title || "",
            status,
            output
          });
        }
      } finally {
        try {
          bm.switchTab(originalActive, { bringToFront: false });
        } catch {}
      }
      return JSON.stringify({
        command: innerName,
        args: innerArgs,
        total: results.length,
        results
      }, null, 2);
    }
    case "status": {
      const tabs = bm.getTabCount();
      const mode = bm.getConnectionMode();
      const activeTab = await bm.probeActiveTab();
      return [
        `Status: healthy`,
        `Mode: ${mode}`,
        `URL: ${bm.getCurrentUrl()}`,
        `Tabs: ${tabs}`,
        `PID: ${process.pid}`,
        ...activeTab && !activeTab.responsive ? [`Active tab ${activeTab.id}: not responding. Switch with: browse tab <id>, or close it: browse closetab ${activeTab.id}`] : []
      ].join(`
`);
    }
    case "url": {
      return bm.getCurrentUrl();
    }
    case "stop": {
      setTimeout(() => {
        shutdown();
      }, 25).unref?.();
      return "Server stopped";
    }
    case "restart": {
      console.log("[browse] Restart requested. Exiting for CLI to restart.");
      setTimeout(() => {
        shutdown();
      }, 25).unref?.();
      return "Restarting...";
    }
    case "screenshot": {
      const page = bm.getPage();
      let outputPath = `${TEMP_DIR}/browse-screenshot.png`;
      let clipRect;
      let targetSelector;
      let viewportOnly = false;
      let base64Mode = false;
      const remaining = [];
      let flagSelector;
      for (let i = 0;i < args.length; i++) {
        const inline = /^(--clip|--selector)=(.*)$/s.exec(args[i]);
        const flag = inline ? inline[1] : args[i];
        const flagValue = () => inline ? inline[2] : args[++i];
        if (flag === "--viewport") {
          viewportOnly = true;
        } else if (flag === "--base64") {
          base64Mode = true;
        } else if (flag === "--selector") {
          flagSelector = flagValue();
          if (!flagSelector)
            throw new Error("Usage: screenshot --selector <css> [path]");
        } else if (flag === "--clip") {
          const coords = flagValue();
          if (!coords)
            throw new Error("Usage: screenshot --clip x,y,w,h [path]");
          const parts = coords.split(",").map(Number);
          if (parts.length !== 4 || parts.some(isNaN))
            throw new Error("Usage: screenshot --clip x,y,width,height — all must be numbers");
          clipRect = { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
        } else if (args[i].startsWith("--")) {
          throw new Error(`Unknown screenshot flag: ${args[i]}`);
        } else {
          remaining.push(args[i]);
        }
      }
      for (const arg of remaining) {
        const isFilePath = arg.includes("/") && /\.(png|jpe?g|webp|pdf)$/i.test(arg);
        if (isFilePath) {
          outputPath = arg;
        } else if (arg.startsWith("@e") || arg.startsWith("@c") || arg.startsWith(".") || arg.startsWith("#") || arg.includes("[")) {
          targetSelector = arg;
        } else {
          outputPath = arg;
        }
      }
      if (flagSelector !== undefined) {
        if (targetSelector !== undefined) {
          throw new Error("--selector conflicts with positional selector — choose one");
        }
        targetSelector = flagSelector;
      }
      validateOutputPath(outputPath);
      if (clipRect && targetSelector) {
        throw new Error("Cannot use --clip with a selector/ref — choose one");
      }
      if (viewportOnly && clipRect) {
        throw new Error("Cannot use --viewport with --clip — choose one");
      }
      if (base64Mode) {
        let buffer;
        if (targetSelector) {
          const resolved = await bm.resolveRef(targetSelector);
          const locator = "locator" in resolved ? resolved.locator : page.locator(resolved.selector);
          buffer = await locator.screenshot({ timeout: 5000 });
        } else if (clipRect) {
          buffer = await page.screenshot({ clip: clipRect });
        } else {
          buffer = await page.screenshot({ fullPage: !viewportOnly });
          ({ buffer } = await guardScreenshotBuffer(buffer));
        }
        if (buffer.length > 10 * 1024 * 1024) {
          throw new Error("Screenshot too large for --base64 (>10MB). Use disk path instead.");
        }
        return `data:image/png;base64,${buffer.toString("base64")}`;
      }
      if (targetSelector) {
        const resolved = await bm.resolveRef(targetSelector);
        const locator = "locator" in resolved ? resolved.locator : page.locator(resolved.selector);
        await locator.screenshot({ path: outputPath, timeout: 5000 });
        return `Screenshot saved (element): ${outputPath}`;
      }
      if (clipRect) {
        await page.screenshot({ path: outputPath, clip: clipRect });
        return `Screenshot saved (clip ${clipRect.x},${clipRect.y},${clipRect.width},${clipRect.height}): ${outputPath}`;
      }
      await page.screenshot({ path: outputPath, fullPage: !viewportOnly });
      if (!viewportOnly)
        await guardScreenshotPath(outputPath);
      return `Screenshot saved${viewportOnly ? " (viewport)" : ""}: ${outputPath}`;
    }
    case "pdf": {
      const page = bm.getPage();
      const parsed = parsePdfArgs(args);
      validateOutputPath(parsed.output);
      if (parsed.toc) {
        const deadline = Date.now() + 3000;
        let ready = false;
        while (Date.now() < deadline) {
          try {
            ready = await page.evaluate("!!window.__pagedjsAfterFired");
          } catch {}
          if (ready)
            break;
          await new Promise((r) => setTimeout(r, 150));
        }
      }
      const opts = buildPdfOptions(parsed);
      opts.path = parsed.output;
      await page.pdf(opts);
      return `PDF saved: ${parsed.output}`;
    }
    case "responsive": {
      const page = bm.getPage();
      const prefix = args[0] || `${TEMP_DIR}/browse-responsive`;
      validateOutputPath(prefix);
      const viewports = [
        { name: "mobile", width: 375, height: 812 },
        { name: "tablet", width: 768, height: 1024 },
        { name: "desktop", width: 1280, height: 720 }
      ];
      const originalViewport = page.viewportSize();
      const results = [];
      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        const screenshotPath = `${prefix}-${vp.name}.png`;
        validateOutputPath(screenshotPath);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        await guardScreenshotPath(screenshotPath);
        results.push(`${vp.name} (${vp.width}x${vp.height}): ${screenshotPath}`);
      }
      if (originalViewport) {
        await page.setViewportSize(originalViewport);
      }
      return results.join(`
`);
    }
    case "chain": {
      const jsonStr = args[0];
      if (!jsonStr)
        throw new Error(`Usage: echo '[["goto","url"],["text"]]' | browse chain
` + "   or: browse chain 'goto url | click @e5 | snapshot -ic'");
      let rawCommands;
      try {
        rawCommands = JSON.parse(jsonStr);
        if (!Array.isArray(rawCommands))
          throw new Error("not array");
      } catch (err) {
        if (!(err instanceof SyntaxError) && err?.message !== "not array")
          throw err;
        rawCommands = jsonStr.split(" | ").filter((seg) => seg.trim().length > 0).map((seg) => tokenizePipeSegment(seg.trim()));
      }
      const commands = rawCommands.map((cmd) => {
        const [rawName, ...cmdArgs] = cmd;
        const name = canonicalizeCommand(rawName);
        return { rawName, name, args: cmdArgs };
      });
      if (tokenInfo && tokenInfo.clientId !== "root") {
        for (const c of commands) {
          if (!checkScope(tokenInfo, c.name)) {
            throw new Error(`Chain rejected: subcommand "${c.rawName}" not allowed by your token scope (${tokenInfo.scopes.join(", ")}). ` + `All subcommands must be within scope.`);
          }
        }
      }
      const executeCmd = opts?.executeCommand;
      const results = [];
      let lastWasWrite = false;
      if (executeCmd) {
        for (const c of commands) {
          const cr = await executeCmd({ command: c.name, args: c.args }, tokenInfo);
          const label = c.rawName === c.name ? c.name : `${c.rawName}→${c.name}`;
          if (cr.status === 200) {
            results.push(`[${label}] ${cr.result}`);
          } else {
            let errMsg = cr.result;
            try {
              errMsg = JSON.parse(cr.result).error || cr.result;
            } catch (err) {
              if (!(err instanceof SyntaxError))
                throw err;
            }
            results.push(`[${label}] ERROR: ${errMsg}`);
          }
          lastWasWrite = WRITE_COMMANDS.has(c.name);
        }
      } else {
        throw new Error("chain requires the browse server (no executeCommand context)");
      }
      if (lastWasWrite) {
        await bm.getPage().waitForLoadState("networkidle", { timeout: 2000 }).catch(() => {});
      }
      return results.join(`

`);
    }
    case "diff": {
      const [url1, url2] = args;
      if (!url1 || !url2)
        throw new Error("Usage: browse diff <url1> <url2>");
      const page = bm.getPage();
      const normalizedUrl1 = await validateNavigationUrl(url1);
      await page.goto(normalizedUrl1, { waitUntil: "domcontentloaded", timeout: 15000 });
      const text1 = await getCleanText(page);
      const normalizedUrl2 = await validateNavigationUrl(url2);
      await page.goto(normalizedUrl2, { waitUntil: "domcontentloaded", timeout: 15000 });
      const text2 = await getCleanText(page);
      const changes = Diff2.diffLines(text1, text2);
      const output = [`--- ${url1}`, `+++ ${url2}`, ""];
      for (const part of changes) {
        const prefix = part.added ? "+" : part.removed ? "-" : " ";
        const lines = part.value.split(`
`).filter((l) => l.length > 0);
        for (const line of lines) {
          output.push(`${prefix} ${line}`);
        }
      }
      return wrapUntrustedContent(output.join(`
`), `diff: ${url1} vs ${url2}`);
    }
    case "snapshot": {
      const isScoped = tokenInfo && tokenInfo.clientId !== "root";
      const snapshotResult = await handleSnapshot(args, bm.getActiveSession(), {
        splitForScoped: !!isScoped
      });
      if (isScoped) {
        return snapshotResult;
      }
      return wrapUntrustedContent(snapshotResult, bm.getCurrentUrl());
    }
    case "handoff": {
      const message = args.join(" ") || "User takeover requested";
      return await bm.handoff(message);
    }
    case "resume": {
      const session = bm.getActiveSession();
      bm.resume();
      const isScoped2 = tokenInfo && tokenInfo.clientId !== "root";
      const snapshot = await handleSnapshot(["-i"], session, { splitForScoped: !!isScoped2 });
      if (isScoped2) {
        return `RESUMED
${snapshot}`;
      }
      return `RESUMED
${wrapUntrustedContent(snapshot, bm.getCurrentUrl())}`;
    }
    case "connect": {
      if (bm.getConnectionMode() === "headed") {
        return "Already in headed mode with extension.";
      }
      return "The connect command must be run from the CLI (not sent to a running server). Run: $B connect";
    }
    case "disconnect": {
      if (bm.getConnectionMode() !== "headed") {
        return "Not in headed mode — nothing to disconnect.";
      }
      console.log("[browse] Disconnecting headed browser. Restarting in headless mode.");
      await shutdown();
      return "Disconnected. Server will restart in headless mode on next command.";
    }
    case "focus": {
      if (bm.getConnectionMode() !== "headed") {
        return "focus requires headed mode. Run `$B connect` first.";
      }
      try {
        const { execSync } = await import("child_process");
        const appNames = ["Comet", "Google Chrome", "Arc", "Brave Browser", "Microsoft Edge"];
        let activated = false;
        for (const appName of appNames) {
          try {
            execSync(`osascript -e 'tell application "${appName}" to activate'`, { stdio: "pipe", timeout: 3000, windowsHide: true });
            activated = true;
            break;
          } catch (err) {
            if (err?.status === undefined && !err?.message?.includes("Command failed"))
              throw err;
          }
        }
        if (!activated) {
          return "Could not bring browser to foreground. macOS only.";
        }
        if (args.length > 0 && args[0].startsWith("@")) {
          try {
            const resolved = await bm.resolveRef(args[0]);
            if ("locator" in resolved) {
              await resolved.locator.scrollIntoViewIfNeeded({ timeout: 5000 });
              return `Browser activated. Scrolled ${args[0]} into view.`;
            }
          } catch (err) {
            if (!err?.message?.includes("not found") && !err?.message?.includes("closed") && !err?.message?.includes("Target") && !err?.message?.includes("timeout"))
              throw err;
          }
        }
        return "Browser window activated.";
      } catch (err) {
        return `focus failed: ${err.message}. macOS only.`;
      }
    }
    case "watch": {
      if (args[0] === "stop") {
        if (!bm.isWatching())
          return "Not currently watching.";
        const result = bm.stopWatch();
        const durationSec = Math.round(result.duration / 1000);
        const lastSnapshot = result.snapshots.length > 0 ? wrapUntrustedContent(result.snapshots[result.snapshots.length - 1], bm.getCurrentUrl()) : "(none)";
        return [
          `WATCH STOPPED (${durationSec}s, ${result.snapshots.length} snapshots)`,
          "",
          "Last snapshot:",
          lastSnapshot
        ].join(`
`);
      }
      if (bm.isWatching())
        return "Already watching. Run `$B watch stop` to stop.";
      if (bm.getConnectionMode() !== "headed") {
        return "watch requires headed mode. Run `$B connect` first.";
      }
      bm.startWatch();
      return "WATCHING — observing user browsing. Periodic snapshots every 5s.\nRun `$B watch stop` to stop and get summary.";
    }
    case "inbox": {
      const { execSync } = await import("child_process");
      let gitRoot;
      try {
        gitRoot = execSync("git rev-parse --show-toplevel", { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"], windowsHide: true }).trim();
      } catch (err) {
        if (err?.status === undefined && !err?.message?.includes("Command failed"))
          throw err;
        return "Not in a git repository — cannot locate inbox.";
      }
      const inboxDir = path20.join(gitRoot, ".context", "sidebar-inbox");
      if (!fs21.existsSync(inboxDir))
        return "Inbox empty.";
      const files = fs21.readdirSync(inboxDir).filter((f) => f.endsWith(".json") && !f.startsWith(".")).sort().reverse();
      if (files.length === 0)
        return "Inbox empty.";
      const messages = [];
      for (const file of files) {
        try {
          const data = JSON.parse(fs21.readFileSync(path20.join(inboxDir, file), "utf-8"));
          messages.push({
            timestamp: data.timestamp || "",
            url: data.page?.url || "unknown",
            userMessage: data.userMessage || ""
          });
        } catch (err) {
          if (!(err instanceof SyntaxError) && err?.code !== "ENOENT" && err?.code !== "EACCES")
            throw err;
        }
      }
      if (messages.length === 0)
        return "Inbox empty.";
      const lines = [];
      lines.push(`SIDEBAR INBOX (${messages.length} message${messages.length === 1 ? "" : "s"})`);
      lines.push("────────────────────────────────");
      for (const msg of messages) {
        const ts = msg.timestamp ? `[${msg.timestamp}]` : "[unknown]";
        lines.push(`${ts} ${wrapUntrustedContent(msg.url, "inbox-url")}`);
        lines.push(`  "${wrapUntrustedContent(msg.userMessage, "inbox-message")}"`);
        lines.push("");
      }
      lines.push("────────────────────────────────");
      if (args.includes("--clear")) {
        for (const file of files) {
          try {
            fs21.unlinkSync(path20.join(inboxDir, file));
          } catch (err) {
            if (err?.code !== "ENOENT")
              throw err;
          }
        }
        lines.push(`Cleared ${files.length} message${files.length === 1 ? "" : "s"}.`);
      }
      return lines.join(`
`);
    }
    case "state": {
      const [action, name] = args;
      if (!action || !name)
        throw new Error("Usage: state save|load <name>");
      if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
        throw new Error("State name must be alphanumeric (a-z, 0-9, _, -)");
      }
      const config = resolveConfig();
      const stateDir = path20.join(config.stateDir, "browse-states");
      mkdirSecure(stateDir);
      const statePath = path20.join(stateDir, `${name}.json`);
      if (action === "save") {
        const state = await bm.saveState();
        const saveData = {
          version: 1,
          savedAt: new Date().toISOString(),
          cookies: state.cookies,
          pages: state.pages.map((p) => ({ url: p.url, isActive: p.isActive }))
        };
        writeSecureFile(statePath, JSON.stringify(saveData, null, 2));
        return `State saved: ${statePath} (${state.cookies.length} cookies, ${state.pages.length} pages)
⚠️  Cookies stored in plaintext. Delete when no longer needed.`;
      }
      if (action === "load") {
        if (!fs21.existsSync(statePath))
          throw new Error(`State not found: ${statePath}`);
        const data = JSON.parse(fs21.readFileSync(statePath, "utf-8"));
        if (!Array.isArray(data.cookies) || !Array.isArray(data.pages)) {
          throw new Error("Invalid state file: expected cookies and pages arrays");
        }
        const validatedCookies = filterSessionCookies(data.cookies);
        if (validatedCookies.length < data.cookies.length) {
          console.warn(`[browse] Filtered ${data.cookies.length - validatedCookies.length} invalid cookies from state file`);
        }
        if (data.savedAt) {
          const ageMs = Date.now() - new Date(data.savedAt).getTime();
          const SEVEN_DAYS = 604800000;
          if (ageMs > SEVEN_DAYS) {
            console.warn(`[browse] Warning: State file is ${Math.round(ageMs / 86400000)} days old. Consider re-saving.`);
          }
        }
        bm.setFrame(null);
        await bm.closeAllPages();
        await bm.restoreState({
          cookies: validatedCookies,
          pages: data.pages.map((p) => ({
            url: typeof p.url === "string" ? p.url : "",
            isActive: Boolean(p.isActive),
            storage: null
          }))
        });
        return `State loaded: ${data.cookies.length} cookies, ${data.pages.length} pages`;
      }
      throw new Error("Usage: state save|load <name>");
    }
    case "frame": {
      const target = args[0];
      if (!target)
        throw new Error("Usage: frame <selector|@ref|--name name|--url pattern|main>");
      if (target === "main") {
        bm.setFrame(null);
        bm.clearRefs();
        return "Switched to main frame";
      }
      const page = bm.getPage();
      let frame = null;
      if (target === "--name") {
        if (!args[1])
          throw new Error("Usage: frame --name <name>");
        frame = page.frame({ name: args[1] });
      } else if (target === "--url") {
        if (!args[1])
          throw new Error("Usage: frame --url <pattern>");
        frame = page.frame({ url: new RegExp(escapeRegExp(args[1])) });
      } else {
        const resolved = await bm.resolveRef(target);
        const locator = "locator" in resolved ? resolved.locator : page.locator(resolved.selector);
        const elementHandle = await locator.elementHandle({ timeout: 5000 });
        frame = await elementHandle?.contentFrame() ?? null;
        await elementHandle?.dispose();
      }
      if (!frame)
        throw new Error(`Frame not found: ${target}`);
      bm.setFrame(frame);
      bm.clearRefs();
      return `Switched to frame: ${frame.url()}`;
    }
    case "ux-audit": {
      const page = bm.getPage();
      const data = await page.evaluate(() => {
        const HEADING_CAP = 50;
        const INTERACTIVE_CAP = 200;
        const TEXT_BLOCK_CAP = 50;
        const logoEl = document.querySelector('[class*="logo"], [id*="logo"], header img, [aria-label*="home"], a[href="/"]');
        const siteId = logoEl ? {
          found: true,
          text: (logoEl.textContent || "").trim().slice(0, 100),
          tag: logoEl.tagName,
          alt: logoEl.alt || null
        } : { found: false, text: null, tag: null, alt: null };
        const h1 = document.querySelector("h1");
        const pageName = h1 ? {
          found: true,
          text: h1.textContent?.trim().slice(0, 200) || ""
        } : { found: false, text: null };
        const navEls = document.querySelectorAll('nav, [role="navigation"]');
        const navItems = [];
        navEls.forEach((nav, i) => {
          if (i >= 5)
            return;
          const links = nav.querySelectorAll("a");
          navItems.push({
            text: (nav.getAttribute("aria-label") || `nav-${i}`).slice(0, 50),
            links: links.length
          });
        });
        const activeNavItems = document.querySelectorAll('nav [aria-current], nav .active, nav .current, [role="navigation"] [aria-current], [role="navigation"] .active, [role="navigation"] .current');
        const youAreHere = Array.from(activeNavItems).slice(0, 5).map((el) => ({
          text: (el.textContent || "").trim().slice(0, 50),
          tag: el.tagName
        }));
        const searchEl = document.querySelector('input[type="search"], [role="search"], input[name*="search"], input[placeholder*="search" i], input[aria-label*="search" i]');
        const search = { found: !!searchEl };
        const breadcrumbEl = document.querySelector('[aria-label*="breadcrumb" i], .breadcrumb, .breadcrumbs, [class*="breadcrumb"]');
        const breadcrumbs = breadcrumbEl ? {
          found: true,
          items: Array.from(breadcrumbEl.querySelectorAll("a, span, li")).slice(0, 10).map((el) => (el.textContent || "").trim().slice(0, 30))
        } : { found: false, items: [] };
        const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).slice(0, HEADING_CAP).map((h) => ({
          tag: h.tagName,
          text: (h.textContent || "").trim().slice(0, 80),
          size: getComputedStyle(h).fontSize
        }));
        const interactiveEls = Array.from(document.querySelectorAll('a, button, input, select, textarea, [role="button"], [tabindex]')).slice(0, INTERACTIVE_CAP);
        const interactive = interactiveEls.map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            tag: el.tagName,
            text: (el.textContent || el.placeholder || "").trim().slice(0, 50),
            type: el.type || null,
            role: el.getAttribute("role"),
            w: Math.round(rect.width),
            h: Math.round(rect.height),
            visible: rect.width > 0 && rect.height > 0
          };
        }).filter((el) => el.visible);
        const textBlocks = Array.from(document.querySelectorAll('p, [class*="description"], [class*="intro"], [class*="welcome"], [class*="hero"] p, main p')).slice(0, TEXT_BLOCK_CAP).map((el) => ({
          text: (el.textContent || "").trim().slice(0, 200),
          wordCount: (el.textContent || "").trim().split(/\s+/).filter(Boolean).length
        }));
        const bodyText = (document.body?.textContent || "").trim();
        const totalWords = bodyText.split(/\s+/).filter(Boolean).length;
        return {
          url: window.location.href,
          title: document.title,
          siteId,
          pageName,
          navigation: navItems,
          youAreHere,
          search,
          breadcrumbs,
          headings,
          interactive,
          textBlocks,
          totalWords
        };
      });
      return JSON.stringify(data, null, 2);
    }
    case "domain-skill": {
      return await handleDomainSkillCommand(args, bm);
    }
    case "skill": {
      const port = opts?.daemonPort;
      if (port === undefined) {
        throw new Error("skill command requires daemonPort in MetaCommandOpts (server bug)");
      }
      return await handleSkillCommand(args, { port });
    }
    case "cdp": {
      await Promise.resolve().then(() => init_cdp_commands());
      return await handleCdpCommand(args, bm);
    }
    case "memory": {
      await Promise.resolve().then(() => init_memory_command());
      return await handleMemoryCommand(args, bm);
    }
    default:
      throw new Error(`Unknown meta command: ${command}`);
  }
}
var init_meta_commands = __esm(() => {
  init_snapshot();
  init_read_commands();
  init_commands();
  init_domain_skill_commands();
  init_browser_skill_commands();
  init_url_validation();
  init_token_registry();
  init_path_security();
  init_screenshot_size_guard();
  init_file_permissions();
  init_platform();
  init_config();
  init_session_persist();
});

// browse/src/audit.ts
function initAuditLog(logPath) {
  auditPath = logPath;
}
function writeAuditEntry(entry) {
  if (!auditPath)
    return;
  try {
    const truncatedArgs = entry.args.length > MAX_ARGS_LENGTH ? entry.args.slice(0, MAX_ARGS_LENGTH) + "…" : entry.args;
    const truncatedError = entry.error && entry.error.length > MAX_ERROR_LENGTH ? entry.error.slice(0, MAX_ERROR_LENGTH) + "…" : entry.error;
    const record = {
      ts: entry.ts,
      cmd: entry.cmd,
      args: truncatedArgs,
      origin: entry.origin,
      durationMs: entry.durationMs,
      status: entry.status,
      hasCookies: entry.hasCookies,
      mode: entry.mode
    };
    if (entry.aliasOf)
      record.aliasOf = entry.aliasOf;
    if (truncatedError)
      record.error = truncatedError;
    appendSecureFile(auditPath, JSON.stringify(record) + `
`);
  } catch {}
}
var MAX_ARGS_LENGTH = 200, MAX_ERROR_LENGTH = 300, auditPath = null;
var init_audit = __esm(() => {
  init_file_permissions();
});

// browse/src/port-allocator.ts
import * as net from "net";
function normalizePortError(err) {
  const maybeNodeError = err;
  return {
    available: false,
    code: maybeNodeError?.code,
    message: maybeNodeError?.message || String(err)
  };
}
function isOccupiedPort(result) {
  return result.code === "EADDRINUSE";
}
function formatPortFailureDetail(attempt) {
  const { code, message } = attempt.result;
  return code ? `${attempt.port} (${code}: ${message})` : `${attempt.port} (${message})`;
}
function formatExplicitPortUnavailableError(port, result) {
  if (isOccupiedPort(result)) {
    return new Error(`[browse] Port ${port} (from BROWSE_PORT env) is in use`);
  }
  const detail = result.code ? `${result.code}: ${result.message}` : result.message;
  return new Error(`[browse] Cannot bind BROWSE_PORT=${port} on 127.0.0.1 (${detail}). ` + `This usually means localhost port binding is blocked by the current sandbox or OS permissions, ` + `not that the port is occupied. Allow localhost binding, or run browse from an unrestricted terminal.`);
}
function formatRandomPortUnavailableError(attempts) {
  const blockingAttempts = attempts.filter((attempt) => !isOccupiedPort(attempt.result));
  if (blockingAttempts.length > 0) {
    const last = blockingAttempts[blockingAttempts.length - 1];
    return new Error(`[browse] Cannot bind localhost ports after ${attempts.length} attempts in range ` + `${RANDOM_PORT_MIN}-${RANDOM_PORT_MAX}. Last error: ${formatPortFailureDetail(last)}. ` + `This usually means the current sandbox or OS permissions are blocking localhost port binding, ` + `not that every sampled port is occupied. Allow localhost binding, set BROWSE_PORT to an approved ` + `port, or run browse from an unrestricted terminal.`);
  }
  return new Error(`[browse] No available port after ${RANDOM_PORT_RETRIES} attempts in range ` + `${RANDOM_PORT_MIN}-${RANDOM_PORT_MAX}; every sampled port was already in use`);
}
function checkPortAvailable(port, hostname = "127.0.0.1") {
  return new Promise((resolve) => {
    const srv = net.createServer();
    let settled = false;
    const finish = (result) => {
      if (settled)
        return;
      settled = true;
      resolve(result);
    };
    srv.once("error", (err) => finish(normalizePortError(err)));
    try {
      srv.listen(port, hostname, () => {
        srv.close(() => finish({ available: true }));
      });
    } catch (err) {
      finish(normalizePortError(err));
    }
  });
}
async function findAvailablePort(explicitPort) {
  if (explicitPort) {
    const result = await checkPortAvailable(explicitPort);
    if (result.available) {
      return explicitPort;
    }
    throw formatExplicitPortUnavailableError(explicitPort, result);
  }
  const attempts = [];
  for (let attempt = 0;attempt < RANDOM_PORT_RETRIES; attempt++) {
    const port = RANDOM_PORT_MIN + Math.floor(Math.random() * (RANDOM_PORT_MAX - RANDOM_PORT_MIN));
    const result = await checkPortAvailable(port);
    if (result.available) {
      return port;
    }
    attempts.push({ port, result });
  }
  throw formatRandomPortUnavailableError(attempts);
}
var RANDOM_PORT_MIN = 1e4, RANDOM_PORT_MAX = 49151, RANDOM_PORT_RETRIES = 5;
var init_port_allocator = () => {};

// browse/src/terminal-agent-control.ts
import * as fs22 from "fs";
import * as path21 from "path";
import * as crypto6 from "crypto";
import { spawnSync as spawnSync3 } from "child_process";
function windowsProcessQuery(pid) {
  const script = `(Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}' | Select-Object CreationDate,CommandLine | ConvertTo-Json -Compress)`;
  try {
    const result = spawnSync3("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8", windowsHide: true, timeout: 2000 });
    if (result.status !== 0 || !result.stdout)
      return { startTime: "", commandLine: "" };
    const processInfo = JSON.parse(result.stdout);
    return { startTime: processInfo?.CreationDate || "", commandLine: processInfo?.CommandLine || "" };
  } catch {
    return { startTime: "", commandLine: "" };
  }
}
function agentProcessInfo(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0)
    return { startTime: "", commandLine: "" };
  if (process.platform !== "win32")
    return { startTime: readPidStartTime(pid), commandLine: readPidCmdline(pid) };
  const query = windowsProcessQuery(pid);
  return { startTime: win32CreationTimeSource.read(pid) ?? query.startTime, commandLine: query.commandLine };
}
function readAgentStartTime(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0)
    return "";
  if (process.platform !== "win32")
    return readPidStartTime(pid);
  return win32CreationTimeSource.read(pid) ?? windowsProcessQuery(pid).startTime;
}
function reclaimPublicationLock(stateDir, lockPath) {
  try {
    const inode = fs22.lstatSync(lockPath, { bigint: true });
    if (!inode.isFile() || inode.size === 0n || inode.size > 4096n)
      return false;
    const contents = fs22.readFileSync(lockPath, "utf8");
    const lock = JSON.parse(contents);
    const record = readAgentRecord(stateDir);
    if (lock?.kind !== "agent-publication-v1" || !record || !Number.isSafeInteger(record.pid) || record.pid <= 0 || typeof record.gen !== "string" || !record.gen || typeof record.startTime !== "string" || !record.startTime || record.ownerPid !== process.pid || typeof record.ownerStartTime !== "string" || !record.ownerStartTime)
      return false;
    const fields = ["pid", "gen", "startTime", "ownerPid", "ownerStartTime"];
    if (fields.some((field) => lock[field] !== record[field]) || readAgentStartTime(process.pid) !== record.ownerStartTime)
      return false;
    let present = true;
    try {
      process.kill(record.pid, 0);
    } catch (err) {
      if (err?.code !== "ESRCH")
        return false;
      present = false;
    }
    if (present) {
      if (readAgentStartTime(record.pid) !== record.startTime)
        return false;
      if (process.platform === "linux") {
        const state = fs22.readFileSync(`/proc/${record.pid}/stat`, "utf8").match(/^\d+ \(.*\) ([A-Z])/u)?.[1];
        if (state !== "Z")
          return false;
      } else if (process.platform === "darwin") {
        const result = spawnSync3("ps", ["-p", String(record.pid), "-o", "stat="], { encoding: "utf8", windowsHide: true, timeout: 2000 });
        if (result.status !== 0 || result.stdout?.trim()?.[0] !== "Z")
          return false;
      } else
        return false;
    }
    const currentRecord = readAgentRecord(stateDir);
    if (!currentRecord || fields.some((field) => currentRecord[field] !== record[field]))
      return false;
    if (present && readAgentStartTime(record.pid) !== record.startTime)
      return false;
    if (fs22.readFileSync(lockPath, "utf8") !== contents)
      return false;
    const current = fs22.lstatSync(lockPath, { bigint: true });
    if (!current.isFile() || current.dev !== inode.dev || current.ino !== inode.ino)
      return false;
    fs22.unlinkSync(lockPath);
    return true;
  } catch {
    return false;
  }
}
function acquireAgentStateLock(stateDir, waitMs = 5000, publicationGen) {
  mkdirSecure(stateDir);
  const lockPath = path21.join(stateDir, "terminal-agent-pid.lock");
  let publication;
  if (publicationGen !== undefined) {
    const record = readAgentRecord(stateDir);
    if (!record || record.pid !== process.pid || record.gen !== publicationGen || !record.ownerPid || !isOurAgent(record, record.ownerPid)) {
      throw new Error("terminal-agent publication lock identity is unavailable");
    }
    publication = JSON.stringify({
      kind: "agent-publication-v1",
      pid: record.pid,
      gen: record.gen,
      startTime: record.startTime,
      ownerPid: record.ownerPid,
      ownerStartTime: record.ownerStartTime
    });
  }
  const deadline = Date.now() + waitMs;
  let reclaimed = false;
  let fd;
  while (true) {
    try {
      if (publication !== undefined) {
        atomicWriteSync(lockPath, publication, { mode: 384, noReplace: true });
        fd = fs22.openSync(lockPath, "r");
      } else {
        fd = fs22.openSync(lockPath, "wx", 384);
      }
      break;
    } catch (err) {
      if (err?.code === "EEXIST" && !reclaimed && reclaimPublicationLock(stateDir, lockPath)) {
        reclaimed = true;
        continue;
      }
      if (err?.code !== "EEXIST" || Date.now() >= deadline) {
        throw new Error(`terminal-agent state lock unavailable at ${lockPath}: ${err?.code || err}; inspect the owning process before manual recovery`);
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
  }
  const owned = fs22.fstatSync(fd, { bigint: true });
  return () => {
    try {
      const current = fs22.statSync(lockPath, { bigint: true });
      if (current.dev === owned.dev && current.ino === owned.ino)
        fs22.unlinkSync(lockPath);
    } catch (err) {
      if (err?.code !== "ENOENT")
        throw err;
    } finally {
      fs22.closeSync(fd);
    }
  };
}
function bunChildFlags() {
  return ["--no-env-file", `--config=${emptyBunConfig()}`];
}
function resolveBunExecutable(opts = {}) {
  if ((opts.platform ?? process.platform) !== "win32")
    return "bun";
  return findWindowsBunExe(opts) ?? "bun";
}
function resolveTerminalAgentScript(searchHints = {}) {
  const meta = searchHints.metaDir || __dirname;
  const exec = searchHints.execPath || process.execPath;
  const candidates = [
    path21.resolve(meta, "terminal-agent.ts"),
    path21.resolve(path21.dirname(exec), "..", "src", "terminal-agent.ts")
  ];
  for (const c of candidates) {
    if (fs22.existsSync(c))
      return c;
  }
  return null;
}
function spawnTerminalAgent(opts) {
  if (!Number.isSafeInteger(opts.ownerPid) || opts.ownerPid <= 0)
    throw new Error("terminal-agent requires a daemon owner PID");
  const stateDir = path21.dirname(opts.stateFile);
  const script = opts.scriptPath || resolveTerminalAgentScript();
  if (!script || !fs22.existsSync(script))
    return null;
  const release = acquireAgentStateLock(stateDir);
  try {
    const prior = readAgentRecord(stateDir);
    if (prior) {
      if (prior.pid === 0) {
        console.warn("[browse] terminal-agent startup or failed exit remains unconfirmed; retaining its reservation");
        return null;
      }
      if (isAgentRecordLive(prior) && !stopAgentByRecord(prior)) {
        console.warn(`[browse] terminal-agent PID ${prior.pid} is still running or its identity cannot be confirmed; refusing a second agent`);
        return null;
      }
      clearAgentRecord(stateDir, prior);
      safeUnlink(path21.join(stateDir, "terminal-port"));
      safeUnlink(path21.join(stateDir, "terminal-internal-token"));
    }
    const ownerStartTime = readAgentStartTime(opts.ownerPid);
    if (!ownerStartTime)
      throw new Error("terminal-agent owner identity is unavailable");
    const gen = crypto6.randomBytes(16).toString("base64url");
    const reservation = { pid: 0, gen, startedAt: Date.now(), ownerPid: opts.ownerPid, ownerStartTime };
    writeAgentRecord(stateDir, reservation);
    let proc;
    try {
      proc = Bun.spawn([resolveBunExecutable(), "run", ...bunChildFlags(), script, `--agent-gen=${gen}`], {
        cwd: opts.cwd || process.cwd(),
        env: {
          ...process.env,
          ...opts.extraEnv || {},
          BROWSE_STATE_FILE: opts.stateFile,
          BROWSE_SERVER_PORT: String(opts.serverPort),
          BROWSE_OWNER_PID: String(opts.ownerPid),
          BROWSE_OWNER_START_TIME: ownerStartTime,
          BROWSE_AGENT_GEN: gen
        },
        stdio: ["ignore", "ignore", "ignore"],
        windowsHide: true,
        detached: process.platform === "win32"
      });
    } catch (err) {
      clearAgentRecord(stateDir, reservation);
      throw err;
    }
    const retainUntilExit = () => {
      pendingAgentExits.add(proc);
      proc.exited?.then(() => {
        try {
          const releasePending = acquireAgentStateLock(stateDir);
          try {
            clearAgentRecord(stateDir, reservation);
          } finally {
            releasePending();
          }
        } catch (err) {
          console.warn("[browse] terminal-agent pending exit cleanup failed:", err);
        }
        pendingAgentExits.delete(proc);
      }, (err) => console.warn("[browse] terminal-agent exit remains unconfirmed:", err));
    };
    const pid = proc.pid;
    const startTime = pid ? readAgentStartTime(pid) : "";
    if (!pid || !startTime) {
      try {
        proc.kill("SIGTERM");
      } catch {}
      retainUntilExit();
      throw new Error("terminal-agent process identity is unavailable");
    }
    const record = { pid, gen, startedAt: Date.now(), startTime, ownerPid: opts.ownerPid, ownerStartTime };
    try {
      writeAgentRecord(stateDir, record);
    } catch (err) {
      if (!stopAgentByRecord(record)) {
        retainUntilExit();
        throw new Error(`terminal-agent record update failed and child ${pid} exit is unconfirmed: ${err}`);
      }
      clearAgentRecord(stateDir, reservation);
      throw err;
    }
    proc.unref?.();
    return pid;
  } finally {
    release();
  }
}
function agentRecordPath(stateDir) {
  return path21.join(stateDir, "terminal-agent-pid");
}
function readAgentRecord(stateDir) {
  try {
    const raw = fs22.readFileSync(agentRecordPath(stateDir), "utf-8");
    const j = JSON.parse(raw);
    if (typeof j?.pid === "number" && typeof j?.gen === "string" && typeof j?.startedAt === "number") {
      return j;
    }
    return null;
  } catch {
    return null;
  }
}
function writeAgentRecord(stateDir, record) {
  try {
    mkdirSecure(stateDir);
  } catch {}
  const target = agentRecordPath(stateDir);
  atomicWriteSync(target, JSON.stringify(record), { mode: 384 });
  restrictFilePermissions(target);
}
function clearAgentRecord(stateDir, expected) {
  if (expected) {
    const current = readAgentRecord(stateDir);
    if (!current || current.pid !== expected.pid || current.gen !== expected.gen)
      return;
  }
  safeUnlink(agentRecordPath(stateDir));
}
function isAgentRecordLive(record) {
  return Number.isSafeInteger(record.pid) && record.pid > 0 && isProcessAlive(record.pid);
}
function agentStatus(record, ownerPid) {
  if (!isAgentRecordLive(record))
    return "gone";
  if (!record.startTime || !record.ownerPid || !record.ownerStartTime)
    return "unknown";
  if (ownerPid !== undefined && (record.ownerPid !== ownerPid || record.ownerStartTime !== readAgentStartTime(ownerPid)))
    return "unknown";
  const actual = agentProcessInfo(record.pid);
  if (!actual.startTime)
    return isAgentRecordLive(record) ? "unknown" : "gone";
  if (actual.startTime !== record.startTime && process.platform !== "win32")
    return "gone";
  if (actual.startTime !== record.startTime && !actual.commandLine)
    return "unknown";
  try {
    let state;
    if (process.platform === "linux") {
      state = fs22.readFileSync(`/proc/${record.pid}/stat`, "utf8").match(/^\d+ \(.*\) ([A-Z])/u)?.[1];
    } else if (process.platform === "darwin") {
      const result = spawnSync3("ps", ["-p", String(record.pid), "-o", "stat="], { encoding: "utf8", windowsHide: true, timeout: 2000 });
      if (result.status === 0)
        state = result.stdout?.trim()?.[0];
    }
    if (state === "Z")
      return "gone";
  } catch {}
  if (!isAgentRecordLive(record))
    return "gone";
  return actual.commandLine.split(/\s+/).some((arg) => arg.replace(/^['"]|['"]$/g, "") === `--agent-gen=${record.gen}`) ? "owned" : actual.startTime === record.startTime ? "unknown" : "gone";
}
function isOurAgent(record, ownerPid) {
  return agentStatus(record, ownerPid) === "owned";
}
function isAgentRecordGone(record) {
  return agentStatus(record) === "gone";
}
function killAgentByRecord(record, signal = "SIGTERM") {
  if (!isOurAgent(record))
    return false;
  try {
    process.kill(record.pid, signal);
    return true;
  } catch {
    return false;
  }
}
function stopAgentByRecord(record, graceMs = 1000) {
  const initial = agentStatus(record);
  if (initial === "gone")
    return true;
  if (initial !== "owned")
    return false;
  const waitForExit = (ms) => {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
      const status = agentStatus(record);
      if (status === "gone")
        return true;
      if (status === "unknown")
        return false;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
    return agentStatus(record) === "gone";
  };
  if (!killAgentByRecord(record, "SIGTERM"))
    return agentStatus(record) === "gone";
  if (waitForExit(graceMs))
    return true;
  const afterGrace = agentStatus(record);
  if (afterGrace !== "owned")
    return afterGrace === "gone";
  if (!killAgentByRecord(record, "SIGKILL"))
    return agentStatus(record) === "gone";
  return waitForExit(graceMs);
}
var __dirname = "C:\\Users\\obrie\\gstack\\browse\\src", FILETIME_UNIX_EPOCH_MS = 11644473600000n, win32Kernel, win32CreationTimeSource, pendingAgentExits;
var init_terminal_agent_control = __esm(() => {
  init_error_handling2();
  init_file_permissions();
  init_fs_atomic();
  init_xvfb();
  init_bun_child_config();
  win32CreationTimeSource = {
    read(pid) {
      if (!process.versions.bun)
        return;
      try {
        const { dlopen, FFIType, ptr } = __require("bun:ffi");
        win32Kernel ??= dlopen("kernel32.dll", {
          OpenProcess: { args: [FFIType.u32, FFIType.i32, FFIType.u32], returns: FFIType.u64 },
          GetProcessTimes: { args: [FFIType.u64, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr], returns: FFIType.i32 },
          CloseHandle: { args: [FFIType.u64], returns: FFIType.i32 }
        }).symbols;
        const handle = win32Kernel.OpenProcess(4096, 0, pid);
        if (!handle)
          return;
        try {
          const times = new BigUint64Array(4);
          if (!win32Kernel.GetProcessTimes(handle, ptr(times, 0), ptr(times, 8), ptr(times, 16), ptr(times, 24)) || times[0] === 0n)
            return;
          return `/Date(${times[0] / 10000n - FILETIME_UNIX_EPOCH_MS})/`;
        } finally {
          win32Kernel.CloseHandle(handle);
        }
      } catch {
        return;
      }
    }
  };
  pendingAgentExits = new Set;
});

// browse/src/extension-id.ts
function allowedExtensionOrigin() {
  const configured = readGstackConfigYamlKey("browse_extension_id");
  const id = configured && /^[a-p]{32}$/.test(configured) ? configured : GSTACK_EXTENSION_ID;
  return `chrome-extension://${id}`;
}
var GSTACK_EXTENSION_ID = "dgbkdbjebeiblbajiilljmhjdpmiglep";
var init_extension_id = __esm(() => {
  init_config();
});

// browse/src/socks-bridge.ts
import * as net2 from "net";
import { SocksClient } from "socks";
function buildUpstream(upstream) {
  return {
    host: upstream.host,
    port: upstream.port,
    type: 5,
    ...upstream.userId ? { userId: upstream.userId } : {},
    ...upstream.password ? { password: upstream.password } : {}
  };
}
function parseConnectRequest(reqData) {
  if (reqData.length < 7 || reqData[0] !== SOCKS5_VERSION || reqData[1] !== CMD_CONNECT) {
    return null;
  }
  const atyp = reqData[3];
  if (atyp === ATYP_IPV4) {
    if (reqData.length < 10)
      return null;
    const host = `${reqData[4]}.${reqData[5]}.${reqData[6]}.${reqData[7]}`;
    const port = reqData.readUInt16BE(8);
    return { host, port };
  }
  if (atyp === ATYP_DOMAINNAME) {
    const len = reqData[4];
    if (reqData.length < 5 + len + 2)
      return null;
    const host = reqData.subarray(5, 5 + len).toString("utf8");
    const port = reqData.readUInt16BE(5 + len);
    return { host, port };
  }
  if (atyp === ATYP_IPV6) {
    if (reqData.length < 22)
      return null;
    const parts = [];
    for (let i = 4;i < 20; i += 2)
      parts.push(reqData.readUInt16BE(i).toString(16));
    const host = parts.join(":");
    const port = reqData.readUInt16BE(20);
    return { host, port };
  }
  return null;
}
function writeReply(sock, code) {
  const reply = Buffer.from([SOCKS5_VERSION, code, 0, ATYP_IPV4, 0, 0, 0, 0, 0, 0]);
  try {
    sock.write(reply);
  } catch {}
}
async function startSocksBridge(opts) {
  const upstreamProxy = buildUpstream(opts.upstream);
  const requestedPort = opts.port ?? 0;
  const inFlight = new Set;
  function greetingSize(buf) {
    if (buf.length < 2)
      return null;
    return 2 + buf[1];
  }
  function connectSize(buf) {
    if (buf.length < 5)
      return null;
    const atyp = buf[3];
    if (atyp === ATYP_IPV4)
      return 10;
    if (atyp === ATYP_IPV6)
      return 22;
    if (atyp === ATYP_DOMAINNAME)
      return 7 + buf[4];
    return null;
  }
  const server = net2.createServer((clientSocket) => {
    inFlight.add(clientSocket);
    clientSocket.once("close", () => inFlight.delete(clientSocket));
    let state = "greeting";
    let buf = Buffer.alloc(0);
    let upstreamSocket = null;
    const killBoth = (reason) => {
      state = "closed";
      try {
        clientSocket.destroy();
      } catch {}
      if (upstreamSocket) {
        try {
          upstreamSocket.destroy();
        } catch {}
      }
    };
    const handshakeTimeout = setTimeout(() => {
      if (state === "greeting" || state === "connect" || state === "connecting") {
        killBoth("handshake timeout");
      }
    }, 30000);
    clientSocket.once("close", () => clearTimeout(handshakeTimeout));
    const onData = (chunk) => {
      if (state === "closed" || state === "piped")
        return;
      buf = buf.length === 0 ? chunk : Buffer.concat([buf, chunk]);
      if (state === "greeting") {
        const sz = greetingSize(buf);
        if (sz == null || buf.length < sz)
          return;
        const greeting = buf.subarray(0, sz);
        buf = buf.subarray(sz);
        if (greeting[0] !== SOCKS5_VERSION) {
          killBoth("bad version");
          return;
        }
        try {
          clientSocket.write(Buffer.from([SOCKS5_VERSION, NO_AUTH_METHOD]));
        } catch {
          killBoth("write greeting reply failed");
          return;
        }
        state = "connect";
      }
      if (state === "connect") {
        const sz = connectSize(buf);
        if (sz == null || buf.length < sz)
          return;
        const reqData = buf.subarray(0, sz);
        const remainder = buf.subarray(sz);
        const dest = parseConnectRequest(reqData);
        if (!dest) {
          writeReply(clientSocket, REPLY_GENERAL_FAILURE);
          killBoth("bad connect request");
          return;
        }
        state = "connecting";
        clientSocket.pause();
        SocksClient.createConnection({
          proxy: upstreamProxy,
          command: "connect",
          destination: { host: dest.host, port: dest.port },
          timeout: UPSTREAM_CONNECT_TIMEOUT_MS
        }).then((result) => {
          if (state === "closed") {
            try {
              result.socket.destroy();
            } catch {}
            return;
          }
          upstreamSocket = result.socket;
          writeReply(clientSocket, REPLY_SUCCESS);
          if (remainder.length > 0) {
            try {
              upstreamSocket.write(remainder);
            } catch {
              killBoth("replay write failed");
              return;
            }
          }
          upstreamSocket.on("error", () => killBoth("upstream error"));
          upstreamSocket.on("close", () => {
            try {
              clientSocket.destroy();
            } catch {}
          });
          clientSocket.removeListener("data", onData);
          clientSocket.pipe(upstreamSocket);
          upstreamSocket.pipe(clientSocket);
          clientSocket.resume();
          state = "piped";
        }).catch(() => {
          writeReply(clientSocket, REPLY_HOST_UNREACHABLE);
          killBoth("upstream connect failed");
        });
        return;
      }
    };
    clientSocket.on("data", onData);
    clientSocket.on("error", () => killBoth("client error"));
  });
  await new Promise((resolve, reject) => {
    const onErr = (e) => {
      server.off("listening", onListen);
      reject(e);
    };
    const onListen = () => {
      server.off("error", onErr);
      resolve();
    };
    server.once("error", onErr);
    server.once("listening", onListen);
    server.listen(requestedPort, "127.0.0.1");
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("socks-bridge: unexpected listener address");
  }
  return {
    port: address.port,
    server,
    close: async () => {
      for (const sock of inFlight) {
        try {
          sock.destroy();
        } catch {}
      }
      inFlight.clear();
      await new Promise((resolve) => server.close(() => resolve()));
    }
  };
}
async function testUpstream(opts) {
  const upstreamProxy = buildUpstream(opts.upstream);
  const testHost = opts.testHost ?? "1.1.1.1";
  const testPort = opts.testPort ?? 443;
  const budgetMs = opts.budgetMs ?? 5000;
  const retries = opts.retries ?? 3;
  const backoffMs = opts.backoffMs ?? 500;
  const start = Date.now();
  let lastErr;
  for (let attempt = 1;attempt <= retries; attempt++) {
    const elapsed = Date.now() - start;
    const remaining = budgetMs - elapsed;
    if (remaining <= 0)
      break;
    const perAttempt = Math.min(remaining, Math.max(500, Math.floor(budgetMs / retries)));
    try {
      const result = await SocksClient.createConnection({
        proxy: upstreamProxy,
        command: "connect",
        destination: { host: testHost, port: testPort },
        timeout: perAttempt
      });
      try {
        result.socket.destroy();
      } catch {}
      return { ok: true, attempts: attempt, ms: Date.now() - start };
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        const elapsedAfter = Date.now() - start;
        if (elapsedAfter + backoffMs >= budgetMs)
          break;
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }
  }
  const reason = lastErr instanceof Error ? lastErr.message : String(lastErr);
  const err = new Error(`SOCKS5 upstream rejected or unreachable after ${retries} attempts (${Date.now() - start}ms): ${reason}`);
  err.upstreamHost = opts.upstream.host;
  err.upstreamPort = opts.upstream.port;
  throw err;
}
var SOCKS5_VERSION = 5, NO_AUTH_METHOD = 0, CMD_CONNECT = 1, ATYP_IPV4 = 1, ATYP_DOMAINNAME = 3, ATYP_IPV6 = 4, REPLY_SUCCESS = 0, REPLY_GENERAL_FAILURE = 1, REPLY_HOST_UNREACHABLE = 4, UPSTREAM_CONNECT_TIMEOUT_MS = 15000;
var init_socks_bridge = () => {};

// lib/egress-receipt.ts
import { createHash as createHash4 } from "node:crypto";
import fs23 from "node:fs";
import path22 from "node:path";
function resolveEgressHome(env = process.env) {
  return path22.resolve(resolveStateRoot(env));
}
function egressLedgerPath(home) {
  return path22.join(home, "security", "egress.jsonl");
}
function sha256Hex(data) {
  return createHash4("sha256").update(data).digest("hex");
}
function receiptError(message, cause) {
  const error = cause === undefined ? new Error(message) : new Error(message, { cause });
  error.code = EGRESS_RECEIPT_FAILED;
  return error;
}
function requireString(value, name) {
  if (typeof value !== "string" || !value)
    throw receiptError(`Egress receipt requires a non-empty ${name}`);
  if (Buffer.byteLength(value) > MAX_FIELD_BYTES) {
    throw receiptError(`Egress receipt ${name} exceeds ${MAX_FIELD_BYTES} bytes (${Buffer.byteLength(value)})`);
  }
  return value;
}
function withLedgerLock(ledger, callback, budgetMs = LEDGER_LOCK_BUDGET_MS) {
  const lock = `${ledger}.lock`;
  const deadline = Date.now() + Math.max(0, budgetMs);
  for (;; ) {
    try {
      fs23.mkdirSync(lock);
      break;
    } catch (error) {
      if (error?.code !== "EEXIST")
        throw error;
      if (Date.now() > deadline) {
        try {
          const age = Date.now() - fs23.statSync(lock).mtimeMs;
          if (age > 1e4) {
            fs23.rmdirSync(lock);
            continue;
          }
        } catch {}
        throw receiptError(`Egress ledger is locked: ${lock}`);
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
    }
  }
  try {
    return callback();
  } finally {
    try {
      fs23.rmdirSync(lock);
    } catch {}
  }
}
function lastRawLine(ledger) {
  let fd;
  try {
    fd = fs23.openSync(ledger, "r");
  } catch (error) {
    if (error?.code === "ENOENT")
      return null;
    throw error;
  }
  try {
    const size = fs23.fstatSync(fd).size;
    if (size === 0)
      return null;
    const length = Math.min(size, TAIL_READ_BYTES);
    const buffer = Buffer.alloc(length);
    fs23.readSync(fd, buffer, 0, length, size - length);
    const tail = buffer.toString("utf8");
    const lines = tail.split(`
`).filter((line) => line.length > 0);
    return lines.length ? lines[lines.length - 1] : null;
  } finally {
    fs23.closeSync(fd);
  }
}
function warnLedgerSizeOnce(ledger) {
  if (warnedLedgerSize)
    return;
  let size;
  try {
    size = fs23.statSync(ledger).size;
  } catch {
    return;
  }
  if (size <= LEDGER_WARN_BYTES)
    return;
  warnedLedgerSize = true;
  process.stderr.write(ledgerSizeWarning(ledger, size) + `
`);
}
function ledgerSizeWarning(ledger, size) {
  const mb = (size / (1024 * 1024)).toFixed(1);
  return `gstack: egress ledger is large (${mb}MB): ${ledger}. ` + `This file records what gstack ATTEMPTS to send off-machine (content-free receipts, for auditing). ` + `Inspect it with 'gstack-egress list'. Trimming arrives with ledger rotation (TODO); until then it only grows.`;
}
function lockBudget(value) {
  if (value === undefined)
    return LEDGER_LOCK_BUDGET_MS;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw receiptError("Egress receipt lockBudgetMs must be a non-negative finite number");
  }
  return value;
}
function appendChained(homeOrNull, record, env, budgetMs = LEDGER_LOCK_BUDGET_MS) {
  const home = homeOrNull ?? resolveEgressHome(env);
  const ledger = egressLedgerPath(home);
  try {
    fs23.mkdirSync(path22.dirname(ledger), { recursive: true, mode: 448 });
    return withLedgerLock(ledger, () => {
      const previous = lastRawLine(ledger);
      const line = JSON.stringify({ ...record, prev: previous == null ? "" : sha256Hex(previous) });
      const existed = fs23.existsSync(ledger);
      fs23.appendFileSync(ledger, `${line}
`, { mode: 384 });
      if (!existed)
        fs23.chmodSync(ledger, 384);
      return { id: sha256Hex(line), path: ledger };
    }, budgetMs);
  } catch (error) {
    if (error?.code === EGRESS_RECEIPT_FAILED)
      throw error;
    throw receiptError(`Egress receipt could not be written to ${ledger}: ${error?.message ?? error}`, error);
  }
}
function writeReceipt(opts) {
  const sink = requireString(opts.sink, "sink");
  const host = requireString(opts.host, "host");
  const payloadClass = requireString(opts.payloadClass, "payloadClass");
  const consent = requireString(opts.consent, "consent");
  const bytes = opts.bytes ?? 0;
  if (!Number.isSafeInteger(bytes) || bytes < 0)
    throw receiptError("Egress receipt bytes must be a non-negative integer");
  const sha256 = opts.sha256 ?? null;
  if (sha256 !== null && !SHA256_HEX.test(String(sha256)))
    throw receiptError("Egress receipt sha256 must be 64 lowercase hex chars or null");
  const budgetMs = lockBudget(opts.lockBudgetMs);
  const home = opts.home ?? resolveEgressHome(opts.env);
  warnLedgerSizeOnce(egressLedgerPath(home));
  return appendChained(home, {
    ts: new Date().toISOString(),
    type: "egress",
    sink,
    host,
    payload_class: payloadClass,
    bytes,
    sha256,
    consent
  }, opts.env, budgetMs);
}
var EGRESS_RECEIPT_FAILED = "EGRESS_RECEIPT_FAILED", SHA256_HEX, LEDGER_WARN_BYTES, TAIL_READ_BYTES = 4096, LEDGER_LOCK_BUDGET_MS = 2500, MAX_FIELD_BYTES = 512, warnedLedgerSize = false;
var init_egress_receipt = __esm(() => {
  init_state_root();
  SHA256_HEX = /^[0-9a-f]{64}$/;
  LEDGER_WARN_BYTES = 25 * 1024 * 1024;
});

// browse/src/proxy-redact.ts
function redactProxyUrl(input) {
  if (!input)
    return "<no proxy>";
  let url;
  try {
    url = new URL(input);
  } catch {
    return "<malformed proxy url>";
  }
  if (url.username)
    url.username = REDACTED;
  if (url.password)
    url.password = REDACTED;
  return url.toString();
}
var REDACTED = "***";

// browse/src/tunnel-denial-log.ts
import { promises as fsp } from "fs";
import * as path23 from "path";
async function ensureDir3(dir) {
  if (ensuredDir === dir)
    return;
  try {
    mkdirSecure(dir);
    ensuredDir = dir;
  } catch {}
}
function logTunnelDenial(req, url, reason) {
  const now = Date.now();
  while (writeTimestamps.length && writeTimestamps[0] < now - WINDOW_MS) {
    writeTimestamps.shift();
  }
  if (writeTimestamps.length >= RATE_CAP) {
    droppedSinceLastWrite += 1;
    return;
  }
  writeTimestamps.push(now);
  const sourceIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const entry = {
    ts: new Date(now).toISOString(),
    kind: "tunnel_auth_denial",
    reason,
    path: url.pathname,
    method: req.method,
    sourceIp
  };
  if (droppedSinceLastWrite > 0) {
    entry.droppedSinceLastWrite = droppedSinceLastWrite;
    droppedSinceLastWrite = 0;
  }
  (async () => {
    try {
      const dir = path23.join(resolveStateRoot(), "security");
      await ensureDir3(dir);
      await fsp.appendFile(path23.join(dir, "attempts.jsonl"), JSON.stringify(entry) + `
`);
    } catch {}
  })();
}
var RATE_CAP = 60, WINDOW_MS = 60000, writeTimestamps, droppedSinceLastWrite = 0, ensuredDir = null;
var init_tunnel_denial_log = __esm(() => {
  init_file_permissions();
  init_state_root();
  writeTimestamps = [];
});

// browse/src/session-cookie-store.ts
import * as crypto7 from "crypto";
function createSessionCookieStore(opts) {
  const { cookieName, ttlMs } = opts;
  const maxSessions = opts.maxSessions ?? 1e4;
  const sessions = new Map;
  function pruneExpired(now) {
    let checked = 0;
    for (const [token, session] of sessions) {
      if (checked++ >= 20)
        break;
      if (session.expiresAt <= now)
        sessions.delete(token);
    }
    while (sessions.size > maxSessions) {
      const first = sessions.keys().next().value;
      if (!first)
        break;
      sessions.delete(first);
    }
  }
  return {
    mint() {
      const token = crypto7.randomBytes(32).toString("base64url");
      const now = Date.now();
      const expiresAt = now + ttlMs;
      sessions.set(token, { createdAt: now, expiresAt });
      pruneExpired(now);
      return { token, expiresAt };
    },
    validate(token) {
      if (!token)
        return false;
      const s = sessions.get(token);
      if (!s) {
        pruneExpired(Date.now());
        return false;
      }
      if (Date.now() > s.expiresAt) {
        sessions.delete(token);
        pruneExpired(Date.now());
        return false;
      }
      return true;
    },
    revoke(token) {
      if (!token)
        return;
      sessions.delete(token);
    },
    extract(req) {
      const cookieHeader = req.headers.get("cookie");
      if (!cookieHeader)
        return null;
      for (const part of cookieHeader.split(";")) {
        const [name, ...valueParts] = part.trim().split("=");
        if (name === cookieName) {
          return valueParts.join("=") || null;
        }
      }
      return null;
    },
    buildSetCookie(token) {
      const maxAge = Math.floor(ttlMs / 1000);
      return `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
    },
    __reset() {
      sessions.clear();
    }
  };
}
var init_session_cookie_store = () => {};

// browse/src/sse-session-cookie.ts
function mintSseSessionToken() {
  return store.mint();
}
function validateSseSessionToken(token) {
  return store.validate(token);
}
function extractSseCookie(req) {
  return store.extract(req);
}
function buildSseSetCookie(token) {
  return store.buildSetCookie(token);
}
var TTL_MS, SSE_COOKIE_NAME = "gstack_sse", store;
var init_sse_session_cookie = __esm(() => {
  init_session_cookie_store();
  TTL_MS = 30 * 60 * 1000;
  store = createSessionCookieStore({ cookieName: SSE_COOKIE_NAME, ttlMs: TTL_MS });
});

// browse/src/routes/table.ts
function json(body, init = {}) {
  return new Response(JSON.stringify(body, init.replacer), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...init.headers }
  });
}
function jsonError(status, error, extra = {}) {
  return json({ error, ...extra }, { status });
}
function checkRouteAuth(auth, req, ctx) {
  const admitted = { tokenInfo: null };
  switch (auth) {
    case "none":
    case "handler":
      return admitted;
    case "root-bearer":
      return ctx.validateAuth(req) ? admitted : deny(auth);
    case "root-or-sse-cookie":
      return ctx.validateAuth(req) || ctx.hasSseCookie(req) ? admitted : deny(auth);
    case "root-token":
      return ctx.isRootRequest(req) ? admitted : deny(auth);
    case "extension-origin":
      return ctx.isPinnedExtensionRequest(req) ? admitted : deny(auth);
    case "scoped": {
      const tokenInfo = ctx.getTokenInfo(req);
      return tokenInfo ? { tokenInfo } : deny(auth);
    }
  }
}
function deny(auth) {
  const { status, error } = AUTH_DENIALS[auth];
  return jsonError(status, error);
}
function findRoute(routes, method, pathname, surface) {
  return routes.find((r) => r.surfaces.includes(surface) && (r.method === "*" || r.method === method) && (r.prefix ? pathname.startsWith(r.path) : pathname === r.path)) ?? null;
}
async function dispatchRoute(routes, req, url, surface, ctx) {
  const entry = findRoute(routes, req.method, url.pathname, surface) ?? UNMATCHED_ROUTE;
  const gate = checkRouteAuth(entry.auth, req, ctx);
  if (gate instanceof Response)
    return gate;
  return entry.handler(req, { url, surface, tokenInfo: gate.tokenInfo }, ctx);
}
var AUTH_DENIALS, UNMATCHED_ROUTE;
var init_table = __esm(() => {
  AUTH_DENIALS = {
    "root-bearer": { status: 401, error: "Unauthorized" },
    scoped: { status: 401, error: "Unauthorized" },
    "root-or-sse-cookie": { status: 401, error: "Unauthorized" },
    "root-token": { status: 403, error: "Root token required" },
    "extension-origin": { status: 403, error: "Forbidden" }
  };
  UNMATCHED_ROUTE = {
    auth: "root-bearer",
    handler: () => new Response("Not found", { status: 404 })
  };
});

// browse/src/routes/pairing.ts
var pairingRoutes;
var init_pairing = __esm(() => {
  init_table();
  init_token_registry();
  pairingRoutes = [
    {
      method: "GET",
      path: "/connect",
      auth: "none",
      surfaces: ["local", "tunnel"],
      handler: () => {
        if (!checkConnectRateLimit())
          return jsonError(429, "Rate limited");
        return json({ alive: true });
      }
    },
    {
      method: "POST",
      path: "/connect",
      auth: "none",
      surfaces: ["local", "tunnel"],
      handler: async (req) => {
        if (!checkConnectRateLimit())
          return jsonError(429, "Too many connection attempts. Wait 1 minute.");
        try {
          const connectBody = await req.json();
          if (!connectBody.setup_key)
            return jsonError(400, "Missing setup_key");
          const session = exchangeSetupKey(connectBody.setup_key);
          if (!session)
            return jsonError(401, "Invalid, expired, or already-used setup key");
          console.log(`[browse] Remote agent connected: ${session.clientId} (scopes: ${session.scopes.join(",")})`);
          return json({
            token: session.token,
            expires: session.expiresAt,
            scopes: session.scopes,
            agent: session.clientId
          });
        } catch {
          return jsonError(400, "Invalid request body");
        }
      }
    },
    {
      method: "POST",
      path: "/pair",
      auth: "root-token",
      surfaces: ["local"],
      handler: async (req, _r, ctx) => {
        try {
          const pairBody = await req.json();
          if (pairBody.clientId !== undefined)
            assertValidClientId(pairBody.clientId);
          if (!pairBody.control && !pairBody.admin && Array.isArray(pairBody.scopes) && pairBody.scopes.includes("control")) {
            return jsonError(400, "The control scope requires the control flag (--control); it cannot be granted via a scopes list.");
          }
          const scopes = pairBody.control || pairBody.admin ? [...DEFAULT_PAIR_SCOPES, "control"] : pairBody.scopes || [...DEFAULT_PAIR_SCOPES];
          const grant = {
            scopes: [...scopes],
            domains: pairBody.domains,
            rateLimit: pairBody.rateLimit ?? 10,
            tabPolicy: "own-only"
          };
          assertValidTokenOptions(grant.scopes, grant.rateLimit);
          const priorSession = pairBody.clientId ? getClientSession(pairBody.clientId) : null;
          let superseded;
          if (priorSession && grantReducesAccess(priorSession, grant)) {
            const tokensDeleted = revokeToken(pairBody.clientId);
            const tabsReleased = ctx.browserManager.releaseClientTabs(pairBody.clientId).length;
            superseded = { tokens_deleted: tokensDeleted, tabs_released: tabsReleased };
            console.log(`[browse] Superseded ${tokensDeleted} token(s), released ${tabsReleased} tab(s) for reducing re-pair: ${pairBody.clientId}`);
          } else if (pairBody.clientId) {
            revokeSetupKeys(pairBody.clientId);
            if (!priorSession)
              ctx.browserManager.releaseClientTabs(pairBody.clientId);
          }
          const setupKey = createSetupKey({
            clientId: pairBody.clientId,
            scopes: [...scopes],
            domains: pairBody.domains,
            rateLimit: pairBody.rateLimit
          });
          let verifiedTunnelUrl = null;
          const tunnel = ctx.tunnel.state();
          if (tunnel.active && tunnel.url) {
            try {
              const probe = await fetch(`${tunnel.url}/connect`, {
                method: "GET",
                headers: { "ngrok-skip-browser-warning": "true" },
                signal: AbortSignal.timeout(5000)
              });
              if (probe.ok) {
                verifiedTunnelUrl = tunnel.url;
              } else {
                console.warn(`[browse] Tunnel probe failed (HTTP ${probe.status}), marking tunnel as dead`);
                await ctx.tunnel.close();
              }
            } catch {
              console.warn("[browse] Tunnel probe timed out or unreachable, marking tunnel as dead");
              await ctx.tunnel.close();
            }
          }
          return json({
            setup_key: setupKey.token,
            expires_at: setupKey.expiresAt,
            scopes: setupKey.scopes,
            tunnel_url: verifiedTunnelUrl,
            server_url: `http://127.0.0.1:${ctx.browsePort}`,
            ...superseded ? { superseded } : {}
          });
        } catch (err) {
          if (err instanceof InvalidScopeError || err instanceof ReservedClientIdError) {
            return jsonError(400, err.message);
          }
          return jsonError(400, "Invalid request body");
        }
      }
    }
  ];
});

// browse/src/routes/core.ts
import * as fs24 from "fs";
import * as path24 from "path";
function resolveWelcomePath() {
  const rawSlug = process.env.GSTACK_SLUG || "unknown";
  const slug = /^[a-z0-9_-]+$/.test(rawSlug) ? rawSlug : "unknown";
  const homeDir = process.env.HOME || process.env.USERPROFILE || "/tmp";
  const projectWelcome = path24.join(resolveStateRoot(), "projects", slug, "designs", "welcome-page-20260331", "finalized.html");
  if (fs24.existsSync(projectWelcome))
    return projectWelcome;
  const rawSkillRoot = process.env.GSTACK_SKILL_ROOT || `${homeDir}/.claude/skills/gstack`;
  if (rawSkillRoot.includes(".."))
    return null;
  const builtinWelcome = `${rawSkillRoot}/browse/src/welcome.html`;
  if (fs24.existsSync(builtinWelcome))
    return builtinWelcome;
  return null;
}
var coreRoutes;
var init_core = __esm(() => {
  init_state_root();
  init_table();
  init_cookie_picker_routes();
  init_sanitize();
  coreRoutes = [
    {
      method: "*",
      path: "/cookie-picker",
      prefix: true,
      auth: "handler",
      surfaces: ["local"],
      handlerAuth: "sub-router in cookie-picker-routes.ts: OPTIONS preflight open; GET /cookie-picker needs a one-time code or picker session cookie (403 text); every other /cookie-picker/* needs the root bearer or a picker session (401 Unauthorized)",
      handler: (req, { url }, ctx) => handleCookiePickerRoute(url, req, ctx.browserManager, ctx.bootstrapRootToken)
    },
    {
      method: "*",
      path: "/welcome",
      auth: "none",
      surfaces: ["local"],
      handler: () => {
        const welcomePath = resolveWelcomePath();
        if (welcomePath) {
          try {
            const html = fs24.readFileSync(welcomePath, "utf-8");
            return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
          } catch (err) {
            console.error("[browse] Failed to read welcome page:", welcomePath, err.message);
          }
        }
        return new Response(`<!DOCTYPE html><html><head><title>GStack Browser</title>
          <style>body{background:#111;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}
          .msg{text-align:center;opacity:.7;}.gold{color:#f5a623;font-size:2em;margin-bottom:12px;}</style></head>
          <body><div class="msg"><div class="gold">◈</div><p>GStack Browser ready.</p><p style="font-size:.85em">Waiting for commands from Claude Code.</p></div></body></html>`, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
    },
    {
      method: "POST",
      path: "/extension-token",
      auth: "extension-origin",
      surfaces: ["local"],
      handler: (_req, _r, ctx) => json({ token: ctx.bootstrapRootToken })
    },
    {
      method: "*",
      path: "/health",
      auth: "none",
      surfaces: ["local"],
      handler: async (_req, _r, ctx) => {
        const { browserManager } = ctx;
        const healthy = browserManager.isHealthy();
        return json({
          status: healthy ? "healthy" : "unhealthy",
          activeTab: healthy ? await browserManager.probeActiveTab() : null,
          mode: browserManager.getConnectionMode(),
          uptime: Math.floor((Date.now() - ctx.startTime) / 1000),
          tabs: browserManager.getTabCount(),
          terminalPort: ctx.terminal.readPort()
        });
      }
    },
    {
      method: "*",
      path: "/refs",
      auth: "root-bearer",
      surfaces: ["local"],
      handler: (_req, _r, { browserManager }) => json({
        refs: browserManager.getRefMap(),
        url: browserManager.getCurrentUrl(),
        mode: browserManager.getConnectionMode()
      })
    },
    {
      method: "GET",
      path: "/memory",
      auth: "root-bearer",
      surfaces: ["local"],
      handler: async (_req, _r, ctx) => {
        await Promise.resolve().then(() => init_memory_command());
        const snapshot = await buildMemorySnapshotJson(ctx.browserManager);
        return json(snapshot, { replacer: sanitizeReplacer });
      }
    }
  ];
});

// browse/src/pty-session-cookie.ts
function mintPtySessionToken() {
  return store2.mint();
}
function revokePtySessionToken(token) {
  store2.revoke(token);
}
function buildPtySetCookie(token) {
  return store2.buildSetCookie(token);
}
var TTL_MS2, PTY_COOKIE_NAME = "gstack_pty", store2;
var init_pty_session_cookie = __esm(() => {
  init_session_cookie_store();
  TTL_MS2 = 30 * 60 * 1000;
  store2 = createSessionCookieStore({ cookieName: PTY_COOKIE_NAME, ttlMs: TTL_MS2 });
});

// browse/src/pty-session-lease.ts
import * as crypto8 from "crypto";
function mintLease() {
  const sessionId = crypto8.randomBytes(32).toString("base64url");
  const now = Date.now();
  const expiresAt = now + LEASE_TTL_MS;
  leases.set(sessionId, { createdAt: now, expiresAt });
  pruneExpired(now);
  return { sessionId, expiresAt };
}
function validateLease(sessionId) {
  if (!sessionId)
    return { ok: false };
  const lease = leases.get(sessionId);
  if (!lease) {
    pruneExpired(Date.now());
    return { ok: false };
  }
  if (Date.now() > lease.expiresAt) {
    leases.delete(sessionId);
    pruneExpired(Date.now());
    return { ok: false };
  }
  return { ok: true, expiresAt: lease.expiresAt };
}
function refreshLease(sessionId) {
  if (!sessionId)
    return { ok: false };
  const lease = leases.get(sessionId);
  if (!lease)
    return { ok: false };
  const now = Date.now();
  if (now > lease.expiresAt) {
    leases.delete(sessionId);
    return { ok: false };
  }
  lease.expiresAt = now + LEASE_TTL_MS;
  return { ok: true, expiresAt: lease.expiresAt };
}
function revokeLease(sessionId) {
  if (!sessionId)
    return;
  leases.delete(sessionId);
}
function pruneExpired(now) {
  let checked = 0;
  for (const [sessionId, lease] of leases) {
    if (checked++ >= 20)
      break;
    if (lease.expiresAt <= now)
      leases.delete(sessionId);
  }
  while (leases.size > MAX_LEASES) {
    const first = leases.keys().next().value;
    if (!first)
      break;
    leases.delete(first);
  }
}
var LEASE_TTL_MS, MAX_LEASES = 1e4, leases;
var init_pty_session_lease = __esm(() => {
  LEASE_TTL_MS = parseInt(process.env.GSTACK_PTY_LEASE_TTL_MS || `${30 * 60 * 1000}`, 10);
  leases = new Map;
});

// browse/src/find-security-sidecar.ts
import { existsSync as existsSync14 } from "fs";
import { join as join20, dirname as dirname10 } from "path";
import { execFileSync as execFileSync2 } from "child_process";
function nodeOnPath() {
  try {
    execFileSync2("node", ["--version"], { stdio: "ignore", timeout: 2000, windowsHide: true });
    return "node";
  } catch {
    return null;
  }
}
function browseRoot() {
  let candidate = dirname10(import.meta.path || "");
  for (let i = 0;i < 6; i += 1) {
    if (existsSync14(join20(candidate, "browse", "dist", "security-sidecar.js"))) {
      return candidate;
    }
    if (existsSync14(join20(candidate, "src", "security-sidecar-entry.ts"))) {
      return candidate;
    }
    const next = dirname10(candidate);
    if (next === candidate)
      break;
    candidate = next;
  }
  return process.cwd();
}
function findSecuritySidecar() {
  const node = nodeOnPath();
  if (!node)
    return null;
  const root = browseRoot();
  const compiled = join20(root, "browse", "dist", "security-sidecar.js");
  if (existsSync14(compiled)) {
    return { node, entry: compiled, mode: "compiled" };
  }
  const devEntry = join20(root, "src", "security-sidecar-entry.ts");
  if (existsSync14(devEntry)) {
    return { node, entry: devEntry, mode: "dev" };
  }
  return null;
}
var init_find_security_sidecar = () => {};

// browse/src/security-sidecar-client.ts
import { spawn as spawn3 } from "child_process";
function getState() {
  if (!state) {
    state = {
      child: null,
      pending: new Map,
      buffer: "",
      failures: [],
      available: true,
      brokenCircuit: false,
      nextId: 1
    };
  }
  return state;
}
function recordFailure() {
  const s = getState();
  const now = Date.now();
  s.failures = s.failures.filter((t) => now - t < RESPAWN_WINDOW_MS);
  s.failures.push(now);
  if (s.failures.length >= RESPAWN_LIMIT) {
    s.brokenCircuit = true;
    s.available = false;
  }
}
function processBuffer() {
  const s = getState();
  let idx = s.buffer.indexOf(`
`);
  while (idx !== -1) {
    const line = s.buffer.slice(0, idx).trim();
    s.buffer = s.buffer.slice(idx + 1);
    idx = s.buffer.indexOf(`
`);
    if (!line)
      continue;
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      recordFailure();
      continue;
    }
    const id = typeof parsed.id === "string" ? parsed.id : null;
    if (!id)
      continue;
    const pending = s.pending.get(id);
    if (!pending)
      continue;
    s.pending.delete(id);
    clearTimeout(pending.timer);
    if (parsed.ok) {
      pending.resolve(parsed);
    } else {
      recordFailure();
      pending.reject(new Error(parsed.error ?? "sidecar-error"));
    }
  }
}
function shutdownChild() {
  const s = getState();
  if (!s.child)
    return;
  try {
    s.child.kill("SIGTERM");
  } catch {}
  s.child = null;
  for (const [, p] of s.pending) {
    clearTimeout(p.timer);
    p.reject(new Error("sidecar-died"));
  }
  s.pending.clear();
}
function spawnSidecar() {
  const s = getState();
  if (s.brokenCircuit)
    return false;
  const location2 = findSecuritySidecar();
  if (!location2) {
    s.available = false;
    return false;
  }
  try {
    const child = spawn3(location2.node, [location2.entry], {
      stdio: ["pipe", "pipe", "pipe"],
      detached: false,
      windowsHide: true
    });
    child.stdout.on("data", (chunk) => {
      s.buffer += chunk.toString("utf-8");
      processBuffer();
    });
    child.on("exit", () => {
      shutdownChild();
    });
    child.on("error", () => {
      recordFailure();
      shutdownChild();
    });
    s.child = child;
    s.available = true;
    return true;
  } catch {
    recordFailure();
    return false;
  }
}
function isSidecarAvailable() {
  const s = getState();
  if (s.brokenCircuit)
    return { available: false, reason: "circuit-broken" };
  if (s.child)
    return { available: true };
  const location2 = findSecuritySidecar();
  if (!location2)
    return { available: false, reason: "no-node-or-entry" };
  return { available: true };
}
async function scanWithSidecar(text, opts) {
  const s = getState();
  if (s.brokenCircuit) {
    throw new Error("sidecar-circuit-broken");
  }
  if (Buffer.byteLength(text, "utf-8") > REQUEST_CAP_BYTES) {
    throw new Error("payload-too-large");
  }
  if (!s.child) {
    if (!spawnSidecar()) {
      throw new Error("sidecar-spawn-failed");
    }
  }
  const id = String(s.nextId++);
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      s.pending.delete(id);
      recordFailure();
      reject(new Error("sidecar-timeout"));
    }, timeoutMs);
    s.pending.set(id, {
      resolve: (response) => {
        const r = response;
        resolve({ verdict: r.verdict });
      },
      reject,
      timer
    });
    const payload = JSON.stringify({ id, op: "scan-page-content", text }) + `
`;
    try {
      s.child.stdin.write(payload);
    } catch (err) {
      clearTimeout(timer);
      s.pending.delete(id);
      recordFailure();
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
var REQUEST_CAP_BYTES, DEFAULT_TIMEOUT_MS = 5000, RESPAWN_WINDOW_MS, RESPAWN_LIMIT = 3, state = null;
var init_security_sidecar_client = __esm(() => {
  init_find_security_sidecar();
  REQUEST_CAP_BYTES = 64 * 1024;
  RESPAWN_WINDOW_MS = 10 * 60 * 1000;
  process.on("exit", () => shutdownChild());
});

// browse/src/routes/pty.ts
async function readJsonOrNull(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
var ptyRoutes;
var init_pty = __esm(() => {
  init_table();
  init_pty_session_cookie();
  init_pty_session_lease();
  init_security_sidecar_client();
  init_sanitize();
  ptyRoutes = [
    {
      method: "POST",
      path: "/pty-session",
      auth: "root-bearer",
      surfaces: ["local"],
      handler: async (_req, _r, ctx) => {
        const port = ctx.terminal.readPort();
        if (!port)
          return jsonError(503, "terminal-agent not ready");
        const lease = mintLease();
        const minted = mintPtySessionToken();
        const granted = await ctx.terminal.grantToken(minted.token, lease.sessionId);
        if (!granted) {
          revokePtySessionToken(minted.token);
          revokeLease(lease.sessionId);
          return jsonError(503, "failed to grant terminal session");
        }
        return json({
          terminalPort: port,
          sessionId: lease.sessionId,
          attachToken: minted.token,
          leaseExpiresAt: lease.expiresAt,
          ptySessionToken: minted.token,
          expiresAt: minted.expiresAt
        }, { headers: { "Set-Cookie": buildPtySetCookie(minted.token) } });
      }
    },
    {
      method: "POST",
      path: "/pty-session/reattach",
      auth: "root-bearer",
      surfaces: ["local"],
      handler: async (req, _r, ctx) => {
        const port = ctx.terminal.readPort();
        if (!port)
          return jsonError(503, "terminal-agent not ready");
        const body = await readJsonOrNull(req);
        const sessionId = typeof body?.sessionId === "string" ? body.sessionId : null;
        const v = sessionId ? validateLease(sessionId) : { ok: false };
        if (!v.ok)
          return jsonError(410, "lease expired or unknown");
        const minted = mintPtySessionToken();
        const granted = await ctx.terminal.grantToken(minted.token, sessionId);
        if (!granted) {
          revokePtySessionToken(minted.token);
          return jsonError(503, "failed to grant attach token");
        }
        return json({
          terminalPort: port,
          sessionId,
          attachToken: minted.token,
          leaseExpiresAt: v.ok ? v.expiresAt : 0
        });
      }
    },
    {
      method: "POST",
      path: "/pty-restart",
      auth: "root-bearer",
      surfaces: ["local"],
      handler: async (req, _r, ctx) => {
        const port = ctx.terminal.readPort();
        if (!port)
          return jsonError(503, "terminal-agent not ready");
        const body = await readJsonOrNull(req);
        const oldSessionId = typeof body?.sessionId === "string" ? body.sessionId : null;
        if (oldSessionId) {
          await ctx.terminal.restartSession(oldSessionId);
          revokeLease(oldSessionId);
        }
        const lease = mintLease();
        const minted = mintPtySessionToken();
        const granted = await ctx.terminal.grantToken(minted.token, lease.sessionId);
        if (!granted) {
          revokePtySessionToken(minted.token);
          revokeLease(lease.sessionId);
          return jsonError(503, "failed to grant terminal session");
        }
        return json({
          terminalPort: port,
          sessionId: lease.sessionId,
          attachToken: minted.token,
          leaseExpiresAt: lease.expiresAt
        });
      }
    },
    {
      method: "POST",
      path: "/pty-dispose",
      auth: "handler",
      surfaces: ["local"],
      handlerAuth: "root token as Authorization: Bearer or as the JSON body authToken (sendBeacon); 401 Unauthorized otherwise",
      handler: async (req, _r, ctx) => {
        const body = await readJsonOrNull(req);
        const authTokenFromBody = typeof body?.authToken === "string" ? body.authToken : null;
        const header = req.headers.get("authorization");
        const headerToken = header?.startsWith("Bearer ") ? header.slice(7) : null;
        if (!ctx.isRootTokenValue(headerToken) && !ctx.isRootTokenValue(authTokenFromBody)) {
          return jsonError(401, "Unauthorized");
        }
        const sessionId = typeof body?.sessionId === "string" ? body.sessionId : null;
        if (sessionId) {
          await ctx.terminal.restartSession(sessionId);
          revokeLease(sessionId);
        }
        return json({ ok: true });
      }
    },
    {
      method: "POST",
      path: "/internal/lease-refresh",
      auth: "root-bearer",
      surfaces: ["local"],
      handler: async (req, _r, ctx) => {
        const body = await readJsonOrNull(req);
        const sessionId = typeof body?.sessionId === "string" ? body.sessionId : null;
        const r = sessionId ? refreshLease(sessionId) : { ok: false };
        if (!r.ok)
          return jsonError(410, "lease expired or unknown");
        ctx.resetIdleTimer();
        return json({ ok: true, expiresAt: r.expiresAt });
      }
    },
    {
      method: "POST",
      path: "/pty-inject-scan",
      auth: "root-bearer",
      surfaces: ["local"],
      handler: async (req) => {
        const reply = (body, status) => json(body, { status, replacer: sanitizeReplacer });
        const contentLength = Number(req.headers.get("content-length") || "0");
        if (contentLength > 64 * 1024)
          return reply({ error: "payload-too-large", limit: 65536 }, 413);
        let body = {};
        try {
          body = await req.json();
        } catch {
          return reply({ error: "malformed-json" }, 400);
        }
        const text = typeof body.text === "string" ? body.text : "";
        if (text.length === 0)
          return reply({ error: "missing-text" }, 400);
        let verdict = "PASS";
        const reasons = [];
        if (/(\bbit\.ly|\btinyurl\.com|\bdiscord\.gg)/i.test(text)) {
          verdict = "BLOCK";
          reasons.push("url-blocklist");
        }
        const sidecarAvail = isSidecarAvailable();
        let l4 = {
          available: sidecarAvail.available
        };
        if (sidecarAvail.available && verdict !== "BLOCK") {
          try {
            const { verdict: layerVerdict } = await scanWithSidecar(text, { timeoutMs: 5000 });
            l4 = { available: true, verdict: layerVerdict };
            const lv = layerVerdict?.verdict;
            if (lv === "unsafe") {
              verdict = "BLOCK";
              reasons.push("l4-unsafe");
            } else if (lv === "suspicious") {
              verdict = "WARN";
              reasons.push("l4-suspicious");
            }
          } catch (err) {
            l4 = { available: false, error: err instanceof Error ? err.message : String(err) };
            if (verdict === "PASS") {
              verdict = "WARN";
              reasons.push("l4-unavailable");
            }
          }
        } else if (!sidecarAvail.available && verdict === "PASS") {
          verdict = "WARN";
          reasons.push(`l4-unavailable:${sidecarAvail.reason ?? "unknown"}`);
        }
        return reply({ verdict, reasons, l4, datamark: "<untrusted-page-content>" }, 200);
      }
    }
  ];
});

// browse/src/routes/tokens.ts
var tokenRoutes;
var init_tokens = __esm(() => {
  init_table();
  init_token_registry();
  tokenRoutes = [
    {
      method: "POST",
      path: "/token",
      auth: "handler",
      surfaces: ["local"],
      handlerAuth: 'root token (token registry); 403 "Only the root token can mint sub-tokens" otherwise',
      handler: async (req, _r, ctx) => {
        if (!ctx.isRootRequest(req))
          return jsonError(403, "Only the root token can mint sub-tokens");
        try {
          const tokenBody = await req.json();
          if (!tokenBody.clientId)
            return jsonError(400, "Missing clientId");
          const session = createToken({
            clientId: tokenBody.clientId,
            scopes: tokenBody.scopes,
            domains: tokenBody.domains,
            tabPolicy: tokenBody.tabPolicy,
            rateLimit: tokenBody.rateLimit,
            expiresSeconds: tokenBody.expiresSeconds
          });
          return json({
            token: session.token,
            expires: session.expiresAt,
            scopes: session.scopes,
            agent: session.clientId
          });
        } catch (err) {
          if (err instanceof InvalidScopeError || err instanceof ReservedClientIdError) {
            return jsonError(400, err.message);
          }
          return jsonError(400, "Invalid request body");
        }
      }
    },
    {
      method: "DELETE",
      path: "/token/",
      prefix: true,
      auth: "root-token",
      surfaces: ["local"],
      handler: (_req, { url }, ctx) => {
        let clientId;
        try {
          clientId = decodeURIComponent(url.pathname.slice("/token/".length));
        } catch {
          return jsonError(400, "Malformed client ID encoding");
        }
        const revoked = revokeToken(clientId);
        const tabsReleased = ctx.browserManager.releaseClientTabs(clientId).length;
        if (!revoked && tabsReleased === 0)
          return jsonError(404, `Agent "${clientId}" not found`);
        console.log(`[browse] Revoked ${revoked} token(s), released ${tabsReleased} tab(s) for: ${clientId}`);
        return json({ revoked: clientId, tokens_deleted: revoked, tabs_released: tabsReleased });
      }
    },
    {
      method: "GET",
      path: "/agents",
      auth: "root-token",
      surfaces: ["local"],
      handler: () => {
        const agents = listTokens({ includeSetup: true }).map((t) => ({
          clientId: t.clientId,
          scopes: t.scopes,
          domains: t.domains,
          expiresAt: t.expiresAt,
          commandCount: t.commandCount,
          createdAt: t.createdAt,
          pending: t.type === "setup"
        }));
        return json({ agents });
      }
    }
  ];
});

// browse/src/routes/tunnel.ts
var tunnelRoutes;
var init_tunnel = __esm(() => {
  init_table();
  init_config();
  tunnelRoutes = [
    {
      method: "POST",
      path: "/tunnel/start",
      auth: "root-token",
      surfaces: ["local"],
      handler: async (_req, _r, ctx) => {
        if (!isPairAgentEnabled()) {
          return jsonError(403, "pair-agent is off (tunnel exposes this browser beyond the machine)", {
            hint: "enable once with: gstack-config set pair_agent on — or run /pair-agent, which asks for consent and sets it"
          });
        }
        const tunnel = ctx.tunnel.state();
        if (tunnel.active && tunnel.url && tunnel.hasListener) {
          try {
            const probe = await fetch(`${tunnel.url}/connect`, {
              method: "GET",
              headers: { "ngrok-skip-browser-warning": "true" },
              signal: AbortSignal.timeout(5000)
            });
            if (probe.ok)
              return json({ url: tunnel.url, already_active: true });
          } catch {}
          console.warn("[browse] Cached tunnel is dead, restarting...");
          await ctx.tunnel.close();
        }
        const authtoken = ctx.tunnel.resolveAuthtoken();
        if (!authtoken) {
          return jsonError(400, "No ngrok authtoken found", { hint: "Run: ngrok config add-authtoken YOUR_TOKEN" });
        }
        const started = await ctx.tunnel.start(authtoken);
        if (!started.ok) {
          return jsonError(500, started.stage === "bind" ? `Failed to bind tunnel listener: ${started.error.message}` : `Failed to open ngrok tunnel: ${started.error.message}`);
        }
        return json({ url: started.url });
      }
    }
  ];
});

// browse/src/sse-helpers.ts
function createSseEndpoint(req, config) {
  const heartbeatMs = config.heartbeatMs ?? 15000;
  const encoder = new TextEncoder;
  const stream = new ReadableStream({
    start(controller) {
      let cleanedUp = false;
      let heartbeat = null;
      let unsubscribe = null;
      const cleanup = () => {
        if (cleanedUp)
          return;
        cleanedUp = true;
        if (heartbeat !== null) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
        if (unsubscribe !== null) {
          unsubscribe();
          unsubscribe = null;
        }
        try {
          controller.close();
        } catch {}
      };
      const send = (event, data) => {
        if (cleanedUp)
          return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}
data: ${JSON.stringify(data, sanitizeReplacer)}

`));
        } catch {
          cleanup();
        }
      };
      if (config.initialReplay) {
        try {
          config.initialReplay(send);
        } catch {
          cleanup();
          return;
        }
        if (cleanedUp)
          return;
      }
      unsubscribe = config.subscribe((entry) => {
        send(config.liveEventName, entry);
      });
      heartbeat = setInterval(() => {
        if (cleanedUp)
          return;
        try {
          controller.enqueue(encoder.encode(`: heartbeat

`));
        } catch {
          cleanup();
        }
      }, heartbeatMs);
      req.signal.addEventListener("abort", cleanup);
    }
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    }
  });
}
var init_sse_helpers = __esm(() => {
  init_sanitize();
});

// browse/src/routes/activity.ts
var activityRoutes;
var init_activity2 = __esm(() => {
  init_table();
  init_activity();
  init_sse_helpers();
  init_sse_session_cookie();
  activityRoutes = [
    {
      method: "POST",
      path: "/sse-session",
      auth: "root-bearer",
      surfaces: ["local"],
      handler: () => {
        const minted = mintSseSessionToken();
        return json({
          expiresAt: minted.expiresAt,
          cookie: SSE_COOKIE_NAME
        }, { headers: { "Set-Cookie": buildSseSetCookie(minted.token) } });
      }
    },
    {
      method: "*",
      path: "/activity/stream",
      auth: "root-or-sse-cookie",
      surfaces: ["local"],
      handler: (req, { url }) => {
        const afterId = parseInt(url.searchParams.get("after") || "0", 10);
        return createSseEndpoint(req, {
          initialReplay: (send) => {
            const { entries, gap, gapFrom, availableFrom } = getActivityAfter(afterId);
            if (gap)
              send("gap", { gapFrom, availableFrom });
            for (const entry of entries)
              send("activity", entry);
          },
          subscribe,
          liveEventName: "activity"
        });
      }
    },
    {
      method: "*",
      path: "/activity/history",
      auth: "root-bearer",
      surfaces: ["local"],
      handler: (_req, { url }) => {
        const limit = parseInt(url.searchParams.get("limit") || "50", 10);
        const { entries, totalAdded } = getActivityHistory(limit);
        return json({ entries, totalAdded, subscribers: getSubscriberCount() });
      }
    }
  ];
});

// browse/src/routes/commands.ts
function canDispatchOverTunnel(command, args) {
  if (typeof command !== "string" || command.length === 0)
    return false;
  if (Array.isArray(args) && hasOutArg(args))
    return false;
  const cmd = canonicalizeCommand(command);
  return TUNNEL_COMMANDS.has(cmd);
}
var TUNNEL_COMMANDS, commandRoutes;
var init_commands2 = __esm(() => {
  init_table();
  init_commands();
  init_read_commands();
  init_activity();
  init_tunnel_denial_log();
  init_sanitize();
  TUNNEL_COMMANDS = new Set([
    "goto",
    "click",
    "text",
    "screenshot",
    "html",
    "links",
    "forms",
    "accessibility",
    "attrs",
    "media",
    "data",
    "scroll",
    "press",
    "type",
    "select",
    "wait",
    "eval",
    "newtab",
    "tabs",
    "back",
    "forward",
    "reload",
    "snapshot",
    "fill",
    "url",
    "closetab"
  ]);
  commandRoutes = [
    {
      method: "POST",
      path: "/batch",
      auth: "scoped",
      surfaces: ["local"],
      handler: async (req, { tokenInfo }, ctx) => {
        const { browserManager } = ctx;
        ctx.resetIdleTimer();
        const body = await req.json();
        const { commands } = body;
        if (!Array.isArray(commands) || commands.length === 0)
          return jsonError(400, '"commands" must be a non-empty array');
        if (commands.length > 50)
          return jsonError(400, "Max 50 commands per batch");
        const startTime = Date.now();
        emitActivity({
          type: "command_start",
          command: "batch",
          args: [`${commands.length} commands`],
          url: browserManager.getCurrentUrl(),
          tabs: browserManager.getTabCount(),
          mode: browserManager.getConnectionMode(),
          clientId: tokenInfo?.clientId
        });
        const results = [];
        for (let i = 0;i < commands.length; i++) {
          const cmd = commands[i];
          if (!cmd || typeof cmd.command !== "string") {
            results.push({ index: i, status: 400, result: JSON.stringify({ error: 'Missing "command" field' }), command: "" });
            continue;
          }
          if (cmd.command === "batch") {
            results.push({ index: i, status: 400, result: JSON.stringify({ error: "Nested batch commands are not allowed" }), command: "batch" });
            continue;
          }
          const cr = await ctx.commands.handleInternal({ command: cmd.command, args: cmd.args, tabId: cmd.tabId }, tokenInfo, { skipRateCheck: true, skipActivity: true });
          const safeResult = typeof cr.result === "string" ? sanitizeBody(cr.result, !!cr.json) : cr.result;
          results.push({
            index: i,
            status: cr.status,
            result: safeResult,
            command: cmd.command,
            tabId: cmd.tabId
          });
        }
        const duration = Date.now() - startTime;
        emitActivity({
          type: "command_end",
          command: "batch",
          args: [`${commands.length} commands`],
          url: browserManager.getCurrentUrl(),
          duration,
          status: "ok",
          result: `${results.filter((r) => r.status === 200).length}/${commands.length} succeeded`,
          tabs: browserManager.getTabCount(),
          mode: browserManager.getConnectionMode(),
          clientId: tokenInfo?.clientId
        });
        const batchBody = stripLoneSurrogateEscapes(JSON.stringify({
          results,
          duration,
          total: commands.length,
          succeeded: results.filter((r) => r.status === 200).length,
          failed: results.filter((r) => r.status !== 200).length
        }));
        return new Response(batchBody, {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    {
      method: "POST",
      path: "/command",
      auth: "scoped",
      surfaces: ["local", "tunnel"],
      handler: async (req, { url, surface, tokenInfo }, ctx) => {
        ctx.resetIdleTimer();
        const body = await req.json();
        if (surface === "tunnel" && !canDispatchOverTunnel(body?.command, body?.args)) {
          logTunnelDenial(req, url, `disallowed_command:${body?.command}`);
          return jsonError(403, `Command '${body?.command}' is not allowed over the tunnel surface`, {
            hint: `Tunnel commands: ${[...TUNNEL_COMMANDS].sort().join(", ")}. Note: --out (disk write) is never allowed over the tunnel.`
          });
        }
        return ctx.commands.handle(body, tokenInfo);
      }
    }
  ];
});

// browse/src/routes/files.ts
import * as fs25 from "fs";
import * as path25 from "path";
var MIME_MAP, fileRoutes;
var init_files = __esm(() => {
  init_table();
  init_path_security();
  MIME_MAP = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".avif": "image/avif",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".pdf": "application/pdf",
    ".json": "application/json",
    ".html": "text/html",
    ".txt": "text/plain",
    ".mhtml": "message/rfc822"
  };
  fileRoutes = [
    {
      method: "GET",
      path: "/file",
      auth: "scoped",
      surfaces: ["local"],
      handler: (_req, { url }, ctx) => {
        const filePath = url.searchParams.get("path");
        if (!filePath)
          return jsonError(400, 'Missing "path" query parameter');
        try {
          validateTempPath(filePath);
        } catch (err) {
          return jsonError(403, err.message);
        }
        if (!fs25.existsSync(filePath))
          return jsonError(404, "File not found");
        const stat = fs25.statSync(filePath);
        if (stat.size > 200 * 1024 * 1024)
          return jsonError(413, "File too large (max 200MB)");
        const contentType = MIME_MAP[path25.extname(filePath).toLowerCase()] || "application/octet-stream";
        ctx.resetIdleTimer();
        return new Response(Bun.file(filePath), {
          headers: {
            "Content-Type": contentType,
            "Content-Length": String(stat.size),
            "Content-Disposition": `inline; filename="${path25.basename(filePath)}"`,
            "Cache-Control": "no-cache"
          }
        });
      }
    }
  ];
});

// browse/src/routes/inspector.ts
function getInspectorSubscriberCount() {
  return inspectorSubscribers.size;
}
function clearInspectorSubscribers() {
  inspectorSubscribers.clear();
}
function emitInspectorEvent(event) {
  for (const notify of inspectorSubscribers) {
    queueMicrotask(() => {
      try {
        notify(event);
      } catch (err) {
        console.error("[browse] Inspector event subscriber threw:", err.message);
      }
    });
  }
}
var inspectorData = null, inspectorTimestamp = 0, inspectorSubscribers, inspectorRoutes;
var init_inspector = __esm(() => {
  init_table();
  init_cdp_inspector();
  init_sse_helpers();
  inspectorSubscribers = new Set;
  inspectorRoutes = [
    {
      method: "POST",
      path: "/inspector/pick",
      auth: "root-bearer",
      surfaces: ["local"],
      handler: async (req, _r, ctx) => {
        const body = await req.json();
        const { selector, activeTabUrl } = body;
        if (!selector)
          return jsonError(400, "Missing selector");
        try {
          const page = ctx.browserManager.getPage();
          const result = await inspectElement(page, selector);
          inspectorData = result;
          inspectorTimestamp = Date.now();
          ctx.browserManager._inspectorData = result;
          ctx.browserManager._inspectorTimestamp = inspectorTimestamp;
          emitInspectorEvent({ type: "pick", selector, timestamp: inspectorTimestamp });
          return json(result);
        } catch (err) {
          return jsonError(500, err.message);
        }
      }
    },
    {
      method: "GET",
      path: "/inspector",
      auth: "root-bearer",
      surfaces: ["local"],
      handler: () => {
        if (!inspectorData)
          return json({ data: null });
        const stale = inspectorTimestamp > 0 && Date.now() - inspectorTimestamp > 60000;
        return json({ data: inspectorData, timestamp: inspectorTimestamp, stale });
      }
    },
    {
      method: "POST",
      path: "/inspector/apply",
      auth: "root-bearer",
      surfaces: ["local"],
      handler: async (req, _r, ctx) => {
        const body = await req.json();
        const { selector, property, value } = body;
        if (!selector || !property || value === undefined)
          return jsonError(400, "Missing selector, property, or value");
        try {
          const page = ctx.browserManager.getPage();
          const mod = await modifyStyle(page, selector, property, value);
          emitInspectorEvent({ type: "apply", modification: mod, timestamp: Date.now() });
          return json(mod);
        } catch (err) {
          return jsonError(500, err.message);
        }
      }
    },
    {
      method: "POST",
      path: "/inspector/reset",
      auth: "root-bearer",
      surfaces: ["local"],
      handler: async (_req, _r, ctx) => {
        try {
          const page = ctx.browserManager.getPage();
          await resetModifications(page);
          emitInspectorEvent({ type: "reset", timestamp: Date.now() });
          return json({ ok: true });
        } catch (err) {
          return jsonError(500, err.message);
        }
      }
    },
    {
      method: "GET",
      path: "/inspector/history",
      auth: "root-bearer",
      surfaces: ["local"],
      handler: () => json({ history: getModificationHistory() })
    },
    {
      method: "GET",
      path: "/inspector/events",
      auth: "root-bearer",
      surfaces: ["local"],
      handler: (req) => {
        return createSseEndpoint(req, {
          initialReplay: inspectorData ? (send) => send("state", { data: inspectorData, timestamp: inspectorTimestamp }) : undefined,
          subscribe: (notify) => {
            inspectorSubscribers.add(notify);
            return () => inspectorSubscribers.delete(notify);
          },
          liveEventName: "inspector"
        });
      }
    }
  ];
});

// browse/src/routes/index.ts
var ROUTES;
var init_routes = __esm(() => {
  init_pairing();
  init_core();
  init_pty();
  init_tokens();
  init_tunnel();
  init_activity2();
  init_commands2();
  init_files();
  init_inspector();
  ROUTES = [
    ...pairingRoutes,
    ...coreRoutes,
    ...ptyRoutes,
    ...tokenRoutes,
    ...tunnelRoutes,
    ...activityRoutes,
    ...commandRoutes,
    ...fileRoutes,
    ...inspectorRoutes
  ];
});

// browse/src/server.ts
import * as fs26 from "fs";
import * as path26 from "path";
import * as crypto9 from "crypto";
function removeOwnedDaemonStateQuiet() {
  try {
    const release = acquireAgentStateLock(path26.dirname(config.stateFile), 0);
    try {
      const state = JSON.parse(fs26.readFileSync(config.stateFile, "utf8"));
      if (state.pid === process.pid && state.instanceId === SERVER_INSTANCE_ID)
        safeUnlinkQuiet(config.stateFile);
    } finally {
      release();
    }
  } catch {}
}
function sanitizeAuthToken(raw) {
  if (!raw)
    return null;
  const stripped = raw.replace(/[\s ​-‍﻿]/g, "");
  if (stripped.length < 16)
    return null;
  return stripped;
}
function resolveConfigFromEnv() {
  return {
    authToken: sanitizeAuthToken(process.env.AUTH_TOKEN) || crypto9.randomUUID(),
    browsePort: parseInt(process.env.BROWSE_PORT || "0", 10),
    config: resolveConfig()
  };
}
function isPinnedExtensionRequest(req) {
  let hostname = null;
  try {
    hostname = new URL(`http://${req.headers.get("host") ?? ""}`).hostname;
  } catch (err) {
    if (!(err instanceof TypeError))
      throw err;
  }
  const originOk = req.headers.get("origin") === allowedExtensionOrigin();
  const hostOk = hostname === "127.0.0.1" || hostname === "localhost";
  return originOk && hostOk;
}
function resolveNgrokAuthtoken() {
  let authtoken = process.env.NGROK_AUTHTOKEN;
  if (authtoken)
    return authtoken;
  const home = process.env.HOME || "";
  const ngrokEnvPath = path26.join(home, ".gstack", "ngrok.env");
  if (fs26.existsSync(ngrokEnvPath)) {
    try {
      const envContent = fs26.readFileSync(ngrokEnvPath, "utf-8");
      const match = envContent.match(/^NGROK_AUTHTOKEN=(.+)$/m);
      if (match)
        return match[1].trim();
    } catch {}
  }
  const ngrokConfigs = [
    path26.join(home, "Library", "Application Support", "ngrok", "ngrok.yml"),
    path26.join(home, ".config", "ngrok", "ngrok.yml"),
    path26.join(home, ".ngrok2", "ngrok.yml")
  ];
  for (const conf of ngrokConfigs) {
    try {
      const content = fs26.readFileSync(conf, "utf-8");
      const match = content.match(/authtoken:\s*(.+)/);
      if (match)
        return match[1].trim();
    } catch {}
  }
  return null;
}
async function closeTunnel() {
  try {
    if (tunnelListener)
      await tunnelListener.close();
  } catch {}
  try {
    if (tunnelServer)
      tunnelServer.stop(true);
  } catch {}
  tunnelListener = null;
  tunnelServer = null;
  tunnelUrl = null;
  tunnelActive = false;
}
async function startTunnel(opts) {
  let boundTunnel;
  try {
    boundTunnel = Bun.serve({
      port: 0,
      hostname: "127.0.0.1",
      fetch: opts.fetchHandler
    });
  } catch (err) {
    return { ok: false, stage: "bind", error: err };
  }
  const tunnelPort = boundTunnel.port;
  try {
    const ngrok = await import("@ngrok/ngrok");
    const domain = process.env.NGROK_DOMAIN;
    const forwardOpts = { addr: tunnelPort, authtoken: opts.authtoken };
    if (domain)
      forwardOpts.domain = domain;
    writeReceipt({
      sink: "browse-tunnel",
      host: domain || "connect.ngrok-agent.com",
      payloadClass: "tunnel-session-open (scoped-token browser-command surface)",
      bytes: 0,
      sha256: null,
      consent: opts.consent
    });
    tunnelListener = await ngrok.forward(forwardOpts);
    tunnelUrl = tunnelListener.url();
    tunnelServer = boundTunnel;
    tunnelActive = true;
    console.log(`[browse] Tunnel listener bound on 127.0.0.1:${tunnelPort}, ngrok → ${tunnelUrl}`);
    const releaseStateLock = acquireAgentStateLock(config.stateDir);
    try {
      const stateContent = JSON.parse(fs26.readFileSync(config.stateFile, "utf-8"));
      if (stateContent.pid !== process.pid || stateContent.instanceId !== SERVER_INSTANCE_ID)
        throw new Error("daemon state was replaced");
      stateContent.tunnel = { url: tunnelUrl, domain: domain || null, startedAt: new Date().toISOString() };
      const tmpState = tmpStatePath();
      fs26.writeFileSync(tmpState, JSON.stringify(stateContent, null, 2), { mode: 384 });
      fs26.renameSync(tmpState, config.stateFile);
    } finally {
      releaseStateLock();
    }
    return { ok: true, url: tunnelUrl };
  } catch (err) {
    try {
      if (tunnelListener)
        await tunnelListener.close();
    } catch {}
    try {
      boundTunnel.stop(true);
    } catch {}
    tunnelListener = null;
    return { ok: false, stage: "ngrok", error: err };
  }
}
function readTerminalPort() {
  try {
    const f = path26.join(path26.dirname(config.stateFile), "terminal-port");
    const v = parseInt(fs26.readFileSync(f, "utf-8").trim(), 10);
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}
function readTerminalInternalToken() {
  try {
    const f = path26.join(path26.dirname(config.stateFile), "terminal-internal-token");
    const t = fs26.readFileSync(f, "utf-8").trim();
    return t.length > 16 ? t : null;
  } catch {
    return null;
  }
}
async function grantPtyToken(token, sessionId) {
  const port = readTerminalPort();
  const internal = readTerminalInternalToken();
  if (!port || !internal)
    return false;
  try {
    const resp = await fetch(`http://127.0.0.1:${port}/internal/grant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${internal}`
      },
      body: JSON.stringify(sessionId ? { token, sessionId } : { token }),
      signal: AbortSignal.timeout(2000)
    });
    return resp.ok;
  } catch {
    return false;
  }
}
async function restartPtySession(sessionId) {
  const port = readTerminalPort();
  const internal = readTerminalInternalToken();
  if (!port || !internal)
    return false;
  try {
    const resp = await fetch(`http://127.0.0.1:${port}/internal/restart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${internal}`
      },
      body: JSON.stringify({ sessionId }),
      signal: AbortSignal.timeout(5000)
    });
    return resp.ok;
  } catch {
    return false;
  }
}
function extractToken(req) {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer "))
    return null;
  return header.slice(7);
}
function getTokenInfo(req) {
  const token = extractToken(req);
  if (!token)
    return null;
  return validateToken(token);
}
function isRootRequest(req) {
  const token = extractToken(req);
  return token !== null && isRootToken(token);
}
function generateHelpText() {
  const groups = new Map;
  for (const [cmd, meta] of Object.entries(COMMAND_DESCRIPTIONS)) {
    const display = meta.usage || cmd;
    const list = groups.get(meta.category) || [];
    list.push(display);
    groups.set(meta.category, list);
  }
  const categoryOrder = [
    "Navigation",
    "Reading",
    "Interaction",
    "Inspection",
    "Visual",
    "Snapshot",
    "Meta",
    "Tabs",
    "Server"
  ];
  const lines = ["gstack browse — headless browser for AI agents", "", "Commands:"];
  for (const cat of categoryOrder) {
    const cmds = groups.get(cat);
    if (!cmds)
      continue;
    lines.push(`  ${(cat + ":").padEnd(15)}${cmds.join(", ")}`);
  }
  lines.push("");
  lines.push("Snapshot flags:");
  const flagPairs = [];
  for (const flag of SNAPSHOT_FLAGS) {
    const label = flag.valueHint ? `${flag.short} ${flag.valueHint}` : flag.short;
    flagPairs.push(`${label}  ${flag.long}`);
  }
  for (let i = 0;i < flagPairs.length; i += 2) {
    const left = flagPairs[i].padEnd(28);
    const right = flagPairs[i + 1] || "";
    lines.push(`  ${left}${right}`);
  }
  return lines.join(`
`);
}
function tmpStatePath(stateFile = config.stateFile) {
  return `${stateFile}.tmp.${process.pid}.${crypto9.randomBytes(4).toString("hex")}`;
}
async function flushBuffers() {
  if (flushInProgress)
    return;
  flushInProgress = true;
  try {
    const newConsoleCount = consoleBuffer.totalAdded - lastConsoleFlushed;
    if (newConsoleCount > 0) {
      const entries = consoleBuffer.last(Math.min(newConsoleCount, consoleBuffer.length));
      const lines = entries.map((e) => `[${new Date(e.timestamp).toISOString()}] [${e.level}] ${e.text}`).join(`
`) + `
`;
      appendSecureFile(CONSOLE_LOG_PATH, lines);
      lastConsoleFlushed = consoleBuffer.totalAdded;
    }
    const newNetworkCount = networkBuffer.totalAdded - lastNetworkFlushed;
    if (newNetworkCount > 0) {
      const entries = networkBuffer.last(Math.min(newNetworkCount, networkBuffer.length));
      const lines = entries.map((e) => `[${new Date(e.timestamp).toISOString()}] ${e.method} ${e.url} → ${e.status || "pending"} (${e.duration || "?"}ms, ${e.size || "?"}B)`).join(`
`) + `
`;
      appendSecureFile(NETWORK_LOG_PATH, lines);
      lastNetworkFlushed = networkBuffer.totalAdded;
    }
    const newDialogCount = dialogBuffer.totalAdded - lastDialogFlushed;
    if (newDialogCount > 0) {
      const entries = dialogBuffer.last(Math.min(newDialogCount, dialogBuffer.length));
      const lines = entries.map((e) => `[${new Date(e.timestamp).toISOString()}] [${e.type}] "${e.message}" → ${e.action}${e.response ? ` "${e.response}"` : ""}`).join(`
`) + `
`;
      appendSecureFile(DIALOG_LOG_PATH, lines);
      lastDialogFlushed = dialogBuffer.totalAdded;
    }
  } catch (err) {
    console.error("[browse] Buffer flush failed:", err.message);
  } finally {
    flushInProgress = false;
  }
}
function resetIdleTimer() {
  lastActivity = Date.now();
}
function idleCheckTick() {
  if (activeBrowserManager.getConnectionMode() === "headed")
    return;
  if (tunnelActive)
    return;
  if (Date.now() - lastActivity > IDLE_TIMEOUT_MS) {
    console.log(`[browse] Idle for ${IDLE_TIMEOUT_MS / 1000}s, shutting down`);
    activeShutdown?.();
  }
}
function parentWatchdogTick(parentPid = BROWSE_PARENT_PID) {
  try {
    process.kill(parentPid, 0);
  } catch {
    if (hasActivePicker())
      return;
    const headed = activeBrowserManager.getConnectionMode() === "headed" && !headedParentShutdownSuppressed;
    if (headed || tunnelActive) {
      console.log(`[browse] Parent process ${parentPid} exited in ${headed ? "headed" : "tunnel"} mode, shutting down`);
      activeShutdown?.();
    } else if (!parentGone) {
      parentGone = true;
      console.log(`[browse] Parent process ${parentPid} exited (server stays alive, idle timeout will clean up)`);
    }
  }
}
function suppressHeadedParentShutdown(stateConfig = config, manager = activeBrowserManager) {
  if (headedParentShutdownSuppressed)
    return;
  headedParentShutdownSuppressed = true;
  try {
    const release = acquireAgentStateLock(stateConfig.stateDir);
    try {
      const state = JSON.parse(fs26.readFileSync(stateConfig.stateFile, "utf8"));
      if (state.pid === process.pid && state.instanceId === SERVER_INSTANCE_ID) {
        const xvfb = manager.getXvfbHandle();
        state.mode = "headed";
        delete state.chromiumPid;
        delete state.chromiumStartTime;
        if (xvfb)
          Object.assign(state, { xvfbPid: xvfb.pid, xvfbStartTime: xvfb.startTime, xvfbDisplay: xvfb.display });
        const tmpFile = tmpStatePath(stateConfig.stateFile);
        try {
          fs26.writeFileSync(tmpFile, JSON.stringify(state, null, 2), { mode: 384 });
          fs26.renameSync(tmpFile, stateConfig.stateFile);
        } finally {
          safeUnlinkQuiet(tmpFile);
        }
      }
    } finally {
      release();
    }
  } catch (err) {
    console.warn("[browse] Could not persist headed promotion:", err instanceof Error ? err.message : String(err));
  }
  console.log("[browse] Parent-death headed shutdown suppressed (promoted to headed at runtime); watchdog stays armed as the tunnel-orphan reaper");
}
function isWriteInvocation(command, args) {
  return WRITE_COMMANDS.has(command) || hasOutArg(args);
}
function findPort() {
  return findAvailablePort(BROWSE_PORT);
}
function wrapError(err) {
  const msg = err.message || String(err);
  if (err.name === "TimeoutError" || msg.includes("Timeout") || msg.includes("timeout")) {
    if (msg.includes("locator.click") || msg.includes("locator.fill") || msg.includes("locator.hover")) {
      return `Element not found or not interactable within timeout. Check your selector or run 'snapshot' for fresh refs.`;
    }
    if (msg.includes("page.goto") || msg.includes("Navigation")) {
      return `Page navigation timed out. The URL may be unreachable or the page may be loading slowly.`;
    }
    return `Operation timed out: ${msg.split(`
`)[0]}`;
  }
  if (msg.includes("resolved to") && msg.includes("elements")) {
    return `Selector matched multiple elements. Be more specific or use @refs from 'snapshot'.`;
  }
  return msg;
}
async function handleCommandInternalImpl(body, tokenInfo, opts) {
  const { args = [], tabId } = body;
  const rawCommand = body.command;
  if (!rawCommand) {
    return { status: 400, result: JSON.stringify({ error: 'Missing "command" field' }), json: true };
  }
  const command = canonicalizeCommand(rawCommand);
  const isAliased = command !== rawCommand;
  if (command === "chain" && (opts?.chainDepth ?? 0) > 0) {
    return { status: 400, result: JSON.stringify({ error: "Nested chain commands are not allowed" }), json: true };
  }
  if (tokenInfo && tokenInfo.clientId !== "root") {
    if (!checkScope(tokenInfo, command)) {
      return {
        status: 403,
        json: true,
        result: JSON.stringify({
          error: `Command "${command}" not allowed by your token scope`,
          hint: `Your scopes: ${tokenInfo.scopes.join(", ")}. Ask the user to re-pair without --restrict for full page access, or with --control for browser control commands.`
        })
      };
    }
    if (hasOutArg(args) && !tokenInfo.scopes.includes("write")) {
      return {
        status: 403,
        json: true,
        result: JSON.stringify({
          error: `"--out" writes to disk and requires the "write" scope`,
          hint: `Your scopes: ${tokenInfo.scopes.join(", ")}. Re-pair with write access to use --out.`
        })
      };
    }
    if ((command === "goto" || command === "newtab") && args[0]) {
      if (!checkDomain(tokenInfo, args[0])) {
        return {
          status: 403,
          json: true,
          result: JSON.stringify({
            error: `Domain not allowed by your token scope`,
            hint: `Allowed domains: ${tokenInfo.domains?.join(", ") || "none configured"}`
          })
        };
      }
    }
    if (!opts?.skipRateCheck) {
      const rateResult = checkRate(tokenInfo);
      if (!rateResult.allowed) {
        return {
          status: 429,
          json: true,
          result: JSON.stringify({
            error: "Rate limit exceeded",
            hint: `Max ${tokenInfo.rateLimit} requests/second. Retry after ${rateResult.retryAfterMs}ms.`
          }),
          headers: { "Retry-After": String(Math.ceil((rateResult.retryAfterMs || 1000) / 1000)) }
        };
      }
    }
    if (!opts?.skipRateCheck && tokenInfo.token)
      recordCommand(tokenInfo.token);
  }
  let savedTabId = null;
  if (tabId !== undefined && tabId !== null) {
    savedTabId = browserManager.getActiveTabId();
    try {
      browserManager.switchTab(tabId, { bringToFront: false });
    } catch (err) {
      console.warn("[browse] Failed to pin tab", tabId, ":", err.message);
    }
  }
  if (command !== "newtab" && tokenInfo && tokenInfo.clientId !== "root" && tokenInfo.tabPolicy === "own-only") {
    const targetTab = tabId ?? browserManager.getActiveTabId();
    if (!browserManager.checkTabAccess(targetTab, tokenInfo.clientId, { isWrite: isWriteInvocation(command, args), ownOnly: true })) {
      return {
        status: 403,
        json: true,
        result: JSON.stringify({
          error: "Tab not owned by your agent. Use newtab to create your own tab.",
          hint: `Tab ${targetTab} is owned by ${browserManager.getTabOwner(targetTab) || "root"}. Your agent: ${tokenInfo.clientId}.`
        })
      };
    }
  }
  if (command === "newtab" && tokenInfo && tokenInfo.clientId !== "root") {
    const newId = await browserManager.newTab(args[0] || undefined, tokenInfo.clientId);
    return {
      status: 200,
      json: true,
      result: JSON.stringify({
        tabId: newId,
        owner: tokenInfo.clientId,
        hint: 'Include "tabId": ' + newId + " in subsequent commands to target this tab."
      })
    };
  }
  if (browserManager.isWatching() && isWriteInvocation(command, args)) {
    return {
      status: 400,
      json: true,
      result: JSON.stringify({ error: "Cannot run mutation commands while watching. Run `$B watch stop` first." })
    };
  }
  const startTime = Date.now();
  if (!opts?.skipActivity) {
    emitActivity({
      type: "command_start",
      command,
      args,
      url: browserManager.getCurrentUrl(),
      tabs: browserManager.getTabCount(),
      mode: browserManager.getConnectionMode(),
      clientId: tokenInfo?.clientId
    });
  }
  try {
    let result;
    const tabWarning = await browserManager.ensureCommandTab(command);
    let hiddenContentWarnings = [];
    if (READ_COMMANDS.has(command)) {
      const session = browserManager.getActiveSession();
      const isScoped = tokenInfo && tokenInfo.clientId !== "root";
      if (isScoped && DOM_CONTENT_COMMANDS.has(command)) {
        const page = session.getPage();
        try {
          const strippedDescs = await markHiddenElements(page);
          if (strippedDescs.length > 0) {
            console.warn(`[browse] Content security: ${strippedDescs.length} hidden elements flagged on ${command} for ${tokenInfo.clientId}`);
            hiddenContentWarnings = strippedDescs.slice(0, 8).map((d) => `hidden content: ${d.slice(0, 120)}`);
            if (strippedDescs.length > 8) {
              hiddenContentWarnings.push(`hidden content: +${strippedDescs.length - 8} more flagged elements`);
            }
          }
          if (command === "text") {
            const target = session.getActiveFrameOrPage();
            result = await getCleanTextWithStripping(target);
          } else {
            result = await handleReadCommand(command, args, session, browserManager);
          }
        } finally {
          await cleanupHiddenMarkers(page);
        }
      } else {
        result = await handleReadCommand(command, args, session, browserManager);
      }
    } else if (WRITE_COMMANDS.has(command)) {
      const session = browserManager.getActiveSession();
      result = await browserManager.failIfNavigationBlocked(session.getPage(), handleWriteCommand(command, args, session, browserManager));
    } else if (META_COMMANDS.has(command)) {
      const chainDepth = opts?.chainDepth ?? 0;
      const shutdownFn = () => activeShutdown ? activeShutdown() : Promise.resolve();
      result = await handleMetaCommand(command, args, browserManager, shutdownFn, tokenInfo, {
        chainDepth,
        daemonPort: LOCAL_LISTEN_PORT,
        executeCommand: (body, ti) => handleCommandInternal(body, ti, {
          skipRateCheck: true,
          skipActivity: true,
          chainDepth: chainDepth + 1
        })
      });
      if (command === "watch" && args[0] !== "stop" && browserManager.isWatching()) {
        const watchInterval = setInterval(async () => {
          if (!browserManager.isWatching()) {
            clearInterval(watchInterval);
            return;
          }
          try {
            const snapshot = await handleSnapshot(["-i"], browserManager.getActiveSession());
            browserManager.addWatchSnapshot(snapshot);
          } catch {}
        }, 5000);
        browserManager.watchInterval = watchInterval;
      }
    } else if (command === "help") {
      const helpText = generateHelpText();
      return { status: 200, result: helpText };
    } else {
      return {
        status: 400,
        json: true,
        result: JSON.stringify({
          error: buildUnknownCommandError(rawCommand, ALL_COMMANDS),
          hint: `Available commands: ${[...READ_COMMANDS, ...WRITE_COMMANDS, ...META_COMMANDS].sort().join(", ")}`
        })
      };
    }
    if (PAGE_CONTENT_COMMANDS.has(command) && command !== "chain") {
      const isScoped = tokenInfo && tokenInfo.clientId !== "root";
      if (isScoped) {
        const filterResult = runContentFilters(result, browserManager.getCurrentUrl(), command);
        if (filterResult.blocked) {
          return { status: 403, json: true, result: JSON.stringify({ error: filterResult.message }) };
        }
        if (command === "text") {
          result = datamarkContent(result);
        }
        const combinedWarnings = [...filterResult.warnings, ...hiddenContentWarnings];
        result = wrapUntrustedPageContent(result, command, combinedWarnings.length > 0 ? combinedWarnings : undefined);
      } else {
        result = wrapUntrustedContent(result, browserManager.getCurrentUrl());
      }
    }
    const successDuration = Date.now() - startTime;
    if (!opts?.skipActivity) {
      emitActivity({
        type: "command_end",
        command,
        args,
        url: browserManager.getCurrentUrl(),
        duration: successDuration,
        status: "ok",
        result,
        tabs: browserManager.getTabCount(),
        mode: browserManager.getConnectionMode(),
        clientId: tokenInfo?.clientId
      });
    }
    writeAuditEntry({
      ts: new Date().toISOString(),
      cmd: command,
      aliasOf: isAliased ? rawCommand : undefined,
      args: args.join(" "),
      origin: browserManager.getCurrentUrl(),
      durationMs: successDuration,
      status: "ok",
      hasCookies: browserManager.hasCookieImports(),
      mode: browserManager.getConnectionMode()
    });
    browserManager.resetFailures();
    if (savedTabId !== null) {
      try {
        browserManager.switchTab(savedTabId, { bringToFront: false });
      } catch (restoreErr) {
        console.warn("[browse] Failed to restore tab after command:", restoreErr.message);
      }
    }
    return { status: 200, result: tabWarning ? `${tabWarning}
${result}` : result };
  } catch (err) {
    if (savedTabId !== null) {
      try {
        browserManager.switchTab(savedTabId, { bringToFront: false });
      } catch (restoreErr) {
        console.warn("[browse] Failed to restore tab after error:", restoreErr.message);
      }
    }
    const errorDuration = Date.now() - startTime;
    if (!opts?.skipActivity) {
      emitActivity({
        type: "command_end",
        command,
        args,
        url: browserManager.getCurrentUrl(),
        duration: errorDuration,
        status: "error",
        error: err.message,
        tabs: browserManager.getTabCount(),
        mode: browserManager.getConnectionMode(),
        clientId: tokenInfo?.clientId
      });
    }
    writeAuditEntry({
      ts: new Date().toISOString(),
      cmd: command,
      aliasOf: isAliased ? rawCommand : undefined,
      args: args.join(" "),
      origin: browserManager.getCurrentUrl(),
      durationMs: errorDuration,
      status: "error",
      error: err.message,
      hasCookies: browserManager.hasCookieImports(),
      mode: browserManager.getConnectionMode()
    });
    browserManager.incrementFailures();
    let errorMsg = wrapError(err);
    const hint = browserManager.getFailureHint();
    if (hint)
      errorMsg += `
` + hint;
    return { status: 500, result: JSON.stringify({ error: errorMsg }), json: true };
  }
}
async function handleCommandInternal(body, tokenInfo, opts) {
  const cr = await handleCommandInternalImpl(body, tokenInfo, opts);
  return { ...cr, result: stripLoneSurrogates(cr.result) };
}
function buildCommandResponse(cr) {
  const contentType = cr.json ? "application/json" : "text/plain";
  const safeBody = typeof cr.result === "string" ? sanitizeBody(cr.result, !!cr.json) : cr.result;
  return new Response(safeBody, {
    status: cr.status,
    headers: { "Content-Type": contentType, ...cr.headers }
  });
}
async function handleCommand(body, tokenInfo) {
  const cr = await handleCommandInternal(body, tokenInfo);
  return buildCommandResponse(cr);
}
function emergencyCleanup() {
  if (isShuttingDown)
    return;
  isShuttingDown = true;
  try {
    if (fs26.existsSync(config.stateFile)) {
      const raw = fs26.readFileSync(config.stateFile, "utf-8");
      const state = JSON.parse(raw);
      if (state.pid !== process.pid || state.instanceId !== SERVER_INSTANCE_ID)
        return;
      if (state.xvfbPid && state.xvfbStartTime) {
        try {
          init_xvfb();
          cleanupXvfb({
            pid: state.xvfbPid,
            startTime: state.xvfbStartTime,
            display: state.xvfbDisplay || ":99"
          });
        } catch {}
      }
    }
  } catch {}
  if (activeBrowserManager.getConnectionMode() === "headed" || process.env.BROWSE_HEADED === "1") {
    cleanSingletonLocks(resolveChromiumProfile());
  }
  removeOwnedDaemonStateQuiet();
}
function buildFetchHandler(cfg) {
  if (!cfg.authToken || cfg.authToken.length < 16) {
    throw new Error("buildFetchHandler: cfg.authToken must be a non-empty string >= 16 chars");
  }
  if (!cfg.browserManager) {
    throw new Error("buildFetchHandler: cfg.browserManager is required");
  }
  ensureStateDir(cfg.config);
  initAuditLog(cfg.config.auditLog);
  initRegistry(cfg.authToken);
  const { authToken, browserManager: cfgBrowserManager, startTime, beforeRoute, browsePort } = cfg;
  const ownsTerminalAgent = cfg.ownsTerminalAgent === false ? false : true;
  let agentWatchdogInterval = null;
  const respawnHistory = [];
  const AGENT_WATCHDOG_TICK_MS = parseInt(process.env.GSTACK_AGENT_WATCHDOG_TICK_MS || "60000", 10);
  const RESPAWN_GUARD_MAX = 3;
  const RESPAWN_GUARD_WINDOW_MS = Math.max(60000, AGENT_WATCHDOG_TICK_MS * (RESPAWN_GUARD_MAX + 2));
  let agentRespawnGuardTripped = false;
  let consecutiveSpawnFailures = 0;
  if (ownsTerminalAgent) {
    agentWatchdogInterval = setInterval(() => {
      if (isShuttingDown)
        return;
      if (agentRespawnGuardTripped)
        return;
      const stateDir = path26.dirname(cfg.config.stateFile);
      const record = readAgentRecord(stateDir);
      if (record && !isAgentRecordGone(record))
        return;
      const now = Date.now();
      while (respawnHistory.length && now - respawnHistory[0] > RESPAWN_GUARD_WINDOW_MS) {
        respawnHistory.shift();
      }
      if (respawnHistory.length >= RESPAWN_GUARD_MAX) {
        agentRespawnGuardTripped = true;
        console.error(`[browse] terminal-agent respawn guard tripped (${RESPAWN_GUARD_MAX} crashes in ${RESPAWN_GUARD_WINDOW_MS / 1000}s) — manual restart required`);
        return;
      }
      respawnHistory.push(now);
      try {
        const pid = spawnTerminalAgent({
          stateFile: cfg.config.stateFile,
          serverPort: cfg.browsePort,
          ownerPid: process.pid,
          cwd: cfg.config.projectDir
        });
        if (pid) {
          consecutiveSpawnFailures = 0;
          console.log(`[browse] terminal-agent respawned by watchdog (PID: ${pid})`);
        } else {
          consecutiveSpawnFailures++;
          console.warn("[browse] terminal-agent respawn skipped — script not found on disk");
        }
      } catch (err) {
        consecutiveSpawnFailures++;
        console.warn("[browse] terminal-agent respawn failed:", err?.message || err);
      }
      if (consecutiveSpawnFailures >= RESPAWN_GUARD_MAX) {
        agentRespawnGuardTripped = true;
        console.error("[browse] terminal-agent respawn guard tripped after repeated failed starts — manual restart required");
      }
    }, AGENT_WATCHDOG_TICK_MS);
    agentWatchdogInterval?.unref?.();
  }
  function validateAuth(req) {
    const header = req.headers.get("authorization");
    if (header === null)
      return false;
    const got = Buffer.from(header);
    const want = Buffer.from(`Bearer ${authToken}`);
    return got.length === want.length && crypto9.timingSafeEqual(got, want);
  }
  async function shutdown(exitCode = 0) {
    if (isShuttingDown)
      return;
    isShuttingDown = true;
    const config = cfg.config;
    const stateOwner = (() => {
      try {
        return JSON.parse(fs26.readFileSync(config.stateFile, "utf8"));
      } catch {
        return null;
      }
    })();
    const foreignState = Number.isSafeInteger(stateOwner?.pid) && stateOwner.pid > 0 && (stateOwner.pid !== process.pid || stateOwner.instanceId && stateOwner.instanceId !== SERVER_INSTANCE_ID);
    console.log("[browse] Shutting down...");
    if (ownsTerminalAgent && !foreignState) {
      try {
        const stateDir = path26.dirname(config.stateFile);
        const releaseAgentLock = acquireAgentStateLock(stateDir);
        try {
          let currentState = null;
          try {
            currentState = JSON.parse(fs26.readFileSync(config.stateFile, "utf8"));
          } catch {}
          if (currentState?.pid && (currentState.pid !== process.pid || currentState.instanceId && currentState.instanceId !== SERVER_INSTANCE_ID)) {
            console.warn("[browse] terminal-agent state now belongs to a successor; retaining its files");
          } else {
            const record = readAgentRecord(stateDir);
            const agentStopped = !record || record.pid !== 0 && (!isAgentRecordLive(record) || isOurAgent(record, process.pid) && stopAgentByRecord(record));
            const current = readAgentRecord(stateDir);
            if (agentStopped && (!record || current?.pid === record.pid && current.gen === record.gen)) {
              safeUnlinkQuiet(path26.join(stateDir, "terminal-port"));
              safeUnlinkQuiet(path26.join(stateDir, "terminal-internal-token"));
              if (record)
                clearAgentRecord(stateDir, record);
            } else if (!agentStopped) {
              console.warn("[browse] terminal-agent identity or exit could not be confirmed; retaining its record");
            }
          }
        } finally {
          releaseAgentLock();
        }
      } catch (err) {
        console.warn("[browse] Failed to stop terminal-agent; retaining its state:", err.message);
      }
    }
    try {
      detachSession();
    } catch (err) {
      console.warn("[browse] Failed to detach CDP session:", err.message);
    }
    clearInspectorSubscribers();
    if (cfgBrowserManager.isWatching())
      cfgBrowserManager.stopWatch();
    clearInterval(flushInterval);
    clearInterval(idleCheckInterval);
    if (agentWatchdogInterval)
      clearInterval(agentWatchdogInterval);
    if (sessionPersistInterval) {
      clearInterval(sessionPersistInterval);
      sessionPersistInterval = null;
    }
    await flushBuffers();
    if (isSessionPersistEnabled()) {
      const finalSnapshot = persistSessionState(cfgBrowserManager, path26.join(config.stateDir, SESSION_STATE_FILE)).catch((err) => {
        console.warn(`[browse] SESSION_PERSIST_FAILED at shutdown: ${err?.message ?? err}`);
      });
      await Promise.race([
        finalSnapshot,
        new Promise((resolve) => setTimeout(resolve, 2000))
      ]);
    }
    await cfgBrowserManager.close();
    if (cfgBrowserManager.getConnectionMode() === "headed") {
      cleanSingletonLocks(resolveChromiumProfile());
    }
    if (!foreignState) {
      try {
        const releaseStateLock = acquireAgentStateLock(path26.dirname(config.stateFile));
        try {
          const currentState = JSON.parse(fs26.readFileSync(config.stateFile, "utf8"));
          if (currentState.pid === process.pid && currentState.instanceId === SERVER_INSTANCE_ID)
            safeUnlinkQuiet(config.stateFile);
        } finally {
          releaseStateLock();
        }
      } catch (err) {
        if (fs26.existsSync(config.stateFile))
          console.warn("[browse] Daemon state cleanup could not confirm ownership:", err?.message || err);
      }
    }
    process.exit(exitCode);
  }
  async function stopListeners(local, tunnel) {
    try {
      if (local?.stop)
        local.stop(true);
    } catch (err) {
      console.warn("[browse] local listener stop failed:", err?.message || err);
    }
    try {
      if (tunnel?.stop)
        tunnel.stop(true);
    } catch (err) {
      console.warn("[browse] tunnel listener stop failed:", err?.message || err);
    }
  }
  activeShutdown = shutdown;
  activeBrowserManager = cfgBrowserManager;
  cfgBrowserManager.onHeadedPromotion = () => suppressHeadedParentShutdown(cfg.config, cfgBrowserManager);
  const callerOnDisconnect = cfgBrowserManager.onDisconnect;
  cfgBrowserManager.onDisconnect = async (code) => {
    if (callerOnDisconnect) {
      try {
        await callerOnDisconnect(code);
      } catch (err) {
        console.warn("[browse] caller onDisconnect threw:", err?.message ?? err);
      }
    }
    await activeShutdown?.(code ?? 2);
  };
  const routeCtx = {
    browserManager: cfgBrowserManager,
    startTime,
    browsePort,
    validateAuth,
    isRootRequest,
    getTokenInfo,
    hasSseCookie: (req) => validateSseSessionToken(extractSseCookie(req)),
    isPinnedExtensionRequest,
    isRootTokenValue: (token) => token !== null && token === authToken,
    bootstrapRootToken: authToken,
    resetIdleTimer,
    terminal: { readPort: readTerminalPort, grantToken: grantPtyToken, restartSession: restartPtySession },
    tunnel: {
      state: () => ({ active: tunnelActive, url: tunnelUrl, hasListener: tunnelServer !== null }),
      close: closeTunnel,
      resolveAuthtoken: resolveNgrokAuthtoken,
      start: (authtoken) => startTunnel({
        fetchHandler: makeFetchHandler("tunnel"),
        authtoken,
        consent: "pair_agent=on (isPairAgentEnabled gate at /tunnel/start)"
      })
    },
    commands: {
      handle: handleCommand,
      handleInternal: (body, tokenInfo, opts) => handleCommandInternal(body, tokenInfo, opts)
    }
  };
  const makeFetchHandler = (surface) => async (req) => {
    const url = new URL(req.url);
    if (surface === "tunnel") {
      const isGetConnect = req.method === "GET" && url.pathname === "/connect";
      const allowed = TUNNEL_PATHS.has(url.pathname);
      if (!allowed && !isGetConnect) {
        logTunnelDenial(req, url, "path_not_on_tunnel");
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (isRootRequest(req)) {
        logTunnelDenial(req, url, "root_token_on_tunnel");
        return new Response(JSON.stringify({
          error: "Root token rejected on tunnel surface",
          hint: "Remote agents must pair via /connect to receive a scoped token."
        }), { status: 403, headers: { "Content-Type": "application/json" } });
      }
      if (url.pathname !== "/connect" && !getTokenInfo(req)) {
        logTunnelDenial(req, url, "missing_scoped_token");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    if (beforeRoute) {
      const auth = getTokenInfo(req);
      const overlayResp = await beforeRoute(req, surface, auth);
      if (overlayResp)
        return overlayResp;
    }
    return dispatchRoute(ROUTES, req, url, surface, routeCtx);
  };
  return {
    fetchLocal: makeFetchHandler("local"),
    fetchTunnel: makeFetchHandler("tunnel"),
    shutdown,
    stopListeners
  };
}
async function start() {
  safeUnlink(CONSOLE_LOG_PATH);
  safeUnlink(NETWORK_LOG_PATH);
  safeUnlink(DIALOG_LOG_PATH);
  const port = await findPort();
  LOCAL_LISTEN_PORT = port;
  let proxyBridge = null;
  const { url: proxyUrl, source: proxySource, bypass: proxyBypass, direct: proxyDirect } = serverProxyEnv(process.env);
  if (proxyUrl) {
    let parsed;
    try {
      parsed = parseProxyConfig({
        proxyUrl,
        envUser: process.env.BROWSE_PROXY_USER,
        envPass: process.env.BROWSE_PROXY_PASS,
        source: proxySource
      });
    } catch (err) {
      if (err instanceof ProxyConfigError) {
        console.error(`[browse] error: ${err.message} (${err.hint})`);
        process.exit(1);
      }
      throw err;
    }
    if (parsed.scheme === "socks5" && parsed.hasAuth) {
      console.log(`[browse] Testing SOCKS5 upstream ${redactProxyUrl(proxyUrl)}...`);
      try {
        const test = await testUpstream({
          upstream: toUpstreamConfig(parsed),
          budgetMs: 5000,
          retries: 3,
          backoffMs: 500
        });
        console.log(`[browse] [proxy] upstream test ok in ${test.ms}ms (${test.attempts} attempt${test.attempts === 1 ? "" : "s"})`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[browse] [proxy] FAIL upstream ${redactProxyUrl(proxyUrl)}: ${msg}`);
        process.exit(1);
      }
      proxyBridge = await startSocksBridge({ upstream: toUpstreamConfig(parsed) });
      console.log(`[browse] [proxy] bridge listening on 127.0.0.1:${proxyBridge.port}`);
      browserManager.setProxyConfig({ server: `socks5://127.0.0.1:${proxyBridge.port}`, bypass: proxyBypass });
    } else {
      browserManager.setProxyConfig({
        server: `${parsed.scheme}://${parsed.host}:${parsed.port}`,
        bypass: proxyBypass,
        ...parsed.userId ? { username: parsed.userId } : {},
        ...parsed.password ? { password: parsed.password } : {}
      });
      console.log(`[browse] [proxy] using ${redactProxyUrl(proxyUrl)} from ${proxySource} (pass-through to Chromium)`);
    }
    process.on("exit", () => {
      if (proxyBridge) {
        proxyBridge.close().catch(() => {});
      }
    });
  } else
    console.log(directProxyLogLine(process.env));
  process.on("exit", () => {
    browserManager.closeOwnedDisplay();
  });
  const envCfg = resolveConfigFromEnv();
  const skipBrowser = process.env.BROWSE_HEADLESS_SKIP === "1";
  if (!skipBrowser) {
    const headed = process.env.BROWSE_HEADED === "1";
    if (headed) {
      await browserManager.launchHeaded(envCfg.authToken);
      console.log(`[browse] Launched headed Chromium with extension`);
    } else {
      await browserManager.launch();
    }
  }
  const startTime = Date.now();
  const handle = buildFetchHandler({
    ...envCfg,
    browsePort: port,
    browserManager,
    proxyBridge,
    startTime,
    ownsTerminalAgent: true
  });
  const server = Bun.serve({
    port,
    hostname: "127.0.0.1",
    fetch: handle.fetchLocal
  });
  browserManager.serverPort = port;
  if (browserManager.getConnectionMode() === "headed") {
    try {
      const currentUrl = browserManager.getCurrentUrl();
      if (currentUrl === "about:blank" || currentUrl === "") {
        const page = browserManager.getPage();
        await page.goto(`http://127.0.0.1:${port}/welcome`, { timeout: 3000 }).catch((err) => {
          console.warn("[browse] Failed to navigate to welcome page:", err.message);
        });
      }
    } catch (err) {
      console.warn("[browse] Welcome page navigation setup failed:", err.message);
    }
  }
  if (isShuttingDown)
    return;
  const xvfb = browserManager.getXvfbHandle();
  const state = {
    pid: process.pid,
    instanceId: SERVER_INSTANCE_ID,
    port,
    token: envCfg.authToken,
    startedAt: new Date().toISOString(),
    serverPath: path26.resolve(__browseNodeSrcDir, "server.ts"),
    binaryVersion: readVersionHash() || undefined,
    mode: browserManager.getConnectionMode(),
    ...process.env.BROWSE_CONFIG_HASH ? { configHash: process.env.BROWSE_CONFIG_HASH } : {},
    ...proxyUrl ? { proxy: redactProxyUrl(proxyUrl), proxySource, proxyBypass } : proxyDirect ? { proxyDirect } : {},
    ...xvfb ? { xvfbPid: xvfb.pid, xvfbStartTime: xvfb.startTime, xvfbDisplay: xvfb.display } : {},
    ...(() => {
      const info = browserManager.getChromiumProcInfo();
      return info ? { chromiumPid: info.pid, chromiumStartTime: info.startTime } : {};
    })()
  };
  const tmpFile = tmpStatePath();
  fs26.writeFileSync(tmpFile, JSON.stringify(state, null, 2), { mode: 384 });
  try {
    const releaseStateLock = acquireAgentStateLock(config.stateDir);
    try {
      fs26.renameSync(tmpFile, config.stateFile);
    } finally {
      releaseStateLock();
    }
  } catch (err) {
    safeUnlinkQuiet(tmpFile);
    throw err;
  }
  const stateWatchMs = parseInt(process.env.GSTACK_STATE_WATCH_MS || "60000", 10);
  if (stateWatchMs > 0) {
    let missed = 0;
    const stateWatch = setInterval(() => {
      let owner = null;
      try {
        owner = JSON.parse(fs26.readFileSync(config.stateFile, "utf8"));
      } catch {}
      if (owner?.pid === process.pid && owner.instanceId === SERVER_INSTANCE_ID) {
        missed = 0;
        return;
      }
      if (++missed < 2)
        return;
      clearInterval(stateWatch);
      console.warn("[browse] daemon state is no longer reachable; shutting down this instance");
      handle.shutdown();
    }, stateWatchMs);
    stateWatch.unref?.();
  }
  if (!skipBrowser && isSessionPersistEnabled() && browserManager.getConnectionMode() === "launched") {
    const sessionStatePath = path26.join(config.stateDir, SESSION_STATE_FILE);
    restoreSessionState(browserManager, sessionStatePath).then((restored) => {
      if (restored) {
        console.log(`[browse] Session state restored: ${restored.cookies.length} cookies / ${restored.pages.length} tabs (BROWSE_PERSIST_STATE=1)`);
      } else {
        console.log("[browse] Session persistence on; no prior state — fresh session (BROWSE_PERSIST_STATE=1)");
      }
    }).catch((err) => {
      console.warn(`[browse] SESSION_RESTORE_FAILED: ${err?.message ?? err}`);
    });
    let persistWarned = false;
    let persistInFlight = false;
    sessionPersistInterval = setInterval(() => {
      if (isShuttingDown)
        return;
      if (persistInFlight)
        return;
      persistInFlight = true;
      persistSessionState(browserManager, sessionStatePath).catch((err) => {
        if (!persistWarned) {
          persistWarned = true;
          console.warn(`[browse] SESSION_PERSIST_FAILED: ${err?.message ?? err} (further failures suppressed)`);
        }
      }).finally(() => {
        persistInFlight = false;
      });
    }, sessionPersistIntervalMs());
    sessionPersistInterval?.unref?.();
  }
  try {
    const stateDir = path26.join(config.stateDir, "browse-states");
    if (fs26.existsSync(stateDir)) {
      const SEVEN_DAYS = 604800000;
      for (const file of fs26.readdirSync(stateDir)) {
        const filePath = path26.join(stateDir, file);
        const stat = fs26.statSync(filePath);
        if (Date.now() - stat.mtimeMs > SEVEN_DAYS) {
          fs26.unlinkSync(filePath);
          console.log(`[browse] Deleted stale state file: ${file}`);
        }
      }
    }
  } catch (err) {
    console.warn("[browse] Failed to clean stale state files:", err.message);
  }
  console.log(`[browse] Server running on http://127.0.0.1:${port} (PID: ${process.pid})`);
  console.log(`[browse] State file: ${config.stateFile}`);
  console.log(`[browse] Idle timeout: ${IDLE_TIMEOUT_MS / 1000}s`);
  if (process.env.BROWSE_TUNNEL === "1" && !isPairAgentEnabled()) {
    console.error("[browse] BROWSE_TUNNEL=1 ignored: pair-agent is off. Enable once with: gstack-config set pair_agent on");
  } else if (process.env.BROWSE_TUNNEL === "1") {
    const authtoken = resolveNgrokAuthtoken();
    if (!authtoken) {
      console.error("[browse] BROWSE_TUNNEL=1 but no NGROK_AUTHTOKEN found. Set it via env var or ~/.gstack/ngrok.env");
    } else {
      const started = await startTunnel({
        fetchHandler: handle.fetchTunnel,
        authtoken,
        consent: "pair_agent=on (isPairAgentEnabled gate, BROWSE_TUNNEL=1)"
      });
      if (!started.ok) {
        console.error(`[browse] Failed to start tunnel: ${started.error.message}`);
      }
    }
  } else if (process.env.BROWSE_TUNNEL_LOCAL_ONLY === "1") {
    try {
      const boundTunnel = Bun.serve({
        port: 0,
        hostname: "127.0.0.1",
        fetch: handle.fetchTunnel
      });
      tunnelServer = boundTunnel;
      tunnelActive = true;
      const tunnelPort = boundTunnel.port;
      console.log(`[browse] Tunnel listener bound (local-only test mode) on 127.0.0.1:${tunnelPort}`);
      const releaseStateLock = acquireAgentStateLock(config.stateDir);
      try {
        const stateContent = JSON.parse(fs26.readFileSync(config.stateFile, "utf-8"));
        if (stateContent.pid !== process.pid || stateContent.instanceId !== SERVER_INSTANCE_ID)
          throw new Error("daemon state was replaced");
        stateContent.tunnelLocalPort = tunnelPort;
        const tmpState = tmpStatePath();
        fs26.writeFileSync(tmpState, JSON.stringify(stateContent, null, 2), { mode: 384 });
        fs26.renameSync(tmpState, config.stateFile);
      } finally {
        releaseStateLock();
      }
    } catch (err) {
      console.error(`[browse] BROWSE_TUNNEL_LOCAL_ONLY=1 listener bind failed: ${err.message}`);
    }
  }
}
function __resetShuttingDown() {
  isShuttingDown = false;
}
var SERVER_INSTANCE_ID, config, activeShutdown = null, BROWSE_PORT, IDLE_TIMEOUT_MS, LOCAL_LISTEN_PORT = 0, tunnelActive = false, tunnelUrl = null, tunnelListener = null, tunnelServer = null, TUNNEL_PATHS, CONSOLE_LOG_PATH, NETWORK_LOG_PATH, DIALOG_LOG_PATH, lastConsoleFlushed = 0, lastNetworkFlushed = 0, lastDialogFlushed = 0, flushInProgress = false, flushInterval, lastActivity, idleCheckInterval, __testInternals__, BROWSE_PARENT_PID, IS_HEADED_WATCHDOG, headedParentShutdownSuppressed = false, parentGone = false, rawWatchdogIntervalMs, PARENT_WATCHDOG_INTERVAL_MS, browserManager, activeBrowserManager, isShuttingDown = false, sessionPersistInterval = null;
var init_server = __esm(() => {
  init_browser_manager();
  init_read_commands();
  init_write_commands();
  init_meta_commands();
  init_cookie_picker_routes();
  init_commands();
  init_content_security();
  init_file_permissions();
  init_snapshot();
  init_token_registry();
  init_config();
  init_session_persist();
  init_activity();
  init_audit();
  init_cdp_inspector();
  init_error_handling2();
  init_port_allocator();
  init_terminal_agent_control();
  init_extension_id();
  init_sanitize();
  init_socks_bridge();
  init_proxy_config();
  init_egress_receipt();
  init_tunnel_denial_log();
  init_sse_session_cookie();
  init_routes();
  init_table();
  init_commands2();
  init_inspector();
  init_extension_id();
  init_buffers();
  init_commands();
  SERVER_INSTANCE_ID = crypto9.randomUUID();
  config = resolveConfig();
  ensureStateDir(config);
  initAuditLog(config.auditLog);
  BROWSE_PORT = parseInt(process.env.BROWSE_PORT || "0", 10);
  IDLE_TIMEOUT_MS = parseInt(process.env.BROWSE_IDLE_TIMEOUT || "1800000", 10);
  TUNNEL_PATHS = new Set([
    "/connect",
    "/command"
  ]);
  CONSOLE_LOG_PATH = config.consoleLog;
  NETWORK_LOG_PATH = config.networkLog;
  DIALOG_LOG_PATH = config.dialogLog;
  flushInterval = setInterval(flushBuffers, 1000);
  lastActivity = Date.now();
  idleCheckInterval = setInterval(idleCheckTick, 60000);
  __testInternals__ = {
    serverInstanceId: SERVER_INSTANCE_ID,
    tunnelPaths: TUNNEL_PATHS,
    idleCheckTick,
    parentWatchdogTick,
    suppressHeadedParentShutdown,
    resetParentWatchdogState: () => {
      headedParentShutdownSuppressed = false;
      parentGone = false;
    },
    setTunnelActive: (v) => {
      tunnelActive = v;
    },
    setLastActivity: (t) => {
      lastActivity = t;
    },
    formatExplicitPortUnavailableError,
    formatRandomPortUnavailableError,
    resetShutdownState: () => {
      isShuttingDown = false;
    },
    get browserManager() {
      return browserManager;
    },
    handleCommandInternal
  };
  BROWSE_PARENT_PID = parseInt(process.env.BROWSE_PARENT_PID || "0", 10);
  IS_HEADED_WATCHDOG = process.env.BROWSE_HEADED === "1";
  rawWatchdogIntervalMs = parseInt(process.env.BROWSE_PARENT_WATCHDOG_INTERVAL_MS || "", 10);
  PARENT_WATCHDOG_INTERVAL_MS = Number.isFinite(rawWatchdogIntervalMs) && rawWatchdogIntervalMs > 0 ? rawWatchdogIntervalMs : 15000;
  if (BROWSE_PARENT_PID > 0 && !IS_HEADED_WATCHDOG) {
    setInterval(parentWatchdogTick, PARENT_WATCHDOG_INTERVAL_MS);
  } else if (IS_HEADED_WATCHDOG) {
    console.log("[browse] Parent-process watchdog disabled (headed mode)");
  } else if (BROWSE_PARENT_PID === 0) {
    console.log("[browse] Parent-process watchdog disabled (BROWSE_PARENT_PID=0)");
  }
  browserManager = new BrowserManager;
  browserManager.onHeadedPromotion = suppressHeadedParentShutdown;
  activeBrowserManager = browserManager;
  browserManager.onDisconnect = (code) => activeShutdown?.(code ?? 2);
  if (__require.main == __require.module) {
    markDaemonProcess();
    process.on("SIGINT", () => activeShutdown?.());
    process.on("SIGHUP", () => activeShutdown?.());
    process.on("SIGTERM", () => {
      if (hasActivePicker()) {
        console.log("[browse] Received SIGTERM but cookie picker is active, ignoring to avoid stranding the picker UI");
        return;
      }
      const headed = activeBrowserManager.getConnectionMode() === "headed";
      if (headed || tunnelActive) {
        console.log(`[browse] Received SIGTERM in ${headed ? "headed" : "tunnel"} mode, shutting down`);
        activeShutdown?.();
      } else {
        console.log("[browse] Received SIGTERM (ignoring — use /stop or Ctrl+C for intentional shutdown)");
      }
    });
    if (process.platform === "win32") {
      process.on("exit", removeOwnedDaemonStateQuiet);
    }
  }
  if (__require.main == __require.module) {
    process.on("uncaughtException", (err) => {
      console.error("[browse] FATAL uncaught exception:", err.message);
      emergencyCleanup();
      process.exit(1);
    });
    process.on("unhandledRejection", (err) => {
      console.error("[browse] FATAL unhandled rejection:", err?.message || err);
      emergencyCleanup();
      process.exit(1);
    });
  }
  if (__require.main == __require.module) {
    start().catch((err) => {
      console.error(`[browse] Failed to start: ${err.message}`);
      try {
        const errorLogPath = path26.join(config.stateDir, "browse-startup-error.log");
        mkdirSecure(config.stateDir);
        writeSecureFile(errorLogPath, `${new Date().toISOString()} ${err.message}
${err.stack || ""}
`);
      } catch {}
      process.exit(1);
    });
  }
});
init_server();

export {
  GSTACK_EXTENSION_ID,
  META_COMMANDS,
  READ_COMMANDS,
  TUNNEL_COMMANDS,
  WRITE_COMMANDS,
  __resetShuttingDown,
  __testInternals__,
  addConsoleEntry,
  addDialogEntry,
  addNetworkEntry,
  buildCommandResponse,
  buildFetchHandler,
  canDispatchOverTunnel,
  consoleBuffer,
  dialogBuffer,
  getInspectorSubscriberCount,
  networkBuffer,
  resolveConfigFromEnv,
  start
};
