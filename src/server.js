import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(PUBLIC_DIR));

const cache = new Map();

async function loadCsv(fileName) {
  if (!fileName.endsWith('.csv')) {
    throw new Error('Invalid file type');
  }

  const filePath = path.join(DATA_DIR, fileName);
  if (!filePath.startsWith(DATA_DIR)) {
    throw new Error('Invalid file path');
  }

  const cached = cache.get(fileName);
  const stats = await fs.stat(filePath);
  if (cached && cached.mtimeMs === stats.mtimeMs) {
    return cached.data;
  }

  const fileContents = await fs.readFile(filePath, 'utf8');
  const records = parse(fileContents, {
    columns: ['chapter', 'word', 'definition'],
    skip_empty_lines: true,
    trim: true
  });

  const data = records.map((record) => ({
    chapter: record.chapter,
    word: record.word,
    definition: record.definition
  }));

  cache.set(fileName, { data, mtimeMs: stats.mtimeMs });
  return data;
}

app.get('/api/files', async (req, res) => {
  try {
    const files = await fs.readdir(DATA_DIR);
    const csvFiles = files.filter((file) => file.endsWith('.csv')).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
    res.json(csvFiles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to list data files.' });
  }
});

app.get('/api/cards', async (req, res) => {
  const { file, chapter } = req.query;

  if (!file) {
    res.status(400).json({ message: 'Missing file parameter.' });
    return;
  }

  try {
    const records = await loadCsv(file);
    const filtered = chapter
      ? records.filter((item) => String(item.chapter) === String(chapter))
      : records;
    res.json(filtered);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load flashcards.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Flashcard app listening on port ${PORT}`);
});
