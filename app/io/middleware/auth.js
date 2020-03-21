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
      // 加入默认房间
      socket.join(DEFAULT_ROOM);
      await next();
      // 离线
      // 在线 => 离线
      const exist = await app.mysql
        .query('SELECT * FROM userInfo WHERE email = ?', tokenInfo.email);
      const status = exist[0].status === USER_STATUS.ONLINE ? USER_STATUS.OFFLINE : exist[0].status;
      await app.mysql
        .query('UPDATE userInfo SET status = ? WHERE email = ?', [status, tokenInfo.email]);
    } catch (e) {
      socket.disconnect();
    }
  };
};
