import net from 'net'

const HOST = '127.0.0.1'
const PORT = 9876
const TIMEOUT_MS = 30_000

export async function evalRuby(code: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()
    let buffer = ''

    socket.setTimeout(TIMEOUT_MS)

    socket.connect(PORT, HOST, () => {
      const req = JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'eval_ruby', arguments: { code } },
        id: 1,
      }) + '\n'
      socket.write(req)
    })

    socket.on('data', (chunk) => {
      buffer += chunk.toString()
      try {
        const res = JSON.parse(buffer)
        socket.destroy()
        if (res.error) reject(new Error(res.error.message ?? 'SketchUp error'))
        else if (res.result?.isError) reject(new Error(res.result.content?.[0]?.text ?? 'SketchUp error'))
        else resolve(res.result?.content?.[0]?.text ?? res.result?.result ?? '')
      } catch {
        // incomplete JSON — keep reading
      }
    })

    socket.on('timeout', () => {
      socket.destroy()
      reject(new Error('SketchUp timeout — make sure SketchUp is open with MCP server running'))
    })

    socket.on('error', (err) => {
      reject(new Error(
        `Cannot connect to SketchUp on port ${PORT}. ` +
        `Open SketchUp and go to Extensions > SketchUp MCP > Start Server. (${err.message})`
      ))
    })
  })
}

export async function isSketchUpRunning(): Promise<boolean> {
  try {
    await evalRuby('"ping"')
    return true
  } catch {
    return false
  }
}
