import * as service from '../service/studentService.js'

export const addStudent = async (req, res) => {
const success = await service.addStudent(req.body);
if (success) {
    return res.status(204).send()
}else {
    return res.status(409).send()
}
}

export const findStudent = async (req, res) => {
    const student = await service.findStudent(req.params.id);
    if (student) {
        return res.json(student);
    }else {
        return res.status(404).send({
            "timestamp": new Date().toISOString(),
            "status": 404,
            "error": "Not Found",
            "message": `Student with id ${req.params.id} not found`,
            "path": req.params
        })
    }
}

export const deleteStudent = async (req, res) => {
    const success = await service.deleteStudent(req.params.id);
    if (success) {
        return res.json(success);
    }else {
        return res.status(404).send({
            "timestamp": new Date().toISOString(),
            "status": 404,
            "error": "Not Found",
            "message": `Student with id ${req.params.id} not found`,
            "path": req.params
        })
    }
}

export const updateStudent = async (req, res) => {
    const success = await service.updateStudent(req.params.id, req.body);
    if (success) {
        return res.json(success);
    }else {
        return res.status(404).send({
            "timestamp": new Date().toISOString(),
            "status": 404,
            "error": "Not Found",
            "message": `Student with id ${req.params.id} not found`,
            "path": req.params
        })
    }
}

export const addScore = async (req, res) => {
    const success = await service.addScore(req.params.id, req.body);
    if (success) {
        return res.status(204).send();
    }else {
        return res.status(404).send({
            "timestamp": new Date().toISOString(),
            "status": 404,
            "error": "Not Found",
            "message": `student not found`,
            "path": req.params
        })
    }
}
export const findStudentsByName = async (req, res) => {
    const students = await service.findStudentsByName(req.params.name);
        return res.json(students);
}

export const countStudentsByNames = async (req, res) => {
    const count = await service.countStudentsByNames(req.query.names);
    return res.json(count);
}

export const findStudentsByMinScore = async (req, res) => {
    const students = await service.findStudentsByMinScore(req.params.exam, req.params.minScore);
    return res.json(students);
}

