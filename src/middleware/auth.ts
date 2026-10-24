import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../config/prisma'

export function verifyToken(req: Request, res: Response, next: NextFunction): Response | undefined {
  const authHeader = req.headers['authorization']
  const token = authHeader?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token tidak ditemukan' })
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET!) as Request['user']
    next()
  } catch (err: unknown) {
    const message =
      err instanceof Error && err.name === 'TokenExpiredError'
        ? 'Access token sudah expired'
        : 'Access token tidak valid'
    return res.status(401).json({ success: false, message })
  }
}

export function checkRole(...allowedRoles: string[]) {
  const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase())

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    const userRoles: string[] =
      req.user.role_names ?? (req.user.role_name ? [req.user.role_name as string] : [])

    if (!userRoles.length) {
      return res.status(403).json({ success: false, message: 'Role tidak ditemukan di token' })
    }

    const hasRole = userRoles.some((r) => normalizedAllowed.includes(r.toUpperCase()))
    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: `Akses ditolak. Dibutuhkan role: ${normalizedAllowed.join(', ')}`,
      })
    }

    next()
  }
}

export async function requirePokja(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.id) {
    return res.status(401).json({ success: false, message: 'Unauthorized' })
  }

  try {
    const pokjaUser = await prisma.pokjaUser.findUnique({
      where: { user_id: req.user.id },
      select: { user_id: true },
    })

    if (!pokjaUser) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Dibutuhkan akses Pokja' })
    }

    next()
  } catch (err) {
    console.error('Error checking Pokja access:', err)
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' })
  }
}
