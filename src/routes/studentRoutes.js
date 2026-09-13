import { Router } from "express";
import {addStudent, findStudent}  from "../controller/studentController.js";


const router = Router();

router.post('/student', addStudent);
router.get('/student/:id', findStudent);

// TODO: Homework implement other routes

export default router;

