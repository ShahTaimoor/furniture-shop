const crypto = require('crypto');

/**
 * In-memory fallback for Redis
 * NOTE: This will reset when the server restarts
 */
const memoryStore = {
  data: new Map(),
  sets: new Map(),
  
  async get(key) {
    const item = this.data.get(key);
    if (!item) return null;
    if (item.expiry && item.expiry < Date.now()) {
      this.data.delete(key);
      return null;
    }
    return item.value;
  },
  
  async setEx(key, ttl, value) {
    this.data.set(key, {
      value,
      expiry: Date.now() + (ttl * 1000)
    });
    return 'OK';
  },
  
  async del(key) {
    if (Array.isArray(key)) {
      key.forEach(k => {
        this.data.delete(k);
        this.sets.delete(k);
      });
    } else {
      this.data.delete(key);
      this.sets.delete(key);
    }
    return 1;
  },
  
  async sAdd(key, value) {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }
    this.sets.get(key).add(value);
    return 1;
  },
  
  async sRem(key, value) {
    const set = this.sets.get(key);
    if (set) {
      set.delete(value);
      return 1;
    }
    return 0;
  },
  
  async sMembers(key) {
    const set = this.sets.get(key);
    return set ? Array.from(set) : [];
  },
  
  async incr(key) {
    const val = await this.get(key);
    const newVal = (val ? parseInt(val, 10) : 0) + 1;
    await this.setEx(key, 3600, newVal.toString());
    return newVal;
  },
  
  async decr(key) {
    const val = await this.get(key);
    const newVal = (val ? parseInt(val, 10) : 0) - 1;
    await this.setEx(key, 3600, newVal.toString());
    return newVal;
  },
  
  async expire(key, ttl) {
    const item = this.data.get(key);
    if (item) {
      item.expiry = Date.now() + (ttl * 1000);
    }
    const set = this.sets.get(key);
    if (set) {
      // Sets don't have individual expiry in this simple mock
    }
    return 1;
  },
  
  async keys(pattern) {
    const regexPattern = pattern.replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    const results = [];
    for (const key of this.data.keys()) {
      if (regex.test(key)) results.push(key);
    }
    for (const key of this.sets.keys()) {
      if (regex.test(key)) results.push(key);
    }
    return results;
  }
};

/**
 * Redis Token Store Service (Now In-Memory)
 */
class TokenStore {
  /**
   * Store refresh token
   * @param {string} userId - User ID
   * @param {string} refreshToken - Refresh token
   * @param {number} ttl - Time to live in seconds (default: 30 days)
   */
  static async storeRefreshToken(userId, refreshToken, ttl = 30 * 24 * 60 * 60) {
    try {
      const key = `refresh_token:${userId}:${this.hashToken(refreshToken)}`;
      await memoryStore.setEx(key, ttl, JSON.stringify({
        token: refreshToken,
        userId,
        createdAt: new Date().toISOString()
      }));
      
      // Also maintain a set of all tokens for this user (for kill all sessions)
      await memoryStore.sAdd(`user_tokens:${userId}`, key);
      await memoryStore.expire(`user_tokens:${userId}`, ttl);
      
      return true;
    } catch (error) {
      console.error('Error storing refresh token:', error);
      return false;
    }
  }

  /**
   * Check if refresh token exists and is valid
   * @param {string} userId - User ID
   * @param {string} refreshToken - Refresh token
   */
  static async isValidRefreshToken(userId, refreshToken) {
    try {
      const key = `refresh_token:${userId}:${this.hashToken(refreshToken)}`;
      const tokenData = await memoryStore.get(key);
      return tokenData !== null;
    } catch (error) {
      console.error('Error checking refresh token:', error);
      return false;
    }
  }

  /**
   * Remove refresh token
   * @param {string} userId - User ID
   * @param {string} refreshToken - Refresh token
   */
  static async removeRefreshToken(userId, refreshToken) {
    try {
      const key = `refresh_token:${userId}:${this.hashToken(refreshToken)}`;
      await memoryStore.del(key);
      await memoryStore.sRem(`user_tokens:${userId}`, key);
      return true;
    } catch (error) {
      console.error('Error removing refresh token:', error);
      return false;
    }
  }

