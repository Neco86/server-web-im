'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
  async init() {
    const { socket, app } = this.ctx;
    const users = await app.mysql
      .query('SELECT * FROM userInfo WHERE email = ?', socket.email);
    socket.emit('init', { nickname: users[0].nickname });
  }
  async getUserInfo() {
    const { socket, app } = this.ctx;
    const users = await app.mysql
      .query('SELECT * FROM userInfo WHERE email = ?', socket.email);
    const userInfo = {};
    this.ctx.args[0].forEach(item => {
      userInfo[item] = users[0][item];
    });
    socket.emit('getUserInfo', userInfo);
  }
  async setUserInfo() {
    const { socket, app } = this.ctx;
    let sql = '';
    const params = this.ctx.args[0];
    Object.keys(params).forEach((name, index) => { sql += `${index > 0 ? ',' : ''}${name} = ?`; });
    await app.mysql
      .query(`UPDATE userInfo SET ${sql} WHERE email = ?`, [...Object.values(params), socket.email]);
    socket.emit('setUserInfo', params);
  }
}

module.exports = HomeController;
