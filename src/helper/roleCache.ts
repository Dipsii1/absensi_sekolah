import prisma from '../config/prisma'

type RoleEntry = { id: number; name: string }
type RoleCache = Record<string, RoleEntry>

let _roleCache: RoleCache | null = null

export async function getRoleCache(): Promise<RoleCache> {
  if (_roleCache) return _roleCache

  const roles = await prisma.role.findMany({ where: { deleted_at: null } })

  if (!roles.length) {
    throw new Error('Tabel roles kosong.')
  }

  _roleCache = roles.reduce<RoleCache>((acc, role) => {
    acc[role.name.toUpperCase()] = { id: role.id, name: role.name }
    return acc
  }, {})

  return _roleCache
}

export function invalidateRoleCache(): void {
  _roleCache = null
}
