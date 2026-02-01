/**
 * Repository: DynamoDB (production) or in-memory (local dev).
 * Use in-memory when LOCAL_DEV=1 or TABLE_NAME is not set.
 */

import * as dynamo from "./repository-dynamodb.js";
import * as mem from "./repository-inmemory.js";

const useMemory =
  process.env.LOCAL_DEV === "1" ||
  process.env.LOCAL_DEV === "true" ||
  !process.env.TABLE_NAME;

const repo = useMemory ? mem : dynamo;

export const putBook = repo.putBook;
export const getBook = repo.getBook;
export const listBooks = repo.listBooks;
export const updateBook = repo.updateBook;
export const deleteBook = repo.deleteBook;
export const putNote = repo.putNote;
export const listNotes = repo.listNotes;
export const putEvent = repo.putEvent;
export const listEvents = repo.listEvents;
