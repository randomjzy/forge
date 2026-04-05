import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

// GET /api/agents/avatars - get all agent avatars, or a specific avatar file via ?agentId=
export async function GET(req: NextRequest) {
  const db = getDb()
  const agentId = req.nextUrl.searchParams.get('agentId')

  if (!agentId) {
    const avatars = db.prepare('SELECT * FROM agent_avatars').all() as { agent_id: string; avatar_path: string }[]
    return NextResponse.json(avatars)
  }

  const row = db.prepare('SELECT avatar_path FROM agent_avatars WHERE agent_id = ?').get(agentId) as { avatar_path: string } | undefined

  if (!row || !row.avatar_path) {
    return NextResponse.json({ error: 'Avatar not found' }, { status: 404 })
  }

  const fullPath = row.avatar_path.replace(/^~/, process.env.HOME || '')

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: 'Avatar file not found' }, { status: 404 })
  }

  const ext = path.extname(fullPath).toLowerCase()
  const contentTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  }
  const contentType = contentTypes[ext] || 'application/octet-stream'

  try {
    const buffer = fs.readFileSync(fullPath)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to read avatar file' }, { status: 500 })
  }
}

// POST /api/agents/avatars - upload avatar for an agent
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const agentId = formData.get('agentId') as string
    const file = formData.get('file') as File | null

    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 })
    }

    const db = getDb()

    // If no file provided, remove the avatar
    if (!file) {
      // Get existing avatar path to delete the file
      const existing = db.prepare('SELECT avatar_path FROM agent_avatars WHERE agent_id = ?').get(agentId) as { avatar_path: string } | undefined
      if (existing && existing.avatar_path) {
        try {
          const fullPath = existing.avatar_path.replace(/^~/, process.env.HOME || '')
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath)
          }
        } catch { /* ignore file deletion errors */ }
      }
      db.prepare('DELETE FROM agent_avatars WHERE agent_id = ?').run(agentId)
      return NextResponse.json({ ok: true })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG are allowed.' }, { status: 400 })
    }

    // Max size: 2MB
    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Max size is 2MB.' }, { status: 400 })
    }

    // Get existing avatar path to delete old file
    const existing = db.prepare('SELECT avatar_path FROM agent_avatars WHERE agent_id = ?').get(agentId) as { avatar_path: string } | undefined
    if (existing && existing.avatar_path) {
      try {
        const fullPath = existing.avatar_path.replace(/^~/, process.env.HOME || '')
        if (fs.existsSync(fullPath) && !fullPath.includes('default')) {
          fs.unlinkSync(fullPath)
        }
      } catch { /* ignore file deletion errors */ }
    }

    // Create avatars directory
    const avatarsDir = path.join(process.env.HOME || '', '.forge', 'avatars')
    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true })
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'png'
    const filename = `${agentId}-${crypto.randomUUID().slice(0, 8)}.${ext}`
    const filePath = path.join(avatarsDir, filename)

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filePath, buffer)

    // Store in database
    const avatarPath = filePath.replace(/\\/g, '/').replace(process.env.HOME || '', '~')
    db.prepare(`
      INSERT INTO agent_avatars (agent_id, avatar_path, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(agent_id) DO UPDATE SET avatar_path = excluded.avatar_path, updated_at = datetime('now')
    `).run(agentId, avatarPath)

    return NextResponse.json({ ok: true, avatarPath })
  } catch (err) {
    console.error('[avatar upload]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
