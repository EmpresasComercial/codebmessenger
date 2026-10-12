import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen bg-white text-[#222222] font-sans antialiased pb-28 select-none">
      <style>{`
        @keyframes duckBounce {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-8px) scale(1.02); }
        }
        @keyframes duckWiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-4deg); }
          75% { transform: rotate(4deg); }
        }
        @keyframes duckFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }

        .duck-bounce { animation: duckBounce 2.6s ease-in-out infinite; }
        .duck-wiggle { animation: duckWiggle 3s ease-in-out infinite; }
        .duck-float { animation: duckFloat 3.2s ease-in-out infinite; }
      `}</style>

      {/* ── HEADER TELEGRAM ── */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-[17px] font-bold text-[#222222] tracking-tight">
              Telegram
            </h1>
          </div>
        </div>
      </header>

      {/* ── CONTEÚDO PRINCIPAL (SEM CARDS / SEM CONTAINERS ARTIFICIAIS) ── */}
      <main className="max-w-[860px] mx-auto px-4 pt-8 space-y-16">

        <section>
          <h2 className="mb-4 text-[26px] font-semibold leading-tight text-[#222222]">
            O que é Telegram? O que faço aqui?
          </h2>
          <div className="space-y-4 text-[16px] leading-7 text-[#333333]">
            <p>
              O Telegram é um aplicativo de mensagens com foco em velocidade e segurança, é super-rápido, simples e gratuito. Você pode usar o Telegram em todos os seus dispositivos ao mesmo tempo — suas mensagens são sincronizadas perfeitamente em qualquer quantidade de seus telefones, tablets ou computadores. O Telegram tem mais de 1 bilhão de usuários ativos mensais e é um dos 5 aplicativos mais baixados do mundo.
            </p>
            <p>
              Com o Telegram, você pode enviar mensagens, fotos, vídeos e arquivos de qualquer tipo (doc, zip, mp3, etc), além de criar grupos de até 200.000 pessoas ou canais para transmitir para públicos ilimitados. Você pode escrever para seus contatos da agenda e encontrar pessoas pelos nomes de usuário delas. Como resultado, o Telegram é como SMS e e-mail combinados – e pode cuidar de todas as suas necessidades de mensagens pessoais ou comerciais. Além disso, oferecemos suporte a chamadas de voz e videochamadas criptografadas de ponta a ponta, chamadas em grupo para até 200 participantes, e chats de voz em grupos que os membros podem entrar quando quiserem.
            </p>
          </div>
        </section>

        {/* NOVIDADES (DIRETO NA PÁGINA COM IMAGENS OFICIAIS) */}
        <section className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10">
            {/* Card 1 com a imagem oficial 0e567958d5b96a2184.webp */}
            <div className="flex flex-col text-left group">
              <a href="https://telegram.org/blog/welcome-messages-buttons-TG-13/pt-br" target="_blank" rel="noopener noreferrer">
                <img
                  src="/0e567958d5b96a2184.webp"
                  alt="Mensagens de Boas-Vindas"
                  className="w-full h-auto rounded-3xl object-cover hover:opacity-95 transition-opacity"
                />
              </a>
              <h3 className="text-[17px] font-bold text-[#168acd] hover:underline mt-4 cursor-pointer leading-snug">
                <a href="https://telegram.org/blog/welcome-messages-buttons-TG-13/pt-br" target="_blank" rel="noopener noreferrer">
                  Mensagens de Boas-Vindas, Botões nas Mensagens e Presentes Assinados
                </a>
              </h3>
              <p className="text-[14px] text-[#444444] mt-2 leading-relaxed">
                Apresentamos as Mensagens de Boas-Vindas para saudar novos membros dos grupos ou canais, os Botões nas Mensagens para links interativos e mais.
              </p>
              <span className="text-[12px] text-gray-400 mt-2 block">
                15 de ago de 2026
              </span>
            </div>

            {/* Card 2 com a imagem oficial 6a362dadee6e7e6011.webp */}
            <div className="flex flex-col text-left group">
              <a href="https://telegram.org/blog/communities-editor-invisible-messages/pt-br" target="_blank" rel="noopener noreferrer">
                <img
                  src="/6a362dadee6e7e6011.webp"
                  alt="Editor de Texto Formatado e Comunidades"
                  className="w-full h-auto rounded-3xl object-cover hover:opacity-95 transition-opacity"
                />
              </a>
              <h3 className="text-[17px] font-bold text-[#168acd] hover:underline mt-4 cursor-pointer leading-snug">
                <a href="https://telegram.org/blog/communities-editor-invisible-messages/pt-br" target="_blank" rel="noopener noreferrer">
                  Editor de Texto Formatado, Comunidades, Mensagens Efêmeras em Grupos, 550 Milhões de GIFs
                </a>
              </h3>
              <p className="text-[14px] text-[#444444] mt-2 leading-relaxed">
                Apresentando o Editor de Texto Formatado para formatar mensagens com facilidade, as Comunidades do Telegram com tópicos organizados e suporte a 550 Milhões de GIFs.
              </p>
              <span className="text-[12px] text-gray-400 mt-2 block">
                14 de jul de 2026
              </span>
            </div>
          </div>
        </section>

        {/* 4. POR QUE O TELEGRAM? (9 PATOS OFICIAIS COM ANIMAÇÃO, SEM BORDAS/CARDS) */}
        <section className="pt-6">
          <div className="text-center mb-10">
            <h2 className="text-[28px] font-bold text-[#222222]">
              Por que o Telegram?
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-12 gap-x-8 text-center">

            {/* 1. SIMPLES */}
            <div className="flex flex-col items-center group">
              <div className="w-24 h-24 mb-3 flex items-center justify-center duck-bounce">
                <img
                  src="/tg_duck_simples.png"
                  alt="Simples"
                  className="w-20 h-20 object-contain hover:scale-110 active:scale-95 transition-transform duration-300"
                />
              </div>
              <h3 className="text-[17px] font-bold text-[#168acd] mb-1">
                Simples
              </h3>
              <p className="text-[13.5px] text-[#555555] leading-relaxed max-w-[220px]">
                O <b className="font-semibold text-gray-900">Telegram</b> é tão simples que você já sabe como usar.
              </p>
            </div>

            {/* 2. PRIVADO */}
            <div className="flex flex-col items-center group">
              <div className="w-24 h-24 mb-3 flex items-center justify-center duck-wiggle">
                <img
                  src="/tg_duck_privado.png"
                  alt="Privado"
                  className="w-20 h-20 object-contain hover:scale-110 active:scale-95 transition-transform duration-300"
                />
              </div>
              <h3 className="text-[17px] font-bold text-[#168acd] mb-1">
                Privado
              </h3>
              <p className="text-[13.5px] text-[#555555] leading-relaxed max-w-[220px]">
                Mensagens no <b className="font-semibold text-gray-900">Telegram</b> têm forte criptografia e podem autodestruir.
              </p>
            </div>

            {/* 3. SINCRONIZADO */}
            <div className="flex flex-col items-center group">
              <div className="w-24 h-24 mb-3 flex items-center justify-center duck-float">
                <img
                  src="/tg_duck_sincronizado.png"
                  alt="Sincronizado"
                  className="w-20 h-20 object-contain hover:scale-110 active:scale-95 transition-transform duration-300"
                />
              </div>
              <h3 className="text-[17px] font-bold text-[#168acd] mb-1">
                Sincronizado
              </h3>
              <p className="text-[13.5px] text-[#555555] leading-relaxed max-w-[220px]">
                O <b className="font-semibold text-gray-900">Telegram</b> te permite acessar seus chats com vários dispositivos.
              </p>
            </div>

            {/* 4. RÁPIDO */}
            <div className="flex flex-col items-center group">
              <div className="w-24 h-24 mb-3 flex items-center justify-center duck-bounce">
                <img
                  src="/tg_duck_rapido.png"
                  alt="Rápido"
                  className="w-20 h-20 object-contain hover:scale-110 active:scale-95 transition-transform duration-300"
                />
              </div>
              <h3 className="text-[17px] font-bold text-[#168acd] mb-1">
                Rápido
              </h3>
              <p className="text-[13.5px] text-[#555555] leading-relaxed max-w-[220px]">
                O <b className="font-semibold text-gray-900">Telegram</b> entrega as mensagens mais rápido que qualquer app.
              </p>
            </div>

            {/* 5. PODEROSO */}
            <div className="flex flex-col items-center group">
              <div className="w-24 h-24 mb-3 flex items-center justify-center duck-wiggle">
                <img
                  src="/tg_duck_poderoso.png"
                  alt="Poderoso"
                  className="w-20 h-20 object-contain hover:scale-110 active:scale-95 transition-transform duration-300"
                />
              </div>
              <h3 className="text-[17px] font-bold text-[#168acd] mb-1">
                Poderoso
              </h3>
              <p className="text-[13.5px] text-[#555555] leading-relaxed max-w-[220px]">
                O <b className="font-semibold text-gray-900">Telegram</b> não tem limites para o tamanho das suas mídias e chats.
              </p>
            </div>

            {/* 6. ABERTO */}
            <div className="flex flex-col items-center group">
              <div className="w-24 h-24 mb-3 flex items-center justify-center duck-float">
                <img
                  src="/tg_duck_aberto.png"
                  alt="Aberto"
                  className="w-20 h-20 object-contain hover:scale-110 active:scale-95 transition-transform duration-300"
                />
              </div>
              <h3 className="text-[17px] font-bold text-[#168acd] mb-1">
                Aberto
              </h3>
              <p className="text-[13.5px] text-[#555555] leading-relaxed max-w-[220px]">
                O <b className="font-semibold text-gray-900">Telegram</b> tem uma <a href="https://core.telegram.org/api" target="_blank" rel="noopener noreferrer" className="text-[#168acd] hover:underline">API</a> aberta e código-fonte livre para todos.
              </p>
            </div>

            {/* 7. SEGURO */}
            <div className="flex flex-col items-center group">
              <div className="w-24 h-24 mb-3 flex items-center justify-center duck-bounce">
                <img
                  src="/tg_duck_seguro.png"
                  alt="Seguro"
                  className="w-20 h-20 object-contain hover:scale-110 active:scale-95 transition-transform duration-300"
                />
              </div>
              <h3 className="text-[17px] font-bold text-[#168acd] mb-1">
                Seguro
              </h3>
              <p className="text-[13.5px] text-[#555555] leading-relaxed max-w-[220px]">
                O <b className="font-semibold text-gray-900">Telegram</b> protege as mensagens contra ataques de hackers.
              </p>
            </div>

            {/* 8. SOCIAL */}
            <div className="flex flex-col items-center group">
              <div className="w-24 h-24 mb-3 flex items-center justify-center duck-wiggle">
                <img
                  src="/tg_duck_social.png"
                  alt="Social"
                  className="w-20 h-20 object-contain hover:scale-110 active:scale-95 transition-transform duration-300"
                />
              </div>
              <h3 className="text-[17px] font-bold text-[#168acd] mb-1">
                Social
              </h3>
              <p className="text-[13.5px] text-[#555555] leading-relaxed max-w-[220px]">
                O <b className="font-semibold text-gray-900">Telegram</b> suporta grupos de até 200.000 membros.
              </p>
            </div>

            {/* 9. EXPRESSIVO */}
            <div className="flex flex-col items-center group">
              <div className="w-24 h-24 mb-3 flex items-center justify-center duck-float">
                <img
                  src="/tg_duck_expressivo.png"
                  alt="Expressivo"
                  className="w-20 h-20 object-contain hover:scale-110 active:scale-95 transition-transform duration-300"
                />
              </div>
              <h3 className="text-[17px] font-bold text-[#168acd] mb-1">
                Expressivo
              </h3>
              <p className="text-[13.5px] text-[#555555] leading-relaxed max-w-[220px]">
                O <b className="font-semibold text-gray-900">Telegram</b> permite que você personalize o app por completo.
              </p>
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}
