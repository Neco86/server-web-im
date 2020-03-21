'use strict';

const { DEFAULT_ROOM, USER_STATUS } = require('../../utils/const');

module.exports = () => {
  return async (ctx, next) => {
    // 权限校验通过
    const { socket, app } = ctx;
    const token = socket.handshake.query.token;
    try {
      const tokenInfo = await app.jwt.verify(token, app.config.jwt.secret);
      socket.email = tokenInfo.email;
      const users = await app.mysql
        .query('SELECT * FROM userInfo WHERE email = ?', tokenInfo.email);
      // 上线
      await app.mysql
        .query('UPDATE userInfo SET status = ? WHERE email = ?',
          [users[0].status === USER_STATUS.OFFLINE ? USER_STATUS.ONLINE : users[0].status, tokenInfo.email]);
      // 加入默认房间
      socket.join(DEFAULT_ROOM);
      await next();
      // 离线
      await app.mysql
        .query('UPDATE userInfo SET status = ? WHERE email = ?',
          [users[0].status === USER_STATUS.ONLINE ? USER_STATUS.OFFLINE : users[0].status, tokenInfo.email]);
    } catch (e) {
      socket.disconnect();
    }
  };
};
