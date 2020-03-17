'use strict';

const Controller = require('egg').Controller;
const { SUCCESS_CODE, ERROR_CODE } = require('../utils/const');
const nodemailer = require('../utils/nodemailer');
const { createRandomNum } = require('../utils/utils');


class RegisterController extends Controller {
  async getCaptcha() {
    const { ctx, app } = this;
    const data = ctx.request.body;
    const { email } = data;
    const exist = await app.mysql
      .query('SELECT * FROM userInfo WHERE email = ?', email);
    if (exist.length) {
      ctx.body = {
        code: ERROR_CODE,
        msg: '用户存在,请尝试登陆',
      };
    } else {
      const captcha = createRandomNum(6);
      const timestamp = String(Date.now());
      const exist = await app.mysql
        .query('SELECT * FROM confirm WHERE email = ?', email);
      if (exist.length) {
        await app.mysql
          .query('UPDATE confirm SET captcha = ?,timestamp = ? WHERE email = ?', [captcha, timestamp, email]);
      } else {
        await app.mysql
          .query('INSERT INTO confirm(email,captcha,timestamp) VALUES(?,?,?)', [email, captcha, timestamp]);
      }
      const mail = {
        from: '<web_im@163.com>',
        subject: '注册ChatChat',
        to: email,
        text: `您的验证码为: ${captcha}`,
      };
      await nodemailer(mail);
      ctx.body = {
        code: SUCCESS_CODE,
        msg: '获取验证码成功',
      };
    }
  }
  async register() {
    const { ctx, app } = this;
    const data = ctx.request.body;
    const { nickname, password, email, captcha } = data;
    const exist = await app.mysql
      .query('SELECT * FROM userInfo WHERE email = ?', email);
    if (exist.length) {
      ctx.body = {
        code: ERROR_CODE,
        msg: '用户存在,请尝试登陆',
      };
    } else {
      const confirm = await app.mysql
        .query('SELECT * FROM confirm WHERE email = ?', email);
      if ((confirm[0].captcha !== captcha) || (Date.now() - confirm.timestamp > 30 * 60 * 1000)) {
        ctx.body = {
          code: ERROR_CODE,
          msg: '验证码错误,请尝试重新获取验证码',
        };
      } else {
        await app.mysql
          .query('DELETE FROM confirm where email = ?', email);
        await app.mysql
          .query('INSERT INTO userInfo(email,nickName,password) VALUES(?,?,?)', [email, nickname, password]);
        ctx.body = {
          code: SUCCESS_CODE,
          msg: '注册成功',
        };
      }
    }
  }
}

module.exports = RegisterController;
