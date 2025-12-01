// all.js

// sidebar

// TODO COLLAPSABLE AND MOBILE FRIENDLY
const sidebarElement = document.createElement("div");

function addSidebarButton(name, path, onclick) {
    const itemList = sidebarElement.querySelector(".itemlist");
    const newItem = document.createElement("div");
    newItem.className = "item";
    newItem.id = name.toLowerCase() + "-nav";
    newItem.textContent = name;
    itemList.appendChild(newItem);

    if(onclick) {
        newItem.addEventListener("click", onclick);
    } else {
        newItem.addEventListener("click", () => {
            if(path === window.location.pathname) return;
            window.location.href = path;
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const noSidebarPages = ["/unauthorized"];
    if (noSidebarPages.includes(window.location.pathname)) return;

    const sidebarHTML = `
        <div class="sidebar">
            <div class="header">
                <h1 class="title">Finance App</h1>
            </div>
            <div class="itemlist"></div>
        </div>
        <button class="sidebar-toggle">☰</button>
    `;
    sidebarElement.innerHTML = sidebarHTML;
    sidebarElement.setAttribute("id", "sidebar-container");
    document.body.insertBefore(sidebarElement, document.body.firstChild);

    // Toggle button logic
    const toggleBtn = sidebarElement.querySelector(".sidebar-toggle");
    const titleDiv = sidebarElement.querySelector(".header");
    toggleBtn.addEventListener("click", () => {
        sidebarElement.children[0].classList.toggle("collapsed");
    });

    const linkList = [
        { name: "Home", path: "/" },
        { name: "Login", path: "/login" }
    ];
    linkList.forEach(link => addSidebarButton(link.name, link.path));
});



window.addEventListener('sessionValid', () => {
    // remove login button and replace with logout
    const itemList = sidebarElement.querySelector(".itemlist");
    const loginButton = itemList.querySelector("#login-nav");
    if (loginButton) itemList.removeChild(loginButton);

    // add any other session-dependent sidebar items here
    const linkList = [
        { name: "Dashboard", path: "/dashboard" },
        { name: "Wallet", path: "/wallet" },
        { name: "Logout", onclick: function() {
            // clear session and reroute to home
            sessionStorage.removeItem("session");
            window.location.href = "/";
        }},
        { name: "Admin", path: `/admin?session=${window.getSession()}` }
    ];
    linkList.forEach(link => addSidebarButton(link.name, link.path, link.onclick));
});


const User = {
    keys: {}
}

window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        sidebarElement.querySelector(".sidebar-toggle").click();
    }
    User.keys[e.key] = true;
});
window.addEventListener("keyup", (e) => {
    User.keys[e.key] = false;
});

const keystrokes = {
    "quickLogin": {
        keys: ["q", "l"],
        fn: ()=>{
            const savedUser = JSON.parse(localStorage.getItem("savedCreds"));
            if(!savedUser.name || !savedUser.password) return;
            fetch("http://localhost:31198/api/login?name=" + savedUser.name + "&password=" + savedUser.password, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                }
            }).then(response => response.json())
            .then(data => {
                const sessionUUID = data.session;
                sessionStorage.setItem("session", sessionUUID);
                console.log("Logged in with session:", sessionUUID);

                if(sessionUUID) {
                    window.routeTo("/");
                }
            })
            .catch(error => console.error("Error:", error.message));
        }
    }
}
setInterval(() => {
    for (const keystroke in keystrokes) {
        if (keystrokes[keystroke].keys.every(key => User.keys[key])) {
            keystrokes[keystroke].fn();
        }
    }
}, 100);
