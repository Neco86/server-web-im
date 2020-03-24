'use strict';

const Controller = require('egg').Controller;

class GroupController extends Controller {
  async getMyGroup() {
    const { socket, app } = this.ctx;
    const friendType = this.ctx.args[0];
    const groups = await app.mysql
      .query(`SELECT * FROM userGroupInfo WHERE email = '${socket.id}' AND type = '${friendType}'`);
    socket.emit('getMyGroup', { friendType, groups });
  }
}

module.exports = GroupController;