  /**
   * Remove all refresh tokens for a user (kill all sessions)
   * @param {string} userId - User ID
   */
  static async removeAllUserTokens(userId) {
    try {
      const tokenKeys = await memoryStore.sMembers(`user_tokens:${userId}`);
      if (tokenKeys && tokenKeys.length > 0) {
        // Delete all token keys
        for (const key of tokenKeys) {
          await memoryStore.del(key);
        }
      }
      await memoryStore.del(`user_tokens:${userId}`);
      return true;
    } catch (error) {
      console.error('Error removing all user tokens:', error);
      return false;
    }
  }

  /**
   * Hash token for storage key
   * @param {string} token - Token to hash
   */
  static hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Rotate refresh token (remove old, store new)
   * @param {string} userId - User ID
   * @param {string} oldToken - Old refresh token
   * @param {string} newToken - New refresh token
   * @param {number} ttl - Time to live in seconds
   */
  static async rotateRefreshToken(userId, oldToken, newToken, ttl = 30 * 24 * 60 * 60) {
    try {
      await this.removeRefreshToken(userId, oldToken);
      await this.storeRefreshToken(userId, newToken, ttl);
      return true;
    } catch (error) {
      console.error('Error rotating refresh token:', error);
      return false;
    }
  }
}

/**
 * Cache Service (Now In-Memory)
 */
