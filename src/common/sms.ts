import path from "path";
import pug from "pug";

const templatesDir = path.join(__dirname, "../../templates/sms");

interface SendSMSOptions {
  to: string;
  template: string;
  locals: Record<string, unknown>;
}

export default async function sendSMS({
  to,
  template,
  locals = {},
}: SendSMSOptions): Promise<void> {
  const templatePath = path.join(templatesDir, `${template}.pug`);
  const messageBody = pug.renderFile(templatePath, locals);

  // TODO: replace with legit SMS-sending logic
  console.log({ to, messageBody });
}
