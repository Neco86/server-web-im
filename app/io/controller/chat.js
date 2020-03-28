'use strict';

const Controller = require('egg').Controller;
const { FRIEND_TYPE, MSG_TYPE, GROUP_PERMIT } = require('../../utils/const');

class ChatController extends Controller {
  async addFriend() {
    const { socket, app } = this.ctx;
    const { friendType, account, reason, groupKey, remarkName } = this.ctx.args[0];
    const nsp = app.io.of('/');
    const self = await app.mysql
      .query(`SELECT * FROM userInfo WHERE email = '${socket.id}'`);
    // 添加好友
    if (friendType === FRIEND_TYPE.FRIEND) {
      // 如果在线 给指定id发消息
      if (nsp.sockets[account]) {
        nsp.sockets[account].emit('applyFriend', {
          email: self[0].email,
          nickname: self[0].nickname,
          avatar: self[0].avatar,
          reason,
          type: friendType,
        });
      }
      // 申请过
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
          msg = '${JSON.stringify({ groupKey, remarkName, reason })}'
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
                reason,
              }),
              String(Date.now()),
              MSG_TYPE.APPLY_FRIEND,
              friendType,
            ]);
      }
    }
    // 添加群聊
    if (friendType === FRIEND_TYPE.GROUP) {
      const users = await app.mysql
        .query(`SELECT * FROM groupMemberInfo WHERE chatKey = '${account}' 
        AND ( permit = '${GROUP_PERMIT.OWNER}' || permit = '${GROUP_PERMIT.MANAGER}' )`);
      const groupInfo = await app.mysql
        .query(`SELECT * FROM groupCommonInfo WHERE chatKey = '${account}'`);
      for (let i = 0; i < users.length; i++) {
        const user = users[i].email;
        // 如果在线 给指定id发消息
        if (nsp.sockets[user]) {
          const groupRemarkName = await app.mysql
            .query(`SELECT * FROM userChatInfo WHERE email = '${user}' AND peer = '${account}'`);
          const friendRemarkName = await app.mysql
            .query(`SELECT * FROM userChatInfo WHERE email = '${user}' AND peer = '${self[0].email}'`);
          nsp.sockets[user].emit('applyFriend', {
            email: self[0].email,
            nickname: friendRemarkName[0].remarkName || self[0].nickname,
            avatar: self[0].avatar,
            reason,
            type: friendType,
            chatKey: groupInfo[0].chatKey,
            groupAvatar: groupInfo[0].avatar,
            groupName: groupRemarkName[0].remarkName || groupInfo[0].nickname,
          });
        }
        // 申请过
        const applied = await app.mysql
          .query(`SELECT * FROM chat WHERE 
          (email = '${socket.id}' )
          AND (peer = '${user}' )
          AND (type = '${friendType}')
          AND (msgType= '${MSG_TYPE.APPLY_FRIEND}')`);
        if (applied.length > 0) {
          await app.mysql
            .query(`
            UPDATE chat
            SET
            msg = '${JSON.stringify({ chatKey: account, groupKey, remarkName, reason })}'
            ,timestamp = '${String(Date.now())}'
            WHERE 
            email = '${socket.id}' 
            AND peer = '${user}' 
            AND type = '${friendType}'
            AND msgType= '${MSG_TYPE.APPLY_FRIEND}'`);
        } else {
          await app.mysql
            .query('INSERT INTO chat(email,peer,msg,timestamp,msgType,type) VALUES(?,?,?,?,?,?)',
              [
                socket.id,
                user,
                JSON.stringify({
                  chatKey: account,
                  groupKey,
                  remarkName,
                  reason,
                }),
                String(Date.now()),
                MSG_TYPE.APPLY_FRIEND,
                friendType,
              ]);
        }
      }
    }
    socket.emit('addFriend', {
      account,
      friendType,
      msg: '申请添加成功!',
    });
  }
  async online() {
    const { socket, app } = this.ctx;
    const friends = await app.mysql
      .query(`SELECT * FROM userChatInfo WHERE email = '${socket.id}'`);
    for (let i = 0; i < friends.length; i++) {
      const friend = friends[i];
      const nsp = app.io.of('/');
      if (friend.type === FRIEND_TYPE.FRIEND && nsp.sockets[friend.peer]) {
        const myInfo = await app.mysql
          .query(`SELECT * FROM userInfo WHERE email = '${socket.id}'`);
        const friendInfo = await app.mysql
          .query(`SELECT * FROM userChatInfo WHERE peer = '${socket.id}' AND email = '${friend.peer}'`);
        const { avatar, nickname, email } = myInfo[0];
        nsp.sockets[friend.peer].emit('online', {
          avatar, nickname: (friendInfo[0].remarkName || nickname), email, groupKey: friendInfo[0].groupKey,
        });
      }
    }
  }
  async offline() {
    const { socket, app } = this.ctx;
    const friends = await app.mysql
      .query(`SELECT * FROM userChatInfo WHERE email = '${socket.id}'`);
    for (let i = 0; i < friends.length; i++) {
      const friend = friends[i];
      const nsp = app.io.of('/');
      if (friend.type === FRIEND_TYPE.FRIEND && nsp.sockets[friend.peer]) {
        const myInfo = await app.mysql
          .query(`SELECT * FROM userInfo WHERE email = '${socket.id}'`);
        const friendInfo = await app.mysql
          .query(`SELECT * FROM userChatInfo WHERE peer = '${socket.id}' AND email = '${friend.peer}'`);
        const { email } = myInfo[0];
        nsp.sockets[friend.peer].emit('offline', {
          email, groupKey: friendInfo[0].groupKey,
        });
      }
    }
  }
  async getFriendApply() {
    //                  msgType            type
    //                  MSG_TYPE       FRIEND_TYPE
    // 申请      好友   APPLY_FRIEND       FRIEND
    // 申请      群组   APPLY_FRIEND       GROUP
    // 同意      好友   AGREE_FRIEND       FRIEND
    // 同意      群组   AGREE_FRIEND       GROUP
    // 拒绝      好友   DISAGREE_FRIEND    FRIEND
    // 拒绝      群组   DISAGREE_FRIEND    GROUP

    // chat.email === socked.id 我 申请/同意/拒绝
    // cha.peer   === socked.id    申请/同意/拒绝 我
    // const { socket, app } = this.ctx;
    // TODO: 查新并返回数据
  }
}

module.exports = ChatController;
