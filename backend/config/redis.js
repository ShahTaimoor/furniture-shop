const redis = require('redis');
const dotenv = require('dotenv');

dotenv.config();

// Build Redis client configuration
const getRedisConfig = () => {
  // If REDIS_URL is provided, use it directly (for simple URL-based connections)
  if (process.env.REDIS_URL && !process.env.REDIS_HOST) {
    return {
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis: Too many reconnection attempts, giving up');
            return new Error('Too many reconnection attempts');
          }
          return Math.min(retries * 100, 3000);
        },
        tls: process.env.REDIS_SSL === 'true' || process.env.REDIS_USE_SSL === 'true' ? {} : undefined
      }
    };
  }

  // Use socket-based configuration (for Redis Cloud with username/password)
  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const username = process.env.REDIS_USERNAME || 'default';
  const password = process.env.REDIS_PASSWORD;
  const useSSL = process.env.REDIS_SSL === 'true' || process.env.REDIS_USE_SSL === 'true';

  const config = {
    socket: {
      host,
      port,
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('Redis: Too many reconnection attempts, giving up');
          return new Error('Too many reconnection attempts');
        }
        return Math.min(retries * 100, 3000);
        },
      // Enable TLS for Redis Cloud
      tls: useSSL ? {} : undefined
    }
  };

  // Add username and password if provided
  if (username) {
    config.username = username;
  }
  if (password) {
    config.password = password;
  }

  return config;
};

// Create Redis client
const redisClient = redis.createClient(getRedisConfig());

// Error handling
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis Client Connected');
});

redisClient.on('ready', () => {
  console.log('Redis Client Ready');
});

redisClient.on('reconnecting', () => {
  console.log('Redis Client Reconnecting...');
});

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
})();

// Graceful shutdown
process.on('SIGINT', async () => {
  await redisClient.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await redisClient.quit();
  process.exit(0);
});

module.exports = redisClient;

