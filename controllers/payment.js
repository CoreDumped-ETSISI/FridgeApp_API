'use strict'

const mongoose = require('mongoose')
const services = require('../services')
const winston = require('winston')
const Payment = require('../models/payment')
const User = require('../models/user')

function getPayment(req, res) {
  let paymentId = req.params.id
  if(!services.validId(paymentId)) return res.sendStatus(400)

  Payment.findOne({
      _id: paymentId,
      userId: req.user
    })
    .select("-userId") //TODO: Overwrite function toJSON to avoid this
    .exec((err, payment) => {
      if (err) return res.sendStatus(500)
      if (!payment) return res.sendStatus(404)
      return res.status(200).send(payment)
    })
}

function getPaymentList(req, res) {
  Payment.find({ userId: req.user }, "-userId", (err, payments) => {
    if (err) return res.sendStatus(500)
    if (!payments) return res.sendStatus(404)
    return res.status(200).send(payments)
  })
}

function updatePayment(req, res) {
  const paymentId = req.params.id
  if(!services.validId(paymentId) ||
     !services.validFloat(req.body.amount))
     return res.sendStatus(400)

  Payment.findOne({ _id: paymentId })
    .exec((err, payment) => {
      if (err) return res.sendStatus(500)
      if (!payment) return res.sendStatus(404)

      let diff = req.body.amount - payment.amount
      payment.amount = req.body.amount

      User.findOne({ _id: payment.userId })
        .exec((err, user) => {
          if (err) return res.sendStatus(500)
          if (!user) return res.sendStatus(404)

          user.update({ $inc: { balance: diff } }, (err, userStored) => {
            if (err) return res.sendStatus(500)
            payment.save((err, paymentStored) => {
              if (err) return res.sendStatus(500)
              winston.info("Payment updated: " + paymentId);
              return res.status(200).send(paymentStored)
            })
          })
        })
    })
}

function savePayment(req, res) {
  if(!services.validId(req.body.userId) ||
     !services.validFloat(req.body.amount) ||
     !(req.body.amount > 0))
     return res.sendStatus(400)

  const payment = new Payment({
    userId: req.body.userId,
    adminId: req.user,
    amount: req.body.amount
  })

  User.findOne({ _id: req.body.userId })
    .exec((err, user) => {
        if (err) return res.sendStatus(501)
        if (!user) return res.sendStatus(404)

        payment.save((err, paymentStored) => {
          if (err) return res.sendStatus(502)
          var cl = paymentStored.toObject()
          delete cl.userId                  //TODO: Overwrite function toJSON to avoid this
          delete cl.adminId
          delete cl.__v

          user.update({ $inc: { balance: paymentStored.amount } }, (err, userStored) => {
            if (err) return res.sendStatus(503)
            winston.info("Payment saved: " + paymentStored._id);
            return res.status(200).send(paymentStored)
          })
       })
    })
}

function deletePayment(req, res) {
  const paymentId = req.params.id
  if(!services.validId(paymentId)) return res.sendStatus(400)

  Payment.findOne({ _id: paymentId })
    .exec((err, payment) => {
      if (err) return res.sendStatus(500)
      if (!payment) return res.sendStatus(404)

      User.findOneAndUpdate({ _id: payment.userId }, { $inc: { balance: -payment.amount } })
        .exec((err, user) => {
          if (err) return res.sendStatus(500)
          if (!user) return res.sendStatus(404)
          payment.remove()
          winston.info("Payment deleted: " + paymentId);
          return res.sendStatus(200)
        })
    })
}

module.exports = {
  getPayment,
  getPaymentList,
  updatePayment,
  savePayment,
  deletePayment
}
