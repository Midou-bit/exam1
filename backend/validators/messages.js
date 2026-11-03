// validators/messages.js : messages d'erreur Joi en français
module.exports = {
  'any.required': '{#label} est obligatoire',
  'any.only': '{#label} doit être l\'une des valeurs : {#valids}',
  'string.base': '{#label} doit être une chaîne de caractères',
  'string.empty': '{#label} ne peut pas être vide',
  'string.min': '{#label} doit contenir au moins {#limit} caractères',
  'string.max': '{#label} doit contenir au plus {#limit} caractères',
  'string.alphanum': '{#label} ne doit contenir que des lettres et des chiffres',
  'string.email': '{#label} doit être une adresse email valide',
  'string.hex': '{#label} doit être un identifiant valide',
  'string.length': '{#label} doit être un identifiant valide',
  'number.base': '{#label} doit être un nombre',
  'number.integer': '{#label} doit être un entier',
  'number.min': '{#label} doit être supérieur ou égal à {#limit}',
  'array.base': '{#label} doit être une liste',
  'array.min': '{#label} doit contenir au moins {#limit} élément(s)',
  'object.base': '{#label} doit être un objet',
};
