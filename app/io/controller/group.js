'use strict';

const Controller = require('egg').Controller;
const { FRIEND_TYPE } = require('../../utils/const');

class GroupController extends Controller {
  async getMyGroup() {
    const { socket, app } = this.ctx;
    const friendType = this.ctx.args[0];
    const groups = await app.mysql
      .query(`SELECT * FROM userGroupInfo WHERE email = '${socket.id}' AND type = '${friendType}'`);
    if (friendType === FRIEND_TYPE.FRIEND) {
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        group.friends = [];
        // {
        //   key: 4,
        //   email: '1157868866@qq.com',
        //   groupName: '好友分组3',
        //   type: '2'
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
                online: status === 1,
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
        //   email: '1157868866@qq.com',
        //   groupName: '群聊分组2',
        //   type: '1'
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
          group.groups.push(...groupsInfo.map(item => item));
        }
      }
    }
    socket.emit('getMyGroup', { friendType, groups });
  }
}

module.exports = GroupController;
