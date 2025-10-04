const fileSelect = document.getElementById('file-select');
const chapterSelect = document.getElementById('chapter-select');
const cardLabel = document.getElementById('card-label');
const cardContent = document.getElementById('card-content');
const cardCounter = document.getElementById('card-counter');
const toggleDefinitionButton = document.getElementById('toggle-definition');
const prevButton = document.getElementById('prev-card');
const nextButton = document.getElementById('next-card');

let cards = [];
let currentIndex = 0;
let showingDefinition = false;

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function populateSelect(select, items, placeholder) {
  select.innerHTML = '';
  const option = document.createElement('option');
  option.value = '';
  option.textContent = placeholder;
  option.disabled = true;
  option.selected = true;
  select.appendChild(option);

  for (const item of items) {
    const opt = document.createElement('option');
    opt.value = item.value;
    opt.textContent = item.label;
    select.appendChild(opt);
  }

  select.disabled = items.length === 0;
}

function updateCard() {
  if (!cards.length) {
    cardLabel.textContent = 'Word';
    cardContent.textContent = 'No cards available.';
    toggleDefinitionButton.disabled = true;
    prevButton.disabled = true;
    nextButton.disabled = true;
    cardCounter.textContent = '';
    return;
  }

  const card = cards[currentIndex];
  cardLabel.textContent = showingDefinition ? 'Definition' : 'Word';
  cardContent.textContent = showingDefinition ? card.definition : card.word;
  toggleDefinitionButton.textContent = showingDefinition
    ? 'Show Word'
    : 'Show Definition';
  toggleDefinitionButton.disabled = false;
  prevButton.disabled = currentIndex === 0;
  nextButton.disabled = currentIndex === cards.length - 1;
  cardCounter.textContent = `${currentIndex + 1} / ${cards.length}`;
}

function resetState(newCards) {
  cards = newCards;
  currentIndex = 0;
  showingDefinition = false;
  updateCard();
}

async function loadChapters(fileName) {
  const data = await fetchJson(`/api/cards?file=${encodeURIComponent(fileName)}`);
  const uniqueChapters = [...new Set(data.map((item) => String(item.chapter)))].sort(
    (a, b) => Number(a) - Number(b)
  );
  populateSelect(
    chapterSelect,
    uniqueChapters.map((chapter) => ({ value: chapter, label: `Chapter ${chapter}` })),
    uniqueChapters.length ? 'Select chapter' : 'No chapters'
  );
  chapterSelect.disabled = uniqueChapters.length === 0;
  return data;
}

async function loadCards() {
  const file = fileSelect.value;
  const chapter = chapterSelect.value;
  if (!file) {
    resetState([]);
    return;
  }

  const params = new URLSearchParams({ file });
  if (chapter) {
    params.set('chapter', chapter);
  }

  try {
    const data = await fetchJson(`/api/cards?${params.toString()}`);
    resetState(data);
  } catch (error) {
    console.error(error);
    resetState([]);
    cardContent.textContent = 'Unable to load cards.';
  }
}

async function initialize() {
  try {
    const files = await fetchJson('/api/files');
    populateSelect(
      fileSelect,
      files.map((file) => ({ value: file, label: file.replace('.csv', '') })),
      files.length ? 'Select deck' : 'No decks found'
    );
  } catch (error) {
    console.error(error);
    populateSelect(fileSelect, [], 'No decks found');
  }

  populateSelect(chapterSelect, [], 'Select chapter');

  fileSelect.addEventListener('change', async () => {
    const file = fileSelect.value;
    if (!file) {
      populateSelect(chapterSelect, [], 'Select chapter');
      resetState([]);
      return;
    }

    try {
      const data = await loadChapters(file);
      const chapterOptions = Array.from(chapterSelect.options).filter((option) => option.value);
      if (chapterOptions.length === 1) {
        chapterSelect.value = chapterOptions[0].value;
      } else {
        chapterSelect.value = '';
      }
      cards = data;
      if (chapterSelect.value) {
        await loadCards();
      } else {
        resetState(data);
      }
    } catch (error) {
      console.error(error);
      populateSelect(chapterSelect, [], 'Select chapter');
      resetState([]);
      cardContent.textContent = 'Unable to load cards.';
    }
  });

  chapterSelect.addEventListener('change', loadCards);

  toggleDefinitionButton.addEventListener('click', () => {
    showingDefinition = !showingDefinition;
    updateCard();
  });

  prevButton.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex -= 1;
      showingDefinition = false;
      updateCard();
    }
  });

  nextButton.addEventListener('click', () => {
    if (currentIndex < cards.length - 1) {
      currentIndex += 1;
      showingDefinition = false;
      updateCard();
    }
  });

  updateCard();
}

initialize();

