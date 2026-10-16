import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, Plus } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { logger } from "../../../lib/logger";
import { useToast } from "../../../components/Toast";
import { useLanguage } from "../../../contexts/LanguageContext";
import { DEFAULT_PROFILE_AVATAR } from "../../../lib/utils";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: {
    firstName: string;
    lastName: string;
    bio: string;
    avatarUrl: string;
  };
  onSaved: (data: { firstName: string; lastName: string; bio: string; avatarUrl: string }) => void;
}

export default function EditProfileModal({
  isOpen,
  onClose,
  initialData,
  onSaved,
}: EditProfileModalProps) {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bioInputRef = useRef<HTMLTextAreaElement>(null);
  const [firstName, setFirstName] = useState(initialData.firstName);
  const [lastName, setLastName] = useState(initialData.lastName);
  const [bio, setBio] = useState(initialData.bio);
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFirstName(initialData.firstName);
      setLastName(initialData.lastName);
      setBio(initialData.bio);
      setAvatarUrl(initialData.avatarUrl);
      setAvatarFile(null);
      setAvatarPreview(null);
    }
  }, [isOpen, initialData.firstName, initialData.lastName, initialData.bio, initialData.avatarUrl]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!avatarPreview) return;
    return () => URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  useEffect(() => {
    const bioInput = bioInputRef.current;
    if (!bioInput) return;
    bioInput.style.height = "auto";
    const contentHeight = bioInput.scrollHeight;
    bioInput.style.height = `${Math.min(contentHeight, 160)}px`;
    bioInput.style.overflowY = contentHeight > 160 ? "auto" : "hidden";
  }, [bio, isOpen]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast(t("profile.image_too_large"), "error");
      event.target.value = "";
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    event.target.value = "";
  };

  const handleSave = async () => {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedBio = bio.trim();
    if (!trimmedFirstName) {
      showToast(t("profile.name_required"), "error");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Não autenticado");

      let finalAvatarUrl = avatarUrl;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() || "jpg";
        const path = `avatars/${user.id}/profile.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("user-avatars")
          .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
        if (uploadError) {
          logger.error("EditProfileModal", "Avatar upload failed.", uploadError);
          showToast(t("profile.avatar_upload_failed"), "error");
          return;
        }
        const { data: { publicUrl } } = supabase.storage.from("user-avatars").getPublicUrl(path);
        finalAvatarUrl = publicUrl;
      }

      const fullName = [trimmedFirstName, trimmedLastName].filter(Boolean).join(" ");

      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          name: fullName, full_name: fullName,
          first_name: trimmedFirstName, last_name: trimmedLastName,
          bio: trimmedBio, avatar_url: finalAvatarUrl,
        },
      });
      if (authUpdateError) throw authUpdateError;

      const { error: profileUpdateError } = await (supabase as any)
        .from("sys_t500")
        .update({ nome_exibicao: fullName || null, avatar_url: finalAvatarUrl || null })
        .eq("id", user.id);
      if (profileUpdateError) throw profileUpdateError;

      showToast(t("profile.updated"), "success");
      setAvatarUrl(finalAvatarUrl);
      onSaved({ firstName: trimmedFirstName, lastName: trimmedLastName, bio: trimmedBio, avatarUrl: finalAvatarUrl });
      onClose();
    } catch (error) {
      logger.error("EditProfileModal", "Profile save failed.", error);
      showToast(t("profile.save_failed"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const bioRemaining = 70 - bio.length;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{
        backgroundColor: "#f1f1f2",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />
      <div className="flex items-center px-4 pt-4 pb-3 bg-[#f1f1f2]">
        <button
          onClick={onClose}
          disabled={isSaving}
          className="p-1 -ml-1 rounded-full active:opacity-50 transition-opacity mr-3"
          aria-label={t("common.back")}
        >
          <ChevronLeft className="h-6 w-6 stroke-[2]" />
        </button>
        <div className="flex-1" aria-hidden="true" />
      </div>

      <div className="flex justify-center px-4 py-4">
        <div className="relative h-24 w-24">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSaving}
            className="touch-manipulation flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white text-[#3390ec] shadow-sm transition-opacity hover:opacity-80 active:scale-95 disabled:opacity-40"
            aria-label={t("profile.change_photo")}
            title={t("profile.change_photo")}
          >
            <img
              src={avatarPreview || avatarUrl || DEFAULT_PROFILE_AVATAR}
              alt=""
              className="h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = DEFAULT_PROFILE_AVATAR;
              }}
            />
          </button>
          <span className="pointer-events-none absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-[#f1f1f2] bg-[#3390ec] text-white shadow-sm">
            <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 max-w-2xl mx-auto w-full">
        <div className="bg-white rounded-[14px] overflow-hidden shadow-2xs border border-gray-100 mb-2">
          <div className="px-4 pt-3 pb-1">
            <span className="text-[13px] font-semibold text-[#4faf64]">{t("profile.your_name")}</span>
          </div>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={isSaving}
            maxLength={64}
            placeholder={t("profile.first_name")}
            className="w-full px-4 py-3 text-[17px] text-black bg-white outline-none border-b border-[#e5e5e5] placeholder:text-[#c7c7cc]"
          />
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={isSaving}
            maxLength={64}
            placeholder={t("profile.last_name")}
            className="w-full px-4 py-3 text-[17px] text-black bg-white outline-none placeholder:text-[#c7c7cc]"
          />
        </div>

        <div className="bg-white rounded-[14px] overflow-hidden shadow-2xs border border-gray-100">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <span className="text-[13px] font-semibold text-[#4faf64]">{t("profile.bio")}</span>
            <span className={`text-[13px] tabular-nums ${bioRemaining < 10 ? "text-red-500" : "text-[#8e8e93]"}`}>
              {bioRemaining}
            </span>
          </div>
          <textarea
            ref={bioInputRef}
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 70))}
            disabled={isSaving}
            maxLength={70}
            placeholder={t("profile.bio")}
            rows={1}
            className="min-h-[44px] max-h-[160px] w-full resize-none overflow-y-hidden bg-white px-4 py-2 text-[17px] text-black outline-none placeholder:text-[#c7c7cc]"
          />
          <p className="px-4 pb-3 text-[13px] text-[#8e8e93]">{t("profile.bio_about_you")}</p>
        </div>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving || !firstName.trim()}
          className="profile-save-button mt-4 flex min-h-12 w-full items-center justify-center rounded-[22px] bg-[#3390ec] px-4 py-3 text-[16px] font-semibold text-white transition-colors hover:bg-[#287fcf] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={t("profile.save_button")}
        >
          {isSaving ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            t("profile.save_button")
          )}
        </button>

        <div className="h-16" />
      </div>
    </div>
  );
}
