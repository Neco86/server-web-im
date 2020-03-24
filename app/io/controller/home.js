'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
  async init() {
    const { socket, app } = this.ctx;
    const users = await app.mysql
      .query('SELECT * FROM userInfo WHERE email = ?', socket.id);
    socket.emit('init', { nickname: users[0].nickname });
    // 加入 自己 好友 群组 房间
    socket.join(socket.id);
    const friends = await app.mysql
      .query('SELECT * FROM userChatInfo WHERE email = ?', socket.id);
    for (let i = 0; i < friends.length; i++) {
      const friend = friends[i];
      socket.join(friend.peer);
    }
  }
  async getUserInfo() {
    const { socket, app } = this.ctx;
    const users = await app.mysql
      .query('SELECT * FROM userInfo WHERE email = ?', socket.id);
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
      .query(`UPDATE userInfo SET ${sql} WHERE email = ?`, [...Object.values(params), socket.id]);
    socket.emit('setUserInfo', params);
  }
}

module.exports = HomeController;
