import { validateJSON } from '../src/validator.mts';
interface User {
    name: string;
    age: number;
}

// Usage examples:
const UserExample: User = {
    name: "",
    age: 0
}

// Valid JSON
const validJSON = '{"name": "John", "age": 30}';
const validResult = validateJSON<User>(validJSON, UserExample);
console.log('Valid JSON:', validResult);

// Invalid JSON
const invalidJSON = '{"name": "John", "age": }';
const invalidResult = validateJSON<User>(invalidJSON, UserExample);
console.log('Invalid JSON:', invalidResult);

// Empty object
const emptyJSON = '{}';
const emptyResult = validateJSON<User>(emptyJSON, UserExample);
console.log('Empty JSON:', emptyResult,);

// Empty array
const emptyArrayJSON = '[]';
const emptyArrayResult = validateJSON<User[]>(emptyArrayJSON, [UserExample]);
console.log('Empty array JSON:', emptyArrayResult);