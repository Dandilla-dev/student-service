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
app.set('env', 'test')
app.use(express.json())
app.use(studentRoutes)
app.use((req, res) => res.status(404).type('text/plain; charset=utf-8').send('Not found'))

const validStudent = {id: 1, name: 'John', password: 'secret'}
const validScore = {examName: 'Math', score: 95}

beforeEach(() => {
    // Reset implementations too, so no mocked value leaks between tests
    jest.resetAllMocks()
})

// Validation errors must stop the request before any service method is called
const expectNoServiceCalls = () => {
    for (const method of Object.values(mockService)) {
        expect(method).not.toHaveBeenCalled()
    }
}

// Common shape of the 404 body returned by the controller
const expectNotFound = (res, path, message) => {
    expect(res.status).toBe(404)
    expect(res.body).toEqual({
        timestamp: expect.any(String),
        status: 404,
        error: 'Not Found',
        message,
        path
    })
    // timestamp must be a valid ISO date
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp)
}

describe('Student Controller (integration)', () => {

    describe('POST /student', () => {
        it('returns 204 when student is created', async () => {
            mockService.addStudent.mockResolvedValue(true)

            const res = await request(app).post('/student').send(validStudent)

            expect(res.status).toBe(204)
            expect(res.text).toBe('')
            expect(mockService.addStudent).toHaveBeenCalledTimes(1)
            expect(mockService.addStudent).toHaveBeenCalledWith(validStudent)
        })

        it('returns 409 when student already exists', async () => {
            mockService.addStudent.mockResolvedValue(false)

            const res = await request(app).post('/student').send(validStudent)

            expect(res.status).toBe(409)
            expect(res.text).toBe('')
            expect(mockService.addStudent).toHaveBeenCalledWith(validStudent)
        })

        it('accepts numeric string id and passes the original body to the service', async () => {
            // Joi converts '1' only for validation; the controller forwards req.body as is
            mockService.addStudent.mockResolvedValue(true)
            const body = {...validStudent, id: '1'}

            const res = await request(app).post('/student').send(body)

            expect(res.status).toBe(204)
            expect(mockService.addStudent).toHaveBeenCalledWith(body)
        })

        // KNOWN BUG: without a body req.body is undefined, and Joi accepts undefined,
        // so the request reaches the service. Remove `.failing` once the schema is fixed.
        it.failing('returns 400 when request has no body', async () => {
            mockService.addStudent.mockResolvedValue(true)

            const res = await request(app).post('/student')

            expect(res.status).toBe(400)
            expectNoServiceCalls()
        })
    })

    describe.each([
        ['GET', 'get', 'findStudent'],
        ['DELETE', 'delete', 'deleteStudent']
    ])('%s /student/:id', (_label, method, serviceMethod) => {
        it('returns 200 and student as JSON', async () => {
            const student = {id: 1, name: 'John', scores: {Math: 95}}
            mockService[serviceMethod].mockResolvedValue(student)

            const res = await request(app)[method]('/student/1')

            expect(res.status).toBe(200)
            expect(res.headers['content-type']).toMatch(/json/)
            expect(res.body).toEqual(student)
            // Route params always arrive as strings
            expect(mockService[serviceMethod]).toHaveBeenCalledTimes(1)
            expect(mockService[serviceMethod]).toHaveBeenCalledWith('1')
        })

        it('returns structured 404 when student is missing', async () => {
            mockService[serviceMethod].mockResolvedValue(null)

            const res = await request(app)[method]('/student/42')

            expectNotFound(res, '/student/42', 'Student with id 42 not found')
            expect(mockService[serviceMethod]).toHaveBeenCalledWith('42')
        })
    })

    describe('PATCH /student/:id', () => {
        it.each([
            {name: 'Jane'},
            {password: 'new-secret'},
            {name: 'Jane', password: 'new-secret'},
            {} // Current schema allows an empty update
        ])('accepts update %j', async (body) => {
            const updated = {...validStudent, ...body}
            mockService.updateStudent.mockResolvedValue(updated)

            const res = await request(app).patch('/student/1').send(body)

            expect(res.status).toBe(200)
            expect(res.body).toEqual(updated)
            expect(mockService.updateStudent).toHaveBeenCalledTimes(1)
            expect(mockService.updateStudent).toHaveBeenCalledWith('1', body)
        })

        it('returns structured 404 when student is missing', async () => {
            mockService.updateStudent.mockResolvedValue(undefined)

            const res = await request(app).patch('/student/1').send({name: 'Jane'})

            expectNotFound(res, '/student/1', 'Student with id 1 not found')
            expect(mockService.updateStudent).toHaveBeenCalledWith('1', {name: 'Jane'})
        })
    })

    describe('PATCH /score/student/:id', () => {
        it.each([1, 95, 100])('accepts score %j and returns 204', async (score) => {
            mockService.addScore.mockResolvedValue({id: 1, scores: {Math: score}})

            const res = await request(app).patch('/score/student/1').send({examName: 'Math', score})

            expect(res.status).toBe(204)
            expect(res.text).toBe('')
            expect(mockService.addScore).toHaveBeenCalledTimes(1)
            expect(mockService.addScore).toHaveBeenCalledWith('1', 'Math', score)
        })

        it('passes numeric string score to the service without conversion', async () => {
            // Joi accepts '95', but the controller forwards req.body.score, not the converted value
            mockService.addScore.mockResolvedValue({id: 1})

            const res = await request(app).patch('/score/student/1').send({examName: 'Math', score: '95'})

            expect(res.status).toBe(204)
            expect(mockService.addScore).toHaveBeenCalledWith('1', 'Math', '95')
        })

        // KNOWN BUG: `.positive()` together with `.min(0)` rejects 0.
        // Remove `.failing` once `.positive()` is removed from scoreSchema.
        it.failing('accepts score 0', async () => {
            mockService.addScore.mockResolvedValue({id: 1})

            const res = await request(app).patch('/score/student/1').send({examName: 'Math', score: 0})

            expect(res.status).toBe(204)
        })

        it('returns structured 404 when student is missing', async () => {
            mockService.addScore.mockResolvedValue(null)

            const res = await request(app).patch('/score/student/1').send(validScore)

            // Note: message differs from other endpoints ("Student with id ... not found")
            expectNotFound(res, '/score/student/1', 'student not found')
            expect(mockService.addScore).toHaveBeenCalledWith('1', 'Math', 95)
        })
    })

    describe('GET /students/name/:name', () => {
        it.each([
            ['matching students', [{id: 1, name: 'John Doe'}]],
            ['an empty list', []]
        ])('returns %s', async (_label, students) => {
            mockService.findStudentsByName.mockResolvedValue(students)

            const res = await request(app).get('/students/name/John%20Doe')

            expect(res.status).toBe(200)
            expect(res.body).toEqual(students)
            // URL-encoded name is decoded by Express
            expect(mockService.findStudentsByName).toHaveBeenCalledWith('John Doe')
        })
    })

    describe('GET /quantity/students', () => {
        it.each([
            ['one name (wrapped into array)', {names: 'John'}, ['John'], 1],
            ['multiple names', {names: ['John', 'Jane']}, ['John', 'Jane'], 2],
            ['no matches', {names: 'Missing'}, ['Missing'], 0],
            ['no names (empty array)', {}, [], 0]
        ])('returns JSON count for %s', async (_label, query, names, count) => {
            mockService.countStudentsByNames.mockResolvedValue(count)

            const res = await request(app).get('/quantity/students').query(query)

            expect(res.status).toBe(200)
            expect(res.headers['content-type']).toMatch(/json/)
            expect(res.body).toBe(count)
            expect(mockService.countStudentsByNames).toHaveBeenCalledTimes(1)
            expect(mockService.countStudentsByNames).toHaveBeenCalledWith(names)
        })
    })

    describe('GET /students/exam/:exam/minscore/:minScore', () => {
        it.each([
            ['matching students', [{id: 1, scores: {Math: 95}}]],
            ['an empty list', []]
        ])('returns %s', async (_label, students) => {
            mockService.findStudentsByMinScore.mockResolvedValue(students)

            const res = await request(app).get('/students/exam/Math/minscore/80')

            expect(res.status).toBe(200)
            expect(res.body).toEqual(students)
            expect(mockService.findStudentsByMinScore).toHaveBeenCalledWith('Math', '80')
        })
    })

    // Each row: field to override in a valid body, its value, expected Joi message
    describe.each([
        ['POST /student', 'post', '/student', validStudent, [
            ['id', undefined, '"id" is required'],
            ['id', 0, '"id" must be a positive number'],
            ['id', -1, '"id" must be a positive number'],
            ['id', 1.5, '"id" must be an integer'],
            ['id', 'invalid', '"id" must be a number'],
            ['id', null, '"id" must be a number'],
            ['name', undefined, '"name" is required'],
            ['name', '', '"name" is not allowed to be empty'],
            ['name', 123, '"name" must be a string'],
            ['password', undefined, '"password" is required'],
            ['password', '', '"password" is not allowed to be empty'],
            ['password', 123, '"password" must be a string'],
            ['extra', true, '"extra" is not allowed']
        ]],
        ['PATCH /student/:id', 'patch', '/student/1', {name: 'Jane'}, [
            ['name', '', '"name" is not allowed to be empty'],
            ['name', 123, '"name" must be a string'],
            ['name', null, '"name" must be a string'],
            ['password', '', '"password" is not allowed to be empty'],
            ['password', 123, '"password" must be a string'],
            ['id', 2, '"id" is not allowed'],
            ['scores', {Math: 95}, '"scores" is not allowed']
        ]],
        ['PATCH /score/student/:id', 'patch', '/score/student/1', validScore, [
            ['examName', undefined, '"examName" is required'],
            ['examName', '', '"examName" is not allowed to be empty'],
            ['examName', 123, '"examName" must be a string'],
            ['score', undefined, '"score" is required'],
            ['score', -1, '"score" must be greater than or equal to 0'],
            ['score', 101, '"score" must be less than or equal to 100'],
            ['score', 95.5, '"score" must be an integer'],
            ['score', 'invalid', '"score" must be a number'],
            ['score', null, '"score" must be a number'],
            ['extra', true, '"extra" is not allowed']
        ]]
    ])('%s validation', (_label, method, path, validBody, invalidFields) => {
        it.each(invalidFields)('rejects %s = %j with 400: %s', async (field, value, message) => {
            const body = {...validBody, [field]: value}

            const res = await request(app)[method](path).send(body)

            expect(res.status).toBe(400)
            expect(res.text).toBe(message)
            expectNoServiceCalls()
        })

        it('rejects array body with 400', async () => {
            const res = await request(app)[method](path).send([])

            expect(res.status).toBe(400)
            expect(res.text).toBe('"value" must be of type object')
            expectNoServiceCalls()
        })

        it('rejects malformed JSON with 400', async () => {
            const res = await request(app)[method](path)
                .set('Content-Type', 'application/json')
                .send('{')

            expect(res.status).toBe(400)
            expectNoServiceCalls()
        })
    })

    describe('service failures', () => {
        // Express 5 forwards rejected async handlers to the default error handler
        it.each([
            ['post', '/student', 'addStudent', validStudent],
            ['get', '/student/1', 'findStudent', undefined],
            ['delete', '/student/1', 'deleteStudent', undefined],
            ['patch', '/student/1', 'updateStudent', {name: 'Jane'}],
            ['patch', '/score/student/1', 'addScore', validScore],
            ['get', '/students/name/John', 'findStudentsByName', undefined],
            ['get', '/quantity/students?names=John', 'countStudentsByNames', undefined],
            ['get', '/students/exam/Math/minscore/80', 'findStudentsByMinScore', undefined]
        ])('%s %s returns 500 when %s rejects', async (method, path, serviceMethod, body) => {
            mockService[serviceMethod].mockRejectedValue(new Error('Service unavailable'))

            const req = request(app)[method](path)
            const res = await (body === undefined ? req : req.send(body))

            expect(res.status).toBe(500)
            expect(mockService[serviceMethod]).toHaveBeenCalledTimes(1)
        })
    })

    describe('unknown routes', () => {
        it('returns 404 for unknown path', async () => {
            const res = await request(app).get('/unknown')

            expect(res.status).toBe(404)
            expect(res.text).toBe('Not found')
            expectNoServiceCalls()
        })

        it('returns 404 for unsupported method on existing path', async () => {
            const res = await request(app).put('/student/1').send({name: 'John'})

            expect(res.status).toBe(404)
            expectNoServiceCalls()
        })
    })
})
