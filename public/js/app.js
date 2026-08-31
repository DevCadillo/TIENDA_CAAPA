const stockModal = document.getElementById('stockModal');
if (stockModal) {
  stockModal.addEventListener('show.bs.modal', event => {
    const b = event.relatedTarget;
    document.getElementById('stockForm').action = `/productos/${b.dataset.id}/stock`;
    document.getElementById('stockProduct').textContent = b.dataset.name;
  });
}
const chart = document.getElementById('categoryChart');
if (chart && window.Chart) {
  new Chart(chart, { type:'bar', data:{ labels:JSON.parse(chart.dataset.labels||'[]'), datasets:[{label:'Unidades',data:JSON.parse(chart.dataset.values||'[]')}] }, options:{responsive:true,plugins:{legend:{display:false}}} });
}
