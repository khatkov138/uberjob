import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendEmailValues {
    to: string;
    subject: string;
    text: string
}

export async function sendEmail({ to, subject, text }: SendEmailValues) {

    console.log('send Email func')
    const res = await resend.emails.send({
        from: "verification@pay2p.ru",
        to,
        subject,
        text
    })
    console.log(res.error)

} 