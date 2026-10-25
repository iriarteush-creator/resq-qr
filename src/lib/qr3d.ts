// Generador 3D Nativo (.STL y .3MF Bicolor para Bambu Studio)
// Réplica exacta del modelo paramétrico de MakerWorld (scadqr) sin salir del Panel Admin

import QRCode from 'qrcode';

export interface Qr3DParams {
  text: string;
  codeName: string;
  size: number; // SIZE en mm (por defecto 50)
  quietZone: number; // QUIET_ZONE en mm (por defecto 2)
  fillExtrude: number; // FILL_EXTRUDE espesor base en mm (por defecto 1.0)
  codeExtrude: number; // CODE_EXTRUDE altura relieve QR en mm (por defecto 0.6)
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
}

interface Box3D {
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
}

// Genera los triángulos de un cubo 3D (12 triángulos = 36 vértices)
function boxToTriangles(b: Box3D): number[][][] {
  const { x0, y0, z0, x1, y1, z1 } = b;
  const p000 = [x0, y0, z0];
  const p100 = [x1, y0, z0];
  const p110 = [x1, y1, z0];
  const p010 = [x0, y1, z0];
  const p001 = [x0, y0, z1];
  const p101 = [x1, y0, z1];
  const p111 = [x1, y1, z1];
  const p011 = [x0, y1, z1];

  return [
    // Abajo (z0)
    [p000, p110, p100],
    [p000, p010, p110],
    // Arriba (z1)
    [p001, p101, p111],
    [p001, p111, p011],
    // Frente (y0)
    [p000, p100, p101],
    [p000, p101, p001],
    // Atrás (y1)
    [p010, p111, p110],
    [p010, p011, p111],
    // Izquierda (x0)
    [p000, p001, p011],
    [p000, p011, p010],
    // Derecha (x1)
    [p100, p110, p111],
    [p100, p111, p101],
  ];
}

function getQrBoxes(params: Qr3DParams): { baseBox: Box3D; qrBoxes: Box3D[] } {
  const qr = QRCode.create(params.text, {
    errorCorrectionLevel: params.errorCorrection,
  });

  const count = qr.modules.size;
  const data = qr.modules.data;
  const totalSize = params.size + 2 * params.quietZone;
  const halfTotal = totalSize / 2;
  const halfQr = params.size / 2;
  const modSize = params.size / count;

  const baseBox: Box3D = {
    x0: -halfTotal,
    y0: -halfTotal,
    z0: 0,
    x1: halfTotal,
    y1: halfTotal,
    z1: params.fillExtrude,
  };

  const qrBoxes: Box3D[] = [];
  const z0 = params.fillExtrude;
  const z1 = params.fillExtrude + params.codeExtrude;

  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (data[r * count + c]) {
        const x0 = -halfQr + c * modSize;
        const x1 = x0 + modSize;
        const y1 = halfQr - r * modSize;
        const y0 = y1 - modSize;
        qrBoxes.push({ x0, y0, z0, x1, y1, z1 });
      }
    }
  }

  return { baseBox, qrBoxes };
}

