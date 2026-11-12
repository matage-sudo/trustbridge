import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { sendResetEmail } from '../services/email';

export const authRouter = Router();

const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_reset_requests' },
});

authRouter.post('/forgot-password', forgotLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'invalid_email' });
      return;
    }
    const result = await sendResetEmail(email);
    if (result.skipped) req.log?.info({ email, reason: result.skipped }, 'forgot-password no-op');
    res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (err: any) {
    req.log?.error({ err: err?.message }, 'forgot-password error');
    res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
  }
});