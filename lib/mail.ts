import nodemailer from "nodemailer";

const domain = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Configure Brevo Transporter
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_SERVER,
  port: Number(process.env.MAIL_PORT),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
});

export const sendVerificationEmail = async (email: string, token: string) => {
  const confirmLink = `${domain}/auth/new-verification?token=${token}`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: "Confirm your email - DeepShark AI",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify your email</h2>
        <p>Click the link below to confirm your email address and start using DeepShark AI.</p>
        <a href="${confirmLink}" style="display: inline-block; background-color: #14b8a6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">
          Verify Email
        </a>
        <p style="margin-top: 20px; font-size: 12px; color: #666;">
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `,
  });
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  // Make sure this route exists in Step 5
  const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/new-password?token=${token}`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: "Reset your password - DeepShark AI",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2>Reset your password</h2>
        <p>You requested to reset your password. Click the link below to create a new one.</p>
        <a href="${resetLink}" style="display: inline-block; background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; font-weight: bold;">
          Reset Password
        </a>
        <p style="margin-top: 24px; font-size: 14px; color: #666;">
          If you didn't request this, please ignore this email.
        </p>
      </div>
    `,
  });
};