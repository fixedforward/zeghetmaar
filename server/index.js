const http = require('http')
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const configPath = path.join(__dirname, 'config.json')
let config = {}

try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
} catch (e) {
  // Config file is optional when the API key is provided via environment variable
  console.warn('Warning: server/config.json not found or unreadable. Falling back to environment variables.')
}

// Resolve the API key: environment variable takes precedence over config file.
// This allows deployment without a config.json by setting the env var instead.
const OPENROUTER_API_KEY = process.env.openrouterApiKey || config.openrouterApiKey

if (!OPENROUTER_API_KEY) {
  console.error(
    'Error: OpenRouter API key is missing.\n' +
    '  Set the environment variable "openrouterApiKey", or add "openrouterApiKey" to server/config.json.'
  )
  process.exit(1)
}

// Resolve the model: environment variable takes precedence over config file,
// with a hardcoded default as final fallback.
const MODEL = process.env.model || config.model || 'openai/gpt-4o-mini'

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'GET' && req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
  } else if (req.method === 'POST' && req.url === '/api/chat') {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', async () => {
      try {
        const { text, prompt, model } = JSON.parse(body)
        if (!prompt) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Prompt is required' }))
          return
        }

        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: model || MODEL,
            messages: [
              { role: 'system', content: prompt },
              { role: 'user', content: text }
            ],
            stream: false,
            extra_body: { cache: true }
          },
          {
            headers: {
              'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'http://localhost:3000',
              'X-Title': 'Dutch Tutor'
            }
          }
        )

        const aiResponse = response.data.choices[0].message.content
        const cached = response.headers['openrouter-calculation-cache-hit'] === 'true'
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ response: aiResponse, cached }))
      } catch (error) {
        const status = error.response?.status
        const detail = error.response ? JSON.stringify(error.response.data) : error.message
        console.error(`[/api/chat] OpenRouter request failed${status ? ` (HTTP ${status})` : ''}: ${detail}`)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Failed to get response from AI' }))
      }
    })
  } else if (req.method === 'POST' && req.url === '/api/restart') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ message: 'Restarting server...' }))
    console.log('Restarting server...')
    setTimeout(() => {
      spawn('node', [__filename], { detached: true, stdio: 'ignore' })
      process.exit(0)
    }, 1000)
  } else if (req.method === 'GET' && req.url === '/api/config') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ model: MODEL }))
  } else {
    res.writeHead(404)
    res.end()
  }
})

// get-port is ESM-only, so we use a dynamic import and wrap startup in an async function.
// The chosen port is written to server/port.json so the frontend can read it on startup.
const portFilePath = path.join(__dirname, 'port.json')

async function start() {
  const { default: getPort } = await import('get-port')
  // Find a free port, preferring 9292 for local convenience
  const PORT = await getPort({ port: 9292 })

  console.log(`Starting backend on port ${PORT}...`)

  // Persist the port so the frontend knows where to connect
  fs.writeFileSync(portFilePath, JSON.stringify({ port: PORT }))

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

start()
