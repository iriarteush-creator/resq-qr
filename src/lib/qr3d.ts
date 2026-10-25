// Generador 3D Nativo (.STL y .3MF Bicolor para Bambu Studio)
// Soporta QR Cuadrado y QR Redondo (Medallón Circular y con Ojal de Llavero)

import QRCode from 'qrcode';

export type QrBaseShape = 'square' | 'round' | 'round_keychain';
export type QrModuleStyle = 'square' | 'round';

export interface Qr3DParams {
  text: string;
  codeName: string;
  size: number; // SIZE en mm (diámetro o lado exterior del área QR, por defecto 50)
  quietZone: number; // QUIET_ZONE margen blanco en mm (por defecto 2)
  fillExtrude: number; // FILL_EXTRUDE espesor base en mm (por defecto 1.0)
  codeExtrude: number; // CODE_EXTRUDE altura relieve QR en mm (por defecto 0.6)
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
  baseShape?: QrBaseShape; // 'square' | 'round' | 'round_keychain'
  moduleStyle?: QrModuleStyle; // 'square' | 'round'
}

interface Box3D {
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
}

type Tri3D = [number[], number[], number[]];

// Genera los 12 triángulos de un prisma rectangular 3D
function boxToTriangles(b: Box3D): Tri3D[] {
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
    [p000, p110, p100],
    [p000, p010, p110],
    [p001, p101, p111],
    [p001, p111, p011],
    [p000, p100, p101],
    [p000, p101, p001],
    [p010, p111, p110],
    [p010, p011, p111],
    [p000, p001, p011],
    [p000, p011, p010],
    [p100, p110, p111],
    [p100, p111, p101],
  ];
}

// Genera los triángulos de un cilindro sólido (para base circular o módulos redondeados)
function cylinderToTriangles(
  cx: number,
  cy: number,
  r: number,
  z0: number,
  z1: number,
  segments = 64
): Tri3D[] {
  const tris: Tri3D[] = [];
  const bottomCenter = [cx, cy, z0];
  const topCenter = [cx, cy, z1];

  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;

    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);

    const b0 = [x0, y0, z0];
    const b1 = [x1, y1, z0];
    const t0 = [x0, y0, z1];
    const t1 = [x1, y1, z1];

    // Tapa inferior
    tris.push([bottomCenter, b1, b0]);
    // Tapa superior
    tris.push([topCenter, t0, t1]);
    // Pared lateral
    tris.push([b0, b1, t1]);
    tris.push([b0, t1, t0]);
  }

  return tris;
}

// Genera un anillo / arandela con agujero central (para el ojal del llavero)
function ringToTriangles(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  z0: number,
  z1: number,
  segments = 36
): Tri3D[] {
  const tris: Tri3D[] = [];

  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;

    const cos0 = Math.cos(a0);
    const sin0 = Math.sin(a0);
    const cos1 = Math.cos(a1);
    const sin1 = Math.sin(a1);

    const inB0 = [cx + rInner * cos0, cy + rInner * sin0, z0];
    const inB1 = [cx + rInner * cos1, cy + rInner * sin1, z0];
    const outB0 = [cx + rOuter * cos0, cy + rOuter * sin0, z0];
    const outB1 = [cx + rOuter * cos1, cy + rOuter * sin1, z0];

    const inT0 = [cx + rInner * cos0, cy + rInner * sin0, z1];
    const inT1 = [cx + rInner * cos1, cy + rInner * sin1, z1];
    const outT0 = [cx + rOuter * cos0, cy + rOuter * sin0, z1];
    const outT1 = [cx + rOuter * cos1, cy + rOuter * sin1, z1];

    // Cara inferior
    tris.push([inB0, outB1, outB0]);
    tris.push([inB0, inB1, outB1]);
    // Cara superior
    tris.push([inT0, outT0, outT1]);
    tris.push([inT0, outT1, inT1]);
    // Pared exterior
    tris.push([outB0, outB1, outT1]);
    tris.push([outB0, outT1, outT0]);
    // Pared interior (agujero)
    tris.push([inB0, inT1, inB1]);
    tris.push([inB0, inT0, inT1]);
  }

  return tris;
}

// Verifica si el módulo pertenece a uno de los 3 patrones de posición (esquinas 7x7)
function isFinderPattern(r: number, c: number, count: number): boolean {
  if (r < 7 && c < 7) return true;
  if (r < 7 && c >= count - 7) return true;
  if (r >= count - 7 && c < 7) return true;
  return false;
}

