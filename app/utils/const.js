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

module.exports = {
  SUCCESS_CODE, ERROR_CODE, DEFAULT_ROOM, USER_STATUS, GROUP_TYPE,
  SEARCH_TYPE, FRIEND_TYPE,
};
