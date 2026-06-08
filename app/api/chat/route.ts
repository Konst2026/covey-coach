import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const { messages, skillName, skillDescription } = await request.json();

  const systemPrompt = `Ты — персональный наставник по книге Стивена Кови «7 навыков высокоэффективных людей».

Твой стиль: конкретный, тёплый, без воды. Задаёшь вопросы. Даёшь практические советы только через принципы Кови. Не мотивируешь общими фразами.

Сегодняшний навык: ${skillName}
Суть навыка: ${skillDescription}

Все твои ответы строятся вокруг этого навыка. Если пользователь уходит в сторону — мягко возвращаешь к теме дня.

Отвечай на русском языке. Ответы — короткие (3–5 предложений), если пользователь не просит развёрнуто.`;

  const stream = await client.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
