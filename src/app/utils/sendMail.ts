import nodemailer from 'nodemailer'

export const sendMail=async({to,subject,text,html}:{to:string,subject:string,text?:string,html:string})=>{
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // true for port 465, false for other ports
        auth: {
          user: "shourav.paul01@gmail.com",
          pass: "iccb htoa ztcc qrej",
        },
      });
      await transporter.sendMail({
        from: 'shourav.paul01@gmail.com', // sender address
        to ,// list of receivers
        subject, // Subject line
        text, // plain text body
        html, // html body
      });
}
