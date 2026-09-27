import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';

type StorageDriver = 'local' | 'supabase';

@Injectable()
export class StorageService {
  private readonly driver: StorageDriver =
    String(process.env.STORAGE_DRIVER || 'local').toLowerCase() === 'supabase' ? 'supabase' : 'local';

  private readonly localRoot = join(process.cwd(), process.env.LOCAL_UPLOAD_DIR || 'uploads');
  private readonly supabaseUrl = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  private readonly supabaseKey = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '');
  private readonly bucket = String(process.env.SUPABASE_STORAGE_BUCKET || 'candidate-documents');

  private supabaseHeaders(contentType?: string) {
    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new InternalServerErrorException(
        'SUPABASE_URL et SUPABASE_SECRET_KEY (ou la clé legacy service_role) sont requis lorsque STORAGE_DRIVER=supabase',
      );
    }

    const headers: Record<string, string> = {
      apikey: this.supabaseKey,
    };

    if (!this.supabaseKey.startsWith('sb_secret_')) {
      headers.Authorization = `Bearer ${this.supabaseKey}`;
    }

    if (contentType) headers['Content-Type'] = contentType;
    return headers;
  }

  private localRelativeKey(storageKey: string) {
    const normalized = storageKey.replace(/\\/g, '/').replace(/^\/+/, '');
    const prefix = `${String(process.env.LOCAL_UPLOAD_DIR || 'uploads').replace(/\/$/, '')}/`;
    return normalized.startsWith(prefix) ? normalized.slice(prefix.length) : normalized;
  }

  private objectUrl(storageKey: string) {
    const encoded = storageKey
      .split('/')
      .filter(Boolean)
      .map((part) => encodeURIComponent(part))
      .join('/');
    return `${this.supabaseUrl}/storage/v1/object/${encodeURIComponent(this.bucket)}/${encoded}`;
  }

  async ensureReady() {
    if (this.driver === 'local') {
      await fs.mkdir(this.localRoot, { recursive: true });
      return;
    }

    const headers = this.supabaseHeaders('application/json');
    const check = await fetch(
      `${this.supabaseUrl}/storage/v1/bucket/${encodeURIComponent(this.bucket)}`,
      { headers },
    );

    if (check.ok) return;
    if (check.status !== 404) {
      throw new Error(`Supabase Storage indisponible (${check.status})`);
    }

    const create = await fetch(`${this.supabaseUrl}/storage/v1/bucket`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: this.bucket,
        name: this.bucket,
        public: false,
        file_size_limit: 10485760,
        allowed_mime_types: ['application/pdf', 'image/jpeg', 'image/png'],
      }),
    });

    if (!create.ok && create.status !== 409) {
      const details = await create.text().catch(() => '');
      throw new Error(`Impossible de créer le bucket Supabase (${create.status}) ${details}`.trim());
    }
  }

  async save(storageKey: string, buffer: Buffer, mimeType: string) {
    if (this.driver === 'local') {
      const absolute = join(this.localRoot, this.localRelativeKey(storageKey));
      await fs.mkdir(dirname(absolute), { recursive: true });
      await fs.writeFile(absolute, buffer);
      return storageKey;
    }

    await this.ensureReady();
    const payload = Uint8Array.from(buffer).buffer;

    const response = await fetch(this.objectUrl(storageKey), {
      method: 'POST',
      headers: {
        ...this.supabaseHeaders(mimeType),
        'x-upsert': 'false',
      },
      body: payload,
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new InternalServerErrorException(
        `Échec du stockage de la pièce (${response.status}) ${details}`.trim(),
      );
    }

    return storageKey;
  }

  async read(storageKey: string): Promise<Buffer> {
    if (this.driver === 'local') {
      return fs.readFile(join(this.localRoot, this.localRelativeKey(storageKey)));
    }

    const response = await fetch(this.objectUrl(storageKey), {
      method: 'GET',
      headers: this.supabaseHeaders(),
    });

    if (!response.ok) {
      throw new InternalServerErrorException(`Impossible de lire la pièce (${response.status})`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  async health() {
    if (this.driver === 'local') {
      await fs.mkdir(this.localRoot, { recursive: true });
      return { driver: this.driver, ready: true };
    }

    await this.ensureReady();
    return { driver: this.driver, ready: true };
  }
}
