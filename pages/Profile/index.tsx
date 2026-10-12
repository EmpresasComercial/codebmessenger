import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Wallet,
  PlusCircle,
  CreditCard,
  MessageSquare,
  ShieldAlert,
  Volume2,
  MessagesSquare,
  Smartphone,
  Globe,
  ChevronRight,
  Star,
  HelpCircle,
  Lightbulb,
  Lock,
  LogOut,
  Camera,
  ChevronLeft,
  Edit3,
  Download,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../contexts/LanguageContext";
import { formatCurrency } from "../../lib/currency";
import { useToast } from "../../components/Toast";
import EditProfileModal from "./components/EditProfileModal";

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const settingsSectionRef = useRef<HTMLDivElement>(null);

  const [showLanguage, setShowLanguage] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [totalDeposits, setTotalDeposits] = useState<number>(0);
  const [totalWithdrawals, setTotalWithdrawals] = useState<number>(0);
  const [comissaoEquipe, setComissaoEquipe] = useState<number>(0);
  const [refCode, setRefCode] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [userBio, setUserBio] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  useEffect(() => {
    if (location.state?.openLanguage) {
      setShowLanguage(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  // Busca dados reais do banco via RPC segura (SECURITY DEFINER)
  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const meta = user.user_metadata || {};
        const fName = meta.first_name || (meta.name || meta.full_name || "").split(" ")[0];
        const lName = meta.last_name || (meta.name || meta.full_name || "").split(" ").slice(1).join(" ");
        setFirstName(fName);
        setLastName(lName);
        setUserName([fName, lName].filter(Boolean).join(" "));
        if (meta.bio) setUserBio(meta.bio);
        if (meta.avatar_url) setAvatarUrl(meta.avatar_url);
      }

      const { data, error } = await supabase.rpc("get_my_account_data");
      if (!error && data && data.length > 0) {
        const d = data[0] as any;
        setBalance(Number(d.saldo_disponivel ?? 0));
        setTotalDeposits(Number(d.total_recarregado ?? 0));
        setTotalWithdrawals(Number(d.total_retirado ?? 0));
        setComissaoEquipe(Number(d.total_comissao_equipe ?? 0));
        if (d.telefone) setPhone(d.telefone);
        if (d.nome_exibicao) setUserName(d.nome_exibicao);
        if (d.codigo_meu_refferal) setRefCode(d.codigo_meu_refferal);
      }
    } catch {
      // Falha silenciosa
    }
  }, []);

  // Realtime: atualiza saldo/recargas/retiradas em tempo real
  useEffect(() => {
    fetchData();

    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`profile_realtime_${user.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'sys_t500',
          filter: `id=eq.${user.id}`
        }, () => {
          fetchData();
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'renda_diaria_mcpn',
          filter: `user_id=eq.${user.id}`
        }, () => { fetchData(); })
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      showToast("Sessão terminada com sucesso", "success");
      navigate("/login");
    } catch {
      navigate("/login");
    }
  };

  return (
    <div className="w-full min-h-screen bg-white dark:bg-[#17212b] font-sans text-black dark:text-white flex flex-col pb-24">

      {/* ── CABEÇALHO NO ESTILO OFICIAL DO TELEGRAM ── */}
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-gray-100 bg-white px-3 text-[#222222] dark:border-[#202b36] dark:bg-[#17212b] dark:text-white">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/org')}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[#2481cc] transition-colors hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-[#202b36] dark:active:bg-[#293847]" 
            aria-label="Voltar"
          >
            <ChevronLeft className="h-6 w-6 stroke-[2.2]" />
          </button>
          <h1 className="text-[17px] font-semibold tracking-tight">Definições</h1>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={() => setShowEditProfile(true)}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[#2481cc] transition-colors hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-[#202b36] dark:active:bg-[#293847]"
            aria-label="Editar perfil"
            title="Editar perfil"
          >
            <Edit3 className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ── AVATAR & PERFIL TELEGRAM WEB ── */}
      <section className="bg-white dark:bg-[#17212b] border-b border-gray-100 dark:border-[#202b36] pt-6 pb-5 px-2 flex flex-col items-center">
        <div className="relative mb-3 cursor-pointer" onClick={() => setShowEditProfile(true)}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={userName}
              className="w-[96px] h-[96px] rounded-full object-cover shadow-sm ring-4 ring-[#2481cc]/20"
            />
          ) : (
            <div className="w-[96px] h-[96px] rounded-full bg-gradient-to-br from-[#3390ec] to-[#1e6dc8] flex items-center justify-center shadow-sm ring-4 ring-[#2481cc]/20">
              <span className="text-[38px] font-bold text-white">{firstName.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setShowEditProfile(true); }}
            className="absolute bottom-0 right-0 w-[34px] h-[34px] bg-[#3390ec] rounded-full flex items-center justify-center border-[2.5px] border-white shadow-sm hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            aria-label="Editar perfil"
          >
            <Camera className="w-[16px] h-[16px] text-white" strokeWidth={2.5} />
          </button>
        </div>
        <h2 className="text-[20px] font-bold tracking-tight text-black dark:text-white mb-0.5 text-center">{userName}</h2>
        {userBio ? (
          <p className="text-[13px] text-[#707579] dark:text-[#8e9aa5] text-center max-w-[480px] mb-1">{userBio}</p>
        ) : null}
      </section>

      {/* ── LISTA DE ITENS FLAT (GRUDADO NA ESQUERDA E DIREITA COM 8px DE MARGEM) ── */}
      <main className="w-full flex-1 flex flex-col divide-y divide-gray-100/80 dark:divide-gray-800/80">

        {/* DIVISOR DE SEÇÃO */}
        <div className="h-2.5 bg-[#f0f2f5] dark:bg-[#101921] border-y border-gray-100/80 dark:border-gray-800/80" />

        {/* SEÇÃO 2: OPERAÇÕES & AÇÕES */}
        <div className="w-full bg-white dark:bg-[#17212b]">
          <SettingsItem
            icon={<Wallet className="w-5 h-5 text-white" />}
            iconBg="bg-[#0284c7]"
            title="Carteira wallet"
            subtitle="Solicite o levantamento dos seus fundos"
            onClick={() => navigate("/carteira")}
          />
          <SettingsItem
            icon={<PlusCircle className="w-5 h-5 text-white" />}
            iconBg="bg-[#10b981]"
            title="Payment Wallet"
            subtitle="Faça um depósito na sua conta"
            onClick={() => navigate("/sand-pay")}
          />
        </div>

        {/* DIVISOR DE SEÇÃO */}
        <div className="h-2.5 bg-[#f0f2f5] dark:bg-[#101921] border-y border-gray-100/80 dark:border-gray-800/80" />

        {/* SEÇÃO 3: DEFINIÇÕES GERAIS */}
        <div ref={settingsSectionRef} className="w-full bg-white dark:bg-[#17212b]">
          <div className="px-2 pt-3 pb-1.5">
            <span className="text-[12px] font-semibold text-[#517da2] dark:text-[#64b5f6] uppercase tracking-wider">Definições</span>
          </div>

          <SettingsItem
            icon={<Lightbulb className="w-5 h-5 text-white fill-white" />}
            iconBg="bg-[#b375d6]"
            title="Introdução ao Telegram"
            subtitle="Descubra novas funcionalidades"
            onClick={() => navigate("/sobre-telegram business")}
          />

          <SettingsItem
            icon={<MessageSquare className="w-5 h-5 text-white" />}
            iconBg="bg-[#f2a93b]"
            title="Chat da comunidade"
            subtitle="Converse com membros da comunidade"
            onClick={() => navigate("/org")}
          />

          <SettingsItem
            icon={<Volume2 className="w-5 h-5 text-white fill-white" />}
            iconBg="bg-[#fe384f]"
            title="Notifications"
            subtitle="Sounds, Calls, Badges"
            onClick={() => {
              if ("Notification" in window) {
                Notification.requestPermission();
                showToast("Configuração de notificações atualizada", "info");
              }
            }}
          />

          <SettingsItem
            icon={<Download className="w-5 h-5 text-white" />}
            iconBg="bg-[#e95171]"
            title="Download APK"
            subtitle="Baixe e instale o aplicativo"
            onClick={() => navigate("/android?setln=pt")}
          />

          <SettingsItem
            icon={<MessagesSquare className="w-5 h-5 text-white" />}
            iconBg="bg-[#3390ec]"
            title="Canal postes"
            subtitle="Aceder aos anúncios do Telegram e às provas de retirada"
            onClick={() => navigate("/canal-oficial")}
          />

          <SettingsItem
            icon={<CreditCard className="w-5 h-5 text-white" />}
            iconBg="bg-[#3390ec]"
            title="Carteira bancária"
            subtitle="Adicionar cartão bancário"
            onClick={() => navigate("/bank")}
          />

        </div>

        {/* DIVISOR DE SEÇÃO */}
        <div className="h-2.5 bg-[#f0f2f5] dark:bg-[#101921] border-y border-gray-100/80 dark:border-gray-800/80" />

        {/* SEÇÃO 4: AJUDA & SUPORTE */}
        <div className="w-full bg-white dark:bg-[#17212b]">
          <div className="px-2 pt-3 pb-1.5">
            <span className="text-[12px] font-semibold text-[#517da2] dark:text-[#64b5f6] uppercase tracking-wider">Ajuda</span>
          </div>

          <SettingsItem
            icon={<HelpCircle className="w-5 h-5 text-white" />}
            iconBg="bg-[#3390ec]"
            title="Perguntas Frequentes"
            subtitle="Tire as suas dúvidas"
            onClick={() => navigate("/help-faq")}
          />

          <SettingsItem
            icon={<Globe className="w-5 h-5 text-white" />}
            iconBg="bg-[#b375d6]"
            title="Idioma"
            subtitle="Português (Brasil)"
            onClick={() => setShowLanguage(true)}
          />

          <SettingsItem
            icon={<ShieldAlert className="w-5 h-5 text-white" />}
            iconBg="bg-[#2481cc]"
            title="Redefinir Senha"
            subtitle="Altere a sua senha de acesso"
            onClick={() => navigate("/alterar-senha")}
          />

          <SettingsItem
            icon={<Smartphone className="w-5 h-5 text-white" />}
            iconBg="bg-[#46c2ca]"
            title="Termo e privacidade"
            subtitle="Ver versão e actualizar a aplicação"
            isLast={true}
            onClick={() => navigate("/devices")}
          />
        </div>

        {/* DIVISOR DE SEÇÃO */}
        <div className="h-2.5 bg-[#f0f2f5] dark:bg-[#101921] border-y border-gray-100/80 dark:border-gray-800/80" />

        {/* SEÇÃO 5: SAIR DA CONTA */}
        <div className="w-full bg-white dark:bg-[#17212b]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-2 py-3.5 text-left hover:bg-red-50/50 dark:hover:bg-red-950/20 active:bg-red-50 transition-colors cursor-pointer"
          >
            <div className="w-[34px] h-[34px] rounded-[10px] bg-red-500 flex items-center justify-center shrink-0 mr-3.5">
              <LogOut className="w-5 h-5 text-white" />
            </div>
            <span className="text-[15px] font-semibold text-red-600 dark:text-red-400">Terminar sessão</span>
          </button>
        </div>

      </main>

      {/* MODAL DE IDIOMA */}
      {showLanguage && (
        <div className="fixed inset-0 z-50 bg-[#f1f1f2] overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            {/* Header do Modal */}
            <div className="flex items-center px-4 pt-5 pb-3 bg-[#f1f1f2] sticky top-0 z-10 border-b border-gray-200/60">
              <button onClick={() => setShowLanguage(false)} className="mr-3 p-1 rounded-full active:opacity-50">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M5 12l7-7M5 12l7 7" />
                </svg>
              </button>
              <span className="text-[18px] font-bold flex-1">Idioma</span>
            </div>

            <div className="px-3 flex flex-col gap-4 pb-12 pt-3">
              {/* Traduzir Mensagens Card */}
              <div className="bg-white rounded-[18px] overflow-hidden shadow-2xs border border-gray-100">
                <div className="px-4 pt-3 pb-1">
                  <span className="text-[13px] font-semibold text-[#2481cc]">Traduzir Mensagens</span>
                </div>
                <TranslateRow label="Mostrar o Botão Traduzir" defaultOn={true} />
                <TranslateRow label="Traduzir Chats Inteiros" locked={true} />
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[15px] text-black">Não Traduzir</span>
                  <span className="text-[13px] font-medium text-[#2481cc]">3 Idiomas</span>
                </div>
              </div>

              {/* Lista de Idiomas */}
              <div className="bg-white rounded-[18px] overflow-hidden shadow-2xs border border-gray-100">
                <div className="px-4 pt-3 pb-1">
                  <span className="text-[13px] font-semibold text-[#2481cc]">Idioma do Aplicativo</span>
                </div>
                <LangRow label="Português (Brasil)" sub="Portuguese (Brazil)" code="pt" available />
                <LangRow label="English" sub="English" code="en" available />
                <LangRow label="Français" sub="French" code="fr" available />
                <LangRow label="العربية" sub="Arabic" code="ar" />
                <LangRow label="简体中文" sub="Chinese (Simplified)" code="zh-hans" />
                <LangRow label="Español" sub="Spanish" code="es" isLast />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR PERFIL */}
      <EditProfileModal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        initialData={{ firstName, lastName, bio: userBio, avatarUrl, phone }}
        totalDeposits={totalDeposits}
        totalWithdrawals={totalWithdrawals}
        comissaoEquipe={comissaoEquipe}
        onSaved={({ firstName: fn, lastName: ln, bio: b, avatarUrl: av }) => {
          setFirstName(fn);
          setLastName(ln);
          setUserName([fn, ln].filter(Boolean).join(" "));
          setUserBio(b);
          setAvatarUrl(av);
        }}
      />

    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   COMPONENTES AUXILIARES
══════════════════════════════════════════════════════════════ */
function SettingsItem({
  icon,
  iconBg,
  title,
  subtitle,
  isLast = false,
  onClick,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle?: string;
  isLast?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className={`w-full flex items-center px-2 py-3 hover:bg-gray-50/80 dark:hover:bg-white/5 active:bg-gray-100 cursor-pointer transition-colors ${
        !isLast ? "border-b border-gray-100/70 dark:border-gray-800/70" : ""
      }`}
      onClick={onClick}
    >
      <div className={`w-[34px] h-[34px] rounded-[10px] ${iconBg} flex items-center justify-center shrink-0 mr-3.5 shadow-2xs`}>
        {icon}
      </div>
      <div className="flex-1 flex flex-col justify-center py-0.5 min-w-0">
        <span className="text-[15px] font-medium text-black dark:text-white leading-tight mb-0.5 truncate">{title}</span>
        {subtitle && (
          <span className="text-[12.5px] font-normal text-[#8e8e93] dark:text-[#8e9aa5] leading-tight truncate">
            {subtitle}
          </span>
        )}
      </div>
      {onClick && <ChevronRight className="w-4 h-4 text-[#c7c7cc] dark:text-gray-600 shrink-0 ml-auto" />}
    </div>
  );
}

function TranslateRow({
  label,
  defaultOn = false,
  locked = false,
}: {
  label: string;
  defaultOn?: boolean;
  locked?: boolean;
}) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e5e5]">
      <span className="text-[15px] text-black">{label}</span>
      {locked ? (
        <div className="w-[44px] h-[26px] rounded-full bg-gray-200 flex items-center justify-center relative">
          <div className="w-[22px] h-[22px] bg-white rounded-full shadow flex items-center justify-center absolute left-0.5">
            <Lock className="w-3 h-3 text-gray-400" />
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOn(!on)}
          className={`w-[44px] h-[26px] rounded-full transition-colors relative cursor-pointer ${
            on ? "bg-[#2481cc]" : "bg-gray-300"
          }`}
        >
          <div
            className={`w-[22px] h-[22px] bg-white rounded-full shadow absolute top-0.5 transition-all ${
              on ? "left-[20px]" : "left-0.5"
            }`}
          />
        </button>
      )}
    </div>
  );
}

function LangRow({
  label,
  sub,
  code,
  available = false,
  isLast = false,
}: {
  label: string;
  sub: string;
  code: string;
  available?: boolean;
  isLast?: boolean;
}) {
  const { language, setLanguage } = useLanguage();
  const isSelected = language === code;
  const handleClick = () => {
    if (available) setLanguage(code as any);
  };
  return (
    <div
      className={`flex items-center px-4 py-3 ${
        !isLast ? "border-b border-[#e5e5e5]" : ""
      } ${available ? "cursor-pointer hover:bg-gray-50 active:bg-gray-100" : "opacity-60 cursor-default"}`}
      onClick={handleClick}
    >
      <div
        className={`w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center mr-3.5 shrink-0 ${
          isSelected ? "border-[#2481cc]" : "border-gray-300"
        }`}
      >
        {isSelected && <div className="w-[10px] h-[10px] rounded-full bg-[#2481cc]" />}
      </div>
      <div className="flex flex-col flex-1">
        <span className="text-[15px] font-medium text-black leading-tight">{label}</span>
        <span className="text-[12.5px] text-[#8e8e93]">{sub}</span>
      </div>
    </div>
  );
}
