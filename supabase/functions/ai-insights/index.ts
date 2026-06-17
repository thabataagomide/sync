// AI insights edge function — analyzes user productivity data
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { tasks, habits, sessions } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");

    const summary = `
Tarefas (${tasks.length}): ${JSON.stringify(tasks.slice(0, 30))}
Hábitos (${habits.length}): ${JSON.stringify(habits)}
Sessões de foco (${sessions.length}): ${JSON.stringify(sessions.slice(0, 30))}
    `.trim();

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Você é um assistente analítico de produtividade do app Sync. Não use linguagem de coach, frases motivacionais nem positividade forçada. Tom: útil, inteligente, leve, analítico, natural — como um colega observador. Em português. Produza 5 a 8 observações curtas em bullets, cada uma baseada nos dados (horários produtivos, padrões de procrastinação, hábitos consistentes ou em risco, dias sobrecarregados, tarefas adiadas, balanço entre trabalho e pausa). Cada bullet deve ser específico, factual e, quando fizer sentido, sugerir um ajuste concreto e discreto. Se identificar sinais de sobrecarga ou hábitos em queda, mencione com naturalidade. Sem emojis exagerados; no máximo 1 por bullet, e só quando ajudar a leitura. Termine com uma observação sobre o equilíbrio geral do usuário, sem motivação artificial." },
          { role: "user", content: summary },
        ],
      }),
    });

    if (res.status === 429) return new Response(JSON.stringify({ error: "Limite atingido, tente novamente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (res.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Verifique a conta/API configurada." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!res.ok) throw new Error(`Gateway ${res.status}`);

    const data = await res.json();
    const insights = data.choices?.[0]?.message?.content ?? "Sem dados suficientes ainda.";
    return new Response(JSON.stringify({ insights }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
