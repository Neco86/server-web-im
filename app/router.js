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
  io.of('/').route('setGroupAvatar', io.controller.file.setGroupAvatar);
  // 搜索好友/群
  io.of('/').route('searchInfo', io.controller.search.searchInfo);
  // 发送消息
  // 发送添加好友
  io.of('/').route('addFriend', io.controller.chat.addFriend);
  // 通知上下线
  io.of('/').route('online', io.controller.chat.online);
  io.of('/').route('offline', io.controller.chat.offline);
  // 获取好友通知
  io.of('/').route('getFriendApply', io.controller.chat.getFriendApply);
  // 同意/拒绝申请
  io.of('/').route('handleApply', io.controller.chat.handleApply);
  // 创建分组
  io.of('/').route('createGroup', io.controller.chat.createGroup);
  // 获取分组
  io.of('/').route('getMyGroup', io.controller.group.getMyGroup);
  io.of('/').route('editGroup', io.controller.group.editGroup);
  io.of('/').route('editFriend', io.controller.group.editFriend);
  // 修改好友/群聊数据
  io.of('/').route('changeFriendInfo', io.controller.changeInfo.changeFriendInfo);
  io.of('/').route('changeGroupInfo', io.controller.changeInfo.changeGroupInfo);
  // 普通聊天/图片/文件
  io.of('/').route('getRecentChat', io.controller.commonChat.getRecentChat);
  io.of('/').route('setRecentChat', io.controller.commonChat.setRecentChat);
  io.of('/').route('sendMsg', io.controller.commonChat.sendMsg);
  io.of('/').route('getChats', io.controller.commonChat.getChats);
  io.of('/').route('getGroupMemberInfo', io.controller.commonChat.getGroupMemberInfo);
  // 修改群友权限
  io.of('/').route('setPermit', io.controller.permit.setPermit);
  // 音视频聊天
  io.of('/').route('videoOffer', io.controller.mediaChat.videoOffer);
  io.of('/').route('videoAnswer', io.controller.mediaChat.videoAnswer);
  io.of('/').route('newIceCandidate', io.controller.mediaChat.newIceCandidate);
  io.of('/').route('getUserMediaFinish', io.controller.mediaChat.getUserMediaFinish);
  io.of('/').route('hangUp', io.controller.mediaChat.hangUp);
};
