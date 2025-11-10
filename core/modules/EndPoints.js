const EndPoints = {
    "stat": {
        "method": "get",
        "path": "/stat",
        "handler": (req, res) => {
            return "hi";
        }
    }
}

export default EndPoints;