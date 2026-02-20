import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, MotionValue } from "framer-motion";
import { ArrowDown, Heart, Image as ImageIcon, Sparkles, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Romantic Web Card for "Вікуша" (single-file React component)
 * - Powder-pink background (softer), with a gentle vignette for readability
 * - Full-screen floating hearts (multi-directional), more saturated pink
 * - Envelope intro with heart seal
 * - Scroll reveal blocks + right-side curvy heart rail with %
 * - Photo deck: click deck to fan/shuffle; ONLY after fanned, click a card to open modal
 * - Bottom romantic interactive: "Надіслати поцілунок 💋" heart burst
 * - Performance: adaptive heart count + respects prefers-reduced-motion
 * - Sets page title + favicon heart
 */

type PhotoCard = {
  id: string;
  title: string;
  subtitle: string;
  bg: string; // placeholder bg; replace with real image url if you want
};

type HeartSpec = {
  id: string;
  size: number;
  x0: number;
  y0: number;
  duration: number;
  delay: number;
  opacity: number;
  hue: number;
  dx: number;
  dy: number;
  spin: number;
  depth: number;
};

const SITE_TITLE = "Лист для Вікуші 💗";

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function computeHeartCount({ width, cores, reduceMotion }: { width: number; cores: number; reduceMotion: boolean }) {
  // Tuned to be pretty but safe.
  let c = width < 640 ? 52 : 74;
  if (cores <= 4) c = Math.min(c, 56);
  if (reduceMotion) c = 26;
  return c;
}

function runDevTests() {
  // Minimal sanity checks ("tests" without a runner)
  if (typeof process !== "undefined" && (process as any).env?.NODE_ENV === "production") return;

  console.assert(clamp(0.5, 0, 1) === 0.5, "clamp mid");
  console.assert(clamp(-1, 0, 1) === 0, "clamp low");
  console.assert(clamp(2, 0, 1) === 1, "clamp high");
  console.assert(clamp(1, 0, 1) === 1, "clamp exact high");
  console.assert(clamp(0, 0, 1) === 0, "clamp exact low");

  for (let i = 0; i < 10; i++) {
    const r = rand(2, 3);
    console.assert(r >= 2 && r <= 3, "rand range");
  }

  // Additional tests for computeHeartCount
  console.assert(computeHeartCount({ width: 500, cores: 8, reduceMotion: false }) === 52, "heartCount small width");
  console.assert(computeHeartCount({ width: 1200, cores: 8, reduceMotion: false }) === 74, "heartCount large width");
  console.assert(computeHeartCount({ width: 1200, cores: 2, reduceMotion: false }) === 56, "heartCount low cores cap");
  console.assert(computeHeartCount({ width: 1200, cores: 8, reduceMotion: true }) === 26, "heartCount reduced motion");

  // Extra: ensure clamp is stable for NaN-ish inputs by coercion (we avoid NaN in useScrollProgress)
  console.assert(Number.isFinite(clamp(0, 0, 1)), "clamp finite");
}

runDevTests();

function setFaviconHeart() {
  if (typeof document === "undefined") return;

  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
      <defs>
        <radialGradient id='g' cx='30%' cy='25%' r='80%'>
          <stop offset='0%' stop-color='#ffffff' stop-opacity='0.95'/>
          <stop offset='55%' stop-color='#ffb2d1' stop-opacity='0.98'/>
          <stop offset='100%' stop-color='#ff4fa3' stop-opacity='1'/>
        </radialGradient>
      </defs>
      <rect width='64' height='64' rx='16' fill='#2a1620'/>
      <path d='M32 52s-18-10.6-24.2-21.6C3 20 9.5 10.5 20 12.2c4.3.7 7.4 3.7 8.7 5.6 1.3-1.9 4.4-4.9 8.7-5.6C48.5 10.5 55 20 56.2 30.4 50 41.4 32 52 32 52z' fill='url(#g)'/>
      <path d='M24 22c2.4-3.5 6.7-5.6 8-4.9 1.3-.7 5.6 1.4 8 4.9' fill='none' stroke='#fff' stroke-opacity='0.7' stroke-width='4' stroke-linecap='round'/>
    </svg>
  `.trim();

  const dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;

  let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = dataUrl;
}

function useScrollProgress(enabled = true) {
  const [p, setP] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const scrollHeight = doc.scrollHeight - window.innerHeight;
      const progress = scrollHeight <= 0 ? 0 : scrollTop / scrollHeight;
      setP(clamp(progress, 0, 1));
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled]);

  return p;
}

function Ribbon({ progress }: { progress: number }) {
  const w = Math.round(progress * 100);
  return (
    <div className="sticky top-0 z-40">
      <div className="h-1.5 w-full bg-black/10 backdrop-blur">
        <motion.div
          className="h-1.5 bg-white/80"
          initial={{ width: 0 }}
          animate={{ width: `${w}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 24 }}
        />
      </div>
    </div>
  );
}

