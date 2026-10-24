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

export {}