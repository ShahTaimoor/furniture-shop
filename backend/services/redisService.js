const redisClient = require('../config/redis');
const crypto = require('crypto');

/**
 * Redis Token Store Service
 */
class TokenStore {
  /**
   * Store refresh token in Redis
   * @param {string} userId - User ID
   * @param {string} refreshToken - Refresh token
   * @param {number} ttl - Time to live in seconds (default: 30 days)
   */
  static async storeRefreshToken(userId, refreshToken, ttl = 30 * 24 * 60 * 60) {
    try {
      const key = `refresh_token:${userId}:${this.hashToken(refreshToken)}`;
      await redisClient.setEx(key, ttl, JSON.stringify({
        token: refreshToken,
        userId,
        createdAt: new Date().toISOString()
      }));
      
      // Also maintain a set of all tokens for this user (for kill all sessions)
      await redisClient.sAdd(`user_tokens:${userId}`, key);
      await redisClient.expire(`user_tokens:${userId}`, ttl);
      
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
      const tokenData = await redisClient.get(key);
      return tokenData !== null;
    } catch (error) {
      console.error('Error checking refresh token:', error);
      return false;
    }
  }

  /**
   * Remove refresh token from Redis
   * @param {string} userId - User ID
   * @param {string} refreshToken - Refresh token
   */
  static async removeRefreshToken(userId, refreshToken) {
    try {
      const key = `refresh_token:${userId}:${this.hashToken(refreshToken)}`;
      await redisClient.del(key);
      await redisClient.sRem(`user_tokens:${userId}`, key);
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
      const tokenKeys = await redisClient.sMembers(`user_tokens:${userId}`);
      if (tokenKeys && tokenKeys.length > 0) {
        // Delete all token keys
        for (const key of tokenKeys) {
          await redisClient.del(key);
        }
      }
      await redisClient.del(`user_tokens:${userId}`);
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
 * Redis Cache Service
 */
class CacheService {
  /**
   * Get cached data
   * @param {string} key - Cache key
   */
  static async get(key) {
    try {
      const data = await redisClient.get(key);
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
      await redisClient.setEx(key, ttl, JSON.stringify(value));
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
        const keys = await redisClient.keys(key);
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
      } else {
        await redisClient.del(key);
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
      const keys = await redisClient.keys(pattern);
      if (keys && keys.length > 0) {
        // Delete keys in batches to avoid blocking Redis
        for (const key of keys) {
          await redisClient.del(key);
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
      const cached = await this.get(key);
      if (cached !== null) {
        return cached;
      }

      const data = await fetchFn();
      await this.set(key, data, ttl);
      return data;
    } catch (error) {
      console.error(`Error in getOrSet for key ${key}:`, error);
      // If cache fails, try to fetch directly
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
 * Redis Pending Orders Counter Service
 */
class PendingOrdersCounter {
  static KEY = 'orders:pending:count';
  static TTL = 5; // 5 seconds TTL for real-time updates

  /**
   * Get pending orders count
   */
  static async getCount() {
    try {
      const count = await redisClient.get(this.KEY);
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
      const count = await redisClient.incr(this.KEY);
      await redisClient.expire(this.KEY, this.TTL);
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
      const count = await redisClient.decr(this.KEY);
      await redisClient.expire(this.KEY, this.TTL);
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
      await redisClient.setEx(this.KEY, this.TTL, count.toString());
      return count;
    } catch (error) {
      console.error('Error setting pending orders count:', error);
      return 0;
    }
  }

  /**
   * Reset pending orders count (recalculate from database)
   */
  static async reset() {
    try {
      // This will be called when cache expires or is invalidated
      // The actual count will be recalculated by the route handler
      await redisClient.del(this.KEY);
      return true;
    } catch (error) {
      console.error('Error resetting pending orders count:', error);
      return false;
    }
  }
}

/**
 * Redis Session Management Service
 */
class SessionService {
  /**
   * Generate session fingerprint from request
   * @param {object} req - Express request object
   */
  static generateFingerprint(req) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';
    const fingerprint = crypto
      .createHash('sha256')
      .update(`${ip}:${userAgent}`)
      .digest('hex');
    return fingerprint;
  }

  /**
   * Store session fingerprint
   * @param {string} userId - User ID
   * @param {string} refreshToken - Refresh token
   * @param {string} fingerprint - Session fingerprint
   * @param {number} ttl - Time to live in seconds
   */
  static async storeSession(userId, refreshToken, fingerprint, ttl = 30 * 24 * 60 * 60) {
    try {
      const tokenHash = TokenStore.hashToken(refreshToken);
      const sessionKey = `session:${userId}:${tokenHash}`;
      
      await redisClient.setEx(sessionKey, ttl, JSON.stringify({
        fingerprint,
        userId,
        refreshToken: tokenHash,
        createdAt: new Date().toISOString()
      }));

      // Also maintain fingerprint mapping for blocking stolen tokens
      await redisClient.setEx(`fingerprint:${fingerprint}:${tokenHash}`, ttl, userId);
      
      return true;
    } catch (error) {
      console.error('Error storing session:', error);
      return false;
    }
  }

  /**
   * Validate session fingerprint
   * @param {string} userId - User ID
   * @param {string} refreshToken - Refresh token
   * @param {string} fingerprint - Current request fingerprint
   */
  static async validateSession(userId, refreshToken, fingerprint) {
    try {
      const tokenHash = TokenStore.hashToken(refreshToken);
      const sessionKey = `session:${userId}:${tokenHash}`;
      const sessionData = await redisClient.get(sessionKey);
      
      if (!sessionData) {
        return { valid: false, reason: 'Session not found' };
      }

      const session = JSON.parse(sessionData);
      if (session.fingerprint !== fingerprint) {
        // Fingerprint mismatch - potential token theft
        await this.blockToken(userId, refreshToken);
        return { valid: false, reason: 'Fingerprint mismatch - token may be stolen' };
      }

      return { valid: true, session };
    } catch (error) {
      console.error('Error validating session:', error);
      return { valid: false, reason: 'Validation error' };
    }
  }

  /**
   * Block a stolen token
   * @param {string} userId - User ID
   * @param {string} refreshToken - Refresh token to block
   */
  static async blockToken(userId, refreshToken) {
    try {
      const tokenHash = TokenStore.hashToken(refreshToken);
      const blockKey = `blocked_token:${tokenHash}`;
      await redisClient.setEx(blockKey, 30 * 24 * 60 * 60, userId); // Block for 30 days
      
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
   * @param {string} refreshToken - Refresh token
   */
  static async isTokenBlocked(refreshToken) {
    try {
      const tokenHash = TokenStore.hashToken(refreshToken);
      const blockKey = `blocked_token:${tokenHash}`;
      const blocked = await redisClient.get(blockKey);
      return blocked !== null;
    } catch (error) {
      console.error('Error checking blocked token:', error);
      return false;
    }
  }

  /**
   * Remove session on logout
   * @param {string} userId - User ID
   * @param {string} refreshToken - Refresh token
   */
  static async removeSession(userId, refreshToken) {
    try {
      const tokenHash = TokenStore.hashToken(refreshToken);
      const sessionKey = `session:${userId}:${tokenHash}`;
      await redisClient.del(sessionKey);
      
      // Remove fingerprint mapping
      const keys = await redisClient.keys(`fingerprint:*:${tokenHash}`);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      
      return true;
    } catch (error) {
      console.error('Error removing session:', error);
      return false;
    }
  }

  /**
   * Kill all sessions for a user (admin function)
   * @param {string} userId - User ID
   */
  static async killAllSessions(userId) {
    try {
      // Remove all tokens
      await TokenStore.removeAllUserTokens(userId);
      
      // Remove all sessions
      const sessionKeys = await redisClient.keys(`session:${userId}:*`);
      if (sessionKeys.length > 0) {
        await redisClient.del(sessionKeys);
      }
      
      // Remove all fingerprint mappings for this user
      const fingerprintKeys = await redisClient.keys(`fingerprint:*`);
      if (fingerprintKeys && fingerprintKeys.length > 0) {
        for (const key of fingerprintKeys) {
          const value = await redisClient.get(key);
          if (value === userId) {
            await redisClient.del(key);
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

