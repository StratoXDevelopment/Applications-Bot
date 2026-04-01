# Application Bot

Staff application bot for Discord servers.

## Setup

1. Copy `.env.example` to `.env` and fill in your values:
```
TOKEN=your_bot_token
CLIENT_ID=your_client_id
```

2. Install dependencies:
```
npm install
```

3. Start the bot:
```
npm start
```

## Commands

| Command | Description |
|---|---|
| `/application start` | Start an application with optional custom questions |
| `/application end` | End the current active application |
| `/application schedule` | Schedule an application to start after X minutes |
| `/application questions` | View the active application's questions |

All commands require **Manage Server** permission.

## Credits

See `credits.md`
