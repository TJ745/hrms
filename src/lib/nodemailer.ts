import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

type SendMailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export async function sendMail({ to, subject, html, text }: SendMailOptions) {
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    html,
    text,
  });

  return info;
}

// ── Email Templates ──────────────────────────────────────────

export function emailWrapper(content: string, title: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body { font-family: sans-serif; background: #f4f4f5; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; }
          .header { background: #0f172a; padding: 24px 32px; }
          .header h1 { color: #fff; margin: 0; font-size: 20px; }
          .body { padding: 32px; color: #374151; line-height: 1.6; }
          .footer { padding: 16px 32px; background: #f9fafb; font-size: 12px; color: #9ca3af; }
          .btn { display: inline-block; padding: 12px 24px; background: #0f172a; color: #fff; border-radius: 6px; text-decoration: none; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>HRMS</h1></div>
          <div class="body">${content}</div>
          <div class="footer">This is an automated message. Please do not reply.</div>
        </div>
      </body>
    </html>
  `;
}

export const emailTemplates = {
  verifyEmail: (name: string, link: string) => ({
    subject: "Verify your email address",
    html: emailWrapper(
      `<p>Hi ${name},</p>
       <p>Please verify your email address to activate your account.</p>
       <a href="${link}" class="btn">Verify Email</a>
       <p style="margin-top:16px;font-size:13px;color:#6b7280;">This link expires in 24 hours.</p>`,
      "Verify Email"
    ),
  }),

  resetPassword: (name: string, link: string) => ({
    subject: "Reset your password",
    html: emailWrapper(
      `<p>Hi ${name},</p>
       <p>We received a request to reset your password.</p>
       <a href="${link}" class="btn">Reset Password</a>
       <p style="margin-top:16px;font-size:13px;color:#6b7280;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
      "Reset Password"
    ),
  }),

  leaveApproved: (name: string, leaveType: string, startDate: string, endDate: string) => ({
    subject: "Your leave request has been approved",
    html: emailWrapper(
      `<p>Hi ${name},</p>
       <p>Your <strong>${leaveType}</strong> leave request from <strong>${startDate}</strong> to <strong>${endDate}</strong> has been approved.</p>`,
      "Leave Approved"
    ),
  }),

  leaveRejected: (name: string, leaveType: string, reason: string) => ({
    subject: "Your leave request has been rejected",
    html: emailWrapper(
      `<p>Hi ${name},</p>
       <p>Your <strong>${leaveType}</strong> leave request has been rejected.</p>
       <p><strong>Reason:</strong> ${reason}</p>`,
      "Leave Rejected"
    ),
  }),

  payslipReady: (name: string, month: string, year: number, link: string) => ({
    subject: `Your payslip for ${month} ${year} is ready`,
    html: emailWrapper(
      `<p>Hi ${name},</p>
       <p>Your payslip for <strong>${month} ${year}</strong> is now available.</p>
       <a href="${link}" class="btn">View Payslip</a>`,
      "Payslip Ready"
    ),
  }),

  contractExpiry: (name: string, expiryDate: string, daysLeft: number) => ({
    subject: "Contract expiry reminder",
    html: emailWrapper(
      `<p>Hi ${name},</p>
       <p>Your employment contract expires on <strong>${expiryDate}</strong> — that's <strong>${daysLeft} days</strong> from now.</p>
       <p>Please contact HR for renewal details.</p>`,
      "Contract Expiry"
    ),
  }),

  welcomeEmployee: (name: string, email: string, tempPassword: string, loginUrl: string) => ({
    subject: "Welcome to HRMS — Your account is ready",
    html: emailWrapper(
      `<p>Hi ${name},</p>
       <p>Your HRMS account has been created. Here are your login details:</p>
       <p><strong>Email:</strong> ${email}<br/>
       <strong>Temporary Password:</strong> ${tempPassword}</p>
       <p>Please log in and change your password immediately.</p>
       <a href="${loginUrl}" class="btn">Login Now</a>`,
      "Welcome"
    ),
  }),
};
