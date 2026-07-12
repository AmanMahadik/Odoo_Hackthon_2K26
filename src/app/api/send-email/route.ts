import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_123456789');

export async function POST(req: Request) {
  try {
    const { to, subject, html } = await req.json();

    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY is not set. Simulating email send in sandbox.');
      return NextResponse.json({ success: true, simulated: true });
    }

    const data = await resend.emails.send({
      from: 'TransitOps Notifications <onboarding@resend.dev>',
      to: to,
      subject: subject,
      html: html,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Resend email error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
