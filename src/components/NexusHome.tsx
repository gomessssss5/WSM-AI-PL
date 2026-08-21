import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, 
  ChevronDown, 
  Menu as MenuIcon, 
  X, 
  Sparkles, 
  Quote, 
} from 'lucide-react';

interface NexusHomeProps {
  onEnterAI?: () => void;
}

export default function NexusHome({ onEnterAI }: NexusHomeProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [liveUtcTime, setLiveUtcTime] = useState('UTC - 00:00:00');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorDotRef = useRef<HTMLDivElement | null>(null);
  const cursorOutlineRef = useRef<HTMLDivElement | null>(null);
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Set document title and URL identifier
  useEffect(() => {
    const originalTitle = document.title;
    document.title = "Home // Omnix AI";
    
    // Update query/hash gently without reloading
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('page') !== 'home') {
        url.searchParams.set('page', 'home');
        window.history.replaceState({}, '', url.toString());
      }
    } catch (e) {}

    return () => {
      document.title = originalTitle || "Omnix AI";
    };
  }, []);

  // Live UTC Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeStr = now.toUTCString().split(' ')[4] || now.toISOString().substring(11, 19);
      setLiveUtcTime(`UTC - ${timeStr}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Custom Cursor and Spotlight Effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const posX = e.clientX;
      const posY = e.clientY;

      if (cursorDotRef.current) {
        cursorDotRef.current.style.left = `${posX}px`;
        cursorDotRef.current.style.top = `${posY}px`;
      }

      if (cursorOutlineRef.current) {
        cursorOutlineRef.current.animate({
          left: `${posX}px`,
          top: `${posY}px`
        }, { duration: 400, fill: "forwards" });
      }

      if (spotlightRef.current) {
        spotlightRef.current.style.background = `radial-gradient(600px at ${posX}px ${posY}px, rgba(0, 0, 0, 0.03), transparent 80%)`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Interactive Cursor Hover Scaling
  useEffect(() => {
    const clickables = containerRef.current?.querySelectorAll('a, button, input, .cursor-pointer');
    if (!clickables) return;

    const handleMouseEnter = () => {
      if (cursorOutlineRef.current) {
        cursorOutlineRef.current.style.width = '56px';
        cursorOutlineRef.current.style.height = '56px';
        cursorOutlineRef.current.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
      }
    };

    const handleMouseLeave = () => {
      if (cursorOutlineRef.current) {
        cursorOutlineRef.current.style.width = '36px';
        cursorOutlineRef.current.style.height = '36px';
        cursorOutlineRef.current.style.backgroundColor = 'transparent';
      }
    };

    clickables.forEach(elem => {
      elem.addEventListener('mouseenter', handleMouseEnter);
      elem.addEventListener('mouseleave', handleMouseLeave);
    });

    return () => {
      clickables.forEach(elem => {
        elem.removeEventListener('mouseenter', handleMouseEnter);
        elem.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, []);

  // Scroll Reveal Animations & Number Counter Animation
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100', 'translate-y-0');
          entry.target.classList.remove('opacity-0', 'translate-y-8');

          // Check for count-up elements
          if (entry.target.classList.contains('count-up') && !entry.target.classList.contains('counted')) {
            entry.target.classList.add('counted');
            const target = parseInt(entry.target.getAttribute('data-target') || '0', 10);
            let current = 0;
            const increment = Math.max(1, target / 40);
            const timer = setInterval(() => {
              current += increment;
              if (current >= target) {
                entry.target.textContent = String(target);
                clearInterval(timer);
              } else {
                entry.target.textContent = String(Math.ceil(current));
              }
            }, 30);
          }
        }
      });
    }, { threshold: 0.15 });

    const reveals = containerRef.current?.querySelectorAll('.reveal, .count-up');
    reveals?.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // Particle Canvas Background (Light Theme optimized)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const resizeCanvas = () => {
      if (!canvas) return;
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;

      constructor(w: number, h: number) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.vx = (Math.random() - 0.5) * 0.35;
        this.vy = (Math.random() - 0.5) * 0.35;
        this.radius = Math.random() * 1.5 + 0.6;
        this.alpha = Math.random() * 0.3 + 0.1;
      }

      update(w: number, h: number) {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > w) this.vx *= -1;
        if (this.y < 0 || this.y > h) this.vy *= -1;
      }

      draw(c: CanvasRenderingContext2D) {
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        c.fillStyle = `rgba(0, 0, 0, ${this.alpha})`;
        c.fill();
      }
    }

    const particles: Particle[] = [];
    const particleCount = 50;
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle(canvas.width, canvas.height));
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Connect nearby particles with subtle lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0, 0, 0, ${0.05 * (1 - dist / 120)})`;
            ctx.stroke();
          }
        }
      }

      particles.forEach(p => {
        p.update(canvas.width, canvas.height);
        p.draw(ctx);
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full min-h-screen overflow-y-auto bg-[#faf8f5] text-neutral-900 font-sans selection:bg-black selection:text-white overflow-x-hidden antialiased"
      style={{
        fontFamily: "'Syne', 'Inter', sans-serif"
      }}
    >
      {/* Custom Cursor Target Elements (Desktop Only) */}
      <div 
        ref={cursorDotRef}
        className="pointer-events-none fixed top-0 left-0 -translate-x-1/2 -translate-y-1/2 rounded-full z-9999 transition-opacity duration-300 w-2 h-2 bg-neutral-900 hidden md:block" 
      />
      <div 
        ref={cursorOutlineRef}
        className="pointer-events-none fixed top-0 left-0 -translate-x-1/2 -translate-y-1/2 rounded-full z-9999 w-9 h-9 border border-neutral-900/30 transition-all duration-150 ease-out hidden md:block" 
      />

      {/* Radial Glow Background */}
      <div 
        ref={spotlightRef}
        className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300 opacity-0 md:opacity-100" 
        style={{ background: 'radial-gradient(600px at 0px 0px, rgba(0, 0, 0, 0.03), transparent 80%)' }}
      />

      {/* Compact & Adjusted Fixed Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 md:px-8 py-3 md:py-4 transition-all duration-300">
        <nav className="max-w-6xl mx-auto backdrop-blur-xl bg-white/85 border border-neutral-200/90 rounded-full px-4 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between shadow-lg shadow-neutral-900/5">
          {/* Brand Logo with Omnix AI */}
          <a href="#hero" className="flex items-center gap-2.5 group cursor-pointer">
            <img 
              src="https://i.ibb.co/jvfRYXDR/cone-Circular-Abstrato-em-Espiral-removebg-preview.png" 
              alt="Omnix AI Logo" 
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain transition-transform duration-500 group-hover:rotate-12 group-hover:scale-105"
            />
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-neutral-900 font-syne flex items-center gap-1.5">
              Omnix <span className="text-neutral-500 font-light text-sm sm:text-base">AI</span>
            </span>
          </a>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-xs sm:text-sm font-medium text-neutral-600">
            <a href="#about" className="hover:text-neutral-950 transition-colors duration-200">Sobre</a>
            <a href="#philosophy" className="hover:text-neutral-950 transition-colors duration-200">Filosofia</a>
            <a href="#contact" className="hover:text-neutral-950 transition-colors duration-200">Contato</a>
          </div>

          {/* CTA & Mobile Toggle */}
          <div className="flex items-center gap-2.5">
            {onEnterAI && (
              <button
                onClick={onEnterAI}
                className="inline-flex items-center gap-2 bg-neutral-950 text-white font-semibold text-xs uppercase tracking-wider px-4 sm:px-5 py-2 sm:py-2.5 rounded-full hover:bg-neutral-800 transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer shadow-md shadow-neutral-950/10"
              >
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span>Entrar na IA</span>
                <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
              </button>
            )}

            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-neutral-800 p-1.5 focus:outline-none cursor-pointer hover:bg-neutral-100 rounded-full transition-colors" 
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 bg-white/98 backdrop-blur-2xl z-40 flex flex-col justify-center items-center gap-8 text-2xl font-bold p-6">
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-6 right-6 text-neutral-500 hover:text-neutral-900 p-2"
            >
              <X className="w-7 h-7" />
            </button>

            <a 
              href="#about" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-neutral-700 hover:text-neutral-950 transition-colors text-xl font-syne"
            >
              Sobre
            </a>
            <a 
              href="#philosophy" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-neutral-700 hover:text-neutral-950 transition-colors text-xl font-syne"
            >
              Filosofia
            </a>
            <a 
              href="#contact" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-neutral-700 hover:text-neutral-950 transition-colors text-xl font-syne"
            >
              Contato
            </a>

            {onEnterAI && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onEnterAI();
                }}
                className="inline-flex items-center gap-2 bg-neutral-950 text-white px-7 py-3 rounded-full text-sm font-semibold hover:bg-neutral-800 transition-all shadow-xl mt-4"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span>Entrar na Omnix AI</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section 
        id="hero"
        className="relative min-h-[92vh] flex items-center justify-center pt-20 sm:pt-24 pb-14 px-4 md:px-8 overflow-hidden"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      >
        {/* Interactive Particle Canvas */}
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full opacity-60 pointer-events-none" 
        />

        <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center">
          
          {/* Hero Main Headline */}
          <h1 className="reveal opacity-0 translate-y-8 transition-all duration-700 delay-100 font-extrabold text-3xl sm:text-5xl lg:text-7xl tracking-tight leading-[1.08] text-neutral-950 mb-6 max-w-4xl font-syne">
            OMNIX 1.6: <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-500">
              MAIS QUE UMA IA
            </span>
          </h1>

          {/* Subtitle */}
          <p className="reveal opacity-0 translate-y-8 transition-all duration-700 delay-200 max-w-xl text-neutral-600 text-sm sm:text-base font-light leading-relaxed mb-8 font-sans">
            Uma nova geração de inteligência artificial, criada para entender, raciocinar e transformar ideias em possibilidades.
          </p>

          {/* Single CTA to Enter AI */}
          <div className="reveal opacity-0 translate-y-8 transition-all duration-700 delay-300 flex items-center justify-center w-full">
            {onEnterAI && (
              <button 
                onClick={onEnterAI}
                className="w-full sm:w-auto bg-neutral-950 text-white font-semibold text-sm sm:text-base px-8 sm:px-10 py-3.5 sm:py-4 rounded-full hover:bg-neutral-800 transition-all duration-300 flex items-center justify-center gap-3 group shadow-xl shadow-neutral-950/10 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4.5 h-4.5 text-white transition-transform group-hover:rotate-12" />
                <span>Entrar na Omnix AI</span>
                <ArrowRight className="w-4.5 h-4.5 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            )}
          </div>

          {/* Down Arrow Animation */}
          <a 
            href="#marquee" 
            className="reveal opacity-0 translate-y-8 transition-all duration-700 delay-400 mt-14 text-neutral-400 hover:text-neutral-900 transition-colors duration-300 animate-bounce"
          >
            <ChevronDown className="w-5 h-5" />
          </a>
        </div>
      </section>

      {/* Infinite Text Marquee */}
      <section 
        id="marquee" 
        className="py-5 bg-neutral-950 text-white font-extrabold uppercase overflow-hidden whitespace-nowrap select-none border-y border-neutral-900 relative z-20 font-syne"
      >
        <div 
          className="flex items-center gap-12 text-xl md:text-3xl tracking-tighter"
          style={{
            animation: 'nexusMarquee 28s linear infinite',
            width: 'max-content'
          }}
        >
          <span>• INTELIGÊNCIA ARTIFICIAL AVANÇADA</span>
          <span>• UI/UX ULTRA MODERNO</span>
          <span>• ESTRATÉGIA DE MARCA</span>
          <span>• AGENTES AUTÔNOMOS</span>
          <span>• ENGENHARIA DE PONTA</span>
          <span>• MINIMALISMO RADICAL</span>
          {/* Duplicated for seamless loop */}
          <span>• INTELIGÊNCIA ARTIFICIAL AVANÇADA</span>
          <span>• UI/UX ULTRA MODERNO</span>
          <span>• ESTRATÉGIA DE MARCA</span>
          <span>• AGENTES AUTÔNOMOS</span>
          <span>• ENGENHARIA DE PONTA</span>
          <span>• MINIMALISMO RADICAL</span>
        </div>
      </section>

      {/* About Section with Counter Stats */}
      <section id="about" className="py-24 px-4 md:px-12 max-w-7xl mx-auto border-b border-neutral-200 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 reveal opacity-0 translate-y-8 transition-all duration-700">
            <h2 className="font-bold text-3xl sm:text-5xl text-neutral-950 leading-tight mb-6 font-syne">
              Mais que uma IA. Uma inteligência que explora, entende e executa.
            </h2>
            <p className="text-neutral-600 text-sm md:text-base leading-relaxed mb-6 font-sans">
              O OMNIX 1.6 foi desenvolvido para ir além de simplesmente responder perguntas. Ele pode navegar pela web como um usuário, explorar sites, encontrar informações e compreender o contexto necessário para realizar tarefas.
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-2 gap-4 md:gap-6">
            {/* Stat Card 1 */}
            <div className="reveal opacity-0 translate-y-8 transition-all duration-700 bg-white p-6 md:p-8 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all duration-300">
              <h3 className="text-4xl md:text-6xl font-extrabold text-neutral-950 mb-2 font-syne flex items-baseline">
                <span className="count-up" data-target="90">0</span>%
              </h3>
              <p className="text-xs md:text-sm text-neutral-500 uppercase tracking-wider font-mono">PRECISÃO &amp; SATISFAÇÃO</p>
            </div>
            {/* Stat Card 2 */}
            <div className="reveal opacity-0 translate-y-8 transition-all duration-700 delay-100 bg-white p-6 md:p-8 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all duration-300">
              <h3 className="text-4xl md:text-6xl font-extrabold text-neutral-950 mb-2 font-syne">WEB</h3>
              <p className="text-xs md:text-sm text-neutral-500 uppercase tracking-wider font-mono">NAVEGAÇÃO COMO UM USUÁRIO</p>
            </div>
            {/* Stat Card 3 */}
            <div className="reveal opacity-0 translate-y-8 transition-all duration-700 delay-200 bg-white p-6 md:p-8 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all duration-300">
              <h3 className="text-4xl md:text-6xl font-extrabold text-neutral-950 mb-2 font-syne">1.6</h3>
              <p className="text-xs md:text-sm text-neutral-500 uppercase tracking-wider font-mono">NOVA GERAÇÃO OMNIX</p>
            </div>
            {/* Stat Card 4 */}
            <div className="reveal opacity-0 translate-y-8 transition-all duration-700 delay-300 bg-white p-6 md:p-8 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all duration-300">
              <h3 className="text-4xl md:text-6xl font-extrabold text-neutral-950 mb-2 font-syne">∞</h3>
              <p className="text-xs md:text-sm text-neutral-500 uppercase tracking-wider font-mono">POSSIBILIDADES</p>
            </div>
          </div>

        </div>
      </section>

      {/* 100% Free Section */}
      <section id="free" className="py-36 px-4 border-y border-neutral-200 bg-neutral-100/60 relative z-20 flex flex-col items-center justify-center">
        <div className="reveal opacity-0 translate-y-8 transition-all duration-700 flex flex-col items-center text-center max-w-4xl w-full">
          
          <div className="flex items-center justify-center overflow-visible py-20 md:py-32 mb-16 md:mb-24">
            <h2 
              className="text-neutral-950 leading-none tracking-tighter select-none"
              style={{ 
                fontSize: 'clamp(6rem, 18vw, 14rem)',
                transform: 'scaleY(2.3)',
                transformOrigin: 'center',
                fontFamily: '"Antonio", "Bebas Neue", sans-serif',
                fontWeight: 700,
                letterSpacing: '-0.05em'
              }}
            >
              100%
            </h2>
          </div>
          
          <p className="text-neutral-600 font-sans tracking-[0.35em] uppercase text-xs sm:text-sm md:text-base font-semibold">
            Grátis e ilimitado
          </p>
        </div>
      </section>

      {/* Philosophy Quote Section */}
      <section id="philosophy" className="py-32 px-4 md:px-12 text-center max-w-5xl mx-auto relative z-20">
        <div className="reveal opacity-0 translate-y-8 transition-all duration-700 flex flex-col items-center">
          <Quote className="w-12 h-12 text-neutral-300 mx-auto mb-8" />
          <blockquote className="font-bold text-2xl md:text-4xl lg:text-5xl text-neutral-950 leading-tight mb-8 font-syne">
            "A perfeição não é alcançada quando não há mais nada a adicionar, mas sim quando não há mais nada a retirar."
          </blockquote>
          <p className="font-mono text-xs text-neutral-500 tracking-widest uppercase">— Antoine de Saint-Exupéry</p>
        </div>
      </section>

      {/* CTA Contact Section */}
      <section id="contact" className="py-28 px-4 md:px-12 bg-neutral-100/80 border-t border-neutral-200 relative overflow-hidden z-20">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h2 className="reveal opacity-0 translate-y-8 transition-all duration-700 font-extrabold text-4xl sm:text-6xl md:text-7xl text-neutral-950 mb-8 tracking-tight font-syne">
            VAMOS CRIAR ALGO <br/>
            <span className="underline decoration-2 underline-offset-8 decoration-neutral-400">
              INCRÍVEL JUNTOS?
            </span>
          </h2>
          
          {onEnterAI && (
            <div className="reveal opacity-0 translate-y-8 transition-all duration-700 delay-200 mt-12">
              <button 
                onClick={onEnterAI}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-neutral-950 text-white font-semibold text-sm sm:text-base px-8 sm:px-10 py-3.5 sm:py-4 rounded-full hover:bg-neutral-800 transition-all duration-300 group shadow-xl shadow-neutral-950/10 hover:scale-105 active:scale-95 cursor-pointer mx-auto"
              >
                <Sparkles className="w-4.5 h-4.5 text-white transition-transform group-hover:rotate-12" />
                <span>Entrar na Omnix AI</span>
                <ArrowRight className="w-4.5 h-4.5 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Footer Section */}
      <footer className="py-12 px-4 md:px-12 border-t border-neutral-200 bg-white text-xs text-neutral-500 relative z-20 font-sans">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <img 
              src="https://i.ibb.co/jvfRYXDR/cone-Circular-Abstrato-em-Espiral-removebg-preview.png" 
              alt="Omnix AI Logo" 
              className="w-5 h-5 object-contain"
            />
            <span className="font-bold text-neutral-900 tracking-wider font-syne">Omnix AI</span>
            <span className="text-neutral-300">|</span>
            <span>© 2026 Todos os direitos reservados.</span>
          </div>

          {/* Local Time Indicator */}
          <div className="flex items-center gap-2 font-mono text-neutral-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{liveUtcTime}</span>
          </div>
        </div>
      </footer>

      {/* CSS Injected Keyframes */}
      <style>{`
        @keyframes nexusMarquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
