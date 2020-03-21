'use strict';

const fs = require('fs');
const path = require('path');
const Controller = require('egg').Controller;
const { createRandomNum } = require('../../utils/utils');

class FileController extends Controller {
  async setAvatar() {
    const { socket, app } = this.ctx;
    const { file, type } = this.ctx.args[0];
    const random = createRandomNum(6);
    // 删除文件
    const files = fs.readdirSync(path.join('./', 'app/public/avatar/'));
    files.forEach(name => {
      if (name.split('_')[0] === socket.email) {
        fs.unlinkSync(path.join('./', `app/public/avatar/${name}`));
      }
    });
    // 写入新文件
    fs.writeFileSync(path.join('./', `app/public/avatar/${socket.email}_${random}.${type}`), file);
    const url = `http://192.168.0.104:7001/public/avatar/${socket.email}_${random}.${type}`;
    await app.mysql
      .query('UPDATE userInfo SET avatar = ? WHERE email = ?', [url, socket.email]);
    socket.emit('setUserInfo', { avatar: url });
  }
}

module.exports = FileController;
