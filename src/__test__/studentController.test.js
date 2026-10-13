import {jest, beforeEach, describe, it, expect} from '@jest/globals'
import express from 'express'
import request from 'supertest'

// Mock the whole service layer so no database is touched
const mockService = {
    addStudent: jest.fn(),
    findStudent: jest.fn(),
    deleteStudent: jest.fn(),
    updateStudent: jest.fn(),
    addScore: jest.fn(),
    findStudentsByName: jest.fn(),
    countStudentsByNames: jest.fn(),
    findStudentsByMinScore: jest.fn()
}

jest.unstable_mockModule('../service/studentService.js', () => mockService)

// Routes must be imported after the mock is registered (ESM)
const {default: studentRoutes} = await import('../routes/studentRoutes.js')

// Build the app the same way server.js does, but without DB connection and listen()
const app = express()
app.use(express.json())
app.use(studentRoutes)
app.use((req, res) => res.status(404).type('text/plain; charset=utf-8').send('Not found'))

beforeEach(() => {
    jest.clearAllMocks()
})

// Common shape of the 404 body returned by the controller
const expectNotFoundBody = (body, path) => {
    expect(body).toMatchObject({
        status: 404,
        error: 'Not Found',
        path
    })
    expect(typeof body.timestamp).toBe('string')
}

