'use strict'

const services = require('../services')
const User = require('../models/user')
const config = require('../config')

function isAdmin(req, res, next) {
  User.findOne({_id: req.user})
  .select('+admin')
  .exec((err, user) => {
    if (err) res.status(404).send(err.message)

    if(user && user.admin == config.ADMIN_TOKEN) {
      next()
    } else {
      res.status(404).send({ message: 'You don`t have autorization' })
    }

  })
}

module.exports = isAdmin
