import Email from "email-templates";
import path from "path";
import { defaultMailFromAddress, nodeEnv, smtpUrl } from "../config";

const templatesDir = path.join(__dirname, "../../templates/emails");

interface SendEmailOptions {
  to: string;
  template: string;
  locals: Record<string, unknown>;
}

const email = new Email({
  message: { from: defaultMailFromAddress },
  send: !["development", "test"].includes(nodeEnv),
  transport: smtpUrl,
});

export default async function sendEmail({
  to,
  template,
  locals = {},
}: SendEmailOptions): Promise<void> {
  // NOTE
  // Returning early here to avoid a strange uncaughtPromiseRejection
  //   when running tests via jest.
  // The cause seems to be a race condition or circular dependency when
  //   evaluating `require('pug')` in the exports.pug function in consolidate.js,
  //   a dependency of the email-templates package.
  // The `require('pug')` expression was evaluating to `{}` instead of the actual
  //   exported object of the pug package when running tests.
  if (nodeEnv === "test") return;

  const templatePath = path.join(templatesDir, template);
  email.send({ template: templatePath, message: { to }, locals });
}
