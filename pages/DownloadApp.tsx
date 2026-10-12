import { useState } from "react";
import { ChevronLeft, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";

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
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstall = async () => {
    const installPrompt = (window as WindowWithInstallPrompt).deferredPwaPrompt;
    if (!installPrompt) {
      showToast(
        "Para instalar, abra o menu do navegador e escolha “Adicionar à tela inicial” ou “Instalar aplicativo”.",
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
        showToast("Aplicativo instalado com sucesso.", "success");
      }
    } catch {
      showToast("Não foi possível iniciar a instalação. Tente pelo menu do navegador.", "error");
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
          aria-label="Voltar"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[17px] font-semibold">Telegram para Android</h1>
      </header>

      <main className="mx-auto max-w-[720px] px-5 pt-10">
        <section className="text-center">
          <div
            role="img"
            aria-label="Imagem do Telegram Direct"
            className="mx-5 my-10 h-[360px] bg-[url('https://telegram.org/img/tdirect.jpg?1')] bg-[position:50%_0] bg-no-repeat"
            style={{ backgroundSize: "300px 360px" }}
          />
          <h2 className="mb-3 text-[26px] font-semibold tracking-tight text-[#222]">
            Telegram para Android
          </h2>
          <p className="mx-auto max-w-[540px] text-[16px] leading-7 text-[#707579]">
            Instale o Telegram Business no seu dispositivo para aceder às conversas diretamente pelo ecrã inicial.
          </p>
          <button
            type="button"
            onClick={handleInstall}
            disabled={isInstalling}
            className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#3390ec] px-8 text-[15px] font-semibold text-white transition-colors hover:bg-[#287fcf] disabled:cursor-wait disabled:opacity-70"
          >
            <Download className="h-5 w-5" />
            {isInstalling ? "A preparar instalação…" : "Baixar o Telegram"}
          </button>
        </section>

        <section className="mt-14 border-t border-gray-100 pt-8">
          <h2 className="mb-3 text-[20px] font-semibold text-[#222]">
            Como instalar o Telegram?
          </h2>
          <ol className="list-inside list-decimal space-y-3 text-[15px] leading-6 text-[#707579]">
            <li>Toque em “Baixar o Telegram” e confirme a instalação, se o navegador apresentar essa opção.</li>
            <li>Se não aparecer a opção, abra o menu do navegador.</li>
            <li>Escolha “Adicionar à tela inicial” ou “Instalar aplicativo”.</li>
          </ol>
          <p className="mt-5 text-[14px] leading-6 text-[#707579]">
            A disponibilidade da instalação depende do navegador e do dispositivo utilizados.
          </p>
        </section>
      </main>
    </div>
  );
}
