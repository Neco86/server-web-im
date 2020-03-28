'use strict';

const Controller = require('egg').Controller;
const { FRIEND_TYPE, USER_STATUS, EDIT_GROUP, EDIT_FRIEND, GROUP_PERMIT } = require('../../utils/const');

class GroupController extends Controller {
  async getMyGroup() {
    const { socket, app } = this.ctx;
    const friendType = this.ctx.args[0];
    let groups = await app.mysql
      .query(`SELECT * FROM userGroupInfo WHERE email = '${socket.id}' AND type = '${friendType}'`);
    groups = groups.map(group => ({ key: group.key, groupName: group.groupName }));
    if (friendType === FRIEND_TYPE.FRIEND) {
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        group.friends = [];
        // {
        //   key: 4,
        //   groupName: '好友分组3',
        // }
        const friends = await app.mysql
          .query(`SELECT * FROM userChatInfo WHERE (email = '${socket.id}') AND (type = '${friendType}') AND (groupKey = '${group.key}')`);
        for (let j = 0; j < friends.length; j++) {
          const friend = friends[j];
          // {
          //   key: 7,
          //   email: '1157868866@qq.com',
          //   peer: '好友test6@test.com',
          //   type: '2',
          //   groupKey: '4',
          //   remarkName: null
          // }
          const friendInfo = await app.mysql
            .query(`SELECT * FROM userInfo WHERE email = '${friend.peer}'`);
          group.friends.push(...friendInfo.map(
            ({ email, nickname, sign, sex, age, avatar, status }) => {
              return {
                email,
                nickname,
                sign,
                sex,
                age,
                avatar,
                online: status === USER_STATUS.ONLINE,
                remarkName: friend.remarkName,
              };
            }));
        }
      }
    }
    if (friendType === FRIEND_TYPE.GROUP) {
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        group.groups = [];
        // {
        //   key: 5,
        //   groupName: '群聊分组2',
        // }
        const peers = await app.mysql
          .query(`SELECT * FROM userChatInfo WHERE (email = '${socket.id}') AND (type = '${friendType}') AND (groupKey = '${group.key}')`);
        for (let j = 0; j < peers.length; j++) {
          const peer = peers[j];
          // {
          //   key: 9,
          //   email: '1157868866@qq.com',
          //   peer: '86',
          //   type: '1',
          //   groupKey: '5',
          //   remarkName: '有备注的群聊'
          // }
          const groupsInfo = await app.mysql
            .query(`SELECT * FROM groupCommonInfo WHERE chatKey = '${peer.peer}'`);
          const groupMembers = await app.mysql
            .query(`SELECT * FROM groupMemberInfo WHERE chatKey = '${peer.peer}'`);
          const memberInfo = await app.mysql
            .query(`SELECT * FROM groupMemberInfo WHERE chatKey = '${peer.peer}' AND email = '${socket.id}'`);
          group.groups.push(...groupsInfo.map(item => (
            {
              ...item,
              remarkName: peer.remarkName,
              count: groupMembers.length,
              memberName: memberInfo[0].memberName,
              permit: memberInfo[0].permit,
            })));
        }
      }
    }
    socket.emit('getMyGroup', { friendType, groups });
  }
  async editGroup() {
    const { socket, app } = this.ctx;
    const { type, method, value, key } = this.ctx.args[0];
    switch (method) {
      case EDIT_GROUP.ADD:
        await app.mysql.query(`
        INSERT INTO userGroupInfo(email,groupName,type) VALUES('${socket.id}','${value}','${type}')
        `);
        break;
      case EDIT_GROUP.DELETE:
        await app.mysql.query(`
        DELETE FROM userGroupInfo where \`key\` = ${key} AND email = '${socket.id}' AND type = '${type}'
        `);
        break;
      case EDIT_GROUP.RENAME:
        await app.mysql.query(`
        UPDATE userGroupInfo SET groupName = '${value}' WHERE \`key\` = ${key} AND email = '${socket.id}' AND type = '${type}'
        `);
        break;
      default:
        break;
    }
    socket.emit('editGroup', this.ctx.args[0]);
  }
  async editFriend() {
    const { socket, app } = this.ctx;
    // type: EDIT_FRIEND ,value: email/chatKey
    const { type, value } = this.ctx.args[0];
    const nsp = app.io.of('/');
    const users = await app.mysql.query(`
    SELECT * FROM groupMemberInfo WHERE
    (chatKey = '${value}')
    AND ( permit = '${GROUP_PERMIT.OWNER}' || permit = '${GROUP_PERMIT.MANAGER}' );
    `);
    const selfInfo = await app.mysql.query(`
      SELECT * FROM userInfo where email = '${socket.id}'
    `);
    switch (type) {
      // 删除好友
      case EDIT_FRIEND.DELETE_FRIEND:
        await app.mysql.query(`
        DELETE FROM userChatInfo where email = '${socket.id}' AND peer = '${value}' AND type = '${FRIEND_TYPE.FRIEND}'
        `);
        await app.mysql.query(`
        DELETE FROM userChatInfo where email = '${value}' AND peer = '${socket.id}' AND type = '${FRIEND_TYPE.FRIEND}'
        `);
        if (nsp.sockets[value]) {
          nsp.sockets[value].emit('deleteFriend');
        }
        break;
      // 退出群聊
      case EDIT_FRIEND.EXIT_GROUP:
        await app.mysql.query(`
        DELETE FROM userChatInfo where email = '${socket.id}' AND peer = '${value}' AND type = '${FRIEND_TYPE.GROUP}'
        `);
        await app.mysql.query(`
        DELETE FROM groupMemberInfo where email = '${socket.id}' AND chatKey = '${value}'
        `);
        for (let i = 0; i < users.length; i++) {
          const user = users[i];
          // 给群主和群管理发消息
          if (nsp.sockets[user.email]) {
            const userInfo = await app.mysql.query(`
            SELECT * FROM userChatInfo where email = '${user.email}' AND peer = '${socket.id}' AND type = '${FRIEND_TYPE.FRIEND}'
            `);
            const groupInfo = await app.mysql.query(`
            SELECT * FROM groupCommonInfo where chatKey = '${value}'
            `);
            const groupRemarkName = await app.mysql.query(`
            SELECT * FROM userChatInfo where email = '${user.email}' AND peer = '${value}' AND type = '${FRIEND_TYPE.GROUP}'
            `);
            nsp.sockets[user.email].emit('exitGroup', {
              avatar: selfInfo[0].avatar,
              nickname: (userInfo[0].remarkName || selfInfo[0].nickname),
              email: selfInfo[0].email,
              groupName: groupRemarkName[0].remarkName || groupInfo.nickName,
              groupAvatar: groupRemarkName[0].avatar,
              chatKey: value,
            });
          }
        }
        break;
      // 解散群聊
      case EDIT_FRIEND.DELETE_GROUP:
        await app.mysql.query(`
        DELETE FROM userChatInfo where email = '${socket.id}' AND peer = '${value}' AND type = '${FRIEND_TYPE.GROUP}'
        `);
        await app.mysql.query(`
        DELETE FROM groupCommonInfo where chatKey = '${value}'
        `);
        await app.mysql.query(`
        DELETE FROM groupMemberInfo where chatKey = '${value}'
        `);
        if (nsp.sockets[value]) {
          nsp.sockets[value].emit('deleteGroup');
        }
        break;
      default:
        break;
    }
    socket.emit('editFriend', this.ctx.args[0]);
  }
}

module.exports = GroupController;
