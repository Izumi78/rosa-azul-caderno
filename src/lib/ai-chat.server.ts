import { GatewayError, streamResponse } from "@lovable.dev/ai-gateway";
import { z } from "zod";

const bodySchema = z.object({
  note: z.object({
    title: z.string().max(200),
    description: z.string().max(1000),
    content: z.string().max(60000),
    links: z.array(z.object({ url: z.string().max(2000), label: z.string().max(300) })).max(100),
    related: z.array(z.string().max(200)).max(50),
  }),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(20000) }))
    .min(1)
    .max(40),
});

const INSTRUCTIONS = `Você é a Íris, assistente do caderno "Rosa Azul". Responda sempre em português do Brasil, com tom gentil e direto.
Você é especialista em:
1. Organização: estruturar ideias soltas em tópicos, títulos, listas de tarefas e planos.
2. Escrita: revisar, reescrever, resumir, expandir e ajustar o tom de textos.
3. Gráficos: quando pedirem um gráfico (ou quando dados numéricos ficarem mais claros visualmente), inclua um bloco de código com a linguagem "chart" contendo SOMENTE JSON válido neste formato:
\`\`\`chart
{"type":"bar","title":"Título do gráfico","data":[{"label":"Jan","valor":10},{"label":"Fev","valor":14}]}
\`\`\`
"type" pode ser "bar", "line", "area" ou "pie". Cada item de "data" tem "label" (texto) e uma ou mais séries numéricas. Para "pie", use uma única série.
4. Relatórios: produza relatórios em Markdown com título (#), resumo, seções (##), tabelas quando útil, gráficos quando houver números, e conclusões/próximos passos.
Use Markdown. Baseie-se no conteúdo do bloco abaixo quando for relevante; se faltar informação, diga o que falta ou proponha um exemplo deixando claro que é ilustrativo.`;

export async function handleChat(request: Request): Promise<Response> {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const { note, messages } = body;
  const context = [
    `# Bloco atual: ${note.title || "Sem título"}`,
    note.description ? `Descrição: ${note.description}` : "",
    note.related.length ? `Blocos ligados no mural: ${note.related.join(", ")}` : "",
    note.links.length
      ? `Links salvos:\n${note.links.map((l) => `- ${l.label || l.url}: ${l.url}`).join("\n")}`
      : "",
    `Conteúdo da página:\n"""\n${note.content || "(vazio)"}\n"""`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const stream = await streamResponse({
      model: "openai/gpt-6.1-sol",
      instructions: `${INSTRUCTIONS}\n\n${context}`,
      input: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    return stream.toResponse();
  } catch (error) {
    if (error instanceof GatewayError) {
      console.error("AI gateway error", error.code, error.httpStatus, error.ids);
      const status = error.httpStatus === 402 ? 402 : error.httpStatus === 429 ? 429 : 502;
      const message =
        status === 402
          ? "Os créditos de IA acabaram. Adicione créditos para continuar usando a Íris."
          : status === 429
            ? "Muitos pedidos em pouco tempo. Espere um instante e tente de novo."
            : "A Íris não conseguiu responder agora. Tente novamente.";
      return Response.json({ error: message }, { status });
    }
    console.error(error);
    return Response.json({ error: "A Íris não conseguiu responder agora." }, { status: 500 });
  }
}