class CacheService {
  /**
   * Get cached data
   * @param {string} key - Cache key
   */
  static async get(key) {
    try {
      const data = await memoryStore.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error getting cache for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached data
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (default: 1 hour)
   */
  static async set(key, value, ttl = 3600) {
    try {
      await memoryStore.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error setting cache for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete cached data
   * @param {string} key - Cache key (supports patterns)
   */
  static async del(key) {
    try {
      if (key.includes('*')) {
        // Pattern matching
        const keys = await memoryStore.keys(key);
        if (keys.length > 0) {
          await memoryStore.del(keys);
        }
      } else {
        await memoryStore.del(key);
      }
      return true;
    } catch (error) {
      console.error(`Error deleting cache for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Invalidate cache by pattern
   * @param {string} pattern - Pattern to match (e.g., 'products:*')
   */
  static async invalidate(pattern) {
    try {
      const keys = await memoryStore.keys(pattern);
      if (keys && keys.length > 0) {
        for (const key of keys) {
          await memoryStore.del(key);
        }
      }
      return keys ? keys.length : 0;
    } catch (error) {
      console.error(`Error invalidating cache for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Cache wrapper function
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Function to fetch data if not cached
   * @param {number} ttl - Time to live in seconds
   */
  static async getOrSet(key, fetchFn, ttl = 3600) {
    try {
      // In-memory cache is very fast, but let's keep the pattern
      const cached = await this.get(key);
      if (cached !== null) {
        return cached;
      }

      const data = await fetchFn();
      await this.set(key, data, ttl);
      return data;
    } catch (error) {
      console.error(`Error in getOrSet for key ${key}:`, error);
      try {
        return await fetchFn();
      } catch (fetchError) {
        console.error('Error fetching data:', fetchError);
        throw fetchError;
      }
    }
  }
}

/**
 * Pending Orders Counter Service (Now In-Memory)
 */
class PendingOrdersCounter {
  static KEY = 'orders:pending:count';
  static TTL = 5; // 5 seconds TTL

  /**
   * Get pending orders count
   */
  static async getCount() {
    try {
      const count = await memoryStore.get(this.KEY);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      console.error('Error getting pending orders count:', error);
      return 0;
    }
  }

  /**
   * Increment pending orders count
   */
  static async increment() {
    try {
      const count = await memoryStore.incr(this.KEY);
      await memoryStore.expire(this.KEY, this.TTL);
      return count;
    } catch (error) {
      console.error('Error incrementing pending orders count:', error);
      return 0;
    }
  }

  /**
   * Decrement pending orders count
   */
  static async decrement() {
    try {
      const count = await memoryStore.decr(this.KEY);
      await memoryStore.expire(this.KEY, this.TTL);
      return Math.max(0, count);
    } catch (error) {
      console.error('Error decrementing pending orders count:', error);
      return 0;
    }
  }

  /**
   * Set pending orders count
   * @param {number} count - Count to set
   */
  static async setCount(count) {
    try {
      await memoryStore.setEx(this.KEY, this.TTL, count.toString());
      return count;
    } catch (error) {
      console.error('Error setting pending orders count:', error);
      return 0;
    }
  }

  /**
   * Reset pending orders count
   */
  static async reset() {
    try {
      await memoryStore.del(this.KEY);
      return true;
    } catch (error) {
      console.error('Error resetting pending orders count:', error);
      return false;
    }
  }
}

/**
 * Session Management Service (Now In-Memory)
 */
class SessionService {
  /**
   * Generate session fingerprint from request
   */
  static generateFingerprint(req) {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';
    return crypto
      .createHash('sha256')
      .update(`${ip}:${userAgent}`)
      .digest('hex');
  }

  /**
   * Store session fingerprint
   */
  static async storeSession(userId, refreshToken, fingerprint, ttl = 30 * 24 * 60 * 60) {
    try {
      const tokenHash = TokenStore.hashToken(refreshToken);
      const sessionKey = `session:${userId}:${tokenHash}`;
      
      await memoryStore.setEx(sessionKey, ttl, JSON.stringify({
        fingerprint,
        userId,
        refreshToken: tokenHash,
        createdAt: new Date().toISOString()
      }));

      // Maintain fingerprint mapping
      await memoryStore.setEx(`fingerprint:${fingerprint}:${tokenHash}`, ttl, userId);
      
      return true;
    } catch (error) {
      console.error('Error storing session:', error);
      return false;
    }
  }

  /**
   * Validate session fingerprint
   */
  static async validateSession(userId, refreshToken, fingerprint) {
    try {
      const tokenHash = TokenStore.hashToken(refreshToken);
      const sessionKey = `session:${userId}:${tokenHash}`;
      const sessionData = await memoryStore.get(sessionKey);
      
      if (!sessionData) {
        return { valid: false, reason: 'Session not found' };
      }

      const session = JSON.parse(sessionData);
      if (session.fingerprint !== fingerprint) {
        // Fingerprint mismatch
        await this.blockToken(userId, refreshToken);
        return { valid: false, reason: 'Fingerprint mismatch' };
      }

      return { valid: true, session };
    } catch (error) {
      console.error('Error validating session:', error);
      return { valid: false, reason: 'Validation error' };
    }
  }

  /**
   * Block a stolen token
   */
  static async blockToken(userId, refreshToken) {
    try {
      const tokenHash = TokenStore.hashToken(refreshToken);
      const blockKey = `blocked_token:${tokenHash}`;
      await memoryStore.setEx(blockKey, 30 * 24 * 60 * 60, userId);
      
      // Remove from valid tokens
      await TokenStore.removeRefreshToken(userId, refreshToken);
      
      return true;
    } catch (error) {
      console.error('Error blocking token:', error);
      return false;
    }
  }

  /**
   * Check if token is blocked
   */
  static async isTokenBlocked(refreshToken) {
    try {
      const tokenHash = TokenStore.hashToken(refreshToken);
      const blockKey = `blocked_token:${tokenHash}`;
      const blocked = await memoryStore.get(blockKey);
      return blocked !== null;
    } catch (error) {
      console.error('Error checking blocked token:', error);
      return false;
    }
  }

  /**
   * Remove session on logout
   */
  static async removeSession(userId, refreshToken) {
    try {
      const tokenHash = TokenStore.hashToken(refreshToken);
      const sessionKey = `session:${userId}:${tokenHash}`;
      await memoryStore.del(sessionKey);
      
      // Remove fingerprint mapping
      const keys = await memoryStore.keys(`fingerprint:*:${tokenHash}`);
      if (keys.length > 0) {
        await memoryStore.del(keys);
      }
      
      return true;
    } catch (error) {
      console.error('Error removing session:', error);
      return false;
    }
  }

  /**
   * Kill all sessions for a user
   */
  static async killAllSessions(userId) {
    try {
      await TokenStore.removeAllUserTokens(userId);
      
      const sessionKeys = await memoryStore.keys(`session:${userId}:*`);
      if (sessionKeys.length > 0) {
        await memoryStore.del(sessionKeys);
      }
      
      const fingerprintKeys = await memoryStore.keys(`fingerprint:*`);
      if (fingerprintKeys && fingerprintKeys.length > 0) {
        for (const key of fingerprintKeys) {
          const value = await memoryStore.get(key);
          if (value === userId) {
            await memoryStore.del(key);
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error killing all sessions:', error);
      return false;
    }
  }
}

module.exports = {
  TokenStore,
  CacheService,
  PendingOrdersCounter,
  SessionService
};


