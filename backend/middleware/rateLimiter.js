const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req) => {
    if (req.user && req.user.id) return `user:${req.user.id}`;
    return ipKeyGenerator(req.ip);
  },
  message: { error: 'Too many AI requests. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { aiRateLimiter };
