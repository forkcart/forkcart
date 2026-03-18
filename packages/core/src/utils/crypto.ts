import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from 'crypto';
import { eq } from 'drizzle-orm';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { Database } from '@forkcart/database';
import { pluginSettings } from '@forkcart/database/schemas';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_FILE = join(process.env.FORKCART_DATA_DIR ?? '.forkcart', 'encryption-salt');

/**
 * Get or generate the encryption salt.
 * RVS-013: Salt must be unique per installation, not hardcoded.
 */
function getEncryptionSalt(): Buffer {
  // First, check environment variable
  if (process.env.FORKCART_ENCRYPTION_SALT) {
    return Buffer.from(process.env.FORKCART_ENCRYPTION_SALT, 'hex');
  }

  // Try to read from file
  if (existsSync(SALT_FILE)) {
    return readFileSync(SALT_FILE);
  }

  // Generate new salt and persist it
  const salt = randomBytes(32);
  try {
    mkdirSync(dirname(SALT_FILE), { recursive: true });
    writeFileSync(SALT_FILE, salt, { mode: 0o600 });
    console.info(`Generated new encryption salt at ${SALT_FILE}`);
  } catch (err) {
    console.warn(`Could not persist encryption salt to ${SALT_FILE}:`, err);
    // Fall back to deriving salt from machine-specific data for consistency
    const machineId =
      process.env.HOSTNAME ?? process.env.COMPUTERNAME ?? 'forkcart-default-instance';
    return createHash('sha256').update(machineId).digest();
  }
  return salt;
}

function getEncryptionKey(): Buffer {
  const key = process.env.FORKCART_ENCRYPTION_KEY;
  if (!key) {
    console.warn('FORKCART_ENCRYPTION_KEY not set - secrets stored in plaintext!');
    return Buffer.alloc(32); // Fallback for dev (not secure)
  }
  // Derive a 32-byte key from the provided key using per-installation salt
  const salt = getEncryptionSalt();
  return scryptSync(key, salt, 32);
}

export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted (all hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptSecret(ciphertext: string): string {
  try {
    const key = getEncryptionKey();
    const [ivHex, authTagHex, encrypted] = ciphertext.split(':');

    if (!ivHex || !authTagHex || !encrypted) {
      // Not encrypted (legacy or dev mode)
      return ciphertext;
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    // If decryption fails, assume it's plaintext (legacy data)
    return ciphertext;
  }
}

/**
 * Migrate existing plaintext secrets to encrypted format.
 * Call this once after setting FORKCART_ENCRYPTION_KEY on an existing installation.
 */
export async function migrateSecretsToEncrypted(
  db: Database,
  pluginSchemas: Map<string, Record<string, { secret?: boolean }>>,
): Promise<void> {
  const allPlugins = await db.query.plugins.findMany({ with: { settings: true } });

  for (const plugin of allPlugins) {
    const schema = pluginSchemas.get(plugin.name);
    if (!schema) continue;

    for (const setting of plugin.settings) {
      const settingSchema = schema[setting.key];
      if (!settingSchema?.secret) continue;
      if (typeof setting.value !== 'string') continue;
      if (isEncrypted(setting.value)) continue; // Already encrypted

      const encrypted = encryptSecret(setting.value);
      await db
        .update(pluginSettings)
        .set({ value: encrypted as unknown as Record<string, unknown>, updatedAt: new Date() })
        .where(eq(pluginSettings.id, setting.id));
    }
  }
}

export function isEncrypted(value: string): boolean {
  // Check if value matches our encrypted format (iv:authTag:encrypted)
  const parts = value.split(':');
  return parts.length === 3 && parts[0]!.length === 32 && parts[1]!.length === 32;
}