// 1. Exportar archivo .STL binario (ultraliviano y rápido para Bambu Studio)
export function downloadQrStl(params: Qr3DParams) {
  const { baseBox, qrBoxes } = getQrBoxes(params);
  const allBoxes = [baseBox, ...qrBoxes];
  const totalTriangles = allBoxes.length * 12;

  const buffer = new ArrayBuffer(84 + totalTriangles * 50);
  const view = new DataView(buffer);

  // Cabecera de 80 bytes
  const headerStr = `ResQ QR 3D (${params.codeName}) - Ushuaia Patagonia`;
  for (let i = 0; i < Math.min(80, headerStr.length); i++) {
    view.setUint8(i, headerStr.charCodeAt(i));
  }

  view.setUint32(80, totalTriangles, true);

  let offset = 84;
  for (const box of allBoxes) {
    const tris = boxToTriangles(box);
    for (const tri of tris) {
      // Normal (0,0,0 para que el slicer la calcule automáticamente)
      view.setFloat32(offset, 0, true);
      view.setFloat32(offset + 4, 0, true);
      view.setFloat32(offset + 8, 0, true);
      offset += 12;

      for (const v of tri) {
        view.setFloat32(offset, v[0], true);
        view.setFloat32(offset + 4, v[1], true);
        view.setFloat32(offset + 8, v[2], true);
        offset += 12;
      }

      // Attribute byte count
      view.setUint16(offset, 0, true);
      offset += 2;
    }
  }

  const blob = new Blob([buffer], { type: 'application/sla' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ResQ_${params.codeName}.stl`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Empaquetador ZIP sin compresión (STORE) para generar archivos .3MF nativos en el navegador
function createZipStore(files: { name: string; content: string }[]): Blob {
  const encoder = new TextEncoder();
  const encodedFiles = files.map((f) => ({
    nameBytes: encoder.encode(f.name),
    dataBytes: encoder.encode(f.content),
  }));

  // Tabla CRC32
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c;
  }

  const crc32 = (bytes: Uint8Array) => {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  };

  let localSize = 0;
  let centralSize = 0;
  for (const f of encodedFiles) {
    localSize += 30 + f.nameBytes.length + f.dataBytes.length;
    centralSize += 46 + f.nameBytes.length;
  }

  const totalZipSize = localSize + centralSize + 22;
  const out = new Uint8Array(totalZipSize);
  const view = new DataView(out.buffer);

  let localOffset = 0;
  const offsets: { offset: number; crc: number }[] = [];

  for (const f of encodedFiles) {
    const crc = crc32(f.dataBytes);
    offsets.push({ offset: localOffset, crc });

    view.setUint32(localOffset, 0x04034b50, true); // Local file header signature
    view.setUint16(localOffset + 4, 20, true); // Version needed
    view.setUint16(localOffset + 6, 0, true); // Flags
    view.setUint16(localOffset + 8, 0, true); // Compression: STORE (0)
    view.setUint16(localOffset + 10, 0, true); // Mod time
    view.setUint16(localOffset + 12, 0, true); // Mod date
    view.setUint32(localOffset + 14, crc, true);
    view.setUint32(localOffset + 18, f.dataBytes.length, true);
    view.setUint32(localOffset + 22, f.dataBytes.length, true);
    view.setUint16(localOffset + 26, f.nameBytes.length, true);
    view.setUint16(localOffset + 28, 0, true);

    out.set(f.nameBytes, localOffset + 30);
    out.set(f.dataBytes, localOffset + 30 + f.nameBytes.length);
    localOffset += 30 + f.nameBytes.length + f.dataBytes.length;
  }

  let centralOffset = localOffset;
  for (let i = 0; i < encodedFiles.length; i++) {
    const f = encodedFiles[i];
    const { offset, crc } = offsets[i];

    view.setUint32(centralOffset, 0x02014b50, true); // Central directory signature
    view.setUint16(centralOffset + 4, 20, true);
    view.setUint16(centralOffset + 6, 20, true);
    view.setUint16(centralOffset + 8, 0, true);
    view.setUint16(centralOffset + 10, 0, true);
    view.setUint16(centralOffset + 12, 0, true);
    view.setUint16(centralOffset + 14, 0, true);
    view.setUint32(centralOffset + 16, crc, true);
    view.setUint32(centralOffset + 20, f.dataBytes.length, true);
    view.setUint32(centralOffset + 24, f.dataBytes.length, true);
    view.setUint16(centralOffset + 28, f.nameBytes.length, true);
    view.setUint16(centralOffset + 30, 0, true);
    view.setUint16(centralOffset + 32, 0, true);
    view.setUint16(centralOffset + 34, 0, true);
    view.setUint16(centralOffset + 36, 0, true);
    view.setUint32(centralOffset + 38, 0, true);
    view.setUint32(centralOffset + 42, offset, true);

    out.set(f.nameBytes, centralOffset + 46);
    centralOffset += 46 + f.nameBytes.length;
  }

  // End of central directory record
  view.setUint32(centralOffset, 0x06054b50, true);
  view.setUint16(centralOffset + 4, 0, true);
  view.setUint16(centralOffset + 6, 0, true);
  view.setUint16(centralOffset + 8, encodedFiles.length, true);
  view.setUint16(centralOffset + 10, encodedFiles.length, true);
  view.setUint32(centralOffset + 12, centralSize, true);
  view.setUint32(centralOffset + 16, localOffset, true);
  view.setUint16(centralOffset + 20, 0, true);

  return new Blob([out.buffer as ArrayBuffer], {
    type: 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml',
  });
}

function boxesToMeshXml(boxes: Box3D[]): string {
  const vertices: string[] = [];
  const triangles: string[] = [];
  let vIdx = 0;

  for (const b of boxes) {
    const { x0, y0, z0, x1, y1, z1 } = b;
    const pts = [
      [x0, y0, z0], // 0
      [x1, y0, z0], // 1
      [x1, y1, z0], // 2
      [x0, y1, z0], // 3
      [x0, y0, z1], // 4
      [x1, y0, z1], // 5
      [x1, y1, z1], // 6
      [x0, y1, z1], // 7
    ];
    for (const p of pts) {
      vertices.push(
        `<vertex x="${p[0].toFixed(4)}" y="${p[1].toFixed(4)}" z="${p[2].toFixed(4)}" />`
      );
    }
    const tris = [
      [0, 2, 1],
      [0, 3, 2],
      [4, 5, 6],
      [4, 6, 7],
      [0, 1, 5],
      [0, 5, 4],
      [3, 6, 2],
      [3, 7, 6],
      [0, 4, 7],
      [0, 7, 3],
      [1, 2, 6],
      [1, 6, 5],
    ];
    for (const t of tris) {
      triangles.push(
        `<triangle v1="${vIdx + t[0]}" v2="${vIdx + t[1]}" v3="${vIdx + t[2]}" />`
      );
    }
    vIdx += 8;
  }

  return `<mesh><vertices>${vertices.join('')}</vertices><triangles>${triangles.join(
    ''
  )}</triangles></mesh>`;
}

// 2. Exportar archivo .3MF con 2 Objetos Separados (Base_Blanca y Codigo_QR_Negro) para Bambu Lab A1 AMS
export function downloadQr3mf(params: Qr3DParams) {
  const { baseBox, qrBoxes } = getQrBoxes(params);

  const baseMeshXml = boxesToMeshXml([baseBox]);
  const qrMeshXml = boxesToMeshXml(qrBoxes);

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>`;

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="es-AR" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06">
  <metadata name="Application">ResQ Ushuaia 3D Generator</metadata>
  <metadata name="Title">ResQ_${params.codeName}</metadata>
  <resources>
    <object id="1" name="Base_Blanca_${params.codeName}" type="model">
      ${baseMeshXml}
    </object>
    <object id="2" name="QR_Negro_${params.codeName}" type="model">
      ${qrMeshXml}
    </object>
    <object id="3" name="Llavero_ResQ_${params.codeName}" type="model">
      <components>
        <component objectid="1" />
        <component objectid="2" />
      </components>
    </object>
  </resources>
  <build>
    <item objectid="3" />
  </build>
</model>`;

  const blob = createZipStore([
    { name: '[Content_Types].xml', content: contentTypesXml },
    { name: '_rels/.rels', content: relsXml },
    { name: '3D/3dmodel.model', content: modelXml },
  ]);

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ResQ_${params.codeName}.3mf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
