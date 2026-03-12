import { Hono } from 'hono';
import type { EmailService } from '@forkcart/core';
import { z } from 'zod';
import { baseLayout } from '@forkcart/core';

const TestEmailSchema = z.object({
  to: z.string().email(),
});

/** Email management routes (admin only, behind auth) */
export function createEmailRoutes(emailService: EmailService) {
  const router = new Hono();

  /** Send a test email */
  router.post('/test', async (c) => {
    const body = await c.req.json();
    const { to } = TestEmailSchema.parse(body);

    const html = baseLayout(
      `
      <h1>Test Email ✅</h1>
      <p>This is a test email from your ForkCart installation.</p>
      <p>If you received this, your email provider is correctly configured!</p>
      <p style="font-size:13px;color:#6b7280;">Sent at ${new Date().toISOString()}</p>
      `,
      'ForkCart Test Email',
    );

    const result = await emailService.sendRaw(
      to,
      'ForkCart — Test Email',
      html,
      'This is a test email from ForkCart. If you received this, your email provider is correctly configured!',
    );

    return c.json({ data: { success: true, messageId: result.messageId } });
  });

  /** Get email log (most recent 50) */
  router.get('/log', async (c) => {
    const limitParam = c.req.query('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 50;
    const entries = await emailService.getLog(limit);
    return c.json({ data: entries });
  });

  return router;
}
