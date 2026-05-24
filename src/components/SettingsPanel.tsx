import { useState, useMemo, useEffect } from 'react';
import { 
  Camera, 
  Heart, 
  Volume2, 
  VolumeX, 
  Sparkle, 
  Check, 
  Copy, 
  Trash2, 
  Compass, 
  Smile, 
  Share2, 
  RefreshCw,
  Gift,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { UserProfile, Couple } from '../types';
import { playCompletionSound, triggerConfetti, performVibe } from '../utils/fx';

interface SettingsPanelProps {
  currentUserProfile: UserProfile;
  partnerProfile: UserProfile | null;
  couple: Couple | null;
  theme: 'dark' | 'light';
  isGuestMode: boolean;
  onUpdateProfile: (uid: string, data: Partial<UserProfile>) => void;
  onUpdateCoupleName: (name: string) => void;
  onUpdateCoupleAnniversary: (dateStr: string) => void;
  onUpdateCoupleSetting: (key: string, value: any) => void;
  onChangeTheme: (theme: 'dark' | 'light') => void;
  onRecordFeedEvent: (type: string, title?: string, extra?: string) => void;
  triggerToast: (msg: string) => void;
}

export const SettingsPanel = ({
  currentUserProfile,
  partnerProfile,
  couple,
  theme,
  isGuestMode,
  onUpdateProfile,
  onUpdateCoupleName,
  onUpdateCoupleAnniversary,
  onUpdateCoupleSetting,
  onChangeTheme,
  onRecordFeedEvent,
  triggerToast
}: SettingsPanelProps) => {

  const [loading, setLoading] = useState(false);
  
  // Local states
  const [tempName, setTempName] = useState(currentUserProfile.name);
  
  // Web Notification Permission State Tracker
  const [permission, setPermission] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  const handleRequestPermission = async () => {
    performVibe();
    if (typeof window === 'undefined' || !('Notification' in window)) {
      triggerToast('Notificações de sistema não são suportadas por este navegador.');
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        playCompletionSound();
        triggerConfetti();
        triggerToast('Notificações autorizadas com sucesso! 😍📱');
        
        // Trigger instant sweet confirmation
        setTimeout(() => {
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(reg => {
              reg.showNotification('Sintonia Casal 💑', {
                body: 'Sucesso! Suas notificações de casal aparecerão na tela do celular mesmo fora do site!',
                icon: '/icon.svg',
                vibrate: [100, 50, 100],
                badge: '/icon.svg'
              } as any);
            });
          } else {
            new Notification('Sintonia Casal 💑', {
              body: 'Sucesso! Suas notificações de casal aparecerão na tela do celular!',
              icon: '/icon.svg'
            });
          }
        }, 600);
      } else {
        triggerToast('Permissão de notificação negada/cancelada.');
      }
    } catch (err) {
      triggerToast('Não foi possível ativar as notificações no momento.');
    }
  };

  const handleTestSystemNotif = () => {
    performVibe();
    if (permission !== 'granted') {
      triggerToast('Por favor, ative as notificações primeiro clicando no botão ao lado.');
      return;
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification('Sintonia Inteligente 🎙️🧠', {
          body: `Ei, ${currentUserProfile.name}! Este é um aviso na tela do seu celular! Tudo sincronizado!`,
          icon: '/icon.svg',
          vibrate: [200, 100, 200],
          badge: '/icon.svg',
          tag: 'sintonia-test'
        } as any);
      });
    } else {
      new Notification('Sintonia Inteligente 🎙️🧠', {
        body: `Ei, ${currentUserProfile.name}! Este é um aviso na tela do seu celular!`,
        icon: '/icon.svg'
      });
    }
    triggerToast('Aviso de teste disparado para a tela do seu dispositivo!');
  };
  const [tempCoupleName, setTempCoupleName] = useState(couple?.relationshipName || '');
  const [anniversaryDate, setAnniversaryDate] = useState(couple?.anniversaryDate || couple?.settings?.anniversaryDate || '');

  // Keep local inputs in sync with database updates in real-time
  useEffect(() => {
    if (currentUserProfile?.name) {
      setTempName(currentUserProfile.name);
    }
  }, [currentUserProfile?.name]);

  useEffect(() => {
    if (couple?.relationshipName) {
      setTempCoupleName(couple.relationshipName);
    }
  }, [couple?.relationshipName]);

  useEffect(() => {
    const date = couple?.anniversaryDate || couple?.settings?.anniversaryDate || '';
    setAnniversaryDate(date);
  }, [couple?.anniversaryDate, couple?.settings?.anniversaryDate]);

  // Retrieve Sound / Confetti settings from localStorage or fallback
  const [soundsEnabled, setSoundsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('couple_os_sfx_muted') !== 'true';
  });
  const [confettiEnabled, setConfettiEnabled] = useState<boolean>(() => {
    return localStorage.getItem('couple_os_confetti_disabled') !== 'true';
  });

  const partnerName = partnerProfile?.name || 'Parceiro(a)';

  // Calculate days together from anniversary date
  const relationshipDuration = useMemo(() => {
    if (!anniversaryDate) return null;
    try {
      const start = new Date(anniversaryDate + 'T12:00:00'); // Prevent timezone offsets
      const today = new Date();
      // Zero out time
      today.setHours(12, 0, 0, 0);
      
      const diffTime = today.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (isNaN(diffDays)) return null;
      return diffDays;
    } catch (e) {
      return null;
    }
  }, [anniversaryDate]);

  // Handle Profile Update
  const handleSaveProfile = () => {
    if (!tempName.trim()) {
      triggerToast('Seu nome não pode ser vazio!');
      return;
    }
    onUpdateProfile(currentUserProfile.uid, { name: tempName.trim() });
    onRecordFeedEvent('mood_changed', `alterou seu nome de exibição para: "${tempName.trim()}"`);
    triggerToast('Nome de exibição atualizado!');
  };

  // Handle Couple Info Update
  const handleSaveCoupleDetails = () => {
    setLoading(true);
    try {
      if (tempCoupleName.trim()) {
        onUpdateCoupleName(tempCoupleName.trim());
      }
      if (anniversaryDate) {
        onUpdateCoupleAnniversary(anniversaryDate);
      }
      triggerToast('Dados do casal salvos com sucesso!');
      onRecordFeedEvent('mood_changed', `atualizou os detalhes e marcos do casal`);
    } catch (e) {
      triggerToast('Erro ao salvar os detalhes.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Copy IDs
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    triggerToast(`${label} copiado para a área de transferência!`);
    performVibe();
  };

  // Toggle Sounds
  const handleToggleSounds = () => {
    const nextVal = !soundsEnabled;
    setSoundsEnabled(nextVal);
    localStorage.setItem('couple_os_sfx_muted', (!nextVal).toString());
    triggerToast(nextVal ? 'Sons do app ativados! 🔊' : 'Sons do app silenciados! 🔇');
    if (nextVal) {
      playCompletionSound();
    }
  };

  // Toggle Confetti
  const handleToggleConfetti = () => {
    const nextVal = !confettiEnabled;
    setConfettiEnabled(nextVal);
    localStorage.setItem('couple_os_confetti_disabled', (!nextVal).toString());
    triggerToast(nextVal ? 'Comemorações com confete ativadas! 🎉' : 'Efeitos de confete desativados!');
    if (nextVal) {
      triggerConfetti();
    }
  };

  // Playful test trigger
  const handleTestCelebration = () => {
    performVibe();
    playCompletionSound();
    triggerConfetti();
    triggerToast('Amor e felicidade testados com sucesso! 🥰🎉');
  };

  return (
    <div className="space-y-4 font-sans text-left">
      
      {/* 1. Profile Mood check-in block */}
      {currentUserProfile && (
        <div className="bg-card p-4 border border-primary/20 rounded-3xl space-y-3.5 shadow-md">
          <div>
            <span className="text-xs text-secondary font-bold uppercase block tracking-wider leading-none mb-1">Como você está se sentindo?</span>
            <p className="text-[10px] text-zinc-500 leading-normal">Selecione um emoji de humor para demonstrar ao seu parceiro(a)</p>
          </div>
          
          <div className="flex gap-2 justify-between items-center p-2.5 bg-secondary/5 rounded-2xl border border-primary/10 flex-wrap">
            {['😊', '🥰', '😴', '😢', '🔥', '😇', '🍕', '💆', '💪', '🍿'].map(emoji => (
              <button
                key={emoji}
                onClick={() => {
                  onUpdateProfile(currentUserProfile.uid, { mood: emoji });
                  onRecordFeedEvent('mood_changed', `atualizou seu humor próprio para: ${emoji}`);
                  if (partnerProfile) {
                    // Push notification placeholder is handled upstream
                  }
                  triggerToast('Seu estado de espírito foi sincronizado!');
                }}
                className={`text-2xl p-1.5 hover:scale-130 transition-transform active:scale-95 bg-transparent border-0 cursor-pointer ${
                  currentUserProfile.mood === emoji ? 'filter drop-shadow-md scale-120 opacity-100 ring-2 ring-pink-500/30 rounded-full bg-pink-500/5' : 'opacity-60 hover:opacity-100'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. Photo upload section */}
      <div className="bg-card p-4 border border-primary/20 rounded-3xl space-y-3 shadow-md">
        <span className="text-xs text-secondary font-bold uppercase block tracking-wider">Foto de Capa do Casal</span>
        <div className="flex flex-col items-center gap-3">
          <div 
            className="photo-circle border-pink-500/25 relative overflow-hidden group cursor-pointer" 
            style={{ width: '90px', height: '90px' }} 
            onClick={() => document.getElementById('photoInputSettingsPanelCouple')?.click()}
          >
            {couple?.couplePhoto ? (
              <img src={couple.couplePhoto} className="w-full h-full object-cover" alt="Casal" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-4xl shadow-inner select-none animate-pulse">
                💑
              </div>
            )}
            <div className="photo-overlay absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </div>
          <input 
            type="file" 
            id="photoInputSettingsPanelCouple" 
            accept="image/*" 
            className="hidden" 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (event) => {
                if (event.target?.result) {
                  onUpdateCoupleSetting('couplePhoto', event.target.result as string);
                  triggerToast('Foto atualizada! Carregando...');
                }
              };
              reader.readAsDataURL(file);
            }} 
          />
          <p className="text-[10px] text-zinc-400 text-center leading-normal max-w-sm">
            Toque na imagem acima para enviar ou atualizar a linda foto oficial que ilustra o painel inicial do casal.
          </p>
        </div>
      </div>

      {/* 3. Personalized Couple Anniversary and Identity Settings */}
      <div className="bg-card p-4 border border-primary/20 rounded-3xl space-y-4 shadow-md">
        <span className="text-xs text-secondary font-bold uppercase block tracking-wider leading-none">Nossa Identidade & Marcos</span>
        
        <div className="space-y-3.5">
          {/* Couple Relationship Title */}
          <div>
            <label className="text-[10px] text-zinc-500 font-bold block mb-1">Nome do Nosso Relacionamento:</label>
            <input 
              type="text" 
              value={tempCoupleName}
              onChange={e => setTempCoupleName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-primary/20 rounded-xl text-primary text-xs font-bold focus:outline-none focus:border-pink-500"
              placeholder="Ex: Amor Infinito, Nosso Ninho, etc."
            />
          </div>

          {/* Anniversary date picker */}
          <div>
            <label className="text-[10px] text-zinc-500 font-bold block mb-1">Data que Tudo Começou (Namoro/Casamento):</label>
            <div className="relative">
              <input 
                type="date" 
                value={anniversaryDate}
                onChange={e => setAnniversaryDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-primary/20 rounded-xl text-primary text-xs font-bold focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          {/* Interactive duration counter box */}
          {relationshipDuration !== null && relationshipDuration >= 0 && (
            <div className="p-3 bg-pink-500/5 rounded-2xl border border-pink-500/20 flex items-center justify-between text-left animate-fade-in">
              <div className="space-y-0.5">
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Marcador de Tempo</span>
                <p className="text-xs text-primary font-medium">
                  Vocês estão construindo essa linda história há:
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-sm font-black text-pink-400 block font-mono">
                  {relationshipDuration} dias
                </span>
                <span className="text-[8px] text-pink-300 font-bold uppercase flex items-center gap-0.5 justify-end">
                  De puro amor <Heart className="w-2.5 h-2.5 fill-current text-pink-400" />
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleSaveCoupleDetails}
            disabled={loading}
            className="w-full py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-xs rounded-xl border-0 shadow-sm cursor-pointer hover:opacity-95 transition-all text-center"
          >
            {loading ? 'Salvando...' : 'Salvar Dados do Relacionamento 💑'}
          </button>
        </div>
      </div>

      {/* 4. Edit user identity info */}
      {currentUserProfile && (
        <div className="bg-card p-4 border border-primary/20 rounded-3xl space-y-3.5 shadow-md">
          <span className="text-xs text-secondary font-bold uppercase block tracking-wider leading-none">Minha Conta</span>
          
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-zinc-500 font-bold block mb-1">Meu E-mail de login:</label>
              <input 
                type="email" 
                value={currentUserProfile.email}
                disabled 
                className="w-full px-3 py-2 bg-slate-900 border border-primary/10 rounded-xl text-zinc-500 text-xs italic focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 font-bold block mb-1">Meu Nome:</label>
              <input 
                type="text" 
                value={tempName}
                onChange={e => setTempName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-primary/20 rounded-xl text-primary text-xs font-bold focus:outline-none focus:border-emerald-500"
                placeholder="Ex: Seu Nome"
              />
            </div>
          </div>
          <button
            onClick={handleSaveProfile}
            className="w-full py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-xs rounded-xl border-0 shadow-sm cursor-pointer"
          >
            Salvar Meu Nome
          </button>
        </div>
      )}

      {/* 5. Audio & Efeitos visual triggers */}
      <div className="bg-card p-4 border border-primary/20 rounded-3xl space-y-3.5 shadow-md">
        <span className="text-xs text-secondary font-bold uppercase block tracking-wider leading-none">Comemoração & Efeitos</span>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Sounds switch */}
          <button
            onClick={handleToggleSounds}
            className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between h-20 cursor-pointer ${
              soundsEnabled 
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
                : 'bg-zinc-950/20 border-zinc-900 text-zinc-500'
            }`}
          >
            {soundsEnabled ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5 text-zinc-500" />}
            <div>
              <span className="text-[10px] font-bold uppercase block leading-none">Efeitos Sonoros</span>
              <span className="text-[8px] text-zinc-400 mt-0.5 block">{soundsEnabled ? 'Ativados (Tocar sons)' : 'Silenciados'}</span>
            </div>
          </button>

          {/* Confetti switch */}
          <button
            onClick={handleToggleConfetti}
            className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between h-20 cursor-pointer ${
              confettiEnabled 
                ? 'bg-pink-500/5 border-pink-500/20 text-pink-400' 
                : 'bg-zinc-950/20 border-zinc-900 text-zinc-500'
            }`}
          >
            <Sparkle className={`w-5 h-5 ${confettiEnabled ? 'text-pink-400 animate-spin-slow' : 'text-zinc-500'}`} />
            <div>
              <span className="text-[10px] font-bold uppercase block leading-none">Confete ao Concluir</span>
              <span className="text-[8px] text-zinc-400 mt-0.5 block">{confettiEnabled ? 'Ativados (Festa)' : 'Desativados'}</span>
            </div>
          </button>
        </div>

        {/* Interactive Sandbox Test trigger */}
        <div className="bg-slate-950/40 p-3 rounded-2xl border border-white/5 flex items-center justify-between gap-3">
          <div className="text-left font-sans">
            <span className="text-[10px] text-primary font-bold block">Laboratório do Amor</span>
            <span className="text-[9px] text-zinc-500 block leading-tight">Teste os sons e estouro de confetes!</span>
          </div>
          <button
            onClick={handleTestCelebration}
            className="px-3 py-1.5 bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-500/35 hover:bg-pink-500/20 text-pink-400 font-extrabold text-[10px] rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm"
          >
            🎉 Testar Comemoração
          </button>
        </div>
      </div>

      {/* 6. Dynamic Theme toggle */}
      <div className="bg-card p-4 border border-primary/20 rounded-3xl flex items-center justify-between font-sans select-none shadow-md">
        <div className="text-left">
          <span className="text-xs text-primary font-bold block uppercase tracking-wider leading-none mb-1">Cores do Tema</span>
          <span className="text-[10px] text-secondary">Alterne entre iluminação Clara e Escura</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary font-bold font-mono">
            {theme === 'dark' ? 'Modo Escuro 🌙' : 'Modo Claro ☀️'}
          </span>
          
          <label className="switch">
            <input 
              type="checkbox" 
              checked={theme === 'light'} 
              onChange={() => {
                const nextTheme = theme === 'dark' ? 'light' : 'dark';
                onChangeTheme(nextTheme);
              }}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      {/* 6.5. System Notifications Permission Box */}
      <div className="bg-card p-4 border border-primary/20 rounded-3xl space-y-3.5 shadow-md">
        <div className="flex items-start gap-2.5">
          <div className="p-2 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
          </div>
          <div className="text-left font-sans">
            <span className="text-xs text-primary font-black block uppercase tracking-wider leading-none mb-1">
              Notificações Externas no Celular (PWA)
            </span>
            <p className="text-[10px] text-zinc-500 leading-normal">
              Ative para receber avisos do Coach de hábitos e lembretes instantâneos do seu parceiro direto na tela de bloqueio e barra de status, mesmo com o site fechado!
            </p>
          </div>
        </div>

        <div className="p-3 bg-slate-900/60 rounded-2xl border border-white/5 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-secondary font-bold font-sans">Permissão do Sistema:</span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase font-mono ${
              permission === 'granted' 
                ? 'bg-emerald-500/10 text-emerald-400' 
                : permission === 'denied' 
                  ? 'bg-rose-500/10 text-rose-400' 
                  : 'bg-amber-500/10 text-amber-500'
            }`}>
              {permission === 'granted' ? 'Permitida (Ativa) ✅' : permission === 'denied' ? 'Negada pelo celular ❌' : 'Pendente (Precisa Ativar) ⚠️'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={handleRequestPermission}
              disabled={permission === 'granted'}
              className={`w-full py-2 px-3 border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/15 rounded-xl text-xs font-black uppercase text-indigo-400 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                permission === 'granted' ? 'opacity-40 cursor-not-allowed border-zinc-800 text-zinc-500 hover:bg-transparent' : ''
              }`}
            >
              🔔 Liberar Avisos de Tela
            </button>

            <button
              onClick={handleTestSystemNotif}
              className="w-full py-2 px-3 bg-gradient-to-r from-indigo-500/10 to-teal-500/10 hover:bg-indigo-500/20 text-indigo-300 font-extrabold text-xs rounded-xl border border-indigo-500/35 flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
            >
              📱 Testar no Meu Aparelho
            </button>
          </div>
        </div>

        {/* Dynamic Help Tutorial on how to install and setup PWA for background access */}
        <div className="bg-slate-950/40 p-3 rounded-2xl border border-pink-500/10 text-[9.5px] leading-relaxed text-zinc-400 text-left font-sans space-y-1.5">
          <span className="font-extrabold text-pink-300 block uppercase tracking-wider text-[8px]">
            💡 Como receber notificações com o site fechado:
          </span>
          <p>
            Para que as notificações apareçam na tela bloqueada como um aplicativo real de celular:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-[9px]">
            <li>
              <strong>No Android:</strong> Toque nos 3 pontos do Google Chrome e clique em <span className="text-zinc-200 font-semibold">"Instalar aplicativo"</span> (ou "Adicionar à tela inicial").
            </li>
            <li>
              <strong>No iPhone (iOS):</strong> Abra o link no Safari, clique no ícone de <span className="text-zinc-200 font-semibold">"Compartilhar"</span> (setinha para cima) e depois em <span className="text-zinc-200 font-semibold">"Adicionar à Tela de Início"</span>. Abra o app por esse ícone e autorize as notificações!
            </li>
          </ul>
        </div>
      </div>

      {/* 7. Share ID cards section */}
      <div className="bg-card p-4 border border-primary/20 rounded-3xl space-y-3.5 shadow-md">
        <div>
          <span className="text-xs text-secondary font-bold uppercase block tracking-wider leading-none mb-1">Sincronização & Códigos</span>
          <p className="text-[10px] text-zinc-500 leading-normal">Use estes códigos para conectar ou verificar seus dados de casal em tempo real</p>
        </div>

        <div className="space-y-2 text-xs font-sans">
          {/* User Specific Code */}
          <div className="p-2.5 bg-slate-900 rounded-2xl border border-primary/10 flex items-center justify-between">
            <div className="truncate pr-2">
              <span className="text-[8.5px] uppercase tracking-wider text-zinc-500 block font-bold">Meu ID Único</span>
              <span className="font-mono text-[10px] text-zinc-300 truncate block">{currentUserProfile.uid}</span>
            </div>
            <button
              onClick={() => handleCopyText(currentUserProfile.uid, 'Meu ID')}
              className="p-1.5 hover:bg-secondary/15 rounded bg-transparent border-0 cursor-pointer text-zinc-400"
              title="Copiar ID de Usuário"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Couple Code */}
          {couple?.id && (
            <div className="p-2.5 bg-slate-900 rounded-2xl border border-pink-500/10 flex items-center justify-between">
              <div className="truncate pr-2">
                <span className="text-[8.5px] uppercase tracking-wider text-pink-300 block font-bold">Código do Nosso Casal (Sync)</span>
                <span className="font-mono text-sm text-pink-400 font-extrabold truncate block">{couple.id}</span>
              </div>
              <button
                onClick={() => handleCopyText(couple.id, 'Código do Casal')}
                className="p-1.5 hover:bg-pink-500/15 rounded bg-transparent border-0 cursor-pointer text-pink-400"
                title="Copiar Código do Casal"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
};

SettingsPanel.displayName = 'SettingsPanel';
export default SettingsPanel;
