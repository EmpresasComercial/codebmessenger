import { useState } from "react";
import { ChevronLeft, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";
import { useLanguage } from "../contexts/LanguageContext";

interface DeferredInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type WindowWithInstallPrompt = Window & {
  deferredPwaPrompt?: DeferredInstallPromptEvent | null;
};

export default function DownloadApp() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstall = async () => {
    const installPrompt = (window as WindowWithInstallPrompt).deferredPwaPrompt;
    if (!installPrompt) {
      showToast(
        t("download.install_prompt_missing"),
        "info",
      );
      return;
    }

    setIsInstalling(true);
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      (window as WindowWithInstallPrompt).deferredPwaPrompt = null;
      if (outcome === "accepted") {
        showToast(t("download.install_success"), "success");
      }
    } catch {
      showToast(t("download.install_failed"), "error");
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#222] font-sans pb-10">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#707579] hover:bg-gray-100"
          aria-label={t("common.back")}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[17px] font-semibold">{t("download.android_title")}</h1>
      </header>

      <main className="mx-auto max-w-[720px] px-3 pt-0">
        <section className="text-center">
          <div
            className="mx-auto mb-1 w-full max-w-[520px] overflow-hidden"
            style={{ borderRadius: 24 }}
          >
            <img
              src="/business-android-preview.png"
              alt={t("download.android_alt")}
              className="block h-auto w-full"
            />
          </div>
          <h2 className="mb-1.5 text-[26px] font-semibold tracking-tight text-[#222]">
            {t("download.android_title")}
          </h2>
          <p className="mx-auto max-w-[540px] text-[16px] leading-6 text-[#707579]">
            {t("download.android_description")}
          </p>
          <button
            type="button"
            onClick={handleInstall}
            disabled={isInstalling}
            className="mx-auto mt-3 inline-flex min-h-12 w-full max-w-[520px] items-center justify-center gap-2 rounded-full bg-[#3390ec] px-8 text-[15px] font-semibold text-white transition-colors hover:bg-[#287fcf] disabled:cursor-wait disabled:opacity-70"
          >
            <Download className="h-5 w-5" />
            {isInstalling ? t("download.installing") : t("download.install_button")}
          </button>
        </section>

        <section className="mt-8 border-t border-gray-100 pt-5">
          <h2 className="mb-3 text-[20px] font-semibold text-[#222]">
            {t("download.how_to_install")}
          </h2>
          <ol className="list-inside list-decimal space-y-3 text-[15px] leading-6 text-[#707579]">
            <li>{t("download.step1")}</li>
            <li>{t("download.step2")}</li>
            <li>{t("download.step3")}</li>
          </ol>
          <p className="mt-5 text-[14px] leading-6 text-[#707579]">
            {t("download.availability")}
          </p>
        </section>
      </main>
    </div>
  );
}
