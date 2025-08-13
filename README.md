# Guess Who's Lying 🎭

A multiplayer social deduction game with integrated video chat where players try to identify who's telling lies. Perfect for parties, team building, or just having fun with friends!

## 🎮 Game Overview

**Guess Who's Lying** is an interactive party game where players are given prompts and some must lie while others tell the truth. The goal is to figure out who's lying and who's telling the truth through discussion and observation via video chat.

### How the Game Works
1. **Gather Your Friends**: 2-6 players join a video room
2. **Get Your Roles**: Some players receive "truth" cards, others get "lie" cards
3. **Share Your Stories**: Each player responds to the prompt according to their card
4. **Discuss & Debate**: Use video chat to read faces and question each other
5. **Vote**: Guess who was lying and see who wins!

## ✨ Features

### 🎥 Video Chat Integration
- **Multi-Player Rooms**: Up to 6 participants per game session
- **Real-Time Video**: See everyone's reactions as they tell their stories
- **Grid Layout**: Clean video arrangement for optimal game experience
- **Audio Support**: Crystal clear communication for heated debates

### 🎯 Game Mechanics
- **Room Codes**: Easy 6-digit codes to share with friends
- **Role Assignment**: Automatic distribution of truth/lie roles
- **Turn Management**: Organized gameplay flow
- **Voting System**: Built-in mechanism to guess the liars

### 💬 Interactive Chat
- **Real-Time Messaging**: Text chat alongside video for strategy
- **Game Announcements**: System messages for game state changes
- **Player Identification**: Easy to track who said what

### 🔧 Technical Features
- **WebRTC P2P**: Low-latency video connections
- **Responsive Design**: Works on desktop and mobile browsers
- **No Downloads**: Play directly in your web browser
- **Cross-Platform**: Compatible with all modern browsers

## 🚀 Quick Start

### 🎯 Playing the Game

1. **Visit the App**: Open the application in your browser
2. **Enter Your Name**: This helps other players identify you
3. **Create or Join**:
   - **Host**: Click "Create New Room" and share the room code
   - **Join**: Enter a friend's room code and click "Join Room"
4. **Wait for Players**: Game works best with 3-6 players
5. **Start Playing**: Follow the game prompts and have fun!

### 🎪 Game Tips
- **Watch Body Language**: Video chat lets you see nervous tells
- **Ask Questions**: Use chat and voice to probe for inconsistencies  
- **Stay In Character**: Commit to your role for the best experience
- **Have Fun**: The goal is entertainment, not perfection!

## 🛠️ Development Setup

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Modern web browser with WebRTC support

### Server Setup
```bash
cd server
npm install
npm start
```
Server runs on `http://localhost:8090`

### Client Setup  
```bash
cd client
npm install
npm run dev
```
Client runs on `http://localhost:5173`

### Environment Variables
```bash
# Server
PORT=8090

# Client  
VITE_SERVER_URL=http://localhost:8090
```

## 🏗️ Technical Architecture

### Backend (Node.js/Express)
- **Socket.io**: Real-time communication and game state management
- **Room Management**: Handles player sessions and game rooms
- **WebRTC Signaling**: Facilitates peer-to-peer video connections
- **Game Logic**: Role assignment and turn management

### Frontend (React)
- **React 18**: Modern UI with hooks and context
- **Socket.io Client**: Real-time server communication  
- **Simple-Peer**: WebRTC wrapper for video streaming
- **Tailwind CSS**: Responsive and modern styling
- **Framer Motion**: Smooth animations and transitions

### Key Components
- **VideoPlayer**: Multi-user video grid with responsive layout
- **GameRoom**: Main game interface and state management
- **Chat**: Real-time messaging with game integration
- **Options**: Room creation, joining, and game controls

## 📦 Dependencies

### Server Dependencies
```json
{
  "express": "^4.19.2",
  "socket.io": "^4.7.5", 
  "cors": "^2.8.5"
}
```

### Client Dependencies
```json
{
  "react": "^18.2.0",
  "socket.io-client": "^4.7.5",
  "simple-peer": "^9.11.1",
  "tailwindcss": "^3.4.3",
  "framer-motion": "^11.1.9",
  "react-icons": "^5.2.1"
}
```

## 🌐 Browser Support

**Minimum Requirements:**
- Chrome 60+
- Firefox 60+ 
- Safari 12+
- Edge 79+

**Required Features:**
- WebRTC support
- MediaDevices API
- Modern JavaScript (ES2020+)

## 🎮 Game Modes & Variations

### Classic Mode
- Random truth/lie assignment
- Open discussion format
- Simple majority voting

### Planned Features
- **Themed Prompts**: Categories like "Travel", "Food", "Childhood"
- **Timed Rounds**: Add pressure with countdown timers
- **Scoring System**: Track wins across multiple rounds
- **Custom Prompts**: Let players add their own questions

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the Repository**
2. **Create a Feature Branch**: `git checkout -b feature/amazing-feature`
3. **Make Your Changes**: Follow existing code style
4. **Test Thoroughly**: Ensure video chat and game logic work
5. **Submit a Pull Request**: Describe your changes clearly

### Development Guidelines
- Follow React best practices
- Maintain WebRTC connection stability
- Ensure responsive design across devices
- Write clear, commented code

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎉 Acknowledgments

- Inspired by classic party games like Mafia and Werewolf
- Built with modern web technologies for seamless gameplay
- Special thanks to the WebRTC and Socket.io communities

## 📞 Support

Having issues? Here's how to get help:

- **Technical Issues**: Check browser console for WebRTC errors
- **Connection Problems**: Ensure both users allow camera/microphone access
- **Game Questions**: Refer to the in-app help or create an issue

---

**Ready to play?** Gather your friends and see who's the best liar!