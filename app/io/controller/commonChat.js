/* eslint-disable array-bracket-spacing */
'use strict';

const fs = require('fs');
const path = require('path');
const Controller = require('egg').Controller;
const { createRandomNum } = require('../../utils/utils');
const { FRIEND_TYPE, MSG_TYPE, QUERY_MSG_TYPE, PREFIX_MSG_TYPE } = require('../../utils/const');

class CommonChatController extends Controller {
  // 把userRecent的数据添加头像和名称(备注/昵称),展示在聊天左侧边栏内容
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
  // 设置聊天左侧边栏内容
  async setRecentChat() {
    const { socket, app } = this.ctx;
    const { peer, type, unread, msg, msgType } = this.ctx.args[0];
    const nsp = app.io.of('/');
    const isMyUserRecentQuery = `email = '${socket.id}' AND peer = '${peer}' AND type = '${type}'`;
    const timestamp = String(Date.now());
    const myUserRecent = await app.mysql.query(`SELECT * FROM userRecent WHERE ${isMyUserRecentQuery}`);
    // 更改我的未读数
    // unread 一般为 0
    // 1.点击左侧边栏用户时,清零未读
    // 2.从通讯录跳转到聊天内容
    if (unread !== undefined && msg === undefined) {
      if (myUserRecent.length > 0) { // 1
        await app.mysql.query(`UPDATE userRecent 
        SET unread = '${unread}'
        WHERE ${isMyUserRecentQuery}
        `);
      } else { // 2
        // 好友聊天
        if (type === FRIEND_TYPE.FRIEND) {
          const lastFriendChat = await app.mysql.query(`
          SELECT *
          FROM chat 
          WHERE ${QUERY_MSG_TYPE}
          AND type = '${type}'
          AND ((email = '${socket.id}' AND peer = '${peer}')
            OR (email = '${peer}' AND peer = '${socket.id}'))
          ORDER BY timestamp DESC
          LIMIT 1
          `);
          if (lastFriendChat.length > 0) { // 有聊天记录
            let { msg, msgType } = lastFriendChat[0];
            const pre = PREFIX_MSG_TYPE[lastFriendChat[0].msgType];
            switch (msgType) {
              case MSG_TYPE.PICTURE: msg = ''; break;
              case MSG_TYPE.FILE: msg = JSON.parse(lastFriendChat[0].msg).name; break;
              case MSG_TYPE.FOLDER: msg = JSON.parse(lastFriendChat[0].msg).folderName; break;
              default: break;
            }
            msg = `${pre}${msg}`;
            await app.mysql.query(`INSERT INTO userRecent(email,peer,unread,msg,timestamp,type) 
            VALUES('${socket.id}','${peer}','${unread}','${msg}','${lastFriendChat[0].timestamp}','${type}')
            `);
          } else { // 没有聊天记录
            await app.mysql.query(`INSERT INTO userRecent(email,peer,unread,msg,timestamp,type) 
            VALUES('${socket.id}','${peer}','${unread}','','','${type}')
            `);
          }
        }
        // 群聊
        if (type === FRIEND_TYPE.GROUP) {
          const lastMemberChat = await app.mysql.query(`
          SELECT *
          FROM chat 
          WHERE ${QUERY_MSG_TYPE}
          AND type = '${type}'
          AND peer = '${peer}'
          ORDER BY timestamp DESC
          LIMIT 1
          `);
          if (lastMemberChat.length > 0) { // 有聊天记录
            let { msg, msgType } = lastMemberChat[0];
            const pre = PREFIX_MSG_TYPE[lastMemberChat[0].msgType];
            switch (msgType) {
              case MSG_TYPE.PICTURE: msg = ''; break;
              case MSG_TYPE.FILE: msg = JSON.parse(lastMemberChat[0].msg).name; break;
              case MSG_TYPE.FOLDER: msg = JSON.parse(lastMemberChat[0].msg).folderName; break;
              default: break;
            }
            msg = `${pre}${msg}`;
            if (lastMemberChat[0].email === socket.id) {
              // 最后自己发言,name:群名片/昵称
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
              // 最后其他人发言,name:群名片/好友备注/昵称
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
          } else { // 没有聊天记录
            await app.mysql.query(`INSERT INTO userRecent(email,peer,unread,msg,timestamp,type) 
                VALUES('${socket.id}','${peer}','${unread}','','','${type}')
              `);
          }
        }
      }
      socket.emit('updateRecentChat');
    }
    // 删除我的左侧边好友
    if (unread === undefined && msg === undefined) {
      await app.mysql.query(`
      DELETE FROM userRecent
      WHERE ${isMyUserRecentQuery}
      `);
      socket.emit('updateRecentChat');
    }
    // 新增/更新msg,更新我和对方的
    if (unread === undefined && msg !== undefined) {
      // 好友消息
      if (type === FRIEND_TYPE.FRIEND) {
        // 更新我的侧边栏
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
        // 更新好友的侧边栏
        const isPeerUserRecentQuery = `
          email = '${peer}'
          AND peer = '${socket.id}'
          AND type = '${type}'`;
        const peerUserRecent = await app.mysql.query(`SELECT * FROM userRecent WHERE ${isPeerUserRecentQuery}`);
        if (peerUserRecent.length > 0) {
          let unread = Number(peerUserRecent[0].unread || 0);
          if ([
            MSG_TYPE.COMMON_CHAT,
            MSG_TYPE.PICTURE,
            MSG_TYPE.ONLINE_FILE,
            MSG_TYPE.ONLINE_FOLDER,
          ].includes(msgType)) {
            unread += 1;
          }
          if ((msgType === MSG_TYPE.FILE || msgType === MSG_TYPE.FOLDER) && type === FRIEND_TYPE.GROUP) {
            unread += 1;
          }
          await app.mysql.query(`UPDATE userRecent 
          SET msg = '${msg}',
          timestamp = '${timestamp}',
          unread = '${unread}'
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
      // 群聊消息
      if (type === FRIEND_TYPE.GROUP) {
        // 更新我的侧边栏
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
        // 更新群友的侧边栏
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
  // 发送各类消息
  async sendMsg() {
    const { socket, app } = this.ctx;
    const { peer, type, msgType } = this.ctx.args[0];
    let { msg } = this.ctx.args[0];
    const nsp = app.io.of('/');
    const timestamp = String(Date.now());
    const random = createRandomNum(6);
    let p2pFile = msgType === MSG_TYPE.FILE || msgType === MSG_TYPE.FOLDER;
    // 图片存储
    if (msgType === MSG_TYPE.PICTURE) {
      const { file, type } = msg;
      fs.writeFileSync(path.join('./', `app/public/chatImg/${socket.id}_${peer}_${timestamp}_${random}.${type}`), file);
      msg = `http://192.168.0.104:7001/public/chatImg/${socket.id}_${peer}_${timestamp}_${random}.${type}`;
    }
    // 离线文件存储
    if (msgType === MSG_TYPE.FILE && msg.save) {
      const { file, name, key, save } = msg;
      p2pFile = p2pFile && !save;
      fs.writeFileSync(path.join('./', `app/public/chatFile/${socket.id}_${peer}_${timestamp}_${random}_${name}`), file);
      const src = `http://192.168.0.104:7001/public/chatFile/${socket.id}_${peer}_${timestamp}_${random}_${name}`;
      msg = JSON.stringify({
        src,
        name,
      });
      // 有key的是在线转离线/同意在线 无key的是群聊文件
      if (key) {
        await app.mysql.query(`
            UPDATE chat SET msg = '${msg}' , timestamp = '${timestamp}', msgType = '${msgType}'
            WHERE \`key\` = '${key}'
            `);
      } else {
        await app.mysql.query(`
        INSERT INTO chat(email,peer,msg,timestamp,msgType,type)
        VALUES('${socket.id}','${peer}','${msg}','${timestamp}','${msgType}','${type}')
        `);
      }
    }
    // 离线文件夹存储
    if (msgType === MSG_TYPE.FOLDER && msg.save) {
      const { fileList, folderName, key, save } = msg;
      p2pFile = p2pFile && !save;
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
      // 有key的是在线转离线/同意在线 无key的是群聊文件
      if (key) {
        await app.mysql.query(`
            UPDATE chat SET msg = '${msg}' , timestamp = '${timestamp}', msgType = '${msgType}'
            WHERE \`key\` = '${key}'
            `);
      } else {
        await app.mysql.query(`
        INSERT INTO chat(email,peer,msg,timestamp,msgType,type)
        VALUES('${socket.id}','${peer}','${msg}','${timestamp}','${msgType}','${type}')
        `);
      }
    }
    // 取消发送在线文件/文件夹
    if ([MSG_TYPE.CANCEL_ONLINE_FILE, MSG_TYPE.CANCEL_ONLINE_FOLDER].includes(msgType)) {
      const { key, msg: name } = msg;
      await app.mysql.query(`
      UPDATE chat SET msgType = '${msgType}'
      WHERE \`key\` = '${key}'
      `);
      msg = name;
    }
    // 同意在线文件/文件夹
    if ([MSG_TYPE.AGREE_ONLINE_FILE, MSG_TYPE.AGREE_ONLINE_FOLDER].includes(msgType)) {
      const { key, msg: name } = msg;
      const info = (await app.mysql.query(`
      SELECT * FROM chat
      WHERE \`key\` = '${key}'
      `))[0];
      await app.mysql.query(`
      UPDATE chat SET msgType = '${msgType}', email = '${info.peer}' , peer = '${info.email}'
      WHERE \`key\` = '${key}'
      `);
      msg = name;
    }
    // 拒绝在线文件/文件夹
    if ([MSG_TYPE.DISAGREE_ONLINE_FILE, MSG_TYPE.DISAGREE_ONLINE_FOLDER].includes(msgType)) {
      const { key, msg: name } = msg;
      const info = (await app.mysql.query(`
      SELECT * FROM chat
      WHERE \`key\` = '${key}'
      `))[0];
      await app.mysql.query(`
      UPDATE chat SET msgType = '${msgType}', email = '${info.peer}' , peer = '${info.email}'
      WHERE \`key\` = '${key}'
      `);
      msg = name;
    }
    // 文字聊天/图片/请求发送文件/请求发送文件夹 插入数据库chat表
    if ([
      MSG_TYPE.COMMON_CHAT,
      MSG_TYPE.PICTURE,
      MSG_TYPE.ONLINE_FILE,
      MSG_TYPE.ONLINE_FOLDER,
    ].includes(msgType)) {
      await app.mysql.query(`
      INSERT INTO chat(email,peer,msg,timestamp,msgType,type)
      VALUES('${socket.id}','${peer}','${msg}','${timestamp}','${msgType}','${type}')
    `);
    }
    // p2p 文件/文件夹传输
    if (p2pFile) {
      if (type === FRIEND_TYPE.FRIEND && nsp.sockets[peer]) {
        nsp.sockets[peer].emit('receivedFile', this.ctx.args[0]);
      }
    } else {
      const receivedMsg = {
        key: (await app.mysql.query(`
        SELECT * FROM chat WHERE email = '${socket.id}' AND peer ='${peer}' AND msgType = '${msgType}' AND  type = '${type}'
        ORDER BY timestamp DESC
        LIMIT 1
        `))[0].key,
        msg,
        msgType,
        peer: socket.id,
        type,
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
  }
  // 获得聊天内容
  async getChats() {
    const { socket, app } = this.ctx;
    const { peer, type, page } = this.ctx.args[0];
    const PAGE_COUNT = 10;
    let chats = [];
    if (type === FRIEND_TYPE.FRIEND) {
      chats = (await app.mysql.query(`
        SELECT * FROM chat
        WHERE ${QUERY_MSG_TYPE}
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
        WHERE ${QUERY_MSG_TYPE}
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
  // 获取群聊成员信息,设置群聊右侧群友信息
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
    socket.emit('setGroupMemberInfo', { info: memberInfo.sort((a, b) => a.permit - b.permit), chatKey });
  }
}

module.exports = CommonChatController;
