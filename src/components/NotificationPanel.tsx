import React, { memo, useMemo, useState } from 'react';
import { 
  Bell, Check, X, Sparkles, Send, Heart, Coffee, 
  Flame, RefreshCw, MessageSquare, BookOpen, Clock, Zap, Info, ShieldAlert
} from 'lucide-react';
import { NotificationItem, UserProfile } from '../types';
import { playCompletionSound, triggerConfetti, performVibe } from '../utils/fx';

interface NotificationPanelProps {
  notifications: NotificationItem[];
  onMarkRead: (id: string) => void;
  onClearAll?: () => void;
  onClose: () => void;
  partnerProfile?: UserProfile | null;
  currentUserProfile?: UserProfile | null;
  onSendNotification?: (targetUid: string, icon: string, message: string) => void;
  onRecordFeedEvent?: (type: 'habit_completed' | 'task_completed' | 'reward_unlocked' | 'daily_challenge_completed' | 'mood_changed', title: string, extra?: string) => void;
}

const INSIGHTS_DECK = [
  {
    title: 'A Arte da Conversa Diária 🗣️',
    tip: 'Reservar apenas 10 minutos antes de dormir para conversar sobre como foi o dia, sem telas por perto, fortalece o vínculo do casal em até 80%.'
  },
  {
    title: 'Gamificação & Consistência 🎮',
    tip: 'Dividir hábitos longos (ex: ler) em sessoes menores ajuda a acumular mais XP ao marcar as conclusões intermediárias, estimulando a constância no cérebro!'
  },
  {
    title: 'Validação Positiva ❤️',
    tip: 'Reagir com emojis nos hábitos concluídos do seu amor ativa disparos de dopamina nele, tornando a rotina compartilhada muito mais afetuosa.'
  },
  {
    title: 'Aposta Saudável 🥤',
    tip: 'Que tal uma aposta de quem bebe mais água hoje? Defina que o vencedor pode resgatar um cafuné especial comprado na Loja de Recompensas!'
  },
  {
    title: 'Atividade Física Conjunta 🏃‍♂️',
    tip: 'Fazer alongamento ou caminhadas leves juntos não apenas reduz os índices de estresse como sincroniza os batimentos cardíacos do casal em sintonia.'
  },
  {
    title: 'Escrita de Gratidão 📔',
    tip: 'Pessoas que expressam gratidão verbalmente ao parceiro uma vez por dia relatam níveis de felicidade no relacionamento 50% maiores.'
  },
  {
    title: 'Desconexão Intencional 📵',
    tip: 'Crie uma meta de "Zero Celular" durante as refeições. Aproveite esses momentos para se olhar nos olhos e saborear a companhia de quem ama.'
  }
];