function SoftGlow() {
  return (
    <>
      <div className="absolute -top-40 left-1/2 h-[760px] w-[760px] -translate-x-1/2 rounded-full bg-white/30 blur-3xl" />
      <div className="absolute top-[36%] left-[-14%] h-[580px] w-[580px] rounded-full bg-white/18 blur-3xl" />
      <div className="absolute top-[72%] right-[-14%] h-[580px] w-[580px] rounded-full bg-white/18 blur-3xl" />
    </>
  );
}

function useIntersectionOnce(options: IntersectionObserverInit = { threshold: 0.2 }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (!ref.current || seen) return;
    if (typeof window === "undefined") return;

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
          break;
        }
      }
    }, options);

    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen, options]);

  return { ref, seen };
}

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, seen } = useIntersectionOnce({ threshold: 0.18 });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
      animate={seen ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
      transition={{ duration: 0.72, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

function ConfettiSpark({ active }: { active: boolean }) {
  const bits = useMemo(() => {
    return Array.from({ length: 16 }).map((_, i) => ({
      id: `s-${i}`,
      x: rand(-160, 160),
      y: rand(-60, 160),
      r: rand(-70, 70),
      d: rand(0.6, 1.3),
      delay: rand(0, 0.25),
    }));
  }, []);

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      {bits.map((b) => (
        <motion.div
          key={b.id}
          className="absolute left-1/2 top-1/2"
          initial={{ opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.8 }}
          animate={{ opacity: [0, 1, 0], x: b.x, y: b.y, rotate: b.r, scale: [0.85, 1.08, 0.95] }}
          transition={{ duration: 0.85 * b.d, delay: b.delay, ease: "easeOut" }}
        >
          <Sparkles className="h-5 w-5 text-white/90" />
        </motion.div>
      ))}
    </div>
  );
}

function HeartBurst({ tick }: { tick: number }) {
  // Lightweight burst for the mini-interactive card.
  const items = useMemo(() => {
    if (tick <= 0)
      return [] as Array<{ id: string; x: number; y: number; r: number; s: number; d: number; delay: number }>;
    return Array.from({ length: 12 }).map((_, i) => ({
      id: `hb-${tick}-${i}`,
      x: rand(-150, 150),
      y: rand(-120, 120),
      r: rand(-90, 90),
      s: rand(0.85, 1.25),
      d: rand(0.75, 1.1),
      delay: rand(0, 0.12),
    }));
  }, [tick]);

  if (tick <= 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((it) => (
        <motion.div
          key={it.id}
          className="absolute left-1/2 top-1/2"
          initial={{ opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.6 }}
          animate={{ opacity: [0, 1, 0], x: it.x, y: it.y, rotate: it.r, scale: [0.7, it.s, 0.85] }}
          transition={{ duration: it.d, delay: it.delay, ease: "easeOut" }}
        >
          <Heart className="h-5 w-5" color="rgba(255,79,163,0.92)" fill="rgba(255,79,163,0.55)" />
        </motion.div>
      ))}
    </div>
  );
}

function Modal({
  open,
  onClose,
  title,
  children,
  rightAction,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  rightAction?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/45"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative w-full max-w-xl"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.2, 0.9, 0.2, 1] }}
      >
        <Card className="border-white/22 bg-white/12 backdrop-blur-xl shadow-2xl rounded-[28px]">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-white">{title}</div>
                <div className="mt-1 text-sm text-white/75">ESC або клік поза вікном — закрити</div>
              </div>
              <div className="flex items-center gap-2">
                {rightAction}
                <Button
                  variant="secondary"
                  className="bg-white/14 hover:bg-white/20 text-white border border-white/18"
                  onClick={onClose}
                >
                  Закрити
                </Button>
              </div>
            </div>
            <div className="mt-5 text-white/90 leading-relaxed">{children}</div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function HeartParticle({
  spec,
  mouseX,
  mouseY,
}: {
  spec: HeartSpec;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
}) {
  // Hooks must NOT be called inside a map loop; this component fixes React error #310.
  const px = useTransform(mouseX, (v) => v * 16 * spec.depth);
  const py = useTransform(mouseY, (v) => v * 12 * spec.depth);
  const sx = useSpring(px, { stiffness: 90, damping: 20, mass: 0.7 });
  const sy = useSpring(py, { stiffness: 90, damping: 20, mass: 0.7 });

  return (
    <motion.div
      className="absolute"
      style={{ left: `${spec.x0}%`, top: `${spec.y0}%`, x: sx, y: sy }}
      initial={{ opacity: 0 }}
      animate={{
        opacity: [0, spec.opacity, 0.08, spec.opacity, 0],
        x: [0, spec.dx, -spec.dx * 0.55, spec.dx * 0.25, 0],
        y: [0, spec.dy, -spec.dy * 0.35, spec.dy * 0.2, 0],
        rotate: [0, spec.spin, -spec.spin, spec.spin * 0.4, 0],
        scale: [0.95, 1.06, 1, 1.03, 0.98],
      }}
      transition={{ duration: spec.duration, delay: spec.delay, repeat: Infinity, ease: "easeInOut" }}
    >
      <Heart
        style={{
          width: spec.size,
          height: spec.size,
          color: `hsla(${spec.hue}, 92%, 38%, ${Math.min(0.95, spec.opacity + 0.35)})`,
        }}
        fill={`hsla(${spec.hue}, 95%, 68%, ${Math.min(0.92, spec.opacity + 0.20)})`}
        className="drop-shadow-[0_10px_24px_rgba(0,0,0,0.16)]"
      />
    </motion.div>
  );
}

