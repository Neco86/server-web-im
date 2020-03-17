'use strict';

const nodemailer = require('nodemailer');

// 创建一个smtp服务器
const config = {
  host: 'smtp.163.com',
  port: 465,
  auth: {
    user: 'web_im@163.com',
    pass: 'BJPSDEZLHXTRIEVW',
  },
};
// 创建一个SMTP客户端对象
const transporter = nodemailer.createTransport(config);

// 发送邮件
module.exports = mail => {
  transporter.sendMail(mail, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log('mail sent:', info.response);
  });
};
