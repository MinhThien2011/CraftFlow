import Joi from 'joi';

export const passwordComplexity = Joi.string()
  .min(8)
  .pattern(new RegExp("^(?=.*[A-Z])(?=.*\\d)(?=.*[\\W_]).{8,}$"))
  .messages({
    "string.min": "Mật khẩu phải có ít nhất 8 ký tự.",
    "string.pattern.base": "Mật khẩu phải chứa ít nhất 1 chữ in hoa, 1 chữ số và 1 ký tự đặc biệt.",
    'string.empty': 'Mật khẩu là bắt buộc.',
    'any.required': 'Mật khẩu là bắt buộc.'
  });

const userSchema = Joi.object({
  username: Joi.string().pattern(/^\S+$/).min(3).max(30).required().messages({
    'string.pattern.base': 'Tên đăng nhập không được chứa khoảng trắng.',
    'string.min': 'Tên đăng nhập phải có ít nhất 3 ký tự.',
    'string.max': 'Tên đăng nhập tối đa 30 ký tự.',
    'any.required': 'Tên đăng nhập là bắt buộc.'
  }),
  password: passwordComplexity.required(),
  email: Joi.string().email().required().messages({
    'string.email': 'Email không hợp lệ.',
    'any.required': 'Email là bắt buộc.'
  }),
  fullName: Joi.string().min(3).required().messages({
    'string.min': 'Họ tên phải có ít nhất 3 ký tự.'
  }),
  phone: Joi.string().pattern(/^[0-9]{10}$/).required().messages({
    'string.pattern.base': 'Số điện thoại phải có đúng 10 chữ số.'
  }),
  address: Joi.string().optional().allow(''),
  birthDay: Joi.date().optional(),
  gender: Joi.string().valid('male', 'female').default('male'),
  avatar: Joi.string().uri().optional().allow(''),
  role: Joi.string().required().messages({
    'any.required': 'Vai trò là bắt buộc.'
  }),
  isActive: Joi.boolean().default(true),
  maxDailyCapacity: Joi.number().integer().min(0).default(100),
}).required();

const updateUserSchema = Joi.object({
  fullName: Joi.string().min(3),
  phone: Joi.string().pattern(/^[0-9]{10,11}$/),
  address: Joi.string(),
  birthDay: Joi.date().optional(),
  gender: Joi.string().valid('male', 'female'),
  avatar: Joi.string().uri().optional().allow(''),
  maxDailyCapacity: Joi.number().integer().min(0).default(100),
}).min(1).required();

export const createUserValidator = (body) => userSchema.validate(body, { abortEarly: false });
export const updateUserValidator = (body) => updateUserSchema.validate(body, { abortEarly: false, stripUnknown: true });
