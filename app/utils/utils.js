'use strict';

const createRandomNum = count => {
  let Num = '';
  for (let i = 0; i < count; i++) {
    Num += Math.floor(Math.random() * 10);
  }
  return Num;
};

module.exports = {
  createRandomNum,
};
