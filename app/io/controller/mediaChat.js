'use strict';

const Controller = require('egg').Controller;
const { FRIEND_TYPE } = require('../../utils/const');

class MediaChatController extends Controller {
  async videoOffer() {
    const { socket, app } = this.ctx;
    const nsp = app.io.of('/');
    const { type, peer, offer } = this.ctx.args[0];
    if (type === FRIEND_TYPE.FRIEND && nsp.sockets[peer]) {
      nsp.sockets[peer].emit('videoOffer', { offer });
    }
    if (type === FRIEND_TYPE.GROUP) {
      const members = await app.mysql.query(`
      SELECT * FROM groupMemberInfo WHERE chatKey = '${peer}'
    `);
      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        if (member.email !== socket.id && nsp.sockets[member.email]) {
          nsp.sockets[peer].emit('videoOffer', {
            offer,
          });
        }
      }
    }
  }
  async videoAnswer() {
    const { socket, app } = this.ctx;
    const nsp = app.io.of('/');
    const { type, peer, answer } = this.ctx.args[0];
    if (type === FRIEND_TYPE.FRIEND && nsp.sockets[peer]) {
      nsp.sockets[peer].emit('videoAnswer', { answer });
    }
    if (type === FRIEND_TYPE.GROUP) {
      const members = await app.mysql.query(`
      SELECT * FROM groupMemberInfo WHERE chatKey = '${peer}'
    `);
      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        if (member.email !== socket.id && nsp.sockets[member.email]) {
          nsp.sockets[peer].emit('videoAnswer', {
            answer,
          });
        }
      }
    }
  }
  async newIceCandidate() {
    const { socket, app } = this.ctx;
    const nsp = app.io.of('/');
    const { type, peer, candidate } = this.ctx.args[0];
    if (type === FRIEND_TYPE.FRIEND && nsp.sockets[peer]) {
      nsp.sockets[peer].emit('newIceCandidate', { candidate });
    }
    if (type === FRIEND_TYPE.GROUP) {
      const members = await app.mysql.query(`
      SELECT * FROM groupMemberInfo WHERE chatKey = '${peer}'
    `);
      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        if (member.email !== socket.id && nsp.sockets[member.email]) {
          nsp.sockets[peer].emit('newIceCandidate', {
            candidate,
          });
        }
      }
    }
  }
}

module.exports = MediaChatController;
