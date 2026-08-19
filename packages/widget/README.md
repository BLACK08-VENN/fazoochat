# Fazoo Embeddable Widget

A minimal embeddable chat widget script that can be hosted on your Fazoo domain and embedded on any website.

## Quick Start

Place before `</body>`:

```html
<script
  src="https://YOUR-FAZOO-DOMAIN.com/widget.js"
  data-assistant-id="ASSISTANT_ID"
></script>
```

## Configuration Attributes

| Attribute | Default | Description |
|---|---|---|
| `data-assistant-id` | (required) | The assistant ID to connect to |
| `data-widget-url` | `https://YOUR-FAZOO-DOMAIN.com/widget` | Full URL where the widget UI is hosted |
| `data-primary-color` | `#2563eb` | Primary brand color (hex) |
| `data-position` | `bottom-right` | Button position: `bottom-right`, `bottom-left`, `top-right`, `top-left` |
| `data-button-label` | `💬` | Button text/emoji |
| `data-button-title` | `Chat with us` | Button tooltip text |

## Full Example

```html
<script
  src="https://fazoo.example.com/widget.js"
  data-assistant-id="a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  data-widget-url="https://fazoo.example.com/widget"
  data-primary-color="#f97316"
  data-position="bottom-left"
  data-button-label="Ask us"
  data-button-title="Chat with our team"
></script>
```

## JavaScript API

The widget exposes a `window.FazooWidget` object:

```js
FazooWidget.open()              // Open the chat
FazooWidget.close()             // Close the chat
FazooWidget.toggle()            // Toggle open/close
FazooWidget.setColor('#9333ea') // Change primary color dynamically
```

## How It Works

1. The script injects a floating button and an iframe into the host page
2. The iframe loads the hosted widget UI (`/widget?assistantId=...`)
3. The widget UI calls the Fazoo public chat API (`/chat/public`) to send messages
4. The RAG pipeline retrieves relevant knowledge and generates responses via Gemini

## Security

- No service keys are included in the widget script
- All sensitive operations happen server-side
- Public chat endpoints are rate-limited (20 req/min per IP)
- Customer data is isolated by organization via RLS policies
