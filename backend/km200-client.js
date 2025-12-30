import crypto from 'crypto';

/**
 * KM200 API Client
 * Handles encrypted communication with Buderus KM200 Gateway
 */
export class KM200Client {
  constructor(host, gatewayPassword, privatePassword) {
    this.host = host;
    this.gatewayPassword = gatewayPassword;
    this.privatePassword = privatePassword;
    this.key = null;
    this.userAgent = 'TeleHeater/2.2.3';
  }

  /**
   * Initialize the client by fetching device info and creating encryption key
   */
  async init() {
    try {
      console.log('🔐 Initializing KM200 with magic bytes encryption...');
      console.log('Gateway Password:', this.gatewayPassword);
      console.log('Private Password:', this.privatePassword ? '***' : '(empty - trying without app password)');

      // Create encryption key using KM200 magic bytes method
      this.createKey();

      console.log('🔑 Encryption key generated (32 bytes for AES-256-ECB)');

      // Test the connection with an endpoint we know exists
      try {
        const testData = await this.get('/dhwCircuits/dhw1/actualTemp');
        console.log('✅ KM200 ENCRYPTION WORKING!');
        console.log('🌡️  Hot water temp:', testData);
        return true;
      } catch (error) {
        console.error('❌ First attempt failed:', error.message);

        // If we used a private password, try without it
        if (this.privatePassword) {
          console.log('🔄 Retrying with empty private password...');
          const originalPassword = this.privatePassword;
          this.privatePassword = '';
          this.createKey();

          try {
            const testData = await this.get('/dhwCircuits/dhw1/actualTemp');
            console.log('✅ KM200 ENCRYPTION WORKING (with empty private password)!');
            console.log('🌡️  Hot water temp:', testData);
            return true;
          } catch (retryError) {
            // Restore original password and fail
            this.privatePassword = originalPassword;
            throw error;
          }
        }
        throw error;
      }
    } catch (error) {
      console.error('Failed to initialize KM200 client:', error);
      throw error;
    }
  }

  /**
   * Create encryption key using KM200 magic bytes method
   * Based on community documentation and reverse engineering
   */
  createKey() {
    // KM200 magic bytes (32 bytes - fixed constant)
    const magicBytes = Buffer.from([
      0x86, 0x78, 0x45, 0xe9, 0x7c, 0x4e, 0x29, 0xdc,
      0xe5, 0x22, 0xb9, 0xa7, 0xd3, 0xa3, 0xe0, 0x7b,
      0x15, 0x2b, 0xff, 0xad, 0xdd, 0xbe, 0xd7, 0xf5,
      0xff, 0xd8, 0x42, 0xe9, 0x89, 0x5a, 0xd1, 0xe4
    ]);

    // KM200 encryption uses:
    // Key = MD5(gateway_password + magic_bytes) + MD5(magic_bytes + private_password)
    const gatewayBuffer = Buffer.from(this.gatewayPassword, 'utf-8');
    const privateBuffer = Buffer.from(this.privatePassword, 'utf-8');

    // Part 1: MD5(gateway_password + magic_bytes)
    const part1Hex = crypto.createHash('md5')
      .update(Buffer.concat([gatewayBuffer, magicBytes]))
      .digest('hex');

    // Part 2: MD5(magic_bytes + private_password)
    const part2Hex = crypto.createHash('md5')
      .update(Buffer.concat([magicBytes, privateBuffer]))
      .digest('hex');

    // Concatenate hex strings, then convert to binary (32-byte key for AES-256)
    const keyHex = part1Hex + part2Hex;
    this.key = Buffer.from(keyHex, 'hex');
  }

  /**
   * Decrypt data from KM200
   */
  decrypt(encryptedData) {
    if (!this.key) {
      throw new Error('Encryption key not initialized');
    }

    // Remove any base64 padding and decode
    const buffer = Buffer.from(encryptedData, 'base64');

    // Decrypt using AES-256-ECB (32-byte key from MD5 concatenation)
    const decipher = crypto.createDecipheriv('aes-256-ecb', this.key, null);
    decipher.setAutoPadding(false);  // Handle padding manually

    let decrypted = decipher.update(buffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    // Remove trailing null bytes and interrupt characters (\x00 and \x01)
    let result = decrypted.toString('utf8');
    console.log('🔍 Raw decrypted (first 100 chars):', result.substring(0, 100));

    result = result.replace(/\0+$/g, '');  // Strip null bytes
    result = result.replace(/\x01+$/g, '');  // Strip interrupt chars

    console.log('🔍 After cleanup (first 100 chars):', result.substring(0, 100));
    return result;
  }

  /**
   * Encrypt data for KM200
   */
  encrypt(data) {
    if (!this.key) {
      throw new Error('Encryption key not initialized');
    }

    const cipher = crypto.createCipheriv('aes-256-ecb', this.key, null);
    cipher.setAutoPadding(true);

    let encrypted = cipher.update(data, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return encrypted.toString('base64');
  }

  /**
   * Fetch raw encrypted data from KM200
   */
  async fetchRaw(path) {
    const url = `http://${this.host}${path}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const encryptedData = await response.text();
    return encryptedData;
  }

  /**
   * Get data from KM200 endpoint
   */
  async get(path) {
    try {
      const encryptedData = await this.fetchRaw(path);
      const decryptedData = this.decrypt(encryptedData);
      // Add small delay to avoid overwhelming the KM200
      await new Promise(resolve => setTimeout(resolve, 150));
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error(`Failed to get ${path}:`, error);
      throw error;
    }
  }

  /**
   * Set data on KM200 endpoint
   */
  async set(path, value) {
    try {
      const data = JSON.stringify({ value });
      const encryptedData = this.encrypt(data);

      const response = await fetch(`http://${this.host}${path}`, {
        method: 'POST',
        headers: {
          'User-Agent': this.userAgent,
          'Content-Type': 'application/json'
        },
        body: encryptedData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error(`Failed to set ${path}:`, error);
      throw error;
    }
  }

  /**
   * Get all available services by crawling the API
   */
  async getServices() {
    const services = [];

    async function crawl(client, path) {
      try {
        const data = await client.get(path);

        if (data.type === 'refEnum' && data.references) {
          // This is a directory, crawl its children
          for (const ref of data.references) {
            const childPath = ref.id;
            await crawl(client, childPath);
          }
        } else {
          // This is a value endpoint
          services.push({ path, data });
        }
      } catch (error) {
        console.error(`Failed to crawl ${path}:`, error.message);
      }
    }

    await crawl(this, '/');
    return services;
  }
}
