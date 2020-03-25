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
        const friends = await app.mysql
          .query(`SELECT * FROM userChatInfo WHERE (email = '${socket.id}') AND (type = '${friendType}') AND (groupKey = '${group.key}')`);
        for (let j = 0; j < friends.length; j++) {
          const friend = friends[j];
          const friendInfo = await app.mysql
            .query(`SELECT * FROM userInfo WHERE email = '${friend.peer}'`);
          group.friends = friendInfo.map(
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
            });
        }
      }
    }
    if (friendType === FRIEND_TYPE.GROUP) {
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const peers = await app.mysql
          .query(`SELECT * FROM userChatInfo WHERE (email = '${socket.id}') AND (type = '${friendType}') AND (groupKey = '${group.key}')`);
        for (let j = 0; j < peers.length; j++) {
          const peer = peers[j];
          const groupsInfo = await app.mysql
            .query(`SELECT * FROM groupCommonInfo WHERE chatKey = '${peer.peer}'`);
          group.groups = groupsInfo;
        }
      }
    }
    socket.emit('getMyGroup', { friendType, groups });
  }
}

module.exports = GroupController;
