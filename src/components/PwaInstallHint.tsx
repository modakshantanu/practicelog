import { useEffect, useMemo, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const HIDE_KEY = 'pwa_install_hint_hidden_v1'

function getPlatform() {
  const ua = window.navigator.userAgent.toLowerCase()
  const isIos = /iphone|ipad|ipod/.test(ua)
  const isAndroid = /android/.test(ua)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  const isSafari = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua)

  return {
    isIos,
    isAndroid,
    isSafari,
    isStandalone,
  }
}

export function PwaInstallHint() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(HIDE_KEY) === '1'
  })

  const platform = useMemo(() => getPlatform(), [])

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    }
  }, [])

  const canShow = !dismissed && !platform.isStandalone
  if (!canShow) {
    return null
  }

  const showIosInstructions = platform.isIos && platform.isSafari
  const showNativeInstallButton = !showIosInstructions && deferredPrompt != null

  const dismiss = () => {
    localStorage.setItem(HIDE_KEY, '1')
    setDismissed(true)
  }

  const installNow = async () => {
    if (!deferredPrompt) {
      return
    }

    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') {
      dismiss()
    }
    setDeferredPrompt(null)
  }

  return (
    <aside className="pwa-hint" role="status" aria-live="polite">
      <div className="pwa-hint-head">
        <strong>Install Practice Log</strong>
      </div>

      {showIosInstructions && (
        <p className="muted">
          On iPhone Safari: tap Share, then Add to Home Screen.
        </p>
      )}

      {!showIosInstructions && platform.isAndroid && (
        <p className="muted">Install from browser menu or use the button below.</p>
      )}

      {!showIosInstructions && !platform.isAndroid && (
        <p className="muted">Install from your browser address bar or app menu.</p>
      )}

      <div className="actions">
        {showNativeInstallButton && (
          <button type="button" className="btn primary" onClick={installNow}>
            Install app
          </button>
        )}
        <button type="button" className="btn ghost" onClick={dismiss}>
          Dismiss
        </button>
      </div>
    </aside>
  )
}
