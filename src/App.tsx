import { useState, useEffect, useRef, useCallback } from 'react'
import { navigate } from './router'

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useScrollY() {
  const [scrollY, setScrollY] = useState(0)
  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => { setScrollY(window.scrollY); ticking = false })
        ticking = true
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return scrollY
}

function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const LOOKS = [
  {
    id: '01',
    title: 'The Overcoat',
    subtitle: 'Obsidian',
    price: '$1,240',
    tag: 'OUTERWEAR',
    img: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&h=1100&fit=crop&auto=format&q=90',
    alt: 'Model in long obsidian overcoat, architectural silhouette',
  },
  {
    id: '02',
    title: 'The Column Dress',
    subtitle: 'Ivory',
    price: '$680',
    tag: 'EVENINGWEAR',
    img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&h=1100&fit=crop&auto=format&q=90',
    alt: 'Model in minimal ivory column dress',
  },
  {
    id: '03',
    title: 'The Tailored Blazer',
    subtitle: 'Charcoal',
    price: '$890',
    tag: 'TAILORING',
    img: 'https://images.unsplash.com/photo-1550614000-4895a10e1bfd?w=800&h=1100&fit=crop&auto=format&q=90',
    alt: 'Sharply tailored charcoal blazer editorial',
  },
]

const MARQUEE = Array(6).fill(null).flatMap(() => [
  'NEW COLLECTION', '/', 'SS 2026', '/', 'CONSIDERED DESIGN', '/', 'MADE IN ITALY', '/',
])

// ─── Custom Cursor ─────────────────────────────────────────────────────────────

