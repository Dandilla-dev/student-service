import Joi from "joi";

export const addstudentSchema = Joi.object ({
    id: Joi.number().integer().positive().required(),
    name: Joi.string().required(),
    password: Joi.string().required(),
})

export const updateStudentSchema = Joi.object ({
    name: Joi.string(),
    password: Joi.string(),
})

export const scoreSchema = Joi.object ({
    examName : Joi.string().required(),
    score: Joi.number().integer().min(0).max(100).positive().required()
})