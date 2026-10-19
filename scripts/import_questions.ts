import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

interface RawQuestion {
  category: string;
  question: string;
  code_snippet?: string | null;
  options: string[];
  correct_index: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

function parseCSV(content: string): RawQuestion[] {
  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const results: RawQuestion[] = [];
  // Expected header: category,question,code_snippet,opt0,opt1,opt2,opt3,correct_index,difficulty
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    // Basic CSV parser handling quoted fields
    const cols: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let j = 0; j < row.length; j++) {
      const char = row[j];
      if (char === '"' && (j === 0 || row[j - 1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cols.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    cols.push(cur.trim());

    if (cols.length >= 8) {
      const [category, question, snippet, opt0, opt1, opt2, opt3, correctIdxStr, diff] = cols;
      const correct_index = parseInt(correctIdxStr, 10);
      if (!Number.isNaN(correct_index) && correct_index >= 0 && correct_index <= 3) {
        results.push({
          category: category.replace(/^"|"$/g, ''),
          question: question.replace(/^"|"$/g, ''),
          code_snippet: snippet && snippet !== '""' && snippet !== 'NULL' ? snippet.replace(/^"|"$/g, '') : null,
          options: [
            opt0.replace(/^"|"$/g, ''),
            opt1.replace(/^"|"$/g, ''),
            opt2.replace(/^"|"$/g, ''),
            opt3.replace(/^"|"$/g, '')
          ],
          correct_index,
          difficulty: (diff?.toLowerCase() as 'easy' | 'medium' | 'hard') || 'medium'
        });
      }
    }
  }
  return results;
}

export async function importQuestions(filePath: string, directSqlOutput?: string) {
  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Questions file not found: ${fullPath}`);
  }

  const raw = fs.readFileSync(fullPath, 'utf8');
  let questions: RawQuestion[] = [];

  if (fullPath.endsWith('.json')) {
    questions = JSON.parse(raw);
  } else if (fullPath.endsWith('.csv')) {
    questions = parseCSV(raw);
  } else {
    throw new Error('Unsupported format. Provide a .json or .csv file');
  }

  console.log(`[Importer] Read ${questions.length} questions from ${path.basename(fullPath)}`);

  // Validation pass
  const validQuestions = questions.filter((q, idx) => {
    if (!q.category || !q.question || !Array.isArray(q.options) || q.options.length !== 4) {
      console.warn(`[Importer] Row ${idx + 1} invalid structure. Skipping.`);
      return false;
    }
    if (typeof q.correct_index !== 'number' || q.correct_index < 0 || q.correct_index > 3) {
      console.warn(`[Importer] Row ${idx + 1} invalid correct_index (${q.correct_index}). Skipping.`);
      return false;
    }
    return true;
  });

  console.log(`[Importer] Validated ${validQuestions.length}/${questions.length} questions.`);

  if (directSqlOutput) {
    const sqlStatements = validQuestions.map((q) => {
      const cat = q.category.replace(/'/g, "''");
      const quest = q.question.replace(/'/g, "''");
      const snip = q.code_snippet ? `'${q.code_snippet.replace(/'/g, "''")}'` : 'NULL';
      const opts = JSON.stringify(q.options).replace(/'/g, "''");
      const diff = (q.difficulty || 'medium').replace(/'/g, "''");
      return `INSERT INTO public.questions (category, question, code_snippet, options, correct_index, difficulty) VALUES ('${cat}', '${quest}', ${snip}, '${opts}'::jsonb, ${q.correct_index}, '${diff}');`;
    });

    const outPath = path.resolve(process.cwd(), directSqlOutput);
    fs.writeFileSync(outPath, `-- AUTO-GENERATED QUESTIONS SEED (${validQuestions.length} ENTRIES)\nBEGIN;\n${sqlStatements.join('\n')}\nCOMMIT;\n`);
    console.log(`[Importer] Exported SQL seed to ${outPath}`);
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.warn('[Importer] SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL missing. Generating SQL file as fallback...');
    await importQuestions(filePath, 'supabase/seed_questions.sql');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Batch insert in chunks of 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < validQuestions.length; i += BATCH_SIZE) {
    const chunk = validQuestions.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('questions').insert(
      chunk.map((q) => ({
        category: q.category,
        question: q.question,
        code_snippet: q.code_snippet || null,
        options: q.options,
        correct_index: q.correct_index,
        difficulty: q.difficulty || 'medium'
      }))
    );

    if (error) {
      console.error(`[Importer] Error inserting batch ${i / BATCH_SIZE + 1}:`, error.message);
      throw error;
    }
    console.log(`[Importer] Inserted batch ${i / BATCH_SIZE + 1} (${chunk.length} items)`);
  }

  console.log('[Importer] Successfully imported all questions.');
}

// CLI runner
const targetFile = process.argv[2] || 'supabase/questions_bank.json';
const sqlOut = process.argv[3];
importQuestions(targetFile, sqlOut).catch((err) => {
  console.error('[Importer Error]', err);
  process.exit(1);
});
