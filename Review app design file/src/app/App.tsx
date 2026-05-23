import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Check, Eye, EyeOff, ChevronRight, Star, Flame, Zap, Shield,
  Lock, Trophy, Home, BarChart2, User, Play, Bell, ChevronLeft,
} from 'lucide-react'
import mascotImg from '../imports/arab-man_9193916.png'

// ── Brand ─────────────────────────────────────────────────────────
const G  = '#05966a'
const Y  = '#e9c468'
const B  = '#0f1b2a'
const C  = '#5a5d68'
const GR = '#95a3b8'
const AS = '#f5f7fa'

// ── Types ─────────────────────────────────────────────────────────
type Screen =
  | 'splash' | 'welcome' | 'signup' | 'login' | 'verify'
  | 'purpose' | 'script' | 'intro' | 'path'
  | 'test-intro' | 'test-1' | 'test-2' | 'test-3' | 'test-4' | 'test-results'
  | 'celebrate' | 'streak' | 'goal' | 'home' | 'level-intro'

type Script    = 'uthmani' | 'nastaliq' | 'simple'
type NodePos   = 'left' | 'center' | 'right'
type NodeStat  = 'complete' | 'current' | 'locked'

interface LevelNode { id: string; pos: NodePos; status: NodeStat; trophy?: boolean }
interface Chapter   { id: number; nameAr: string; nameEn: string; ayahCount: number; locked: boolean; progress: number; levels: LevelNode[] }

// ── Script data ───────────────────────────────────────────────────
const SCRIPT_FONTS: Record<Script, string> = {
  uthmani: "'Scheherazade New', serif",
  nastaliq: "'Noto Nastaliq Urdu', serif",
  simple:   "'Cairo', sans-serif",
}
const SCRIPTS = [
  { id: 'uthmani' as Script, name: 'الخط العثماني', sub: 'Uthmani · Standard Mushaf', sample: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ' },
  { id: 'nastaliq' as Script, name: 'خط نستعليق', sub: 'Nastaliq · Indo-Pakistani', sample: 'بِسۡمِ اللّٰہِ الرَّحۡمٰنِ الرَّحِیۡمِ' },
  { id: 'simple' as Script,   name: 'الخط البسيط', sub: 'Simple · Beginner friendly', sample: 'بسم الله الرحمن الرحيم' },
]

// ── Home level map ────────────────────────────────────────────────
const CHAPTERS: Chapter[] = [
  {
    id: 4, nameAr: 'سورة الفلق', nameEn: 'Surah Al-Falaq', ayahCount: 5,
    locked: true, progress: 0,
    levels: [
      { id:'fl1', pos:'center', status:'locked' },
      { id:'fl2', pos:'right',  status:'locked' },
      { id:'fl3', pos:'center', status:'locked' },
      { id:'fl4', pos:'left',   status:'locked' },
      { id:'fl5', pos:'center', status:'locked', trophy: true },
    ],
  },
  {
    id: 3, nameAr: 'سورة الناس', nameEn: 'Surah An-Nas', ayahCount: 6,
    locked: true, progress: 0,
    levels: [
      { id:'n1', pos:'left',   status:'locked' },
      { id:'n2', pos:'center', status:'locked' },
      { id:'n3', pos:'right',  status:'locked' },
      { id:'n4', pos:'center', status:'locked' },
      { id:'n5', pos:'left',   status:'locked' },
      { id:'n6', pos:'center', status:'locked', trophy: true },
    ],
  },
  {
    id: 2, nameAr: 'سورة الإخلاص', nameEn: 'Surah Al-Ikhlas', ayahCount: 4,
    locked: false, progress: 40,
    levels: [
      { id:'i1', pos:'center', status:'complete' },
      { id:'i2', pos:'left',   status:'complete' },
      { id:'i3', pos:'right',  status:'current' },
      { id:'i4', pos:'center', status:'locked' },
      { id:'i5', pos:'left',   status:'locked' },
      { id:'i6', pos:'center', status:'locked', trophy: true },
    ],
  },
  {
    id: 1, nameAr: 'سورة الفاتحة', nameEn: 'Surah Al-Fatiha', ayahCount: 7,
    locked: false, progress: 100,
    levels: [
      { id:'f1', pos:'center', status:'complete' },
      { id:'f2', pos:'right',  status:'complete' },
      { id:'f3', pos:'left',   status:'complete' },
      { id:'f4', pos:'center', status:'complete' },
      { id:'f5', pos:'right',  status:'complete' },
      { id:'f6', pos:'left',   status:'complete' },
      { id:'f7', pos:'center', status:'complete', trophy: true },
    ],
  },
]

// ── Arabic i'rab watermark ────────────────────────────────────────
const BG_CHARS = ['بَ','تُ','ثِ','جْ','حَ','خُ','دِ','ذْ','رَ','زُ','سِ','شْ','صَ','ضُ','طِ','ظْ','عَ','غُ','فِ','قْ','كَ','لُ','مِ','نْ','هَ','وُ','يِ','ءَ','ةُ']
const BG_ITEMS = Array.from({ length: 70 }, (_, i) => ({
  char: BG_CHARS[i % BG_CHARS.length],
  x:   ((i * 1618) % 9400) / 100,
  y:   ((i * 2347) % 9700) / 100,
  sz:  11 + (i % 6) * 5,
  rot: ((i * 43) % 80) - 40,
  op:  0.038 + (i % 4) * 0.014,
}))

const CONFETTI_ITEMS = Array.from({ length: 26 }, (_, i) => ({
  x:     ((i * 1618) % 88) + 6,
  delay: (i * 0.17) % 2.2,
  sz:    5 + (i % 4) * 4,
  color: [Y, G, '#e96868', '#68b4e9', '#b468e9'][i % 5],
  rot:   ((i * 53) % 360),
}))

// ── Shared components ─────────────────────────────────────────────
function IrabBg({ color = Y }: { color?: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
      {BG_ITEMS.map((p, i) => (
        <span key={i} style={{
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
          fontSize: p.sz, transform: `rotate(${p.rot}deg)`,
          opacity: p.op, color,
          fontFamily: "'Scheherazade New', serif",
        }}>{p.char}</span>
      ))}
    </div>
  )
}

function Logo({ lg = false, light = false }: { lg?: boolean; light?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span style={{
        fontFamily: "'Amiri', serif",
        fontSize: lg ? 50 : 32,
        fontWeight: 700,
        color: Y,
        lineHeight: 1.2,
        letterSpacing: 1,
      }}>أُسْتَاذ</span>
      <span style={{
        fontFamily: "'Nunito', sans-serif",
        fontSize: lg ? 10 : 8,
        letterSpacing: '0.3em',
        color: light ? 'rgba(255,255,255,0.35)' : GR,
        fontWeight: 800,
        textTransform: 'uppercase',
      }}>USTAD · HIFZ</span>
    </div>
  )
}

function Mascot({ size = 100, bounce = false }: { size?: number; bounce?: boolean }) {
  return (
    <motion.img
      src={mascotImg} alt=""
      width={size} height={size}
      className="object-contain drop-shadow-xl"
      animate={bounce ? { y: [0, -10, 0] } : {}}
      transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
    />
  )
}

function XpPop({ xp }: { xp: number }) {
  return (
    <motion.div
      initial={{ y: 0, opacity: 1, scale: 0.8 }}
      animate={{ y: -70, opacity: 0, scale: 1.1 }}
      transition={{ duration: 1.3, ease: 'easeOut' }}
      className="absolute top-0 left-1/2 -translate-x-1/2 font-black text-sm px-4 py-1.5 rounded-full pointer-events-none z-50"
      style={{ background: Y, color: B }}
    >+{xp} XP ⚡</motion.div>
  )
}

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <motion.div key={i} animate={{ scale: i === current ? 1.2 : 1 }} style={{
          width: i === current ? 20 : 8, height: 8,
          borderRadius: 99,
          background: i < current ? G : i === current ? Y : `${GR}40`,
          transition: 'all 0.3s',
        }} />
      ))}
    </div>
  )
}

function AchievementToast({ label, icon, show }: { label: string; icon: string; show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -90, opacity: 0 }}
          className="absolute top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-2xl px-4 py-3 shadow-2xl whitespace-nowrap"
          style={{ background: B, border: `2px solid ${Y}` }}
        >
          <span className="text-xl">{icon}</span>
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: Y }}>Achievement Unlocked!</div>
            <div className="text-sm font-black text-white">{label}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack}
      className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
      style={{ background: '#fff', border: `2px solid ${GR}30` }}>
      <ChevronLeft size={20} strokeWidth={2.5} style={{ color: C }} />
    </button>
  )
}

// ── Screen: Splash ────────────────────────────────────────────────
function SplashScreen({ next }: { next: () => void }) {
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 600)
    const t2 = setTimeout(() => setPhase(2), 1500)
    const t3 = setTimeout(next, 3000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [next])

  return (
    <div className="relative h-full flex flex-col items-center justify-center overflow-hidden" style={{ background: B }}>
      <IrabBg color={Y} />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse 65% 55% at 50% 58%, ${G}28 0%, transparent 68%)`,
      }} />
      {[...Array(10)].map((_, i) => (
        <motion.div key={i} className="absolute pointer-events-none text-lg"
          style={{ left: `${8 + i * 9}%`, top: `${12 + ((i * 17) % 65)}%` }}
          animate={{ opacity: [0.08, 0.5, 0.08], y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 2.5 + i * 0.3, delay: i * 0.25 }}
        >✦</motion.div>
      ))}
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 10, stiffness: 70 }}
        className="flex flex-col items-center gap-7 z-10"
      >
        <Mascot size={155} bounce />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 20 }}>
          <Logo lg light />
        </motion.div>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: phase >= 2 ? 1 : 0 }}
        className="absolute bottom-14 z-10 w-40 flex flex-col items-center gap-2">
        <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: `${Y}28` }}>
          <motion.div className="h-full rounded-full" style={{ background: Y }}
            initial={{ width: '0%' }} animate={{ width: phase >= 2 ? '100%' : '0%' }}
            transition={{ duration: 1.4, ease: 'linear' }} />
        </div>
        <p className="text-[10px] font-bold" style={{ color: `${Y}70` }}>Preparing your journey…</p>
      </motion.div>
    </div>
  )
}

// ── Screen: Welcome ───────────────────────────────────────────────
function WelcomeScreen({ onSignup, onLogin }: { onSignup: () => void; onLogin: () => void }) {
  return (
    <div className="relative h-full flex flex-col overflow-hidden" style={{ background: B }}>
      <IrabBg color={Y} />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse 85% 50% at 50% -5%, ${G}35 0%, transparent 58%)`,
      }} />
      <div className="flex-1 flex flex-col items-center justify-center gap-5 z-10 px-6">
        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', damping: 14 }}>
          <Mascot size={165} bounce />
        </motion.div>
        <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="text-center">
          <Logo lg light />
          <p className="mt-3 text-sm font-semibold" style={{ color: `${GR}cc` }}>
            The gamified way to memorise the Holy Quran
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="flex flex-wrap gap-2 justify-center mt-1">
          {[
            { icon: '🌙', label: 'Hifz tracking' },
            { icon: '⚡', label: 'XP & streaks' },
            { icon: '📖', label: 'All scripts' },
            { icon: '🏆', label: 'Achievements' },
          ].map(f => (
            <div key={f.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: `${Y}18`, border: `1px solid ${Y}40`, color: Y }}>
              <span>{f.icon}</span><span>{f.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.28, type: 'spring', damping: 18 }}
        className="z-10 px-6 pb-10 flex flex-col gap-3">
        <button onClick={onSignup}
          className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 active:scale-95 transition-transform"
          style={{ background: G, color: '#fff', boxShadow: `0 10px 32px ${G}55` }}>
          Get Started — {"it's"} free <ChevronRight size={18} strokeWidth={3} />
        </button>
        <button onClick={onLogin}
          className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-transform"
          style={{ background: `${Y}22`, color: Y, border: `2px solid ${Y}50` }}>
          I already have an account
        </button>
      </motion.div>
    </div>
  )
}

