import * as repo from "../repository/studentRepository.js"

export const addStudent = async ({id, name, password}) => {
    if(await repo.findStudentById(id)){
        return false;
    }
    await repo.createStudent({_id: id, name, password});
    return true;
}

export const findStudent = async id => {
    const student = await repo.findStudentById(+id)
    return student ? renameId(student) : null;
}

export const deleteStudent = async id => {
    const student = await repo.deleteStudentById(+id)
    return student ? renameId(student) : null;
}

export const updateStudent = async (id, data) => await repo.updateStudent(+id, data)


export const addScore = async (id, exam, score) => await repo.updateStudent(+id,  {[`scores.${exam}`]: score});


export const findStudentsByName = async name => {
    const student = await repo.findStudentsByName(name)
    return student.map(renameId);
};


export const countStudentsByNames = async names => await repo.countStudentsByNames(names);


export const findStudentsByMinScore = async (exam, minScore) => {
    const student = await repo.findStudentsByMinScore(exam, +minScore);
    return student.map(renameId);
}


function renameId(student) {
    if (student) {
        student.id = student._id;
        delete student._id;
    }
    return student;
    // const {_id, ...rest} = student;
    // return {id: _id, ...rest}
}