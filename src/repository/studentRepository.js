import Student from '../model/student.js';

export const createStudent = student => Student.create(student)


export const findStudentById = id => Student.findById(id).select('-password')

export const deleteStudentById = id => Student.findByIdAndDelete(id);

export const updateStudent = (id, data) => Student.findByIdAndUpdate(id, data,
    {returnDocument: 'after'});

export const findStudentsByName = name => Student.find({name: new RegExp(`^${name}$`, 'i')})

export const countStudentsByNames = names  => {
    const res = names.map(name => new RegExp(`^${name}$`, 'i'));
    return Student.countDocuments({name: {$in: res}});
    }

export const findStudentsByMinScore = (exam, minScore) => Student.find({[`scores.${exam}`]: {$gte: minScore}});
