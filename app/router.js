'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;
  router.post('/getCaptcha', controller.register.getCaptcha);
  router.post('/register', controller.register.register);
};
