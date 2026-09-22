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
return repo.deleteStudentById(+id)
}


export const updateStudent = async (id, data) => {
    let student = repo.updateStudent(+id, data);
    if(student) {
        student = {...student};
        delete student.password;
    }
    return student;
}

export const addScore = async (id, exam, score) => {
return repo.addScore(+id, exam, score);
}

export const findStudentsByName = async name => {
return repo.findStudentsByName(name);
}

export const countStudentsByNames = async names => {
return repo.countStudentsByNames(names);
}

export const findStudentsByMinScore = async (exam, minScore) => {
return repo.findStudentsByMinScore(exam, minScore);
}