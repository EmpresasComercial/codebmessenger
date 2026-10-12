import { MessageCircle } from "lucide-react";
import ChatsList from "./ChatsList";

export default function ChatsHome() {
  return (
    <div className="flex min-h-[calc(100dvh-60px)] w-full overflow-hidden bg-white dark:bg-[#17212b] md:h-[100dvh] md:min-h-0">
      <aside className="w-full min-w-0 md:w-[350px] md:shrink-0">
        <ChatsList embedded />
      </aside>
      <section className="hidden min-w-0 flex-1 items-center justify-center border-l border-gray-200 bg-[#f4f4f5] dark:border-[#202b36] dark:bg-[#0e1621] md:flex">
        <div className="max-w-sm px-8 text-center text-[#707579] dark:text-[#9eaab6]">
          <MessageCircle className="mx-auto mb-4 h-16 w-16 stroke-[1.2] text-[#a8b4c0]" />
          <p className="text-[15px]">Selecione uma conversa para começar a conversar</p>
        </div>
      </section>
    </div>
  );
}
