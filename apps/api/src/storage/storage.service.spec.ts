import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { StorageService } from './storage.service';

describe('StorageService local driver', () => {
  let root: string;

  beforeEach(async () => {
    root = join(tmpdir(), `unigest-storage-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    process.env.STORAGE_DRIVER = 'local';
    process.env.LOCAL_UPLOAD_DIR = root;
    await fs.rm(root, { recursive: true, force: true });
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('saves, reads and health-checks a private document', async () => {
    const service = new StorageService();
    const key = 'candidates/test/document.pdf';
    const expected = Buffer.from('pdf-test-content');

    await service.save(key, expected, 'application/pdf');
    await expect(service.read(key)).resolves.toEqual(expected);
    await expect(service.health()).resolves.toEqual({ driver: 'local', ready: true });
  });
});
