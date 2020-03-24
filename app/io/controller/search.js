'use strict';

const Controller = require('egg').Controller;
const { SEARCH_TYPE, FRIEND_TYPE } = require('../../utils/const');

class SearchController extends Controller {
  async searchInfo() {
    const { socket, app } = this.ctx;
    const search = this.ctx.args[0];

    const self = [];
    const friend = [];
    const stranger = [];

    // 查询所有包含的人
    const includesFriends = await app.mysql
      .query(`SELECT * FROM userInfo WHERE email like '%${search}%' OR nickname LIKE '%${search}%'`);
    // 查询所有好友
    const friends = await app.mysql
      .query(`SELECT * FROM userChatInfo WHERE email = '${socket.id}' AND type = '${FRIEND_TYPE.FRIEND}'`);
    includesFriends.forEach(user => {
      if (user.email === socket.id) {
        self.push({
          avatar: user.avatar,
          nickname: user.nickname,
          account: user.email,
          type: SEARCH_TYPE.SELF,
        });
      } else {
        if (friends.find(friend => friend.peer === user.email)) {
          friend.push({
            avatar: user.avatar,
            nickname: user.nickname,
            account: user.email,
            type: SEARCH_TYPE.FRIEND,
          });
        } else {
          stranger.push({
            avatar: user.avatar,
            nickname: user.nickname,
            account: user.email,
            type: SEARCH_TYPE.STRANGER,
          });
        }

      }
    });

    const joinedGroup = [];
    const strangeGroup = [];
    // 查询所有包含的群
    const includesGroups = await app.mysql
      .query(`SELECT * FROM groupCommonInfo WHERE chatKey like '%${search}%' OR nickname LIKE '%${search}%'`);
    // 查询所有群聊
    const groups = await app.mysql
      .query(`SELECT * FROM userChatInfo WHERE email = '${socket.id}' AND type = '${FRIEND_TYPE.GROUP}'`);
    includesGroups.forEach(user => {
      if (groups.find(group => group.peer === user.chatKey)) {
        joinedGroup.push({
          avatar: user.avatar,
          nickname: user.nickname,
          account: user.chatKey,
          type: SEARCH_TYPE.FRIEND,
        });
      } else {
        strangeGroup.push({
          avatar: user.avatar,
          nickname: user.nickname,
          account: user.chatKey,
          type: SEARCH_TYPE.STRANGER,
        });
      }
    });
    socket.emit('searchInfo', {
      friendList: [
        ...stranger,
        ...friend,
        ...self,
      ],
      groupList: [
        ...strangeGroup,
        ...joinedGroup,
      ],
    });
  }
}

module.exports = SearchController;
