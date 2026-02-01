# Incomplete / follow-up tasks

- **[ ] Book cover image not showing after save**  
  Local API returns `imageUrl: undefined` for create/get/update when the API process was started before the handler fixes. Code changes (handlers, `withBookFields`, create payload) are in place; the test passes against a freshly started API (e.g. on port 3002). **Remaining:** ensure the running local API (port 3001) loads the latest code—e.g. restart the API after pulling, or fix root cause so a restart is not required (e.g. ensure API always loads from source or add a version/health check).
