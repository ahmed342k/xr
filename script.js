async function getCarData(model) {
  const apiKey = "ضع مفتاح API هنا"; 
  const response = await fetch(`https://api.api-ninjas.com/v1/cars?make=bmw&model=${model}`, {
    headers: { 'X-Api-Key': apiKey }
  });
  const data = await response.json();
  return data[0]; // أول نتيجة
}

async function compareCars() {
  const car1Model = document.getElementById("car1").value;
  const car2Model = document.getElementById("car2").value;

  const car1 = await getCarData(car1Model);
  const car2 = await getCarData(car2Model);

  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = `
    <div class="card">
      <h3>${car1.make} ${car1.model}</h3>
      <p>السنة: ${car1.year}</p>
      <p>المحرك: ${car1.engine}</p>
      <p>القوة: ${car1.horsepower} حصان</p>
    </div>
    <div class="card">
      <h3>${car2.make} ${car2.model}</h3>
      <p>السنة: ${car2.year}</p>
      <p>المحرك: ${car2.engine}</p>
      <p>القوة: ${car2.horsepower} حصان</p>
    </div>
  `;
}
