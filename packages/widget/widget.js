;(function () {
  // Fazoo embeddable widget (vanilla JS)
  // Usage:
  //   <script src="https://YOUR-FAZOO-DOMAIN.com/widget.js"
  //     data-assistant-id="ASSISTANT_ID"
  //     data-widget-url="https://your-app.com/widget"
  //     data-primary-color="#2563eb"
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
  var primaryColor = getAttr('data-primary-color', '#2563eb')
  var position = getAttr('data-position', 'bottom-right')
  var buttonLabel = getAttr('data-button-label', '\uD83D\uDCAC')
  var buttonTitle = getAttr('data-button-title', 'Chat with us')

  if (!widgetUrl) {
    widgetUrl = 'https://YOUR-FAZOO-DOMAIN.com/widget'
  }

  // Position styles
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
    btn.style.width = '56px'
    btn.style.height = '56px'
    btn.style.borderRadius = '28px'
    btn.style.background = primaryColor
    btn.style.color = 'white'
    btn.style.border = 'none'
    btn.style.boxShadow = '0 6px 18px rgba(16,24,40,0.15)'
    btn.style.cursor = 'pointer'
    btn.style.zIndex = '2147483647'
    btn.style.fontSize = '22px'
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
    iframe.style.bottom = '88px'
    iframe.style.top = 'auto'
    iframe.style.width = '360px'
    iframe.style.height = '520px'
    iframe.style.border = '1px solid rgba(0,0,0,0.08)'
    iframe.style.borderRadius = '12px'
    iframe.style.boxShadow = '0 10px 30px rgba(2,6,23,0.2)'
    iframe.style.zIndex = '2147483647'
    iframe.style.display = 'none'
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
      btn.style.background = color
    }
  }
})()
