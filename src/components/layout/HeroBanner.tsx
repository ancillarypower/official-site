import { useRef, useEffect } from "react";
import { useI18n } from "@/context/I18nContext";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: number;
  alpha: number;
}

export function HeroBanner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReduced = matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const particles: Particle[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 1,
        hue: 220 + Math.random() * 60,
        alpha: 0.3 + Math.random() * 0.4,
      });
    }

    function resize() {
      if (!canvas || !ctx) return;
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }

    resize();
    window.addEventListener("resize", resize);

    let animId: number;

    function draw() {
      if (!canvas || !ctx) return;
      const cw = canvas.offsetWidth;
      const ch = canvas.offsetHeight;
      ctx.clearRect(0, 0, cw, ch);

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i]!.x - particles[j]!.x;
          const dy = particles[i]!.y - particles[j]!.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i]!.x, particles[i]!.y);
            ctx.lineTo(particles[j]!.x, particles[j]!.y);
            ctx.strokeStyle = `hsla(240,60%,70%,${(1 - dist / 120) * 0.15})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        if (!prefersReduced) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > cw) p.vx *= -1;
          if (p.y < 0 || p.y > ch) p.vy *= -1;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},70%,75%,${p.alpha})`;
        ctx.fill();
      }

      const time = Date.now() * 0.001;
      const grad = ctx.createLinearGradient(0, ch * 0.6, cw, ch);
      grad.addColorStop(0, `hsla(${220 + Math.sin(time) * 20},70%,50%,.08)`);
      grad.addColorStop(0.5, `hsla(${260 + Math.cos(time * 0.7) * 15},60%,60%,.06)`);
      grad.addColorStop(1, `hsla(${200 + Math.sin(time * 0.5) * 10},70%,50%,.08)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, ch * 0.5, cw, ch * 0.5);

      animId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="relative h-[180px] w-full overflow-hidden bg-[oklch(16%_0.02_260)] md:h-[180px] max-sm:h-[140px]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <h1 className="text-[clamp(1.4rem,3vw,2rem)] font-bold tracking-tight text-[oklch(96%_0.01_250)] drop-shadow-lg">
          {t("banner_title")}
        </h1>
        <p className="mt-1.5 text-sm text-[oklch(78%_0.02_250)] drop-shadow">
          {t("banner_sub")}
        </p>
      </div>
    </div>
  );
}
