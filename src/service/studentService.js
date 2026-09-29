import * as repo from "../repository/studentRepository.js"

export const addStudent = async student => repo.createStudent(student);

export const findStudent = async id => await repo.findStudentById(+id)

export const deleteStudent = async id => await repo.deleteStudentById(+id)

export const updateStudent = async (id, data) => await repo.updateStudent(+id, data)


export const addScore = async (id, exam, score) => await repo.updateStudent(+id,  {[`scores.${exam}`]: score});


export const findStudentsByName = async name => await repo.findStudentsByName(name);


export const countStudentsByNames = async names => {
return await repo.countStudentsByNames(names);
}

export const findStudentsByMinScore = async (exam, minScore) => await repo.findStudentsByMinScore(exam, +minScore);


function renameId(student) {
    //TODO HW 2 return student with renamed id (_id -> id)
    // Use this in function where need rename id
}