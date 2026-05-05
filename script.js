function compareCars() {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = `
    <div class="card">
      <h3>BMW M3</h3>
      <p>المحرك: 3.0 لتر، 6 سلندر، Twin Turbo</p>
      <p>القوة: 480 حصان</p>
      <p>التسارع 0-100 كم/س: 4.2 ثانية</p>
      <p>السرعة القصوى: 250 كم/س</p>
    </div>
    <div class="card">
      <h3>BMW X5</h3>
      <p>المحرك: 3.0 لتر، 6 سلندر، Turbo + Hybrid</p>
      <p>القوة: 375 حصان</p>
      <p>التسارع 0-100 كم/س: 5.2 ثانية</p>
      <p>السرعة القصوى: 250 كم/س</p>
    </div>
  `;
}
