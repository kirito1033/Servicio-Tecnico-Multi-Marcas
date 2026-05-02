const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const hoy = new Date().toISOString().slice(0, 10); // 2026-05-02
const nombreArchivo = `ingresos_pendientes_${hoy}.pdf`;
const ingresosFacturaService = require('../services/ingresosFactura.service');

async function buscarOrdenesPorMM(req, res) {
  try {
    const q = (req.query.q || '').trim();

    if (!q) {
      return res.status(200).json([]);
    }

    const ordenes = await ingresosFacturaService.buscarOrdenesPorMM(q);
    return res.status(200).json(ordenes);
  } catch (error) {
    console.error('Error en buscarOrdenesPorMM:', error);
    return res.status(500).json({
      message: 'Error al buscar órdenes por MM',
      error: error.message
    });
  }
}

async function crearIngresoFactura(req, res) {
  try {

    const {
      orden_servicio_id,
      nombre_repuesto,
      vendedor,
      precio_compra,
      precio_venta
    } = req.body;


    const nuevoIngreso = await ingresosFacturaService.crearIngresoFactura({
      orden_servicio_id: Number(orden_servicio_id),
      nombre_repuesto: nombre_repuesto.trim(),
      vendedor: vendedor.trim(),
      precio_compra: Number(precio_compra || 0),
      precio_venta: Number(precio_venta || 0)
    });



    return res.status(201).json({
      message: 'Ingreso guardado correctamente',
      data: nuevoIngreso
    });

  } catch (error) {
    console.error('ERROR:', error);
    return res.status(500).json({
      message: 'Error al guardar el ingreso',
      error: error.message
    });
  }
}

async function listarOrdenesParaIngresos(req, res) {
  try {
    const data = await ingresosFacturaService.listarOrdenesParaIngresos();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error en listarOrdenesParaIngresos:', error);
    return res.status(500).json({
      message: 'Error al listar órdenes para ingresos'
    });
  }
}

async function obtenerIngresosFactura(req, res) {
  try {
    const rows = await ingresosFacturaService.listarIngresosFactura();

    return res.status(200).json({
      data: rows
    });
  } catch (error) {
    console.error('❌ Error obteniendo ingresos de repuestos:', error);
    return res.status(500).json({
      message: 'Error al consultar ingresos de repuestos'
    });
  }
}

async function actualizarIngresoFactura(req, res) {
  try {
    const id = req.params.id;
    const data = req.body;

    await ingresosFacturaService.actualizarIngresoFactura(id, data);

    res.json({ message: 'Actualizado' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}



async function descargarPdfIngresos(req, res) {
  try {
    const rows = await ingresosFacturaService.listarIngresosFacturaParaPdf();

    const doc = new PDFDocument({
      margin: 40,
      size: 'A4'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${nombreArchivo}"`);

    doc.pipe(res);

    const logoIzq = path.normalize('C:/xampp/htdocs/backend-servicio-tecnico/public/assets/logos/logo_nac.png');
    const logoDer = path.normalize('C:/xampp/htdocs/backend-servicio-tecnico/public/assets/logos/wefone.png');

    const pageWidth = doc.page.width;
    const usableWidth = pageWidth - 80;

    if (fs.existsSync(logoIzq)) {
    doc.image(logoIzq, 24, 24, { width: 88 });
  }

    if (fs.existsSync(logoDer)) {
      doc.image(logoDer, pageWidth - 118, 24, { width: 78 });
    }

    doc
      .fillColor('#0f172a')
      .font('Helvetica-Bold')
      .fontSize(20)
      .text('Listado de ingresos de repuestos', 0, 38, {
        align: 'center'
      });

    doc
      .moveDown(0.3)
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#64748b')
      .text(`Fecha de generación: ${new Date().toLocaleDateString('es-CO')}`, {
        align: 'center'
      });

    let y = 110;

    doc
      .roundedRect(40, y, usableWidth, 46, 10)
      .fillAndStroke('#f8fafc', '#dbe3ea');

    doc
      .fillColor('#0f172a')
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(`Total de ingresos: ${rows.length}`, 55, y + 15);

    y += 64;

    if (!rows.length) {
      doc
        .roundedRect(40, y, usableWidth, 60, 12)
        .fillAndStroke('#ffffff', '#e5e7eb');

      doc
        .fillColor('#475569')
        .font('Helvetica')
        .fontSize(12)
        .text('No hay ingresos disponibles para mostrar.', 60, y + 22);

      doc.end();
      return;
    }

    const columns = {
      mm: 40,
      repuesto: 110,
      vendedor: 245,
      compra: 355,
      venta: 430,
      estado: 500
    };

    function drawHeader() {
      doc
        .roundedRect(40, y, usableWidth, 30, 8)
        .fill('#0f766e');

      doc
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(9);

      doc.text('MM', columns.mm + 6, y + 10, { width: 60 });
      doc.text('Repuesto', columns.repuesto + 6, y + 10, { width: 120 });
      doc.text('Vendedor', columns.vendedor + 6, y + 10, { width: 95 });
      doc.text('Compra', columns.compra + 6, y + 10, { width: 65 });
      doc.text('Venta', columns.venta + 6, y + 10, { width: 65 });
      doc.text('Estado', columns.estado + 6, y + 10, { width: 70 });

      y += 36;
    }

    function drawRow(row, index) {
      const rowHeight = 32;
      const bgColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';

      doc
        .roundedRect(40, y - 1, usableWidth, rowHeight, 6)
        .fillAndStroke(bgColor, '#edf2f7');

      doc
        .fillColor('#111827')
        .font('Helvetica')
        .fontSize(8.5);

      doc.text(String(row.mm || '-'), columns.mm + 6, y + 10, { width: 60 });
      doc.text(String(row.nombre_repuesto || '-'), columns.repuesto + 6, y + 10, { width: 120 });
      doc.text(String(row.vendedor || '-'), columns.vendedor + 6, y + 10, { width: 95 });
      doc.text(`$${Number(row.precio_compra || 0).toLocaleString('es-CO')}`, columns.compra + 6, y + 10, { width: 65 });
      doc.text(`$${Number(row.precio_venta || 0).toLocaleString('es-CO')}`, columns.venta + 6, y + 10, { width: 65 });
      doc.text(String(row.estado || '-'), columns.estado + 6, y + 10, { width: 70 });

      y += 36;
    }

    drawHeader();

    rows.forEach((row, index) => {
      if (y > 735) {
        doc.addPage();
        y = 30;

        if (fs.existsSync(logoIzq)) {
          doc.image(logoIzq, 40, 18, { width: 60 });
        }

        if (fs.existsSync(logoDer)) {
          doc.image(logoDer, pageWidth - 100, 18, { width: 60 });
        }

        doc
          .fillColor('#0f172a')
          .font('Helvetica-Bold')
          .fontSize(16)
          .text('Listado de ingresos de repuestos', 0, 28, {
            align: 'center'
          });

        y = 74;
        drawHeader();
      }

      drawRow(row, index);
    });

    doc.end();
  } catch (error) {
    console.error('Error generando PDF de ingresos:', error);
    res.status(500).json({
      message: 'Error al generar el PDF de ingresos',
      error: error.message
    });
  }
}

module.exports = {
  buscarOrdenesPorMM,
  crearIngresoFactura,
  listarOrdenesParaIngresos,
  obtenerIngresosFactura,
  actualizarIngresoFactura,
  descargarPdfIngresos
};