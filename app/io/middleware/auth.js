'use strict';

const { DEFAULT_ROOM } = require('../../utils/const');

module.exports = () => {
  return async (ctx, next) => {
    // 权限校验通过
    const { socket, app } = ctx;
    const token = socket.handshake.query.token;
    try {
      const tokenInfo = await app.jwt.verify(token, app.config.jwt.secret);
      socket.id = tokenInfo.email;
      // 加入默认房间
      socket.join(DEFAULT_ROOM);
      await next();
    } catch (e) {
      socket.disconnect();
    }
  };
};
