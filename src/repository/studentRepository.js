let collection
export const init = db => collection = db.collection('college')

export const createStudent = async ({id, name, password}) => {
    const existingStudent = await collection.findOne({_id: id});
    if(existingStudent) {
        return false;
    }
    await collection.insertOne({_id: id, name, password, scores:{}});
    return true;
}

export const findStudentById = async id => await collection.findOne({_id:id},  {projection: {password: 0}})

export const deleteStudentById = async id => await collection.findOneAndDelete({_id:id}, {projection: {password:0}});

export const updateStudent = async (id, data) => await collection.findOneAndUpdate({_id: id}, {$set: data},  {projection: {scores:0}, returnDocument: 'after'});

export const findStudentsByName = async name => {
    const students = []
    const cursor =  await collection.find({name: {$regex: `^${name}$`, $options: 'i'}},
       {projection: {password: 0}});
   while (await cursor.hasNext()) {
       const student = await cursor.next();
       students.push(student);
   }
   return students;
}


export const countStudentsByNames = async names  => {
    const res = names.map(name => new RegExp(`^${name}$`, 'i'));
    return await collection.countDocuments({name: {$in: res}})

}

export const findStudentsByMinScore = async (exam, minScore) => {
    const students = []
    const cursor = await collection.find({[`scores.${exam}`]: {$gte: minScore}},
        {projection: {password: 0}});
    for await (const student of cursor) {
        students.push(student);
    }
    return students;
}