export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64, mediaType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 requerido' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key no configurada' });

  let cleanBase64 = imageBase64;
  if (cleanBase64.includes(',')) cleanBase64 = cleanBase64.split(',')[1];

  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const safeMediaType = validTypes.includes(mediaType) ? mediaType : 'image/jpeg';

  const prompt = `Analiza esta imagen de una planta y responde SOLO con un objeto JSON con esta estructura exacta, sin texto adicional ni backticks:
{
  "nombre_comun": "nombre común en español",
  "nombre_cientifico": "nombre científico",
  "estado_salud": "saludable",
  "descripcion": "descripción breve de la planta en 2-3 frases",
  "problemas": "descripción de problemas detectados si los hay, o Ninguno detectado",
  "soluciones": "soluciones o recomendaciones para los problemas, o Mantén los cuidados actuales",
  "riego": "frecuencia de riego recomendada",
  "luz": "necesidades de luz",
  "temperatura": "rango de temperatura ideal",
  "sustrato": "tipo de sustrato recomendado"
}
El campo estado_salud debe ser exactamente uno de: saludable, necesita_atención, enferma`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: safeMediaType, data: cleanBase64 } },
              { text: prompt }
            ]
          }]
        })
      }
    );

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Error API Gemini' });

    const text = data.candidates[0].content.parts[0].text;
    const clean = text.replace(/```json|```/g, '').trim();
    const plant = JSON.parse(clean);
    return res.status(200).json(plant);

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
}
