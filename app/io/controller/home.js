'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
  async init() {
    const { socket, app } = this.ctx;
    const users = await app.mysql
      .query('SELECT * FROM userInfo WHERE email = ?', socket.id);
    socket.emit('init', { nickname: users[0].nickname });
  }
}

module.exports = HomeController;
