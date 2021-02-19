import Email from "email-templates";
import path from "path";
import { defaultMailFromAddress, smtpUrl } from "../config";

const templatesDir = path.join(__dirname, "../templates/emails");

interface SendEmailOptions {
  to: string;
  template: string;
  locals: Record<string, unknown>;
}

const email = new Email({
  message: { from: defaultMailFromAddress },
  send: true,
  transport: smtpUrl,
});

export default async function sendEmail({
  to,
  template,
  locals = {},
}: SendEmailOptions): Promise<void> {
  const templatePath = path.join(templatesDir, template);
  email.send({ template: templatePath, message: { to }, locals });
}
