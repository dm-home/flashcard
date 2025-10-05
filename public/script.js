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

function categorizeCard(card) {
  const trimmedWord = (card.word || '').trim();
  const lowerWord = trimmedWord.toLowerCase();
  let cardType = 'word';
  let affixValue = '';

  if (trimmedWord.startsWith('-') && trimmedWord.length > 1) {
    cardType = 'suffix';
    affixValue = trimmedWord.slice(1);
  } else if (trimmedWord.endsWith('-') && trimmedWord.length > 1) {
    cardType = 'prefix';
    affixValue = trimmedWord.slice(0, -1);
  }

  const displayPrefix =
    cardType === 'prefix' ? 'Prefix' : cardType === 'suffix' ? 'Suffix' : 'Word';

  return {
    ...card,
    word: trimmedWord,
    cardType,
    affixValue,
    normalizedWord: lowerWord,
    displayText: `${displayPrefix}: ${trimmedWord}`
  };
}

function cardMatchesAffix(affixCard, wordCard) {
  if (!affixCard.affixValue) {
    return false;
  }

  const search = affixCard.affixValue.toLowerCase();
  if (!search) {
    return false;
  }

  return wordCard.normalizedWord.includes(search);
}

function arrangeAffixPairs(shuffledCards) {
  const result = [];
  const usedWordCards = new Set();

  for (const card of shuffledCards) {
    if (card.cardType === 'prefix' || card.cardType === 'suffix') {
      result.push(card);
      const match = shuffledCards.find(
        (candidate) =>
          candidate.cardType === 'word' &&
          !usedWordCards.has(candidate) &&
          cardMatchesAffix(card, candidate)
      );

      if (match) {
        result.push(match);
        usedWordCards.add(match);
      }
    }
  }

  for (const card of shuffledCards) {
    if (card.cardType === 'word' && !usedWordCards.has(card)) {
      result.push(card);
      usedWordCards.add(card);
    }
  }

  const seenCards = new Set(result);

  for (const card of shuffledCards) {
    if (!seenCards.has(card)) {
      result.push(card);
    }
  }

  return result;
}

function processCards(items) {
  if (!items.length) {
    return [];
  }

  const categorized = items.map(categorizeCard);
  const shuffled = shuffleCards(categorized);
  return arrangeAffixPairs(shuffled);
}

function shuffleCards(items) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

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
    cardLabel.textContent = 'Term';
    cardContent.textContent = 'No cards available.';
    toggleDefinitionButton.disabled = true;
    prevButton.disabled = true;
    nextButton.disabled = true;
    cardCounter.textContent = '';
    return;
  }

  const card = cards[currentIndex];
  cardLabel.textContent = showingDefinition ? 'Definition' : 'Term';
  cardContent.textContent = showingDefinition
    ? card.definition || 'No definition available.'
    : card.displayText;
  toggleDefinitionButton.textContent = showingDefinition
    ? 'Show Term Details'
    : 'Show Definition';
  toggleDefinitionButton.disabled = false;
  prevButton.disabled = currentIndex === 0;
  nextButton.disabled = currentIndex === cards.length - 1;
  cardCounter.textContent = `${currentIndex + 1} / ${cards.length}`;
}

function resetState(newCards) {
  cards = processCards(newCards);
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

