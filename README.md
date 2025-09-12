# dentabase

A software for storage, safekeeping and ease-of-access for dental doctors

## Prerequisites
Make sure you have this installed on your machine:
- Node.js
- npm

Use the ff. commands to verify if node.js and npm is installed:
```bash
node -v
npm -v
```

## Running the Application
To **run the website application**, use this command:
```bash
  npm run dev
```

or this command for running the website AND desktop application:
```bash
  npm run tauri dev
```

The website application should be accessible at `http://localhost:3000` or simply `localhost:3000` (The default port)
The desktop application should pop up after successfully running the command

## Project Structure

## Troubleshooting
Ensure that the environment is properly configured for both the frontend and backend.

## Notes
- Node.js and npm must be installed in local PC.
- Add this connection to MongoDB Compass mongodb+srv://dentabase:<pass>@cluster0.kx8r3po.mongodb.net/?
- The password for the connection will be pinned in the GC

## Recommended IDE Setup
- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
