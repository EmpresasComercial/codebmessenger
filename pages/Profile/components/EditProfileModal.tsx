import React, { useState, useRef, useEffect } from "react";
import { Phone, AtSign, ArrowDownCircle, ArrowUpCircle, Check, ImagePlus, Save, Users } from "lucide-react";
import { formatCurrency } from "../../../lib/currency";
import { supabase } from "../../../lib/supabase";
import { useToast } from "../../../components/Toast";
import { useLanguage } from "../../../contexts/LanguageContext";

const presetAvatars = [
  "/tg_duck_social.png",
  "/tg_duck_seguro.png",
  "/tg_duck_rapido.png",
  "/tg_duck_privado.png",
  "/tg_duck_expressivo.png",
];

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: {
    firstName: string;
    lastName: string;
    bio: string;
    avatarUrl: string;
    phone: string;
  };
  totalDeposits?: number;
  totalWithdrawals?: number;
  comissaoEquipe?: number;
  onSaved: (data: { firstName: string; lastName: string; bio: string; avatarUrl: string }) => void;
}

export default function EditProfileModal({
  isOpen,
  onClose,
  initialData,
  totalDeposits = 0,
  totalWithdrawals = 0,
  comissaoEquipe = 0,
  onSaved,
}: EditProfileModalProps) {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState(initialData.firstName);
  const [lastName, setLastName] = useState(initialData.lastName);
  const [bio, setBio] = useState(initialData.bio);
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatarUrl);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFirstName(initialData.firstName);
      setLastName(initialData.lastName);
      setBio(initialData.bio);
      setAvatarUrl(initialData.avatarUrl);
      setAvatarPreview(null);
      setAvatarFile(null);
      setShowAvatarPicker(false);
    }
  }, [isOpen, initialData.firstName, initialData.lastName, initialData.bio, initialData.avatarUrl]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast(t("profile.image_too_large"), "error"); return; }
    setAvatarFile(file);
    setShowAvatarPicker(false);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!firstName.trim()) { showToast(t("profile.name_required"), "error"); return; }
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      let finalAvatarUrl = avatarUrl;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() || "jpg";
        const path = `avatars/${user.id}/profile.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("user-avatars")
          .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from("user-avatars").getPublicUrl(path);
          finalAvatarUrl = publicUrl;
        } else {
          console.error("Erro no upload do avatar:", upErr);
          showToast(t("profile.avatar_upload_failed"), "error");
        }
      }

      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");

      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          name: fullName, full_name: fullName,
          first_name: firstName.trim(), last_name: lastName.trim(),
          bio: bio.trim(), avatar_url: finalAvatarUrl,
        },
      });
      if (authUpdateError) throw authUpdateError;

      const { error: profileUpdateError } = await (supabase as any)
        .from("sys_t500")
        .update({ nome_exibicao: fullName || null, avatar_url: finalAvatarUrl || null })
        .eq("id", user.id);
      if (profileUpdateError) throw profileUpdateError;

      showToast(t("profile.updated"), "success");
      onSaved({ firstName: firstName.trim(), lastName: lastName.trim(), bio: bio.trim(), avatarUrl: finalAvatarUrl });
      onClose();
    } catch (err: any) {
      showToast(err?.message || t("profile.save_failed"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const displayAvatar = avatarPreview || avatarUrl;
  const bioRemaining = 70 - bio.length;
  const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || initialData.phone;
  // Gera username estilo Telegram: @Nome_Sobrenome
  const telegramUsername = `@${[firstName.trim(), lastName.trim()].filter(Boolean).join("_").replace(/\s+/g, "_") || "usuario"}`;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{
        backgroundColor: "#f1f1f2",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
      {showAvatarPicker ? (
        <div className="flex min-h-0 flex-1 flex-col bg-[#f1f1f2]">
          <div className="flex h-14 shrink-0 items-center border-b border-black/5 px-4">
            <button
              type="button"
              onClick={() => setShowAvatarPicker(false)}
              className="mr-3 flex h-10 w-10 items-center justify-center rounded-full text-[#3390ec] hover:bg-black/5"
              aria-label={t("common.back")}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M5 12l7-7M5 12l7 7" />
              </svg>
            </button>
            <h2 className="flex-1 text-[17px] font-semibold text-black">{t("profile.choose_avatar")}</h2>
          </div>
          <div className="avatar-picker-grid mx-auto grid w-full max-w-2xl grid-cols-3 gap-3 overflow-y-auto rounded-[20px] bg-white p-4 shadow-sm">
            {presetAvatars.map((src, index) => {
              const isSelected = !avatarPreview && avatarUrl === src;
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => {
                    setAvatarUrl(src);
                    setAvatarPreview(null);
                    setAvatarFile(null);
                    setShowAvatarPicker(false);
                  }}
                  className={`relative aspect-square overflow-hidden rounded-full border-2 bg-gradient-to-br from-[#e5f3ff] to-[#c8e5ff] p-2 transition-transform active:scale-95 ${
                    isSelected ? "border-[#3390ec] ring-2 ring-[#3390ec]/25" : "border-transparent"
                  }`}
                  aria-label={`${t("profile.avatar_option")} ${index + 1}`}
                  aria-pressed={isSelected}
                >
                  <img src={src} alt="" className="h-full w-full rounded-full object-contain" />
                  {isSelected && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#3390ec] text-white">
                      <Check className="h-4 w-4" aria-hidden="true" />
                    </span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="gallery-photo-button flex aspect-square flex-col items-center justify-center gap-3 rounded-2xl border border-[#d7e9fb] bg-[#f4f9ff] text-[#3390ec] transition-colors hover:bg-[#eaf5ff] active:scale-95"
              aria-label={t("profile.open_gallery")}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                <ImagePlus className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="text-[13px] font-medium">{t("profile.gallery")}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
      {/* ──────── HEADER ──────── */}
      <div className="flex items-center px-4 pt-4 pb-3 bg-[#f1f1f2]">
        <button
          onClick={onClose}
          disabled={isSaving}
          className="p-1 -ml-1 rounded-full active:opacity-50 transition-opacity mr-3"
          aria-label={t("common.back")}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M5 12l7-7M5 12l7 7" />
          </svg>
        </button>
        <div className="flex-1" aria-hidden="true" />
        <button
          onClick={handleSave}
          disabled={isSaving || !firstName.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#3390ec] transition-opacity hover:bg-black/5 active:opacity-60 disabled:opacity-40"
          aria-label={t("common.save")}
          title={t("common.save")}
        >
          {isSaving
            ? <span className="w-4 h-4 border-2 border-[#3390ec] border-t-transparent rounded-full animate-spin inline-block" />
            : <Save className="h-5 w-5" aria-hidden="true" />
          }
        </button>
      </div>

      {/* ──────── CONTEÚDO ROLÁVEL ──────── */}
      <div className="flex-1 overflow-y-auto px-2 max-w-2xl mx-auto w-full">

        {/* ── AVATAR SECTION (clicável para trocar foto) ── */}
        <button
          type="button"
          className="relative block h-[167px] w-full cursor-pointer overflow-hidden text-left"
          onClick={() => setShowAvatarPicker(true)}
          aria-label={t("profile.change_photo")}
        >
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt={t("profile.avatar_alt")}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#3390ec] to-[#1e6dc8]">
              <span className="text-[64px] font-bold text-white">
                {firstName.charAt(0).toUpperCase() || "?"}
              </span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/65 to-transparent px-4 pb-3 pt-8 text-white">
            <span className="text-[13px] font-medium">{t("profile.change_photo")}</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3390ec] shadow-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" fill="white" />
              </svg>
            </span>
          </div>
        </button>

        {/* ── CARD: SEU NOME ── */}
        <div className="bg-white rounded-[14px] overflow-hidden shadow-2xs border border-gray-100 mb-2">
          <div className="px-4 pt-3 pb-1">
            <span className="text-[13px] font-semibold text-[#4faf64]">{t("profile.your_name")}</span>
          </div>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            maxLength={64}
            placeholder={t("profile.first_name")}
            className="w-full px-4 py-3 text-[17px] text-black bg-white outline-none border-b border-[#e5e5e5] placeholder:text-[#c7c7cc]"
          />
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            maxLength={64}
            placeholder={t("profile.last_name")}
            className="w-full px-4 py-3 text-[17px] text-black bg-white outline-none placeholder:text-[#c7c7cc]"
          />
        </div>

        {/* ── CARD: BIO ── */}
        <div className="bg-white rounded-[14px] overflow-hidden shadow-2xs border border-gray-100">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <span className="text-[13px] font-semibold text-[#4faf64]">{t("profile.bio")}</span>
            <span className={`text-[13px] tabular-nums ${bioRemaining < 10 ? "text-red-500" : "text-[#8e8e93]"}`}>
              {bioRemaining}
            </span>
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 70))}
            maxLength={70}
            placeholder={t("profile.bio")}
            rows={2}
            className="w-full px-4 py-2 text-[17px] text-black bg-white outline-none resize-none placeholder:text-[#c7c7cc]"
          />
          <p className="px-4 pb-3 text-[13px] text-[#8e8e93]">{t("profile.bio_about_you")}</p>
        </div>

        {/* ── SPACER ── */}
        <div className="h-4" />

        {/* ── CARD: SUAS INFORMAÇÕES ── */}
        <div className="bg-white rounded-[14px] overflow-hidden shadow-2xs border border-gray-100">
          <div className="px-4 pt-3 pb-1">
            <span className="text-[13px] font-semibold text-[#4faf64]">{t("profile.your_information")}</span>
          </div>

          {/* Telefone */}
          <div className="flex items-center px-4 py-3 border-b border-[#e5e5e5]">
            <div className="w-[34px] h-[34px] rounded-full bg-[#4faf64] flex items-center justify-center mr-4 shrink-0">
              <Phone className="w-[17px] h-[17px] text-white fill-white stroke-0" />
            </div>
            <div className="flex flex-col">
              <span className="text-[17px] text-black font-normal">{initialData.phone}</span>
              <span className="text-[13px] text-[#8e8e93]">{t("profile.phone_change_hint")}</span>
            </div>
          </div>

          {/* Username */}
          <div className="flex items-center px-4 py-3 border-b border-[#e5e5e5]">
            <div className="w-[34px] h-[34px] rounded-full bg-[#f2a93b] flex items-center justify-center mr-4 shrink-0">
              <AtSign className="w-[17px] h-[17px] text-white stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[17px] text-black font-normal">{telegramUsername}</span>
              <span className="text-[13px] text-[#8e8e93]">{t("profile.username")}</span>
            </div>
          </div>

          {/* Total Recarregado */}
          <div className="flex items-center px-4 py-3">
            <div className="w-[34px] h-[34px] rounded-full bg-[#3390ec] flex items-center justify-center mr-4 shrink-0">
              <ArrowDownCircle className="w-[17px] h-[17px] text-white stroke-[2]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[17px] text-black font-normal">{formatCurrency(totalDeposits, 'KZ')}</span>
              <span className="text-[13px] text-[#8e8e93]">{t("profile.total_recharged")}</span>
            </div>
          </div>
        </div>

        {/* ── SPACER ── */}
        <div className="h-3" />

        {/* ── CARD: ESTATÍSTICAS FINANCEIRAS ── */}
        <div className="bg-white rounded-[14px] overflow-hidden shadow-2xs border border-gray-100">
          {/* Total Retirado */}
          <div className="flex items-center px-4 py-3 border-b border-[#e5e5e5]">
            <div className="w-[34px] h-[34px] rounded-full bg-[#f25050] flex items-center justify-center mr-4 shrink-0">
              <ArrowUpCircle className="w-[17px] h-[17px] text-white stroke-[2]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[17px] text-black font-normal">{formatCurrency(totalWithdrawals, 'KZ')}</span>
              <span className="text-[13px] text-[#8e8e93]">{t("profile.total_withdrawn")}</span>
            </div>
          </div>

          {/* Comissão Equipe */}
          <div className="flex items-center px-4 py-3">
            <div className="w-[34px] h-[34px] rounded-full bg-[#7a57d6] flex items-center justify-center mr-4 shrink-0">
              <Users className="w-[17px] h-[17px] text-white stroke-[2]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[17px] text-black font-normal">{formatCurrency(comissaoEquipe, 'KZ')}</span>
              <span className="text-[13px] text-[#8e8e93]">{t("profile.team_total_earned")}</span>
            </div>
          </div>
        </div>

        <div className="h-16" />
      </div>
        </>
      )}
    </div>
  );
}

