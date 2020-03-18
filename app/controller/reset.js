'use strict';

const Controller = require('egg').Controller;
const { SUCCESS_CODE, ERROR_CODE } = require('../utils/const');
const nodemailer = require('../utils/nodemailer');
const { createRandomNum } = require('../utils/utils');


class ResetController extends Controller {
  // 获取验证码
  async getCaptcha() {
    const { ctx, app } = this;
    const data = ctx.request.body;
    const { email } = data;
    // 当前用户是否存在
    const exist = await app.mysql
      .query('SELECT * FROM userInfo WHERE email = ?', email);
    if (exist.length) {
      // 存在
      const captcha = createRandomNum(6);
      const timestamp = String(Date.now());
      // 是否获取过验证码
      const exist = await app.mysql
        .query('SELECT * FROM confirm WHERE email = ?', email);
      if (exist.length) {
        // 获取过
        await app.mysql
          .query('UPDATE confirm SET captcha = ?,timestamp = ? WHERE email = ?', [captcha, timestamp, email]);
      } else {
        // 没获取过
        await app.mysql
          .query('INSERT INTO confirm(email,captcha,timestamp) VALUES(?,?,?)', [email, captcha, timestamp]);
      }
      // 发送邮件
      const mail = {
        from: '<web_im@163.com>',
        subject: 'ChatChat',
        to: email,
        text: `您的验证码为: ${captcha}`,
      };
      await nodemailer(mail);
      ctx.body = {
        code: SUCCESS_CODE,
        msg: '获取验证码成功',
      };
    } else {
      // 不存在
      ctx.body = {
        code: ERROR_CODE,
        msg: '用户不存在',
      };
    }
  }
  // 验证邮箱
  async confirmEmail() {
    const { ctx, app } = this;
    const data = ctx.request.body;
    const { email, captcha } = data;
    // 当前用户是否存在
    const exist = await app.mysql
      .query('SELECT * FROM userInfo WHERE email = ?', email);
    if (exist.length) {
      // 存在
      const confirm = await app.mysql
        .query('SELECT * FROM confirm WHERE email = ?', email);
      if ((confirm[0].captcha !== captcha) || (Date.now() - confirm.timestamp > 30 * 60 * 1000)) {
        // 错误或过期
        ctx.body = {
          code: ERROR_CODE,
          msg: '验证码错误,请尝试重新获取验证码',
        };
      } else {
        // 验证码正确
        // 删除获取验证码
        await app.mysql
          .query('DELETE FROM confirm where email = ?', email);
        ctx.body = {
          code: SUCCESS_CODE,
          msg: '邮箱验证成功',
        };
      }
    } else {
      // 不存在
      ctx.body = {
        code: ERROR_CODE,
        msg: '用户不存在',
      };
    }
  }
  async resetPassword() {
    const { ctx, app } = this;
    const data = ctx.request.body;
    const { email, password } = data;
    await app.mysql
      .query('UPDATE userInfo SET password = ? WHERE email = ?', [password, email]);
    ctx.body = {
      code: SUCCESS_CODE,
      msg: '重置密码成功',
    };
  }

}

module.exports = ResetController;
