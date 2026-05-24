import React, { useState, useEffect, useRef, memo } from 'react';
import { 
  X, Mic, MicOff, Volume2, VolumeX, Sparkles, Send, 
  HelpCircle, CheckCircle2, ChevronRight, AlertCircle, Play, Bookmark, Award
} from 'lucide-react';
import { Habit, Task, UserProfile } from '../types';
import { playCompletionSound, triggerConfetti, performVibe } from '../utils/fx';

interface VoiceAssistantCoachProps {
  onClose: () => void;
  currentUserProfile: UserProfile | null;
  onSaveHabit: (habit: Partial<Habit>) => void;
  onSaveTask: (task: Partial<Task>) => void;
  triggerToast: (msg: string, error?: boolean) => void;
  onRecordFeedEvent?: (type: 'habit_completed' | 'task_completed' | 'reward_unlocked' | 'daily_challenge_completed' | 'mood_changed', title: string, extra?: string) => void;
  habits?: Habit[];
  tasks?: Task[];
}

// Map keywords to pretty emojis and tags automatically
const DYNAMIC_DICTIONARY = [
  { match: ['água', 'agua', 'beber', 'hidratar', 'copo'], icon: '🥤', tag: 'saúde', hint: 'Saúde & Hidratação' },
  { match: ['alimentar', 'comer', 'jantar', 'almoço', 'almoço', 'cafá', 'fruta', 'salada', 'dieta', 'cozinhar'], icon: '🍽️', tag: 'saúde', hint: 'Alimentação Saudável' },
  { match: ['treinar', 'academia', 'corre', 'corrida', 'malhar', 'caminhar', 'exercício', 'alongar', 'alongamento', 'perna', 'braço'], icon: '🏋️‍♂️', tag: 'saúde', hint: 'Desenvolvimento Físico' },
  { match: ['meditar', 'respirar', 'reparar', 'yoga', 'silêncio', 'mente'], icon: '🧘', tag: 'saúde', hint: 'Paz Mental' },
  { match: ['conversar', 'falar', 'dialogar', 'discutir', 'alinhamento', 'ouvir', 'reunião', 'ligar', 'mensagem', 'áudio'], icon: '💬', tag: 'comunicação', hint: 'Sintonia de Diálogo' },
  { match: ['orar', 'oração', 'bíblia', 'igreja', 'culto', 'deus', 'religião', 'fé', 'gratidão', 'agradecer'], icon: '🙏', tag: 'espiritual', hint: 'Crescimento Espiritual' },
  { match: ['beijar', 'amor', 'relação', 'beijo', 'abraço', 'carinho', 'cafuné', 'surpresa', 'massagem', 'romantico', 'romântico', 'namorar'], icon: '💖', tag: 'amor', hint: 'Chama do Casal' },
  { match: ['estudar', 'ler', 'livro', 'curso', 'aula', 'aprender', 'idioma', 'inglês'], icon: '📚', tag: 'relacionamento', hint: 'Estudos & Foco' },
  { match: ['dormir', 'cama', 'descansar', 'sono'], icon: '🛌', tag: 'saúde', hint: 'Sono Reparador' },
  { match: ['dinheiro', 'economizar', 'comprar', 'pagar', 'finanças', 'banco', 'boleto'], icon: '💰', tag: 'relacionamento', hint: 'Gestão Financeira' },
  { match: ['organizar', 'limpar', 'casa', 'pia', 'louça', 'roupa', 'quarto', 'cozinha', 'arrumar'], icon: '🧹', tag: 'relacionamento', hint: 'Organização do Lar' }
];

const COACHING_TIPS = [
  'Reserve um tempo na semana para um "Encontro de Negócios do Amor" para planejar as finanças e rotinas com leveza.',
  'Usem o hábito compartilhado "Conversa de 10 minutos" antes de dormir para falar de sentimentos, nunca de problemas cotidianos!',
  'Adicione a tarefa "Surpreender meu amor com um bilhete físico" na carteira ou espelho do banheiro.',
  'Celebre pequenas vitórias juntos! Toda vez que completarem uma meta, beijem-se por 6 segundos (tempo científico para liberar ocitocina).',
  'Façam caminhadas curtas juntos sem celular para sincronizar o ritmo e relaxar do dia estressante.'
];

