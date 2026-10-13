import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import express from 'express';
import request from 'supertest';

const mockService = {
    addStudent: jest.fn(),
    findStudent: jest.fn(),
    deleteStudent: jest.fn(),
    updateStudent: jest.fn(),
    addScore: jest.fn(),
    findStudentsByName: jest.fn(),
    countStudentsByNames: jest.fn(),
    findStudentsByMinScore: jest.fn()
};

// Register the ESM mock before importing routes and their controller.
jest.unstable_mockModule('../service/studentService.js', () => mockService);
const {default: studentRoutes} = await import('../routes/studentRoutes.js');

// Use real routing, JSON parsing and validation without starting MongoDB.
const app = express();
app.set('env', 'test');
app.use(express.json());
app.use(studentRoutes);

const validStudent = {id: 1, name: 'John', password: 'secret'};

beforeEach(() => {
    jest.resetAllMocks();
});

function expectNoServiceCalls() {
    for (const method of Object.values(mockService)) {
        expect(method).not.toHaveBeenCalled();
    }
}

function expectNotFound(response, path) {
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
        timestamp: expect.any(String),
        status: 404,
        error: 'Not Found',
        message: 'Student with id 1 not found',
        path
    });
    expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
}

describe('Student controller HTTP integration', () => {
    describe('POST /student', () => {
        it('returns 204 when a student is created', async () => {
            mockService.addStudent.mockResolvedValue(true);

            const response = await request(app).post('/student').send(validStudent);

            expect(response.status).toBe(204);
            expect(response.text).toBe('');
            expect(mockService.addStudent).toHaveBeenCalledTimes(1);
            expect(mockService.addStudent).toHaveBeenCalledWith(validStudent);
        });

        it('returns 409 when the student already exists', async () => {
            mockService.addStudent.mockResolvedValue(false);

            const response = await request(app).post('/student').send(validStudent);

            expect(response.status).toBe(409);
            expect(response.text).toBe('');
            expect(mockService.addStudent).toHaveBeenCalledTimes(1);
            expect(mockService.addStudent).toHaveBeenCalledWith(validStudent);
        });

        it('accepts a numeric string ID and passes the original body to the service', async () => {
            mockService.addStudent.mockResolvedValue(true);
            const body = {...validStudent, id: '1'};

            const response = await request(app).post('/student').send(body);

            expect(response.status).toBe(204);
            expect(mockService.addStudent).toHaveBeenCalledWith(body);
        });
    });

    describe.each([
        ['GET', 'get', 'findStudent'],
        ['DELETE', 'delete', 'deleteStudent']
    ])('%s /student/:id', (_label, method, serviceMethod) => {
        it('returns the student as JSON', async () => {
            const student = {id: 1, name: 'John', scores: {Math: 95}};
            mockService[serviceMethod].mockResolvedValue(student);

            const response = await request(app)[method]('/student/1');

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.body).toEqual(student);
            expect(mockService[serviceMethod]).toHaveBeenCalledTimes(1);
            expect(mockService[serviceMethod]).toHaveBeenCalledWith('1');
        });

        it('returns a structured 404 when the student is missing', async () => {
            mockService[serviceMethod].mockResolvedValue(null);

            const response = await request(app)[method]('/student/1');

            expectNotFound(response, '/student/1');
            expect(mockService[serviceMethod]).toHaveBeenCalledWith('1');
        });
    });

    describe('PATCH /student/:id', () => {
        it.each([
            {name: 'Jane'},
            {password: 'new-secret'},
            {name: 'Jane', password: 'new-secret'},
            {} // The current schema allows an empty update.
        ])('accepts the update %j', async (body) => {
            const updatedStudent = {...validStudent, ...body};
            mockService.updateStudent.mockResolvedValue(updatedStudent);

            const response = await request(app).patch('/student/1').send(body);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(updatedStudent);
            expect(mockService.updateStudent).toHaveBeenCalledTimes(1);
            expect(mockService.updateStudent).toHaveBeenCalledWith('1', body);
        });

        it('returns a structured 404 when the student is missing', async () => {
            mockService.updateStudent.mockResolvedValue(undefined);

            const response = await request(app).patch('/student/1').send({name: 'Jane'});

            expectNotFound(response, '/student/1');
            expect(mockService.updateStudent).toHaveBeenCalledWith('1', {name: 'Jane'});
        });
    });

    describe('PATCH /score/student/:id', () => {
        it.each([0, 95, 100, '95'])('accepts score %j and returns 204', async (score) => {
            mockService.addScore.mockResolvedValue({id: 1, scores: {Math: Number(score)}});

            const response = await request(app).patch('/score/student/1')
                .send({examName: 'Math', score});

            expect(response.status).toBe(204);
            expect(response.text).toBe('');
            expect(mockService.addScore).toHaveBeenCalledTimes(1);
            expect(mockService.addScore).toHaveBeenCalledWith('1', 'Math', score);
        });

        it('returns a structured 404 when the student is missing', async () => {
            mockService.addScore.mockResolvedValue(null);

            const response = await request(app).patch('/score/student/1')
                .send({examName: 'Math', score: 95});

            expectNotFound(response, '/score/student/1');
            expect(mockService.addScore).toHaveBeenCalledWith('1', 'Math', 95);
        });
    });

    describe('Search endpoints', () => {
        it.each([
            ['matching students', [{id: 1, name: 'John Doe'}]],
            ['an empty list', []]
        ])('returns %s when searching by name', async (_label, students) => {
            mockService.findStudentsByName.mockResolvedValue(students);

            const response = await request(app).get('/students/name/John%20Doe');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(students);
            expect(mockService.findStudentsByName).toHaveBeenCalledTimes(1);
            expect(mockService.findStudentsByName).toHaveBeenCalledWith('John Doe');
        });

        it.each([
            ['one name', {names: 'John'}, 'John', 1],
            ['multiple names', {names: ['John', 'Jane']}, ['John', 'Jane'], 2],
            ['no matches', {names: 'Missing'}, 'Missing', 0]
        ])('returns a JSON count for %s', async (_label, query, names, count) => {
            mockService.countStudentsByNames.mockResolvedValue(count);

            const response = await request(app).get('/quantity/students').query(query);

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.body).toBe(count);
            expect(mockService.countStudentsByNames).toHaveBeenCalledTimes(1);
            expect(mockService.countStudentsByNames).toHaveBeenCalledWith(names);
        });

        it.each([
            ['matching students', [{id: 1, scores: {Math: 95}}]],
            ['an empty list', []]
        ])('returns %s when searching by minimum score', async (_label, students) => {
            mockService.findStudentsByMinScore.mockResolvedValue(students);

            const response = await request(app).get('/students/exam/Math/minscore/80');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(students);
            expect(mockService.findStudentsByMinScore).toHaveBeenCalledTimes(1);
            expect(mockService.findStudentsByMinScore).toHaveBeenCalledWith('Math', '80');
        });
    });

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
        ['PATCH /score/student/:id', 'patch', '/score/student/1', {examName: 'Math', score: 95}, [
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
            const body = {...validBody, [field]: value};

            const response = await request(app)[method](path).send(body);

            expect(response.status).toBe(400);
            expect(response.text).toBe(message);
            expectNoServiceCalls();
        });

        it('rejects an array body with 400', async () => {
            const response = await request(app)[method](path).send([]);

            expect(response.status).toBe(400);
            expect(response.text).toBe('"value" must be of type object');
            expectNoServiceCalls();
        });

        it('rejects malformed JSON with 400 before calling the service', async () => {
            const response = await request(app)[method](path)
                .set('Content-Type', 'application/json').send('{');

            expect(response.status).toBe(400);
            expectNoServiceCalls();
        });
    });

    describe('Service failures', () => {
        it.each([
            ['post', '/student', 'addStudent', validStudent],
            ['get', '/student/1', 'findStudent', undefined],
            ['delete', '/student/1', 'deleteStudent', undefined],
            ['patch', '/student/1', 'updateStudent', {name: 'Jane'}],
            ['patch', '/score/student/1', 'addScore', {examName: 'Math', score: 95}],
            ['get', '/students/name/John', 'findStudentsByName', undefined],
            ['get', '/quantity/students?names=John', 'countStudentsByNames', undefined],
            ['get', '/students/exam/Math/minscore/80', 'findStudentsByMinScore', undefined]
        ])('%s %s returns 500 when %s rejects', async (method, path, serviceMethod, body) => {
            mockService[serviceMethod].mockRejectedValue(new Error('Service unavailable'));

            const httpRequest = request(app)[method](path);
            const response = await (body === undefined ? httpRequest : httpRequest.send(body));

            expect(response.status).toBe(500);
            expect(mockService[serviceMethod]).toHaveBeenCalledTimes(1);
        });
    });
});