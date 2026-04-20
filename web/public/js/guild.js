document.addEventListener('DOMContentLoaded', () => {
  const filterInput = document.getElementById('member-filter');
  if (!filterInput) {
    return;
  }

  const rows = [...document.querySelectorAll('[data-member-row]')];

  filterInput.addEventListener('input', () => {
    const query = filterInput.value.trim().toLowerCase();

    for (const row of rows) {
      const haystack = row.getAttribute('data-member-name') || '';
      row.style.display = !query || haystack.includes(query) ? '' : 'none';
    }
  });
});
