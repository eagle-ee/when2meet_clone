document.addEventListener("DOMContentLoaded", function() {
    const menuIcon = document.getElementById("menuIcon");
    const navbarButtons = document.getElementById("navbarButtons");

    function updateNavbar(){
        if(window.innerWidth <= 650){
            navMenu.style.display = "none";
            menuIcon.style.display = "flex";
        }
        else {
            navMenu.style.display = "flex";
            menuIcon.style.display = "none";
        }
    }

    updateNavbar();

    window.addEventListener("resize", updateNavbar);

    menuIcon.addEventListener("click", function () {
        event.stopPropagation();
        if (navMenu.style.display === "none" || navMenu.style.display === "") {
            navMenu.style.display = "flex";
            navMenu.style.flexDirection = "column";
            navMenu.style.position = "absolute";
            navMenu.style.top = "50px";
            navMenu.style.right = "10px";
            navMenu.style.backgroundColor = "#ccc";
            navMenu.style.padding = "10px";
            navMenu.style.border = "1px solid black";
            navMenu.style.boxShadow = "2px 2px 5px rgba(0, 0, 0, 0.2)";
        } else {
            navMenu.style.display = "none";
        }
    });

    document.addEventListener("click", function (event) {
        if(window.innerWidth <= 650){
            if (navMenu.style.display === "flex" && event.target !== menuIcon && !navMenu.contains(event.target)) {
                navMenu.style.display = "none";
            }
        }
    });
});