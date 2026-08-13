/**
 * projectDownloader.ts
 * Service pour télécharger le projet complet.
 * Tente JSZip si disponible, sinon utilise une implémentation ZIP minimaliste native.
 * Inspiré de Bolt.new / Emergent.sh.
 */

import type { IdealyUniversalProjectSchema } from '@/core/iups/types';

/**
 * Crée un ZIP minimaliste sans dépendances externes.
 * Utilise le format ZIP non-compressé (store) pour la compatibilité.
 */
function createMinimalZip(files: Record<string, string>): Uint8Array {
  const encoder = new TextEncoder();
  const localFileHeaders: Uint8Array[] = [];
  const centralDirHeaders: Uint8Array[] = [];
  let offset = 0;

  const writeU16 = (view: DataView, pos: number, val: number) => view.setUint16(pos, val, true);
  const writeU32 = (view: DataView, pos: number, val: number) => view.setUint32(pos, val, true);

  for (const [path, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(path);
    const dataBytes = encoder.encode(content);
    const crc = crc32(dataBytes);

    // Local file header (30 bytes + name + data)
    const lfh = new Uint8Array(30 + nameBytes.length);
    const lfhView = new DataView(lfh.buffer);
    writeU32(lfhView, 0, 0x04034b50);  // signature
    writeU16(lfhView, 4, 20);           // version needed
    writeU16(lfhView, 6, 0);            // flags
    writeU16(lfhView, 8, 0);            // compression (store)
    writeU16(lfhView, 10, 0);           // mod time
    writeU16(lfhView, 12, 0);           // mod date
    writeU32(lfhView, 14, crc);         // crc32
    writeU32(lfhView, 18, dataBytes.length); // compressed size
    writeU32(lfhView, 22, dataBytes.length); // uncompressed size
    writeU16(lfhView, 26, nameBytes.length); // name length
    writeU16(lfhView, 28, 0);           // extra length
    lfh.set(nameBytes, 30);

    // Central directory header (46 bytes + name)
    const cdh = new Uint8Array(46 + nameBytes.length);
    const cdhView = new DataView(cdh.buffer);
    writeU32(cdhView, 0, 0x02014b50);  // signature
    writeU16(cdhView, 4, 20);           // version made by
    writeU16(cdhView, 6, 20);           // version needed
    writeU16(cdhView, 8, 0);            // flags
    writeU16(cdhView, 10, 0);           // compression
    writeU16(cdhView, 12, 0);           // mod time
    writeU16(cdhView, 14, 0);           // mod date
    writeU32(cdhView, 16, crc);         // crc32
    writeU32(cdhView, 20, dataBytes.length); // compressed size
    writeU32(cdhView, 24, dataBytes.length); // uncompressed size
    writeU16(cdhView, 28, nameBytes.length); // name length
    writeU16(cdhView, 30, 0);           // extra length
    writeU16(cdhView, 32, 0);           // comment length
    writeU16(cdhView, 34, 0);           // disk start
    writeU16(cdhView, 36, 0);           // internal attrs
    writeU32(cdhView, 38, 0);           // external attrs
    writeU32(cdhView, 42, offset);      // local header offset
    cdh.set(nameBytes, 46);

    localFileHeaders.push(lfh, dataBytes);
    centralDirHeaders.push(cdh);
    offset += lfh.length + dataBytes.length;
  }

  // End of central directory record
  const cdSize = centralDirHeaders.reduce((sum, b) => sum + b.length, 0);
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  const writeU16e = (pos: number, val: number) => eocdView.setUint16(pos, val, true);
  const writeU32e = (pos: number, val: number) => eocdView.setUint32(pos, val, true);
  writeU32e(0, 0x06054b50);          // signature
  writeU16e(4, 0);                   // disk number
  writeU16e(6, 0);                   // disk with cd
  writeU16e(8, Object.keys(files).length); // entries on disk
  writeU16e(10, Object.keys(files).length); // total entries
  writeU32e(12, cdSize);             // central dir size
  writeU32e(16, offset);             // central dir offset
  writeU16e(20, 0);                  // comment length

  // Concat everything
  const all = [...localFileHeaders, ...centralDirHeaders, eocd];
  const total = all.reduce((sum, b) => sum + b.length, 0);
  const result = new Uint8Array(total);
  let pos = 0;
  for (const chunk of all) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
}

/** CRC32 implementation (no deps) */
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function triggerDownload(data: Uint8Array, filename: string): void {
  const buffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(buffer).set(data);
  const blob = new Blob([buffer], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Génère et télécharge un fichier ZIP contenant tous les fichiers du projet.
 */
export async function downloadProjectZip(schema: IdealyUniversalProjectSchema): Promise<void> {
  const files = schema?.project?.files;
  if (!files || Object.keys(files).length === 0) {
    throw new Error('Aucun fichier à télécharger.');
  }

  const projectName = schema.project.name?.toLowerCase().replace(/\s+/g, '-') || 'idealy-project';
  const zipData = createMinimalZip(files);
  triggerDownload(zipData, `${projectName}.zip`);
}
