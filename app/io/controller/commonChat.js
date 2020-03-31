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
    const nsp = app.io.of('/');
    const isMyUserRecentQuery = `
      email = '${socket.id}'
      AND peer = '${peer}'
      AND type = '${type}'`;
    // 清零unread/新增unread为0
    const myUserRecent = await app.mysql.query(`SELECT * FROM userRecent WHERE ${isMyUserRecentQuery}`);
    if (unread !== undefined && msg === undefined) {
      if (myUserRecent.length > 0) {
        await app.mysql.query(`UPDATE userRecent 
        SET unread = '${unread}'
        WHERE ${isMyUserRecentQuery}
        `);
      } else {
        await app.mysql.query(`INSERT INTO userRecent(email,peer,unread,msg,timestamp,type) 
        VALUES('${socket.id}','${peer}','${unread}','','','${type}')
        `);
      }
      socket.emit('updateRecentChat');
    }
    // 删除
    if (unread === undefined && msg === undefined) {
      await app.mysql.query(`
      DELETE FROM userRecent
      WHERE ${isMyUserRecentQuery}
      `);
      socket.emit('updateRecentChat');
    }
    // 新增/更新msg
    if (unread === undefined && msg !== undefined) {
      if (type === FRIEND_TYPE.FRIEND) {
        if (myUserRecent.length > 0) {
          await app.mysql.query(`UPDATE userRecent 
          SET msg = '${msg}',
          timestamp = '${String(Date.now())}'
          WHERE ${isMyUserRecentQuery}
          `);
        } else {
          await app.mysql.query(`INSERT INTO userRecent(email,peer,unread,msg,timestamp,type) 
          VALUES('${socket.id}','${peer}','0','${msg}','${String(Date.now())}','${type}')
          `);
        }
        socket.emit('updateRecentChat');
        const isPeerUserRecentQuery = `
          email = '${peer}'
          AND peer = '${socket.id}'
          AND type = '${type}'`;
        const peerUserRecent = await app.mysql.query(`SELECT * FROM userRecent WHERE ${isPeerUserRecentQuery}`);
        if (peerUserRecent.length > 0) {
          await app.mysql.query(`UPDATE userRecent 
          SET msg = '${msg}',
          timestamp = '${String(Date.now())}',
          unread = '${Number(peerUserRecent[0].unread) + 1}'
          WHERE ${isPeerUserRecentQuery}
          `);
        } else {
          await app.mysql.query(`INSERT INTO userRecent(email,peer,unread,msg,timestamp,type) 
          VALUES('${peer}','${socket.id}','1','${msg}','${String(Date.now())}','${type}')
          `);
        }
        if (nsp.sockets[peer]) {
          nsp.sockets[peer].emit('updateRecentChat');
        }
      }
      if (type === FRIEND_TYPE.GROUP) {
        const name = (await app.mysql
          .query(`SELECT * FROM groupMemberInfo
                WHERE chatKey = '${peer}' 
                AND email = '${socket.id}'
                `))[0].memberName
          ||
          (await app.mysql
            .query(`SELECT * FROM userInfo
                  WHERE email = '${socket.id}'
                  `))[0].nickname
          ;
        if (myUserRecent.length > 0) {
          await app.mysql.query(`UPDATE userRecent 
          SET msg = '${name}:${msg}',
          timestamp = '${String(Date.now())}'
          WHERE ${isMyUserRecentQuery}
          `);
        } else {
          await app.mysql.query(`INSERT INTO userRecent(email,peer,unread,msg,timestamp,type) 
          VALUES('${socket.id}','${peer}','0','${name}:${msg}','${String(Date.now())}','${type}')
          `);
        }
        socket.emit('updateRecentChat');
        const members = await app.mysql.query(`SELECT * FROM groupMemberInfo WHERE chatKey = '${peer}'`);
        for (let i = 0; i < members.length; i++) {
          const member = members[i];
          if (member.email !== socket.id) {
            // 群名片/好友备注/昵称
            const memberName = (await app.mysql
              .query(`SELECT * FROM groupMemberInfo
                    WHERE chatKey = '${peer}' 
                    AND email = '${socket.id}'
                    `))[0].memberName
              ||
              (await app.mysql
                .query(`SELECT * 
                      FROM userChatInfo 
                      WHERE email = '${member.email}' 
                      AND peer = '${socket.id}' 
                      AND type = '${FRIEND_TYPE.FRIEND}'
                      `))[0].remarkName
              ||
              (await app.mysql
                .query(`SELECT * FROM userInfo
                      WHERE email = '${socket.id}'
                      `))[0].nickname
              ;
            const isMemberRecent = `
            email = '${member.email}'
            AND peer = '${peer}'
            AND type = '${type}'`;
            const memberRecent = await app.mysql.query(`SELECT * 
            FROM userRecent
            WHERE ${isMemberRecent}
            `);
            if (memberRecent.length > 0) {
              await app.mysql.query(`UPDATE userRecent 
              SET msg = '${memberName}:${msg}',
              timestamp = '${String(Date.now())}',
              unread = '${Number(memberRecent[0].unread) + 1}'
              WHERE ${isMemberRecent}
              `);
            } else {
              await app.mysql.query(`INSERT INTO userRecent(email,peer,unread,msg,timestamp,type) 
              VALUES('${member.email}','${peer}','1','${memberName}:${msg}','${String(Date.now())}','${type}')
              `);
            }
            if (nsp.sockets[member.email]) {
              nsp.sockets[member.email].emit('updateRecentChat');
            }
          }
        }
      }
    }
  }
  async sendMsg() {
    const { socket, app } = this.ctx;
    const { peer, type, msg } = this.ctx.args[0];
    // const nsp = app.io.of('/');
    await app.mysql.query(`
      INSERT INTO chat(email,peer,msg,timestamp,msgType,type)
      VALUES('${socket.id}','${peer}','${msg}','${String(Date.now())}','${MSG_TYPE.COMMON_CHAT}','${type}')
    `);
  }
}

module.exports = CommonChatController;
