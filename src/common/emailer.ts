import Email from "email-templates";

const { SENDINBLUE_SMTP_USER, SENDINBLUE_SMTP_KEY } = process.env;

if (!SENDINBLUE_SMTP_USER || !SENDINBLUE_SMTP_KEY) {
  throw new Error("No SMTP authentication vars in env");
}

const email = new Email({
  message: {
    from: SENDINBLUE_SMTP_USER,
  },
  // send: true,
  transport: {
    host: "smtp-relay.sendinblue.com",
    port: 587,
    auth: {
      user: SENDINBLUE_SMTP_USER,
      pass: SENDINBLUE_SMTP_KEY,
    },
  },
});

export default email;