export const VoiceAssistantCoach = memo(({
  onClose,
  currentUserProfile,
  onSaveHabit,
  onSaveTask,
  triggerToast,
  onRecordFeedEvent,
  habits = [],
  tasks = []
}: VoiceAssistantCoachProps) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [voiceSupported, setVoiceSupported] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [lastActionResponse, setLastActionResponse] = useState<string>('');
  const [chatInput, setChatInput] = useState<string>('');
  const [chatLog, setChatLog] = useState<{ sender: 'user' | 'ai'; text: string; time: string; action?: boolean }[]>([
    { 
      sender: 'ai', 
      text: 'Olá! Sou seu conselheiro e parceiro de conversas do Sintonia, integrado ao ChatGPT da OpenAI! 🧠💬 Agora sou uma ferramenta completa de bate-papo! Além de me ditar e agendar hábitos e tarefas prontas, você pode me pedir conselhos, reflexões românticas de relacionamento, ideias criativas de encontros ou desabafar sobre o dia. O que gostaria de conversar comigo hoje?', 
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
    }
  ]);

  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatLog]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.lang = 'pt-BR';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setIsListening(true);
      performVibe();
    };

    rec.onresult = (e: any) => {
      const resultText = e.results[0][0].transcript || '';
      setTranscript(resultText);
      processInputString(resultText);
    };

    rec.onerror = (err: any) => {
      console.warn('Speech recognition error:', err);
      setIsListening(false);
      triggerToast('Acesso ao microfone negado ou limite de tempo excedido.', true);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;
  }, [triggerToast]);

  // Synthesis Helper (Warn Brazilian Portuguese Voice Output)
  const speakVoiceOutput = (text: string) => {
    if (!soundEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel(); // Stop current speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      // Try finding a smooth Portuguese female/male voice if available
      const voices = window.speechSynthesis.getVoices();
      const ptVoice = voices.find(v => v.lang.startsWith('pt'));
      if (ptVoice) {
        utterance.voice = ptVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('SpeechSynthesis failed', e);
    }
  };

  const startListening = () => {
    if (!voiceSupported || !recognitionRef.current) {
      triggerToast('Comando de voz não suportado neste navegador. Digite na caixa abaixo!', true);
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      setLastActionResponse('');
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Primary NLP Engine to decode commands and take action using Gemini AI
  const processInputString = async (input: string) => {
    if (!input.trim() || isAnalyzing) return;

    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    // Capture stateful chat history before updating log
    const prevHistory = chatLog.map(c => ({ sender: c.sender, text: c.text }));

    // Append to conversation log
    setChatLog(prev => [...prev, { sender: 'user', text: input, time: timeStr }]);
    setTranscript(input);
    setLastActionResponse('');
    setIsAnalyzing(true);

    try {
      const nameOfUser = currentUserProfile?.name || 'Parceiro';
      const response = await fetch("/api/voice-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: input,
          username: nameOfUser,
          history: prevHistory,
          habits: habits.map(h => ({
            title: h.title,
            tag: h.tag,
            frequency: h.frequency,
            streak: h.streak || 0,
            completedBy: h.completedBy || {}
          })),
          tasks: tasks.map(t => ({
            title: t.title,
            priority: t.priority,
            completed: t.completed,
            assignedTo: t.assignedTo
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Erro de comunicação com o servidor (Status ${response.status}).`);
      }

      const data = await response.json();
      console.log("[Gemini Voice JSON Data]", data);

      const { action, title, icon, category, priority, voiceResponse, textChatResponse } = data;

      if (action === 'create_habit' && title) {
        onSaveHabit({
          title,
          icon: icon || '⭐',
          tag: category || 'relacionamento',
          assignedTo: 'both',
          frequency: { type: 'daily' }
        });

        const successText = `Excelente! Agendei seu Hábito "${title}" com ícone "${icon || '⭐'}" sob a rotina de ${category || 'relacionamento'}!`;
        setLastActionResponse(successText);
        setChatLog(prev => [...prev, { sender: 'ai', text: textChatResponse || successText, time: timeStr, action: true }]);

        playCompletionSound();
        triggerConfetti();
        speakVoiceOutput(voiceResponse || `Hábito de ${title} criado!`);

        if (onRecordFeedEvent) {
          onRecordFeedEvent('habit_completed', `Sintonia Voz IA 🎙️: gravou hábito: "${title}"`);
        }

      } else if (action === 'create_task' && title) {
        const priorityLabel = priority === 'high' ? 'Alta 🚨' : priority === 'low' ? 'Baixa ⏳' : 'Média ⚡';
        onSaveTask({
          title,
          icon: icon || '📋',
          priority: (priority as 'high' | 'medium' | 'low') || 'medium',
          assignedTo: 'both',
          dueDate: null
        });

        const successText = `Perfeito! Criei a tarefa "${title}" ${icon || '📋'} com prioridade ${priorityLabel}!`;
        setLastActionResponse(successText);
        setChatLog(prev => [...prev, { sender: 'ai', text: textChatResponse || successText, time: timeStr, action: true }]);

        playCompletionSound();
        triggerConfetti();
        speakVoiceOutput(voiceResponse || `Tarefa de ${title} adicionada!`);

        if (onRecordFeedEvent) {
          onRecordFeedEvent('task_completed', `Sintonia Voz IA 🎙️: gravou tarefa: "${title}"`);
        }

      } else {
        // coaching_tip OR dialogue/general reply
        setLastActionResponse('');
        setChatLog(prev => [...prev, { sender: 'ai', text: textChatResponse || voiceResponse, time: timeStr }]);
        speakVoiceOutput(voiceResponse);
      }

    } catch (error: any) {
      console.error("[Sintonia Voz IA Error]", error);
      const errorMessage = error?.message || "";
      let fallbackReply = "Ops! Ocorreu um erro ao falar com a Inteligência Artificial. Por favor, certifique-se de configurar a chave OPENAI_API_KEY no painel de Secrets (Configurações > Secrets) do AI Studio.";
      
      if (errorMessage.includes("OPENAI_API_KEY") || errorMessage.includes("OpenAI")) {
        fallbackReply = "A chave de API do ChatGPT (OPENAI_API_KEY) não foi encontrada ou é inválida. Por favor, configure-a no menu do AI Studio (ícone de engrenagem no canto superior direito > Secrets).";
      } else if (errorMessage) {
        fallbackReply = `Erro detectado: ${errorMessage} Por favor, verifique suas chaves de API no painel de Secrets do AI Studio.`;
      }

      setChatLog(prev => [...prev, { sender: 'ai', text: fallbackReply, time: timeStr }]);
      speakVoiceOutput("Erro de comunicação com a inteligência artificial.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleChatFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isAnalyzing) return;
    performVibe();
    const userInput = chatInput.trim();
    setChatInput('');
    processInputString(userInput);
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
      {/* Background Dim Backdrop */}
      <div 
        className="absolute inset-0 bg-[#070914]/90 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Main Glassmorphism container */}
      <div className="bg-gradient-to-b from-indigo-950/70 via-slate-900/95 to-[#050711] border border-indigo-500/30 rounded-3xl w-full max-w-md max-h-[88vh] overflow-hidden shadow-2xl flex flex-col relative z-20 animate-fade-in text-white text-left font-sans">
        
        {/* Glow behind */}
        <div className="absolute -top-20 left-1 /2 -translate-x-1/2 w-64 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Top Header Block */}
        <div className="p-4 border-b border-indigo-500/20 flex justify-between items-center bg-indigo-950/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-rose-500 shadow-md shadow-indigo-500/10 text-white relative">
              <Sparkles className="w-5 h-5" />
              {isListening && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
              )}
            </div>
            <div>
              <h3 className="text-sm font-black tracking-wider uppercase text-indigo-300 flex items-center gap-1.5">
                Bate-papo Sintonia IA
                <span className="text-[9px] font-mono font-bold bg-indigo-500/20 px-1.5 py-0.5 rounded text-indigo-200">COACH</span>
              </h3>
              <p className="text-[10px] text-zinc-400">Fale ou escreva para conversar e criar rotinas</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Direct voice synthesis mute option */}
            <button
              onClick={() => { performVibe(); setSoundEnabled(!soundEnabled); }}
              className={`p-1.5 rounded-xl border border-white/5 transition-all flex items-center justify-center cursor-pointer bg-transparent ${
                soundEnabled ? 'text-indigo-300 hover:bg-white/5' : 'text-zinc-500 hover:bg-white/5'
              }`}
              title={soundEnabled ? 'Silenciar assistente de áudio' : 'Ativar voz assistente de áudio'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer border-0 bg-transparent flex items-center justify-center"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Interactive Dynamic Micro Ring Animation */}
        <div className="p-4 bg-indigo-950/15 border-b border-white/5 text-center flex flex-col items-center justify-center space-y-3 pt-5 pb-5 select-none relative">
          
          {/* Animated sound ripples */}
          <div className="relative w-16 h-16 flex items-center justify-center">
            {/* Concentric rings scaling */}
            {isListening ? (
              <>
                <div className="absolute inset-0 bg-rose-500/25 rounded-full animate-ping scale-125"></div>
                <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-pulse scale-110"></div>
              </>
            ) : null}

            <button
              onClick={startListening}
              className={`w-14 h-14 rounded-full border border-indigo-500/20 flex items-center justify-center text-white cursor-pointer transform hover:scale-105 active:scale-95 duration-200 shadow-xl ${
                isListening 
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 border-rose-500 shadow-rose-500/20' 
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/10'
              }`}
            >
              {isListening ? (
                <MicOff className="w-6 h-6 animate-pulse" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </button>
          </div>

          <div className="space-y-1.5 px-3">
            <h4 className="text-xs font-black uppercase text-pink-300 tracking-wider">
              {isListening ? 'Estou Ouvindo... Fale agora!' : 'Fale por Áudio ou Digite'}
            </h4>
            <p className="text-[11px] text-zinc-400 leading-normal max-w-xs mx-auto">
              {isListening 
                ? 'Estou ouvindo seu tom de voz... Fale um desabafo, conte do seu dia ou agende uma tarefa!' 
                : 'Mande uma mensagem por voz tocando no microfone ou escreva no chat abaixo para bater papo!'}
            </p>
          </div>

          {/* Quick instructions recipes card triggers */}
          {!isListening && (
            <div className="flex gap-1.5 flex-wrap justify-center max-w-sm pt-2 select-all">
              <span className="text-[9px] text-zinc-500 font-bold self-center mr-1 uppercase">Tente falar:</span>
              <button 
                onClick={() => processInputString('criar hábito beber 2 litros de água')}
                className="text-[9.5px] bg-[#070b13] px-2 py-1 rounded-lg border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                "Criar hábito Beber Água"
              </button>
              <button 
                onClick={() => processInputString('criar tarefa planejar jantar romântico urgente')}
                className="text-[9.5px] bg-[#070b13] px-2 py-1 rounded-lg border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                "Criar tarefa Jantar Urgente"
              </button>
              <button 
                onClick={() => processInputString('me de uma dica')}
                className="text-[9.5px] bg-[#070b13] px-2 py-1 rounded-lg border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                "Dica romântica"
              </button>
            </div>
          )}

          {/* Transcript bubble banner */}
          {(transcript || lastActionResponse) && (
            <div className="w-full bg-[#03060c] p-3 rounded-2xl border border-indigo-500/15 text-left space-y-1 relative anime-fade-in mt-1 select-text">
              <span className="text-[8.5px] font-bold text-indigo-400 uppercase tracking-widest block font-mono">Processador de Linguagem</span>
              {transcript && (
                <p className="text-[11px] text-zinc-300 leading-normal">
                  <span className="font-bold text-white pr-1">🗣️ Captado:</span> "{transcript}"
                </p>
              )}
              {lastActionResponse && (
                <div className="pt-1.5 mt-1 border-t border-white/5 text-[11px] text-emerald-400 font-bold flex items-center gap-1.5 leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{lastActionResponse}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Conversation Logs Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[25vh] bg-[#02040b] max-h-[46vh] select-text">
          {chatLog.map((chat, i) => (
            <div 
              key={i} 
              className={`flex flex-col max-w-[85%] ${
                chat.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
              }`}
            >
              <div className={`p-3 rounded-2xl text-[11.5px] leading-relaxed relative ${
                chat.sender === 'user' 
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-none shadow-md' 
                  : chat.action 
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-bl-none font-bold animate-pulse'
                    : 'bg-slate-900 border border-white/5 text-zinc-300 rounded-bl-none'
              }`}>
                {chat.sender === 'ai' && <span className="absolute -top-1.5 -left-1 text-sm bg-neutral-900 rounded-full p-0.5 shadow-sm">🧠</span>}
                <p className="pl-1 leading-relaxed whitespace-pre-line">{chat.text}</p>
              </div>
              <span className="text-[8.5px] text-zinc-600 font-mono mt-1 px-1">{chat.time}</span>
            </div>
          ))}
          {isAnalyzing && (
            <div className="flex flex-col max-w-[85%] mr-auto items-start">
              <div className="p-3 rounded-2xl text-[11.5px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-bl-none flex items-center gap-1.5 font-semibold">
                <span className="text-sm animate-pulse">🧠</span>
                <span>O ChatGPT está pensando...</span>
                <span className="flex gap-0.5 ml-1">
                  <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.1s]"></span>
                  <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                </span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Fallback/Chat input form */}
        <form onSubmit={handleChatFormSubmit} className="p-3 bg-[#060a17] border-t border-indigo-500/20 flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Converse ou crie rotinas digitando aqui... 💬❤️"
            className="flex-1 bg-slate-900/90 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/40"
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || isAnalyzing}
            className="py-2 px-3.5 bg-gradient-to-r from-indigo-500 to-rose-500 hover:scale-102 active:scale-97 disabled:opacity-45 disabled:scale-100 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border-0"
          >
            <Send className="w-3 h-3" />
            Enviar
          </button>
        </form>

        {/* Footer info line */}
        <div className="p-2.5 bg-indigo-950/40 border-t border-white/5 flex items-center justify-between text-[9px] text-zinc-500 select-none px-4">
          <span className="flex items-center gap-1">
            <HelpCircle className="w-3 h-3" />
            Voz IA + ChatGPT 🧠
          </span>
          <span>{isAnalyzing ? "ChatGPT pensando..." : "Pronto para ouvir"}</span>
        </div>

      </div>
    </div>
  );
});

VoiceAssistantCoach.displayName = 'VoiceAssistantCoach';
export default VoiceAssistantCoach;