function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const pos = useRef({ x: -100, y: -100 })
  const ring = useRef({ x: -100, y: -100 })
  const [text, setText] = useState('')

  useEffect(() => {
    const move = (e: MouseEvent) => { pos.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', move)
    let raf: number
    const animate = () => {
      ring.current.x += (pos.current.x - ring.current.x) * 0.12
      ring.current.y += (pos.current.y - ring.current.y) * 0.12
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${pos.current.x - 4}px, ${pos.current.y - 4}px)`
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ring.current.x - 20}px, ${ring.current.y - 20}px)`
      }
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)

    // Hover detection
    const addHover = (e: Event) => {
      const t = e.currentTarget as HTMLElement
      setText(t.dataset.cursor || '')
      if (ringRef.current) {
        ringRef.current.style.width = t.dataset.cursor ? '80px' : '40px'
        ringRef.current.style.height = t.dataset.cursor ? '80px' : '40px'
        ringRef.current.style.marginTop = t.dataset.cursor ? '-40px' : '-20px'
        ringRef.current.style.marginLeft = t.dataset.cursor ? '-40px' : '-20px'
        ringRef.current.style.background = t.dataset.cursor ? 'rgba(212,175,122,0.15)' : 'transparent'
        ringRef.current.style.borderColor = 'rgba(212,175,122,0.8)'
      }
    }
    const removeHover = () => {
      setText('')
      if (ringRef.current) {
        ringRef.current.style.width = '40px'
        ringRef.current.style.height = '40px'
        ringRef.current.style.marginTop = '-20px'
        ringRef.current.style.marginLeft = '-20px'
        ringRef.current.style.background = 'transparent'
        ringRef.current.style.borderColor = 'rgba(240,236,228,0.35)'
      }
    }
    const els = document.querySelectorAll('[data-cursor]')
    els.forEach(el => {
      el.addEventListener('mouseenter', addHover)
      el.addEventListener('mouseleave', removeHover)
    })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', move)
    }
  }, [])

  return (
    <>
      <div ref={dotRef} style={{ position: 'fixed', top: 0, left: 0, width: 8, height: 8, borderRadius: '50%', background: '#d4af7a', pointerEvents: 'none', zIndex: 9999, mixBlendMode: 'normal' }} />
      <div ref={ringRef} style={{ position: 'fixed', top: 0, left: 0, width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(240,236,228,0.35)', pointerEvents: 'none', zIndex: 9998, transition: 'width 0.3s, height 0.3s, background 0.3s, border-color 0.3s', marginTop: -20, marginLeft: -20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {text && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: '0.1em', color: '#d4af7a', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{text}</span>}
      </div>
    </>
  )
}

// ─── Intro Loader ─────────────────────────────────────────────────────────────

function Intro({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState(0) // 0=loading, 1=fadeout

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1600)
    const t2 = setTimeout(() => onDone(), 2200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: '#060606',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 24,
        opacity: phase === 1 ? 0 : 1,
        transition: 'opacity 0.6s cubic-bezier(0.4,0,0.2,1)',
        pointerEvents: phase === 1 ? 'none' : 'auto',
      }}
    >
      <h1 className="font-display" style={{ fontSize: 48, fontWeight: 900, letterSpacing: '0.22em', color: '#f0ece4', opacity: phase === 0 ? 1 : 0, transition: 'opacity 0.4s', textTransform: 'uppercase' }}>
        VÊTU
      </h1>
      <div style={{ width: 120, height: 1, background: 'rgba(240,236,228,0.12)', position: 'relative', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute', top: 0, left: 0, height: '100%',
            background: '#c9b99a',
            animation: 'load-bar 1.4s cubic-bezier(0.4,0,0.2,1) forwards',
          }}
        />
      </div>
    </div>
  )
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav({ scrollY }: { scrollY: number }) {
  const past = scrollY > 80
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 500,
      padding: '0 56px', height: 72,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: past ? 'rgba(6,6,6,0.92)' : 'transparent',
      backdropFilter: past ? 'blur(20px)' : 'none',
      borderBottom: past ? '1px solid rgba(240,236,228,0.05)' : 'none',
      transition: 'background 0.5s, backdrop-filter 0.5s, border-color 0.5s',
    }}>
      <span className="font-display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.25em', color: '#f0ece4', cursor: 'default', userSelect: 'none' }}>
        VÊTU
      </span>
      <div style={{ display: 'flex', gap: 40 }}>
        {['Collections', 'Lookbook', 'Stores', 'About'].map(l => (
          <button key={l} className="font-mono-dm" data-cursor="View" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.5)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.3s', padding: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f0ece4')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,236,228,0.5)')}
          >{l}</button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        <button
          data-cursor="Enter"
          onClick={() => navigate('/login')}
          className="font-mono-dm"
          style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.5)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.3s', padding: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = '#f0ece4')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,236,228,0.5)')}
        >
          Sign In
        </button>
        <button
          data-cursor="Shop"
          onClick={() => navigate('/shop')}
          style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#060606', background: '#f0ece4', border: 'none', padding: '11px 28px', cursor: 'pointer', transition: 'background 0.25s, color 0.25s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#c9b99a'; e.currentTarget.style.color = '#060606' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f0ece4'; e.currentTarget.style.color = '#060606' }}
        >
          Shop Now
        </button>
      </div>
    </nav>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero({ scrollY }: { scrollY: number }) {
  const imgParallax = scrollY * 0.28
  const textParallax = scrollY * 0.12
  const opacity = Math.max(0, 1 - scrollY / 650)

  return (
    <section style={{ position: 'relative', height: '100vh', overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
      {/* Parallax image */}
      <div style={{ position: 'absolute', inset: '-15% 0', zIndex: 0 }}>
        <img
          src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1800&h=1200&fit=crop&auto=format&q=90"
          alt="High-fashion editorial hero — model in structured silhouette"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 20%', filter: 'brightness(0.32)', transform: `translateY(${imgParallax}px)`, willChange: 'transform' }}
        />
      </div>
      {/* Gradient */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #060606 0%, rgba(6,6,6,0.2) 55%, transparent 100%)', zIndex: 1 }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', padding: '0 56px 72px', opacity, transform: `translateY(${-textParallax}px)`, willChange: 'transform, opacity' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p className="font-mono-dm" style={{ fontSize: 10, letterSpacing: '0.24em', color: '#c9b99a', textTransform: 'uppercase', marginBottom: 24 }}>
              Edition 06 &nbsp;/&nbsp; Spring · Summer 2026
            </p>
            <h1 className="font-display" style={{ fontSize: 'clamp(64px, 10vw, 148px)', fontWeight: 900, lineHeight: 0.88, letterSpacing: '-0.03em', color: '#f0ece4', marginBottom: 40 }}>
              <span style={{ display: 'block' }}>Form</span>
              <span style={{ display: 'block', fontStyle: 'italic', color: '#c9b99a', paddingLeft: '0.15em' }}>follows</span>
              <span style={{ display: 'block' }}>feeling.</span>
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
              <button
                data-cursor="Explore"
                onClick={() => navigate('/shop')}
                style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#060606', background: '#f0ece4', border: 'none', padding: '16px 40px', cursor: 'pointer', transition: 'background 0.25s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#c9b99a')}
                onMouseLeave={e => (e.currentTarget.style.background = '#f0ece4')}
              >
                Explore Collection
              </button>
              <span className="font-mono-dm" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(240,236,228,0.35)', textTransform: 'uppercase' }}>
                Scroll ↓
              </span>
            </div>
          </div>
          {/* Side stat */}
          <div style={{ textAlign: 'right', paddingBottom: 8 }}>
            <p className="font-display" style={{ fontSize: 80, fontWeight: 900, color: 'rgba(240,236,228,0.06)', lineHeight: 1, letterSpacing: '-0.04em' }}>SS26</p>
            <p className="font-mono-dm" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(240,236,228,0.3)', textTransform: 'uppercase' }}>48 new pieces</p>
          </div>
        </div>
      </div>

      {/* Index dots */}
      <div style={{ position: 'absolute', right: 56, top: '50%', transform: 'translateY(-50%)', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 10, opacity }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: i === 0 ? 20 : 6, height: 1, background: i === 0 ? '#c9b99a' : 'rgba(240,236,228,0.2)', transition: 'width 0.3s' }} />
        ))}
      </div>
    </section>
  )
}

