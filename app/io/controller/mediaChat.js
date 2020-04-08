'use strict';

const Controller = require('egg').Controller;
// const { FRIEND_TYPE } = require('../../utils/const');

class MediaChatController extends Controller {
  async videoOffer() {
    // const { socket, app } = this.ctx;
    // const nsp = app.io.of('/');
    // const { type, peer, sdp, video, email } = this.ctx.args[0];
    // if (type === FRIEND_TYPE.FRIEND && nsp.sockets[peer]) {
    //   nsp.sockets[peer].emit('videoOffer', { type, sdp, video, peer, email });
    // }
  }
  async videoAnswer() {
    // const { socket, app } = this.ctx;
    // const nsp = app.io.of('/');
    // const { type, peer, sdp } = this.ctx.args[0];
    // if (type === FRIEND_TYPE.FRIEND && nsp.sockets[peer]) {
    //   nsp.sockets[peer].emit('videoAnswer', { sdp });
    // }
  }
  async newIceCandidate() {
    // const { socket, app } = this.ctx;
    // const nsp = app.io.of('/');
    // const { type, peer, candidate } = this.ctx.args[0];
    // if (type === FRIEND_TYPE.FRIEND && nsp.sockets[peer]) {
    //   nsp.sockets[peer].emit('newIceCandidate', { candidate });
    // }
  }
}

module.exports = MediaChatController;
