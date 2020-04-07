'use strict';

const Controller = require('egg').Controller;
const { FRIEND_TYPE } = require('../../utils/const')

class ChangeInfoController extends Controller {
  async setPermit() {
    const { socket, app } = this.ctx;
    const nsp = app.io.of('/');
    const { chatKey, peer, peerPermit, setPermit, myPermit, tickOut } = this.ctx.args[0];
    const mysqlMyPermit = (await app.mysql
      .query(`SELECT * FROM groupMemberInfo
      WHERE chatKey = '${chatKey}' AND email = '${socket.id}'`))[0].permit;
    const { key: peerKey, permit: mysqlPeerPermit } = (await app.mysql
      .query(`SELECT * FROM groupMemberInfo
      WHERE chatKey = '${chatKey}' AND email = '${peer}'`))[0];
    if (mysqlMyPermit === myPermit && peerPermit === mysqlPeerPermit) {
      if (tickOut) {
        await app.mysql.query(`DELETE FROM groupMemberInfo WHERE \`key\` = '${peerKey}'`);
        await app.mysql.query(`DELETE FROM userChatInfo WHERE email = '${peer}' AND peer = '${chatKey}' AND type = '${FRIEND_TYPE.GROUP}'`);
        await app.mysql.query(`DELETE FROM userRecent WHERE email = '${peer}' AND peer = '${chatKey}' AND type = '${FRIEND_TYPE.GROUP}'`);
      } else {
        await app.mysql
          .query(`UPDATE groupMemberInfo SET permit = '${setPermit}'
        WHERE \`key\` = '${peerKey}'`);
      }
    }
    const members = await app.mysql
      .query(`SELECT * FROM groupMemberInfo WHERE chatKey = '${chatKey}'`);
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      if (nsp.sockets[member.email]) {
        nsp.sockets[member.email].emit('setPermit', this.ctx.args[0]);
      }
    }
  }
}

module.exports = ChangeInfoController;
