import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: 'Missing to or message' });
  }

  try {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_FROM_NUMBER;

    if (twilioSid && twilioToken && twilioFrom) {
      const body = new URLSearchParams({
        To: to,
        From: twilioFrom,
        Body: message,
      });

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const data = await response.json() as { sid?: string; message?: string };
      if (!response.ok || !data.sid) {
        const errMsg = data.message || 'Twilio send failed';
        console.error('Twilio error:', errMsg);
        return res.status(400).json({ error: errMsg, provider: 'twilio' });
      }

      return res.status(200).json({ success: true, provider: 'twilio' });
    }

    const textbeltKey = process.env.TEXTBELT_API_KEY || 'textbelt';
    const response = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: to,
        message,
        key: textbeltKey,
      }),
    });

    const data = await response.json() as { success: boolean; error?: string; quotaRemaining?: number };
    if (!response.ok || !data.success) {
      const errMsg = data.error || 'Textbelt send failed';
      console.error('Textbelt error:', errMsg);
      return res.status(400).json({
        error: errMsg,
        provider: 'textbelt',
        usingDemoKey: textbeltKey === 'textbelt',
      });
    }

    console.log('SMS sent! Quota remaining:', data.quotaRemaining);
    return res.status(200).json({ success: true, provider: 'textbelt', quotaRemaining: data.quotaRemaining });
  } catch (err) {
    console.error('SMS error:', err);
    return res.status(500).json({ error: 'Failed to send SMS' });
  }
}
