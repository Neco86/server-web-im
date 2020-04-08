'use strict';

const SUCCESS_CODE = 1;
const ERROR_CODE = 0;
const DEFAULT_ROOM = 'default_room';
const USER_STATUS = {
  ONLINE: '1',
  HIDE: '2',
  OFFLINE: '3',
};
// 分组类型
const GROUP_TYPE = {
  GROUP: '1',
  FRIEND: '2',
};
// 搜索结果类型
const SEARCH_TYPE = {
  STRANGER: '1',
  FRIEND: '2',
  SELF: '3',
};
// 好友类型
const FRIEND_TYPE = {
  GROUP: '1',
  FRIEND: '2',
};

// msgType 聊天信息类型
const MSG_TYPE = {
  // 普通消息
  COMMON_CHAT: '1',
  // 申请加好友/群聊
  APPLY_FRIEND: '2',
  // 同意好友/群聊
  AGREE_FRIEND: '3',
  // 拒绝好友/群聊
  DISAGREE_FRIEND: '4',
  // 通知消息
  NOTICE: '5',
  // 图片
  PICTURE: '6',
  // 离线文件
  FILE: '7',
  // 离线文件夹
  FOLDER: '8',
  // 在线文件
  ONLINE_FILE: '9',
  // 同意在线文件
  AGREE_ONLINE_FILE: '10',
  // 拒绝在线文件
  DISAGREE_ONLINE_FILE: '11',
  // 取消发送在线文件
  CANCEL_ONLINE_FILE: '12',
  // 请求发送在线文件夹
  ONLINE_FOLDER: '13',
  // 同意在线文件夹
  AGREE_ONLINE_FOLDER: '14',
  // 拒绝在线文件夹
  DISAGREE_ONLINE_FOLDER: '15',
  // 取消发送在线文件夹
  CANCEL_ONLINE_FOLDER: '16',
};

const PREFIX_MSG_TYPE = {
  [MSG_TYPE.COMMON_CHAT]: '',
  [MSG_TYPE.PICTURE]: '[图片]',
  [MSG_TYPE.FILE]: '[文件]',
  [MSG_TYPE.FOLDER]: '[文件夹]',
  [MSG_TYPE.ONLINE_FILE]: '[发送在线文件]',
  [MSG_TYPE.CANCEL_ONLINE_FILE]: '[取消发送在线文件]',
  [MSG_TYPE.AGREE_ONLINE_FILE]: '[同意接收在线文件]',
  [MSG_TYPE.DISAGREE_ONLINE_FILE]: '[拒绝接收在线文件]',
  [MSG_TYPE.ONLINE_FOLDER]: '[发送在线文件夹]',
  [MSG_TYPE.CANCEL_ONLINE_FOLDER]: '[取消发送在线文件夹]',
  [MSG_TYPE.AGREE_ONLINE_FOLDER]: '[同意接收在线文件夹]',
  [MSG_TYPE.DISAGREE_ONLINE_FOLDER]: '[拒绝接收在线文件夹]',
};

// permit 群聊权限
const GROUP_PERMIT = {
  OWNER: '1',
  MANAGER: '2',
  MEMBER: '3',
  BANNED: '4',
};
// 编辑分组
const EDIT_GROUP = {
  ADD: 'add',
  DELETE: 'delete',
  RENAME: 'rename',
};
const EDIT_FRIEND = {
  DELETE_FRIEND: 'deleteFriend',
  DELETE_GROUP: 'deleteGroup',
  EXIT_GROUP: 'exitGroup',
};

const QUERY_MSG_TYPE = `(
  (msgType = '${MSG_TYPE.COMMON_CHAT}') OR
  (msgType = '${MSG_TYPE.PICTURE}') OR
  (msgType = '${MSG_TYPE.FILE}') OR
  (msgType = '${MSG_TYPE.FOLDER}') OR
  (msgType = '${MSG_TYPE.ONLINE_FILE}') OR
  (msgType = '${MSG_TYPE.AGREE_ONLINE_FILE}') OR
  (msgType = '${MSG_TYPE.DISAGREE_ONLINE_FILE}') OR
  (msgType = '${MSG_TYPE.CANCEL_ONLINE_FILE}') OR
  (msgType = '${MSG_TYPE.ONLINE_FOLDER}') OR
  (msgType = '${MSG_TYPE.AGREE_ONLINE_FOLDER}') OR
  (msgType = '${MSG_TYPE.DISAGREE_ONLINE_FOLDER}') OR
  (msgType = '${MSG_TYPE.CANCEL_ONLINE_FOLDER}')
  )`;

const SERVER_HOST = 'https://192.168.0.104:8443';
const CLIENT_HOST = 'https://192.168.0.104:8000';

module.exports = {
  SUCCESS_CODE, ERROR_CODE, DEFAULT_ROOM, USER_STATUS, GROUP_TYPE,
  SEARCH_TYPE, FRIEND_TYPE, MSG_TYPE, GROUP_PERMIT, EDIT_GROUP,
  EDIT_FRIEND, QUERY_MSG_TYPE, PREFIX_MSG_TYPE, SERVER_HOST, CLIENT_HOST,
};
