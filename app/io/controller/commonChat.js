'use strict';

const fs = require('fs');
const path = require('path');
const Controller = require('egg').Controller;
const { createRandomNum } = require('../../utils/utils');
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
    const timestamp = String(Date.now());
    // 清零unread/新增unread为0
    const myUserRecent = await app.mysql.query(`SELECT * FROM userRecent WHERE ${isMyUserRecentQuery}`);
    if (unread !== undefined && msg === undefined) {
      if (myUserRecent.length > 0) {
        await app.mysql.query(`UPDATE userRecent 
        SET unread = '${unread}'
        WHERE ${isMyUserRecentQuery}
        `);
      } else {
        if (type === FRIEND_TYPE.FRIEND) {
          const lastFriendChat = await app.mysql.query(`
          SELECT *
          FROM chat 
          WHERE ((msgType = '${MSG_TYPE.COMMON_CHAT}') OR (msgType = '${MSG_TYPE.PICTURE}') OR (msgType = '${MSG_TYPE.FILE}' OR (msgType = '${MSG_TYPE.FOLDER}')))
          AND type = '${type}'
          AND ((email = '${socket.id}' AND peer = '${peer}')
            OR (email = '${peer}' AND peer = '${socket.id}'))
          ORDER BY timestamp DESC
          LIMIT 1
          `);
          if (lastFriendChat.length > 0) {
            let msg = '';
            if (lastFriendChat[0].msgType === MSG_TYPE.COMMON_CHAT) {
              msg = lastFriendChat[0].msg;
            }
            if (lastFriendChat[0].msgType === MSG_TYPE.PICTURE) {
              msg = '[图片]';
            }
            if (lastFriendChat[0].msgType === MSG_TYPE.FILE) {
              const { name } = JSON.parse(lastFriendChat[0].msg);
              msg = `[文件]${name}`;
            }
            if (lastFriendChat[0].msgType === MSG_TYPE.FOLDER) {
              const { folderName } = JSON.parse(lastFriendChat[0].msg);
              msg = `[文件夹]${folderName}`;
            }
            await app.mysql.query(`INSERT INTO userRecent(email,peer,unread,msg,timestamp,type) 
            VALUES('${socket.id}','${peer}','${unread}','${msg}','${lastFriendChat[0].timestamp}','${type}')
            `);
          } else {
            await app.mysql.query(`INSERT INTO userRecent(email,peer,unread,msg,timestamp,type) 
            VALUES('${socket.id}','${peer}','${unread}','','','${type}')
            `);
          }
        }
        if (type === FRIEND_TYPE.GROUP) {
          const lastMemberChat = await app.mysql.query(`
          SELECT *
          FROM chat 
          WHERE ((msgType = '${MSG_TYPE.COMMON_CHAT}') OR (msgType = '${MSG_TYPE.PICTURE}') OR (msgType = '${MSG_TYPE.FILE}')  OR (msgType = '${MSG_TYPE.FOLDER}'))
          AND type = '${type}'
          AND peer = '${peer}'
          ORDER BY timestamp DESC
          LIMIT 1
          `);
          if (lastMemberChat.length > 0) {
            let msg = '';
            if (lastMemberChat[0].msgType === MSG_TYPE.COMMON_CHAT) {
              msg = lastMemberChat[0].msg;
            }
            if (lastMemberChat[0].msgType === MSG_TYPE.PICTURE) {
              msg = '[图片]';
            }
            if (lastMemberChat[0].msgType === MSG_TYPE.FILE) {
              const { name } = JSON.parse(lastMemberChat[0].msg);
              msg = `[文件]${name}`;
            }
            if (lastMemberChat[0].msgType === MSG_TYPE.FOLDER) {
              const { folderName } = JSON.parse(lastMemberChat[0].msg);
              msg = `[文件夹]${folderName}`;
            }
            if (lastMemberChat[0].email === socket.id) {
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
              await app.mysql.query(`INSERT INTO userRecent(email,peer,unread,msg,timestamp,type) 
                VALUES('${socket.id}','${peer}','${unread}','${name}:${msg}','${lastMemberChat[0].timestamp}','${type}')
              `);
            } else {
              // 群名片/好友备注/昵称
              const memberName = (await app.mysql
                .query(`SELECT * FROM groupMemberInfo
                      WHERE chatKey = '${peer}' 
                      AND email = '${lastMemberChat[0].email}'
                      `))[0].memberName
                ||
                (await app.mysql
                  .query(`SELECT * 
                        FROM userChatInfo 
                        WHERE email = '${socket.id}' 
                        AND peer = '${lastMemberChat[0].email}' 
                        AND type = '${FRIEND_TYPE.FRIEND}'
                        `))[0].remarkName
                ||
                (await app.mysql
                  .query(`SELECT * FROM userInfo
                        WHERE email = '${lastMemberChat[0].email}'
                        `))[0].nickname
                ;
              await app.mysql.query(`INSERT INTO userRecent(email,peer,unread,msg,timestamp,type) 
                VALUES('${socket.id}','${peer}','${unread}','${memberName}:${msg}','${lastMemberChat[0].timestamp}','${type}')
              `);
            }
          } else {
            await app.mysql.query(`INSERT INTO userRecent(email,peer,unread,msg,timestamp,type) 
                VALUES('${socket.id}','${peer}','${unread}','','','${type}')
              `);
          }
        }
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
          timestamp = '${timestamp}'
          WHERE ${isMyUserRecentQuery}
          `);
        } else {
          await app.mysql.query(`INSERT INTO userRecent(email,peer,unread,msg,timestamp,type) 
          VALUES('${socket.id}','${peer}','0','${msg}','${timestamp}','${type}')
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
          timestamp = '${timestamp}',
          unread = '${Number(peerUserRecent[0].unread) + 1}'
          WHERE ${isPeerUserRecentQuery}
          `);
        } else {
          await app.mysql.query(`INSERT INTO userRecent(email,peer,unread,msg,timestamp,type) 
          VALUES('${peer}','${socket.id}','1','${msg}','${timestamp}','${type}')
          `);
        }
        if (nsp.sockets[peer]) {
          nsp.sockets[peer].emit('updateRecentChat');
        }
      }
      if (type === FRIEND_TYPE.GROUP) {
        // 群名/昵称
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
          timestamp = '${timestamp}'
          WHERE ${isMyUserRecentQuery}
          `);
        } else {
          await app.mysql.query(`INSERT INTO userRecent(email,peer,unread,msg,timestamp,type) 
          VALUES('${socket.id}','${peer}','0','${name}:${msg}','${timestamp}','${type}')
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
              timestamp = '${timestamp}',
              unread = '${Number(memberRecent[0].unread) + 1}'
              WHERE ${isMemberRecent}
              `);
            } else {
              await app.mysql.query(`INSERT INTO userRecent(email,peer,unread,msg,timestamp,type) 
              VALUES('${member.email}','${peer}','1','${memberName}:${msg}','${timestamp}','${type}')
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
    const { peer, type, msgType } = this.ctx.args[0];
    let { msg } = this.ctx.args[0];
    const nsp = app.io.of('/');
    const timestamp = String(Date.now());
    // 信息是图片
    if (msgType === MSG_TYPE.PICTURE) {
      const { file, type } = msg;
      const random = createRandomNum(6);
      fs.writeFileSync(path.join('./', `app/public/chatImg/${socket.id}_${peer}_${timestamp}_${random}.${type}`), file);
      msg = `http://192.168.0.104:7001/public/chatImg/${socket.id}_${peer}_${timestamp}_${random}.${type}`;
    }
    // 信息是文件
    if (msgType === MSG_TYPE.FILE) {
      const { file, name } = msg;
      const random = createRandomNum(6);
      fs.writeFileSync(path.join('./', `app/public/chatFile/${socket.id}_${peer}_${timestamp}_${random}_${name}`), file);
      const src = `http://192.168.0.104:7001/public/chatFile/${socket.id}_${peer}_${timestamp}_${random}_${name}`;
      msg = JSON.stringify({
        src,
        name,
      });
    }
    // 信息是文件夹
    if (msgType === MSG_TYPE.FOLDER) {
      const { fileList, folderName } = msg;
      const random = createRandomNum(6);
      const paths = [];
      for (let i = 0; i < fileList.length; i++) {
        const { file, path: p } = fileList[i];
        fs.mkdirSync(`app/public/chatFileFolder/${socket.id}_${peer}_${timestamp}_${random}/${p.split('/').slice(0, p.split('/').length - 1).join('/')}`, { recursive: true });
        fs.writeFileSync(
          path.join('./', `app/public/chatFileFolder/${socket.id}_${peer}_${timestamp}_${random}/${p}`), file);
        paths.push(p);
      }
      msg = JSON.stringify({
        baseSrc: `http://192.168.0.104:7001/public/chatFileFolder/${socket.id}_${peer}_${timestamp}_${random}`,
        paths,
        folderName,
      });
    }
    await app.mysql.query(`
      INSERT INTO chat(email,peer,msg,timestamp,msgType,type)
      VALUES('${socket.id}','${peer}','${msg}','${timestamp}','${msgType}','${type}')
    `);
    const receivedMsg = {
      key: (await app.mysql.query(`
      SELECT * FROM chat WHERE email = '${socket.id}' AND peer ='${peer}' AND msgType = '${msgType}' AND  type = '${type}'
      ORDER BY timestamp DESC
      LIMIT 1
      `))[0].key,
      msg,
      msgType,
      peer: socket.id,
    };
    receivedMsg.self = true;
    socket.emit('receivedMsg', receivedMsg);
    receivedMsg.self = false;
    if (type === FRIEND_TYPE.FRIEND && nsp.sockets[peer]) {
      nsp.sockets[peer].emit('receivedMsg', receivedMsg);
    }
    if (type === FRIEND_TYPE.GROUP) {
      const members = await app.mysql.query(`
      SELECT * FROM groupMemberInfo WHERE chatKey = '${peer}'
    `);
      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        if (member.email !== socket.id && nsp.sockets[member.email]) {
          nsp.sockets[member.email].emit('receivedMsg', receivedMsg);
        }
      }
    }
  }
  async getChats() {
    const { socket, app } = this.ctx;
    const { peer, type, page } = this.ctx.args[0];
    const PAGE_COUNT = 10;
    let chats = [];
    if (type === FRIEND_TYPE.FRIEND) {
      chats = (await app.mysql.query(`
        SELECT * FROM chat
        WHERE ((msgType = '${MSG_TYPE.COMMON_CHAT}') OR (msgType = '${MSG_TYPE.PICTURE}') OR (msgType = '${MSG_TYPE.FILE}') OR (msgType = '${MSG_TYPE.FOLDER}'))
        AND type = '${type}'
        AND ( ( email = '${socket.id}' AND peer = '${peer}' ) 
            OR ( email = '${peer}' AND peer = '${socket.id}' ) )
        ORDER BY timestamp DESC
        LIMIT ${(page + 1) * PAGE_COUNT}
      `))
        .slice(page * PAGE_COUNT, (page + 1) * PAGE_COUNT)
        .map(item => (
          {
            key: item.key,
            self: item.email === socket.id,
            msg: item.msg,
            msgType: item.msgType,
          }))
        .reverse();
    }
    if (type === FRIEND_TYPE.GROUP) {
      chats = (await app.mysql.query(`
        SELECT * FROM chat
        WHERE ((msgType = '${MSG_TYPE.COMMON_CHAT}') OR (msgType = '${MSG_TYPE.PICTURE}') OR (msgType = '${MSG_TYPE.FILE}') OR (msgType = '${MSG_TYPE.FOLDER}'))
        AND type = '${type}'
        AND peer = '${peer}'
        ORDER BY timestamp DESC
        LIMIT ${(page + 1) * PAGE_COUNT}
      `))
        .slice(page * PAGE_COUNT, (page + 1) * PAGE_COUNT)
        .map(item => (
          {
            key: item.key,
            self: item.email === socket.id,
            // peer为来源
            peer: item.email,
            msg: item.msg,
            msgType: item.msgType,
          }))
        .reverse();
    }
    let hasMore = false;
    if (page === 0) {
      hasMore = chats.length === PAGE_COUNT;
    } else {
      hasMore = chats.length > 0;
    }
    socket.emit('setChats', { chats, page, hasMore });
  }
  async getGroupMemberInfo() {
    const { socket, app } = this.ctx;
    const { chatKey } = this.ctx.args[0];
    const memberInfo = [];
    const members = await app.mysql.query(`
        SELECT * FROM groupMemberInfo
        WHERE chatKey = '${chatKey}'
      `);
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      const { email, permit, memberName } = member;
      const { nickname, avatar } = (await app.mysql.query(`SELECT * FROM userInfo WHERE email = '${email}'`))[0] || {};
      const { remarkName } = (await app.mysql
        .query(`SELECT * FROM userChatInfo 
        WHERE email = '${socket.id}'
        AND peer = '${email}'
        AND type = '${FRIEND_TYPE.FRIEND}'
        `))[0] || {};
      memberInfo.push({
        email,
        permit,
        avatar,
        name: memberName || remarkName || nickname,
      });
    }
    socket.emit('setGroupMemberInfo', memberInfo.sort((a, b) => a.permit - b.permit));
  }
}

module.exports = CommonChatController;