export const NotificationPanel = memo(({
  notifications = [],
  onMarkRead,
  onClearAll,
  onClose,
  partnerProfile = null,
  currentUserProfile = null,
  onSendNotification,
  onRecordFeedEvent
}: NotificationPanelProps) => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'sync' | 'wisdom'>('alerts');
  const [customMsg, setCustomMsg] = useState('');
  const [msgEmoji, setMsgEmoji] = useState('💖');
  const [sendingState, setSendingState] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [insightIdx, setInsightIdx] = useState(0);

  // Sorting notifications: unread first, then newest
  const sortedNotifs = useMemo(() => {
    return [...notifications].sort((a, b) => {
      if (a.read !== b.read) {
        return a.read ? 1 : -1;
      }
      return b.timestamp - a.timestamp;
    });
  }, [notifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  // Rotates to a new educational card
  const rotateInsight = () => {
    performVibe();
    setInsightIdx((prev) => (prev + 1) % INSIGHTS_DECK.length);
  };

  // Sends an immediate interactive ping to the partner
  const sendQuickPing = (emoji: string, text: string) => {
    if (!partnerProfile || !onSendNotification) {
      // Direct mock toast if no partner
      setSuccessMsg('Precisa vincular um parceiro para enviar pings!');
      setTimeout(() => setSuccessMsg(''), 3000);
      return;
    }

    try {
      setSendingState(true);
      performVibe();
      playCompletionSound();
      
      const formattedMessage = `Sintonia ⚡: ${currentUserProfile?.name || 'Seu amor'} enviou um toque especial: "${text}"`;
      onSendNotification(partnerProfile.uid, emoji, formattedMessage);

      // Register optionally to logs
      if (onRecordFeedEvent) {
        onRecordFeedEvent('mood_changed', `enviou um toque de atenção "${emoji}" para ${partnerProfile.name}`, text);
      }

      setSuccessMsg(`Toque de "${emoji}" enviado com sucesso!`);
      triggerConfetti();

      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSendingState(false);
    }
  };

  // Submits the custom love text
  const sendCustomCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMsg.trim()) return;
    if (!partnerProfile || !onSendNotification) {
      setSuccessMsg('Precisa de um amor vinculado para enviar bilhetes!');
      setTimeout(() => setSuccessMsg(''), 3000);
      return;
    }

    try {
      setSendingState(true);
      performVibe();
      playCompletionSound();

      const formattedMessage = `Bilhete 💌: ${currentUserProfile?.name || 'Seu amor'}: "${customMsg}"`;
      onSendNotification(partnerProfile.uid, msgEmoji, formattedMessage);

      if (onRecordFeedEvent) {
        onRecordFeedEvent('mood_changed', `deixou um bilhete de carinho para ${partnerProfile.name}`, `"${customMsg}"`);
      }

      setCustomMsg('');
      setSuccessMsg('Bilhete de Carinho voou até o seu amor! 🚀');
      triggerConfetti();

      setTimeout(() => {
        setSuccessMsg('');
      }, 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setSendingState(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dynamic Background Glass overlay */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Main Innovative Dialog Layout */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900/90 to-[#0b0f19] border border-pink-500/25 rounded-3xl w-full max-w-md max-h-[85vh] overflow-hidden shadow-2xl flex flex-col backdrop-blur-xl relative z-10 animate-fade-in text-white text-left font-sans">
        
        {/* Upper glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-12 bg-pink-500/10 rounded-full blur-xl pointer-events-none"></div>

        {/* Header Block */}
        <div className="p-4.5 border-b border-white/5 flex justify-between items-center bg-white/2 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-pink-500/15 text-pink-400">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-pink-300">Central de Sintonia</h3>
              <p className="text-[10px] text-zinc-400">Notificações, interação e sabedoria diária</p>
            </div>
          </div>
          
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer border-0 bg-transparent flex items-center justify-center"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* INNOVATIVE SUB-NAV TAB ROW */}
        <div className="flex bg-slate-950/40 p-1 mx-4.5 mt-4 rounded-xl border border-white/5 select-none">
          <button
            onClick={() => { performVibe(); setActiveTab('alerts'); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all border-0 cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'alerts' 
                ? 'bg-gradient-to-r from-pink-500/20 to-rose-500/20 text-pink-300 border border-pink-500/30 shadow-inner' 
                : 'text-zinc-400 hover:text-white bg-transparent'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            Notificações
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-[9px] min-w-[15px] h-3.5 px-1 rounded-full flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { performVibe(); setActiveTab('sync'); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all border-0 cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'sync' 
                ? 'bg-gradient-to-r from-pink-500/20 to-rose-500/20 text-pink-300 border border-pink-500/30 shadow-inner' 
                : 'text-zinc-400 hover:text-white bg-transparent'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-pink-400 animate-bounce" />
            Sintonia ⚡
          </button>

          <button
            onClick={() => { performVibe(); setActiveTab('wisdom'); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all border-0 cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'wisdom' 
                ? 'bg-gradient-to-r from-pink-500/20 to-rose-500/20 text-pink-300 border border-pink-500/30 shadow-inner' 
                : 'text-zinc-400 hover:text-white bg-transparent'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            Sabedoria
          </button>
        </div>

        {/* Success / Dynamic Status Bar */}
        {successMsg && (
          <div className="mx-4.5 mt-3.5 p-2 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-xl text-center text-[10.5px] font-bold leading-relaxed tracking-wide animate-fade-in flex items-center justify-center gap-1.5 shadow-md">
            <span>✨</span> {successMsg}
          </div>
        )}

        {/* TAB CONTENTS SCROLLER */}
        <div className="flex-1 overflow-y-auto mt-3.5 px-4.5 pb-2.5 max-h-[50vh]">
          
          {/* TAB A: HISTORIC ALERTS */}
          {activeTab === 'alerts' && (
            <div className="space-y-2 animate-fade-in">
              <div className="flex justify-between items-center text-[10px] text-zinc-500 font-sans tracking-wide border-b border-white/5 pb-2 mb-1">
                <span>Últimas movimentações de hoje</span>
                {sortedNotifs.length > 0 && onClearAll && (
                  <button
                    onClick={() => { performVibe(); onClearAll(); }}
                    className="text-[9.5px] text-pink-400 hover:underline border-0 bg-transparent font-bold cursor-pointer"
                  >
                    Excluir tudo
                  </button>
                )}
              </div>

              {sortedNotifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center text-xl mb-3 relative">
                    <Sparkles className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 text-pink-400" />
                    🕊️
                  </div>
                  <h4 className="text-pink-300 text-xs font-bold uppercase tracking-wider">Tudo no lugar!</h4>
                  <p className="text-zinc-400 text-[11px] mt-1.5 max-w-[240px] leading-relaxed">
                    Nenhum alerta pendente. Continue cultivando lindos hábitos em seu dia a dia! 💑
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/5 space-y-1">
                  {sortedNotifs.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => onMarkRead(item.id)}
                      className={`p-3 text-left cursor-pointer flex items-start gap-2.5 transition-all rounded-xl mt-1.5 first:mt-0 ${
                        !item.read 
                          ? 'bg-pink-500/5 hover:bg-pink-500/10 border-l-3 border-pink-400 shadow-sm' 
                          : 'hover:bg-white/5 opacity-70'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 ${
                        !item.read ? 'bg-pink-500/15 text-pink-300' : 'bg-slate-800 text-zinc-400'
                      }`}>
                        {item.icon || '🔔'}
                      </div>

                      {/* Content details */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11.5px] leading-normal font-sans tracking-wide ${!item.read ? 'text-white font-semibold' : 'text-zinc-300'}`}>
                          {item.message}
                        </p>
                        <span className="text-[9px] text-zinc-500 font-mono mt-0.5 flex items-center gap-1 leading-none">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Manual check indicator */}
                      {!item.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            performVibe();
                            onMarkRead(item.id);
                          }}
                          className="p-1 text-pink-400 hover:text-pink-300 hover:bg-pink-500/15 rounded-lg transition-all border-0 bg-transparent flex items-center justify-center shrink-0 cursor-pointer"
                          title="Marcar como lida"
                        >
                          <Check className="w-4.5 h-4.5 stroke-[3px]" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB B: INTERACTIVE QUICK SYNC & MESSAGING */}
          {activeTab === 'sync' && (
            <div className="space-y-4 animate-fade-in text-left">
              
              {/* Partner presence check */}
              {!partnerProfile ? (
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl text-center space-y-2">
                  <span className="text-2xl block">💔</span>
                  <h4 className="text-[12px] font-bold uppercase tracking-wider text-yellow-500">Nenhum Parceiro Conectado</h4>
                  <p className="text-zinc-400 text-[11px] leading-relaxed max-w-sm mx-auto">
                    A aba de Sintonia permite vibrar instantaneamente o celular do parceiro, enviar pokes e bilhetes românticos! Vincule com seu amor na aba Configurações de Casal para usarem juntos em tempo real.
                  </p>
                </div>
              ) : (
                <>
                  {/* Explanation card */}
                  <div className="bg-pink-500/5 border border-pink-500/10 p-3 rounded-xl flex items-center gap-2.5">
                    <span className="text-lg">⚡</span>
                    <p className="text-[10.5px] text-zinc-300 leading-snug">
                      Vibre a mente do seu amor! Escolha um toque instantâneo rápido ou escreva um bilhete que será arquivado no feed do casal.
                    </p>
                  </div>

                  {/* Toques Rápidos Grid */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-sans block">Toques de Atenção Instantâneos</span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { icon: '💖', label: 'Pensando em você', text: 'Estou pensando em você agora!' },
                        { icon: '💧', label: 'Beba Água', text: 'Hora de se hidratar por aí! Beba água.' },
                        { icon: '🥰', label: 'Te amo muito', text: 'Amor passando para lembrar que te ama muito!' },
                        { icon: '🌟', label: 'Incentivo Positivo', text: 'Você é foda, você vai conseguir tudo hoje!' },
                        { icon: '☕', label: 'Pausa Café', text: 'Que tal uma pausa curta para respirar?' },
                        { icon: '💌', label: 'Sintonizar Metas', text: 'Bora dar uma olhada nas nossas metas hoje?' }
                      ].map((ping, i) => (
                        <button
                          key={i}
                          onClick={() => sendQuickPing(ping.icon, ping.text)}
                          disabled={sendingState}
                          className="p-2.5 bg-slate-950/55 hover:bg-pink-500/5 duration-150 rounded-xl border border-white/5 hover:border-pink-500/20 text-left transition-all cursor-pointer flex items-center gap-2 font-sans overflow-hidden group/btn"
                        >
                          <span className="text-lg py-0.5 px-1 bg-pink-500/10 rounded-lg group-hover/btn:scale-110 duration-200 transition-transform">{ping.icon}</span>
                          <div className="min-w-0">
                            <span className="block text-[10.5px] font-bold text-primary leading-tight font-sans text-rose-300">{ping.label}</span>
                            <span className="block text-[9px] text-zinc-500 truncate leading-snug">{ping.text}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Note Composer */}
                  <form onSubmit={sendCustomCard} className="space-y-2 bg-slate-950/40 p-3 rounded-2xl border border-white/5">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-sans block">Deixar Bilhete de Carinho</span>
                    
                    <div className="flex gap-2 items-center mb-1 bg-slate-900 border border-white/5 p-1 rounded-xl">
                      <span className="text-[9.5px] text-zinc-400 pl-1.5 font-bold font-sans">Tom:</span>
                      {['💖', '😍', '☕', '🌹', '🚀'].map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => { performVibe(); setMsgEmoji(e); }}
                          className={`p-1 text-base rounded-md transition-all border-0 bg-transparent cursor-pointer hover:scale-115 ${
                            msgEmoji === e ? 'bg-pink-500/20 scale-110 border border-pink-500/40' : 'opacity-60'
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customMsg}
                        onChange={(e) => setCustomMsg(e.target.value)}
                        placeholder={`Enviar bilhete fofo para ${partnerProfile.name}...`}
                        maxLength={60}
                        className="flex-1 bg-slate-900/95 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500/50"
                      />
                      <button
                        type="submit"
                        disabled={!customMsg.trim() || sendingState}
                        className="py-2 px-3.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-bold flex items-center justify-center gap-1 text-xs border-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-97 transition-all leading-none focus:outline-none"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Enviar
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          )}

          {/* TAB C: KNOWLEDGE DECK & DECODE ADVICE */}
          {activeTab === 'wisdom' && (
            <div className="space-y-4 animate-fade-in text-left">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider font-sans block">Estoque Cósmico de Sintonia</span>
              
              {/* Dynamic Interactive Advice Card */}
              <div className="bg-gradient-to-br from-emerald-950/20 to-slate-900/40 border border-emerald-500/15 p-4 rounded-2xl relative overflow-hidden shadow-inner">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
                
                <span className="text-[9px] font-bold text-emerald-400 block tracking-wide uppercase font-mono mb-1 select-none">Tópico Recomendado de Hoje</span>
                <h4 className="text-[13px] font-extrabold text-white font-sans leading-snug">
                  {INSIGHTS_DECK[insightIdx].title}
                </h4>

                <p className="text-zinc-300 text-xs mt-2 leading-relaxed italic font-sans font-medium">
                  "{INSIGHTS_DECK[insightIdx].tip}"
                </p>
                
                <div className="mt-4 pt-3.5 border-t border-emerald-500/10 flex justify-between items-center text-[9px] text-zinc-500 font-sans select-none">
                  <span>Conhecimento traz sintonização</span>
                  <span className="font-bold">Card {insightIdx + 1} de {INSIGHTS_DECK.length}</span>
                </div>
              </div>

              {/* Rotate Button */}
              <button
                onClick={rotateInsight}
                className="w-full py-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 hover:text-emerald-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Sortear Outro Insight de Conexão
              </button>
            </div>
          )}

        </div>

        {/* Footer actions row */}
        <div className="p-3 bg-slate-950/60 border-t border-white/5 flex gap-2 justify-between items-center">
          <span className="text-[9px] text-zinc-500 font-mono select-none pl-2">
            AI Studio Central v1.2.5
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:scale-[1.02] active:scale-97 text-white text-xs font-bold shadow-md shadow-pink-500/10 transition-all cursor-pointer border-0"
          >
            Fechar Central
          </button>
        </div>
      </div>
    </div>
  );
});

NotificationPanel.displayName = 'NotificationPanel';
export default NotificationPanel;