function FloatingHearts({ count = 64 }: { count?: number }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      mouseX.set(x);
      mouseY.set(y);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [mouseX, mouseY]);

  const hearts: HeartSpec[] = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const size = rand(12, 32);
      const x0 = rand(0, 100);
      const y0 = rand(0, 100);
      const duration = rand(10, 18);
      const delay = rand(0, 6);
      const opacity = rand(0.18, 0.34);
      const hue = rand(332, 350);
      const dx = rand(-180, 180);
      const dy = rand(-180, 180);
      const spin = rand(-18, 18);
      const depth = rand(0.35, 1.2);
      const boost = Math.random() < 0.2 ? 0.14 : 0;
      return {
        id: `fh-${i}`,
        size,
        x0,
        y0,
        duration,
        delay,
        opacity: opacity + boost,
        hue,
        dx,
        dy,
        spin,
        depth,
      };
    });
  }, [count]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {hearts.map((h) => (
        <HeartParticle key={h.id} spec={h} mouseX={mouseX} mouseY={mouseY} />
      ))}
    </div>
  );
}

function ScrollHeartRail({ progress }: { progress: number }) {
  const hearts = 13;
  const p = clamp(progress, 0, 1);
  const active = Math.round(p * (hearts - 1));

  return (
    <div className="fixed right-4 top-1/2 z-40 -translate-y-1/2 hidden sm:block">
      <div className="relative h-[520px] w-12">
        <svg className="absolute inset-0" viewBox="0 0 48 520" fill="none">
          <path
            d="M24 10 C 40 60, 8 110, 24 160 C 40 210, 8 260, 24 310 C 40 360, 8 410, 24 460 C 40 500, 18 510, 24 510"
            stroke="rgba(255,255,255,0.82)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>

        {Array.from({ length: hearts }).map((_, i) => {
          const t = i / (hearts - 1);
          const y = 10 + t * 500;
          const x = 24 + Math.sin(t * Math.PI * 5) * 10;
          const isOn = i <= active;
          return (
            <div key={`rail-${i}`} className="absolute" style={{ left: x - 10, top: y - 10 }} aria-hidden>
              <Heart
                className="h-5 w-5"
                style={{ opacity: isOn ? 0.98 : 0.35 }}
                fill={isOn ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.18)"}
                color={isOn ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.28)"}
              />
            </div>
          );
        })}

        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-white/85">
          {Math.round(progress * 100)}%
        </div>
      </div>
    </div>
  );
}

