import * as repo from "../repository/studentRepository.js"

export const addStudent = async student => repo.createStudent(student);

export const findStudent = async id => {
    let student = repo.findStudentById(+id)
    if(student) {
        student = {...student};
        // student.password = undefined;
        delete student.password;
    }
   return student;
}

export const deleteStudent = async id => {
//     TODO: Implement deleteStudent
}

export const updateStudent = async (id, data) => {
//     TODO: Implement updateStudent
}

export const addScore = async (id, exam, score) => {
// TODO:  Implement addScore
}

export const findStudentsByName = async name => {
// TODO:  Implement findStudentsByName
}

export const countStudentsByNames = async names => {
// TODO:  Implement countStudentsByNames
}

export const findStudentsByMinScore = async (exam, minScore) => {
// TODO:  Implement findStudentsByName
}