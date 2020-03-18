'use strict';

const Controller = require('egg').Controller;
const { SUCCESS_CODE, ERROR_CODE } = require('../utils/const');


class LoginController extends Controller {
  // 获取验证码
  async login() {
    const { ctx, app } = this;
    const data = ctx.request.body;
    const { email, password } = data;
    // 当前用户是否存在
    const exist = await app.mysql
      .query('SELECT * FROM userInfo WHERE email = ?', email);
    if (exist.length) {
      // 存在
      // 密码正确
      if (exist[0].password === password) {
        const token = app.jwt.sign({
          email,
          // 一小时过期
          exp: Math.floor(Date.now() / 1000) + 60 * 60,
          // 5s过期
          // exp: Math.floor(Date.now() / 1000) + 5,
        }, app.config.jwt.secret);
        ctx.body = {
          code: SUCCESS_CODE,
          msg: '登录成功',
          token,
        };
      } else {
        ctx.body = {
          code: ERROR_CODE,
          msg: '密码错误',
        };
      }
    } else {
      ctx.body = {
        code: ERROR_CODE,
        msg: '用户不存在',
      };
    }
  }
}

module.exports = LoginController;
