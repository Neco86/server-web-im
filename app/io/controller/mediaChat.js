'use strict';

const Controller = require('egg').Controller;
const { FRIEND_TYPE } = require('../../utils/const');

class MediaChatController extends Controller {
  async videoOffer() {
    const { socket, app } = this.ctx;
    const nsp = app.io.of('/');
    const { type, peer, offer, index } = this.ctx.args[0];
    if (type === FRIEND_TYPE.FRIEND && nsp.sockets[peer]) {
      nsp.sockets[peer].emit('videoOffer', { offer, index });
    }
    if (type === FRIEND_TYPE.GROUP) {
      const members = await app.mysql.query(`
      SELECT * FROM groupMemberInfo WHERE chatKey = '${peer}'
    `);
      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        if (member.email !== socket.id && nsp.sockets[member.email]) {
          nsp.sockets[member.email].emit('videoOffer', {
            offer,
            index,
          });
        }
      }
    }
  }
  async videoAnswer() {
    const { socket, app } = this.ctx;
    const nsp = app.io.of('/');
    const { type, peer, answer, index } = this.ctx.args[0];
    if (type === FRIEND_TYPE.FRIEND && nsp.sockets[peer]) {
      nsp.sockets[peer].emit('videoAnswer', { answer, index });
    }
    if (type === FRIEND_TYPE.GROUP) {
      const members = await app.mysql.query(`
      SELECT * FROM groupMemberInfo WHERE chatKey = '${peer}'
    `);
      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        if (member.email !== socket.id && nsp.sockets[member.email]) {
          nsp.sockets[member.email].emit('videoAnswer', {
            answer,
            index,
          });
        }
      }
    }
  }
  async newIceCandidate() {
    const { socket, app } = this.ctx;
    const nsp = app.io.of('/');
    const { type, peer, candidate, index } = this.ctx.args[0];
    if (type === FRIEND_TYPE.FRIEND && nsp.sockets[peer]) {
      nsp.sockets[peer].emit('newIceCandidate', { candidate, index });
    }
    if (type === FRIEND_TYPE.GROUP) {
      const members = await app.mysql.query(`
      SELECT * FROM groupMemberInfo WHERE chatKey = '${peer}'
    `);
      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        if (member.email !== socket.id && nsp.sockets[member.email]) {
          nsp.sockets[member.email].emit('newIceCandidate', {
            candidate,
            index,
          });
        }
      }
    }
  }
  async getUserMediaFinish() {
    const { socket, app } = this.ctx;
    const nsp = app.io.of('/');
    const { type, peer, account } = this.ctx.args[0];
    if (type === FRIEND_TYPE.FRIEND && nsp.sockets[peer]) {
      socket.emit('getUserMediaFinish', { account });
      nsp.sockets[peer].emit('getUserMediaFinish', { account });
    }
    if (type === FRIEND_TYPE.GROUP) {
      const members = await app.mysql.query(`
      SELECT * FROM groupMemberInfo WHERE chatKey = '${peer}'
    `);
      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        if (nsp.sockets[member.email]) {
          nsp.sockets[member.email].emit('getUserMediaFinish', {
            account,
          });
        }
      }
    }
  }
}

module.exports = MediaChatController;
