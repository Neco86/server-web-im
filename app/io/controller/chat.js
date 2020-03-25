'use strict';

const Controller = require('egg').Controller;
const { FRIEND_TYPE, MSG_TYPE } = require('../../utils/const');

class ChatController extends Controller {
  async addFriend() {
    const { socket, app } = this.ctx;
    const { friendType, account, reason, groupKey, remarkName } = this.ctx.args[0];
    const nsp = app.io.of('/');
    // 添加好友
    if (friendType === FRIEND_TYPE.FRIEND) {
      const user = await app.mysql
        .query(`SELECT * FROM userInfo WHERE email = '${socket.id}'`);
      // 如果在线 给指定id发消息
      if (nsp.sockets[account]) {
        nsp.sockets[account].emit('applyFriend', {
          email: user[0].email,
          nickname: user[0].nickname,
          avatar: user[0].avatar,
          reason,
          type: friendType,
        });
      }
    }
    // 添加群聊
    if (friendType === FRIEND_TYPE.APPLY_FRIEND) {
      // TODO: 查找群成员,如果在线,发消息
    }
    // 申请过且没别处理的
    const applied = await app.mysql
      .query(`SELECT * FROM chat WHERE 
      (email = '${socket.id}' )
      AND (peer = '${account}' )
      AND (type = '${friendType}')
      AND (msgType= '${MSG_TYPE.APPLY_FRIEND}')`);
    if (applied.length > 0) {
      await app.mysql
        .query(`
        UPDATE chat
        SET
        msg = '${JSON.stringify({ groupKey, remarkName })}'
        ,timestamp = '${String(Date.now())}'
        WHERE 
        email = '${socket.id}' 
        AND peer = '${account}' 
        AND type = '${friendType}'
        AND msgType= '${MSG_TYPE.APPLY_FRIEND}'`);
    } else {
      await app.mysql
        .query('INSERT INTO chat(email,peer,msg,timestamp,msgType,type) VALUES(?,?,?,?,?,?)',
          [
            socket.id,
            account,
            JSON.stringify({
              groupKey,
              remarkName,
            }),
            String(Date.now()),
            MSG_TYPE.APPLY_FRIEND,
            friendType,
          ]);
    }
    socket.emit('addFriend', {
      account,
      friendType,
      msg: '申请添加成功!',
    });
  }
}

module.exports = ChatController;
