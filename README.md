# Flashcard Trainer

A sleek, mobile-friendly flashcard trainer that reads CSV decks from the `data/` directory.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm start
   ```

3. Open your browser and navigate to [http://localhost:3000](http://localhost:3000).

The app automatically lists CSV files in the `data/` folder. Each CSV must include three
columns named `chapter`, `word`, and `definition`.

## Adding decks

Place new `.csv` files inside the `data/` directory using the format:

```csv
chapter,word,definition
1,term,The meaning of the term
```

Chapters can be numeric or string-based labels. The interface lets learners pick the deck,
select a chapter, and flip through each card while toggling the definition.