// ─── Marquee ──────────────────────────────────────────────────────────────────

function Marquee() {
  return (
    <div style={{ borderTop: '1px solid rgba(240,236,228,0.06)', borderBottom: '1px solid rgba(240,236,228,0.06)', padding: '13px 0', overflow: 'hidden', background: 'transparent' }}>
      <div style={{ display: 'flex', width: 'max-content', animation: 'marquee 30s linear infinite' }}>
        {MARQUEE.concat(MARQUEE).map((item, i) => (
          <span key={i} className="font-mono-dm" style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: item === '/' ? '#c9b99a' : 'rgba(240,236,228,0.28)', marginRight: 28, whiteSpace: 'nowrap' }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Looks Grid ───────────────────────────────────────────────────────────────

function LooksGrid() {
  const { ref, visible } = useReveal(0.08)

  return (
    <section ref={ref} style={{ padding: '140px 56px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 72 }}>
        <div>
          <p className="font-mono-dm" style={{ fontSize: 10, letterSpacing: '0.24em', color: '#c9b99a', textTransform: 'uppercase', marginBottom: 16, opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(16px)', transition: 'all 0.7s 0.1s' }}>
            — The Collection
          </p>
          <h2 className="font-display" style={{ fontSize: 'clamp(40px, 5vw, 72px)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.025em', color: '#f0ece4', opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(24px)', transition: 'all 0.8s 0.2s' }}>
            Worn with<br /><em>intention.</em>
          </h2>
        </div>
        <button className="font-mono-dm" data-cursor="View all" onClick={() => navigate('/shop')} style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.4)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.3s', opacity: visible ? 1 : 0, transition2: 'all 0.7s 0.35s' } as React.CSSProperties}
          onMouseEnter={e => (e.currentTarget.style.color = '#f0ece4')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,236,228,0.4)')}
        >
          View all pieces →
        </button>
      </div>

      {/* 3-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {LOOKS.map((look, i) => (
          <LookCard key={look.id} look={look} delay={i * 0.12} visible={visible} />
        ))}
      </div>
    </section>
  )
}

function LookCard({ look, delay, visible }: { look: typeof LOOKS[0]; delay: number; visible: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState(false)

  const onMove = useCallback((e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect()
    setTilt({ x: ((e.clientX - r.left) / r.width - 0.5) * 14, y: ((e.clientY - r.top) / r.height - 0.5) * -14 })
  }, [])

  return (
    <div
      ref={ref}
      data-cursor="View"
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTilt({ x: 0, y: 0 }) }}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible
          ? `perspective(900px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)${hovered ? ' scale(1.018)' : ''}`
          : 'translateY(40px)',
        transition: hovered
          ? `opacity 0.7s ${delay}s, transform 0.08s ease-out`
          : `opacity 0.7s ${delay}s, transform 0.7s ${hovered ? '0s' : `${delay}s`} cubic-bezier(0.16,1,0.3,1)`,
        transformStyle: 'preserve-3d',
        cursor: 'pointer',
      }}
    >
      {/* Image */}
      <div style={{ position: 'relative', height: 560, background: '#0e0e0e', overflow: 'hidden', marginBottom: 20 }}>
        <img
          src={look.img}
          alt={look.alt}
          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.88) saturate(0.85)', transform: hovered ? 'scale(1.04)' : 'scale(1)', transition: 'transform 0.9s cubic-bezier(0.16,1,0.3,1)' }}
        />
        {/* Tag */}
        <div style={{ position: 'absolute', top: 20, left: 20 }}>
          <span className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.5)', background: 'rgba(6,6,6,0.6)', padding: '5px 10px', backdropFilter: 'blur(8px)' }}>
            {look.tag}
          </span>
        </div>
        {/* Index */}
        <div style={{ position: 'absolute', top: 20, right: 20 }}>
          <span className="font-mono-dm" style={{ fontSize: 10, color: 'rgba(240,236,228,0.3)', letterSpacing: '0.1em' }}>{look.id}</span>
        </div>
        {/* CTA on hover */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, background: 'linear-gradient(to top, rgba(6,6,6,0.9) 0%, transparent 100%)', transform: hovered ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
          <button onClick={() => navigate('/shop')} className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#060606', background: '#f0ece4', border: 'none', padding: '10px 24px', cursor: 'pointer', width: '100%' }}>
            Quick Add — {look.price}
          </button>
        </div>
      </div>

      {/* Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.16em', color: '#c9b99a', textTransform: 'uppercase', marginBottom: 5 }}>{look.subtitle}</p>
          <h3 className="font-display" style={{ fontSize: 20, fontWeight: 600, color: '#f0ece4', letterSpacing: '-0.01em' }}>{look.title}</h3>
        </div>
        <span className="font-mono-dm" style={{ fontSize: 12, color: 'rgba(240,236,228,0.45)', paddingTop: 2 }}>{look.price}</span>
      </div>
    </div>
  )
}

// ─── Full-Width Editorial ─────────────────────────────────────────────────────

function Editorial({ scrollY }: { scrollY: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [top, setTop] = useState(0)
  const { ref: visRef, visible } = useReveal(0.05)

  useEffect(() => {
    if (ref.current) setTop(ref.current.offsetTop)
  }, [])

  const parallax = Math.max(0, scrollY - top) * 0.22

  return (
    <div ref={ref}>
      <section ref={visRef} style={{ position: 'relative', height: '88vh', overflow: 'hidden' }}>
        <img
          src="https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1800&h=1100&fit=crop&auto=format&q=90"
          alt="Campaign image — model in cashmere coat on deserted road"
          style={{ width: '100%', height: '130%', objectFit: 'cover', objectPosition: '50% 30%', filter: 'brightness(0.28) saturate(0.6)', position: 'absolute', top: 0, transform: `translateY(${-parallax}px)`, willChange: 'transform' }}
        />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 0 }}>
          <h2 className="font-display" style={{ fontSize: 'clamp(48px, 9vw, 130px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 0.9, color: '#f0ece4', textAlign: 'center', opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(32px)', transition: 'all 1s 0.1s cubic-bezier(0.16,1,0.3,1)' }}>
            Wear nothing<br /><em style={{ color: '#c9b99a' }}>ordinary.</em>
          </h2>
          <div style={{ marginTop: 52, opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(16px)', transition: 'all 0.8s 0.4s' }}>
            <button
              data-cursor="Shop"
              onClick={() => navigate('/shop')}
              style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#060606', background: '#f0ece4', border: 'none', padding: '16px 48px', cursor: 'pointer', transition: 'background 0.25s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#c9b99a')}
              onMouseLeave={e => (e.currentTarget.style.background = '#f0ece4')}
            >
              Shop the Collection
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── Featured Product ─────────────────────────────────────────────────────────

function FeaturedProduct({ scrollY }: { scrollY: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [top, setTop] = useState(0)
  const { ref: visRef, visible } = useReveal(0.08)

  useEffect(() => { if (ref.current) setTop(ref.current.offsetTop) }, [])
  const parallax = Math.max(0, scrollY - top) * 0.16

  return (
    <div ref={ref}>
      <section ref={visRef} style={{ display: 'grid', gridTemplateColumns: '55% 45%', minHeight: '92vh' }}>
        {/* Image */}
        <div style={{ position: 'relative', overflow: 'hidden', background: '#0a0a0a' }}>
          <img
            src="https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=1000&h=1200&fit=crop&auto=format&q=90"
            alt="Model in the Archive Coat — asymmetric lapel, raw hem"
            style={{ width: '100%', height: '110%', objectFit: 'cover', objectPosition: '50% 15%', filter: 'brightness(0.78) saturate(0.7)', transform: `translateY(${-parallax}px)`, willChange: 'transform', position: 'absolute', top: 0 }}
          />
          <div style={{ position: 'absolute', bottom: 40, left: 40, right: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <span className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.16em', color: 'rgba(240,236,228,0.35)', textTransform: 'uppercase' }}>Look 07 / 12</span>
            <span className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.16em', color: 'rgba(240,236,228,0.35)', textTransform: 'uppercase' }}>Photography: Clara Voss</span>
          </div>
        </div>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 64px', background: '#090909' }}>
          <p className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.24em', color: '#c9b99a', textTransform: 'uppercase', marginBottom: 20, opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(12px)', transition: 'all 0.7s 0.1s' }}>
            — Featured Piece
          </p>
          <h2 className="font-display" style={{ fontSize: 'clamp(36px, 3.5vw, 58px)', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.02em', color: '#f0ece4', marginBottom: 10, opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(20px)', transition: 'all 0.8s 0.2s' }}>
            The Archive<br /><em>Coat</em>
          </h2>
          <p className="font-mono-dm" style={{ fontSize: 11, letterSpacing: '0.1em', color: '#c9b99a', marginBottom: 36, opacity: visible ? 1 : 0, transition: 'all 0.7s 0.3s' }}>
            $880
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.9, color: 'rgba(240,236,228,0.46)', marginBottom: 52, maxWidth: 380, opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(12px)', transition: 'all 0.7s 0.35s' }}>
            The Archive Coat begins where most garments end — in the question of what a coat could be if it carried nothing unnecessary. Asymmetric lapel. Unlined. Raw hem. Double-faced wool, 640gsm.
          </p>

          {/* Specs */}
          <div style={{ borderTop: '1px solid rgba(240,236,228,0.07)', paddingTop: 36, marginBottom: 44, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 40px', opacity: visible ? 1 : 0, transition: 'all 0.7s 0.42s' }}>
            {[['Material', 'Double-faced Wool'], ['Origin', 'Made in Italy'], ['Cut', 'Asymmetric, unlined'], ['Sizes', 'XS — XL']].map(([k, v]) => (
              <div key={k}>
                <p className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.16em', color: '#c9b99a', textTransform: 'uppercase', marginBottom: 5 }}>{k}</p>
                <p style={{ fontSize: 13, color: 'rgba(240,236,228,0.6)' }}>{v}</p>
              </div>
            ))}
          </div>

          {/* Size selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, opacity: visible ? 1 : 0, transition: 'all 0.7s 0.48s' }}>
            {['XS', 'S', 'M', 'L', 'XL'].map((s, i) => (
              <SizeBtn key={s} size={s} selected={i === 2} />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, opacity: visible ? 1 : 0, transition: 'all 0.7s 0.54s' }}>
            <button
              data-cursor="Add"
              onClick={() => navigate('/shop')}
              style={{ flex: 1, fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#060606', background: '#f0ece4', border: 'none', padding: '16px', cursor: 'pointer', transition: 'background 0.25s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#c9b99a')}
              onMouseLeave={e => (e.currentTarget.style.background = '#f0ece4')}
            >
              Add to Bag
            </button>
            <button
              style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.5)', background: 'none', border: '1px solid rgba(240,236,228,0.12)', padding: '16px 20px', cursor: 'pointer', transition: 'border-color 0.25s, color 0.25s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(240,236,228,0.3)'; e.currentTarget.style.color = '#f0ece4' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(240,236,228,0.12)'; e.currentTarget.style.color = 'rgba(240,236,228,0.5)' }}
            >
              ♡
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function SizeBtn({ size, selected }: { size: string; selected: boolean }) {
  const [sel, setSel] = useState(selected)
  return (
    <button
      onClick={() => setSel(s => !s)}
      className="font-mono-dm"
      style={{ fontSize: 10, letterSpacing: '0.12em', color: sel ? '#060606' : 'rgba(240,236,228,0.45)', background: sel ? '#f0ece4' : 'none', border: `1px solid ${sel ? '#f0ece4' : 'rgba(240,236,228,0.12)'}`, padding: '10px 14px', cursor: 'pointer', transition: 'all 0.2s', minWidth: 44 }}
    >
      {size}
    </button>
  )
}

// ─── Brand Statement ──────────────────────────────────────────────────────────

function Statement({ scrollY }: { scrollY: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [top, setTop] = useState(0)
  const { ref: visRef, visible } = useReveal(0.08)
  useEffect(() => { if (ref.current) setTop(ref.current.offsetTop) }, [])
  const parallax = Math.max(0, scrollY - top) * 0.15

  return (
    <div ref={ref}>
      <section ref={visRef} style={{ position: 'relative', overflow: 'hidden', minHeight: '72vh', display: 'flex', alignItems: 'center' }}>
        <img
          src="https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=1800&h=900&fit=crop&auto=format&q=90"
          alt="Monochromatic knitwear campaign — close-up texture detail"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '130%', objectFit: 'cover', filter: 'brightness(0.14) saturate(0.4)', transform: `translateY(${-parallax}px)`, willChange: 'transform' }}
        />
        <div style={{ position: 'relative', zIndex: 1, padding: '0 56px', maxWidth: 1000 }}>
          <p className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.24em', color: '#c9b99a', textTransform: 'uppercase', marginBottom: 36, opacity: visible ? 1 : 0, transition: 'all 0.7s 0.1s' }}>
            — Our Philosophy
          </p>
          <blockquote className="font-display" style={{ fontSize: 'clamp(26px, 3.5vw, 50px)', fontStyle: 'italic', fontWeight: 400, lineHeight: 1.3, color: '#f0ece4', marginBottom: 40, letterSpacing: '-0.01em', opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(24px)', transition: 'all 0.9s 0.2s cubic-bezier(0.16,1,0.3,1)' }}>
            "Clothing should disappear into the person who wears it — remembered not as fabric, but as feeling."
          </blockquote>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, opacity: visible ? 1 : 0, transition: 'all 0.7s 0.5s' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a1a1a', border: '1px solid rgba(240,236,228,0.12)', overflow: 'hidden' }}>
              <img src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=64&h=64&fit=crop&auto=format" alt="Creative Director" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.6)' }} />
            </div>
            <div>
              <p style={{ fontSize: 13, color: '#f0ece4', fontWeight: 500 }}>Elise Moreau</p>
              <p className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.14em', color: 'rgba(240,236,228,0.35)', textTransform: 'uppercase' }}>Creative Director, Vêtu</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── Category Strip ───────────────────────────────────────────────────────────

function CategoryStrip() {
  const { ref, visible } = useReveal(0.1)
  const cats = [
    { name: 'Outerwear', count: '12 pieces', img: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=500&h=320&fit=crop&auto=format&q=80' },
    { name: 'Knitwear', count: '9 pieces', img: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500&h=320&fit=crop&auto=format&q=80' },
    { name: 'Tailoring', count: '7 pieces', img: 'https://images.unsplash.com/photo-1550614000-4895a10e1bfd?w=500&h=320&fit=crop&auto=format&q=80' },
    { name: 'Dresses', count: '10 pieces', img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&h=320&fit=crop&auto=format&q=80' },
  ]

  return (
    <section ref={ref} style={{ padding: '120px 56px' }}>
      <p className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.24em', color: '#c9b99a', textTransform: 'uppercase', marginBottom: 56, opacity: visible ? 1 : 0, transition: 'all 0.7s' }}>
        — Shop by category
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {cats.map((cat, i) => (
          <div
            key={cat.name}
            data-cursor="Browse"
            onClick={() => navigate(`/shop?category=${cat.name}`)}
            style={{ cursor: 'pointer', opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(24px)', transition: `all 0.7s ${i * 0.1}s cubic-bezier(0.16,1,0.3,1)` }}
          >
            <div style={{ position: 'relative', height: 220, background: '#0e0e0e', marginBottom: 16, overflow: 'hidden' }}
              onMouseEnter={e => { const img = e.currentTarget.querySelector('img') as HTMLImageElement; if (img) img.style.transform = 'scale(1.06)' }}
              onMouseLeave={e => { const img = e.currentTarget.querySelector('img') as HTMLImageElement; if (img) img.style.transform = 'scale(1)' }}
            >
              <img src={cat.img} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.7) saturate(0.7)', transition: 'transform 0.7s cubic-bezier(0.16,1,0.3,1)' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,6,6,0.6) 0%, transparent 60%)' }} />
            </div>
            <h3 className="font-display" style={{ fontSize: 20, fontWeight: 600, color: '#f0ece4', marginBottom: 4 }}>{cat.name}</h3>
            <p className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.14em', color: 'rgba(240,236,228,0.3)', textTransform: 'uppercase' }}>{cat.count}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Newsletter ───────────────────────────────────────────────────────────────

function Newsletter() {
  const { ref, visible } = useReveal(0.1)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  return (
    <section ref={ref} style={{ padding: '100px 56px', borderTop: '1px solid rgba(240,236,228,0.05)', borderBottom: '1px solid rgba(240,236,228,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 40 }}>
      <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(20px)', transition: 'all 0.8s 0.1s' }}>
        <p className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.24em', color: '#c9b99a', textTransform: 'uppercase', marginBottom: 14 }}>— Stay Informed</p>
        <h2 className="font-display" style={{ fontSize: 'clamp(28px, 3vw, 44px)', fontWeight: 700, letterSpacing: '-0.02em', color: '#f0ece4', lineHeight: 1.1 }}>
          New pieces, first.
        </h2>
      </div>
      <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(20px)', transition: 'all 0.8s 0.3s', width: 440 }}>
        {sent ? (
          <p className="font-mono-dm" style={{ fontSize: 11, letterSpacing: '0.14em', color: '#c9b99a', textTransform: 'uppercase' }}>Thank you — you are on the list.</p>
        ) : (
          <div style={{ display: 'flex', gap: 0 }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={{ flex: 1, fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: '0.1em', color: '#f0ece4', background: 'rgba(240,236,228,0.04)', border: '1px solid rgba(240,236,228,0.1)', borderRight: 'none', padding: '14px 20px', outline: 'none' }}
            />
            <button
              onClick={() => email && setSent(true)}
              style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#060606', background: '#f0ece4', border: 'none', padding: '14px 28px', cursor: 'pointer', transition: 'background 0.25s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#c9b99a')}
              onMouseLeave={e => (e.currentTarget.style.background = '#f0ece4')}
            >
              Subscribe
            </button>
          </div>
        )}
        <p style={{ fontSize: 11, color: 'rgba(240,236,228,0.25)', marginTop: 10, lineHeight: 1.6 }}>
          Early access to new collections. No noise.
        </p>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{ padding: '72px 56px 48px', background: '#040404' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr', gap: 48, marginBottom: 72 }}>
        <div>
          <h3 className="font-display" style={{ fontSize: 36, fontWeight: 700, letterSpacing: '0.2em', color: '#f0ece4', marginBottom: 16 }}>VÊTU</h3>
          <p style={{ fontSize: 13, lineHeight: 1.85, color: 'rgba(240,236,228,0.32)', maxWidth: 280 }}>
            Considered clothing for the unhurried. Designed in London. Crafted in Italy. Made to last.
          </p>
          <div style={{ display: 'flex', gap: 16, marginTop: 28 }}>
            {['IG', 'PI', 'TT'].map(s => (
              <button key={s} className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.14em', color: 'rgba(240,236,228,0.3)', background: 'none', border: '1px solid rgba(240,236,228,0.08)', padding: '8px 12px', cursor: 'pointer', transition: 'all 0.25s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#f0ece4'; e.currentTarget.style.borderColor = 'rgba(240,236,228,0.2)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(240,236,228,0.3)'; e.currentTarget.style.borderColor = 'rgba(240,236,228,0.08)' }}
              >{s}</button>
            ))}
          </div>
        </div>
        {[
          { title: 'Shop', links: ['New Arrivals', 'Outerwear', 'Knitwear', 'Tailoring', 'Dresses'] },
          { title: 'World', links: ['Our Story', 'Lookbook', 'Stockists', 'Journal', 'Careers'] },
          { title: 'Help', links: ['Size Guide', 'Returns', 'Shipping', 'Repairs', 'Contact'] },
        ].map(({ title, links }) => (
          <div key={title}>
            <p className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.22em', color: '#c9b99a', textTransform: 'uppercase', marginBottom: 20 }}>{title}</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 13 }}>
              {links.map(l => (
                <li key={l}>
                  <button className="font-mono-dm" style={{ fontSize: 11, letterSpacing: '0.08em', color: 'rgba(240,236,228,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.25s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#f0ece4')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,236,228,0.35)')}
                  >{l}</button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid rgba(240,236,228,0.05)', paddingTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.14em', color: 'rgba(240,236,228,0.18)', textTransform: 'uppercase' }}>© 2026 Vêtu Ltd. All rights reserved.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <button onClick={() => navigate('/admin')} className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.14em', color: 'rgba(240,236,228,0.18)', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.25s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#c9b99a')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,236,228,0.18)')}>Admin</button>
          <p className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.14em', color: 'rgba(240,236,228,0.18)', textTransform: 'uppercase', margin: 0 }}>London · Milan · New York</p>
        </div>
      </div>
    </footer>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [loaded, setLoaded] = useState(false)
  const scrollY = useScrollY()

  return (
    <div style={{ background: '#060606', minHeight: '100vh', cursor: 'none' }}>
      {!loaded && <Intro onDone={() => setLoaded(true)} />}
      <Cursor />
      <Nav scrollY={scrollY} />
      <Hero scrollY={scrollY} />
      <Marquee />
      <LooksGrid />
      <Editorial scrollY={scrollY} />
      <FeaturedProduct scrollY={scrollY} />
      <Statement scrollY={scrollY} />
      <CategoryStrip />
      <Newsletter />
      <Footer />
    </div>
  )
}
