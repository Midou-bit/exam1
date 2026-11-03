// backend/middlewares/validate.js : valide req[property] avec un schéma Joi, 400 avec message lisible sinon
const messages = require('../validators/messages');

module.exports = (schema, property = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[property], { abortEarly: false, stripUnknown: true, messages });
  if (error) {
    return res.status(400).json({ message: error.details.map((detail) => detail.message.replace(/"/g, '')).join(' ; ') });
  }
  // Champs inconnus retirés (ex. role, price, total envoyés par le client)
  req[property] = value;
  next();
};
