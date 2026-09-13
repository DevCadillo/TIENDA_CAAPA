<<<<<<< HEAD
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

// CRUD Proveedores: búsqueda automática de productos existentes + geolocalización.
if (window.PROVIDER_FORM) {
  const lookup = document.getElementById('productLookup');
  const results = document.getElementById('productResults');
  const productId = document.getElementById('productoId');
  const selectedCard = document.getElementById('selectedProductCard');
  const selectedName = document.getElementById('selectedProductName');
  const selectedImage = document.getElementById('selectedProductImage');
  let timer;

  const hideResults = () => results?.classList.add('d-none');
  const selectProduct = p => {
    productId.value = p.id;
    lookup.value = `${p.numero ? p.numero + ' · ' : ''}${p.nombre}`;
    selectedName.textContent = p.nombre;
    selectedCard.classList.remove('d-none');
    if (p.imagen_url) {
      selectedImage.src = p.imagen_url;
      selectedImage.classList.remove('d-none');
    } else {
      selectedImage.removeAttribute('src');
      selectedImage.classList.add('d-none');
    }
    hideResults();
  };

  lookup?.addEventListener('input', () => {
    productId.value = '';
    selectedCard?.classList.add('d-none');
    clearTimeout(timer);
    const q = lookup.value.trim();
    if (!q) return hideResults();
    timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/productos/buscar?q=${encodeURIComponent(q)}`, { headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error('No se pudo buscar productos');
        const items = await response.json();
        results.innerHTML = '';
        if (!items.length) {
          results.innerHTML = '<div class="p-3 text-secondary small">No se encontraron productos.</div>';
        } else {
          items.forEach(p => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'lookup-item';
            const img = p.imagen_url
              ? `<img class="lookup-mini-img" src="${p.imagen_url}" alt="">`
              : '<div class="lookup-mini-img d-grid place-items-center"></div>';
            btn.innerHTML = `${img}<div><div class="fw-semibold"></div><div class="small text-secondary"></div></div>`;
            btn.querySelector('.fw-semibold').textContent = p.nombre;
            btn.querySelector('.text-secondary').textContent = p.numero || 'Sin código';
            btn.addEventListener('click', () => selectProduct(p));
            results.appendChild(btn);
          });
        }
        results.classList.remove('d-none');
      } catch (_) {
        results.innerHTML = '<div class="p-3 text-danger small">Error al buscar productos.</div>';
        results.classList.remove('d-none');
      }
    }, 220);
  });

  document.addEventListener('click', e => {
    if (results && lookup && !results.contains(e.target) && e.target !== lookup) hideResults();
  });

  document.getElementById('providerForm')?.addEventListener('submit', e => {
    if (!productId.value) {
      e.preventDefault();
      alert('Selecciona un producto de la lista de resultados.');
      lookup.focus();
    }
  });

  const locationBtn = document.getElementById('getLocationBtn');
  const status = document.getElementById('locationStatus');
  locationBtn?.addEventListener('click', () => {
    if (!navigator.geolocation) {
      status.textContent = 'Este dispositivo o navegador no permite obtener la ubicación.';
      return;
    }
    locationBtn.disabled = true;
    status.textContent = 'Obteniendo ubicación actual...';
    navigator.geolocation.getCurrentPosition(
      pos => {
        document.getElementById('latitud').value = pos.coords.latitude.toFixed(7);
        document.getElementById('longitud').value = pos.coords.longitude.toFixed(7);
        status.innerHTML = `✅ Ubicación capturada (precisión aprox. ${Math.round(pos.coords.accuracy)} m). ` +
          `<a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}">Ver en Google Maps</a>`;
        locationBtn.disabled = false;
      },
      err => {
        const messages = {
          1: 'Permiso de ubicación rechazado. Actívalo en el navegador e inténtalo nuevamente.',
          2: 'No fue posible determinar la ubicación actual.',
          3: 'La búsqueda de ubicación tardó demasiado.'
        };
        status.textContent = messages[err.code] || 'No se pudo obtener la ubicación.';
        locationBtn.disabled = false;
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}
=======
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
>>>>>>> fb5b3b6ce7b41d4879e6287e9c2b3b53e4ddcf05
