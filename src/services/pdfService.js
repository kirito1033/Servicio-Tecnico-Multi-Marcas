const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function formatearFecha(fecha) {
  if (!fecha) return '';
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return '';
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const anio = d.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

function formatearPrecio(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  return `$${Number(valor).toLocaleString('es-CO')}`;
}

function textoLista(lista) {
  if (!Array.isArray(lista) || !lista.length) return 'N/A';
  return lista.join(', ');
}

function obtenerColorEstado(estado) {
  if (!estado) return '#666';
  const estadoLower = estado.toLowerCase();
  
  if (estadoLower.includes('diagnóstico')) return '#1196db';
  if (estadoLower.includes('reparación')) return '#ff9800';
  if (estadoLower.includes('aprobado')) return '#4caf50';
  if (estadoLower.includes('entregado') || estadoLower.includes('listo')) return '#4caf50';
  if (estadoLower.includes('cancelado')) return '#f44336';
  if (estadoLower.includes('espera') || estadoLower.includes('pendiente')) return '#ff9800';
  if (estadoLower.includes('garantía')) return '#9c27b0';
  
  return '#666';
}

function generarOrdenServicioPdf(data) {
  return new Promise((resolve, reject) => {
    try {
      const tempDir = path.join(__dirname, '../../tmp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const pdfPath = path.join(tempDir, `orden_${data.mm || 'test'}_${Date.now()}.pdf`);
      
      const logoNacPath = path.join(__dirname, '../../public/assets/logos/logo_nac.png');
      const logoWefonePath = path.join(__dirname, '../../public/assets/logos/wefone.png');

      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 40,
        bufferPages: true
      });

      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // ========================================
      // PÁGINA 1: ORDEN DE SERVICIO TÉCNICO
      // ========================================

      // Logo NAC
      if (fs.existsSync(logoNacPath)) {
        try {
          doc.image(logoNacPath, 40, 15, { width: 110, height: 50 });
        } catch (err) {
          console.error('Error cargando logo NAC:', err.message);
        }
      }

      doc.font('Helvetica-Bold')
        .fontSize(16)
        .fillColor('#1196db')
        .text('NAC COMUNICACIONES SAS', 160, 20);

      doc.font('Helvetica')
        .fontSize(9)
        .fillColor('#000')
        .text('NIT: 830.514.467-7 | Calle 78 #24-50, Bogotá D.C.', 160, 38)
        .text('Tel: (601) 477 1261 | WhatsApp: 311 279 4908', 160, 50);

      // Logo Wefone
      if (fs.existsSync(logoWefonePath)) {
        try {
          doc.image(logoWefonePath, 445, 1, { width: 100});
        } catch (err) {
          console.error('Error cargando logo Wefone:', err.message);
        }
      }

      doc.moveTo(40, 79).lineTo(555, 79).strokeColor('#1196db').lineWidth(2).stroke();

      doc.font('Helvetica-Bold')
        .fontSize(18)
        .fillColor('#1196db')
        .text('ORDEN DE SERVICIO TÉCNICO', 40, 87);

      doc.font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#000')
        .text(`Código: ${data.mm || 'N/A'}`, 400, 89, { align: 'right' });

      doc.font('Helvetica')
        .fontSize(10)
        .text(`Sucursal: ${data.sucursal || 'UNILAGO'}`, 400, 105, { align: 'right' });

      let y = 129;

      const seccion = (titulo) => {
        doc.rect(40, y, 515, 20).fillAndStroke('#e8f4f8', '#1196db');
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#1196db').text(titulo, 45, y + 5);
        y += 25;
      };

      const campo = (label, value, x = 40) => {
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#222').text(`${label}:`, x, y);
        doc.font('Helvetica').fontSize(9).fillColor('#222').text(value || 'N/A', x + 120, y, { width: 170 });
        y += 16;
      };

      // CLIENTE
      seccion('INFORMACIÓN DEL CLIENTE');
      const yInicio = y;
      campo('Nombre', `${data.nombre || ''} ${data.apellido || ''}`.trim(), 40);
      campo('Tipo de ID', data.tipo_identificacion || 'N/A', 40);
      campo('Teléfono', data.telefono || 'N/A', 40);
      
      y = yInicio;
      campo('Nro. Identificación', data.numero_identificacion || 'N/A', 305);
      campo('Correo', data.email || 'N/A', 305);
      
      y += 16 * 3 + 8;

      // EQUIPO
      seccion('INFORMACIÓN DEL EQUIPO');
      const yEquipo = y;
      campo('Modelo', data.modelo || 'N/A', 40);
      campo('IMEI / SN', data.sn || 'N/A', 40);
      
      y = yEquipo;
      campo('Color', data.color || 'N/A', 305);
      campo('Contraseña', data.contrasena || 'N/A', 305);
      
      y += 16 * 2 + 8;

      // SERVICIO
      seccion('DETALLE DEL SERVICIO');

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#222').text('Falla reportada:', 40, y);
      y += 14;
      doc.font('Helvetica').fontSize(9).fillColor('#222').text(data.falla || 'N/A', 40, y, { width: 515 });
      y += Math.min(doc.heightOfString(data.falla || 'N/A', { width: 515 }), 35) + 8;

      doc.font('Helvetica-Bold').fontSize(9).text('Apariencia:', 40, y);
      y += 14;
      doc.font('Helvetica').fontSize(9).text(data.apariencia || 'N/A', 40, y, { width: 515 });
      y += Math.min(doc.heightOfString(data.apariencia || 'N/A', { width: 515 }), 35) + 8;

      doc.font('Helvetica-Bold').fontSize(9).text('Accesorios:', 40, y);
      y += 14;
      doc.font('Helvetica').fontSize(9).text(textoLista(data.accesorios), 40, y, { width: 515 });
      y += Math.min(doc.heightOfString(textoLista(data.accesorios), { width: 515 }), 25) + 8;

      doc.font('Helvetica-Bold').fontSize(9).text('Diagnóstico:', 40, y);
      y += 14;
      doc.font('Helvetica').fontSize(9).text(data.diagnostico || 'N/A', 40, y, { width: 515 });
      y += Math.min(doc.heightOfString(data.diagnostico || 'N/A', { width: 515 }), 35) + 12;

      // COMPONENTES
      if (data.componentes && Object.keys(data.componentes).length > 0) {
        seccion('PRUEBAS DE COMPONENTES');

        const comp = data.componentes;
        const componentesTexto = Object.entries(comp).map(([nombre, estados]) => {
          const estado = Array.isArray(estados) ? estados.join(', ') : estados;
          return `${nombre}: ${estado}`;
        }).join(' | ');

        doc.font('Helvetica').fontSize(8).fillColor('#222').text(componentesTexto, 40, y, { width: 515 });
        y += Math.min(doc.heightOfString(componentesTexto, { width: 515 }), 35) + 12;
      }

      // FACTURACIÓN
      seccion('DETALLE DE FACTURACIÓN');

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#222')
        .text('Descripción', 45, y)
        .text('Técnico', 180, y)
        .text('F. Ingreso', 290, y)
        .text('F. Entrega', 380, y)
        .text('Precio', 480, y);

      y += 18;

      doc.font('Helvetica').fontSize(9).fillColor('#222')
        .text('Servicio técnico', 45, y)
        .text(data.tecnico || 'N/A', 180, y, { width: 100 })
        .text(formatearFecha(data.fecha_ingreso), 290, y)
        .text(formatearFecha(data.fecha_egreso), 380, y)
        .text(formatearPrecio(data.precio), 480, y);

      y += 28;

      const colorEstado = obtenerColorEstado(data.estado);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(colorEstado)
        .text(`Estado del servicio: ${data.estado || 'N/A'}`, 40, y);

      y += 46;

      // FIRMA
      doc.moveTo(220, y).lineTo(380, y).strokeColor('#222').lineWidth(1).stroke();
      y += 10;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#222').text('Firma del cliente', 250, y);

      y += 25;
      doc.font('Helvetica').fontSize(8).fillColor('#555')
        .text(
          'He leído, comprendido y acepto los términos y condiciones de garantía detallados de los productos y servicios ofrecidos por NAC COMUNICACIONES SAS.',
          40,
          y,
          { width: 515, align: 'justify' }
        );

            // ========================================
      // PÁGINA 2: TÉRMINOS Y CONDICIONES
      // ========================================

      doc.addPage();
      y = 40;

      // Encabezado compacto
      if (fs.existsSync(logoNacPath)) {
        try {
          doc.image(logoNacPath, 40, 15, { width: 110, height: 50 });
        } catch (err) {
          console.error('Error cargando logo NAC:', err.message);
        }
      }

      if (fs.existsSync(logoWefonePath)) {
        try {
          doc.image(logoWefonePath, 445, 1, { width: 100});
        } catch (err) {
          console.error('Error cargando logo Wefone:', err.message);
        }
      }

      y += 38;

      // Título - 10px (reducido)
      doc.font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#f44336')
        .text('TÉRMINOS Y CONDICIONES DE GARANTÍA PARA PRODUCTOS Y/O SERVICIO TÉCNICO', 40, y, { width: 515, align: 'center' });

      y += 18;

      // Primer bloque - TEXTO EXACTO DEL DOCX
      const terminos1 = `Para servicio de cambio de cristales se corre el riesgo de daño en display; tales daños pueden ser líneas, manchas, burbujas o pérdida total o parcial de imagen. No cubre garantía si el equipo no cuenta con los sellos internos de seguridad, que garantizan que el equipo no ha sido manipulado por terceros. Para la recepción del equipo y/o cualquier trámite de garantía se debe presentar la factura. Una vez realizada la recepción del equipo se entregará un documento de ingreso a garantía y/o servicio técnico; al firmar el citado documento, el cliente acepta los términos de garantía aquí planteados y cualquier modificación que se realice al software y/o desarme de equipo. En caso de requerir cambio de componentes adicionales al diagnóstico inicial se le comunicará al número de contacto indicado por el cliente para darle a conocer los costos que pueda conllevar la reparación; costos adicionales que deberán ser aprobados por el cliente dentro de los cinco (5) días hábiles para poder realizar el servicio técnico. Los periodos de garantías iniciarán a partir de la fecha de compra y serán los dispuestos a continuación:`;

      doc.font('Helvetica')
        .fontSize(8.3)
        .fillColor('#000')
        .text(terminos1, 40, y, { width: 515, align: 'justify', lineGap: 0.8 });

      y += doc.heightOfString(terminos1, { width: 515, lineGap: 0.8 }) + 7;

      // Tabla de garantías
      const tablaY = y;
      doc.rect(40, tablaY, 170, 18).fillAndStroke('#1196db', '#1196db');
      doc.rect(210, tablaY, 180, 18).fillAndStroke('#1196db', '#1196db');
      doc.rect(390, tablaY, 165, 18).fillAndStroke('#1196db', '#1196db');

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff')
        .text('PRODUCTO', 45, tablaY + 5, { width: 160, align: 'left' })
        .text('DESCRIPCIÓN', 215, tablaY + 5, { width: 170, align: 'left' })
        .text('GARANTÍA', 395, tablaY + 5, { width: 155, align: 'left' });

      const productos = [
        ['Protectores', 'Protectores Dispositivos', 'Tres (3) meses de garantía'],
        ['Forros', 'Forro en Cuero o Sintéticos', 'Tres (3) meses de garantía'],
        ['Accesorios', 'Bluetooth - Manos Libres\nBaterías - Cargadores\nCables', 'Tres (3) meses de garantía'],
        ['Dispositivos Móviles', 'Celulares - Smartphone', 'Doce (12) meses de garantía'],
        ['Repuestos', 'Todos los Repuestos o Refacciones', 'Tres (3) meses de garantía'],
        ['Protectores de Pantalla', 'Todos los Protectores', 'No aplica garantía']
      ];

      y = tablaY + 18;

      productos.forEach((row, index) => {
        const bgColor = index % 2 === 0 ? '#f5f5f5' : '#ffffff';
        const altura = index === 2 ? 26 : 16;

        doc.rect(40, y, 170, altura).fillAndStroke(bgColor, '#ccc');
        doc.rect(210, y, 180, altura).fillAndStroke(bgColor, '#ccc');
        doc.rect(390, y, 165, altura).fillAndStroke(bgColor, '#ccc');

        doc.font('Helvetica').fontSize(7.5).fillColor('#000')
          .text(row[0], 45, y + 3, { width: 160, align: 'left' })
          .text(row[1], 215, y + 3, { width: 170, align: 'left', lineGap: 0.5 })
          .text(row[2], 395, y + 3, { width: 155, align: 'left' });

        y += altura;
      });

      y += 7;

      // Excepciones - TEXTO EXACTO DEL DOCX
      const excepciones = `* Se exceptúan las reparaciones correspondientes a actualizaciones o cambios de software, los cuales no tienen garantía. * Equipos que presenten problemas de humedad, golpes, descargas eléctricas, conexiones inapropiadas, mal uso y/o manipulaciones realizados por el cliente y/o terceros, los cuales no aplicarán para efectos de garantía tanto en productos como en servicios técnicos. * Cuando los repuestos para la refacción han sido suministrados por el cliente.`;

      doc.font('Helvetica-Oblique')
        .fontSize(8.3)
        .fillColor('#000')
        .text(excepciones, 40, y, { width: 515, align: 'justify', lineGap: 0.8 });

      y += doc.heightOfString(excepciones, { width: 515, lineGap: 0.8 }) + 8;

      // Segundo bloque - TEXTO EXACTO DEL DOCX
      const terminos2 = `En caso de que el equipo se encuentre apagado al momento del ingreso al servicio técnico, NAC COMUNICACIONES S.A.S. no garantiza el correcto funcionamiento del mismo al momento de la entrega. Por tal motivo, se sugiere que el equipo a servicio técnico venga cargado. Pasados los treinta (30) días calendario, luego de dejado el equipo en garantía, se requerirá al cliente para el retiro del equipo a los datos de contacto suministrados al momento del ingreso; después de sesenta (60) días de esta comunicación, si el dispositivo no es reclamado, se entenderá como abandono del mismo y NAC COMUNICACIONES S.A.S dispondrá del mismo conforme con la reglamentación que expida el Gobierno Nacional. En este caso el cliente deberá asumir los costos asociados al abandono del dispositivo, tales como almacenamiento, bodegaje y mantenimiento. NAC COMUNICACIONES S.A.S no se hace responsable por pérdida de información tanto en memoria interna como en memoria externa de los dispositivos ingresados a garantía y/o servicio técnico. NAC COMUNICACIONES S.A.S no se hará responsable de aquellos componentes que al momento del servicio técnico el cliente no extraiga, tales como cables, cargadores, simcard, micro SD y/o accesorios, etc. El valor correspondiente al diagnóstico será abonado a la reparación en caso de ser autorizada; de no ser reparado solo se cancelará el valor correspondiente al diagnóstico. La garantía solo cubre los componentes cambiados y/o relacionados con la reparación. Para entrega de equipos dejados en revisión técnica, se requiere presentar el documento de ingreso a garantía y/o servicio técnico en original; en caso de que se autorice a un tercero a reclamar el dispositivo, este deberá presentar una carta de autorización junto con copia de cédula del titular y de quien recibe el equipo. En caso de pérdida de dicho ticket deberá presentar documento de identificación con el cual realizó el ingreso.`;

      doc.font('Helvetica')
        .fontSize(8.3)
        .fillColor('#000')
        .text(terminos2, 40, y, { width: 515, align: 'justify', lineGap: 0.8 });

      doc.end();


      stream.on('finish', () => {
        console.log('PDF generado exitosamente:', pdfPath);
        resolve(pdfPath);
      });

      stream.on('error', (err) => {
        console.error('Error en el stream del PDF:', err);
        reject(err);
      });

    } catch (error) {
      console.error('Error en generarOrdenServicioPdf:', error);
      reject(error);
    }
  });
}

module.exports = {
  generarOrdenServicioPdf
};