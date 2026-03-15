
const productsContainer = document.getElementById("products")
const cartCount = document.getElementById("cartCount")

let cart=0

const products=[

{
name:"سماعات لاسلكية",
price:149,
image:"https://images.unsplash.com/photo-1518441902117-8a0b3b5e1d8b"
},

{
name:"ساعة ذكية",
price:599,
image:"https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b"
},

{
name:"ماوس ألعاب",
price:299,
image:"https://images.unsplash.com/photo-1587829741301-dc798b83add3"
},

{
name:"زجاجة مياه",
price:45,
image:"https://images.unsplash.com/photo-1602143407151-7111542de6e8"
}

]

function renderProducts(){

productsContainer.innerHTML=""

products.forEach(p=>{

productsContainer.innerHTML+=`

<div class="product">

<img src="${p.image}">

<h3>${p.name}</h3>

<div class="price">${p.price} ر.س</div>

<button onclick="addToCart()">أضف للطلب</button>

</div>

`

})

}

function addToCart(){

cart++
cartCount.textContent=cart

}

renderProducts()
