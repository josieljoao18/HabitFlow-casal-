import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "A chave de API GEMINI_API_KEY não foi configurada nas variáveis de ambiente (.env)."
      );
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Lazy initialization of OpenAI client
let openAiClient: OpenAI | null = null;
function getOpenAIClient() {
  if (!openAiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "A chave de API OPENAI_API_KEY não foi configurada nas variáveis de ambiente (.env)."
      );
    }
    openAiClient = new OpenAI({ apiKey });
  }
  return openAiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API endpoint to process live speech/text input via Gemini AI / OpenAI API
  app.post("/api/voice-assistant", async (req, res) => {
    try {
      const { text, username, history, habits, tasks } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({ error: "Nenhum comando de voz ou texto foi fornecido." });
      }

      console.log(`[Sintonia Voz IA] Processando entrada para ${username || "Usuário"}: "${text}"`);
      
      // 1. Build Habits & Tasks Context Summary for the LLM context
      let habitsSummary = "";
      if (habits && Array.isArray(habits) && habits.length > 0) {
        habitsSummary = habits.map(h => {
          const count = Object.keys(h.completedBy || {}).length;
          return `- Hábito: "${h.title}" | Categoria: "${h.tag}" | Streak atual: ${h.streak || 0} dias | Conclusões: ${count} vezes | Frequência: ${h.frequency?.type || 'diária'}`;
        }).join("\n");
      } else {
        habitsSummary = "(Sem hábitos cadastrados ou iniciados no app)";
      }

      let tasksSummary = "";
      if (tasks && Array.isArray(tasks) && tasks.length > 0) {
        tasksSummary = tasks.map(t => {
          return `- Tarefa: "${t.title}" | Prioridade: "${t.priority}" | Responsável: "${t.assignedTo}" | Status: ${t.completed ? 'Concluída ✅' : 'Pendente ⏳'}`;
        }).join("\n");
      } else {
        tasksSummary = "(Sem tarefas cadastradas na lista)";
      }

      // 2. Format previous conversation context if available (max last 8 messages to stay lightning-fast)
      let historyContext = "";
      if (history && Array.isArray(history) && history.length > 0) {
        historyContext = history
          .slice(-8)
          .map(msg => {
            const role = msg.sender === 'user' ? (username || 'Usuário') : 'Sintonia Voz IA';
            return `${role}: ${msg.text}`;
          })
          .join("\n");
      }

      const systemInstruction = `Você é o "Sintonia Voz IA", o assistente virtuoso de bate-papo, hábitos e tarefas do casal no HabitFlow-Casal (Sintonia Casal). Seu objetivo é ajudar na rotina do casal, sugerir dinâmicas, analisar a produtividade e ser um parceiro inteligente e carinhoso de diálogo em português do Brasil.

Para analisar a produtividade ou responder dúvidas da semana, guie-se exclusivamente pelas listas de hábitos e tarefas reais do app fornecidas.

Diretrizes para o JSON de resposta:
- Se a ação for 'create_habit', extraia o título sintetizado (ex: "Beber mais água"). Escolha um emoji apropriado (icon) e selecione a categoria ideal ('saúde', 'espiritual', 'comunicação', 'amor' ou 'relacionamento').
- Se a ação for 'create_task', extraia um título simplificado e limpo (ex: "Lavar as louças"). Escolha um ícone emoji coerente (ex: 🧹, 🛒, 🍽️). Determine a prioridade ('high', 'medium', 'low'). Palavras urgentes ou "hoje" mapeiam para 'high'.
- 'voiceResponse': Uma confirmação por áudio curta, carinhosa e objetiva em português do Brasil (no máximo 20 palavras), excelente e ágil para ser dita por sintetizadores de voz. Ex: "Pronto, hábito de orar juntos adicionado com sucesso!". Tem que ser perfeitamente vocalizável.
- 'textChatResponse': Um texto mais rico, carinhoso, empático e amigável em português do Brasil (entre 10 e 100 palavras) ideal para ser lido no balão de chat, como um verdadeiro bate-papo com um terapeuta ou conselheiro matrimonial. Responda às perguntas com carinho, dê ótimas dicas, apoie as conquistas ou desabafe junto.

O retorno DEVE ser obrigatoriamente um JSON válido contendo os campos: action, title, icon, category, priority, voiceResponse, textChatResponse.`;

      const prompt = `--- CONTEXTO ATAL DO COPILOT (HABITFLOW-CASAL) ---
HABITIES REGISTRADOS:
${habitsSummary}

TAREFAS E COMPROMISSOS:
${tasksSummary}

Histórico de mensagens anteriores de bate-papo:
${historyContext || "(Sem histórico anterior)"}

Nova entrada do usuário (${username || "Parceiro"}): "${text}"

Analise a entrada no contexto do nosso bate-papo, hábitos e tarefas. Determine qual é a intenção do usuário. As ações válidas são:
1. 'create_habit': Criar um hábito diário para o casal.
2. 'create_task': Criar uma tarefa pendente ou compromisso doméstico na lista.
3. 'coaching_tip': Dar uma dica de relacionamento, reflexão amorosa ou rotinas.
4. 'dialogue': Diálogo comum (bater papo, falar sobre amor, sentimentos, rir, contar do dia, desabafar, tirar dúvidas gerais, sugerir novos hábitos inovadores baseando-se no que já fazem ou responder como foi a semana com base nas métricas acima).

Crie e retorne um objeto JSON que represente essa classificação exacta conforme o schema exigido.`;

      let resultObj: any = null;
      let openAiErrorMsg = "";

      // Primary attempt: Try OpenAI if the token is supplied in environment config
      if (process.env.OPENAI_API_KEY) {
        try {
          console.log("[Sintonia Voz IA] Consultando OpenAI API (gpt-4o-mini)...");
          const openai = getOpenAIClient();
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7
          });
          const rawText = completion.choices[0]?.message?.content || "{}";
          resultObj = JSON.parse(rawText.trim());
        } catch (openaiErr: any) {
          openAiErrorMsg = openaiErr?.message || String(openaiErr);
          console.warn("[Sintonia Voz IA] Falha de rota da OpenAI, recorrendo ao Gemini Default:", openAiErrorMsg);
        }
      }

      // Default fallback: Always available Gemini 3.5-flash
      if (!resultObj) {
        console.log("[Sintonia Voz IA] Consultando Gemini API (gemini-3.5-flash)...");
        try {
          const ai = getGeminiClient();
          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
              systemInstruction: systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  action: {
                    type: Type.STRING,
                    description: "Tipo de ação detectada: 'create_habit', 'create_task', 'coaching_tip' ou 'dialogue'."
                  },
                  title: {
                    type: Type.STRING,
                    description: "Título limpo para o hábito ou tarefa (ex: Beber água). Vazio se for coaching_tip ou dialogue."
                  },
                  icon: {
                    type: Type.STRING,
                    description: "Emoji de ícone adequado ao hábito ou à tarefa (ex: 🥤). Vazio se for coaching_tip ou dialogue."
                  },
                  category: {
                    type: Type.STRING,
                    description: "Para hábitos, selecione: 'saúde', 'espiritual', 'comunicação', 'amor' ou 'relacionamento'."
                  },
                  priority: {
                    type: Type.STRING,
                    description: "Para tarefas, selecione a prioridade: 'high', 'medium' ou 'low'."
                  },
                  voiceResponse: {
                    type: Type.STRING,
                    description: "Frase curta de áudio amigável relatando a ação ou resposta (máximo 20 palavras), para ser dita em português."
                  },
                  textChatResponse: {
                    type: Type.STRING,
                    description: "Texto completo e caloroso para o balão de chat do bate-papo (até 100 palavras). Responda com simpatia, dê conselhos de casais, use humor leve se couber."
                  }
                },
                required: ["action", "voiceResponse", "textChatResponse"]
              }
            }
          });

          const responseString = response.text || "{}";
          resultObj = JSON.parse(responseString.trim());
        } catch (geminiErr: any) {
          const geminiErrorMsg = geminiErr.message || String(geminiErr);
          console.error("[Sintonia Voz IA] Falha na rota do Gemini:", geminiErrorMsg);
          
          let detailsText = "";
          if (process.env.OPENAI_API_KEY) {
            if (openAiErrorMsg.toLowerCase().includes("quota") || openAiErrorMsg.toLowerCase().includes("429")) {
              detailsText += "1. **ChatGPT**: Ocorreu um erro de saldo ou cota excedida (Erro 429 - Quota Exceeded) na sua chave de API da OpenAI. Verifique seus créditos no painel da OpenAI.\n";
            } else {
              detailsText += `1. **ChatGPT**: Falha inesperada. Detalhe: ${openAiErrorMsg}\n`;
            }
          } else {
            detailsText += "1. **ChatGPT**: A chave de API `OPENAI_API_KEY` não está configurada.\n";
          }

          if (process.env.GEMINI_API_KEY) {
            if (geminiErrorMsg.toLowerCase().includes("quota") || geminiErrorMsg.toLowerCase().includes("429")) {
              detailsText += "2. **Gemini**: Ocorreu um erro de cota ou limitação (429) no provedor do Gemini.\n";
            } else {
              detailsText += `2. **Gemini**: Falha ao processar. Detalhe: ${geminiErrorMsg}\n`;
            }
          } else {
            detailsText += "2. **Gemini**: A chave de API `GEMINI_API_KEY` padrão também não está configurada ou falhou.\n";
          }

          resultObj = {
            action: "dialogue",
            title: "",
            icon: "",
            category: "",
            priority: "",
            voiceResponse: "Por favor, configure suas chaves de API no menu de Secrets para habilitar a inteligência artificial.",
            textChatResponse: `Olá! Sentimos muito, mas não conseguimos estabelecer contato com nenhum dos nossos cérebros de inteligência artificial no momento. Aqui estão os detalhes das tentativas de conexão:\n\n${detailsText}\n\n💡 **Dica de Solução**: Por favor, acessem o menu principal do AI Studio clicando no ícone de engrenagem (Configurações) no canto superior direito e selecionem **Secrets**. Confiram se as chaves \`OPENAI_API_KEY\` e/ou \`GEMINI_API_KEY\` estão cadastradas corretamente!`
          };
        }
      }

      res.json(resultObj);
    } catch (err: any) {
      console.error("[Sintonia Voz IA Server Error]", err);
      res.status(500).json({ 
        error: "Falha na análise da IA",
        message: err?.message || "Internal server error"
      });
    }
  });

  // Serve static assets or use Vite in development mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
