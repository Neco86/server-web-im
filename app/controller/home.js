'use strict';

const Controller = require('egg').Controller;
const { SUCCESS_CODE, ERROR_CODE } = require('../utils/const');


class HomeController extends Controller {
  // 获取验证码
  async verifyToken() {
    const { ctx, app } = this;
    const data = ctx.request.body;
    const { token } = data;
    try {
      const tokenInfo = await app.jwt.verify(token, app.config.jwt.secret);
      const user = await app.mysql
        .query('SELECT * FROM userInfo WHERE email = ?', tokenInfo.email);
      ctx.body = {
        code: SUCCESS_CODE,
        msg: '登录成功',
        nickname: user[0].nickname,
      };
    } catch (e) {
      ctx.body = {
        code: ERROR_CODE,
        msg: '身份令牌过期,请重新登录',
      };
    }
  }
}

module.exports = HomeController;
