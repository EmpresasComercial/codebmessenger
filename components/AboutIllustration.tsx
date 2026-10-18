import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  Bell,
  Bot,
  Check,
  FileText,
  Fingerprint,
  Image,
  KeyRound,
  LockKeyhole,
  MessageCircle,
  Monitor,
  ShieldCheck,
  Smartphone,
  Wallet,
} from 'lucide-react';

type AboutSection =
  | 'about.identity'
  | 'about.history'
  | 'about.messaging'
  | 'about.passkey'
  | 'about.zoom'
  | 'about.menu'
  | 'about.notifications'
  | 'about.sessions'
  | 'about.recharge'
  | 'about.withdrawal'
  | 'about.xfather'
  | 'about.security'
  | 'about.additional';

function ChatScreen() {
  return (
    <div className="space-y-2 pt-3">
      <div className="h-2 w-12 rounded-full bg-slate-200" />
      <div className="about-chat-bubble about-chat-bubble-one ml-auto h-6 w-11/12 rounded-xl rounded-br-sm bg-sky-100" />
      <div className="about-chat-bubble about-chat-bubble-two h-7 w-10/12 rounded-xl rounded-bl-sm bg-slate-100" />
      <div className="about-chat-bubble about-chat-bubble-three ml-auto flex h-9 w-10/12 items-center gap-2 rounded-xl rounded-br-sm bg-sky-100 p-1.5">
        <span className="flex h-6 w-7 items-center justify-center rounded-md bg-sky-300/50">
          <Image className="h-3 w-3 text-sky-700" />
        </span>
        <span className="h-1.5 w-7 rounded-full bg-sky-300" />
      </div>
      <div className="mt-3 h-6 rounded-full border border-slate-200 bg-white" />
    </div>
  );
}

function ScreenContent({ section }: { section: AboutSection }) {
  if (section === 'about.identity' || section === 'about.messaging') {
    return <ChatScreen />;
  }

  if (section === 'about.history') {
    return (
      <div className="relative ml-2 mt-5 space-y-5 border-l-2 border-sky-200 pl-4">
        <span className="about-timeline-dot absolute -left-[5px] top-0 h-2 w-2 rounded-full bg-sky-500" />
        <div>
          <div className="h-2 w-12 rounded-full bg-sky-200" />
          <div className="mt-1.5 h-1.5 w-16 rounded-full bg-slate-200" />
        </div>
        <span className="about-timeline-dot about-delay-one absolute -left-[5px] top-12 h-2 w-2 rounded-full bg-sky-500" />
        <div>
          <div className="h-2 w-14 rounded-full bg-sky-200" />
          <div className="mt-1.5 h-1.5 w-12 rounded-full bg-slate-200" />
        </div>
      </div>
    );
  }

  if (section === 'about.passkey') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <span className="about-passkey-icon flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
          <Fingerprint className="h-7 w-7" />
        </span>
        <div className="h-2 w-14 rounded-full bg-slate-200" />
        <div className="h-1.5 w-10 rounded-full bg-slate-100" />
        <span className="mt-1 flex h-5 w-12 items-center justify-center rounded-full bg-sky-500">
          <Check className="h-3 w-3 text-white" />
        </span>
      </div>
    );
  }

  if (section === 'about.zoom') {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <span className="about-zoom-type font-semibold tracking-tight text-slate-700">
          <span className="text-lg">A</span>
          <span className="text-3xl">a</span>
        </span>
        <div className="mt-3 h-1.5 w-14 rounded-full bg-slate-200">
          <div className="relative h-full w-2/3 rounded-full bg-sky-500">
            <span className="about-zoom-knob absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-sky-500 shadow" />
          </div>
        </div>
        <div className="mt-2 flex w-16 justify-between">
          <span className="h-1.5 w-3 rounded-full bg-slate-200" />
          <span className="h-1.5 w-3 rounded-full bg-slate-200" />
          <span className="h-1.5 w-3 rounded-full bg-slate-200" />
        </div>
      </div>
    );
  }

  if (section === 'about.menu') {
    return (
      <div className="space-y-2 pt-4">
        <div className="h-2 w-12 rounded-full bg-slate-200" />
        <div className="h-7 rounded-lg bg-slate-100" />
        <div className="flex h-7 items-center justify-between rounded-lg bg-sky-50 px-2">
          <span className="h-1.5 w-7 rounded-full bg-sky-200" />
          <span className="about-menu-toggle h-3.5 w-6 rounded-full bg-sky-500 p-0.5">
            <span className="ml-auto block h-2.5 w-2.5 rounded-full bg-white" />
          </span>
        </div>
        <div className="flex justify-around rounded-lg border border-slate-100 py-1.5">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          <span className="h-2 w-2 rounded-full bg-slate-200" />
          <span className="h-2 w-2 rounded-full bg-slate-200" />
        </div>
      </div>
    );
  }

  if (section === 'about.notifications') {
    return (
      <div className="pt-5">
        <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white p-2 shadow-sm">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
            <Bell className="about-notification-bell h-4 w-4" />
          </span>
          <span className="flex-1 space-y-1">
            <span className="block h-1.5 w-9 rounded-full bg-slate-300" />
            <span className="block h-1.5 w-12 rounded-full bg-slate-100" />
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-2 w-11/12 rounded-full bg-slate-100" />
          <div className="h-2 w-8/12 rounded-full bg-slate-100" />
        </div>
      </div>
    );
  }

  if (section === 'about.sessions') {
    return (
      <div className="flex h-full items-center justify-center gap-2">
        <span className="flex h-9 w-12 items-center justify-center rounded-md border-2 border-slate-300 bg-slate-50">
          <Monitor className="h-5 w-5 text-sky-600" />
        </span>
        <span className="flex h-12 w-7 items-center justify-center rounded-lg border-2 border-slate-300 bg-slate-50">
          <Smartphone className="h-5 w-5 text-sky-600" />
        </span>
        <span className="about-session-status absolute bottom-4 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
          <Check className="h-3 w-3 text-white" />
        </span>
      </div>
    );
  }

  if (section === 'about.recharge') {
    return (
      <div className="pt-4">
        <div className="rounded-xl border border-slate-100 bg-white p-2.5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <FileText className="h-4 w-4" />
            </span>
            <span className="space-y-1">
              <span className="block h-1.5 w-10 rounded-full bg-slate-300" />
              <span className="block h-1.5 w-7 rounded-full bg-slate-100" />
            </span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-slate-100">
            <div className="about-recharge-progress h-full w-2/3 rounded-full bg-sky-400" />
          </div>
        </div>
        <div className="about-recharge-status ml-auto mt-2 flex h-5 w-10 items-center justify-center rounded-full bg-sky-500">
          <Check className="h-3 w-3 text-white" />
        </div>
      </div>
    );
  }

  if (section === 'about.withdrawal') {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
          <Wallet className="h-6 w-6" />
        </span>
        <div className="mt-3 h-2 w-14 rounded-full bg-slate-200" />
        <div className="mt-1.5 h-1.5 w-10 rounded-full bg-slate-100" />
        <div className="mt-3 flex items-center gap-1">
          <span className="h-1.5 w-4 rounded-full bg-slate-200" />
          <span className="about-withdrawal-current h-1.5 w-4 rounded-full bg-sky-400" />
          <span className="h-1.5 w-4 rounded-full bg-slate-200" />
        </div>
      </div>
    );
  }

  if (section === 'about.xfather') {
    return (
      <div className="grid grid-cols-2 gap-2 pt-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="flex h-11 items-center gap-1.5 rounded-lg border border-slate-100 bg-white p-1.5">
            <span className={`about-bot-icon about-delay-${item} flex h-6 w-6 items-center justify-center rounded-md bg-sky-50 text-sky-600`}>
              <Bot className="h-4 w-4" />
            </span>
            <span className="space-y-1">
              <span className="block h-1 w-5 rounded-full bg-slate-300" />
              <span className="block h-1 w-3 rounded-full bg-slate-100" />
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (section === 'about.security') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <span className="about-security-shield flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <ShieldCheck className="h-8 w-8" />
        </span>
        <div className="h-2 w-14 rounded-full bg-slate-200" />
        <div className="h-1.5 w-10 rounded-full bg-slate-100" />
      </div>
    );
  }

  if (section === 'about.additional') {
    return (
      <div className="grid grid-cols-3 gap-2 pt-5">
        {[MessageCircle, Image, FileText, Bell, LockKeyhole, KeyRound].map((Icon, item) => (
          <span key={item} className={`about-feature-icon about-delay-${item} flex h-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600`}>
            <Icon className="h-4 w-4" />
          </span>
        ))}
      </div>
    );
  }

  return <ChatScreen />;
}

