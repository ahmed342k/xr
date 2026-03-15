
const themeBtn = document.getElementById("themeBtn");

themeBtn.onclick = () => {

document.body.classList.toggle("dark");

if(document.body.classList.contains("dark")){
themeBtn.textContent="🌙"
}else{
themeBtn.textContent="☀"
}

}
