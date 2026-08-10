'use client'
import { useState, useEffect } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Already installed? Never prompt.
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true
    if (standalone) return
    try { if (localStorage.getItem('gf-install-dismissed')) return } catch { /* ignore */ }

    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
    setIsIOS(ios)
    if (ios) { setShow(true); return }

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  function dismiss() {
    setShow(false)
    try { localStorage.setItem('gf-install-dismissed', '1') } catch { /* ignore */ }
  }

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    dismiss()
  }

  if (!show) return null

  return (
    <div className="fixed left-3 right-3 z-[60] rounded-2xl"
      style={{ bottom: '16px', background: '#181510F5', border: '1px solid #E8C15A60', boxShadow: '0 0 30px #00000090', padding: '16px 18px', backdropFilter: 'blur(8px)', maxWidth: '460px', marginLeft: 'auto', marginRight: 'auto' }}>
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" style={{ width: '40px', height: '40px', borderRadius: '9px' }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black" style={{ fontFamily: 'var(--font-heading)', color: '#F5F1E8' }}>Add to your home screen</p>
          {isIOS ? (
            <p className="text-[11px] leading-relaxed mt-1" style={{ color: '#F5F1E8AA' }}>
              Tap the Share button, then <span style={{ color: '#E8C15A', fontWeight: 700 }}>Add to Home Screen</span> — opens like an app, full screen.
            </p>
          ) : (
            <p className="text-[11px] leading-relaxed mt-1" style={{ color: '#F5F1E8AA' }}>
              Install Grassroots Fantasy for instant access and a full-screen experience.
            </p>
          )}
          <div className="flex items-center gap-3 mt-3">
            {!isIOS && (
              <button onClick={install}
                className="text-[11px] font-black uppercase tracking-widest rounded-full"
                style={{ color: '#141210', background: '#E8C15A', padding: '9px 20px' }}>
                Install
              </button>
            )}
            <button onClick={dismiss}
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: '#F5F1E870', background: 'none', border: 'none' }}>
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}