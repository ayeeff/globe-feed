import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { reportId } = await request.json();
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: report, error: reportError } = await supabase
      .from('error_reports')
      .select('*')
      .eq('id', reportId)
      .single();
    
    if (reportError) throw reportError;
    
    const { data: post } = await supabase
      .from('posts')
      .select('title, slug')
      .eq('id', report.post_id)
      .single();
    
    const { data: settings } = await supabase
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'error_report_email')
      .single();
    
    const adminEmail = settings?.setting_value || process.env.ADMIN_EMAIL;
    
    const { data, error } = await resend.emails.send({
      from: 'Error Reports <onboarding@resend.dev>',
      to: [adminEmail],
      subject: `🐛 ${report.subject}`,
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0;">🐛 New Error Report</h1>
              </div>
              
              <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
                <p><strong>From:</strong> ${report.name} (<a href="mailto:${report.email}">${report.email}</a>)</p>
                <p><strong>Visualization:</strong> ${post?.title || 'Unknown'}</p>
                <p><strong>URL:</strong> <a href="${report.url}">${report.url}</a></p>
                <div style="background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #667eea; margin-top: 15px;">
                  <strong>Description:</strong><br>
                  ${report.description.replace(/\n/g, '<br>')}
                </div>
                <a href="${report.url}" style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px;">View Visualization</a>
              </div>
              
              <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px;">
                Submitted on ${new Date(report.created_at).toLocaleString()}
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
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
