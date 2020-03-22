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
  FRIEND: '1',
  GROUP: '2',
};

module.exports = { SUCCESS_CODE, ERROR_CODE, DEFAULT_ROOM, USER_STATUS, GROUP_TYPE };
