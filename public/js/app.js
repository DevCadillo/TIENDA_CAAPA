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


document.addEventListener('DOMContentLoaded', () => {

    const table = document.getElementById('productsTable');

    if (!table) {
        return;
    }

    const searchInput =
        document.getElementById('productSearch');

    const categoryFilter =
        document.getElementById('categoryFilter');

    const rows = Array.from(
        table.querySelectorAll('tbody tr')
    );

    /*
     * Columnas esperadas:
     *
     * 0 Imagen
     * 1 Número
     * 2 Producto
     * 3 Categoría
     * 4 Stock
     * 5 Precio mayor
     * 6 Precio unitario
     */

    if (categoryFilter) {

        const categories = new Set();

        rows.forEach(row => {

            const cells = row.querySelectorAll('td');

            if (cells.length > 3) {

                const category =
                    cells[3].textContent.trim();

                if (category) {
                    categories.add(category);
                }
            }

        });

        Array.from(categories)
            .sort()
            .forEach(category => {

                const option =
                    document.createElement('option');

                option.value =
                    category.toLowerCase();

                option.textContent =
                    category;

                categoryFilter.appendChild(option);

            });
    }


    function filterProducts() {

        const search =
            searchInput
                ? searchInput.value
                    .trim()
                    .toLowerCase()
                : '';

        const category =
            categoryFilter
                ? categoryFilter.value
                : '';


        rows.forEach(row => {

            const cells =
                row.querySelectorAll('td');

            if (!cells.length) {
                return;
            }


            const number =
                cells[1]?.textContent
                    .toLowerCase() || '';

            const product =
                cells[2]?.textContent
                    .toLowerCase() || '';

            const rowCategory =
                cells[3]?.textContent
                    .trim()
                    .toLowerCase() || '';


            const matchesSearch =
                number.includes(search) ||
                product.includes(search);


            const matchesCategory =
                !category ||
                rowCategory === category;


            row.style.display =
                matchesSearch && matchesCategory
                    ? ''
                    : 'none';

        });

    }


    if (searchInput) {

        searchInput.addEventListener(
            'input',
            filterProducts
        );

    }


    if (categoryFilter) {

        categoryFilter.addEventListener(
            'change',
            filterProducts
        );

    }

});