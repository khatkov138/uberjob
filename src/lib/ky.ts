import ky from "ky"

const kyInstance = ky.create({
    parseJson: (text) =>
        JSON.parse(text, (key, value) => {
            if (key.endsWith("At")) return new Date(value);
            return value;
        }),
    //prefixUrl: "http://localhost:3000",
   
    
 
})

export default kyInstance;