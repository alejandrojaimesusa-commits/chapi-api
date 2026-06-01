const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PORT = process.env.PORT || 3000;

const allowedActions = [
  "abrir_parada",
  "agregar_fiado",
  "registrar_pago",
  "consultar_deuda",
  "abrir_cliente",
  "desconocido",
];

app.post("/chapi-command", async (req, res) => {
  try {
    const {
      texto = "",
      paradaActiva = "",
      modoPrueba = false,
      paradas = [],
      clientes = [],
    } = req.body;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      store: false,
      input: [
        {
          role: "system",
          content:
            "Eres CHAPI, asistente de un food truck. Convierte comandos hablados en una acción JSON. No hables normal. Devuelve SOLO JSON válido.",
        },
        {
          role: "user",
          content: `
Texto escuchado:
${texto}

Parada activa:
${paradaActiva || "ninguna"}

Modo prueba:
${modoPrueba ? "sí" : "no"}

Paradas disponibles:
${JSON.stringify(paradas)}

Clientes disponibles de la parada activa:
${JSON.stringify(clientes)}

Acciones permitidas:
- abrir_parada
- agregar_fiado
- registrar_pago
- consultar_deuda
- abrir_cliente
- desconocido

Reglas:
1. Si el usuario dice abrir, estamos llegando, vamos a, busca una parada, usa abrir_parada.
2. Si dice apúntale, anótale, súmale, fiado, debe, usa agregar_fiado.
3. Si dice pagó, pago, abonó, abono, usa registrar_pago.
4. Si pregunta cuánto debe, cuánto me debe, usa consultar_deuda.
5. Si pide ver o abrir una persona, usa abrir_cliente.
6. Usa la parada activa si el usuario no dice parada.
7. Si hay ruido o texto extra, ignóralo.
8. Si no estás seguro, devuelve desconocido.
9. cantidad debe ser número. Si no hay cantidad, usa 0.
10. Responde SOLO este JSON:

{
  "accion": "abrir_parada",
  "parada": "",
  "persona": "",
  "cantidad": 0,
  "respuesta": ""
}
`,
        },
      ],
    });

    let text = response.output_text.trim();

    text = text
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();

    let data = JSON.parse(text);

    if (!allowedActions.includes(data.accion)) {
      data.accion = "desconocido";
    }

    data = {
      accion: data.accion || "desconocido",
      parada: data.parada || "",
      persona: data.persona || "",
      cantidad: Number(data.cantidad || 0),
      respuesta: data.respuesta || "",
    };

    res.json(data);
  } catch (error) {
    console.error("Error CHAPI IA:", error.message);

    res.status(500).json({
      accion: "desconocido",
      parada: "",
      persona: "",
      cantidad: 0,
      respuesta: "Error con la IA",
    });
  }
});

app.get("/", (req, res) => {
  res.send("CHAPI API funcionando");
});

app.listen(PORT, () => {
  console.log(`CHAPI API corriendo en http://localhost:${PORT}`);
});