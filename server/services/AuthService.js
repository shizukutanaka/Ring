const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Pool } = require('pg');

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

class AuthService {
    constructor(pool, jwtSecret) {
        this.pool = pool;
        this.jwtSecret = jwtSecret;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            await this.pool.query(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          token TEXT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          revoked BOOLEAN DEFAULT FALSE,
          replaced_by_token TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
      `);
            console.log('AuthService initialized: refresh_tokens table ready');
            this.initialized = true;
        } catch (error) {
            console.error('AuthService initialization error:', error);
            throw error;
        }
    }

    generateTokens(user) {
        const accessToken = jwt.sign(
            { sub: user.id, role: user.role, type: 'access' },
            this.jwtSecret,
            { expiresIn: ACCESS_TOKEN_EXPIRY }
        );

        const refreshToken = crypto.randomBytes(40).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

        return { accessToken, refreshToken, expiresAt };
    }

    async register(username, password, email) {
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        const result = await this.pool.query(
            'INSERT INTO users(username, email, password_hash, role, created_at) VALUES($1, $2, $3, $4, NOW()) RETURNING id, username, email, role',
            [username, email || null, passwordHash, 'user']
        );

        const user = result.rows[0];
        const { accessToken, refreshToken, expiresAt } = this.generateTokens(user);

        await this.saveRefreshToken(user.id, refreshToken, expiresAt);

        return { user, accessToken, refreshToken };
    }

    async login(username, password) {
        const result = await this.pool.query(
            'SELECT id, username, email, password_hash, role FROM users WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            throw new Error('Invalid credentials');
        }

        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password_hash);

        if (!isValid) {
            throw new Error('Invalid credentials');
        }

        const { accessToken, refreshToken, expiresAt } = this.generateTokens(user);
        await this.saveRefreshToken(user.id, refreshToken, expiresAt);

        return { user: { id: user.id, username: user.username, email: user.email, role: user.role }, accessToken, refreshToken };
    }

    async refreshToken(token) {
        const result = await this.pool.query(
            'SELECT * FROM refresh_tokens WHERE token = $1',
            [token]
        );

        if (result.rows.length === 0) {
            throw new Error('Invalid refresh token');
        }

        const storedToken = result.rows[0];

        if (storedToken.revoked) {
            // Token reuse detection! Revoke all tokens for this user
            await this.revokeAllUserTokens(storedToken.user_id);
            throw new Error('Token reuse detected');
        }

        if (new Date() > storedToken.expires_at) {
            throw new Error('Refresh token expired');
        }

        // Get user
        const userResult = await this.pool.query(
            'SELECT id, username, email, role FROM users WHERE id = $1',
            [storedToken.user_id]
        );
        const user = userResult.rows[0];

        // Rotate token
        const { accessToken, refreshToken: newRefreshToken, expiresAt } = this.generateTokens(user);

        // Revoke old token and link to new one
        await this.pool.query(
            'UPDATE refresh_tokens SET revoked = TRUE, replaced_by_token = $1 WHERE id = $2',
            [newRefreshToken, storedToken.id]
        );

        // Save new token
        await this.saveRefreshToken(user.id, newRefreshToken, expiresAt);

        return { accessToken, refreshToken: newRefreshToken };
    }

    async saveRefreshToken(userId, token, expiresAt) {
        await this.pool.query(
            'INSERT INTO refresh_tokens(user_id, token, expires_at) VALUES($1, $2, $3)',
            [userId, token, expiresAt]
        );
    }

    async revokeAllUserTokens(userId) {
        await this.pool.query(
            'UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1',
            [userId]
        );
    }
}

module.exports = AuthService;
