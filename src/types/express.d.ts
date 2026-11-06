declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username?: string;
        email?: string | null;
        role_ids?: number[];
        role_names?: string[];
        guru_id?: number | null;
        siswa_id?: string | null;
      [key: string]: unknown;
    };
  }
}
}

// Interface masukan (request body) — disesuaikan dengan body yang sudah ada di controller.
// Tidak menambahkan validasi runtime (Zod) di sini agar logika dan kontrak API tidak berubah.
export interface TapInInput {
  uid_rfid?: string;
  rfid?: string;
}

export interface TapOutInput {
  uid_rfid?: string;
  rfid?: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface CreateRoleInput {
  name: string;
}

export interface UpdateRoleInput {
  name: string;
}

export interface CreateKelasInput {
  kelas: string;
  jurusan: string;
  tahun_ajaran_id: number;
  walas_id?: number | null;
}

export interface UpdateKelasInput {
  kelas: string;
  jurusan: string;
  tahun_ajaran_id: number;
  walas_id?: number | null;
}

export interface CreateMapelInput {
  nama_mapel: string;
  kode_mapel?: string | null;
}

export interface UpdateMapelInput {
  nama_mapel: string;
  kode_mapel?: string | null;
}

export interface CreateGuruInput {
  NIP: string;
  nama: string;
  nomor_telepon: string;
  alamat: string;
  tanggal_lahir: string;
}

export interface UpdateGuruInput {
  NIP: string;
  nama: string;
  nomor_telepon: string;
  alamat: string;
  tanggal_lahir: string;
}

export interface CreateSiswaInput {
  nisn: string;
  nipd?: string | null;
  nik?: string | null;
  nama: string;
  tempat_lahir?: string | null;
  tgl_lahir?: string | null;
  jenis_kelamin?: "L" | "P" | null;
  agama?: string | null;
  jurusan: string;
  nama_kelas: string;
  orangtua?: {
    NIK: string;
    nama_orangtua: string;
    nomor_telepon: string;
    pekerjaan: string;
    alamat: string;
  } | null;
  uid_rfid?: string | null;
}

export interface UpdateSiswaInput {
  nisn: string;
  nipd?: string | null;
  nik?: string | null;
  nama: string;
  tempat_lahir?: string | null;
  tgl_lahir?: string | null;
  jenis_kelamin?: "L" | "P" | null;
  agama?: string | null;
  jurusan: string;
  kelas_id: number;
  orangtua_id?: number | null;
  uid_rfid?: string | null;
}

export interface CreateJadwalInput {
  hari: string;
  kelas_id: number;
  mapel_id: number;
  guru_id: number;
  jam_mulai: string;
  jam_selesai: string;
}

export interface UpdateJadwalInput {
  hari: string;
  kelas_id: number;
  mapel_id: number;
  guru_id: number;
  jam_mulai: string;
  jam_selesai: string;
}

export interface CreateRFIDInput {
  uid_rfid: string;
  siswa_id: string;
  is_active?: boolean;
}

export interface UpdateRFIDInput {
  uid_rfid?: string;
  siswa_id?: string;
  is_active?: boolean;
}

export interface CreateOrangTuaInput {
  nama_orangtua: string;
  nomor_telepon: string;
  NIK: string;
  pekerjaan: string;
  alamat: string;
}

export interface UpdateOrangTuaInput {
  nama_orangtua: string;
  nomor_telepon: string;
  NIK: string;
  pekerjaan: string;
  alamat: string;
}

export interface CreateRequestStatusInput {
  guru_id: number;
  siswa_id: string;
  kelas_id: number;
  tanggal: string;
  status_baru: string;
  keterangan?: string | null;
}

export interface RespondRequestInput {
  approved: boolean;
  keterangan?: string | null;
}

export interface FinalisasiSiswaInput {
  siswa_id: string;
  kelas_id: number;
  tanggal: string;
}

export interface FinalisasiKelasInput {
  tanggal: string;
}

export interface ImportSiswaColumn {
  NISN: string;
  nama: string;
  nama_kelas: string;
  jurusan: string;
  NIPD?: string;
  NIK?: string;
  tempat_lahir?: string;
  gender?: string;
  tanggal_lahir?: string;
  agama?: string;
  NIK_orangtua?: string;
  nama_orangtua?: string;
  nomor_telepon_orangtua?: string;
  pekerjaan_orangtua?: string;
  alamat_orangtua?: string;
}

export {}
