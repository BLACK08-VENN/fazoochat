;(function () {
  // Fazoo embeddable widget (vanilla JS) — Futuristic Edition
  // Usage:
  //   <script src="https://YOUR-FAZOO-DOMAIN.com/widget.js"
  //     data-assistant-id="ASSISTANT_ID"
  //     data-widget-url="https://your-app.com/widget"
  //     data-primary-color="#f97316"
  //     data-position="bottom-right"
  //     data-button-label="Chat with us"
  //   ></script>

  function getAttr(name, fallback) {
    try {
      var scripts = document.getElementsByTagName('script')
      var thisScript = scripts[scripts.length - 1]
      return thisScript.getAttribute(name) || fallback
    } catch (e) {
      return fallback
    }
  }

  var assistantId = getAttr('data-assistant-id', '')
  var widgetUrl = getAttr('data-widget-url', '')
  var primaryColor = getAttr('data-primary-color', '#f97316')
  var position = getAttr('data-position', 'bottom-right')
  var buttonLabel = getAttr('data-button-label', '\uD83D\uDCAC')
  var buttonTitle = getAttr('data-button-title', 'Chat with us')

  if (!widgetUrl) {
    widgetUrl = 'https://YOUR-FAZOO-DOMAIN.com/widget'
  }

  // Inject styles
  var style = document.createElement('style')
  style.textContent = [
    '@keyframes fazoo-pulse-ring {',
    '  0% { transform: scale(1); opacity: 0.5; }',
    '  100% { transform: scale(1.6); opacity: 0; }',
    '}',
    '@keyframes fazoo-btn-in {',
    '  from { transform: scale(0) rotate(-180deg); opacity: 0; }',
    '  to { transform: scale(1) rotate(0deg); opacity: 1; }',
    '}',
    '@keyframes fazoo-iframe-in {',
    '  from { transform: scale(0.9) translateY(20px); opacity: 0; }',
    '  to { transform: scale(1) translateY(0); opacity: 1; }',
    '}',
    '@keyframes fazoo-shimmer {',
    '  0% { background-position: -200% center; }',
    '  100% { background-position: 200% center; }',
    '}',
    '#fazoo-chat-button {',
    '  animation: fazoo-btn-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;',
    '  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);',
    '  position: relative;',
    '  overflow: hidden;',
    '}',
    '#fazoo-chat-button::before {',
    '  content: "";',
    '  position: absolute;',
    '  inset: -4px;',
    '  border-radius: 50%;',
    '  background: conic-gradient(from 0deg, ' + primaryColor + ', #9333ea, ' + primaryColor + ');',
    '  animation: fazoo-pulse-ring 2s ease-out infinite;',
    '  z-index: -1;',
    '  pointer-events: none;',
    '}',
    '#fazoo-chat-button::after {',
    '  content: "";',
    '  position: absolute;',
    '  inset: 0;',
    '  border-radius: 50%;',
    '  background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%);',
    '  pointer-events: none;',
    '}',
    '#fazoo-chat-button:hover {',
    '  transform: scale(1.1);',
    '  box-shadow: 0 0 30px ' + primaryColor + '66, 0 8px 24px rgba(0,0,0,0.3);',
    '}',
    '#fazoo-chat-iframe {',
    '  animation: fazoo-iframe-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;',
    '  border: none;',
    '  border-radius: 16px;',
    '  box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 40px ' + primaryColor + '15;',
    '  overflow: hidden;',
    '}'
  ].join('\n')
  document.head.appendChild(style)

  var posStyles = { right: '20px', bottom: '20px', left: 'auto', top: 'auto' }
  if (position === 'bottom-left') {
    posStyles = { left: '20px', bottom: '20px', right: 'auto', top: 'auto' }
  } else if (position === 'top-right') {
    posStyles = { right: '20px', top: '20px', bottom: 'auto', left: 'auto' }
  } else if (position === 'top-left') {
    posStyles = { left: '20px', top: '20px', right: 'auto', bottom: 'auto' }
  }

  function createButton() {
    var btn = document.createElement('button')
    btn.id = 'fazoo-chat-button'
    btn.style.position = 'fixed'
    btn.style.right = posStyles.right
    btn.style.bottom = posStyles.bottom
    btn.style.left = posStyles.left
    btn.style.top = posStyles.top
    btn.style.width = '60px'
    btn.style.height = '60px'
    btn.style.borderRadius = '30px'
    btn.style.background = 'linear-gradient(135deg, ' + primaryColor + ', #9333ea)'
    btn.style.color = 'white'
    btn.style.border = 'none'
    btn.style.boxShadow = '0 0 20px ' + primaryColor + '44, 0 6px 20px rgba(0,0,0,0.25)'
    btn.style.cursor = 'pointer'
    btn.style.zIndex = '2147483647'
    btn.style.fontSize = '24px'
    btn.style.lineHeight = '1'
    btn.innerText = buttonLabel
    btn.title = buttonTitle
    btn.setAttribute('aria-expanded', 'false')
    btn.setAttribute('aria-label', buttonTitle)
    return btn
  }

  function createIframe(src) {
    var iframe = document.createElement('iframe')
    iframe.src = src
    iframe.id = 'fazoo-chat-iframe'
    iframe.style.position = 'fixed'
    iframe.style.right = posStyles.right
    iframe.style.left = posStyles.left
    iframe.style.bottom = '92px'
    iframe.style.top = 'auto'
    iframe.style.width = '380px'
    iframe.style.height = '540px'
    iframe.style.display = 'none'
    iframe.style.background = '#0a0a12'
    iframe.setAttribute('aria-hidden', 'true')
    iframe.setAttribute('title', 'Fazoo chat')
    return iframe
  }

  var src = widgetUrl + (widgetUrl.indexOf('?') === -1 ? '?' : '&') + 'assistantId=' + encodeURIComponent(assistantId)

  var btn = createButton()
  var iframe = createIframe(src)

  function toggle() {
    if (iframe.style.display === 'none') {
      iframe.style.display = 'block'
      iframe.style.animation = 'none'
      iframe.offsetHeight // reflow
      iframe.style.animation = 'fazoo-iframe-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both'
      iframe.setAttribute('aria-hidden', 'false')
      btn.setAttribute('aria-expanded', 'true')
    } else {
      iframe.style.display = 'none'
      iframe.setAttribute('aria-hidden', 'true')
      btn.setAttribute('aria-expanded', 'false')
    }
  }

  btn.addEventListener('click', function (e) {
    e.preventDefault()
    toggle()
  })

  function mount() {
    if (!document.body) return setTimeout(mount, 50)
    document.body.appendChild(btn)
    document.body.appendChild(iframe)
  }

  mount()

  window.FazooWidget = window.FazooWidget || {
    open: function () {
      iframe.style.display = 'block'
      iframe.style.animation = 'none'
      iframe.offsetHeight
      iframe.style.animation = 'fazoo-iframe-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both'
      iframe.setAttribute('aria-hidden', 'false')
      btn.setAttribute('aria-expanded', 'true')
    },
    close: function () {
      iframe.style.display = 'none'
      iframe.setAttribute('aria-hidden', 'true')
      btn.setAttribute('aria-expanded', 'false')
    },
    toggle: toggle,
    setColor: function (color) {
      primaryColor = color
      btn.style.background = 'linear-gradient(135deg, ' + color + ', #9333ea)'
      btn.style.boxShadow = '0 0 20px ' + color + '44, 0 6px 20px rgba(0,0,0,0.25)'
    }
  }
})()
