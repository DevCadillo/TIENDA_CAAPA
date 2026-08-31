// =====================================================
// TIENDA CAAPA - JavaScript general
// =====================================================


// =====================================================
// MODAL DE STOCK
// =====================================================

const stockModal = document.getElementById('stockModal');

if (stockModal) {

    stockModal.addEventListener('show.bs.modal', event => {

        const button = event.relatedTarget;

        const stockForm =
            document.getElementById('stockForm');

        const stockProduct =
            document.getElementById('stockProduct');


        if (stockForm && button) {

            stockForm.action =
                `/productos/${button.dataset.id}/stock`;

        }


        if (stockProduct && button) {

            stockProduct.textContent =
                button.dataset.name;

        }

    });

}



// =====================================================
// GRÁFICO DEL DASHBOARD
// =====================================================

const chart =
    document.getElementById('categoryChart');

if (chart && window.Chart) {

    new Chart(chart, {

        type: 'bar',

        data: {

            labels:
                JSON.parse(
                    chart.dataset.labels || '[]'
                ),

            datasets: [
                {
                    label: 'Unidades',

                    data:
                        JSON.parse(
                            chart.dataset.values || '[]'
                        )
                }
            ]

        },

        options: {

            responsive: true,

            plugins: {

                legend: {
                    display: false
                }

            }

        }

    });

}



// =====================================================
// BUSCADOR Y FILTRO DE PRODUCTOS
// =====================================================

document.addEventListener(
    'DOMContentLoaded',
    function () {

        const table =
            document.getElementById('productsTable');

        const searchInput =
            document.getElementById('searchInput');

        const categoryFilter =
            document.getElementById('categoryFilter');


        // Si no estamos en la página de productos,
        // simplemente no hacemos nada.
        if (!table) {
            return;
        }


        const rows =
            Array.from(
                table.querySelectorAll(
                    'tbody .product-row'
                )
            );



        // =================================================
        // CARGAR AUTOMÁTICAMENTE LAS CATEGORÍAS
        // =================================================

        if (categoryFilter) {

            const categories = new Set();


            rows.forEach(row => {

                const categoryElement =
                    row.querySelector(
                        '.product-category'
                    );


                if (!categoryElement) {
                    return;
                }


                const category =
                    categoryElement
                        .textContent
                        .trim();


                if (
                    category &&
                    category !== '-'
                ) {

                    categories.add(category);

                }

            });


            Array.from(categories)
                .sort((a, b) =>
                    a.localeCompare(b)
                )
                .forEach(category => {

                    const option =
                        document.createElement(
                            'option'
                        );

                    option.value =
                        category.toLowerCase();

                    option.textContent =
                        category;

                    categoryFilter.appendChild(
                        option
                    );

                });

        }



        // =================================================
        // FUNCIÓN PRINCIPAL DE FILTRADO
        // =================================================

        function filterProducts() {

            const search =
                searchInput
                    ? searchInput
                        .value
                        .trim()
                        .toLowerCase()
                    : '';


            const selectedCategory =
                categoryFilter
                    ? categoryFilter
                        .value
                        .trim()
                        .toLowerCase()
                    : '';


            rows.forEach(row => {

                const productName =
                    row.querySelector(
                        '.product-name'
                    )
                    ?.textContent
                    .trim()
                    .toLowerCase() || '';


                const productNumber =
                    row.querySelector(
                        '.product-number'
                    )
                    ?.textContent
                    .trim()
                    .toLowerCase() || '';


                const productCategory =
                    row.querySelector(
                        '.product-category'
                    )
                    ?.textContent
                    .trim()
                    .toLowerCase() || '';



                // Coincidencia de búsqueda
                const matchesSearch =

                    productName.includes(search) ||

                    productNumber.includes(search);



                // Coincidencia de categoría
                const matchesCategory =

                    selectedCategory === '' ||

                    productCategory ===
                    selectedCategory;



                // Mostrar u ocultar fila
                if (
                    matchesSearch &&
                    matchesCategory
                ) {

                    row.style.display = '';

                } else {

                    row.style.display = 'none';

                }

            });

        }



        // =================================================
        // BUSCAR AUTOMÁTICAMENTE AL ESCRIBIR
        // =================================================

        if (searchInput) {

            searchInput.addEventListener(
                'input',
                filterProducts
            );

        }



        // =================================================
        // FILTRAR CUANDO CAMBIA LA CATEGORÍA
        // =================================================

        if (categoryFilter) {

            categoryFilter.addEventListener(
                'change',
                filterProducts
            );

        }



        // =================================================
        // HACER LA FUNCIÓN DISPONIBLE PARA EL BOTÓN
        // =================================================

        window.filterProducts =
            filterProducts;



        // Aplicar filtro inicial
        filterProducts();

    }
);