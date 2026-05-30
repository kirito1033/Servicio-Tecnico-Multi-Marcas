// src/services/firmas.service.js
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const { PDFDocument } = require('pdf-lib'); // <-- NUEVO

const PDF_ORIG_DIR = path.join(__dirname, '..', 'pdf_original');
const PDF_FIRMADO_DIR = path.join(__dirname, '..', 'pdf_firmado');

// Asegurar carpetas
if (!fs.existsSync(PDF_ORIG_DIR)) {
  fs.mkdirSync(PDF_ORIG_DIR, { recursive: true });
}
if (!fs.existsSync(PDF_FIRMADO_DIR)) {
  fs.mkdirSync(PDF_FIRMADO_DIR, { recursive: true });
}

// Crear sesión de firma a partir de un archivo ya guardado
// src/services/firmas.service.js
async function crearSesion(descripcion, pdfAbsolutePath, page = 1, xPercent = 50, yPercent = 50) {
  if (!pdfAbsolutePath) throw new Error('Ruta del PDF requerida');

  if (!fs.existsSync(pdfAbsolutePath)) {
    throw new Error('El PDF original no existe en el servidor');
  }

  const token = crypto.randomBytes(16).toString('hex');

  await pool.query(
    `INSERT INTO sesiones_firma (descripcion, token, pdf_original_path, pagina_firmada, pos_x, pos_y)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [descripcion || null, token, pdfAbsolutePath, page, xPercent, yPercent]
  );

  return { token };
}

// Obtener una sesión por token
async function obtenerSesionPorToken(token) {
  const [rows] = await pool.query(
    `SELECT *
     FROM sesiones_firma
     WHERE token = ?
     LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}

// Generar PDF firmado insertando la firma en el documento original
async function generarPdfFirmado(pdfOriginalPath, firmaBase64, page, xPercent, yPercent) {
  if (!pdfOriginalPath) {
    throw new Error('Ruta del PDF original no definida');
  }
  if (!fs.existsSync(pdfOriginalPath)) {
    throw new Error('El PDF original no existe en el servidor');
  }

  // 1. Leer el PDF original
  const pdfBytes = fs.readFileSync(pdfOriginalPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // 2. Convertir la firma (data:image/png;base64,...) a buffer
  const firmaBuffer = Buffer.from(firmaBase64.split(',')[1], 'base64');

  // 3. Incrustar la imagen de la firma en el PDF
  const firmaImage = await pdfDoc.embedPng(firmaBuffer);

  // 4. Seleccionar la página (índice empieza en 0)
  const pageIndex = Math.max(0, (page || 1) - 1);
  const pages = pdfDoc.getPages();
  if (pageIndex >= pages.length) {
    throw new Error(`La página ${page} no existe en el documento`);
  }
  const targetPage = pages[pageIndex];

  // 5. Dimensiones de la página
  const { width: pageWidth, height: pageHeight } = targetPage.getSize();

  // 6. Dimensiones de la firma (ajusta según prefieras)
  const firmaWidth = 150;
  const firmaHeight = (firmaImage.height / firmaImage.width) * firmaWidth;

  // 7. Convertir porcentajes a coordenadas reales
  // En PDF, Y=0 está en la parte INFERIOR, así que invertimos yPercent
  const posX = (xPercent / 100) * pageWidth - (firmaWidth / 2);
  const posY = ((100 - yPercent) / 100) * pageHeight - (firmaHeight / 2);

  // 8. Dibujar la firma en la página
  targetPage.drawImage(firmaImage, {
    x: Math.max(0, posX),
    y: Math.max(0, posY),
    width: firmaWidth,
    height: firmaHeight
  });

  // 9. Guardar el PDF firmado
  const pdfFirmadoBytes = await pdfDoc.save();
  const fileName = `firmado_${Date.now()}.pdf`;
  const destino = path.join(PDF_FIRMADO_DIR, fileName);

  fs.writeFileSync(destino, pdfFirmadoBytes);

  return destino;
}

// Marcar sesión como firmada en la BD
async function marcarSesionFirmada(token, datos) {
  const {
    pagina,
    x,
    y,
    pdfFirmadoPath,
    ip,
    userAgent
  } = datos;

  await pool.query(
    `UPDATE sesiones_firma
     SET estado = 'firmado',
         firmado_en = NOW(),
         pagina_firmada = ?,
         pos_x = ?,
         pos_y = ?,
         pdf_firmado_path = ?,
         ip_firmante = ?,
         user_agent = ?
     WHERE token = ?`,
    [pagina, x, y, pdfFirmadoPath, ip || null, userAgent || null, token]
  );
}

module.exports = {
  PDF_ORIG_DIR,
  crearSesion,
  obtenerSesionPorToken,
  generarPdfFirmado,
  marcarSesionFirmada
};