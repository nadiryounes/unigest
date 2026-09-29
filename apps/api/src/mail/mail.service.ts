import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  status() {
    const driver = String(
      process.env.MAIL_DRIVER || (process.env.NODE_ENV === 'production' ? 'disabled' : 'console'),
    ).toLowerCase();

    const ready = driver === 'console'
      ? process.env.NODE_ENV !== 'production'
      : driver === 'resend' && !!process.env.RESEND_API_KEY && !!process.env.MAIL_FROM;

    return { driver, ready };
  }

  async sendPasswordReset(to: string, token: string) {
    const { driver, ready } = this.status();
    const base = String(process.env.WEB_BASE_URL || 'https://unigest-web.vercel.app').replace(/\/$/, '');
    const url = `${base}/reset-password?token=${encodeURIComponent(token)}`;

    if (driver === 'console' && process.env.NODE_ENV !== 'production') {
      console.info(`UniGest password reset for ${to}: ${url}`);
      return true;
    }

    if (driver !== 'resend' || !ready) return false;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM,
        to: [to],
        subject: 'Réinitialisation de votre mot de passe UniGest',
        text: `Ce lien est valable 30 minutes : ${url}`,
        html: `<p>Une demande de réinitialisation de votre mot de passe UniGest a été reçue.</p><p><a href="${url}">Réinitialiser mon mot de passe</a></p><p>Ce lien est valable 30 minutes.</p>`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Envoi email refusé par le fournisseur (${response.status})`);
    }
    return true;
  }
}
