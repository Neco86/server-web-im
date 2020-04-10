'use strict';

const { DEFAULT_ROOM, USER_STATUS, FRIEND_TYPE } = require('../../utils/const');

module.exports = () => {
  return async (ctx, next) => {
    // 权限校验通过
    const { socket, app } = ctx;
    const token = socket.handshake.query.token;
    try {
      const tokenInfo = await app.jwt.verify(token, app.config.jwt.secret);
      socket.id = tokenInfo.email;
      // 上线
      const loginUsers = await app.mysql
        .query('SELECT * FROM userInfo WHERE email = ?', tokenInfo.email);
      await app.mysql
        .query('UPDATE userInfo SET status = ? WHERE email = ?',
          [loginUsers[0].recentStatus, tokenInfo.email]);
      // 加入默认房间
      socket.join(DEFAULT_ROOM);
      await next();
      // 离线
      await app.mysql
        .query('UPDATE userInfo SET status = ? WHERE email = ?',
          [USER_STATUS.OFFLINE, tokenInfo.email]);
      // 通知离线
      const logoutUsers = await app.mysql
        .query('SELECT * FROM userInfo WHERE email = ?', tokenInfo.email);
      if (logoutUsers[0].recentStatus === USER_STATUS.ONLINE) {
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
    } catch (e) {
      socket.disconnect();
    }
  };
};
