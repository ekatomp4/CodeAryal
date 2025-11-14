

const chartContainer = document.getElementById("chart-container");
const chart = new FinanceChart(chartContainer);

async function fetchStock() {
    try {
        fetch(`http://localhost:31198/api/stock/AAPL?range=1wk&interval=1d`, {
            headers: {
                session: window.getSession(),
            },
        })
            .then((response) => response.json())
            .then((data) => {
                console.log(data);
                chart.setData(data);
            })
            .catch((error) => console.error("Error:", error.message));
    } catch (error) {
        console.error("Error:", error.message);
    }
}

fetchStock();