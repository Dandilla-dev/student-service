import Student from '../model/student.js';

const students = new Map();

export const createStudent = ({id, name, password}) => {
    if(students.has(id)) {
        return false
    }
    students.set(id,  new Student(id, name, password));
    return true;
}

export const findStudentById = id => students.get(id)

export const deleteStudentById = id => {
    if(!students.has(id)) {
        return false
    }
    const student = students.get(id);
    students.delete(id)
    return student;
}

export const updateStudent = (id, body) => {
    if(!students.has(id)) {
        return false
}
    const student = students.get(id);
    for (const key of Object.keys(body)) {
        student[key] = body[key];
    }
    return student;
}

export const addScore = (id, exam, score) => {
    if(!students.has(id)) {
        return false;
    }
    const student = students.get(id);
    student.scores[exam] = score;
    return student;
}

export const findStudentsByName = name => {
    const result = [];
    for (const student of students.values()) {
        if(student.name === name) {
            result.push(student);
        }
    }
    return result;
}

export const countStudentsByNames = names => {
    const result = [];
    for (const student of students.values()) {
        if(names.includes(student.name)) {
            result.push(student);
        }
    }
    return result.length;
}

export const findStudentsByMinScore = (exam, minScore) => {
    const result = [];
    for (const student of students.values()) {
        if (student.scores[exam] !== undefined && student.scores[exam] >= minScore) {
            result.push(student);
        }
    }
    return result;
}