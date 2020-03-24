'use strict';

const { DEFAULT_ROOM, USER_STATUS } = require('../../utils/const');

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
          [loginUsers[0].status === USER_STATUS.OFFLINE ? USER_STATUS.ONLINE : loginUsers[0].status, tokenInfo.email]);
      // 加入默认房间
      socket.join(DEFAULT_ROOM);
      await next();
      // 离线
      const logoutUsers = await app.mysql
        .query('SELECT * FROM userInfo WHERE email = ?', tokenInfo.email);
      await app.mysql
        .query('UPDATE userInfo SET status = ? WHERE email = ?',
          [logoutUsers[0].status === USER_STATUS.ONLINE ? USER_STATUS.OFFLINE : logoutUsers[0].status, tokenInfo.email]);
    } catch (e) {
      socket.disconnect();
    }
  };
};
