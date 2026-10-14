import { MessageCircle } from "lucide-react";
import ChatsList from "./ChatsList";
import { useLanguage } from "../contexts/LanguageContext";

export default function ChatsHome() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-[calc(100dvh-60px)] w-full overflow-hidden bg-white dark:bg-[#17212b] md:h-[100dvh] md:min-h-0">
      <aside className="w-full min-w-0 md:w-[350px] md:shrink-0">
        <ChatsList embedded />
      </aside>
      <section className="hidden min-w-0 flex-1 items-center justify-center border-l border-gray-200 bg-[#f4f4f5] dark:border-[#202b36] dark:bg-[#0e1621] md:flex">
        <div className="max-w-sm px-8 text-center text-[#707579] dark:text-[#9eaab6]">
          <MessageCircle className="mx-auto mb-4 h-16 w-16 stroke-[1.2] text-[#2481cc]" />
          <p className="text-[15px]">{t('chat.select_conversation')}</p>
        </div>
      </section>
    </div>
  );
}

