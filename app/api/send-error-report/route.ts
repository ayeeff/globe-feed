import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { messageId } = await request.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Fetch the message details from Supabase
    const { data: message, error: messageError } = await supabase
      .from('contact_messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (messageError) throw messageError;

    // 2. Fetch Admin Email setting (optional, falls back to env var)
    const { data: settings } = await supabase
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'contact_email') // specific key for contact messages
      .single();

    const adminEmail = settings?.setting_value || process.env.ADMIN_EMAIL;

    if (!adminEmail) {
        throw new Error("Admin email not configured");
    }

    // 3. Send Email via Resend
    const { data, error } = await resend.emails.send({
      from: 'Contact Form <onboarding@resend.dev>',
      to: [adminEmail],
      replyTo: message.email, // Allows you to hit "Reply" directly to the user
      subject: `📧 Contact: ${message.subject}`,
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0;">New Contact Message</h1>
              </div>
              
              <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
                <p><strong>Name:</strong> ${message.name}</p>
                <p><strong>Email:</strong> <a href="mailto:${message.email}">${message.email}</a></p>
                <p><strong>Subject:</strong> ${message.subject}</p>
                
                <div style="background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #8B5CF6; margin-top: 15px;">
                  <strong>Message:</strong><br/>
                  ${message.description.replace(/\n/g, '<br>')}
                </div>
              </div>
              
              <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px;">
                Received on ${new Date(message.created_at).toLocaleString()}
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('Error sending contact email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
