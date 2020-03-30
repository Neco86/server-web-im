'use strict';

const Controller = require('egg').Controller;
const { FRIEND_TYPE, MSG_TYPE } = require('../../utils/const');

class CommonChatController extends Controller {
  async getRecentChat() {
    const { socket, app } = this.ctx;
    const recentChats = [];
    const userRecent = await app.mysql.query(`SELECT * FROM userRecent WHERE email = '${socket.id}' ORDER BY \`key\` DESC`);
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
  async setRecentChat() {
    const { socket, app } = this.ctx;
    const { peer, type, unread, msg } = this.ctx.args[0];
    const source = await app.mysql.query(`
      SELECT * FROM userRecent
      WHERE email = '${socket.id}' 
      AND peer = '${peer}'
      AND type = '${type}'
      `);
    if (source.length === 0) {
      // 插入新的
      let chatInfo = [];
      // 查询好友最新消息
      if (type === FRIEND_TYPE.FRIEND) {
        chatInfo = await app.mysql
          .query(`
          SELECT * FROM chat 
          WHERE (msgType = '${MSG_TYPE.COMMON_CHAT}')
          AND (type = '${FRIEND_TYPE.FRIEND}')
          AND (
            (email = '${socket.id}' AND peer = '${peer}')
              OR (email = '${peer}' AND peer = '${socket.id}')
          )
          ORDER BY timestamp DESC LIMIT 1
          `);
      }
      // 查询群聊最新消息
      if (type === FRIEND_TYPE.GROUP) {
        chatInfo = await app.mysql
          .query(`
          SELECT * FROM chat 
          WHERE (msgType = '${MSG_TYPE.COMMON_CHAT}')
          AND (type = '${FRIEND_TYPE.GROUP}')
          AND (peer = '${peer}')
          ORDER BY timestamp DESC LIMIT 1
          `);
      }
      if (chatInfo.length > 0) {
        await app.mysql.query(`
        INSERT INTO userRecent
        (email,peer,unread,msg,timestamp,type)
        VALUES('${socket.id}','${peer}','0','${chatInfo[0].msg}','${chatInfo[0].timestamp}','${type}' )
        `);
      } else {
        await app.mysql.query(`
        INSERT INTO userRecent
        (email,peer,unread,msg,timestamp,type)
        VALUES('${socket.id}','${peer}','0','','','${type}' )
        `);
      }
    } else {
      if (msg !== undefined) {
        // 更新消息
        await app.mysql.query(`
        UPDATE userRecent
        SET 
        msg = '${msg}',
        unread = '${unread}',
        timestamp = '${String(Date.now())}'
        WHERE email = '${socket.id}' 
        AND peer = '${peer}'
        AND type = '${type}'
        `);
      }
      if (unread !== undefined) {
        // 更新未读
        await app.mysql.query(`
        UPDATE userRecent
        SET 
        unread = '${unread}'
        WHERE email = '${socket.id}' 
        AND peer = '${peer}'
        AND type = '${type}'
        `);
      }
      if (msg === undefined && unread === undefined) {
        // 删除
        await app.mysql.query(`
        DELETE from userRecent
        WHERE email = '${socket.id}' 
        AND peer = '${peer}'
        AND type = '${type}'
        `);
      }
    }
    socket.emit('updateRecentChat');
  }
}

module.exports = CommonChatController;
