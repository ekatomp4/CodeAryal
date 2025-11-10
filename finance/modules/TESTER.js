import axios from "axios";

import dotenv from "dotenv";
dotenv.config({ path: "./cred.env" });


const TESTER_CREDENTIALS = {
  username: process.env.TESTER_USERNAME,
  password: process.env.TESTER_PASSWORD
};

class TESTER {
    static port = 31198;
    static URL = `http://localhost:${this.port}`;

    static session = "";


    static async test() {
        console.log(TESTER_CREDENTIALS);
        // get session ( goes in furture headers )
        await axios.get(`${this.URL}/getSession?name=${TESTER_CREDENTIALS.username}&password=${TESTER_CREDENTIALS.password}`).then((res) => {
            this.session = res.data;
            console.log(this.session);
        });

        // send request for stock data, with session
        // await axios.get(`${this.URL}/stock/PAPER`, {
        //     headers: {
        //         "session": this.session
        //     }
        // }).then((res) => {
        //     console.log(JSON.stringify(res.data));
        // });

        // send request for app
        await axios.get(`${this.URL}/app/paper/getBalance`, {
            headers: {
                "session": this.session
            }
        }).then((res) => {
            console.log(JSON.stringify(res.data));
        }).catch((err) => {
            console.log(err);
        });

    }
}

export default TESTER;