export default function AboutIllustration({
  section,
  logoRef,
}: {
  section: AboutSection;
  logoRef?: RefObject<HTMLImageElement | null>;
}) {
  const illustrationRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const illustration = illustrationRef.current;
    if (!illustration) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: '100px 0px' },
    );
    observer.observe(illustration);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={illustrationRef}
      aria-hidden="true"
      className={`about-illustration relative mt-4 mb-4 h-[230px] w-full overflow-hidden${isVisible ? ' is-visible' : ''}`}
    >
      <div className="absolute inset-x-0 top-0 h-[260px]">
        <span className="absolute -left-[1px] top-[58px] h-8 w-[2px] rounded-l-sm bg-slate-400/80" />
        <span className="absolute -left-[1px] top-[100px] h-12 w-[2px] rounded-l-sm bg-slate-400/80" />
        <span className="absolute -right-[1px] top-[76px] h-14 w-[2px] rounded-r-sm bg-slate-400/80" />
        <div className="relative h-full w-full rounded-[30px] border border-slate-400/80 bg-slate-300/80 p-[3px] shadow-[0_5px_14px_rgba(15,23,42,.14)]">
          <div className="h-full overflow-hidden rounded-[26px] border border-slate-300 bg-white">
            <div className="relative flex h-[23px] items-center justify-between bg-white px-3 text-[7px] font-semibold text-slate-900">
              <span>9:41</span>
              <span className="absolute left-1/2 top-[3px] flex h-[14px] w-[43px] -translate-x-1/2 items-center justify-end rounded-full bg-[#07090b] pr-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#182433] ring-1 ring-white/10" />
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-2 rounded-[2px] border border-slate-800" />
                <span className="h-1.5 w-2 rounded-[2px] bg-slate-800" />
              </span>
            </div>
            <div className="flex h-7 items-center gap-1.5 border-b border-slate-100 bg-white px-2">
              <span className="flex h-4 w-4 items-center justify-center overflow-hidden rounded-full bg-sky-500">
                <img ref={logoRef} src="/logo_tegx.jfif" alt="" className="h-full w-full object-cover" />
              </span>
              <span className="h-1.5 w-9 rounded-full bg-slate-300" />
              <span className="ml-auto h-1 w-4 rounded-full bg-slate-200" />
            </div>
            <div data-about-section={section} className="about-screen-content h-[182px] overflow-hidden bg-white px-2.5 pb-1.5 pt-1">
              <ScreenContent section={section} />
            </div>
            <div className="flex h-4 items-center justify-center bg-white">
              <span className="h-[3px] w-9 rounded-full bg-[#15191d]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