describe('Student Controller (integration)', () => {

    describe('POST /student', () => {
        const validStudent = {id: 1, name: 'John', password: 'secret'}

        it('returns 204 when student is created', async () => {
            mockService.addStudent.mockResolvedValue(true)

            const res = await request(app).post('/student').send(validStudent)

            expect(res.status).toBe(204)
            expect(res.body).toEqual({})
            expect(mockService.addStudent).toHaveBeenCalledWith(validStudent)
        })

        it('returns 409 when student already exists', async () => {
            mockService.addStudent.mockResolvedValue(false)

            const res = await request(app).post('/student').send(validStudent)

            expect(res.status).toBe(409)
            expect(mockService.addStudent).toHaveBeenCalledWith(validStudent)
        })

        // Validator: each invalid body must be rejected before reaching the service
        it.each([
            ['id is missing', {name: 'John', password: 'secret'}, '"id" is required'],
            ['name is missing', {id: 1, password: 'secret'}, '"name" is required'],
            ['password is missing', {id: 1, name: 'John'}, '"password" is required'],
            ['id is not a number', {id: 'abc', name: 'John', password: 'secret'}, '"id" must be a number'],
            ['id is negative', {id: -5, name: 'John', password: 'secret'}, '"id" must be a positive number'],
            ['id is not an integer', {id: 1.5, name: 'John', password: 'secret'}, '"id" must be an integer'],
            ['unknown field is present', {...validStudent, age: 20}, '"age" is not allowed'],
        ])('returns 400 when %s', async (_, body, message) => {
            const res = await request(app).post('/student').send(body)

            expect(res.status).toBe(400)
            expect(res.text).toBe(message)
            expect(mockService.addStudent).not.toHaveBeenCalled()
        })

        it('returns 400 when body is empty', async () => {
            const res = await request(app).post('/student').send({})

            expect(res.status).toBe(400)
            expect(mockService.addStudent).not.toHaveBeenCalled()
        })
    })

    describe('GET /student/:id', () => {
        it('returns 200 and student when found', async () => {
            const student = {id: 1, name: 'John', scores: {Math: 90}}
            mockService.findStudent.mockResolvedValue(student)

            const res = await request(app).get('/student/1')

            expect(res.status).toBe(200)
            expect(res.body).toEqual(student)
            // Route params always arrive as strings
            expect(mockService.findStudent).toHaveBeenCalledWith('1')
        })

        it('returns 404 with error body when not found', async () => {
            mockService.findStudent.mockResolvedValue(null)

            const res = await request(app).get('/student/42')

            expect(res.status).toBe(404)
            expectNotFoundBody(res.body, '/student/42')
            expect(res.body.message).toBe('Student with id 42 not found')
        })
    })

    describe('DELETE /student/:id', () => {
        it('returns 200 and removed student', async () => {
            const student = {id: 3, name: 'John', scores: {}}
            mockService.deleteStudent.mockResolvedValue(student)

            const res = await request(app).delete('/student/3')

            expect(res.status).toBe(200)
            expect(res.body).toEqual(student)
            expect(mockService.deleteStudent).toHaveBeenCalledWith('3')
        })

        it('returns 404 when student does not exist', async () => {
            mockService.deleteStudent.mockResolvedValue(null)

            const res = await request(app).delete('/student/3')

            expect(res.status).toBe(404)
            expectNotFoundBody(res.body, '/student/3')
            expect(res.body.message).toBe('Student with id 3 not found')
        })
    })

    describe('PATCH /student/:id', () => {
        it('returns 200 and updated student', async () => {
            const updated = {id: 3, name: 'Peter', password: 'new'}
            mockService.updateStudent.mockResolvedValue(updated)

            const res = await request(app).patch('/student/3').send({name: 'Peter', password: 'new'})

            expect(res.status).toBe(200)
            expect(res.body).toEqual(updated)
            expect(mockService.updateStudent).toHaveBeenCalledWith('3', {name: 'Peter', password: 'new'})
        })

        it('accepts partial update (only name)', async () => {
            mockService.updateStudent.mockResolvedValue({id: 3, name: 'Peter'})

            const res = await request(app).patch('/student/3').send({name: 'Peter'})

            expect(res.status).toBe(200)
            expect(mockService.updateStudent).toHaveBeenCalledWith('3', {name: 'Peter'})
        })

        it('returns 404 when student does not exist', async () => {
            mockService.updateStudent.mockResolvedValue(undefined)

            const res = await request(app).patch('/student/3').send({name: 'Peter'})

            expect(res.status).toBe(404)
            expectNotFoundBody(res.body, '/student/3')
        })

        it.each([
            ['name is not a string', {name: 123}, '"name" must be a string'],
            ['password is not a string', {password: true}, '"password" must be a string'],
            ['id is passed', {id: 5, name: 'Peter'}, '"id" is not allowed'],
            ['scores are passed', {scores: {Math: 100}}, '"scores" is not allowed'],
        ])('returns 400 when %s', async (_, body, message) => {
            const res = await request(app).patch('/student/3').send(body)

            expect(res.status).toBe(400)
            expect(res.text).toBe(message)
            expect(mockService.updateStudent).not.toHaveBeenCalled()
        })
    })

    describe('PATCH /score/student/:id', () => {
        const validScore = {examName: 'Math', score: 95}

        it('returns 204 when score is added', async () => {
            mockService.addScore.mockResolvedValue({id: 1})

            const res = await request(app).patch('/score/student/1').send(validScore)

            expect(res.status).toBe(204)
            expect(mockService.addScore).toHaveBeenCalledWith('1', 'Math', 95)
        })

        it('returns 404 when student does not exist', async () => {
            mockService.addScore.mockResolvedValue(null)

            const res = await request(app).patch('/score/student/1').send(validScore)

            expect(res.status).toBe(404)
            expectNotFoundBody(res.body, '/score/student/1')
            expect(res.body.message).toBe('student not found')
        })

        it.each([
            ['examName is missing', {score: 95}, '"examName" is required'],
            ['score is missing', {examName: 'Math'}, '"score" is required'],
            ['score is above 100', {examName: 'Math', score: 101}, '"score" must be less than or equal to 100'],
            ['score is negative', {examName: 'Math', score: -1}, '"score" must be greater than or equal to 0'],
            ['score is not an integer', {examName: 'Math', score: 90.5}, '"score" must be an integer'],
            ['score is not a number', {examName: 'Math', score: 'high'}, '"score" must be a number'],
        ])('returns 400 when %s', async (_, body, message) => {
            const res = await request(app).patch('/score/student/1').send(body)

            expect(res.status).toBe(400)
            expect(res.text).toBe(message)
            expect(mockService.addScore).not.toHaveBeenCalled()
        })
    })

    describe('GET /students/name/:name', () => {
        it('returns 200 and list of students', async () => {
            const list = [{id: 1, name: 'Eva'}, {id: 2, name: 'Eva'}]
            mockService.findStudentsByName.mockResolvedValue(list)

            const res = await request(app).get('/students/name/Eva')

            expect(res.status).toBe(200)
            expect(res.body).toEqual(list)
            expect(mockService.findStudentsByName).toHaveBeenCalledWith('Eva')
        })

        it('returns 200 and empty array when nobody found', async () => {
            mockService.findStudentsByName.mockResolvedValue([])

            const res = await request(app).get('/students/name/Nobody')

            expect(res.status).toBe(200)
            expect(res.body).toEqual([])
        })
    })

    describe('GET /quantity/students', () => {
        it('passes multiple names as array', async () => {
            mockService.countStudentsByNames.mockResolvedValue(3)

            const res = await request(app).get('/quantity/students?names=Eva&names=John')

            expect(res.status).toBe(200)
            expect(res.body).toBe(3)
            expect(mockService.countStudentsByNames).toHaveBeenCalledWith(['Eva', 'John'])
        })

        it('wraps single name into array', async () => {
            mockService.countStudentsByNames.mockResolvedValue(1)

            const res = await request(app).get('/quantity/students?names=Eva')

            expect(res.status).toBe(200)
            expect(res.body).toBe(1)
            expect(mockService.countStudentsByNames).toHaveBeenCalledWith(['Eva'])
        })

        it('passes empty array when names are not provided', async () => {
            mockService.countStudentsByNames.mockResolvedValue(0)

            const res = await request(app).get('/quantity/students')

            expect(res.status).toBe(200)
            expect(res.body).toBe(0)
            expect(mockService.countStudentsByNames).toHaveBeenCalledWith([])
        })
    })

    describe('GET /students/exam/:exam/minscore/:minScore', () => {
        it('returns 200 and list of students', async () => {
            const list = [{id: 1, name: 'Eva', scores: {Math: 90}}]
            mockService.findStudentsByMinScore.mockResolvedValue(list)

            const res = await request(app).get('/students/exam/Math/minscore/80')

            expect(res.status).toBe(200)
            expect(res.body).toEqual(list)
            expect(mockService.findStudentsByMinScore).toHaveBeenCalledWith('Math', '80')
        })
    })

    describe('errors and unknown routes', () => {
        it('returns 404 for unknown route', async () => {
            const res = await request(app).get('/unknown')

            expect(res.status).toBe(404)
            expect(res.text).toBe('Not found')
        })

        it('returns 404 for unsupported method on existing path', async () => {
            const res = await request(app).put('/student/1').send({name: 'John'})

            expect(res.status).toBe(404)
        })

        it('returns 400 for malformed JSON body', async () => {
            const res = await request(app)
                .post('/student')
                .set('Content-Type', 'application/json')
                .send('{"id": 1, "name": ')

            expect(res.status).toBe(400)
            expect(mockService.addStudent).not.toHaveBeenCalled()
        })

        it('returns 500 when service throws', async () => {
            // Express 5 forwards rejected async handlers to the default error handler
            mockService.findStudent.mockRejectedValue(new Error('DB is down'))

            const res = await request(app).get('/student/1')

            expect(res.status).toBe(500)
        })
    })
})
