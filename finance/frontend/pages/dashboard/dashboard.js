

const chartContainer = document.getElementById("chart-container");
const chart = new FinanceChart(chartContainer);


const inputTicker = document.getElementById("ticker-input");
const inputRange = document.getElementById("range-input");
const inputInterval = document.getElementById("interval-input");
const btnSubmit = document.getElementById("submit-btn");

btnSubmit.addEventListener("click", () => fetchStock());

async function fetchStock() {
    try {
        fetch(`http://localhost:31198/api/stock/${inputTicker.value}?range=${inputRange.value}&interval=${inputInterval.value}`, {
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

async function search() {
    const query = "test";
    fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${query}&lang=en-US&region=US&quotesCount=6&newsCount=3&listsCount=2&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query&multiQuoteQueryId=multi_quote_single_token_query&newsQueryId=news_cie_vespa&enableCb=false&enableNavLinks=true&enableEnhancedTrivialQuery=true&enableResearchReports=true&enableCulturalAssets=true&enableLogoUrl=true&enableLists=false&recommendCount=5&enableCccBoost=true&enablePrivateCompany=true`)
        .then((response) => response.json())
        .then((data) => {
            console.log(data);
        })
}

search();