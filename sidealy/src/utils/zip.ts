// Pure TypeScript zero-dependency ZIP archive builder (PKZip standard)
// Encodes files with CRC-32 and creates valid downloadable .zip Blobs without external npm packages.

function makeCRC32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xed_b8_83_20 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
}

const crcTable = makeCRC32Table();

function calculateCRC32(data: Uint8Array): number {
  let crc = 0xff_ff_ff_ff;
  for (const byte of data) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xff_ff_ff_ff) >>> 0;
}

export interface ZipEntry {
  content: string | Uint8Array;
  path: string;
}

export function buildZip(entries: ZipEntry[]): Blob {
  const encoder = new TextEncoder();
  const fileRecords: {
    data: Uint8Array;
    pathBytes: Uint8Array;
    crc: number;
    offset: number;
  }[] = [];

  const chunks: Uint8Array[] = [];
  let currentOffset = 0;

  for (const entry of entries) {
    const pathBytes = encoder.encode(entry.path.replace(/^\/+/, ""));
    const data =
      typeof entry.content === "string"
        ? encoder.encode(entry.content)
        : entry.content;
    const crc = calculateCRC32(data);

    // Local file header: 30 bytes + filename + data
    const localHeader = new Uint8Array(30 + pathBytes.length);
    const view = new DataView(localHeader.buffer);

    view.setUint32(0, 0x04_03_4b_50, true); // Local file header signature
    view.setUint16(4, 20, true); // Version needed to extract (2.0)
    view.setUint16(6, 0, true); // General purpose bit flag
    view.setUint16(8, 0, true); // Compression method (0 = uncompressed / store)
    view.setUint16(10, 0, true); // Last mod file time
    view.setUint16(12, 0, true); // Last mod file date
    view.setUint32(14, crc, true); // CRC-32
    view.setUint32(18, data.length, true); // Compressed size
    view.setUint32(22, data.length, true); // Uncompressed size
    view.setUint16(26, pathBytes.length, true); // File name length
    view.setUint16(28, 0, true); // Extra field length

    localHeader.set(pathBytes, 30);

    chunks.push(localHeader);
    chunks.push(data);

    fileRecords.push({
      crc,
      data,
      offset: currentOffset,
      pathBytes,
    });

    currentOffset += localHeader.length + data.length;
  }

  const centralDirOffset = currentOffset;
  let centralDirSize = 0;

  // Central directory records
  for (const record of fileRecords) {
    const header = new Uint8Array(46 + record.pathBytes.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x02_01_4b_50, true); // Central directory file header signature
    view.setUint16(4, 20, true); // Version made by
    view.setUint16(6, 20, true); // Version needed to extract
    view.setUint16(8, 0, true); // General purpose bit flag
    view.setUint16(10, 0, true); // Compression method
    view.setUint16(12, 0, true); // Last mod time
    view.setUint16(14, 0, true); // Last mod date
    view.setUint32(16, record.crc, true); // CRC-32
    view.setUint32(20, record.data.length, true); // Compressed size
    view.setUint32(24, record.data.length, true); // Uncompressed size
    view.setUint16(28, record.pathBytes.length, true); // File name length
    view.setUint16(30, 0, true); // Extra field length
    view.setUint16(32, 0, true); // File comment length
    view.setUint16(34, 0, true); // Disk number start
    view.setUint16(36, 0, true); // Internal file attributes
    view.setUint32(38, 0, true); // External file attributes
    view.setUint32(42, record.offset, true); // Relative offset of local header

    header.set(record.pathBytes, 46);

    chunks.push(header);
    centralDirSize += header.length;
  }

  // End of central directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);

  eocdView.setUint32(0, 0x06_05_4b_50, true); // End of central dir signature
  eocdView.setUint16(4, 0, true); // Number of this disk
  eocdView.setUint16(6, 0, true); // Disk where central directory starts
  eocdView.setUint16(8, fileRecords.length, true); // Number of central directory records on this disk
  eocdView.setUint16(10, fileRecords.length, true); // Total number of central directory records
  eocdView.setUint32(12, centralDirSize, true); // Size of central directory
  eocdView.setUint32(16, centralDirOffset, true); // Offset of start of central directory
  eocdView.setUint16(20, 0, true); // Comment length

  chunks.push(eocd);

  return new Blob(chunks as BlobPart[], { type: "application/zip" });
}

export function downloadZip(
  entries: ZipEntry[],
  filename = "project.zip"
): void {
  const blob = buildZip(entries);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
