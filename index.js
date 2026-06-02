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
  "vender_bebida",
  "preguntar_bebida",
  "consultar_bebida",
  "desconocido",
];

app.post("/chapi-command", async (req, res) => {
  try {
    const {
      texto = "",
      comando = "",
      paradaActiva = "",
      modoPrueba = false,
      paradas = [],
      clientes = [],
      bebidas = [],
    } = req.body;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      store: false,
      input: [
        {
          role: "system",
          content:
            "Eres CHAPI, asistente de un food truck. Convierte comandos hablados en una acción JSON. No hables normal. Devuelve SOLO JSON válido, sin markdown, sin explicaciones.",
        },
        {
          role: "user",
          content: `
Texto escuchado:
${texto}

Comando limpio:
${comando}

Parada activa:
${paradaActiva || "ninguna"}

Modo prueba:
${modoPrueba ? "sí" : "no"}

Paradas disponibles:
${JSON.stringify(paradas)}

Clientes disponibles de la parada activa:
${JSON.stringify(clientes)}

Bebidas disponibles:
${JSON.stringify(bebidas)}

Acciones permitidas:
- abrir_parada
- agregar_fiado
- registrar_pago
- consultar_deuda
- abrir_cliente
- vender_bebida
- preguntar_bebida
- consultar_bebida
- desconocido

Reglas de paradas:
1. Si el usuario dice solo el nombre de una parada, ejemplo "Chapi Palmas", usa abrir_parada.
2. Si dice abrir, estamos llegando, vamos a, busca, abre la parada, usa abrir_parada.
3. Si hay varias paradas parecidas, escoge la más probable de la lista.

Reglas de fiados y pagos:
4. Si dice apúntale, anótale, súmale, agrégale, fiado, debe, usa agregar_fiado.
5. Si dice pagó, pago, abonó, abono, bórrale, quítale, réstale, descuéntale, me dio, me entregó, recibí, usa registrar_pago.
6. Si pregunta cuánto debe, cuánto me debe, qué debe, usa consultar_deuda.
7. Si pide ver o abrir una persona, usa abrir_cliente.
8. Usa la parada activa si el usuario no dice parada.
9. cantidad debe ser número. Si no hay cantidad, usa 0.

Reglas de bebidas:
10. Si el usuario dice una cantidad y una bebida, usa vender_bebida.
Ejemplos:
- "Chapi dos cocas de lata" => vender_bebida, bebida "Coca lata", cantidad 2.
- "Chapi 2 coca botella" => vender_bebida, bebida "Coca botella", cantidad 2.
- "Chapi una pepsi regular" => vender_bebida, bebida "Pepsi regular", cantidad 1.
- "Chapi dos monster verde" => vender_bebida, bebida "Monster verde", cantidad 2.

11. Si la bebida es ambigua porque hay varias opciones, usa preguntar_bebida.
Ejemplo: si dice "dos cocas" y existen "Coca lata", "Coca botella" y "Soda litro Coke", devuelve preguntar_bebida.

12. Para tamaños:
- pequeña, lata, small normalmente significa lata o pequeño.
- mediana, botella, regular normalmente significa botella o regular.
- grande, litro, soda litro normalmente significa soda litro o grande.

13. Si pregunta cuántas quedan, qué falta, inventario o pedido, usa consultar_bebida.
14. Si no hay una bebida clara en la lista, usa desconocido.
15. No inventes bebidas fuera de la lista.

Reglas de respuesta corta:
16. respuesta debe ser corta para auriculares.
17. Ejemplos:
- abrir_parada: "Abriendo Palmas"
- agregar_fiado: "Juan, 10"
- registrar_pago: "Juan pagó 10"
- consultar_deuda: "Juan debe 8"
- vender_bebida: "2 Coca lata"
- preguntar_bebida: "¿Coca lata o botella?"
18. Si hay ruido o texto extra, ignóralo.
19. Si no estás seguro, devuelve desconocido.

Responde SOLO este JSON:

{
  "accion": "desconocido",
  "parada": "",
  "persona": "",
  "cantidad": 0,
  "bebida": "",
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
      bebida: data.bebida || "",
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
      bebida: "",
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