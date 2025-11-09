class Schema {

    // static methods
    static parseToFile(schema) {
        // returns string
    }

    static parseToSchema(schema) {
        // returns object
    }

    // instance methods
    constructor(schema = {}) {
        this.schema = schema;
    }

    isValid() {
        // check if it follows syntax
        for(const key in this.schema) {
            if(typeof this.schema[key] !== "object") return false;
        }
    }


}

// syntax
// const schema = new Schema({
//     name: {
//         type: String,
//         required: true, 
//     },
//     age: {
//         type: Number,
//         required: true,
//         min: 0
//     }
// });
// type, required, min, max, unique, default
// type = string, number, boolean, object, array, reference (needs referenceID)
export default Schema;