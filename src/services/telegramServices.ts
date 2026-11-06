import TelegramBot, { User, Chat, Message } from 'node-telegram-bot-api'
import prisma from '../config/prisma'

let bot: TelegramBot | null = null

export function initTelegramBot() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn('[TELEGRAM] TELEGRAM_BOT_TOKEN tidak ada — bot dinonaktifkan')
    return null
  }

  try {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true })
    console.log('[TELEGRAM] Bot berjalan')

    const pesanSambutan = `👋 Halo! Saya bot notifikasi absensi sekolah.

Untuk mendaftarkan grup ini ke kelas, gunakan perintah:

/daftarkan_grup <id_kelas>

Contoh: /daftarkan_grup 1

ID kelas bisa dilihat di aplikasi manajemen sekolah.`

    bot.onText(/\/start/, async (msg: Message) => {
      if (msg.chat.type !== 'private') return
      await bot!.sendMessage(msg.chat.id, '👋 Halo! Saya bot notifikasi absensi sekolah.\n\nUntuk mengaktifkan notifikasi, silakan tambahkan saya ke grup kelas Anda, lalu gunakan perintah /daftarkan_grup di dalam grup tersebut.')
    })

    bot.on('my_chat_member', async (msg: { chat: Chat; new_chat_member: { status: string } }) => {
      const { chat, new_chat_member } = msg
      const newStatus = new_chat_member.status

      if ((chat.type === 'group' || chat.type === 'supergroup') && (newStatus === 'member' || newStatus === 'administrator')) {
        await bot!.sendMessage(chat.id, pesanSambutan)
      }
    })

    bot.on('message', async (msg: Message) => {
      const newChatMembers = msg.new_chat_members
      if (!newChatMembers) return

      const botInfo = await bot!.getMe()
      const botDitambahkan = newChatMembers.some((member) => member.id === botInfo.id)

      if (!botDitambahkan) return
      await bot!.sendMessage(msg.chat.id, pesanSambutan)
    })

    const handleDaftarkanGrup = async (msg: Message, match: string[]) => {
      if (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') {
        return bot!.sendMessage(msg.chat.id, '❌ Perintah ini hanya bisa digunakan di dalam grup.')
      }

      const groupId = String(msg.chat.id)
      const kelasId = parseInt(match[1])

      if (isNaN(kelasId)) {
        return bot!.sendMessage(msg.chat.id, '❌ Format salah. Gunakan: /daftarkan_grup <id_kelas>\nContoh: /daftarkan_grup 1')
      }

      try {
        const kelas = await prisma.kelas.findFirst({
          where: { id: kelasId, deleted_at: null },
          include: { tahun: true },
        })

        if (!kelas) {
          return bot!.sendMessage(msg.chat.id, `❌ Kelas dengan ID *${kelasId}* tidak ditemukan.`, { parse_mode: 'Markdown' })
        }

        const grupSudahTerdaftar = await prisma.kelas.findFirst({
          where: { telegram_group_id: groupId, deleted_at: null },
        })

        if (grupSudahTerdaftar && grupSudahTerdaftar.id !== kelasId) {
          return bot!.sendMessage(
            msg.chat.id,
            `⚠️ Grup ini sudah terdaftar ke kelas lain (ID: ${grupSudahTerdaftar.id}).\n\nGunakan /hapus_grup terlebih dahulu sebelum mendaftarkan ke kelas baru.`
          )
        }

        if (kelas.telegram_group_id && kelas.telegram_group_id !== groupId) {
          return bot!.sendMessage(
            msg.chat.id,
            `⚠️ Kelas *${kelas.kelas}* sudah terdaftar ke grup lain.\n\nHubungi admin untuk menghapus pendaftaran grup sebelumnya.`,
            { parse_mode: 'Markdown' }
          )
        }

        await prisma.kelas.update({
          where: { id: kelasId },
          data: { telegram_group_id: groupId },
        })

        await bot!.sendMessage(
          msg.chat.id,
          `✅ *Grup berhasil didaftarkan!*

🏫 Kelas: ${kelas.kelas} - ${kelas.jurusan}
📅 Tahun Ajaran: ${kelas.tahun.tahun_ajaran}

Notifikasi absensi siswa kelas ini akan dikirim ke grup ini.`,
          { parse_mode: 'Markdown' }
        )
      } catch (error) {
        console.error('Error daftarkan grup:', error)
        await bot!.sendMessage(msg.chat.id, '❌ Terjadi kesalahan server.')
      }
    }

    bot.onText(/\/daftarkan_grup (.+)/, handleDaftarkanGrup)

    const handleInfoGrup = async (msg: Message) => {
      if (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') return

      const groupId = String(msg.chat.id)

      try {
        const kelas = await prisma.kelas.findFirst({
          where: { telegram_group_id: groupId, deleted_at: null },
          include: {
            tahun: true,
            _count: { select: { siswa: { where: { deleted_at: null } } } },
          },
        })

        if (!kelas) {
          return bot!.sendMessage(msg.chat.id, '❌ Grup ini belum terdaftar.\n\nGunakan: /daftarkan_grup <id_kelas>')
        }

        await bot!.sendMessage(
          msg.chat.id,
          `ℹ️ *Info Grup*

🏫 Kelas: ${kelas.kelas} - ${kelas.jurusan}
📅 Tahun Ajaran: ${kelas.tahun.tahun_ajaran}
👥 Jumlah Siswa: ${kelas._count.siswa} orang
🆔 Group ID: ${groupId}`,
          { parse_mode: 'Markdown' }
        )
      } catch (error) {
        console.error('Error info grup:', error)
        await bot!.sendMessage(msg.chat.id, '❌ Terjadi kesalahan server.')
      }
    }

    bot.onText(/\/info/, handleInfoGrup)

    const handleHapusGrup = async (msg: Message) => {
      if (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') return

      const groupId = String(msg.chat.id)

      try {
        const kelas = await prisma.kelas.findFirst({ where: { telegram_group_id: groupId, deleted_at: null } })

        if (!kelas) {
          return bot!.sendMessage(msg.chat.id, '❌ Grup ini belum terdaftar di sistem.')
        }

        await prisma.kelas.update({ where: { id: kelas.id }, data: { telegram_group_id: null } })

        await bot!.sendMessage(msg.chat.id, '✅ Pendaftaran grup berhasil dihapus. Notifikasi tidak akan dikirim ke grup ini lagi.')
      } catch (error) {
        console.error('Error hapus grup:', error)
        await bot!.sendMessage(msg.chat.id, '❌ Terjadi kesalahan server.')
      }
    }

    bot.onText(/\/hapus_grup/, handleHapusGrup)

    bot.on('polling_error', (error: Error) => {
      if (error.message.includes('409')) {
        console.error('⚠️ Conflict 409: Instance bot lain sedang berjalan. Pastikan hanya ada satu proses bot yang aktif.')
      } else {
        console.error('Polling error:', error.message)
      }
    })

    return bot
  } catch (error: unknown) {
    console.error('[TELEGRAM] Gagal inisialisasi bot:', error instanceof Error ? error.message : String(error))
    bot = null
    return null
  }
}

