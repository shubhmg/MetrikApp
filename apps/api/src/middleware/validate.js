import ApiError from '../utils/ApiError.js';
import pick from '../utils/pick.js';

/**
 * Validates request against a Joi schema.
 * Schema should have keys for 'body', 'params', 'query'.
 */
export default function validate(schema) {
  return (req, _res, next) => {
    const validSchema = pick(schema, ['body', 'params', 'query']);
    const obj = pick(req, Object.keys(validSchema));

    const errors = [];
    for (const [key, joiSchema] of Object.entries(validSchema)) {
      const { error, value } = joiSchema.validate(obj[key], { abortEarly: false });
      if (error) {
        const messages = error.details.map((d) => d.message);
        errors.push(...messages);
      } else {
        req[key] = value;
      }
    }

    if (errors.length > 0) {
      return next(ApiError.badRequest('Validation failed', errors));
    }
    next();
  };
}
