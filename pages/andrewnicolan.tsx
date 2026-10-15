import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MoreVertical, 
  Paperclip, 
  Bell, 
  BellOff, 
  Share2, 
  Send,
  X,
  Loader2,
  Upload,
  ZoomIn
} from 'lucide-react';
import { useToast } from '../components/Toast';
import AutoTranslatedText from '../components/AutoTranslatedText';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

// URL da Edge Function (não acessa banco diretamente)
const EDGE_FN_URL = 'https://ptvmqurxtciyqxdpsuen.supabase.co/functions/v1/canal-proofs';

interface ChannelPost {
  id: string;
  isProof?: boolean;
  createdAt?: number;
  forwardedFrom?: {
    name: string;
    avatar?: string;
  };
  title?: string;
  amount?: string;
  content: string;
  image?: string;
  time: string;
}

// Utilitário leve de compressão de imagem via Canvas nativo
const compressImage = async (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const max = 1200;
        if (width > max || height > max) {
          if (width > height) {
            height = Math.round((height * max) / width);
            width = max;
          } else {
            width = Math.round((width * max) / height);
            height = max;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

// Função para eliminar estritamente qualquer post duplicado por ID ou por imagem
const deduplicatePosts = (postList: ChannelPost[]): ChannelPost[] => {
  const seenIds = new Set<string>();
  const seenImages = new Set<string>();
  const result: ChannelPost[] = [];

  for (const p of postList) {
    if (seenIds.has(p.id)) continue;
    if (p.image && seenImages.has(p.image)) continue;

    seenIds.add(p.id);
    if (p.image) seenImages.add(p.image);
    result.push(p);
  }
  return result;
};

export default function AndrewNicolan() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { session } = useAuth();
  const { language, t, translateFullChats } = useLanguage();

  const [posts, setPosts] = useState<ChannelPost[]>([]);
  const [inputText, setInputText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fullscreen image viewer
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Fechar fullscreen com tecla ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreenImage(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Estados para anexo e envio de Prova de Retirada
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [proofAmount, setProofAmount] = useState('');
  const [proofComment, setProofComment] = useState('');
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  // Helper para converter registos de canal_posts para o formato ChannelPost
  const canalRowToPost = useCallback((row: any): ChannelPost => {
    const date = row.created_at ? new Date(row.created_at) : new Date();
    return {
      id: `post-${row.id}`,
      isProof: false,
      createdAt: date.getTime(),
      title: row.titulo || 'Comunicado Oficial',
      content: row.conteudo,
      image: row.imagem_url || undefined,
      forwardedFrom: {
        name: row.author_name || 'Andrew Nicolán (Oficial)',
      },
      time: date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
    };
  }, []);

  // Carrega e sincroniza posts oficiais e comprovativos diretamente do Supabase com Realtime
  useEffect(() => {
    const fetchAllChannelContent = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        // 1. Carrega comunicados oficiais da tabela canal_posts (sem localStorage)
        let officialPosts: ChannelPost[] = [];
        try {
          const { data: rpcPosts, error: rpcErr } = await (supabase as any).rpc('get_canal_posts_mcpn');
          if (!rpcErr && Array.isArray(rpcPosts)) {
            officialPosts = rpcPosts.map(canalRowToPost);
          } else {
            const { data: directPosts } = await (supabase as any)
              .from('canal_posts')
              .select('*')
              .order('created_at', { ascending: true })
              .limit(50);
            if (Array.isArray(directPosts)) {
              officialPosts = directPosts.map(canalRowToPost);
            }
          }
        } catch (postErr) {
          logger.warn('AndrewNicolán', 'Erro ao carregar canal_posts:', postErr);
        }

        // 2. Carrega provas sociais aprovadas via Edge Function
        let proofPosts: ChannelPost[] = [];
        try {
          const res = await fetch(`${EDGE_FN_URL}?action=list`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          });

          if (res.ok) {
            const json = await res.json();
            const rows = json?.data;
            if (Array.isArray(rows)) {
              proofPosts = rows
                .filter((row: any) => row.imagem_url)
                .map((row: any) => {
                  const date = row.created_at ? new Date(row.created_at) : new Date();
                  return {
                    id: `sp-${row.id}`,
                    isProof: true,
                    createdAt: date.getTime(),
                    forwardedFrom: {
                      name: row.userLabel || '***???',
                    },
                    title: row.valorStr ? `Comprovativo enviado pelo utilizador: ${row.valorStr}` : 'Comprovativo enviado pelo utilizador',
                    amount: row.valorStr || '',
                    content: (row.comentario || '').trim(),
                    image: row.imagem_url,
                    time: date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
                  };
                });
            }
          }
        } catch (proofErr) {
          logger.warn('AndrewNicolán', 'Erro ao carregar provas:', proofErr);
        }

        // Combina e ordena cronologicamente
        const combined = [...officialPosts, ...proofPosts].sort(
          (a, b) => (a.createdAt || 0) - (b.createdAt || 0)
        );
        setPosts(deduplicatePosts(combined));
      } catch (err) {
        logger.warn('AndrewNicolán', 'Erro ao sincronizar canal:', err);
      }
    };

    fetchAllChannelContent();

    // Sincronização em tempo real de novos comunicados e provas sociais
    const channel = supabase
      .channel('official_channel_realtime_sync')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'canal_posts' },
        (payload) => {
          const row = payload.new as any;
          if (!row) return;
          const newPost = canalRowToPost(row);
          setPosts(prev => deduplicatePosts([...prev, newPost]));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'social_proofs_mcpn' },
        (payload) => {
          const row = payload.new as any;
          if (!row) return;
          const val = Number(row.valor || 0);
          const valStr = val > 0 ? `${val.toLocaleString('pt-AO')} Kz` : '';
          const comment = row.conteudo?.comentario || row.comentario || '';
          const img = row.conteudo?.imagem_url || row.imagem_url;
          if (!img) return;

          const newProofPost: ChannelPost = {
            id: `sp-${row.id}`,
            isProof: true,
            createdAt: new Date(row.created_at || Date.now()).getTime(),
            forwardedFrom: {
              name: `***${String(row.user_id || '').substring(0, 4)}`,
            },
            title: valStr ? `Comprovativo enviado pelo utilizador: ${valStr}` : 'Comprovativo enviado pelo utilizador',
            amount: valStr,
            content: comment.trim(),
            image: img,
            time: new Date(row.created_at || Date.now()).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
          };

          setPosts(prev => deduplicatePosts([...prev, newProofPost]));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canalRowToPost]);

  const handleForwardPost = (post: ChannelPost) => {
    if (navigator.clipboard) {
      const isProofPost = post.isProof || !!post.amount || post.id.startsWith('sp-') || post.id.startsWith('proof-');
      const title = isProofPost
        ? `${t('social.proof_title')}${post.amount ? `: ${post.amount}` : ''}`
        : post.title;
      navigator.clipboard.writeText(`${title ? title + '\n\n' : ''}${post.content}`);
    }
    showToast(t('social.post_copied'), 'success');
  };

  // Envio de anúncio ou comunicado oficial persistido no banco com Realtime
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  const handleSendBroadcast = async () => {
    if (!inputText.trim() || isSendingBroadcast) return;
    const content = inputText.trim();
    setIsSendingBroadcast(true);

    try {
      // 1. Tenta publicação via RPC segura
      const { error: rpcErr } = await (supabase as any).rpc('publish_canal_post_mcpn', {
        p_conteudo: content,
        p_titulo: 'Comunicado Oficial',
      });

      // 2. Se a RPC falhar, faz inserção direta na tabela canal_posts
      if (rpcErr) {
        const { data: userAuth } = await supabase.auth.getUser();
        const { error: directErr } = await (supabase as any).from('canal_posts').insert({
          author_id: userAuth.user?.id || null,
          titulo: 'Comunicado Oficial',
          conteudo: content,
        });
        if (directErr) throw directErr;
      }

      setInputText('');
      showToast('Comunicado publicado no Canal Oficial!', 'success');

      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    } catch (err: any) {
      logger.error('AndrewNicolán', 'Erro ao publicar comunicado:', err);
      showToast(err.message || 'Erro ao publicar comunicado no canal.', 'error');
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  // Seleção de imagem via galeria / arquivo (clique no 📎)
  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor, selecione um arquivo de imagem válido.', 'error');
      return;
    }

    try {
      const compressed = await compressImage(file);
      setPreviewImage(compressed);
      // Se o utilizador já tiver digitado algo no input, preenche o comentário
      if (inputText.trim() && !proofComment) {
        setProofComment(inputText.trim());
      }
      setIsProofModalOpen(true);
    } catch (err) {
      showToast('Erro ao processar imagem selecionada.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  // Envio do comprovativo de retirada com valor e comentário
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!previewImage) {
      showToast('Selecione uma imagem do comprovativo.', 'error');
      return;
    }

    const cleanAmount = proofAmount.replace(/\D/g, '');
    if (!cleanAmount || Number(cleanAmount) <= 0) {
      showToast('Por favor, informe o valor recebido da retirada.', 'error');
      return;
    }

    setIsSubmittingProof(true);

    try {
      let finalImageUrl = previewImage;

      // 1. Upload da imagem para o bucket de storage (storage permanece direto)
      try {
        const fileExt = 'jpg';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const blob = await (await fetch(previewImage)).blob();
        const { error: uploadError } = await supabase.storage
          .from('provas-sociais')
          .upload(fileName, blob, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false });

        if (!uploadError) {
          finalImageUrl = supabase.storage.from('provas-sociais').getPublicUrl(fileName).data.publicUrl;
        }
      } catch (uploadErr) {
        logger.warn('AndrewNicolán', 'Upload bucket fallback para base64:', uploadErr);
      }

      // 2. Inserção via Edge Function (não acessa banco diretamente)
      let realId: string | null = null;
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession?.access_token) {
        const res = await fetch(`${EDGE_FN_URL}?action=insert`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentSession.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            valor: Number(cleanAmount),
            comentario: proofComment.trim(),
            imagem_url: finalImageUrl,
          }),
        });
        const json = await res.json();
        if (res.ok && json?.data?.id) {
          realId = json.data.id;
        } else {
          throw new Error(json?.error || 'Erro ao guardar comprovativo');
        }
      }

      if (!realId) {
        try {
          const { data } = await supabase.rpc('submit_social_proof_mcpn', {
            p_valor: Number(cleanAmount),
            p_comentario: proofComment.trim(),
            p_imagem_url: finalImageUrl
          });
          if ((data as any)?.id) realId = (data as any).id;
        } catch (rpcErr) {
          logger.warn('AndrewNicolán', 'RPC submit_social_proof_mcpn fallback:', rpcErr);
        }
      }

      // Adiciona a publicação no próprio canal imediatamente com ID único
      const now = new Date();
      const timeStr = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
      const userPhoneMasked = session?.user?.phone
        ? session.user.phone.replace(/(\d{3})\d{3}(\d{3})/, '$1***$2')
        : 'Membro';

      const uniquePostId = realId ? `sp-${realId}` : `proof-${Date.now()}`;

      const newProofPost: ChannelPost = {
        id: uniquePostId,
        isProof: true,
        createdAt: now.getTime(),
        forwardedFrom: {
          name: userPhoneMasked
        },
        title: `Comprovativo enviado pelo utilizador: ${Number(cleanAmount).toLocaleString('pt-AO')} Kz`,
        amount: `${Number(cleanAmount).toLocaleString('pt-AO')} Kz`,
        content: proofComment.trim(),
        image: finalImageUrl,
        time: timeStr,
      };

      setPosts(prev => deduplicatePosts([...prev, newProofPost]));

      showToast(t('social.proof_submitted_unverified'), 'info');
      
      // Fecha o modal e reseta os campos
      setIsProofModalOpen(false);
      setPreviewImage(null);
      setProofAmount('');
      setProofComment('');
      setInputText('');

      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);

    } catch (err: any) {
      logger.error('AndrewNicolán', 'Erro ao enviar comprovativo:', err);
      showToast(err.message || 'Erro ao enviar comprovativo.', 'error');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  return (
    <div 
      className="w-full h-[100dvh] font-sans antialiased text-[#111827] select-none tg-chat-no-select flex flex-col items-center overflow-hidden relative tg-wallpaper transition-colors"
      onContextMenu={(e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target?.tagName !== 'INPUT' && target?.tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
      }}
    >

      {/* Input de arquivo invisível para galeria/fotos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelected}
      />

      {/* ── HEADER FLOATING PILL (IDÊNTICO AO GRUPOCHAT / PRIVATECHAT) ── */}
      <header className="w-full bg-transparent px-3 sm:px-4 py-3 sticky top-0 z-40 flex items-center justify-between select-none pointer-events-none">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-11 h-11 rounded-full bg-white dark:bg-[#1c242f] shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center justify-center text-black dark:text-white hover:bg-gray-50 active:scale-95 transition-transform shrink-0 pointer-events-auto cursor-pointer"
          aria-label={t('common.back')}
        >
          <ArrowLeft className="w-6 h-6 stroke-[2]" />
        </button>

        <div className="flex items-center gap-2.5 bg-white dark:bg-[#1c242f] rounded-full p-1.5 pr-4 shadow-[0_2px_8px_rgba(0,0,0,0.12)] mx-2 min-w-0 max-w-[65%] pointer-events-auto">
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
            <img
              src="/Andrew_avatar_1792019295598.jpg"
              alt="Andrew Nicolan"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-[15px] font-medium text-black dark:text-white tracking-tight truncate leading-[1.15] mt-0.5">
              Andrew Nicolan
            </h1>
            <span className="text-[12.5px] text-[#707579] dark:text-[#8e9aa5] font-normal leading-[1.15] mt-0.5 truncate">
              725.251 inscritos
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => showToast('Este espaço não é um canal oficial de terceiros.', 'info')}
          className="w-11 h-11 rounded-full bg-white dark:bg-[#1c242f] shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center justify-center text-black dark:text-white hover:bg-gray-50 active:scale-95 transition-transform shrink-0 pointer-events-auto cursor-pointer"
          aria-label="Mais opções"
        >
          <MoreVertical className="w-5 h-5 stroke-[2]" />
        </button>
      </header>

      {/* ── FEED DE POSTAGENS DO CANAL (BALÕES NATIVOS FLATS) ── */}
      <main
        ref={scrollRef}
        className="w-full max-w-[650px] flex-1 overflow-y-auto no-scrollbar px-3 pt-3 pb-24 space-y-3 relative"
      >
        {posts.map((post) => {
          const isProofPost = post.isProof || !!post.amount || post.id.startsWith('sp-') || post.id.startsWith('proof-');
          const displayedContent = isProofPost
            ? post.content.replace(/visto\s+comprovativo\s+autenticado\s+na\s+plataforma[.!]?/gi, '').trim()
            : post.content;
          const displayedTitle = isProofPost
            ? `${t('social.proof_title')}${post.amount ? `: ${post.amount}` : ''}`
            : post.title;

          return (
            <div key={post.id} className="flex items-end justify-start gap-2 relative min-w-0">
              
              <div className={`max-w-[88%] sm:max-w-[82%] min-w-0 relative ${
                isProofPost
                  ? 'flex flex-col gap-1.5'
                  : 'bg-white dark:bg-[#182533] rounded-[16px] rounded-tl-[4px] px-3.5 pt-3 pb-2 border border-[#e4e4e4] dark:border-[#1e2c3a]'
              }`}>
                
                {/* 1. Nome/Número do Membro */}
                {post.forwardedFrom && (
                  <div className={isProofPost ? 'px-1' : 'mb-1.5'}>
                    <div className="flex items-center gap-1.5">
                      {post.forwardedFrom.avatar ? (
                        <img 
                          src={post.forwardedFrom.avatar} 
                          alt="Avatar do Membro"
                          className="w-6 h-6 rounded-full object-cover shrink-0 border border-orange-200"
                          onError={(e) => {
                            (e.target as any).src = "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=80&h=80&fit=crop";
                          }}
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                          👤
                        </div>
                      )}
                      <span className="text-[13.5px] font-bold text-[#e67e22] dark:text-[#f39c12] truncate">
                        {post.forwardedFrom.name.replace(/^Prova de Retirada •\s*/i, '').replace(/^Membro\s*/i, '').trim()}
                      </span>
                    </div>
                  </div>
                )}

                {/* 2. Imagem em cima — clique abre fullscreen */}
                {post.image && (
                  <div
                    className={`relative group cursor-zoom-in ${isProofPost ? 'w-full' : ''}`}
                    onClick={() => setFullscreenImage(post.image!)}
                    title="Toque para ampliar"
                  >
                    <img
                      src={post.image}
                      alt={post.title || "Comprovativo"}
                      className={`w-full h-auto max-h-[550px] object-contain block select-none transition-opacity group-active:opacity-80 ${
                        isProofPost ? 'my-0 rounded-[12px]' : 'my-2 rounded-[12px]'
                      }`}
                      onError={(e) => {
                        (e.target as any).src = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=350&fit=crop";
                      }}
                    />
                    <div className="absolute top-3 right-3 bg-black/40 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <ZoomIn className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}

                <div className={isProofPost
                  ? 'bg-white dark:bg-[#182533] rounded-[14px] px-3 py-2 border border-[#e4e4e4] dark:border-[#1e2c3a]'
                  : ''
                }>
                  {/* O título descreve o envio do utilizador, não valida a transação. */}
                  {displayedTitle && (
                  <h2 className={`text-[15px] font-bold leading-snug ${
                    isProofPost ? 'mb-1' : 'mt-2 mb-1'
                  }`}>
                    <AutoTranslatedText
                      text={displayedTitle}
                      language={language}
                      enabled={translateFullChats}
                      renderFormatted={(translatedTitle) => {
                        const [titleLabel, ...titleValue] = translatedTitle.split(':');
                        return titleValue.length > 0 ? (
                          <>
                            <span className="text-[#111827] dark:text-white">{titleLabel}:{' '}</span>
                            <span className="text-[#16a34a] dark:text-[#22c55e] font-black">{titleValue.join(':')}</span>
                          </>
                        ) : (
                          <span className="text-[#111827] dark:text-white">{translatedTitle}</span>
                        );
                      }}
                    />
                  </h2>
                )}

                  {/* 4. Descrição / Comentário em baixo */}
                  {displayedContent && (
                  <p className="text-[14px] text-[#111827] dark:text-[#f3f4f6] leading-relaxed break-words whitespace-pre-line font-normal mb-1 pr-2">
                    <AutoTranslatedText
                      text={displayedContent}
                      language={language}
                      enabled={translateFullChats}
                    />
                  </p>
                )}

                {/* O conteúdo de comprovativos é enviado por utilizadores e não é verificado. */}
                <div className={`flex items-center justify-between ${
                  isProofPost ? 'mt-1' : 'mt-2 pt-1'
                }`}>
                  <span className="text-[11px] text-[#8e8e93] dark:text-[#8e9aa5] ml-auto">
                    {isProofPost ? t('social.proof_unverified') : post.time}
                  </span>
                </div>
                </div>
              </div>

              {/* Botão de Encaminhar Rápido (FLAT) */}
              <button
                type="button"
                onClick={() => handleForwardPost(post)}
                className="w-8 h-8 rounded-full bg-white dark:bg-[#242f3d] border border-[#e4e4e4] dark:border-[#1e2c3a] flex items-center justify-center text-[#2481cc] active:scale-90 transition-transform cursor-pointer shrink-0 mb-1"
                title="Encaminhar post"
                aria-label="Encaminhar post"
              >
                <Share2 className="w-4 h-4 -scale-x-100" />
              </button>
            </div>
          );
        })}
      </main>

      {/* ── BARRA INFERIOR FLUTUANTE FLAT (A JUSTADA PARA TELAS MÓVEIS / SEM CORTAR) ── */}
      <footer className="fixed bottom-0 left-0 right-0 px-1.5 sm:p-2 pb-3 z-40 flex justify-center bg-transparent pointer-events-none">
        <div className="w-full max-w-[650px] flex items-center gap-1.5 sm:gap-2 pointer-events-auto px-1 sm:px-2 min-w-0">
          
          {/* Pílula de Input: Texto à esquerda + Clipe de Anexo & Notificação à direita */}
          <div className="flex-1 bg-white dark:bg-[#182533] rounded-full flex items-center px-2.5 sm:px-3 py-1.5 min-h-[46px] border border-[#e4e4e4] dark:border-[#1e2c3a] transition-colors min-w-0">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendBroadcast();
              }}
              placeholder={t('social.local_draft_placeholder')}
              className="flex-1 min-w-0 px-1 py-1 text-[14.5px] bg-transparent outline-none text-black dark:text-white placeholder:text-[#8e8e93] dark:placeholder:text-gray-400 font-normal leading-snug"
            />

            {/* Sino de Notificação (🔔) */}
            <button
              type="button"
              onClick={() => {
                setIsMuted(!isMuted);
                showToast(isMuted ? 'Notificações ativadas' : 'Canal silenciado', 'info');
              }}
              className={`p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer shrink-0 ml-0.5 ${
                isMuted ? 'text-[#e53e3e]' : 'text-[#707579] dark:text-[#9eaab6] hover:text-[#2481cc]'
              }`}
              title={isMuted ? "Canal silencioso" : "Canal com som"}
            >
              {isMuted ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
            </button>

            {/* Anexo junto ao controlo de notificações */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[#707579] dark:text-[#9eaab6] hover:text-[#2481cc] p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer shrink-0 ml-0.5"
              title={t('recharge.proof_label')}
              aria-label={t('recharge.proof_label')}
            >
              <Paperclip className="w-5 h-5 -rotate-45" />
            </button>
          </div>

          {/* Botão circular para selecionar e enviar um ficheiro */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full text-white bg-[#2481cc] hover:bg-[#1f72b5] flex items-center justify-center active:scale-90 transition-transform shrink-0 cursor-pointer"
            title="Enviar ficheiro"
            aria-label="Enviar ficheiro"
          >
            <Upload className="w-5 h-5 text-white" />
          </button>
        </div>
      </footer>

      {/* ── MODAL TELEGRAM: PARTILHAR PROVA DE RETIRADA (QUANDO IMAGEM É SELECIONADA) ── */}
      {isProofModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div 
            className="w-full max-w-[480px] bg-white dark:bg-[#242f3d] rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar do Modal */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-[16px] font-bold text-[#111827] dark:text-white">
                Partilhar Prova de Retirada
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsProofModalOpen(false);
                  setPreviewImage(null);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo do Formulário */}
            <form onSubmit={handleSubmitProof} className="p-4 space-y-3.5 overflow-y-auto flex-1">
              <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-[13px] leading-relaxed text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
                {t('social.proof_disclaimer')}
              </p>
              
              {/* Pré-visualização da Imagem Anexada */}
              {previewImage && (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#182533] flex items-center justify-center max-h-[220px]">
                  <img
                    src={previewImage}
                    alt="Pré-visualização do Comprovativo"
                    className="w-full h-auto max-h-[220px] object-contain rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full bg-black/70 hover:bg-black/90 text-white text-[12px] font-medium backdrop-blur-xs flex items-center gap-1 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{t('social.change')}</span>
                  </button>
                </div>
              )}

              {/* Campo Valor da Retirada */}
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {t('social.received_value')} <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="Ex: 25.000"
                    value={proofAmount}
                    onChange={(e) => setProofAmount(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#182533] text-[15px] font-medium text-[#111827] dark:text-white outline-none focus:border-[#2481cc] transition-colors"
                    required
                  />
                  {proofAmount && (
                    <span className="absolute right-3.5 text-[14px] font-semibold text-gray-400">
                      Kz
                    </span>
                  )}
                </div>
              </div>

              {/* Campo Comentário / Depoimento */}
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {t('social.your_comment')} (opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder={t('social.message_placeholder')}
                  value={proofComment}
                  onChange={(e) => setProofComment(e.target.value.slice(0, 250))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#182533] text-[14px] text-[#111827] dark:text-white outline-none focus:border-[#2481cc] transition-colors resize-none"
                />
                <div className="text-right text-[11px] text-gray-400 mt-0.5">
                  {proofComment.length}/250
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsProofModalOpen(false);
                    setPreviewImage(null);
                  }}
                  disabled={isSubmittingProof}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-[14px] font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  {t('common.cancel')}
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingProof || !proofAmount}
                  className="flex-1 py-2.5 rounded-xl bg-[#2481cc] hover:bg-[#1d6fae] active:scale-[0.99] text-white text-[14px] font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  {isSubmittingProof ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('social.sending')}</span>
                    </>
                  ) : (
                    <span>{t('social.send_proof')}</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── FULLSCREEN DE IMAGEM (clique fora ou toque para fechar) ── */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center cursor-zoom-out"
          onClick={() => setFullscreenImage(null)}
        >
          {/* Botão de fechar */}
          <button
            type="button"
            onClick={() => setFullscreenImage(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
            aria-label={t('common.close')}
          >
            <X className="w-6 h-6" />
          </button>

          <img
            src={fullscreenImage}
            alt="Comprovativo ampliado"
            className="max-w-full max-h-full object-contain rounded-lg select-none"
            style={{ maxHeight: '95dvh', maxWidth: '95dvw' }}
            onClick={(e) => e.stopPropagation()}
            onError={(e) => {
              (e.target as any).src = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=350&fit=crop';
            }}
          />

          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/50 text-[12px] select-none pointer-events-none">
            Toque fora da imagem para fechar
          </p>
        </div>
      )}

    </div>
  );
}
