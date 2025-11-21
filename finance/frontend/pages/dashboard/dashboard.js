

const chartContainer = document.getElementById("chart-container");
const chart = new FinanceChart(chartContainer);


const inputTicker = document.getElementById("ticker-input");
const inputRange = document.getElementById("range-input");
const inputInterval = document.getElementById("interval-input");
const typeSelect = document.getElementById("type-select");
const btnSubmit = document.getElementById("submit-btn");

btnSubmit.addEventListener("click", () => fetchStock());

async function fetchStock() {
  const type = typeSelect.value;
  let start = "";
  if(type == "stock") {
    start = "stock";
  } else if(type == "solana") {
    start = "crypto/solana";
  }

  const inputValue = inputTicker.value.trim().replace(/[_\s]+/g, '-');
  inputTicker.value = inputValue;

  try {
    fetch(`http://localhost:31198/api/${start}/${inputValue}?range=${inputRange.value}&interval=${inputInterval.value}`, {
      headers: {
        session: window.getSession(),
      },
    })
      .then((response) => response.json())
      .then((data) => {

        console.log(data);

        if(data.error) {
          throw new Error(data.error);
          return;
        }

        if(type === "stock") {
          chart.setData(data);
        }

      })
      .catch((error) => console.error("Error:", error.message));
  } catch (error) {
    console.error("Error:", error.message);
  }
}

fetchStock();

// async function search() {
//     const query = "test";
//     fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${query}&lang=en-US&region=US&quotesCount=6&newsCount=3&listsCount=2&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query&multiQuoteQueryId=multi_quote_single_token_query&newsQueryId=news_cie_vespa&enableCb=false&enableNavLinks=true&enableEnhancedTrivialQuery=true&enableResearchReports=true&enableCulturalAssets=true&enableLogoUrl=true&enableLists=false&recommendCount=5&enableCccBoost=true&enablePrivateCompany=true`)
//         .then((response) => response.json())
//         .then((data) => {
//             console.log(data);
//         })
// }

// search();


// TODO ALLOW FOR MULTIPLE COLORS AND FUNCTIONS PER INDICATOR
const box = document.getElementById("indicator-box");
const checks = document.getElementById("indicator-checks");

for(let i=0; i<checks.children.length; i++) {
  const input = checks.children[i].querySelector("input[type=checkbox]");
  if(!input) continue;
  input.addEventListener("change", () => {
    updateIndicators();
  });
  // const colorInput = checks.children[i].querySelector("input[type=color]");
  // if(!colorInput) continue;
  // colorInput.addEventListener("change", () => {
  //   updateIndicators();
  // });
}

box.addEventListener("click", () => {
  checks.style.display = checks.style.display === "block" ? "none" : "block";
});

document.addEventListener("click", (e) => {
  if (!box.contains(e.target) && !checks.contains(e.target)) {
    checks.style.display = "none";
  }
});

function getSelectedIndicators() {
  const out = [];
  checks.querySelectorAll("input[type=checkbox]:checked")
    .forEach(cb => out.push(cb.value));
  return out;
}

function updateIndicators() {
  const indicatorList = {
    "ema20": {
      name: "ema",
      period: 20,
    },
    "ema50": {
      name: "ema",
      period: 50,
    },
    "ema100": {
      name: "ema",
      period: 100,
    },
    "ema200": {
      name: "ema",
      period: 200,
    },
  }


  const activeIndicators = [];

  for (const ind of getSelectedIndicators()) {
    activeIndicators.push(indicatorList[ind]);
    const color = document.getElementById(`color-input-${ind}`).value;
    chart.setIndicatorColor(indicatorList[ind].name, color);
  }
  chart.setIndicators(activeIndicators);
}

document.getElementById("submit-btn").addEventListener("click", () => {
  updateIndicators();
});



// fetch /api/app/solana/getbalance
// fetch("http://localhost:31198/api/app/solana/getbalance", {
//   headers: {
//     session: window.getSession(),
//   },
// })
//   .then((response) => response.json())
//   .then((data) => {
//     console.log(data);
//   })
//   .catch((error) => console.error("Error:", error.message));