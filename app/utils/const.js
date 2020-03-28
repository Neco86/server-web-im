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
  COMMON_CHAT: '1',
  FILE: '2',
  APPLY_FRIEND: '3',
  EXIT_FRIEND: '4',
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

module.exports = {
  SUCCESS_CODE, ERROR_CODE, DEFAULT_ROOM, USER_STATUS, GROUP_TYPE,
  SEARCH_TYPE, FRIEND_TYPE, MSG_TYPE, GROUP_PERMIT, EDIT_GROUP,
  EDIT_FRIEND,
};
