const http = require('http')
const WebSocket = require('ws')
const axios = require('axios')
const fs = require('fs')
const path = require('path')

const configPath = path.join(__dirname, 'config.json')
let config = {}

try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
} catch (e) {
  console.error('Config file not found. Please create server/config.json')
  process.exit(1)
}

const OPENROUTER_API_KEY = config.openrouterApiKey
const MODEL = config.model || 'meta-llama/llama-3.2-3b-instruct'
const DEFAULT_PROMPT = config.defaultPrompt || `You are a Dutch to English language tutor. When the user types a Dutch sentence:
1. Provide the English translation
2. Explain what was wrong or not optimal (if anything), max 5 sentences
3. Suggest a better way to say it (if applicable)

Keep feedback concise, max 5 sentences total.`

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', async () => {
      try {
        const { text, prompt } = JSON.parse(body)
        const systemPrompt = prompt || DEFAULT_PROMPT

        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: text }
            ],
            stream: false
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
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ response: aiResponse }))
      } catch (error) {
        console.error('Error:', error.message)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Failed to get response from AI' }))
      }
    })
  } else {
    res.writeHead(404)
    res.end()
  }
})

const wss = new WebSocket.Server({ server })

wss.on('connection', (ws) => {
  console.log('WebSocket client connected')

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message)
      
      if (data.type === 'message') {
        const systemPrompt = data.prompt || DEFAULT_PROMPT
        
        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: data.text }
            ],
            stream: true
          },
          {
            headers: {
              'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'http://localhost:3000',
              'X-Title': 'Dutch Tutor'
            },
            responseType: 'stream'
          }
        )

        response.data.on('data', (chunk) => {
          const lines = chunk.toString().split('\n').filter(line => line.trim() !== '')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6)
              if (jsonStr === '[DONE]') {
                ws.send(JSON.stringify({ type: 'done' }))
                return
              }
              try {
                const parsed = JSON.parse(jsonStr)
                const content = parsed.choices[0]?.delta?.content
                if (content) {
                  ws.send(JSON.stringify({ type: 'chunk', content }))
                }
              } catch (e) {}
            }
          }
        })
      }
    } catch (error) {
      console.error('WebSocket error:', error.message)
      ws.send(JSON.stringify({ type: 'error', content: error.message }))
    }
  })

  ws.on('close', () => {
    console.log('WebSocket client disconnected')
  })
})

const PORT = 8080
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`WebSocket server running on ws://localhost:${PORT}`)
})