function buildQrMeshes(params: Qr3DParams): {
  baseTris: Tri3D[];
  qrTris: Tri3D[];
} {
  const qr = QRCode.create(params.text, {
    errorCorrectionLevel: params.errorCorrection,
  });

  const count = qr.modules.size;
  const data = qr.modules.data;
  const shape = params.baseShape || 'square';
  const modStyle = params.moduleStyle || 'square';

  const baseTris: Tri3D[] = [];
  const qrTris: Tri3D[] = [];

  // Si la base es redonda, inscribimos el cuadrado del QR dentro del círculo
  // para que las 4 esquinas del QR nunca sobresalgan del disco circular
  const totalOuterDiameter = params.size + 2 * params.quietZone;
  const outerRadius = totalOuterDiameter / 2;

  // En modo redondo, el lado del cuadrado QR inscrito es ( Diámetro - 2*quietZone ) / sqrt(2)
  const effectiveQrSpan =
    shape === 'square'
      ? params.size
      : Math.max(12, (totalOuterDiameter - 2 * params.quietZone) / Math.SQRT2);

  const halfQr = effectiveQrSpan / 2;
  const modSize = effectiveQrSpan / count;

  // 1. Construir Base Blanca (Cuadrada o Redonda)
  if (shape === 'square') {
    const halfTotal = totalOuterDiameter / 2;
    baseTris.push(
      ...boxToTriangles({
        x0: -halfTotal,
        y0: -halfTotal,
        z0: 0,
        x1: halfTotal,
        y1: halfTotal,
        z1: params.fillExtrude,
      })
    );
  } else {
    // Disco circular principal de 72 lados suaves
    baseTris.push(...cylinderToTriangles(0, 0, outerRadius, 0, params.fillExtrude, 72));

    // Si eligió "Redondo + Ojal Llavero", agregar oreja superior con perforación de 4mm
    if (shape === 'round_keychain') {
      const tabOuterR = 5.5;
      const tabInnerR = 2.2; // Agujero de 4.4mm de diámetro
      const tabY = outerRadius + 2.5;
      baseTris.push(
        ...ringToTriangles(0, tabY, tabInnerR, tabOuterR, 0, params.fillExtrude, 36)
      );
    }
  }

  // 2. Construir Módulos del Código QR Negro (y marco anular decorativo si es redondo)
  const z0 = params.fillExtrude;
  const z1 = params.fillExtrude + params.codeExtrude;

  if (shape !== 'square') {
    // Aro perimetral negro táctico de 1.2mm de ancho alrededor del medallón circular
    const rimOuter = outerRadius - 0.8;
    const rimInner = rimOuter - 1.2;
    if (rimInner > halfQr * Math.SQRT2) {
      qrTris.push(...ringToTriangles(0, 0, rimInner, rimOuter, z0, z1, 72));
    }
  }

  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (data[r * count + c]) {
        const x0 = -halfQr + c * modSize;
        const x1 = x0 + modSize;
        const y1 = halfQr - r * modSize;
        const y0 = y1 - modSize;

        if (modStyle === 'round' && !isFinderPattern(r, c, count)) {
          const cx = (x0 + x1) / 2;
          const cy = (y0 + y1) / 2;
          qrTris.push(...cylinderToTriangles(cx, cy, modSize * 0.48, z0, z1, 16));
        } else {
          qrTris.push(...boxToTriangles({ x0, y0, z0, x1, y1, z1 }));
        }
      }
    }
  }

  return { baseTris, qrTris };
}

// 1. Exportar archivo .STL binario
export function downloadQrStl(params: Qr3DParams) {
  const { baseTris, qrTris } = buildQrMeshes(params);
  const allTris = [...baseTris, ...qrTris];
  const totalTriangles = allTris.length;

  const buffer = new ArrayBuffer(84 + totalTriangles * 50);
  const view = new DataView(buffer);

  const headerStr = `ResQ QR 3D (${params.codeName}) - Ushuaia Patagonia`;
  for (let i = 0; i < Math.min(80, headerStr.length); i++) {
    view.setUint8(i, headerStr.charCodeAt(i));
  }

  view.setUint32(80, totalTriangles, true);

  let offset = 84;
  for (const tri of allTris) {
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

    view.setUint16(offset, 0, true);
    offset += 2;
  }

  const shapeSuffix =
    params.baseShape && params.baseShape !== 'square' ? `_${params.baseShape}` : '';
  const blob = new Blob([buffer], { type: 'application/sla' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ResQ_${params.codeName}${shapeSuffix}.stl`;
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

    view.setUint32(localOffset, 0x04034b50, true);
    view.setUint16(localOffset + 4, 20, true);
    view.setUint16(localOffset + 6, 0, true);
    view.setUint16(localOffset + 8, 0, true);
    view.setUint16(localOffset + 10, 0, true);
    view.setUint16(localOffset + 12, 0, true);
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

    view.setUint32(centralOffset, 0x02014b50, true);
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

function trianglesToMeshXml(tris: Tri3D[]): string {
  const vertices: string[] = [];
  const triangles: string[] = [];
  let vIdx = 0;

  for (const tri of tris) {
    for (const p of tri) {
      vertices.push(
        `<vertex x="${p[0].toFixed(4)}" y="${p[1].toFixed(4)}" z="${p[2].toFixed(4)}" />`
      );
    }
    triangles.push(`<triangle v1="${vIdx}" v2="${vIdx + 1}" v3="${vIdx + 2}" />`);
    vIdx += 3;
  }

  return `<mesh><vertices>${vertices.join('')}</vertices><triangles>${triangles.join(
    ''
  )}</triangles></mesh>`;
}

// 2. Exportar archivo .3MF con 2 Objetos Separados (Base_Blanca y Codigo_QR_Negro) para Bambu Lab A1 AMS
export function downloadQr3mf(params: Qr3DParams) {
  const { baseTris, qrTris } = buildQrMeshes(params);

  const baseMeshXml = trianglesToMeshXml(baseTris);
  const qrMeshXml = trianglesToMeshXml(qrTris);

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

  const shapeSuffix =
    params.baseShape && params.baseShape !== 'square' ? `_${params.baseShape}` : '';
  const blob = createZipStore([
    { name: '[Content_Types].xml', content: contentTypesXml },
    { name: '_rels/.rels', content: relsXml },
    { name: '3D/3dmodel.model', content: modelXml },
  ]);

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ResQ_${params.codeName}${shapeSuffix}.3mf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
