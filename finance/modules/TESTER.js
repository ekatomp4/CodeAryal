import axios from "axios";

class TESTER {
    static port = 31198;
    static URL = `http://localhost:${this.port}`;

    static session = "";

    static async test() {
        // get session ( goes in furture headers )
        await axios.get(`${this.URL}/newSession`).then((res) => {
            this.session = res.data;
            console.log(this.session);
        });

        // send request for stock data, with session
        await axios.get(`${this.URL}/stock/MSFT`, {
            headers: {
                "session": this.session
            }
        }).then((res) => {
            console.log(JSON.stringify(res.data));
        });

    }
}

export default TESTER;