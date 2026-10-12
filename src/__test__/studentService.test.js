import {jest, beforeEach, describe, it, expect} from '@jest/globals'


const mockRepo = {
    createStudent: jest.fn(),
    findStudentById: jest.fn(),
    deleteStudentById: jest.fn(),
    updateStudent: jest.fn(),
    findStudentsByName: jest.fn(),
    countStudentsByNames: jest.fn(),
    findStudentsByMinScore: jest.fn()
}

jest.unstable_mockModule("../repository/studentRepository.js", () => mockRepo)

const studentService = await import("../service/studentService.js")

beforeEach(() => {
    jest.clearAllMocks()
})

describe('Student Service', () => {
    it('addStudent returns false when student already exists', async () => {
        //Arrange
        mockRepo.findStudentById.mockResolvedValue({id: 1});
        //Act
        const result = await studentService.addStudent({
            id: 1,
            name: 'John',
            password: 'secret'
        })
        //Assert
        expect(result).toBeFalsy();
        expect(mockRepo.createStudent).not.toHaveBeenCalled();
        expect(mockRepo.findStudentById).toHaveBeenCalledWith(1);
    })
    it('addStudent returns true when student does not exists', async () => {
        //Arrange
        mockRepo.findStudentById.mockResolvedValue(null);
        //Act
        const result = await studentService.addStudent({
            id: 2,
            name: 'John',
            password: 'secret'
        })
        //Assert
        expect(result).toBeTruthy();
        expect(mockRepo.createStudent).toHaveBeenCalledWith({
            _id: 2,
            name: 'John',
            password: 'secret'
        });
        expect(mockRepo.findStudentById).toHaveBeenCalledWith(2);
    })
    it('findStudent returns student when he exists', async () => {
        //Arrange
        const student = {
            id: 1, name: 'John', password: 'secret'
        }
        mockRepo.findStudentById.mockResolvedValue(student);
        //Act
        const result = await studentService.findStudent(1)
        //Assert
        expect(result).toEqual(student);
        expect(mockRepo.findStudentById).toHaveBeenCalledWith(1);
    })
    it('findStudent returns false when student doesnt exists', async () => {
        //Arrange
        mockRepo.findStudentById.mockResolvedValue(null);
        //Act
        const result = await studentService.findStudent(2)
        //Assert
        expect(result).toBeFalsy();
        expect(mockRepo.findStudentById).toHaveBeenCalledWith(2);
    })
    it('deleteStudent returns removed students id, name, scores', async () => {
        //Arrange
        const student = {
            id: 3, name: 'John', password: 'secret'
        }
        mockRepo.deleteStudentById.mockResolvedValue(student);
        //Act
        const result = await studentService.deleteStudent(3)
        //Assert
        expect(result).toEqual(student);
        expect(mockRepo.deleteStudentById).toHaveBeenCalledWith(3);
    })
    it('deleteStudent returns false when student doesnt exists', async () => {
        //Arrange
        mockRepo.deleteStudentById.mockResolvedValue(null);
        //Act
        const result = await studentService.deleteStudent(3)
        //Assert
        expect(result).toBeFalsy();
        expect(mockRepo.deleteStudentById).toHaveBeenCalledWith(3);
    })
    it('updateStudent returns updated student without scores', async () => {
        // Arrange
        const toObject = jest.fn().mockResolvedValue({
            id: 3,
            name: 'John',
            password: 'secret'
        })
        mockRepo.updateStudent.mockResolvedValue({toObject})
        // Act
        const result = await studentService.updateStudent(3, {name: 'John'});
        // Assert
        expect(result).toEqual({
            id: 3,
            name: 'John',
            password: 'secret'
        })
        expect(toObject).toHaveBeenCalled();
    })
    it('updateStudent returns undefined when student does not exists', async () => {
        mockRepo.updateStudent.mockResolvedValue(null);
        const result = await studentService.updateStudent(3, {name: 'John'});
        expect(result).toBeUndefined();
    })
    it('addScore delegates to repository', async () => {
        const updated = {id: 1}
        mockRepo.updateStudent.mockResolvedValue(updated);
        const result = await studentService.addScore(1, 'Math', 95)
        expect(result).toEqual(updated);
        expect(mockRepo.updateStudent).toHaveBeenCalledWith(1, {'scores.Math': 95})
    })
    it('findStudentsByName delegates to repository', async () => {
        const list = [{id: 1, name: 'Eva'}]
        mockRepo.findStudentsByName.mockResolvedValue(list);
        const result = await studentService.findStudentsByName('Eva');
        expect(result).toEqual(list);
        expect(mockRepo.findStudentsByName).toHaveBeenCalledWith('Eva');
    })
    it('countStudentsByNames delegates to repository', async () => {
        mockRepo.countStudentsByNames.mockResolvedValue(2);
        const result = await studentService.countStudentsByNames('Eva');
        expect(result).toBe(2);
        expect(mockRepo.countStudentsByNames).toHaveBeenCalledWith(['Eva']);
    })
    it('findStudentsByMinScore delegates to repository', async () => {
        const list = [{id:1, scores: {Math: 90}}];
        mockRepo.findStudentsByMinScore.mockResolvedValue(list);
        const result = await studentService.findStudentsByMinScore('Math', 80);
        expect(result).toEqual(list);
        expect(mockRepo.findStudentsByMinScore).toHaveBeenCalledWith('Math', 80);
    })

})