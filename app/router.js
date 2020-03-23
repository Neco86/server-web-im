'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller, io } = app;
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
  io.of('/').route('init', io.controller.home.init);
  io.of('/').route('getUserInfo', io.controller.home.getUserInfo);
  io.of('/').route('setUserInfo', io.controller.home.setUserInfo);
  // 上传文件
  io.of('/').route('setAvatar', io.controller.file.setAvatar);
  // 搜索好友/群
  io.of('/').route('searchInfo', io.controller.search.searchInfo);
};
