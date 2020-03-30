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
    const { socket, app } = this.ctx;
    const applies = (await app.mysql
      .query(`SELECT * FROM chat WHERE 
      (email = '${socket.id}' OR peer = '${socket.id}')
      AND (msgType = '${MSG_TYPE.APPLY_FRIEND}' OR msgType = '${MSG_TYPE.AGREE_FRIEND}' OR msgType = '${MSG_TYPE.DISAGREE_FRIEND}')
      AND (type = '${FRIEND_TYPE.FRIEND}' OR type = '${FRIEND_TYPE.GROUP}')
      `)).sort((a, b) => b.timestamp - a.timestamp);
    const friendApply = [];
    for (let i = 0; i < applies.length; i++) {
      const { email, peer, msgType, type, msg } = applies[i];
      const { reason, chatKey } = JSON.parse(msg);
      const peerInfo =
        ((await app.mysql.query(`SELECT * FROM userInfo WHERE email = '${email === socket.id ? peer : email}'`))
          .map(item => ({
            email: item.email,
            nickname: item.nickname,
            avatar: item.avatar,
          })))[0];
      const groupInfo =
        ((await app.mysql.query(`SELECT * FROM groupCommonInfo WHERE chatKey = '${chatKey}'`))
          .map(item => ({
            chatKey: item.chatKey,
            nickname: item.nickname,
            avatar: item.avatar,
          })))[0];
      friendApply.push({
        peerInfo,
        groupInfo,
        reason,
        my: email === socket.id,
        apply: msgType === MSG_TYPE.APPLY_FRIEND,
        agree: msgType === MSG_TYPE.AGREE_FRIEND,
        disagree: msgType === MSG_TYPE.DISAGREE_FRIEND,
        friend: type === FRIEND_TYPE.FRIEND,
      });
    }
    socket.emit('getFriendApply', friendApply);
  }
  async handleApply() {
    const { socket, app } = this.ctx;
    const { agree, friend, email, chatKey, remarkName, group } = this.ctx.args[0];
    const msg = JSON.parse((await app.mysql.query(`
      SELECT * FROM  chat WHERE email = '${email}' AND peer = '${socket.id}'
    `)).sort((a, b) => b.timestamp - a.timestamp)[0].msg);
    const nsp = app.io.of('/');
    // 同意/拒绝好友
    if (friend) {
      // 更新chat的我的信息
      await app.mysql.query(`
          UPDATE chat 
          SET msgType = '${agree ? MSG_TYPE.AGREE_FRIEND : MSG_TYPE.DISAGREE_FRIEND}'
          WHERE email = '${email}' 
          AND peer = '${socket.id}' 
          AND msgType = '${MSG_TYPE.APPLY_FRIEND}'
          AND type = '${FRIEND_TYPE.FRIEND}'
        `);
      // 更新chat里对面信息
      await app.mysql.query(`
        UPDATE chat 
        SET msgType = '${agree ? MSG_TYPE.AGREE_FRIEND : MSG_TYPE.DISAGREE_FRIEND}'
        WHERE email = '${socket.id}' 
        AND peer = '${email}' 
        AND msgType = '${MSG_TYPE.APPLY_FRIEND}'
        AND type = '${FRIEND_TYPE.FRIEND}'
      `);
      // 如果同意,双方通讯录添加好友
      if (agree) {
        await app.mysql.query(`
          INSERT INTO 
          userChatInfo(email,peer,type,groupKey,remarkName)
          VALUES('${socket.id}','${email}','${FRIEND_TYPE.FRIEND}','${group}','${remarkName}')
        `);
        await app.mysql.query(`
          INSERT INTO 
          userChatInfo(email,peer,type,groupKey,remarkName)
          VALUES('${email}','${socket.id}','${FRIEND_TYPE.FRIEND}','${msg.groupKey}','${msg.remarkName}')
        `);
      }
      // 在线通知
      if (nsp.sockets[email]) {
        const userInfo = (await app.mysql
          .query(`SELECT * FROM userInfo WHERE email = '${socket.id}'`))[0];
        nsp.sockets[email].emit('handledApply', {
          email: userInfo.email,
          nickname: userInfo.nickname,
          avatar: userInfo.avatar,
          friend,
          agree,
        });
      }
    } else { // 同意/拒绝群聊申请
      // 更新chat
      await app.mysql.query(`
          UPDATE chat 
          SET msgType = '${agree ? MSG_TYPE.AGREE_FRIEND : MSG_TYPE.DISAGREE_FRIEND}'
          WHERE email = '${email}' 
          AND JSON_EXTRACT(chat.msg,'$.chatKey') = '${chatKey}'
          AND msgType = '${MSG_TYPE.APPLY_FRIEND}'
          AND type = '${FRIEND_TYPE.GROUP}'
        `);
      // 同意加入聊天表和群成员表
      if (agree) {
        await app.mysql.query(`
          INSERT INTO
          userChatInfo(email,peer,type,groupKey,remarkName)
          VALUES('${email}','${chatKey}','${FRIEND_TYPE.GROUP}','${msg.groupKey}','${msg.remarkName}')
        `);
        await app.mysql.query(`
          INSERT INTO
          groupMemberInfo(chatKey,email,permit)
          VALUES('${chatKey}','${email}','${GROUP_PERMIT.MEMBER}')
        `);
      }
      // 上线通知
      if (nsp.sockets[email]) {
        const userInfo = (await app.mysql
          .query(`SELECT * FROM groupCommonInfo WHERE chatKey = '${chatKey}'`))[0];
        nsp.sockets[email].emit('handledApply', {
          chatKey: userInfo.chatKey,
          nickname: userInfo.nickname,
          avatar: userInfo.avatar,
          friend,
          agree,
        });
      }
    }
    socket.emit('handleApply', this.ctx.args[0]);
  }
  async createGroup() {
    const { socket, app } = this.ctx;
    const { member, group } = this.ctx.args[0];
    const selfInfo = (await app.mysql.query(`SELECT * FROM userInfo WHERE email = '${socket.id}'`))[0];
    const lastInfo = (await app.mysql.query('SELECT * FROM groupCommonInfo ORDER BY chatKey DESC LIMIT 1'))[0];
    const chatKey = Number(lastInfo.chatKey) + 1;
    const nickname = `${selfInfo.nickname}创建的群聊`;
    const nsp = app.io.of('/');
    const myGroup = (await app.mysql.query(`SELECT * FROM userGroupInfo WHERE email = '${socket.id}' AND \`key\` = '${group}' AND type = '${FRIEND_TYPE.GROUP}'`))[0];
    // 添加groupCommonInfo
    await app.mysql.query(`INSERT INTO groupCommonInfo(chatKey,nickname) VALUES('${chatKey}','${nickname}')`);
    for (let i = 0; i < member.length; i++) {
      // 添加groupMemberInfo
      await app.mysql.query(`INSERT INTO groupMemberInfo(chatKey,email,permit) 
      VALUES('${chatKey}','${member[i]}','${member[i] === socket.id ? GROUP_PERMIT.OWNER : GROUP_PERMIT.MEMBER}')`);
      // 添加chatInfo
      const memberGroup = (await app.mysql.query(`SELECT * FROM userGroupInfo WHERE email = '${member[i]}' AND type = '${FRIEND_TYPE.GROUP}' ORDER BY \`key\` LIMIT 1`))[0];
      await app.mysql.query(`INSERT INTO userChatInfo(email,peer,type,groupKey)
      VALUES('${member[i]}','${chatKey}','${FRIEND_TYPE.GROUP}','${member[i] === socket.id ? group : memberGroup.key}')`);
      // 在线发消息
      if (nsp.sockets[member[i]]) {
        nsp.sockets[member[i]].emit('createGroup',
          { my: member[i] === socket.id, chatKey, nickname, groupName: member[i] === socket.id ? myGroup.groupName : memberGroup.groupName });
      }
    }
  }
}

module.exports = ChatController;
