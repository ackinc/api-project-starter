import Email from "email-templates";

import { defaultMailFromAddress, smtpUrl } from "../config";

const email = new Email({
  message: { from: defaultMailFromAddress },
  send: true,
  transport: smtpUrl,
});

export default email;
