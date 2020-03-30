'use strict';

const Controller = require('egg').Controller;
const { FRIEND_TYPE } = require('../../utils/const');

class CommonChatController extends Controller {
  async getRecentChat() {
    const { socket, app } = this.ctx;
    const recentChats = [];
    const userRecent = await app.mysql.query(`SELECT * FROM userRecent WHERE email = '${socket.id}'`);
    for (let i = 0; i < userRecent.length; i++) {
      const { peer, unread, msg, timestamp, type } = userRecent[i];
      const peerInfo = { type, peer, avatar: '', name: '', msg, unread, timestamp };
      if (type === FRIEND_TYPE.FRIEND) {
        const userInfo = (await app.mysql.query(`SELECT * FROM userInfo WHERE email = '${peer}'`))[0];
        peerInfo.avatar = userInfo.avatar;
        peerInfo.name = (await app.mysql
          .query(`SELECT * FROM userChatInfo 
          WHERE email = '${socket.id}' 
          AND peer = '${peer}' 
          AND type = '${type}'`))[0].remarkName
          ||
          userInfo.nickname;
      }
      if (type === FRIEND_TYPE.GROUP) {
        const groupInfo = (await app.mysql.query(`SELECT * FROM groupCommonInfo WHERE chatKey = '${peer}'`))[0];
        peerInfo.avatar = groupInfo.avatar;
        peerInfo.name = (await app.mysql
          .query(`SELECT * FROM userChatInfo 
          WHERE email = '${socket.id}' 
          AND peer = '${peer}' 
          AND type = '${type}'`))[0].remarkName
          ||
          groupInfo.nickname;
      }
      recentChats.push(peerInfo);
    }
    socket.emit('setRecentChat', recentChats);
  }
}

module.exports = CommonChatController;
