import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Configuración del SDK de Gemini en el servidor
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

app.use(express.json({ limit: '50mb' }));

// Endpoint de IA para analizar estados de cuenta bancarios (PDFs, imágenes o texto)
app.post('/api/parse-statement', async (req, res) => {
  try {
    const { fileName, base64Content, textContent } = req.body;

    if (!base64Content && !textContent) {
      return res.status(400).json({ error: 'Se requiere contenido en base64 o texto del estado de cuenta.' });
    }

    const systemPrompt = `Eres un experto en contabilidad y sistemas bancarios de Venezuela. 
Analiza el archivo o texto del estado de cuenta bancario para la empresa "AGRICOLA ONI, C.A." (RIF J-50145638-0).
Tu objetivo es identificar el banco (bancamiga, mercantil, plaza, provincial, banesco) y extraer todas las transacciones con los siguientes campos:
1. bankId: 'bancamiga' | 'mercantil' | 'plaza' | 'provincial' | 'banesco'
2. initialBalance: saldo inicial o saldo anterior del estado de cuenta en Bs. si está presente
3. endingBalance: saldo final o saldo de cierre del estado de cuenta bancario en Bs. (fundamental para comparar y conciliar con el total de operaciones)
4. transactions: lista de transacciones. Para cada una:
   - date: fecha en formato YYYY-MM-DD
   - reference: número de referencia u operación
   - description: descripción exacta de la transacción
   - amountBs: monto positivo para créditos/entradas, monto negativo para débitos/salidas (en Bolívares)
   - category: clasifica estrictamente entre:
     * 'transferencia_interna': si es entre cuentas de Agrícola ONI C.A. (J501456380, mismo cliente)
     * 'aporte_socio': si menciona a Elías Trías, Elías Trías Abreu, V23997829, Pago Elías
     * 'compra_dolares': si menciona Compra USD, Intervención Digital, Divisas, Mesa de Cambio
     * 'pago_proveedor': pagos a empresas o proveedores terceros (ej: Grupo Tecnolife, Becerra, Distribui)
     * 'comision_servicio': comisiones bancarias, mantenimiento de cuenta, emisión estado de cuenta, SMS, IGTF
     * 'otra_entrada': otros ingresos
     * 'otra_salida': otros egresos
   - notes: comentario o detalle relevante`;

    let contents: any[] = [];
    if (base64Content) {
      contents.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: base64Content,
        },
      });
      contents.push({ text: `Analiza el estado de cuenta adjunto (${fileName || 'documento.pdf'}). Extrae todas las operaciones.` });
    } else {
      contents.push({ text: `Analiza este texto de estado de cuenta:\n${textContent}` });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bankId: { type: Type.STRING, description: 'ID del banco (bancamiga, mercantil, plaza, provincial)' },
            initialBalance: { type: Type.NUMBER, description: 'Saldo inicial en Bs.' },
            endingBalance: { type: Type.NUMBER, description: 'Saldo final en Bs.' },
            transactions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING, description: 'Fecha YYYY-MM-DD' },
                  reference: { type: Type.STRING, description: 'Número de referencia' },
                  description: { type: Type.STRING, description: 'Descripción de la operación' },
                  amountBs: { type: Type.NUMBER, description: 'Monto en Bs. (positivo=crédito, negativo=débito)' },
                  category: { type: Type.STRING, description: 'Categoría clasificada' },
                  notes: { type: Type.STRING, description: 'Observación adicional' }
                },
                required: ['date', 'description', 'amountBs', 'category']
              }
            }
          },
          required: ['bankId', 'transactions']
        }
      }
    });

    const resultText = response.text || '{}';
    const parsedData = JSON.parse(resultText);

    res.json(parsedData);
  } catch (err: any) {
    console.error('Error procesando estado de cuenta con Inteligencia Artificial:', err?.message ? 'Fallo en servicio AI' : err);
    res.status(500).json({ error: 'No se pudo procesar el estado de cuenta con Inteligencia Artificial. Verifique el formato e intente nuevamente.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      if (req.originalUrl.startsWith('/api')) return;
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de Inteligencia Bancaria activo en http://0.0.0.0:${PORT}`);
  });
}

startServer();
