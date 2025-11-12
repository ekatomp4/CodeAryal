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
            <h1 class="title">Finance App</h1>
            <div class="itemlist"></div>
        </div>
    `;
    sidebarElement.innerHTML = sidebarHTML;
    document.body.insertBefore(sidebarElement, document.body.firstChild);

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
        { name: "Logout", onclick: function() {
            // clear session and reroute to home
            sessionStorage.removeItem("session");
            window.location.href = "/";
        }}
    ];
    linkList.forEach(link => addSidebarButton(link.name, link.path, link.onclick));
});