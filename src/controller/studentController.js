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

//TODO Homework: Implement other operations