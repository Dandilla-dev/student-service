import * as repo from "../repository/studentRepository.js"

export const addStudent = async ({id, name, password}) => {
    if(await repo.findStudentById(id)){
        return false;
    }
    await repo.createStudent({_id: id, name, password});
    return true;
}

export const findStudent = async id => await repo.findStudentById(+id)


export const deleteStudent = async id => await repo.deleteStudentById(+id)

export const updateStudent = async (id, data) => (await repo.updateStudent(+id, data))?.toObject()


export const addScore = async (id, exam, score) => await repo.updateStudent(+id,  {[`scores.${exam}`]: score});


export const findStudentsByName = async name => await repo.findStudentsByName(name)



export const countStudentsByNames = async (names) => {
    names = Array.isArray(names) ? names : [names];
    return await repo.countStudentsByNames(names);
}

export const findStudentsByMinScore = async (exam, minScore) => await repo.findStudentsByMinScore
(exam, +minScore);



