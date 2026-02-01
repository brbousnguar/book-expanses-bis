/**
 * Quick test of local API (no auth). Run with: node scripts/test-local-api.mjs
 * Start the API first: npm run dev:api
 */

const BASE = process.env.API_BASE || "http://localhost:3001";

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
    imageUrl: "/book-covers/test-cover.jpg",
  });
  if (create.status !== 201) {
    console.error("POST /books failed:", create.status, create.data);
    process.exit(1);
  }
  console.log("POST /books:", create.status, "id:", create.data?.id, "imageUrl:", create.data?.imageUrl);

  const id = create.data?.id;
  if (!id) {
    console.error("No book id in create response");
    process.exit(1);
  }

  const getOne = await request("GET", `/books/${id}`);
  if (getOne.status !== 200) {
    console.error("GET /books/:id failed:", getOne.status, getOne.data);
    process.exit(1);
  }
  console.log("GET /books/:id:", getOne.status, "title:", getOne.data?.title, "imageUrl:", getOne.data?.imageUrl);
  if (getOne.data?.imageUrl !== "/book-covers/test-cover.jpg") {
    console.error("Expected imageUrl in get response, got:", getOne.data?.imageUrl);
    process.exit(1);
  }

  const update = await request("PATCH", `/books/${id}`, {
    imageUrl: "/book-covers/updated-cover.jpg",
  });
  if (update.status !== 200) {
    console.error("PATCH /books/:id failed:", update.status, update.data);
    process.exit(1);
  }
  console.log("PATCH /books/:id:", update.status, "imageUrl:", update.data?.imageUrl);
  if (update.data?.imageUrl !== "/book-covers/updated-cover.jpg") {
    console.error("Expected imageUrl in update response, got:", update.data?.imageUrl);
    process.exit(1);
  }

  const getAfter = await request("GET", `/books/${id}`);
  if (getAfter.data?.imageUrl !== "/book-covers/updated-cover.jpg") {
    console.error("Expected imageUrl after update in get response, got:", getAfter.data?.imageUrl);
    process.exit(1);
  }
  console.log("imageUrl round-trip (create → get → update → get) OK.");

  console.log("Local API test passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
