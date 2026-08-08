'use client'
import { useState, useEffect } from 'react'

export type GuideStep = {
  title: string
  body: string
}

export default function PageGuide({ pageKey, steps, accent, textColor }: {
  pageKey: string        // unique per page, e.g. 'team'
  steps: GuideStep[]
  accent: string
  textColor: string
}) {
  const storageKey = `gf-guide-${pageKey}`
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    try {
      if (!localStorage.getItem(storageKey)) setOpen(true)
    } catch { /* private browsing: just don't auto-open */ }
  }, [storageKey])

  function close() {
    setOpen(false)
    setStep(0)
    try { localStorage.setItem(storageKey, 'seen') } catch { /* ignore */ }
  }

  function next() {
    if (step + 1 >= steps.length) { close(); return }
    setStep(step + 1)
  }

  return (
    <>
      {/* Replay button — always available */}
      <button onClick={() => { setStep(0); setOpen(true) }}
        title="Page guide"
        className="fixed z-40 rounded-full font-black text-sm transition-all hover:scale-110"
        style={{
          bottom: '18px', right: '18px', width: '38px', height: '38px',
          color: accent, background: '#000000B0', border: `1px solid ${accent}60`,
          backdropFilter: 'blur(4px)',
        }}>
        ?
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-5"
          style={{ background: '#000000C0', backdropFilter: 'blur(3px)' }}
          onClick={close}>
          <div className="w-full rounded-2xl gf-pop" style={{ maxWidth: '400px', background: '#181510', border: `1px solid ${accent}50`, padding: '28px', boxShadow: `0 0 40px ${accent}25` }}
            onClick={e => e.stopPropagation()}>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-3" style={{ color: accent }}>
              Quick guide · {step + 1} of {steps.length}
            </p>
            <h3 className="text-lg font-black mb-2" style={{ fontFamily: 'var(--font-heading)', color: textColor }}>
              {steps[step].title}
            </h3>
            <p className="text-sm leading-relaxed mb-6" style={{ color: `${textColor}90` }}>
              {steps[step].body}
            </p>
            <div className="flex items-center justify-between">
              <button onClick={close} className="text-[11px] font-bold uppercase tracking-widest" style={{ color: `${textColor}50` }}>
                Skip
              </button>
              <button onClick={next}
                className="text-xs font-black uppercase tracking-widest rounded-full px-7 py-3 transition-all hover:scale-[1.03]"
                style={{ color: '#141210', background: accent }}>
                {step + 1 >= steps.length ? 'Got it' : 'Next'}
              </button>
            </div>
            {/* Step dots */}
            <div className="flex justify-center gap-1.5 mt-5">
              {steps.map((_, i) => (
                <span key={i} className="rounded-full" style={{ width: '6px', height: '6px', background: i === step ? accent : '#ffffff20' }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}