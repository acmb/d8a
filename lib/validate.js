const _ = require('lodash')
const tools = require('extras')
const locales = require('./locales.js')

module.exports = async function(spec, data, opt = {}) {
  const lang = opt.lang || 'en'
  const t = function(path, ...args) {
    let key = `validation.${path}`
    if (opt.t) return opt.t(key, ...args)
    const value = _.get(locales[lang], key) || path
    return tools.format(value, ...args)
  }

  const errors = {}
  function add(key, value) {
    const list = _.get(errors, key) || []
    list.push(value)
    _.set(errors, key, list)
  }

  for (const field in spec) {
    const validator = spec[field]
    for (const type in validator) {
      let x = validator[type]
      const y = _.get(data, field)

      if (type !== 'matcher' && _.isFunction(x)) {
        x = await x(y, opt)
      }

      if (_.isUndefined(y)) {
        if (type === 'required' && x === true) {
          add(field, t(type))
        }

      } else if (
        type === 'eq' && x !== y ||
        type === 'ne' && x === y ||
        type === 'gt' && (!_.isNumber(y) || y <= x) ||
        type === 'lt' && (!_.isNumber(y) || y >= x) ||
        type === 'gte' && (!_.isNumber(y) || y < x) ||
        type === 'lte' && (!_.isNumber(y) || y > x) ||
        type === 'in' && !x.includes(y) ||
        type === 'nin' && x.includes(y) ||
        type === 'length' && (!_.isString(y) || x !== y.length) ||
        type === 'minlength' && (!_.isString(y) || x > y.length) ||
        type === 'maxlength' && (!_.isString(y) || x < y.length) ||
        type === 'match' && (!_.isRegExp(x) || !x.test(y))
      ) {
        add(field, t(type, x))

      } else if (
        type === 'is' && (
          x === 'boolean' && !_.isBoolean(y) ||
          x === 'string' && !_.isString(y) ||
          x === 'number' && !_.isNumber(y) ||
          x === 'integer' && !_.isInteger(y) ||
          x === 'decimal' && (!_.isNumber(y) || _.isInteger(y)) ||
          x === 'date' && !_.isDate(y) ||
          x === 'id' && !tools.isId(y) ||
          x === 'object' && !_.isPlainObject(y) ||
          x === 'array' && !_.isArray(y) ||
          x === 'email' && !tools.isEmail(y) ||
          x === 'url' && !tools.isURL(y)
        )
      ) {
        add(field, t(x))

      } else if (type === 'matcher' && _.isFunction(x)) {
        const result = await x(y, opt)
        if (result) {
          add(field, result)
        }
      }
    }
  }

  return _.isEmpty(errors) ? null : errors
}
