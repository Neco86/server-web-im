'use strict';

const Controller = require('egg').Controller;
const { FRIEND_TYPE, GROUP_PERMIT, ERROR_CODE, SUCCESS_CODE } = require('../../utils/const');

class ChangeInfoController extends Controller {
  async changeFriendInfo() {
    const { socket, app } = this.ctx;
    const { email, value, type } = this.ctx.args[0];
    // console.log(email, value, type)
    // 好友test1@test.com test1的1 remarkName
    // 好友test1@test.com 3 groupKey
    await app.mysql
      .query(`
        UPDATE userChatInfo
        SET
        ${type} = '${String(value)}'
        WHERE 
        email = '${socket.id}' 
        AND peer = '${email}' 
        AND type = '${FRIEND_TYPE.FRIEND}'
        `);
    socket.emit('changeFriendInfo', this.ctx.args[0]);
  }
  async changeGroupInfo() {
    const { socket, app } = this.ctx;
    const { changedChatKey, value, type } = this.ctx.args[0];
    // console.log(changedChatKey, value, type);
    // 57 test2群聊1 nickname
    // 57 12 remarkName
    // 57 5 group
    // 57 test2群聊test2群聊11 note
    // 57 群主群名片11 memberName
    // 更改群名/公告
    if (['nickname', 'note'].includes(type)) {
      const permit = await app.mysql
        .query(`SELECT * FROM groupMemberInfo WHERE chatKey = '${changedChatKey}' AND email = '${socket.id}'`);
      // 权限满足
      if ([GROUP_PERMIT.OWNER, GROUP_PERMIT.MANAGER].includes(permit[0].permit)) {
        await app.mysql
          .query(`
          UPDATE groupCommonInfo
          SET
          ${type} = '${String(value)}'
          WHERE 
          chatKey = '${changedChatKey}' 
          `);
        socket.emit('changeGroupInfo', { code: SUCCESS_CODE, ...this.ctx.args[0] });
      } else {
        socket.emit('changeGroupInfo', { code: ERROR_CODE, msg: '权限错误!' });
      }
    }
    // 更改备注/分组/名片
    if (['remarkName', 'groupKey', 'memberName'].includes(type)) {
      if (['remarkName', 'groupKey'].includes(type)) {
        await app.mysql
          .query(`
        UPDATE userChatInfo
        SET
        ${type} = '${String(value)}'
        WHERE 
        email = '${socket.id}' 
        AND peer = '${changedChatKey}' 
        AND type = '${FRIEND_TYPE.GROUP}'
        `);
      }
      if (['memberName'].includes(type)) {
        await app.mysql
          .query(`
        UPDATE groupMemberInfo
        SET
        ${type} = '${String(value)}'
        WHERE 
        chatKey = '${changedChatKey}' 
        AND email = '${socket.id}' 
        `);
      }
      socket.emit('changeGroupInfo', { code: SUCCESS_CODE, ...this.ctx.args[0] });
    }
  }
}

module.exports = ChangeInfoController;
