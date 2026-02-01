/**
 * Quick test of local API (no auth). Run with: node scripts/test-local-api.mjs
 * Start the API first: npm run dev:api
 */

const BASE = "http://localhost:3001";

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function main() {
  console.log("Testing local API at", BASE);

  const getBooks = await request("GET", "/books");
  if (getBooks.status !== 200) {
    console.error("GET /books failed:", getBooks.status, getBooks.data);
    process.exit(1);
  }
  console.log("GET /books:", getBooks.status, Array.isArray(getBooks.data?.items) ? getBooks.data.items.length : 0, "books");

  const create = await request("POST", "/books", {
    title: "Test Book",
    status: "SHELF",
  });
  if (create.status !== 201) {
    console.error("POST /books failed:", create.status, create.data);
    process.exit(1);
  }
  console.log("POST /books:", create.status, "id:", create.data?.id);

  const id = create.data?.id;
  if (id) {
    const getOne = await request("GET", `/books/${id}`);
    console.log("GET /books/:id:", getOne.status, getOne.data?.title);
  }

  console.log("Local API test passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
