# VEXUS ATLAS Development Guide

## Build and Run Commands
- Start server: `node server.js` or `./server_control.sh start`
- Development mode: `npm run dev` (uses nodemon for hot reload)
- Run tests: `npm test` or `node test-endpoints.js`
- Test prediction: `npm run test:predict`
- Check server status: `./server_control.sh status`
- View logs: `./server_control.sh logs`

## Code Style Guidelines
- ES Modules format (`import/export`)
- Use async/await for asynchronous operations
- Comprehensive error handling with try/catch blocks
- Descriptive variable names (camelCase)
- Proper logging for debugging and monitoring
- Maintain HIPAA compliance (no PHI storage)
- Use centralized CSS for UI components
- Add comments for complex logic, but avoid redundant comments

## Project Structure
- Frontend: Static HTML/CSS/JS in `/public` directory
- Backend: Node.js with Express (server.js as entry point)
- AI integration with Google Vertex AI for image classification
- Test files include descriptive prefixes (test_*)