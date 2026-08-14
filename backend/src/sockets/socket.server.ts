import { Server as SocketIOServer } from 'socket.io'
import http from 'http'
import { supabaseAdmin } from '../lib/supabase'

export function setupSocketIO(httpServer: http.Server, frontendUrl: string): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: frontendUrl,
      methods: ['GET', 'POST'],
    },
  })

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`)

    // Client joins a room for a specific event to receive live updates
    socket.on('join:event', (eventId: string) => {
      socket.join(`event:${eventId}`)
      console.log(`[Socket.IO] ${socket.id} joined event room: event:${eventId}`)
    })

    // Client leaves event room
    socket.on('leave:event', (eventId: string) => {
      socket.leave(`event:${eventId}`)
      console.log(`[Socket.IO] ${socket.id} left event room: event:${eventId}`)
    })

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`)
    })
  })

  console.log('[Socket.IO] Server initialized and listening for connections.')
  return io
}

/**
 * Broadcasts the current live leaderboard for an event to all connected clients.
 * Called after a match score is confirmed.
 */
export async function broadcastLeaderboard(io: SocketIOServer, eventId: string): Promise<void> {
  const { data: matches } = await supabaseAdmin
    .from('matches')
    .select('team_a_player1, team_a_player2, team_b_player1, team_b_player2, score_a, score_b, status')
    .eq('event_id', eventId)
    .eq('status', 'confirmed')

  if (!matches) return

  // Aggregate individual points from confirmed Americano/Mexicano-style matches
  const playerPoints: Record<string, number> = {}

  for (const match of matches) {
    const teamA = [match.team_a_player1, match.team_a_player2].filter(Boolean)
    const teamB = [match.team_b_player1, match.team_b_player2].filter(Boolean)

    for (const p of teamA) {
      if (p) playerPoints[p] = (playerPoints[p] ?? 0) + (match.score_a ?? 0)
    }
    for (const p of teamB) {
      if (p) playerPoints[p] = (playerPoints[p] ?? 0) + (match.score_b ?? 0)
    }
  }

  const leaderboard = Object.entries(playerPoints)
    .map(([userId, points]) => ({ userId, points }))
    .sort((a, b) => b.points - a.points)
    .map((entry, i) => ({ ...entry, rank: i + 1 }))

  io.to(`event:${eventId}`).emit('leaderboard:updated', { event_id: eventId, leaderboard })
}