// ── Screen: Sign Up ───────────────────────────────────────────────
function SignUpScreen({ next, onLogin, onBack }: { next: () => void; onLogin: () => void; onBack: () => void }) {
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [pw,      setPw]      = useState('')
  const [showPw,  setShowPw]  = useState(false)
  const [focused, setFocused] = useState<string | null>(null)
  const [showXp,  setShowXp]  = useState(false)
  const valid = name.length > 1 && email.includes('@') && pw.length >= 6

  function submit() { setShowXp(true); setTimeout(next, 800) }

  return (
    <div className="relative h-full flex flex-col overflow-hidden" style={{ background: AS }}>
      <IrabBg color={G} />
      <div className="z-10 pt-10 pb-2 px-6">
        <div className="mb-3">
          <BackButton onBack={onBack} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <Logo />
          <div className="mt-1 text-[10px] font-black uppercase tracking-widest" style={{ color: G }}>Create your account</div>
        </div>
      </div>
      {/* Sign-up XP hint */}
      <div className="z-10 mx-6 mt-3 mb-2 rounded-2xl p-3 flex items-center gap-3"
        style={{ background: `${B}08`, border: `1.5px solid ${G}30` }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${G}18` }}>
          <Star size={16} style={{ color: G }} />
        </div>
        <div>
          <div className="text-xs font-black" style={{ color: B }}>Sign-up bonus</div>
          <div className="text-[10px] font-semibold" style={{ color: C }}>
            Earn <span style={{ color: Y, fontWeight: 900 }}>+50 XP</span> when you create your account!
          </div>
        </div>
      </div>
      <div className="z-10 flex-1 flex flex-col px-6 gap-3 overflow-y-auto pb-4">
        {/* Social */}
        <div className="flex gap-3">
          {[
            { label: 'Google', icon: <span className="font-black text-blue-500">G</span> },
            { label: 'Apple',  icon: <span>🍎</span> },
          ].map(s => (
            <button key={s.label} onClick={submit}
              className="flex-1 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
              style={{ background: '#fff', border: `2px solid ${GR}35`, color: B }}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: `${GR}30` }} />
          <span className="text-xs font-bold" style={{ color: GR }}>or with email</span>
          <div className="flex-1 h-px" style={{ background: `${GR}30` }} />
        </div>
        {/* Fields */}
        {[
          { key: 'name',  label: 'Full Name', val: name,  set: setName,  type: 'text',  ph: 'Ahmad Al-Rashid' },
          { key: 'email', label: 'Email',     val: email, set: setEmail, type: 'email', ph: 'ahmad@email.com' },
        ].map(f => (
          <div key={f.key} className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-wider"
              style={{ color: focused === f.key ? G : C }}>{f.label}</label>
            <input value={f.val} onChange={e => f.set(e.target.value)} type={f.type} placeholder={f.ph}
              onFocus={() => setFocused(f.key)} onBlur={() => setFocused(null)}
              className="w-full px-4 py-3.5 rounded-2xl text-sm font-semibold outline-none transition-all"
              style={{ background: '#fff', border: `2px solid ${focused === f.key ? G : `${GR}35`}`, color: B,
                boxShadow: focused === f.key ? `0 0 0 4px ${G}18` : 'none' }} />
          </div>
        ))}
        {/* Password */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black uppercase tracking-wider"
            style={{ color: focused === 'pw' ? G : C }}>Password</label>
          <div className="relative">
            <input value={pw} onChange={e => setPw(e.target.value)} type={showPw ? 'text' : 'password'}
              placeholder="Min. 6 characters" onFocus={() => setFocused('pw')} onBlur={() => setFocused(null)}
              className="w-full px-4 py-3.5 pr-12 rounded-2xl text-sm font-semibold outline-none transition-all"
              style={{ background: '#fff', border: `2px solid ${focused === 'pw' ? G : `${GR}35`}`, color: B,
                boxShadow: focused === 'pw' ? `0 0 0 4px ${G}18` : 'none' }} />
            <button onClick={() => setShowPw(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: GR }}>
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {pw.length > 0 && (
            <div className="flex items-center gap-1.5 mt-0.5">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex-1 h-1.5 rounded-full transition-all" style={{
                  background: pw.length >= i * 3 ? (pw.length >= 8 ? G : Y) : `${GR}30`,
                }} />
              ))}
              <span className="text-[10px] font-bold ml-0.5" style={{ color: pw.length >= 8 ? G : pw.length >= 4 ? Y : GR }}>
                {pw.length >= 8 ? '💪 Strong' : pw.length >= 4 ? 'Good' : 'Weak'}
              </span>
            </div>
          )}
        </div>
        <p className="text-[10px] text-center font-semibold" style={{ color: GR }}>
          By continuing you agree to our <span style={{ color: G }}>Terms</span> & <span style={{ color: G }}>Privacy</span>
        </p>
        <div className="relative">
          {showXp && <XpPop xp={50} />}
          <button disabled={!valid} onClick={submit}
            className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-all"
            style={{ background: valid ? G : `${GR}25`, color: valid ? '#fff' : GR,
              boxShadow: valid ? `0 8px 28px ${G}45` : 'none' }}>
            Create Account ✦
          </button>
        </div>
        <button onClick={onLogin} className="text-center py-2 text-sm font-bold" style={{ color: G }}>
          Have an account? <span style={{ color: B, fontWeight: 900 }}>Sign in</span>
        </button>
      </div>
    </div>
  )
}

// ── Screen: Login ─────────────────────────────────────────────────
function LoginScreen({ next, onSignup, onBack }: { next: () => void; onSignup: () => void; onBack: () => void }) {
  const [email,   setEmail]   = useState('')
  const [pw,      setPw]      = useState('')
  const [showPw,  setShowPw]  = useState(false)
  const [focused, setFocused] = useState<string | null>(null)
  const valid = email.includes('@') && pw.length >= 4

  return (
    <div className="relative h-full flex flex-col overflow-hidden" style={{ background: AS }}>
      <IrabBg color={G} />
      <div className="z-10 pt-10 pb-4 px-6">
        <div className="mb-3">
          <BackButton onBack={onBack} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <Logo /><div className="mt-1 text-[10px] font-black uppercase tracking-widest" style={{ color: G }}>Welcome back</div>
        </div>
      </div>
      <div className="z-10 flex-1 flex flex-col px-6 pt-2 gap-4">
        <div className="flex flex-col items-center py-3"><Mascot size={100} bounce /></div>
        {[
          { key: 'email', label: 'Email', val: email, set: setEmail, type: 'email', ph: 'your@email.com' },
        ].map(f => (
          <div key={f.key} className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: focused === f.key ? G : C }}>{f.label}</label>
            <input value={f.val} onChange={e => f.set(e.target.value)} type={f.type} placeholder={f.ph}
              onFocus={() => setFocused(f.key)} onBlur={() => setFocused(null)}
              className="w-full px-4 py-3.5 rounded-2xl text-sm font-semibold outline-none"
              style={{ background: '#fff', border: `2px solid ${focused === f.key ? G : `${GR}35`}`, color: B }} />
          </div>
        ))}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between">
            <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: focused === 'pw' ? G : C }}>Password</label>
            <button className="text-[10px] font-black" style={{ color: G }}>Forgot password?</button>
          </div>
          <div className="relative">
            <input value={pw} onChange={e => setPw(e.target.value)} type={showPw ? 'text' : 'password'} placeholder="Your password"
              onFocus={() => setFocused('pw')} onBlur={() => setFocused(null)}
              className="w-full px-4 py-3.5 pr-12 rounded-2xl text-sm font-semibold outline-none"
              style={{ background: '#fff', border: `2px solid ${focused === 'pw' ? G : `${GR}35`}`, color: B }} />
            <button onClick={() => setShowPw(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: GR }}>
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <button disabled={!valid} onClick={next}
          className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-all mt-1"
          style={{ background: valid ? G : `${GR}25`, color: valid ? '#fff' : GR, boxShadow: valid ? `0 8px 28px ${G}45` : 'none' }}>
          Sign In →
        </button>
        <button onClick={onSignup} className="text-center py-2 text-sm font-bold" style={{ color: G }}>
          No account? <span style={{ color: B, fontWeight: 900 }}>Sign up free</span>
        </button>
      </div>
    </div>
  )
}

// ── Screen: Verify ────────────────────────────────────────────────
function VerifyScreen({ next, onBack }: { next: () => void; onBack: () => void }) {
  const [code,    setCode]    = useState(['', '', '', ''])
  const [showAch, setShowAch] = useState(false)
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null),
                useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]

  function handleDigit(val: string, i: number) {
    if (!/^\d?$/.test(val)) return
    const c = [...code]; c[i] = val; setCode(c)
    if (val && i < 3) refs[i + 1].current?.focus()
  }
  const complete = code.every(d => d !== '')
  function confirm() { setShowAch(true); setTimeout(next, 1600) }

  return (
    <div className="relative h-full flex flex-col overflow-hidden" style={{ background: AS }}>
      <IrabBg color={G} />
      <AchievementToast label="Email Verified! +20 XP 🎉" icon="🏅" show={showAch} />
      <div className="z-10 absolute top-10 left-6">
        <BackButton onBack={onBack} />
      </div>
      <div className="z-10 flex-1 flex flex-col items-center justify-center px-6 gap-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}>
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
            style={{ background: `${G}20`, border: `3px solid ${G}` }}>📧</div>
        </motion.div>
        <div className="text-center">
          <h1 className="text-2xl font-black" style={{ color: B }}>Check your email</h1>
          <p className="text-sm mt-2 font-semibold" style={{ color: C }}>We sent a 4-digit code to your address</p>
        </div>
        <div className="flex gap-3">
          {code.map((d, i) => (
            <input key={i} ref={refs[i]} value={d} onChange={e => handleDigit(e.target.value, i)} maxLength={1}
              className="w-14 h-16 rounded-2xl text-center text-2xl font-black outline-none transition-all"
              style={{ background: '#fff', border: `2.5px solid ${d ? G : `${GR}40`}`, color: B,
                boxShadow: d ? `0 0 0 4px ${G}18` : 'none' }} />
          ))}
        </div>
        <button disabled={!complete} onClick={confirm}
          className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-all"
          style={{ background: complete ? G : `${GR}25`, color: complete ? '#fff' : GR,
            boxShadow: complete ? `0 8px 28px ${G}45` : 'none' }}>
          Verify & Continue ✦
        </button>
        <div className="text-center">
          <p className="text-xs font-semibold" style={{ color: GR }}>{"Didn't receive it?"}</p>
          <button className="text-sm font-black" style={{ color: G }}>Resend code</button>
        </div>
      </div>
    </div>
  )
}

// ── Screen: Purpose ───────────────────────────────────────────────
function PurposeScreen({ next, onBack }: { next: () => void; onBack: () => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [showXp, setShowXp] = useState(false)

  const purposes = [
    { id: 'hifz', icon: '📖', label: 'Hifz', sub: 'Complete Quran memorisation' },
    { id: 'school', icon: '🎓', label: 'School', sub: 'For my studies & exams' },
    { id: 'recitation', icon: '🕌', label: 'Recitation', sub: 'Improve my Quranic reading' },
    { id: 'rememorisation', icon: '🔄', label: 'Re-memorisation', sub: 'Review what I once knew' },
    { id: 'family', icon: '👨‍👩‍👧‍👦', label: 'Friends & Family', sub: 'Learn together with loved ones' },
    { id: 'other', icon: '✨', label: 'Other', sub: 'Personal spiritual journey' },
  ]

  function confirm() {
    if (!selected) return
    setShowXp(true)
    setTimeout(next, 700)
  }

  return (
    <div className="h-full flex flex-col" style={{ background: AS }}>
      <IrabBg color={G} />
      <div className="z-10 px-5 pt-10 pb-3">
        <div className="mb-3">
          <BackButton onBack={onBack} />
        </div>
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: G }}>Getting to know you</div>
        </div>
        <h1 className="text-2xl font-black" style={{ color: B }}>Why do you want to memorise the Quran?</h1>
        <p className="text-sm mt-1 font-semibold" style={{ color: C }}>This helps us personalise your learning journey</p>
      </div>
      <div className="mx-5 mb-3 p-3 rounded-2xl flex items-center gap-3"
        style={{ background: `${Y}15`, border: `1.5px solid ${Y}40` }}>
        <span className="text-xl">⚡</span>
        <span className="text-xs font-bold" style={{ color: B }}>
          Share your goal and earn <span style={{ color: Y, fontWeight: 900 }}>+15 XP</span>
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <div className="grid grid-cols-2 gap-3">
          {purposes.map(p => {
            const active = selected === p.id
            return (
              <motion.button key={p.id} onClick={() => setSelected(p.id)} whileTap={{ scale: 0.96 }}
                className="rounded-2xl p-4 text-center relative overflow-hidden"
                style={{
                  background: active ? `${G}0c` : '#fff',
                  border: `${active ? 3 : 2}px solid ${active ? G : `${GR}30`}`,
                  boxShadow: active ? `0 6px 24px ${G}20` : '0 2px 8px rgba(0,0,0,0.04)',
                }}
                animate={{ scale: active ? 1.02 : 1 }}>
                {active && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: G }}>
                    <Check size={10} strokeWidth={3} className="text-white" />
                  </motion.div>
                )}
                <div className="text-3xl mb-2">{p.icon}</div>
                <div className="font-black text-sm leading-tight mb-1" style={{ color: B }}>{p.label}</div>
                <div className="text-[10px] font-semibold leading-snug" style={{ color: C }}>{p.sub}</div>
              </motion.button>
            )
          })}
        </div>
      </div>
      <div className="px-5 pb-8 relative">
        {showXp && <XpPop xp={15} />}
        <button disabled={!selected} onClick={confirm}
          className="w-full py-4 rounded-2xl font-black text-base transition-all active:scale-95"
          style={{ background: selected ? G : `${GR}20`, color: selected ? '#fff' : GR,
            boxShadow: selected ? `0 8px 28px ${G}40` : 'none' }}>
          {selected ? 'Continue →' : 'Select to continue'}
        </button>
      </div>
    </div>
  )
}

// ── Screen: Choose Script ─────────────────────────────────────────
function ScriptScreen({ next, setScript, onBack }: { next: () => void; setScript: (s: Script) => void; onBack: () => void }) {
  const [sel,    setSel]    = useState<Script | null>(null)
  const [showXp, setShowXp] = useState(false)

  function confirm() {
    if (!sel) return
    setScript(sel); setShowXp(true); setTimeout(next, 700)
  }

  return (
    <div className="h-full flex flex-col" style={{ background: AS }}>
      <div className="px-5 pt-10 pb-3">
        <div className="mb-3">
          <BackButton onBack={onBack} />
        </div>
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: G }}>Setup · Step 1 of 3</div>
          <StepDots total={3} current={0} />
        </div>
        <h1 className="text-2xl font-black" style={{ color: B }}>Choose your Mushaf style</h1>
        <p className="text-sm mt-1 font-semibold" style={{ color: C }}>All Quranic verses will appear in this script</p>
      </div>
      <div className="mx-5 mb-3 p-3 rounded-2xl flex items-center gap-3"
        style={{ background: `${Y}15`, border: `1.5px solid ${Y}40` }}>
        <span className="text-xl">⚡</span>
        <span className="text-xs font-bold" style={{ color: B }}>
          Completing setup earns <span style={{ color: Y, fontWeight: 900 }}>+30 XP</span>
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-3 pb-4">
        {SCRIPTS.map((s, idx) => {
          const active = sel === s.id
          return (
            <motion.button key={s.id} onClick={() => setSel(s.id)} whileTap={{ scale: 0.98 }}
              className="w-full p-5 rounded-3xl text-right relative overflow-hidden"
              style={{ background: active ? `${G}0c` : '#fff',
                border: `${active ? 3 : 2}px solid ${active ? G : `${GR}30`}`,
                boxShadow: active ? `0 6px 24px ${G}20` : '0 2px 8px rgba(0,0,0,0.04)' }}
              animate={{ scale: active ? 1.01 : 1 }}>
              {idx === 0 && (
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase"
                  style={{ background: G, color: '#fff' }}>Recommended</div>
              )}
              <div className="flex items-start justify-between mb-3">
                <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ background: active ? G : 'transparent', borderColor: active ? G : `${GR}50` }}>
                  {active && <Check size={11} strokeWidth={3} className="text-white" />}
                </div>
                <div className="text-right">
                  <div className="font-black text-sm" style={{ color: B }}>{s.name}</div>
                  <div className="text-xs font-semibold" style={{ color: C }}>{s.sub}</div>
                </div>
              </div>
              <div className="text-right text-xl leading-[2.3]"
                style={{ fontFamily: SCRIPT_FONTS[s.id], color: B, direction: 'rtl' }}>
                {s.sample}
              </div>
            </motion.button>
          )
        })}
      </div>
      <div className="px-5 pb-8 relative">
        {showXp && <XpPop xp={10} />}
        <button disabled={!sel} onClick={confirm}
          className="w-full py-4 rounded-2xl font-black text-base transition-all active:scale-95"
          style={{ background: sel ? G : `${GR}20`, color: sel ? '#fff' : GR,
            boxShadow: sel ? `0 8px 28px ${G}40` : 'none' }}>
          {sel ? 'Continue →' : 'Select a style to continue'}
        </button>
      </div>
    </div>
  )
}

// ── Screen: Mascot Intro ──────────────────────────────────────────
function IntroScreen({ next, onBack }: { next: () => void; onBack: () => void }) {
  return (
    <div className="h-full flex flex-col" style={{ background: AS }}>
      <div className="px-5 pt-10 pb-1">
        <div className="mb-3">
          <BackButton onBack={onBack} />
        </div>
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: G }}>Setup · Step 2 of 3</div>
          <StepDots total={3} current={1} />
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 14 }}
          className="w-full rounded-3xl p-5 relative"
          style={{ background: '#fff', border: `2px solid ${GR}20`, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <p className="text-base font-bold text-center leading-relaxed" style={{ color: B }}>
            Before we begin, let me ask you{' '}
            <span style={{ color: G, fontWeight: 900 }}>one question</span>
            {' '}to personalise your Hifz journey! 🌙
          </p>
          <div className="absolute -bottom-[13px] left-1/2 -translate-x-1/2"
            style={{ width: 0, height: 0, borderLeft: '14px solid transparent',
              borderRight: '14px solid transparent', borderTop: '14px solid #fff' }} />
        </motion.div>
        <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, type: 'spring', damping: 12 }}>
          <Mascot size={185} bounce />
        </motion.div>
      </div>
      <div className="px-5 pb-4">
        <button onClick={next}
          className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-transform"
          style={{ background: G, color: '#fff', boxShadow: `0 8px 28px ${G}40` }}>
          {"Let's go! 🚀"}
        </button>
      </div>
    </div>
  )
}

// ── Screen: Choose Path ───────────────────────────────────────────
function PathScreen({ next, onBack }: { next: (p: 'beginner' | 'advanced') => void; onBack: () => void }) {
  const [selected, setSelected] = useState<'beginner' | 'advanced' | null>(null)
  const paths = [
    { id: 'beginner' as const, emoji: '🌱', title: 'Learning Quran for the first time?',
      sub: 'Start from Alif Baa · Complete beginner',
      detail: "We'll guide you step by step through every letter and Surah",
      xp: '+100 XP starter bonus', color: G },
    { id: 'advanced' as const, emoji: '📖', title: 'Already know some Surahs?',
      sub: 'Test your level · Find your starting point',
      detail: "Take a short test and we'll place you at the perfect level",
      xp: '+50 XP for testing', color: Y },
  ]
  return (
    <div className="h-full flex flex-col" style={{ background: AS }}>
      <div className="px-5 pt-10 pb-3">
        <div className="mb-3">
          <BackButton onBack={onBack} />
        </div>
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: G }}>Setup · Step 3 of 3</div>
          <StepDots total={3} current={2} />
        </div>
        <h1 className="text-2xl font-black" style={{ color: B }}>Choose your path</h1>
        <p className="text-sm mt-1 font-semibold" style={{ color: C }}>How would you describe yourself?</p>
      </div>
      <div className="flex-1 flex flex-col gap-4 px-5 pt-2 pb-4">
        {paths.map(p => {
          const active = selected === p.id
          return (
            <motion.button key={p.id} onClick={() => setSelected(p.id)} whileTap={{ scale: 0.97 }}
              className="w-full rounded-3xl p-5 text-left relative overflow-hidden"
              style={{ background: active ? (p.id === 'beginner' ? `${G}0c` : `${Y}18`) : '#fff',
                border: `${active ? 3 : 2}px solid ${active ? p.color : `${GR}30`}`,
                boxShadow: active ? `0 8px 28px ${p.color}28` : '0 2px 8px rgba(0,0,0,0.04)' }}
              animate={{ scale: active ? 1.01 : 1 }}>
              {active && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: p.color }}>
                  <Check size={12} strokeWidth={3} className="text-white" />
                </motion.div>
              )}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shrink-0"
                  style={{ background: `${p.color}20` }}>{p.emoji}</div>
                <div className="flex-1">
                  <div className="font-black text-base leading-tight mb-1" style={{ color: B }}>{p.title}</div>
                  <div className="text-xs font-semibold mb-2" style={{ color: C }}>{p.sub}</div>
                  <div className="text-xs font-semibold leading-relaxed mb-2" style={{ color: C }}>{p.detail}</div>
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black"
                    style={{ background: `${p.color}20`, color: p.color }}>⚡ {p.xp}</div>
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>
      <div className="px-5 pb-8">
        <button disabled={!selected} onClick={() => selected && next(selected)}
          className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-all"
          style={{ background: selected ? G : `${GR}20`, color: selected ? '#fff' : GR,
            boxShadow: selected ? `0 8px 28px ${G}40` : 'none' }}>
          {selected ? (selected === 'beginner' ? 'Start my Hifz journey! 🌱' : 'Test my level 📖') : 'Select your path'}
        </button>
      </div>
    </div>
  )
}

// ── Screen: Test Intro ────────────────────────────────────────────
function TestIntroScreen({ next, onBack }: { next: () => void; onBack: () => void }) {
  return (
    <div className="h-full flex flex-col" style={{ background: AS }}>
      <div className="px-5 pt-10 pb-3">
        <div className="mb-3">
          <BackButton onBack={onBack} />
        </div>
      </div>
      <div className="mx-4 mb-4 rounded-3xl p-5 relative overflow-hidden" style={{ background: B }}>
        <IrabBg color={Y} />
        <div className="relative z-10 flex items-center gap-4">
          <Mascot size={80} bounce />
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: Y }}>Level Assessment</div>
            <h1 className="text-xl font-black text-white leading-tight">{"Let's find your\nstarting point"}</h1>
          </div>
        </div>
        <p className="relative z-10 text-sm mt-3 font-semibold" style={{ color: `${GR}cc` }}>
          A short test using Surah Al-Fatiha & Al-Ikhlas.
        </p>
      </div>

      {/* Meet your teachers */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="mx-4 mb-4 rounded-2xl p-4 flex items-center gap-3"
        style={{ background: '#fff', border: `1.5px solid ${GR}25` }}>
        <div className="flex gap-2">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
            style={{ background: `${G}18`, border: `2px solid ${G}` }}>
            🧔🏽‍♂️
          </div>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
            style={{ background: `${Y}18`, border: `2px solid ${Y}` }}>
            🧕🏽
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs font-black mb-0.5" style={{ color: B }}>Meet Your Teachers</div>
          <p className="text-[10px] font-semibold leading-relaxed" style={{ color: C }}>
            Sheikh Ahmad & Sheikha Fatima will guide you through each question
          </p>
        </div>
      </motion.div>

      <div className="mx-4 mb-4 rounded-3xl p-4" style={{ background: '#fff', border: `1.5px solid ${GR}25` }}>
        <div className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: G }}>What to expect</div>
        {[
          { icon: '✍️', label: 'Complete the Ayah',  desc: 'Fill in missing words' },
          { icon: '⏭️', label: 'What comes next?',   desc: 'Recall the following Ayah' },
          { icon: '🔤', label: 'Fill in the blank',  desc: 'Word bank selection' },
          { icon: '🔗', label: 'Match the pairs',    desc: 'Tajweed symbols & meanings' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3 py-2 border-b last:border-b-0"
            style={{ borderColor: `${GR}20` }}>
            <span className="text-lg w-7 text-center">{item.icon}</span>
            <div>
              <div className="text-xs font-black" style={{ color: B }}>{item.label}</div>
              <div className="text-[10px] font-semibold" style={{ color: C }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 pb-8 mt-auto">
        <button onClick={next}
          className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-transform"
          style={{ background: G, color: '#fff', boxShadow: `0 8px 28px ${G}40` }}>
          Start the Test →
        </button>
      </div>
    </div>
  )
}

// ── Screen: Test Question 1 ───────────────────────────────────────
function Test1Screen({ next }: { next: () => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [showEnergy, setShowEnergy] = useState(false)
  const [barGlow, setBarGlow] = useState(false)

  const options = [
    { id: 'a', text: 'ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ' },
    { id: 'b', text: 'رَبِّ ٱلْعَـٰلَمِينَ' },
    { id: 'c', text: 'مَـٰلِكِ يَوْمِ ٱلدِّينِ' },
    { id: 'd', text: 'إِيَّاكَ نَعْبُدُ' },
  ]

  function handleCheck() {
    if (!selected) return
    const isCorrect = selected === 'b'
    setCorrect(isCorrect)
    setShowResult(true)

    if (isCorrect) {
      setShowEnergy(true)
      // Bar glows when energy reaches it
      setTimeout(() => setBarGlow(true), 500)
      setTimeout(() => next(), 2000)
    }
  }

  return (
    <div className="h-full flex flex-col relative" style={{ background: showResult && !correct ? '#fee' : AS }}>
      <IrabBg color={G} />

      {/* Power orb animation from button to bar */}
      <AnimatePresence>
        {showEnergy && (
          <motion.div
            className="absolute left-1/2 pointer-events-none z-50"
            style={{
              width: 40,
              height: 40,
              marginLeft: -20,
              bottom: 100,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 2, 1.5, 0.5],
              opacity: [0, 1, 1, 0],
              y: [0, -50, -200, -500],
            }}
            transition={{
              duration: 0.7,
              ease: 'easeOut',
              times: [0, 0.2, 0.6, 1],
            }}>
            {/* Outer glow */}
            <div className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle, ${Y} 0%, ${Y}80 40%, transparent 70%)`,
                filter: 'blur(8px)',
              }} />
            {/* Inner bright core */}
            <div className="absolute inset-2 rounded-full"
              style={{
                background: Y,
                boxShadow: `0 0 30px ${Y}, 0 0 60px ${Y}, 0 0 90px ${Y}`,
              }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar */}
      <div className="px-5 pt-10 pb-4">
        <div className="h-4 rounded-full overflow-hidden relative" style={{ background: `${GR}25` }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: '25%',
              scale: barGlow ? [1, 1.15, 1] : 1,
              boxShadow: barGlow
                ? [
                    `0 0 0px ${Y}`,
                    `0 0 25px ${Y}, 0 0 50px ${Y}`,
                    `0 0 15px ${Y}`,
                  ]
                : 'none',
            }}
            transition={{
              width: { duration: 0.5 },
              scale: { duration: 0.4, delay: 0.5 },
              boxShadow: { duration: 0.6, delay: 0.5 },
            }}
            className="h-full rounded-full relative"
            style={{ background: Y }}>
            {/* Bright flash when energy enters */}
            {barGlow && (
              <motion.div
                className="absolute inset-0 rounded-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.5, delay: 0.5 }}
                style={{
                  background: `radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)`,
                }}
              />
            )}
          </motion.div>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col px-5 pt-2 pb-4 overflow-y-auto">
        {/* Sheikh asking */}
        <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
          className="mb-4 flex items-start gap-3">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl shrink-0"
            style={{ background: `${G}18`, border: `2px solid ${G}` }}>
            🧔🏽‍♂️
          </div>
          <div className="flex-1 rounded-2xl p-4 relative"
            style={{ background: '#fff', border: `2px solid ${GR}25` }}>
            <div className="text-[9px] font-black uppercase tracking-wider mb-1" style={{ color: G }}>Sheikh Ahmad asks:</div>
            <p className="text-sm font-bold leading-relaxed" style={{ color: B }}>
              As-salamu alaykum! Let's begin with Surah Al-Fatiha. Can you complete this verse?
            </p>
            <div className="absolute -left-2 top-4"
              style={{ width: 0, height: 0, borderTop: '6px solid transparent',
                borderBottom: '6px solid transparent', borderRight: `8px solid ${GR}25` }} />
          </div>
        </motion.div>

        <div className="mb-5">
          <div className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: G }}>Complete the Ayah</div>
          {/* Question Ayah - visually distinct */}
          <div className="rounded-3xl p-6 text-center relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${Y}15 0%, ${Y}05 100%)`, border: `3px solid ${Y}`, boxShadow: `0 4px 20px ${Y}25` }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full" style={{ background: `${Y}15`, filter: 'blur(30px)' }} />
            <p className="text-3xl leading-[2.4] relative z-10" style={{ fontFamily: "'Scheherazade New', serif", direction: 'rtl', color: B, fontWeight: 700 }}>
              ٱلْحَمْدُ لِلَّهِ _____
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-4">
          {options.map(opt => {
            const isSelected = selected === opt.id

            return (
              <motion.button key={opt.id} onClick={() => !showResult && setSelected(opt.id)}
                disabled={showResult}
                whileTap={!showResult ? { scale: 0.97 } : {}}
                className="w-full rounded-2xl p-4 text-center"
                style={{
                  background: '#fff',
                  border: `2px solid ${isSelected ? Y : `${GR}25`}`,
                  boxShadow: isSelected ? `0 0 0 3px ${Y}25` : 'none',
                }}>
                <p className="text-lg leading-[2]" style={{ fontFamily: "'Scheherazade New', serif", direction: 'rtl', color: B }}>
                  {opt.text}
                </p>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Check button */}
      {!showResult && (
        <div className="px-5 pb-8 pt-2">
          <button disabled={!selected} onClick={handleCheck}
            className="w-full py-4 rounded-2xl font-black text-base transition-all active:scale-95"
            style={{
              background: selected ? G : `${GR}25`,
              color: selected ? '#fff' : GR,
              boxShadow: selected ? `0 8px 28px ${G}45` : 'none',
            }}>
            Check
          </button>
        </div>
      )}

      {/* Error popup from bottom */}
      <AnimatePresence>
        {showResult && !correct && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-50 rounded-t-3xl p-6"
            style={{ background: '#ef4444' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
                <span className="text-white text-xl font-black">✕</span>
              </div>
              <span className="text-white font-black text-lg">Incorrect</span>
            </div>
            <div className="mb-4">
              <div className="text-white/80 text-sm font-bold mb-1">Correct Answer:</div>
              <div className="text-white text-xl font-black" style={{ fontFamily: "'Scheherazade New', serif", direction: 'rtl' }}>
                رَبِّ ٱلْعَـٰلَمِينَ
              </div>
            </div>
            <button onClick={() => next()}
              className="w-full py-4 rounded-2xl font-black text-base"
              style={{ background: 'rgba(0,0,0,0.2)', color: '#fff' }}>
              GOT IT
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Screen: Test Question 2 ───────────────────────────────────────
function Test2Screen({ next }: { next: () => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [showEnergy, setShowEnergy] = useState(false)
  const [barGlow, setBarGlow] = useState(false)

  const options = [
    { id: 'a', text: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ' },
    { id: 'b', text: 'ٱللَّهُ ٱلصَّمَدُ' },
    { id: 'c', text: 'لَمْ يَلِدْ وَلَمْ يُولَدْ' },
    { id: 'd', text: 'وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌ' },
  ]

  function handleCheck() {
    if (!selected) return
    const isCorrect = selected === 'c'
    setCorrect(isCorrect)
    setShowResult(true)

    if (isCorrect) {
      setShowEnergy(true)
      setTimeout(() => setBarGlow(true), 500)
      setTimeout(() => next(), 2000)
    }
  }

  return (
    <div className="h-full flex flex-col relative" style={{ background: showResult && !correct ? '#fee' : AS }}>
      <IrabBg color={G} />

      {/* Power orb animation */}
      <AnimatePresence>
        {showEnergy && (
          <motion.div
            className="absolute left-1/2 pointer-events-none z-50"
            style={{ width: 40, height: 40, marginLeft: -20, bottom: 100 }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 2, 1.5, 0.5],
              opacity: [0, 1, 1, 0],
              y: [0, -50, -200, -500],
            }}
            transition={{ duration: 0.7, ease: 'easeOut', times: [0, 0.2, 0.6, 1] }}>
            <div className="absolute inset-0 rounded-full"
              style={{ background: `radial-gradient(circle, ${Y} 0%, ${Y}80 40%, transparent 70%)`, filter: 'blur(8px)' }} />
            <div className="absolute inset-2 rounded-full"
              style={{ background: Y, boxShadow: `0 0 30px ${Y}, 0 0 60px ${Y}, 0 0 90px ${Y}` }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar */}
      <div className="px-5 pt-10 pb-4">
        <div className="h-4 rounded-full overflow-hidden relative" style={{ background: `${GR}25` }}>
          <motion.div
            initial={{ width: '25%' }}
            animate={{
              width: '50%',
              scale: barGlow ? [1, 1.15, 1] : 1,
              boxShadow: barGlow ? [`0 0 0px ${Y}`, `0 0 25px ${Y}, 0 0 50px ${Y}`, `0 0 15px ${Y}`] : 'none',
            }}
            transition={{
              width: { duration: 0.5 },
              scale: { duration: 0.4, delay: 0.5 },
              boxShadow: { duration: 0.6, delay: 0.5 },
            }}
            className="h-full rounded-full relative"
            style={{ background: Y }}>
            {barGlow && (
              <motion.div
                className="absolute inset-0 rounded-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.5, delay: 0.5 }}
                style={{ background: `radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)` }}
              />
            )}
          </motion.div>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col px-5 pt-2 pb-4 overflow-y-auto">
        {/* Sheikha asking */}
        <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
          className="mb-4 flex items-start gap-3">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl shrink-0"
            style={{ background: `${Y}18`, border: `2px solid ${Y}` }}>
            🧕🏽
          </div>
          <div className="flex-1 rounded-2xl p-4 relative"
            style={{ background: '#fff', border: `2px solid ${GR}25` }}>
            <div className="text-[9px] font-black uppercase tracking-wider mb-1" style={{ color: Y }}>Sheikha Fatima asks:</div>
            <p className="text-sm font-bold leading-relaxed" style={{ color: B }}>
              Excellent! Now let's test your knowledge of Surah Al-Ikhlas. Which verse follows?
            </p>
            <div className="absolute -left-2 top-4"
              style={{ width: 0, height: 0, borderTop: '6px solid transparent',
                borderBottom: '6px solid transparent', borderRight: `8px solid ${GR}25` }} />
          </div>
        </motion.div>

        <div className="mb-5">
          <div className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: G }}>What comes next?</div>
          {/* Question Ayah */}
          <div className="rounded-3xl p-6 text-center relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${Y}15 0%, ${Y}05 100%)`, border: `3px solid ${Y}`, boxShadow: `0 4px 20px ${Y}25` }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full" style={{ background: `${Y}15`, filter: 'blur(30px)' }} />
            <p className="text-3xl leading-[2.4] relative z-10" style={{ fontFamily: "'Scheherazade New', serif", direction: 'rtl', color: B, fontWeight: 700 }}>
              ٱللَّهُ ٱلصَّمَدُ
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-4">
          {options.map(opt => {
            const isSelected = selected === opt.id

            return (
              <motion.button key={opt.id} onClick={() => !showResult && setSelected(opt.id)}
                disabled={showResult}
                whileTap={!showResult ? { scale: 0.97 } : {}}
                className="w-full rounded-2xl p-4 text-center"
                style={{
                  background: '#fff',
                  border: `2px solid ${isSelected ? Y : `${GR}25`}`,
                  boxShadow: isSelected ? `0 0 0 3px ${Y}25` : 'none',
                }}>
                <p className="text-lg leading-[2]" style={{ fontFamily: "'Scheherazade New', serif", direction: 'rtl', color: B }}>
                  {opt.text}
                </p>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Check button */}
      {!showResult && (
        <div className="px-5 pb-8 pt-2">
          <button disabled={!selected} onClick={handleCheck}
            className="w-full py-4 rounded-2xl font-black text-base transition-all active:scale-95"
            style={{ background: selected ? G : `${GR}25`, color: selected ? '#fff' : GR, boxShadow: selected ? `0 8px 28px ${G}45` : 'none' }}>
            Check
          </button>
        </div>
      )}

      {/* Error popup */}
      <AnimatePresence>
        {showResult && !correct && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-50 rounded-t-3xl p-6"
            style={{ background: '#ef4444' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
                <span className="text-white text-xl font-black">✕</span>
              </div>
              <span className="text-white font-black text-lg">Incorrect</span>
            </div>
            <div className="mb-4">
              <div className="text-white/80 text-sm font-bold mb-1">Correct Answer:</div>
              <div className="text-white text-xl font-black" style={{ fontFamily: "'Scheherazade New', serif", direction: 'rtl' }}>
                لَمْ يَلِدْ وَلَمْ يُولَدْ
              </div>
            </div>
            <button onClick={() => next()}
              className="w-full py-4 rounded-2xl font-black text-base"
              style={{ background: 'rgba(0,0,0,0.2)', color: '#fff' }}>
              GOT IT
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Screen: Test Question 3 ───────────────────────────────────────
function Test3Screen({ next }: { next: () => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [showEnergy, setShowEnergy] = useState(false)
  const [barGlow, setBarGlow] = useState(false)

  const options = [
    { id: 'a', text: 'نَعْبُدُ' },
    { id: 'b', text: 'نَسْتَعِينُ' },
    { id: 'c', text: 'ٱهْدِنَا' },
    { id: 'd', text: 'صِرَٰطَ' },
  ]

  function handleCheck() {
    if (!selected) return
    const isCorrect = selected === 'b'
    setCorrect(isCorrect)
    setShowResult(true)

    if (isCorrect) {
      setShowEnergy(true)
      setTimeout(() => setBarGlow(true), 500)
      setTimeout(() => next(), 2000)
    }
  }

  return (
    <div className="h-full flex flex-col relative" style={{ background: showResult && !correct ? '#fee' : AS }}>
      <IrabBg color={G} />

      {/* Power orb animation */}
      <AnimatePresence>
        {showEnergy && (
          <motion.div
            className="absolute left-1/2 pointer-events-none z-50"
            style={{ width: 40, height: 40, marginLeft: -20, bottom: 100 }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 2, 1.5, 0.5],
              opacity: [0, 1, 1, 0],
              y: [0, -50, -200, -500],
            }}
            transition={{ duration: 0.7, ease: 'easeOut', times: [0, 0.2, 0.6, 1] }}>
            <div className="absolute inset-0 rounded-full"
              style={{ background: `radial-gradient(circle, ${Y} 0%, ${Y}80 40%, transparent 70%)`, filter: 'blur(8px)' }} />
            <div className="absolute inset-2 rounded-full"
              style={{ background: Y, boxShadow: `0 0 30px ${Y}, 0 0 60px ${Y}, 0 0 90px ${Y}` }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar */}
      <div className="px-5 pt-10 pb-4">
        <div className="h-4 rounded-full overflow-hidden relative" style={{ background: `${GR}25` }}>
          <motion.div
            initial={{ width: '50%' }}
            animate={{
              width: '75%',
              scale: barGlow ? [1, 1.15, 1] : 1,
              boxShadow: barGlow ? [`0 0 0px ${Y}`, `0 0 25px ${Y}, 0 0 50px ${Y}`, `0 0 15px ${Y}`] : 'none',
            }}
            transition={{
              width: { duration: 0.5 },
              scale: { duration: 0.4, delay: 0.5 },
              boxShadow: { duration: 0.6, delay: 0.5 },
            }}
            className="h-full rounded-full relative"
            style={{ background: Y }}>
            {barGlow && (
              <motion.div
                className="absolute inset-0 rounded-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.5, delay: 0.5 }}
                style={{ background: `radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)` }}
              />
            )}
          </motion.div>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col px-5 pt-2 pb-4 overflow-y-auto">
        {/* Sheikh asking */}
        <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
          className="mb-4 flex items-start gap-3">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl shrink-0"
            style={{ background: `${G}18`, border: `2px solid ${G}` }}>
            🧔🏽‍♂️
          </div>
          <div className="flex-1 rounded-2xl p-4 relative"
            style={{ background: '#fff', border: `2px solid ${GR}25` }}>
            <div className="text-[9px] font-black uppercase tracking-wider mb-1" style={{ color: G }}>Sheikh Ahmad asks:</div>
            <p className="text-sm font-bold leading-relaxed" style={{ color: B }}>
              Masha'Allah! You're doing great. Back to Al-Fatiha - can you fill in the missing word?
            </p>
            <div className="absolute -left-2 top-4"
              style={{ width: 0, height: 0, borderTop: '6px solid transparent',
                borderBottom: '6px solid transparent', borderRight: `8px solid ${GR}25` }} />
          </div>
        </motion.div>

        <div className="mb-5">
          <div className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: G }}>Fill in the blank</div>
          {/* Question Ayah */}
          <div className="rounded-3xl p-6 text-center relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${Y}15 0%, ${Y}05 100%)`, border: `3px solid ${Y}`, boxShadow: `0 4px 20px ${Y}25` }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full" style={{ background: `${Y}15`, filter: 'blur(30px)' }} />
            <p className="text-3xl leading-[2.4] relative z-10" style={{ fontFamily: "'Scheherazade New', serif", direction: 'rtl', color: B, fontWeight: 700 }}>
              إِيَّاكَ نَعْبُدُ وَإِيَّاكَ <span style={{ color: Y, textShadow: `0 0 10px ${Y}50` }}>____</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {options.map(opt => {
            const isSelected = selected === opt.id

            return (
              <motion.button key={opt.id} onClick={() => !showResult && setSelected(opt.id)}
                disabled={showResult}
                whileTap={!showResult ? { scale: 0.97 } : {}}
                className="rounded-2xl p-4 text-center"
                style={{
                  background: '#fff',
                  border: `2px solid ${isSelected ? Y : `${GR}25`}`,
                  boxShadow: isSelected ? `0 0 0 3px ${Y}25` : 'none',
                }}>
                <p className="text-lg leading-[1.8]" style={{ fontFamily: "'Scheherazade New', serif", direction: 'rtl', color: B }}>
                  {opt.text}
                </p>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Check button */}
      {!showResult && (
        <div className="px-5 pb-8 pt-2">
          <button disabled={!selected} onClick={handleCheck}
            className="w-full py-4 rounded-2xl font-black text-base transition-all active:scale-95"
            style={{ background: selected ? G : `${GR}25`, color: selected ? '#fff' : GR, boxShadow: selected ? `0 8px 28px ${G}45` : 'none' }}>
            Check
          </button>
        </div>
      )}

      {/* Error popup */}
      <AnimatePresence>
        {showResult && !correct && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-50 rounded-t-3xl p-6"
            style={{ background: '#ef4444' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
                <span className="text-white text-xl font-black">✕</span>
              </div>
              <span className="text-white font-black text-lg">Incorrect</span>
            </div>
            <div className="mb-4">
              <div className="text-white/80 text-sm font-bold mb-1">Correct Answer:</div>
              <div className="text-white text-xl font-black" style={{ fontFamily: "'Scheherazade New', serif", direction: 'rtl' }}>
                نَسْتَعِينُ
              </div>
            </div>
            <button onClick={() => next()}
              className="w-full py-4 rounded-2xl font-black text-base"
              style={{ background: 'rgba(0,0,0,0.2)', color: '#fff' }}>
              GOT IT
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Screen: Test Question 4 ───────────────────────────────────────
function Test4Screen({ next }: { next: () => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [showEnergy, setShowEnergy] = useState(false)
  const [barGlow, setBarGlow] = useState(false)

  const options = [
    { id: 'a', text: 'Madd - Prolongation' },
    { id: 'b', text: 'Sukoon - No vowel' },
    { id: 'c', text: 'Shaddah - Emphasis' },
    { id: 'd', text: 'Tanween - Nunation' },
  ]

  function handleCheck() {
    if (!selected) return
    const isCorrect = selected === 'c'
    setCorrect(isCorrect)
    setShowResult(true)

    if (isCorrect) {
      setShowEnergy(true)
      setTimeout(() => setBarGlow(true), 500)
      setTimeout(() => next(), 2000)
    }
  }

  return (
    <div className="h-full flex flex-col relative" style={{ background: showResult && !correct ? '#fee' : AS }}>
      <IrabBg color={G} />

      {/* Power orb animation */}
      <AnimatePresence>
        {showEnergy && (
          <motion.div
            className="absolute left-1/2 pointer-events-none z-50"
            style={{ width: 40, height: 40, marginLeft: -20, bottom: 100 }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 2, 1.5, 0.5],
              opacity: [0, 1, 1, 0],
              y: [0, -50, -200, -500],
            }}
            transition={{ duration: 0.7, ease: 'easeOut', times: [0, 0.2, 0.6, 1] }}>
            <div className="absolute inset-0 rounded-full"
              style={{ background: `radial-gradient(circle, ${Y} 0%, ${Y}80 40%, transparent 70%)`, filter: 'blur(8px)' }} />
            <div className="absolute inset-2 rounded-full"
              style={{ background: Y, boxShadow: `0 0 30px ${Y}, 0 0 60px ${Y}, 0 0 90px ${Y}` }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar */}
      <div className="px-5 pt-10 pb-4">
        <div className="h-4 rounded-full overflow-hidden relative" style={{ background: `${GR}25` }}>
          <motion.div
            initial={{ width: '75%' }}
            animate={{
              width: '100%',
              scale: barGlow ? [1, 1.15, 1] : 1,
              boxShadow: barGlow ? [`0 0 0px ${Y}`, `0 0 25px ${Y}, 0 0 50px ${Y}`, `0 0 15px ${Y}`] : 'none',
            }}
            transition={{
              width: { duration: 0.5 },
              scale: { duration: 0.4, delay: 0.5 },
              boxShadow: { duration: 0.6, delay: 0.5 },
            }}
            className="h-full rounded-full relative"
            style={{ background: Y }}>
            {barGlow && (
              <motion.div
                className="absolute inset-0 rounded-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.5, delay: 0.5 }}
                style={{ background: `radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)` }}
              />
            )}
          </motion.div>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col px-5 pt-2 pb-4 overflow-y-auto">
        {/* Sheikha asking */}
        <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
          className="mb-4 flex items-start gap-3">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl shrink-0"
            style={{ background: `${Y}18`, border: `2px solid ${Y}` }}>
            🧕🏽
          </div>
          <div className="flex-1 rounded-2xl p-4 relative"
            style={{ background: '#fff', border: `2px solid ${GR}25` }}>
            <div className="text-[9px] font-black uppercase tracking-wider mb-1" style={{ color: Y }}>Sheikha Fatima asks:</div>
            <p className="text-sm font-bold leading-relaxed" style={{ color: B }}>
              Almost done! One final question about Tajweed. Show me what you know! 📖
            </p>
            <div className="absolute -left-2 top-4"
              style={{ width: 0, height: 0, borderTop: '6px solid transparent',
                borderBottom: '6px solid transparent', borderRight: `8px solid ${GR}25` }} />
          </div>
        </motion.div>

        <div className="mb-5">
          <div className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: G }}>Match the symbol</div>
          {/* Question Symbol */}
          <div className="rounded-3xl p-8 text-center relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${Y}15 0%, ${Y}05 100%)`, border: `3px solid ${Y}`, boxShadow: `0 4px 20px ${Y}25` }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full" style={{ background: `${Y}15`, filter: 'blur(30px)' }} />
            <p className="text-7xl relative z-10" style={{ fontFamily: "'Scheherazade New', serif", color: B }}>
              ّ
            </p>
            <p className="text-xs font-semibold mt-3 relative z-10" style={{ color: C }}>This symbol appears above letters</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-4">
          {options.map(opt => {
            const isSelected = selected === opt.id

            return (
              <motion.button key={opt.id} onClick={() => !showResult && setSelected(opt.id)}
                disabled={showResult}
                whileTap={!showResult ? { scale: 0.97 } : {}}
                className="w-full rounded-2xl p-4 text-left"
                style={{
                  background: '#fff',
                  border: `2px solid ${isSelected ? Y : `${GR}25`}`,
                  boxShadow: isSelected ? `0 0 0 3px ${Y}25` : 'none',
                }}>
                <p className="text-base font-bold" style={{ color: B }}>
                  {opt.text}
                </p>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Check button */}
      {!showResult && (
        <div className="px-5 pb-8 pt-2">
          <button disabled={!selected} onClick={handleCheck}
            className="w-full py-4 rounded-2xl font-black text-base transition-all active:scale-95"
            style={{ background: selected ? G : `${GR}25`, color: selected ? '#fff' : GR, boxShadow: selected ? `0 8px 28px ${G}45` : 'none' }}>
            Check
          </button>
        </div>
      )}

      {/* Error popup */}
      <AnimatePresence>
        {showResult && !correct && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-50 rounded-t-3xl p-6"
            style={{ background: '#ef4444' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
                <span className="text-white text-xl font-black">✕</span>
              </div>
              <span className="text-white font-black text-lg">Incorrect</span>
            </div>
            <div className="mb-4">
              <div className="text-white/80 text-sm font-bold mb-1">Correct Answer:</div>
              <div className="text-white text-xl font-black">
                Shaddah - Emphasis
              </div>
            </div>
            <button onClick={() => next()}
              className="w-full py-4 rounded-2xl font-black text-base"
              style={{ background: 'rgba(0,0,0,0.2)', color: '#fff' }}>
              GOT IT
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Screen: Test Results ──────────────────────────────────────────
function TestResultsScreen({ next }: { next: () => void }) {
  const [xp, setXp] = useState(0)
  const score = 4 // Assuming all correct for demo
  const total = 4
  const percentage = Math.round((score / total) * 100)

  useEffect(() => {
    let n = 0
    const iv = setInterval(() => {
      n += 2
      setXp(n)
      if (n >= 50) clearInterval(iv)
    }, 30)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="h-full flex flex-col items-center justify-center px-6" style={{ background: AS }}>
      <IrabBg color={G} />

      <div className="z-10 flex flex-col items-center gap-5 text-center w-full">
        {/* Characters celebrating */}
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
            style={{ background: `${G}18`, border: `2px solid ${G}` }}>
            🧔🏽‍♂️
          </div>
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
            style={{ background: `${Y}18`, border: `2px solid ${Y}` }}>
            🧕🏽
          </div>
        </motion.div>

        {/* Trophy */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 10, delay: 0.3 }}
          className="w-28 h-28 rounded-full flex items-center justify-center"
          style={{ background: `${Y}20`, border: `3px solid ${Y}` }}>
          <Trophy size={52} style={{ color: Y }} />
        </motion.div>

        {/* Title */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
          <h1 className="text-3xl font-black" style={{ color: B }}>Assessment Complete!</h1>
          <p className="text-sm mt-2 font-semibold" style={{ color: C }}>{"Great job! Here's your result"}</p>
        </motion.div>

        {/* Celebration message from teachers */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="w-full rounded-2xl p-4"
          style={{ background: '#fff', border: `2px solid ${GR}25` }}>
          <p className="text-sm font-bold leading-relaxed" style={{ color: B }}>
            <span style={{ color: G }}>Sheikh Ahmad & Sheikha Fatima:</span> "Masha'Allah!
            You've shown great knowledge. May Allah bless your Hifz journey! 🌟"
          </p>
        </motion.div>

        {/* Score */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.7, type: 'spring' }}
          className="w-full rounded-3xl p-6"
          style={{ background: '#fff', border: `2px solid ${GR}25` }}>
          <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: G }}>Your Score</div>
          <div className="text-5xl font-black mb-1" style={{ color: G }}>{score}/{total}</div>
          <div className="text-sm font-bold" style={{ color: C }}>{percentage}% Correct</div>

          <div className="mt-4 pt-4 border-t" style={{ borderColor: `${GR}20` }}>
            <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: Y }}>Level Placement</div>
            <div className="text-lg font-black" style={{ color: B }}>Intermediate</div>
            <p className="text-xs mt-1 font-semibold" style={{ color: C }}>
              {"You'll start with Surah Al-Ikhlas lessons"}
            </p>
          </div>
        </motion.div>

        {/* XP earned */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.9, type: 'spring' }}
          className="rounded-2xl px-8 py-3"
          style={{ background: `${Y}20`, border: `2px solid ${Y}` }}>
          <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: Y }}>XP Earned</div>
          <div className="text-2xl font-black" style={{ color: Y }}>⚡ {xp}</div>
        </motion.div>
      </div>

      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="absolute bottom-8 left-6 right-6 z-10">
        <button onClick={next}
          className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-transform"
          style={{ background: G, color: '#fff', boxShadow: `0 8px 32px ${G}55` }}>
          Continue to Journey →
        </button>
      </motion.div>
    </div>
  )
}

// ── Screen: Celebration ───────────────────────────────────────────
function CelebrationScreen({ next }: { next: () => void }) {
  const [xp,          setXp]          = useState(0)
  const [badgeShown,  setBadgeShown]  = useState(false)
  const [btnVisible,  setBtnVisible]  = useState(false)

  useEffect(() => {
    let n = 0
    const iv = setInterval(() => { n += 3; setXp(n); if (n >= 50) clearInterval(iv) }, 35)
    const t1 = setTimeout(() => setBadgeShown(true), 900)
    const t2 = setTimeout(() => setBtnVisible(true), 1400)
    return () => { clearInterval(iv); clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className="h-full flex flex-col items-center justify-center relative overflow-hidden" style={{ background: B }}>
      <IrabBg color={Y} />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse 75% 65% at 50% 50%, ${G}28 0%, transparent 68%)`,
      }} />

      {/* Confetti */}
      {CONFETTI_ITEMS.map((p, i) => (
        <motion.div key={i} className="absolute pointer-events-none rounded-sm"
          style={{ left: `${p.x}%`, top: '5%', width: p.sz, height: p.sz * 0.55,
            background: p.color, rotate: p.rot }}
          animate={{ y: ['0vh', '110vh'], opacity: [1, 1, 0], rotate: [p.rot, p.rot + 360] }}
          transition={{ duration: 3.5, delay: p.delay, ease: 'easeIn', repeat: Infinity, repeatDelay: 0.5 }} />
      ))}

      <div className="z-10 flex flex-col items-center gap-5 px-6 text-center">
        {/* Mascot */}
        <motion.div animate={{ y: [0, -16, 0], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 1.6 }}>
          <Mascot size={145} />
        </motion.div>

        {/* Title */}
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10, delay: 0.2 }}>
          <div className="text-5xl mb-2">🎉</div>
          <h1 className="text-3xl font-black text-white">{"You're all set!"}</h1>
          <p className="text-sm mt-1.5 font-semibold" style={{ color: `${GR}cc` }}>
            Your Hifz journey starts now
          </p>
        </motion.div>

        {/* XP counter */}
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring' }}
          className="rounded-3xl px-10 py-4"
          style={{ background: `${Y}22`, border: `2.5px solid ${Y}` }}>
          <div className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: Y }}>XP Earned</div>
          <div className="text-4xl font-black" style={{ color: Y }}>⚡ {xp}</div>
        </motion.div>

        {/* Badge */}
        <AnimatePresence>
          {badgeShown && (
            <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 12 }}
              className="flex items-center gap-3 rounded-2xl px-5 py-3"
              style={{ background: `${G}22`, border: `2px solid ${G}` }}>
              <span className="text-2xl">🏅</span>
              <div className="text-left">
                <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: G }}>Badge Unlocked</div>
                <div className="text-sm font-black text-white">First Step Hafiz</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {btnVisible && (
          <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-8 left-6 right-6 z-10">
            <button onClick={next}
              className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-transform"
              style={{ background: G, color: '#fff', boxShadow: `0 8px 32px ${G}55` }}>
              Continue →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Screen: Streak ────────────────────────────────────────────────
function StreakScreen({ next }: { next: () => void }) {
  const days = [
    { label: 'F', done: true },
    { label: 'Sa', done: false },
    { label: 'Su', done: false },
    { label: 'M',  done: false },
    { label: 'Tu', done: false },
    { label: 'W',  done: false },
    { label: 'Th', done: false },
  ]
  return (
    <div className="h-full flex flex-col" style={{ background: AS }}>
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6">
        {/* Big streak number */}
        <motion.div className="flex flex-col items-center"
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 8, stiffness: 100 }}>
          <div className="relative">
            <motion.span
              className="font-black leading-none select-none"
              style={{ fontSize: 110, color: Y, fontFamily: 'Nunito', WebkitTextStroke: `3px #c8a240` }}
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ repeat: Infinity, duration: 2.2 }}>1</motion.span>
            <motion.div className="absolute -top-4 -right-3 text-4xl"
              animate={{ rotate: [0, 18, -18, 0], scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.6 }}>🔥</motion.div>
          </div>
          <h2 className="text-2xl font-black" style={{ color: B }}>day streak!</h2>
          <p className="text-sm font-semibold mt-1" style={{ color: C }}>{"You're off to a flying start!"}</p>
        </motion.div>

        {/* Week grid */}
        <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full rounded-3xl p-5"
          style={{ background: '#fff', border: `1.5px solid ${GR}25`, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          <div className="flex justify-between mb-4">
            {days.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <motion.div
                  initial={d.done ? { scale: 0 } : {}}
                  animate={d.done ? { scale: 1 } : {}}
                  transition={{ type: 'spring', delay: 0.5 + i * 0.06 }}
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background: d.done ? Y : `${GR}20`,
                    border: d.done ? `2.5px solid #c8a240` : `2px solid ${GR}30`,
                    boxShadow: d.done ? `0 4px 12px ${Y}50` : 'none',
                  }}>
                  {d.done && <Check size={16} strokeWidth={3} style={{ color: B }} />}
                </motion.div>
                <span className="text-[10px] font-black" style={{ color: d.done ? B : GR }}>{d.label}</span>
              </div>
            ))}
          </div>
          <div className="pt-3 text-center text-xs font-semibold" style={{ color: C, borderTop: `1px solid ${GR}20` }}>
            Streak resets if you miss a day ·{' '}
            <span style={{ color: Y, fontWeight: 900 }}>{"Don't break the chain!"}</span>
          </div>
        </motion.div>

        {/* Quote */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="w-full rounded-2xl p-4 flex items-center gap-3"
          style={{ background: `${G}12`, border: `1.5px solid ${G}30` }}>
          <Mascot size={56} bounce />
          <p className="text-xs font-semibold flex-1 leading-relaxed" style={{ color: B }}>
            Scholars say:{' '}
            <span style={{ color: G, fontWeight: 900 }}>"Review daily, never delay."</span>
            {' '}Consistency is the key to Hifz!
          </p>
        </motion.div>
      </div>

      <div className="px-6 pb-8 w-full">
        <button onClick={next}
          className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-transform"
          style={{ background: G, color: '#fff', boxShadow: `0 8px 28px ${G}45` }}>
          Continue →
        </button>
      </div>
    </div>
  )
}

// ── Screen: Goal ──────────────────────────────────────────────────
function GoalScreen({ next }: { next: () => void }) {
  const [sel, setSel] = useState(14)
  const goals = [
    { days: 7,  label: 'Strong start',      sub: 'Great for busy schedules', icon: '🌱', xp: '+10 XP/day', color: G },
    { days: 14, label: 'Clearly committed', sub: 'Most popular choice',       icon: '🔥', xp: '+20 XP/day', color: Y },
    { days: 30, label: 'Unstoppable Hafiz', sub: 'For the truly dedicated',   icon: '⚡', xp: '+35 XP/day', color: '#e96868' },
  ]

  return (
    <div className="h-full flex flex-col" style={{ background: AS }}>
      <div className="px-5 pt-10 pb-5">
        <h1 className="text-2xl font-black" style={{ color: B }}>Pick your Hifz commitment</h1>
        <p className="text-sm mt-1 font-semibold" style={{ color: C }}>Set a daily streak goal to stay on track</p>
      </div>

      {/* Goal rows */}
      <div className="flex flex-col gap-3 px-5">
        {goals.map(g => {
          const active = sel === g.days
          return (
            <motion.button key={g.days} onClick={() => setSel(g.days)} whileTap={{ scale: 0.97 }}
              className="w-full rounded-2xl overflow-hidden relative"
              style={{ background: '#fff', border: `${active ? 3 : 2}px solid ${active ? g.color : `${GR}25`}`,
                boxShadow: active ? `0 6px 22px ${g.color}38` : 'none' }}>
              {/* Left accent bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl"
                style={{ background: active ? g.color : 'transparent' }} />
              <div className="px-5 py-4 pl-6 flex items-center gap-4">
                <span className="text-3xl">{g.icon}</span>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-base" style={{ color: B }}>{g.days} days</span>
                    {active && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="text-[9px] font-black px-2 py-0.5 rounded-full"
                        style={{ background: g.color, color: g.days === 14 ? B : '#fff' }}>Selected</motion.span>
                    )}
                  </div>
                  <div className="text-xs font-bold" style={{ color: active ? g.color : C }}>{g.label}</div>
                  <div className="text-[10px] font-semibold" style={{ color: GR }}>{g.sub}</div>
                </div>
                <div className="text-right flex flex-col items-end gap-1.5">
                  <div className="text-xs font-black" style={{ color: g.color }}>{g.xp}</div>
                  <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                    style={{ background: active ? g.color : 'transparent', borderColor: active ? g.color : `${GR}40` }}>
                    {active && <Check size={12} strokeWidth={3} style={{ color: g.days === 14 ? B : '#fff' }} />}
                  </div>
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Mascot hint */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="mx-5 mt-4 p-4 rounded-2xl flex items-center gap-3"
        style={{ background: '#fff', border: `1.5px solid ${GR}20` }}>
        <Mascot size={56} bounce />
        <p className="text-xs font-semibold flex-1 leading-relaxed" style={{ color: B }}>
          {"You'll be "}<span style={{ color: Y, fontWeight: 900 }}>5× more likely</span>
          {" to complete your Hifz with a daily commitment!"}
        </p>
      </motion.div>

      <div className="px-5 pb-8 mt-auto pt-5 flex flex-col gap-3">
        <button onClick={next}
          className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-transform"
          style={{ background: Y, color: B, boxShadow: `0 8px 30px ${Y}55` }}>
          I CAN DO IT! 💪
        </button>
        <button onClick={next} className="text-center text-sm font-bold py-2" style={{ color: GR }}>
          Maybe later
        </button>
      </div>
    </div>
  )
}

// ── Screen: Home ──────────────────────────────────────────────────
function HomeScreen({ onStart }: { onStart: () => void }) {
  const [tab, setTab] = useState<'home' | 'stats' | 'profile'>('home')
  const [showAch, setShowAch] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { const t = setTimeout(() => setShowAch(false), 2800); return () => clearTimeout(t) }, [])
  // Auto-scroll to show the current START level (approx position inside Chapter 2)
  useEffect(() => {
    const t = setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = 720
    }, 400)
    return () => clearTimeout(t)
  }, [])

  const xOffsets: Record<NodePos, string> = {
    left:   'justify-start pl-10',
    center: 'justify-center',
    right:  'justify-end pr-10',
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden" style={{ background: B }}>
      <IrabBg color={Y} />
      <AchievementToast label="Welcome! Journey begins 🌙" icon="🎖️" show={showAch} />

      {/* ── Top bar ── */}
      <div className="z-20 flex items-center justify-between px-5 pt-10 pb-3"
        style={{ background: `${B}f0`, backdropFilter: 'blur(10px)' }}>
        {/* Streak */}
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl"
          style={{ background: `${Y}1a`, border: `1px solid ${Y}35` }}>
          <Flame size={16} style={{ color: Y }} fill={Y} />
          <span className="font-black text-sm" style={{ color: Y }}>1</span>
        </div>

        {/* Logo center */}
        <Logo light />

        {/* XP + Hearts */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-3 py-2 rounded-2xl"
            style={{ background: `${Y}1a`, border: `1px solid ${Y}35` }}>
            <Zap size={13} style={{ color: Y }} />
            <span className="font-black text-sm" style={{ color: Y }}>25</span>
          </div>
          <div className="flex items-center gap-1 px-3 py-2 rounded-2xl"
            style={{ background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.35)' }}>
            <span className="text-red-400 text-xs">❤️</span>
            <span className="font-black text-sm text-red-400">5</span>
          </div>
        </div>
      </div>

      {/* ── Level path ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto z-10 pb-2"
        style={{ scrollbarWidth: 'none' }}>
        {CHAPTERS.map(ch => (
          <div key={ch.id}>
            {/* Chapter banner */}
            <div className="mx-4 my-3 rounded-3xl p-4 relative overflow-hidden"
              style={{
                background: ch.locked ? 'rgba(90,93,104,0.35)' : ch.progress === 100 ? G : `${G}dd`,
                border: ch.locked ? `1px solid ${GR}25` : 'none',
              }}>
              {!ch.locked && <div className="absolute inset-0 opacity-10" style={{ background: `linear-gradient(135deg, #fff 0%, transparent 50%)` }} />}
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <div className="font-black text-sm text-white">{ch.nameEn}</div>
                  <div className="text-[10px] text-white/60 mt-0.5">{ch.ayahCount} Ayahs</div>
                  {ch.locked && (
                    <div className="flex items-center gap-1 mt-1">
                      <Lock size={10} style={{ color: GR }} />
                      <span className="text-[10px] font-bold" style={{ color: GR }}>Complete previous chapter</span>
                    </div>
                  )}
                  {!ch.locked && ch.progress > 0 && ch.progress < 100 && (
                    <div className="mt-2">
                      <div className="w-28 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.25)' }}>
                        <div className="h-full rounded-full" style={{ width: `${ch.progress}%`, background: Y }} />
                      </div>
                      <div className="text-[10px] font-black mt-0.5" style={{ color: Y }}>{ch.progress}% memorised</div>
                    </div>
                  )}
                  {ch.progress === 100 && (
                    <div className="text-[10px] font-black mt-0.5 text-white">✓ Complete!</div>
                  )}
                </div>
                <div style={{ fontFamily: "'Scheherazade New', serif", fontSize: 20,
                  color: ch.locked ? GR : Y, direction: 'rtl' }}>
                  {ch.nameAr}
                </div>
              </div>
            </div>

            {/* Level nodes */}
            {ch.levels.map((lvl, ni) => (
              <div key={lvl.id} className={`flex items-center h-[88px] ${xOffsets[lvl.pos]}`}>
                <div className="flex flex-col items-center gap-1 relative">
                  {/* Mascot next to current node */}
                  {lvl.status === 'current' && (
                    <motion.div
                      animate={{ x: [0, -4, 4, 0] }}
                      transition={{ repeat: Infinity, duration: 3 }}
                      className="absolute -left-16 top-0"
                    >
                      <Mascot size={52} bounce />
                    </motion.div>
                  )}

                  {/* Node circle */}
                  <motion.button
                    onClick={lvl.status === 'current' ? onStart : undefined}
                    whileTap={lvl.status === 'current' ? { scale: 0.9 } : {}}
                    className="w-[68px] h-[68px] rounded-full flex items-center justify-center shadow-lg"
                    style={{
                      background:
                        lvl.status === 'complete' ? `linear-gradient(145deg, ${Y}, #c8a240)` :
                        lvl.status === 'current'  ? `linear-gradient(145deg, ${G}, #04784f)` :
                        'rgba(26,45,61,0.9)',
                      border:
                        lvl.status === 'complete' ? `3px solid #f0d080` :
                        lvl.status === 'current'  ? `3px solid #06c489` :
                        `2px solid ${GR}20`,
                      boxShadow:
                        lvl.status === 'complete' ? `0 6px 20px ${Y}50, inset 0 1px 0 rgba(255,255,255,0.3)` :
                        lvl.status === 'current'  ? `0 0 0 10px ${G}22, 0 8px 28px ${G}55` :
                        'none',
                    }}
                    animate={lvl.status === 'current' ? { boxShadow: [
                      `0 0 0 8px ${G}18, 0 8px 28px ${G}50`,
                      `0 0 0 14px ${G}08, 0 8px 28px ${G}50`,
                      `0 0 0 8px ${G}18, 0 8px 28px ${G}50`,
                    ]} : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    {lvl.trophy && lvl.status === 'complete' ? (
                      <Trophy size={28} style={{ color: B }} />
                    ) : lvl.trophy ? (
                      <Trophy size={26} style={{ color: `${GR}50` }} />
                    ) : lvl.status === 'complete' ? (
                      <Star size={26} fill={B} style={{ color: B }} />
                    ) : lvl.status === 'current' ? (
                      <Play size={26} fill="white" style={{ color: 'white', marginLeft: 3 }} />
                    ) : (
                      <Lock size={18} style={{ color: `${GR}55` }} />
                    )}
                  </motion.button>

                  {/* START label */}
                  {lvl.status === 'current' && (
                    <motion.div
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="rounded-full px-3 py-1 font-black text-[10px] uppercase tracking-widest"
                      style={{ background: Y, color: B }}>
                      START!
                    </motion.div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
        <div className="h-8" />
      </div>

      {/* ── Bottom nav ── */}
      <div className="z-20 flex items-center justify-around px-4 pt-3 pb-5"
        style={{ background: `rgba(8,14,22,0.97)`, borderTop: `1px solid ${GR}18`, backdropFilter: 'blur(12px)' }}>
        {([
          { id: 'home'    as const, Icon: Home,       label: 'Home' },
          { id: 'stats'   as const, Icon: BarChart2,  label: 'Stats' },
          { id: 'profile' as const, Icon: User,       label: 'Profile' },
        ] as const).map(item => (
          <button key={item.id} onClick={() => setTab(item.id)}
            className="flex flex-col items-center gap-1 px-6 py-1">
            <item.Icon size={22}
              style={{ color: tab === item.id ? Y : C }}
              strokeWidth={tab === item.id ? 2.5 : 2} />
            <span className="text-[10px] font-bold"
              style={{ color: tab === item.id ? Y : C }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Screen: Level Intro ───────────────────────────────────────────
function LevelIntroScreen({ next }: { next: () => void }) {
  const [showAch, setShowAch] = useState(true)
  useEffect(() => { const t = setTimeout(() => setShowAch(false), 2500); return () => clearTimeout(t) }, [])

  return (
    <div className="h-full flex flex-col" style={{ background: AS }}>
      <AchievementToast label="Profile Complete! +30 XP" icon="🎖️" show={showAch} />
      <div className="mx-4 mt-10 mb-4 rounded-3xl p-5 relative overflow-hidden" style={{ background: B }}>
        <IrabBg color={Y} />
        <div className="relative z-10 flex items-center gap-4">
          <Mascot size={80} bounce />
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: Y }}>Level Assessment</div>
            <h1 className="text-xl font-black text-white leading-tight">{"Let's find your\nstarting point"}</h1>
          </div>
        </div>
        <p className="relative z-10 text-sm mt-3 font-semibold" style={{ color: `${GR}cc` }}>
          A short test using Surah Al-Fatiha & Al-Ikhlas.
        </p>
      </div>
      <div className="flex gap-3 px-4 mb-4">
        {[
          { icon: '❓', val: '4', label: 'Questions' },
          { icon: '⏱️', val: '~3 min', label: 'Duration' },
          { icon: '⚡', val: '50 XP', label: 'Reward' },
          { icon: '🏆', val: 'Badge', label: 'On complete' },
        ].map(s => (
          <div key={s.label} className="flex-1 rounded-2xl py-3 px-1.5 text-center"
            style={{ background: '#fff', border: `1.5px solid ${GR}25` }}>
            <div className="text-lg">{s.icon}</div>
            <div className="text-[11px] font-black" style={{ color: ['Reward','On complete'].includes(s.label) ? Y : B }}>{s.val}</div>
            <div className="text-[9px] font-semibold" style={{ color: GR }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="mx-4 mb-4 rounded-3xl p-4" style={{ background: '#fff', border: `1.5px solid ${GR}25` }}>
        <div className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: G }}>What to expect</div>
        {[
          { icon: '✍️', label: 'Complete the Ayah',  desc: 'Fill in missing words' },
          { icon: '⏭️', label: 'What comes next?',   desc: 'Recall the following Ayah' },
          { icon: '🔤', label: 'Fill in the blank',  desc: 'Word bank selection' },
          { icon: '🔗', label: 'Match the pairs',    desc: 'Tajweed symbols & meanings' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3 py-2 border-b last:border-b-0"
            style={{ borderColor: `${GR}20` }}>
            <span className="text-lg w-7 text-center">{item.icon}</span>
            <div>
              <div className="text-xs font-black" style={{ color: B }}>{item.label}</div>
              <div className="text-[10px] font-semibold" style={{ color: C }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 pb-8 mt-auto">
        <button onClick={next}
          className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-transform"
          style={{ background: G, color: '#fff', boxShadow: `0 8px 28px ${G}40` }}>
          Start the Test →
        </button>
      </div>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [script, setScript] = useState<Script>('uthmani')
  const go = (s: Screen) => setScreen(s)

  const screens: Record<Screen, React.ReactNode> = {
    splash:         <SplashScreen next={() => go('welcome')} />,
    welcome:        <WelcomeScreen onSignup={() => go('signup')} onLogin={() => go('login')} />,
    signup:         <SignUpScreen next={() => go('verify')} onLogin={() => go('login')} onBack={() => go('welcome')} />,
    login:          <LoginScreen next={() => go('purpose')} onSignup={() => go('signup')} onBack={() => go('welcome')} />,
    verify:         <VerifyScreen next={() => go('purpose')} onBack={() => go('signup')} />,
    purpose:        <PurposeScreen next={() => go('script')} onBack={() => go('verify')} />,
    script:         <ScriptScreen next={() => go('intro')} setScript={setScript} onBack={() => go('purpose')} />,
    intro:          <IntroScreen next={() => go('path')} onBack={() => go('script')} />,
    path:           <PathScreen next={() => go('test-intro')} onBack={() => go('intro')} />,
    'test-intro':   <TestIntroScreen next={() => go('test-1')} onBack={() => go('path')} />,
    'test-1':       <Test1Screen next={() => go('test-2')} />,
    'test-2':       <Test2Screen next={() => go('test-3')} />,
    'test-3':       <Test3Screen next={() => go('test-4')} />,
    'test-4':       <Test4Screen next={() => go('test-results')} />,
    'test-results': <TestResultsScreen next={() => go('celebrate')} />,
    celebrate:      <CelebrationScreen next={() => go('streak')} />,
    streak:         <StreakScreen next={() => go('goal')} />,
    goal:           <GoalScreen next={() => go('home')} />,
    home:           <HomeScreen onStart={() => go('level-intro')} />,
    'level-intro':  <LevelIntroScreen next={() => go('home')} />,
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#080e16' }}>
      <div className="w-full max-w-[390px] overflow-hidden shadow-2xl shadow-black/70"
        style={{ height: 'min(844px, 100svh)', borderRadius: 'clamp(0px, 4vw, 36px)' }}>
        <AnimatePresence mode="wait">
          <motion.div key={screen} className="h-full"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}>
            {screens[screen]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
