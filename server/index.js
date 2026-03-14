import cors from 'cors'
import crypto from 'crypto'
import dotenv from 'dotenv'
import express from 'express'
import session from 'express-session'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Pool } from 'pg'
import connectPgSimple from 'connect-pg-simple'

dotenv.config()

const {
  PORT = '8787',
  FRONTEND_URL = 'http://localhost:5173',
  ALLOWED_FRONTEND_ORIGINS,
  API_BASE_URL = `http://localhost:${PORT}`,
  SESSION_SECRET,
  AUTH_TOKEN_SECRET,
  DATABASE_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  NODE_ENV,
} = process.env

const allowedFrontendOrigins = new Set(
  (ALLOWED_FRONTEND_ORIGINS ?? FRONTEND_URL)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
)

allowedFrontendOrigins.add(FRONTEND_URL)

function isAllowedOrigin(value) {
  if (!value) {
    return false
  }

  try {
    const candidate = new URL(value)
    return allowedFrontendOrigins.has(candidate.origin)
  } catch {
    return false
  }
}

const missing = [
  ['SESSION_SECRET', SESSION_SECRET],
  ['DATABASE_URL', DATABASE_URL],
  ['GOOGLE_CLIENT_ID', GOOGLE_CLIENT_ID],
  ['GOOGLE_CLIENT_SECRET', GOOGLE_CLIENT_SECRET],
].filter(([, value]) => !value)

if (missing.length) {
  console.error(
    `Missing required environment variables: ${missing
      .map(([name]) => name)
      .join(', ')}`,
  )
  process.exit(1)
}

const isProduction = NODE_ENV === 'production'
const tokenSecret = AUTH_TOKEN_SECRET || SESSION_SECRET

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
})

const PgSession = connectPgSimple(session)

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url')
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function signAuthToken(payload) {
  const body = base64UrlEncode(JSON.stringify(payload))
  const signature = crypto
    .createHmac('sha256', tokenSecret)
    .update(body)
    .digest('base64url')

  return `${body}.${signature}`
}

function verifyAuthToken(token) {
  if (!token || typeof token !== 'string') {
    return null
  }

  const [body, signature] = token.split('.')
  if (!body || !signature) {
    return null
  }

  const expected = crypto
    .createHmac('sha256', tokenSecret)
    .update(body)
    .digest('base64url')

  if (signature !== expected) {
    return null
  }

  try {
    const payload = JSON.parse(base64UrlDecode(body))
    if (!payload || typeof payload !== 'object') {
      return null
    }

    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) {
      return null
    }

    if (typeof payload.userId !== 'number') {
      return null
    }

    return payload
  } catch {
    return null
  }
}

function tokenFromRequest(req) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return null
  }

  return header.slice('Bearer '.length).trim()
}

async function userFromToken(req) {
  const token = tokenFromRequest(req)
  const payload = verifyAuthToken(token)
  if (!payload) {
    return null
  }

  const result = await pool.query(
    `SELECT id, google_id, email, name, avatar_url FROM app_users WHERE id = $1`,
    [payload.userId],
  )
  return result.rows[0] ?? null
}

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id SERIAL PRIMARY KEY,
      google_id TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      name TEXT,
      avatar_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      sid VARCHAR NOT NULL PRIMARY KEY,
      sess JSON NOT NULL,
      expire TIMESTAMP(6) NOT NULL
    );
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS user_sessions_expire_idx
      ON user_sessions (expire);
  `)
}

passport.serializeUser((user, done) => {
  done(null, user.id)
})

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query(
      `SELECT id, google_id, email, name, avatar_url FROM app_users WHERE id = $1`,
      [id],
    )
    done(null, result.rows[0] ?? null)
  } catch (error) {
    done(error)
  }
})

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: `${API_BASE_URL}/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value ?? null
        const avatarUrl = profile.photos?.[0]?.value ?? null
        const name = profile.displayName ?? email ?? 'Google user'

        const upsert = await pool.query(
          `
            INSERT INTO app_users (google_id, email, name, avatar_url)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (google_id)
            DO UPDATE SET
              email = EXCLUDED.email,
              name = EXCLUDED.name,
              avatar_url = EXCLUDED.avatar_url,
              updated_at = NOW()
            RETURNING id, google_id, email, name, avatar_url;
          `,
          [profile.id, email, name, avatarUrl],
        )

        done(null, upsert.rows[0])
      } catch (error) {
        done(error)
      }
    },
  ),
)

const app = express()
app.set('trust proxy', 1)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedFrontendOrigins.has(origin)) {
        callback(null, true)
        return
      }

      callback(new Error(`Origin not allowed: ${origin}`))
    },
    credentials: true,
  }),
)

app.use(express.json())

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: 'user_sessions',
      createTableIfMissing: true,
    }),
    name: 'practice_log_session',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 30,
    },
  }),
)

app.use(passport.initialize())
app.use(passport.session())

app.get('/healthz', (_req, res) => {
  res.json({ ok: true })
})

app.get('/auth/google', (req, res, next) => {
  const requestedReturnTo =
    typeof req.query.returnTo === 'string' ? req.query.returnTo : ''

  req.session.oauthReturnTo = isAllowedOrigin(requestedReturnTo)
    ? requestedReturnTo
    : FRONTEND_URL

  passport.authenticate('google', {
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
  })(req, res, next)
})

app.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${FRONTEND_URL}/?auth=failed`,
    session: true,
  }),
  (req, res) => {
    const redirectTo =
      typeof req.session.oauthReturnTo === 'string' &&
      isAllowedOrigin(req.session.oauthReturnTo)
        ? req.session.oauthReturnTo
        : FRONTEND_URL

    delete req.session.oauthReturnTo

    const userId = req.user?.id
    const authToken =
      typeof userId === 'number'
        ? signAuthToken({
            userId,
            exp: Date.now() + 1000 * 60 * 60 * 24 * 30,
          })
        : null

    if (!authToken) {
      res.redirect(redirectTo)
      return
    }

    const separator = redirectTo.includes('?') ? '&' : '?'
    res.redirect(`${redirectTo}${separator}auth_token=${encodeURIComponent(authToken)}`)
  },
)

app.get('/auth/me', async (req, res, next) => {
  try {
    const tokenUser = await userFromToken(req)
    const sessionUser = req.isAuthenticated() ? req.user : null
    const user = tokenUser ?? sessionUser

    if (!user) {
      res.status(401).json({ authenticated: false })
      return
    }

    res.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
      },
    })
  } catch (error) {
    next(error)
  }
})

app.post('/auth/logout', (req, res, next) => {
  req.logout((error) => {
    if (error) {
      next(error)
      return
    }

    req.session.destroy((destroyError) => {
      if (destroyError) {
        next(destroyError)
        return
      }

      res.clearCookie('practice_log_session')
      res.status(204).end()
    })
  })
})

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ error: 'Internal server error' })
})

async function start() {
  await ensureTables()

  app.listen(Number(PORT), () => {
    console.log(`Auth server listening on port ${PORT}`)
  })
}

start().catch((error) => {
  console.error('Failed to start auth server', error)
  process.exit(1)
})
