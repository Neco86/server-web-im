'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;
  // 用户注册
  router.post('/getCaptcha', controller.register.getCaptcha);
  router.post('/register', controller.register.register);
  // 忘记密码
  router.post('/getResetCaptcha', controller.reset.getCaptcha);
  router.post('/confirmEmail', controller.reset.confirmEmail);
  router.post('/resetPassword', controller.reset.resetPassword);
  // 用户登录
  router.post('/login', controller.login.login);
  // 主页
  router.post('/verifyToken', controller.home.verifyToken);

};
