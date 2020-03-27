'use strict';

const fs = require('fs');
const path = require('path');
const Controller = require('egg').Controller;
const { createRandomNum } = require('../../utils/utils');
const { ERROR_CODE, SUCCESS_CODE, GROUP_PERMIT } = require('../../utils/const')

class FileController extends Controller {
  async setAvatar() {
    const { socket, app } = this.ctx;
    const { file, type } = this.ctx.args[0];
    const random = createRandomNum(6);
    // 删除文件
    const files = fs.readdirSync(path.join('./', 'app/public/avatar/'));
    files.forEach(name => {
      if (name.split('_')[0] === socket.id) {
        fs.unlinkSync(path.join('./', `app/public/avatar/${name}`));
      }
    });
    // 写入新文件
    fs.writeFileSync(path.join('./', `app/public/avatar/${socket.id}_${random}.${type}`), file);
    const url = `http://192.168.0.104:7001/public/avatar/${socket.id}_${random}.${type}`;
    await app.mysql
      .query('UPDATE userInfo SET avatar = ? WHERE email = ?', [url, socket.id]);
    socket.emit('setUserInfo', { avatar: url });
  }
  async setGroupAvatar() {
    const { socket, app } = this.ctx;
    const { file, type, chatKey } = this.ctx.args[0];
    const permit = await app.mysql
      .query(`SELECT * FROM groupMemberInfo WHERE chatKey = '${chatKey}' AND email = '${socket.id}'`);
    // 权限满足
    if ([GROUP_PERMIT.OWNER, GROUP_PERMIT.MANAGER].includes(permit[0].permit)) {
      const random = createRandomNum(6);
      // 删除文件
      const files = fs.readdirSync(path.join('./', 'app/public/avatar/'));
      files.forEach(name => {
        if (name.split('_')[0] === chatKey) {
          fs.unlinkSync(path.join('./', `app/public/avatar/${name}`));
        }
      });
      // 写入新文件
      fs.writeFileSync(path.join('./', `app/public/avatar/${chatKey}_${random}.${type}`), file);
      const url = `http://192.168.0.104:7001/public/avatar/${chatKey}_${random}.${type}`;
      await app.mysql
        .query('UPDATE groupCommonInfo SET avatar = ? WHERE chatKey = ?', [url, chatKey]);
      socket.emit('setGroupAvatar', { code: SUCCESS_CODE, avatar: url, chatKey });
    } else {
      socket.emit('setGroupAvatar', { code: ERROR_CODE, msg: '权限错误!' });
    }
  }
}

module.exports = FileController;