interface NotifData {
  nama: string
  kelas: string
  tap_in?: string
  tap_out?: string
  tanggal: string
  status_tapin?: string
}

export async function sendTapInNotification(telegramGroupId: string, data: NotifData) {
  if (!bot || !telegramGroupId) return

  const message = `
📢 *NOTIFIKASI TAP IN*

👤 Nama: ${data.nama}
🏫 Kelas: ${data.kelas}
📅 Tanggal: ${data.tanggal}
⏰ Waktu: ${data.tap_in}
📌 Status: ${data.status_tapin === 'Tepat_Waktu' ? '✅ Tepat Waktu' : '⚠️ Terlambat'}
`

  try {
    await bot.sendMessage(String(telegramGroupId), message, { parse_mode: 'Markdown' })
  } catch (error) {
    console.error('Error kirim tap in ke grup:', error instanceof Error ? error.message : String(error))
  }
}

export async function sendTapOutNotification(telegramGroupId: string, data: NotifData) {
  if (!bot || !telegramGroupId) return

  const message = `
📢 *NOTIFIKASI TAP OUT*

👤 Nama: ${data.nama}
🏫 Kelas: ${data.kelas}
📅 Tanggal: ${data.tanggal}
⏰ Waktu: ${data.tap_out}
`

  try {
    await bot.sendMessage(String(telegramGroupId), message, { parse_mode: 'Markdown' })
  } catch (error) {
    console.error('Error kirim tap out ke grup:', error instanceof Error ? error.message : String(error))
  }
}

export const getBot = () => bot