function PhotoEnvelope({ onOpenImage }: { onOpenImage: (p: PhotoCard) => void }) {
  const photos: PhotoCard[] = useMemo(
    () => [
      {
        id: "p1",
        title: "Наша посмішка",
        subtitle: "Тут може бути ваше фото",
        bg: "radial-gradient(circle at top, rgba(255,255,255,0.32), transparent 55%), linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06))",
      },
      {
        id: "p2",
        title: "Теплий момент",
        subtitle: "Підстав фото — і буде магія",
        bg: "radial-gradient(circle at 25% 20%, rgba(255,255,255,0.26), transparent 50%), linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06))",
      },
      {
        id: "p3",
        title: "Твій погляд",
        subtitle: "Найкращий кадр",
        bg: "radial-gradient(circle at 70% 10%, rgba(255,255,255,0.26), transparent 50%), linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06))",
      },
      {
        id: "p4",
        title: "Ми разом",
        subtitle: "Колода спогадів",
        bg: "radial-gradient(circle at 40% 30%, rgba(255,255,255,0.26), transparent 50%), linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06))",
      },
      {
        id: "p5",
        title: "Ще один момент",
        subtitle: "Додай фото",
        bg: "radial-gradient(circle at 10% 80%, rgba(255,255,255,0.26), transparent 50%), linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06))",
      },
    ],
    []
  );

  const [scattered, setScattered] = useState(false);

  return (
    <div className="relative">
      <div>
        <div className="text-sm text-white/85">Конвертик з фото</div>
        <div className="mt-1 text-2xl sm:text-3xl font-semibold">Маленька колода спогадів</div>
        <p className="mt-2 text-white/80 leading-relaxed">
          Натисни на колоду — фото «розтасуються». Після цього клік по карті — перегляд.
        </p>
      </div>

      <div className="mt-6 grid place-items-center">
        <div className="relative w-full max-w-xl">
          <div className="relative rounded-[28px] border border-white/18 bg-white/10 backdrop-blur-xl p-6 shadow-2xl overflow-hidden">
            <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_55%)]" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 text-white/95">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 border border-white/18">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm">Колода фото</div>
                  <div className="text-xs text-white/70">Спочатку «розтаси» її кліком по колоді</div>
                </div>
              </div>

              {/* Deck surface (NOT a <button> to avoid nested buttons) */}
              <div
                role="button"
                tabIndex={0}
                className="relative mt-6 h-64 sm:h-72 w-full outline-none"
                onClick={() => setScattered((v) => !v)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setScattered((v) => !v);
                }}
                aria-label="Перемішати колоду фото"
              >
                <AnimatePresence>
                  {photos.map((p, i) => {
                    const baseY = 12 + i * 2;
                    const baseR = -2 + i * 1.2;

                    const fanX = (i - (photos.length - 1) / 2) * 70;
                    const fanR = (i - (photos.length - 1) / 2) * 7;
                    const fanY = Math.abs(i - (photos.length - 1) / 2) * 7;

                    return (
                      <motion.button
                        key={p.id}
                        type="button"
                        className="absolute left-1/2 top-2 w-[210px] sm:w-[240px] h-[250px] sm:h-[270px] -translate-x-1/2 rounded-[26px] border border-white/20 bg-white/10 shadow-xl overflow-hidden text-left"
                        style={{ zIndex: photos.length - i }}
                        initial={{ opacity: 0, y: 18, scale: 0.98 }}
                        animate={{
                          opacity: 1,
                          x: scattered ? fanX : 0,
                          y: scattered ? fanY : baseY,
                          rotate: scattered ? fanR : baseR,
                          scale: scattered ? 1 : 0.98,
                        }}
                        exit={{ opacity: 0, y: 18 }}
                        transition={{ type: "spring", stiffness: 140, damping: 18, mass: 0.7, delay: i * 0.03 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!scattered) {
                            setScattered(true);
                            return;
                          }
                          onOpenImage(p);
                        }}
                      >
                        <div className="h-full w-full">
                          <div className="h-[70%]" style={{ backgroundImage: p.bg }}>
                            <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_55%)]" />
                          </div>
                          <div className="p-4">
                            <div className="text-white font-semibold">{p.title}</div>
                            <div className="mt-1 text-sm text-white/75">{p.subtitle}</div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>

                {!scattered ? (
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className="rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm text-white/85 backdrop-blur">
                      Натисни, щоб «розтасувати»
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EnvelopeIntro({ onOpen, heartCount }: { onOpen: () => void; heartCount: number }) {
  const [pressed, setPressed] = useState(false);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-6">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#f6d0dd,#f3c7d6)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.65),transparent_60%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.25),transparent_65%)]" />
      <div className="absolute inset-0 bg-black/25" />

      <FloatingHearts count={Math.max(22, Math.round(heartCount * 0.85))} />

      <motion.div
        className="relative w-full max-w-xl"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.2, 0.9, 0.2, 1] }}
      >
        <Card className="border-white/22 bg-white/14 backdrop-blur-xl shadow-2xl rounded-[28px] overflow-hidden">
          <CardContent className="p-0">
            <div className="relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.20),transparent_55%)]" />

              <div className="relative p-8">
                <div className="text-sm text-white/85">Лист для Вікуші</div>
                <div className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-white drop-shadow">
                  Відкрий — це для тебе
                </div>
                <p className="mt-3 text-white/85 leading-relaxed drop-shadow-sm">Ніжно. Романтично. І дуже по-чесному.</p>

                <div className="mt-8 grid place-items-center">
                  <div className="relative w-[320px] sm:w-[380px]">
                    <div className="relative h-[220px] rounded-[26px] border border-white/14 bg-white/12 shadow-2xl overflow-hidden">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,182,213,0.26),transparent_60%)]" />

                      <motion.div
                        className="absolute left-6 right-6 top-5 h-36 rounded-2xl border border-white/12 bg-white/14"
                        initial={false}
                        animate={pressed ? { y: -26, rotate: -1 } : { y: 0, rotate: 0 }}
                        transition={{ duration: 0.52, ease: [0.2, 0.9, 0.2, 1] }}
                      >
                        <div className="p-4">
                          <div className="text-xs text-white/70">Для тебе</div>
                          <div className="mt-2 h-2 w-3/4 rounded-full bg-white/18" />
                          <div className="mt-2 h-2 w-2/3 rounded-full bg-white/18" />
                          <div className="mt-2 h-2 w-1/2 rounded-full bg-white/18" />
                        </div>
                      </motion.div>

                      <div className="absolute bottom-0 left-0 right-0 h-[120px] bg-white/12" />
                      <div className="absolute bottom-0 left-0 h-[120px] w-1/2 bg-white/12 [clip-path:polygon(0_100%,100%_0,100%_100%)]" />
                      <div className="absolute bottom-0 right-0 h-[120px] w-1/2 bg-white/12 [clip-path:polygon(0_0,100%_100%,0_100%)]" />

                      <motion.div
                        className="absolute top-0 left-0 right-0 h-[120px] bg-white/12 [clip-path:polygon(0_0,100%_0,50%_100%)]"
                        style={{ transformOrigin: "top center" }}
                        initial={false}
                        animate={pressed ? { rotateX: 85, opacity: 0.95 } : { rotateX: 0, opacity: 1 }}
                        transition={{ duration: 0.52, ease: [0.2, 0.9, 0.2, 1] }}
                      />

                      <div className="absolute left-1/2 top-[118px] -translate-x-1/2">
                        <motion.button
                          type="button"
                          className="relative grid h-24 w-24 place-items-center rounded-full border border-white/12 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.20),rgba(255,182,213,0.22))] shadow-2xl"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setPressed(true);
                            setTimeout(() => onOpen(), 560);
                          }}
                          aria-label="Відкрити лист"
                        >
                          <motion.div
                            className="grid h-16 w-16 place-items-center rounded-full bg-white/12 border border-white/12"
                            animate={pressed ? { scale: [1, 1.06, 0.92], rotate: [0, -6, 8, 0] } : {}}
                            transition={{ duration: 0.52, ease: "easeInOut" }}
                          >
                            <Heart className="h-9 w-9 text-pink-200" fill="rgba(255,79,163,0.45)" />
                          </motion.div>

                          <motion.div
                            className="pointer-events-none absolute inset-0"
                            initial={false}
                            animate={pressed ? { opacity: 1 } : { opacity: 0 }}
                          >
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                              <Sparkles className="h-6 w-6 text-pink-200/85" />
                            </div>
                          </motion.div>
                        </motion.button>
                      </div>
                    </div>

                    <div className="mt-4 text-center text-sm text-white/80 drop-shadow-sm">Натисни на печатку-серце</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function ValentineCardSite() {
  const [sealed, setSealed] = useState(true);
  const [heartCount, setHeartCount] = useState(64);
  const [kissTick, setKissTick] = useState(0);

  const progress = useScrollProgress(!sealed);

  // Performance: adapt heart count to device + reduced-motion preference.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    const w = window.innerWidth;
    const cores = (navigator as any)?.hardwareConcurrency ?? 6;
    setHeartCount(computeHeartCount({ width: w, cores, reduceMotion: reduce }));
  }, []);

  const [openSecret, setOpenSecret] = useState(false);
  const [spark, setSpark] = useState(false);
  const [photoModal, setPhotoModal] = useState<PhotoCard | null>(null);

  const bgShift = useTransform(useSpring(progress, { stiffness: 60, damping: 20 }), (v) => {
    const a = 332 + v * 4;
    const b = 342 - v * 4;
    return `radial-gradient(circle at 50% 35%, rgba(255,255,255,0.70), rgba(255,255,255,0.00) 58%), linear-gradient(135deg, hsl(${a} 68% 86%), hsl(${b} 62% 82%))`;
  });

  useEffect(() => {
    if (!spark) return;
    const t = setTimeout(() => setSpark(false), 900);
    return () => clearTimeout(t);
  }, [spark]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = SITE_TITLE;
    setFaviconHeart();
  }, []);

  return (
    <div
      className="min-h-screen text-white"
      style={{
        fontFamily:
          '"Inter", "Segoe UI", system-ui, -apple-system, "Roboto", "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif',
      }}
    >
      <motion.div className="fixed inset-0 -z-20" style={{ backgroundImage: bgShift }} />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_55%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.12),transparent_60%)]" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_30%,rgba(0,0,0,0.20),transparent_65%),linear-gradient(to_bottom,rgba(0,0,0,0.18),rgba(0,0,0,0.28))]" />

      <Ribbon progress={progress} />

      <div className="relative">
        <SoftGlow />
        <FloatingHearts count={heartCount} />
        <ScrollHeartRail progress={progress} />

        <AnimatePresence>
          {sealed && (
            <motion.div
              key="intro"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28 }}
            >
              <EnvelopeIntro
                heartCount={heartCount}
                onOpen={() => {
                  setSealed(false);
                  setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <header className="mx-auto max-w-5xl px-6 pt-14 pb-10 relative z-10">
          <Reveal>
            <div className="flex flex-wrap items-center gap-3 rounded-full border border-white/18 bg-white/10 px-4 py-2 backdrop-blur">
              <div className="inline-flex items-center gap-2">
                <Heart className="h-4 w-4 text-white/95" fill="rgba(255,255,255,0.82)" />
                <span className="text-sm text-white/90">Веб-листівка для Вікуші</span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08} className="mt-8">
            <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight drop-shadow">
              Вікуша, <span className="text-white">привіт</span>
              <br />
              <span className="text-white/88">у мене для тебе дещо дуже ніжне</span>
            </h1>
          </Reveal>

          <Reveal delay={0.14} className="mt-5 max-w-2xl">
            <p className="text-base sm:text-lg text-white/88 leading-relaxed drop-shadow-sm">
              Я хотів зробити для тебе щось красиве — таке, щоб ти відкрила і усміхнулась. Ти для мене особлива… і я не
              хочу це приховувати.
            </p>
          </Reveal>

          <Reveal delay={0.2} className="mt-7">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Button
                  className="bg-white/14 hover:bg-white/18 text-white border border-white/18 rounded-full"
                  onClick={() => {
                    setSpark(true);
                    setOpenSecret(true);
                  }}
                >
                  Мій секрет
                </Button>
                <ConfettiSpark active={spark} />
              </div>
              <Button
                variant="secondary"
                className="bg-white/10 hover:bg-white/14 text-white border border-white/16 rounded-full"
                onClick={() => window.scrollTo({ top: window.innerHeight, behavior: "smooth" })}
              >
                Скролити <ArrowDown className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Reveal>
        </header>

        <main className="mx-auto max-w-5xl px-6 pb-24 relative z-10">
          <section className="grid gap-6 md:grid-cols-2">
            <Reveal>
              <Card className="border-white/18 bg-white/10 backdrop-blur-xl shadow-2xl rounded-[30px]">
                <CardContent className="p-7">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-[18px] bg-white/10 border border-white/16">
                      <Heart className="h-5 w-5 text-white/95" fill="rgba(255,255,255,0.70)" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold">Ти вмієш зачаровувати</div>
                      <div className="text-sm text-white/82">не словами — відчуттям</div>
                    </div>
                  </div>
                  <p className="mt-4 text-white/88 leading-relaxed">
                    Мені подобається, як ти з’являєшся — і в голові стає спокійніше. Ніби світ підлаштовується під твою
                    ніжність.
                  </p>
                </CardContent>
              </Card>
            </Reveal>

            <Reveal delay={0.08}>
              <Card className="border-white/18 bg-white/10 backdrop-blur-xl shadow-2xl rounded-[30px]">
                <CardContent className="p-7">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-[18px] bg-white/10 border border-white/16">
                      <Sparkles className="h-5 w-5 text-white/95" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold">Мені з тобою тепліше</div>
                      <div className="text-sm text-white/82">навіть на відстані</div>
                    </div>
                  </div>
                  <p className="mt-4 text-white/88 leading-relaxed">
                    Іноді достатньо твого «привіт» — і день вже інший. Я ціную це більше, ніж можу пояснити.
                  </p>
                </CardContent>
              </Card>
            </Reveal>
          </section>

          <section className="mt-10">
            <Reveal>
              <Card className="border-white/18 bg-white/10 backdrop-blur-xl shadow-2xl rounded-[34px] overflow-hidden">
                <CardContent className="p-7 sm:p-9">
                  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
                    <div>
                      <div className="text-sm text-white/85">Три речі, які мене в тобі підкорили</div>
                      <div className="mt-2 text-2xl sm:text-3xl font-semibold">Ти — особлива, Вікуша</div>
                    </div>
                    <div className="text-sm text-white/82">Прокрути — і вони відкриються</div>
                  </div>

                  <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    {[
                      { t: "Твоя ніжність", d: "Вона не слабкість. Вона сила, яка робить людей добрішими." },
                      { t: "Твій розум", d: "З тобою цікаво. З тобою хочеться говорити і слухати." },
                      { t: "Твоя справжність", d: "Без масок. Без гри. Саме це мене й зачепило." },
                    ].map((x, idx) => (
                      <Reveal key={x.t} delay={0.06 * idx}>
                        <div className="rounded-[26px] border border-white/16 bg-white/08 p-6 relative overflow-hidden">
                          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
                          <div className="relative">
                            <div className="text-lg font-semibold">{x.t}</div>
                            <p className="mt-2 text-white/88 leading-relaxed">{x.d}</p>
                          </div>
                        </div>
                      </Reveal>
                    ))}
                  </div>

                  <Reveal delay={0.22} className="mt-8">
                    <div className="rounded-[26px] border border-white/16 bg-white/08 p-6">
                      <div className="text-sm text-white/85">Маленький натяк</div>
                      <div className="mt-1 text-white/90 leading-relaxed">
                        Я хочу бачити тебе частіше. І робити твої дні трішки кращими — якщо ти дозволиш.
                      </div>
                    </div>
                  </Reveal>
                </CardContent>
              </Card>
            </Reveal>
          </section>

          <section className="mt-10">
            <Reveal>
              <Card className="border-white/18 bg-white/10 backdrop-blur-xl shadow-2xl rounded-[34px]">
                <CardContent className="p-7 sm:p-9">
                  <PhotoEnvelope onOpenImage={(p) => setPhotoModal(p)} />
                </CardContent>
              </Card>
            </Reveal>
          </section>

          <section className="mt-10 grid gap-6 md:grid-cols-3">
            <Reveal>
              <Card className="border-white/18 bg-white/10 backdrop-blur-xl shadow-2xl rounded-[34px] md:col-span-2">
                <CardContent className="p-7 sm:p-9">
                  <div className="text-sm text-white/85">Фінал</div>
                  <div className="mt-2 text-2xl sm:text-3xl font-semibold">Я просто хочу, щоб ти знала</div>
                  <p className="mt-3 text-white/88 leading-relaxed">
                    Вікуша, ти мені дуже подобаєшся. І я хочу бути поруч — так, щоб це було легко, ніжно і по-справжньому.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button
                      className="bg-white/14 hover:bg-white/18 text-white border border-white/18 rounded-full"
                      onClick={() => {
                        setSpark(true);
                        setOpenSecret(true);
                      }}
                    >
                      
                    </Button>
                    <Button
                      variant="secondary"
                      className="bg-white/10 hover:bg-white/14 text-white border border-white/16 rounded-full"
                      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    >
                      На початок
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Reveal>

            <Reveal delay={0.08}>
              <Card className="border-white/18 bg-white/10 backdrop-blur-xl shadow-2xl rounded-[34px]">
                <CardContent className="p-7">
                  <div className="relative">
                    <HeartBurst tick={kissTick} />

                    <div className="text-sm text-white/85">Міні-інтерактив</div>
                    <div className="mt-2 text-lg font-semibold">Пограйся</div>
                    <p className="mt-2 text-white/88 leading-relaxed">
                      Я зробив маленьку «магію». Натисни кнопку нижче — і я відправлю Вікуші сердечка 💗 (прямо тут).
                    </p>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        className="bg-white/14 hover:bg-white/18 text-white border border-white/18 rounded-full"
                        onClick={() => setKissTick((t) => t + 1)}
                      >
                        Надіслати поцілунок 💋
                      </Button>
                      <Button
                        variant="secondary"
                        className="bg-white/10 hover:bg-white/14 text-white border border-white/16 rounded-full"
                        onClick={() => {
                          setSpark(true);
                          setOpenSecret(true);
                        }}
                      >
                        Зізнатися ще раз
                      </Button>
                    </div>

                    <div className="mt-5 rounded-[22px] border border-white/16 bg-white/08 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-white/75">Скрол прогрес</div>
                          <div className="mt-1 text-2xl font-semibold">{Math.round(progress * 100)}%</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-white/75">Сердечок на фоні</div>
                          <div className="mt-1 text-lg font-semibold">{heartCount}</div>
                          <div className="mt-1 text-xs text-white/70">і ще в тебе одне моє сердечко 💗</div>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-white/70">
                        
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          </section>

          <footer className="mt-14 text-center text-sm text-white/82">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-2 backdrop-blur">
              <span>Зроблено з</span>
              <Heart className="h-4 w-4" fill="rgba(255,255,255,0.82)" />
              <span>для Вікуші</span>
            </div>
          </footer>
        </main>
      </div>

      <Modal open={openSecret} onClose={() => setOpenSecret(false)} title="Мій секрет">
        <div className="space-y-4">
          <div>
            <div className="text-white/95 text-lg font-semibold">Вікуша, я закохуюсь у тебе — чесно.</div>
            <div className="mt-2 text-white/88">
              Мені дуже хочеться робити тебе щасливою: берегти, підтримувати, смішити і бути поруч.
            </div>
          </div>
          <div className="rounded-[22px] border border-white/16 bg-white/08 p-4 text-white/88">
            Я завжди буду поруч — у будь-якій ситуації.
          </div>
        </div>
      </Modal>

      <Modal
        open={!!photoModal}
        onClose={() => setPhotoModal(null)}
        title={photoModal?.title || "Фото"}
        rightAction={
          <Button
            variant="secondary"
            className="bg-white/14 hover:bg-white/20 text-white border border-white/18"
            onClick={() => setPhotoModal(null)}
            aria-label="Закрити"
          >
            <X className="h-4 w-4" />
          </Button>
        }
      >
        {photoModal ? (
          <div>
            <div className="rounded-[26px] border border-white/16 bg-white/08 overflow-hidden">
              <div className="h-64 sm:h-72" style={{ backgroundImage: photoModal.bg }}>
                <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_55%)]" />
              </div>
            </div>
            <div className="mt-3 text-white/88">{photoModal.subtitle}</div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
